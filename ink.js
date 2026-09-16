/* Ink: freehand pen / highlighter / eraser on canvases laid over paper pages,
   plus a rough sheet. Strokes are stored as vectors so they survive resizes. */
window.Ink = (function () {
  'use strict';
  var I = function (n) { return UI.icon(n); };

  var COLORS = [
    { name: 'Blue', v: '#233075' }, { name: 'Black', v: '#1C1F2A' }, { name: 'Red', v: '#C62828' },
    { name: 'Green', v: '#1E7B4F' }, { name: 'Yellow', v: '#F2C230' }, { name: 'Pink', v: '#E0569B' }
  ];
  var SIZES = [{ name: 'Fine', v: 2 }, { name: 'Medium', v: 4 }, { name: 'Thick', v: 7 }];
  var TOOLS = [{ id: 'pen', name: 'Pen' }, { id: 'marker', name: 'Highlighter' }, { id: 'eraser', name: 'Eraser' }];

  var s;
  function reset() {
    if (s) Object.keys(s.obs).forEach(function (k) { s.obs[k].disconnect(); });
    s = { active: false, rough: false, tool: 'pen', color: { pen: '#233075', marker: '#F2C230' }, size: 4,
      strokes: {}, history: [], canvases: {}, obs: {}, root: null, hooks: {} };
  }
  reset();

  function pt(c, e) { var r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }

  function paint(ctx, st) {
    var p = st.pts;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = st.tool === 'marker' ? 'square' : 'round';
    if (st.tool === 'eraser') { ctx.globalCompositeOperation = 'destination-out'; ctx.strokeStyle = ctx.fillStyle = '#000'; ctx.lineWidth = st.size * 5; }
    else if (st.tool === 'marker') { ctx.globalAlpha = 0.38; ctx.strokeStyle = ctx.fillStyle = st.color; ctx.lineWidth = st.size * 4; }
    else { ctx.strokeStyle = ctx.fillStyle = st.color; ctx.lineWidth = st.size; }
    ctx.beginPath();
    if (p.length === 1) { ctx.arc(p[0][0], p[0][1], ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fill(); }
    else {
      ctx.moveTo(p[0][0], p[0][1]);
      for (var i = 1; i < p.length - 1; i++) {
        ctx.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2);
      }
      ctx.lineTo(p[p.length - 1][0], p[p.length - 1][1]);
      ctx.stroke();
    }
    ctx.restore();
  }

  function redraw(key) {
    var c = s.canvases[key];
    if (!c || !c.isConnected || !c.width) return;
    var ctx = c.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    var dpr = c.width / (c.clientWidth || 1);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    (s.strokes[key] || []).forEach(function (st) { paint(ctx, st); });
  }

  /* Strokes are stored relative to the canvas width so they stay on the same
     words when the page image is scaled (window resize, zoom). */
  function attach(canvas, key, always) {
    if (s.obs[key]) s.obs[key].disconnect();
    s.canvases[key] = canvas;
    var fit = function () {
      var par = canvas.parentElement; if (!par) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.round(par.clientWidth * dpr), h = Math.round(par.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      redraw(key);
    };
    var ro = new ResizeObserver(fit); ro.observe(canvas.parentElement); s.obs[key] = ro; fit();

    var cur = null;
    canvas.addEventListener('pointerdown', function (e) {
      if (!always && !s.active) return;
      if (e.button > 0) return;
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      var w = canvas.clientWidth || 1;
      cur = { tool: s.tool, color: s.tool === 'eraser' ? '#000' : s.color[s.tool], size: s.size, w: w, pts: [pt(canvas, e)] };
      (s.strokes[key] = s.strokes[key] || []).push(cur);
      s.history.push(key);
      redraw(key);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!cur) return;
      var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      if (!evs.length) evs = [e];
      evs.forEach(function (ev) { cur.pts.push(pt(canvas, ev)); });
      redraw(key);
    });
    var end = function () { cur = null; };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('lostpointercapture', end);
  }

  /* Scale strokes to the current canvas width before painting */
  var rawPaint = paint;
  paint = function (ctx, st) {
    var c = ctx.canvas, w = c.clientWidth || st.w, k = w / (st.w || w);
    if (k === 1) return rawPaint(ctx, st);
    rawPaint(ctx, { tool: st.tool, color: st.color, size: st.size * k, pts: st.pts.map(function (p) { return [p[0] * k, p[1] * k]; }) });
  };

  function undo() {
    var key = s.history.pop();
    if (!key) return;
    (s.strokes[key] || []).pop();
    redraw(key);
  }
  function clear(keys) {
    keys.forEach(function (k) { s.strokes[k] = []; redraw(k); });
    s.history = s.history.filter(function (k) { return keys.indexOf(k) < 0; });
  }
  function hasInk(prefix) {
    return Object.keys(s.strokes).some(function (k) { return k.indexOf(prefix) === 0 && s.strokes[k].length; });
  }

  function toolbarHTML() {
    return '<div class="ink-bar" role="toolbar" aria-label="Pen and rough work">' +
      '<button type="button" class="tool tool-toggle" data-ink="toggle" aria-pressed="false" title="Draw on the paper (P)">' + I('pen') + '<span>Pen</span></button>' +
      '<div class="ink-tools" hidden>' +
        '<div class="tool-seg">' + TOOLS.map(function (t) {
          return '<button type="button" class="tool" data-ink-tool="' + t.id + '" aria-pressed="' + (t.id === 'pen') + '" title="' + t.name + '">' + I(t.id) + '<span class="sr">' + t.name + '</span></button>';
        }).join('') + '</div>' +
        '<div class="tool-seg swatches">' + COLORS.map(function (c) {
          return '<button type="button" class="swatch" data-ink-color="' + c.v + '" style="--sw:' + c.v + '" aria-label="' + c.name + '" title="' + c.name + '" aria-pressed="' + (c.v === s.color.pen) + '"></button>';
        }).join('') + '</div>' +
        '<div class="tool-seg sizes">' + SIZES.map(function (z) {
          return '<button type="button" class="size" data-ink-size="' + z.v + '" aria-label="' + z.name + ' line" title="' + z.name + '" aria-pressed="' + (z.v === s.size) + '"><span style="--d:' + (z.v + 3) + 'px"></span></button>';
        }).join('') + '</div>' +
        '<div class="tool-seg">' +
          '<button type="button" class="tool" data-ink="undo" title="Undo (Ctrl+Z)">' + I('undo') + '<span class="sr">Undo</span></button>' +
          '<button type="button" class="tool" data-ink="clear" title="Clear all ink on the paper">' + I('trash') + '<span class="sr">Clear all ink</span></button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function sync() {
    var r = s.root; if (!r) return;
    var show = s.active || s.rough;
    r.querySelector('.ink-tools').hidden = !show;
    r.querySelector('[data-ink="toggle"]').setAttribute('aria-pressed', s.active);
    r.querySelectorAll('[data-ink-tool]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.inkTool === s.tool); });
    r.querySelectorAll('[data-ink-size]').forEach(function (b) { b.setAttribute('aria-pressed', +b.dataset.inkSize === s.size); });
    r.querySelectorAll('[data-ink-color]').forEach(function (b) {
      b.setAttribute('aria-pressed', s.tool !== 'eraser' && b.dataset.inkColor === s.color[s.tool]);
      b.disabled = s.tool === 'eraser';
    });
  }

  function setActive(on) { s.active = on; sync(); if (s.hooks.onToggle) s.hooks.onToggle(on); }
  function setRough(on) { s.rough = on; sync(); if (s.hooks.onRough) s.hooks.onRough(on); }

  function bind(root, hooks) {
    s.root = root; s.hooks = hooks || {};
    root.querySelector('.ink-bar').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.ink === 'toggle') setActive(!s.active);
      else if (b.dataset.ink === 'undo') undo();
      else if (b.dataset.ink === 'clear') { if (s.hooks.onClear) s.hooks.onClear(); }
      else if (b.dataset.inkTool) { s.tool = b.dataset.inkTool; if (!s.active && !s.rough) setActive(true); }
      else if (b.dataset.inkColor) { if (s.tool !== 'eraser') s.color[s.tool] = b.dataset.inkColor; }
      else if (b.dataset.inkSize) { s.size = +b.dataset.inkSize; }
      sync();
    });
    sync();
  }

  return {
    reset: reset, attach: attach, bind: bind, undo: undo, clear: clear, hasInk: hasInk, toolbarHTML: toolbarHTML,
    setActive: setActive, setRough: setRough,
    isActive: function () { return s.active; }, isRough: function () { return s.rough; },
    keys: function () { return Object.keys(s.strokes); }
  };
})();
