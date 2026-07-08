import { h } from "preact";

let currentResolver = null;

/**
 * Install the hydrate module URL resolver. Called by the Eleventy plugin during
 * config setup; not part of the public API.
 * @internal
 * @param {(moduleUrl: string) => string} resolver
 */
export function _setHydrateModuleResolver(resolver) {
  currentResolver = resolver;
}

/**
 * Attach the SSR-side module URL as metadata to a hydration component.
 * Call this once in each `*.hydrate.jsx` file's default export.
 *
 * @template {import("preact").ComponentType<any>} C
 * @param {C} Component
 * @param {string} moduleUrl Usually `import.meta.url` from the hydrate file.
 * @returns {C}
 */
export function hydratable(Component, moduleUrl) {
  if (typeof Component !== "function") {
    throw new TypeError("hydratable: `Component` must be a function");
  }
  if (typeof moduleUrl !== "string") {
    throw new TypeError(
      "hydratable: `moduleUrl` must be a string (usually `import.meta.url`)",
    );
  }
  Component.__hydrateModuleUrl = moduleUrl;
  return Component;
}

/**
 * Wrap a Preact component for Partial Hydration via is-land. The SSR output is
 * the component rendered with the same `props`, wrapped in `<is-land>` with the
 * hydration import URL derived from the injected resolver.
 *
 * @param {Object} attrs
 * @param {import("preact").ComponentType<any>} attrs.component - Component
 *   wrapped with `hydratable()` in its `*.hydrate.jsx` file.
 * @param {string} [attrs.on="interaction"] - is-land initialization trigger
 *   name (e.g. `"interaction"`, `"visible"`, `"idle"`).
 */
export function Island({ component, on = "interaction", ...props }) {
  if (typeof component !== "function") {
    throw new TypeError(
      "Island: `component` prop must be a Preact component wrapped with `hydratable()`",
    );
  }
  const moduleUrl = component.__hydrateModuleUrl;
  if (typeof moduleUrl !== "string") {
    throw new Error(
      "Island: `component` is not marked as hydratable. Wrap the default export of your *.hydrate.jsx file with `hydratable(Component, import.meta.url)`.",
    );
  }
  if (typeof currentResolver !== "function") {
    throw new Error(
      "Island: no hydrate module URL resolver is configured. Ensure `@tuqulore-inc/eleventy-plugin-preact-island` is registered via `eleventyConfig.addPlugin`.",
    );
  }
  const importUrl = currentResolver(moduleUrl);
  return h(
    "is-land",
    {
      [`land-on:${on}`]: true,
      type: "preact",
      import: importUrl,
      props: JSON.stringify(props),
    },
    h(component, props),
  );
}
