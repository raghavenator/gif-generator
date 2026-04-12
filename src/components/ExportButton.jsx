import { useState } from 'react';
import { encodeGif } from '../gif/encodeGif';

export default function ExportButton({ chartRef, settings, filename = 'chart' }) {
  const [status,   setStatus]   = useState('idle'); // idle | encoding | done
  const [progress, setProgress] = useState(0);

  const handleExport = async () => {
    if (!chartRef?.current) return;
    const { drawFrame, getCanvas } = chartRef.current;
    const canvas = getCanvas();
    if (!canvas) return;

    setStatus('encoding');
    setProgress(0);

    try {
      const blob = await encodeGif(drawFrame, canvas, {
        numFrames:  settings.numFrames  ?? 60,
        fps:        settings.fps        ?? 30,
        easing:     settings.easing,
        onProgress: p => setProgress(p),
      });

      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `${filename}.gif`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus('done');
      setTimeout(() => setStatus('idle'), 2500);
    } catch (err) {
      console.error('GIF export failed:', err);
      setStatus('idle');
    }
  };

  const label =
    status === 'encoding' ? `Encoding… ${Math.round(progress * 100)}%`
    : status === 'done'   ? '✓ Saved!'
    : '⬇ Export GIF';

  return (
    <button
      onClick={handleExport}
      disabled={status === 'encoding'}
      style={{
        background:    status === 'done' ? '#16a34a' : '#4f46e5',
        color:         '#fff',
        border:        'none',
        borderRadius:  '6px',
        padding:       '8px 18px',
        fontSize:      '14px',
        fontWeight:    '600',
        cursor:        status === 'encoding' ? 'not-allowed' : 'pointer',
        opacity:       status === 'encoding' ? 0.7 : 1,
        transition:    'background 0.2s',
        fontFamily:    'inherit',
        whiteSpace:    'nowrap',
      }}
    >
      {label}
    </button>
  );
}
