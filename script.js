/* =====================================================================
   Class 10 Physics Simulator
   ---------------------------------------------------------------------
   Pure HTML + CSS + JavaScript, no libraries, no backend.

   Layout of this file:
     1.  Constants, theme palettes, small helpers
     2.  Canvas + resize handling
     3.  Drawing helpers (lines, arrows, labels, arcs)
     4.  UI framework (controls, readouts, note line, navigation)
     5.  Topic 1 — Reflection
     6.  Topic 2 — Spherical mirrors
     7.  Topic 3 — Refraction
     8.  Topic 4 — Lenses
     9.  Topic 5 — Human eye
     10. Topic 6 — Electricity
     11. Topic 7 — Magnetic effects of current
     12. Boot
   ===================================================================== */

(function () {
  'use strict';

  /* ===================================================================
     1. CONSTANTS & HELPERS
     =================================================================== */

  const $ = (sel, root) => (root || document).querySelector(sel);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const R = (deg) => (deg * Math.PI) / 180;      // degrees → radians
  const DEG = (r) => (r * 180) / Math.PI;        // radians → degrees
  const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  // Canvas colours for the two themes (kept in sync with style.css)
  const THEMES = {
    dark: {
      bg: '#0a1120',
      grid: 'rgba(255,255,255,0.07)',
      gridStrong: 'rgba(255,255,255,0.15)',
      axis: 'rgba(255,255,255,0.42)',
      ink: '#e9effc',
      muted: '#8fa0bd',
      panel: 'rgba(255,255,255,0.05)',
    },
    light: {
      bg: '#f7fafd',
      grid: 'rgba(15,23,42,0.07)',
      gridStrong: 'rgba(15,23,42,0.15)',
      axis: 'rgba(15,23,42,0.45)',
      ink: '#0f172a',
      muted: '#5b6b85',
      panel: 'rgba(15,23,42,0.05)',
    },
  };

  function readTheme() {
    return document.documentElement.dataset.theme === 'light'
      ? THEMES.light
      : THEMES.dark;
  }

  // Shared ray / object colours, readable on both themes
  const K = {
    inci: '#fbbf24',   // incident light
    refl: '#38bdf8',   // reflected light
    refr: '#34d399',   // refracted light
    normal: '#a78bfa', // normal / construction lines
    obj: '#f472b6',    // object
    img: '#22d3ee',    // image
    glass: '#93c5fd',  // mirrors, lenses, prisms
    hot: '#ef4444',
    warm: '#f59e0b',
    cool: '#60a5fa',
    white: '#f8fafc',
  };

  const VIBGYOR = [
    { name: 'V', n: 1.532, c: '#8b5cf6' },
    { name: 'I', n: 1.530, c: '#6366f1' },
    { name: 'B', n: 1.528, c: '#3b82f6' },
    { name: 'G', n: 1.524, c: '#22c55e' },
    { name: 'Y', n: 1.520, c: '#eab308' },
    { name: 'O', n: 1.517, c: '#f97316' },
    { name: 'R', n: 1.514, c: '#ef4444' },
  ];

  const MEDIA = [
    ['1', 'Air (n = 1.00)'],
    ['1.33', 'Water (n = 1.33)'],
    ['1.5', 'Glass (n = 1.50)'],
    ['2.42', 'Diamond (n = 2.42)'],
  ];

  /* ===================================================================
     CREDIT — the only place the name is written
     -------------------------------------------------------------------
     Change CREDIT and it updates everywhere at once:
       • the #watermark in the bottom-right corner of every screen
       • the small credit line under the cards on the home screen
     CREDIT_LABEL is the wording used in front of the name on the home
     screen only (the watermark shows the name on its own).
     The look of each one lives in style.css (section 9 for the
     watermark, section 4 for the home credit line).
     =================================================================== */
  const CREDIT = 'Abhinibesh-fresher';
  const CREDIT_LABEL = 'Built by ';

  // Push the credit into both places
  function paintCredit() {
    const mark = $('#watermark');
    if (mark) mark.textContent = CREDIT;

    const homeCredit = $('#homeCredit');
    if (homeCredit) homeCredit.textContent = CREDIT_LABEL + CREDIT;
  }

  /* ===================================================================
     2. CANVAS
     =================================================================== */

  const canvas = $('#sim');
  const ctx = canvas.getContext('2d');
  const view = { w: 0, h: 0, dpr: 1 };
  let T = THEMES.dark; // active palette

  function fit() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    if (view.w === rect.width && view.h === rect.height && view.dpr === dpr) return;

    view.w = rect.width;
    view.h = rect.height;
    view.dpr = dpr;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Pointer position in CSS pixels relative to the canvas
  function localPoint(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  /* ===================================================================
     3. DRAWING HELPERS
     =================================================================== */

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function line(x1, y1, x2, y2, color, w, dash) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = w || 1.5;
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  // Arrow head at (x, y) pointing along `ang`
  function head(x, y, ang, size, color) {
    const s = size || 8;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - Math.cos(ang - 0.42) * s, y - Math.sin(ang - 0.42) * s);
    ctx.lineTo(x - Math.cos(ang + 0.42) * s, y - Math.sin(ang + 0.42) * s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Straight arrow from A to B
  function arrow(x1, y1, x2, y2, color, w, size) {
    line(x1, y1, x2, y2, color, w);
    head(x2, y2, Math.atan2(y2 - y1, x2 - x1), size, color);
  }

  // Arrow head part-way along a segment (for long rays)
  function midArrow(x1, y1, x2, y2, color, frac, size) {
    const f = frac === undefined ? 0.55 : frac;
    const x = x1 + (x2 - x1) * f;
    const y = y1 + (y2 - y1) * f;
    head(x, y, Math.atan2(y2 - y1, x2 - x1), size || 8, color);
  }

  function dot(x, y, r, color, glow) {
    ctx.save();
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function label(text, x, y, color, o) {
    o = o || {};
    ctx.save();
    ctx.font = (o.weight || 500) + ' ' + (o.size || 12) + 'px ' + (o.mono ? MONO : SANS);
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.baseline || 'middle';

    if (o.bg) {
      const w = ctx.measureText(text).width + 10;
      const h = (o.size || 12) + 9;
      let bx = x - 5;
      if (ctx.textAlign === 'center') bx = x - w / 2;
      if (ctx.textAlign === 'right') bx = x - w + 5;
      ctx.fillStyle = o.bg;
      rr(bx, y - h / 2, w, h, 6);
      ctx.fill();
    }

    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // Small arc between two angles with an optional label at its middle
  function angleArc(cx, cy, r, a1, a2, color, text) {
    let d = a2 - a1;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, r, a1, a1 + d, d < 0);
    ctx.stroke();
    ctx.restore();

    if (text) {
      const mid = a1 + d / 2;
      label(text, cx + Math.cos(mid) * (r + 17), cy + Math.sin(mid) * (r + 17), color, {
        align: 'center',
        size: 11,
        weight: 700,
      });
    }
  }

  // Dashed guide line with an optional tick at the end
  function guide(x1, y1, x2, y2, color, w) {
    line(x1, y1, x2, y2, color, w || 1.2, [4, 5]);
  }

  /* ===================================================================
     4. UI FRAMEWORK
     =================================================================== */

  const ui = {
    els: {},
    syncers: {},

    // Read a control's current value
    val(id) {
      const el = ui.els[id];
      if (!el) return undefined;
      if (el.classList.contains('seg')) {
        const on = el.querySelector('.seg-btn.on');
        return on ? on.dataset.v : undefined;
      }
      if (el.type === 'range') return Number(el.value);
      if (el.type === 'checkbox') return el.checked;
      return el.value;
    },

    // Programmatically change a control (keeps the label in sync)
    set(id, value) {
      const el = ui.els[id];
      if (!el) return;
      if (el.type === 'range') {
        el.value = value;
        if (ui.syncers[id]) ui.syncers[id]();
      } else if (el.classList.contains('seg')) {
        el.querySelectorAll('.seg-btn').forEach((b) => {
          b.classList.toggle('on', b.dataset.v === String(value));
        });
      } else {
        el.value = value;
      }
    },

    on(id, ev, fn) {
      const el = ui.els[id];
      if (el) el.addEventListener(ev, fn);
    },
  };

  // Build the controls column from a topic's control spec
  function buildControls(topic) {
    const host = $('#controls');
    host.innerHTML = '';
    ui.els = {};
    ui.syncers = {};

    (topic.controls || []).forEach((c) => {
      /* ---- slider ---- */
      if (c.type === 'range') {
        const wrap = document.createElement('div');
        wrap.className = 'control';
        wrap.innerHTML =
          '<div class="control-head"><label for="c-' + c.id + '">' + c.label +
          '</label><span class="ctl-value" id="v-' + c.id + '"></span></div>' +
          '<input type="range" id="c-' + c.id + '" min="' + c.min + '" max="' + c.max +
          '" step="' + (c.step || 1) + '" value="' + c.value + '">';
        host.append(wrap);

        const input = wrap.querySelector('input');
        const out = wrap.querySelector('#v-' + c.id);
        ui.els[c.id] = input;

        const sync = () => {
          const v = Number(input.value);
          const pct = ((v - c.min) / (c.max - c.min)) * 100;
          input.style.setProperty('--p', pct.toFixed(2));
          out.textContent = (c.format ? c.format(v) : v) + (c.unit || '');
        };
        input.addEventListener('input', sync);
        ui.syncers[c.id] = sync;
        sync();

        /* ---- segmented toggle ---- */
      } else if (c.type === 'seg') {
        const wrap = document.createElement('div');
        wrap.className = 'control';
        wrap.innerHTML =
          '<div class="control-head"><span class="ctl-label">' + c.label + '</span></div>' +
          '<div class="seg" id="c-' + c.id + '">' +
          c.options
            .map(
              (o) =>
                '<button type="button" class="seg-btn' +
                (o[0] === c.value ? ' on' : '') +
                '" data-v="' + o[0] + '">' + o[1] + '</button>'
            )
            .join('') +
          '</div>';
        host.append(wrap);

        const seg = wrap.querySelector('.seg');
        ui.els[c.id] = seg;
        seg.addEventListener('click', (e) => {
          const b = e.target.closest('.seg-btn');
          if (!b) return;
          seg.querySelectorAll('.seg-btn').forEach((x) => x.classList.toggle('on', x === b));
          seg.dispatchEvent(new Event('change'));
        });
        seg.dispatchEvent(new Event('change'));

        /* ---- dropdown ---- */
      } else if (c.type === 'select') {
        const wrap = document.createElement('div');
        wrap.className = 'control';
        wrap.innerHTML =
          '<div class="control-head"><label for="c-' + c.id + '">' + c.label + '</label></div>' +
          '<select id="c-' + c.id + '">' +
          c.options
            .map(
              (o) =>
                '<option value="' + o[0] + '"' +
                (o[0] === c.value ? ' selected' : '') + '>' + o[1] + '</option>'
            )
            .join('') +
          '</select>';
        host.append(wrap);
        ui.els[c.id] = wrap.querySelector('select');

        /* ---- buttons ---- */
      } else if (c.type === 'buttons') {
        const row = document.createElement('div');
        row.className = 'btn-row';
        c.items.forEach((b) => {
          const el = document.createElement('button');
          el.type = 'button';
          el.className = 'btn' + (b.primary ? ' btn-primary' : '');
          el.id = 'c-' + b.id;
          el.textContent = b.label;
          if (b.full) el.dataset.full = '1';
          row.append(el);
          ui.els[b.id] = el;
        });
        host.append(row);
      }
    });
  }

  /* ---------- Readouts ---------- */

  let statCache = {};
  let statKey = '';

  function stats(pairs) {
    const host = $('#readouts');
    if (!pairs) {
      host.innerHTML = '';
      statCache = {};
      statKey = '';
      return;
    }
    // Rebuild when the set of labels changes (e.g. switching sub-modes)
    const key = pairs.map((p) => p[0]).join('|');
    if (key !== statKey) {
      host.innerHTML = pairs
        .map(
          (p) =>
            '<div class="readout"><span class="r-label">' + p[0] +
            '</span><span class="r-value">—</span></div>'
        )
        .join('');
      statCache = {};
      statKey = key;
    }
    const vals = host.querySelectorAll('.r-value');
    pairs.forEach((p, i) => {
      const s = String(p[1]);
      if (statCache[i] !== s) {
        vals[i].textContent = s;
        statCache[i] = s;
      }
    });
  }

  /* ---------- Note under the canvas ---------- */

  let noteCache = '';

  function note(html) {
    if (html === noteCache) return;
    noteCache = html;
    $('#simNote').innerHTML = html || '';
  }

  /* ===================================================================
     5. TOPIC 1 — REFLECTION (plane mirror)
     =================================================================== */

  const T_REFLECT = {
    id: 'reflection',
    title: 'Reflection',
    accent: '#38bdf8',
    blurb: 'Light bouncing off a plane mirror — the angle of incidence always equals the angle of reflection.',
    controls: [
      {
        type: 'range',
        id: 'angle',
        label: 'Angle of incidence',
        min: 0,
        max: 90,
        step: 1,
        value: 35,
        unit: '°',
      },
    ],
    formulas: [
      ['Law of reflection', '∠i = ∠r'],
      ['Angles are measured from the normal', 'not from the mirror surface'],
      ['Angle between the rays', '∠(incident, reflected) = 180° − 2i'],
    ],
    learn: [
      'The normal is a line drawn perpendicular to the mirror at the point where the ray strikes it.',
      'The incident ray, the reflected ray and the normal all lie in the same plane.',
      'A plane mirror forms a virtual, erect image of the same size, as far behind the mirror as the object is in front.',
      'Drag the lamp around: the ray always leaves at the same angle it arrived at.',
    ],
    store: { dist: 0.34, side: 1 },
    reset() {
      this.store.dist = 0.34;
      this.store.side = 1;
    },

    // Point on the mirror where the ray lands + lamp position
    geometry() {
      const a = R(ui.val('angle') || 0);
      const O = { x: view.w * 0.72, y: view.h * 0.52 };
      const s = this.store.side;
      const d = this.store.dist * Math.min(view.w, view.h * 1.4);
      const dir = { x: Math.cos(a), y: Math.sin(a) * s }; // lamp → mirror
      return { O, src: { x: O.x - dir.x * d, y: O.y - dir.y * d }, dir, a };
    },

    onDown(p) {
      const { O } = this.geometry();
      const far = Math.hypot(p.x - O.x, p.y - O.y) < 190;
      this.store.grab = far || p.x < O.x;
      if (this.store.grab) this.onMove(p);
    },

    onMove(p) {
      if (!this.store.grab) return;
      const O = { x: view.w * 0.72, y: view.h * 0.52 };
      let dx = O.x - p.x;
      let dy = O.y - p.y;
      if (dx < 1) dx = 1; // keep the lamp on the left of the mirror

      const angle = clamp(DEG(Math.atan2(Math.abs(dy), dx)), 0, 90);
      this.store.side = dy > 0 ? 1 : -1;
      this.store.dist = clamp(Math.hypot(dx, dy) / Math.min(view.w, view.h * 1.4), 0.12, 0.62);

      ui.set('angle', Math.round(angle));
    },

    onUp() {
      this.store.grab = false;
    },

    draw() {
      const { O, src, dir, a } = this.geometry();

      /* Mirror */
      const mx = view.w * 0.72;
      const mTop = view.h * 0.08;
      const mBot = view.h * 0.92;
      line(mx, mTop, mx, mBot, K.glass, 5);
      // hatch marks on the back of the mirror
      for (let y = mTop + 8; y < mBot; y += 16) {
        line(mx + 3, y, mx + 13, y + 9, T.muted, 1);
      }
      label('Plane mirror', mx - 12, mTop + 4, T.muted, { align: 'right', size: 11 });

      /* Incident + reflected rays */
      const len = Math.hypot(O.x - src.x, O.y - src.y);
      const rd = { x: -dir.x, y: dir.y }; // reflection: flip the x component
      const end = { x: O.x + rd.x * len, y: O.y + rd.y * len };

      // incident ray
      line(src.x, src.y, O.x, O.y, K.inci, 2.4);
      midArrow(src.x, src.y, O.x, O.y, K.inci, 0.6, 9);
      // reflected ray
      line(O.x, O.y, end.x, end.y, K.refl, 2.4);
      midArrow(O.x, O.y, end.x, end.y, K.refl, 0.55, 9);

      /* Normal (perpendicular to the mirror, through O) */
      guide(O.x, O.y, O.x - Math.max(70, view.w * 0.16), O.y, K.normal, 1.4);
      label('N', O.x - Math.max(70, view.w * 0.16) - 10, O.y, K.normal, {
        align: 'right',
        size: 12,
        weight: 700,
      });

      /* Angle arcs */
      const aNormal = Math.atan2(0, -1);                       // normal points left
      const aSrc = Math.atan2(src.y - O.y, src.x - O.x);       // O → lamp
      const aRef = Math.atan2(rd.y, rd.x);                     // O → reflected ray
      const arcR = Math.min(64, len * 0.42);
      angleArc(O.x, O.y, arcR, aNormal, aSrc, K.inci, 'i');
      angleArc(O.x, O.y, arcR, aNormal, aRef, K.refl, 'r');

      /* Lamp (draggable) */
      const glow = ctx.createRadialGradient(src.x, src.y, 0, src.x, src.y, 34);
      glow.addColorStop(0, 'rgba(251,191,36,0.45)');
      glow.addColorStop(1, 'rgba(251,191,36,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(src.x, src.y, 34, 0, Math.PI * 2);
      ctx.fill();

      dot(src.x, src.y, 9, K.inci, true);
      dot(src.x, src.y, 4, '#fff9e6', false);
      label('light source (drag)', src.x, src.y - 22, T.muted, { align: 'center', size: 10.5 });

      /* Point of incidence */
      dot(O.x, O.y, 4, T.ink, false);

      /* Numerical readouts on the canvas */
      label('∠i = ' + ui.val('angle') + '°', O.x - arcR - 34, O.y - 14, K.inci, {
        align: 'right',
        size: 11.5,
        weight: 700,
        mono: true,
      });
      label('∠r = ' + ui.val('angle') + '°', O.x + 14, O.y + 34, K.refl, {
        size: 11.5,
        weight: 700,
        mono: true,
      });

      stats([
        ['Angle of incidence', ui.val('angle') + '°'],
        ['Angle of reflection', ui.val('angle') + '°'],
        ['Angle between rays', 180 - 2 * ui.val('angle') + '°'],
        ['Normal ↔ mirror', '90°'],
      ]);

      note(
        'The angle of incidence equals the angle of reflection — both are <strong>' +
          a.toFixed(0) + '°</strong> here. Drag the light source to change it.'
      );
    },
  };
  /* ===================================================================
     6. TOPIC 2 — SPHERICAL MIRRORS
     =================================================================== */

  // Solve the mirror formula. Returns image distance v (m) and magnification m.
  function mirrorSolution(f, u) {
    const inv = 1 / f - 1 / u;
    if (Math.abs(inv) < 1e-9) return { v: Infinity, m: NaN, infinite: true };
    const v = 1 / inv;
    return { v, m: -v / u, infinite: false };
  }

  // Describe the object position relative to F and C (concave mirrors)
  function mirrorCase(u, fMag) {
    const d = Math.abs(u);
    const tol = fMag * 0.03;
    if (d > 2 * fMag + tol) return 'Object beyond C';
    if (Math.abs(d - 2 * fMag) <= tol) return 'Object at C';
    if (d > fMag + tol) return 'Object between F and C';
    if (Math.abs(d - fMag) <= tol) return 'Object at F';
    return 'Object between F and P';
  }

  const T_MIRROR = {
    id: 'mirror',
    title: 'Spherical Mirrors',
    accent: '#a78bfa',
    blurb: 'Concave and convex mirrors: ray diagrams, the mirror formula and magnification.',
    controls: [
      {
        type: 'seg',
        id: 'type',
        label: 'Mirror type',
        options: [
          ['concave', 'Concave'],
          ['convex', 'Convex'],
        ],
        value: 'concave',
      },
      {
        type: 'range',
        id: 'f',
        label: 'Focal length |f|',
        min: 5,
        max: 40,
        step: 1,
        value: 15,
        unit: ' cm',
      },
    ],
    formulas: [
      ['Mirror formula', '1/v + 1/u = 1/f'],
      ['Magnification', 'm = −v/u = h′/h'],
      ['Radius of curvature', 'R = 2f  (C is at 2F)'],
      ['Sign convention', 'u is negative; concave f is negative, convex f is positive'],
    ],
    learn: [
      'Distances are measured from the pole P, along the principal axis, with the incident light travelling left to right.',
      'A concave mirror can form a real (inverted) image or a virtual (erect) one, depending on where the object sits.',
      'A convex mirror always forms a virtual, erect and diminished image between P and F — that is why it is used as a rear-view mirror.',
      'Drag the object along the axis to move through every case from beyond C down to between F and P.',
    ],
    store: { u: -30, drag: false },

    reset() {
      this.store.u = -30;
    },

    onResize() {
      this.store.drag = false;
    },

    onDown(p) {
      const g = this.lastGeo;
      if (!g) return;
      // grab if the pointer is near the object arrow
      const ox = g.X(this.store.u);
      if (Math.abs(p.x - ox) < 46 && p.y > g.oy - 120 && p.y < g.oy + 60) {
        this.store.drag = true;
        this.onMove(p);
      }
    },

    onMove(p) {
      if (!this.store.drag) return;
      const g = this.lastGeo;
      if (!g) return;
      const fMag = ui.val('f');
      const world = (p.x - g.ox) / g.scale;
      this.store.u = clamp(world, -6 * fMag, -0.18 * fMag);
    },

    onUp() {
      this.store.drag = false;
    },

    draw() {
      const type = ui.val('type');
      const fMag = ui.val('f');
      const f = type === 'concave' ? -fMag : fMag;
      const u = clamp(this.store.u, -6 * fMag, -0.18 * fMag);
      this.store.u = u;

      const ho = fMag * 0.8; // object height in cm — only sets the drawing scale
      const sol = mirrorSolution(f, u);
      const v = sol.infinite || Math.abs(sol.v) > 1e5 ? Infinity : sol.v;
      const m = isFinite(v) ? -v / u : NaN;
      const hi = isFinite(m) ? m * ho : NaN;

      /* ---------- scene scale ---------- */
      const left = Math.max(Math.abs(u), 2 * fMag, isFinite(v) && v < 0 ? Math.abs(v) : 0, 10);
      const right = Math.max(2 * fMag, isFinite(v) && v > 0 ? v : 0, 10);
      const up = Math.max(ho, isFinite(hi) && hi > 0 ? hi : 0, 1) * 1.45;
      const down = Math.max(isFinite(hi) && hi < 0 ? -hi : 0, 1) * 1.5;

      const ox = view.w * 0.62;
      const oy = view.h * 0.53;
      const scale = Math.min(
        (ox - 26) / (left * 1.05),
        (view.w - ox - 26) / (right * 1.05),
        (oy - 30) / up,
        (view.h - oy - 40) / down
      );
      const X = (x) => ox + x * scale;
      const Y = (y) => oy - y * scale;
      this.lastGeo = { X, Y, ox, oy, scale };

      /* ---------- principal axis + mirror ---------- */
      line(0, oy, view.w, oy, T.axis, 1.4);
      label('principal axis', view.w - 10, oy - 10, T.muted, { align: 'right', size: 10.5 });

      const Rpx = 2 * fMag * scale;
      const half = Math.min(view.h * 0.37, Rpx * 0.97);
      // capped so the mirror stays a shallow textbook arc rather than a deep bowl
      const th = Math.min(Math.asin(clamp(half / Rpx, 0, 0.98)), 0.55);
      const cx = X(2 * f);

      ctx.save();
      ctx.strokeStyle = K.glass;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      if (type === 'concave') ctx.arc(cx, oy, Rpx, -th, th);
      else ctx.arc(cx, oy, Rpx, Math.PI - th, Math.PI + th);
      ctx.stroke();
      ctx.restore();

      // hatched back of the mirror
      for (let k = -6; k <= 6; k++) {
        const ang = (k / 6) * th;
        const px = cx + Math.cos(ang) * Rpx;
        const py = oy + Math.sin(ang) * Rpx;
        if (py < oy - half || py > oy + half) continue;
        line(px, py, px + (type === 'concave' ? 11 : -11), py + 7, T.muted, 1);
      }

      /* ---------- markers: P, F, C ---------- */
      const mark = (x, txt, color) => {
        dot(X(x), oy, 3.5, color);
        label(txt, X(x), oy + 18, color, {
          align: 'center', size: 11, weight: 700, bg: T.bg,
        });
      };
      mark(0, 'P', T.ink);
      mark(f, 'F', K.hot);
      mark(2 * f, 'C', K.hot);

      /* ---------- object ---------- */
      const objTop = { x: X(u), y: Y(ho) };
      arrow(X(u), oy, objTop.x, objTop.y, K.obj, 2.6, 9);
      label('object', X(u), Y(ho) - 14, K.obj, { align: 'center', size: 10.5 });

      /* ---------- standard rays ---------- */
      // x-position of the curved surface at a given height, so rays meet the
      // mirror itself rather than the flat plane through the pole
      const arcXAt = (yw) => {
        const r = 2 * fMag;
        const d = r * r - yw * yw;
        if (d <= 0) return 0;
        return 2 * f + (type === 'concave' ? Math.sqrt(d) : -Math.sqrt(d));
      };

      // Ray 1: parallel to the axis, then through F
      const hit1 = { x: X(arcXAt(ho)), y: Y(ho) };
      line(objTop.x, objTop.y, hit1.x, hit1.y, K.inci, 2);
      midArrow(objTop.x, objTop.y, hit1.x, hit1.y, K.inci, 0.5, 8);

      // Ray 2: aimed at C, reflected back along itself
      const Cw = { x: 2 * f, y: 0 };
      let hit2 = null;
      if (Math.abs(Cw.x - u) > 1e-6) {
        // Only use this ray if C lies between the object and the mirror
        // (t > 0). With the object between F and C, C is behind the object
        // and the ray travels away from the mirror.
        const t = (0 - u) / (Cw.x - u);
        if (t > 0.02) {
          const hy = ho + t * (0 - ho);
          hit2 = { x: X(arcXAt(hy)), y: Y(hy) };
        }
      }
      if (!hit2) {
        // Fall back to the standard ray towards the pole P, which always works
        hit2 = { x: X(0), y: oy };
      }
      line(objTop.x, objTop.y, hit2.x, hit2.y, K.refr, 2);
      midArrow(objTop.x, objTop.y, hit2.x, hit2.y, K.refr, 0.55, 8);

      const imgPx = isFinite(v) ? { x: X(v), y: Y(hi) } : null;

      // Draw a reflected ray from `from` through the image (or in a fixed direction)
      const drawReflected = (from, imgPoint, fallbackDir) => {
        let dx;
        let dy;
        if (imgPoint) {
          dx = imgPoint.x - from.x;
          dy = imgPoint.y - from.y;
          if (v > 0) {
            dx = -dx;
            dy = -dy;
          }
        } else {
          dx = fallbackDir.x;
          dy = fallbackDir.y;
        }
        const l = Math.hypot(dx, dy) || 1;
        dx /= l;
        dy /= l;

        const reach = v < 0 && imgPoint
          ? Math.hypot(imgPoint.x - from.x, imgPoint.y - from.y) * 1.18
          : Math.max(view.w * 0.42, 150);

        const endP = { x: from.x + dx * reach, y: from.y + dy * reach };
        line(from.x, from.y, endP.x, endP.y, K.refl, 2);
        midArrow(from.x, from.y, endP.x, endP.y, K.refl, 0.5, 8);

        // virtual images: dashed backward extension to the image
        if (v > 0 && imgPoint) {
          guide(from.x, from.y, imgPoint.x, imgPoint.y, K.img, 1.2);
        }
      };

      // fallback directions when the image is at infinity
      const Fpx = { x: X(f), y: oy };
      const dirToF = { x: Fpx.x - hit1.x, y: Fpx.y - hit1.y };
      if (type === 'convex') {
        dirToF.x = -dirToF.x;
        dirToF.y = -dirToF.y;
      }

      drawReflected(hit1, imgPx, dirToF);
      if (hit2) {
        const back = { x: objTop.x - hit2.x, y: objTop.y - hit2.y };
        drawReflected(hit2, imgPx, back);
      }

      /* ---------- image ---------- */
      if (imgPx && isFinite(hi)) {
        const real = v < 0;
        if (!real) ctx.save();
        arrow(X(v), oy, imgPx.x, imgPx.y, K.img, 2.6, 9);
        if (!real) ctx.restore();
        label('image', X(v), imgPx.y + (hi > 0 ? -14 : 16), K.img, {
          align: 'center',
          size: 10.5,
        });
      } else {
        label('image at infinity', view.w - 14, view.h * 0.18, K.img, {
          align: 'right',
          size: 11,
          weight: 700,
        });
      }

      /* ---------- readouts ---------- */
      const nature = !isFinite(v)
        ? 'At infinity (rays parallel)'
        : (v < 0 ? 'Real' : 'Virtual') +
          ', ' +
          (Math.abs(Math.abs(m) - 1) < 0.02
            ? 'same size'
            : Math.abs(m) > 1
            ? 'enlarged'
            : 'diminished') +
          ', ' +
          (m > 0 ? 'erect' : 'inverted');

      stats([
        ['Object distance u', u.toFixed(1) + ' cm'],
        ['Image distance v', isFinite(v) ? v.toFixed(1) + ' cm' : '∞'],
        ['Focal length f', f.toFixed(1) + ' cm'],
        ['Magnification m', isFinite(m) ? m.toFixed(2) : '—'],
        ['Image nature', nature],
        ['Case', type === 'concave' ? mirrorCase(u, fMag) : 'Convex — object in front'],
      ]);

      note(
        (type === 'concave' ? '<strong>Concave mirror.</strong> ' : '<strong>Convex mirror.</strong> ') +
          (isFinite(v)
            ? 'The image forms ' + Math.abs(v).toFixed(1) + ' cm ' +
              (v < 0 ? 'in front of' : 'behind') + ' the mirror and is ' + nature.toLowerCase() + '.'
            : 'The object is at F, so the reflected rays are parallel and the image is at infinity.') +
          ' Drag the object to explore every case.'
      );
    },
  };

  /* ===================================================================
     7. TOPIC 3 — REFRACTION
     =================================================================== */

  function norm2(x, y) {
    const l = Math.hypot(x, y) || 1;
    return { x: x / l, y: y / l };
  }

  // Refract a direction vector. `N` points towards the incoming medium.
  function refractDir(d, N, eta) {
    const cosi = -(d.x * N.x + d.y * N.y);
    const k = 1 - eta * eta * (1 - cosi * cosi);
    if (k < 0) return null;
    const s = eta * cosi - Math.sqrt(k);
    return norm2(eta * d.x + s * N.x, eta * d.y + s * N.y);
  }

  // Ray p + t·d against segment a→b. Returns t (or null).
  function raySeg(p, d, a, b) {
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const den = d.x * ey - d.y * ex;
    if (Math.abs(den) < 1e-9) return null;
    const wx = a.x - p.x;
    const wy = a.y - p.y;
    const t = (wx * ey - wy * ex) / den;
    let u;
    if (Math.abs(ex) > Math.abs(ey)) u = (t * d.x - wx) / ex;
    else u = (t * d.y - wy) / ey;
    if (t > 1e-4 && u >= -1e-4 && u <= 1 + 1e-4) return t;
    return null;
  }

  const T_REFRACT = {
    id: 'refraction',
    title: 'Refraction',
    accent: '#34d399',
    blurb: "Snell's law at an interface, total internal reflection, a glass slab and a dispersing prism.",
    controls: [
      {
        type: 'seg',
        id: 'mode',
        label: 'Setup',
        options: [
          ['interface', 'Interface'],
          ['slab', 'Glass slab'],
          ['prism', 'Prism'],
        ],
        value: 'interface',
      },
      { type: 'select', id: 'm1', label: 'Medium 1 (top)', options: MEDIA, value: '1' },
      { type: 'select', id: 'm2', label: 'Medium 2 (bottom)', options: MEDIA, value: '1.33' },
      {
        type: 'range',
        id: 'angle',
        label: 'Angle of incidence',
        min: 0,
        max: 88,
        step: 1,
        value: 40,
        unit: '°',
      },
    ],
    formulas: [
      ["Snell's law", 'n₁ sin i = n₂ sin r'],
      ['Refractive index', 'n = c / v = sin i / sin r'],
      ['Critical angle', 'sin θc = n₂ / n₁  (only when n₁ > n₂)'],
      ['Lateral shift (slab)', 'd = t · sin(i − r) / cos r'],
      ['Prism deviation', 'δ = i₁ + i₂ − A'],
    ],
    learn: [
      'Light bends towards the normal when it enters a denser medium (n₂ > n₁) and away from it when it enters a rarer one.',
      'When light goes from denser to rarer at more than the critical angle, none of it refracts — total internal reflection. This is how optical fibres work.',
      'A glass slab bends the ray twice, in opposite directions, so the emergent ray is parallel to the incident ray but shifted sideways.',
      'A prism bends different colours by different amounts because the refractive index depends slightly on wavelength — that is dispersion.',
    ],
    store: {},

    reset() {},

    onResize() {},

    draw(dt, time) {
      const mode = ui.val('mode');
      if (mode === 'interface') this.drawInterface();
      else if (mode === 'slab') this.drawSlab();
      else this.drawPrism(time);
    },

    /* ---------- 7a. Plain interface ---------- */
    drawInterface() {
      const n1 = Number(ui.val('m1'));
      const n2 = Number(ui.val('m2'));
      const iDeg = ui.val('angle');
      const i = R(iDeg);

      const O = { x: view.w * 0.5, y: view.h * 0.5 };
      const sinr = (n1 * Math.sin(i)) / n2;
      const tir = sinr > 1;
      const r = tir ? null : Math.asin(sinr);
      const rDeg = r === null ? null : DEG(r);
      const critical = n1 > n2 ? DEG(Math.asin(clamp(n2 / n1, 0, 1))) : null;

      /* medium shading */
      const g1 = ctx.createLinearGradient(0, 0, 0, O.y);
      g1.addColorStop(0, 'rgba(148,163,184,0.02)');
      g1.addColorStop(1, 'rgba(148,163,184,0.09)');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, view.w, O.y);

      const g2 = ctx.createLinearGradient(0, O.y, 0, view.h);
      g2.addColorStop(0, 'rgba(56,189,248,' + (0.05 + (n2 - 1) * 0.10).toFixed(2) + ')');
      g2.addColorStop(1, 'rgba(56,189,248,0.02)');
      ctx.fillStyle = g2;
      ctx.fillRect(0, O.y, view.w, view.h - O.y);

      /* the interface */
      line(0, O.y, view.w, O.y, K.glass, 2.5);
      label('Medium 1 — n₁ = ' + n1.toFixed(2), 12, O.y - 14, T.muted, { size: 11 });
      label('Medium 2 — n₂ = ' + n2.toFixed(2), 12, O.y + 16, T.muted, { size: 11 });

      /* normal */
      guide(O.x, O.y - view.h * 0.34, O.x, O.y + view.h * 0.34, K.normal, 1.4);
      label('normal', O.x + 6, O.y - view.h * 0.34 + 8, K.normal, { size: 10.5 });

      /* incident ray */
      const L = Math.min(view.w, view.h) * 0.36;
      const dIn = { x: Math.sin(i), y: Math.cos(i) };
      const src = { x: O.x - dIn.x * L, y: O.y - dIn.y * L };
      line(src.x, src.y, O.x, O.y, K.inci, 2.4);
      midArrow(src.x, src.y, O.x, O.y, K.inci, 0.55, 9);

      /* refracted or totally reflected ray */
      if (tir) {
        const back = { x: Math.sin(i), y: -Math.cos(i) };
        const end = { x: O.x + back.x * L, y: O.y + back.y * L };
        line(O.x, O.y, end.x, end.y, K.refl, 2.4);
        midArrow(O.x, O.y, end.x, end.y, K.refl, 0.55, 9);

        // show what would have been the refracted path, faintly
        guide(O.x, O.y, O.x + Math.sin(i) * L * 0.6, O.y + Math.cos(i) * L * 0.6, T.muted, 1);

        angleArc(O.x, O.y, 62, Math.atan2(-1, 0), Math.atan2(src.y - O.y, src.x - O.x), K.inci, 'i');
        angleArc(O.x, O.y, 62, Math.atan2(-1, 0), Math.atan2(back.y, back.x), K.refl, 'r');

        label('TOTAL INTERNAL REFLECTION', view.w - 14, O.y + view.h * 0.30, K.hot, {
          align: 'right',
          size: 12.5,
          weight: 700,
          bg: T.bg,
        });
      } else {
        const dOut = { x: Math.sin(r), y: Math.cos(r) };
        const end = { x: O.x + dOut.x * L, y: O.y + dOut.y * L };
        line(O.x, O.y, end.x, end.y, K.refr, 2.4);
        midArrow(O.x, O.y, end.x, end.y, K.refr, 0.5, 9);

        // dashed continuation of the incident direction (to show the bend)
        guide(O.x, O.y, O.x + dIn.x * L * 0.85, O.y + dIn.y * L * 0.85, T.muted, 1);

        angleArc(O.x, O.y, 66, Math.atan2(-1, 0), Math.atan2(src.y - O.y, src.x - O.x), K.inci, 'i');
        angleArc(O.x, O.y, 66, Math.atan2(1, 0), Math.atan2(dOut.y, dOut.x), K.refr, 'r');
      }

      /* critical angle marker on the incident side */
      if (critical !== null) {
        const ca = R(critical);
        const from = { x: O.x - Math.sin(ca) * L, y: O.y - Math.cos(ca) * L };
        line(O.x, O.y, from.x, from.y, 'rgba(239,68,68,0.55)', 1.4, [3, 4]);
        label('θc = ' + critical.toFixed(1) + '°', from.x - 4, from.y - 8, K.hot, {
          align: 'right',
          size: 10.5,
          weight: 700,
        });
      }

      dot(O.x, O.y, 4, T.ink, false);

      stats([
        ['Angle of incidence i', iDeg + '°'],
        ['Angle of refraction r', tir ? '—' : rDeg.toFixed(1) + '°'],
        ['n₁ → n₂', n1.toFixed(2) + ' → ' + n2.toFixed(2)],
        ['Critical angle θc', critical === null ? 'not possible' : critical.toFixed(1) + '°'],
      ]);

      if (tir) {
        note(
          '<strong>Total internal reflection.</strong> The ray is going from a denser medium (n₁ = ' +
            n1.toFixed(2) + ') to a rarer one (n₂ = ' + n2.toFixed(2) + ') at ' + iDeg +
            '°, which is more than the critical angle θc = ' + critical.toFixed(1) +
            '°. No light crosses the boundary.'
        );
      } else {
        note(
          'Light bends <strong>' + (n2 > n1 ? 'towards' : n2 < n1 ? 'away from' : 'neither way, it') +
            '</strong> the normal: i = ' + iDeg + '°, r = ' + rDeg.toFixed(1) +
            '°. Check: ' + n1.toFixed(2) + ' × sin ' + iDeg + '° = ' + n2.toFixed(2) +
            ' × sin ' + rDeg.toFixed(1) + '°.'
        );
      }
    },

    /* ---------- 7b. Glass slab (lateral displacement) ---------- */
    drawSlab() {
      const iDeg = ui.val('angle');
      const i = R(iDeg);
      const n = 1.5;
      const r = Math.asin(clamp(Math.sin(i) / n, 0, 1));

      const thickness = 5; // cm
      const pxPerCm = Math.min(view.h * 0.075, (view.w * 0.7) / 12);
      const tPx = thickness * pxPerCm;

      const y1 = view.h * 0.30;
      const y2 = Math.min(y1 + tPx, view.h * 0.80);
      const slabX1 = view.w * 0.16;
      const slabX2 = view.w * 0.88;

      /* slab */
      ctx.save();
      ctx.fillStyle = 'rgba(147,197,253,0.16)';
      ctx.strokeStyle = K.glass;
      ctx.lineWidth = 2;
      rr(slabX1, y1, slabX2 - slabX1, y2 - y1, 6);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      label('glass slab (n = 1.50, thickness 5 cm)', (slabX1 + slabX2) / 2, y1 - 12, T.muted, {
        align: 'center',
        size: 10.5,
      });

      /* entry point */
      const O1 = { x: view.w * 0.40, y: y1 };
      const L = view.h * 0.30;

      // incident ray from upper-left
      const dIn = { x: Math.sin(i), y: Math.cos(i) };
      const src = { x: O1.x - dIn.x * L, y: O1.y - dIn.y * L };
      line(src.x, src.y, O1.x, O1.y, K.inci, 2.4);
      midArrow(src.x, src.y, O1.x, O1.y, K.inci, 0.55, 9);

      // inside the slab
      const dInGlass = { x: Math.sin(r), y: Math.cos(r) };
      const dy = y2 - O1.y;
      const O2 = { x: O1.x + dInGlass.x * (dy / Math.cos(r)), y: y2 };
      line(O1.x, O1.y, O2.x, O2.y, K.refr, 2.2);
      midArrow(O1.x, O1.y, O2.x, O2.y, K.refr, 0.5, 8);

      // emergent ray (parallel to the original)
      const end2 = { x: O2.x + dIn.x * L * 0.9, y: O2.y + dIn.y * L * 0.9 };
      line(O2.x, O2.y, end2.x, end2.y, K.inci, 2.4);
      midArrow(O2.x, O2.y, end2.x, end2.y, K.inci, 0.5, 9);

      // original direction, dashed, for comparison
      guide(O1.x, O1.y, O1.x + dIn.x * (y2 - O1.y + 60) / Math.cos(i),
        O1.y + (y2 - O1.y + 60), T.muted, 1.1);

      /* lateral displacement arrow */
      const shiftCm = (thickness * Math.sin(i - r)) / Math.cos(r);
      const shiftPx = shiftCm * pxPerCm;
      const bx = O2.x;
      const by = y2 + 34;
      line(bx, by, bx + shiftPx, by, K.img, 1.6);
      line(bx, by - 7, bx, by + 7, K.img, 1.6);
      line(bx + shiftPx, by - 7, bx + shiftPx, by + 7, K.img, 1.6);
      label('lateral shift d = ' + shiftCm.toFixed(2) + ' cm', bx + shiftPx / 2, by + 14, K.img, {
        align: 'center',
        size: 10.5,
        weight: 600,
      });

      // normals
      guide(O1.x, O1.y - 40, O1.x, O1.y + 40, K.normal, 1);
      guide(O2.x, O2.y - 40, O2.x, O2.y + 40, K.normal, 1);

      dot(O1.x, O1.y, 3.5, T.ink, false);
      dot(O2.x, O2.y, 3.5, T.ink, false);

      stats([
        ['Angle of incidence i', iDeg + '°'],
        ['Angle of refraction r', DEG(r).toFixed(1) + '°'],
        ['Refractive index', '1.50'],
        ['Lateral shift d', shiftCm.toFixed(2) + ' cm'],
      ]);

      note(
        'Inside the slab the ray bends towards the normal (r = ' + DEG(r).toFixed(1) +
          '°). On the way out it bends back by the same amount, so the emergent ray is ' +
          '<strong>parallel</strong> to the incident ray, shifted sideways by d = t·sin(i − r)/cos r = ' +
          shiftCm.toFixed(2) + ' cm.'
      );
    },

    /* ---------- 7c. Prism (dispersion) ---------- */
    drawPrism(time) {
      const cx = view.w * 0.54;
      const top = view.h * 0.16;
      const w = Math.min(view.w * 0.52, view.h * 0.95);
      const h = w * 0.866; // equilateral
      const apex = { x: cx, y: top };
      const BL = { x: cx - w / 2, y: top + h };
      const BR = { x: cx + w / 2, y: top + h };
      const centroid = { x: (apex.x + BL.x + BR.x) / 3, y: (apex.y + BL.y + BR.y) / 3 };

      /* prism body */
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(apex.x, apex.y);
      ctx.lineTo(BL.x, BL.y);
      ctx.lineTo(BR.x, BR.y);
      ctx.closePath();
      const pg = ctx.createLinearGradient(BL.x, apex.y, BR.x, BR.y);
      pg.addColorStop(0, 'rgba(147,197,253,0.20)');
      pg.addColorStop(1, 'rgba(167,139,250,0.12)');
      ctx.fillStyle = pg;
      ctx.fill();
      ctx.strokeStyle = K.glass;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      label('glass prism (A = 60°)', apex.x, apex.y - 14, T.muted, { align: 'center', size: 10.5 });

      /* incoming ray */
      const entry = { x: (apex.x + BL.x) / 2, y: (apex.y + BL.y) / 2 };
      const dIn = norm2(Math.cos(R(6)), Math.sin(R(6))); // slightly downwards, left to right
      const start = { x: entry.x - dIn.x * view.w * 0.42, y: entry.y - dIn.y * view.w * 0.42 };

      line(start.x, start.y, entry.x, entry.y, K.white, 3);
      midArrow(start.x, start.y, entry.x, entry.y, '#ffffff', 0.55, 9);
      label('white light', start.x + 4, start.y - 10, T.muted, { size: 10.5 });

      /* outward normal of the entry face (points into the air) */
      const faceN = norm2(apex.y - BL.y, BL.x - apex.x); // perpendicular to apex→BL
      const outN = (faceN.x * (entry.x - centroid.x) + faceN.y * (entry.y - centroid.y)) > 0
        ? faceN
        : { x: -faceN.x, y: -faceN.y };

      // trace each colour
      const outPoints = [];
      VIBGYOR.forEach((col) => {
        const d2 = refractDir(dIn, outN, 1 / col.n);
        if (!d2) return;

        // find the exit face
        const faces = [
          [apex, BR],
          [BR, BL],
        ];
        let best = null;
        faces.forEach((f) => {
          const t = raySeg(entry, d2, f[0], f[1]);
          if (t !== null && (!best || t < best.t)) best = { t, f };
        });
        if (!best) return;

        const exit = { x: entry.x + d2.x * best.t, y: entry.y + d2.y * best.t };

        // outward normal of the exit face
        const a = best.f[0];
        const b = best.f[1];
        const fn = norm2(b.y - a.y, a.x - b.x);
        const exN = (fn.x * (exit.x - centroid.x) + fn.y * (exit.y - centroid.y)) > 0
          ? fn
          : { x: -fn.x, y: -fn.y };

        // refract out: normal must point towards the glass (incoming medium)
        const Nout = { x: -exN.x, y: -exN.y };
        const d3 = refractDir(d2, Nout, col.n);
        if (!d3) return;

        // draw inside the prism
        line(entry.x, entry.y, exit.x, exit.y, col.c, 1.8);

        // draw the emerging ray to the canvas edge
        const reach = Math.max(view.w, view.h);
        const fin = { x: exit.x + d3.x * reach, y: exit.y + d3.y * reach };
        line(exit.x, exit.y, fin.x, fin.y, col.c, 2.2);
        outPoints.push({ exit, d3, col });
      });

      /* colour labels at the exit */
      if (outPoints.length) {
        const last = outPoints[outPoints.length - 1];
        const first = outPoints[0];
        label('V', first.exit.x + first.d3.x * 55, first.exit.y + first.d3.y * 55, first.col.c, {
          size: 11,
          weight: 700,
        });
        label('R', last.exit.x + last.d3.x * 55, last.exit.y + last.d3.y * 55, last.col.c, {
          size: 11,
          weight: 700,
        });
      }

      stats([
        ['Incident ray', 'white light'],
        ['n for violet', '1.532'],
        ['n for red', '1.514'],
        ['Dispersion', 'violet bends most'],
      ]);

      note(
        'Because n is slightly larger for violet (' + '1.532' + ') than for red (' + '1.514' +
          '), each colour leaves the prism at a slightly different angle. That is ' +
          '<strong>dispersion</strong> — white light fans out into VIBGYOR.'
      );
    },
  };
