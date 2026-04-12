import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

const W = 800, H = 480;
const PAD = { top: 100, right: 50, bottom: 100, left: 75 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawStockChart(canvas, data, progress, symbol, color = '#818cf8', companyName = '', showGrid = true) {
  const ctx = canvas.getContext('2d');

  // Background — dark navy gradient matching reference
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#131822');
  bgGrad.addColorStop(1, '#0b0e16');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  if (!data || data.length < 2) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Select a stock and click Load Data', W / 2, H / 2);
    return;
  }

  // 1. Guard against empty or null data
  if (!data || data.length === 0) return;
  // Smooth interpolation
  const exact   = (data.length - 1) * Math.max(0, progress);
  const n       = Math.max(1, Math.min(Math.floor(exact) + 1, data.length));
  const frac    = exact - (n - 1);
  const visible = data.slice(0, n);
  const prev    = data[Math.max(n - 2, 0)];
  const curr    = data[n - 1];
  const tip     = {
    date:  new Date(prev.date.getTime() + (curr.date.getTime() - prev.date.getTime()) * frac),
    close: prev.close + (curr.close - prev.close) * frac,
    open:  prev.open  + (curr.open  - prev.open)  * frac,
  };
  const latest  = n === data.length ? curr : tip;

  // Scales
  const xMin = data[0].date.getTime();
  const xMax = data[data.length - 1].date.getTime();
  const toX = d => PAD.left + ((d.getTime() - xMin) / (xMax - xMin)) * CW;

  const prices  = data.map(d => d.close);
  const pMin    = Math.min(...prices);
  const pMax    = Math.max(...prices);
  const pad     = (pMax - pMin) * 0.08;
  const yMin    = pMin - pad;
  const yMax    = pMax + pad;
  const toY = v => PAD.top + CH - ((v - yMin) / (yMax - yMin)) * CH;

  const volMax  = Math.max(...data.map(d => d.volume));
  const volBarH = 48;
  const toVolH  = v => (v / volMax) * volBarH;

  // Grid lines
  if (showGrid) {
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      const y = PAD.top + (i / 5) * CH;
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + CW, y); ctx.stroke();
    }
    for (let i = 1; i <= 3; i++) {
      const x = PAD.left + (i / 4) * CW;
      ctx.beginPath(); ctx.moveTo(x, PAD.top); ctx.lineTo(x, PAD.top + CH); ctx.stroke();
    }
  }

  // Volume bars
  const barW = Math.max(1.5, CW / data.length * 0.55);
  visible.forEach(d => {
    const x = toX(d.date);
    const h = toVolH(d.volume);
    ctx.fillStyle = d.close >= d.open
      ? 'rgba(52,211,153,0.22)'
      : 'rgba(248,113,113,0.22)';
    ctx.fillRect(x - barW / 2, PAD.top + CH - h, barW, h);
  });

  // Points to draw: all visible whole points + interpolated tip
  const drawPoints = n < data.length ? [...visible.slice(0, -1), tip] : visible;

  // Area fill
  if (drawPoints.length > 1) {
    ctx.beginPath();
    ctx.moveTo(toX(drawPoints[0].date), PAD.top + CH);
    drawPoints.forEach(d => ctx.lineTo(toX(d.date), toY(d.close)));
    ctx.lineTo(toX(latest.date), PAD.top + CH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + CH);
    grad.addColorStop(0, hexToRgba(color, 0.35));
    grad.addColorStop(1, hexToRgba(color, 0.0));
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Price line
  if (drawPoints.length > 1) {
    ctx.beginPath();
    drawPoints.forEach((d, i) => {
      i === 0 ? ctx.moveTo(toX(d.date), toY(d.close))
              : ctx.lineTo(toX(d.date), toY(d.close));
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Live dot with glow
    const lx = toX(latest.date);
    const ly = toY(latest.close);
    const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, 14);
    glow.addColorStop(0, hexToRgba(color, 0.55));
    glow.addColorStop(1, hexToRgba(color, 0));
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(lx, ly, 14, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(lx, ly, 4,  0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    ctx.beginPath(); ctx.arc(lx, ly, 2,  0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();

  }

  // Y axis labels
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '11px monospace';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 5; i++) {
    const val = yMin + (i / 5) * (yMax - yMin);
    ctx.fillText(`$${val.toFixed(0)}`, PAD.left - 8, toY(val) + 4);
  }

  // X axis labels
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  [0, 0.25, 0.5, 0.75, 1].forEach(t => {
    const idx = Math.floor(t * (data.length - 1));
    const d   = data[idx];
    ctx.fillText(`${months[d.date.getMonth()]} ${d.date.getDate()}`, toX(d.date), PAD.top + CH + PAD.bottom / 2 + 4);
  });

  // Axis lines
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD.left, PAD.top); ctx.lineTo(PAD.left, PAD.top + CH);
  ctx.lineTo(PAD.left + CW, PAD.top + CH);
  ctx.stroke();

  // Header divider
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD.left, PAD.top - 20);
  ctx.lineTo(W - PAD.right, PAD.top - 20);
  ctx.stroke();

  // Title (top-left): bold ticker + lighter company name
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(symbol, PAD.left, PAD.top - 46);
  if (companyName) {
    const symbolW = ctx.measureText(symbol).width;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '14px sans-serif';
    ctx.fillText(companyName, PAD.left + symbolW + 12, PAD.top - 46);
  }

  // Price + change (top-right)
  if (data.length > 1 && visible.length > 0) {
    const change = ((latest.close - data[0].close) / data[0].close) * 100;
    const isPos  = change >= 0;
    const changeColor = isPos ? '#34d399' : '#f87171';

    // Large price
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(`$${latest.close.toFixed(2)}`, W - PAD.right, PAD.top - 48);

    // Arrow + percent below price
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = changeColor;
    ctx.fillText(`${isPos ? '▲' : '▼'} ${isPos ? '+' : ''}${change.toFixed(2)}%`, W - PAD.right, PAD.top - 28);
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

  // Glowing bottom edge line
  const glowGrad = ctx.createLinearGradient(0, 0, W, 0);
  glowGrad.addColorStop(0,   'rgba(34,211,167,0.27)');
  glowGrad.addColorStop(1,   'rgba(34,211,167,1.0)');

  // Soft glow halo beneath the line
  const haloGrad = ctx.createLinearGradient(0, H - 8, 0, H);
  haloGrad.addColorStop(0, 'rgba(34,211,167,0.22)');
  haloGrad.addColorStop(1, 'rgba(34,211,167,0.0)');
  ctx.fillStyle = haloGrad;
  ctx.fillRect(0, H - 8, W, 8);

  // The line itself
  ctx.beginPath();
  ctx.moveTo(0, H - 2);
  ctx.lineTo(W, H - 2);
  ctx.strokeStyle = glowGrad;
  ctx.lineWidth = 3;
  ctx.stroke();
}

const StockChart = forwardRef(function StockChart({ data, symbol = 'STOCK', color = '#818cf8', companyName = '', replayKey = 0, showGrid = true }, ref) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  const drawFrame = useCallback((canvas, progress) => {
    drawStockChart(canvas, data, progress, symbol, color, companyName, showGrid);
  }, [data, symbol, color, companyName, showGrid]);

  useImperativeHandle(ref, () => ({
    drawFrame,
    getCanvas: () => canvasRef.current,
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!data || data.length < 2) {
      drawStockChart(canvas, data, 0, symbol, color, companyName, showGrid);
      return;
    }

    cancelAnimationFrame(rafRef.current);
    const start    = performance.now();
    const duration = 2800;

    const animate = time => {
      const t = Math.min(Math.max((time - start) / duration, 0), 1);
      const p = 1 - Math.pow(1 - t, 3);
      drawStockChart(canvas, data, p, symbol, color, companyName, showGrid);
      if (p < 1) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [data, symbol, color, companyName, replayKey, showGrid]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
    />
  );
});

export default StockChart;
