/* ==========================================================================
   Praja Sakti Group — Scoring & ranking engine (rank-only)
   Pure computation helpers. No DOM access.

   Evaluator shape:
     { id, name, ownerId, updatedAt,
       ranks: { [candidateId]: { [subParamId]: 1|2|3 } } }
   ========================================================================== */

(function () {
  'use strict';

  var MAX_TOTAL = 3.0; // rankToPoints(1) * sum(all sub weights = 1)

  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

  /* Round to 4 dp without float noise (weights use 4 decimals). */
  function r4(n) { return Math.round((n + Number.EPSILON) * 10000) / 10000; }

  /* Round to 2 dp (display totals / averages). */
  function r2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

  function fmt(n, dp) {
    if (n === null || n === undefined || isNaN(n)) return '\u2014';
    return Number(n).toFixed(dp === undefined ? 2 : dp);
  }

  /* Convert a direct rank value (1,2,3) to points. */
  function rankToPoints(rank) {
    if (rank === 1) return 3;
    if (rank === 2) return 2;
    if (rank === 3) return 1;
    return 0;
  }

  /* Points for a place (used for consensus rank points). */
  function placeToPoints(place) {
    if (place === 1) return 3;
    if (place === 2) return 2;
    if (place === 3) return 1;
    return 0;
  }

  function allSubs() { return window.SUB_PARAMETERS || []; }

  /* Raw rank (1|2|3) for a candidate/sub-parameter, or null. */
  function rawRank(evaluator, candidateId, subId) {
    if (!evaluator || !evaluator.ranks) return null;
    var row = evaluator.ranks[candidateId];
    if (!row) return null;
    var v = row[subId];
    return (v === undefined || v === null || v === '') ? null : Number(v);
  }

  /* Weighted contribution of one sub-parameter for a candidate. */
  function subWeighted(evaluator, candidateId, sub) {
    var r = rawRank(evaluator, candidateId, sub.id);
    if (r === null) return 0;
    return rankToPoints(r) * sub.weight;
  }

  /* Weighted contribution of a main parameter's subs for a candidate. */
  function paramWeighted(evaluator, candidateId, param) {
    if (!param || !param.subParameters) return 0;
    var total = 0;
    for (var i = 0; i < param.subParameters.length; i++) {
      var sp = param.subParameters[i];
      total += rankToPoints(rawRank(evaluator, candidateId, sp.id)) * sp.weight;
    }
    return total;
  }

  function subWeightedById(evaluator, candidateId, subId) {
    var sp = findSub(subId);
    if (!sp) return 0;
    return rankToPoints(rawRank(evaluator, candidateId, subId)) * sp.weight;
  }

  function findSub(subId) {
    var subs = allSubs();
    for (var i = 0; i < subs.length; i++) if (subs[i].id === subId) return subs[i];
    return null;
  }

  /* Sum of weighted contributions across all 29 sub-parameters (max 3.0000). */
  function candidateTotal(evaluator, candidateId) {
    if (!evaluator || !evaluator.ranks) return 0;
    var subs = allSubs();
    var total = 0;
    for (var i = 0; i < subs.length; i++) {
      total += rankToPoints(rawRank(evaluator, candidateId, subs[i].id)) * subs[i].weight;
    }
    return total;
  }

  /* Weighted total for a single main parameter (max = totalWeight * 3). */
  function paramTotal(evaluator, candidateId, param) {
    if (!evaluator || !evaluator.ranks || !param) return 0;
    var total = 0;
    for (var i = 0; i < param.subParameters.length; i++) {
      var sp = param.subParameters[i];
      total += rankToPoints(rawRank(evaluator, candidateId, sp.id)) * sp.weight;
    }
    return total;
  }

  /* How many sub-parameters has this evaluator ranked for a candidate? */
  function scoredSubCount(evaluator, candidateId) {
    if (!evaluator || !evaluator.ranks) return 0;
    var row = evaluator.ranks[candidateId];
    if (!row) return 0;
    var subs = allSubs();
    var n = 0;
    for (var i = 0; i < subs.length; i++) {
      var v = row[subs[i].id];
      if (v !== undefined && v !== null && v !== '') n++;
    }
    return n;
  }

  /* True if evaluator has entered at least one rank for the candidate. */
  function hasAnyRank(evaluator, candidateId) {
    return scoredSubCount(evaluator, candidateId) > 0;
  }

  /* Total number of rank entries this evaluator has across all candidates. */
  function rankCount(evaluator) {
    if (!evaluator || !evaluator.ranks) return 0;
    var n = 0;
    window.CANDIDATES.forEach(function (c) { n += scoredSubCount(evaluator, c.id); });
    return n;
  }

  /*
   * Rank candidates for a single evaluator based on total weighted score.
   * Returns { candidateId: place } using standard competition ranking
   * (ties share a place). Candidates with no ranks are omitted.
   */
  function evaluatorRanking(evaluator) {
    var rows = window.CANDIDATES.map(function (c) {
      return { id: c.id, total: candidateTotal(evaluator, c.id), scored: hasAnyRank(evaluator, c.id) };
    }).filter(function (r) { return r.scored; });

    rows.sort(function (a, b) { return b.total - a.total; });

    var result = {};
    var prevTotal = null;
    var prevPlace = 0;
    for (var i = 0; i < rows.length; i++) {
      var place;
      if (prevTotal !== null && Math.abs(rows[i].total - prevTotal) < 1e-9) {
        place = prevPlace;
      } else {
        place = i + 1;
        prevPlace = place;
        prevTotal = rows[i].total;
      }
      result[rows[i].id] = place;
    }
    return result;
  }

  function maxTotal() { return MAX_TOTAL; }

  /*
   * Consensus aggregation across all evaluators that have ranked.
   * Returns { candidates, ranked, scoringEvaluators, anyScored }
   */
  function consensus(state) {
    var list = (state.evaluatorOrder || Object.keys(state.evaluators))
      .map(function (id) { return state.evaluators[id]; })
      .filter(Boolean);

    var scoringEvaluators = list.filter(function (ev) {
      return window.CANDIDATES.some(function (c) { return hasAnyRank(ev, c.id); });
    });

    var candidates = window.CANDIDATES.map(function (c) {
      var totals = [];
      var rankPointsSum = 0;
      var firstPlaceVotes = 0;
      var evaluatorDetail = [];

      scoringEvaluators.forEach(function (ev) {
        if (!hasAnyRank(ev, c.id)) { evaluatorDetail.push({ evalId: ev.id, name: ev.name, total: null, place: null }); return; }
        var total = candidateTotal(ev, c.id);
        var ranking = evaluatorRanking(ev);
        var place = ranking[c.id] || null;
        totals.push(total);
        if (place) {
          rankPointsSum += placeToPoints(place);
          if (place === 1) firstPlaceVotes++;
        }
        evaluatorDetail.push({ evalId: ev.id, name: ev.name, total: total, place: place });
      });

      var avgWeighted = totals.length ? totals.reduce(function (a, b) { return a + b; }, 0) / totals.length : null;

      return {
        id: c.id,
        name: c.name,
        avgWeighted: avgWeighted,
        rankPoints: rankPointsSum,
        firstPlaceVotes: firstPlaceVotes,
        evalCount: totals.length,
        detail: evaluatorDetail
      };
    });

    var ranked = candidates.slice().sort(function (a, b) {
      var av = a.avgWeighted === null ? -1 : a.avgWeighted;
      var bv = b.avgWeighted === null ? -1 : b.avgWeighted;
      if (Math.abs(bv - av) > 1e-9) return bv - av;
      if (b.rankPoints !== a.rankPoints) return b.rankPoints - a.rankPoints;
      return (b.firstPlaceVotes - a.firstPlaceVotes);
    });

    // Assign consensus place (competition ranking, ties share).
    var prev = null, prevPlace = 0;
    ranked.forEach(function (r, i) {
      if (r.avgWeighted === null) { r.consensusPlace = null; return; }
      if (prev !== null && Math.abs(r.avgWeighted - prev) < 1e-9) {
        r.consensusPlace = prevPlace;
      } else {
        r.consensusPlace = i + 1;
        prevPlace = r.consensusPlace;
        prev = r.avgWeighted;
      }
    });

    return {
      candidates: candidates,
      ranked: ranked,
      scoringEvaluators: scoringEvaluators,
      anyScored: ranked.some(function (r) { return r.avgWeighted !== null; })
    };
  }

  /* Average weighted score per main parameter per candidate. */
  function parameterAverages(state) {
    var list = (state.evaluatorOrder || Object.keys(state.evaluators))
      .map(function (id) { return state.evaluators[id]; })
      .filter(Boolean);

    return window.PARAMETERS.map(function (p) {
      var perCandidate = {};
      window.CANDIDATES.forEach(function (c) {
        var vals = [];
        list.forEach(function (ev) {
          if (!hasAnyRank(ev, c.id)) return;
          vals.push(paramWeighted(ev, c.id, p));
        });
        perCandidate[c.id] = vals.length ? vals.reduce(function (a, b) { return a + b; }, 0) / vals.length : null;
      });
      var max = null;
      window.CANDIDATES.forEach(function (c) {
        var v = perCandidate[c.id];
        if (v !== null && (max === null || v > max)) max = v;
      });
      return { param: p, averages: perCandidate, max: max };
    });
  }

  /* Average weighted score per sub-parameter per candidate. */
  function subParameterAverages(state) {
    var list = (state.evaluatorOrder || Object.keys(state.evaluators))
      .map(function (id) { return state.evaluators[id]; })
      .filter(Boolean);

    return allSubs().map(function (sp) {
      var perCandidate = {};
      window.CANDIDATES.forEach(function (c) {
        var vals = [];
        list.forEach(function (ev) {
          var r = rawRank(ev, c.id, sp.id);
          if (r === null) return;
          vals.push(rankToPoints(r) * sp.weight);
        });
        perCandidate[c.id] = vals.length ? vals.reduce(function (a, b) { return a + b; }, 0) / vals.length : null;
      });
      return { sub: sp, averages: perCandidate };
    });
  }

  window.PrajaScoring = {
    MAX_TOTAL: MAX_TOTAL,
    r2: r2,
    r4: r4,
    fmt: fmt,
    clamp: clamp,
    rankToPoints: rankToPoints,
    placeToPoints: placeToPoints,
    rawRank: rawRank,
    subWeightedById: subWeightedById,
    candidateTotal: candidateTotal,
    paramWeighted: paramWeighted,
    scoredParamCount: scoredSubCount,
    scoredSubCount: scoredSubCount,
    hasAnyRank: hasAnyRank,
    hasAnyScore: hasAnyRank,
    rankCount: rankCount,
    evaluatorRanking: evaluatorRanking,
    maxTotal: maxTotal,
    consensus: consensus,
    parameterAverages: parameterAverages,
    subParameterAverages: subParameterAverages
  };
})();
