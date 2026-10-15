import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import url from "node:url";

import * as esbuild from "esbuild";
import fg from "fast-glob";

import { _setClientModuleResolver } from "./island.js";
import { createClientModuleResolver, normalizeUrlPrefix } from "./resolver.js";

const packageDir = path.dirname(url.fileURLToPath(import.meta.url));

const SETUP_NAME = "__island-setup";
const SETUP_VIRTUAL_ID = "virtual:island-setup";
const SETUP_NAMESPACE = "eleventy-plugin-preact-island-setup";

/**
 * Eleventy plugin for Preact partial hydration with is-land.
 *
 * Zero-config and convention-first: it owns the entire client boundary for
 * `*.client.{js,jsx,ts,tsx}` files under Eleventy's input directory:
 * - Bundles them together with the browser-side is-land + Preact setup module
 *   with esbuild (unless `bundle: false`)
 * - Excludes them from Eleventy template processing (`ignores.add`, always)
 * - Wires the SSR-side `<Island>` component's URL resolver to match the bundle
 *   output layout, following Eleventy's own input directory and `pathPrefix`
 * - Loads the setup module on every HTML page that contains `<is-land>`
 *
 * Input/output directories ride on Eleventy's own configuration via
 * `eleventyConfig.directories` (the userspace live getter that reflects
 * `setInputDirectory`/`setOutputDirectory`). NOTE: `eleventyConfig.dir` is not
 * used because it does not reflect those setters during plugin execution.
 *
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 * @param {Object} [pluginOptions]
 * @param {string} [pluginOptions.preactVersion] - Deprecated and ignored.
 * @param {string} [pluginOptions.devalueVersion] - Deprecated and ignored.
 * @param {boolean} [pluginOptions.bundle=true] - Bundle client entries with
 *   esbuild. Set to `false` to bring your own bundler; the ignore rule,
 *   resolver wiring, is-land.js copy, and setup module output stay active.
 */
