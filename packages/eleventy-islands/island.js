import { stringify } from "devalue";

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

function markClientModule(apiName, Component, moduleUrl) {
  if (typeof Component !== "function") {
    throw new TypeError(`${apiName}: \`Component\` must be a function`);
  }
  if (typeof moduleUrl !== "string") {
    throw new TypeError(`${apiName}: \`moduleUrl\` must be a string (usually \`import.meta.url\`)`);
  }
  Component.__clientModuleUrl = moduleUrl;
}

/**
 * Attach the SSR-side module URL as metadata to a client component.
 * Call this once in each `*.client.jsx` file's default export.
 *
 * @template {Function} C
 * @param {C} Component
 * @param {string} moduleUrl Usually `import.meta.url` from the client file.
 * @returns {C}
 */
export function clientComponent(Component, moduleUrl) {
  markClientModule("clientComponent", Component, moduleUrl);
  return Component;
}

/**
 * Mark a client component as client-only: `<Island>` skips its SSR render and
 * outputs the `fallback` prop instead, and the client mounts it with `render`
 * rather than `hydrate`. Call this once in the `*.client.jsx` file's default
 * export, in place of `clientComponent`.
 *
 * @template {Function} C
 * @param {C} Component
 * @param {string} moduleUrl Usually `import.meta.url` from the client file.
 * @returns {C}
 */
export function clientOnlyComponent(Component, moduleUrl) {
  markClientModule("clientOnlyComponent", Component, moduleUrl);
  Component.__clientOnly = true;
  return Component;
}

/**
 * Build the `<is-land>` element an adapter's `<Island>` renders: validate the
 * component and trigger, resolve the client module URL, and serialize the
 * props for the browser. The adapter renders `children` as the element's
 * content: the component itself, or for a client-only component its fallback.
 *
 * @param {Function} component - Component wrapped with `clientComponent()` or
 *   `clientOnlyComponent()` in its `*.client.*` file.
 * @param {Record<string, unknown>} props - Props for the component. Not mutated.
 * @param {Object} options
 * @param {string} options.type - The adapter's `type`, matching the init type
 *   the setup module registers.
 * @param {string} [options.on] - is-land initialization trigger name (e.g.
 *   `"interaction"`, `"visible"`, `"idle"`). Defaults to `"interaction"`, or
 *   `"load"` for a client-only component.
 * @returns {{ attrs: Record<string, string>, clientOnly: boolean, props: Record<string, unknown>, fallback: unknown }}
 *   `props` are what the component receives; `fallback` is `null` unless client-only.
 */
export function islandAttributes(component, props, { type, on: onOption }) {
  if (typeof component !== "function") {
    throw new TypeError(
      "Island: `component` prop must be a component wrapped with `clientComponent()` or `clientOnlyComponent()`",
    );
  }
  const clientOnly = component.__clientOnly === true;
  // NOTE: A client-only island holds only its fallback, often nothing at all,
  // so the click/touchstart that `interaction` waits for may never come.
  const on = onOption === undefined ? (clientOnly ? "load" : "interaction") : onOption;
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
      "Island: `component` is not marked as a client component. Wrap the default export of your *.client.jsx file with `clientComponent(Component, import.meta.url)` (or `clientOnlyComponent` to skip SSR).",
    );
  }
  if (typeof currentResolver !== "function") {
    throw new Error(
      "Island: no client module URL resolver is configured. Register `@tuqulore-inc/eleventy-islands` via `eleventyConfig.addPlugin`.",
    );
  }
  const importUrl = currentResolver(moduleUrl);
  // Drop children explicitly. JSX folds children into props.children, and
  // Island's contract is that SSR content comes from `component`; letting
  // children fall through would leak VNodes into the devalue-serialized
  // `props` attribute on <is-land> and into the client hydration payload.
  // NOTE: `fallback` is reserved only for client-only components, so a regular
  // client component that declares its own `fallback` prop still receives it.
  const { children: _children, ...componentProps } = props;
  const fallback = clientOnly ? (componentProps.fallback ?? null) : null;
  if (clientOnly) delete componentProps.fallback;
  let serializedProps;
  try {
    serializedProps = stringify(componentProps);
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
  const attrs = {
    [`land-on:${on}`]: "",
    type,
    import: importUrl,
    props: serializedProps,
  };
  if (clientOnly) attrs["client-only"] = "";
  return { attrs, clientOnly, props: componentProps, fallback };
}
