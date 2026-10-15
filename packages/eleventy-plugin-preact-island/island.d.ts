import type { ComponentChildren, ComponentType, VNode } from "preact";

export type ClientComponent<P = Record<string, unknown>> = ComponentType<P> & {
  __clientModuleUrl: string;
};

/**
 * Attach the SSR-side module URL as metadata to a client component.
 * Call in each `*.client.jsx` file: `export default clientComponent(Component, import.meta.url);`
 */
export function clientComponent<P = Record<string, unknown>>(
  Component: ComponentType<P>,
  moduleUrl: string,
): ClientComponent<P>;

export type ClientOnlyComponent<P = Record<string, unknown>> = ClientComponent<P> & {
  __clientOnly: true;
};

/**
 * Mark a client component as client-only: `<Island>` skips its SSR render and
 * outputs `fallback` instead, and the client mounts it with `render`.
 * Call in the `*.client.jsx` file in place of `clientComponent`:
 * `export default clientOnlyComponent(Component, import.meta.url);`
 */
export function clientOnlyComponent<P = Record<string, unknown>>(
  Component: ComponentType<P>,
  moduleUrl: string,
): ClientOnlyComponent<P>;

/**
 * is-land initialization trigger. The union offers `"interaction"`, `"visible"`
 * and `"idle"` for autocompletion; the `(string & {})` branch still accepts the
 * other is-land triggers such as `"load"` or `"save-data"`. Rendered as the
 * boolean attribute `land-on:<on>` on the underlying `<is-land>` element.
 *
 * NOTE: The runtime rejects values not matching `/^[A-Za-z0-9_-]+$/`, so
 * parameterized triggers like `media("(min-width: 640px)")` need a raw
 * `<is-land>` instead of `<Island>`.
 */
export type IslandOn = "interaction" | "visible" | "idle" | (string & {});

/**
 * Props accepted by `<Island>`: `component`, `on`, and the props of the wrapped
 * client component, checked against that component's declaration.
 */
export type IslandProps<P> = Omit<P, "component" | "on"> & {
  component: ClientComponent<P>;
  /** @default "interaction" */
  on?: IslandOn;
};

/**
 * Props accepted by `<Island>` for a client-only component: `IslandProps` plus
 * `fallback`, the placeholder rendered by SSR in place of the component.
 */
export type ClientOnlyIslandProps<P> = Omit<P, "component" | "on" | "fallback"> & {
  component: ClientOnlyComponent<P>;
  /** @default "load" */
  on?: IslandOn;
  fallback?: ComponentChildren;
};

/**
 * Wrap a Preact component for Partial Hydration via is-land. The extra props
 * are forwarded both to the SSR render and to the hydrated client render.
 * A client-only component is not rendered by SSR; `fallback` is output instead.
 */
export function Island<P>(props: ClientOnlyIslandProps<P>): VNode;
export function Island<P>(props: IslandProps<P>): VNode;
