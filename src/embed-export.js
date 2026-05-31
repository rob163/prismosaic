import { downloadBlob, timestampedFilename } from "./media-export.js?v=20260531-2";
import { createChannelSchedulerRuntimeSource } from "./channel-scheduler.js?v=20260531-1";
import { EXPORT_WATERMARK, shouldApplyExportWatermark } from "./watermark.js";

const ASSET_BASE_PATH = "/prismosaic";

export async function exportNextEmbedZip({ appVersion, sources, recipe }) {
  if (!sources.length) {
    throw new Error("No source images are available for embed export.");
  }

  const assets = await Promise.all(
    sources.map(async (source, index) => {
      const { blob, extension } = await canvasToAssetBlob(source);
      const filename = `source-${index}.${extension}`;
      return {
        filename,
        path: `public/prismosaic/${filename}`,
        blob,
      };
    }),
  );

  const exportRecipe = {
    version: appVersion,
    width: recipe.width,
    height: recipe.height,
    assetBasePath: ASSET_BASE_PATH,
    assets: assets.map((asset) => asset.filename),
    watermark: shouldApplyExportWatermark() ? EXPORT_WATERMARK : undefined,
    settings: recipe.settings,
  };

  const files = [
    {
      path: "README.md",
      content: createReadme(),
    },
    {
      path: "components/prismosaic/PrismosaicLoop.tsx",
      content: createReactComponentSource(),
    },
    {
      path: "components/prismosaic/prismosaic-recipe.ts",
      content: createRecipeSource(exportRecipe),
    },
    {
      path: "lib/prismosaic/mount-prismosaic-loop.ts",
      content: createRuntimeSource(),
    },
    ...assets.map((asset) => ({
      path: asset.path,
      blob: asset.blob,
    })),
  ];

  const zip = await createZip(files);
  downloadBlob(zip, timestampedFilename("prismosaic-next-embed", "zip"));
}

function canvasToAssetBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (webpBlob) => {
        if (webpBlob) {
          resolve({ blob: webpBlob, extension: "webp" });
          return;
        }

        canvas.toBlob((pngBlob) => {
          if (!pngBlob) {
            reject(new Error("Could not encode embed source image."));
            return;
          }
          resolve({ blob: pngBlob, extension: "png" });
        }, "image/png");
      },
      "image/webp",
      0.92,
    );
  });
}

function createRecipeSource(recipe) {
  return `${createRecipeTypeSource()}

export const prismosaicRecipe = ${JSON.stringify(recipe, null, 2)} satisfies PrismosaicRecipe;
`;
}

function createRecipeTypeSource() {
  return `export type PrismosaicChannel = {
  color: string;
  enabled: boolean;
  sourceIndex: number;
};

export type PrismosaicWatermark = {
  enabled: boolean;
  text: string;
  color: string;
  opacity: number;
  fontRatio: number;
  topRatio: number;
};

export type PrismosaicRecipe = {
  version: string;
  width: number;
  height: number;
  assetBasePath: string;
  assets: string[];
  watermark?: PrismosaicWatermark;
  settings: {
    gridSize: number;
    tilesPerFrame: number;
    frameInterval: number;
    tileScale: number;
    sourceJitter: number;
    colorStrength: number;
    blendMode: GlobalCompositeOperation;
    channels: PrismosaicChannel[];
  };
};
`;
}

