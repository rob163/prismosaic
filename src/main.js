import { normalizeImages, loadImageFile, createDemoImage } from "./image-fit.js";
import { MosaicEngine } from "./mosaic-engine.js";
import { downloadBlob, downloadCanvasPng, recordCanvasWebm, timestampedFilename } from "./media-export.js";
import {
  APP_VERSION,
  COLOR_PRESETS,
  CONTROL_CONFIG,
  DEFAULT_SETTINGS,
  OUTPUT_PRESETS,
} from "./config.js";

const elements = {
  canvas: document.querySelector("#mosaic"),
  fileInput: document.querySelector("#fileInput"),
  uploadLabel: document.querySelector("#uploadLabel"),
  status: document.querySelector("#status"),
  outputPreset: document.querySelector("#outputPreset"),
  fitMode: document.querySelector("#fitMode"),
  backgroundMode: document.querySelector("#backgroundMode"),
  colorPreset: document.querySelector("#colorPreset"),
  channelColors: [
    document.querySelector("#channelColor0"),
    document.querySelector("#channelColor1"),
    document.querySelector("#channelColor2"),
  ],
  channelSources: [
    document.querySelector("#channelSource0"),
    document.querySelector("#channelSource1"),
    document.querySelector("#channelSource2"),
  ],
  grid: document.querySelector("#grid"),
  gridValue: document.querySelector("#gridValue"),
  tilesPerFrame: document.querySelector("#tilesPerFrame"),
  tilesValue: document.querySelector("#tilesValue"),
  frameInterval: document.querySelector("#frameInterval"),
  intervalValue: document.querySelector("#intervalValue"),
  tileScale: document.querySelector("#tileScale"),
  scaleValue: document.querySelector("#scaleValue"),
  sourceJitter: document.querySelector("#sourceJitter"),
  jitterValue: document.querySelector("#jitterValue"),
  colorStrength: document.querySelector("#colorStrength"),
  colorValue: document.querySelector("#colorValue"),
  zoom: document.querySelector("#zoom"),
  zoomValue: document.querySelector("#zoomValue"),
  offsetX: document.querySelector("#offsetX"),
  offsetXValue: document.querySelector("#offsetXValue"),
  offsetY: document.querySelector("#offsetY"),
  offsetYValue: document.querySelector("#offsetYValue"),
  loopDuration: document.querySelector("#loopDuration"),
  durationValue: document.querySelector("#durationValue"),
  reroll: document.querySelector("#reroll"),
  toggle: document.querySelector("#toggle"),
  downloadPng: document.querySelector("#downloadPng"),
  downloadWebm: document.querySelector("#downloadWebm"),
};

const state = {
  settings: { ...DEFAULT_SETTINGS },
  images: [],
  running: true,
  recording: false,
};

const engine = new MosaicEngine(elements.canvas);

initialize().catch((error) => {
  elements.status.textContent = error.message;
  console.error(error);
});

async function initialize() {
  document.documentElement.dataset.appVersion = APP_VERSION;
  applyControlConfig();
  populateSelects();
  bindEvents();
  state.images = [createDemoImage(1200, 1200)];
  await rebuild();
  engine.start();
}

function applyControlConfig() {
  for (const [id, config] of Object.entries(CONTROL_CONFIG)) {
    const input = elements[id];
    if (!input) continue;
    input.min = String(config.min);
    input.max = String(config.max);
    input.step = String(config.step);
    const settingKey = config.valueKey || id;
    const value = state.settings[settingKey];
    input.value = String(config.valueScale ? Math.round(value * config.valueScale) : value);
  }
}

function populateSelects() {
  for (const [key, preset] of Object.entries(OUTPUT_PRESETS)) {
    elements.outputPreset.add(new Option(`${preset.label} (${preset.width}x${preset.height})`, key));
  }

  for (const [key, preset] of Object.entries(COLOR_PRESETS)) {
    elements.colorPreset.add(new Option(preset.label, key));
  }

  elements.outputPreset.value = state.settings.outputPreset;
  elements.fitMode.value = state.settings.fitMode;
  elements.backgroundMode.value = state.settings.backgroundMode;
  elements.colorPreset.value = state.settings.colorPreset;
  applyColorPreset(state.settings.colorPreset);
}

