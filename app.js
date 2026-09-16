/* App: hash router and page rendering. */
(function () {
  'use strict';
  var S = window.SITE, esc = UI.esc, I = UI.icon;
  var app = document.getElementById('app');

  /* ---------------------------------------------------------- data loading */
  var REG = { paper: PYQ.data, note: NOTES.data, ca: CA.data };
  var PATH = {
    paper: function (id) { return 'data/papers/' + id + '.js'; },
    note: function (id) { return 'data/notes/' + id + '.js'; },
    ca: function (id) { return 'data/current-affairs/' + id + '.js'; }
  };
  function load(kind, id) {
    if (REG[kind][id]) return Promise.resolve(REG[kind][id]);
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = PATH[kind](id);
      s.onload = function () { REG[kind][id] ? resolve(REG[kind][id]) : reject(new Error('Nothing registered in ' + s.src)); };
      s.onerror = function () { reject(new Error('Could not load ' + s.src)); };
      document.head.appendChild(s);
    });
  }
  function loadingHTML(text) { return '<div class="wrap page"><p class="loading">' + esc(text || 'Loading…') + '</p></div>'; }
  function errorHTML(err) {
    return '<div class="wrap page"><h1>Couldn’t load this page</h1><p class="lede">' + esc(err.message) +
      '. If you opened the site straight from your computer, some browsers block this; it works once the site is online.</p><p><a class="btn" href="#/">Go to the home page</a></p></div>';
  }

  /* ---------------------------------------------------------------- lookup */
  function subject(id) { return S.subjects.filter(function (s) { return s.id === id; })[0]; }
  function section(s, id) { return s && s.sections.filter(function (x) { return x.id === id; })[0]; }
  function topic(sec, id) { return sec && sec.topics.filter(function (x) { return x.id === id; })[0]; }
  function paperMeta(id) { return S.papers.filter(function (p) { return p.id === id; })[0]; }
  function allTopics(s) { return s.sections.reduce(function (a, sec) { return a.concat(sec.topics); }, []); }
  function caFor(subjectId) { return S.caCategories.filter(function (c) { return c.subject === subjectId; })[0]; }

  /* ---------------------------------------------------------------- router */
  var currentHash = location.hash, skipNext = false;

  function parse() {
    var h = location.hash;
    if (!h || h === '#' || h === '#/') return [];
    if (h.indexOf('#/') !== 0) return null;
    return h.slice(2).split('/').filter(Boolean).map(decodeURIComponent);
  }

  window.addEventListener('hashchange', function () {
    if (skipNext) { skipNext = false; return; }
    if (Exam.isActive() && location.hash !== Exam.hash()) {
      var target = location.hash;
      skipNext = true;
      location.hash = currentHash;
      UI.modal({
        title: 'Leave this paper?',
        body: '<p>Your marked answers and anything you’ve drawn will be lost.</p>',
        confirm: 'Leave paper', cancel: 'Stay', danger: true,
        onConfirm: function () { Exam.stop(); location.hash = target; }
      });
      return;
    }
    route();
  });

  function setNav(key) {
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      if (a.dataset.nav === key) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  function render(html, title) {
    app.innerHTML = html;
    document.title = (title ? title + ' | ' : '') + S.owner + ', UPSC ' + S.siteName;
  }

  function route() {
    var p = parse();
    if (p === null) return;
    currentHash = location.hash;
    if (Exam.isActive()) Exam.stop();
    window.scrollTo(0, 0);
    var top = p[0] || 'home';
    setNav({ subject: 'subjects', papers: 'papers' }[top] || top);
    try {
      switch (top) {
        case 'home': render(pageHome()); break;
        case 'syllabus': render(pageSyllabus(), 'Syllabus'); break;
        case 'subjects': render(pageSubjects(), 'Subjects'); break;
        case 'subject': pageSubject(p[1], p[2], p[3]); break;
        case 'current-affairs': pageCurrentAffairs(p[1]); break;
        case 'papers': pagePapers(p[1], p[2], p[3]); break;
        default: render(pageNotFound(), 'Not found');
      }
    } catch (err) { render(errorHTML(err)); console.error(err); }
    app.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------------------ home */
  function pageHome() {
    var totalTopics = 0, written = 0;
    S.subjects.forEach(function (s) { allTopics(s).forEach(function (t) { totalTopics++; if (t.ready) written++; }); });
    return '<div class="home">' +
      '<section class="hero wrap">' +
        '<p class="kicker"><span class="dot" aria-hidden="true"></span>UPSC Civil Services Prelims, GS Paper I</p>' +
        '<h1 class="display">Prelims, <em>made simple.</em></h1>' +
        '<div class="actions"><a class="btn btn-primary" href="#/subjects">Start reading</a><a class="btn btn-ghost" href="#/papers">Attempt a paper ' + I('chevronR') + '</a></div>' +
        '<p class="glance-title">Paper structure</p>' +
        '<dl class="glance">' +
          '<div><dt>Questions</dt><dd>100</dd></div>' +
          '<div><dt>Marks</dt><dd>200</dd></div>' +
          '<div><dt>Duration</dt><dd>2 hrs</dd></div>' +
          '<div><dt>Correct answer</dt><dd>+2</dd></div>' +
          '<div><dt>Wrong answer</dt><dd>−0.66</dd></div>' +
        '</dl>' +
      '</section>' +

      '<section class="band wrap" aria-labelledby="hSub">' +
        '<div class="band-head"><h2 id="hSub">Subjects</h2>' + (totalTopics ? '<p>' + written + ' of ' + totalTopics + ' topics written</p>' : '') + '</div>' +
        subjectIndex() +
      '</section>' +

      '<section class="band wrap" aria-labelledby="hPap">' +
        '<div class="band-head"><h2 id="hPap">Previous year papers</h2><a class="link-arrow" href="#/papers">All papers ' + I('chevronR') + '</a></div>' +
        '<div class="year-chips">' + S.papers.map(function (pp) {
          return '<a class="chip-link" href="#/papers/' + pp.id + '/attempt">' + pp.year + '</a>';
        }).join('') + '</div>' +
      '</section>' +

      '<section class="band wrap" aria-labelledby="hCa">' +
        '<div class="band-head"><h2 id="hCa">Current affairs</h2><a class="link-arrow" href="#/current-affairs">Open ' + I('chevronR') + '</a></div>' +
        '<div class="year-chips">' + S.caCategories.map(function (c) {
          return '<a class="chip-link chip-soft" href="#/current-affairs/' + c.id + '">' + esc(c.name) + '</a>';
        }).join('') + '</div>' +
      '</section>' +
    '</div>';
  }

  function subjectIndex() {
    return '<ul class="subject-grid">' + S.subjects.map(function (s, i) {
      var t = allTopics(s), done = t.filter(function (x) { return x.ready; }).length;
      return '<li><a class="subject-card" href="#/subject/' + s.id + '">' +
        '<span class="sc-num">' + (i < 9 ? '0' : '') + (i + 1) + '</span>' +
        '<h3>' + esc(s.name) + '</h3>' +
        '<p>' + esc(s.blurb) + '</p>' +
        '<span class="sc-meta">' + (t.length ? s.sections.length + ' sections, ' + t.length + ' topics' + (done ? ', ' + done + ' written' : '') : 'Notes coming soon') + '</span>' +
      '</a></li>';
    }).join('') + '</ul>';
  }

  /* -------------------------------------------------------------- syllabus */
  function pageSyllabus() {
    var map = [
      ['Current events of national and international importance', [['Current affairs', '#/current-affairs'], ['International Relations', '#/subject/international']]],
      ['History of India and Indian National Movement', [['History', '#/subject/history']]],
      ['Indian and World Geography: Physical, Social, Economic geography of India and the World', [['Geography', '#/subject/geography']]],
      ['Indian Polity and Governance: Constitution, Political System, Panchayati Raj, Public Policy, Rights Issues', [['Polity and Constitution', '#/subject/polity']]],
      ['Economic and Social Development: Sustainable Development, Poverty, Inclusion, Demographics, Social Sector Initiatives, etc.', [['Economy and Social Development', '#/subject/economy']]],
      ['General issues on Environmental Ecology, Biodiversity, and Climate Change that do not require subject specialisation', [['Environment and Ecology', '#/subject/environment']]],
      ['General Science', [['General Science', '#/subject/general-science'], ['Science and Technology', '#/subject/science']]]
    ];
    return '<div class="wrap page narrow">' +
      '<h1>Syllabus</h1>' +
      '<p class="lede">The Preliminary Examination has two objective papers. This site covers Paper I, General Studies. Paper II (CSAT) is qualifying, needing 33%, and isn’t covered here. Prelims marks decide who goes on to Mains; they don’t count towards the final rank.</p>' +
      '<section class="syllabus-sheet" aria-labelledby="sylT">' +
        '<div class="ss-head"><h2 id="sylT">General Studies Paper I</h2><p>200 marks, two hours</p></div>' +
        '<ol class="syllabus-list">' + map.map(function (m) {
          return '<li><p>' + esc(m[0]) + '</p><p class="syl-links">' + m[1].map(function (l) { return '<a href="' + l[1] + '">' + esc(l[0]) + '</a>'; }).join('') + '</p></li>';
        }).join('') + '</ol>' +
      '</section>' +
      '<h2>Marking scheme</h2>' +
      '<p>100 multiple-choice questions carry 2 marks each. One third of a question’s marks, 0.66, is deducted for every wrong answer. A question left blank costs nothing. If more than one answer is marked, it counts as wrong.</p>' +
      '<p><a class="btn" href="#/papers">Practise with previous year papers</a></p>' +
    '</div>';
  }

  /* -------------------------------------------------------------- subjects */
  function pageSubjects() {
    return '<div class="wrap page"><h1>Subjects</h1><p class="lede">Eight subjects cover the Paper I syllabus, each with its own notes and current affairs.</p>' + subjectIndex() + '</div>';
  }

  function subjectNav(s, secId, topicId) {
    return '<nav class="subject-nav" aria-label="' + esc(s.name) + ' sections">' +
      '<a class="sn-title" href="#/subject/' + s.id + '"' + (!secId ? ' aria-current="page"' : '') + '>' + esc(s.name) + '</a>' +
      '<ul class="sn-list">' + s.sections.map(function (sec) {
        var on = sec.id === secId;
        return '<li><a class="sn-sec" href="#/subject/' + s.id + '/' + sec.id + '"' + (on && !topicId ? ' aria-current="page"' : '') + '>' + esc(sec.name) + '</a>' +
          (on ? '<ol class="sn-topics">' + sec.topics.map(function (t) {
            return '<li><a href="#/subject/' + s.id + '/' + sec.id + '/' + t.id + '"' + (t.id === topicId ? ' aria-current="page"' : '') + ' class="' + (t.ready ? 'is-ready' : '') + '">' + esc(t.title) + '</a></li>';
          }).join('') + '</ol>' : '') + '</li>';
      }).join('') +
      '<li><a class="sn-sec sn-ca" href="#/subject/' + s.id + '/current-affairs"' + (secId === 'current-affairs' ? ' aria-current="page"' : '') + '>Current affairs</a></li>' +
      '</ul></nav>';
  }

  function topicList(s, sec) {
    return '<ol class="topic-list">' + sec.topics.map(function (t, i) {
      return '<li class="' + (t.ready ? 'is-ready' : '') + '"><a href="#/subject/' + s.id + '/' + sec.id + '/' + t.id + '">' +
        '<span class="tl-n">' + (i + 1) + '</span><span class="tl-title">' + esc(t.title) + '</span>' +
        '<span class="tl-status">' + (t.ready ? 'Read notes' : 'Notes coming soon') + '</span></a></li>';
    }).join('') + '</ol>';
  }

  function subjectShell(s, secId, topicId, main) {
    return '<div class="wrap page subject-layout">' + subjectNav(s, secId, topicId) + '<div class="subject-main">' + main + '</div></div>';
  }

  function pageSubject(sid, secId, topicId) {
    var s = subject(sid);
    if (!s) return render(pageNotFound(), 'Not found');

    if (!secId && !s.sections.length) {
      return render(subjectShell(s, null, null,
        '<h1>' + esc(s.name) + '</h1><p class="lede">' + esc(s.blurb) + '</p>' +
        '<div class="empty-state"><p class="es-title">Notes coming soon</p><p>Sections and topics for ' + esc(s.name) + ' will appear here as the notes are added. Meanwhile, see the <a href="#/subject/' + s.id + '/current-affairs">current affairs</a> or <a href="#/papers">previous year papers</a>.</p></div>'), s.name);
    }
    if (!secId) {
      return render(subjectShell(s, null, null,
        '<h1>' + esc(s.name) + '</h1><p class="lede">' + esc(s.blurb) + '</p>' +
        s.sections.map(function (sec) {
          return '<section class="sec-block"><h2><a href="#/subject/' + s.id + '/' + sec.id + '">' + esc(sec.name) + '</a></h2>' + topicList(s, sec) + '</section>';
        }).join('')), s.name);
    }

    if (secId === 'current-affairs') {
      var cat = caFor(s.id);
      render(subjectShell(s, 'current-affairs', null,
        '<nav class="crumbs" aria-label="Breadcrumb"><a href="#/subject/' + s.id + '">' + esc(s.name) + '</a><span aria-hidden="true">/</span><span>Current affairs</span></nav>' +
        '<h1>' + esc(s.name) + ': current affairs</h1><div data-ca></div>'), s.name + ' current affairs');
      return fillCA(app.querySelector('[data-ca]'), cat);
    }

    var sec = section(s, secId);
    if (!sec) return render(pageNotFound(), 'Not found');

    if (!topicId) {
      var done = sec.topics.filter(function (t) { return t.ready; }).length;
      return render(subjectShell(s, sec.id, null,
        '<nav class="crumbs" aria-label="Breadcrumb"><a href="#/subject/' + s.id + '">' + esc(s.name) + '</a><span aria-hidden="true">/</span><span>' + esc(sec.name) + '</span></nav>' +
        '<h1>' + esc(sec.name) + '</h1><p class="lede">' + sec.topics.length + ' topics, ' + done + ' with notes.</p>' + topicList(s, sec)), sec.name);
    }

    var t = topic(sec, topicId);
    if (!t) return render(pageNotFound(), 'Not found');
    var idx = sec.topics.indexOf(t), prev = sec.topics[idx - 1], next = sec.topics[idx + 1];
    var pager = '<nav class="pager" aria-label="Topics">' +
      (prev ? '<a href="#/subject/' + s.id + '/' + sec.id + '/' + prev.id + '"><span>Previous</span>' + esc(prev.title) + '</a>' : '<span></span>') +
      (next ? '<a class="pg-next" href="#/subject/' + s.id + '/' + sec.id + '/' + next.id + '"><span>Next</span>' + esc(next.title) + '</a>' : '<span></span>') + '</nav>';
    var crumbs = '<nav class="crumbs" aria-label="Breadcrumb"><a href="#/subject/' + s.id + '">' + esc(s.name) + '</a><span aria-hidden="true">/</span><a href="#/subject/' + s.id + '/' + sec.id + '">' + esc(sec.name) + '</a></nav>';

    if (!t.ready) {
      return render(subjectShell(s, sec.id, t.id, crumbs + '<h1>' + esc(t.title) + '</h1><p class="empty">Notes for this topic haven’t been added yet.</p>' + pager), t.title);
    }
    render(subjectShell(s, sec.id, t.id, crumbs + '<h1>' + esc(t.title) + '</h1><p class="loading">Loading notes…</p>'), t.title);
    var noteId = s.id + '/' + sec.id + '/' + t.id;
    load('note', noteId).then(function (n) {
      var main = app.querySelector('.subject-main');
      if (!main || parse().join('/') !== ['subject', s.id, sec.id, t.id].join('/')) return;
      main.innerHTML = crumbs + '<h1>' + esc(n.title || t.title) + '</h1>' +
        (n.updated ? '<p class="meta">Last updated ' + esc(n.updated) + '</p>' : '') +
        '<article class="prose">' + n.html + '</article>' + pager;
    }).catch(function (err) { app.querySelector('.subject-main').innerHTML = crumbs + '<h1>' + esc(t.title) + '</h1><p class="empty">' + esc(err.message) + '</p>'; });
  }

  /* ------------------------------------------------------- current affairs */
  function fillCA(el, cat) {
    if (!cat || !cat.ready) {
      el.innerHTML = '<p class="empty">No current affairs added here yet. Entries will appear month by month, newest first.</p>';
      return;
    }
    el.innerHTML = '<p class="loading">Loading…</p>';
    load('ca', cat.id).then(function (d) {
      var groups = {};
      (d.entries || []).forEach(function (e) { (groups[e.month] = groups[e.month] || []).push(e); });
      var months = Object.keys(groups).sort().reverse();
      el.innerHTML = months.length ? months.map(function (m) {
        return '<section class="ca-month"><h2>' + UI.monthLabel(m) + '</h2>' + groups[m].map(function (e) {
          return '<article class="ca-entry"><h3>' + esc(e.title) + '</h3><div class="prose">' + e.html + '</div></article>';
        }).join('') + '</section>';
      }).join('') : '<p class="empty">No entries yet.</p>';
    }).catch(function (err) { el.innerHTML = '<p class="empty">' + esc(err.message) + '</p>'; });
  }

  function pageCurrentAffairs(catId) {
    var cat = S.caCategories.filter(function (c) { return c.id === catId; })[0] || S.caCategories[0];
    render('<div class="wrap page">' +
      '<h1>Current affairs</h1>' +
      '<p class="lede">Events of national and international importance, sorted by subject and month.</p>' +
      '<nav class="tabs" aria-label="Current affairs categories">' + S.caCategories.map(function (c) {
        return '<a href="#/current-affairs/' + c.id + '"' + (c.id === cat.id ? ' aria-current="page"' : '') + '>' + esc(c.name) + '</a>';
      }).join('') + '</nav>' +
      '<h2 class="tab-title">' + esc(cat.name) + '</h2><div data-ca></div></div>', 'Current affairs');
    fillCA(app.querySelector('[data-ca]'), cat);
  }

  /* ---------------------------------------------------------------- papers */
  function paperActions(pp) {
    var base = '#/papers/' + pp.id;
    return '<div class="pr-actions">' +
      '<a class="icon-btn" href="' + base + '/overview" aria-label="Paper overview, ' + pp.year + '">' + I('chart') + '<span>Overview</span></a>' +
      '<a class="icon-btn" href="' + base + '/questions" aria-label="View questions, ' + pp.year + '">' + I('questions') + '<span>Questions</span></a>' +
      '<a class="icon-btn" href="' + base + '/key" aria-label="View answer key, ' + pp.year + '">' + I('key') + '<span>Answer key</span></a>' +
      '<a class="icon-btn icon-btn-primary" href="' + base + '/attempt" aria-label="Attempt paper, ' + pp.year + '">' + I('attempt') + '<span>Attempt</span></a>' +
      '</div>';
  }

  function pagePapers(id, view, mode) {
    if (!id) {
      return render('<div class="wrap page">' +
        '<h1>Previous year papers</h1>' +
        '<p class="lede">UPSC Civil Services Prelims, General Studies Paper I, Series A, from 2011 to 2026. Read the questions, check the answer key, or attempt a paper and get your score with negative marking.</p>' +
        '<ul class="paper-list">' + S.papers.map(function (pp) {
          return '<li class="paper-row"><span class="pr-year">' + pp.year + '</span>' +
            '<span class="pr-info"><span class="pr-name">GS Paper I, Series A</span><span class="pr-status">' + (pp.provisional ? 'Provisional answer key' : 'Official answer key') + '</span></span>' +
            paperActions(pp) + '</li>';
        }).join('') + '</ul></div>', 'Previous year papers');
    }
    var meta = paperMeta(id);
    if (!meta) return render(pageNotFound(), 'Not found');
    render(loadingHTML('Loading the ' + meta.year + ' paper…'));
    var want = location.hash;
    load('paper', id).then(function (paper) {
      if (location.hash !== want) return;
      if (view === 'overview') return viewOverview(paper);
      if (view === 'questions') return viewQuestions(paper);
      if (view === 'key') return viewKey(paper);
      if (view === 'attempt' && !mode) return viewChooser(paper);
      if (view === 'attempt' && (mode === 'timed' || mode === 'untimed')) {
        if (Exam.takePending(id, mode)) { document.title = 'Attempting ' + paper.year + ' | ' + S.owner; return Exam.start(app, paper, mode); }
        history.replaceState(null, '', '#/papers/' + id + '/attempt');
        currentHash = location.hash;
        return viewChooser(paper);
      }
      if (view === 'result') {
        if (Exam.lastFor(id)) { document.title = paper.year + ' result | ' + S.owner; return Exam.renderResult(app, paper); }
        history.replaceState(null, '', '#/papers/' + id + '/attempt');
        currentHash = location.hash;
        return viewChooser(paper);
      }
      render(pageNotFound(), 'Not found');
    }).catch(function (err) { render(errorHTML(err)); });
  }

  function paperHead(paper, current) {
    var base = '#/papers/' + paper.id;
    var tabs = [['overview', 'Overview', 'chart'], ['questions', 'Questions', 'questions'], ['key', 'Answer key', 'key'], ['attempt', 'Attempt', 'attempt']];
    return '<nav class="crumbs" aria-label="Breadcrumb"><a href="#/papers">Previous year papers</a><span aria-hidden="true">/</span><span>' + paper.year + '</span></nav>' +
      '<div class="paper-head"><h1>' + paper.year + ' <span>GS Paper I, Series A</span></h1>' +
      '<nav class="tabs tabs-icons" aria-label="' + paper.year + ' paper">' + tabs.map(function (t) {
        return '<a href="' + base + '/' + t[0] + '"' + (t[0] === current ? ' aria-current="page"' : '') + '>' + I(t[2]) + '<span>' + t[1] + '</span></a>';
      }).join('') + '</nav></div>';
  }

  var SUBJ_COLORS = { history: '#c2410c', polity: '#1d4ed8', geography: '#0f766e', economy: '#7c3aed', environment: '#15803d', 'general-science': '#0891b2', science: '#db2777', international: '#a16207', misc: '#6b7280' };
  function subjName(id) { var s = subject(id); return s ? s.name : 'Miscellaneous'; }

  function viewOverview(paper) {
    var qs = paper.questions, N = qs.length;
    var ids = S.subjects.map(function (s) { return s.id; }).concat(['misc']);
    var bySub = {}; ids.forEach(function (id) { bySub[id] = { total: 0, ca: 0, qs: [] }; });
    var ca = 0, formats = {}, keyDist = { a: 0, b: 0, c: 0, d: 0 }, dropped = [];
    qs.forEach(function (q) {
      var s = bySub[q.s] || bySub.misc;
      s.total++; s.qs.push(q.n); if (q.ca) { s.ca++; ca++; }
      formats[q.f] = (formats[q.f] || 0) + 1;
      var k = paper.key.charAt(q.n - 1);
      if (k === 'x') dropped.push(q.n); else keyDist[k]++;
    });
    var order = ids.slice().sort(function (x, y) { return bySub[y].total - bySub[x].total; });
    var maxSub = Math.max.apply(null, order.map(function (id) { return bySub[id].total; })) || 1;
    var top = order[0];
    var pct = function (n) { return Math.round(n / N * 100); };

    var bars = order.filter(function (id) { return bySub[id].total; }).map(function (id) {
      var b = bySub[id], w = b.total / maxSub * 100;
      return '<li class="hbar">' +
        '<span class="hb-label"><i style="background:' + SUBJ_COLORS[id] + '"></i>' + esc(subjName(id)) + '</span>' +
        '<span class="hb-track"><span class="hb-fill" style="width:' + w + '%">' +
          '<span class="hb-static" style="flex:' + (b.total - b.ca) + '"></span><span class="hb-ca" style="flex:' + b.ca + '"></span>' +
        '</span></span>' +
        '<span class="hb-num">' + b.total + '<small>' + b.ca + ' CA</small></span></li>';
    }).join('');

    var R = 54, C = 2 * Math.PI * R, caLen = ca / N * C;
    var donut = '<svg viewBox="0 0 140 140" class="donut" role="img" aria-label="' + ca + ' current affairs and ' + (N - ca) + ' static questions">' +
      '<circle cx="70" cy="70" r="' + R + '" fill="none" stroke="var(--line)" stroke-width="16"/>' +
      '<circle cx="70" cy="70" r="' + R + '" fill="none" stroke="var(--ink)" stroke-width="16" stroke-dasharray="' + (C - caLen) + ' ' + C + '" transform="rotate(-90 70 70)"/>' +
      '<circle cx="70" cy="70" r="' + R + '" fill="none" stroke="var(--accent)" stroke-width="16" stroke-dasharray="' + caLen + ' ' + C + '" stroke-dashoffset="' + (-(C - caLen)) + '" transform="rotate(-90 70 70)"/>' +
      '<text x="70" y="68" text-anchor="middle" class="donut-num">' + pct(ca) + '%</text><text x="70" y="88" text-anchor="middle" class="donut-lbl">current affairs</text></svg>';

    var fOrder = ['Multiple statements', 'Direct', 'Match / pairs', 'How many', 'Statement I/II'];
    var fMax = Math.max.apply(null, fOrder.map(function (f) { return formats[f] || 0; })) || 1;
    var fBars = fOrder.map(function (f) {
      var n = formats[f] || 0;
      return '<li class="vbar"><span class="vb-num">' + n + '</span><span class="vb-col"><span style="height:' + (n / fMax * 100) + '%"></span></span><span class="vb-label">' + esc(f) + '</span></li>';
    }).join('');
    var kMax = Math.max(keyDist.a, keyDist.b, keyDist.c, keyDist.d) || 1;
    var kBars = ['a', 'b', 'c', 'd'].map(function (k) {
      return '<li class="vbar"><span class="vb-num">' + keyDist[k] + '</span><span class="vb-col vb-key"><span style="height:' + (keyDist[k] / kMax * 100) + '%"></span></span><span class="vb-label">(' + k + ')</span></li>';
    }).join('');

    var map = qs.map(function (q) {
      return '<span class="qm-cell' + (q.ca ? ' is-ca' : '') + '" style="--c:' + (SUBJ_COLORS[q.s] || SUBJ_COLORS.misc) + '" title="Q' + q.n + ': ' + esc(subjName(q.s)) + (q.ca ? ', current affairs' : ', static') + '">' + q.n + '</span>';
    }).join('');
    var legend = order.filter(function (id) { return bySub[id].total; }).map(function (id) {
      return '<li><i style="background:' + SUBJ_COLORS[id] + '"></i>' + esc(subjName(id)) + '</li>';
    }).join('');
    var lists = order.filter(function (id) { return bySub[id].total; }).map(function (id) {
      return '<details class="ov-list"><summary><i style="background:' + SUBJ_COLORS[id] + '"></i>' + esc(subjName(id)) + '<span>' + bySub[id].total + '</span></summary><p>' + bySub[id].qs.map(function (n) { return 'Q' + n; }).join(', ') + '</p></details>';
    }).join('');

    render('<div class="wrap page">' + paperHead(paper, 'overview') +
      '<div class="ov-stats">' +
        '<div><span>Questions</span><strong>' + N + '</strong></div>' +
        '<div><span>Current affairs</span><strong>' + ca + '</strong><em>' + pct(ca) + '%</em></div>' +
        '<div><span>Static</span><strong>' + (N - ca) + '</strong><em>' + pct(N - ca) + '%</em></div>' +
        '<div><span>Most asked</span><strong class="ov-top">' + esc(subjName(top)) + '</strong><em>' + bySub[top].total + ' questions</em></div>' +
        '<div><span>Dropped by UPSC</span><strong>' + dropped.length + '</strong>' + (dropped.length ? '<em>Q' + dropped.join(', Q') + '</em>' : '') + '</div>' +
      '</div>' +
      '<div class="ov-grid">' +
        '<section class="ov-card ov-wide"><div class="ov-head"><h2>Questions by subject</h2><ul class="ov-key"><li><i class="k-static"></i>Static</li><li><i class="k-ca"></i>Current affairs</li></ul></div><ul class="hbars">' + bars + '</ul></section>' +
        '<section class="ov-card"><h2>Current affairs vs static</h2><div class="donut-wrap">' + donut + '<ul class="ov-key ov-key-col"><li><i class="k-ca"></i>Current affairs <b>' + ca + '</b></li><li><i class="k-static"></i>Static <b>' + (N - ca) + '</b></li></ul></div></section>' +
        '<section class="ov-card"><h2>Question formats</h2><ul class="vbars">' + fBars + '</ul></section>' +
        '<section class="ov-card"><h2>Answer key spread</h2><ul class="vbars vbars-4">' + kBars + '</ul></section>' +
        '<section class="ov-card ov-wide"><div class="ov-head"><h2>Question map</h2><p class="fine">Each square is a question, coloured by subject. A dot marks current affairs.</p></div><div class="qmap">' + map + '</div><ul class="ov-legend">' + legend + '</ul></section>' +
        '<section class="ov-card ov-wide"><h2>Question numbers by subject</h2>' + lists + '</section>' +
      '</div>' +
      '<p class="fine ov-note">Subjects and the current affairs or static label are tagged automatically from the wording of each question, so treat this as a close guide rather than an official classification. Questions outside the eight subjects are counted as Miscellaneous.</p>' +
    '</div>', paper.year + ' overview');
  }

  function viewQuestions(paper) {
    var opts = '';
    for (var q = 1; q <= paper.questions.length; q++) opts += '<option value="' + q + '">Question ' + q + '</option>';
    render('<div class="wrap page">' + paperHead(paper, 'questions') +
      '<div class="jump"><label for="jumpQ">Go to</label><select id="jumpQ">' + opts + '</select>' +
      '<label class="toggle"><input type="checkbox" id="showKey"> Show answers</label></div>' +
      '<div class="qsheet qsheet-read">' + Exam.questionsHTML(paper, 'read') + '</div></div>', paper.year + ' questions');
    app.querySelector('#jumpQ').addEventListener('change', function (e) { Exam.scrollToQ(app, +e.target.value); });
    app.querySelector('#showKey').addEventListener('change', function (e) {
      app.querySelectorAll('.qcard').forEach(function (card) {
        var k = paper.key.charAt(+card.dataset.q - 1);
        card.querySelectorAll('.opt').forEach(function (li, i) { li.classList.toggle('is-key', e.target.checked && 'abcd'[i] === k); });
        card.classList.toggle('is-dropped', e.target.checked && k === 'x');
      });
    });
  }

  function viewKey(paper) {
    var dropped = [];
    var cells = '';
    for (var q = 1; q <= 100; q++) {
      var k = paper.key.charAt(q - 1);
      if (k === 'x') dropped.push(q);
      cells += '<li class="key-cell' + (k === 'x' ? ' is-dropped' : '') + '"><span class="kc-q">' + q + '</span><span class="kc-a">' + (k === 'x' ? '<abbr title="Dropped by UPSC">Dropped</abbr>' : '<span class="bubble is-filled">' + k + '</span>') + '</span></li>';
    }
    render('<div class="wrap page">' + paperHead(paper, 'key') +
      '<p class="lede">' + esc(paper.keyNote) + ' ' + (dropped.length ? 'Dropped: question' + (dropped.length > 1 ? 's ' : ' ') + dropped.join(', ') + '.' : 'No questions were dropped.') + '</p>' +
      '<ol class="key-grid">' + cells + '</ol></div>', paper.year + ' answer key');
  }

  function viewChooser(paper) {
    render('<div class="wrap page">' + paperHead(paper, 'attempt') +
      '<p class="lede">100 questions, 2 marks each. A wrong answer costs 0.66 marks and a blank costs nothing. Tick an option under each question, or mark the OMR answer sheet beside the paper; both stay in sync.</p>' +
      '<div class="mode-pick">' +
        '<section class="mode"><h2>With timer</h2><p>A two-hour countdown runs at the top, with reminders at 30, 10, 5 and 1 minute left. The paper submits itself when time runs out.</p>' +
          '<button type="button" class="btn btn-primary" data-start="timed">Start with timer</button></section>' +
        '<section class="mode"><h2>Without timer</h2><p>All the questions, no clock. Work through the paper at your own pace and submit when you’re ready.</p>' +
          '<button type="button" class="btn" data-start="untimed">Start without timer</button></section>' +
      '</div>' +
      '<h2 class="h-small">While you attempt</h2>' +
      '<p>Turn on the <strong>pen</strong> to underline or scribble on the questions in six colours and three sizes, with a highlighter and eraser. Keyboard: P toggles the pen, Ctrl+Z undoes a stroke.</p>' +
      '<p class="fine">Refreshing or leaving the page ends the attempt without saving.</p>' +
    '</div>', 'Attempt ' + paper.year);
    app.querySelectorAll('[data-start]').forEach(function (b) {
      b.addEventListener('click', function () {
        Exam.prepare(paper.id, b.dataset.start);
        location.hash = '#/papers/' + paper.id + '/attempt/' + b.dataset.start;
      });
    });
  }

  function pageNotFound() {
    return '<div class="wrap page"><h1>Page not found</h1><p class="lede">This link doesn’t lead anywhere on the site.</p><p><a class="btn" href="#/">Go to the home page</a></p></div>';
  }

  route();
})();
