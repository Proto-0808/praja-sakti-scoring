/* ==========================================================================
   Praja Sakti Group — Static domain data
   6 main parameters / 29 sub-parameters, candidates, default evaluator.

   MODEL
   - Each of the 6 main parameters has a totalWeight (sum = 1.0000).
   - Each sub-parameter carries its own weight; the weights WITHIN a main
     parameter sum to that main parameter's totalWeight.
   - Ranking is direct per sub-parameter: #1 (best) = 3 poin, #2 = 2, #3 = 1.
     Weighted points = poin * sub.weight  (total across 29 subs, max 3.0000).
   ========================================================================== */

(function () {
  'use strict';

  var PARAMETERS = [
    {
      id: 'param_1',
      code: '1',
      name: 'Relevant Experience',
      short: 'Pengalaman',
      totalWeight: 0.20,
      subParameters: [
        { id: '1.1', code: '1.1', text: 'Pengalaman mengerjakan proyek residensial urban/compound sejenis', weight: 0.0400 },
        { id: '1.2', code: '1.2', text: 'Pengalaman mengerjakan proyek rumah kompak atau unit \u00B135\u201360 m\u00B2', weight: 0.0400 },
        { id: '1.3', code: '1.3', text: 'Pengalaman relevan masih terkini', weight: 0.0400 },
        { id: '1.4', code: '1.4', text: 'Konsistensi kualitas karya terbangun', weight: 0.0400 },
        { id: '1.5', code: '1.5', text: 'Insight spesifik yang dapat diterapkan ke Proyek Kemanggisan Pulo', weight: 0.0400 }
      ]
    },
    {
      id: 'param_2',
      code: '2',
      name: 'Sense Bisnis / Segmen Apetite',
      short: 'Sense Bisnis',
      totalWeight: 0.20,
      subParameters: [
        { id: '2.1', code: '2.1', text: 'Memahami profil, daya beli, dan aspirasi target konsumen yang cocok di wilayah Kemanggisan Pulo', weight: 0.0400 },
        { id: '2.2', code: '2.2', text: 'Mampu mengoptimalkan luas efektif, jumlah unit, akses, dan privasi', weight: 0.0400 },
        { id: '2.3', code: '2.3', text: 'Konsep memperkuat product\u2013market fit dan nilai jual', weight: 0.0400 },
        { id: '2.4', code: '2.4', text: 'Mempertimbangkan efisiensi biaya dan kemudahan konstruksi', weight: 0.0400 },
        { id: '2.5', code: '2.5', text: 'Menyeimbangkan desain, marketability, harga jual, dan kelayakan bisnis', weight: 0.0400 }
      ]
    },
    {
      id: 'param_3',
      code: '3',
      name: 'Reputasi',
      short: 'Reputasi',
      totalWeight: 0.15,
      subParameters: [
        { id: '3.1', code: '3.1', text: 'Memiliki klien atau proyek kredibel yang dapat diverifikasi', weight: 0.0375 },
        { id: '3.2', code: '3.2', text: 'Rekam jejak profesional baik tanpa isu material', weight: 0.0375 },
        { id: '3.3', code: '3.3', text: 'Pengakuan industri melalui publikasi, penghargaan, atau rekomendasi', weight: 0.0375 },
        { id: '3.4', code: '3.4', text: 'Stabilitas studio dan tim mencerminkan kredibilitas', weight: 0.0375 }
      ]
    },
    {
      id: 'param_4',
      code: '4',
      name: 'Design Vision and Style (Aesthetic)',
      short: 'Design Vision',
      totalWeight: 0.20,
      subParameters: [
        { id: '4.1', code: '4.1', text: 'Visi desain sesuai positioning proyek', weight: 0.0400 },
        { id: '4.2', code: '4.2', text: 'Konsep spesifik terhadap konteks lokasi dan karakter urban', weight: 0.0400 },
        { id: '4.3', code: '4.3', text: 'Karakter visual kuat dan berbeda dari kompetitor', weight: 0.0400 },
        { id: '4.4', code: '4.4', text: 'Karya terbangun meyakinkan dari proporsi, material, dan detail', weight: 0.0400 },
        { id: '4.5', code: '4.5', text: 'Fleksibel menerjemahkan arahan Praja, bukan memaksakan signature style', weight: 0.0400 }
      ]
    },
    {
      id: 'param_5',
      code: '5',
      name: 'Chemistry / Cara Kerja',
      short: 'Chemistry',
      totalWeight: 0.15,
      subParameters: [
        { id: '5.1', code: '5.1', text: 'Komunikasi jelas, terstruktur, dan responsif', weight: 0.0300 },
        { id: '5.2', code: '5.2', text: 'Terbuka terhadap feedback dan revisi', weight: 0.0300 },
        { id: '5.3', code: '5.3', text: 'Metode kerja, deliverable, PIC, dan koordinasi jelas', weight: 0.0300 },
        { id: '5.4', code: '5.4', text: 'Kapasitas tim dan komitmen timeline memadai', weight: 0.0300 },
        { id: '5.5', code: '5.5', text: 'Klien sebelumnya bersedia menggunakan jasanya kembali', weight: 0.0300 }
      ]
    },
    {
      id: 'param_6',
      code: '6',
      name: 'Budget',
      short: 'Budget',
      totalWeight: 0.10,
      subParameters: [
        { id: '6.1', code: '6.1', text: 'Fee sesuai anggaran dan kompetitif', weight: 0.0200 },
        { id: '6.2', code: '6.2', text: 'Ruang lingkup, revisi, dan deliverable lengkap', weight: 0.0200 },
        { id: '6.3', code: '6.3', text: 'Pembayaran dan biaya tambahan transparan', weight: 0.0200 },
        { id: '6.4', code: '6.4', text: 'Penawaran memberikan value for money terbaik', weight: 0.0200 },
        { id: '6.5', code: '6.5', text: 'Fleksibilitas terhadap pemecahan scope dan timeline', weight: 0.0200 }
      ]
    }
  ];

  var CANDIDATES = [
    { id: 'rafael_miranti', name: 'Rafael Miranti' },
    { id: 'fffaaarrr', name: 'Fffaaarrr' },
    { id: 'atelier_riri', name: 'Atelier Riri' }
  ];

  /* Default single placeholder assessor. Purely local; never synced. */
  var DEFAULT_EVALUATOR = { id: 'eval_guest', name: 'Guest' };

  /* Flat list of every sub-parameter (handy for iteration/serialisation). */
  var SUB_PARAMETERS = [];
  PARAMETERS.forEach(function (p) {
    p.subParameters.forEach(function (sp) {
      SUB_PARAMETERS.push({
        id: sp.id,
        code: sp.code,
        text: sp.text,
        weight: sp.weight,
        paramId: p.id,
        paramCode: p.code,
        paramName: p.name
      });
    });
  });

  window.PARAMETERS = PARAMETERS;
  window.SUB_PARAMETERS = SUB_PARAMETERS;
  window.CANDIDATES = CANDIDATES;
  window.DEFAULT_EVALUATOR = DEFAULT_EVALUATOR;

  window.PRAJA_META = {
    company: 'Praja Sakti Group',
    division: 'Tim Pengembangan Proyek Compound',
    project: 'Kemanggisan Pulo, Jakarta',
    projectDetail: 'Compound 3.000 m\u00B2 \u2014 Unit rumah 35\u201345 m\u00B2',
    parameterCount: PARAMETERS.length,
    subParameterCount: SUB_PARAMETERS.length,
    mainWeightsSum: PARAMETERS.reduce(function (a, p) { return a + p.totalWeight; }, 0),
    subWeightsSum: SUB_PARAMETERS.reduce(function (a, sp) { return a + sp.weight; }, 0)
  };
})();
