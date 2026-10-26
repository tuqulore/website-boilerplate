type AnyComponent = (...args: any[]) => unknown;

export type ClientComponent<C extends AnyComponent = AnyComponent> = C & {
  __clientModuleUrl: string;
};

/**
 * Attach the SSR-side module URL as metadata to a client component.
 * Call in each `*.client.jsx` file: `export default clientComponent(Component, import.meta.url);`
 */
export function clientComponent<C extends AnyComponent>(
  Component: C,
  moduleUrl: string,
): ClientComponent<C>;

export type ClientOnlyComponent<C extends AnyComponent = AnyComponent> = ClientComponent<C> & {
  __clientOnly: true;
};

/**
 * Mark a client component as client-only: `<Island>` skips its SSR render and
 * outputs `fallback` instead, and the client mounts it from scratch.
 * Call in the `*.client.jsx` file in place of `clientComponent`:
 * `export default clientOnlyComponent(Component, import.meta.url);`
 */
export function clientOnlyComponent<C extends AnyComponent>(
  Component: C,
  moduleUrl: string,
): ClientOnlyComponent<C>;

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

export interface IslandAttributesOptions {
  /** The adapter's `type`, matching the init type the setup module registers. */
  type: string;
  /** @default "interaction", or "load" for a client-only component */
  on?: IslandOn;
}

export interface IslandAttributesResult<P> {
  /** Attributes of the `<is-land>` element. */
  attrs: Record<string, string>;
  clientOnly: boolean;
  /** Props the component receives, without `children` (and `fallback` when client-only). */
  props: Omit<P, "children">;
  /** The `fallback` prop of a client-only component; `null` otherwise. */
  fallback: unknown;
}

/**
 * Build the `<is-land>` element an adapter's `<Island>` renders: validate the
 * component and trigger, resolve the client module URL, and serialize the
 * props for the browser. For adapter authors.
 */
export function islandAttributes<P extends Record<string, unknown>>(
  component: AnyComponent,
  props: P,
  options: IslandAttributesOptions,
): IslandAttributesResult<P>;
