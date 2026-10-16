import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import fg from "fast-glob";

import { SCHEMA_FILE, discoverCollections } from "./discover.js";
import { formatValidationError } from "./format-error.js";
import { generateTypes } from "./generate.js";

/**
 * @typedef {Object} StandardSchema
 * @property {{ validate: (value: unknown) => StandardResult | Promise<StandardResult> }} ~standard
 */

/**
 * @typedef {{ value: unknown, issues?: undefined } | { issues: ReadonlyArray<import("./format-error.js").ValidationIssue> }} StandardResult
 */

// Bumped on every registration and watch rebuild to version schema imports.
// NOTE: Module scope, so a plugin registered again in the same process (a
// config reload, another Eleventy instance) never reuses an import URL.
let generation = 0;

/**
 * @param {import("./discover.js").CollectionSource} source
 * @returns {Promise<{ type: "content" | "data", schema: StandardSchema }>}
 */
async function loadSchemaModule(source) {
  // NOTE: The query re-imports the schema on every watch rebuild; Node's ESM
  // cache would otherwise keep serving the first version. Modules the schema
  // imports are refreshed by Eleventy's own ESM resolver, which cache-busts
  // changed files, but skips imports made from node_modules like this one.
  const mod = await import(`${pathToFileURL(source.schemaPath).href}?v=${generation}`);
  const label = `${source.dir}/${SCHEMA_FILE}`;
  const type = mod.type ?? "content";
  if (type !== "content" && type !== "data") {
    throw new Error(`${label}: "type" must be "content" or "data", got ${JSON.stringify(type)}`);
  }
  if (typeof mod.schema?.["~standard"]?.validate !== "function") {
    throw new Error(`${label}: must export a Standard Schema (e.g. a Zod schema) as "schema"`);
  }
  return { type, schema: mod.schema };
}

/**
 * Entries are the Markdown/MDX templates under the collection directory, in
 * Eleventy's default order.
 *
 * @param {import("./discover.js").CollectionSource} source
 * @param {StandardSchema} schema
 * @param {any} collectionApi
 */
async function buildContentCollection(source, schema, collectionApi) {
  const dirPattern = fg.convertPathToPattern(source.dir);
  const items = collectionApi.getFilteredByGlob(`${dirPattern}/**/*.{md,mdx}`);
  const results = await Promise.all(items.map((item) => schema["~standard"].validate(item.data)));
  const failures = [];
  for (const [i, item] of items.entries()) {
    const result = results[i];
    if (result.issues) {
      failures.push({ inputPath: item.inputPath, issues: result.issues });
      continue;
    }
    // NOTE: Write back in place instead of copying the item. Copying reads its
    // `templateContent` getter, which throws before rendering. `item.data` is
    // also the object the page renders with, so `.default()` values reach it.
    Object.assign(item.data, result.value);
  }
  return { entries: items, failures };
}

/**
 * Entries are the JSON files directly under the collection directory, one
 * entry per file. Files Eleventy reads as data (`<dir>/<name>.json`,
 * `*.11tydata.json`) and `_`-prefixed files are excluded.
 *
 * @param {import("./discover.js").CollectionSource} source
 * @param {StandardSchema} schema
 */
async function buildDataCollection(source, schema) {
  const dirPattern = fg.convertPathToPattern(source.dir);
  const files = (
    await fg(`${dirPattern}/*.json`, {
      ignore: [
        `${dirPattern}/_*`,
        `${dirPattern}/*.11tydata.json`,
        `${dirPattern}/${fg.escapePath(source.name)}.json`,
      ],
    })
  ).toSorted();
  const values = await Promise.all(
    files.map(async (file) => {
      try {
        return JSON.parse(await fs.readFile(file, "utf8"));
      } catch (error) {
        throw new Error(`Collection "${source.name}": failed to read ${file}`, { cause: error });
      }
    }),
  );
  const results = await Promise.all(values.map((value) => schema["~standard"].validate(value)));
  const entries = [];
  const failures = [];
  for (const [i, file] of files.entries()) {
    const result = results[i];
    const inputPath = `./${file}`;
    if (result.issues) {
      failures.push({ inputPath, issues: result.issues });
      continue;
    }
    entries.push({ id: path.basename(file, ".json"), inputPath, data: result.value });
  }
  return { entries, failures };
}

/**
 * Eleventy plugin that registers a collection for every
 * `<input>/<name>/_schema.ts`, validates its entries against the exported
 * schema, and writes the matching `EleventyCollections` types before each
 * build.
 *
 * Collections are discovered once, when the configuration loads; adding a new
 * collection directory needs a restart.
 *
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 * @param {Object} [pluginOptions]
 * @param {string | false} [pluginOptions.outFile] - Generated types path, relative to the project root; `false` skips type generation
 * @param {string} [pluginOptions.typesModule] - Module whose `EleventyCollections` is augmented
 */
export default function collectionsPlugin(eleventyConfig, { outFile, typesModule } = {}) {
  const collections = discoverCollections(eleventyConfig.directories.input);
  generation += 1;
  eleventyConfig.on("eleventy.beforeWatch", () => {
    generation += 1;
  });

  // Schemas may import shared modules from anywhere under the input directory.
  if (collections.length > 0) {
    eleventyConfig.addWatchTarget(
      `${fg.convertPathToPattern(eleventyConfig.directories.input)}**/*.ts`,
    );
  }
  for (const source of collections) {
    eleventyConfig.addWatchTarget(`${source.dir}/*.json`);
    eleventyConfig.addCollection(source.name, async (collectionApi) => {
      const { type, schema } = await loadSchemaModule(source);
      const { entries, failures } =
        type === "data"
          ? await buildDataCollection(source, schema)
          : await buildContentCollection(source, schema, collectionApi);
      if (failures.length > 0) {
        throw new Error(formatValidationError(source.name, failures), { cause: failures });
      }
      return entries;
    });
  }

  if (outFile === false) return;
  eleventyConfig.on("eleventy.before", async () => {
    await generateTypes(collections, { outFile, typesModule });
  });
}
