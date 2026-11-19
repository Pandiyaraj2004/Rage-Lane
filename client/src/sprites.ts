// Procedural game sprites. Everything is drawn once at startup on 2D canvases
// (at 2x resolution, displayed at 0.5 scale) and uploaded as textures, so the
// game has no image downloads and per-frame cost is just sprite batching.
import Phaser from 'phaser';
import {drawCar, shade} from './car-art';
export {shade};

type Ctx = CanvasRenderingContext2D;

export const ITEM_COLORS = {treasure: 0xffc94d, health: 0x4dffa6, ammo: 0xb58cff, repair: 0x52b8ff, car: 0x7f93ad} as const;

function canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const el = document.createElement('canvas');
  el.width = w;
  el.height = h;
  return [el, el.getContext('2d')!];
}

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function add(scene: Phaser.Scene, key: string, el: HTMLCanvasElement) {
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, el);
  return key;
}

// ---------------------------------------------------------------- vehicles

/** A detailed top-down sports car facing +x, coloured per player. */
export function carTexture(scene: Phaser.Scene, color: number) {
  const key = 'car-' + color.toString(16);
  if (scene.textures.exists(key)) return key;
  const [el, ctx] = canvas(116, 64);
  ctx.translate(58, 32);
  drawCar(ctx, color);
  return add(scene, key, el);
}

/** A runner seen from above, holding a sidearm, facing +x. */
export function runnerTexture(scene: Phaser.Scene, color: number) {
  const key = 'runner-' + color.toString(16);
  if (scene.textures.exists(key)) return key;
  const [el, ctx] = canvas(64, 48);
  ctx.translate(26, 24);
  // Gun.
  ctx.fillStyle = '#20262e';
  rr(ctx, 8, 3, 24, 5, 2);
  ctx.fill();
  ctx.fillStyle = '#5e6b78';
  ctx.fillRect(26, 4, 6, 2);
  // Shoulders / jacket.
  const jacket = ctx.createRadialGradient(-2, -4, 2, 0, 0, 20);
  jacket.addColorStop(0, shade(color, 0.35));
  jacket.addColorStop(1, shade(color, -0.4));
  ctx.fillStyle = jacket;
  ctx.beginPath();
  ctx.ellipse(0, 0, 11, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  // Arms reaching forward.
  ctx.fillStyle = shade(color, -0.15);
  rr(ctx, 2, -14, 12, 6, 3);
  ctx.fill();
  rr(ctx, 2, 3, 14, 6, 3);
  ctx.fill();
  // Head with hair.
  const head = ctx.createRadialGradient(2, -2, 1, 2, 0, 9);
  head.addColorStop(0, '#3a2a22');
  head.addColorStop(1, '#120c0a');
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.arc(2, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, 0, 11, 18, 0, 0, Math.PI * 2);
  ctx.stroke();
  return add(scene, key, el);
}

// ---------------------------------------------------------------- pickups

function badge(ctx: Ctx, color: number, shape: 'round' | 'hex') {
  ctx.save();
  ctx.shadowColor = shade(color, 0.1, 0.9);
  ctx.shadowBlur = 10;
  const g = ctx.createLinearGradient(0, -26, 0, 26);
  g.addColorStop(0, shade(color, 0.25));
  g.addColorStop(0.55, shade(color, -0.25));
  g.addColorStop(1, shade(color, -0.6));
  ctx.fillStyle = g;
  ctx.beginPath();
  if (shape === 'round') ctx.roundRect(-24, -24, 48, 48, 13);
  else for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * 27, Math.sin(a) * 27);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.clip();
  // Glass gloss on the upper half.
  const gloss = ctx.createLinearGradient(0, -26, 0, 4);
  gloss.addColorStop(0, 'rgba(255,255,255,.45)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gloss;
  ctx.fillRect(-30, -30, 60, 30);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.7)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function gem(ctx: Ctx) {
  const pts = {table: [[-11, -14], [11, -14]], girdleL: [-24, -4], girdleR: [24, -4], tip: [0, 24]};
  const facet = (poly: number[][], fill: string) => {
    ctx.beginPath();
    poly.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x, y));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  ctx.save();
  ctx.shadowColor = '#ffcf4d';
  ctx.shadowBlur = 16;
  facet([[-11, -14], [11, -14], [24, -4], [0, 24], [-24, -4]], '#f2a516');
  ctx.restore();
  facet([[-11, -14], [11, -14], [6, -4], [-6, -4]], '#fff6c9');
  facet([[-11, -14], [-6, -4], [-24, -4]], '#ffe07a');
  facet([[11, -14], [24, -4], [6, -4]], '#ffd04d');
  facet([[-24, -4], [-6, -4], [0, 24]], '#f7b32b');
  facet([[-6, -4], [6, -4], [0, 24]], '#ffdc6e');
  facet([[6, -4], [24, -4], [0, 24]], '#d98a0b');
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  [pts.table[0], pts.table[1], pts.girdleR, pts.tip, pts.girdleL, pts.table[0]].forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x, y));
  ctx.stroke();
  // Sparkle.
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(-8, -10);
  ctx.lineTo(-6, -7);
  ctx.lineTo(-3, -6);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-8, -2);
  ctx.lineTo(-10, -5);
  ctx.lineTo(-13, -6);
  ctx.lineTo(-10, -7);
  ctx.fill();
}

