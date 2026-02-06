/**
 * Eleventy data singleton accessible from any template/component during SSR.
 *
 * Provides access to all Eleventy data without prop drilling:
 * - `eleventy.content` - Rendered HTML from child template
 * - `eleventy.title`, `eleventy.description`, etc. - Values from data export or front matter
 * - `eleventy.site`, `eleventy.nav`, etc. - Global data from `_data/` directory
 * - `eleventy.page` - Eleventy page data (url, date, etc.)
 */
export const eleventy: Record<string, unknown>;
