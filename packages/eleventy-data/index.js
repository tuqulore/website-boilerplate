import { AsyncLocalStorage } from "node:async_hooks";

// NOTE: Shared through a global registry so that duplicate installations of
// this package still read and write one store; otherwise the copy a renderer
// writes to and the copy a template reads from would diverge, and every read
// would throw as if outside SSR.
/** @type {AsyncLocalStorage<Record<string, unknown>>} */
const asyncLocalStorage = (globalThis[Symbol.for("@tuqulore-inc/eleventy-data")] ??=
  new AsyncLocalStorage());

/**
 * Eleventy data singleton accessible from any template/component during SSR.
 * Uses AsyncLocalStorage to safely handle concurrent template rendering.
 */
export const eleventy = new Proxy(
  /** @type {Record<string, unknown>} */ ({}),
  {
    get(_, key) {
      const store = asyncLocalStorage.getStore();
      if (store === undefined) {
        throw new Error(`eleventy.${String(key)} is not available outside of SSR context.`);
      }
      return store[key];
    },
  },
);

/**
 * Run a callback with Eleventy data available to `eleventy` in the current
 * async context. For template renderers; templates read through `eleventy`.
 * @template T
 * @param {Record<string, unknown>} data
 * @param {() => T} callback
 * @returns {T}
 */
export function runWithEleventyData(data, callback) {
  return asyncLocalStorage.run(data, callback);
}