function pickupTextures(scene: Phaser.Scene) {
  const make = (key: string, draw: (ctx: Ctx) => void) => {
    const [el, ctx] = canvas(72, 72);
    ctx.translate(36, 36);
    draw(ctx);
    add(scene, key, el);
  };
  make('item-treasure', gem);
  make('item-health', ctx => {
    badge(ctx, ITEM_COLORS.health, 'round');
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,60,30,.6)';
    ctx.shadowBlur = 4;
    rr(ctx, -5, -15, 10, 30, 2);
    ctx.fill();
    rr(ctx, -15, -5, 30, 10, 2);
    ctx.fill();
  });
  make('item-ammo', ctx => {
    badge(ctx, ITEM_COLORS.ammo, 'round');
    for (const x of [-11, 0, 11]) {
      const brass = ctx.createLinearGradient(x - 4, 0, x + 4, 0);
      brass.addColorStop(0, '#9a6a1c');
      brass.addColorStop(0.5, '#ffe29a');
      brass.addColorStop(1, '#8a5a12');
      ctx.fillStyle = brass;
      rr(ctx, x - 4, -4, 8, 18, 1.5);
      ctx.fill();
      ctx.fillStyle = '#d98b5f';
      ctx.beginPath();
      ctx.moveTo(x - 4, -4);
      ctx.quadraticCurveTo(x, -18, x + 4, -4);
      ctx.fill();
    }
  });
  make('item-repair', ctx => {
    badge(ctx, ITEM_COLORS.repair, 'hex');
    ctx.save();
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = '#fff';
    rr(ctx, -3.5, -2, 7, 22, 3);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -8, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    rr(ctx, -3.5, -20, 7, 12, 1);
    ctx.fill();
    ctx.restore();
  });
}

// ---------------------------------------------------------------- weapons & fx

