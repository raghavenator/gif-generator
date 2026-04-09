import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

const W = 800, H = 450;
const PAD = { top: 60, right: 50, bottom: 65, left: 75 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

function drawStockChart(canvas, data, progress, symbol) {
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#0d0f14';
  ctx.fillRect(0, 0, W, H);

  if (!data || data.length < 2) {
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Enter a symbol and click Load Data', W / 2, H / 2);
    return;
  }

  const n = Math.max(2, Math.ceil(data.length * progress));
  const visible = data.slice(0, n);
  const latest  = visible[visible.length - 1];

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

  // Area fill
  if (visible.length > 1) {
    ctx.beginPath();
    ctx.moveTo(toX(visible[0].date), PAD.top + CH);
    visible.forEach(d => ctx.lineTo(toX(d.date), toY(d.close)));
    ctx.lineTo(toX(latest.date), PAD.top + CH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + CH);
    grad.addColorStop(0, 'rgba(129,140,248,0.35)');
    grad.addColorStop(1, 'rgba(129,140,248,0.0)');
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Price line
  if (visible.length > 1) {
    ctx.beginPath();
    visible.forEach((d, i) => {
      i === 0 ? ctx.moveTo(toX(d.date), toY(d.close))
              : ctx.lineTo(toX(d.date), toY(d.close));
    });
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Live dot with glow
    const lx = toX(latest.date);
    const ly = toY(latest.close);
    const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, 14);
    glow.addColorStop(0, 'rgba(129,140,248,0.55)');
    glow.addColorStop(1, 'rgba(129,140,248,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(lx, ly, 14, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(lx, ly, 4,  0, Math.PI * 2);
    ctx.fillStyle = '#818cf8'; ctx.fill();
    ctx.beginPath(); ctx.arc(lx, ly, 2,  0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();

    // Price label
    const labelX = Math.min(lx + 10, W - PAD.right - 72);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`$${latest.close.toFixed(2)}`, labelX, ly + 4);
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
    ctx.fillText(`${months[d.date.getMonth()]} ${d.date.getDate()}`, toX(d.date), PAD.top + CH + 20);
  });

  // Axis lines
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD.left, PAD.top); ctx.lineTo(PAD.left, PAD.top + CH);
  ctx.lineTo(PAD.left + CW, PAD.top + CH);
  ctx.stroke();

  // Title + change
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(symbol, PAD.left, 36);

  if (data.length > 1 && visible.length > 0) {
    const change = ((latest.close - data[0].close) / data[0].close) * 100;
    ctx.fillStyle = change >= 0 ? '#34d399' : '#f87171';
    ctx.font = '13px monospace';
    const titleW = ctx.measureText(symbol).width;
    ctx.fillText(`${change >= 0 ? '+' : ''}${change.toFixed(2)}%`, PAD.left + titleW + 14, 36);
  }

  // Subtle frame border
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
}

const StockChart = forwardRef(function StockChart({ data, symbol = 'STOCK' }, ref) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  const drawFrame = useCallback((canvas, progress) => {
    drawStockChart(canvas, data, progress, symbol);
  }, [data, symbol]);

  useImperativeHandle(ref, () => ({
    drawFrame,
    getCanvas: () => canvasRef.current,
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!data || data.length < 2) {
      drawStockChart(canvas, data, 0, symbol);
      return;
    }

    cancelAnimationFrame(rafRef.current);
    const start    = performance.now();
    const duration = 2200;

    const animate = time => {
      const p = Math.min((time - start) / duration, 1);
      drawStockChart(canvas, data, p, symbol);
      if (p < 1) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [data, symbol]);

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
