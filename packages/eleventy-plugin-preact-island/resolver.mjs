/**
 * Create a resolver that converts an SSR-side hydrate module URL
 * (e.g. `import.meta.url` inside `foo.hydrate.jsx`) into the browser URL
 * where the compiled bundle will be served.
 *
 * Convention (customizable via options):
 *   `<srcDir>/<sub>.hydrate.{jsx,tsx,js,ts}` → `<urlPrefix><sub>.hydrate.js`
 *
 * @param {Object} [options]
 * @param {string} [options.srcDir="src"] Input directory that matches the
 *   Eleventy input directory / esbuild `outbase`.
 * @param {string} [options.urlPrefix="/"] URL path prefix where the compiled
 *   bundles are served.
 * @returns {(moduleUrl: string) => string}
 */
export function createHydrateModuleResolver({
  srcDir = "src",
  urlPrefix = "/",
} = {}) {
  if (typeof srcDir !== "string" || srcDir.length === 0) {
    throw new TypeError(
      "createHydrateModuleResolver: `srcDir` must be a non-empty string",
    );
  }
  if (typeof urlPrefix !== "string") {
    throw new TypeError(
      "createHydrateModuleResolver: `urlPrefix` must be a string",
    );
  }

  const marker = `/${srcDir}/`;
  const normalizedPrefix = normalizeUrlPrefix(urlPrefix);

  return function resolveHydrateModuleUrl(moduleUrl) {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(moduleUrl).pathname);
    } catch {
      throw new Error(
        `[eleventy-plugin-preact-island] Invalid module URL: ${moduleUrl}`,
      );
    }

    const idx = pathname.lastIndexOf(marker);
    if (idx === -1) {
      throw new Error(
        `[eleventy-plugin-preact-island] Hydrate module must live under "${srcDir}/": ${pathname}`,
      );
    }

    const rest = pathname.slice(idx + marker.length);
    const match = rest.match(/^(.+)\.hydrate\.(?:jsx|tsx|js|ts)$/);
    if (!match) {
      throw new Error(
        `[eleventy-plugin-preact-island] Hydrate module must end with .hydrate.{js,jsx,ts,tsx}: ${pathname}`,
      );
    }
    return `${normalizedPrefix}${match[1]}.hydrate.js`;
  };
}

function normalizeUrlPrefix(prefix) {
  let p = prefix;
  if (!p.startsWith("/")) p = `/${p}`;
  if (!p.endsWith("/")) p = `${p}/`;
  return p;
}
