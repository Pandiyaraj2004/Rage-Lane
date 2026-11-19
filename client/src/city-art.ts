// Procedural night-city art. Each 800px tile is painted once on a 2D canvas
// (gradients, soft shadows, neon glow) and cached as a texture, so the city
// costs nothing per frame. Geometry matches shared/game.ts exactly:
// a 400px grid, 112px roads starting at n*400+22, 235px blocks at n*400+145.
import {buildings, SIZE} from '../../shared/game';

export const TILE = 800;
const CELL = 400, ROAD = 22, ROAD_W = 112;
/** Stretches of road between junctions, as [start, end] along either axis. */
const SPANS: [number, number][] = [[0, ROAD], ...Array.from({length: SIZE / CELL}, (_, k): [number, number] => [k * CELL + ROAD + ROAD_W, (k + 1) * CELL + ROAD])];
const NEON = ['#2ef2ff', '#ff3fd8', '#c2ff62', '#ffb347', '#9b7bff', '#ff4f6d'];

/** Deterministic 0..1 noise so the city looks the same for every player. */
function rand(a: number, b = 0, c = 0) {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

type Ctx = CanvasRenderingContext2D;
const hit = (x: number, y: number, w: number, h: number, ox: number, oy: number, pad = 60) =>
  x + w > ox - pad && x < ox + TILE + pad && y + h > oy - pad && y < oy + TILE + pad;

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// ---------------------------------------------------------------- ground

// Small repeating textures, drawn once and reused as fill patterns (one fill per area).
let slabs: HTMLCanvasElement | null = null, grain: HTMLCanvasElement | null = null;
function patterns() {
  if (!slabs) {
    slabs = document.createElement('canvas');
    slabs.width = slabs.height = 96;
    const c = slabs.getContext('2d')!;
    c.fillStyle = '#1a2130';
    c.fillRect(0, 0, 96, 96);
    for (let y = 0; y < 96; y += 24)
      for (let x = 0; x < 96; x += 24) {
        const v = rand(x, y, 5);
        c.fillStyle = v > 0.5 ? `rgba(255,255,255,${(v - 0.5) * 0.05})` : `rgba(0,0,0,${v * 0.18})`;
        c.fillRect(x + 1, y + 1, 22, 22);
      }
  }
  if (!grain) {
    grain = document.createElement('canvas');
    grain.width = grain.height = 160;
    const c = grain.getContext('2d')!;
    for (let i = 0; i < 300; i++) {
      const v = rand(i, 9, 4);
      c.fillStyle = v > 0.5 ? 'rgba(170,185,205,.07)' : 'rgba(0,0,0,.18)';
      c.fillRect(rand(i, 1, 4) * 160, rand(i, 2, 4) * 160, 1 + ((v * 3) | 0), 1);
    }
  }
  return {slabs, grain};
}

function paveSidewalk(ctx: Ctx, ox: number, oy: number) {
  ctx.fillStyle = ctx.createPattern(patterns().slabs, 'repeat')!;
  ctx.fillRect(ox, oy, TILE, TILE);
}

function asphalt(ctx: Ctx, x: number, y: number, w: number, h: number) {
  const vertical = h > w;
  const g = vertical ? ctx.createLinearGradient(x, 0, x + w, 0) : ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#161c28');
  g.addColorStop(0.12, '#202839');
  g.addColorStop(0.5, '#232c3d');
  g.addColorStop(0.88, '#202839');
  g.addColorStop(1, '#161c28');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = ctx.createPattern(patterns().grain, 'repeat')!;
  ctx.fillRect(x, y, w, h);
}

function roads(ctx: Ctx, ox: number, oy: number) {
  for (let n = 0; n <= SIZE / CELL; n++) {
    const p = n * CELL + ROAD;
    if (p < ox + TILE && p + ROAD_W > ox) asphalt(ctx, p, oy, ROAD_W, TILE);
    if (p < oy + TILE && p + ROAD_W > oy) asphalt(ctx, ox, p, TILE, ROAD_W);
  }
  // Lane markings, skipping intersections.
  const inJunction = (v: number) => {
    const m = ((v % CELL) + CELL) % CELL;
    return m > ROAD - 18 && m < ROAD + ROAD_W + 18;
  };
  for (let n = 0; n <= SIZE / CELL; n++) {
    const p = n * CELL + ROAD, mid = p + ROAD_W / 2;
    for (let t = 0; t < SIZE; t += 48) {
      if (inJunction(t) || inJunction(t + 24)) continue;
      // Centre dashes.
      ctx.fillStyle = 'rgba(232,236,240,.55)';
      ctx.fillRect(mid - 1.5, t, 3, 24);
      ctx.fillRect(t, mid - 1.5, 24, 3);
    }
    // Edge lines and kerbs, only between junctions.
    for (const [a, b] of SPANS) {
      if (b < Math.min(ox, oy) - 10 || a > Math.max(ox, oy) + TILE + 10) continue;
      ctx.fillStyle = 'rgba(220,226,232,.18)';
      for (const e of [p + 7, p + ROAD_W - 9]) {
        ctx.fillRect(e, a, 2, b - a);
        ctx.fillRect(a, e, b - a, 2);
      }
      ctx.fillStyle = '#6f7b8c';
      for (const e of [p - 3, p + ROAD_W]) {
        ctx.fillRect(e, a, 3, b - a);
        ctx.fillRect(a, e, b - a, 3);
      }
    }
  }
  // Junctions: clean asphalt, zebra crossings, stop lines, manholes, tyre marks.
  for (let i = 0; i <= SIZE / CELL; i++)
    for (let j = 0; j <= SIZE / CELL; j++) {
      const x = i * CELL + ROAD, y = j * CELL + ROAD;
      if (!hit(x, y, ROAD_W, ROAD_W, ox, oy, 80)) continue;
      asphalt(ctx, x, y, ROAD_W, ROAD_W);
      ctx.fillStyle = 'rgba(235,238,242,.62)';
      for (let k = 0; k < 7; k++) {
        const o = 10 + k * 14;
        ctx.fillRect(x + o, y - 26, 8, 20);
        ctx.fillRect(x + o, y + ROAD_W + 6, 8, 20);
        ctx.fillRect(x - 26, y + o, 20, 8);
        ctx.fillRect(x + ROAD_W + 6, y + o, 20, 8);
      }
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + 30 + rand(i, j) * 50, y + 30 + rand(j, i) * 50, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,.14)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(x + ROAD_W, y + ROAD_W, 70 + rand(i, j, 3) * 20, Math.PI, Math.PI * 1.5);
      ctx.stroke();
    }
  // Wet asphalt catching neon reflections.
  for (let i = 0; i < 30; i++) {
    const n = (rand(i, 11) * 9) | 0, along = rand(i, 12) * SIZE, vertical = rand(i, 13) > 0.5;
    const x = vertical ? n * CELL + ROAD + 20 + rand(i, 14) * 70 : along;
    const y = vertical ? along : n * CELL + ROAD + 20 + rand(i, 14) * 70;
    if (!hit(x, y, 1, 1, ox, oy, 90)) continue;
    const c = NEON[i % NEON.length];
    const g = ctx.createRadialGradient(x, y, 0, x, y, 60);
    g.addColorStop(0, c + '30');
    g.addColorStop(1, c + '00');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, vertical ? 26 : 60, vertical ? 60 : 26, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------------------------------------------------------------- rooftops

const ROOFS = [['#2a3346', '#1b2231'], ['#33303f', '#211e2b'], ['#24393d', '#172628'], ['#3a3135', '#241d21'], ['#283646', '#19222e'], ['#2f3a32', '#1d2520']];

function acUnit(ctx: Ctx, x: number, y: number) {
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  rr(ctx, x + 5, y + 7, 62, 40, 5);
  ctx.fill();
  const g = ctx.createLinearGradient(x, y, x, y + 40);
  g.addColorStop(0, '#7b8794');
  g.addColorStop(1, '#4a5561');
  ctx.fillStyle = g;
  rr(ctx, x, y, 62, 40, 5);
  ctx.fill();
  for (const cx of [x + 17, x + 45]) {
    ctx.fillStyle = '#1d252e';
    ctx.beginPath();
    ctx.arc(cx, y + 20, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#64707d';
    ctx.lineWidth = 2;
    for (let b = 0; b < 4; b++) {
      const a = (b * Math.PI) / 2 + 0.4;
      ctx.beginPath();
      ctx.moveTo(cx, y + 20);
      ctx.lineTo(cx + Math.cos(a) * 11, y + 20 + Math.sin(a) * 11);
      ctx.stroke();
    }
  }
}

function roof(ctx: Ctx, i: number) {
  const r = buildings[i], v = i % 6, [light, dark] = ROOFS[v], neon = NEON[(i * 7) % NEON.length];
  const {x, y, w, h} = r;
  // Cast shadow.
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.7)';
  ctx.shadowBlur = 34;
  ctx.shadowOffsetX = 16;
  ctx.shadowOffsetY = 22;
  ctx.fillStyle = dark;
  rr(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.restore();
  // Roof slab.
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, light);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  rr(ctx, x, y, w, h, 8);
  ctx.fill();
  // Parapet bevel.
  ctx.strokeStyle = 'rgba(255,255,255,.14)';
  ctx.lineWidth = 3;
  rr(ctx, x + 4, y + 4, w - 8, h - 8, 6);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.45)';
  ctx.lineWidth = 2;
  rr(ctx, x + 10, y + 10, w - 20, h - 20, 4);
  ctx.stroke();
  // Membrane seams and stains.
  ctx.strokeStyle = 'rgba(255,255,255,.04)';
  ctx.lineWidth = 1;
  for (let k = x + 30; k < x + w - 12; k += 30) {
    ctx.beginPath();
    ctx.moveTo(k, y + 12);
    ctx.lineTo(k, y + h - 12);
    ctx.stroke();
  }
  for (let k = 0; k < 6; k++) {
    const sx = x + 20 + rand(i, k) * (w - 40), sy = y + 20 + rand(k, i) * (h - 40);
    const s = ctx.createRadialGradient(sx, sy, 0, sx, sy, 22);
    s.addColorStop(0, 'rgba(0,0,0,.2)');
    s.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = s;
    ctx.fillRect(sx - 22, sy - 22, 44, 44);
  }

  // Signature rooftop feature per style.
  if (v === 0) {
    acUnit(ctx, x + 30, y + 34);
    acUnit(ctx, x + 30, y + 92);
    ctx.fillStyle = '#4a5561';
    rr(ctx, x + 140, y + 130, 60, 70, 4);
    ctx.fill();
    ctx.strokeStyle = '#1b2631';
    ctx.lineWidth = 2;
    for (let k = 0; k < 7; k++) {
      ctx.beginPath();
      ctx.moveTo(x + 145, y + 138 + k * 9);
      ctx.lineTo(x + 195, y + 138 + k * 9);
      ctx.stroke();
    }
  } else if (v === 1) {
    // Helipad.
    const cx = x + w / 2, cy = y + h / 2;
    ctx.fillStyle = '#20252f';
    ctx.beginPath();
    ctx.arc(cx, cy, 78, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd35a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, 66, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#f2f4f7';
    ctx.fillRect(cx - 24, cy - 30, 11, 60);
    ctx.fillRect(cx + 13, cy - 30, 11, 60);
    ctx.fillRect(cx - 13, cy - 6, 26, 12);
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      ctx.fillStyle = k % 2 ? '#54ff9f' : '#ffe27a';
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * 78, cy + Math.sin(a) * 78, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (v === 2) {
    // Solar arrays.
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 3; col++) {
        const px = x + 26 + col * 64, py = y + 26 + row * 48;
        const sg = ctx.createLinearGradient(px, py, px + 56, py + 38);
        sg.addColorStop(0, '#2a5fa8');
        sg.addColorStop(0.5, '#173a6e');
        sg.addColorStop(1, '#0f2547');
        ctx.fillStyle = 'rgba(0,0,0,.4)';
        ctx.fillRect(px + 4, py + 5, 56, 38);
        ctx.fillStyle = sg;
        ctx.fillRect(px, py, 56, 38);
        ctx.strokeStyle = 'rgba(160,200,255,.25)';
        ctx.lineWidth = 1;
        for (let k = 1; k < 4; k++) {
          ctx.beginPath();
          ctx.moveTo(px + k * 14, py);
          ctx.lineTo(px + k * 14, py + 38);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(px, py + 19);
        ctx.lineTo(px + 56, py + 19);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.08)';
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + 22, py);
        ctx.lineTo(px, py + 18);
        ctx.fill();
      }
  } else if (v === 3) {
    // Glass atrium with warm and cool lit panes.
    ctx.fillStyle = '#10161f';
    rr(ctx, x + 36, y + 36, w - 72, h - 72, 6);
    ctx.fill();
    for (let row = 0; row < 6; row++)
      for (let col = 0; col < 6; col++) {
        const lit = rand(i, row, col);
        ctx.fillStyle = lit > 0.55 ? (lit > 0.8 ? 'rgba(120,230,255,.55)' : 'rgba(255,205,130,.5)') : 'rgba(80,100,130,.18)';
        ctx.fillRect(x + 42 + col * 26, y + 42 + row * 26, 22, 22);
      }
  } else if (v === 4) {
    // Water tank, vents and antenna mast.
    const cx = x + 70, cy = y + 70;
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.beginPath();
    ctx.arc(cx + 8, cy + 10, 42, 0, Math.PI * 2);
    ctx.fill();
    const tg = ctx.createRadialGradient(cx - 12, cy - 12, 4, cx, cy, 42);
    tg.addColorStop(0, '#8a6b52');
    tg.addColorStop(1, '#4a3628');
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.arc(cx, cy, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 2;
    for (const rad of [30, 18]) {
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = '#56616c';
      ctx.beginPath();
      ctx.arc(x + 150 + k * 22, y + 165, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1b232c';
      ctx.beginPath();
      ctx.arc(x + 150 + k * 22, y + 165, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#8f9aa6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 180, y + 50);
    ctx.lineTo(x + 180, y + 110);
    ctx.moveTo(x + 165, y + 70);
    ctx.lineTo(x + 195, y + 70);
    ctx.stroke();
  } else {
    // Roof garden.
    ctx.fillStyle = '#4a3a2c';
    rr(ctx, x + 26, y + 26, w - 52, h - 52, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.lineWidth = 2;
    for (let k = y + 36; k < y + h - 26; k += 12) {
      ctx.beginPath();
      ctx.moveTo(x + 26, k);
      ctx.lineTo(x + w - 26, k);
      ctx.stroke();
    }
    for (let k = 0; k < 7; k++) tree(ctx, x + 44 + rand(i, k, 1) * (w - 88), y + 44 + rand(i, k, 2) * (h - 88), 14 + rand(k, i) * 8);
  }

  // Neon trim along one roof edge, glowing out onto the street.
  const edge = (i * 3) % 4;
  ctx.save();
  ctx.shadowColor = neon;
  ctx.shadowBlur = 22;
  ctx.fillStyle = neon;
  if (edge === 0) ctx.fillRect(x + 14, y + 2, w - 28, 4);
  else if (edge === 1) ctx.fillRect(x + w - 6, y + 14, 4, h - 28);
  else if (edge === 2) ctx.fillRect(x + 14, y + h - 6, w - 28, 4);
  else ctx.fillRect(x + 2, y + 14, 4, h - 28);
  ctx.restore();
  // Rooftop billboard on some buildings.
  if (i % 5 === 2) {
    ctx.save();
    ctx.shadowColor = neon;
    ctx.shadowBlur = 16;
    const bx = x + w - 110, by = y + 18;
    ctx.fillStyle = '#0c0f18';
    rr(ctx, bx, by, 90, 26, 4);
    ctx.fill();
    ctx.strokeStyle = neon;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = neon;
    for (let k = 0; k < 5; k++) ctx.fillRect(bx + 10 + k * 15, by + 9, 9, 8);
    ctx.restore();
  }
}

function tree(ctx: Ctx, x: number, y: number, r: number) {
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.beginPath();
  ctx.arc(x + 5, y + 6, r, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 1, x, y, r);
  g.addColorStop(0, '#5f9a6a');
  g.addColorStop(0.6, '#2d5a3c');
  g.addColorStop(1, '#173426');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------------------------- street furniture

/** Lamp posts (one per block corner) – also used to place glowing light pools. */
export const lamps = buildings.flatMap((r, i) => [
  {x: r.x - 16, y: r.y + 40 + (i % 3) * 50, color: 0xffd9a0},
  {x: r.x + r.w - 40 - (i % 2) * 60, y: r.y + r.h + 26, color: i % 4 === 0 ? 0x9fe8ff : 0xffd9a0},
]);

/** Neon trim positions (centre, length, orientation) for additive glow sprites. */
export const neonTrims = buildings.map((r, i) => {
  const edge = (i * 3) % 4, color = parseInt(NEON[(i * 7) % NEON.length].slice(1), 16);
  const horizontal = edge % 2 === 0;
  return {
    x: edge === 1 ? r.x + r.w + 4 : edge === 3 ? r.x - 4 : r.x + r.w / 2,
    y: edge === 0 ? r.y - 4 : edge === 2 ? r.y + r.h + 4 : r.y + r.h / 2,
    horizontal, color,
  };
});

function furniture(ctx: Ctx, ox: number, oy: number) {
  for (const l of lamps) {
    if (!hit(l.x, l.y, 1, 1, ox, oy)) continue;
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.beginPath();
    ctx.arc(l.x + 3, l.y + 4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9aa5b1';
    ctx.beginPath();
    ctx.arc(l.x, l.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3d6';
    ctx.beginPath();
    ctx.arc(l.x, l.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  buildings.forEach((r, i) => {
    if (!hit(r.x, r.y, r.w + 50, r.h + 50, ox, oy)) return;
    // Street trees in the wide sidewalk south of each block.
    for (let k = 0; k < 3; k++) {
      const tx = r.x + 30 + k * 70 + rand(i, k) * 10, ty = r.y + r.h + 21;
      ctx.fillStyle = '#121820';
      ctx.beginPath();
      ctx.arc(tx, ty, 13, 0, Math.PI * 2);
      ctx.fill();
      tree(ctx, tx, ty, 11);
    }
    // Bench and bin on the east sidewalk.
    ctx.fillStyle = '#4b3a2c';
    rr(ctx, r.x + r.w + 12, r.y + 80, 10, 34, 2);
    ctx.fill();
    ctx.fillStyle = '#3c4652';
    ctx.beginPath();
    ctx.arc(r.x + r.w + 18, r.y + 140, 5, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** Paint one 800×800 city tile whose top-left world position is (ox, oy). */
export function paintTile(ctx: Ctx, ox: number, oy: number) {
  ctx.save();
  ctx.translate(-ox, -oy);
  paveSidewalk(ctx, ox, oy);
  roads(ctx, ox, oy);
  furniture(ctx, ox, oy);
  buildings.forEach((r, i) => {
    if (hit(r.x, r.y, r.w, r.h, ox, oy, 80)) roof(ctx, i);
  });
  ctx.restore();
}
