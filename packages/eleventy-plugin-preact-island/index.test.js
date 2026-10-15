import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import fg from "fast-glob";
import { h } from "preact";
import { render } from "preact-render-to-string";

import preactIsland from "./index.js";
import { Island, clientComponent } from "./island.js";

const PAGE_WITH_ISLAND = '<html><head></head><body><is-land type="preact"></is-land></body></html>';
// esbuild が非 minify 出力でモジュールごとに付ける由来コメント。preact 本体が
// どのファイルに同梱されたかの目印にする。
const PREACT_MARKER = "/preact/dist/preact.module.js";

/**
 * Minimal UserConfig stub carrying only what the plugin actually reads.
 * `versionCheck` is called defensively; `addPassthroughCopy` / `addTransform`
 * are called unconditionally in the plugin body. `directories` mirrors
 * Eleventy's userspace live getter (input/output). `pathPrefix` and `input`
 * are the inputs under test. `on` records event handlers so tests can inspect
 * registration and invoke `eleventy.before` without spinning up Eleventy.
 * `ignores.add` records patterns so tests can assert the always-on ignore rule.
 */
function makeEleventyConfigStub({ pathPrefix, input = "/proj/src/", output = "/proj/dist/" } = {}) {
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

/**
 * Run the `bundle: false` path into a temp output directory and return the
 * written setup module source and a page with an Island after the transform.
 * It avoids esbuild, whose watch context would keep a `serve` run alive.
 */
async function runUnbundled({ pathPrefix, runMode = "build" } = {}) {
  const dir = await fs.mkdtemp(path.join(import.meta.dirname, ".tmp-setup-test-"));
  try {
    const config = makeEleventyConfigStub({ pathPrefix, output: `${dir}/` });
    preactIsland(config, { bundle: false });
    await config._emit("eleventy.before", { runMode });
    return {
      source: await fs.readFile(path.join(dir, "__island-setup.js"), "utf8"),
      html: config._transform("preact-island-inject", PAGE_WITH_ISLAND, "dist/index.html"),
    };
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

describe("Island plugin URL prefix ↔ Eleventy pathPrefix / directories", () => {
  it("pathPrefix 未設定 (デフォルト /) では import が / から始まる", () => {
    const config = makeEleventyConfigStub({ pathPrefix: "/" });
    preactIsland(config);

    const Foo = clientComponent(() => h("span", null, "x"), "file:///proj/src/foo.client.jsx");
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

    const Foo = clientComponent(() => null, "file:///proj/content/foo.client.jsx");
    const html = render(h(Island, { component: Foo }));
    assert.match(html, /import="\/assets\/foo\.client\.js"/);
  });
});

describe("Island plugin setup 注入 ↔ Eleventy pathPrefix", () => {
  it("pathPrefix=/blog/ では setup を /blog/__island-setup.js から読み、importmap は注入しない", () => {
    const config = makeEleventyConfigStub({ pathPrefix: "/blog/" });
    preactIsland(config);

    const html = config._transform("preact-island-inject", PAGE_WITH_ISLAND, "dist/index.html");
    assert.match(
      html,
      /<script type="module" src="\/blog\/__island-setup\.js"><\/script>\n<\/head>/,
    );
    assert.doesNotMatch(html, /importmap/);
  });

  it("pathPrefix 未設定では setup を /__island-setup.js から読む", () => {
    const config = makeEleventyConfigStub({ pathPrefix: undefined });
    preactIsland(config);

    const html = config._transform("preact-island-inject", PAGE_WITH_ISLAND, "dist/index.html");
    assert.match(html, /<script type="module" src="\/__island-setup\.js"><\/script>/);
  });

  it("大文字混じりの <IS-LAND> を手書きしたページにも注入する", () => {
    const config = makeEleventyConfigStub();
    preactIsland(config);

    const page = '<html><head></head><body><IS-LAND type="preact"></IS-LAND></body></html>';
    const html = config._transform("preact-island-inject", page, "dist/index.html");
    assert.match(html, /<script type="module" src="\/__island-setup\.js"><\/script>/);
  });

  it("名前が is-land で始まる別の要素だけでは注入しない", () => {
    const config = makeEleventyConfigStub();
    preactIsland(config);

    const page = "<html><head></head><body><is-landing></is-landing></body></html>";
    assert.strictEqual(config._transform("preact-island-inject", page, "dist/index.html"), page);
  });

  it("<is-land> を含まないページには何も注入しない", () => {
    const config = makeEleventyConfigStub();
    preactIsland(config);

    const page = "<html><head></head><body></body></html>";
    assert.strictEqual(config._transform("preact-island-inject", page, "dist/index.html"), page);
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

describe("Island plugin 非推奨オプション", () => {
  for (const name of ["preactVersion", "devalueVersion"]) {
    it(`${name} を指定すると非推奨警告を 1 回出す`, (t) => {
      const warn = t.mock.method(console, "warn", () => {});
      preactIsland(makeEleventyConfigStub(), { [name]: "1.0.0" });
      assert.strictEqual(warn.mock.callCount(), 1);
      assert.match(warn.mock.calls[0].arguments[0], new RegExp(`\`${name}\` is deprecated`));
    });
  }

  it("指定しなければ警告は出ない", (t) => {
    const warn = t.mock.method(console, "warn");
    preactIsland(makeEleventyConfigStub());
    assert.strictEqual(warn.mock.callCount(), 0);
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

describe("Island plugin .client.* が無いサイト", () => {
  // 回帰テスト: 素の <is-land> だけのページにも setup は注入されるので、
  // .client.* が 0 件でも setup を出力しないと 404 になる。
  it("setup だけをバンドルして出力する", async () => {
    const dir = await fs.mkdtemp(path.join(import.meta.dirname, ".tmp-empty-test-"));
    try {
      await fs.mkdir(path.join(dir, "src"));
      const config = makeEleventyConfigStub({
        input: `${path.join(dir, "src")}/`,
        output: `${path.join(dir, "dist")}/`,
      });
      preactIsland(config);
      await config._emit("eleventy.before", { runMode: "build" });
      const setup = await fs.readFile(path.join(dir, "dist", "__island-setup.js"), "utf8");
      assert.match(setup, /Island\.define\(\)/);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});

describe("Island plugin bundle: false", () => {
  it("setup を未バンドルのまま出力に書き出す (preact / devalue は bare import)", async () => {
    const { source } = await runUnbundled();

    assert.match(source, /^import \{ h, hydrate \} from "preact";$/m);
    assert.match(source, /^import \{ parse \} from "devalue";$/m);
  });
});

// A client entry that pulls in both preact hooks and @preact/signals.
const clientIsland = (name) => `import { useSignal } from "@preact/signals";
import { useId } from "preact/hooks";
import { clientComponent } from ${JSON.stringify(path.join(import.meta.dirname, "island.js"))};

function ${name}() {
  const count = useSignal(0);
  return <button id={useId()} onClick={() => count.value++}>{count}</button>;
}
export default clientComponent(${name}, import.meta.url);
`;

describe("Island plugin esbuild バンドル", () => {
  let dir;

  before(async () => {
    dir = await fs.mkdtemp(path.join(import.meta.dirname, ".tmp-bundle-test-"));
    const src = path.join(dir, "src");
    await fs.mkdir(path.join(src, "nested"), { recursive: true });
    await fs.writeFile(path.join(src, "a.client.jsx"), clientIsland("A"));
    await fs.writeFile(path.join(src, "nested", "b.client.jsx"), clientIsland("B"));

    const config = makeEleventyConfigStub({
      pathPrefix: "/blog/",
      input: `${src}/`,
      output: `${path.join(dir, "dist")}/`,
    });
    preactIsland(config);
    await config._emit("eleventy.before", { runMode: "build" });
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

  it("is-land だけは ?nodefine 付き URL の external import として残る", async () => {
    const setup = await fs.readFile(path.join(dir, "dist", "__island-setup.js"), "utf8");
    assert.match(setup, /from "\/blog\/is-land\.js\?nodefine"/);
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

describe("Island plugin ignore ルール (常時追加)", () => {
  it("bundle デフォルトでも .client.* を input 配下で ignore に追加する", () => {
    const config = makeEleventyConfigStub({ input: "./src/" });
    preactIsland(config);
    assert.deepStrictEqual(config._ignoreAdds, ["./src/**/*.client.{js,jsx,ts,tsx}"]);
  });

  it("bundle: false でも .client.* を ignore に追加する (バンドラー選択と独立)", () => {
    const config = makeEleventyConfigStub({ input: "./src/" });
    preactIsland(config, { bundle: false });
    assert.deepStrictEqual(config._ignoreAdds, ["./src/**/*.client.{js,jsx,ts,tsx}"]);
  });

  // NOTE: Eleventy の directories.input は常に「./ 前置 + 末尾スラッシュ」に正規化
  // される (ProjectDirectories.normalizeDirectory)。input 未設定 (プロジェクト
  // ルート) の正規化形 "./" でも有効な glob になることをここで固定する。
  it("input がプロジェクトルート (正規化形 './') でも有効な glob を追加する", () => {
    const config = makeEleventyConfigStub({ input: "./" });
    preactIsland(config);
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
