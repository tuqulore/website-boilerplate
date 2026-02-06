import type { ComponentChildren, JSX } from "preact";

export interface IslandProps extends JSX.HTMLAttributes<HTMLElement> {
  /**
   * Child component(s) to hydrate.
   * Props from the first child are automatically extracted and passed to the hydrated component.
   * The first child's type may have a `__hydrateModule` property for auto-detection (Phase 2).
   */
  children: ComponentChildren;

  /**
   * Hydration trigger event.
   * @default "interaction"
   */
  on?: "interaction" | "visible" | "idle" | "media" | "save-data";

  /**
   * Module path for hydration.
   * Auto-detected for files matching hydrateGlob in eleventy-plugin-preact.
   * Can be provided manually if auto-detection is not available.
   */
  import?: string;
}

/**
 * Island wrapper component for simplified partial hydration.
 *
 * Wraps the `<is-land>` element and automatically handles:
 * - Automatic extraction of props from child component (no duplication needed)
 * - Dynamic `land-on:` attribute based on `on` prop
 * - Automatic JSON.stringify of props
 * - Future: Auto-detection of import path via `__hydrateModule` (Phase 2)
 *
 * @example
 * // Props are automatically extracted from child - no duplication needed
 * <Island on="interaction" import="/_includes/partials/header/desktop.hydrate.js">
 *   <Desktop class="hidden md:block" nav={eleventy.nav} />
 * </Island>
 */
declare function Island(props: IslandProps): JSX.Element;

export default Island;
