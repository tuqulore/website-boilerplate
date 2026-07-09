import { h } from "preact";

let currentResolver = null;

/**
 * Install the client module URL resolver. Called by the Eleventy plugin during
 * config setup. Also part of the public API for users who want to use `<Island>`
 * without adopting this package's file naming / URL convention.
 *
 * Pass `null` to explicitly clear the currently installed resolver (used by
 * tests to reset state between cases).
 *
 * @param {((moduleUrl: string) => string) | null} resolver
 */
export function setClientModuleResolver(resolver) {
  if (resolver !== null && typeof resolver !== "function") {
    throw new TypeError(
      `setClientModuleResolver: \`resolver\` must be a function or null, got ${typeof resolver}`,
    );
  }
  currentResolver = resolver;
}

/**
 * Attach the SSR-side module URL as metadata to a client component.
 * Call this once in each `*.client.jsx` file's default export.
 *
 * @template {import("preact").ComponentType<any>} C
 * @param {C} Component
 * @param {string} moduleUrl Usually `import.meta.url` from the client file.
 * @returns {C}
 */
export function clientComponent(Component, moduleUrl) {
  if (typeof Component !== "function") {
    throw new TypeError("clientComponent: `Component` must be a function");
  }
  if (typeof moduleUrl !== "string") {
    throw new TypeError(
      "clientComponent: `moduleUrl` must be a string (usually `import.meta.url`)",
    );
  }
  Component.__clientModuleUrl = moduleUrl;
  return Component;
}

/**
 * Wrap a Preact component for Partial Hydration via is-land. The SSR output is
 * the component rendered with the same `props`, wrapped in `<is-land>` with the
 * client module import URL derived from the injected resolver.
 *
 * @param {Object} attrs
 * @param {import("preact").ComponentType<any>} attrs.component - Component
 *   wrapped with `clientComponent()` in its `*.client.jsx` file.
 * @param {string} [attrs.on="interaction"] - is-land initialization trigger
 *   name (e.g. `"interaction"`, `"visible"`, `"idle"`).
 */
export function Island({ component, on = "interaction", ...props }) {
  // Drop children explicitly. Preact folds JSX children into props.children,
  // and Island's contract is that SSR content comes from `component`; letting
  // children fall through would leak Preact VNodes into the JSON-serialized
  // `props` attribute on <is-land> and into the client hydration payload.
  delete props.children;
  if (typeof component !== "function") {
    throw new TypeError(
      "Island: `component` prop must be a Preact component wrapped with `clientComponent()`",
    );
  }
  // Reject values that would produce a broken `land-on:*` attribute (whitespace,
  // quotes, etc). is-land silently fails to fire on unknown trigger names, so
  // catching typos at build time is the only signal the user gets.
  if (typeof on !== "string" || !/^[A-Za-z0-9_-]+$/.test(on)) {
    throw new TypeError(
      `Island: \`on\` must match /^[A-Za-z0-9_-]+$/ (e.g. "interaction", "visible", "idle"), got: ${JSON.stringify(on)}`,
    );
  }
  const moduleUrl = component.__clientModuleUrl;
  if (typeof moduleUrl !== "string") {
    throw new Error(
      "Island: `component` is not marked as a client component. Wrap the default export of your *.client.jsx file with `clientComponent(Component, import.meta.url)`.",
    );
  }
  if (typeof currentResolver !== "function") {
    throw new Error(
      "Island: no client module URL resolver is configured. Ensure `@tuqulore-inc/eleventy-plugin-preact-island` is registered via `eleventyConfig.addPlugin`, or call `setClientModuleResolver` directly.",
    );
  }
  const importUrl = currentResolver(moduleUrl);
  let serializedProps;
  try {
    serializedProps = JSON.stringify(props);
  } catch (cause) {
    throw new Error(
      `Island: failed to JSON.stringify props for hydration of ${component.name || "anonymous component"} (${importUrl}). Ensure all Island props are JSON-serializable.`,
      { cause },
    );
  }
  return h(
    "is-land",
    {
      [`land-on:${on}`]: true,
      type: "preact",
      import: importUrl,
      props: serializedProps,
    },
    h(component, props),
  );
}
