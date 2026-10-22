/* ==========================================================================
   Praja Sakti Group — Export / Import (CSV, Markdown, JSON)
   Rank-only, 29 sub-parameter model.
   ========================================================================== */

(function () {
  'use strict';

  var P = window.PrajaScoring;
  var S = window.PrajaState;

  function download(filename, content, mime) {
    var blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function stamp() {
    var d = new Date();
    function z(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + z(d.getMonth() + 1) + z(d.getDate()) + '-' + z(d.getHours()) + z(d.getMinutes());
  }

  function csvCell(v) {
    if (v === null || v === undefined) v = '';
    v = String(v);
    if (/[",\n\r;]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
    return v;
  }

  /* ---------------- CSV (long format) ---------------- */

  function buildCsv() {
    var s = S.state;
    var lines = [];
    lines.push([
      'Penilai', 'Kandidat Arsitek',
      'Kode Parameter', 'Parameter', 'Kode Sub', 'Sub-Parameter', 'Bobot',
      'Peringkat', 'Poin', 'Tertimbang',
      'Total Skor Kandidat', 'Peringkat Penilai'
    ].map(csvCell).join(','));

    S.orderedEvaluators().forEach(function (ev) {
      var ranking = P.evaluatorRanking(ev);
      window.CANDIDATES.forEach(function (c) {
        var total = P.candidateTotal(ev, c.id);
        var place = ranking[c.id] || '';
        window.PARAMETERS.forEach(function (p) {
          p.subParameters.forEach(function (sp) {
            var r = P.rawRank(ev, c.id, sp.id);
            var pts = r === null ? '' : P.rankToPoints(r);
            var wt = r === null ? 0 : P.rankToPoints(r) * sp.weight;
            lines.push([
              ev.name, c.name,
              p.code, p.name, sp.code, sp.text, sp.weight,
              r === null ? '' : ('#' + r), r === null ? '' : r, P.fmt(wt, 4),
              P.fmt(total), place === '' ? '' : ('#' + place)
            ].map(csvCell).join(','));
          });
        });
      });
    });

    return '\uFEFF' + lines.join('\r\n');
  }

  /* ---------------- Markdown report ---------------- */

  function mdEscape(s) { return String(s == null ? '' : s).replace(/\|/g, '\\|'); }

  function buildMarkdown() {
    var s = S.state;
    var m = window.PRAJA_META;
    var con = P.consensus(s);
    var out = [];

    out.push('# Laporan Eksekutif \u2014 Penilaian Konsultan Arsitek');
    out.push('');
    out.push('**' + m.company + '**  ');
    out.push('_' + m.division + '_  ');
    out.push('Proyek: **' + m.project + '** \u2014 ' + m.projectDetail + '  ');
    out.push('Tanggal dibuat: ' + new Date().toLocaleString('id-ID') + '  ');
    out.push('Metode: **Ranking langsung 1\u20133** (#1 = 3 poin, #2 = 2 poin, #3 = 1 poin) \u00B7 ' + m.subParameterCount + ' sub-parameter.');
    out.push('');

    out.push('## 1. Peringkat Konsensus');
    out.push('');
    out.push('| Peringkat | Kandidat | Rata-Rata Skor | Poin Ranking | Suara #1 | Penilai |');
    out.push('|---|---|---|---|---|---|');
    con.ranked.forEach(function (r) {
      var place = r.consensusPlace === null ? '\u2014' : ('#' + r.consensusPlace);
      out.push('| ' + place + ' | ' + mdEscape(r.name) + ' | ' + P.fmt(r.avgWeighted) + ' | ' + r.rankPoints + ' | ' + r.firstPlaceVotes + ' | ' + r.evalCount + ' |');
    });
    out.push('');

    out.push('## 2. Rincian Rata-Rata per Parameter');
    out.push('');
    out.push('| Parameter (Bobot) | ' + window.CANDIDATES.map(function (c) { return mdEscape(c.name); }).join(' | ') + ' |');
    out.push('|---|' + window.CANDIDATES.map(function () { return '---'; }).join('|') + '|');
    P.parameterAverages(s).forEach(function (row) {
      var cells = window.CANDIDATES.map(function (c) {
        var v = row.averages[c.id];
        var star = (v !== null && row.max !== null && Math.abs(v - row.max) < 1e-9 && v > 0);
        return P.fmt(v) + (star ? ' \u2605' : '');
      });
      out.push('| ' + mdEscape(row.param.code + '. ' + row.param.name) + ' (' + Math.round(row.param.totalWeight * 100) + '%) | ' + cells.join(' | ') + ' |');
    });
    out.push('');

    out.push('## 3. Rincian Rata-Rata per Sub-Parameter');
    out.push('');
    out.push('| Sub-Parameter (Bobot) | ' + window.CANDIDATES.map(function (c) { return mdEscape(c.name); }).join(' | ') + ' |');
    out.push('|---|' + window.CANDIDATES.map(function () { return '---'; }).join('|') + '|');
    P.subParameterAverages(s).forEach(function (row) {
      var max = null;
      window.CANDIDATES.forEach(function (c) { var v = row.averages[c.id]; if (v !== null && (max === null || v > max)) max = v; });
      var cells = window.CANDIDATES.map(function (c) {
        var v = row.averages[c.id];
        var star = (v !== null && max !== null && Math.abs(v - max) < 1e-9 && v > 0);
        return P.fmt(v) + (star ? ' \u2605' : '');
      });
      out.push('| ' + mdEscape(row.sub.code + ' ' + row.sub.text) + ' (' + P.fmt(row.sub.weight * 100, 2) + '%) | ' + cells.join(' | ') + ' |');
    });
    out.push('');

    out.push('## 4. Peringkat per Penilai');
    out.push('');
    var evs = S.orderedEvaluators();
    out.push('| Penilai | ' + window.CANDIDATES.map(function (c) { return mdEscape(c.name); }).join(' | ') + ' |');
    out.push('|---|' + window.CANDIDATES.map(function () { return '---'; }).join('|') + '|');
    evs.forEach(function (ev) {
      var ranking = P.evaluatorRanking(ev);
      var cells = window.CANDIDATES.map(function (c) {
        var total = P.candidateTotal(ev, c.id);
        var place = ranking[c.id];
        return P.fmt(total) + (place ? ' / #' + place : ' / \u2014');
      });
      out.push('| ' + mdEscape(ev.name) + ' | ' + cells.join(' | ') + ' |');
    });
    out.push('');

    out.push('---');
    out.push('');
    out.push('_Dokumen internal Praja Sakti Group \u2014 tidak untuk disebarluaskan. Bobot: ' +
      window.PARAMETERS.map(function (p) { return p.code + '. ' + p.short + ' ' + Math.round(p.totalWeight * 100) + '%'; }).join(', ') + '._');

    return out.join('\n');
  }

  /* ---------------- JSON backup ---------------- */

  function buildJson() {
    var s = S.state;
    return JSON.stringify({
      meta: {
        app: 'Praja Sakti Architect Scoring',
        version: 6,
        model: 'rank-29',
        exportedAt: new Date().toISOString(),
        roomId: s.roomId
      },
      evaluatorOrder: s.evaluatorOrder,
      evaluators: s.evaluators
    }, null, 2);
  }

  function importJson(text) {
    var data = JSON.parse(text);
    if (!data || !data.evaluators) throw new Error('Struktur JSON tidak dikenali.');
    var s = S.state;
    var count = 0;

    var order = Array.isArray(data.evaluatorOrder) ? data.evaluatorOrder : Object.keys(data.evaluators);
    order.forEach(function (id) {
      var ev = data.evaluators[id];
      if (!ev || !ev.name) return;
      if (!ev.ranks) ev.ranks = {};
      if (!s.evaluators[id]) {
        s.evaluators[id] = { id: id, name: ev.name, ownerId: null, updatedAt: ev.updatedAt || new Date().toISOString(), ranks: ev.ranks };
        s.evaluatorOrder.push(id);
      } else {
        s.evaluators[id].name = ev.name;
        s.evaluators[id].ranks = ev.ranks;
      }
      count++;
      if (S.cloud.enabled && !ev.id.toString().match(/^eval_guest$/)) S.cloud.upsert(s.evaluators[id]);
    });

    S.deduplicateEvaluators();
    S.ensureSeed();
    S.emit('reset');
    return count;
  }

  window.PrajaExports = {
    download: download,
    buildCsv: buildCsv,
    buildMarkdown: buildMarkdown,
    buildJson: buildJson,
    importJson: importJson,
    exportCsv: function () { download('praja-penilaian-' + stamp() + '.csv', buildCsv(), 'text/csv;charset=utf-8;'); },
    exportMarkdown: function () { download('praja-laporan-' + stamp() + '.md', buildMarkdown(), 'text/markdown;charset=utf-8;'); },
    exportJson: function () { download('praja-backup-' + stamp() + '.json', buildJson(), 'application/json;charset=utf-8;'); }
  };
})();
