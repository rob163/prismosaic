import { normalizeImages, loadImageFile, createDemoImage } from "./image-fit.js?v=20260530-5";
import { translate, getInitialLocale, isSupportedLocale, persistLocale, SUPPORTED_LOCALES } from "./i18n.js?v=20260601-3";
import { MosaicEngine } from "./mosaic-engine.js?v=20260530-5";
import { exportNextEmbedZip } from "./embed-export.js?v=20260531-3";
import { downloadBlob, downloadCanvasPng, recordCanvasVideo, timestampedFilename } from "./media-export.js?v=20260601-1";
import {
  APP_VERSION,
  ANIMATION_FPS,
  COLOR_PRESETS,
  CONTROL_CONFIG,
  DEFAULT_SETTINGS,
  OUTPUT_PRESETS,
  VIDEO_EXPORT_PRESETS,
} from "./config.js?v=20260614-1";

const elements = {
  canvas: document.querySelector("#mosaic"),
  canvasShell: document.querySelector(".canvas-shell"),
  stage: document.querySelector(".stage"),
  fileInput: document.querySelector("#fileInput"),
  uploadLabel: document.querySelector("#uploadLabel"),
  status: document.querySelector("#status"),
  language: document.querySelector("#language"),
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
  tilesPerFrameNumber: document.querySelector("#tilesPerFrameNumber"),
  tileScale: document.querySelector("#tileScale"),
  tileScaleNumber: document.querySelector("#tileScaleNumber"),
  sourceJitter: document.querySelector("#sourceJitter"),
  sourceJitterNumber: document.querySelector("#sourceJitterNumber"),
  colorStrength: document.querySelector("#colorStrength"),
  colorStrengthNumber: document.querySelector("#colorStrengthNumber"),
  zoom: document.querySelector("#zoom"),
  zoomNumber: document.querySelector("#zoomNumber"),
  offsetX: document.querySelector("#offsetX"),
  offsetXNumber: document.querySelector("#offsetXNumber"),
  offsetY: document.querySelector("#offsetY"),
  offsetYNumber: document.querySelector("#offsetYNumber"),
  loopDuration: document.querySelector("#loopDuration"),
  loopDurationNumber: document.querySelector("#loopDurationNumber"),
  videoFormat: document.querySelector("#videoFormat"),
  videoDialog: document.querySelector("#videoDialog"),
  confirmVideoDownload: document.querySelector("#confirmVideoDownload"),
  reroll: document.querySelector("#reroll"),
  toggle: document.querySelector("#toggle"),
  downloadPng: document.querySelector("#downloadPng"),
  downloadVideo: document.querySelector("#downloadVideo"),
  downloadEmbed: document.querySelector("#downloadEmbed"),
};

const state = {
  settings: { ...DEFAULT_SETTINGS },
  images: [],
  locale: getInitialLocale(),
  uploadSelected: false,
  status: { key: "status.preparingCanvas", params: {} },
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
  applyLocale();
  applyControlConfig();
  populateSelects({ applyPreset: true });
  populateVideoFormatSelect();
  bindEvents();
  observeStageResize();
  window.addEventListener("resize", handleViewportResize);
  state.images = [createDemoImage(1200, 1200)];
  await rebuild();
  engine.start();
}

function t(key, params) {
  return translate(state.locale, key, params);
}

function setStatus(key, params = {}) {
  state.status = { key, params };
  elements.status.textContent = t(key, params);
}

function applyLocale({ persist = false } = {}) {
  if (persist) persistLocale(state.locale);
  document.documentElement.lang = state.locale === "zh" ? "zh-CN" : "en";

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    if (element === elements.status) return;
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((element) => {
    element.title = t(element.dataset.i18nTitle);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  });

  updateStatusText();
  updateUploadLabel();
}

function updateStatusText() {
  elements.status.textContent = t(state.status.key, state.status.params);
}

function updateUploadLabel() {
  elements.uploadLabel.textContent = state.uploadSelected
    ? t("status.imagesSelected", { count: state.images.length })
    : t("upload");
}

function observeStageResize() {
  if (!elements.stage || typeof ResizeObserver !== "function") return;

  const observer = new ResizeObserver(() => {
    handleViewportResize();
  });
  observer.observe(elements.stage);
}

function handleViewportResize() {
  const output = OUTPUT_PRESETS[state.settings.outputPreset];
  updateCanvasDisplaySize(output.width, output.height);
}

