# @tuqulore-inc/eleventy-collections

Eleventy plugin that turns every `<input>/<name>/_schema.ts` into a collection, validates its entries against the schema exported there, and types `eleventy.collections.<name>` from the same schema.

- **Validation** — the build fails when a front matter (or JSON entry) does not match the schema, with the file and field paths in the message.
- **Types** — a declaration-merging `.d.ts` is written before each build, so `eleventy.collections.posts[0].data.title` is typed.

Only collections are covered. Global Data, other front matter, and the rest of the data cascade are out of scope.

[@tuqulore-inc/eleventy-preset](../eleventy-preset) bundles this plugin. See [Plugins / eleventy-collections](https://website.tuqulore.workers.dev/en/plugins/eleventy-collections/) for the design.

Schemas can be written with any library that implements [Standard Schema](https://standardschema.dev/), such as Zod, Valibot, or ArkType. The plugin imports none of them.

## Install

```sh
pnpm add -D @tuqulore-inc/eleventy-collections zod
```

Projects using the preset already have the plugin; add this package only for the CLI. Replace `zod` with the schema library you use; `eleventy-collections create` writes Zod schemas.

## Usage

### Define a collection

```ts
// src/posts/_schema.ts
import { z } from "zod";

export const schema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  draft: z.boolean().default(false),
});
```

The directory name is the collection name. Entries of a content collection (the default) are the `.md` / `.mdx` files under the directory, and the schema checks their data, front matter included. Values from `.default()` and coercions are written back to the page data. Other templates in the directory, such as an `index.tsx` listing page, are not entries.

```ts
// src/authors/_schema.ts
import { z } from "zod";

export const type = "data";

export const schema = z.object({
  name: z.string(),
});
```

`type = "data"` makes each `.json` file directly under the directory one entry: `{ id, inputPath, data }`, where `id` is the file name without `.json`. Files starting with `_`, `*.11tydata.json`, and `<name>.json` (Eleventy reads it as directory data) are skipped.

`eleventy-collections create <name> [--type data]` writes the schema and a sample entry.

### Register the plugin

Skip this with the preset. Otherwise, register it together with [@tuqulore-inc/eleventy-plugin-preact](../eleventy-plugin-preact), whose `eleventy` singleton the generated types extend:

```js
// eleventy.config.js
import collections from "@tuqulore-inc/eleventy-collections";
import preact from "@tuqulore-inc/eleventy-plugin-preact";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(preact);
  eleventyConfig.addPlugin(collections, {
    typesModule: "@tuqulore-inc/eleventy-plugin-preact/eleventy",
  });
}
```

Without that plugin, validation still works, but Eleventy offers templates no typed data to attach the types to. Pass `outFile: false` to skip generating them.

Collections are discovered when the configuration loads. Restart the dev server after adding a collection directory; edits to a schema, and to `.ts` modules under the input directory it imports, are picked up in watch mode.

### Generated types

The plugin writes `collections.d.ts` to the project root before each build, and `eleventy-collections sync` writes it without building. Nothing is written while no `_schema.ts` exists.

```ts
import { eleventy } from "@tuqulore-inc/eleventy-preset/eleventy";

const titles = eleventy.collections.posts.map((post) => post.data.title);
```

Set up the project once:

- Make sure `tsconfig.json` includes `collections.d.ts` (`"include": ["*.d.ts", ...]` does).
- Ignore `collections.d.ts` in `.gitignore`, Oxlint, and Oxfmt.
- Run `eleventy-collections sync` before type checking, e.g. `"lint": "eleventy-collections sync && oxlint --type-aware --type-check"`.

## API

### `import collections from "@tuqulore-inc/eleventy-collections"`

The Eleventy plugin. Options:

- `outFile` — Path of the generated types, relative to the project root, or `false` to skip generating them. Default: `collections.d.ts`.
- `typesModule` — Module whose `EleventyCollections` the generated types augment; use the one you import `eleventy` from. Default: `@tuqulore-inc/eleventy-preset/eleventy`.

### `eleventy-collections sync [--input src] [--out <file>] [--module <name>]`

Writes the generated types.

### `eleventy-collections create <name> [--type content|data] [--input src]`

Creates `<input>/<name>/_schema.ts` and a sample entry.

## Requirements

- Node.js 20.19+ or 22.12+ with [@tuqulore-inc/eleventy-plugin-preact](../eleventy-plugin-preact) registered (it loads `_schema.ts`); Node.js 22.18+ without it
- Eleventy 3.0 or higher
- A schema library implementing [Standard Schema](https://standardschema.dev/) v1, installed in the project

## License

MIT
