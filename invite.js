/* Invitation form. Loaded when the Invitation chapter opens.
   Stays in preview mode until the form carries a Turnstile site key (data-sitekey).
   Live mode posts JSON to data-endpoint (the Cloudflare Worker at /api/invite). */
(function () {
  'use strict';
  var form = document.getElementById('invite-form');
  if (!form || form.getAttribute('data-ready')) return;
  form.setAttribute('data-ready', '1');

  var sitekey = form.getAttribute('data-sitekey') || '';
  var endpoint = form.getAttribute('data-endpoint') || '/api/invite';
  var live = !!sitekey;
  window.datumInvite = { live: live, submit: submit };
  if (!live) return;

  var note = document.getElementById('form-note');
  var lede = document.getElementById('invite-lede');
  var btn = form.querySelector('button[type="submit"]');
  var email = form.querySelector('#if-email');
  var emailErr = document.getElementById('if-email-err');
  var roleErr = document.getElementById('if-role-err');
  var token = '';
  var widget = null;
  var sending = false;

  email.addEventListener('input', function () { fieldError(email, emailErr, ''); });
  form.addEventListener('change', function (e) {
    if (e.target && e.target.name === 'role') fieldError(null, roleErr, '');
  });

  btn.textContent = 'Request an invitation';
  if (lede && lede.getAttribute('data-live')) lede.textContent = lede.getAttribute('data-live');
  say('');

  window.datumTurnstileReady = function () {
    if (!window.turnstile) return;
    var dark = document.documentElement.getAttribute('data-theme') === 'obsidian';
    widget = window.turnstile.render('#if-turnstile', {
      sitekey: sitekey,
      theme: dark ? 'dark' : 'light',
      size: 'flexible',
      callback: function (t) { token = t; },
      'expired-callback': function () { token = ''; },
      'error-callback': function () { token = ''; }
    });
  };
  var s = document.createElement('script');
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=datumTurnstileReady&render=explicit';
  s.async = true;
  s.defer = true;
  s.onerror = function () { say('The spam check could not load. Please check your connection, then reload the page.', true); };
  document.head.appendChild(s);

  function say(msg, strong) {
    if (!note) return;
    note.textContent = msg;
    if (strong) note.classList.add('strong'); else note.classList.remove('strong');
  }
  function fieldError(input, box, msg) {
    if (box) { box.textContent = msg; box.hidden = !msg; }
    if (input) { if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid'); }
  }
  var MESSAGES = {
    email: 'That email address does not look right. Please check it.',
    role: 'Please choose the option that describes you best.',
    note: 'Please keep the note to 500 characters.',
    check: 'The spam check did not pass. Please complete it again, then send.',
    origin: 'That did not send. Please reload the page and try again.'
  };

  function submit() {
    if (sending) return;
    var addr = (email.value || '').trim();
    var picked = form.querySelector('input[name="role"]:checked');
    var emailOk = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(addr);
    fieldError(email, emailErr, emailOk ? '' : MESSAGES.email);
    fieldError(null, roleErr, picked ? '' : MESSAGES.role);
    if (!emailOk || !picked) {
      say('Please check the answers marked above.', true);
      (emailOk ? form.querySelector('input[name="role"]') : email).focus();
      return;
    }
    if (!token) { say('Please complete the spam check above the button, then send.', true); return; }

    sending = true;
    btn.disabled = true;
    say('Sending your request.');
    var payload = {
      email: addr,
      role: picked.value,
      note: (form.querySelector('#if-note').value || '').trim().slice(0, 500),
      updates: form.querySelector('#if-updates').checked === true,
      company: form.querySelector('#if-company').value,
      token: token
    };
    fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok && d && d.ok, error: d && d.error }; }, function () { return { ok: false }; }); })
      .then(function (res) {
        if (res.ok) {
          form.reset();
          say('Thank you. Your request is in. We will write when there is a place for you to try Datum.', true);
        } else {
          say(MESSAGES[res.error] || 'That did not send. Please try again in a moment.', true);
        }
      }, function () {
        say('That did not send. Please check your connection and try again.', true);
      })
      .then(function () {
        sending = false;
        btn.disabled = false;
        token = '';
        if (window.turnstile && widget !== null) window.turnstile.reset(widget);
      });
  }
})();
