export interface CreateClientModuleResolverOptions {
  /**
   * Input directory that matches the Eleventy input directory / esbuild `outbase`.
   * @default "src"
   */
  srcDir?: string;
  /**
   * URL path prefix where the compiled client module bundles are served.
   * @default "/"
   */
  urlPrefix?: string;
}

export type ClientModuleResolver = (moduleUrl: string) => string;

/**
 * Create a resolver that converts an SSR-side client module URL
 * (e.g. `import.meta.url` inside `foo.client.jsx`) into the browser URL
 * where the compiled bundle will be served.
 */
export function createClientModuleResolver(
  options?: CreateClientModuleResolverOptions,
): ClientModuleResolver;
