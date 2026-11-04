/*
 * Screen 2: Lead review (step 1 of 2: is this a good lead?).
 */
(function () {
  var esc = UI.esc;

  var REJECT_REASONS = [
    'Wrong industry',
    'Too small or too large',
    'Signal is not real interest',
    'Already a customer or contacted'
  ];

  var GRADE = {
    strong: { label: 'Strong lead', cls: 'good' },
    good: { label: 'Good lead', cls: 'warn' },
    weak: { label: 'Weak lead', cls: 'mute' }
  };

  function partHtml(title, weight, part) {
    return '<div>' +
      '<div class="part-head"><div style="font-weight:500">' + esc(title) + ' <span class="muted" style="font-weight:400">· weight ' + weight + '%</span></div>' +
      '<div class="mono" style="font-weight:500">' + part.score + '</div></div>' +
      '<div class="bar" role="img" aria-label="' + esc(title) + ' ' + part.score + ' out of 100"><div style="width:' + part.score + '%"></div></div>' +
      '<div class="muted">' + esc(part.note) + '</div>' +
    '</div>';
  }

  function evidenceHtml(e) {
    return '<div class="evidence">' +
      '<div class="evidence-main"><div style="font-weight:500">' + esc(e.source + ' · ' + UI.ago(e.foundAt)) + '</div>' +
      '<div style="margin-top:4px;color:var(--text-2)">' + esc(e.detail) + '</div></div>' +
      '<div class="evidence-side"><span class="badge ' + (UI.STRENGTH_CLASS[e.strength] || 'mute') + '">' + esc(e.strength) + '</span>' +
      '<a href="' + esc(e.url) + '" target="_blank" rel="noopener" style="min-height:44px;display:inline-flex;align-items:center;text-decoration:none" data-source>Open source</a></div>' +
    '</div>';
  }

  function decisionHtml(lead, rules) {
    if (lead.stage === 'email') {
      return '<section class="card stack"><h2>Your decision</h2>' +
        '<div class="notice good">Lead approved. The email is waiting for your approval.</div>' +
        '<a class="btn primary block" href="#/email/' + lead.id + '">Review the email</a>' +
        '<button type="button" class="btn quiet" id="reopen">Move back to review</button></section>';
    }
    if (lead.stage === 'sent') {
      var future = lead.sendAt && new Date(lead.sendAt) > new Date();
      return '<section class="card stack"><h2>Your decision</h2>' +
        '<div class="notice good">' + (future ? 'Email scheduled for ' : 'Email sent ') + esc(UI.formatDateTime(lead.sendAt || lead.sentAt)) + '.</div>' +
        (lead.draft ? '<div><div class="muted small">Subject</div><div>' + esc(lead.draft.subject) + '</div></div>' : '') +
        '</section>';
    }
    if (lead.stage === 'rejected') {
      return '<section class="card stack"><h2>Your decision</h2>' +
        '<div class="notice mute">Rejected: ' + esc(lead.rejectReason || 'no reason given') + '</div>' +
        '<button type="button" class="btn" id="reopen">Move back to review</button></section>';
    }

    var recent = lead.lastContacted && Scoring.daysSince(lead.lastContacted) < rules.thresholds.cooldownDays;
    return '<section class="card stack"><h2>Your decision</h2>' +
      (recent ? '<div class="notice warn">Contacted ' + esc(UI.ago(lead.lastContacted)) + '. Your rules skip companies contacted in the last ' + rules.thresholds.cooldownDays + ' days.</div>' : '') +
      '<button type="button" class="btn primary block" id="approve"' + (recent ? ' disabled' : '') + '>Approve lead and draft email</button>' +
      '<button type="button" class="btn block" id="reject">Reject lead</button>' +
      '<label class="field-label">Reason, if rejecting' +
        '<select class="field" id="reason"><option value="">Choose a reason</option>' +
        REJECT_REASONS.map(function (r) { return '<option>' + esc(r) + '</option>'; }).join('') +
        '</select></label>' +
      '<div class="field-error hidden" id="reason-error" role="alert">Choose a reason before rejecting.</div>' +
      '<a class="btn quiet" href="#/queue">Skip for now</a>' +
    '</section>';
  }

  App.views.lead = function (main, route) {
    return Promise.all([Api.getLead(route.id), Api.getRules()]).then(function (res) {
      var lead = res[0], rules = res[1];
      var sc = lead.scoring;
      var g = GRADE[Scoring.grade(sc.total, rules)];
      var live = Scoring.scoreLead(lead, rules);
      var stale = (lead.stage === 'lead' || lead.stage === 'email') && live.total !== sc.total;
      var c = lead.contact || {};

      main.innerHTML =
        '<a class="back-link" href="#/queue' + (lead.stage === 'lead' ? '' : '?tab=' + lead.stage) + '">← Back to queue</a>' +
        '<header class="page-header top">' +
          '<div><div class="eyebrow">Step 1 of 2 · Is this a good lead?</div>' +
          '<h1 class="page-title" style="margin-top:6px">' + esc(lead.name) + '</h1>' +
          '<div class="mono muted" style="font-size:13px;margin-top:4px">' + esc(lead.domain) + '</div></div>' +
          '<div class="score-box">' +
            '<div class="score-big ' + Scoring.grade(sc.total, rules) + '">' + sc.total + '</div>' +
            '<div><span class="badge ' + g.cls + '">' + g.label + '</span>' +
            '<div class="small muted" style="margin-top:6px">out of 100 · scored ' + esc(UI.ago(lead.scoredAt)) + '</div></div>' +
          '</div>' +
        '</header>' +

        '<div class="columns">' +
          '<div class="col-main">' +
            '<section class="card">' +
              '<h2>How the score was built</h2>' +
              '<p class="card-sub" style="margin-bottom:20px">Each part is scored 0 to 100, then weighted. <a href="#/rules">Change the rules</a></p>' +
              (stale ? '<div class="notice warn" style="margin-bottom:20px">Your rules changed since this lead was scored. With the current rules it would score ' + live.total + '. Use “Re-score open leads” on <a href="#/rules">Scoring rules</a> to update it.</div>' : '') +
              '<div class="parts">' +
                partHtml('Industry fit', sc.weights.industry, sc.parts.industry) +
                partHtml('Company size', sc.weights.size, sc.parts.size) +
                partHtml('Indicated interest', sc.weights.interest, sc.parts.interest) +
              '</div>' +
              '<div class="formula">' + esc(sc.formula) + '</div>' +
            '</section>' +

            '<section class="card">' +
              '<h2>Evidence the scraper found</h2>' +
              '<p class="card-sub" style="margin-bottom:8px">Open each source to check it before you approve.</p>' +
              (lead.evidence.length
                ? '<div class="row-list">' + lead.evidence.map(evidenceHtml).join('') + '</div>'
                : '<p class="muted" style="margin:16px 0 0">No interest signals found for this company.</p>') +
            '</section>' +
          '</div>' +

          '<aside class="col-side">' +
            decisionHtml(lead, rules) +
            '<section class="card">' +
              '<h2 style="margin-bottom:12px">Contact</h2>' +
              '<div style="font-weight:500">' + esc(c.name) + '</div>' +
              '<div class="muted">' + esc(c.title) + '</div>' +
              '<div class="mono" style="font-size:13px;margin-top:8px;word-break:break-all">' + esc(c.email) + '</div>' +
              '<div style="margin-top:8px">' + (c.verified
                ? '<span class="badge good">Address verified</span>'
                : '<span class="badge warn">Address not verified</span>') + '</div>' +
            '</section>' +
            '<section class="card">' +
              '<h2 style="margin-bottom:12px">Company facts</h2>' +
              '<dl class="facts" style="margin:0">' +
                '<dt>Employees</dt><dd>' + (lead.employees != null ? esc(lead.employees.toLocaleString()) + ' <span class="muted">· ' + esc(lead.employeesSource) + '</span>' : 'Unknown') + '</dd>' +
                '<dt>Revenue</dt><dd>' + (lead.revenueM != null ? esc(Scoring.money(lead.revenueM)) + ' <span class="muted">· estimate</span>' : 'Unknown') + '</dd>' +
                '<dt>Industry</dt><dd>' + esc(lead.industry) + '</dd>' +
                '<dt>Last contacted</dt><dd>' + esc(UI.ago(lead.lastContacted)) + '</dd>' +
              '</dl>' +
              '<p class="small muted" style="margin:16px 0 0">Revenue figures are estimates. Check them if size decides your call.</p>' +
            '</section>' +
          '</aside>' +
        '</div>';

      main.querySelectorAll('[data-source]').forEach(function (a) {
        if (a.getAttribute('href') === '#') {
          a.addEventListener('click', function (e) {
            e.preventDefault();
            UI.toast('Sample data has no real source link. The scraper will provide one.');
          });
        }
      });

      var approve = document.getElementById('approve');
      if (approve) {
        approve.addEventListener('click', function () {
          approve.disabled = true;
          Api.approveLead(lead.id).then(function () { App.go('#/email/' + lead.id); });
        });
      }

      var reject = document.getElementById('reject');
      if (reject) {
        var reason = document.getElementById('reason');
        var error = document.getElementById('reason-error');
        reason.addEventListener('change', function () {
          error.classList.add('hidden');
          reason.classList.remove('error');
        });
        reject.addEventListener('click', function () {
          if (!reason.value) {
            error.classList.remove('hidden');
            reason.classList.add('error');
            reason.focus();
            return;
          }
          Api.rejectLead(lead.id, reason.value).then(function () {
            UI.toast(lead.name + ' rejected: ' + reason.value + '.');
            App.go('#/queue');
          });
        });
      }

      var reopen = document.getElementById('reopen');
      if (reopen) {
        reopen.addEventListener('click', function () {
          Api.reopenLead(lead.id).then(function () {
            UI.toast(lead.name + ' moved back to review.');
            App.views.lead(main, route);
            App.renderNav(route);
          });
        });
      }
    });
  };
})();
