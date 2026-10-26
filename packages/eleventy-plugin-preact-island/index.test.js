import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { pathToFileURL } from "node:url";

import { h } from "preact";
import { render } from "preact-render-to-string";

import { Island, clientComponent } from "./island.js";

// NOTE: 読み込み時の非推奨警告を捕まえるため、console.warn を差し替えてから動的 import する。
const warnings = [];
const originalWarn = console.warn;
console.warn = (message) => warnings.push(message);
const { default: preactIsland } = await import("./index.js");
console.warn = originalWarn;

function makeEleventyConfigStub({ output }) {
  const handlers = [];
  return {
    pathPrefix: "/",
    directories: { input: `${path.join(output, "..", "src")}/`, output: `${output}/` },
    versionCheck() {},
    addPassthroughCopy() {},
    addTransform() {},
    ignores: { add() {} },
    on(event, handler) {
      if (event === "eleventy.before") handlers.push(handler);
    },
    async emitBefore(runMode) {
      for (const handler of handlers) {
        // oxlint-disable-next-line no-await-in-loop
        await handler({ runMode });
      }
    },
  };
}

const runPlugin = async (options) => {
  const dir = await fs.mkdtemp(path.join(import.meta.dirname, ".tmp-compat-test-"));
  try {
    await fs.mkdir(path.join(dir, "src"));
    const config = makeEleventyConfigStub({ output: path.join(dir, "dist") });
    preactIsland(config, options);
    await config.emitBefore("build");
    return await fs.readFile(path.join(dir, "dist", "__island-setup.js"), "utf8");
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
};

describe("eleventy-plugin-preact-island (非推奨の互換パッケージ)", () => {
  it("読み込み時に移行先を示す警告を 1 回出す", () => {
    assert.strictEqual(warnings.length, 1);
    assert.match(warnings[0], /deprecated.*@tuqulore-inc\/eleventy-islands/);
  });

  it("既定では esbuild でバンドルする", async () => {
    const setup = await runPlugin();
    assert.doesNotMatch(setup, /from\s*"devalue"/);
  });

  it("bundle: false では setup を未バンドルのまま書き出す", async () => {
    const setup = await runPlugin({ bundle: false });
    assert.match(setup, /^import \{ parse \} from "devalue";$/m);
  });

  it("preactVersion / devalueVersion には非推奨の警告を出す", async (t) => {
    const warn = t.mock.method(console, "warn", () => {});
    await runPlugin({ bundle: false, preactVersion: "1", devalueVersion: "1" });
    assert.strictEqual(warn.mock.callCount(), 2);
  });

  it("./island の Island は eleventy-islands と同じ resolver を使う", async () => {
    const dir = await fs.mkdtemp(path.join(import.meta.dirname, ".tmp-compat-test-"));
    try {
      preactIsland(makeEleventyConfigStub({ output: path.join(dir, "dist") }));
      const Foo = clientComponent(
        () => null,
        pathToFileURL(path.join(dir, "src", "foo.client.jsx")).href,
      );
      assert.match(render(h(Island, { component: Foo })), /import="\/foo\.client\.js"/);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
