export const CHANNEL_SWITCH_PROTECTION_TICKS = 4;

export function fillSourceMap(sourceMap, rows, cols, activeChannelCount, randomInt = randomIntInclusive) {
  sourceMap.length = 0;
  for (let row = 0; row < rows; row += 1) {
    sourceMap[row] = [];
    for (let col = 0; col < cols; col += 1) {
      sourceMap[row][col] = pickChannelIndex(activeChannelCount, randomInt);
    }
  }
}

export function resetProtectionMap(protectionMap, rows, cols) {
  protectionMap.length = 0;
  for (let row = 0; row < rows; row += 1) {
    protectionMap[row] = [];
    for (let col = 0; col < cols; col += 1) {
      protectionMap[row][col] = 0;
    }
  }
}

export function pickChannelIndex(activeChannelCount, randomInt = randomIntInclusive) {
  return randomInt(0, Math.max(0, activeChannelCount - 1));
}

export function pickNextChannelIndex(activeChannelCount, previousIndex, randomInt = randomIntInclusive) {
  if (activeChannelCount <= 1) return 0;
  const normalizedPrevious =
    Number.isInteger(previousIndex) && previousIndex >= 0 && previousIndex < activeChannelCount
      ? previousIndex
      : -1;
  if (normalizedPrevious === -1) {
    return pickChannelIndex(activeChannelCount, randomInt);
  }

  const nextIndex = randomInt(0, activeChannelCount - 2);
  return nextIndex >= normalizedPrevious ? nextIndex + 1 : nextIndex;
}

export function assignRandomTileUpdates({
  sourceMap,
  protectionMap,
  rows,
  cols,
  activeChannelCount,
  currentTick,
  count,
  protectionTicks = CHANNEL_SWITCH_PROTECTION_TICKS,
  randomInt = randomIntInclusive,
}) {
  const eligibleTiles = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if ((protectionMap[row]?.[col] ?? 0) <= currentTick) {
        eligibleTiles.push({ row, col });
      }
    }
  }

  const updates = [];
  const updateCount = Math.min(count, eligibleTiles.length);
  for (let index = 0; index < updateCount; index += 1) {
    const eligibleIndex = randomInt(0, eligibleTiles.length - 1);
    const { row, col } = eligibleTiles.splice(eligibleIndex, 1)[0];
    ensureGridRow(sourceMap, row);
    ensureGridRow(protectionMap, row);
    const previousChannelIndex = sourceMap[row][col];
    const channelIndex = pickNextChannelIndex(activeChannelCount, previousChannelIndex, randomInt);
    sourceMap[row][col] = channelIndex;
    protectionMap[row][col] =
      channelIndex !== previousChannelIndex ? currentTick + protectionTicks : protectionMap[row][col] ?? 0;
    updates.push({ row, col, channelIndex });
  }

  return updates;
}

export function createChannelSchedulerRuntimeSource() {
  return `
const CHANNEL_SWITCH_PROTECTION_TICKS = ${CHANNEL_SWITCH_PROTECTION_TICKS};

type SchedulerRandomInt = (min: number, max: number) => number;
type SchedulerTileUpdate = { row: number; col: number; channelIndex: number };
type SchedulerAssignOptions = {
  sourceMap: number[][];
  protectionMap: number[][];
  rows: number;
  cols: number;
  activeChannelCount: number;
  currentTick: number;
  count: number;
  protectionTicks?: number;
  randomInt?: SchedulerRandomInt;
};

function ensureGridRow(grid: number[][], row: number) {
  if (!grid[row]) grid[row] = [];
}

function randomIntInclusive(min: number, max: number) {
  if (max <= min) return min;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function fillSourceMap(
  sourceMap: number[][],
  rows: number,
  cols: number,
  activeChannelCount: number,
  randomInt: SchedulerRandomInt = randomIntInclusive,
) {
  sourceMap.length = 0;
  for (let row = 0; row < rows; row += 1) {
    sourceMap[row] = [];
    for (let col = 0; col < cols; col += 1) {
      sourceMap[row][col] = pickChannelIndex(activeChannelCount, randomInt);
    }
  }
}

function resetProtectionMap(protectionMap: number[][], rows: number, cols: number) {
  protectionMap.length = 0;
  for (let row = 0; row < rows; row += 1) {
    protectionMap[row] = [];
    for (let col = 0; col < cols; col += 1) {
      protectionMap[row][col] = 0;
    }
  }
}

function pickChannelIndex(activeChannelCount: number, randomInt: SchedulerRandomInt = randomIntInclusive) {
  return randomInt(0, Math.max(0, activeChannelCount - 1));
}

function pickNextChannelIndex(
  activeChannelCount: number,
  previousIndex: number | undefined,
  randomInt: SchedulerRandomInt = randomIntInclusive,
) {
  if (activeChannelCount <= 1) return 0;
  const normalizedPrevious =
    Number.isInteger(previousIndex) && previousIndex >= 0 && previousIndex < activeChannelCount
      ? previousIndex
      : -1;
  if (normalizedPrevious === -1) {
    return pickChannelIndex(activeChannelCount, randomInt);
  }

  const nextIndex = randomInt(0, activeChannelCount - 2);
  return nextIndex >= normalizedPrevious ? nextIndex + 1 : nextIndex;
}

function assignRandomTileUpdates({
  sourceMap,
  protectionMap,
  rows,
  cols,
  activeChannelCount,
  currentTick,
  count,
  protectionTicks = CHANNEL_SWITCH_PROTECTION_TICKS,
  randomInt = randomIntInclusive,
}: SchedulerAssignOptions): SchedulerTileUpdate[] {
  const eligibleTiles: Array<{ row: number; col: number }> = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if ((protectionMap[row]?.[col] ?? 0) <= currentTick) {
        eligibleTiles.push({ row, col });
      }
    }
  }

  const updates: SchedulerTileUpdate[] = [];
  const updateCount = Math.min(count, eligibleTiles.length);
  for (let index = 0; index < updateCount; index += 1) {
    const eligibleIndex = randomInt(0, eligibleTiles.length - 1);
    const { row, col } = eligibleTiles.splice(eligibleIndex, 1)[0];
    ensureGridRow(sourceMap, row);
    ensureGridRow(protectionMap, row);
    const previousChannelIndex = sourceMap[row][col];
    const channelIndex = pickNextChannelIndex(activeChannelCount, previousChannelIndex, randomInt);
    sourceMap[row][col] = channelIndex;
    protectionMap[row][col] =
      channelIndex !== previousChannelIndex ? currentTick + protectionTicks : protectionMap[row][col] ?? 0;
    updates.push({ row, col, channelIndex });
  }

  return updates;
}
`;
}

function ensureGridRow(grid, row) {
  if (!grid[row]) grid[row] = [];
}

function randomIntInclusive(min, max) {
  if (max <= min) return min;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
