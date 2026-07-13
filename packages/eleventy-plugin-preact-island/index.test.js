import { createRequire } from "node:module";
import path from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert";
import { h } from "preact";
import { render } from "preact-render-to-string";
import preactIsland from "./index.js";
import { Island, clientComponent } from "./island.js";

const require = createRequire(import.meta.url);

/**
 * Minimal UserConfig stub carrying only what the plugin actually reads.
 * `versionCheck` is called defensively; `addPassthroughCopy` / `addTransform`
 * are called unconditionally in the plugin body. `directories` mirrors
 * Eleventy's userspace live getter (input/output). `pathPrefix` and `input`
 * are the inputs under test. `on` records event handlers so tests can inspect
 * registration and invoke `eleventy.before` without spinning up Eleventy.
 * `ignores.add` records patterns so tests can assert the always-on ignore rule.
 */
function makeEleventyConfigStub({
  pathPrefix,
  input = "/proj/src/",
  output = "/proj/dist/",
} = {}) {
  const eventHandlers = new Map();
  const ignoreAdds = [];
  const transforms = new Map();
  const passthroughCopies = [];
  return {
    pathPrefix,
    directories: { input, output },
    versionCheck() {},
    addPassthroughCopy(arg) {
      passthroughCopies.push(arg);
    },
    _passthroughCopies: passthroughCopies,
    addTransform(name, fn) {
      transforms.set(name, fn);
    },
    _transform(name, content, outputPath) {
      return transforms.get(name)(content, outputPath);
    },
    ignores: {
      add(pattern) {
        ignoreAdds.push(pattern);
      },
    },
    _ignoreAdds: ignoreAdds,
    on(event, handler) {
      if (!eventHandlers.has(event)) eventHandlers.set(event, []);
      eventHandlers.get(event).push(handler);
    },
    _hasHandler(event) {
      return (eventHandlers.get(event) ?? []).length > 0;
    },
    async _emit(event, arg) {
      for (const handler of eventHandlers.get(event) ?? []) {
        await handler(arg);
      }
    },
  };
}

describe("Island plugin URL prefix ↔ Eleventy pathPrefix / directories", () => {
  it("pathPrefix 未設定 (デフォルト /) では import が / から始まる", () => {
    const config = makeEleventyConfigStub({ pathPrefix: "/" });
    preactIsland(config);

    const Foo = clientComponent(
      () => h("span", null, "x"),
      "file:///proj/src/foo.client.jsx",
    );
    const html = render(h(Island, { component: Foo }));
    assert.match(html, /import="\/foo\.client\.js"/);
  });

  it("pathPrefix が undefined (Eleventy 起動前) でもフォールバックで / を使う", () => {
    const config = makeEleventyConfigStub({ pathPrefix: undefined });
    preactIsland(config);

    const Foo = clientComponent(() => null, "file:///proj/src/foo.client.jsx");
    const html = render(h(Island, { component: Foo }));
    assert.match(html, /import="\/foo\.client\.js"/);
  });

  it("pathPrefix=/blog/ ではサブディレクトリデプロイの URL を反映する", () => {
    const config = makeEleventyConfigStub({ pathPrefix: "/blog/" });
    preactIsland(config);

    const Foo = clientComponent(() => null, "file:///proj/src/foo.client.jsx");
    const html = render(h(Island, { component: Foo }));
    assert.match(html, /import="\/blog\/foo\.client\.js"/);
  });

  it("pathPrefix=/blog (末尾スラッシュ無し) も正規化されて /blog/foo.client.js になる", () => {
    const config = makeEleventyConfigStub({ pathPrefix: "/blog" });
    preactIsland(config);

    const Foo = clientComponent(() => null, "file:///proj/src/foo.client.jsx");
    const html = render(h(Island, { component: Foo }));
    assert.match(html, /import="\/blog\/foo\.client\.js"/);
  });

  it("directories.input に追随する (カスタム input と pathPrefix を併用)", () => {
    const config = makeEleventyConfigStub({
      pathPrefix: "/assets/",
      input: "/proj/content/",
    });
    preactIsland(config);

    const Foo = clientComponent(
      () => null,
      "file:///proj/content/foo.client.jsx",
    );
    const html = render(h(Island, { component: Foo }));
    assert.match(html, /import="\/assets\/foo\.client\.js"/);
  });
});

describe("Island plugin importmap ↔ Eleventy pathPrefix", () => {
  it("pathPrefix=/blog/ では importmap の is-land も /blog/is-land.js を指す", () => {
    const config = makeEleventyConfigStub({ pathPrefix: "/blog/" });
    preactIsland(config);

    const html = config._transform(
      "preact-island-inject",
      "<html><head></head><body></body></html>",
      "dist/index.html",
    );
    assert.match(html, /"is-land": "\/blog\/is-land\.js"/);
  });

  it("pathPrefix 未設定では importmap の is-land は /is-land.js を指す", () => {
    const config = makeEleventyConfigStub({ pathPrefix: undefined });
    preactIsland(config);

    const html = config._transform(
      "preact-island-inject",
      "<html><head></head><body></body></html>",
      "dist/index.html",
    );
    assert.match(html, /"is-land": "\/is-land\.js"/);
  });
});

