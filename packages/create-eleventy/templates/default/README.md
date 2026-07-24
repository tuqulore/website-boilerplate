# My Eleventy Site

## Requirements

- [Active LTS](https://github.com/nodejs/release#release-schedule)
- Docker

## Quick start

> [!NOTE]
>
> Install [pnpm](https://pnpm.io/installation) first.

```shell
pnpm install # install dependencies
pnpm dev # start the dev server
```

## npm scripts

| Task   | Description               |
| :----- | :------------------------ |
| build  | Generate the static site. |
| clean  | Remove build artifacts.   |
| dev    | Start the dev server.     |
| format | Format code.              |
| lint   | Run static checks.        |

## Environment variables

| Name     | Description                                               |
| :------- | :-------------------------------------------------------- |
| SITE_URL | The URL of the site built from this repository. Required. |

### Cascade (`pnpm dev`)

1. .env
2. .env.development
3. .env.local
4. .env.development.local

They are read in that order; later values win. Put values that should not be committed into `.env.local` or `.env.development.local`.

### Cascade (`pnpm build`)

1. .env
2. .env.production
3. .env.local
4. .env.production.local

They are read in that order; later values win. Put values that should not be committed into `.env.local` or `.env.production.local`.

## Libraries used

### [Eleventy](https://www.11ty.dev/)

A static site generator.

### [Preact](https://preactjs.com/)

Renders JSX templates into HTML with dynamic behavior.

### [Tailwind CSS](https://tailwindcss.com/)

A utility-first CSS framework for the look and feel.

### [Jumpu UI](https://github.com/tuqulore/jumpu-ui)

A utility-friendly design system for a consistent look and feel.

### [Iconify SVG Framework](https://docs.iconify.design/icon-components/svg-framework/)

Provides SVG icons.

## Directory layout

```
.
├── dist
└── src
    ├── _data
    ├── _includes
    │   └── partials
    └── public
```

### dist

The build output directory.

### src

Eleventy's template input root.

### src/\_data

Where [global data](https://www.11ty.dev/docs/data-global/) lives.

### src/\_includes

Where [layout templates](https://www.11ty.dev/docs/layouts/) for [layout chaining](https://www.11ty.dev/docs/layout-chaining/) live.

Specifically, the values referenced from a [frontmatter](https://www.11ty.dev/docs/data-frontmatter/) or an exported `data` object's `layout` property.

### src/\_includes/partials

Where JSX and MDX partials called from templates live.

### src/public

Where static assets live. Copied to the root of `dist/`.

## Partial Hydration

Drop a file with the `.client.{js,jsx,ts,tsx}` sub-extension anywhere under `src/`, and Partial Hydration turns on with no extra configuration. That file is bundled with esbuild and emitted to `dist/**/*.client.js`, then loaded through the `<Island>` component as the client-side script of `<is-land>`.

Pass a component marked with `clientComponent()` to `<Island>`, and the same props flow into both the SSR-side render and the client-side hydration.

```jsx
// src/counter.client.jsx
import { clientComponent } from "@tuqulore-inc/eleventy-preset/island";
import { useSignal } from "@preact/signals";

function Counter(props) {
  const n = useSignal(props.initial ?? 0);
  return <button onClick={() => n.value++}>{n}</button>;
}

export default clientComponent(Counter, import.meta.url);
```

```mdx
// src/index.mdx
import { Island } from "@tuqulore-inc/eleventy-preset/island";
import Counter from "./counter.client.jsx";

<Island component={Counter} on="visible" initial={5} />
```

For the example above, `<Island>` emits an `<is-land>` element like this from SSR:

```html
<is-land
  land-on:visible
  type="preact"
  import="/counter.client.js"
  props='{"initial":5}'
>
  <button>5</button>
</is-land>
```

The `on` prop maps to the `<is-land>` initialization trigger (`interaction` / `visible` / `idle`).

> [!NOTE]
>
> The [`<is-land>`](https://github.com/11ty/is-land?tab=readme-ov-file#usage) initialization attribute normally uses the `on:*` form, but that conflicts with JSX syntax, so this preset uses `land-on:*` instead. For parameterized triggers such as `on:media("(min-width: ...)")`, drop `<Island>` and use the raw `<is-land>` element.

## Docker

To build and run a Docker image that serves the static site:

```
docker build -t my-eleventy-site .
docker run --rm -p 8080:8080 my-eleventy-site
```
