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
    const channelIndex = pickNextChannelIndex(activeChannelCount, sourceMap[row][col], randomInt);
    sourceMap[row][col] = channelIndex;
    protectionMap[row][col] = currentTick + protectionTicks;
    updates.push({ row, col, channelIndex });
  }

  return updates;
}

export function createChannelSchedulerRuntimeSource() {
  return `
const CHANNEL_SWITCH_PROTECTION_TICKS = ${CHANNEL_SWITCH_PROTECTION_TICKS};

${ensureGridRow.toString()}

${randomIntInclusive.toString()}

${fillSourceMap.toString()}

${resetProtectionMap.toString()}

${pickChannelIndex.toString()}

${pickNextChannelIndex.toString()}

${assignRandomTileUpdates.toString()}
`;
}

function ensureGridRow(grid, row) {
  if (!grid[row]) grid[row] = [];
}

function randomIntInclusive(min, max) {
  if (max <= min) return min;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
