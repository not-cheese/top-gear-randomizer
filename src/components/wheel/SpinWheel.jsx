import { useEffect, useRef } from "react";
import { easeOut, targetRotation } from "../../domain/wheel.js";

const SIZE = 360; // logical canvas size; CSS scales it down on small screens
const COLORS = ["#ffc400", "#2a2a2f"];
const ODD_COLOR = "#d9472b"; // stops the first and last segments sharing a colour
const TEXT_ON = { "#ffc400": "#121212", "#2a2a2f": "#f2f2f2", "#d9472b": "#ffffff" };

function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let end = text.length;
  while (end > 1 && ctx.measureText(text.slice(0, end) + "…").width > maxWidth) end--;
  return text.slice(0, end).trimEnd() + "…";
}

function drawWheel(ctx, candidates, rotation, dpr) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, SIZE, SIZE);
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const radius = SIZE / 2 - 8;
  const n = candidates.length;

  if (n === 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#26262a";
    ctx.fill();
    ctx.fillStyle = "#9a9aa3";
    ctx.font = "600 16px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("No episodes to spin", cx, cy);
    return;
  }

  const seg = (Math.PI * 2) / n;
  candidates.forEach((episode, k) => {
    const start = k * seg + rotation - Math.PI / 2; // canvas 0 is 3 o'clock, ours is 12
    const color = n > 1 && n % 2 === 1 && k === n - 1 ? ODD_COLOR : COLORS[k % 2];

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, start + seg);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#121212";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + seg / 2);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = TEXT_ON[color];
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.fillText(fitText(ctx, episode.title, radius - 56), radius - 14, 0);
    ctx.restore();
  });

  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI * 2);
  ctx.fillStyle = "#121212";
  ctx.fill();
  ctx.strokeStyle = "#ffc400";
  ctx.lineWidth = 3;
  ctx.stroke();
}

/**
 * Canvas wheel. The parent decides the winner; this only animates to it.
 * Bump `spinKey` to start a spin that ends on candidates[winnerIndex].
 */
export default function SpinWheel({ candidates, spinKey, winnerIndex, onFinish, duration = 4500 }) {
  const canvasRef = useRef(null);
  const dprRef = useRef(1);
  const rotationRef = useRef(0);
  const finishRef = useRef(onFinish);

  useEffect(() => {
    finishRef.current = onFinish;
  });

  // Size the canvas for the screen's pixel density.
  useEffect(() => {
    const canvas = canvasRef.current;
    dprRef.current = window.devicePixelRatio || 1;
    canvas.width = SIZE * dprRef.current;
    canvas.height = SIZE * dprRef.current;
  }, []);

  // New segments: show them at rest.
  useEffect(() => {
    rotationRef.current = 0;
    drawWheel(canvasRef.current.getContext("2d"), candidates, 0, dprRef.current);
  }, [candidates]);

  // New spin. `candidates` and `winnerIndex` change in the same render as
  // `spinKey`, so reading them here always sees the matching values.
  useEffect(() => {
    if (spinKey === 0 || candidates.length === 0) return undefined;
    const ctx = canvasRef.current.getContext("2d");
    const from = rotationRef.current;
    const to = targetRotation(from, winnerIndex, candidates.length, {
      turns: 5,
      jitter: (Math.random() - 0.5) * 0.8,
    });
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const total = reduceMotion ? 300 : duration;
    const startedAt = performance.now();
    let frame = 0;

    const step = (now) => {
      const t = Math.min(1, (now - startedAt) / total);
      rotationRef.current = from + (to - from) * easeOut(t);
      drawWheel(ctx, candidates, rotationRef.current, dprRef.current);
      if (t < 1) {
        frame = requestAnimationFrame(step);
      } else {
        finishRef.current?.();
      }
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinKey]);

  return (
    <div className="wheel-wrap">
      <div className="wheel-pointer" aria-hidden="true" />
      <canvas
        ref={canvasRef}
        className="wheel-canvas"
        role="img"
        aria-label="Spinning wheel of Top Gear episodes"
      />
    </div>
  );
}