function fxTextures(scene: Phaser.Scene) {
  // Soft radial light used for glows, light pools and particles.
  {
    const [el, ctx] = canvas(128, 128);
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,.55)');
    g.addColorStop(0.6, 'rgba(255,255,255,.14)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    add(scene, 'glow', el);
  }
  {
    const [el, ctx] = canvas(24, 24);
    const g = ctx.createRadialGradient(12, 12, 0, 12, 12, 12);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.35, 'rgba(255,255,255,.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 24, 24);
    add(scene, 'spark', el);
  }
  {
    // Smoke puff: overlapping soft blobs.
    const [el, ctx] = canvas(64, 64);
    for (const [x, y, r] of [[32, 32, 26], [22, 26, 16], [42, 28, 15], [30, 42, 16], [40, 40, 13]]) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    add(scene, 'smoke', el);
  }
  {
    // Star-burst flare for muzzle flashes and explosion cores.
    const [el, ctx] = canvas(128, 128);
    ctx.translate(64, 64);
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 40);
    core.addColorStop(0, 'rgba(255,255,255,1)');
    core.addColorStop(0.4, 'rgba(255,255,255,.5)');
    core.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = core;
    ctx.fillRect(-64, -64, 128, 128);
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    for (let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.lineTo(i % 2 ? 40 : 62, 0);
      ctx.lineTo(0, 3);
      ctx.fill();
    }
    add(scene, 'flare', el);
  }
  {
    const [el, ctx] = canvas(128, 128);
    ctx.strokeStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(64, 64, 52, 0, Math.PI * 2);
    ctx.stroke();
    add(scene, 'ring', el);
  }
  {
    // Soft elliptical drop shadow (no canvas filters, so it works in every browser).
    const [el, ctx] = canvas(128, 72);
    ctx.translate(64, 36);
    ctx.scale(1, 0.55);
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 62);
    g.addColorStop(0, 'rgba(0,0,0,.75)');
    g.addColorStop(0.6, 'rgba(0,0,0,.35)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 62, 0, Math.PI * 2);
    ctx.fill();
    add(scene, 'shadow', el);
  }
  {
    // Headlight cone, origin at the left-middle edge.
    const [el, ctx] = canvas(256, 128);
    const g = ctx.createLinearGradient(0, 0, 256, 0);
    g.addColorStop(0, 'rgba(255,255,255,.9)');
    g.addColorStop(0.35, 'rgba(255,255,255,.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 56);
    ctx.lineTo(256, 0);
    ctx.lineTo(256, 128);
    ctx.lineTo(0, 72);
    ctx.closePath();
    ctx.fill();
    // Feather the cone edges.
    ctx.globalCompositeOperation = 'destination-in';
    const v = ctx.createLinearGradient(0, 0, 0, 128);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(0.3, 'rgba(0,0,0,1)');
    v.addColorStop(0.7, 'rgba(0,0,0,1)');
    v.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, 256, 128);
    add(scene, 'beam', el);
  }
  {
    // Tracer round.
    const [el, ctx] = canvas(48, 12);
    const g = ctx.createLinearGradient(0, 0, 48, 0);
    g.addColorStop(0, 'rgba(255,190,80,0)');
    g.addColorStop(0.6, 'rgba(255,214,120,.8)');
    g.addColorStop(1, 'rgba(255,255,240,1)');
    ctx.fillStyle = g;
    rr(ctx, 0, 3, 48, 6, 3);
    ctx.fill();
    ctx.fillStyle = '#fff';
    rr(ctx, 36, 4, 12, 4, 2);
    ctx.fill();
    add(scene, 'bullet', el);
  }
  {
    // Rocket with fins, facing +x.
    const [el, ctx] = canvas(56, 24);
    ctx.translate(28, 12);
    ctx.fillStyle = '#3a4350';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(-24, 10 * s);
      ctx.lineTo(-12, 3 * s);
      ctx.fill();
    }
    const body = ctx.createLinearGradient(0, -5, 0, 5);
    body.addColorStop(0, '#f2f5f8');
    body.addColorStop(0.5, '#aeb8c4');
    body.addColorStop(1, '#5c6672');
    ctx.fillStyle = body;
    rr(ctx, -20, -4.5, 34, 9, 4);
    ctx.fill();
    ctx.fillStyle = '#ff4b4b';
    ctx.beginPath();
    ctx.moveTo(12, -4.5);
    ctx.quadraticCurveTo(26, 0, 12, 4.5);
    ctx.fill();
    ctx.fillStyle = '#ffcf5a';
    ctx.fillRect(-4, -4.5, 3, 9);
    add(scene, 'rocket', el);
  }
  {
    // Oil slick with an iridescent sheen.
    const [el, ctx] = canvas(120, 80);
    ctx.translate(60, 40);
    ctx.scale(1, 0.62);
    const base = ctx.createRadialGradient(0, 0, 4, 0, 0, 58);
    base.addColorStop(0, 'rgba(6,8,14,.95)');
    base.addColorStop(0.75, 'rgba(10,14,24,.85)');
    base.addColorStop(1, 'rgba(10,14,24,0)');
    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.arc(0, 0, 58, 0, Math.PI * 2);
    ctx.fill();
    for (const [x, y, r, c] of [[-14, -10, 26, '120,90,255'], [12, 6, 24, '40,220,255'], [4, -16, 18, '255,80,200'], [-8, 14, 20, '120,255,170']] as const) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${c},.32)`);
      g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-6, -8, 26, Math.PI * 1.1, Math.PI * 1.6);
    ctx.stroke();
    add(scene, 'oil', el);
  }
  {
    // Chevron ring that marks the local player.
    const [el, ctx] = canvas(96, 96);
    ctx.translate(48, 48);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(47, 0);
    ctx.lineTo(36, -7);
    ctx.lineTo(36, 7);
    ctx.fill();
    add(scene, 'marker', el);
  }
  {
    // Aim reticle.
    const [el, ctx] = canvas(40, 40);
    ctx.translate(20, 20);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    for (const [x1, y1, x2, y2] of [[0, -18, 0, -12], [0, 12, 0, 18], [-18, 0, -12, 0], [12, 0, 18, 0]]) {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();
    add(scene, 'reticle', el);
  }
}

export function makeTextures(scene: Phaser.Scene) {
  pickupTextures(scene);
  fxTextures(scene);
  carTexture(scene, ITEM_COLORS.car);
}