export default function (eleventyConfig, pluginOptions = {}) {
  try {
    eleventyConfig.versionCheck(">=3.0");
  } catch (e) {
    console.log(`[eleventy-plugin-preact-island] WARN: ${e.message}`);
  }

  const { bundle = true } = pluginOptions;

  for (const name of ["preactVersion", "devalueVersion"]) {
    if (pluginOptions[name] !== undefined) {
      console.warn(
        `[eleventy-plugin-preact-island] WARN: \`${name}\` is deprecated and ignored. Client dependencies are bundled from the installed packages.`,
      );
    }
  }

  // Ride on Eleventy's own input/output directories (normalized, e.g. "./src/").
  const inputDir = eleventyConfig.directories.input;
  const outputDir = eleventyConfig.directories.output;
  const clientGlob = `${inputDir}**/*.client.{js,jsx,ts,tsx}`;
  const urlPrefix = normalizeUrlPrefix(eleventyConfig.pathPrefix ?? "/");
  const isLandUrl = `${urlPrefix}is-land.js?nodefine`;

  // The dev hooks talk to the Eleventy Dev Server WebSocket, so they follow
  // `--serve`. NOTE: NODE_ENV is not a usable signal: when unset,
  // postcss-load-config fills it with "development" only once CSS is
  // processed, which is after the setup module has been bundled.
  let serveMode = false;
  eleventyConfig.on("eleventy.before", ({ runMode }) => {
    serveMode = runMode === "serve";
  });

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

  // NOTE: is-land は import 時にデフォルト prefix ("on:") で自身を define するため、
  // 公式の `?nodefine` query で抑止し、`land-on:` を仕込んでから明示的に define する。
  // バンドルすると `import.meta.url` から query が消えて抑止が効かないので、
  // is-land だけは passthrough copy した URL を external のまま import する。
  const generateIslandSetupSource = () => {
    const rehydrateScript = serveMode
      ? `
window.__eleventyRehydrate = () => {
  document.querySelectorAll('is-land[type="preact"]').forEach(el => {
    if (el.hasAttribute("import")) {
      mount(el);
    }
  });
};`
      : "";

    return `import { Island } from "${isLandUrl}";
import { h, hydrate } from "preact";
import { parse } from "devalue";

const mount = async (target) => {
  try {
    // NOTE: Resolve a relative "import" attribute against the page, not this module.
    const component = await import(new URL(target.getAttribute("import"), document.baseURI).href);
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
`;
  };

  // Serves the setup module as an esbuild entry. Its `preact` resolves from the
  // input directory, the same place `*.client.*` entries resolve it from, so
  // both land on one file and splitting emits a single shared Preact instance.
  // `devalue` resolves from this package, since it is our dependency and may
  // not be visible from the host project under strict installs (pnpm).
  /** @type {import("esbuild").Plugin} */
  const islandSetupPlugin = {
    name: "eleventy-plugin-preact-island-setup",
    setup(build) {
      build.onResolve({ filter: new RegExp(`^${SETUP_VIRTUAL_ID}$`) }, () => ({
        path: SETUP_VIRTUAL_ID,
        namespace: SETUP_NAMESPACE,
      }));
      build.onLoad({ filter: /.*/, namespace: SETUP_NAMESPACE }, () => ({
        contents: generateIslandSetupSource(),
        loader: "js",
        resolveDir: path.resolve(inputDir),
      }));
      build.onResolve({ filter: /.*/, namespace: SETUP_NAMESPACE }, (args) => {
        if (args.path === isLandUrl) {
          return { path: args.path, external: true };
        }
        if (args.path === "devalue") {
          return build.resolve(args.path, { kind: args.kind, resolveDir: packageDir });
        }
        return undefined;
      });
    },
  };

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
      // {jsx,tsx} 未対応)。0 件でも setup はバンドルする。素の <is-land> は .client.* なしでも
      // 書けるので、transform が注入する setup を常に出力しておく必要がある。
      // NOTE: fast-glob は node_modules をデフォルト除外しないため明示する。
      // input が "." (プロジェクトルート) の構成で依存パッケージ内の *.client.* を
      // 誤ってバンドルしない・毎ビルド node_modules を走査しないための guard。
      const clientEntries = await fg(clientGlob, {
        ignore: ["**/node_modules/**"],
      });

      /** @type {import("esbuild").BuildOptions} */
      const options = {
        bundle: true,
        entryPoints: [
          ...clientEntries.map((entry) => ({
            in: entry,
            out: path.relative(inputDir, entry).replace(/\.[^.]+$/, ""),
          })),
          { in: SETUP_VIRTUAL_ID, out: SETUP_NAME },
        ],
        // NOTE: `@preact/signals` は preact の `options` オブジェクトを patch する。
        // 依存がエントリごとに複製されると patch と signal graph が複製されて
        // Cycle detected を誤発火するため、splitting で共有チャンクに集約し
        // preact / signals を単一インスタンスに保つ。
        splitting: true,
        chunkNames: "__island-chunks/[name]-[hash]",
        format: "esm",
        jsx: "automatic",
        jsxImportSource: "preact",
        outdir: outputDir,
        plugins: [islandSetupPlugin],
      };
      if (runMode === "build") {
        await esbuild.build(options);
        return;
      }
      watchCtx = await esbuild.context(options);
      await watchCtx.watch();
    });
  } else {
    // 利用者のバンドラが処理する前提で、setup を未バンドルのまま出力に置く。
    eleventyConfig.on("eleventy.before", async () => {
      await mkdir(outputDir, { recursive: true });
      await writeFile(path.join(outputDir, `${SETUP_NAME}.js`), generateIslandSetupSource());
    });
  }

  // Copy is-land.js to output directory.
  // NOTE: ターゲットは必ず出力ファイル名 (`/is-land.js`) を渡す。`"/"` を渡すと
  // Eleventy の TemplatePassthrough.getOutputPath が末尾スラッシュを剥がして
  // `<outputDir>` に潰し、その後の「dest がディレクトリなら dest/basename に書く」
  // 分岐が dest の存在有無に依存する (recursive-copy に単一ファイル → 未存在パスを
  // 渡すとリネームとして解釈される) ため、クリーンビルドでは `<outputDir>` 自体が
  // is-land.js の中身を持つファイルに化ける。setup 側の import URL
  // (`${urlPrefix}is-land.js`) と揃えて確定名にすることでこの罠を回避する。
  eleventyConfig.addPassthroughCopy({
    [url.fileURLToPath(import.meta.resolve("@11ty/is-land/is-land.js"))]: "/is-land.js",
  });

  const generateDevScript = () =>
    serveMode
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

  eleventyConfig.addTransform("preact-island-inject", function (content, outputPath) {
    // NOTE: HTML tag names are case-insensitive, so a hand-written <IS-LAND> counts too.
    if (!outputPath?.endsWith?.(".html") || !/<is-land[\s>]/i.test(content)) {
      return content;
    }

    if (!content.includes("</head>")) {
      console.warn(
        `[eleventy-plugin-preact-island] WARN: No </head> tag found in ${outputPath}. Scripts not injected.`,
      );
      return content;
    }

    const scripts = [
      generateDevScript(),
      `<script type="module" src="${urlPrefix}${SETUP_NAME}.js"></script>`,
    ]
      .filter(Boolean)
      .join("\n");

    return content.replace("</head>", `${scripts}\n</head>`);
  });
}
