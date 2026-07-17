/**
 * Project-specific Eleventy data for `@tuqulore-inc/docs`. Injected into
 * `EleventyUserData` via TypeScript declaration merging so that the shared
 * `eleventy` singleton picks up narrow types.
 *
 * Mirrors the shape of:
 * - `src/_data/site.js` (locale-keyed nested `{name, description}` + flat `url`, `author`)
 * - `src/_data/nav/{ja,en}.json`
 */

type Locale = "ja" | "en";

interface NavItem {
  name: string;
  path?: string;
  children?: readonly NavItem[];
}

declare module "@tuqulore-inc/eleventy-plugin-preact/eleventy" {
  interface EleventyUserData {
    /** Current locale, narrowed to the languages we actually ship. */
    locale?: Locale;
    /**
     * `_data/site.js`. Combines the locale-keyed nested translations with the
     * top-level flat fields shared across languages.
     */
    site: Record<Locale, { name: string; description: string }> & {
      url: string;
      author: string;
    };
    /** `_data/nav/{ja,en}.json`. */
    nav: Record<Locale, readonly NavItem[]>;
  }
}
