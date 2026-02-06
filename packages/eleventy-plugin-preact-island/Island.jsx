/**
 * Island wrapper component for simplified partial hydration
 *
 * Features:
 * - Props are automatically extracted from the child component (no duplication needed)
 * - Import path is auto-detected via __hydrateModule metadata from child component
 *
 * @param {Object} props
 * @param {import('preact').ComponentChildren} props.children - Child component(s) to hydrate
 * @param {string} [props.on="interaction"] - Hydration trigger (interaction, visible, idle, media, save-data)
 * @param {string} [props.import] - Module path for hydration (auto-detected for hydrateGlob files)
 * @param {Object} [props...rest] - Additional props to merge with child props (takes precedence)
 *
 * @example
 * // Minimal usage - import path and props are auto-detected
 * <Island on="interaction">
 *   <Desktop class="hidden md:block" nav={eleventy.nav} />
 * </Island>
 *
 * @example
 * // Additional props on Island take precedence over child props
 * <Island on="interaction" extraProp="value">
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

  // Auto-detect import path from child component's __hydrateModule metadata
  const hydrateModule = importPath ?? child?.type?.__hydrateModule;

  if (!hydrateModule) {
    console.warn(
      "[Island] No import path detected. Ensure the child component matches the hydrateGlob pattern in eleventy-plugin-preact, or provide the 'import' prop manually.",
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
