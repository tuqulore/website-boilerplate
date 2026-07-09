/**
 * Create a resolver that converts an SSR-side client module URL
 * (e.g. `import.meta.url` inside `foo.client.jsx`) into the browser URL
 * where the compiled bundle will be served.
 *
 * Convention (customizable via options):
 *   `<srcDir>/<sub>.client.{jsx,tsx,js,ts}` → `<urlPrefix><sub>.client.js`
 *
 * @param {Object} [options]
 * @param {string} [options.srcDir="src"] Input directory that matches the
 *   Eleventy input directory / esbuild `outbase`.
 * @param {string} [options.urlPrefix="/"] URL path prefix where the compiled
 *   bundles are served.
 * @returns {(moduleUrl: string) => string}
 */
export function createClientModuleResolver({
  srcDir = "src",
  urlPrefix = "/",
} = {}) {
  if (typeof srcDir !== "string") {
    throw new TypeError(
      "createClientModuleResolver: `srcDir` must be a string",
    );
  }
  if (typeof urlPrefix !== "string") {
    throw new TypeError(
      "createClientModuleResolver: `urlPrefix` must be a string",
    );
  }

  const normalizedSrcDir = srcDir.replace(/^\/+|\/+$/g, "");
  if (normalizedSrcDir.length === 0) {
    throw new TypeError(
      "createClientModuleResolver: `srcDir` must contain at least one path segment",
    );
  }
  const marker = `/${normalizedSrcDir}/`;
  const normalizedPrefix = normalizeUrlPrefix(urlPrefix);

  return function resolveClientModuleUrl(moduleUrl) {
    let pathname;
    try {
      // Keep the pathname URL-encoded so the resulting browser URL stays a
      // valid module specifier (e.g. spaces remain `%20`, not literal spaces).
      pathname = new URL(moduleUrl).pathname;
    } catch {
      throw new Error(
        `[eleventy-plugin-preact-island] Invalid module URL: ${moduleUrl}`,
      );
    }

    const idx = pathname.lastIndexOf(marker);
    if (idx === -1) {
      throw new Error(
        `[eleventy-plugin-preact-island] Client module must live under "${normalizedSrcDir}/": ${pathname}`,
      );
    }

    const rest = pathname.slice(idx + marker.length);
    const match = rest.match(/^(.+)\.client\.(?:jsx|tsx|js|ts)$/);
    if (!match) {
      throw new Error(
        `[eleventy-plugin-preact-island] Client module must end with .client.{js,jsx,ts,tsx}: ${pathname}`,
      );
    }
    return `${normalizedPrefix}${match[1]}.client.js`;
  };
}

function normalizeUrlPrefix(prefix) {
  let p = prefix;
  if (!p.startsWith("/")) p = `/${p}`;
  if (!p.endsWith("/")) p = `${p}/`;
  return p;
}
