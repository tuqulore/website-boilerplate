import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import url from "node:url";

import islands from "./index.js";
import { clientComponent, islandAttributes } from "./island.js";
import { makeEleventyConfigStub } from "./testing.js";

const PAGE_WITH_ISLAND = '<html><head></head><body><is-land type="test"></is-land></body></html>';
const MOUNT_MODULE = url.pathToFileURL("/adapter/mount.js").href;
const testAdapter = { type: "test", mountModule: MOUNT_MODULE };

const importUrlOf = (component) => islandAttributes(component, {}, { type: "test" }).attrs.import;

/**
 * Run the plugin without a bundler into a temp output directory and return
 * the written setup module source and a page with an Island after the transform.
 */
async function runUnbundled({ pathPrefix, runMode = "build" } = {}) {
  const dir = await fs.mkdtemp(path.join(import.meta.dirname, ".tmp-setup-test-"));
  try {
    const config = makeEleventyConfigStub({ pathPrefix, output: `${dir}/` });
    islands(config, { adapter: testAdapter });
    await config._emit("eleventy.before", { runMode });
    return {
      source: await fs.readFile(path.join(dir, "__island-setup.js"), "utf8"),
      html: config._transform("islands-inject", PAGE_WITH_ISLAND, "dist/index.html"),
    };
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

describe("Island plugin URL prefix ↔ Eleventy pathPrefix / directories", () => {
  it("pathPrefix 未設定 (デフォルト /) では import が / から始まる", () => {
    const config = makeEleventyConfigStub({ pathPrefix: "/" });
    islands(config, { adapter: testAdapter });

    const Foo = clientComponent(() => null, "file:///proj/src/foo.client.jsx");
    assert.match(importUrlOf(Foo), /^\/foo\.client\.js$/);
  });

  it("pathPrefix が undefined (Eleventy 起動前) でもフォールバックで / を使う", () => {
    const config = makeEleventyConfigStub({ pathPrefix: undefined });
    islands(config, { adapter: testAdapter });

    const Foo = clientComponent(() => null, "file:///proj/src/foo.client.jsx");
    assert.match(importUrlOf(Foo), /^\/foo\.client\.js$/);
  });

  it("pathPrefix=/blog/ ではサブディレクトリデプロイの URL を反映する", () => {
    const config = makeEleventyConfigStub({ pathPrefix: "/blog/" });
    islands(config, { adapter: testAdapter });

    const Foo = clientComponent(() => null, "file:///proj/src/foo.client.jsx");
    assert.match(importUrlOf(Foo), /^\/blog\/foo\.client\.js$/);
  });

  it("pathPrefix=/blog (末尾スラッシュ無し) も正規化されて /blog/foo.client.js になる", () => {
    const config = makeEleventyConfigStub({ pathPrefix: "/blog" });
    islands(config, { adapter: testAdapter });

    const Foo = clientComponent(() => null, "file:///proj/src/foo.client.jsx");
    assert.match(importUrlOf(Foo), /^\/blog\/foo\.client\.js$/);
  });

  it("directories.input に追随する (カスタム input と pathPrefix を併用)", () => {
    const config = makeEleventyConfigStub({
      pathPrefix: "/assets/",
      input: "/proj/content/",
    });
    islands(config, { adapter: testAdapter });

    const Foo = clientComponent(() => null, "file:///proj/content/foo.client.jsx");
    assert.match(importUrlOf(Foo), /^\/assets\/foo\.client\.js$/);
  });
});

describe("Island plugin setup 注入 ↔ Eleventy pathPrefix", () => {
  it("pathPrefix=/blog/ では setup を /blog/__island-setup.js から読み、importmap は注入しない", () => {
    const config = makeEleventyConfigStub({ pathPrefix: "/blog/" });
    islands(config, { adapter: testAdapter });

    const html = config._transform("islands-inject", PAGE_WITH_ISLAND, "dist/index.html");
    assert.match(
      html,
      /<script type="module" src="\/blog\/__island-setup\.js"><\/script>\n<\/head>/,
    );
    assert.doesNotMatch(html, /importmap/);
  });

  it("pathPrefix 未設定では setup を /__island-setup.js から読む", () => {
    const config = makeEleventyConfigStub({ pathPrefix: undefined });
    islands(config, { adapter: testAdapter });

    const html = config._transform("islands-inject", PAGE_WITH_ISLAND, "dist/index.html");
    assert.match(html, /<script type="module" src="\/__island-setup\.js"><\/script>/);
  });

  it("大文字混じりの <IS-LAND> を手書きしたページにも注入する", () => {
    const config = makeEleventyConfigStub();
    islands(config, { adapter: testAdapter });

    const page = '<html><head></head><body><IS-LAND type="test"></IS-LAND></body></html>';
    const html = config._transform("islands-inject", page, "dist/index.html");
    assert.match(html, /<script type="module" src="\/__island-setup\.js"><\/script>/);
  });

  it("大文字の </HEAD> の直前にも注入し、元の表記を保つ", () => {
    const config = makeEleventyConfigStub();
    islands(config, { adapter: testAdapter });

    const page = '<HTML><HEAD></HEAD><BODY><is-land type="test"></is-land></BODY></HTML>';
    const html = config._transform("islands-inject", page, "dist/index.html");
    assert.match(html, /<script type="module" src="\/__island-setup\.js"><\/script>\n<\/HEAD>/);
  });

  it("</head> が無いページには注入せず警告する", (t) => {
    const warn = t.mock.method(console, "warn", () => {});
    const config = makeEleventyConfigStub();
    islands(config, { adapter: testAdapter });

    const page = '<is-land type="test"></is-land>';
    assert.strictEqual(config._transform("islands-inject", page, "dist/index.html"), page);
    assert.strictEqual(warn.mock.callCount(), 1);
    assert.match(warn.mock.calls[0].arguments[0], /No <\/head> tag found/);
  });

  it("名前が is-land で始まる別の要素だけでは注入しない", () => {
    const config = makeEleventyConfigStub();
    islands(config, { adapter: testAdapter });

    const page = "<html><head></head><body><is-landing></is-landing></body></html>";
    assert.strictEqual(config._transform("islands-inject", page, "dist/index.html"), page);
  });

  it("<is-land> を含まないページには何も注入しない", () => {
    const config = makeEleventyConfigStub();
    islands(config, { adapter: testAdapter });

    const page = "<html><head></head><body></body></html>";
    assert.strictEqual(config._transform("islands-inject", page, "dist/index.html"), page);
  });
});

describe("Island plugin setup モジュールの初期化", () => {
  // 回帰テスト: is-land を `?nodefine` 付き URL で import し、かつ
  // `Island.attributePrefix = "land-on:"` を `Island.define()` より前で行うことを
  // 同時に固定する。片方だけ壊れると <is-land> は「条件属性なし = 即 hydrate」
  // と判定され、`on="interaction"` 等の遅延ハイドレーションが無効化される。
  it("is-land を ?nodefine 付き URL で import し、attributePrefix 上書き → Island.define() の順で呼ぶ", async () => {
    const { source } = await runUnbundled({ pathPrefix: "/blog/" });

    assert.match(source, /^import \{ Island \} from "\/blog\/is-land\.js\?nodefine";$/m);
    const prefixIdx = source.indexOf('Island.attributePrefix = "land-on:"');
    const defineIdx = source.indexOf("Island.define()");
    assert.ok(prefixIdx > -1, "attributePrefix 上書きが setup に無い");
    assert.ok(defineIdx > -1, "明示 Island.define() 呼び出しが setup に無い");
    assert.ok(
      prefixIdx < defineIdx,
      "Island.attributePrefix は Island.define() より前に設定しないと customElements 登録に反映されない",
    );
  });
});

describe("Island plugin dev フック ↔ Eleventy runMode", () => {
  it("serve では setup に __eleventyRehydrate を、HTML に WebSocket フックを入れる", async () => {
    const { source, html } = await runUnbundled({ runMode: "serve" });
    assert.match(source, /window\.__eleventyRehydrate = /);
    assert.match(html, /window\.__eleventyRehydrate\?\.\(\)/);
  });

  it("build では dev フックを入れない", async () => {
    const { source, html } = await runUnbundled({ runMode: "build" });
    assert.doesNotMatch(source, /__eleventyRehydrate/);
    assert.doesNotMatch(html, /__eleventyRehydrate/);
  });
});

describe("Island plugin setup の import 解決", () => {
  // 回帰テスト: setup は別モジュールなので、素の <is-land import="./x.js"> の
  // 相対パスを setup の URL ではなくページ基準で解決しないと hydrate に失敗する。
  it("import 属性を document.baseURI 基準の URL にしてから import する", async () => {
    const { source } = await runUnbundled();
    assert.match(
      source,
      /import\(new URL\(target\.getAttribute\("import"\), document\.baseURI\)\.href\)/,
    );
  });
});

describe("Island plugin setup の mount 方式", () => {
  it("adapter の mount モジュールを import し、client-only 属性の有無を渡して mount する", async () => {
    const { source } = await runUnbundled();
    assert.match(
      source,
      new RegExp(
        `^import \\{ mount \\} from ${RegExp.escape(JSON.stringify(url.fileURLToPath(MOUNT_MODULE)))};$`,
        "m",
      ),
    );
    assert.match(
      source,
      /await mount\(target, component\.default, props, \{ clientOnly: target\.hasAttribute\("client-only"\) \}\);/,
    );
  });

  it("adapter の type で is-land の init type を登録し、dev 時の再ハイドレーション対象を選ぶ", async () => {
    const { source } = await runUnbundled({ runMode: "serve" });
    assert.match(source, /^Island\.addInitType\("test", init\);$/m);
    assert.match(source, /document\.querySelectorAll\("is-land\[type=\\"test\\"\]"\)/);
  });
});

describe("Island plugin bundler 未指定", () => {
  it("setup を未バンドルのまま出力に書き出す (devalue は bare import)", async () => {
    const { source } = await runUnbundled();
    assert.match(source, /^import \{ parse \} from "devalue";$/m);
  });
});

describe("Island plugin bundler 指定", () => {
  it("eleventy.before ごとに runMode と規約を渡して bundler を呼び、setup は書き出さない", async () => {
    const calls = [];
    const config = makeEleventyConfigStub({
      pathPrefix: "/blog/",
      input: "./src/",
      output: "./dist/",
    });
    islands(config, { adapter: testAdapter, bundler: (context) => calls.push(context) });
    await config._emit("eleventy.before", { runMode: "serve" });

    assert.strictEqual(calls.length, 1);
    const [context] = calls;
    assert.strictEqual(context.runMode, "serve");
    assert.strictEqual(context.inputDir, "./src/");
    assert.strictEqual(context.outputDir, "./dist/");
    assert.strictEqual(context.clientGlob, "./src/**/*.client.{js,jsx,ts,tsx}");
    assert.strictEqual(
      context.clientEntryOut("src/nested/b.client.tsx"),
      path.join("nested", "b.client"),
    );
    assert.strictEqual(context.setup.name, "__island-setup");
    assert.strictEqual(context.setup.isLandUrl, "/blog/is-land.js?nodefine");
    assert.strictEqual(context.setup.mountModule, url.fileURLToPath(MOUNT_MODULE));
    assert.strictEqual(context.adapter, testAdapter);
    // serve の eleventy.before が先に走るので、dev フック入りの setup になる
    assert.match(context.setup.source(), /__eleventyRehydrate/);
  });
});

describe("Island plugin オプションの検証", () => {
  for (const [label, options] of [
    ["adapter 未指定", {}],
    ["type が不正", { adapter: { type: 'a"b', mountModule: MOUNT_MODULE } }],
    ["mountModule が file URL でない", { adapter: { type: "test", mountModule: "./mount.js" } }],
    ["bundler が関数でない", { adapter: testAdapter, bundler: {} }],
  ]) {
    it(`${label}なら TypeError`, () => {
      assert.throws(() => islands(makeEleventyConfigStub(), options), TypeError);
    });
  }
});

describe("Island plugin ignore ルール (常時追加)", () => {
  it("bundler の有無によらず .client.* を input 配下で ignore に追加する", () => {
    for (const bundler of [undefined, () => {}]) {
      const config = makeEleventyConfigStub({ input: "./src/" });
      islands(config, { adapter: testAdapter, bundler });
      assert.deepStrictEqual(config._ignoreAdds, ["./src/**/*.client.{js,jsx,ts,tsx}"]);
    }
  });

  // NOTE: Eleventy の directories.input は常に「./ 前置 + 末尾スラッシュ」に正規化
  // される (ProjectDirectories.normalizeDirectory)。input 未設定 (プロジェクト
  // ルート) の正規化形 "./" でも有効な glob になることをここで固定する。
  it("input がプロジェクトルート (正規化形 './') でも有効な glob を追加する", () => {
    const config = makeEleventyConfigStub({ input: "./" });
    islands(config, { adapter: testAdapter });
    assert.deepStrictEqual(config._ignoreAdds, ["./**/*.client.{js,jsx,ts,tsx}"]);
  });
});

describe("Island plugin is-land.js の passthrough copy ターゲット", () => {
  // NOTE: ここは「dist の有無で書き出し結果が変わる」不具合の回帰テスト。
  // ターゲットに "/" を渡すと Eleventy 側で末尾スラッシュが剥がれた結果
  // クリーンビルド時に <outputDir> 自体がファイルに化ける。ターゲットは必ず
  // 出力ファイル名を含む文字列 ("/is-land.js") でなければならない。
  it("ターゲットが '/is-land.js' で addPassthroughCopy に登録される", () => {
    const config = makeEleventyConfigStub();
    islands(config, { adapter: testAdapter });

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
});
