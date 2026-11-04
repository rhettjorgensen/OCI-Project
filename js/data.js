/*
 * Sample data for the front end.
 *
 * Everything here is fictional and stands in for what the back end will
 * eventually provide (scraped leads and saved scoring rules). The screens
 * never read this file directly: they go through js/api.js, so when the back
 * end exists only api.js has to change.
 */
(function () {
  function daysAgo(n) {
    return new Date(Date.now() - n * 86400000).toISOString();
  }
  function hoursAgo(n) {
    return new Date(Date.now() - n * 3600000).toISOString();
  }

  var DEFAULT_RULES = {
    // Percent. Must add up to 100.
    weights: { industry: 35, size: 30, interest: 35 },
    industry: {
      tier1: ['Freight and logistics', 'Healthcare services', 'Field services'],
      tier2: ['Food manufacturing', 'Data services', 'Software'],
      excluded: [],
      tier1Score: 100,
      tier2Score: 70,
      otherScore: 30
    },
    size: {
      // Employees are used when known, otherwise revenue (in $ millions).
      employees: { fullMin: 50, fullMax: 500, partialMin: 10, partialMax: 2000 },
      revenue: { fullMin: 5, fullMax: 100, partialMin: 1, partialMax: 100 },
      fullScore: 100,
      partialScore: 60,
      lowScore: 20
    },
    interest: {
      halfAfterDays: 30, // signals older than this count half
      extraSignalBonus: 3 // points added for each additional signal
    },
    thresholds: {
      queueMin: 40, // show in the review queue at or above
      strongMin: 80, // mark as a strong lead at or above
      cooldownDays: 90 // skip companies contacted within this many days
    }
  };

  // Each evidence item is what the scraper found. "points" is the scraper's
  // rating inside the strength band shown on the Scoring rules screen.
  var SAMPLE_LEADS = [
    {
      id: 'harborline',
      name: 'Harborline Logistics',
      domain: 'harborline.example',
      employees: 240,
      employeesSource: 'LinkedIn',
      revenueM: 38,
      industry: 'Freight and logistics',
      contact: { name: '[Contact name]', firstName: '[First name]', title: 'VP of Operations', email: 'ops-lead@harborline.example', verified: true },
      lastContacted: null,
      stage: 'lead',
      scoredAt: hoursAgo(2),
      topic: 'your route planning',
      hook: 'I saw your recent post asking how other teams keep route planning from eating up the day.',
      evidence: [
        { source: 'LinkedIn post', foundAt: daysAgo(2), headline: 'Asked peers for tools to cut manual route planning', detail: 'The operations lead asked peers which tools they use to cut down manual route planning.', strength: 'Strong', points: 92, url: '#' },
        { source: 'Careers page', foundAt: daysAgo(6), headline: 'Hiring a dispatch operations manager', detail: 'Open role for a dispatch operations manager.', strength: 'Medium', points: 65, url: '#' },
        { source: 'Company blog', foundAt: daysAgo(21), headline: 'Announced two new regional hubs', detail: 'Announced two new regional hubs.', strength: 'Weak', points: 40, url: '#' }
      ]
    },
    {
      id: 'northgate',
      name: 'Northgate Dental Group',
      domain: 'northgate-dental.example',
      employees: 95,
      employeesSource: 'LinkedIn',
      revenueM: 12,
      industry: 'Healthcare services',
      contact: { name: '[Contact name]', firstName: '[First name]', title: 'Practice Operations Director', email: 'operations@northgate-dental.example', verified: true },
      lastContacted: null,
      stage: 'lead',
      scoredAt: hoursAgo(3),
      topic: 'patient scheduling',
      hook: 'I noticed you are hiring a scheduling coordinator.',
      evidence: [
        { source: 'Careers page', foundAt: daysAgo(5), headline: 'Hiring a scheduling coordinator', detail: 'Open role for a scheduling coordinator across three offices.', strength: 'Medium', points: 72, url: '#' }
      ]
    },
    {
      id: 'pinecrest',
      name: 'Pinecrest Analytics',
      domain: 'pinecrest.example',
      employees: 48,
      employeesSource: 'LinkedIn',
      revenueM: 6,
      industry: 'Data services',
      contact: { name: '[Contact name]', firstName: '[First name]', title: 'Head of Operations', email: 'hello@pinecrest.example', verified: false },
      lastContacted: null,
      stage: 'lead',
      scoredAt: hoursAgo(3),
      topic: 'vendor consolidation',
      hook: 'I saw a comment from your team about consolidating vendors.',
      evidence: [
        { source: 'Reddit', foundAt: daysAgo(7), headline: 'Commented on a thread about vendor consolidation', detail: 'A team member described trying to cut the number of tools they pay for.', strength: 'Strong', points: 90, url: '#' }
      ]
    },
    {
      id: 'tallowoak',
      name: 'Tallow and Oak Foods',
      domain: 'tallowoak.example',
      employees: 310,
      employeesSource: 'LinkedIn',
      revenueM: 74,
      industry: 'Food manufacturing',
      contact: { name: '[Contact name]', firstName: '[First name]', title: 'Plant Operations Manager', email: 'ops@tallowoak.example', verified: true },
      lastContacted: null,
      stage: 'lead',
      scoredAt: hoursAgo(4),
      topic: 'your second facility',
      hook: 'Congratulations on opening your second facility.',
      evidence: [
        { source: 'News', foundAt: daysAgo(14), headline: 'No direct signal. Opened a second facility.', detail: 'Local news covered the opening of a second production facility.', strength: 'Weak', points: 45, url: '#' }
      ]
    },
    {
      id: 'meridian',
      name: 'Meridian Field Services',
      domain: 'meridianfield.example',
      employees: 22,
      employeesSource: 'LinkedIn',
      revenueM: 3,
      industry: 'Field services',
      contact: { name: '[Contact name]', firstName: '[First name]', title: 'Owner', email: 'owner@meridianfield.example', verified: false },
      lastContacted: null,
      stage: 'lead',
      scoredAt: hoursAgo(5),
      topic: 'operations help',
      hook: 'I heard you mention on a podcast that the team needs help on the operations side.',
      evidence: [
        { source: 'Podcast', foundAt: daysAgo(21), headline: 'Mentioned needing ops help on a podcast', detail: 'The owner said scheduling crews takes most of a day each week.', strength: 'Strong', points: 90, url: '#' }
      ]
    },
    {
      id: 'copperleaf',
      name: 'Copperleaf Legal',
      domain: 'copperleaf.example',
      employees: 9,
      employeesSource: 'Company site',
      revenueM: 1.4,
      industry: 'Legal services',
      contact: { name: '[Contact name]', firstName: '[First name]', title: 'Managing Partner', email: 'info@copperleaf.example', verified: false },
      lastContacted: null,
      stage: 'lead',
      scoredAt: hoursAgo(5),
      topic: 'your practice operations',
      hook: '[WHY YOU ARE REACHING OUT]',
      evidence: []
    },
    {
      id: 'brightwell',
      name: 'Brightwell Solar',
      domain: 'brightwell.example',
      employees: 150,
      employeesSource: 'LinkedIn',
      revenueM: 27,
      industry: 'Energy',
      contact: { name: '[Contact name]', firstName: '[First name]', title: 'Director of Sales Operations', email: 'salesops@brightwell.example', verified: true },
      lastContacted: null,
      stage: 'email',
      scoredAt: hoursAgo(26),
      topic: 'faster customer quoting',
      hook: 'I read about your pilot for faster customer quoting.',
      evidence: [
        { source: 'Press release', foundAt: daysAgo(4), headline: 'Announced a pilot for faster customer quoting', detail: 'Press release announced a pilot to cut quote turnaround from days to hours.', strength: 'Strong', points: 95, url: '#' }
      ]
    },
    {
      id: 'quillstone',
      name: 'Quillstone Software',
      domain: 'quillstone.example',
      employees: 60,
      employeesSource: 'LinkedIn',
      revenueM: 9,
      industry: 'Software',
      contact: { name: '[Contact name]', firstName: '[First name]', title: 'Founder', email: 'founder@quillstone.example', verified: true },
      lastContacted: null,
      stage: 'email',
      scoredAt: hoursAgo(30),
      topic: 'support costs',
      hook: 'I saw your post about rising support costs.',
      evidence: [
        { source: 'X', foundAt: daysAgo(3), headline: 'Founder posted about rising support costs', detail: 'The founder said support costs have doubled this year.', strength: 'Strong', points: 91, url: '#' }
      ]
    },
    {
      id: 'alderbrook',
      name: 'Alderbrook Realty',
      domain: 'alderbrook.example',
      employees: 85,
      employeesSource: 'LinkedIn',
      revenueM: 15,
      industry: 'Real estate',
      contact: { name: 'Dana Ruiz', firstName: 'Dana', title: 'Operations Manager', email: 'dana@alderbrook.example', verified: true },
      lastContacted: daysAgo(6),
      stage: 'sent',
      sentAt: daysAgo(6),
      scoredAt: daysAgo(8),
      topic: 'CRM options',
      hook: 'I saw you asking for CRM recommendations.',
      evidence: [
        { source: 'LinkedIn post', foundAt: daysAgo(9), headline: 'Asked for CRM recommendations', detail: 'Asked their network which CRM works best for a growing brokerage.', strength: 'Strong', points: 90, url: '#' }
      ]
    },
    {
      id: 'fernhill',
      name: 'Fernhill Veterinary',
      domain: 'fernhill.example',
      employees: 14,
      employeesSource: 'Company site',
      revenueM: 2,
      industry: 'Veterinary',
      contact: { name: '[Contact name]', firstName: '[First name]', title: 'Practice Manager', email: 'office@fernhill.example', verified: false },
      lastContacted: null,
      stage: 'rejected',
      rejectReason: 'Signal is not real interest',
      scoredAt: daysAgo(3),
      topic: 'your practice',
      hook: '[WHY YOU ARE REACHING OUT]',
      evidence: []
    }
  ];

  var META = {
    lastScrapeAt: (function () {
      var d = new Date();
      d.setHours(6, 2, 0, 0);
      return d.toISOString();
    })(),
    newLeadsLastScrape: 38
  };

  window.SampleData = {
    rules: DEFAULT_RULES,
    leads: SAMPLE_LEADS,
    meta: META
  };
})();
