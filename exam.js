/* Exam: attempt a paper (booklet pages + OMR answer sheet), timer, scoring, review. */
window.Exam = (function () {
  'use strict';
  var esc = UI.esc, I = UI.icon;
  var L = ['a', 'b', 'c', 'd'];
  var CORRECT = 2, WRONG = 0.66;

  var st = null, pending = null, last = null;

  /* ------------------------------------------------------------ helpers */
  function qText(t) { return esc(t); }
  /* A question card. mode: 'read' (plain), 'attempt' (clickable options), 'review' (key vs answer). */
  function qCard(q, mode, ctx) {
    ctx = ctx || {};
    var opts = L.map(function (o) {
      var t = esc((q.options && q.options[o]) || '');
      if (mode === 'attempt') {
        return '<li><button type="button" class="opt" data-act="mark" data-q="' + q.n + '" data-opt="' + o + '" aria-pressed="' + (ctx.ans === o) + '">' +
          '<span class="bubble" aria-hidden="true">' + o + '</span><span class="opt-text">' + t + '</span></button></li>';
      }
      var cls = 'opt';
      if (mode === 'review') {
        if (ctx.key === o) cls += ' is-key';
        if (ctx.ans === o) cls += ctx.ans === ctx.key ? ' is-right' : ' is-wrong';
      }
      return '<li class="' + cls + '"><span class="bubble" aria-hidden="true">' + o + '</span><span class="opt-text">' + t + '</span></li>';
    }).join('');
    return '<article class="qcard" id="q-' + q.n + '" data-q="' + q.n + '">' +
      '<div class="q-no">' + q.n + '.</div>' +
      '<div class="q-body"><div class="q-text">' + qText(q.text) + '</div>' +
      '<ol class="q-opts" aria-label="Options">' + opts + '</ol>' +
      (q.flag ? '<p class="q-flag">Converted from the scanned paper; this one may contain errors.</p>' : '') + '</div>' +
      (mode === 'attempt' ? '<canvas class="ink" aria-hidden="true"></canvas>' : '') +
      '</article>';
  }
  function questionsHTML(paper, mode, answers) {
    return paper.questions.map(function (q) { return qCard(q, mode, { ans: answers && answers[q.n] }); }).join('');
  }
  function scrollToQ(root, n) {
    var el = root.querySelector('#q-' + n);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function fmtTime(ms) {
    var t = Math.max(0, Math.round(ms / 1000)), h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60;
    return h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }
  function fmtMarks(n) {
    var v = Math.round(n * 100) / 100;
    return (v < 0 ? '−' : '') + Math.abs(v).toFixed(2);
  }
  function score(paper, answers) {
    var r = { correct: 0, wrong: 0, blank: 0, dropped: 0, rows: [] };
    for (var q = 1; q <= 100; q++) {
      var k = paper.key.charAt(q - 1), a = answers[q] || null, status, marks = 0;
      if (k === 'x') { status = 'dropped'; r.dropped++; }
      else if (!a) { status = 'blank'; r.blank++; }
      else if (a === k) { status = 'correct'; r.correct++; marks = CORRECT; }
      else { status = 'wrong'; r.wrong++; marks = -WRONG; }
      r.rows.push({ q: q, key: k, ans: a, status: status, marks: marks });
    }
    r.plus = r.correct * CORRECT;
    r.minus = r.wrong * WRONG;
    r.total = Math.round((r.plus - r.minus) * 100) / 100;
    r.attempted = r.correct + r.wrong + (r.rows.filter(function (x) { return x.status === 'dropped' && x.ans; }).length);
    return r;
  }

  /* ------------------------------------------------------------- OMR sheet */
  function omrHTML(paper, answers, opts) {
    opts = opts || {};
    var rows = '';
    for (var q = 1; q <= 100; q++) {
      var a = answers[q];
      rows += '<li class="omr-row' + (a ? ' is-answered' : '') + '" data-q="' + q + '">' +
        '<button type="button" class="omr-q" data-act="goto" data-q="' + q + '" title="Go to question ' + q + '">' + q + '</button>' +
        L.map(function (o) {
          return '<button type="button" class="bubble" data-act="mark" data-q="' + q + '" data-opt="' + o + '" aria-pressed="' + (a === o) + '" aria-label="Question ' + q + ', option ' + o + '">' + o + '</button>';
        }).join('') + '</li>';
    }
    return '<div class="omr">' +
      '<div class="omr-head"><h2 class="omr-title">Answer sheet</h2><span class="omr-count" data-count>' + Object.keys(answers).length + ' of 100 marked</span>' +
      '<button type="button" class="icon-only omr-close" data-act="sheet" aria-label="Close answer sheet">' + I('close') + '</button></div>' +
      '<p class="omr-hint">Tap a number to jump to that question. Tap a filled bubble again to clear it.</p>' +
      '<ol class="omr-rows">' + rows + '</ol></div>';
  }

  /* --------------------------------------------------------------- start */
  function prepare(id, mode) { pending = { id: id, mode: mode }; }
  function takePending(id, mode) {
    if (pending && pending.id === id && pending.mode === mode) { pending = null; return true; }
    return false;
  }

  function start(root, paper, mode) {
    stop();
    var timed = mode === 'timed';
    st = { paper: paper, mode: mode, answers: {}, started: Date.now(), ends: timed ? Date.now() + paper.durationMin * 60000 : 0,
      hash: location.hash, timer: null, warned: {}, root: null };
    Ink.reset();
    document.body.classList.add('in-exam');

    root.innerHTML =
      '<div class="exam ' + (timed ? 'is-timed' : 'is-untimed') + '">' +
        '<header class="exam-bar">' +
          '<div class="eb-title"><strong>' + esc(paper.year) + '</strong> <span>GS Paper I, Series A</span></div>' +
          (timed ? '<div class="timer" role="timer" aria-label="Time left">' + I('clock') + '<span data-timer>' + fmtTime(paper.durationMin * 60000) + '</span></div>'
                 : '<div class="timer is-off">Untimed</div>') +
          Ink.toolbarHTML() +
          '<div class="eb-actions">' +
            '<button type="button" class="btn btn-sheet" data-act="sheet">' + I('attempt') + '<span data-count-short>0/100</span></button>' +
            '<button type="button" class="btn btn-ghost" data-act="exit">' + I('exit') + '<span>Exit</span></button>' +
            '<button type="button" class="btn btn-primary" data-act="submit">Submit</button>' +
          '</div>' +
        '</header>' +
        '<div class="exam-body">' +
          '<div class="booklet" data-booklet>' +
            '<div class="pen-hint" hidden>Pen is on. Turn it off to tick options or scroll with touch.</div>' +
            '<div class="qsheet">' + questionsHTML(paper, 'attempt', st.answers) + '</div>' +
            '<div class="booklet-end"><p>End of the question booklet.</p><button type="button" class="btn btn-primary" data-act="submit">Submit paper</button></div>' +
          '</div>' +
          '<aside class="sheet" aria-label="Answer sheet">' + omrHTML(paper, st.answers) + '</aside>' +
        '</div>' +
      '</div>';

    var ex = st.root = root.querySelector('.exam');
    ex.querySelectorAll('.qcard').forEach(function (card) { Ink.attach(card.querySelector('canvas'), 'q-' + card.dataset.q, false); });
    Ink.bind(ex, {
      onToggle: function (on) { ex.classList.toggle('pen-on', on); ex.querySelector('.pen-hint').hidden = !on; },
      onClear: function () {
        UI.modal({ title: 'Clear all ink?', body: '<p>This removes everything you’ve drawn on the questions. Your answers stay as they are.</p>',
          confirm: 'Clear ink', danger: true, onConfirm: function () { Ink.clear(Ink.keys().filter(function (k) { return k.indexOf('q-') === 0; })); } });
      }
    });

    ex.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onUnload);
    if (timed) { tick(); st.timer = setInterval(tick, 1000); }
    window.scrollTo(0, 0);
  }

  function onUnload(e) { e.preventDefault(); e.returnValue = ''; }

  function onKey(e) {
    if (!st || document.querySelector('.modal-wrap')) return;
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); Ink.undo(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'p' || e.key === 'P') Ink.setActive(!Ink.isActive());
  }

  function onClick(e) {
    var b = e.target.closest('[data-act]'); if (!b || !st) return;
    var ex = st.root;
    switch (b.dataset.act) {
      case 'mark': mark(+b.dataset.q, b.dataset.opt); break;
      case 'goto':
        scrollToQ(ex, +b.dataset.q);
        if (window.matchMedia('(max-width: 900px)').matches) ex.classList.remove('sheet-open');
        break;
      case 'sheet': ex.classList.toggle('sheet-open'); break;
      case 'submit': confirmSubmit(); break;
      case 'exit': confirmExit(); break;
    }
  }

  function mark(q, o) {
    if (st.answers[q] === o) delete st.answers[q]; else st.answers[q] = o;
    var row = st.root.querySelector('.omr-row[data-q="' + q + '"]');
    row.classList.toggle('is-answered', !!st.answers[q]);
    st.root.querySelectorAll('[data-act="mark"][data-q="' + q + '"]').forEach(function (bb) { bb.setAttribute('aria-pressed', st.answers[q] === bb.dataset.opt); });
    var n = Object.keys(st.answers).length;
    st.root.querySelector('[data-count]').textContent = n + ' of 100 marked';
    st.root.querySelector('[data-count-short]').textContent = n + '/100';
  }

  function tick() {
    if (!st || !st.ends) return;
    var left = st.ends - Date.now();
    var el = st.root.querySelector('[data-timer]');
    el.textContent = fmtTime(left);
    var box = st.root.querySelector('.timer');
    box.classList.toggle('is-low', left <= 10 * 60000);
    [30, 10, 5, 1].forEach(function (m) {
      if (left <= m * 60000 && left > (m * 60000 - 2000) && !st.warned[m]) {
        st.warned[m] = true;
        UI.toast(m === 1 ? '1 minute left' : m + ' minutes left');
      }
    });
    if (left <= 0) {
      document.querySelectorAll('.modal-wrap').forEach(function (m) { m.remove(); });
      finish(true);
    }
  }

  function confirmSubmit() {
    var n = Object.keys(st.answers).length;
    UI.modal({
      title: 'Submit your paper?',
      body: '<p>You have marked <strong>' + n + '</strong> of 100 questions. ' + (100 - n) + ' are left blank.</p>' +
        (st.ends ? '<p>Time left: ' + fmtTime(st.ends - Date.now()) + '.</p>' : '') +
        '<p>You can’t change answers after submitting.</p>',
      confirm: 'Submit paper', cancel: 'Keep working',
      onConfirm: function () { finish(false); }
    });
  }

  function confirmExit() {
    var id = st.paper.id;
    UI.modal({
      title: 'Exit without submitting?',
      body: '<p>Your marked answers and anything you’ve drawn will be discarded, and no score will be shown.</p>',
      confirm: 'Exit paper', cancel: 'Keep working', danger: true,
      onConfirm: function () { stop(); location.hash = '#/papers/' + id + '/attempt'; }
    });
  }

  function finish(timeUp) {
    if (!st) return;
    var id = st.paper.id;
    last = { id: id, mode: st.mode, answers: Object.assign({}, st.answers), taken: Date.now() - st.started, timeUp: timeUp };
    stop();
    location.hash = '#/papers/' + id + '/result';
  }

  function stop() {
    if (!st) return;
    clearInterval(st.timer);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('beforeunload', onUnload);
    Ink.reset();
    st = null;
    document.body.classList.remove('in-exam');
  }

  /* -------------------------------------------------------------- result */
  var STATUS = { correct: 'Correct', wrong: 'Wrong', blank: 'Not attempted', dropped: 'Dropped by UPSC' };

  function renderResult(root, paper) {
    var r = last, s = score(paper, r.answers);
    var acc = (s.correct + s.wrong) ? Math.round(s.correct / (s.correct + s.wrong) * 100) : 0;
    var droppedQs = s.rows.filter(function (x) { return x.status === 'dropped'; }).map(function (x) { return x.q; });

    var grid = s.rows.map(function (x) {
      return '<button type="button" class="rg-cell is-' + x.status + '" data-rv="' + x.q + '" aria-label="Question ' + x.q + ': ' + STATUS[x.status] + '">' + x.q + '</button>';
    }).join('');

    var list = s.rows.map(function (x) {
      var marks = x.status === 'correct' ? '+2.00' : x.status === 'wrong' ? '−0.66' : '0';
      var bubbles = L.map(function (o) {
        var cls = 'bubble';
        if (x.key === o) cls += ' is-key';
        if (x.ans === o && x.ans !== x.key) cls += ' is-wrong';
        if (x.ans === o && x.ans === x.key) cls += ' is-right';
        if (x.ans === o) cls += ' is-chosen';
        return '<span class="' + cls + '">' + o + '</span>';
      }).join('');
      return '<li class="rv-row is-' + x.status + '" id="rv-' + x.q + '" data-status="' + x.status + '">' +
        '<span class="rv-q">Q' + x.q + '</span>' +
        '<span class="rv-bubbles" aria-hidden="true">' + bubbles + '</span>' +
        '<span class="rv-text">' +
          '<span class="rv-status">' + STATUS[x.status] + '</span>' +
          '<span class="rv-detail">' +
            (x.status === 'dropped' ? 'Not counted' : 'You marked ' + (x.ans ? '(' + x.ans + ')' : 'nothing') + ', key (' + x.key + ')') +
          '</span></span>' +
        '<span class="rv-marks">' + marks + '</span>' +
        '<button type="button" class="btn btn-small" data-see="' + x.q + '" aria-expanded="false">Show question</button>' +
        '<div class="rv-question" hidden></div>' +
        '</li>';
    }).join('');

    root.innerHTML =
      '<div class="wrap page result">' +
        '<nav class="crumbs" aria-label="Breadcrumb"><a href="#/papers">Previous year papers</a><span aria-hidden="true">/</span><span>' + esc(paper.year) + ' result</span></nav>' +
        (r.timeUp ? '<p class="notice notice-warn">Time ran out, so your paper was submitted automatically.</p>' : '') +
        '<div class="result-head">' +
          '<div class="score-card">' +
            '<p class="score-label">Marks obtained, ' + esc(paper.year) + ' GS Paper I</p>' +
            '<p class="score"><span class="score-num">' + fmtMarks(s.total) + '</span><span class="score-max">out of 200</span></p>' +
            '<p class="score-meta">' + (r.mode === 'timed' ? 'Timed attempt, finished in ' + fmtTime(r.taken) : 'Untimed attempt') + '. Accuracy ' + acc + '% of attempted questions.</p>' +
          '</div>' +
          '<table class="breakdown">' +
            '<thead><tr><th scope="col">Result</th><th scope="col" class="num">Questions</th><th scope="col" class="num">Marks</th></tr></thead>' +
            '<tbody>' +
              '<tr class="is-correct"><th scope="row">Correct, +2 each</th><td class="num">' + s.correct + '</td><td class="num">+' + s.plus.toFixed(2) + '</td></tr>' +
              '<tr class="is-wrong"><th scope="row">Wrong, −0.66 each</th><td class="num">' + s.wrong + '</td><td class="num">' + fmtMarks(-s.minus) + '</td></tr>' +
              '<tr><th scope="row">Not attempted</th><td class="num">' + s.blank + '</td><td class="num">0.00</td></tr>' +
              (s.dropped ? '<tr><th scope="row">Dropped by UPSC</th><td class="num">' + s.dropped + '</td><td class="num">0.00</td></tr>' : '') +
            '</tbody>' +
            '<tfoot><tr><th scope="row">Total</th><td class="num">100</td><td class="num">' + fmtMarks(s.total) + '</td></tr></tfoot>' +
          '</table>' +
        '</div>' +
        (droppedQs.length ? '<p class="fine">UPSC dropped question' + (droppedQs.length > 1 ? 's ' : ' ') + droppedQs.join(', ') + ' from this paper, so ' + (droppedQs.length > 1 ? 'they carry' : 'it carries') + ' no marks either way. ' + esc(paper.keyNote) + '</p>' : '<p class="fine">' + esc(paper.keyNote) + '</p>') +
        '<div class="actions"><a class="btn btn-primary" href="#/papers/' + paper.id + '/attempt">Attempt again</a><a class="btn" href="#/papers">Back to papers</a></div>' +

        '<section class="review" aria-labelledby="rvTitle">' +
          '<h2 id="rvTitle">Paper review</h2>' +
          '<div class="review-grid">' + grid + '</div>' +
          '<ul class="legend"><li><span class="lg is-correct"></span>Correct</li><li><span class="lg is-wrong"></span>Wrong</li><li><span class="lg is-blank"></span>Not attempted</li><li><span class="lg is-dropped"></span>Dropped</li></ul>' +
          '<div class="filters" role="group" aria-label="Filter questions">' +
            [['all', 'All', 100], ['correct', 'Correct', s.correct], ['wrong', 'Wrong', s.wrong], ['blank', 'Not attempted', s.blank]].map(function (f, i) {
              return '<button type="button" class="chip" data-filter="' + f[0] + '" aria-pressed="' + (i === 0) + '">' + f[1] + ' <span>' + f[2] + '</span></button>';
            }).join('') +
          '</div>' +
          '<ol class="rv-list">' + list + '</ol>' +
        '</section>' +
      '</div>';

    var box = root.querySelector('.result');
    box.addEventListener('click', function (e) {
      var f = e.target.closest('[data-filter]');
      if (f) {
        box.querySelectorAll('[data-filter]').forEach(function (c) { c.setAttribute('aria-pressed', c === f); });
        box.querySelectorAll('.rv-row').forEach(function (row) { row.hidden = f.dataset.filter !== 'all' && row.dataset.status !== f.dataset.filter; });
        return;
      }
      var cell = e.target.closest('[data-rv]');
      if (cell) {
        box.querySelector('[data-filter="all"]').click();
        var row = box.querySelector('#rv-' + cell.dataset.rv);
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.add('is-flash'); setTimeout(function () { row.classList.remove('is-flash'); }, 1400);
        return;
      }
      var see = e.target.closest('[data-see]');
      if (see) {
        var li = see.closest('.rv-row'), panel = li.querySelector('.rv-question'), qn = +see.dataset.see;
        var open = see.getAttribute('aria-expanded') !== 'true';
        if (open && !panel.innerHTML) {
          var row = s.rows[qn - 1], q = paper.questions[qn - 1];
          panel.innerHTML = qCard(q, 'review', { key: row.key, ans: row.ans });
        }
        panel.hidden = !open;
        see.setAttribute('aria-expanded', open);
        see.textContent = open ? 'Hide question' : 'Show question';
      }
    });
  }

  return {
    prepare: prepare, takePending: takePending, start: start, stop: stop,
    isActive: function () { return !!st; }, hash: function () { return st ? st.hash : ''; },
    lastFor: function (id) { return last && last.id === id ? last : null; },
    renderResult: renderResult, questionsHTML: questionsHTML, scrollToQ: scrollToQ
  };
})();
