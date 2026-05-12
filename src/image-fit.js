export async function loadImageFile(file) {
  const bitmap =
    typeof createImageBitmap === "function"
      ? await createImageBitmap(file, { imageOrientation: "from-image" })
      : await loadImageElement(file);
  return {
    name: file.name,
    bitmap,
    width: bitmap.width,
    height: bitmap.height,
  };
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not load ${file.name}`));
    };
    image.src = url;
  });
}

export function createDemoImage(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#161616");
  gradient.addColorStop(0.35, "#4267ff");
  gradient.addColorStop(0.7, "#ff3b8f");
  gradient.addColorStop(1, "#ffe566");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 0.8;
  for (let index = 0; index < 28; index += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = width * (0.03 + Math.random() * 0.12);
    const spot = ctx.createRadialGradient(x, y, 0, x, y, radius);
    spot.addColorStop(0, "rgba(255,255,255,0.7)");
    spot.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = spot;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(0,0,0,0.26)";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${Math.round(width * 0.09)}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Prismosaic", width / 2, height / 2);

  return {
    name: "Demo gradient",
    bitmap: canvas,
    width,
    height,
  };
}

export function normalizeImages(images, options) {
  const { width, height, fitMode, backgroundMode, zoom, offsetX, offsetY } = options;
  return images.map((image) =>
    renderImageToCanvas(image.bitmap, {
      width,
      height,
      fitMode,
      backgroundMode,
      zoom,
      offsetX,
      offsetY,
    }),
  );
}

function renderImageToCanvas(image, options) {
  const { width, height, fitMode, backgroundMode, zoom, offsetX, offsetY } = options;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  drawBackground(ctx, image, width, height, backgroundMode);

  const imageRatio = image.width / image.height;
  const outputRatio = width / height;
  const baseScale =
    fitMode === "contain"
      ? imageRatio > outputRatio
        ? width / image.width
        : height / image.height
      : imageRatio > outputRatio
        ? height / image.height
        : width / image.width;

  const drawWidth = image.width * baseScale * zoom;
  const drawHeight = image.height * baseScale * zoom;
  const drawX = (width - drawWidth) / 2 + offsetX;
  const drawY = (height - drawHeight) / 2 + offsetY;

  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  return canvas;
}

function drawBackground(ctx, image, width, height, mode) {
  ctx.fillStyle = "#050607";
  ctx.fillRect(0, 0, width, height);
  if (mode !== "blur") return;

  const imageRatio = image.width / image.height;
  const outputRatio = width / height;
  const scale = imageRatio > outputRatio ? height / image.height : width / image.width;
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;

  ctx.save();
  ctx.filter = "blur(36px) saturate(1.25)";
  ctx.globalAlpha = 0.62;
  ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
  ctx.restore();
}
