export interface CreateClientModuleResolverOptions {
  /**
   * Eleventy input directory (e.g. `eleventyConfig.directories.input`, `"./src/"`).
   * Resolved to an absolute path; a client module URL must fall under it.
   * @default "."
   */
  inputDir?: string;
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
 *
 * @internal Wired by the Eleventy plugin; not part of the public API.
 */
export function createClientModuleResolver(
  options?: CreateClientModuleResolverOptions,
): ClientModuleResolver;
