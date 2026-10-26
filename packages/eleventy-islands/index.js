import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import url from "node:url";

import { _setClientModuleResolver } from "./island.js";
import { createClientModuleResolver, normalizeUrlPrefix } from "./resolver.js";

const packageDir = path.dirname(url.fileURLToPath(import.meta.url));

const SETUP_NAME = "__island-setup";

/**
 * Eleventy plugin for Partial Hydration with is-land.
 *
 * Zero-config and convention-first: it owns the entire client boundary for
 * `*.client.{js,jsx,ts,tsx}` files under Eleventy's input directory:
 * - Excludes them from Eleventy template processing (`ignores.add`)
 * - Wires the SSR-side `<Island>` component's URL resolver to match the bundle
 *   output layout, following Eleventy's own input directory and `pathPrefix`
 * - Generates the browser-side setup module, which starts is-land and mounts
 *   each island through the adapter, and hands it with the client entries to
 *   `bundler`; without one, writes it unbundled for your own bundler
 * - Loads the setup module on every HTML page that contains `<is-land>`
 *
 * Input/output directories ride on Eleventy's own configuration via
 * `eleventyConfig.directories` (the userspace live getter that reflects
 * `setInputDirectory`/`setOutputDirectory`). NOTE: `eleventyConfig.dir` is not
 * used because it does not reflect those setters during plugin execution.
 *
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 * @param {import("./index.js").PluginOptions} pluginOptions
 */
export default function (eleventyConfig, { adapter, bundler } = {}) {
  try {
    eleventyConfig.versionCheck(">=3.0");
  } catch (e) {
    console.log(`[eleventy-islands] WARN: ${e.message}`);
  }

  if (typeof adapter?.type !== "string" || !/^[A-Za-z0-9_-]+$/.test(adapter.type)) {
    throw new TypeError(
      "[eleventy-islands] `adapter.type` must match /^[A-Za-z0-9_-]+$/. Pass an adapter such as `preactAdapter` from `@tuqulore-inc/eleventy-islands/preact`.",
    );
  }
  if (typeof adapter.mountModule !== "string" || !adapter.mountModule.startsWith("file:")) {
    throw new TypeError(
      '[eleventy-islands] `adapter.mountModule` must be a file URL (e.g. `import.meta.resolve("./mount.js")`).',
    );
  }
  if (bundler !== undefined && typeof bundler !== "function") {
    throw new TypeError("[eleventy-islands] `bundler` must be a function.");
  }
  const mountModule = url.fileURLToPath(adapter.mountModule);

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
  document.querySelectorAll(${JSON.stringify(`is-land[type="${adapter.type}"]`)}).forEach(el => {
    if (el.hasAttribute("import")) {
      init(el);
    }
  });
};`
      : "";

    return `import { Island } from "${isLandUrl}";
import { parse } from "devalue";
import { mount } from ${JSON.stringify(mountModule)};

const init = async (target) => {
  try {
    // NOTE: Resolve a relative "import" attribute against the page, not this module.
    const component = await import(new URL(target.getAttribute("import"), document.baseURI).href);
    const propsAttr = target.getAttribute("props");
    const props = propsAttr ? parse(propsAttr) : {};
    await mount(target, component.default, props, { clientOnly: target.hasAttribute("client-only") });
  } catch (e) {
    console.error("Failed to mount component:", e);
  }
};

Island.attributePrefix = "land-on:";
Island.addInitType(${JSON.stringify(adapter.type)}, init);
Island.define();
${rehydrateScript}
`;
  };

  if (bundler) {
    /** @type {Omit<import("./index.js").BundlerContext, "runMode">} */
    const context = {
      inputDir,
      outputDir,
      clientGlob,
      clientEntryOut: (entry) => path.relative(inputDir, entry).replace(/\.[^.]+$/, ""),
      setup: {
        name: SETUP_NAME,
        source: generateIslandSetupSource,
        isLandUrl,
        mountModule,
        packageDir,
      },
      adapter,
    };
    eleventyConfig.on("eleventy.before", ({ runMode }) => bundler({ ...context, runMode }));
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

  eleventyConfig.addTransform("islands-inject", function (content, outputPath) {
    // NOTE: HTML tag names are case-insensitive, so hand-written <IS-LAND> and
    // </HEAD> count too.
    if (!outputPath?.endsWith?.(".html") || !/<is-land[\s>]/i.test(content)) {
      return content;
    }

    const headClose = /<\/head\s*>/i;
    if (!headClose.test(content)) {
      console.warn(
        `[eleventy-islands] WARN: No </head> tag found in ${outputPath}. Scripts not injected.`,
      );
      return content;
    }

    const scripts = [
      generateDevScript(),
      `<script type="module" src="${urlPrefix}${SETUP_NAME}.js"></script>`,
    ]
      .filter(Boolean)
      .join("\n");

    return content.replace(headClose, (tag) => `${scripts}\n${tag}`);
  });
}
