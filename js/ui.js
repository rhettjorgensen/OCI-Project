/*
 * Small shared helpers used by every screen.
 */
(function () {
  // Escape text before putting it into HTML. Use it for ANY data value.
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function ago(iso) {
    if (!iso) return 'Never';
    var ms = Date.now() - new Date(iso).getTime();
    var future = ms < 0;
    ms = Math.abs(ms);
    var mins = Math.round(ms / 60000);
    var hours = Math.round(ms / 3600000);
    var days = Math.round(ms / 86400000);
    var text;
    if (mins < 60) text = mins <= 1 ? '1 minute' : mins + ' minutes';
    else if (hours < 24) text = hours === 1 ? '1 hour' : hours + ' hours';
    else if (days < 14) text = days === 1 ? '1 day' : days + ' days';
    else if (days < 60) text = Math.round(days / 7) + ' weeks';
    else text = Math.round(days / 30) + ' months';
    return future ? 'in ' + text : text + ' ago';
  }

  function formatDateTime(iso) {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  }

  function formatTime(iso) {
    return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  var STRENGTH_CLASS = { Strong: 'good', Medium: 'warn', Weak: 'mute', None: 'mute' };

  var STAGES = {
    lead: { label: 'Needs review', cls: 'info' },
    email: { label: 'Email to approve', cls: 'warn' },
    sent: { label: 'Sent', cls: 'good' },
    rejected: { label: 'Rejected', cls: 'mute' }
  };

  var CHECK_ICON =
    '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9.5l4 4 8-9"/></svg>';
  var CROSS_ICON =
    '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 4l10 10M14 4L4 14"/></svg>';

  var toastTimer = null;
  function toast(message) {
    var el = document.getElementById('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 4000);
  }

  // Finds the [BRACKETED] placeholders still left in a piece of text.
  function placeholders(text) {
    var found = (text || '').match(/\[[^\]\n]+\]/g) || [];
    return found.filter(function (p, i) { return found.indexOf(p) === i; });
  }

  window.UI = {
    esc: esc,
    ago: ago,
    formatDateTime: formatDateTime,
    formatTime: formatTime,
    STRENGTH_CLASS: STRENGTH_CLASS,
    STAGES: STAGES,
    CHECK_ICON: CHECK_ICON,
    CROSS_ICON: CROSS_ICON,
    toast: toast,
    placeholders: placeholders
  };
})();