function updateCanvasDisplaySize(outputWidth, outputHeight) {
  const { canvas, canvasShell, stage } = elements;
  if (!canvas || !canvasShell || !outputWidth || !outputHeight) return;

  const ratio = outputWidth / outputHeight;
  const mobileViewport = window.matchMedia("(max-width: 900px)").matches;
  const desktopMaxHeight = window.innerHeight - 36;
  const mobileMaxHeight = Math.min(window.innerHeight * 0.58, 520);
  const maxHeight = Math.max(1, mobileViewport ? mobileMaxHeight : desktopMaxHeight);
  const maxWidth = Math.max(1, stage?.clientWidth || canvasShell.parentElement?.clientWidth || maxHeight * ratio);

  let displayWidth = Math.min(maxWidth, maxHeight * ratio);
  let displayHeight = displayWidth / ratio;

  if (displayHeight > maxHeight) {
    displayHeight = maxHeight;
    displayWidth = displayHeight * ratio;
  }

  displayWidth = Math.round(displayWidth);
  displayHeight = Math.max(1, Math.round(displayWidth / ratio));
  const scale = displayWidth / outputWidth;

  canvasShell.style.width = `${displayWidth}px`;
  canvasShell.style.height = `${displayHeight}px`;
  canvas.style.width = `${outputWidth}px`;
  canvas.style.height = `${outputHeight}px`;
  canvas.style.transform = `scale(${scale})`;
}

function applyControlConfig() {
  for (const [id, config] of Object.entries(CONTROL_CONFIG)) {
    const range = elements[id];
    const number = elements[`${id}Number`];
    if (range) {
      range.min = String(config.min);
      range.max = String(config.max);
      range.step = String(config.step);
    }
    if (number) {
      if (config.numberStep != null && config.valueScale) {
        number.min = String(config.min / config.valueScale);
        number.max = String(config.max / config.valueScale);
        number.step = String(config.numberStep);
      } else {
        number.min = String(config.min);
        number.max = String(config.max);
        number.step = String(config.step);
      }
    }
    const settingKey = config.valueKey || id;
    const value = state.settings[settingKey];
    const raw = config.valueScale ? Math.round(value * config.valueScale) : value;
    if (range) range.value = String(raw);
    if (number) number.value = formatControlNumber(id, raw);
  }
}

function formatControlNumber(id, raw) {
  const config = CONTROL_CONFIG[id];
  if (config.numberStep != null && config.valueScale) {
    return (raw / config.valueScale).toFixed(config.numberDecimals ?? 2);
  }
  return String(raw);
}

function snapControlRaw(id, value) {
  const config = CONTROL_CONFIG[id];
  let raw =
    config.numberStep != null && config.valueScale ? Math.round(value * config.valueScale) : Math.round(value);
  const step = config.step || 1;
  raw = Math.round(raw / step) * step;
  return Math.min(config.max, Math.max(config.min, raw));
}

function syncNumberInputFromRange(id) {
  const range = elements[id];
  const number = elements[`${id}Number`];
  if (!range || !number) return;
  number.value = formatControlNumber(id, Number(range.value));
}

function applyNumberInputToRange(id) {
  const config = CONTROL_CONFIG[id];
  const range = elements[id];
  const number = elements[`${id}Number`];
  if (!range || !number) return;

  const parsed = Number(number.value);
  if (!Number.isFinite(parsed)) {
    syncNumberInputFromRange(id);
    return;
  }

  const raw = snapControlRaw(id, parsed);
  range.value = String(raw);
  syncNumberInputFromRange(id);
}

function getControlChangeHandler(id) {
  if (id === "zoom" || id === "offsetX" || id === "offsetY") return updateSourceSettings;
  if (id === "loopDuration") return updateDurationSetting;
  return updateRenderSettings;
}

function bindControlInputs() {
  for (const id of Object.keys(CONTROL_CONFIG)) {
    const range = elements[id];
    const number = elements[`${id}Number`];
    if (!range) continue;

    const handler = getControlChangeHandler(id);
    range.addEventListener("input", () => {
      syncNumberInputFromRange(id);
      handler();
    });

    if (!number) continue;
    number.addEventListener("change", () => {
      applyNumberInputToRange(id);
      handler();
    });
    number.addEventListener("keydown", (event) => {
      if (event.key === "Enter") number.blur();
    });
  }
}

