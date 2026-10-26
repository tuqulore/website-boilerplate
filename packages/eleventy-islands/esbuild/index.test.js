import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import fg from "fast-glob";

import islands from "../index.js";
import { preactAdapter } from "../preact/index.js";
import { makeEleventyConfigStub } from "../testing.js";
import { esbuildBundler } from "./index.js";

// preact 本体だけが持つ文字列リテラル。minify 後も残るので、preact 本体が
// どのファイルに同梱されたかの目印にする。
const PREACT_MARKER = "http://www.w3.org/2000/svg";

const runBundle = async (dir, bundlerOptions) => {
  const config = makeEleventyConfigStub({
    pathPrefix: "/blog/",
    input: `${path.join(dir, "src")}/`,
    output: `${path.join(dir, "dist")}/`,
  });
  islands(config, { adapter: preactAdapter, bundler: esbuildBundler(bundlerOptions) });
  await config._emit("eleventy.before", { runMode: "build" });
};

describe("esbuildBundler .client.* が無いサイト", () => {
  // 回帰テスト: 素の <is-land> だけのページにも setup は注入されるので、
  // .client.* が 0 件でも setup を出力しないと 404 になる。
  it("setup だけをバンドルして出力する", async () => {
    const dir = await fs.mkdtemp(path.join(import.meta.dirname, ".tmp-empty-test-"));
    try {
      await fs.mkdir(path.join(dir, "src"));
      await runBundle(dir);
      const setup = await fs.readFile(path.join(dir, "dist", "__island-setup.js"), "utf8");
      assert.match(setup, /\.define\(\)/);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});

// A client entry that pulls in both preact hooks and @preact/signals.
const clientIsland = (name) => `import { useSignal } from "@preact/signals";
import { useId } from "preact/hooks";
import { clientComponent } from ${JSON.stringify(path.join(import.meta.dirname, "..", "island.js"))};

function ${name}() {
  const count = useSignal(0);
  return <button id={useId()} onClick={() => count.value++}>{count}</button>;
}
export default clientComponent(${name}, import.meta.url);
`;

describe("esbuildBundler バンドル", () => {
  let dir;

  before(async () => {
    dir = await fs.mkdtemp(path.join(import.meta.dirname, ".tmp-bundle-test-"));
    const src = path.join(dir, "src");
    await fs.mkdir(path.join(src, "nested"), { recursive: true });
    await fs.writeFile(path.join(src, "a.client.jsx"), clientIsland("A"));
    await fs.writeFile(path.join(src, "nested", "b.client.jsx"), clientIsland("B"));

    await runBundle(dir);
  });

  after(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  const readOutputs = async () => {
    const files = await fg("**/*.js", { cwd: path.join(dir, "dist") });
    return Promise.all(
      files.map(async (file) => ({
        file,
        code: await fs.readFile(path.join(dir, "dist", file), "utf8"),
      })),
    );
  };

  it("client エントリと setup が resolver の規約どおりのパスに出力される", async () => {
    const files = new Set((await readOutputs()).map(({ file }) => file));
    assert.ok(files.has("a.client.js"));
    assert.ok(files.has("nested/b.client.js"));
    assert.ok(files.has("__island-setup.js"));
  });

  it("build では minify して出力する", async () => {
    for (const { file, code } of await readOutputs()) {
      assert.doesNotMatch(code.trimEnd(), /\n/, file);
    }
  });

  it("is-land だけは ?nodefine 付き URL の external import として残る", async () => {
    const setup = await fs.readFile(path.join(dir, "dist", "__island-setup.js"), "utf8");
    assert.match(setup, /from\s*"\/blog\/is-land\.js\?nodefine"/);
  });

  it("preact / signals / devalue の bare import が残らない", async () => {
    for (const { file, code } of await readOutputs()) {
      assert.doesNotMatch(
        code,
        /from\s*"(preact|preact\/hooks|@preact\/signals|@preact\/signals-core|devalue)"/,
        file,
      );
    }
  });

  // 回帰テスト: preact と signals が複数ファイルに複製されると options の patch と
  // signal graph が分裂し、hooks の不整合や Cycle detected の誤発火を起こす。
  it("preact と signals-core の実装はそれぞれ 1 ファイルにだけ含まれる", async () => {
    const outputs = await readOutputs();
    const count = (marker) => outputs.filter(({ code }) => code.includes(marker)).length;
    assert.strictEqual(count("Cycle detected"), 1, "signals-core");
    assert.strictEqual(count(PREACT_MARKER), 1, "preact");
  });
});

describe("esbuildBundler esbuildOptions", () => {
  let dir;

  before(async () => {
    dir = await fs.mkdtemp(path.join(import.meta.dirname, ".tmp-options-test-"));
    await fs.mkdir(path.join(dir, "src"));
    await fs.writeFile(path.join(dir, "src", "a.client.jsx"), clientIsland("A"));
  });

  after(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("plugins は組み込みの setup plugin の後に追加し、それ以外は既定値を上書きする", async () => {
    const seen = [];
    /** @type {import("esbuild").Plugin} */
    const plugin = {
      name: "record-entries",
      setup(build) {
        build.onStart(() => {
          seen.push(build.initialOptions.minify);
        });
      },
    };
    await runBundle(dir, { esbuildOptions: { minify: false, plugins: [plugin] } });
    assert.deepStrictEqual(seen, [false]);
    const setup = await fs.readFile(path.join(dir, "dist", "__island-setup.js"), "utf8");
    assert.match(setup, /\n./);
  });

  for (const key of ["bundle", "chunkNames", "entryPoints", "format", "outdir", "splitting"]) {
    it(`出力の配置を決める ${key} は上書きできない`, () => {
      assert.throws(
        () => esbuildBundler({ esbuildOptions: { [key]: undefined } }),
        (err) => err instanceof TypeError && err.message.includes(`\`${key}\``),
      );
    });
  }
});
