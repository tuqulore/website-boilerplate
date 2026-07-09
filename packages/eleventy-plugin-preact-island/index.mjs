import url from "node:url";
import * as esbuild from "esbuild";
import { setClientModuleResolver } from "./island.mjs";
import { createClientModuleResolver } from "./resolver.mjs";

/**
 * Eleventy plugin for Preact partial hydration with is-land.
 *
 * Owns the entire client boundary:
 * - Bundles `*.client.jsx` entries with esbuild
 * - Excludes them from Eleventy template processing (`ignores.add`)
 * - Wires the SSR-side `<Island>` component's URL resolver to match the bundle
 *   output layout, from a single source of truth (`srcDir` / `outDir` / `urlPrefix`)
 * - Injects the browser-side is-land + Preact setup into every HTML page
 *
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 * @param {Object} [pluginOptions]
 * @param {string} [pluginOptions.preactVersion] - Preact version for esm.sh CDN
 * @param {string} [pluginOptions.entries] - Glob pattern for client entry
 *   points (e.g. `"./src/**\/*.client.jsx"`). When provided, matching files are
 *   bundled by esbuild and ignored by Eleventy as templates. When omitted, no
 *   bundling happens and no ignore rule is added.
 * @param {string} [pluginOptions.srcDir="src"] - Source directory that contains
 *   client entry points. Used as esbuild `outbase` and as the marker segment
 *   in the SSR module URL → browser URL conversion.
 * @param {string} [pluginOptions.outDir="dist"] - esbuild `outdir` for client
 *   entry bundles. Usually matches the Eleventy output directory.
 * @param {string} [pluginOptions.urlPrefix="/"] - URL path prefix where the
 *   compiled client module bundles are served.
 */
export default function (eleventyConfig, pluginOptions = {}) {
  try {
    eleventyConfig.versionCheck(">=3.0");
  } catch (e) {
    console.log(`[eleventy-plugin-preact-island] WARN: ${e.message}`);
  }

  const {
    preactVersion = "",
    entries,
    srcDir = "src",
    outDir = "dist",
    urlPrefix = "/",
  } = pluginOptions;

  // SSR-side URL resolver: single source of truth is (srcDir, urlPrefix).
  // Non-conforming builds can call `setClientModuleResolver` from the
  // `./island` subpath instead of going through this plugin.
  setClientModuleResolver(createClientModuleResolver({ srcDir, urlPrefix }));

  // Client entry bundling (opt-in via `entries`).
  if (entries) {
    // Convert glob to ignore pattern (remove leading ./)
    const ignorePattern = entries.replace(/^\.\//, "");
    eleventyConfig.ignores.add(ignorePattern);

    eleventyConfig.on("eleventy.before", async ({ runMode }) => {
      /** @type {import("esbuild").BuildOptions} */
      const options = {
        bundle: true,
        entryPoints: [entries],
        external: ["preact"],
        format: "esm",
        jsx: "automatic",
        jsxImportSource: "preact",
        outbase: srcDir,
        outdir: outDir,
      };
      if (runMode === "build") {
        await esbuild.build(options);
      } else {
        const ctx = await esbuild.context(options);
        await ctx.watch();
      }
    });
  }

  // Copy is-land.js to output directory
  eleventyConfig.addPassthroughCopy({
    [url.fileURLToPath(import.meta.resolve("@11ty/is-land/is-land.js"))]: "/",
  });
  const preactSuffix = preactVersion ? `@${preactVersion}` : "";

  const generateImportMap = () => `<script type="importmap">
{
  "imports": {
    "is-land": "/is-land.js",
    "preact": "https://esm.sh/preact${preactSuffix}",
    "preact/hooks": "https://esm.sh/preact${preactSuffix}/hooks?external=preact",
    "preact/jsx-runtime": "https://esm.sh/preact${preactSuffix}/jsx-runtime?external=preact"
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
