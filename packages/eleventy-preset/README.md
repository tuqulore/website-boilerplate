# @tuqulore-inc/eleventy-preset

An Eleventy preset for building static sites with Preact JSX/MDX templates, partial hydration, and PostCSS.

## Installation

```bash
npm install -D @11ty/eleventy @tuqulore-inc/eleventy-preset preact postcss
```

## Usage

```javascript
// eleventy.config.js
import preset from "@tuqulore-inc/eleventy-preset";

export default preset();
```

### With Custom Configuration

```javascript
// eleventy.config.js
import preset from "@tuqulore-inc/eleventy-preset";

export default preset((eleventyConfig) => {
  // Add your custom configuration
  eleventyConfig.addFilter("myFilter", (value) => value);
});
```

## What's Included

### Plugins

- **@tuqulore-inc/eleventy-plugin-preact** - JSX/MDX server-side rendering
- **@tuqulore-inc/eleventy-plugin-preact-island** - Partial hydration with is-land
- **@tuqulore-inc/eleventy-plugin-postcss** - CSS processing with PostCSS

### Default Behavior

| Feature              | Description                                       |
| -------------------- | ------------------------------------------------- |
| Input directory      | `src`                                             |
| Output directory     | `dist`                                            |
| Client entries       | `src/**/*.client.{js,jsx,ts,tsx}`                 |
| PostCSS content glob | `src/**/*.{md,mdx,jsx}`                           |
| Server watches       | `dist/**/*.css`                                   |
| Markdown             | `breaks: true`, `linkify: true`                   |
| Static assets        | `src/public/**` copied to root                    |
| Image optimization   | Images in `src/**` optimized and copied to `dist` |

**Note:** The input/output directories (`src`/`dist`) are fixed and cannot be customized via `setInputDirectory` or `setOutputDirectory`. Image optimization and other features depend on this directory structure.

### Image Optimization

On `eleventy.before` event, all images in `src/**/*.{jpeg,jpg,png,webp,gif,tiff,avif,svg}` (excluding `src/public`) are processed with `@11ty/eleventy-img` and output to the corresponding location in `dist`.

## Template Formats

This preset supports JSX and MDX as template languages via `@tuqulore-inc/eleventy-plugin-preact`.

| Extension | Description               |
| --------- | ------------------------- |
| `.jsx`    | Preact JSX components     |
| `.mdx`    | Markdown with JSX support |

### Basic MDX Example

```mdx
import { Island } from "@tuqulore-inc/eleventy-preset/island";
import Clicker from "./clicker.client.jsx";

export const data = {
  layout: "post",
  title: "Hello World",
};

# Hello World

Content goes here.

<Island component={Clicker} on="interaction" />
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
import { eleventy } from "@tuqulore-inc/eleventy-preset/eleventy";
import Header from "./partials/header.mdx";
import Footer from "./partials/footer.mdx";

<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="/main.css" />
    <title>
      {eleventy.title && `${eleventy.title} | `}
      {eleventy.site.name}
    </title>
  </head>
  <body>
    <Header />
    <div dangerouslySetInnerHTML={{ __html: eleventy.content }}></div>
    <Footer />
  </body>
</html>
```

### Intermediate Layout (`_includes/post.mdx`)

Intermediate layouts wrap content and chain to the root layout:

```mdx
import { eleventy } from "@tuqulore-inc/eleventy-preset/eleventy";

export const data = {
  layout: "base",
};

<article class="prose" dangerouslySetInnerHTML={{ __html: eleventy.content }} />
```

### Best Practices

- Root layout (`base.mdx`) defines the complete HTML shell
- Intermediate layouts (`post.mdx`, etc.) define content wrappers
- Use `dangerouslySetInnerHTML={{ __html: eleventy.content }}` to inject child content

## Data Access in Layouts

This preset provides the `eleventy` singleton for accessing Eleventy data without prop drilling.

### Usage

```jsx
import { eleventy } from "@tuqulore-inc/eleventy-preset/eleventy";

// In layout
<title>{eleventy.title} | {eleventy.site.name}</title>

// In partials (no need to pass props)
<footer>&copy; {eleventy.site.author}</footer>
```

