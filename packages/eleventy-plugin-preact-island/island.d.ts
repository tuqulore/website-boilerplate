import type { ComponentType, VNode } from "preact";

export type HydratableComponent<P = Record<string, unknown>> =
  ComponentType<P> & {
    __hydrateModuleUrl: string;
  };

/**
 * Attach the SSR-side module URL as metadata to a hydration component.
 * Call in each `*.hydrate.jsx` file: `export default hydratable(Component, import.meta.url);`
 */
export function hydratable<P = Record<string, unknown>>(
  Component: ComponentType<P>,
  moduleUrl: string,
): HydratableComponent<P>;

export interface IslandProps<P = Record<string, unknown>> {
  component: HydratableComponent<P>;
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
export function Island<P = Record<string, unknown>>(
  props: IslandProps<P>,
): VNode;

/** @internal used by the plugin to install the URL resolver */
export function _setHydrateModuleResolver(
  resolver: (moduleUrl: string) => string,
): void;
