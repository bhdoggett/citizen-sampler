// Fetch a URL and decode to an AudioBuffer
export async function decodeAudioUrl(url: string): Promise<AudioBuffer> {
  const arrayBuffer = await fetch(url).then((r) => r.arrayBuffer());
  const audioCtx = new AudioContext();
  return audioCtx.decodeAudioData(arrayBuffer);
}

// Downsample channel 0 to `numBins` peak values (0–1)
export function extractPeaks(
  buffer: AudioBuffer,
  numBins: number,
  normalize: boolean
): Float32Array {
  const data = buffer.getChannelData(0);
  const blockSize = Math.floor(data.length / numBins);
  const peaks = new Float32Array(numBins);
  let maxPeak = 0;
  for (let i = 0; i < numBins; i++) {
    let max = 0;
    for (let j = 0; j < blockSize; j++) {
      const v = Math.abs(data[i * blockSize + j]);
      if (v > max) max = v;
    }
    peaks[i] = max;
    if (max > maxPeak) maxPeak = max;
  }
  if (normalize && maxPeak > 0) {
    for (let i = 0; i < numBins; i++) peaks[i] /= maxPeak;
  }
  return peaks;
}

// Draw symmetric waveform bars on a canvas.
// Reads canvas.clientWidth/clientHeight as logical (CSS) dimensions and scales
// the backing buffer by devicePixelRatio so bars are crisp on HiDPI displays.
export function drawWaveform(
  canvas: HTMLCanvasElement,
  peaks: Float32Array,
  color: string
): void {
  const dpr = window.devicePixelRatio || 1;
  const lw = canvas.clientWidth;
  const lh = canvas.clientHeight;
  if (!lw || !lh) return;

  canvas.width = lw * dpr;
  canvas.height = lh * dpr;

  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const mid = lh / 2;
  ctx.clearRect(0, 0, lw, lh);
  ctx.fillStyle = color;

  // One bar per logical pixel, always 1px wide — prevents sub-pixel
  // anti-aliasing (gradient look) and bar expansion when zoomed in.
  const numBars = Math.round(lw);

  for (let i = 0; i < numBars; i++) {
    let peak: number;
    if (numBars <= peaks.length) {
      // Downsampling: take loudest peak in merged range to preserve transients.
      const start = Math.floor((i / numBars) * peaks.length);
      const end = Math.min(Math.ceil(((i + 1) / numBars) * peaks.length), peaks.length);
      peak = 0;
      for (let j = start; j < end; j++) {
        if (peaks[j] > peak) peak = peaks[j];
      }
    } else {
      // Upsampling: nearest-neighbor into pre-computed peaks.
      peak = peaks[Math.round((i / numBars) * (peaks.length - 1))];
    }
    const barHeight = peak * lh;
    ctx.fillRect(i, mid - barHeight / 2, 1, barHeight);
  }
}