function populateSelects({ applyPreset = false } = {}) {
  const selectedLanguage = state.locale;
  elements.language.replaceChildren(
    ...SUPPORTED_LOCALES.map((locale) => new Option(t(`options.language.${locale}`), locale)),
  );
  elements.language.value = selectedLanguage;

  const selectedOutput = elements.outputPreset.value || state.settings.outputPreset;
  elements.outputPreset.replaceChildren();
  for (const [key, preset] of Object.entries(OUTPUT_PRESETS)) {
    elements.outputPreset.add(new Option(`${t(`options.output.${key}`)} (${preset.width}x${preset.height})`, key));
  }
  elements.outputPreset.value = selectedOutput;

  const selectedFit = elements.fitMode.value || state.settings.fitMode;
  elements.fitMode.replaceChildren(
    new Option(t("options.fit.cover"), "cover"),
    new Option(t("options.fit.contain"), "contain"),
  );
  elements.fitMode.value = selectedFit;

  const selectedBackground = elements.backgroundMode.value || state.settings.backgroundMode;
  elements.backgroundMode.replaceChildren(
    new Option(t("options.background.blur"), "blur"),
    new Option(t("options.background.solid"), "solid"),
  );
  elements.backgroundMode.value = selectedBackground;

  const selectedColor = elements.colorPreset.value || state.settings.colorPreset;
  elements.colorPreset.replaceChildren();
  for (const [key, preset] of Object.entries(COLOR_PRESETS)) {
    elements.colorPreset.add(new Option(t(`options.colors.${key}`) || preset.label, key));
  }
  elements.colorPreset.value = selectedColor;
  if (applyPreset) applyColorPreset(state.settings.colorPreset);
}

function bindEvents() {
  elements.language.addEventListener("change", () => {
    const locale = elements.language.value;
    if (!isSupportedLocale(locale)) return;
    state.locale = locale;
    applyLocale({ persist: true });
    populateSelects();
    populateVideoFormatSelect();
    updateChannelSourceOptions();
    updateLabels();
    updateToggleLabel();
  });
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
  bindControlInputs();
  elements.reroll.addEventListener("click", () => engine.renderStill());
  elements.toggle.addEventListener("click", togglePlayback);
  elements.downloadPng.addEventListener("click", () => downloadCanvasPng(elements.canvas));
  elements.downloadVideo.addEventListener("click", openVideoDialog);
  elements.confirmVideoDownload.addEventListener("click", downloadVideo);
  elements.downloadEmbed.addEventListener("click", downloadEmbedZip);
}