### Important Notes

- The `eleventy` singleton is only available during SSR (server-side rendering)
- For hydrated components, use `<Island>` which automatically forwards the passed props to both the SSR render and the client hydration; the raw `eleventy` singleton is not available on the client

### Available Data

| Property                                       | Description                               |
| ---------------------------------------------- | ----------------------------------------- |
| `eleventy.content`                             | Rendered HTML from child template         |
| `eleventy.title`, `eleventy.description`, etc. | Values from `data` export or front matter |
| `eleventy.site`, `eleventy.nav`, etc.          | Global data from `_data/` directory       |
| `eleventy.page`                                | Eleventy page data (url, date, etc.)      |

### Global Data Example

Data files in `src/_data/` are available via the `eleventy` singleton:

```javascript
// src/_data/site.js
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
import { eleventy } from "@tuqulore-inc/eleventy-preset/eleventy";

<title>{eleventy.site.name}</title>
<nav>
  {eleventy.nav.map((item) => (
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

Import and use partials in layouts or other MDX files. Partials can access Eleventy data directly via the `eleventy` singleton:

```mdx
import { eleventy } from "@tuqulore-inc/eleventy-preset/eleventy";
import Header from "./partials/header.mdx";
import Footer from "./partials/footer.mdx";

<Header />
<main dangerouslySetInnerHTML={{ __html: eleventy.content }}></main>
<Footer />
```

## Partial Hydration

This preset supports partial hydration using `@tuqulore-inc/eleventy-plugin-preact-island`. Author client components under `src/**/*.client.{js,jsx,ts,tsx}`, mark the default export with `clientComponent()`, and render them from any JSX/MDX template through the `<Island>` wrapper. No configuration is needed — the plugin picks them up by convention.

### Creating a Client Component

Name your component with the `.client.jsx` suffix and mark the default export with `clientComponent`:

```jsx
// src/clicker.client.jsx
import { clientComponent } from "@tuqulore-inc/eleventy-preset/island";
import { useState } from "preact/hooks";

function Clicker() {
  const [counter, setCounter] = useState(0);

  return (
    <div>
      <button onClick={() => setCounter(counter + 1)}>Count</button>
      <p>{counter}</p>
    </div>
  );
}

export default clientComponent(Clicker, import.meta.url);
```

`clientComponent(Component, import.meta.url)` attaches the SSR-side module URL as metadata; the preset's URL resolver converts it to the browser URL (`src/foo.client.jsx` → `/foo.client.js`).

### Using in MDX

Import the component and wrap with `<Island>`. Extra props are forwarded to both the SSR render and the client hydration:

```mdx
import { Island } from "@tuqulore-inc/eleventy-preset/island";
import Clicker from "./clicker.client.jsx";

<Island component={Clicker} on="interaction" />
```

```mdx
import { Island } from "@tuqulore-inc/eleventy-preset/island";
import Navigation from "./partials/header/navigation.client.jsx";

<Island
  component={Navigation}
  on="interaction"
  class="hidden md:block"
  nav={props.nav}
/>
```

### Hydration Triggers

The `on` prop maps to the `land-on:<value>` attribute on the underlying `<is-land>`:

| `on` value    | Description                                      |
| ------------- | ------------------------------------------------ |
| `interaction` | Hydrate on user interaction (click, focus, etc.) |
| `visible`     | Hydrate when element becomes visible             |
| `idle`        | Hydrate when browser is idle                     |

For parameterized triggers such as `on:media("(min-width: ...)")`, drop down to the raw `<is-land>` element (still supported); the injected setup script keeps working.

See [@tuqulore-inc/eleventy-plugin-preact-island](../eleventy-plugin-preact-island/README.md) for the underlying plugin, including the `bundle: false` option for bringing your own bundler.

## Requirements

- Node.js 20 or higher
- Eleventy 3.0 or higher
- Preact 10 or higher
- PostCSS 8 or higher

## License

MIT
