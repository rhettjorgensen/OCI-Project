/*
 * Scraper runs. A placeholder until the back end exists.
 */
(function () {
  var esc = UI.esc;

  App.views.scraper = function (main) {
    return Api.getMeta().then(function (meta) {
      main.innerHTML =
        '<header class="page-header"><div><h1 class="page-title">Scraper runs</h1>' +
        '<p class="page-sub">History of each scrape: when it ran, what it found, and anything that failed.</p></div></header>' +
        '<section class="card">' +
          '<h2>Coming with the back end</h2>' +
          '<p class="card-sub" style="margin:8px 0 0">The last run was today at ' + esc(UI.formatTime(meta.lastScrapeAt)) + ' and found ' +
          meta.newLeadsLastScrape + ' new leads (sample figures). Run history will appear here once the scraper is connected.</p>' +
        '</section>';
    });
  };
})();
