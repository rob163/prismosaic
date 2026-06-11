export const SUPPORTED_LOCALES = ["en", "zh"];

const STORAGE_KEY = "prismosaic-locale";

const MESSAGES = {
  en: {
    aria: {
      closeDialog: "Close dialog",
      controls: "Prismosaic controls",
      preview: "Prismosaic preview",
      projectLinks: "Project links",
      tintChannels: "Tint channels",
    },
    buttons: {
      downloadEmbed: "Download Embed ZIP",
      downloadPng: "Download PNG",
      downloadVideo: "Download Video",
      pause: "Pause",
      play: "Play",
      reroll: "Reroll",
    },
    channels: {
      1: "Channel 1",
      2: "Channel 2",
      3: "Channel 3",
    },
    fields: {
      background: "Background",
      colorPreset: "Color preset",
      colorStrength: "Color strength",
      frameInterval: "Frame interval",
      framing: "Framing",
      gridSize: "Grid size",
      language: "Language",
      loopDuration: "Loop duration",
      offsetX: "Position X",
      offsetY: "Position Y",
      output: "Output",
      sourceJitter: "Source jitter",
      tileScale: "Tile scale",
      tilesPerFrame: "Tiles per frame",
      videoFormat: "Video type",
      zoom: "Zoom",
    },
    dialogs: {
      videoTitle: "Download Video",
    },
    groups: {
      export: "Export",
      imageFit: "Image Fit",
      mosaic: "Mosaic",
    },
    hints: {
      background:
        "Background used when the photo does not fill the frame. Blur fill extends the photo softly; Black fill leaves a dark matte.",
      channelControls:
        "Each tint channel can use a custom color and can sample from any uploaded image. Set a channel to Off to remove it from random tile selection.",
      colorPreset:
        "Three-color tint set used across the mosaic sources. Different presets change the character of the color deflection.",
      colorStrength: "Opacity of the selected color tint applied to each tile after the photo tile is drawn.",
      frameInterval: "Delay between animation ticks. Smaller values update faster.",
      framing:
        "How uploaded images are mapped into the output canvas. Fill crop covers the full frame; Fit full image preserves the entire photo.",
      gridSize:
        "Number of mosaic cells on the longer output side. The shorter side is calculated from the output ratio so tiles stay close to square.",
      language: "Switches the control language. The exported embed package remains English-only.",
      loopDuration: "Duration of the recorded video loop. Longer clips take more time and create larger files.",
      offsetX: "Moves the normalized source image left or right inside the output frame.",
      offsetY: "Moves the normalized source image up or down inside the output frame.",
      output:
        "Final export canvas size. Pick Story/Reel for vertical social video, Portrait for feed posts, or Square for profile-friendly output.",
      sourceJitter: "Random offset between a tile position and the source crop position. 0 keeps source sampling aligned.",
      tileScale: "Relative tile crop and draw size. Above 1 overlaps neighboring cells; below 1 reveals the background between tiles.",
      tilesPerFrame: "How many random cells are replaced on each animation tick. Higher values produce faster visual change.",
      videoFormat: "Video container and codec for the downloaded loop. Unsupported options are disabled by the browser.",
      zoom: "Scales the uploaded image before mosaic sampling. Use this to crop tighter or reveal more of the source photo.",
    },
    links: {
      about: "About",
      github: "GitHub",
    },
    options: {
      background: {
        blur: "Blur fill",
        solid: "Black fill",
      },
      channels: {
        off: "Off",
        source: ({ index }) => `Image ${index}`,
      },
      colors: {
        candy: "Candy Split",
        dusk: "Dusk Glass",
        neon: "Neon Glass",
        printCmy: "Print CMY",
        signal: "Signal RGB",
      },
      fit: {
        contain: "Fit full image",
        cover: "Fill crop",
      },
      language: {
        en: "English",
        zh: "中文",
      },
      output: {
        landscape: "Landscape",
        portrait: "Portrait",
        square: "Square",
        story: "Story / Reel",
      },
      videoFormat: {
        mp4H264: "MP4 (H.264)",
        webm: "WebM",
        webmVp8: "WebM (VP8)",
        webmVp9: "WebM (VP9)",
      },
    },
    status: {
      embedExported: "Embed ZIP exported",
      imagesSelected: ({ count }) => `${count} image${count === 1 ? "" : "s"} selected`,
      loadingImages: "Loading images...",
      preparingCanvas: "Preparing canvas...",
      preparingEmbed: "Preparing embed ZIP...",
      ready: ({ width, height, count }) =>
        `${width}x${height}, ${count} source image${count === 1 ? "" : "s"}`,
      recording: ({ percent }) => `Recording ${percent}%`,
      unsupportedVideoFormat: "This browser does not support the selected video type.",
      videoExported: "Video loop exported",
    },
    upload: "Upload 1-3 images",
    units: {
      milliseconds: "ms",
      seconds: "s",
    },
    values: {
      grid: ({ gridSize, cols, rows }) => `${gridSize} long side (${cols}x${rows})`,
      milliseconds: ({ value }) => `${value} ms`,
      seconds: ({ value }) => `${value}s`,
    },
  },
  zh: {
    aria: {
      closeDialog: "关闭弹窗",
      controls: "Prismosaic 控制面板",
      preview: "Prismosaic 预览",
      projectLinks: "项目链接",
      tintChannels: "色彩通道",
    },
    buttons: {
      downloadEmbed: "下载嵌入 ZIP",
      downloadPng: "下载 PNG",
      downloadVideo: "下载视频",
      pause: "暂停",
      play: "播放",
      reroll: "重排",
    },
    channels: {
      1: "通道 1",
      2: "通道 2",
      3: "通道 3",
    },
    fields: {
      background: "背景",
      colorPreset: "色彩预设",
      colorStrength: "色彩强度",
      frameInterval: "帧间隔",
      framing: "构图方式",
      gridSize: "网格尺寸",
      language: "语言",
      loopDuration: "循环时长",
      offsetX: "水平位置",
      offsetY: "垂直位置",
      output: "输出规格",
      sourceJitter: "取样抖动",
      tileScale: "色块缩放",
      tilesPerFrame: "每帧色块数",
      videoFormat: "视频类型",
      zoom: "缩放",
    },
    dialogs: {
      videoTitle: "下载视频",
    },
    groups: {
      export: "导出",
      imageFit: "图像适配",
      mosaic: "马赛克",
    },
    hints: {
      background: "当照片没有填满画面时使用的背景。模糊填充会柔和延展照片，黑色填充会保留深色底。",
      channelControls: "每个色彩通道都可以设置颜色，并从任意上传图像取样。设为关闭即可从随机色块选择中移除。",
      colorPreset: "用于马赛克取样的三色染色组合。不同预设会改变色彩偏移的风格。",
      colorStrength: "照片色块绘制后叠加的颜色不透明度。",
      frameInterval: "动画更新的时间间隔。数值越小，变化越快。",
      framing: "上传图片映射到输出画布的方式。填满裁切会覆盖整张画面，完整适配会保留整张照片。",
      gridSize: "输出长边上的马赛克格数。短边会按输出比例计算，让色块接近正方形。",
      language: "切换控制界面语言。导出的嵌入包仍保持英文。",
      loopDuration: "录制视频循环的时长。时间越长，导出越慢，文件也越大。",
      offsetX: "将归一化后的源图像在输出画面中左右移动。",
      offsetY: "将归一化后的源图像在输出画面中上下移动。",
      output: "最终导出画布尺寸。Story/Reel 适合竖屏视频，Portrait 适合信息流，Square 适合头像和方图。",
      sourceJitter: "色块位置和源图取样位置之间的随机偏移。0 表示保持对齐取样。",
      tileScale: "色块裁切和绘制的相对大小。大于 1 会覆盖邻近格，小于 1 会露出背景间隙。",
      tilesPerFrame: "每次动画更新替换的随机色块数量。数值越高，视觉变化越快。",
      videoFormat: "下载循环视频的容器和编码。浏览器不支持的选项会被禁用。",
      zoom: "在马赛克取样前缩放上传图像。可用于更紧裁切或展示更多原图。",
    },
    links: {
      about: "关于",
      github: "GitHub",
    },
    options: {
      background: {
        blur: "模糊填充",
        solid: "黑色填充",
      },
      channels: {
        off: "关闭",
        source: ({ index }) => `图像 ${index}`,
      },
      colors: {
        candy: "糖果分色",
        dusk: "暮色玻璃",
        neon: "霓虹玻璃",
        printCmy: "印刷 CMY",
        signal: "信号 RGB",
      },
      fit: {
        contain: "完整适配",
        cover: "填满裁切",
      },
      language: {
        en: "English",
        zh: "中文",
      },
      output: {
        landscape: "横版",
        portrait: "竖版",
        square: "方形",
        story: "Story / Reel",
      },
      videoFormat: {
        mp4H264: "MP4 (H.264)",
        webm: "WebM",
        webmVp8: "WebM (VP8)",
        webmVp9: "WebM (VP9)",
      },
    },
    status: {
      embedExported: "嵌入 ZIP 已导出",
      imagesSelected: ({ count }) => `已选择 ${count} 张图像`,
      loadingImages: "正在加载图像...",
      preparingCanvas: "正在准备画布...",
      preparingEmbed: "正在准备嵌入 ZIP...",
      ready: ({ width, height, count }) => `${width}x${height}，${count} 张源图像`,
      recording: ({ percent }) => `正在录制 ${percent}%`,
      unsupportedVideoFormat: "此浏览器不支持所选视频类型。",
      videoExported: "视频循环已导出",
    },
    upload: "上传 1-3 张图像",
    units: {
      milliseconds: "毫秒",
      seconds: "秒",
    },
    values: {
      grid: ({ gridSize, cols, rows }) => `长边 ${gridSize} 格（${cols}x${rows}）`,
      milliseconds: ({ value }) => `${value} 毫秒`,
      seconds: ({ value }) => `${value} 秒`,
    },
  },
};

export function getInitialLocale() {
  const stored = readStoredLocale();
  if (isSupportedLocale(stored)) return stored;
  return window.navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en";
}

export function persistLocale(locale) {
  if (!isSupportedLocale(locale)) return;
  try {
    window.localStorage?.setItem(STORAGE_KEY, locale);
  } catch {
    // Storage may be blocked for opaque origins, private contexts, or embedded previews.
  }
}

export function isSupportedLocale(locale) {
  return SUPPORTED_LOCALES.includes(locale);
}

export function translate(locale, key, params = {}) {
  const message = getPath(MESSAGES[locale], key) ?? getPath(MESSAGES.en, key);
  if (typeof message === "function") return message(params);
  return message ?? key;
}

function getPath(source, key) {
  return key.split(".").reduce((current, part) => current?.[part], source);
}

function readStoredLocale() {
  try {
    return window.localStorage?.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