async function handleFiles(event) {
  const files = [...event.target.files].slice(0, 3);
  if (!files.length) return;

  setStatus("status.loadingImages");
  try {
    state.images = await Promise.all(files.map(loadImageFile));
    state.uploadSelected = true;
    updateUploadLabel();
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
  updateCanvasDisplaySize(output.width, output.height);
  engine.setSources(sources);
  updateChannelSourceOptions();
  applyEngineSettings();
  updateLabels();
  engine.renderStill();
  if (state.running) engine.start();
  setStatus("status.ready", { width: output.width, height: output.height, count: state.images.length });
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
  state.settings.tileScale = Number(elements.tileScale.value) / 100;
  state.settings.sourceJitter = Number(elements.sourceJitter.value) / 100;
  state.settings.colorStrength = Number(elements.colorStrength.value) / 100;
  state.settings.zoom = Number(elements.zoom.value) / 100;
  state.settings.offsetX = Number(elements.offsetX.value) / 100;
  state.settings.offsetY = Number(elements.offsetY.value) / 100;
  state.settings.loopDuration = Number(elements.loopDuration.value);
  state.settings.videoFormat = elements.videoFormat.value || state.settings.videoFormat;
}

function applyEngineSettings() {
  const colorPreset = COLOR_PRESETS[state.settings.colorPreset];
  engine.configure({
    gridSize: state.settings.gridSize,
    tilesPerFrame: state.settings.tilesPerFrame,
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
    select.replaceChildren(new Option(t("options.channels.off"), "off"));

    state.images.forEach((image, imageIndex) => {
      select.add(new Option(t("options.channels.source", { index: imageIndex + 1 }), String(imageIndex)));
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
  if (elements.gridValue) {
    elements.gridValue.value = t("values.grid", {
      gridSize: state.settings.gridSize,
      cols: grid.cols,
      rows: grid.rows,
    });
  }
  for (const id of Object.keys(CONTROL_CONFIG)) {
    if (!elements[`${id}Number`]) continue;
    syncNumberInputFromRange(id);
  }
}

function updateDurationSetting() {
  readSettings();
  updateLabels();
}

function togglePlayback() {
  state.running = !state.running;
  updateToggleLabel();
  if (state.running) engine.start();
  else engine.stop();
}

function updateToggleLabel() {
  elements.toggle.textContent = state.running ? t("buttons.pause") : t("buttons.play");
}

function populateVideoFormatSelect() {
  const selectedVideoFormat = elements.videoFormat.value || state.settings.videoFormat;
  elements.videoFormat.replaceChildren();

  for (const key of Object.keys(VIDEO_EXPORT_PRESETS)) {
    const preset = VIDEO_EXPORT_PRESETS[key];
    const option = new Option(t(`options.videoFormat.${key}`), key);
    option.disabled = !isVideoMimeTypeSupported(preset.mimeType);
    elements.videoFormat.add(option);
  }

  const preferred = [...elements.videoFormat.options].find((option) => option.value === selectedVideoFormat && !option.disabled);
  const fallback = [...elements.videoFormat.options].find((option) => !option.disabled);
  elements.videoFormat.value = preferred?.value || fallback?.value || selectedVideoFormat;
  state.settings.videoFormat = elements.videoFormat.value;
}

function isVideoMimeTypeSupported(mimeType) {
  return typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mimeType);
}

function openVideoDialog() {
  if (state.recording) return;
  readSettings();
  populateVideoFormatSelect();
  if (typeof elements.videoDialog.showModal === "function") {
    elements.videoDialog.showModal();
    return;
  }
  downloadVideo();
}

async function downloadVideo() {
  if (state.recording) return;

  readSettings();
  const videoPreset = VIDEO_EXPORT_PRESETS[state.settings.videoFormat];
  if (!videoPreset || !isVideoMimeTypeSupported(videoPreset.mimeType)) {
    setStatus("status.unsupportedVideoFormat");
    return;
  }

  if (elements.videoDialog.open && typeof elements.videoDialog.close === "function") {
    elements.videoDialog.close();
  }
  state.recording = true;
  elements.downloadVideo.disabled = true;
  elements.confirmVideoDownload.disabled = true;
  const wasRunning = state.running;
  engine.stop();
  engine.renderStill();

  try {
    const blob = await recordCanvasVideo(elements.canvas, {
      duration: state.settings.loopDuration,
      fps: state.settings.fps,
      mimeType: videoPreset.mimeType,
      onFrame: () => engine.tick(),
      onStatus: (message) => {
        const match = message.match(/\d+/);
        setStatus("status.recording", { percent: match ? Number(match[0]) : 0 });
      },
    });
    downloadBlob(blob, timestampedFilename("prismosaic-loop", videoPreset.extension));
    setStatus("status.videoExported");
  } catch (error) {
    elements.status.textContent = error.message;
  } finally {
    state.recording = false;
    elements.downloadVideo.disabled = false;
    elements.confirmVideoDownload.disabled = false;
    state.running = wasRunning;
    if (state.running) engine.start();
  }
}

async function downloadEmbedZip() {
  if (state.recording) return;

  readSettings();
  state.recording = true;
  elements.downloadEmbed.disabled = true;
  setStatus("status.preparingEmbed");

  try {
    const output = OUTPUT_PRESETS[state.settings.outputPreset];
    const colorPreset = COLOR_PRESETS[state.settings.colorPreset];
    await exportNextEmbedZip({
      appVersion: APP_VERSION,
      sources: engine.sources,
      recipe: {
        width: output.width,
        height: output.height,
        settings: {
          gridSize: state.settings.gridSize,
          tilesPerFrame: state.settings.tilesPerFrame,
          fps: ANIMATION_FPS,
          tileScale: state.settings.tileScale,
          sourceJitter: state.settings.sourceJitter,
          colorStrength: state.settings.colorStrength,
          blendMode: colorPreset.blendMode,
          channels: getChannelSettings(),
        },
      },
    });
    setStatus("status.embedExported");
  } catch (error) {
    elements.status.textContent = error.message;
  } finally {
    state.recording = false;
    elements.downloadEmbed.disabled = false;
  }
}
