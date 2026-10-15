import type { UserConfig } from "@11ty/eleventy";

export interface PluginOptions {
  /**
   * Path of the generated types, relative to the project root. `false` skips
   * type generation, e.g. in projects without `@tuqulore-inc/eleventy-plugin-preact`.
   * @default "collections.d.ts"
   */
  outFile?: string | false;
  /**
   * Module whose `EleventyCollections` interface the generated types augment.
   * Use the module you import `eleventy` from.
   * @default "@tuqulore-inc/eleventy-preset/eleventy"
   */
  typesModule?: string;
}

/**
 * Eleventy plugin that registers, validates, and types a collection for every
 * `<input>/<name>/_schema.ts`.
 */
declare function collectionsPlugin(eleventyConfig: UserConfig, pluginOptions?: PluginOptions): void;

export default collectionsPlugin;
