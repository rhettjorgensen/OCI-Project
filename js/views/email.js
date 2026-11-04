/*
 * Screen 3: Email review (step 2 of 2: approve the email).
 */
(function () {
  var esc = UI.esc;

  function nextTuesdayNine() {
    var d = new Date();
    d.setHours(9, 0, 0, 0);
    var add = (2 - d.getDay() + 7) % 7; // 2 = Tuesday
    if (add === 0 && d <= new Date()) add = 7;
    d.setDate(d.getDate() + add);
    return d;
  }

  function toLocalInputValue(date) {
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
      'T' + pad(date.getHours()) + ':' + pad(date.getMinutes());
  }

  function checkRow(ok, text, extra) {
    return '<div class="check ' + (ok ? 'ok' : 'fail') + '">' + (ok ? UI.CHECK_ICON : UI.CROSS_ICON) +
      '<span>' + text + (extra || '') + '</span></div>';
  }

  App.views.email = function (main, route) {
    return Promise.all([Api.getLead(route.id), Api.getRules()]).then(function (res) {
      var lead = res[0], rules = res[1];

      if (lead.stage !== 'email') {
        main.innerHTML =
          '<a class="back-link" href="#/lead/' + lead.id + '">← Back to lead</a>' +
          '<header><h1 class="page-title" style="margin-top:16px">Email to ' + esc(lead.name) + '</h1></header>' +
          '<div class="notice ' + (lead.stage === 'sent' ? 'good' : 'warn') + '">' +
          (lead.stage === 'lead' ? 'Approve the lead first. The email draft is created when you do.'
            : lead.stage === 'sent' ? 'This email was already approved.'
            : 'This lead was rejected, so there is no email to approve.') +
          ' <a href="#/lead/' + lead.id + '">Go to the lead</a></div>';
        return;
      }

      var c = lead.contact || {};
      var draft = lead.draft || { subject: '', body: '' };
      var tuesday = nextTuesdayNine();
      var recent = lead.lastContacted && Scoring.daysSince(lead.lastContacted) < rules.thresholds.cooldownDays;
      var topSignal = (lead.evidence || []).slice().sort(function (a, b) { return b.points - a.points; })[0];

      main.innerHTML =
        '<a class="back-link" href="#/lead/' + lead.id + '">← Back to lead</a>' +
        '<header>' +
          '<div class="eyebrow">Step 2 of 2 · Approve the email</div>' +
          '<h1 class="page-title" style="margin-top:6px">Email to ' + esc(lead.name) + '</h1>' +
          '<p class="page-sub">This is exactly what will be sent. Edit anything, then approve.</p>' +
        '</header>' +

        '<div class="columns">' +
          '<section class="card col-main" style="gap:16px">' +
            '<div class="email-grid">' +
              '<div class="muted">To</div>' +
              '<div class="to-field">' + esc(c.name + ' <' + c.email + '>') + '</div>' +
              '<label for="subject" class="muted">Subject</label>' +
              '<input id="subject" class="field" type="text" value="' + esc(draft.subject) + '">' +
            '</div>' +
            '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px">' +
              '<label for="body" class="muted">Message</label>' +
              '<span class="small muted" id="save-status" aria-live="polite"></span>' +
            '</div>' +
            '<textarea id="body" class="field" rows="14">' + esc(draft.body) + '</textarea>' +
            '<div style="display:flex;flex-wrap:wrap;gap:12px">' +
              '<button type="button" class="btn" id="regenerate">Regenerate draft</button>' +
              '<button type="button" class="btn" id="test-copy">Send me a test copy</button>' +
            '</div>' +
          '</section>' +

          '<aside class="col-side">' +
            '<section class="card">' +
              '<h2>Facts this email uses</h2>' +
              '<p class="card-sub" style="margin-bottom:8px">Each one came from the scraper. Check it is right.</p>' +
              '<div class="row-list">' +
                (topSignal
                  ? '<div class="fact-row"><div>' + esc(topSignal.headline) + '</div>' +
                    '<a href="#/lead/' + lead.id + '">' + esc(topSignal.source + ', ' + UI.ago(topSignal.foundAt)) + '</a></div>'
                  : '') +
                '<div class="fact-row"><div>Works in ' + esc(lead.industry.toLowerCase()) + '</div>' +
                  '<a href="#/lead/' + lead.id + '">Company facts</a></div>' +
              '</div>' +
            '</section>' +

            '<section class="card">' +
              '<h2 style="margin-bottom:8px">Before you approve</h2>' +
              '<div id="auto-checks"></div>' +
              '<label class="check"><input type="checkbox" id="facts-ok"><span>Facts above are correct</span></label>' +
            '</section>' +

            '<section class="card stack">' +
              '<label class="field-label">When to send' +
                '<select class="field" id="when">' +
                  '<option value="tuesday">' + esc(tuesday.toLocaleDateString(undefined, { weekday: 'long' })) + ' 9:00 AM, recipient time</option>' +
                  '<option value="now">Send immediately</option>' +
                  '<option value="pick">Pick a time</option>' +
                '</select></label>' +
              '<input type="datetime-local" class="field hidden" id="pick-time" aria-label="Send time" value="' + toLocalInputValue(tuesday) + '">' +
              '<div class="field-error hidden" id="approve-error" role="alert"></div>' +
              '<button type="button" class="btn primary block" id="approve">Approve and schedule send</button>' +
              '<button type="button" class="btn quiet" id="save-later">Save draft and come back</button>' +
            '</section>' +
          '</aside>' +
        '</div>';

      var subject = document.getElementById('subject');
      var body = document.getElementById('body');
      var factsOk = document.getElementById('facts-ok');
      var when = document.getElementById('when');
      var pick = document.getElementById('pick-time');
      var approveBtn = document.getElementById('approve');
      var approveError = document.getElementById('approve-error');
      var saveStatus = document.getElementById('save-status');

      function problems() {
        var list = [];
        if (recent) list.push('This company was contacted in the last ' + rules.thresholds.cooldownDays + ' days.');
        if (!subject.value.trim()) list.push('Add a subject.');
        if (UI.placeholders(subject.value + '\n' + body.value).length) list.push('Fill in every [bracketed] placeholder.');
        if (!/unsubscribe/i.test(body.value)) list.push('Add the unsubscribe line.');
        if (!factsOk.checked) list.push('Confirm the facts are correct.');
        if (when.value === 'pick' && (!pick.value || new Date(pick.value) <= new Date())) list.push('Pick a send time in the future.');
        return list;
      }

      function renderChecks() {
        var left = UI.placeholders(subject.value + '\n' + body.value);
        document.getElementById('auto-checks').innerHTML =
          checkRow(!recent, recent
            ? 'Contacted ' + esc(UI.ago(lead.lastContacted))
            : 'Not contacted in the last ' + rules.thresholds.cooldownDays + ' days') +
          checkRow(!left.length, left.length
            ? left.length + ' placeholder' + (left.length > 1 ? 's' : '') + ' still in [brackets]'
            : 'Placeholders in [brackets] are filled',
            left.length ? '<ul class="placeholder-list">' + left.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>' : '') +
          checkRow(/unsubscribe/i.test(body.value), /unsubscribe/i.test(body.value)
            ? 'Unsubscribe line is present'
            : 'Unsubscribe line is missing');
        approveBtn.setAttribute('aria-disabled', problems().length ? 'true' : 'false');
        approveBtn.textContent = when.value === 'now' ? 'Approve and send now' : 'Approve and schedule send';
        if (!approveError.classList.contains('hidden')) showProblems();
      }

      function showProblems() {
        var list = problems();
        approveError.innerHTML = list.length ? 'Before approving: ' + list.map(esc).join(' ') : '';
        approveError.classList.toggle('hidden', !list.length);
      }

      var saveTimer = null;
      function queueSave() {
        saveStatus.textContent = 'Saving…';
        clearTimeout(saveTimer);
        saveTimer = setTimeout(function () {
          Api.saveDraft(lead.id, { subject: subject.value, body: body.value }).then(function () {
            saveStatus.textContent = 'Draft saved';
          });
        }, 500);
      }

      [subject, body].forEach(function (el) {
        el.addEventListener('input', function () { renderChecks(); queueSave(); });
      });
      factsOk.addEventListener('change', renderChecks);
      when.addEventListener('change', function () {
        pick.classList.toggle('hidden', when.value !== 'pick');
        renderChecks();
      });
      pick.addEventListener('input', renderChecks);

      document.getElementById('regenerate').addEventListener('click', function () {
        if (!window.confirm('Replace the subject and message with a fresh draft? Your edits will be lost.')) return;
        Api.regenerateDraft(lead.id).then(function (updated) {
          subject.value = updated.draft.subject;
          body.value = updated.draft.body;
          factsOk.checked = false;
          renderChecks();
          saveStatus.textContent = 'New draft';
        });
      });

      document.getElementById('test-copy').addEventListener('click', function () {
        UI.toast('Test copies need the back end. Nothing was sent.');
      });

      document.getElementById('save-later').addEventListener('click', function () {
        clearTimeout(saveTimer);
        Api.saveDraft(lead.id, { subject: subject.value, body: body.value }).then(function () {
          UI.toast('Draft saved. It is waiting under Email review.');
          App.go('#/queue?tab=email');
        });
      });

      approveBtn.addEventListener('click', function () {
        if (problems().length) { showProblems(); return; }
        clearTimeout(saveTimer);
        var sendAt = when.value === 'now' ? new Date()
          : when.value === 'pick' ? new Date(pick.value)
          : tuesday;
        Api.approveEmail(lead.id, { subject: subject.value, body: body.value }, sendAt.toISOString()).then(function () {
          UI.toast(when.value === 'now'
            ? 'Approved. Nothing is actually emailed until the back end is connected.'
            : 'Approved and scheduled for ' + UI.formatDateTime(sendAt.toISOString()) + '. Nothing is actually emailed until the back end is connected.');
          App.go('#/queue?tab=sent');
        });
      });

      renderChecks();
    });
  };
})();
