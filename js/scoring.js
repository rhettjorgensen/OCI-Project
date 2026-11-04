/*
 * Lead scoring. Pure functions: rules in, score out.
 *
 * Each part (industry fit, company size, indicated interest) is scored
 * 0 to 100, then weighted into a 0 to 100 total.
 */
(function () {
  var DAY = 86400000;
  var GOOD_MIN = 60; // between this and the strong threshold is a "good" lead

  function daysSince(iso) {
    return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY));
  }

  function industryTier(industry, rules) {
    var r = rules.industry;
    if (r.excluded.indexOf(industry) !== -1) return 'excluded';
    if (r.tier1.indexOf(industry) !== -1) return 'tier1';
    if (r.tier2.indexOf(industry) !== -1) return 'tier2';
    return 'other';
  }

  function scoreIndustry(lead, rules) {
    var tier = industryTier(lead.industry, rules);
    var r = rules.industry;
    if (tier === 'tier1') return { score: r.tier1Score, tier: tier, note: lead.industry + ' is a tier 1 industry on your target list.' };
    if (tier === 'tier2') return { score: r.tier2Score, tier: tier, note: lead.industry + ' is a tier 2 industry on your target list.' };
    if (tier === 'excluded') return { score: 0, tier: tier, note: lead.industry + ' is on your excluded list.' };
    return { score: r.otherScore, tier: tier, note: lead.industry + ' is not on your target list.' };
  }

  function band(value, range) {
    if (value >= range.fullMin && value <= range.fullMax) return 'full';
    if (value >= range.partialMin && value <= range.partialMax) return 'partial';
    return 'low';
  }

  function scoreSize(lead, rules) {
    var r = rules.size;
    var points = { full: r.fullScore, partial: r.partialScore, low: r.lowScore };
    var words = { full: 'inside', partial: 'near', low: 'outside' };
    if (lead.employees != null) {
      var b = band(lead.employees, r.employees);
      var note = lead.employees + ' employees is ' + words[b] + ' the ' + r.employees.fullMin + ' to ' + r.employees.fullMax + ' range.';
      if (lead.revenueM != null) {
        var rb = band(lead.revenueM, r.revenue);
        note += rb === b
          ? ' Revenue estimate of ' + money(lead.revenueM) + ' agrees.'
          : ' Revenue estimate of ' + money(lead.revenueM) + ' does not agree.';
      }
      return { score: points[b], note: note };
    }
    if (lead.revenueM != null) {
      var b2 = band(lead.revenueM, r.revenue);
      return { score: points[b2], note: 'Employee count unknown. Revenue estimate of ' + money(lead.revenueM) + ' is ' + words[b2] + ' the full-score range.' };
    }
    return { score: r.lowScore, note: 'No employee count or revenue estimate found.' };
  }

  function scoreInterest(lead, rules) {
    var r = rules.interest;
    var signals = (lead.evidence || []).filter(function (e) { return e.points > 0; });
    if (!signals.length) return { score: 0, note: 'No interest signal found.' };
    var adjusted = signals.map(function (e) {
      return daysSince(e.foundAt) > r.halfAfterDays ? e.points / 2 : e.points;
    });
    var best = Math.max.apply(null, adjusted);
    var score = Math.min(100, Math.round(best + r.extraSignalBonus * (signals.length - 1)));
    var strongest = signals[adjusted.indexOf(best)];
    var others = signals.length - 1;
    var note = 'Best signal is ' + strongest.strength.toLowerCase() + ', from ' + daysSince(strongest.foundAt) + ' days ago';
    note += others ? ', plus ' + others + ' supporting signal' + (others > 1 ? 's' : '') + '.' : '.';
    return { score: score, note: note };
  }

  function money(m) {
    return m >= 1 ? '$' + (Math.round(m * 10) / 10) + 'M' : '$' + Math.round(m * 1000) + 'K';
  }

  function scoreLead(lead, rules) {
    var w = rules.weights;
    var parts = {
      industry: scoreIndustry(lead, rules),
      size: scoreSize(lead, rules),
      interest: scoreInterest(lead, rules)
    };
    var raw = (parts.industry.score * w.industry + parts.size.score * w.size + parts.interest.score * w.interest) / 100;
    var total = Math.round(raw);
    var formula =
      parts.industry.score + ' × ' + (w.industry / 100).toFixed(2) + ' + ' +
      parts.size.score + ' × ' + (w.size / 100).toFixed(2) + ' + ' +
      parts.interest.score + ' × ' + (w.interest / 100).toFixed(2) + ' = ' +
      (Math.round(raw * 10) / 10) + ' → ' + total;
    return { parts: parts, weights: { industry: w.industry, size: w.size, interest: w.interest }, raw: raw, total: total, formula: formula };
  }

  function grade(total, rules) {
    if (total >= rules.thresholds.strongMin) return 'strong';
    if (total >= GOOD_MIN) return 'good';
    return 'weak';
  }

  function fitLabel(tier) {
    return { tier1: 'Strong fit', tier2: 'Good fit', other: 'Partial fit', excluded: 'Excluded' }[tier];
  }

  // Why a lead waiting for review is kept out of the queue by the rules, or null.
  function hiddenReason(lead, rules) {
    if (lead.stage !== 'lead') return null;
    if (industryTier(lead.industry, rules) === 'excluded') return 'excluded';
    if (lead.scoring.total < rules.thresholds.queueMin) return 'low';
    if (lead.lastContacted && daysSince(lead.lastContacted) < rules.thresholds.cooldownDays) return 'recent';
    return null;
  }

  window.Scoring = {
    hiddenReason: hiddenReason,
    scoreLead: scoreLead,
    grade: grade,
    fitLabel: fitLabel,
    industryTier: industryTier,
    daysSince: daysSince,
    money: money
  };
})();
