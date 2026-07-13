# @tuqulore-inc/eleventy-plugin-postcss

Eleventy plugin for processing CSS with PostCSS.

## Documentation

The design rationale (why an independent plugin, `contentGlob` and Tailwind dependency tracking, applying Tailwind CSS) lives at [Plugins / eleventy-plugin-postcss](https://website.tuqulore.workers.dev/en/plugins/eleventy-plugin-postcss/).

## Installation

```bash
npm install -D @11ty/eleventy postcss @tuqulore-inc/eleventy-plugin-postcss
```

## Usage

```javascript
// eleventy.config.js
import postcss from "@tuqulore-inc/eleventy-plugin-postcss";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(postcss, {
    contentGlob: ["src/**/*.{md,mdx,jsx}"],
  });
}
```

A PostCSS configuration file (`postcss.config.js`) at the project root is required:

```javascript
// postcss.config.js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

## API

### Plugin options

#### `contentGlob`

- Type: `string | string[]`
- Default: `[]`

Glob patterns for files to track as CSS dependencies. When any matching file changes, the CSS is rebuilt. Useful for Tailwind CSS, which scans templates for class names.

When using `contentGlob`, also configure `setServerOptions` so the dev server reloads the browser after CSS regeneration:

```javascript
eleventyConfig.addPlugin(postcss, {
  contentGlob: ["src/**/*.{md,mdx,jsx}"],
});
eleventyConfig.setServerOptions({
  watch: ["dist/**/*.css"],
});
```

#### `skip`

- Type: `(inputPath: string) => boolean`
- Default: `undefined`

Predicate called for each CSS template. Return `true` to skip processing and output. Useful for `@import`ed fragments or CSS handled by another pipeline.

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
