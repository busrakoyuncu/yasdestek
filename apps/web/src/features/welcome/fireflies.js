/**
 * Interactive firefly background — zero dependencies, one ES module.
 *
 *   import { createFireflies } from "./fireflies.js";
 *   const fireflies = createFireflies(document.querySelector("canvas"), { mode: "attract" });
 *   // later: fireflies.destroy();
 *
 * The canvas should sit on top of the background image with
 * `pointer-events: none`; pointer input is read from `window`, so the page
 * content above/below stays fully clickable.
 */

/**
 * @typedef {Object} FireflyOptions
 * @property {number}   [density]       Fireflies per 10,000 CSS px² of canvas (default 1.5).
 * @property {number}   [min]           Minimum count (default 35).
 * @property {number}   [max]           Maximum count (default 260).
 * @property {[number, number]} [band]  Vertical band they hover in, as fractions of height (default [0.58, 0.96]).
 * @property {string[]} [colors]        Glow colors (default warm yellows).
 * @property {"attract" | "repel"} [mode] How fireflies react to the pointer (default "attract").
 * @property {number}   [radius]        Pointer influence radius in CSS px (default 230).
 * @property {number}   [strength]      Pointer force multiplier (default 1).
 * @property {number}   [speed]         Global speed multiplier (default 1).
 * @property {boolean}  [cursorGlow]    Soft warm light around the pointer (default true).
 * @property {boolean}  [clickBurst]    Click/tap scatters nearby fireflies (default true).
 * @property {Window | HTMLElement} [eventTarget] Where pointer events are read (default window).
 */

/** @type {Required<Omit<FireflyOptions, "eventTarget">>} */
const DEFAULTS = {
  density: 1.5,
  min: 35,
  max: 260,
  band: [0.58, 0.96],
  colors: ["#FFE27A", "#FFD24D", "#FFC94A", "#FFF1A8"],
  mode: "attract",
  radius: 230,
  strength: 1,
  speed: 1,
  cursorGlow: true,
  clickBurst: true,
};

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);

