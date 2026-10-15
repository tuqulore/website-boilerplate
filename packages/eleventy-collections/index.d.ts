import type { UserConfig } from "@11ty/eleventy";

export interface PluginOptions {
  /**
   * Path of the generated types, relative to the project root.
   * @default "generated/collections.d.ts"
   */
  outFile?: string;
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
