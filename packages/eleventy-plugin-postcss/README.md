# @tuqulore-inc/eleventy-plugin-postcss

Eleventy plugin for processing CSS with PostCSS.

## Installation

```bash
npm install -D @11ty/eleventy postcss @tuqulore-inc/eleventy-plugin-postcss
```

## Usage

```javascript
// eleventy.config.mjs
import postcss from "@tuqulore-inc/eleventy-plugin-postcss";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(postcss, {
    contentGlob: ["src/**/*.{md,mdx,jsx}"],
  });
}
```

This plugin requires a PostCSS configuration file (`postcss.config.mjs` or `postcss.config.js`) in your project root:

```javascript
// postcss.config.mjs
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

## Options

### `contentGlob`

- Type: `string | string[]`
- Default: `[]`

Glob patterns for files to track as dependencies. When any of these files change, the CSS will be rebuilt. This is useful for TailwindCSS which scans content files for class names.

When using `contentGlob`, you should also configure `setServerOptions` to watch the generated CSS files for dev server reload:

```javascript
eleventyConfig.addPlugin(postcss, {
  contentGlob: ["src/**/*.{md,mdx,jsx}"],
});
eleventyConfig.setServerOptions({
  watch: ["dist/**/*.css"],
});
```

### `skip`

- Type: `(inputPath: string) => boolean`
- Default: `undefined`

Predicate invoked for each CSS template file. When it returns `true`, processing and output of that file are skipped. Useful for excluding partials or files handled by another pipeline (e.g., `@import`ed fragments).

```javascript
eleventyConfig.addPlugin(postcss, {
  skip: (inputPath) => inputPath.includes("/_partials/"),
});
```

## Requirements

- Eleventy 3.0 or higher
- PostCSS 8.0 or higher

## License

MIT
