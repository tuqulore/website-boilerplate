# @tuqulore/eleventy-plugin-postcss

Eleventy plugin for processing CSS with PostCSS.

## Installation

```bash
npm install -D @11ty/eleventy postcss postcss-load-config @tuqulore/eleventy-plugin-postcss
```

## Usage

```javascript
// eleventy.config.mjs
import postcss from "@tuqulore/eleventy-plugin-postcss";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(postcss, {
    contentGlob: ["src/**/*.{md,mdx,jsx}"],
  });
}
```

## Options

### `contentGlob`

- Type: `string | string[]`
- Default: `[]`

Glob patterns for files to track as dependencies. When any of these files change, the CSS will be rebuilt. This is useful for TailwindCSS which scans content files for class names.

## Requirements

- Eleventy 3.0 or higher
- PostCSS 8.0 or higher
- postcss-load-config 6.0 or higher

## License

MIT
