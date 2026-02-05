# @tuqulore/eleventy-preset

Eleventy preset for tuqulore website boilerplate.

A pre-configured setup that bundles commonly used plugins and settings.

## Installation

```bash
npm install -D @11ty/eleventy @tuqulore/eleventy-preset preact postcss
```

## Usage

```javascript
// eleventy.config.mjs
import preset from "@tuqulore/eleventy-preset";

export default preset();
```

### With Custom Configuration

```javascript
// eleventy.config.mjs
import preset from "@tuqulore/eleventy-preset";

export default preset((eleventyConfig) => {
  // Add your custom configuration
  eleventyConfig.addPassthroughCopy({ "src/public/**": "/" });
  eleventyConfig.on("eleventy.before", async () => {
    // Custom build tasks
  });
});
```

## What's Included

### Plugins

- **@tuqulore/eleventy-plugin-preact** - JSX/MDX server-side rendering
- **@tuqulore/eleventy-plugin-preact-island** - Partial hydration with is-land
- **@tuqulore/eleventy-plugin-postcss** - CSS processing with PostCSS

### Default Configuration

- Input directory: `src`
- Output directory: `dist`
- Hydration glob: `./src/**/*.hydrate.jsx`
- PostCSS content glob: `src/**/*.{md,mdx,jsx}`
- Server watches: `dist/**/*.css`
- Markdown: `breaks: true`, `linkify: true`

## Requirements

- Node.js 20 or higher
- Eleventy 3.0 or higher
- Preact 10 or higher
- PostCSS 8 or higher

## License

MIT
