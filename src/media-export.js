import {
  createWatermarkedCanvas,
  paintWatermarkedFrame,
  shouldApplyExportWatermark,
} from "./watermark.js";

export function downloadCanvasPng(canvas, filename = timestampedFilename("prismosaic", "png")) {
  const exportCanvas = shouldApplyExportWatermark() ? createWatermarkedCanvas(canvas) : canvas;
  exportCanvas.toBlob((blob) => {
    if (!blob) return;
    downloadBlob(blob, filename);
  }, "image/png");
}

export async function recordCanvasVideo(canvas, options) {
  const { duration, fps, mimeType, onFrame, onStatus } = options;
  if (!canvas.captureStream || typeof MediaRecorder === "undefined") {
    throw new Error("This browser does not support canvas video recording.");
  }

  const watermark = shouldApplyExportWatermark();
  const captureCanvas = watermark ? createWatermarkedCanvas(canvas) : canvas;
  const stream = captureCanvas.captureStream(fps);
  const recordingMimeType = pickMimeType(mimeType);
  if (mimeType && recordingMimeType !== mimeType) {
    throw new Error("This browser does not support the selected video type.");
  }
  const recorderOptions = {
    videoBitsPerSecond: getVideoBitrate(canvas, fps),
    ...(recordingMimeType ? { mimeType: recordingMimeType } : {}),
  };
  const recorder = new MediaRecorder(stream, recorderOptions);
  const chunks = [];
  const frameInterval = 1000 / fps;
  const totalFrames = Math.max(1, Math.round(duration * fps));

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const stopped = new Promise((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start();

  for (let frame = 0; frame < totalFrames; frame += 1) {
    onFrame(frame, totalFrames);
    if (watermark) paintWatermarkedFrame(captureCanvas, canvas);
    if (onStatus) onStatus(`Recording ${Math.round(((frame + 1) / totalFrames) * 100)}%`);
    await sleep(frameInterval);
  }

  recorder.stop();
  await stopped;
  stream.getTracks().forEach((track) => track.stop());

  return new Blob(chunks, { type: recordingMimeType || "video/webm" });
}

export const recordCanvasWebm = recordCanvasVideo;

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function timestampedFilename(baseName, extension, date = new Date()) {
  const timestamp = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
  return `${baseName}-${timestamp}.${extension}`;
}

function pickMimeType(preferredMimeType) {
  if (preferredMimeType && MediaRecorder.isTypeSupported(preferredMimeType)) return preferredMimeType;
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function getVideoBitrate(canvas, fps) {
  const megapixels = (canvas.width * canvas.height) / 1_000_000;
  return Math.round(Math.max(8_000_000, megapixels * fps * 250_000));
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
