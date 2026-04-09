import GIF from 'gif.js';

/**
 * Render a GIF by stepping drawFn through progress 0→1.
 * @param {(canvas: HTMLCanvasElement, progress: number) => void} drawFn
 * @param {HTMLCanvasElement} canvas  - reused for every frame (copy: true)
 * @param {{ numFrames?: number, fps?: number, onProgress?: (0-1) => void }} opts
 * @returns {Promise<Blob>}
 */
export function encodeGif(drawFn, canvas, { numFrames = 60, fps = 30, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const gif = new GIF({
      workers: 4,
      quality: 10,
      workerScript: '/gif.worker.js',
      width: canvas.width,
      height: canvas.height,
    });

    const delay = Math.round(1000 / fps);

    for (let i = 0; i < numFrames; i++) {
      const progress = numFrames === 1 ? 1 : i / (numFrames - 1);
      drawFn(canvas, progress);
      gif.addFrame(canvas, { copy: true, delay });
    }

    gif.on('progress', p => onProgress?.(p));
    gif.on('finished', resolve);
    gif.on('error', reject);
    gif.render();
  });
}
