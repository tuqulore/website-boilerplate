import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import url from "node:url";

import * as esbuild from "esbuild";
import fg from "fast-glob";

import { _setClientModuleResolver } from "./island.js";
import { createClientModuleResolver, normalizeUrlPrefix } from "./resolver.js";

const require = createRequire(import.meta.url);

// esm.sh の import map URL を、ホスト側にインストール済のバージョンで自動 pin
// するための解決子。preact / devalue のように SSR 側 (Node) と クライアント側
// (CDN) の 2 面で同じ package が要る依存を「同一バージョンで動かす」ための共通
// 基盤。プロセス中に実体が入れ替わることは無いのでモジュールロード時に対象を
// 決めておく (プラグイン関数からは戻り値を参照するだけ)。
//
// 解決経路は 2 段構え:
//   1. `require("<name>/package.json")` — `./package.json` を exports に
//      公開している package (preact 等) はこれで 1 回で取れる。
//   2. entry パスから package.json を上方向に辿る — devalue 5.x のように
//      exports で `./package.json` を出していない package のフォールバック。
//      ルート到達 (`dirname(dir) === dir`) で終端。
// どちらも失敗するのは、peer が意図的に入っていない (bundle: false 運用等) か、
// npm hoisting が意図せぬ配置になった場合。呼び出し側で latest フォールバック
// + 警告に切り替える。
const resolveInstalledPackageVersion = (name) => {
  try {
    return require(`${name}/package.json`).version;
  } catch {
    // exports 制約 (ERR_PACKAGE_PATH_NOT_EXPORTED) 等: entry から辿る。
  }
  try {
    let dir = dirname(url.fileURLToPath(import.meta.resolve(name)));
    while (true) {
      try {
        const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
        if (pkg.name === name && typeof pkg.version === "string") {
          return pkg.version;
        }
      } catch {
        // このディレクトリには package.json が無い、または JSON parse 失敗。
      }
      const parent = dirname(dir);
      if (parent === dir) return null;
      dir = parent;
    }
  } catch {
    return null;
  }
};
const installedPreactVersion = resolveInstalledPackageVersion("preact");
const installedDevalueVersion = resolveInstalledPackageVersion("devalue");

/**
 * Eleventy plugin for Preact partial hydration with is-land.
 *
 * Zero-config and convention-first: it owns the entire client boundary for
 * `*.client.{js,jsx,ts,tsx}` files under Eleventy's input directory:
 * - Bundles them with esbuild (unless `bundle: false`)
 * - Excludes them from Eleventy template processing (`ignores.add`, always)
 * - Wires the SSR-side `<Island>` component's URL resolver to match the bundle
 *   output layout, following Eleventy's own input directory and `pathPrefix`
 * - Injects the browser-side is-land + Preact setup into every HTML page
 *
 * Input/output directories ride on Eleventy's own configuration via
 * `eleventyConfig.directories` (the userspace live getter that reflects
 * `setInputDirectory`/`setOutputDirectory`). NOTE: `eleventyConfig.dir` is not
 * used because it does not reflect those setters during plugin execution.
 *
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 * @param {Object} [pluginOptions]
 * @param {string} [pluginOptions.preactVersion] - Override the Preact version
 *   used in the esm.sh CDN URL. Defaults to the version of `preact` installed
 *   in the host project (auto-detected from `preact/package.json`). Set this
 *   only to force the CDN side to a different version than the installed one.
 * @param {string} [pluginOptions.devalueVersion] - Override the devalue version
 *   used in the esm.sh CDN URL. Defaults to the version of `devalue` bundled
 *   with this plugin (auto-detected from `devalue/package.json`) so the
 *   SSR-side `stringify` and the client-side `parse` come from the same
 *   version. Set this only to force the CDN side to a different version.
 * @param {boolean} [pluginOptions.bundle=true] - Bundle client entries with
 *   esbuild. Set to `false` to bring your own bundler; the ignore rule,
 *   resolver wiring, is-land.js copy, and script injection stay active.
 */
