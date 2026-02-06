/**
 * Island wrapper component for simplified partial hydration
 *
 * Props are automatically extracted from the child component and passed to the
 * hydrated component, eliminating the need to specify props twice.
 *
 * @param {Object} props
 * @param {import('preact').ComponentChildren} props.children - Child component(s) to hydrate
 * @param {string} [props.on="interaction"] - Hydration trigger (interaction, visible, idle, media, save-data)
 * @param {string} [props.import] - Module path for hydration (required until Phase 2 Babel plugin)
 * @param {Object} [props...rest] - Additional props to merge with child props (takes precedence)
 *
 * @example
 * // Props are automatically extracted from child - no duplication needed
 * <Island on="interaction" import="/_includes/partials/header/desktop.hydrate.js">
 *   <Desktop class="hidden md:block" nav={eleventy.nav} />
 * </Island>
 *
 * @example
 * // Additional props on Island take precedence over child props
 * <Island on="interaction" import="..." extraProp="value">
 *   <Desktop class="hidden md:block" nav={eleventy.nav} />
 * </Island>
 */
export default function Island({
  children,
  on = "interaction",
  import: importPath,
  ...extraProps
}) {
  const child = Array.isArray(children) ? children[0] : children;

  // Phase 2: Auto-detect import path from child component's __hydrateModule metadata
  const hydrateModule = importPath ?? child?.type?.__hydrateModule;

  if (!hydrateModule) {
    console.warn(
      "[Island] No import path specified. Provide 'import' prop or wait for Phase 2 Babel plugin.",
    );
  }

  // Extract props from child component (excluding children)
  const { children: _, ...childProps } = child?.props || {};

  // Merge child props with extra props (extra props take precedence)
  const mergedProps = { ...childProps, ...extraProps };

  return (
    <is-land
      {...{ [`land-on:${on}`]: true }}
      type="preact"
      import={hydrateModule}
      props={JSON.stringify(mergedProps)}
    >
      {children}
    </is-land>
  );
}
