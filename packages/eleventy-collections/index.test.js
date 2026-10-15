import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { describe, it, before, after } from "node:test";

import { Eleventy } from "@11ty/eleventy";
import preact from "@tuqulore-inc/eleventy-plugin-preact";

import collections from "./index.js";

const POSTS_SCHEMA = `import { z } from "zod";
export const schema = z.object({
  title: z.string(),
  draft: z.boolean().default(false),
});
`;

const AUTHORS_SCHEMA = `import { z } from "zod";
export const type = "data";
export const schema = z.object({
  name: z.string(),
  url: z.url().optional(),
});
`;

// Renders every entry of every collection, to observe what templates receive.
const LIST_TEMPLATE = `export default function (data) {
  const posts = (data.collections.posts ?? []).map((p) => \`\${p.url}|\${p.data.title}|\${p.data.draft}\`);
  const authors = (data.collections.authors ?? []).map((a) => \`\${a.id}|\${a.inputPath}|\${a.data.name}\`);
  return JSON.stringify({ posts, authors });
}
`;

/**
 * @param {string} root
 * @param {Record<string, string>} files
 */
async function writeFiles(root, files) {
  await Promise.all(
    Object.entries(files).map(async ([file, content]) => {
      const target = path.join(root, file);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, content);
    }),
  );
}

/**
 * @param {string} root
 * @param {import("./index.js").default extends (c: any, o: infer O) => any ? O : never} [options]
 */
async function build(root, options = {}) {
  const elev = new Eleventy(path.join(root, "src"), path.join(root, "dist"), {
    quietMode: true,
    config(eleventyConfig) {
      eleventyConfig.addPlugin(preact);
      eleventyConfig.addPlugin(collections, {
        outFile: path.join(root, "generated/collections.d.ts"),
        ...options,
      });
    },
  });
  const pages = await elev.toJSON();
  const list = pages.find((page) => page.url === "/list/");
  return { pages, list: list && JSON.parse(list.content) };
}

describe("eleventy-collections plugin", () => {
  // zod / preact を解決できるよう一時ファイルはこのパッケージ配下に作る
  let root;

  before(async () => {
    root = await fs.mkdtemp(path.join(import.meta.dirname, ".tmp-collections-test-"));
  });

  after(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  /** @param {string} name */
  const fixture = async (name, files) => {
    const dir = path.join(root, name);
    await writeFiles(dir, files);
    return dir;
  };

  describe("content 型", () => {
    it("Markdown と MDX の front matter を検証し、default の値を描画に反映する", async () => {
      const dir = await fixture("content", {
        "src/posts/_schema.ts": POSTS_SCHEMA,
        "src/posts/a.md": "---\ntitle: A\n---\n\ndraft={{ draft }}\n",
        "src/posts/b.mdx": "---\ntitle: B\ndraft: true\n---\n\nB\n",
        "src/posts/index.tsx": "export default () => <p>list</p>;\n",
        "src/list.11ty.js": LIST_TEMPLATE,
      });
      const { pages, list } = await build(dir);

      assert.deepStrictEqual(list.posts.toSorted(), ["/posts/a/|A|false", "/posts/b/|B|true"]);
      const a = pages.find((page) => page.url === "/posts/a/");
      assert.match(a.content, /draft=false/);
    });

    it("不正な front matter はファイルパスとフィールドを添えてビルドを止める", async () => {
      const dir = await fixture("invalid", {
        "src/posts/_schema.ts": POSTS_SCHEMA,
        "src/posts/ok.md": "---\ntitle: OK\n---\n",
        "src/posts/no-title.md": "---\ndraft: yes\n---\n",
      });
      await assert.rejects(build(dir), (error) => {
        const messages = [];
        for (let e = error; e; e = e.cause) messages.push(e.message);
        const message = messages.join("\n");
        assert.match(message, /Collection "posts": validation failed/);
        assert.match(message, /\.tmp-collections-test-\w+\/invalid\/src\/posts\/no-title\.md/);
        assert.match(message, /- title: /);
        assert.match(message, /- draft: /);
        assert.doesNotMatch(message, /ok\.md/);
        return true;
      });
    });
  });

  describe("data 型", () => {
    it("JSON ファイルごとに 1 エントリとして検証する", async () => {
      const dir = await fixture("data", {
        "src/authors/_schema.ts": AUTHORS_SCHEMA,
        "src/authors/bob.json": JSON.stringify({ name: "Bob" }),
        "src/authors/alice.json": JSON.stringify({ name: "Alice", url: "https://example.com" }),
        "src/authors/_draft.json": JSON.stringify({}),
        // Directory Data として Eleventy が読むファイルは対象外
        "src/authors/authors.json": JSON.stringify({ layout: null }),
        "src/list.11ty.js": LIST_TEMPLATE,
      });
      const { list } = await build(dir);

      const prefix = path.relative(process.cwd(), dir).split(path.sep).join("/");
      assert.deepStrictEqual(list.authors, [
        `alice|./${prefix}/src/authors/alice.json|Alice`,
        `bob|./${prefix}/src/authors/bob.json|Bob`,
      ]);
    });

    it("不正な JSON エントリでビルドを止める", async () => {
      const dir = await fixture("data-invalid", {
        "src/authors/_schema.ts": AUTHORS_SCHEMA,
        "src/authors/carol.json": JSON.stringify({ name: "Carol", url: "not a url" }),
      });
      await assert.rejects(build(dir), (error) => {
        const messages = [];
        for (let e = error; e; e = e.cause) messages.push(e.message);
        assert.match(messages.join("\n"), /authors\/carol\.json\n {2}- url: /);
        return true;
      });
    });
  });

  describe("型生成", () => {
    it("ビルド前に collection ごとの型を書き出す", async () => {
      const dir = await fixture("types", {
        "src/posts/_schema.ts": POSTS_SCHEMA,
        "src/posts/a.md": "---\ntitle: A\n---\n",
        "src/authors/_schema.ts": AUTHORS_SCHEMA,
      });
      await build(dir);

      const generated = await fs.readFile(path.join(dir, "generated/collections.d.ts"), "utf8");
      assert.match(generated, /declare module "@tuqulore-inc\/eleventy-preset\/eleventy"/);
      assert.match(
        generated,
        /"authors": CollectionOf<typeof import\("\.\.\/src\/authors\/_schema\.ts"\)>;/,
      );
      assert.match(
        generated,
        /"posts": CollectionOf<typeof import\("\.\.\/src\/posts\/_schema\.ts"\)>;/,
      );
    });

    it("スキーマが無ければ collection も型ファイルも作らない", async () => {
      const dir = await fixture("none", {
        "src/index.md": "---\ntitle: Top\n---\n",
        "src/list.11ty.js": LIST_TEMPLATE,
      });
      const { list } = await build(dir);

      assert.deepStrictEqual(list, { posts: [], authors: [] });
      await assert.rejects(fs.access(path.join(dir, "generated")), { code: "ENOENT" });
    });
  });
});
