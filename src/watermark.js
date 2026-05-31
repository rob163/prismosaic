export const EXPORT_WATERMARK = Object.freeze({
  enabled: true,
  text: "Prismosaic",
  color: "#ffffff",
  opacity: 0.82,
  fontRatio: 0.021,
  topRatio: 0.04,
});

export function shouldApplyExportWatermark(pageLocation = getPageLocation()) {
  if (!pageLocation || !["http:", "https:"].includes(pageLocation.protocol)) return false;
  return !isLocalHostname(pageLocation.hostname);
}

export function createWatermarkedCanvas(sourceCanvas, watermark = EXPORT_WATERMARK) {
  const canvas = document.createElement("canvas");
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;
  paintWatermarkedFrame(canvas, sourceCanvas, watermark);
  return canvas;
}

export function paintWatermarkedFrame(targetCanvas, sourceCanvas, watermark = EXPORT_WATERMARK) {
  const ctx = targetCanvas.getContext("2d", { alpha: false });
  if (!ctx) return;

  ctx.drawImage(sourceCanvas, 0, 0);
  drawExportWatermark(ctx, targetCanvas.width, targetCanvas.height, watermark);
}

export function drawExportWatermark(ctx, width, height, watermark = EXPORT_WATERMARK) {
  if (!watermark?.enabled || !watermark.text) return;

  const shortSide = Math.max(1, Math.min(width, height));
  const fontSize = Math.max(18, Math.round(shortSide * (watermark.fontRatio || EXPORT_WATERMARK.fontRatio)));
  const y = Math.round(height * (watermark.topRatio || EXPORT_WATERMARK.topRatio));

  ctx.save();
  ctx.globalAlpha = watermark.opacity ?? EXPORT_WATERMARK.opacity;
  ctx.fillStyle = watermark.color || EXPORT_WATERMARK.color;
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(watermark.text, width / 2, y);
  ctx.restore();
}

function getPageLocation() {
  if (typeof window === "undefined") return null;
  return window.location;
}

function isLocalHostname(hostname) {
  const normalized = hostname.replace(/^\[(.*)\]$/, "$1").toLowerCase();
  if (
    normalized === "localhost" ||
    normalized === "0.0.0.0" ||
    normalized === "::1" ||
    normalized.endsWith(".local")
  ) {
    return true;
  }

  if (normalized.startsWith("127.")) return true;
  if (normalized.startsWith("10.")) return true;
  if (normalized.startsWith("192.168.")) return true;

  const private172 = normalized.match(/^172\.(\d+)\./);
  if (private172) {
    const secondOctet = Number(private172[1]);
    return secondOctet >= 16 && secondOctet <= 31;
  }

  return false;
}
