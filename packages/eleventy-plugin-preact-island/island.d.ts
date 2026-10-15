import type { ComponentType, VNode } from "preact";

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
 * Wrap a Preact component for Partial Hydration via is-land. The extra props
 * are forwarded both to the SSR render and to the hydrated client render.
 */
export function Island<P>(props: IslandProps<P>): VNode;
