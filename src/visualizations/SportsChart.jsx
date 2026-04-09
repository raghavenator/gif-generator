import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

const W = 800, H = 450;
const PAD = { top: 65, right: 30, bottom: 40, left: 190 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return isNaN(r) ? [99, 102, 241] : [r, g, b];
}

function drawSportsChart(canvas, teams, progress, label) {
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0d0f14';
  ctx.fillRect(0, 0, W, H);

  if (!teams || teams.length === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Select a sport and click Load Standings', W / 2, H / 2);
    return;
  }

  const maxWins = Math.max(...teams.map(t => t.wins), 1);
  const barH    = CH / teams.length;
  const barPad  = 3;

  teams.forEach((team, i) => {
    const y        = PAD.top + i * barH;
    const bY       = y + barPad;
    const bH       = barH - barPad * 2;
    const targetW  = (team.wins / maxWins) * CW;
    const barWidth = targetW * progress;
    const r        = Math.min(5, bH / 2);

    if (barWidth > 0) {
      const [cr, cg, cb] = hexToRgb(team.color);
      const grad = ctx.createLinearGradient(PAD.left, 0, PAD.left + barWidth, 0);
      grad.addColorStop(0, `rgba(${cr},${cg},${cb},0.9)`);
      grad.addColorStop(1, `rgba(${cr},${cg},${cb},0.6)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(PAD.left, bY + r);
      ctx.arcTo(PAD.left, bY, PAD.left + r, bY, r);
      ctx.lineTo(PAD.left + barWidth - r, bY);
      ctx.arcTo(PAD.left + barWidth, bY, PAD.left + barWidth, bY + r, r);
      ctx.lineTo(PAD.left + barWidth, bY + bH - r);
      ctx.arcTo(PAD.left + barWidth, bY + bH, PAD.left + barWidth - r, bY + bH, r);
      ctx.lineTo(PAD.left + r, bY + bH);
      ctx.arcTo(PAD.left, bY + bH, PAD.left, bY + bH - r, r);
      ctx.closePath();
      ctx.fill();
    }

    // Row background hint (subtle)
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.015)';
      ctx.fillRect(0, y, W, barH);
    }

    // Team name
    const fontSize = Math.min(13, Math.max(10, bH * 0.65));
    ctx.fillStyle  = '#e2e8f0';
    ctx.font       = `${fontSize}px sans-serif`;
    ctx.textAlign  = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(team.name, PAD.left - 10, bY + bH / 2);

    // Rank
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font      = `${fontSize - 2}px monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(`#${i + 1}`, PAD.left - 10 - ctx.measureText(team.name).width - 6, bY + bH / 2);

    // Win count inside or after bar
    const wins = Math.round(team.wins * progress);
    ctx.fillStyle    = barWidth > 36 ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.5)';
    ctx.font         = `bold ${fontSize - 1}px monospace`;
    ctx.textAlign    = barWidth > 36 ? 'right' : 'left';
    ctx.textBaseline = 'middle';
    const wLabel     = `${wins}W`;
    if (barWidth > 36) {
      ctx.fillText(wLabel, PAD.left + barWidth - 6, bY + bH / 2);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(wLabel, PAD.left + barWidth + 6, bY + bH / 2);
    }
  });

  ctx.textBaseline = 'alphabetic';

  // Title
  ctx.fillStyle  = '#f1f5f9';
  ctx.font       = 'bold 18px sans-serif';
  ctx.textAlign  = 'left';
  ctx.fillText(label || 'Standings', PAD.left, 40);

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font      = '12px sans-serif';
  ctx.fillText('2024–25 Season · Wins', PAD.left + ctx.measureText(label || 'Standings').width + 16, 40);

  // Border
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth   = 1;
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
}

const SportsChart = forwardRef(function SportsChart({ teams, label }, ref) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  const drawFrame = useCallback((canvas, progress) => {
    drawSportsChart(canvas, teams, progress, label);
  }, [teams, label]);

  useImperativeHandle(ref, () => ({
    drawFrame,
    getCanvas: () => canvasRef.current,
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!teams || teams.length === 0) {
      drawSportsChart(canvas, teams, 0, label);
      return;
    }

    cancelAnimationFrame(rafRef.current);
    const start    = performance.now();
    const duration = 2000;

    const animate = time => {
      const p = Math.min((time - start) / duration, 1);
      // ease out cubic
      const eased = 1 - Math.pow(1 - p, 3);
      drawSportsChart(canvas, teams, eased, label);
      if (p < 1) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [teams, label]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
    />
  );
});

export default SportsChart;
