export interface CreateHydrateModuleResolverOptions {
  /**
   * Input directory that matches the Eleventy input directory / esbuild `outbase`.
   * @default "src"
   */
  srcDir?: string;
  /**
   * URL path prefix where the compiled hydrate bundles are served.
   * @default "/"
   */
  urlPrefix?: string;
}

export type HydrateModuleResolver = (moduleUrl: string) => string;

/**
 * Create a resolver that converts an SSR-side hydrate module URL
 * (e.g. `import.meta.url` inside `foo.hydrate.jsx`) into the browser URL
 * where the compiled bundle will be served.
 */
export function createHydrateModuleResolver(
  options?: CreateHydrateModuleResolverOptions,
): HydrateModuleResolver;
