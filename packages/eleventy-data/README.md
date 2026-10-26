# @tuqulore-inc/eleventy-data

The `eleventy` data singleton and its types, shared by template renderers and templates. It does not depend on any UI framework.

## Documentation

The design rationale (why a singleton, why a separate package) lives at [Plugins / eleventy-data](https://website.tuqulore.workers.dev/en/plugins/eleventy-data/). The usage conventions live at [Preset Conventions / Data Access](https://website.tuqulore.workers.dev/en/preset/data-access/).

## Installation

Installed automatically as a peer dependency of [@tuqulore-inc/eleventy-plugin-preact](../eleventy-plugin-preact) (npm 7+, pnpm). With [@tuqulore-inc/eleventy-preset](../eleventy-preset), import from `@tuqulore-inc/eleventy-preset/eleventy` instead.

```bash
npm install -D @tuqulore-inc/eleventy-data
```

## API

### `import { eleventy } from "@tuqulore-inc/eleventy-data"`

The SSR-side singleton. Exposes `content`, `title`, `description`, `site`, `nav`, `page`, `collections`, and any other data provided by Eleventy. Reading any field outside SSR (e.g. at module top level) throws.

`eleventy` is typed by `EleventyData`, the union of the built-in fields (`EleventyBuiltinData`) and the project's own data (`EleventyUserData`, empty by default). `eleventy.collections` is typed by `EleventyCollections`, whose entries are `EleventyCollectionItem<T>` (front matter under `.data`). Extend both via declaration merging on the module you import `eleventy` from:

```ts
declare module "@tuqulore-inc/eleventy-data" {
  interface EleventyUserData {
    site: { name: string; url: string };
  }
}
```

### `import { runWithEleventyData } from "@tuqulore-inc/eleventy-data"`

For template renderers. Runs a callback with the given data available to `eleventy` in the current async context; concurrent renders stay isolated.

```javascript
import { runWithEleventyData } from "@tuqulore-inc/eleventy-data";

const html = await runWithEleventyData(data, () => renderTemplate(data));
```

## Requirements

- Node.js 20 or higher

## License

MIT
