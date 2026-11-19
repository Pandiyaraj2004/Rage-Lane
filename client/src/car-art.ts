// Car artwork shared by the game renderer and the homepage (no Phaser import,
// so the homepage stays light).
type Ctx = CanvasRenderingContext2D;

const rgb = (c: number) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
/** Lighten (amt > 0) or darken (amt < 0) a 0xRRGGBB colour; returns a CSS colour. */
export function shade(c: number, amt: number, alpha = 1) {
  const [r, g, b] = rgb(c).map(v => Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt)));
  return `rgba(${r},${g},${b},${alpha})`;
}

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Draw the car centred on the current origin, nose towards +x, in a 116×64 box. */
export function drawCar(ctx: Ctx, color: number) {
  // Tyres (peek out from under the body).
  ctx.fillStyle = '#05070a';
  for (const [x, y] of [[-38, -29], [17, -29], [-38, 20], [17, 20]]) {
    rr(ctx, x, y, 21, 9, 3);
    ctx.fill();
  }

  // Body silhouette: a wedge that narrows to the nose.
  const body = new Path2D();
  body.moveTo(-50, -18);
  body.quadraticCurveTo(-52, -25, -42, -25);
  body.lineTo(30, -24);
  body.quadraticCurveTo(50, -22, 52, -10);
  body.lineTo(52, 10);
  body.quadraticCurveTo(50, 22, 30, 24);
  body.lineTo(-42, 25);
  body.quadraticCurveTo(-52, 25, -50, 18);
  body.closePath();

  const side = ctx.createLinearGradient(0, -25, 0, 25);
  side.addColorStop(0, shade(color, -0.45));
  side.addColorStop(0.18, shade(color, 0.12));
  side.addColorStop(0.5, shade(color, 0.28));
  side.addColorStop(0.82, shade(color, 0.05));
  side.addColorStop(1, shade(color, -0.55));
  ctx.fillStyle = side;
  ctx.fill(body);

  // Hood and trunk sheen along the length.
  const len = ctx.createLinearGradient(-52, 0, 52, 0);
  len.addColorStop(0, 'rgba(0,0,0,.25)');
  len.addColorStop(0.35, 'rgba(255,255,255,0)');
  len.addColorStop(0.75, 'rgba(255,255,255,.12)');
  len.addColorStop(1, 'rgba(0,0,0,.2)');
  ctx.fillStyle = len;
  ctx.fill(body);

  // Racing stripes.
  ctx.save();
  ctx.clip(body);
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.fillRect(-52, -6, 104, 3.5);
  ctx.fillRect(-52, 2.5, 104, 3.5);
  ctx.restore();

  // Cabin: windscreen, roof, rear glass.
  const glass = ctx.createLinearGradient(-30, 0, 24, 0);
  glass.addColorStop(0, '#0b1726');
  glass.addColorStop(0.5, '#173149');
  glass.addColorStop(1, '#0a1522');
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(-30, -15);
  ctx.lineTo(10, -17);
  ctx.quadraticCurveTo(25, -16, 26, 0);
  ctx.quadraticCurveTo(25, 16, 10, 17);
  ctx.lineTo(-30, 15);
  ctx.quadraticCurveTo(-35, 0, -30, -15);
  ctx.fill();
  // Roof panel in body colour.
  const roof = ctx.createLinearGradient(0, -13, 0, 13);
  roof.addColorStop(0, shade(color, -0.1));
  roof.addColorStop(0.5, shade(color, 0.35));
  roof.addColorStop(1, shade(color, -0.15));
  ctx.fillStyle = roof;
  rr(ctx, -20, -12.5, 26, 25, 6);
  ctx.fill();
  // Reflections on the glass.
  ctx.strokeStyle = 'rgba(160,230,255,.55)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(14, -12);
  ctx.lineTo(20, -4);
  ctx.moveTo(-27, -11);
  ctx.lineTo(-24, -5);
  ctx.stroke();

  // Mirrors.
  ctx.fillStyle = shade(color, -0.3);
  rr(ctx, 6, -29, 6, 5, 2);
  ctx.fill();
  rr(ctx, 6, 24, 6, 5, 2);
  ctx.fill();

  // Headlights and tail lights.
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#bff9ff';
  ctx.fillStyle = '#eaffff';
  rr(ctx, 45, -20, 6, 8, 3);
  ctx.fill();
  rr(ctx, 45, 12, 6, 8, 3);
  ctx.fill();
  ctx.shadowColor = '#ff2d55';
  ctx.fillStyle = '#ff3d64';
  rr(ctx, -51, -20, 4, 9, 2);
  ctx.fill();
  rr(ctx, -51, 11, 4, 9, 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Crisp rim highlight.
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 1.2;
  ctx.stroke(body);
}

/** A large rendering of the car as an image URL (used on the homepage). */
export function carImage(color: number, scale = 4) {
  const el = document.createElement('canvas');
  el.width = 116 * scale;
  el.height = 64 * scale;
  const ctx = el.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.translate(58, 32);
  drawCar(ctx, color);
  return el.toDataURL('image/png');
}
