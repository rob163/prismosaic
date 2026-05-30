export const APP_VERSION = "2026.05.12.3";

export const OUTPUT_PRESETS = {
  square: { label: "Square", width: 1080, height: 1080 },
  portrait: { label: "Portrait", width: 1080, height: 1350 },
  story: { label: "Story / Reel", width: 1080, height: 1920 },
  landscape: { label: "Landscape", width: 1920, height: 1080 },
};

export const COLOR_PRESETS = {
  neon: {
    label: "Neon Glass",
    colors: ["#ff3f7f", "#12d8ff", "#ffe85c"],
    blendMode: "screen",
  },
  signal: {
    label: "Signal RGB",
    colors: ["#ff5640", "#40dc60", "#4884ff"],
    blendMode: "screen",
  },
  printCmy: {
    label: "Print CMY",
    colors: ["#00c8d7", "#ef4bb8", "#f3d34a"],
    blendMode: "multiply",
  },
  candy: {
    label: "Candy Split",
    colors: ["#ff6bd6", "#56f5ff", "#f8ff5c"],
    blendMode: "lighter",
  },
  dusk: {
    label: "Dusk Glass",
    colors: ["#f97373", "#c084fc", "#38bdf8"],
    blendMode: "screen",
  },
};

export const DEFAULT_SETTINGS = {
  outputPreset: "square",
  fitMode: "cover",
  backgroundMode: "blur",
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  gridSize: 28,
  tilesPerFrame: 48,
  frameInterval: 80,
  tileScale: 1.08,
  sourceJitter: 0.12,
  colorStrength: 0.28,
  colorPreset: "neon",
  channelSources: [0, 0, 0],
  loopDuration: 5,
  fps: 30,
};

export const CONTROL_CONFIG = {
  zoom: { min: 70, max: 180, step: 1, valueScale: 100 },
  offsetX: { min: -50, max: 50, step: 1, valueScale: 100 },
  offsetY: { min: -50, max: 50, step: 1, valueScale: 100 },
  grid: { min: 8, max: 64, step: 1, valueKey: "gridSize" },
  tilesPerFrame: { min: 1, max: 220, step: 1 },
  frameInterval: { min: 20, max: 500, step: 10 },
  tileScale: { min: 70, max: 180, step: 1, valueScale: 100 },
  sourceJitter: { min: 0, max: 100, step: 1, valueScale: 100 },
  colorStrength: { min: 0, max: 80, step: 1, valueScale: 100 },
  loopDuration: { min: 1, max: 10, step: 1 },
};
