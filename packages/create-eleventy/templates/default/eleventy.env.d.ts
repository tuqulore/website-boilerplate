/**
 * Project-specific Eleventy data. Injected into `EleventyUserData` via
 * TypeScript declaration merging so `eleventy.site.name` etc. get types.
 *
 * Edit this file to match your `_data/` files. It ships as a scaffold; the
 * shapes below match the default `_data/site.js` and `_data/nav.json`.
 */

interface NavItem {
  name: string;
  path?: string;
  children?: readonly { name: string; path: string }[];
}

declare module "@tuqulore-inc/eleventy-plugin-preact/eleventy" {
  interface EleventyUserData {
    /** `_data/site.js`. */
    site: {
      name: string;
      description: string;
      url: string;
      author: string;
    };
    /** `_data/nav.json`. */
    nav: readonly NavItem[];
    /** Common front matter override — extend as needed. */
    title?: string;
  }
}