function bindEvents() {
  elements.fileInput.addEventListener("change", handleFiles);
  elements.outputPreset.addEventListener("change", updateSourceSettings);
  elements.fitMode.addEventListener("change", updateSourceSettings);
  elements.backgroundMode.addEventListener("change", updateSourceSettings);
  elements.colorPreset.addEventListener("change", () => {
    applyColorPreset(elements.colorPreset.value);
    updateRenderSettings();
  });
  elements.channelColors.forEach((input) => {
    input.addEventListener("input", updateRenderSettings);
  });
  elements.channelSources.forEach((select) => {
    select.addEventListener("change", updateRenderSettings);
  });
  elements.grid.addEventListener("input", updateRenderSettings);
  elements.tilesPerFrame.addEventListener("input", updateRenderSettings);
  elements.frameInterval.addEventListener("input", updateRenderSettings);
  elements.tileScale.addEventListener("input", updateRenderSettings);
  elements.sourceJitter.addEventListener("input", updateRenderSettings);
  elements.colorStrength.addEventListener("input", updateRenderSettings);
  elements.zoom.addEventListener("input", updateSourceSettings);
  elements.offsetX.addEventListener("input", updateSourceSettings);
  elements.offsetY.addEventListener("input", updateSourceSettings);
  elements.loopDuration.addEventListener("input", updateDurationSetting);
  elements.reroll.addEventListener("click", () => engine.renderStill());
  elements.toggle.addEventListener("click", togglePlayback);
  elements.downloadPng.addEventListener("click", () => downloadCanvasPng(elements.canvas));
  elements.downloadWebm.addEventListener("click", downloadWebm);
}

async function handleFiles(event) {
  const files = [...event.target.files].slice(0, 3);
  if (!files.length) return;

  elements.status.textContent = "Loading images...";
  try {
    state.images = await Promise.all(files.map(loadImageFile));
    elements.uploadLabel.textContent = `${state.images.length} image${state.images.length === 1 ? "" : "s"} selected`;
    updateChannelSourceOptions({ resetMapping: true });
    await rebuild();
  } catch (error) {
    elements.status.textContent = error.message;
  }
}

async function updateSourceSettings() {
  readSettings();
  await rebuild();
}

function updateRenderSettings() {
  readSettings();
  applyEngineSettings();
  updateLabels();
  engine.renderStill();
  if (state.running) engine.start();
}

async function rebuild() {
  readSettings();
  const output = OUTPUT_PRESETS[state.settings.outputPreset];
  const sources = normalizeImages(state.images, {
    width: output.width,
    height: output.height,
    fitMode: state.settings.fitMode,
    backgroundMode: state.settings.backgroundMode,
    zoom: state.settings.zoom,
    offsetX: output.width * state.settings.offsetX,
    offsetY: output.height * state.settings.offsetY,
  });

  engine.stop();
  engine.setSize(output.width, output.height);
  engine.setSources(sources);
  updateChannelSourceOptions();
  applyEngineSettings();
  updateLabels();
  engine.renderStill();
  if (state.running) engine.start();
  elements.status.textContent = `${output.width}x${output.height}, ${state.images.length} source image${state.images.length === 1 ? "" : "s"}`;
}

function readSettings() {
  state.settings.outputPreset = elements.outputPreset.value;
  state.settings.fitMode = elements.fitMode.value;
  state.settings.backgroundMode = elements.backgroundMode.value;
  state.settings.colorPreset = elements.colorPreset.value;
  state.settings.channelSources = elements.channelSources.map((select) =>
    select.value === "off" ? "off" : Number(select.value),
  );
  state.settings.gridSize = Number(elements.grid.value);
  state.settings.tilesPerFrame = Number(elements.tilesPerFrame.value);
  state.settings.frameInterval = Number(elements.frameInterval.value);
  state.settings.tileScale = Number(elements.tileScale.value) / 100;
  state.settings.sourceJitter = Number(elements.sourceJitter.value) / 100;
  state.settings.colorStrength = Number(elements.colorStrength.value) / 100;
  state.settings.zoom = Number(elements.zoom.value) / 100;
  state.settings.offsetX = Number(elements.offsetX.value) / 100;
  state.settings.offsetY = Number(elements.offsetY.value) / 100;
  state.settings.loopDuration = Number(elements.loopDuration.value);
}