function createReactComponentSource() {
  return `"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef } from "react";
import { mountPrismosaicLoop } from "../../lib/prismosaic/mount-prismosaic-loop";
import { prismosaicRecipe, type PrismosaicRecipe } from "./prismosaic-recipe";

type PrismosaicLoopProps = {
  ariaLabel?: string;
  assetBasePath?: string;
  className?: string;
  recipe?: PrismosaicRecipe;
  style?: CSSProperties;
  paused?: boolean;
};

export function PrismosaicLoop({
  ariaLabel = "Prismosaic animated mosaic",
  assetBasePath,
  className,
  recipe = prismosaicRecipe,
  style,
  paused = false,
}: PrismosaicLoopProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRecipe = useMemo(
    () => (assetBasePath ? { ...recipe, assetBasePath } : recipe),
    [assetBasePath, recipe],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const loop = mountPrismosaicLoop(canvas, activeRecipe, { paused });
    return () => loop.destroy();
  }, [activeRecipe, paused]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label={ariaLabel}
      style={{
        display: "block",
        width: "100%",
        height: "auto",
        aspectRatio: \`\${activeRecipe.width} / \${activeRecipe.height}\`,
        ...style,
      }}
    />
  );
}
`;
}

function createRuntimeSource() {
  return `${createRecipeTypeSource()}

${createChannelSchedulerRuntimeSource()}

type PrismosaicLoopOptions = {
  assetBasePath?: string;
  paused?: boolean;
};

type PrismosaicLoopHandle = {
  start: () => void;
  stop: () => void;
  renderStill: () => void;
  destroy: () => void;
};

type LoadedSource = HTMLImageElement;

export function mountPrismosaicLoop(
  canvas: HTMLCanvasElement,
  recipe: PrismosaicRecipe,
  options: PrismosaicLoopOptions = {},
): PrismosaicLoopHandle {
  const ctx = getCanvasContext(canvas);
  if (!ctx) {
    return createNoopHandle();
  }

  if (typeof window === "undefined" || typeof document === "undefined" || typeof Image === "undefined") {
    console.warn("Prismosaic loop requires a browser-like environment with window, document, and Image.");
    return createNoopHandle();
  }

  const activeRecipe = options.assetBasePath ? { ...recipe, assetBasePath: options.assetBasePath } : recipe;
  const frameCanvas = document.createElement("canvas");
  const frameCtx = getCanvasContext(frameCanvas);
  if (!frameCtx) {
    return createNoopHandle();
  }

  canvas.width = activeRecipe.width;
  canvas.height = activeRecipe.height;
  frameCanvas.width = activeRecipe.width;
  frameCanvas.height = activeRecipe.height;

  let sources: LoadedSource[] = [];
  let sourceMap: number[][] = [];
  let protectionMap: number[][] = [];
  let timer = 0;
  let tickCount = 0;
  let destroyed = false;

  loadRecipeSources(activeRecipe)
    .then((loadedSources) => {
      if (destroyed) return;
      sources = loadedSources;
      renderStill();
      if (!options.paused) start();
    })
    .catch((error) => {
      console.error("Could not start Prismosaic loop.", error);
    });

  function start() {
    stop();
    timer = window.setInterval(() => {
      drawRandomTiles(activeRecipe.settings.tilesPerFrame);
    }, activeRecipe.settings.frameInterval);
  }

  function stop() {
    window.clearInterval(timer);
    timer = 0;
  }

  function destroy() {
    destroyed = true;
    stop();
  }

  function renderStill() {
    clear();
    randomizeSourceMap();
    const { cols, rows } = getGridDimensions(activeRecipe);
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        drawTile(col, row);
      }
    }
    presentFrame();
  }

  function clear() {
    frameCtx.fillStyle = "#050607";
    frameCtx.fillRect(0, 0, frameCanvas.width, frameCanvas.height);
  }

  function randomizeSourceMap() {
    const activeChannels = getActiveChannels(activeRecipe, sources);
    const { cols, rows } = getGridDimensions(activeRecipe);
    fillSourceMap(sourceMap, rows, cols, activeChannels.length);
    resetProtectionMap(protectionMap, rows, cols);
    tickCount = 0;
  }

  function drawRandomTiles(count: number) {
    if (!sources.length) return;
    const activeChannels = getActiveChannels(activeRecipe, sources);
    const { cols, rows } = getGridDimensions(activeRecipe);
    tickCount += 1;
    const updates = assignRandomTileUpdates({
      sourceMap,
      protectionMap,
      rows,
      cols,
      activeChannelCount: activeChannels.length,
      currentTick: tickCount,
      count,
    });
    for (const { row, col } of updates) {
      drawTile(col, row);
    }
    presentFrame();
  }

  function drawTile(col: number, row: number) {
    if (!sources.length) return;

    const { cols, rows } = getGridDimensions(activeRecipe);
    const [x0, x1] = tileBounds(col, cols, canvas.width);
    const [y0, y1] = tileBounds(row, rows, canvas.height);
    const cellWidth = x1 - x0;
    const cellHeight = y1 - y0;
    if (cellWidth <= 0 || cellHeight <= 0) return;

    const tileScale = activeRecipe.settings.tileScale;
    const tileWidth = Math.max(1, Math.round(cellWidth * tileScale));
    const tileHeight = Math.max(1, Math.round(cellHeight * tileScale));
    const centerX = (x0 + x1) / 2;
    const centerY = (y0 + y1) / 2;
    const dx = Math.round(centerX - tileWidth / 2);
    const dy = Math.round(centerY - tileHeight / 2);
    const jitterX = Math.round(cellWidth * activeRecipe.settings.sourceJitter);
    const jitterY = Math.round(cellHeight * activeRecipe.settings.sourceJitter);
    const sx = clamp(
      Math.round(centerX - tileWidth / 2) + randomInt(-jitterX, jitterX),
      0,
      Math.max(0, canvas.width - tileWidth),
    );
    const sy = clamp(
      Math.round(centerY - tileHeight / 2) + randomInt(-jitterY, jitterY),
      0,
      Math.max(0, canvas.height - tileHeight),
    );

    const activeChannels = getActiveChannels(activeRecipe, sources);
    const channelIndex = sourceMap[row]?.[col] ?? pickChannelIndex(activeChannels);
    const channel = activeChannels[channelIndex] || activeChannels[0];
    const source = sources[channel.sourceIndex];

    if (tileScale <= 1) {
      frameCtx.fillStyle = "#050607";
      frameCtx.fillRect(x0, y0, cellWidth, cellHeight);
    }

    frameCtx.drawImage(source, sx, sy, tileWidth, tileHeight, dx, dy, tileWidth, tileHeight);
    paintTint(dx, dy, tileWidth, tileHeight, channel.color);
    if (tileScale < 1) {
      paintTileLines(dx, dy, tileWidth, tileHeight);
    }
  }

  function paintTint(x: number, y: number, width: number, height: number, hex: string) {
    frameCtx.save();
    frameCtx.globalCompositeOperation = activeRecipe.settings.blendMode;
    frameCtx.globalAlpha = activeRecipe.settings.colorStrength;
    frameCtx.fillStyle = hex;
    frameCtx.fillRect(x, y, width, height);
    frameCtx.restore();
  }

  function paintTileLines(x: number, y: number, width: number, height: number) {
    frameCtx.fillStyle = "rgba(0,0,0,0.34)";
    frameCtx.fillRect(x, y, width, 1);
    frameCtx.fillRect(x, y, 1, height);
  }

  function presentFrame() {
    ctx.drawImage(frameCanvas, 0, 0);
    drawWatermark();
  }

  function drawWatermark() {
    const watermark = activeRecipe.watermark;
    if (!watermark?.enabled || !watermark.text) return;

    const shortSide = Math.max(1, Math.min(canvas.width, canvas.height));
    const fontSize = Math.max(18, Math.round(shortSide * watermark.fontRatio));
    const y = Math.round(canvas.height * watermark.topRatio);

    ctx.save();
    ctx.globalAlpha = watermark.opacity;
    ctx.fillStyle = watermark.color;
    ctx.font = \`600 \${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif\`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(watermark.text, canvas.width / 2, y);
    ctx.restore();
  }

  return { start, stop, renderStill, destroy };
}

function getCanvasContext(canvas: HTMLCanvasElement) {
  try {
    return canvas.getContext?.("2d", { alpha: false }) ?? null;
  } catch (error) {
    console.warn("Prismosaic loop could not create a 2D canvas context.", error);
    return null;
  }
}

function createNoopHandle(): PrismosaicLoopHandle {
  return {
    start() {},
    stop() {},
    renderStill() {},
    destroy() {},
  };
}

async function loadRecipeSources(recipe: PrismosaicRecipe): Promise<LoadedSource[]> {
  return Promise.all(
    recipe.assets.map((asset) => loadImage(joinAssetPath(recipe.assetBasePath, asset))),
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(\`Could not load \${src}\`));
    image.src = src;
  });
}

function joinAssetPath(basePath: string, asset: string) {
  return \`\${basePath.replace(/\\/$/, "")}/\${asset.replace(/^\\//, "")}\`;
}

function getActiveChannels(recipe: PrismosaicRecipe, sources: LoadedSource[]) {
  const active = recipe.settings.channels
    .filter((channel) => channel.enabled && sources[channel.sourceIndex])
    .map((channel) => ({
      color: channel.color,
      sourceIndex: channel.sourceIndex,
    }));

  if (active.length > 0) return active;
  return [{ color: "#ffffff", sourceIndex: 0 }];
}

function getGridDimensions(recipe: PrismosaicRecipe) {
  const longSideCount = Math.max(1, Math.round(recipe.settings.gridSize || 1));
  if (recipe.width >= recipe.height) {
    return {
      cols: longSideCount,
      rows: Math.max(1, Math.round(longSideCount * (recipe.height / recipe.width))),
    };
  }
  return {
    cols: Math.max(1, Math.round(longSideCount * (recipe.width / recipe.height))),
    rows: longSideCount,
  };
}

function tileBounds(index: number, count: number, size: number) {
  return [
    Math.round((index * size) / count),
    Math.round(((index + 1) * size) / count),
  ];
}

function randomInt(min: number, max: number) {
  if (max <= min) return min;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
`;
}

