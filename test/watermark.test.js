import test from "node:test";
import assert from "node:assert/strict";

import { shouldApplyExportWatermark } from "../src/watermark.js";

test("export watermark stays disabled for local development hosts", () => {
  assert.equal(shouldApplyExportWatermark(new URL("http://localhost:8080")), false);
  assert.equal(shouldApplyExportWatermark(new URL("http://127.0.0.1:8080")), false);
  assert.equal(shouldApplyExportWatermark(new URL("http://192.168.1.20:8080")), false);
  assert.equal(shouldApplyExportWatermark(new URL("file:///tmp/prismosaic/index.html")), false);
});

test("export watermark is enabled for deployed public hosts", () => {
  assert.equal(shouldApplyExportWatermark(new URL("https://prismosaic.example")), true);
  assert.equal(shouldApplyExportWatermark(new URL("https://rob163.github.io/prismosaic/")), true);
});