function applyEngineSettings() {
  const colorPreset = COLOR_PRESETS[state.settings.colorPreset];
  engine.configure({
    gridSize: state.settings.gridSize,
    tilesPerFrame: state.settings.tilesPerFrame,
    frameInterval: state.settings.frameInterval,
    tileScale: state.settings.tileScale,
    sourceJitter: state.settings.sourceJitter,
    colorStrength: state.settings.colorStrength,
    channels: getChannelSettings(),
    blendMode: colorPreset.blendMode,
  });
}

function applyColorPreset(name) {
  const preset = COLOR_PRESETS[name];
  if (!preset) return;
  elements.channelColors.forEach((input, index) => {
    input.value = preset.colors[index] || "#ffffff";
  });
}

function getChannelSettings() {
  return elements.channelColors.map((input, index) => {
    const sourceValue = elements.channelSources[index].value;
    const sourceIndex = sourceValue === "off" ? -1 : Number(sourceValue);
    return {
      color: input.value,
      enabled: sourceValue !== "off" && Number.isInteger(sourceIndex),
      sourceIndex,
    };
  });
}

function updateChannelSourceOptions({ resetMapping = false } = {}) {
  elements.channelSources.forEach((select, channelIndex) => {
    const previousValue = select.value || String(state.settings.channelSources[channelIndex] ?? 0);
    select.replaceChildren(new Option("Off", "off"));

    state.images.forEach((image, imageIndex) => {
      select.add(new Option(`Image ${imageIndex + 1}`, String(imageIndex)));
    });

    if (resetMapping) {
      select.value = String(Math.min(channelIndex, state.images.length - 1));
      return;
    }

    const defaultValue = state.images[Number(previousValue)] ? previousValue : "0";
    select.value = previousValue === "off" ? "off" : defaultValue;
  });
}

function updateLabels() {
  const grid = engine.getGridDimensions();
  elements.gridValue.value = `${state.settings.gridSize} long side (${grid.cols}x${grid.rows})`;
  elements.tilesValue.value = state.settings.tilesPerFrame;
  elements.intervalValue.value = `${state.settings.frameInterval} ms`;
  elements.scaleValue.value = `${state.settings.tileScale.toFixed(2)}x`;
  elements.jitterValue.value = `${Math.round(state.settings.sourceJitter * 100)}%`;
  elements.colorValue.value = `${Math.round(state.settings.colorStrength * 100)}%`;
  elements.zoomValue.value = `${state.settings.zoom.toFixed(2)}x`;
  elements.offsetXValue.value = `${Math.round(state.settings.offsetX * 100)}%`;
  elements.offsetYValue.value = `${Math.round(state.settings.offsetY * 100)}%`;
  elements.durationValue.value = `${state.settings.loopDuration}s`;
}

function updateDurationSetting() {
  readSettings();
  updateLabels();
}

function togglePlayback() {
  state.running = !state.running;
  elements.toggle.textContent = state.running ? "Pause" : "Play";
  if (state.running) engine.start();
  else engine.stop();
}

async function downloadWebm() {
  if (state.recording) return;

  state.recording = true;
  elements.downloadWebm.disabled = true;
  const wasRunning = state.running;
  engine.stop();
  engine.renderStill();

  try {
    const blob = await recordCanvasWebm(elements.canvas, {
      duration: state.settings.loopDuration,
      fps: state.settings.fps,
      onFrame: () => engine.tick(),
      onStatus: (message) => {
        elements.status.textContent = message;
      },
    });
    downloadBlob(blob, timestampedFilename("prismosaic-loop", "webm"));
    elements.status.textContent = "WebM loop exported";
  } catch (error) {
    elements.status.textContent = error.message;
  } finally {
    state.recording = false;
    elements.downloadWebm.disabled = false;
    state.running = wasRunning;
    if (state.running) engine.start();
  }
}
