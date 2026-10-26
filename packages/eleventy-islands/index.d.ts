import type { UserConfig } from "@11ty/eleventy";

/**
 * Connects the client boundary to a UI framework. Implemented by
 * `preactAdapter` from `@tuqulore-inc/eleventy-islands/preact`.
 */
export interface IslandAdapter {
  /**
   * The `type` attribute of `<is-land>` and the is-land init type the setup
   * module registers (e.g. `"preact"`). Must match `/^[A-Za-z0-9_-]+$/`.
   */
  type: string;
  /**
   * File URL of the browser-side module exporting
   * `mount(target, Component, props, { clientOnly })`. A file URL rather than
   * a package specifier, since the host project may not see this package.
   */
  mountModule: string;
  /** JSX import source for bundling `*.client.*` entries (e.g. `"preact"`). */
  jsxImportSource?: string;
}

/**
 * What the plugin hands a bundler on every `eleventy.before`.
 */
export interface BundlerContext {
  runMode: "build" | "watch" | "serve";
  /** Eleventy input directory, normalized (e.g. `"./src/"`). */
  inputDir: string;
  /** Eleventy output directory, normalized (e.g. `"./dist/"`). */
  outputDir: string;
  /** Glob of client entries: `<inputDir>**\/*.client.{js,jsx,ts,tsx}`. */
  clientGlob: string;
  /**
   * Output path of a client entry relative to `outputDir`, without extension
   * (`<inputDir>/a/b.client.jsx` → `a/b.client`). The SSR URL resolver
   * expects the bundle at that path plus `.js`.
   */
  clientEntryOut(entry: string): string;
  setup: {
    /** Output path of the setup module relative to `outputDir`, without extension. */
    name: string;
    /** Source of the setup module. Call on every build: it follows `runMode`. */
    source(): string;
    /** is-land import in the setup module. Keep it external. */
    isLandUrl: string;
    /** Absolute path of `adapter.mountModule`, imported by the setup module. */
    mountModule: string;
    /** This package's directory, from which the setup module's `devalue` resolves. */
    packageDir: string;
  };
  adapter: IslandAdapter;
}

export type Bundler = (context: BundlerContext) => Promise<void> | void;

export interface PluginOptions {
  adapter: IslandAdapter;
  /**
   * Bundles the client entries and the setup module, e.g. `esbuildBundler()`
   * from `@tuqulore-inc/eleventy-islands/esbuild`. Without one, the plugin
   * writes the setup module unbundled to `<output>/__island-setup.js` for
   * your own bundler to process.
   */
  bundler?: Bundler;
}

/**
 * Eleventy plugin for Partial Hydration with is-land
 */
declare function islandsPlugin(eleventyConfig: UserConfig, pluginOptions: PluginOptions): void;

export default islandsPlugin;
