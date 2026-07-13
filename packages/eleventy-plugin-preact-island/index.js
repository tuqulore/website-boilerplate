import { createRequire } from "node:module";
import url from "node:url";
import * as esbuild from "esbuild";
import fg from "fast-glob";
import { _setClientModuleResolver } from "./island.js";
import { createClientModuleResolver, normalizeUrlPrefix } from "./resolver.js";

const require = createRequire(import.meta.url);

// NOTE: peer で入っている preact の package.json から version を取り、
// import map の esm.sh URL に反映するための解決子。プロセス中に実体が
// 入れ替わることは無いのでモジュールロード時に一度だけ評価する。
// 解決に失敗するのは peer が意図的に入っていない (bundle: false 運用等)
// 例外的なケース。呼び出し側でフォールバックする。
const resolveInstalledPreactVersion = () => {
  try {
    return require("preact/package.json").version;
  } catch {
    return null;
  }
};
const installedPreactVersion = resolveInstalledPreactVersion();

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

  const { preactVersion, bundle = true } = pluginOptions;

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
    [url.fileURLToPath(import.meta.resolve("@11ty/is-land/is-land.js"))]:
      "/is-land.js",
  });
  const preactSuffix = resolvedPreactVersion ? `@${resolvedPreactVersion}` : "";

  const generateImportMap = () => `<script type="importmap">
{
  "imports": {
    "is-land": "${urlPrefix}is-land.js",
    "preact": "https://esm.sh/preact${preactSuffix}",
    "preact/hooks": "https://esm.sh/preact${preactSuffix}/hooks?external=preact",
    "preact/jsx-runtime": "https://esm.sh/preact${preactSuffix}/jsx-runtime?external=preact",
    "@preact/signals": "https://esm.sh/@preact/signals?external=preact,preact/hooks",
    "@preact/signals-core": "https://esm.sh/@preact/signals-core"
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

    return `<script type="module">
import { Island } from "is-land";
import { h, hydrate } from "preact";
Island.attributePrefix = "land-on:";

const mount = async (target) => {
  try {
    const component = await import(target.getAttribute("import"));
    const propsAttr = target.getAttribute("props");
    const props = propsAttr ? JSON.parse(propsAttr) : {};
    hydrate(h(component.default, props), target);
  } catch (e) {
    console.error("Failed to mount component:", e);
  }
};

Island.addInitType("preact", mount);
${rehydrateScript}
</script>`;
  };

  eleventyConfig.addTransform(
    "preact-island-inject",
    function (content, outputPath) {
      if (!outputPath?.endsWith?.(".html")) {
        return content;
      }

      if (!content.includes("</head>")) {
        console.warn(
          `[eleventy-plugin-preact-island] WARN: No </head> tag found in ${outputPath}. Scripts not injected.`,
        );
        return content;
      }

      const scripts = [
        generateImportMap(),
        generateDevScript(),
        generateIslandSetup(),
      ]
        .filter(Boolean)
        .join("\n");

      return content.replace("</head>", `${scripts}\n</head>`);
    },
  );
}
