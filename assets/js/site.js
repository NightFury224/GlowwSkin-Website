(function () {
  window.__siteReady = true;
  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduceMotion = motionQuery.matches;
  var userPaused = false;
  var paused = reduceMotion;
  var syncs = [];

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* Header shadow + mobile menu */
  var header = document.querySelector('.site-header');
  var menuBtn = document.querySelector('.menu-btn');
  function onScroll() { header.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  function setMenu(open) {
    header.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  menuBtn.addEventListener('click', function () { setMenu(!header.classList.contains('menu-open')); });
  document.querySelectorAll('.nav-links a').forEach(function (a) {
    a.addEventListener('click', function () { setMenu(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && header.classList.contains('menu-open')) { setMenu(false); menuBtn.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (header.classList.contains('menu-open') && !header.contains(e.target)) setMenu(false);
  });
  header.addEventListener('focusout', function (e) {
    if (header.classList.contains('menu-open') && e.relatedTarget && !header.contains(e.relatedTarget)) setMenu(false);
  });

  /* Reveal on scroll */
  var revealables = document.querySelectorAll('.reveal, .timeline, .rail, .statement');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('in'); });
  }

  /* Run fn every ms while el is on screen and the tab is visible */
  function loopWhileVisible(el, fn, ms) {
    var timer = null, onScreen = true;
    function start() { if (!timer) timer = setInterval(fn, ms); }
    function stop() { clearInterval(timer); timer = null; }
    function sync() { onScreen && !document.hidden && !paused ? start() : stop(); }
    syncs.push(sync);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { onScreen = entries[0].isIntersecting; sync(); }).observe(el);
    } else {
      start();
    }
    document.addEventListener('visibilitychange', sync);
    sync();
  }

  /* Pause / play control for all animation (WCAG 2.2.2) */
  var toggles = document.querySelectorAll('.motion-toggle');
  function applyPause() {
    paused = userPaused || motionQuery.matches;
    document.documentElement.classList.toggle('motion-paused', paused);
    toggles.forEach(function (b) {
      b.setAttribute('aria-pressed', String(paused));
      b.querySelector('.mt-label').textContent = paused ? 'Play animation' : 'Pause animation';
    });
    syncs.forEach(function (fn) { fn(); });
  }
  toggles.forEach(function (b) {
    b.addEventListener('click', function () { userPaused = !paused; applyPause(); });
  });
  if (motionQuery.addEventListener) motionQuery.addEventListener('change', function () { userPaused = false; applyPause(); });
  applyPause();

  /* Simulated log stream (product page) */
  (function () {
      var log = document.getElementById('log');
    if (!log) return;
    var badge = document.getElementById('integrity');
    var badgeText = document.getElementById('integrity-text');
    var cLogs = document.getElementById('c-logs');
    var cTamper = document.getElementById('c-tamper');
    var cBlocked = document.getElementById('c-blocked');
    var MAX_LINES = 8;
    var counts = { logs: 48210, tamper: 0, blocked: 0 };
    var batch = 87;
    var clock = new Date();
    clock.setHours(14, 2, 11, 204);

    var SEALS = [
      ['auth.svc', 'login accepted · uid 1042'],
      ['net.gw', 'route table updated'],
      ['app.svc', 'event stored'],
      ['sys.kern', 'watchdog heartbeat'],
      ['cfg.mgr', 'config snapshot written'],
      ['db.svc', 'access event recorded'],
      ['api.gw', 'request logged'],
      ['ssh.d', 'session closed · admin']
    ];
    var BLOCKS = [
      ['dev.guard', 'unapproved device refused'],
      ['dev.guard', 'unknown device refused'],
      ['net.guard', 'unregistered host refused']
    ];
    var ALERTS = [
      function () { return ['integrity', '#' + (counts.logs - 213) + ' altered → flagged']; },
      function () { return ['integrity', 'delete on #' + (counts.logs - 618) + ' → flagged']; },
      function () { return ['integrity', 'out-of-order write → flagged']; }
    ];

    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function fmt(n) { return String(n); }
    function pad(n, w) { return String(n).padStart(w || 2, '0'); }
    function stamp() {
      clock = new Date(clock.getTime() + 180 + Math.floor(Math.random() * 900));
      return pad(clock.getHours()) + ':' + pad(clock.getMinutes()) + ':' + pad(clock.getSeconds()) + '.' + pad(clock.getMilliseconds(), 3);
    }

    var lastKind = '';
    function nextEvent() {
      var r = Math.random();
      var kind = r < 0.58 ? 'seal' : r < 0.74 ? 'extr' : r < 0.9 ? 'block' : 'alert';
      if (kind === lastKind && kind !== 'seal') kind = 'seal';
      lastKind = kind;
      if (kind === 'seal') { counts.logs++; var s = pick(SEALS); return { kind: kind, tag: 'LOG', src: s[0], msg: s[1], st: '✓' }; }
      if (kind === 'extr') { batch++; return { kind: kind, tag: 'EXPORT', src: 'reader', msg: 'export #' + batch + ' · approved reader', st: '✓' }; }
      if (kind === 'block') { counts.blocked++; var b = pick(BLOCKS); return { kind: kind, tag: 'BLOCK', src: b[0], msg: b[1], st: '⨯' }; }
      counts.tamper++; var a = pick(ALERTS)(); return { kind: kind, tag: 'ALERT', src: a[0], msg: a[1], st: '!' };
    }

    function render(ev, animate) {
      var row = document.createElement('div');
      row.className = 'line ' + ev.kind + (animate ? ' new' : '');
      [['t', stamp()], ['tag', ev.tag], ['src', ev.src], ['msg', ev.msg], ['st', ev.st]].forEach(function (c) {
        var span = document.createElement('span');
        span.className = c[0];
        span.textContent = c[1];
        row.appendChild(span);
      });
      log.appendChild(row);
      while (log.children.length > MAX_LINES) log.removeChild(log.firstChild);
      cLogs.textContent = fmt(counts.logs);
      cTamper.textContent = counts.tamper;
      cBlocked.textContent = counts.blocked;
      if (ev.kind === 'alert' && animate) {
        badge.classList.add('alert');
        badgeText.textContent = 'TAMPER FLAGGED';
        clearTimeout(render.t);
        render.t = setTimeout(function () { badge.classList.remove('alert'); badgeText.textContent = 'INTEGRITY OK'; }, 2200);
      }
    }

    var seed = [
      { kind: 'seal', tag: 'LOG', src: 'auth.svc', msg: 'login accepted · uid 1042', st: '✓' },
      { kind: 'seal', tag: 'LOG', src: 'net.gw', msg: 'route table updated', st: '✓' },
      { kind: 'block', tag: 'BLOCK', src: 'dev.guard', msg: 'unapproved device refused', st: '⨯' },
      { kind: 'seal', tag: 'LOG', src: 'app.svc', msg: 'event stored', st: '✓' },
      { kind: 'extr', tag: 'EXPORT', src: 'reader', msg: 'export #87 · approved reader', st: '✓' },
      { kind: 'seal', tag: 'LOG', src: 'cfg.mgr', msg: 'config snapshot written', st: '✓' },
      { kind: 'alert', tag: 'ALERT', src: 'integrity', msg: '#47993 altered → flagged', st: '!' },
      { kind: 'seal', tag: 'LOG', src: 'db.svc', msg: 'access event recorded', st: '✓' },
      { kind: 'seal', tag: 'LOG', src: 'sys.kern', msg: 'watchdog heartbeat', st: '✓' }
    ];
    counts.logs += 6; counts.blocked = 1; counts.tamper = 1;
    seed.forEach(function (ev) { render(ev, false); });

    loopWhileVisible(document.getElementById('console'), function () { render(nextEvent(), true); }, 1500);
  })();

  /* Hero mini feed (homepage, simulated) */
  (function () {
    var feed = document.getElementById('mini-log');
    if (!feed) return;
    var pill = document.getElementById('mini-integrity');
    var pillText = pill && pill.querySelector('.txt');
    var EVENTS = [
      ['seal', 'auth.log', 'recorded ✓'],
      ['seal', 'gateway.log', 'recorded ✓'],
      ['seal', 'app.log', 'recorded ✓'],
      ['extr', 'reader', 'exported ✓'],
      ['seal', 'kernel.log', 'recorded ✓'],
      ['block', 'dev.guard', 'device refused ✗'],
      ['seal', 'access.log', 'recorded ✓'],
      ['extr', 'reader', 'exported ✓'],
      ['seal', 'config.log', 'recorded ✓'],
      ['alert', 'integrity', 'tamper flagged !']
    ];
    var i = 0;
    var t = new Date(2026, 0, 1, 12, 4, 11);
    function pad(n) { return String(n).padStart(2, '0'); }
    function add(animate) {
      var ev = EVENTS[i % EVENTS.length]; i++;
      t = new Date(t.getTime() + 1000 + (i * 7919 % 4000));
      var row = document.createElement('div');
      row.className = 'mini-line ' + ev[0] + (animate ? ' new' : '');
      [['t', pad(t.getHours()) + ':' + pad(t.getMinutes()) + ':' + pad(t.getSeconds())], ['src', ev[1]], ['st', ev[2]]].forEach(function (c) {
        var s = document.createElement('span'); s.className = c[0]; s.textContent = c[1]; row.appendChild(s);
      });
      feed.appendChild(row);
      while (feed.children.length > 4) feed.removeChild(feed.firstChild);
      if (animate && ev[0] === 'alert' && pill) {
        pill.classList.add('alert'); pillText.textContent = 'TAMPER FLAGGED';
        setTimeout(function () { pill.classList.remove('alert'); pillText.textContent = 'INTEGRITY OK'; }, 2000);
      }
    }
    for (var k = 0; k < 4; k++) add(false);
    loopWhileVisible(feed, function () { add(true); }, 1800);
  })();

  /* GlowwSkin aperture (homepage, illustrative) */
  (function () {
    var ap = document.getElementById('aperture');
    if (!ap) return;
    var modeEl = document.getElementById('aperture-mode');
    var pips = document.querySelectorAll('#aperture-pips i');
    var MODES = ['WHITE LIGHT', 'UV', 'IR', 'POLARIZED'];
    var m = 0;
    function show() {
      ap.setAttribute('data-mode', String(m + 1));
      modeEl.innerHTML = 'MODE <b>' + (m + 1) + '/4</b> ' + MODES[m];
      pips.forEach(function (p, j) { p.classList.toggle('on', j === m); });
    }
    show();
    loopWhileVisible(ap, function () { m = (m + 1) % MODES.length; show(); }, 1600);
  })();

  /* Contact: topic buttons, URL prefill, compose or copy */
  (function () {
    // Set this to Voltroen's real inbox once it exists. Leave it empty until then; never use a placeholder address.
    var CONTACT_EMAIL = 'ganesh@voltroen.in';

    var footerEmail = document.getElementById('footer-email');
    if (footerEmail && CONTACT_EMAIL) {
      footerEmail.href = 'mailto:' + CONTACT_EMAIL;
      footerEmail.textContent = CONTACT_EMAIL;
      footerEmail.parentElement.hidden = false;
    }

    var form = document.getElementById('contact-form');
    if (!form) return;
    var topic = form.elements.topic;
    var nameEl = form.elements.name;
    var orgEl = form.elements.org;
    var msgEl = form.elements.message;
    var status = document.getElementById('form-status');
    var submitLabel = document.getElementById('submit-label');
    var inboxNote = document.getElementById('inbox-note');
    var audiences = document.querySelectorAll('.audience');

    if (!CONTACT_EMAIL) {
      submitLabel.textContent = 'Copy message';
      inboxNote.hidden = false;
      document.getElementById('form-helper').textContent = 'Nothing is stored by this site.';
    } else {
      submitLabel.textContent = 'Compose email';
      inboxNote.hidden = true;
      document.getElementById('form-helper').textContent = 'This opens your own email app with the message ready to send. Nothing is stored by this site.';
    }

    function syncAudience() {
      audiences.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-topic') === topic.value)); });
    }
    function setTopic(value) {
      for (var j = 0; j < topic.options.length; j++) {
        if (topic.options[j].value === value) { topic.value = value; syncAudience(); return true; }
      }
      return false;
    }
    topic.addEventListener('change', syncAudience);

    var param = new URLSearchParams(window.location.search).get('topic');
    if (param) setTopic(param);
    syncAudience();

    document.querySelectorAll('[data-topic]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (!setTopic(el.getAttribute('data-topic'))) return;
        e.preventDefault();
        status.className = 'status';
        status.textContent = 'Topic set to ' + topic.options[topic.selectedIndex].text + '.';
        var section = document.getElementById('contact');
        if (!section.contains(el)) section.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        setTimeout(function () { msgEl.focus({ preventScroll: true }); }, reduceMotion ? 0 : 450);
      });
    });

    function fieldError(el, text) {
      var err = document.getElementById(el.id + '-error');
      err.textContent = text;
      if (text) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
      return !text;
    }
    [nameEl, msgEl].forEach(function (el) {
      el.addEventListener('input', function () { if (el.value.trim()) fieldError(el, ''); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.className = 'status';
      status.textContent = '';
      var okMsg = fieldError(msgEl, msgEl.value.trim() ? '' : 'Please add a message.');
      var okName = fieldError(nameEl, nameEl.value.trim() ? '' : 'Please add your name.');
      if (!okName) { nameEl.focus(); return; }
      if (!okMsg) { msgEl.focus(); return; }

      var name = nameEl.value.trim();
      var org = orgEl.value.trim();
      var topicLabel = topic.options[topic.selectedIndex].text;
      var subject = '[Voltroen] ' + topicLabel + ' — ' + (org || name);
      var body = 'Name: ' + name + '\nOrganization: ' + (org || '—') + '\nTopic: ' + topicLabel + '\n\n' + msgEl.value.trim();

      if (CONTACT_EMAIL) {
        window.location.href = 'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
        status.textContent = "Your email app should open with the message ready. If it doesn't, write to us at ";
        var a = document.createElement('a');
        a.href = 'mailto:' + CONTACT_EMAIL; a.textContent = CONTACT_EMAIL;
        status.appendChild(a);
        status.appendChild(document.createTextNode('.'));
        return;
      }

      function copyFailed() {
        status.className = 'status warn';
        status.textContent = "Couldn't copy automatically. Your message is still in the form.";
        msgEl.focus(); msgEl.select();
      }
      try {
        if (!navigator.clipboard || !window.isSecureContext) throw new Error('clipboard unavailable');
        navigator.clipboard.writeText(subject + '\n\n' + body).then(function () {
          setTimeout(function () { status.textContent = 'Copied. Your message is on your clipboard.'; }, 50);
        }, copyFailed);
      } catch (err) {
        copyFailed();
      }
    });
  })();
})();
