/*
 * Screen 1: Review queue.
 */
(function () {
  var esc = UI.esc;

  // Kept between visits so filters survive opening a lead and coming back.
  var state = { search: '', score: 'any', industry: 'all', size: 'any', interest: 'any' };

  var TABS = [
    { id: 'lead', label: 'Lead review' },
    { id: 'email', label: 'Email review' },
    { id: 'sent', label: 'Sent' },
    { id: 'rejected', label: 'Rejected' }
  ];

  function strongestSignal(lead) {
    var best = null;
    (lead.evidence || []).forEach(function (e) {
      if (e.points > 0 && (!best || e.points > best.points)) best = e;
    });
    return best;
  }

  function matchesFilters(lead) {
    var q = state.search.trim().toLowerCase();
    if (q && (lead.name + ' ' + lead.domain).toLowerCase().indexOf(q) === -1) return false;

    var s = lead.scoring.total;
    if (state.score === 'strong' && s < 80) return false;
    if (state.score === 'good' && (s < 60 || s >= 80)) return false;
    if (state.score === 'weak' && s >= 60) return false;

    if (state.industry !== 'all' && lead.industry !== state.industry) return false;

    var n = lead.employees;
    if (state.size === 'small' && !(n != null && n < 50)) return false;
    if (state.size === 'mid' && !(n != null && n >= 50 && n <= 500)) return false;
    if (state.size === 'large' && !(n != null && n > 500)) return false;

    var sig = strongestSignal(lead);
    var strength = sig ? sig.strength : 'None';
    if (state.interest !== 'any' && strength !== state.interest) return false;
    return true;
  }

  function filterSelect(key, label, options) {
    var on = state[key] !== options[0][0];
    return '<select class="filter-select' + (on ? ' on' : '') + '" data-filter="' + key + '" aria-label="' + esc(label) + '">' +
      options.map(function (o) {
        return '<option value="' + esc(o[0]) + '"' + (state[key] === o[0] ? ' selected' : '') + '>' + esc(label + ': ' + o[1]) + '</option>';
      }).join('') + '</select>';
  }

  function stageBadge(lead) {
    if (lead.stage === 'sent' && lead.sendAt && new Date(lead.sendAt) > new Date()) {
      return '<span class="badge info">Scheduled</span>';
    }
    var st = UI.STAGES[lead.stage];
    return '<span class="badge ' + st.cls + '">' + esc(st.label) + '</span>';
  }

  function rowHref(lead) {
    return lead.stage === 'email' ? '#/email/' + lead.id : '#/lead/' + lead.id;
  }

  function rowHtml(lead, rules) {
    var sig = strongestSignal(lead);
    var tier = Scoring.industryTier(lead.industry, rules);
    var g = Scoring.grade(lead.scoring.total, rules);
    return '<a class="lead-grid lead-row" href="' + rowHref(lead) + '">' +
      '<div><div class="lead-name">' + esc(lead.name) + '</div><div class="sub mono">' + esc(lead.domain) + '</div></div>' +
      '<div><span class="score-pill ' + g + '">' + lead.scoring.total + '</span></div>' +
      '<div><div>' + (lead.employees != null ? esc(lead.employees.toLocaleString()) + ' employees' : 'Employees unknown') + '</div>' +
      '<div class="sub">' + (lead.revenueM != null ? esc(Scoring.money(lead.revenueM)) + ' est. revenue' : 'Revenue unknown') + '</div></div>' +
      '<div><div style="font-weight:500">' + esc(Scoring.fitLabel(tier)) + '</div><div class="sub">' + esc(lead.industry) + '</div></div>' +
      '<div><div>' + esc(sig ? sig.headline : 'No signal found') + '</div>' +
      '<div class="sub">' + esc(sig ? sig.source + ' · ' + UI.ago(sig.foundAt) : 'None') + '</div></div>' +
      '<div>' + stageBadge(lead) + '</div>' +
      '</a>';
  }

  App.views.queue = function (main, route) {
    var tab = route.params.tab || 'lead';
    if (!TABS.some(function (t) { return t.id === tab; })) tab = 'lead';

    return Promise.all([Api.listLeads(), Api.getRules(), Api.getMeta()]).then(function (res) {
      var leads = res[0], rules = res[1], meta = res[2];

      var visible = leads.filter(function (l) { return !Scoring.hiddenReason(l, rules); });
      var industries = leads.map(function (l) { return l.industry; })
        .filter(function (v, i, a) { return a.indexOf(v) === i; }).sort();

      main.innerHTML =
        '<header class="page-header">' +
          '<div><h1 class="page-title">Review queue</h1>' +
          '<p class="page-sub">Nothing is emailed until a person approves the lead and then the message itself.</p></div>' +
          '<div class="muted" style="font-size:13px">Last scrape: today, ' + esc(UI.formatTime(meta.lastScrapeAt)) +
          ' · <span class="mono">' + meta.newLeadsLastScrape + '</span> new leads</div>' +
        '</header>' +

        '<div class="filters">' +
          '<label class="search">' +
            '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#5B6472" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></svg>' +
            '<input type="search" id="search" aria-label="Search leads" placeholder="Search company or domain" value="' + esc(state.search) + '">' +
          '</label>' +
          filterSelect('score', 'Score', [['any', 'any'], ['strong', '80 and up'], ['good', '60 to 79'], ['weak', 'below 60']]) +
          filterSelect('industry', 'Industry', [['all', 'all']].concat(industries.map(function (i) { return [i, i]; }))) +
          filterSelect('size', 'Size', [['any', 'any'], ['small', 'under 50'], ['mid', '50 to 500'], ['large', 'over 500']]) +
          filterSelect('interest', 'Interest', [['any', 'any'], ['Strong', 'strong'], ['Medium', 'medium'], ['Weak', 'weak'], ['None', 'none']]) +
          '<button type="button" class="btn quiet" id="clear-filters">Clear</button>' +
        '</div>' +

        '<section class="card flush">' +
          '<div class="tabs" role="tablist" aria-label="Pipeline stage">' +
            TABS.map(function (t) {
              var count = visible.filter(function (l) { return l.stage === t.id; }).length;
              return '<button type="button" class="tab" role="tab" data-tab="' + t.id + '" aria-selected="' + (t.id === tab) + '">' +
                esc(t.label) + '<span class="tab-count">' + count + '</span></button>';
            }).join('') +
          '</div>' +
          '<div class="table-scroll"><div class="table">' +
            '<div class="lead-grid table-head"><div>Company</div><div>Score</div><div>Size</div><div>Industry fit</div><div>Strongest interest signal</div><div>Stage</div></div>' +
            '<div id="rows"></div>' +
          '</div></div>' +
          '<div id="table-foot"></div>' +
        '</section>' +

        '<p class="footnote">Sample data for design review. Companies and domains are fictional. ' +
        '<button type="button" class="link-btn" id="reset">Reset sample data</button></p>';

      function renderRows() {
        var inTab = visible.filter(function (l) { return l.stage === tab; });
        var rows = inTab.filter(matchesFilters)
          .sort(function (a, b) { return b.scoring.total - a.scoring.total; });
        var filtersOn = rows.length !== inTab.length;

        document.getElementById('rows').innerHTML = rows.length
          ? rows.map(function (l) { return rowHtml(l, rules); }).join('')
          : '<div class="empty">' + (filtersOn ? 'No leads match these filters.' : 'Nothing in this stage right now.') + '</div>';

        var foot = [];
        if (filtersOn) foot.push('Showing ' + rows.length + ' of ' + inTab.length + ' in this stage.');
        if (tab === 'lead') {
          var hidden = leads.filter(function (l) { return Scoring.hiddenReason(l, rules); });
          if (hidden.length) {
            foot.push(hidden.length + ' hidden by your <a href="#/rules">scoring rules</a> ' +
              '(score below ' + rules.thresholds.queueMin + ', excluded industry, or contacted in the last ' +
              rules.thresholds.cooldownDays + ' days).');
          }
        }
        document.getElementById('table-foot').innerHTML = foot.length ? '<div class="table-foot">' + foot.join(' ') + '</div>' : '';
      }
      renderRows();

      main.querySelectorAll('.tab').forEach(function (btn) {
        btn.addEventListener('click', function () { App.go('#/queue?tab=' + btn.dataset.tab); });
      });
      document.getElementById('search').addEventListener('input', function (e) {
        state.search = e.target.value;
        renderRows();
      });
      main.querySelectorAll('[data-filter]').forEach(function (sel) {
        sel.addEventListener('change', function () {
          state[sel.dataset.filter] = sel.value;
          sel.classList.toggle('on', sel.selectedIndex !== 0);
          renderRows();
        });
      });
      document.getElementById('clear-filters').addEventListener('click', function () {
        state = { search: '', score: 'any', industry: 'all', size: 'any', interest: 'any' };
        App.views.queue(main, route);
      });
      document.getElementById('reset').addEventListener('click', function () {
        if (!window.confirm('Reset all leads and scoring rules to the sample data? Your changes in this browser will be lost.')) return;
        Api.resetSampleData().then(function () {
          UI.toast('Sample data restored.');
          App.renderNav(route);
          App.views.queue(main, route);
        });
      });
    });
  };
})();
