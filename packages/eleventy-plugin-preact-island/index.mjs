import url from "node:url";

/**
 * Eleventy plugin for Preact partial hydration with is-land
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 * @param {Object} pluginOptions
 * @param {string} [pluginOptions.preactVersion] - Preact version for esm.sh CDN
 */
export default function (eleventyConfig, pluginOptions = {}) {
  try {
    eleventyConfig.versionCheck(">=3.0");
  } catch (e) {
    console.log(`[eleventy-plugin-preact-island] WARN: ${e.message}`);
  }

  const { preactVersion = "" } = pluginOptions;

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
