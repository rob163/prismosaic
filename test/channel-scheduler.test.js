import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";

import {
  CHANNEL_SWITCH_PROTECTION_TICKS,
  assignRandomTileUpdates,
  createChannelSchedulerRuntimeSource,
  fillSourceMap,
  pickNextChannelIndex,
  resetProtectionMap,
} from "../src/channel-scheduler.js";

test("pickNextChannelIndex always switches away from the previous channel", () => {
  assert.equal(pickNextChannelIndex(1, 0), 0);
  assert.equal(pickNextChannelIndex(3, 1, () => 0), 0);
  assert.equal(pickNextChannelIndex(3, 1, () => 1), 2);
  assert.notEqual(pickNextChannelIndex(4, 2, () => 0), 2);
  assert.notEqual(pickNextChannelIndex(4, 2, () => 2), 2);
});

test("assignRandomTileUpdates enforces the protection window before a tile can change again", () => {
  const sourceMap = [];
  const protectionMap = [];
  fillSourceMap(sourceMap, 1, 1, 3, () => 0);
  resetProtectionMap(protectionMap, 1, 1);

  const firstTick = assignRandomTileUpdates({
    sourceMap,
    protectionMap,
    rows: 1,
    cols: 1,
    activeChannelCount: 3,
    currentTick: 1,
    count: 1,
    randomInt: createQueuedRandom([0, 0]),
  });

  assert.deepEqual(firstTick, [{ row: 0, col: 0, channelIndex: 1 }]);
  assert.equal(protectionMap[0][0], 1 + CHANNEL_SWITCH_PROTECTION_TICKS);

  const protectedTick = assignRandomTileUpdates({
    sourceMap,
    protectionMap,
    rows: 1,
    cols: 1,
    activeChannelCount: 3,
    currentTick: 4,
    count: 1,
    randomInt: createQueuedRandom([0, 0]),
  });

  assert.deepEqual(protectedTick, []);
  assert.equal(sourceMap[0][0], 1);

  const unlockedTick = assignRandomTileUpdates({
    sourceMap,
    protectionMap,
    rows: 1,
    cols: 1,
    activeChannelCount: 3,
    currentTick: 5,
    count: 1,
    randomInt: createQueuedRandom([0, 1]),
  });

  assert.deepEqual(unlockedTick, [{ row: 0, col: 0, channelIndex: 2 }]);
  assert.equal(sourceMap[0][0], 2);
});

test("assignRandomTileUpdates only updates unprotected tiles once per tick", () => {
  const sourceMap = [];
  const protectionMap = [];
  fillSourceMap(sourceMap, 2, 2, 3, () => 0);
  resetProtectionMap(protectionMap, 2, 2);
  protectionMap[0][0] = 10;

  const updates = assignRandomTileUpdates({
    sourceMap,
    protectionMap,
    rows: 2,
    cols: 2,
    activeChannelCount: 3,
    currentTick: 1,
    count: 4,
    randomInt: createQueuedRandom([0, 0, 0, 0, 0, 0]),
  });

  assert.equal(updates.length, 3);
  assert.deepEqual(
    updates.map(({ row, col }) => [row, col]).sort(),
    [
      [0, 1],
      [1, 0],
      [1, 1],
    ],
  );
  assert.equal(sourceMap[0][0], 0);
});

test("runtime source includes the scheduler helpers used by exported embeds", () => {
  const runtimeSource = createChannelSchedulerRuntimeSource();
  const context = vm.createContext({});
  const script = new vm.Script(`
${runtimeSource}
globalThis.scheduler = {
  CHANNEL_SWITCH_PROTECTION_TICKS,
  assignRandomTileUpdates,
  fillSourceMap,
  pickNextChannelIndex,
  resetProtectionMap,
};
`);
  script.runInContext(context);

  assert.equal(context.scheduler.CHANNEL_SWITCH_PROTECTION_TICKS, 4);
  assert.equal(typeof context.scheduler.assignRandomTileUpdates, "function");
  assert.equal(typeof context.scheduler.fillSourceMap, "function");
  assert.equal(typeof context.scheduler.pickNextChannelIndex, "function");
  assert.equal(typeof context.scheduler.resetProtectionMap, "function");
});

function createQueuedRandom(values) {
  let index = 0;
  return (min, max) => {
    const value = values[index] ?? min;
    index += 1;
    assert.ok(value >= min && value <= max, `queued value ${value} outside ${min}-${max}`);
    return value;
  };
}
