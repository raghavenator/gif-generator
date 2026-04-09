import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

const W = 800, H = 450;
const PAD = { top: 65, right: 50, bottom: 65, left: 70 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

function cumulative(overs) {
  let total = 0;
  return overs.map(o => { total += o.r; return { runs: total, wickets: o.w }; });
}

function drawCricketChart(canvas, match, progress) {
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0d0f14';
  ctx.fillRect(0, 0, W, H);

  if (!match) {
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Select a match to display', W / 2, H / 2);
    return;
  }

  const t1 = match.team1;
  const t2 = match.team2;
  const c1 = cumulative(t1.overs);
  const c2 = cumulative(t2.overs);

  const maxOvers = Math.max(t1.overs.length, t2.overs.length);
  const maxRuns  = Math.max(...c1.map(d => d.runs), ...c2.map(d => d.runs), 1);
  const yTop     = maxRuns * 1.12;

  const toX = over => PAD.left + (over / maxOvers) * CW;
  const toY = runs => PAD.top + CH - (runs / yTop) * CH;

  const visOvers = Math.max(1, Math.ceil(maxOvers * progress));

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  const runStep = maxRuns > 300 ? 100 : maxRuns > 150 ? 50 : 25;
  for (let r = 0; r <= yTop; r += runStep) {
    ctx.beginPath(); ctx.moveTo(PAD.left, toY(r)); ctx.lineTo(PAD.left + CW, toY(r)); ctx.stroke();
  }
  const overStep = maxOvers > 40 ? 10 : 5;
  for (let o = overStep; o < maxOvers; o += overStep) {
    ctx.beginPath(); ctx.moveTo(toX(o), PAD.top); ctx.lineTo(toX(o), PAD.top + CH); ctx.stroke();
  }

  // Draw each team
  [
    { cum: c1, overs: t1.overs, color: t1.color, name: t1.name },
    { cum: c2, overs: t2.overs, color: t2.color, name: t2.name },
  ].forEach(({ cum, overs, color, name }) => {
    const vis = cum.slice(0, visOvers);
    if (vis.length === 0) return;

    // Area fill
    ctx.beginPath();
    ctx.moveTo(toX(0), PAD.top + CH);
    vis.forEach((d, i) => ctx.lineTo(toX(i + 1), toY(d.runs)));
    ctx.lineTo(toX(vis.length), PAD.top + CH);
    ctx.closePath();
    ctx.fillStyle = color + '28'; // ~16% opacity
    ctx.fill();

    // Line
    ctx.beginPath();
    vis.forEach((d, i) => {
      const x = toX(i + 1);
      const y = toY(d.runs);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2.5;
    ctx.lineJoin    = 'round';
    ctx.stroke();

    // Wicket markers (downward triangles in red)
    vis.forEach((d, i) => {
      if (d.wickets > 0) {
        const x = toX(i + 1);
        const y = toY(d.runs);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(x, y + 4);
        ctx.lineTo(x - 5, y - 8);
        ctx.lineTo(x + 5, y - 8);
        ctx.closePath();
        ctx.fill();
      }
    });

    // End dot + score label
    if (vis.length > 0) {
      const last = vis[vis.length - 1];
      const lx   = toX(vis.length);
      const ly   = toY(last.runs);

      const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, 12);
      glow.addColorStop(0, color + 'aa');
      glow.addColorStop(1, color + '00');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(lx, ly, 12, 0, Math.PI * 2); ctx.fill();

      ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();

      // Wickets fallen so far
      const totalWickets = vis.reduce((sum, d) => sum + d.wickets, 0);
      ctx.fillStyle  = color;
      ctx.font       = 'bold 13px monospace';
      ctx.textAlign  = 'left';
      ctx.fillText(`${last.runs}/${totalWickets}`, Math.min(lx + 8, W - PAD.right - 55), ly + 4);
    }
  });

  // Y axis labels (runs)
  ctx.fillStyle  = 'rgba(255,255,255,0.4)';
  ctx.font       = '11px monospace';
  ctx.textAlign  = 'right';
  for (let r = 0; r <= yTop; r += runStep) {
    ctx.fillText(r, PAD.left - 8, toY(r) + 4);
  }

  // X axis labels (overs)
  ctx.textAlign  = 'center';
  ctx.fillStyle  = 'rgba(255,255,255,0.4)';
  ctx.font       = '11px monospace';
  for (let o = 0; o <= maxOvers; o += overStep) {
    ctx.fillText(o, toX(o), PAD.top + CH + 18);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font      = '11px sans-serif';
  ctx.fillText('Overs', PAD.left + CW / 2, PAD.top + CH + 38);

  // Axis lines
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(PAD.left, PAD.top); ctx.lineTo(PAD.left, PAD.top + CH);
  ctx.lineTo(PAD.left + CW, PAD.top + CH);
  ctx.stroke();

  // Title
  ctx.fillStyle  = '#f1f5f9';
  ctx.font       = 'bold 15px sans-serif';
  ctx.textAlign  = 'left';
  ctx.fillText(match.name, PAD.left, 36);

  // Legend
  const legendX = W - PAD.right - 140;
  [
    { color: t1.color, name: t1.name },
    { color: t2.color, name: t2.name },
  ].forEach(({ color, name }, i) => {
    const ly = PAD.top + 10 + i * 22;
    ctx.fillStyle = color;
    ctx.fillRect(legendX, ly - 8, 16, 3);
    ctx.font       = '12px sans-serif';
    ctx.textAlign  = 'left';
    ctx.fillText(name, legendX + 22, ly);
  });

  // Wicket legend
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(legendX, PAD.top + 60);
  ctx.lineTo(legendX - 5, PAD.top + 48);
  ctx.lineTo(legendX + 5, PAD.top + 48);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle  = 'rgba(255,255,255,0.4)';
  ctx.font       = '11px sans-serif';
  ctx.textAlign  = 'left';
  ctx.fillText('Wicket', legendX + 10, PAD.top + 60);

  // Border
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth   = 1;
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
}

const CricketChart = forwardRef(function CricketChart({ match }, ref) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  const drawFrame = useCallback((canvas, progress) => {
    drawCricketChart(canvas, match, progress);
  }, [match]);

  useImperativeHandle(ref, () => ({
    drawFrame,
    getCanvas: () => canvasRef.current,
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!match) { drawCricketChart(canvas, null, 0); return; }

    cancelAnimationFrame(rafRef.current);
    const start    = performance.now();
    const duration = 2800;

    const animate = time => {
      const p = Math.min((time - start) / duration, 1);
      drawCricketChart(canvas, match, p);
      if (p < 1) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [match]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
    />
  );
});

export default CricketChart;
