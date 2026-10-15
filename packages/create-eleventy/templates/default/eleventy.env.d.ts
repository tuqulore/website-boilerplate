/**
 * Types for project-specific Eleventy data, merged into the `eleventy`
 * singleton. `site` and `nav` follow the `_data/` files; declare the front
 * matter fields your templates read as well.
 *
 * NOTE: The top-level imports keep this file a module. Without them,
 * `declare module` replaces the package's types instead of extending them.
 */
import type nav from "./src/_data/nav.json";
import type site from "./src/_data/site.js";

declare module "@tuqulore-inc/eleventy-preset/eleventy" {
  interface EleventyUserData {
    site: typeof site;
    nav: typeof nav;
    /** Front matter: OGP image path. */
    ogp?: string;
  }
}