function createReadme() {
  return `# Prismosaic Embed Export

This folder is a self-contained animated Prismosaic embed. It includes the
rendering code, the frozen recipe from the Prismosaic editor, and the prepared
image assets used by the animation.

The exported animation is intentionally not a package. Copy the files into your
TypeScript project and import the component or the framework-neutral mount
function.

## Files

\`\`\`txt
components/prismosaic/PrismosaicLoop.tsx
components/prismosaic/prismosaic-recipe.ts
lib/prismosaic/mount-prismosaic-loop.ts
public/prismosaic/source-0.webp
README.md
\`\`\`

If the editor used more than one source image, the \`public/prismosaic/\` folder
will contain \`source-1.webp\`, \`source-2.webp\`, and so on.

## Recommended Project Layout

After copying, keep this shape in your target project:

\`\`\`txt
your-project/
  src/
    components/
      prismosaic/
        PrismosaicLoop.tsx
        prismosaic-recipe.ts
    lib/
      prismosaic/
        mount-prismosaic-loop.ts
  public/
    prismosaic/
      source-0.webp
\`\`\`

If your project does not use a \`src/\` directory, this root-level layout also
works:

\`\`\`txt
your-project/
  components/prismosaic/...
  lib/prismosaic/...
  public/prismosaic/source-0.webp
\`\`\`

The important part is that \`components/\` and \`lib/\` stay at the same relative
level, and that the image files stay publicly reachable under
\`/prismosaic/source-0.webp\`.

## Next.js App Router

Copy the exported \`components/\`, \`lib/\`, and \`public/\` folders into your
project root, or copy \`components/\` and \`lib/\` under \`src/\` if that is how
your project is organized.

Use the component from any Server or Client Component:

\`\`\`tsx
import { PrismosaicLoop } from "@/components/prismosaic/PrismosaicLoop";

export default function Page() {
  return (
    <main>
      <PrismosaicLoop />
    </main>
  );
}
\`\`\`

The exported component already contains \`"use client"\`, so it can safely use
Canvas, timers, and browser image loading inside the App Router.

You can customize the accessible label and asset path without editing the recipe
file:

\`\`\`tsx
<PrismosaicLoop
  ariaLabel="Animated mosaic study"
  assetBasePath="/my-site/prismosaic"
/>
\`\`\`

Advanced usage can pass a different recipe object:

\`\`\`tsx
import { PrismosaicLoop } from "@/components/prismosaic/PrismosaicLoop";
import { prismosaicRecipe } from "@/components/prismosaic/prismosaic-recipe";

export default function Page() {
  return <PrismosaicLoop recipe={prismosaicRecipe} />;
}
\`\`\`

## Adjusting Display Size

The internal canvas keeps the exported recipe size. You normally only adjust the
display box around it:

\`\`\`tsx
<PrismosaicLoop className="w-full max-w-[720px]" />
\`\`\`

Or with inline style:

\`\`\`tsx
<PrismosaicLoop style={{ width: 480 }} />
\`\`\`

For a responsive block without Tailwind:

\`\`\`tsx
<div style={{ width: "min(100%, 720px)" }}>
  <PrismosaicLoop />
</div>
\`\`\`

## React + Vite

Copy the same \`components/\`, \`lib/\`, and \`public/\` folders into your Vite
project. If your project does not use the \`@\` alias, change the import in your
page/component to a relative path:

\`\`\`tsx
import { PrismosaicLoop } from "./components/prismosaic/PrismosaicLoop";
\`\`\`

The exported component itself uses relative imports, so it does not require a
path alias internally.

## Vue, Svelte, Solid, Astro, or Plain TypeScript

Use the framework-neutral mount function instead of the React component.

\`\`\`ts
import { mountPrismosaicLoop } from "./lib/prismosaic/mount-prismosaic-loop";
import { prismosaicRecipe } from "./components/prismosaic/prismosaic-recipe";

const canvas = document.querySelector<HTMLCanvasElement>("#prismosaic");

if (canvas) {
  const loop = mountPrismosaicLoop(canvas, prismosaicRecipe);

  // Optional cleanup when your framework unmounts the view:
  // loop.destroy();
}
\`\`\`

HTML:

\`\`\`html
<canvas id="prismosaic" style="display:block;width:100%;height:auto"></canvas>
\`\`\`

In component frameworks, call \`mountPrismosaicLoop\` from the framework's
browser-only mount hook, then call \`loop.destroy()\` from the unmount hook.

## Asset Paths

The recipe points to assets under:

\`\`\`txt
/prismosaic/source-0.webp
\`\`\`

That path works when the exported \`public/prismosaic/\` folder is copied into a
Next.js, Vite, Astro, or similar project.

If your app is deployed under a subpath or you place files somewhere else, edit
\`assetBasePath\` in:

\`\`\`txt
components/prismosaic/prismosaic-recipe.ts
\`\`\`

For example:

\`\`\`ts
assetBasePath: "/my-site/prismosaic"
\`\`\`

## Pausing

React:

\`\`\`tsx
<PrismosaicLoop paused />
\`\`\`

Framework-neutral:

\`\`\`ts
const loop = mountPrismosaicLoop(canvas, prismosaicRecipe, {
  assetBasePath: "/my-site/prismosaic",
  paused: true,
});
loop.renderStill();
loop.start();
loop.stop();
\`\`\`

## Troubleshooting

### The canvas is blank

Open the first exported asset directly in the browser:

\`\`\`txt
/prismosaic/source-0.webp
\`\`\`

If that URL returns 404, the \`public/prismosaic/\` folder is missing or copied to
the wrong place. Copy it to your app's public/static asset folder, or update
\`assetBasePath\`.

### The app is deployed under a subpath

Pass an explicit asset path:

\`\`\`tsx
<PrismosaicLoop assetBasePath="/my-subpath/prismosaic" />
\`\`\`

Or edit \`assetBasePath\` in \`components/prismosaic/prismosaic-recipe.ts\`.

### Vitest or Jest says getContext is not implemented

Browser test environments such as jsdom may not implement Canvas 2D. The runtime
returns a no-op handle when it cannot create a 2D context, but tests that assert
canvas behavior should still add a mock:

\`\`\`ts
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  drawImage: vi.fn(),
  fillRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
}));
\`\`\`

Use \`jest.fn\` instead of \`vi.fn\` in Jest.

### TypeScript reports errors from the exported source folder

Copy only the generated \`components/\`, \`lib/\`, and \`public/\` folders into
your app. Do not leave an extra unmodified export or bootstrap directory inside
your project's TypeScript include paths. If you keep the downloaded export folder
for reference, place it outside the app source tree or exclude it in
\`tsconfig.json\`.

### The animation works locally but not after deploy

Check the deployed URL for \`/prismosaic/source-0.webp\` first. Most production
issues are asset-path issues rather than React or Canvas issues.

## Notes

- No npm package is required.
- No server-side rendering is required for the animation itself.
- The source images are already normalized by Prismosaic before export.
- The loop uses Canvas 2D and \`window.setInterval\`.
- The animation uses fresh randomness at runtime, so it will have the same style
  and assets as the editor preview but not the exact same tile sequence.
`;
}

