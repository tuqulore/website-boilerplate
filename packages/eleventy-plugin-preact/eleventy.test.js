import assert from "node:assert";
import { describe, it } from "node:test";

import { eleventy as fromData, runWithEleventyData } from "@tuqulore-inc/eleventy-data";

import { eleventy } from "./eleventy.js";

describe("eleventy (非推奨の旧パス)", () => {
  it("@tuqulore-inc/eleventy-data と同じシングルトンを返す", () => {
    assert.strictEqual(eleventy, fromData);
    runWithEleventyData({ title: "Hello" }, () => {
      assert.strictEqual(eleventy.title, "Hello");
    });
  });
});
