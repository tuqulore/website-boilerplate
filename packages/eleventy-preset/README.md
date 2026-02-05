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

## Template Formats

This preset supports JSX and MDX as template languages via `@tuqulore/eleventy-plugin-preact`.

| Extension | Description |
|-----------|-------------|
| `.jsx` | Preact JSX components |
| `.mdx` | Markdown with JSX support |

### Basic MDX Example

```mdx
import Clicker from "./clicker.hydrate.jsx";

export const data = {
  layout: "post",
  title: "Hello World",
};

# Hello World

Content goes here.

<is-land land-on:interaction type="preact" import="./clicker.hydrate.js">
  <Clicker />
</is-land>
```

## Data Export

Use `export const data` to define page metadata (equivalent to front matter in Markdown):

```jsx
export const data = {
  layout: "post",
  title: "Page Title",
  description: "Page description",
  tags: ["blog", "tutorial"],
};
```

## Layout Chaining

Eleventy's [Layout Chaining](https://www.11ty.dev/docs/layout-chaining/) works with MDX layouts. Each layout can specify its own parent layout.

### Chain Structure Example

```
index.mdx → post.mdx → base.mdx
(content)   (article)   (html shell)
```

### Root Layout (`_includes/base.mdx`)

The root layout defines the complete HTML document structure:

```mdx
import Header from "./partials/header.mdx";
import Footer from "./partials/footer.mdx";

<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="/main.css" />
    <title>
      {props.title && `${props.title} | `}
      {props.site.name}
    </title>
  </head>
  <body>
    <Header {...props} />
    <div dangerouslySetInnerHTML={{ __html: props.content }}></div>
    <Footer {...props} />
  </body>
</html>
```

### Intermediate Layout (`_includes/post.mdx`)

Intermediate layouts wrap content and chain to the root layout:

```mdx
export const data = {
  layout: "base",
};

<article class="prose" dangerouslySetInnerHTML={{ __html: props.content }} />
```

### Best Practices

- Root layout (`base.mdx`) defines the complete HTML shell
- Intermediate layouts (`post.mdx`, etc.) define content wrappers
- Use `dangerouslySetInnerHTML={{ __html: props.content }}` to inject child content

## Props in Layouts

Layouts receive the following props:

| Prop | Description |
|------|-------------|
| `props.content` | Rendered HTML from child template |
| `props.title`, `props.description`, etc. | Values from `data` export or front matter |
| `props.site`, `props.nav`, etc. | Global data from `_data/` directory |
| `props.page` | Eleventy page data (url, date, etc.) |

### Global Data Example

Data files in `src/_data/` are available as props:

```javascript
// src/_data/site.mjs
export default {
  name: "Site Name",
  description: "Site Description",
  url: process.env.SITE_URL,
};
```

```json
// src/_data/nav.json
[
  { "name": "Home", "path": "/" },
  { "name": "About", "path": "/about/" }
]
```

Access in templates:

```jsx
<title>{props.site.name}</title>
<nav>
  {props.nav.map((item) => (
    <a href={item.path}>{item.name}</a>
  ))}
</nav>
```

## Partials (Components)

Place reusable components in `_includes/partials/`:

```
src/_includes/partials/
├── header.mdx
├── footer.mdx
└── ogp.mdx
```

### Using Partials

Import and use partials in layouts or other MDX files:

```mdx
import Header from "./partials/header.mdx";
import Footer from "./partials/footer.mdx";

<Header {...props} />
<main dangerouslySetInnerHTML={{ __html: props.content }}></main>
<Footer {...props} />
```

Pass all props with `{...props}` to ensure partials have access to page data and global data.

## Partial Hydration

This preset supports partial hydration using `@tuqulore/eleventy-plugin-preact-island` and `<is-land>`.

### Creating a Hydrated Component

Name your component with the `.hydrate.jsx` suffix:

```jsx
// src/clicker.hydrate.jsx
import { useState } from "preact/hooks";

export default function Clicker() {
  const [counter, setCounter] = useState(0);

  return (
    <div>
      <button onClick={() => setCounter(counter + 1)}>Count</button>
      <p>{counter}</p>
    </div>
  );
}
```

### Using in MDX

Import the component and wrap it with `<is-land>`:

```mdx
import Clicker from "./clicker.hydrate.jsx";

<is-land land-on:interaction type="preact" import="./clicker.hydrate.js">
  <Clicker />
</is-land>
```

### Passing Props

For hydrated components that need props, serialize them with `JSON.stringify`:

```mdx
import Navigation from "./partials/header/navigation.hydrate.jsx";

<is-land
  land-on:interaction
  type="preact"
  import="/_includes/partials/header/navigation.hydrate.js"
  props={JSON.stringify({ nav: props.nav, class: "hidden md:block" })}
>
  <Navigation nav={props.nav} class="hidden md:block" />
</is-land>
```

### Hydration Triggers

| Attribute | Description |
|-----------|-------------|
| `land-on:interaction` | Hydrate on user interaction (click, focus, etc.) |
| `land-on:visible` | Hydrate when element becomes visible |
| `land-on:idle` | Hydrate when browser is idle |
| `land-on:media` | Hydrate based on media query |

See [@tuqulore/eleventy-plugin-preact-island](../eleventy-plugin-preact-island/README.md) for more details.

## Requirements

- Node.js 20 or higher
- Eleventy 3.0 or higher
- Preact 10 or higher
- PostCSS 8 or higher

## License

MIT
