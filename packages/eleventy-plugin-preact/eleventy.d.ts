/**
 * Built-in Eleventy fields always present on the singleton, regardless of the
 * user's data. Follows Eleventy 3.x's supplied-data reference.
 *
 * @see https://www.11ty.dev/docs/data-eleventy-supplied/
 */
export interface EleventyBuiltinData {
  /** Rendered HTML of the child template, set by the plugin's compile hook. */
  content?: string;
  /** Eleventy `page` variable. */
  page: {
    url: string;
    date: Date;
    inputPath: string;
    fileSlug: string;
    filePathStem: string;
    outputFileExtension: string;
    templateSyntax: string;
    lang?: string;
    rawInput?: string;
  };
  /** Eleventy `eleventy` variable. */
  eleventy: {
    version: string;
    generator: string;
    env: {
      source: "cli" | "script";
      runMode: "build" | "serve" | "watch";
      config: string;
      root: string;
      isServerless: boolean;
    };
    directories: {
      input: string;
      output: string;
      data: string;
      includes: string;
      layouts?: string;
    };
  };
  /** Host project's `package.json`, exposed by Eleventy. */
  pkg?: Record<string, unknown>;
  layout?: string;
  permalink?: string | false;
  tags?: string | readonly string[];
  /** Common front matter fields — declared optional so users can leave them off. */
  title?: string;
  description?: string;
  // NOTE: `locale` is intentionally left off the built-in. Projects narrow it
  // to a literal union (e.g. `"ja" | "en"`) via `EleventyUserData`;
  // interface merging cannot override a base declaration with a narrower type.
}

/**
 * Project-specific data (Global Data from `_data/`, front matter). Empty by
 * design — projects extend it via declaration merging:
 *
 * ```ts
 * declare module "@tuqulore-inc/eleventy-plugin-preact/eleventy" {
 *   interface EleventyUserData {
 *     site: { name: string; url: string };
 *     nav: Array<{ title: string; url: string }>;
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EleventyUserData {}

export type EleventyData = EleventyBuiltinData & EleventyUserData;

/**
 * Eleventy data singleton accessible from any template/component during SSR.
 *
 * Provides access to all Eleventy data without prop drilling:
 * - `eleventy.content` — Rendered HTML from child template
 * - `eleventy.title`, `eleventy.description`, etc. — Values from data export or front matter
 * - `eleventy.site`, `eleventy.nav`, etc. — Global data from `_data/` (via declaration merging)
 * - `eleventy.page` — Eleventy page data (url, date, etc.)
 *
 * NOTE: Access is only valid during SSR. Reading `eleventy.*` at module load
 * time (outside a template render) throws.
 */
export const eleventy: EleventyData;
