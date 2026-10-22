/* ==========================================================================
   Praja Sakti Group — Bootstrap, event wiring & UI helpers
   ========================================================================== */

(function () {
  'use strict';

  var V = window.PrajaViews;
  var S = window.PrajaState;
  var P = window.PrajaScoring;

  /* ---------------- Toast ---------------- */

  function toast(msg, kind) {
    var wrap = document.getElementById('toast-wrap');
    if (!wrap) return;
    var el = document.createElement('div');
    var bg = kind === 'error' ? '#b91c1c' : kind === 'warn' ? '#b45309' : kind === 'success' ? '#15803d' : '#162F52';
    el.className = 'px-4 py-2.5 rounded-lg shadow-lg text-sm font-semibold text-white';
    el.style.background = bg;
    el.style.animation = 'flashBg 1.1s ease-out';
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .2s';
      el.style.opacity = '0';
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 220);
    }, 2600);
  }

  /* ---------------- Modal ---------------- */

  function clearModal() { document.getElementById('modal-root').innerHTML = ''; }

  function confirmDialog(opts) {
    return new Promise(function (resolve) {
      var root = document.getElementById('modal-root');
      root.innerHTML =
        '<div class="fixed inset-0 z-40 flex items-center justify-center p-4" style="background:rgba(15,34,61,.55)">' +
          '<div class="bg-white rounded-xl shadow-2xl w-full max-w-md p-5">' +
            '<div class="flex items-start gap-3">' +
              '<div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background:' + (opts.danger ? '#fee2e2' : '#F5EFE0') + '">' +
                V.svgIcon(V.ICON.alert, 'w-5 h-5') + '</div>' +
              '<div class="flex-1"><h3 class="font-bold text-navy text-base">' + V.esc(opts.title || 'Konfirmasi') + '</h3>' +
              '<p class="text-sm text-slate-600 mt-1">' + (opts.html || V.esc(opts.message || '')) + '</p></div>' +
            '</div>' +
            '<div class="mt-5 flex justify-end gap-2">' +
              '<button data-modal="cancel" class="btn btn-ghost">' + V.esc(opts.cancelText || 'Batal') + '</button>' +
              '<button data-modal="ok" class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '">' + V.esc(opts.okText || 'Ya') + '</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      function done(v) { clearModal(); resolve(v); }
      root.querySelector('[data-modal="cancel"]').addEventListener('click', function () { done(false); });
      root.querySelector('[data-modal="ok"]').addEventListener('click', function () { done(true); });
      root.querySelector('.fixed').addEventListener('mousedown', function (e) {
        if (e.target === root.querySelector('.fixed')) done(false);
      });
    });
  }

  /* Strong reset dialog: typed confirmation + optional passphrase + cloud wipe. */
  function resetDialog() {
    return new Promise(function (resolve) {
      var cfg = window.PRAJA_CONFIG || {};
      var needPass = !!cfg.resetPassphrase;
      var cloudOn = S.cloud.enabled;
      var root = document.getElementById('modal-root');
      root.innerHTML =
        '<div class="fixed inset-0 z-40 flex items-center justify-center p-4" style="background:rgba(15,34,61,.6)">' +
          '<div class="bg-white rounded-xl shadow-2xl w-full max-w-md p-5">' +
            '<div class="flex items-start gap-3">' +
              '<div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background:#fee2e2">' +
                V.svgIcon(V.ICON.alert, 'w-5 h-5') + '</div>' +
              '<div class="flex-1"><h3 class="font-bold text-navy text-base">Reset Semua Data</h3>' +
              '<p class="text-sm text-slate-600 mt-1">Tindakan ini menghapus penilaian dan mengembalikan aplikasi ke satu penilai <b>Guest</b>. Tidak dapat dibatalkan.</p></div>' +
            '</div>' +
            (cloudOn ?
              '<label class="mt-4 flex items-start gap-2 text-sm text-slate-700">' +
                '<input id="reset-cloud" type="checkbox" class="mt-0.5" />' +
                '<span>Hapus juga <b>data cloud</b> untuk ruang "' + V.esc(cfg.roomId || '') + '" (menghapus data SEMUA anggota tim).</span>' +
              '</label>' : '') +
            (needPass ?
              '<div class="mt-3"><label class="block text-xs font-semibold text-slate-600 mb-1">Passphrase reset</label>' +
              '<input id="reset-pass" type="password" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-navy text-sm" placeholder="Passphrase" /></div>' : '') +
            '<div class="mt-3"><label class="block text-xs font-semibold text-slate-600 mb-1">Ketik <b>HAPUS</b> untuk konfirmasi</label>' +
              '<input id="reset-confirm" class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-navy text-sm" placeholder="HAPUS" /></div>' +
            '<div class="mt-5 flex justify-end gap-2">' +
              '<button data-modal="cancel" class="btn btn-ghost">Batal</button>' +
              '<button data-modal="ok" class="btn btn-danger" disabled>Reset Sekarang</button>' +
            '</div>' +
          '</div>' +
        '</div>';

      var okBtn = root.querySelector('[data-modal="ok"]');
      var confirmInput = root.querySelector('#reset-confirm');
      function validate() { okBtn.disabled = confirmInput.value.trim().toUpperCase() !== 'HAPUS'; }
      confirmInput.addEventListener('input', validate);
      confirmInput.focus();

      function done(v) { clearModal(); resolve(v); }
      root.querySelector('[data-modal="cancel"]').addEventListener('click', function () { done(null); });
      root.querySelector('.fixed').addEventListener('mousedown', function (e) {
        if (e.target === root.querySelector('.fixed')) done(null);
      });
      okBtn.addEventListener('click', function () {
        if (okBtn.disabled) return;
        var pass = root.querySelector('#reset-pass');
        var cloudBox = root.querySelector('#reset-cloud');
        done({ cloud: !!(cloudBox && cloudBox.checked), passphrase: pass ? pass.value : '' });
      });
    });
  }

  /* ---------------- Focus preservation ---------------- */

  function focusKeyOf(el) {
    if (!el || !el.getAttribute) return null;
    var role = el.getAttribute('data-role');
    if (role === 'rename-eval') return 'rename';
    if (role === 'add-eval-input') return 'add';
    return null;
  }

  function findByKey(key) {
    if (key === 'rename') return document.querySelector('[data-role="rename-eval"]');
    if (key === 'add') return document.querySelector('[data-role="add-eval-input"]');
    return null;
  }

  /* ---------------- Render ---------------- */

  function render() {
    var s = S.state;
    var activeEl = document.activeElement;
    var key = focusKeyOf(activeEl);
    var selStart = null, selEnd = null;
    if (key && activeEl && typeof activeEl.selectionStart === 'number') {
      selStart = activeEl.selectionStart; selEnd = activeEl.selectionEnd;
    }

    var header = document.getElementById('app-header');
    header.className = 'bg-navy';
    header.style.background = 'linear-gradient(135deg,#162F52,#0F223D)';
    header.innerHTML = V.renderHeader();

    document.getElementById('main-tabs').innerHTML = V.renderTabs();

    var evalView = document.getElementById('view-evaluator');
    var rekapView = document.getElementById('view-rekap');
    if (s.currentTab === 'rekap') {
      rekapView.innerHTML = V.renderRekapView();
      rekapView.classList.remove('hidden');
      evalView.classList.add('hidden');
    } else {
      evalView.innerHTML = V.renderEvaluatorView();
      evalView.classList.remove('hidden');
      rekapView.classList.add('hidden');
    }

    var fstatus = document.getElementById('footer-status');
    if (fstatus) fstatus.textContent = 'Ruang: ' + s.roomId + ' \u2022 ' + S.orderedEvaluators().length + ' penilai';

    if (key) {
      var el = findByKey(key);
      if (el) {
        el.focus();
        if (selStart !== null && typeof el.setSelectionRange === 'function') {
          try { el.setSelectionRange(selStart, selEnd); } catch (e) { /* ignore */ }
        }
      }
    }
  }

  var renderTimer = null;
  function scheduleRender() {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 100);
  }

  /* ---------------- Sync banner ---------------- */

  function bannerClass(kind) {
    switch (kind) {
      case 'online': return 'bg-emerald-50 text-emerald-700 border-b border-emerald-200';
      case 'error': return 'bg-red-50 text-red-700 border-b border-red-200';
      case 'warn': return 'bg-amber-50 text-amber-800 border-b border-amber-200';
      case 'connecting': return 'bg-blue-50 text-blue-700 border-b border-blue-200';
      default: return 'bg-slate-100 text-slate-600 border-b border-slate-200';
    }
  }

  function setSyncStatus(msg, kind) {
    var el = document.getElementById('sync-banner');
    if (!el) return;
    el.className = 'text-center text-xs font-medium py-1.5 px-4 ' + bannerClass(kind);
    el.textContent = msg;
    if (kind === 'online') {
      setTimeout(function () { if (el.textContent === msg) el.className = 'hidden'; }, 4000);
    }
  }

  /* ---------------- Click handling ---------------- */

  function onDocumentClick(e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');

    if (action === 'toggle-tab') { S.setTab(btn.getAttribute('data-tab')); return; }
    if (action === 'select-eval') { S.setCurrentEvaluator(btn.getAttribute('data-eval')); return; }

    if (action === 'delete-eval') {
      var cur = S.currentEvaluator();
      if (!cur) return;
      confirmDialog({
        title: 'Hapus penilai "' + cur.name + '"?',
        message: 'Data ranking penilai ini akan dihapus' + (S.cloud.enabled && !S.isGuest(cur) ? ' untuk semua anggota tim' : '') + '.',
        okText: 'Hapus', danger: true
      }).then(function (ok) {
        if (!ok) return;
        S.deleteEvaluator(cur.id);
        toast('Penilai dihapus.', 'info');
      });
      return;
    }

    if (action === 'set-rank') {
      var active = S.currentEvaluator();
      if (!active) return;
      S.setRank(active.id, btn.getAttribute('data-cand'), btn.getAttribute('data-sub'), Number(btn.getAttribute('data-value')));
      return;
    }

    if (action === 'export-csv') { window.PrajaExports.exportCsv(); toast('CSV diunduh.', 'success'); return; }
    if (action === 'export-md') { window.PrajaExports.exportMarkdown(); toast('Laporan diunduh.', 'success'); return; }
    if (action === 'export-json') { window.PrajaExports.exportJson(); toast('Backup JSON diunduh.', 'success'); return; }
    if (action === 'import-json') { triggerImport(); return; }

    if (action === 'reset') {
      resetDialog().then(function (res) {
        if (!res) return;
        S.resetAllData(res).then(function (out) {
          if (!out.ok && out.reason === 'passphrase') { toast('Passphrase salah. Reset dibatalkan.', 'error'); return; }
          if (out.cloudError) { toast('Data lokal direset, tetapi reset cloud gagal.', 'warn'); return; }
          toast(res.cloud ? 'Data lokal & cloud direset.' : 'Data direset.', 'info');
        });
      });
    }
  }

  /* ---------------- Input / change handling ---------------- */

  function onInput(e) {
    var el = e.target;
    if (!el || !el.getAttribute) return;
    if (el.getAttribute('data-role') === 'rename-eval') {
      var span = document.querySelector('[data-tab-name="' + el.getAttribute('data-eval') + '"]');
      if (span) span.textContent = el.value.trim() || '(tanpa nama)';
    }
  }

  function onChange(e) {
    var el = e.target;
    if (!el || !el.getAttribute) return;
    if (el.getAttribute('data-role') === 'rename-eval') {
      var id = el.getAttribute('data-eval');
      var res = S.renameEvaluator(id, el.value);
      if (!res.ok) {
        if (res.reason === 'duplicate') toast('Nama "' + res.conflict + '" sudah dipakai penilai lain.', 'warn');
        else if (res.reason === 'empty') toast('Nama tidak boleh kosong.', 'warn');
        render(); // revert
      } else {
        render();
      }
    }
  }

  /* ---------------- Add evaluator ---------------- */

  function addFromInput(input) {
    var name = (input.value || '').trim();
    if (!name) { input.focus(); return; }
    var res = S.handleAddEvaluator(name);
    input.value = '';
    if (res.action === 'switched') toast('Beralih ke penilai "' + res.evaluator.name + '".', 'info');
    else if (res.action === 'renamed') toast('Penilai aktif dinamai "' + name + '".', 'success');
    else if (res.action === 'created') toast('Penilai "' + name + '" ditambahkan.', 'success');
    input.focus();
  }

  function onDocumentSubmit(e) {
    var form = e.target.closest('[data-role="add-eval-form"]');
    if (!form) return;
    e.preventDefault();
    addFromInput(form.querySelector('input'));
  }

  /* ---------------- Import ---------------- */

  function triggerImport() {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json,application/json';
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var n = window.PrajaExports.importJson(String(reader.result));
          toast('Impor berhasil: ' + n + ' profil.', 'success');
        } catch (err) {
          toast('Gagal impor: ' + err.message, 'error');
        }
      };
      reader.readAsText(f);
    });
    inp.click();
  }

  /* ---------------- Boot ---------------- */

  function init() {
    S.load();

    document.addEventListener('click', onDocumentClick);
    document.addEventListener('input', onInput);
    document.addEventListener('change', onChange);
    document.addEventListener('submit', onDocumentSubmit);

    S.subscribe(function (type) {
      if (type === 'score' && S.state.currentTab === 'evaluator') {
        // Re-render to update weighted points / totals, keep it snappy.
        scheduleRender();
        return;
      }
      render();
    });

    render();
    if (S.currentEvaluator() && S.isGuest(S.currentEvaluator())) {
      setTimeout(function () {
        var el = document.querySelector('[data-role="rename-eval"]');
        if (el) el.focus();
      }, 60);
    }

    if (window.isCloudConfigured && window.isCloudConfigured()) {
      S.cloud.init({ onStatus: setSyncStatus }).then(function () { render(); });
    }
  }

  window.PrajaUI = { toast: toast, confirm: confirmDialog };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
