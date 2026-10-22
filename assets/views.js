/* ==========================================================================
   Praja Sakti Group — View rendering (header, tabs, evaluator, rekap)
   Rank-only. Matriks hierarkis 6 parameter / 29 sub-parameter.
   ========================================================================== */

(function () {
  'use strict';

  var P = window.PrajaScoring;

  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function svgIcon(path, cls) {
    return '<svg class="' + (cls || 'w-4 h-4') + '" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">' + path + '</svg>';
  }

  var ICON = {
    download: '<path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/>',
    upload: '<path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 8l5-5 5 5M12 3v12"/>',
    refresh: '<path stroke-linecap="round" stroke-linejoin="round" d="M4 4v6h6M20 20v-6h-6M20 8a8 8 0 00-14-3M4 16a8 8 0 0014 3"/>',
    trash: '<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>',
    plus: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>',
    alert: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>'
  };

  function rankBadge(place) {
    if (!place) return '<span class="rank-badge rank-none">\u2014</span>';
    var cls = place === 1 ? 'rank-1' : place === 2 ? 'rank-2' : 'rank-3';
    return '<span class="rank-badge ' + cls + '">#' + place + '</span>';
  }

  /* ================= HEADER ================= */

  function renderHeader() {
    var m = window.PRAJA_META;
    return '' +
      '<div class="max-w-[1400px] mx-auto px-3 sm:px-5 py-4 flex flex-wrap items-center justify-between gap-4">' +
          '<div class="flex items-center gap-3 min-w-0">' +
            '<div class="w-11 h-11 rounded-lg flex items-center justify-center shrink-0" style="background:linear-gradient(135deg,#B69246,#8a6d2f)">' +
              '<span class="font-extrabold text-lg tracking-tight" style="color:#162F52">PS</span>' +
            '</div>' +
            '<div class="min-w-0">' +
              '<h1 class="text-base sm:text-lg font-extrabold leading-tight truncate text-white">' + esc(m.company) + '</h1>' +
              '<p class="text-[11px] sm:text-xs text-white/70 leading-tight">' + esc(m.division) + '</p>' +
              '<p class="text-[11px] text-gold font-semibold leading-tight">' + esc(m.project) + ' &middot; ' + esc(m.projectDetail) + '</p>' +
            '</div>' +
          '</div>' +
          '<div class="flex flex-wrap items-center gap-2 no-print">' +
            '<button class="btn btn-outline" data-action="export-csv" title="Unduh data penilaian (.csv)">' + svgIcon(ICON.download) + ' CSV</button>' +
            '<button class="btn btn-outline" data-action="export-md" title="Unduh laporan eksekutif (.md)">' + svgIcon(ICON.download) + ' Laporan</button>' +
            '<button class="btn btn-outline" data-action="export-json" title="Backup seluruh state (.json)">' + svgIcon(ICON.download) + ' JSON</button>' +
            '<button class="btn btn-outline" data-action="import-json" title="Impor state dari file .json">' + svgIcon(ICON.upload) + ' Impor</button>' +
            '<button class="btn btn-danger" data-action="reset" title="Reset semua data">' + svgIcon(ICON.refresh) + ' Reset</button>' +
          '</div>' +
        '</div>';
  }

  /* ================= MAIN TABS ================= */

  function renderTabs() {
    var s = window.PrajaState.state;
    var isEval = s.currentTab === 'evaluator';
    function tab(id, label) {
      var active = (s.currentTab === id);
      return '<button data-action="toggle-tab" data-tab="' + id + '" class="px-4 py-2.5 rounded-lg font-semibold text-sm transition ' +
        (active ? 'bg-navy text-white shadow' : 'bg-white text-slate-600 border border-slate-200 hover:border-navy') + '">' + label + '</button>';
    }
    return '<div class="flex items-center gap-2 flex-wrap">' +
      tab('evaluator', 'Penilaian Per-Penilai') +
      tab('rekap', 'Rekapitulasi Tim') +
      '<span class="text-xs text-slate-500 ml-auto">' + (isEval ? 'Workspace penilai aktif' : 'Dashboard agregasi seluruh penilai') + '</span>' +
    '</div>';
  }

  /* ================= EVALUATOR VIEW ================= */

  function controlBar() {
    var evs = window.PrajaState.orderedEvaluators();
    var active = window.PrajaState.currentEvaluator();

    var tabs = evs.map(function (ev) {
      var isActive = active && ev.id === active.id;
      return '<button data-action="select-eval" data-eval="' + esc(ev.id) + '" class="eval-tab ' + (isActive ? 'is-active' : '') + '">' +
        '<span data-tab-name="' + esc(ev.id) + '">' + esc(ev.name) + '</span>' +
        '</button>';
    }).join('');

    var activeEditor = active ?
      '<div class="flex items-center gap-2">' +
        '<label class="text-xs font-semibold text-slate-500 whitespace-nowrap">Penilai aktif:</label>' +
        '<input data-role="rename-eval" value="' + esc(active.name) + '" data-eval="' + esc(active.id) + '"' +
          ' class="w-44 px-3 py-1.5 text-sm font-semibold rounded-lg border border-slate-300 focus:border-navy" title="Ketik lalu Enter / klik di luar untuk mengubah nama penilai ini" />' +
        '<button class="btn btn-danger" data-action="delete-eval" title="Hapus penilai ini">' + svgIcon(ICON.trash, 'w-4 h-4') + '</button>' +
      '</div>' : '';

    return '' +
      '<div class="bg-white rounded-xl border border-slate-200 shadow-sm">' +
        '<div class="px-3 sm:px-4 pt-3 flex items-end gap-1 flex-wrap border-b border-slate-200 overflow-x-auto scroll-x">' + tabs + '</div>' +
        '<div class="p-3 sm:p-4 flex flex-wrap items-center gap-3 justify-between">' +
          activeEditor +
          '<div class="flex items-center gap-2 ml-auto">' +
            '<form data-role="add-eval-form" class="flex items-center gap-2">' +
              '<input data-role="add-eval-input" placeholder="Nama / inisial penilai" class="w-48 px-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:border-gold" />' +
              '<button type="submit" class="btn btn-gold">' + svgIcon(ICON.plus) + ' Tambah / Pilih Penilai</button>' +
            '</form>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function rankButton(candidateId, subId, value, current) {
    var isActive = current === value;
    var pts = P.rankToPoints(value);
    var title = 'Peringkat ' + value + ' (' + pts + ' poin)';
    return '<button class="rank-btn' + (isActive ? ' is-active' : '') + '" ' +
      'data-action="set-rank" data-cand="' + esc(candidateId) + '" data-sub="' + esc(subId) + '" data-value="' + value + '" ' +
      'title="' + esc(title) + '">#' + value + '</button>';
  }

  function scoringMatrix(active) {
    var cands = window.CANDIDATES;

    var head = '<thead><tr><th class="min-w-[300px]">Parameter &amp; Sub-Parameter (Bobot)</th>';
    cands.forEach(function (c) { head += '<th class="text-center min-w-[190px]">' + esc(c.name) + '</th>'; });
    head += '</tr></thead>';

    var body = '';
    window.PARAMETERS.forEach(function (p) {
      body += '<tr class="param-group-row">' +
        '<td colspan="' + (cands.length + 1) + '">' +
          '<span class="font-extrabold text-navy">' + esc(p.code) + '. ' + esc(p.name) + '</span> ' +
          '<span class="weight-chip">Bobot ' + Math.round(p.totalWeight * 100) + '%</span>' +
        '</td>' +
      '</tr>';

      p.subParameters.forEach(function (sp) {
        body += '<tr>' +
          '<td>' +
            '<span class="sub-code">' + esc(sp.code) + '</span> ' +
            '<span class="text-slate-700">' + esc(sp.text) + '</span> ' +
            '<span class="weight-chip">' + P.fmt(sp.weight * 100, 2) + '%</span>' +
          '</td>';
        cands.forEach(function (c) {
          var cur = P.rawRank(active, c.id, sp.id);
          var wt = cur === null ? 0 : P.rankToPoints(cur) * sp.weight;
          var btns = [1, 2, 3].map(function (v) { return rankButton(c.id, sp.id, v, cur); }).join('');
          body += '<td class="text-center">' +
            '<div class="flex items-center justify-center gap-1">' + btns + '</div>' +
            '<div class="text-[11px] text-slate-500 mt-1 tabular">Tertimbang: <b class="text-navy">' + P.fmt(wt, 3) + '</b></div>' +
          '</td>';
        });
        body += '</tr>';
      });

      // subtotal per main parameter
      body += '<tr class="subtotal-row">' +
        '<td>Subtotal ' + esc(p.code) + '. ' + esc(p.short) + ' <span class="text-slate-400">(maks ' + P.fmt(p.totalWeight * 3, 2) + ')</span></td>';
      cands.forEach(function (c) {
        var sub = P.paramWeighted(active, c.id, p);
        body += '<td class="text-center font-bold text-navy tabular">' + P.fmt(sub) + '</td>';
      });
      body += '</tr>';
    });

    // grand total
    body += '<tr class="total-row">' +
      '<td>TOTAL SKOR TERTIMBANG <span class="text-white/70 font-normal">(maks ' + P.fmt(P.maxTotal(), 2) + ')</span></td>';
    cands.forEach(function (c) {
      body += '<td class="text-center"><span class="text-lg font-extrabold tabular">' + P.fmt(P.candidateTotal(active, c.id)) + '</span></td>';
    });
    body += '</tr>';

    // rank row
    var ranking = P.evaluatorRanking(active);
    body += '<tr class="rank-row">' +
      '<td class="font-bold text-navy">Peringkat Penilai Ini</td>';
    cands.forEach(function (c) {
      body += '<td class="text-center">' + rankBadge(ranking[c.id]) + '</td>';
    });
    body += '</tr>';

    return '<div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">' +
      '<div class="px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">' +
        '<h2 class="font-bold text-navy">Matriks Penilaian \u2014 ' + esc(active ? active.name : '\u2014') + '</h2>' +
        '<span class="text-xs text-slate-500">Ranking langsung 1\u20133 \u2014 #1 (terbaik) = 3 poin, #2 = 2 poin, #3 = 1 poin</span>' +
      '</div>' +
      '<div class="scroll-x"><table class="data-table">' + head + '<tbody>' + body + '</tbody></table></div>' +
    '</div>';
  }

  function renderEvaluatorView() {
    var active = window.PrajaState.currentEvaluator();
    if (!active) {
      return '<div class="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">Belum ada penilai. Tambahkan penilai untuk mulai menilai.</div>';
    }
    return '<div class="space-y-4">' + controlBar() + scoringMatrix(active) + '</div>';
  }

  /* ================= REKAP VIEW ================= */

  function podiumCard(r, place) {
    var isFirst = place === 1;
    return '' +
      '<div class="podium-card ' + (isFirst ? 'rank-1-card' : '') + '">' +
        '<div class="podium-ribbon">#' + place + '</div>' +
        '<div class="mt-5">' +
          '<h3 class="font-extrabold text-navy text-lg leading-tight">' + esc(r.name) + '</h3>' +
          '<div class="mt-3 grid grid-cols-2 gap-2 text-sm">' +
            '<div class="rounded-lg bg-slate-50 border border-slate-200 p-2">' +
              '<div class="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Rata-rata Skor</div>' +
              '<div class="text-xl font-extrabold text-navy tabular">' + P.fmt(r.avgWeighted) + '</div>' +
            '</div>' +
            '<div class="rounded-lg bg-slate-50 border border-slate-200 p-2">' +
              '<div class="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Poin Ranking</div>' +
              '<div class="text-xl font-extrabold text-gold tabular">' + r.rankPoints + '</div>' +
            '</div>' +
            '<div class="rounded-lg bg-slate-50 border border-slate-200 p-2">' +
              '<div class="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Suara #1</div>' +
              '<div class="text-xl font-extrabold text-navy tabular">' + r.firstPlaceVotes + '</div>' +
            '</div>' +
            '<div class="rounded-lg bg-slate-50 border border-slate-200 p-2">' +
              '<div class="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Penilai</div>' +
              '<div class="text-xl font-extrabold text-slate-600 tabular">' + r.evalCount + '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function comparisonTable(con) {
    var evs = con.scoringEvaluators;
    if (!evs.length) {
      return '<div class="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-500">Belum ada penilai yang mengisi ranking.</div>';
    }
    var head = '<thead><tr><th class="min-w-[180px]">Kandidat Arsitek</th>';
    evs.forEach(function (ev) { head += '<th class="text-center">' + esc(ev.name) + '</th>'; });
    head += '<th class="text-center">Rata-Rata Skor</th><th class="text-center">Total Poin</th><th class="text-center">Konsensus</th></tr></thead>';

    var body = '';
    con.ranked.forEach(function (r) {
      body += '<tr>';
      body += '<td class="font-semibold text-navy">' + esc(r.name) + '</td>';
      evs.forEach(function (ev) {
        var d = r.detail.filter(function (x) { return x.evalId === ev.id; })[0];
        if (!d || d.total === null) {
          body += '<td class="text-center text-slate-400">\u2014</td>';
        } else {
          body += '<td class="text-center">' +
            '<div class="font-bold text-navy tabular">' + P.fmt(d.total) + '</div>' +
            '<div class="mt-0.5">' + rankBadge(d.place) + '</div>' +
          '</td>';
        }
      });
      body += '<td class="text-center font-extrabold text-navy tabular">' + P.fmt(r.avgWeighted) + '</td>';
      body += '<td class="text-center font-bold text-gold tabular">' + r.rankPoints + '</td>';
      body += '<td class="text-center">' + rankBadge(r.consensusPlace) + '</td>';
      body += '</tr>';
    });

    return '<div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">' +
      '<div class="px-4 py-3 border-b border-slate-200"><h2 class="font-bold text-navy">Tabel Perbandingan Multi-Penilai</h2></div>' +
      '<div class="scroll-x"><table class="data-table">' + head + '<tbody>' + body + '</tbody></table></div>' +
    '</div>';
  }

  function breakdownTable() {
    var rows = P.parameterAverages(window.PrajaState.state);
    var cands = window.CANDIDATES;
    var head = '<thead><tr><th class="min-w-[240px]">Parameter (Bobot)</th>';
    cands.forEach(function (c) { head += '<th class="text-center">' + esc(c.name) + '</th>'; });
    head += '</tr></thead>';

    var body = rows.map(function (row) {
      var cells = cands.map(function (c) {
        var v = row.averages[c.id];
        var isMax = v !== null && row.max !== null && Math.abs(v - row.max) < 1e-9 && v > 0;
        return '<td class="text-center tabular ' + (isMax ? 'font-extrabold text-navy' : 'text-slate-600') + '">' +
          P.fmt(v) + (isMax ? ' <span class="text-gold">\u2605</span>' : '') + '</td>';
      }).join('');
      return '<tr><td><span class="font-semibold text-navy">' + esc(row.param.code) + '. ' + esc(row.param.name) + '</span> ' +
        '<span class="weight-chip">' + Math.round(row.param.totalWeight * 100) + '%</span></td>' + cells + '</tr>';
    }).join('');

    return '<div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">' +
      '<div class="px-4 py-3 border-b border-slate-200 flex items-center justify-between"><h2 class="font-bold text-navy">Rincian Rata-Rata per Parameter</h2><span class="text-xs text-slate-500">\u2605 = nilai tertinggi</span></div>' +
      '<div class="scroll-x"><table class="data-table">' + head + '<tbody>' + body + '</tbody></table></div>' +
    '</div>';
  }

  function subBreakdownTable() {
    var rows = P.subParameterAverages(window.PrajaState.state);
    var cands = window.CANDIDATES;

    var head = '<thead><tr><th class="min-w-[300px]">Sub-Parameter (Bobot)</th>';
    cands.forEach(function (c) { head += '<th class="text-center">' + esc(c.name) + '</th>'; });
    head += '</tr></thead>';

    var body = '';
    window.PARAMETERS.forEach(function (p) {
      body += '<tr class="param-group-row"><td colspan="' + (cands.length + 1) + '">' +
        '<span class="font-bold text-navy">' + esc(p.code) + '. ' + esc(p.name) + '</span> ' +
        '<span class="weight-chip">' + Math.round(p.totalWeight * 100) + '%</span></td></tr>';

      rows.filter(function (r) { return r.sub.paramId === p.id; }).forEach(function (row) {
        var max = null;
        cands.forEach(function (c) { var v = row.averages[c.id]; if (v !== null && (max === null || v > max)) max = v; });
        var cells = cands.map(function (c) {
          var v = row.averages[c.id];
          var isMax = v !== null && max !== null && Math.abs(v - max) < 1e-9 && v > 0;
          return '<td class="text-center tabular ' + (isMax ? 'font-extrabold text-navy' : 'text-slate-600') + '">' +
            P.fmt(v) + (isMax ? ' <span class="text-gold">\u2605</span>' : '') + '</td>';
        }).join('');
        body += '<tr><td><span class="sub-code">' + esc(row.sub.code) + '</span> ' + esc(row.sub.text) +
          ' <span class="weight-chip">' + P.fmt(row.sub.weight * 100, 2) + '%</span></td>' + cells + '</tr>';
      });
    });

    return '<div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">' +
      '<div class="px-4 py-3 border-b border-slate-200 flex items-center justify-between"><h2 class="font-bold text-navy">Rincian Rata-Rata per Sub-Parameter</h2><span class="text-xs text-slate-500">\u2605 = nilai tertinggi</span></div>' +
      '<div class="scroll-x"><table class="data-table">' + head + '<tbody>' + body + '</tbody></table></div>' +
    '</div>';
  }

  function renderRekapView() {
    var con = P.consensus(window.PrajaState.state);

    var podium = con.ranked
      .filter(function (r) { return r.consensusPlace !== null; })
      .sort(function (a, b) { return a.consensusPlace - b.consensusPlace; })
      .map(function (r) { return podiumCard(r, r.consensusPlace); })
      .join('');

    var podiumBlock = podium
      ? '<div class="grid grid-cols-1 md:grid-cols-3 gap-4">' + podium + '</div>'
      : '<div class="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-500">Belum ada data penilaian untuk direkapitulasi.</div>';

    return '' +
      '<div class="space-y-4">' +
        '<div class="flex items-center justify-between flex-wrap gap-2">' +
          '<h2 class="font-bold text-navy text-lg">Rekapitulasi Tim \u2014 Konsensus ' + con.scoringEvaluators.length + ' Penilai</h2>' +
        '</div>' +
        podiumBlock +
        comparisonTable(con) +
        breakdownTable() +
        subBreakdownTable() +
      '</div>';
  }

  window.PrajaViews = {
    esc: esc,
    svgIcon: svgIcon,
    ICON: ICON,
    rankBadge: rankBadge,
    renderHeader: renderHeader,
    renderTabs: renderTabs,
    renderEvaluatorView: renderEvaluatorView,
    renderRekapView: renderRekapView
  };
})();
