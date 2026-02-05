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
  eleventyConfig.addFilter("myFilter", (value) => value);
});
```

## What's Included

### Plugins

- **@tuqulore/eleventy-plugin-preact** - JSX/MDX server-side rendering
- **@tuqulore/eleventy-plugin-preact-island** - Partial hydration with is-land
- **@tuqulore/eleventy-plugin-postcss** - CSS processing with PostCSS

### Default Behavior

| Feature | Description |
|---------|-------------|
| Input directory | `src` |
| Output directory | `dist` |
| Hydration glob | `./src/**/*.hydrate.jsx` |
| PostCSS content glob | `src/**/*.{md,mdx,jsx}` |
| Server watches | `dist/**/*.css` |
| Markdown | `breaks: true`, `linkify: true` |
| Static assets | `src/public/**` copied to root |
| Image optimization | Images in `src/**` optimized and copied to `dist` |

### Image Optimization

On `eleventy.before` event, all images in `src/**/*.{jpeg,jpg,png,webp,gif,tiff,avif,svg}` (excluding `src/public`) are processed with `@11ty/eleventy-img` and output to the corresponding location in `dist`.

### Static Assets

Files in `src/public/**` are copied to the root of the output directory. For example, `src/public/favicon.ico` becomes `dist/favicon.ico`.

## Requirements

- Node.js 20 or higher
- Eleventy 3.0 or higher
- Preact 10 or higher
- PostCSS 8 or higher

## License

MIT
