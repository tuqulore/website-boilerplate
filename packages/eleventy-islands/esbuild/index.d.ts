import type { BuildOptions } from "esbuild";

import type { Bundler } from "../index.js";

export interface EsbuildBundlerOptions {
  /**
   * Extra esbuild options. `plugins` run after the built-in setup plugin; the
   * other keys override the defaults (`jsx: "automatic"`, `jsxImportSource`
   * from the adapter, `minify` in `build` run mode). `bundle`, `chunkNames`,
   * `entryNames`, `entryPoints`, `format`, `outdir`, `outExtension`, and
   * `splitting` define the output layout and are rejected.
   */
  esbuildOptions?: Omit<
    BuildOptions,
    | "bundle"
    | "chunkNames"
    | "entryNames"
    | "entryPoints"
    | "format"
    | "outdir"
    | "outExtension"
    | "splitting"
  >;
}

/**
 * Bundle the client entries and the setup module with esbuild. Pass the result
 * as the `bundler` option of `@tuqulore-inc/eleventy-islands`.
 */
export function esbuildBundler(options?: EsbuildBundlerOptions): Bundler;
