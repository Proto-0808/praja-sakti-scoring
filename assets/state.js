/* ==========================================================================
   Praja Sakti Group — State, local persistence & Supabase cloud sync

   CLOUD MODEL (Plan A2 — shared room, no sign-in)
   - No authentication. The public anon key is used directly; RLS is opened
     to the `anon` role for this table (see supabase/schema.sql).
   - One row per assessor profile, unique by (room_id, lower(trim(name))).
   - "Guest" is a LOCAL-ONLY placeholder and is never written to the cloud.
   ========================================================================== */

(function () {
  'use strict';

  var LS_KEY = 'praja_sakti_architect_scoring_v6_final';
  var LS_ACTIVE = 'praja_active_eval_id';
  var GUEST_ID = 'eval_guest';

  var listeners = [];

  function defaultState() {
    return {
      roomId: (window.PRAJA_CONFIG && window.PRAJA_CONFIG.roomId) || 'kemanggisan-pulo',
      currentTab: 'evaluator',
      currentEvaluatorId: null,
      evaluatorOrder: [],
      evaluators: {}
    };
  }

  var state = defaultState();

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'ev-' + Date.now().toString(16) + '-' + Math.random().toString(16).slice(2, 10);
  }

  function nowIso() { return new Date().toISOString(); }
  function norm(s) { return String(s == null ? '' : s).trim().toLowerCase(); }
  function isGuestName(name) { return norm(name) === 'guest'; }
  function isGuest(ev) { return !!ev && (ev.id === GUEST_ID || isGuestName(ev.name)); }

  function newGuest() {
    return { id: GUEST_ID, name: 'Guest', ownerId: null, updatedAt: nowIso(), ranks: {} };
  }

  function newEvaluator(name, id) {
    return {
      id: id || uid(),
      name: String(name == null ? '' : name).trim() || 'Penilai Baru',
      ownerId: null,
      updatedAt: nowIso(),
      ranks: {}
    };
  }

  /* ---------------- Local persistence ---------------- */

  function load() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          state = Object.assign(defaultState(), parsed);
          if (!state.evaluators || typeof state.evaluators !== 'object') state.evaluators = {};
          if (!Array.isArray(state.evaluatorOrder)) state.evaluatorOrder = [];
        }
      }
      if (window.PRAJA_CONFIG && window.PRAJA_CONFIG.roomId) state.roomId = window.PRAJA_CONFIG.roomId;
      var active = localStorage.getItem(LS_ACTIVE);
      if (active && state.evaluators[active]) state.currentEvaluatorId = active;
    } catch (e) { /* ignore corrupt storage */ }
    deduplicateEvaluators();
    ensureSeed();
  }

  var saveTimer = null;
  function saveLocal() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({
          roomId: state.roomId,
          currentTab: state.currentTab,
          currentEvaluatorId: state.currentEvaluatorId,
          evaluatorOrder: state.evaluatorOrder,
          evaluators: state.evaluators
        }));
        if (state.currentEvaluatorId) localStorage.setItem(LS_ACTIVE, state.currentEvaluatorId);
        else localStorage.removeItem(LS_ACTIVE);
      } catch (e) { /* quota */ }
    }, 150);
  }

  /* ---------------- Seed / dedup ---------------- */

  function seedGuest() {
    if (state.evaluatorOrder.length) return;
    var g = newGuest();
    state.evaluators = {};
    state.evaluators[g.id] = g;
    state.evaluatorOrder = [g.id];
    state.currentEvaluatorId = g.id;
  }
  function ensureSeed() {
    // Drop dangling order ids, then seed a Guest if nothing remains.
    state.evaluatorOrder = state.evaluatorOrder.filter(function (id) { return !!state.evaluators[id]; });
    if (!state.evaluatorOrder.length) seedGuest();
    if (!state.currentEvaluatorId || !state.evaluators[state.currentEvaluatorId]) {
      state.currentEvaluatorId = state.evaluatorOrder[0];
    }
  }

  /* Case-insensitive de-duplication. Merges the ranks of any duplicate
     profiles (in order) into the first profile with that name. */
  function deduplicateEvaluators() {
    var byName = {};
    var keepOrder = [];
    var dropped = [];

    state.evaluatorOrder.forEach(function (id) {
      var ev = state.evaluators[id];
      if (!ev) return;
      var key = norm(ev.name);
      var first = byName[key];
      if (!first) {
        byName[key] = ev;
        keepOrder.push(id);
        return;
      }
      // merge this duplicate's ranks into the first
      Object.keys(ev.ranks || {}).forEach(function (cand) {
        if (!first.ranks[cand]) first.ranks[cand] = {};
        Object.keys(ev.ranks[cand]).forEach(function (sub) {
          if (first.ranks[cand][sub] === undefined) first.ranks[cand][sub] = ev.ranks[cand][sub];
        });
      });
      dropped.push(id);
    });

    if (!dropped.length) return;
    dropped.forEach(function (id) {
      delete state.evaluators[id];
      if (state.currentEvaluatorId === id) {
        state.currentEvaluatorId = keepOrder[0] || null;
      }
    });
    state.evaluatorOrder = keepOrder;
  }

  /* ---------------- Queries ---------------- */

  function orderedEvaluators() {
    return state.evaluatorOrder.map(function (id) { return state.evaluators[id]; }).filter(Boolean);
  }
  function getEvaluator(id) { return state.evaluators[id] || null; }
  function currentEvaluator() {
    return state.evaluators[state.currentEvaluatorId] || orderedEvaluators()[0] || null;
  }
  function canEdit() { return true; } // Plan A2: shared room, UI-level ownership only.

  function findByName(name, exceptId) {
    var key = norm(name);
    return orderedEvaluators().filter(function (e) {
      return e.id !== exceptId && norm(e.name) === key;
    })[0] || null;
  }

  function promoteGuest(guest, name) {
    var ev = newEvaluator(name);
    ev.ranks = guest.ranks || {};
    var idx = state.evaluatorOrder.indexOf(guest.id);
    delete state.evaluators[guest.id];
    state.evaluators[ev.id] = ev;
    if (idx >= 0) state.evaluatorOrder[idx] = ev.id;
    else state.evaluatorOrder.push(ev.id);
    if (state.currentEvaluatorId === guest.id) state.currentEvaluatorId = ev.id;
    return ev;
  }

  /* ---------------- Evaluator lifecycle ---------------- */

  /* Add / claim / rename entry-point used by the "+ Tambah Penilai" form.
     Returns { action: 'none'|'switched'|'renamed'|'created', evaluator }. */
  function handleAddEvaluator(raw) {
    var name = String(raw == null ? '' : raw).trim();
    if (!name) return { action: 'none' };

    // 1) existing profile with the same name -> switch to it
    var existing = findByName(name, null);
    if (existing && !isGuest(existing)) {
      setCurrentEvaluator(existing.id);
      return { action: 'switched', evaluator: existing };
    }

    var active = currentEvaluator();

    // 2) empty Guest -> rename in place
    if (active && isGuest(active) && PrajaScoring.rankCount(active) === 0) {
      var promoted = promoteGuest(active, name);
      setCurrentEvaluator(promoted.id);
      PrajaCloud.upsert(promoted);
      saveLocal();
      emit('add', promoted);
      return { action: 'renamed', evaluator: promoted };
    }

    // 3) create a brand-new profile
    var ev = newEvaluator(name);
    state.evaluators[ev.id] = ev;
    state.evaluatorOrder.push(ev.id);
    setCurrentEvaluator(ev.id);
    PrajaCloud.upsert(ev);
    saveLocal();
    emit('add', ev);
    return { action: 'created', evaluator: ev };
  }

  /* Inline rename of the active profile. */
  function renameEvaluator(id, name) {
    var ev = state.evaluators[id];
    if (!ev) return { ok: false, reason: 'missing' };
    var clean = String(name == null ? '' : name).trim();
    if (!clean) return { ok: false, reason: 'empty', name: ev.name };
    var conflict = findByName(clean, id);
    if (conflict) return { ok: false, reason: 'duplicate', name: ev.name, conflict: conflict.name };

    if (isGuest(ev)) {
      var promoted = promoteGuest(ev, clean);
      PrajaCloud.upsert(promoted);
      saveLocal();
      emit('rename', promoted);
      return { ok: true, evaluator: promoted };
    }
    ev.name = clean;
    ev.updatedAt = nowIso();
    PrajaCloud.upsert(ev);
    saveLocal();
    emit('rename', ev);
    return { ok: true, evaluator: ev };
  }

  /* Delete a profile. If it is the last one, reset to a fresh Guest. */
  function deleteEvaluator(id) {
    var ev = state.evaluators[id];
    if (!ev) return false;
    if (!isGuest(ev)) PrajaCloud.remove(id);

    if (state.evaluatorOrder.length > 1) {
      delete state.evaluators[id];
      state.evaluatorOrder = state.evaluatorOrder.filter(function (x) { return x !== id; });
      if (state.currentEvaluatorId === id) state.currentEvaluatorId = state.evaluatorOrder[0];
      state.currentEvaluatorId = state.currentEvaluatorId || state.evaluatorOrder[0];
      saveLocal();
      emit('delete', ev);
      return true;
    }

    // last profile -> fresh Guest
    var g = newGuest();
    state.evaluators = {};
    state.evaluators[g.id] = g;
    state.evaluatorOrder = [g.id];
    state.currentEvaluatorId = g.id;
    saveLocal();
    emit('delete', ev);
    return true;
  }

  /* ---------------- Ranking ---------------- */

  /* Set a direct rank (1|2|3) for one candidate/sub-parameter. A rank value
     is unique per sub-parameter: assigning it moves it off any other
     candidate. Re-clicking the same value toggles it off. */
  function setRank(evaluatorId, candidateId, subId, value) {
    var ev = state.evaluators[evaluatorId];
    if (!ev) return;
    if (!ev.ranks[candidateId]) ev.ranks[candidateId] = {};
    var current = ev.ranks[candidateId][subId];

    window.CANDIDATES.forEach(function (c) {
      if (c.id === candidateId) return;
      if (ev.ranks[c.id] && ev.ranks[c.id][subId] === value) delete ev.ranks[c.id][subId];
    });

    if (current === value) delete ev.ranks[candidateId][subId];
    else ev.ranks[candidateId][subId] = value;

    ev.updatedAt = nowIso();
    PrajaCloud.upsert(ev);
    saveLocal();
    emit('score', { evaluatorId: evaluatorId, candidateId: candidateId, subId: subId });
  }

  /* ---------------- View state ---------------- */

  function setTab(tab) {
    state.currentTab = (tab === 'rekap') ? 'rekap' : 'evaluator';
    saveLocal();
    emit('tab');
  }

  function setCurrentEvaluator(id) {
    if (!state.evaluators[id]) return;
    state.currentEvaluatorId = id;
    saveLocal();
    emit('tab');
  }

  /* ---------------- Reset ---------------- */

  /* opts: { cloud: bool, passphrase: string }
     Returns a Promise<{ ok, reason? }>. */
  function resetAllData(opts) {
    opts = opts || {};
    var cfg = window.PRAJA_CONFIG || {};
    if (cfg.resetPassphrase) {
      if (String(opts.passphrase || '') !== String(cfg.resetPassphrase)) {
        return Promise.resolve({ ok: false, reason: 'passphrase' });
      }
    }

    try {
      localStorage.removeItem(LS_KEY);
      localStorage.removeItem(LS_ACTIVE);
    } catch (e) { /* ignore */ }

    state = defaultState();
    seedGuest();
    saveLocal();
    emit('reset');

    if (opts.cloud && PrajaCloud.enabled) {
      return PrajaCloud.clearRoom().then(function () {
        return PrajaCloud.refresh();
      }).then(function () {
        ensureSeed();
        saveLocal();
        emit('reset');
        return { ok: true };
      }).catch(function () { return { ok: true, cloudError: true }; });
    }
    return Promise.resolve({ ok: true });
  }

  /* ---------------- Subscription ---------------- */

  function subscribe(fn) { listeners.push(fn); }
  function emit(type, detail) {
    listeners.forEach(function (fn) { try { fn(type, detail); } catch (e) { console.error(e); } });
  }

  /* =========================================================================
     Cloud sync (Supabase, Plan A2 — no auth, shared room)
     ========================================================================= */
  var PrajaCloud = (function () {
    var client = null;
    var enabled = false;
    var channel = null;
    var upsertTimers = {};
    var ready = false;
    var pending = {}; // ids created locally but not yet confirmed remotely
    var onStatus = null;

    function status(msg, kind) { if (onStatus) onStatus(msg, kind); }
    function table() { return (window.PRAJA_CONFIG && window.PRAJA_CONFIG.tableName) || 'praja_assessments'; }

    function init(opts) {
      onStatus = opts && opts.onStatus;
      if (!window.isCloudConfigured || !window.isCloudConfigured()) {
        enabled = false;
        status('Mode lokal (tanpa sinkronisasi cloud).', 'offline');
        return Promise.resolve(false);
      }
      try {
        client = window.supabase.createClient(window.PRAJA_CONFIG.supabaseUrl, window.PRAJA_CONFIG.supabaseAnonKey, {
          auth: { persistSession: false, autoRefreshToken: false }
        });
      } catch (e) {
        enabled = false;
        status('Gagal menginisialisasi cloud.', 'error');
        return Promise.resolve(false);
      }
      enabled = true;
      status('Menghubungkan ke ruang "' + state.roomId + '"\u2026', 'connecting');

      return fetchAll().then(function (rows) {
        mergeRemote(rows);
        ready = true;
        subscribeRealtime();
        status('Tersinkron \u2014 ' + rows.length + ' profil penilai di ruang "' + state.roomId + '".', 'online');
        emit('cloud-ready');
        return true;
      }).catch(function (err) {
        console.error('[cloud]', err);
        status('Cloud tidak tersedia. Bekerja dalam mode lokal.', 'error');
        enabled = false;
        return false;
      });
    }

    function fetchAll() {
      return client.from(table())
        .select('*')
        .eq('room_id', state.roomId)
        .then(function (res) {
          if (res.error) throw res.error;
          return res.data || [];
        });
    }

    function mergeRemote(rows) {
      var seen = {};
      (rows || []).forEach(function (row) {
        seen[row.id] = true;
        delete pending[row.id];
        var remote = {
          id: row.id,
          name: row.evaluator_name || 'Penilai',
          ownerId: null,
          updatedAt: row.updated_at || nowIso(),
          ranks: (row.payload && row.payload.ranks) || {}
        };
        var local = state.evaluators[row.id];
        if (!local) {
          state.evaluators[row.id] = remote;
          if (state.evaluatorOrder.indexOf(row.id) === -1) state.evaluatorOrder.push(row.id);
        } else {
          // union ranks (remote wins on conflicts), name follows newest update
          var merged = local.ranks || {};
          Object.keys(remote.ranks || {}).forEach(function (cand) {
            if (!merged[cand]) merged[cand] = {};
            Object.keys(remote.ranks[cand]).forEach(function (sub) {
              merged[cand][sub] = remote.ranks[cand][sub];
            });
          });
          local.ranks = merged;
          local.name = remote.name;
          local.updatedAt = remote.updatedAt;
        }
      });

      // Drop non-Guest profiles that were removed on another device.
      state.evaluatorOrder = state.evaluatorOrder.filter(function (id) {
        var ev = state.evaluators[id];
        if (!ev) return false;
        if (isGuest(ev)) return true;
        if (rows.some(function (r) { return r.id === id; })) { delete pending[id]; return true; }
        if (pending[id]) return true;
        delete state.evaluators[id];
        return false;
      });

      ensureSeed();
      saveLocal();
      emit('remote');
    }

    function fetchAllRows() { return fetchAll(); }

    function upsert(ev) {
      if (!enabled || !ready || !ev) return;
      if (isGuest(ev)) return; // Guest never leaves the device
      pending[ev.id] = true;
      if (upsertTimers[ev.id]) clearTimeout(upsertTimers[ev.id]);
      upsertTimers[ev.id] = setTimeout(function () { push(ev); }, 250);
    }

    function push(ev) {
      if (!enabled || !ready) return;
      client.from(table()).upsert({
        id: ev.id,
        room_id: state.roomId,
        evaluator_name: ev.name,
        payload: { ranks: ev.ranks || {} },
        updated_at: ev.updatedAt || nowIso()
      }, { onConflict: 'id' }).then(function (res) {
        if (r.error || res.error) {
          var err = r ? r.error : (res && res.error);
          // Name collision across devices -> reconcile to the canonical row.
          if (err && /duplicate|unique/i.test(err.message || '')) {
            reconcileByName(ev.name);
          }
        } else {
          delete pending[ev.id];
        }
      }).catch(function (e) { console.warn('[cloud upsert]', e); });
    }

    function reconcileByName(name) {
      return fetchAll().then(function (rows) {
        mergeRemote(rows);
        var key = norm(name);
        var matches = orderedEvaluators().filter(function (e) { return norm(e.name) === key; });
        if (matches.length > 1) {
          var remoteIds = rows.map(function (r) { return r.id; });
          var keep = matches.filter(function (e) { return remoteIds.indexOf(e.id) >= 0; })[0] || matches[0];
          matches.forEach(function (e) {
            if (e.id === keep.id) return;
            delete state.evaluators[e.id];
            state.evaluatorOrder = state.evaluatorOrder.filter(function (x) { return x !== e.id; });
          });
          setCurrentEvaluator(keep.id);
          saveLocal();
          emit('remote');
        }
        return true;
      }).catch(function (e) { console.warn('[cloud reconcile]', e); });
    }

    function remove(id) {
      if (!enabled || !ready || !id || id === GUEST_ID) return;
      client.from(table()).delete().eq('room_id', state.roomId).eq('id', id)
        .then(function (r) { if (r.error) console.warn('[cloud delete]', r.error.message); })
        .catch(function (e) { console.warn('[cloud delete]', e); });
    }

    /* Delete EVERY row for this room (used by the guarded reset). */
    function clearRoom() {
      if (!enabled || !ready) return Promise.resolve();
      return client.from(table()).delete().eq('room_id', state.roomId).then(function (r) {
        if (r.error) throw r.error;
        pending = {};
        return true;
      });
    }

    function subscribeRealtime() {
      if (channel) { try { client.removeChannel(channel); } catch (e) { /* ignore */ } }
      channel = client.channel('praja-room-' + state.roomId)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: table(), filter: 'room_id=eq.' + state.roomId },
          function () {
            fetchAll().then(mergeRemote).catch(function (e) { console.warn('[cloud realtime]', e); });
          })
        .subscribe(function (s) {
          if (s === 'SUBSCRIBED') status('Tersinkron \u2014 ' + orderedEvaluators().length + ' profil penilai.', 'online');
          if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') status('Koneksi realtime terputus, mencoba lagi\u2026', 'warn');
        });
    }

    function refresh() {
      if (!enabled || !ready) return Promise.resolve();
      return fetchAll().then(mergeRemote).catch(function (e) { console.warn('[cloud refresh]', e); });
    }

    return {
      init: init,
      upsert: upsert,
      remove: remove,
      clearRoom: clearRoom,
      refresh: refresh,
      isReady: function () { return enabled && ready; },
      get enabled() { return enabled; }
    };
  })();

  /* ---------------- Public API ---------------- */

  window.PrajaState = {
    get state() { return state; },
    GUEST_ID: GUEST_ID,
    load: load,
    seedOfflineDefaults: seedGuest,
    ensureSeed: ensureSeed,
    deduplicateEvaluators: deduplicateEvaluators,
    orderedEvaluators: orderedEvaluators,
    getEvaluator: getEvaluator,
    currentEvaluator: currentEvaluator,
    canEdit: canEdit,
    isGuest: isGuest,
    handleAddEvaluator: handleAddEvaluator,
    renameEvaluator: renameEvaluator,
    deleteEvaluator: deleteEvaluator,
    setRank: setRank,
    setTab: setTab,
    setCurrentEvaluator: setCurrentEvaluator,
    resetAllData: resetAllData,
    subscribe: subscribe,
    emit: emit,
    cloud: PrajaCloud
  };
})();
