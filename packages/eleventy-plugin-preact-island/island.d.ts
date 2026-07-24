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

export interface IslandProps<P = Record<string, unknown>> {
  component: ClientComponent<P>;
  /**
   * is-land initialization trigger. Common values: `"interaction"`, `"visible"`,
   * `"idle"`. Rendered as the boolean attribute `land-on:<on>` on the underlying
   * `<is-land>` element.
   * @default "interaction"
   */
  on?: string;
  [key: string]: unknown;
}

/**
 * Wrap a Preact component for Partial Hydration via is-land. The extra props
 * are forwarded both to the SSR render and to the hydrated client render.
 */
export function Island<P = Record<string, unknown>>(props: IslandProps<P>): VNode;
