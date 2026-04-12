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

  if (!data?.quarters?.length || !data?.priceData?.length) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Select a metric and click Load P+F', W / 2, H / 2);
    return;
  }

  const { quarters, priceData } = data;

  // Raw bounds from price data
  const rawXMin = priceData[0].date.getTime();
  const rawXMax = priceData[priceData.length - 1].date.getTime();
  const rawRange = rawXMax - rawXMin || 1;

  // One quarter's worth of ms (used for bar sizing and padding)
  const avgQuarterMs = rawRange / Math.max(quarters.length - 1, 1);
  const barGrowMs    = avgQuarterMs * 0.2;

  // Pad xMin left so the first bar isn't flush against the Y-axis,
  // and extend xMax so the last quarter has room to fully grow
  const lastQT = quarters[quarters.length - 1].date.getTime();
  const xMin   = rawXMin - avgQuarterMs * 0.35;
  const xMax   = Math.max(rawXMax, lastQT) + barGrowMs + avgQuarterMs * 0.1;
  const xRange = xMax - xMin;
  const toX    = d => PAD.left + ((d.getTime() - xMin) / xRange) * CW;

  // Current time position driven by animation progress
  const currentT = xMin + progress * xRange;

  // Financial (left) axis — scale from quarter values
  const values = quarters.map(q => q.value);
  const hasNeg = values.some(v => v < 0);
  const vMax   = Math.max(...values, 0);
  const vMin   = Math.min(...values, 0);
  const vRange = vMax - vMin || 1;
  const vPad   = vRange * 0.15;
  const yMaxV  = vMax + vPad;
  const yMinV  = hasNeg ? vMin - vPad : 0;   // don't push zero line up when all values positive
  const zeroY  = PAD.top + CH - ((0 - yMinV) / (yMaxV - yMinV)) * CH;
  const toYV   = v => PAD.top + CH - ((v - yMinV) / (yMaxV - yMinV)) * CH;

  // Price (right) axis — scale from full daily price data
  const closes = priceData.map(p => p.close);
  const pMax   = Math.max(...closes);
  const pMin   = Math.min(...closes);
  const pRange = pMax - pMin || 1;
  const pPad   = pRange * 0.15;
  const yMaxP  = pMax + pPad;
  const yMinP  = pMin - pPad;
  const toYP   = p => PAD.top + CH - ((p - yMinP) / (yMaxP - yMinP)) * CH;

  // Bar width proportional to one quarter's share of the padded time range
  const barW = Math.max(6, (avgQuarterMs / xRange) * CW * 0.45);

  // Horizontal grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = PAD.top + (i / 4) * CH;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + CW, y); ctx.stroke();
  }

  // Vertical grid lines at each quarter boundary
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  quarters.forEach(q => {
    const x = toX(q.date);
    ctx.beginPath(); ctx.moveTo(x, PAD.top); ctx.lineTo(x, PAD.top + CH); ctx.stroke();
  });

  // Bars — each grows once animation passes its date
  quarters.forEach(q => {
    const qT = q.date.getTime();
    const bp = Math.max(0, Math.min(1, (currentT - qT) / barGrowMs));
    if (bp === 0) return;

    const cx  = toX(q.date);
    const x   = cx - barW / 2;
    const neg = q.value < 0;
    const h   = Math.abs(toYV(q.value) - zeroY) * bp;

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
      ctx.fillText(fmt(q.value), cx, neg ? zeroY + h + 13 : zeroY - h - 5);
    }
  });

  // Daily price line — all points up to currentT
  const visible = priceData.filter(p => p.date.getTime() <= currentT);

  if (visible.length >= 2) {
    // Area fill under price line
    ctx.beginPath();
    ctx.moveTo(toX(visible[0].date), PAD.top + CH);
    visible.forEach(p => ctx.lineTo(toX(p.date), toYP(p.close)));
    ctx.lineTo(toX(visible[visible.length - 1].date), PAD.top + CH);
    ctx.closePath();
    const areaGrad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + CH);
    areaGrad.addColorStop(0, 'rgba(255,255,255,0.12)');
    areaGrad.addColorStop(1, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // Price line
    ctx.beginPath();
    visible.forEach((p, i) =>
      i === 0 ? ctx.moveTo(toX(p.date), toYP(p.close))
              : ctx.lineTo(toX(p.date), toYP(p.close))
    );
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Live dot at tip
    const tip = visible[visible.length - 1];
    const lx  = toX(tip.date);
    const ly  = toYP(tip.close);
    const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, 12);
    glow.addColorStop(0, 'rgba(255,255,255,0.4)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(lx, ly, 12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
  }

  // X-axis labels — quarter labels at each bar position
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  quarters.forEach(q => ctx.fillText(q.quarter, toX(q.date), PAD.top + CH + 22));

  // Left Y-axis labels (financial metric)
  ctx.textAlign = 'right';
  ctx.fillStyle = hexToRgba(color, 0.7);
  ctx.font = '10px monospace';
  for (let i = 0; i <= 4; i++) {
    const val = yMinV + (i / 4) * (yMaxV - yMinV);
    ctx.fillText(fmt(val), PAD.left - 8, toYV(val) + 4);
  }

  // Right Y-axis labels (price)
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
  ctx.beginPath();
  ctx.moveTo(PAD.left + CW, PAD.top); ctx.lineTo(PAD.left + CW, PAD.top + CH);
  ctx.stroke();

  // Header divider
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD.left, PAD.top - 20); ctx.lineTo(W - PAD.right, PAD.top - 20);
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

    if (!data?.quarters?.length || !data?.priceData?.length) {
      drawOverlay(canvas, data, 0, symbol, metricLabel, color);
      return;
    }

    cancelAnimationFrame(rafRef.current);
    const start    = performance.now();
    const duration = 2800 / animSpeed;

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
