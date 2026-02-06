import type { ComponentChildren, JSX } from "preact";

export interface IslandProps extends JSX.HTMLAttributes<HTMLElement> {
  /**
   * Child component(s) to hydrate.
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
   * Required in Phase 1. Will be auto-detected in Phase 2 via Babel plugin.
   */
  import?: string;
}

/**
 * Island wrapper component for simplified partial hydration.
 *
 * Wraps the `<is-land>` element and automatically handles:
 * - Dynamic `land-on:` attribute based on `on` prop
 * - Automatic JSON.stringify of props
 * - Future: Auto-detection of import path via `__hydrateModule` (Phase 2)
 *
 * @example
 * // Phase 1 usage (import path required)
 * <Island on="interaction" import="/_includes/partials/header/desktop.hydrate.js" class="hidden md:block" nav={eleventy.nav}>
 *   <Desktop class="hidden md:block" nav={eleventy.nav} />
 * </Island>
 */
declare function Island(props: IslandProps): JSX.Element;

export default Island;
