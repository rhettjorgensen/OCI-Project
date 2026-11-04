/*
 * App shell: navigation and the hash router.
 *
 * URLs look like:
 *   #/queue?tab=lead     Review queue (tabs: lead, email, sent, rejected)
 *   #/lead/harborline    Step 1: lead review
 *   #/email/harborline   Step 2: email review
 *   #/rules              Scoring rules
 *   #/scraper            Scraper runs (needs the back end)
 *
 * Each screen lives in js/views/ and registers itself on App.views.
 */
(function () {
  var App = {
    views: {},
    leaveGuard: null // a screen can set this to warn about unsaved changes
  };
  window.App = App;

  function parseHash() {
    var hash = location.hash.replace(/^#\/?/, '');
    var parts = hash.split('?');
    var path = parts[0].split('/').filter(Boolean);
    var params = {};
    (parts[1] || '').split('&').forEach(function (pair) {
      if (!pair) return;
      var kv = pair.split('=');
      params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
    });
    return { name: path[0] || 'queue', id: path[1], params: params };
  }

  App.go = function (hash) {
    location.hash = hash;
  };

  function navItem(href, label, active, count) {
    return '<a class="nav-link' + (active ? ' active' : '') + '" href="' + href + '"' +
      (active ? ' aria-current="page"' : '') + '>' + UI.esc(label) +
      (count != null ? '<span class="nav-count">' + count + '</span>' : '') + '</a>';
  }

  App.renderNav = function (route) {
    return Promise.all([Api.listLeads(), Api.getRules()]).then(function (res) {
      var leads = res[0], rules = res[1];
      var open = leads.filter(function (l) {
        return (l.stage === 'lead' || l.stage === 'email') && !Scoring.hiddenReason(l, rules);
      }).length;
      var tab = route.params.tab;
      var inQueue = (route.name === 'queue' && (!tab || tab === 'lead' || tab === 'email')) ||
        route.name === 'lead' || route.name === 'email';
      document.getElementById('nav').innerHTML =
        '<div class="nav-brand">Lead Review</div>' +
        navItem('#/queue', 'Review queue', inQueue, open) +
        navItem('#/queue?tab=sent', 'Sent', route.name === 'queue' && tab === 'sent') +
        navItem('#/queue?tab=rejected', 'Rejected', route.name === 'queue' && tab === 'rejected') +
        '<div class="nav-heading">Settings</div>' +
        navItem('#/rules', 'Scoring rules', route.name === 'rules') +
        navItem('#/scraper', 'Scraper runs', route.name === 'scraper');
    });
  };

  var currentHash = null;

  function route() {
    if (App.leaveGuard && location.hash !== currentHash) {
      var warning = App.leaveGuard();
      if (warning && !window.confirm(warning)) {
        history.replaceState(null, '', currentHash);
        return;
      }
    }
    App.leaveGuard = null;
    currentHash = location.hash || '#/queue';

    var r = parseHash();
    var view = App.views[r.name];
    var main = document.getElementById('main');
    if (!view) {
      main.innerHTML = '<h1 class="page-title">Page not found</h1><p><a href="#/queue">Go to the review queue</a></p>';
      return;
    }
    App.renderNav(r);
    Promise.resolve(view(main, r))
      .then(function () {
        window.scrollTo(0, 0);
        var h1 = main.querySelector('h1');
        if (h1) document.title = h1.textContent + ' · Lead Review';
      })
      .catch(function (err) {
        console.error(err);
        main.innerHTML = '<h1 class="page-title">Something went wrong</h1><p class="muted">' +
          UI.esc(err.message) + '</p><p><a href="#/queue">Back to the review queue</a></p>';
      });
  }

  window.addEventListener('beforeunload', function (e) {
    if (App.leaveGuard && App.leaveGuard()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  window.addEventListener('hashchange', route);
  document.addEventListener('DOMContentLoaded', route);
})();
