import fs from "node:fs/promises";
import path from "node:path";

import { SCHEMA_FILE } from "./discover.js";

const NAME_RE = /^[A-Za-z0-9][\w-]*$/;

const TEMPLATES = {
  content: {
    schema: `import { z } from "zod";

export const schema = z.object({
  title: z.string(),
  date: z.coerce.date(),
});
`,
    sampleFile: (base) => `${base}.md`,
    sample: `---
title: Example
date: 2026-01-01
---

Write the content here.
`,
  },
  data: {
    schema: `import { z } from "zod";

export const type = "data";

export const schema = z.object({
  name: z.string(),
});
`,
    sampleFile: (base) => `${base}.json`,
    sample: `${JSON.stringify({ name: "Example" }, null, 2)}\n`,
  },
};

/**
 * Create `<inputDir>/<name>/_schema.ts` and one sample entry. The plugin
 * discovers the directory by itself, so no configuration is touched.
 *
 * @param {Object} options
 * @param {string} options.name
 * @param {"content" | "data"} [options.type]
 * @param {string} [options.inputDir]
 * @returns {Promise<string[]>} Created files
 */
export async function createCollection({ name, type = "content", inputDir = "src" }) {
  if (!NAME_RE.test(name)) {
    throw new Error(`Invalid collection name: ${JSON.stringify(name)}`);
  }
  const template = TEMPLATES[type];
  if (!template) {
    throw new Error(`--type must be "content" or "data", got ${JSON.stringify(type)}`);
  }

  const dir = path.join(inputDir, name);
  // NOTE: `<name>.json` is directory data to Eleventy, not an entry.
  const sampleFile = template.sampleFile(name === "example" ? "sample" : "example");
  const files = [
    [path.join(dir, SCHEMA_FILE), template.schema],
    [path.join(dir, sampleFile), template.sample],
  ];
  const existing = await Promise.all(files.map(([file]) => fs.stat(file).catch(() => undefined)));
  const conflict = files.find((_, i) => existing[i]);
  if (conflict) throw new Error(`${conflict[0]} already exists`);

  await fs.mkdir(dir, { recursive: true });
  await Promise.all(files.map(([file, content]) => fs.writeFile(file, content, { flag: "wx" })));
  return files.map(([file]) => file);
}

/**
 * Whether the project at `cwd` lists `zod` in its dependencies. Schemas import
 * it, but it is only an optional peer of this package.
 *
 * @param {string} cwd
 * @returns {Promise<boolean>}
 */
export async function hasZodDependency(cwd) {
  const pkg = await fs
    .readFile(path.join(cwd, "package.json"), "utf8")
    .then(JSON.parse)
    .catch(() => ({}));
  return Boolean(pkg.dependencies?.zod ?? pkg.devDependencies?.zod);
}