/** Pre-render one soft glow sprite per color (much cheaper than per-frame gradients). */
function makeSprite(color) {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,240,1)");
  grad.addColorStop(0.08, color);
  grad.addColorStop(0.25, hexToRgba(color, 0.45));
  grad.addColorStop(0.55, hexToRgba(color, 0.12));
  grad.addColorStop(1, hexToRgba(color, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {FireflyOptions} [options]
 */
export function createFireflies(canvas, options = {}) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("fireflies: 2D canvas not supported");

  const { eventTarget = window, ...rest } = options;
  const opts = { ...DEFAULTS, ...rest };
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");

  let sprites = opts.colors.map(makeSprite);
  let width = 0;
  let height = 0;
  let dpr = 1;
  let flies = [];
  let raf = 0;
  let last = 0;
  let time = 0;
  let running = true;

  const pointer = { x: 0, y: 0, active: false, energy: 0, lastMove: 0 };

  function spawn(anywhere) {
    const [top, bottom] = opts.band;
    const z = rand(0.35, 1); // depth: 1 = near (bigger, brighter, faster)
    const homeY = rand(top, bottom);
    return {
      x: rand(0, width),
      y: anywhere ? homeY * height : rand(top, bottom) * height,
      vx: rand(-10, 10),
      vy: rand(-6, 6),
      z,
      homeY,
      heading: rand(0, TAU),
      period: rand(1.8, 5.5), // blink period, seconds
      phase: rand(0, TAU),
      sprite: Math.floor(rand(0, sprites.length)),
      excite: 0, // extra brightness from pointer / bursts
    };
  }

  function targetCount() {
    const n = Math.round(((width * height) / 10000) * opts.density);
    return Math.max(opts.min, Math.min(opts.max, n));
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const want = targetCount();
    while (flies.length < want) flies.push(spawn(true));
    if (flies.length > want) flies.length = want;
    for (const f of flies) {
      if (f.x > width) f.x = rand(0, width);
    }
  }

  // ---- pointer input --------------------------------------------------------

  function toLocal(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, inside:
      e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom };
  }

  function onMove(e) {
    const p = toLocal(e);
    const dx = p.x - pointer.x;
    const dy = p.y - pointer.y;
    if (pointer.active) {
      // fast movement "excites" the swarm a little
      pointer.energy = Math.min(1, pointer.energy + Math.hypot(dx, dy) / 400);
    }
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.active = p.inside;
    pointer.lastMove = time;
  }

  function onLeave() {
    pointer.active = false;
  }

  function onDown(e) {
    const p = toLocal(e);
    if (!p.inside) return;
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.active = true;
    pointer.lastMove = time;
    if (!opts.clickBurst) return;
    const r = opts.radius * 1.4;
    for (const f of flies) {
      const dx = f.x - p.x;
      const dy = f.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < r) {
        const k = (1 - d / r) * 420 * f.z;
        f.vx += (dx / d) * k;
        f.vy += (dy / d) * k;
        f.excite = 1;
      }
    }
  }

  function onUp(e) {
    // touch has no hover: let the swarm drift off shortly after the finger lifts
    if (e.pointerType !== "mouse") pointer.active = false;
  }

  eventTarget.addEventListener("pointermove", onMove, { passive: true });
  eventTarget.addEventListener("pointerdown", onDown, { passive: true });
  eventTarget.addEventListener("pointerup", onUp, { passive: true });
  eventTarget.addEventListener("pointercancel", onLeave, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);
  window.addEventListener("blur", onLeave);

  // ---- simulation -----------------------------------------------------------

  function step(dt) {
    const speed = opts.speed * (reducedMotion?.matches ? 0.3 : 1);
    const R = opts.radius;
    const drag = Math.pow(0.25, dt); // keeps 25% of velocity per second, frame-rate independent
    // idle pointer slowly loses its pull so fireflies wander off again
    const idle = time - pointer.lastMove;
    const pull = pointer.active ? (idle < 2.5 ? 1 : Math.max(0, 1 - (idle - 2.5) / 3)) : 0;
    pointer.energy *= Math.pow(0.2, dt);

    for (const f of flies) {
      // 1) wander: a slowly turning heading gives organic, meandering paths
      f.heading += rand(-1, 1) * 2.2 * dt;
      let ax = Math.cos(f.heading) * 14 * f.z;
      let ay = Math.sin(f.heading) * 8 * f.z;

      // 2) pointer interaction
      let captured = 0; // 0..1, how strongly the pointer holds this firefly
      if (pull > 0) {
        const dx = pointer.x - f.x;
        const dy = pointer.y - f.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < R) {
          captured = (1 - d / R) ** 1.2 * pull;
          const force = captured * opts.strength * (0.5 + 0.5 * f.z);
          const nx = dx / d;
          const ny = dy / d;
          if (opts.mode === "attract") {
            // pull in, swirl around, but keep a small personal-space halo
            const halo = d < 40 ? -(40 - d) * 14 : 0;
            ax += nx * (620 * force + halo);
            ay += ny * (620 * force + halo);
            ax += -ny * 320 * force; // tangential swirl
            ay += nx * 320 * force;
          } else {
            ax -= nx * 900 * force;
            ay -= ny * 900 * force;
          }
          f.excite = Math.max(f.excite, force * (0.6 + pointer.energy * 0.6));
        }
      }

      // 3) drift back to their home height in the band (soft spring),
      //    loosened while the pointer holds them so they can follow it upward
      ay += (f.homeY * height - f.y) * 0.35 * (1 - Math.min(1, captured * 1.5));

      f.vx = (f.vx + ax * dt) * drag;
      f.vy = (f.vy + ay * dt) * drag;
      const max = 140 * f.z + 40;
      const v = Math.hypot(f.vx, f.vy);
      if (v > max) {
        f.vx *= max / v;
        f.vy *= max / v;
      }
      f.x += f.vx * dt * speed;
      f.y += f.vy * dt * speed;
      f.excite *= Math.pow(0.35, dt);

      // wrap horizontally, keep vertically on screen
      if (f.x < -20) f.x += width + 40;
      else if (f.x > width + 20) f.x -= width + 40;
      if (f.y < 0) { f.y = 0; f.vy = Math.abs(f.vy); }
      else if (f.y > height) { f.y = height; f.vy = -Math.abs(f.vy); }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";

    if (opts.cursorGlow && pointer.active) {
      const r = opts.radius * 1.1;
      const g = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, r);
      g.addColorStop(0, `rgba(255,214,120,${0.10 + pointer.energy * 0.06})`);
      g.addColorStop(1, "rgba(255,214,120,0)");
      ctx.fillStyle = g;
      ctx.fillRect(pointer.x - r, pointer.y - r, r * 2, r * 2);
    }

    for (const f of flies) {
      // blink: sharpened sine so they glow, fade, and briefly go dark
      const s = 0.5 + 0.5 * Math.sin((time * TAU) / f.period + f.phase);
      const blink = s * s * s;
      const alpha = Math.min(1, (0.08 + 0.92 * blink) * (0.45 + 0.55 * f.z) + f.excite * 0.8);
      if (alpha < 0.02) continue;
      const size = (14 + 26 * f.z) * (1 + f.excite * 0.35);
      ctx.globalAlpha = alpha;
      ctx.drawImage(sprites[f.sprite], f.x - size / 2, f.y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016); // clamp after tab switches
    last = now;
    time += dt;
    step(dt);
    draw();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  raf = requestAnimationFrame(frame);

  return {
    /** Update options live, e.g. setOptions({ mode: "repel", radius: 240 }). */
    setOptions(next) {
      Object.assign(opts, next);
      if (next.colors) {
        sprites = opts.colors.map(makeSprite);
        for (const f of flies) f.sprite = Math.floor(rand(0, sprites.length));
      }
      if (next.band) for (const f of flies) f.homeY = rand(opts.band[0], opts.band[1]);
      resize();
    },
    pause() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
    },
    resume() {
      if (running) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    },
    /** Remove listeners and stop the loop (call on unmount). */
    destroy() {
      cancelAnimationFrame(raf);
      running = false;
      ro.disconnect();
      eventTarget.removeEventListener("pointermove", onMove);
      eventTarget.removeEventListener("pointerdown", onDown);
      eventTarget.removeEventListener("pointerup", onUp);
      eventTarget.removeEventListener("pointercancel", onLeave);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      ctx.clearRect(0, 0, width, height);
    },
  };
}
