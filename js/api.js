/*
 * The ONLY place the screens get or save data.
 *
 * For now it keeps everything in the browser (localStorage), seeded from
 * js/data.js. When the back end exists, replace the inside of each function
 * with a fetch() call to the server. Every function already returns a
 * Promise, so the screens will not need to change.
 *
 *   Example later:
 *   listLeads: function () { return fetch('/api/leads').then(r => r.json()); }
 */
(function () {
  var STORE_KEY = 'leadReviewConsole.v1';
  var memoryFallback = null; // used if the browser blocks localStorage

  function clone(x) {
    return JSON.parse(JSON.stringify(x));
  }

  function seed() {
    var rules = clone(SampleData.rules);
    var leads = clone(SampleData.leads).map(function (lead) {
      lead.scoring = Scoring.scoreLead(lead, rules);
      lead.draft = lead.stage === 'lead' || lead.stage === 'rejected' ? null : buildDraft(lead);
      return lead;
    });
    return { rules: rules, leads: leads, meta: clone(SampleData.meta) };
  }

  function load() {
    var raw = null;
    try { raw = window.localStorage.getItem(STORE_KEY); } catch (e) { /* blocked */ }
    if (raw) {
      try { return JSON.parse(raw); } catch (e) { /* corrupted, reseed */ }
    }
    if (memoryFallback) return memoryFallback;
    var db = seed();
    save(db);
    return db;
  }

  function save(db) {
    memoryFallback = db;
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) { /* blocked */ }
  }

  // Simulates a network call so the screens are written for async data.
  function respond(value) {
    return Promise.resolve(clone(value));
  }

  function findLead(db, id) {
    var lead = db.leads.filter(function (l) { return l.id === id; })[0];
    if (!lead) throw new Error('Lead not found: ' + id);
    return lead;
  }

  // Stand-in for the back end's draft writer.
  function buildDraft(lead) {
    var c = lead.contact || {};
    return {
      subject: 'A question about ' + lead.topic,
      body:
        'Hi ' + (c.firstName || '[First name]') + ',\n\n' +
        lead.hook + ' That is a problem we spend a lot of time on at [YOUR COMPANY].\n\n' +
        'We help teams like yours [ONE-LINE VALUE PROPOSITION]. If it would be useful, I can share a short example of how [A SIMILAR CUSTOMER] handled it.\n\n' +
        'Would a 15-minute call next week make sense?\n\n' +
        'Thanks,\n[Sender name]\n[YOUR COMPANY]\n\n' +
        'If you would rather not hear from us, reply "unsubscribe" and we will stop.'
    };
  }

  window.Api = {
    getMeta: function () {
      return respond(load().meta);
    },

    listLeads: function () {
      return respond(load().leads);
    },

    getLead: function (id) {
      return respond(findLead(load(), id));
    },

    approveLead: function (id) {
      var db = load();
      var lead = findLead(db, id);
      lead.stage = 'email';
      lead.approvedAt = new Date().toISOString();
      if (!lead.draft) lead.draft = buildDraft(lead);
      save(db);
      return respond(lead);
    },

    rejectLead: function (id, reason) {
      var db = load();
      var lead = findLead(db, id);
      lead.stage = 'rejected';
      lead.rejectReason = reason;
      lead.rejectedAt = new Date().toISOString();
      save(db);
      return respond(lead);
    },

    // Sends the lead back to "Needs review" (undo an approval or rejection).
    reopenLead: function (id) {
      var db = load();
      var lead = findLead(db, id);
      lead.stage = 'lead';
      delete lead.rejectReason;
      save(db);
      return respond(lead);
    },

    saveDraft: function (id, draft) {
      var db = load();
      var lead = findLead(db, id);
      lead.draft = { subject: draft.subject, body: draft.body };
      save(db);
      return respond(lead);
    },

    regenerateDraft: function (id) {
      var db = load();
      var lead = findLead(db, id);
      lead.draft = buildDraft(lead);
      save(db);
      return respond(lead);
    },

    // Front end only: marks the email approved and scheduled.
    // Nothing is actually sent until the back end exists.
    approveEmail: function (id, draft, sendAt) {
      var db = load();
      var lead = findLead(db, id);
      lead.draft = { subject: draft.subject, body: draft.body };
      lead.stage = 'sent';
      lead.sendAt = sendAt;
      lead.sentAt = sendAt;
      lead.lastContacted = sendAt;
      save(db);
      return respond(lead);
    },

    getRules: function () {
      return respond(load().rules);
    },

    saveRules: function (rules) {
      var db = load();
      db.rules = clone(rules);
      save(db);
      return respond(db.rules);
    },

    // Re-scores leads still in review (needs review + email to approve).
    rescoreOpenLeads: function () {
      var db = load();
      var count = 0;
      db.leads.forEach(function (lead) {
        if (lead.stage === 'lead' || lead.stage === 'email') {
          lead.scoring = Scoring.scoreLead(lead, db.rules);
          lead.scoredAt = new Date().toISOString();
          count++;
        }
      });
      save(db);
      return respond(count);
    },

    resetSampleData: function () {
      var db = seed();
      save(db);
      return respond(true);
    }
  };
})();
