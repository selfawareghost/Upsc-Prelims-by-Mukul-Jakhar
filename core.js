/* Core: data registries, small helpers, icons, modal, toast.
   Data files (papers, notes, current affairs) call PYQ.register / NOTES.register / CA.register. */
(function () {
  'use strict';

  function registry() {
    return { data: {}, register: function (id, obj) { this.data[id] = obj; } };
  }
  window.PYQ = window.PYQ || registry();
  window.NOTES = window.NOTES || registry();
  window.CA = window.CA || registry();

  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  var paths = {
    questions: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h4"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M15.5 7.5l2.5 2.5M13 10l1.5 1.5"/>',
    attempt: '<circle cx="7" cy="7" r="3"/><circle cx="7" cy="17" r="3"/><path d="M13 7h7M13 17h7"/><circle cx="7" cy="7" r="1.2" fill="currentColor"/>',
    pen: '<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>',
    marker: '<path d="M5 19h6"/><path d="M8 16l-2-2 9-9 4 4-9 9z"/><path d="M6 14l-2 5 5-2"/>',
    eraser: '<path d="M9 20h11"/><path d="M4.5 15.5l9-9 5 5-8.5 8.5H8z"/><path d="M9 11l5 5"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    sheet: '<path d="M5 3h14v18H5z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    grid: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
    chevronL: '<path d="M15 5l-7 7 7 7"/>',
    chevronR: '<path d="M9 5l7 7-7 7"/>',
    flag: '<path d="M6 21V4M6 4h11l-2 4 2 4H6"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    exit: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>'
  };
  function icon(name) {
    return '<svg class="ico" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (paths[name] || '') + '</svg>';
  }

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function monthLabel(ym) {
    var p = String(ym).split('-');
    return (MONTHS[(+p[1] || 1) - 1] || '') + ' ' + p[0];
  }

  /* Accessible modal. Returns a close function. */
  function modal(opts) {
    var wrap = document.createElement('div');
    wrap.className = 'modal-wrap';
    wrap.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">' +
      '<h2 id="modalTitle">' + esc(opts.title) + '</h2>' +
      '<div class="modal-body">' + (opts.body || '') + '</div>' +
      '<div class="modal-actions">' +
      (opts.cancel === false ? '' : '<button type="button" class="btn" data-m="cancel">' + esc(opts.cancel || 'Cancel') + '</button>') +
      '<button type="button" class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-m="ok">' + esc(opts.confirm || 'OK') + '</button>' +
      '</div></div>';
    var prev = document.activeElement;
    document.body.appendChild(wrap);
    wrap.querySelector('[data-m="ok"]').focus();

    function close() {
      wrap.remove();
      document.removeEventListener('keydown', onKey, true);
      if (prev && prev.focus && prev.isConnected) prev.focus();
    }
    function onKey(e) {
      if (e.key === 'Escape' && opts.cancel !== false) { e.stopPropagation(); close(); if (opts.onCancel) opts.onCancel(); }
      if (e.key === 'Tab') {
        var f = wrap.querySelectorAll('button');
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      e.stopPropagation();
    }
    document.addEventListener('keydown', onKey, true);
    wrap.addEventListener('click', function (e) {
      var b = e.target.closest('[data-m]');
      if (!b) {
        if (e.target === wrap && opts.cancel !== false) { close(); if (opts.onCancel) opts.onCancel(); }
        return;
      }
      close();
      if (b.dataset.m === 'ok') { if (opts.onConfirm) opts.onConfirm(); }
      else if (opts.onCancel) opts.onCancel();
    });
    return close;
  }

  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('is-out'); }, 3200);
    setTimeout(function () { t.remove(); }, 3700);
  }

  window.UI = { esc: esc, icon: icon, modal: modal, toast: toast, monthLabel: monthLabel };
})();
