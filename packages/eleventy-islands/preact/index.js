import { h } from "preact";

import { islandAttributes } from "../island.js";

export { clientComponent, clientOnlyComponent } from "../island.js";

/** @type {import("../index.js").IslandAdapter} */
export const preactAdapter = {
  type: "preact",
  mountModule: import.meta.resolve("./mount.js"),
  jsxImportSource: "preact",
};

/**
 * Wrap a Preact component for Partial Hydration via is-land. The SSR output is
 * the component rendered with the same `props`, wrapped in `<is-land>` with the
 * client module import URL derived from the injected resolver. A client-only
 * component is not rendered; its `fallback` prop is output instead.
 *
 * @param {Object} attrs
 * @param {import("preact").ComponentType<any>} attrs.component - Component
 *   wrapped with `clientComponent()` or `clientOnlyComponent()` in its
 *   `*.client.jsx` file.
 * @param {string} [attrs.on] - is-land initialization trigger name (e.g.
 *   `"interaction"`, `"visible"`, `"idle"`). Defaults to `"interaction"`, or
 *   `"load"` for a client-only component.
 */
export function Island({ component, on, ...props }) {
  const island = islandAttributes(component, props, { type: preactAdapter.type, on });
  return h(
    "is-land",
    island.attrs,
    island.clientOnly ? island.fallback : h(component, island.props),
  );
}