async function createZip(files) {
  const entries = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encodeUtf8(file.path);
    const contentBytes = await getFileBytes(file);
    const crc = crc32(contentBytes);
    const localHeader = createLocalFileHeader(nameBytes, contentBytes.length, crc);

    entries.push({
      nameBytes,
      contentBytes,
      crc,
      offset,
      localHeader,
    });
    offset += localHeader.length + contentBytes.length;
  }

  const centralDirectory = entries.map((entry) => createCentralDirectoryHeader(entry));
  const centralDirectorySize = centralDirectory.reduce((total, header) => total + header.length, 0);
  const end = createEndOfCentralDirectory(entries.length, centralDirectorySize, offset);

  return new Blob(
    entries.flatMap((entry) => [entry.localHeader, entry.contentBytes]).concat(centralDirectory, end),
    { type: "application/zip" },
  );
}

async function getFileBytes(file) {
  if (file.blob) {
    return new Uint8Array(await file.blob.arrayBuffer());
  }
  return encodeUtf8(file.content);
}

function createLocalFileHeader(nameBytes, size, crc) {
  const header = new Uint8Array(30 + nameBytes.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, size, true);
  view.setUint32(22, size, true);
  view.setUint16(26, nameBytes.length, true);
  view.setUint16(28, 0, true);
  header.set(nameBytes, 30);
  return header;
}

function createCentralDirectoryHeader(entry) {
  const header = new Uint8Array(46 + entry.nameBytes.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint16(14, 0, true);
  view.setUint32(16, entry.crc, true);
  view.setUint32(20, entry.contentBytes.length, true);
  view.setUint32(24, entry.contentBytes.length, true);
  view.setUint16(28, entry.nameBytes.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, entry.offset, true);
  header.set(entry.nameBytes, 46);
  return header;
}

function createEndOfCentralDirectory(entryCount, centralDirectorySize, centralDirectoryOffset) {
  const header = new Uint8Array(22);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, entryCount, true);
  view.setUint16(10, entryCount, true);
  view.setUint32(12, centralDirectorySize, true);
  view.setUint32(16, centralDirectoryOffset, true);
  view.setUint16(20, 0, true);
  return header;
}

function encodeUtf8(value) {
  return new TextEncoder().encode(value);
}

const CRC_TABLE = createCrcTable();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createCrcTable() {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
}
