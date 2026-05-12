export function downloadCanvasPng(canvas, filename = "prismosaic.png") {
  canvas.toBlob((blob) => {
    if (!blob) return;
    downloadBlob(blob, filename);
  }, "image/png");
}

export async function recordCanvasWebm(canvas, options) {
  const { duration, fps, onFrame, onStatus } = options;
  if (!canvas.captureStream || typeof MediaRecorder === "undefined") {
    throw new Error("This browser does not support canvas video recording.");
  }

  const stream = canvas.captureStream(fps);
  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
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
    if (onStatus) onStatus(`Recording ${Math.round(((frame + 1) / totalFrames) * 100)}%`);
    await sleep(frameInterval);
  }

  recorder.stop();
  await stopped;
  stream.getTracks().forEach((track) => track.stop());

  return new Blob(chunks, { type: mimeType || "video/webm" });
}

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

function pickMimeType() {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

