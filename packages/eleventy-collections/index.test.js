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

/** @param {Error} error */
const messagesOf = (error) => {
  const messages = [];
  // Eleventy keeps the wrapped error in `originalError`, not `cause`.
  for (let e = error; e; e = e.cause ?? e.originalError) messages.push(e.message);
  return messages.join("\n");
};

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
        outFile: path.join(root, "collections.d.ts"),
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
        const message = messagesOf(error);
        assert.match(message, /Collection "posts": validation failed/);
        assert.match(message, /\.tmp-collections-test-\w+\/invalid\/src\/posts\/no-title\.md/);
        assert.match(message, /- title: /);
        assert.match(message, /- draft: /);
        assert.doesNotMatch(message, /ok\.md/);
        return true;
      });
    });
  });

  describe("glob の特殊文字を含むディレクトリ名", () => {
    it("丸括弧を含む collection も要素を集め、ディレクトリデータだけを除外する", async () => {
      const dir = await fixture("parens", {
        "src/posts(en)/_schema.ts": POSTS_SCHEMA,
        "src/posts(en)/a.md": "---\ntitle: A\n---\n",
        "src/authors(en)/_schema.ts": AUTHORS_SCHEMA,
        "src/authors(en)/alice.json": JSON.stringify({ name: "Alice" }),
        "src/authors(en)/authors(en).json": JSON.stringify({ layout: null }),
        // エスケープしないと `(en)` がグループとして解釈され、こちらが除外される
        "src/authors(en)/authorsen.json": JSON.stringify({ name: "E" }),
        "src/list.11ty.js": `export default function (data) {
  return JSON.stringify({
    posts: data.collections["posts(en)"].map((p) => p.data.title),
    authors: data.collections["authors(en)"].map((a) => a.id),
  });
}
`,
      });
      const { list } = await build(dir);

      assert.deepStrictEqual(list, { posts: ["A"], authors: ["alice", "authorsen"] });
    });

    it("Eleventy が collection として扱えない角括弧付きの名前はエラーにする", async () => {
      const dir = await fixture("brackets", { "src/posts[en]/_schema.ts": POSTS_SCHEMA });
      await assert.rejects(build(dir), (error) => {
        assert.match(messagesOf(error), /posts\[en\]: a collection name cannot/);
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
        assert.match(messagesOf(error), /authors\/carol\.json\n {2}- url: /);
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

      const generated = await fs.readFile(path.join(dir, "collections.d.ts"), "utf8");
      assert.match(generated, /declare module "@tuqulore-inc\/eleventy-preset\/eleventy"/);
      assert.match(
        generated,
        /"authors": CollectionOf<typeof import\("\.\/src\/authors\/_schema\.ts"\)>;/,
      );
      assert.match(
        generated,
        /"posts": CollectionOf<typeof import\("\.\/src\/posts\/_schema\.ts"\)>;/,
      );
    });

    it("スキーマが無ければ collection も型ファイルも作らない", async () => {
      const dir = await fixture("none", {
        "src/index.md": "---\ntitle: Top\n---\n",
        "src/list.11ty.js": LIST_TEMPLATE,
      });
      const { list } = await build(dir);

      assert.deepStrictEqual(list, { posts: [], authors: [] });
      await assert.rejects(fs.access(path.join(dir, "collections.d.ts")), { code: "ENOENT" });
    });

    it("outFile: false なら型ファイルを書き出さない", async () => {
      const dir = await fixture("no-types", {
        "src/posts/_schema.ts": POSTS_SCHEMA,
        "src/posts/a.md": "---\ntitle: A\n---\n",
      });
      await build(dir, { outFile: false });

      await assert.rejects(fs.access(path.join(dir, "collections.d.ts")), { code: "ENOENT" });
    });
  });
});