describe("Island plugin importmap ↔ preact バージョン自動検出", () => {
  it("preactVersion 未指定時は importmap がインストール済 preact のバージョンで pin される", () => {
    const config = makeEleventyConfigStub({ pathPrefix: undefined });
    preactIsland(config);

    const html = config._transform(
      "preact-island-inject",
      "<html><head></head><body></body></html>",
      "dist/index.html",
    );
    // テスト側でもプラグインと同じ peer 依存の preact を参照するので値は一致する
    const { version } = require("preact/package.json");
    assert.ok(
      html.includes(`https://esm.sh/preact@${version}"`),
      `expected importmap to pin preact to @${version}, got: ${html}`,
    );
    assert.ok(
      html.includes(`https://esm.sh/preact@${version}/hooks?external=preact`),
    );
    assert.ok(
      html.includes(
        `https://esm.sh/preact@${version}/jsx-runtime?external=preact`,
      ),
    );
  });

  it("preactVersion 指定時は指定値が優先され、警告は出ない", (t) => {
    const warn = t.mock.method(console, "warn");
    const config = makeEleventyConfigStub({ pathPrefix: undefined });
    preactIsland(config, { preactVersion: "10.20.0" });

    const html = config._transform(
      "preact-island-inject",
      "<html><head></head><body></body></html>",
      "dist/index.html",
    );
    assert.ok(html.includes(`https://esm.sh/preact@10.20.0"`));
    assert.strictEqual(warn.mock.callCount(), 0);
  });
});

describe("Island plugin bundle オプション", () => {
  it("デフォルト (bundle 省略) は esbuild 用の eleventy.before ハンドラを登録する", () => {
    const config = makeEleventyConfigStub();
    preactIsland(config);
    assert.ok(config._hasHandler("eleventy.before"));
  });

  it("bundle: false では eleventy.before ハンドラを登録しない (esbuild を止める)", () => {
    const config = makeEleventyConfigStub();
    preactIsland(config, { bundle: false });
    assert.ok(!config._hasHandler("eleventy.before"));
  });
});

describe("Island plugin ignore ルール (常時追加)", () => {
  it("bundle デフォルトでも .client.* を input 配下で ignore に追加する", () => {
    const config = makeEleventyConfigStub({ input: "./src/" });
    preactIsland(config);
    assert.deepStrictEqual(config._ignoreAdds, [
      "./src/**/*.client.{js,jsx,ts,tsx}",
    ]);
  });

  it("bundle: false でも .client.* を ignore に追加する (バンドラー選択と独立)", () => {
    const config = makeEleventyConfigStub({ input: "./src/" });
    preactIsland(config, { bundle: false });
    assert.deepStrictEqual(config._ignoreAdds, [
      "./src/**/*.client.{js,jsx,ts,tsx}",
    ]);
  });

  // NOTE: Eleventy の directories.input は常に「./ 前置 + 末尾スラッシュ」に正規化
  // される (ProjectDirectories.normalizeDirectory)。input 未設定 (プロジェクト
  // ルート) の正規化形 "./" でも有効な glob になることをここで固定する。
  it("input がプロジェクトルート (正規化形 './') でも有効な glob を追加する", () => {
    const config = makeEleventyConfigStub({ input: "./" });
    preactIsland(config);
    assert.deepStrictEqual(config._ignoreAdds, [
      "./**/*.client.{js,jsx,ts,tsx}",
    ]);
  });
});

describe("Island plugin is-land.js の passthrough copy ターゲット", () => {
  // NOTE: ここは「dist の有無で書き出し結果が変わる」不具合の回帰テスト。
  // ターゲットに "/" を渡すと Eleventy 側で末尾スラッシュが剥がれた結果
  // クリーンビルド時に <outputDir> 自体がファイルに化ける。ターゲットは必ず
  // 出力ファイル名を含む文字列 ("/is-land.js") でなければならない。
  it("ターゲットが '/is-land.js' で addPassthroughCopy に登録される", () => {
    const config = makeEleventyConfigStub();
    preactIsland(config);

    const entries = config._passthroughCopies.filter(
      (arg) => arg && typeof arg === "object" && !Array.isArray(arg),
    );
    assert.strictEqual(entries.length, 1, "expected a single object-form copy");
    const targets = Object.values(entries[0]);
    assert.deepStrictEqual(targets, ["/is-land.js"]);
    // NOTE: source 側は import.meta.resolve('@11ty/is-land/is-land.js') を
    // url.fileURLToPath したパス。実体は pnpm store 等のインストール先で
    // プロジェクトごとに値が変わる。Windows では path.sep が '\' なので
    // 末尾一致ではなく path.basename でファイル名だけを固定する。
    const [source] = Object.keys(entries[0]);
    assert.strictEqual(path.basename(source), "is-land.js");
  });

  it("bundle: false でも is-land.js の passthrough copy は登録される", () => {
    const config = makeEleventyConfigStub();
    preactIsland(config, { bundle: false });

    const entries = config._passthroughCopies.filter(
      (arg) => arg && typeof arg === "object" && !Array.isArray(arg),
    );
    assert.strictEqual(entries.length, 1);
    assert.deepStrictEqual(Object.values(entries[0]), ["/is-land.js"]);
  });
});
