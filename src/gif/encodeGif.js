import GIF from 'gif.js';

/**
 * Render a GIF by stepping drawFn through progress 0→1.
 * @param {(canvas: HTMLCanvasElement, progress: number) => void} drawFn
 * @param {HTMLCanvasElement} canvas  - reused for every frame (copy: true)
 * @param {{ numFrames?: number, fps?: number, onProgress?: (0-1) => void }} opts
 * @returns {Promise<Blob>}
 */
export function encodeGif(drawFn, canvas, { numFrames = 60, fps = 30, onProgress, easing = t => t } = {}) {
  return new Promise((resolve, reject) => {
    const gif = new GIF({
      workers: 4,
      quality: 10,
      workerScript: '/gif.worker.js',
      width: canvas.width,
      height: canvas.height,
    });

    const delay     = Math.round(1000 / fps);
    const holdDelay = 2000; // 2 s still hold at end — single frame with long delay

    for (let i = 0; i < numFrames; i++) {
      const t        = numFrames === 1 ? 1 : i / (numFrames - 1);
      const progress = easing(t);
      drawFn(canvas, progress);
      gif.addFrame(canvas, { copy: true, delay });
    }

    // Hold on the final frame
    drawFn(canvas, 1);
    gif.addFrame(canvas, { copy: true, delay: holdDelay });

    gif.on('progress', p => onProgress?.(p));
    gif.on('finished', resolve);
    gif.on('error', reject);
    gif.render();
  });
}
