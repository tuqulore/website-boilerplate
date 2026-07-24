import { stringify } from "devalue";
import { h } from "preact";

let currentResolver = null;

/**
 * Install the client module URL resolver. Wired by the Eleventy plugin during
 * config setup; also called by tests to swap resolvers between cases.
 *
 * Pass `null` to explicitly clear the currently installed resolver.
 *
 * @internal Not part of the public API. Registering the plugin via
 *   `eleventyConfig.addPlugin` wires the resolver for you.
 * @param {((moduleUrl: string) => string) | null} resolver
 */
export function _setClientModuleResolver(resolver) {
  if (resolver !== null && typeof resolver !== "function") {
    throw new TypeError(
      `_setClientModuleResolver: \`resolver\` must be a function or null, got ${typeof resolver}`,
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
  // children fall through would leak Preact VNodes into the devalue-serialized
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
      "Island: no client module URL resolver is configured. Register `@tuqulore-inc/eleventy-plugin-preact-island` via `eleventyConfig.addPlugin`.",
    );
  }
  const importUrl = currentResolver(moduleUrl);
  let serializedProps;
  try {
    serializedProps = stringify(props);
  } catch (cause) {
    const path = typeof cause?.path === "string" ? cause.path : "";
    const location = path ? ` at \`${path}\`` : "";
    throw new Error(
      `Island: failed to devalue.stringify props for hydration of ${component.name || "anonymous component"} (${importUrl})${location}. Ensure all Island props are devalue-serializable (Date, Map, Set, RegExp, BigInt, undefined, NaN/Infinity, and cycles are OK; functions, symbols, DOM nodes, and unregistered class instances are not).`,
      { cause },
    );
  }
  // NOTE: `land-on:*` は「値なし = デフォルトの発火条件」で、値があると
  // is-land 側で override として扱われる。特に `interaction` は値をイベント名
  // として解釈するので (`is-land.js` の `Conditions.interaction`: `eventsStr =
  // eventOverrides || "click,touchstart"`)、`true` を出すと「'true' という
  // 未知のイベントを待つ」状態になり永久に hydrate されない。boolean 属性
  // 相当の空文字を出して is-land のデフォルト挙動に乗せる。
  return h(
    "is-land",
    {
      [`land-on:${on}`]: "",
      type: "preact",
      import: importUrl,
      props: serializedProps,
    },
    h(component, props),
  );
}
