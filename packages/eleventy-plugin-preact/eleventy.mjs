/**
 * @type {Record<string, unknown> | null}
 */
let current = null;

/**
 * Eleventy data singleton accessible from any template/component during SSR.
 */
export const eleventy = new Proxy(/** @type {Record<string, unknown>} */ ({}), {
  get(_, key) {
    if (current === null) {
      throw new Error(
        `eleventy.${String(key)} is not available outside of SSR context.`,
      );
    }
    return current[key];
  },
});

/**
 * Internal: Set current Eleventy data
 * @param {Record<string, unknown> | null} data
 */
export function _setEleventyData(data) {
  current = data;
}
