/*
 * Screen 4: Scoring rules.
 */
(function () {
  var esc = UI.esc;

  var TIERS = [
    { key: 'tier1', label: 'Tier 1', scoreKey: 'tier1Score', cls: 'good' },
    { key: 'tier2', label: 'Tier 2', scoreKey: 'tier2Score', cls: 'warn' },
    { key: 'excluded', label: 'Excluded · never shown', scoreKey: null, cls: 'mute' }
  ];

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  function getPath(obj, path) {
    return path.split('.').reduce(function (o, k) { return o[k]; }, obj);
  }
  function setPath(obj, path, value) {
    var keys = path.split('.');
    var last = keys.pop();
    keys.reduce(function (o, k) { return o[k]; }, obj)[last] = value;
  }

  function num(path, rules, opts) {
    opts = opts || {};
    return '<input type="number" class="field num' + (opts.wide ? ' wide' : '') + '" data-path="' + path + '" value="' + getPath(rules, path) + '"' +
      ' min="' + (opts.min != null ? opts.min : 0) + '"' + (opts.max != null ? ' max="' + opts.max + '"' : '') +
      ' step="' + (opts.step || 1) + '" aria-label="' + esc(opts.label || path) + '">';
  }

  function validate(r) {
    var errors = [];
    var w = r.weights;
    var sum = w.industry + w.size + w.interest;
    if (sum !== 100) errors.push('Weights add up to ' + sum + '%. They must add up to 100%.');
    ['employees', 'revenue'].forEach(function (k) {
      var g = r.size[k];
      var name = k === 'employees' ? 'Employee' : 'Revenue';
      if (g.fullMin > g.fullMax) errors.push(name + ' full-score range starts above where it ends.');
      if (g.partialMin > g.fullMin || g.partialMax < g.fullMax) errors.push(name + ' partial range must surround the full-score range.');
    });
    var t = r.thresholds;
    if (t.queueMin > 100 || t.strongMin > 100) errors.push('Thresholds must be between 0 and 100.');
    if (t.queueMin > t.strongMin) errors.push('The queue threshold is higher than the strong-lead threshold.');
    var all = [];
    function check(path) {
      var v = getPath(r, path);
      if (typeof v !== 'number' || isNaN(v) || v < 0) all.push(path);
    }
    ['weights.industry', 'weights.size', 'weights.interest', 'industry.tier1Score', 'industry.tier2Score', 'industry.otherScore',
      'size.fullScore', 'size.partialScore', 'size.lowScore', 'interest.halfAfterDays', 'interest.extraSignalBonus',
      'thresholds.queueMin', 'thresholds.strongMin', 'thresholds.cooldownDays'].forEach(check);
    if (all.length) errors.push('Every number must be filled in and not negative.');
    return errors;
  }

  App.views.rules = function (main) {
    return Promise.all([Api.getRules(), Api.listLeads()]).then(function (res) {
      var saved = res[0];
      var draft = clone(saved);
      var knownIndustries = res[1].map(function (l) { return l.industry; })
        .filter(function (v, i, a) { return a.indexOf(v) === i; }).sort();

      function dirty() { return JSON.stringify(draft) !== JSON.stringify(saved); }
      App.leaveGuard = function () {
        return dirty() ? 'You have unsaved changes to the scoring rules. Leave without saving?' : null;
      };

      function render() {
        var w = draft.weights;
        main.innerHTML =
          '<header class="page-header">' +
            '<div><h1 class="page-title">Scoring rules</h1>' +
            '<p class="page-sub">These rules decide each lead’s 0 to 100 score. Changes apply to new leads. Existing leads can be re-scored.</p></div>' +
            '<div style="display:flex;gap:12px;flex-wrap:wrap">' +
              '<span class="unsaved hidden" id="unsaved">Unsaved changes</span>' +
              '<button type="button" class="btn" id="rescore">Re-score open leads</button>' +
              '<button type="button" class="btn primary" id="save">Save changes</button>' +
            '</div>' +
          '</header>' +
          '<div class="field-error hidden" id="errors" role="alert"></div>' +

          '<section class="card">' +
            '<h2 style="margin-bottom:16px">Weights</h2>' +
            '<div class="weight-bar" id="weight-bar" aria-hidden="true"></div>' +
            '<div class="weight-inputs">' +
              '<label><span class="swatch" style="background:#1F4FD8"></span>Industry fit ' + num('weights.industry', draft, { max: 100, label: 'Industry fit weight' }) + '%</label>' +
              '<label><span class="swatch" style="background:#14181F"></span>Company size ' + num('weights.size', draft, { max: 100, label: 'Company size weight' }) + '%</label>' +
              '<label><span class="swatch" style="background:#6B7BA8"></span>Indicated interest ' + num('weights.interest', draft, { max: 100, label: 'Indicated interest weight' }) + '%</label>' +
            '</div>' +
            '<div class="small muted" id="weight-sum" style="margin-top:8px"></div>' +
          '</section>' +

          '<div class="grid-2">' +
            '<section class="card">' +
              '<h2>Industry fit</h2>' +
              '<p class="card-sub">Match against your target list.</p>' +
              TIERS.map(function (t) {
                var list = draft.industry[t.key];
                return '<div class="tier-label">' + esc(t.label) +
                  (t.scoreKey ? ' · scores ' + num('industry.' + t.scoreKey, draft, { max: 100, label: t.label + ' score' }) : '') + '</div>' +
                  '<div class="chips">' +
                    (list.length ? list.map(function (name, i) {
                      return '<span class="chip ' + t.cls + '">' + esc(name) +
                        '<button type="button" class="chip-remove" data-remove="' + t.key + '" data-index="' + i + '" aria-label="Remove ' + esc(name) + '">×</button></span>';
                    }).join('') : '<span class="muted">None yet</span>') +
                  '</div>' +
                  '<form class="add-row" data-add="' + t.key + '">' +
                    '<input class="field" list="industry-list" placeholder="Add an industry" aria-label="Add an industry to ' + esc(t.label) + '">' +
                    '<button type="submit" class="btn">Add</button>' +
                  '</form>';
              }).join('') +
              '<div class="tier-label" style="margin-bottom:0">Any other industry · scores ' + num('industry.otherScore', draft, { max: 100, label: 'Other industry score' }) + '</div>' +
              '<datalist id="industry-list">' + knownIndustries.map(function (i) { return '<option value="' + esc(i) + '">'; }).join('') + '</datalist>' +
            '</section>' +

            '<section class="card">' +
              '<h2>Company size</h2>' +
              '<p class="card-sub">Uses employees when known, otherwise revenue ($ millions).</p>' +
              '<div class="size-grid">' +
                '<div class="th">Range</div><div class="th">Employees</div><div class="th">Revenue ($M)</div>' +
                '<div>Full score ' + num('size.fullScore', draft, { max: 100, label: 'Full score points' }) + '</div>' +
                '<div class="range">' + num('size.employees.fullMin', draft, { label: 'Full score, employees from' }) + '–' + num('size.employees.fullMax', draft, { label: 'Full score, employees to' }) + '</div>' +
                '<div class="range">' + num('size.revenue.fullMin', draft, { step: 0.1, label: 'Full score, revenue from' }) + '–' + num('size.revenue.fullMax', draft, { step: 0.1, label: 'Full score, revenue to' }) + '</div>' +
                '<div>Partial score ' + num('size.partialScore', draft, { max: 100, label: 'Partial score points' }) + '</div>' +
                '<div class="range">' + num('size.employees.partialMin', draft, { label: 'Partial score, employees from' }) + '–' + num('size.employees.partialMax', draft, { label: 'Partial score, employees to' }) + '</div>' +
                '<div class="range">' + num('size.revenue.partialMin', draft, { step: 0.1, label: 'Partial score, revenue from' }) + '–' + num('size.revenue.partialMax', draft, { step: 0.1, label: 'Partial score, revenue to' }) + '</div>' +
                '<div>Low score ' + num('size.lowScore', draft, { max: 100, label: 'Low score points' }) + '</div>' +
                '<div class="mono muted">outside</div><div class="mono muted">outside</div>' +
              '</div>' +
              '<p class="small muted" style="margin:16px 0 0">Partial ranges include everything around the full range, so 10–2,000 employees with a 50–500 full range gives partial for 10–49 and 501–2,000.</p>' +
            '</section>' +
          '</div>' +

          '<section class="card">' +
            '<h2>Indicated interest</h2>' +
            '<p class="card-sub" style="margin-bottom:12px">Signals older than ' + num('interest.halfAfterDays', draft, { label: 'Days before a signal counts half' }) +
            ' days count half. The best signal sets the score, and each extra signal adds ' + num('interest.extraSignalBonus', draft, { max: 20, label: 'Bonus points per extra signal' }) + ' points.</p>' +
            '<div class="table-scroll"><div style="min-width:560px">' +
              '<div class="signal-grid th" style="padding:10px 0"><div>Signal</div><div>Strength</div><div>Points</div></div>' +
              '<div class="row-list">' +
                [['Posts or asks about the problem you solve', 'Strong', '90–100'],
                 ['Hiring for a related role', 'Medium', '60–75'],
                 ['Growth news: expansion, funding, new product', 'Weak', '30–50'],
                 ['No signal found', 'None', '0']].map(function (s) {
                  return '<div class="signal-grid"><div>' + esc(s[0]) + '</div><div><span class="badge ' + UI.STRENGTH_CLASS[s[1]] + '">' + s[1] + '</span></div><div class="mono">' + s[2] + '</div></div>';
                }).join('') +
              '</div>' +
            '</div></div>' +
            '<p class="small muted" style="margin:12px 0 0">The scraper assigns each signal its points within these bands.</p>' +
          '</section>' +

          '<section class="card">' +
            '<h2 style="margin-bottom:12px">Thresholds and safeguards</h2>' +
            '<div class="row-list">' +
              '<div class="setting-row"><span>Show in the review queue at or above</span>' + num('thresholds.queueMin', draft, { max: 100, label: 'Queue threshold' }) + '</div>' +
              '<div class="setting-row"><span>Mark as a strong lead at or above</span>' + num('thresholds.strongMin', draft, { max: 100, label: 'Strong lead threshold' }) + '</div>' +
              '<div class="setting-row"><span>Skip companies contacted in the last</span><span class="range">' + num('thresholds.cooldownDays', draft, { label: 'Days to skip after contact' }) + ' days</span></div>' +
              '<div class="setting-row"><span>Require a person to approve every lead and every email</span><span class="badge mute">Always on</span></div>' +
            '</div>' +
          '</section>' +

          '<p class="footnote">Industries, ranges and weights shown are starting values for design review.</p>';

        bind();
        refresh();
      }

      function refresh() {
        var w = draft.weights;
        var sum = (w.industry || 0) + (w.size || 0) + (w.interest || 0);
        document.getElementById('weight-bar').innerHTML =
          '<div style="flex:' + Math.max(w.industry, 0) + ';background:#1F4FD8">' + w.industry + '%</div>' +
          '<div style="flex:' + Math.max(w.size, 0) + ';background:#14181F">' + w.size + '%</div>' +
          '<div style="flex:' + Math.max(w.interest, 0) + ';background:#6B7BA8">' + w.interest + '%</div>';
        var sumEl = document.getElementById('weight-sum');
        sumEl.textContent = 'Total: ' + sum + '%' + (sum === 100 ? '' : ' (must be 100%)');
        sumEl.style.color = sum === 100 ? '' : 'var(--bad-fg)';
        document.getElementById('unsaved').classList.toggle('hidden', !dirty());
      }

      function bind() {
        main.querySelectorAll('[data-path]').forEach(function (input) {
          input.addEventListener('input', function () {
            var v = input.value === '' ? NaN : Number(input.value);
            setPath(draft, input.dataset.path, v);
            input.classList.toggle('error', isNaN(v) || v < 0);
            refresh();
          });
        });

        main.querySelectorAll('[data-remove]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            draft.industry[btn.dataset.remove].splice(Number(btn.dataset.index), 1);
            render();
          });
        });

        main.querySelectorAll('[data-add]').forEach(function (form) {
          form.addEventListener('submit', function (e) {
            e.preventDefault();
            var input = form.querySelector('input');
            var name = input.value.trim();
            if (!name) return;
            // An industry can only be on one list, so adding it moves it.
            TIERS.forEach(function (t) {
              draft.industry[t.key] = draft.industry[t.key].filter(function (n) { return n.toLowerCase() !== name.toLowerCase(); });
            });
            draft.industry[form.dataset.add].push(name);
            var key = form.dataset.add;
            render();
            main.querySelector('[data-add="' + key + '"] input').focus();
          });
        });

        document.getElementById('save').addEventListener('click', function () {
          var errors = validate(draft);
          var box = document.getElementById('errors');
          if (errors.length) {
            box.innerHTML = errors.map(esc).join('<br>');
            box.classList.remove('hidden');
            box.scrollIntoView({ block: 'center', behavior: 'smooth' });
            return;
          }
          box.classList.add('hidden');
          Api.saveRules(draft).then(function (r) {
            saved = clone(r);
            draft = clone(r);
            refresh();
            UI.toast('Rules saved. New leads use them now. Re-score to update leads already in review.');
          });
        });

        document.getElementById('rescore').addEventListener('click', function () {
          if (dirty()) {
            UI.toast('Save your changes first, then re-score.');
            return;
          }
          Api.rescoreOpenLeads().then(function (count) {
            UI.toast(count + ' open lead' + (count === 1 ? '' : 's') + ' re-scored with the saved rules.');
          });
        });
      }

      render();
    });
  };
})();
