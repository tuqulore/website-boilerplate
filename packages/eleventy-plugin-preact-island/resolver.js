import path from "node:path";
import url from "node:url";

/**
 * Create a resolver that converts an SSR-side client module URL
 * (e.g. `import.meta.url` inside `foo.client.jsx`) into the browser URL
 * where the compiled bundle will be served.
 *
 * Convention:
 *   `<inputDir>/<sub>.client.{jsx,tsx,js,ts}` → `<urlPrefix><sub>.client.js`
 *
 * @internal Wired by the Eleventy plugin; not part of the public API.
 * @param {Object} [options]
 * @param {string} [options.inputDir="."] Eleventy input directory (e.g.
 *   `eleventyConfig.directories.input`, `"./src/"`). Resolved to an absolute
 *   path; a client module URL must fall under it.
 * @param {string} [options.urlPrefix="/"] URL path prefix where the compiled
 *   bundles are served (follows Eleventy `pathPrefix`).
 * @returns {(moduleUrl: string) => string}
 */
export function createClientModuleResolver({ inputDir = ".", urlPrefix = "/" } = {}) {
  if (typeof inputDir !== "string") {
    throw new TypeError("createClientModuleResolver: `inputDir` must be a string");
  }
  if (typeof urlPrefix !== "string") {
    throw new TypeError("createClientModuleResolver: `urlPrefix` must be a string");
  }

  // Absolute input dir as a URL pathname, with a guaranteed trailing slash so
  // prefix matching can't leak across sibling dirs (`/src` vs `/src-review/`).
  // NOTE: compare against `new URL(moduleUrl).pathname` (not a decoded fs path)
  // so both sides stay percent-encoded and the emitted URL remains a valid
  // module specifier (a space stays `%20`, never a literal space).
  let inputBase = url.pathToFileURL(path.resolve(inputDir)).pathname;
  if (!inputBase.endsWith("/")) inputBase += "/";

  const normalizedPrefix = normalizeUrlPrefix(urlPrefix);

  return function resolveClientModuleUrl(moduleUrl) {
    let pathname;
    try {
      pathname = new URL(moduleUrl).pathname;
    } catch {
      throw new Error(`[eleventy-plugin-preact-island] Invalid module URL: ${moduleUrl}`);
    }

    if (!pathname.startsWith(inputBase)) {
      throw new Error(
        `[eleventy-plugin-preact-island] Client module must live under the Eleventy input directory (${inputBase}): ${pathname}`,
      );
    }

    const rest = pathname.slice(inputBase.length);
    const match = rest.match(/^(.+)\.client\.(?:jsx|tsx|js|ts)$/);
    if (!match) {
      throw new Error(
        `[eleventy-plugin-preact-island] Client module must end with .client.{js,jsx,ts,tsx}: ${pathname}`,
      );
    }
    return `${normalizedPrefix}${match[1]}.client.js`;
  };
}

/**
 * Ensure a URL path prefix has both leading and trailing slashes.
 *
 * @internal Shared with the plugin so the injected importmap and the resolved
 *   client module URLs agree on the same prefix.
 * @param {string} prefix
 * @returns {string}
 */
export function normalizeUrlPrefix(prefix) {
  let p = prefix;
  if (!p.startsWith("/")) p = `/${p}`;
  if (!p.endsWith("/")) p = `${p}/`;
  return p;
}
