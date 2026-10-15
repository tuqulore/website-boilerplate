import assert from "node:assert";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { describe, it, before, after } from "node:test";

import { discoverCollections } from "./discover.js";
import { generateTypes } from "./generate.js";

// Same compiler options as the create-eleventy default template, except that
// declaration files are checked too so errors in the generated file surface.
const TSCONFIG = {
  compilerOptions: {
    noEmit: true,
    allowImportingTsExtensions: true,
    target: "ES2022",
    module: "ESNext",
    moduleResolution: "Bundler",
    verbatimModuleSyntax: true,
    types: [],
    strict: true,
    skipLibCheck: false,
    noUncheckedIndexedAccess: true,
  },
  include: ["generated", "src/**/*"],
};

const USAGE = `import { eleventy } from "@tuqulore-inc/eleventy-plugin-preact/eleventy";

const posts = eleventy.collections.posts;
export const titles: string[] = posts.map((post) => post.data.title);
export const draft: boolean | undefined = posts[0]?.data.draft;
export const date: Date | undefined = posts[0]?.data.date;
export const url: string | undefined = posts[0]?.url;
// @ts-expect-error -- title is a string
export const wrong: number | undefined = posts[0]?.data.title;
// @ts-expect-error -- front matter lives under .data
export const flat = posts[0]?.title;

const author = eleventy.collections.authors[0];
export const id: string | undefined = author?.id;
export const name: string | undefined = author?.data.name;
// @ts-expect-error -- not in the schema
export const missing = author?.data.nonexistent;
// @ts-expect-error -- data entries are not Eleventy templates
export const authorUrl = author?.url;

export const all = eleventy.collections.all.length;
// @ts-expect-error -- collections without a schema are not declared
export const undeclared = eleventy.collections.tags;
`;

describe("generateTypes", () => {
  // zod / plugin-preact を解決できるよう一時ファイルはこのパッケージ配下に作る
  let root;
  let cwd;

  before(async () => {
    root = await fs.mkdtemp(path.join(import.meta.dirname, ".tmp-generate-test-"));
    cwd = process.cwd();
  });

  after(async () => {
    process.chdir(cwd);
    await fs.rm(root, { recursive: true, force: true });
  });

  it("生成した型で collection の要素に型が付き、誤りが検出される", async () => {
    const dir = path.join(root, "typed");
    const files = {
      "tsconfig.json": JSON.stringify(TSCONFIG),
      "src/posts/_schema.ts": `import { z } from "zod";
export const schema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  draft: z.boolean().default(false),
});
`,
      "src/authors/_schema.ts": `import { z } from "zod";
export const type = "data";
export const schema = z.object({ name: z.string() });
`,
      "src/usage.ts": USAGE,
    };
    await Promise.all(
      Object.entries(files).map(async ([file, content]) => {
        await fs.mkdir(path.join(dir, path.dirname(file)), { recursive: true });
        await fs.writeFile(path.join(dir, file), content);
      }),
    );

    process.chdir(dir);
    await generateTypes(discoverCollections("src"), {
      typesModule: "@tuqulore-inc/eleventy-plugin-preact/eleventy",
    });
    process.chdir(cwd);

    const tsc = path.join(import.meta.dirname, "node_modules/.bin/tsc");
    const result = spawnSync(tsc, ["-p", dir], { encoding: "utf8", timeout: 60_000 });
    assert.strictEqual(result.status, 0, result.stdout + result.stderr);
  });

  it("スキーマが無くなったら既存の型ファイルを空のモジュールで上書きする", async () => {
    const outFile = path.join(root, "empty/generated/collections.d.ts");
    assert.strictEqual(await generateTypes([], { outFile }), false);
    await assert.rejects(fs.access(outFile), { code: "ENOENT" });

    await fs.mkdir(path.dirname(outFile), { recursive: true });
    await fs.writeFile(outFile, "stale");
    assert.strictEqual(await generateTypes([], { outFile }), true);
    assert.doesNotMatch(await fs.readFile(outFile, "utf8"), /import/);
    assert.strictEqual(await generateTypes([], { outFile }), false);
  });
});
