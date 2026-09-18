interface SnapshotOptions {
  maxWidth?: number;
  quality?: number;
  mirror?: boolean;
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Snapshot encoding failed."))), "image/jpeg", quality);
  });
}

/** Current video frame → JPEG Blob, mirrored like the preview, downscaled to `maxWidth`. */
export async function captureSnapshot(video: HTMLVideoElement, opts: SnapshotOptions = {}): Promise<Blob> {
  const { maxWidth = 720, quality = 0.8, mirror = true } = opts;
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) throw new Error("Video has no frame yet.");
  const scale = Math.min(1, maxWidth / vw);
  const w = Math.round(vw * scale);
  const h = Math.round(vh * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D not available.");
  if (mirror) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, w, h);
  return canvasToJpeg(canvas, quality);
}

/** Tiny black JPEG used when the camera frame could not be read, so onCapture always gets a Blob. */
export async function blankSnapshot(): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 16, 16);
  }
  return canvasToJpeg(canvas, 0.5);
}
