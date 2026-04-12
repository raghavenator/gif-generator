import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

const W = 800, H = 480;
const PAD = { top: 100, right: 80, bottom: 100, left: 90 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

function fmt(value) {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  return `$${value.toFixed(0)}`;
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawOverlay(canvas, data, progress, symbol, metricLabel, color = '#818cf8') {
  const ctx = canvas.getContext('2d');

  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#131822');
  bgGrad.addColorStop(1, '#0b0e16');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  if (!data || !data.length) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Select a metric and click Load P+F', W / 2, H / 2);
    return;
  }

  const n   = data.length;
  const gap = CW / n;
  const barW = Math.floor(gap * 0.55);
  const toX  = i => PAD.left + gap * i + gap / 2;

  // Financial axis (left)
  const values = data.map(d => d.value);
  const vMax   = Math.max(...values, 0);
  const vMin   = Math.min(...values, 0);
  const vRange = vMax - vMin || 1;
  const vPad   = vRange * 0.15;
  const yMaxV  = vMax + vPad;
  const yMinV  = vMin - vPad;
  const zeroY  = PAD.top + CH - ((0 - yMinV) / (yMaxV - yMinV)) * CH;
  const toYV   = v => PAD.top + CH - ((v - yMinV) / (yMaxV - yMinV)) * CH;

  // Price axis (right)
  const prices = data.map(d => d.price).filter(p => p != null);
  const pMax   = Math.max(...prices);
  const pMin   = Math.min(...prices);
  const pRange = pMax - pMin || 1;
  const pPad   = pRange * 0.15;
  const yMaxP  = pMax + pPad;
  const yMinP  = pMin - pPad;
  const toYP   = p => PAD.top + CH - ((p - yMinP) / (yMaxP - yMinP)) * CH;

  // How far along the animation is (fractional quarter index)
  const exactN    = progress * n;
  const fullBars  = Math.floor(exactN);
  const partFrac  = exactN - fullBars;

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = PAD.top + (i / 4) * CH;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + CW, y); ctx.stroke();
  }

  // Bars
  data.forEach((d, i) => {
    const bp = i < fullBars ? 1 : i === fullBars ? partFrac : 0;
    if (bp === 0) return;
    const cx  = toX(i);
    const x   = cx - barW / 2;
    const neg = d.value < 0;
    const h   = Math.abs(toYV(d.value) - zeroY) * bp;
    const grad = ctx.createLinearGradient(0, neg ? zeroY : zeroY - h, 0, neg ? zeroY + h : zeroY);
    if (neg) {
      grad.addColorStop(0, 'rgba(248,113,113,0.9)');
      grad.addColorStop(1, 'rgba(248,113,113,0.35)');
    } else {
      grad.addColorStop(0, hexToRgba(color, 0.85));
      grad.addColorStop(1, hexToRgba(color, 0.3));
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, neg ? zeroY : zeroY - h, barW, h, [4, 4, 0, 0]);
    ctx.fill();

    if (bp === 1) {
      ctx.fillStyle = neg ? '#f87171' : color;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(fmt(d.value), cx, neg ? zeroY + h + 13 : zeroY - h - 5);
    }
  });

  // Price line — reveal in sync with bars
  const linePoints = data
    .slice(0, fullBars + (partFrac > 0 ? 1 : 0))
    .map((d, i) => ({ x: toX(i), y: toYP(d.price), valid: d.price != null }))
    .filter(p => p.valid);

  if (linePoints.length >= 2) {
    // Area fill
    ctx.beginPath();
    ctx.moveTo(linePoints[0].x, PAD.top + CH);
    linePoints.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(linePoints[linePoints.length - 1].x, PAD.top + CH);
    ctx.closePath();
    const areaGrad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + CH);
    areaGrad.addColorStop(0, 'rgba(255,255,255,0.10)');
    areaGrad.addColorStop(1, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // Line
    ctx.beginPath();
    linePoints.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  // Price dots
  linePoints.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  });

  // X axis labels
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  data.forEach((d, i) => ctx.fillText(d.quarter, toX(i), PAD.top + CH + 22));

  // Left Y axis labels (financial metric)
  ctx.textAlign = 'right';
  ctx.fillStyle = hexToRgba(color, 0.7);
  ctx.font = '10px monospace';
  for (let i = 0; i <= 4; i++) {
    const val = yMinV + (i / 4) * (yMaxV - yMinV);
    ctx.fillText(fmt(val), PAD.left - 8, toYV(val) + 4);
  }

  // Right Y axis labels (price)
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '10px monospace';
  for (let i = 0; i <= 4; i++) {
    const val = yMinP + (i / 4) * (yMaxP - yMinP);
    ctx.fillText(`$${val.toFixed(0)}`, PAD.left + CW + 8, toYP(val) + 4);
  }

  // Axis lines
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD.left, PAD.top); ctx.lineTo(PAD.left, PAD.top + CH);
  ctx.lineTo(PAD.left + CW, PAD.top + CH);
  ctx.stroke();

  // Right axis line
  ctx.beginPath();
  ctx.moveTo(PAD.left + CW, PAD.top);
  ctx.lineTo(PAD.left + CW, PAD.top + CH);
  ctx.stroke();

  // Header divider
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD.left, PAD.top - 20);
  ctx.lineTo(W - PAD.right, PAD.top - 20);
  ctx.stroke();

  // Title
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(symbol, PAD.left, PAD.top - 46);
  const symW = ctx.measureText(symbol).width;
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '14px sans-serif';
  ctx.fillText(`${metricLabel} + Price`, PAD.left + symW + 12, PAD.top - 46);

  // Legend
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = color;
  ctx.fillText(`▊ ${metricLabel}`, W - PAD.right - 72, PAD.top - 28);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('— Price', W - PAD.right, PAD.top - 28);

  // Border
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

  // Bottom glow
  const glowGrad = ctx.createLinearGradient(0, 0, W, 0);
  glowGrad.addColorStop(0, 'rgba(34,211,167,0.27)');
  glowGrad.addColorStop(1, 'rgba(34,211,167,1.0)');
  const haloGrad = ctx.createLinearGradient(0, H - 8, 0, H);
  haloGrad.addColorStop(0, 'rgba(34,211,167,0.22)');
  haloGrad.addColorStop(1, 'rgba(34,211,167,0.0)');
  ctx.fillStyle = haloGrad;
  ctx.fillRect(0, H - 8, W, 8);
  ctx.beginPath();
  ctx.moveTo(0, H - 2); ctx.lineTo(W, H - 2);
  ctx.strokeStyle = glowGrad;
  ctx.lineWidth = 3;
  ctx.stroke();
}

const OverlayChart = forwardRef(function OverlayChart({ data, symbol, metricLabel, color = '#818cf8', replayKey = 0, animSpeed = 1 }, ref) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  const drawFrame = useCallback((canvas, progress) => {
    drawOverlay(canvas, data, progress, symbol, metricLabel, color);
  }, [data, symbol, metricLabel, color]);

  useImperativeHandle(ref, () => ({
    drawFrame,
    getCanvas: () => canvasRef.current,
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!data || !data.length) {
      drawOverlay(canvas, data, 0, symbol, metricLabel, color);
      return;
    }

    cancelAnimationFrame(rafRef.current);
    const start    = performance.now();
    const duration = 2400 / animSpeed;

    const animate = time => {
      const t = Math.min(Math.max((time - start) / duration, 0), 1);
      const p = 1 - Math.pow(1 - t, 3);
      drawOverlay(canvas, data, p, symbol, metricLabel, color);
      if (p < 1) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [data, symbol, metricLabel, color, replayKey, animSpeed]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
    />
  );
});

export default OverlayChart;
