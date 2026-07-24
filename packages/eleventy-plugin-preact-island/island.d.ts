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
 * is-land initialization trigger. The union suggests the trio documented in
 * the guide (`"interaction"`, `"visible"`, `"idle"`) as autocompletion targets
 * while the `(string & {})` branch keeps the escape hatch open for the other
 * triggers supported by is-land (`"load"`, `"save-data"`, and parameterized
 * variants like `media("(min-width: 640px)")`). The runtime accepts anything
 * matching `/^[A-Za-z0-9_-]+$/`.
 *
 * @default "interaction"
 */
export type IslandOn = "interaction" | "visible" | "idle" | (string & {});

/**
 * Values that `devalue.stringify` (the runtime Island serializer) can
 * round-trip. Keep in sync with `island.js` — devalue also handles cycles,
 * `Map`/`Set` of serializables, `Date`, `RegExp`, `BigInt`, `undefined`,
 * `NaN`, and `Infinity`.
 */
type SerializablePrimitive =
  string | number | boolean | null | undefined | bigint;
type Serializable =
  | SerializablePrimitive
  | Date
  | RegExp
  | readonly Serializable[]
  | ReadonlyMap<Serializable, Serializable>
  | ReadonlySet<Serializable>
  | { readonly [key: string]: Serializable };

/**
 * Marker returned in the `never`-branch when a prop cannot cross the SSR /
 * client boundary. The parameter carries the reason in the type-error text.
 */
export type IslandSerializationError<Reason extends string> = {
  readonly __islandSerializationError: Reason;
};

/**
 * Rewrites each prop of `P` so that:
 * - functions collapse to `IslandSerializationError<"...">`
 * - non-serializable objects collapse similarly
 * - serializable values pass through unchanged
 *
 * The point is to move the `devalue.stringify` runtime failure to compile
 * time so `<Island onClick={...}>` is caught by `tsc`, not by the SSR render.
 */
export type SerializableProps<P> = {
  [K in keyof P]: P[K] extends (...args: never[]) => unknown
    ? IslandSerializationError<"functions cannot be passed to islands">
    : P[K] extends Serializable
      ? P[K]
      : IslandSerializationError<"prop is not devalue-serializable">;
};

/**
 * Props accepted by `<Island>`. Intentionally has NO index signature — the
 * component-specific props (`P`) are checked against the wrapped client
 * component's declaration.
 *
 * `component` and `on` are always accepted; if `P` happens to declare either,
 * Island's own definitions take precedence.
 */
export type IslandProps<P> = Omit<SerializableProps<P>, "component" | "on"> & {
  component: ClientComponent<P>;
  on?: IslandOn;
};

/**
 * Wrap a Preact component for Partial Hydration via is-land. The extra props
 * are forwarded both to the SSR render and to the hydrated client render.
 */
export function Island<P>(props: IslandProps<P>): VNode;
