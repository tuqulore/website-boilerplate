/**
 * Island wrapper component for simplified partial hydration
 *
 * @param {Object} props
 * @param {import('preact').ComponentChildren} props.children - Child component(s) to hydrate
 * @param {string} [props.on="interaction"] - Hydration trigger (interaction, visible, idle, media, save-data)
 * @param {string} [props.import] - Module path for hydration (required until Phase 2 Babel plugin)
 * @param {Object} [props...rest] - Props to pass to the hydrated component
 *
 * @example
 * // Phase 1 usage (import path required)
 * <Island on="interaction" import="/_includes/partials/header/desktop.hydrate.js" class="hidden md:block" nav={eleventy.nav}>
 *   <Desktop class="hidden md:block" nav={eleventy.nav} />
 * </Island>
 *
 * @example
 * // Phase 2 usage (import path auto-detected via __hydrateModule)
 * <Island on="interaction" class="hidden md:block" nav={eleventy.nav}>
 *   <Desktop class="hidden md:block" nav={eleventy.nav} />
 * </Island>
 */
export default function Island({
  children,
  on = "interaction",
  import: importPath,
  ...props
}) {
  // Phase 2: Auto-detect import path from child component's __hydrateModule metadata
  const child = Array.isArray(children) ? children[0] : children;
  const hydrateModule = importPath ?? child?.type?.__hydrateModule;

  if (!hydrateModule) {
    console.warn(
      "[Island] No import path specified. Provide 'import' prop or wait for Phase 2 Babel plugin.",
    );
  }

  return (
    <is-land
      {...{ [`land-on:${on}`]: true }}
      type="preact"
      import={hydrateModule}
      props={JSON.stringify(props)}
    >
      {children}
    </is-land>
  );
}
