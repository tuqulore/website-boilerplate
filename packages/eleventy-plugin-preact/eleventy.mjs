import { AsyncLocalStorage } from "node:async_hooks";

/**
 * @type {AsyncLocalStorage<Record<string, unknown>>}
 */
const asyncLocalStorage = new AsyncLocalStorage();

/**
 * Eleventy data singleton accessible from any template/component during SSR.
 * Uses AsyncLocalStorage to safely handle concurrent template rendering.
 */
export const eleventy = new Proxy(/** @type {Record<string, unknown>} */ ({}), {
  get(_, key) {
    const store = asyncLocalStorage.getStore();
    if (store === undefined) {
      throw new Error(
        `eleventy.${String(key)} is not available outside of SSR context.`,
      );
    }
    return store[key];
  },
});

/**
 * Internal: Run a callback with Eleventy data available in the current async context
 * @template T
 * @param {Record<string, unknown>} data
 * @param {() => T} callback
 * @returns {T}
 */
export function _runWithEleventyData(data, callback) {
  return asyncLocalStorage.run(data, callback);
}
