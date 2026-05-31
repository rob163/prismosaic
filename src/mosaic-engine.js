export class MosaicEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.sources = [];
    this.settings = {};
    this.sourceMap = [];
    this.timer = 0;
  }

  configure(settings) {
    this.settings = { ...this.settings, ...settings };
  }

  setSize(width, height) {
    if (this.canvas.width === width && this.canvas.height === height) return;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  setSources(sources) {
    this.sources = sources;
  }

  renderStill() {
    this.clear();
    this.randomizeSourceMap();
    const { cols, rows } = this.getGridDimensions();
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        this.drawTile(col, row);
      }
    }
  }

  start() {
    this.stop();
    this.timer = window.setInterval(() => {
      this.drawRandomTiles(this.settings.tilesPerFrame);
    }, this.settings.frameInterval);
  }

  stop() {
    window.clearInterval(this.timer);
    this.timer = 0;
  }

  tick() {
    this.drawRandomTiles(this.settings.tilesPerFrame);
  }

  clear() {
    this.ctx.fillStyle = "#050607";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  randomizeSourceMap() {
    this.sourceMap = [];
    const activeChannels = this.getActiveChannels();
    const { cols, rows } = this.getGridDimensions();
    for (let row = 0; row < rows; row += 1) {
      this.sourceMap[row] = [];
      for (let col = 0; col < cols; col += 1) {
        this.sourceMap[row][col] = this.pickChannelIndex(activeChannels);
      }
    }
  }

  drawRandomTiles(count) {
    if (!this.sources.length) return;
    const activeChannels = this.getActiveChannels();
    const { cols, rows } = this.getGridDimensions();
    for (let index = 0; index < count; index += 1) {
      const col = randomInt(0, cols - 1);
      const row = randomInt(0, rows - 1);
      if (!this.sourceMap[row]) this.sourceMap[row] = [];
      this.sourceMap[row][col] = this.pickNextChannelIndex(activeChannels, this.sourceMap[row][col]);
      this.drawTile(col, row);
    }
  }

  drawTile(col, row) {
    if (!this.sources.length) return;

    const { cols, rows } = this.getGridDimensions();
    const [x0, x1] = tileBounds(col, cols, this.canvas.width);
    const [y0, y1] = tileBounds(row, rows, this.canvas.height);
    const cellWidth = x1 - x0;
    const cellHeight = y1 - y0;
    if (cellWidth <= 0 || cellHeight <= 0) return;

    const tileScale = this.settings.tileScale;
    const tileWidth = Math.max(1, Math.round(cellWidth * tileScale));
    const tileHeight = Math.max(1, Math.round(cellHeight * tileScale));
    const centerX = (x0 + x1) / 2;
    const centerY = (y0 + y1) / 2;
    const dx = Math.round(centerX - tileWidth / 2);
    const dy = Math.round(centerY - tileHeight / 2);
    const jitterX = Math.round(cellWidth * this.settings.sourceJitter);
    const jitterY = Math.round(cellHeight * this.settings.sourceJitter);
    const sx = clamp(
      Math.round(centerX - tileWidth / 2) + randomInt(-jitterX, jitterX),
      0,
      Math.max(0, this.canvas.width - tileWidth),
    );
    const sy = clamp(
      Math.round(centerY - tileHeight / 2) + randomInt(-jitterY, jitterY),
      0,
      Math.max(0, this.canvas.height - tileHeight),
    );

    const activeChannels = this.getActiveChannels();
    const channelIndex = this.sourceMap[row]?.[col] ?? this.pickChannelIndex(activeChannels);
    const channel = activeChannels[channelIndex] || activeChannels[0];
    const source = this.sources[channel.sourceIndex];

    if (tileScale <= 1) {
      this.ctx.fillStyle = "#050607";
      this.ctx.fillRect(x0, y0, cellWidth, cellHeight);
    }

    this.ctx.drawImage(source, sx, sy, tileWidth, tileHeight, dx, dy, tileWidth, tileHeight);
    this.paintTint(dx, dy, tileWidth, tileHeight, channel.color);
    if (tileScale < 1) {
      this.paintTileLines(dx, dy, tileWidth, tileHeight);
    }
  }

  paintTint(x, y, width, height, hex) {
    this.ctx.save();
    this.ctx.globalCompositeOperation = this.settings.blendMode;
    this.ctx.globalAlpha = this.settings.colorStrength;
    this.ctx.fillStyle = hex;
    this.ctx.fillRect(x, y, width, height);
    this.ctx.restore();
  }

  paintTileLines(x, y, width, height) {
    this.ctx.fillStyle = "rgba(0,0,0,0.34)";
    this.ctx.fillRect(x, y, width, 1);
    this.ctx.fillRect(x, y, 1, height);
  }

  getActiveChannels() {
    const configured = this.settings.channels || [];
    const active = configured
      .filter((channel) => channel.enabled && this.sources[channel.sourceIndex])
      .map((channel) => ({
        color: channel.color,
        sourceIndex: channel.sourceIndex,
      }));

    if (active.length > 0) return active;
    return [{ color: "#ffffff", sourceIndex: 0 }];
  }

  pickChannelIndex(activeChannels = this.getActiveChannels()) {
    return randomInt(0, Math.max(0, activeChannels.length - 1));
  }

  pickNextChannelIndex(activeChannels = this.getActiveChannels(), previousIndex) {
    if (activeChannels.length <= 1) return 0;
    const normalizedPrevious =
      Number.isInteger(previousIndex) && previousIndex >= 0 && previousIndex < activeChannels.length
        ? previousIndex
        : -1;
    if (normalizedPrevious === -1) return this.pickChannelIndex(activeChannels);

    const nextIndex = randomInt(0, activeChannels.length - 2);
    return nextIndex >= normalizedPrevious ? nextIndex + 1 : nextIndex;
  }

  getGridDimensions() {
    const longSideCount = Math.max(1, Math.round(this.settings.gridSize || 1));
    if (this.canvas.width >= this.canvas.height) {
      return {
        cols: longSideCount,
        rows: Math.max(1, Math.round(longSideCount * (this.canvas.height / this.canvas.width))),
      };
    }
    return {
      cols: Math.max(1, Math.round(longSideCount * (this.canvas.width / this.canvas.height))),
      rows: longSideCount,
    };
  }
}

function tileBounds(index, count, size) {
  return [
    Math.round((index * size) / count),
    Math.round(((index + 1) * size) / count),
  ];
}

function randomInt(min, max) {
  if (max <= min) return min;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