export default function (eleventyConfig, pluginOptions = {}) {
  try {
    eleventyConfig.versionCheck(">=3.0");
  } catch (e) {
    console.log(`[eleventy-plugin-preact-island] WARN: ${e.message}`);
  }

  const { preactVersion, devalueVersion, bundle = true } = pluginOptions;

  // 優先順位:
  //  1. ユーザ指定があればそれを尊重 (CDN 側だけ差し替えたい高度な用途)。
  //  2. インストール済 preact のバージョンを自動検出できたらそれで pin。
  //  3. どちらも無い場合は latest フォールバックにするが、SSR/CSR の
  //     バージョンドリフトが復活するので登録時に一度だけ警告する。
  let resolvedPreactVersion;
  if (preactVersion) {
    resolvedPreactVersion = preactVersion;
  } else if (installedPreactVersion) {
    resolvedPreactVersion = installedPreactVersion;
  } else {
    resolvedPreactVersion = "";
    console.warn(
      "[eleventy-plugin-preact-island] WARN: could not resolve the installed preact version; falling back to latest via esm.sh. Install `preact` (>=10) to pin the CDN version.",
    );
  }

  // preactVersion と同じ優先順位ロジックで devalue も揃える。devalue は
  // このプラグイン自身の dependency なので通常は必ず解決できるが、npm の
  // 変な hoist などで失敗した場合は latest フォールバック + 警告で SSR/CSR
  // ドリフトを可視化する。
  let resolvedDevalueVersion;
  if (devalueVersion) {
    resolvedDevalueVersion = devalueVersion;
  } else if (installedDevalueVersion) {
    resolvedDevalueVersion = installedDevalueVersion;
  } else {
    resolvedDevalueVersion = "";
    console.warn(
      "[eleventy-plugin-preact-island] WARN: could not resolve the installed devalue version; falling back to latest via esm.sh. Pin explicitly with pluginOptions.devalueVersion to avoid version drift.",
    );
  }

  // Ride on Eleventy's own input/output directories (normalized, e.g. "./src/").
  const inputDir = eleventyConfig.directories.input;
  const outputDir = eleventyConfig.directories.output;
  const clientGlob = `${inputDir}**/*.client.{js,jsx,ts,tsx}`;
  const urlPrefix = normalizeUrlPrefix(eleventyConfig.pathPrefix ?? "/");

  // SSR-side URL resolver: the input directory is our own convention; the URL
  // prefix follows Eleventy's own pathPrefix so that sub-directory deployments
  // (e.g. GitHub Pages under `/repo/`) work without a second knob.
  _setClientModuleResolver(
    createClientModuleResolver({
      inputDir,
      urlPrefix,
    }),
  );

  // Always exclude client entries from the Eleventy template pipeline — this is
  // part of the convention and independent of who bundles them.
  eleventyConfig.ignores.add(clientGlob);

  // Client entry bundling (default; disable with `bundle: false`).
  if (bundle) {
    // watch/serve モードでは Eleventy の再ビルド毎に `eleventy.before` が発火する。
    // esbuild.context()+ctx.watch() を毎回作ると watcher/ファイルハンドルが
    // 増殖してリークするため、context は初回のみ作って再利用する。
    // build モードは 1 回きりなのでその都度 esbuild.build() で完結する。
    let watchCtx = null;
    eleventyConfig.on("eleventy.before", async ({ runMode }) => {
      // watch context 生成後は entries を固定 (esbuild 側の watcher が再ビルドを担う)。
      // NOTE: そのため watch 開始後に追加された .client ファイルは Eleventy 再起動まで
      // 拾われない。旧来の glob 文字列方式でも esbuild は context 生成時に一度だけ glob を
      // 解決するためパリティであり許容。
      if (watchCtx) return;

      // NOTE: エントリは明示ファイルリストで渡す (esbuild のワイルドカードはブレース展開
      // {jsx,tsx} 未対応)。0 件時は esbuild を呼ばずスキップし、Island を使わないサイトでも
      // ビルドが通るようにする。
      // NOTE: fast-glob は node_modules をデフォルト除外しないため明示する。
      // input が "." (プロジェクトルート) の構成で依存パッケージ内の *.client.* を
      // 誤ってバンドルしない・毎ビルド node_modules を走査しないための guard。
      const entryPoints = await fg(clientGlob, {
        ignore: ["**/node_modules/**"],
      });
      if (entryPoints.length === 0) return;

      /** @type {import("esbuild").BuildOptions} */
      const options = {
        bundle: true,
        entryPoints,
        // NOTE: `@preact/signals` は preact の `options` オブジェクトを patch する。
        // client bundle ごとに signals を同梱すると patch と signal graph が bundle
        // 数ぶん複製されて Cycle detected を誤発火する。external + import map で
        // 単一インスタンスに寄せる。`@preact/signals-core` も signals が外部参照
        // する前提で同様に external 化する。
        external: ["preact", "@preact/signals", "@preact/signals-core"],
        format: "esm",
        jsx: "automatic",
        jsxImportSource: "preact",
        outbase: inputDir,
        outdir: outputDir,
      };
      if (runMode === "build") {
        await esbuild.build(options);
        return;
      }
      watchCtx = await esbuild.context(options);
      await watchCtx.watch();
    });
  }

  // Copy is-land.js to output directory.
  // NOTE: ターゲットは必ず出力ファイル名 (`/is-land.js`) を渡す。`"/"` を渡すと
  // Eleventy の TemplatePassthrough.getOutputPath が末尾スラッシュを剥がして
  // `<outputDir>` に潰し、その後の「dest がディレクトリなら dest/basename に書く」
  // 分岐が dest の存在有無に依存する (recursive-copy に単一ファイル → 未存在パスを
  // 渡すとリネームとして解釈される) ため、クリーンビルドでは `<outputDir>` 自体が
  // is-land.js の中身を持つファイルに化ける。importmap 側 (`${urlPrefix}is-land.js`)
  // と揃えて確定名にすることでこの罠を回避する。
  eleventyConfig.addPassthroughCopy({
    [url.fileURLToPath(import.meta.resolve("@11ty/is-land/is-land.js"))]: "/is-land.js",
  });
  const preactSuffix = resolvedPreactVersion ? `@${resolvedPreactVersion}` : "";
  const devalueSuffix = resolvedDevalueVersion ? `@${resolvedDevalueVersion}` : "";

  // NOTE: is-land は import されたモジュール末尾で `Island.define()` を呼び、
  // その時点の `Island.attributePrefix` (デフォルト "on:") で customElements を
  // 登録する。inline setup script 側で `land-on:` に差し替えても connectedCallback
  // は既に走り終わっているため間に合わない。is-land 公式の `?nodefine` query
  // (`if (!(new URL(import.meta.url)).searchParams.has("nodefine")) Island.define()`)
  // で auto-define を抑止し、setup script 側で prefix を仕込んでから
  // `Island.define()` を明示的に呼ぶ。
  const generateImportMap = () => `<script type="importmap">
{
  "imports": {
    "is-land": "${urlPrefix}is-land.js?nodefine",
    "preact": "https://esm.sh/preact${preactSuffix}",
    "preact/hooks": "https://esm.sh/preact${preactSuffix}/hooks?external=preact",
    "preact/jsx-runtime": "https://esm.sh/preact${preactSuffix}/jsx-runtime?external=preact",
    "@preact/signals": "https://esm.sh/@preact/signals?external=preact,preact/hooks",
    "@preact/signals-core": "https://esm.sh/@preact/signals-core",
    "devalue": "https://esm.sh/devalue${devalueSuffix}"
  }
}
</script>`;

  const generateDevScript = () =>
    process.env.NODE_ENV === "development"
      ? `<script>
(function() {
  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    const ws = new OriginalWebSocket(url, protocols);
    ws.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "eleventy.reload") {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              window.__eleventyRehydrate?.();
            });
          });
        }
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
      }
    });
    return ws;
  };
  window.WebSocket.prototype = OriginalWebSocket.prototype;
  window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
  window.WebSocket.OPEN = OriginalWebSocket.OPEN;
  window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
  window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;
})();
</script>`
      : "";

  const generateIslandSetup = () => {
    const rehydrateScript =
      process.env.NODE_ENV === "development"
        ? `
window.__eleventyRehydrate = () => {
  document.querySelectorAll('is-land[type="preact"]').forEach(el => {
    if (el.hasAttribute("import")) {
      mount(el);
    }
  });
};`
        : "";

    // NOTE: importmap 側で is-land を `?nodefine` 経由に固定してあるので、
    // ここで attributePrefix を差し替え → initType 登録 → 明示 `Island.define()`
    // の順に呼ぶ。順序を崩すと connectedCallback が旧 prefix (`on:`) を見て
    // 「条件属性なし = 即 hydrate」と判定し、`on="interaction"` 等の遅延指定が
    // 効かなくなる。
    return `<script type="module">
import { Island } from "is-land";
import { h, hydrate } from "preact";
import { parse } from "devalue";

const mount = async (target) => {
  try {
    const component = await import(target.getAttribute("import"));
    const propsAttr = target.getAttribute("props");
    const props = propsAttr ? parse(propsAttr) : {};
    hydrate(h(component.default, props), target);
  } catch (e) {
    console.error("Failed to mount component:", e);
  }
};

Island.attributePrefix = "land-on:";
Island.addInitType("preact", mount);
Island.define();
${rehydrateScript}
</script>`;
  };

  eleventyConfig.addTransform("preact-island-inject", function (content, outputPath) {
    if (!outputPath?.endsWith?.(".html")) {
      return content;
    }

    if (!content.includes("</head>")) {
      console.warn(
        `[eleventy-plugin-preact-island] WARN: No </head> tag found in ${outputPath}. Scripts not injected.`,
      );
      return content;
    }

    const scripts = [generateImportMap(), generateDevScript(), generateIslandSetup()]
      .filter(Boolean)
      .join("\n");

    return content.replace("</head>", `${scripts}\n</head>`);
  });
}
