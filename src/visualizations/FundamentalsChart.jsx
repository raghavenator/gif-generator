import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

const W = 800, H = 450;
const PAD = { top: 70, right: 40, bottom: 70, left: 90 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

function fmt(value) {
  const abs = Math.abs(value);
  if (abs >= 1e9)  return `$${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6)  return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toFixed(0)}`;
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawChart(canvas, data, progress, symbol, metricLabel, color = '#818cf8') {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0d0f14';
  ctx.fillRect(0, 0, W, H);

  if (!data || !data.length) {
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Select a metric and click Load Financials', W / 2, H / 2);
    return;
  }

  const n       = data.length;
  const barW    = Math.floor(CW / n * 0.6);
  const gap     = CW / n;
  const values  = data.map(d => d.value);
  const hasNeg  = values.some(v => v < 0);
  const vMax    = Math.max(...values, 0);
  const vMin    = Math.min(...values, 0);
  const vRange  = vMax - vMin || 1;
  const pad     = vRange * 0.12;
  const yMax    = vMax + pad;
  const yMin    = vMin - pad;

  // zero line Y position
  const zeroY   = PAD.top + CH - ((0 - yMin) / (yMax - yMin)) * CH;
  const toY = v => PAD.top + CH - ((v - yMin) / (yMax - yMin)) * CH;

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = PAD.top + (i / 4) * CH;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + CW, y); ctx.stroke();
  }

  // Zero line (if negative values exist)
  if (hasNeg) {
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(PAD.left, zeroY); ctx.lineTo(PAD.left + CW, zeroY); ctx.stroke();
    ctx.setLineDash([]);
  }

  // Bars — animate left to right, each bar grows from zero line up/down
  data.forEach((d, i) => {
    const barProgress = Math.max(0, Math.min(1, (progress * n) - i));
    if (barProgress === 0) return;

    const cx   = PAD.left + gap * i + gap / 2;
    const x    = cx - barW / 2;
    const isNeg = d.value < 0;
    const fullH = Math.abs(toY(d.value) - zeroY);
    const h    = fullH * barProgress;

    // gradient per bar
    const grad = ctx.createLinearGradient(0, isNeg ? zeroY : zeroY - h, 0, isNeg ? zeroY + h : zeroY);
    if (isNeg) {
      grad.addColorStop(0, 'rgba(248,113,113,0.9)');
      grad.addColorStop(1, 'rgba(248,113,113,0.4)');
    } else {
      grad.addColorStop(0, hexToRgba(color, 0.9));
      grad.addColorStop(1, hexToRgba(color, 0.35));
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, isNeg ? zeroY : zeroY - h, barW, h, [4, 4, 0, 0]);
    ctx.fill();

    // value label on top of completed bars
    if (barProgress === 1) {
      ctx.fillStyle = isNeg ? '#f87171' : color;
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      const labelY = isNeg ? zeroY + h + 14 : zeroY - h - 6;
      ctx.fillText(fmt(d.value), cx, labelY);
    }
  });

  // X axis labels
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  data.forEach((d, i) => {
    const cx = PAD.left + gap * i + gap / 2;
    ctx.fillText(d.quarter, cx, PAD.top + CH + 22);
  });

  // Y axis labels
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '11px monospace';
  for (let i = 0; i <= 4; i++) {
    const val = yMin + (i / 4) * (yMax - yMin);
    ctx.fillText(fmt(val), PAD.left - 10, toY(val) + 4);
  }

  // Axis lines
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD.left, PAD.top); ctx.lineTo(PAD.left, PAD.top + CH);
  ctx.lineTo(PAD.left + CW, PAD.top + CH);
  ctx.stroke();

  // Title
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${symbol}  —  Quarterly ${metricLabel}`, PAD.left, 40);

  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
}

const FundamentalsChart = forwardRef(function FundamentalsChart({ data, symbol, metricLabel, color = '#818cf8' }, ref) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  const drawFrame = useCallback((canvas, progress) => {
    drawChart(canvas, data, progress, symbol, metricLabel, color);
  }, [data, symbol, metricLabel, color]);

  useImperativeHandle(ref, () => ({
    drawFrame,
    getCanvas: () => canvasRef.current,
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!data || !data.length) {
      drawChart(canvas, data, 0, symbol, metricLabel, color);
      return;
    }

    cancelAnimationFrame(rafRef.current);

    const start    = performance.now();
    const duration = 2000;
    const animate  = time => {
      const p = Math.min(Math.max((time - start) / duration, 0), 1);
      drawChart(canvas, data, p, symbol, metricLabel, color);
      if (p < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [data, symbol, metricLabel, color]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
    />
  );
});

export default FundamentalsChart;
