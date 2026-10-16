#!/usr/bin/env node
import { parseArgs } from "node:util";

import { discoverCollections } from "./discover.js";
import { DEFAULT_OUT_FILE, DEFAULT_TYPES_MODULE, generateTypes } from "./generate.js";
import { createCollection, hasZodDependency } from "./scaffold.js";

const USAGE = `
Usage:
  eleventy-collections sync [options]
  eleventy-collections create <name> [--type data] [options]

Commands:
  sync           Write the types of every <input>/<name>/_schema.ts
  create <name>  Create <input>/<name>/_schema.ts and a sample entry

Options:
  --input <dir>     Eleventy input directory (default: src)
  --out <file>      Generated types path (default: ${DEFAULT_OUT_FILE})
  --module <name>   Module to augment (default: ${DEFAULT_TYPES_MODULE})
  --type <type>     Collection type for create: content or data (default: content)
  -h, --help        Show this help message
`;

async function main() {
  const { values, positionals } = parseArgs({
    options: {
      input: { type: "string", default: "src" },
      out: { type: "string", default: DEFAULT_OUT_FILE },
      module: { type: "string", default: DEFAULT_TYPES_MODULE },
      type: { type: "string", default: "content" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });
  const [command, name] = positionals;

  if (values.help || command === undefined) {
    console.log(USAGE);
    return;
  }

  if (command === "sync") {
    const collections = discoverCollections(values.input);
    const written = await generateTypes(collections, {
      outFile: values.out,
      typesModule: values.module,
    });
    console.log(
      written
        ? `Wrote ${values.out} (${collections.length} collection(s))`
        : `${values.out} is up to date (${collections.length} collection(s))`,
    );
    return;
  }

  if (command === "create") {
    if (name === undefined) throw new Error("create needs a collection name");
    const files = await createCollection({
      name,
      type: /** @type {"content" | "data"} */ (values.type),
      inputDir: values.input,
    });
    for (const file of files) console.log(`Created ${file}`);
    if (!(await hasZodDependency(process.cwd()))) {
      console.log("\nThe schema imports zod. Add it to the project: pnpm add zod");
    }
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
