// Pure maths for the spinning wheel. No canvas, no React.
//
// Angle convention: 0 is the pointer at the top, angles grow clockwise.
// Segment k of an n-segment wheel covers [k*seg, (k+1)*seg) before rotation,
// where seg = 2π/n. A wheel rotated clockwise by r moves every segment by +r.

const TWO_PI = 2 * Math.PI;
const mod = (x, m) => ((x % m) + m) % m;

/** Which segment is under the pointer when the wheel is rotated by `rotation`. */
export function indexAtPointer(rotation, count) {
  const seg = TWO_PI / count;
  return Math.floor(mod(-rotation, TWO_PI) / seg) % count;
}

/**
 * Final rotation that lands the pointer on segment `index`, spinning at least
 * `turns` full times forward from `current`. `jitter` (-0.45..0.45) moves the
 * stopping point within the segment so it doesn't always stop dead centre.
 */
export function targetRotation(current, index, count, { turns = 5, jitter = 0 } = {}) {
  const seg = TWO_PI / count;
  const safeJitter = Math.max(-0.45, Math.min(0.45, jitter));
  const desired = mod(-(index + 0.5 + safeJitter) * seg, TWO_PI);
  const delta = mod(desired - mod(current, TWO_PI), TWO_PI);
  return current + turns * TWO_PI + delta;
}

/** Ease-out: fast start, long slow finish. t and result are both 0..1. */
export function easeOut(t) {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - clamped, 4);
}
