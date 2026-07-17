import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import { load } from "./loaders/mdx.js";

describe("MDX loader (satteri)", () => {
  // bare specifier (preact/jsx-runtime) を解決できるよう
  // 一時ファイルはこのパッケージ配下に作る
  let dir;

  before(async () => {
    dir = await fs.mkdtemp(path.join(import.meta.dirname, ".tmp-mdx-test-"));
  });

  after(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  const writeMdx = async (name, source) => {
    const file = path.join(dir, name);
    await fs.writeFile(file, source);
    return file;
  };

  const loadMdx = async (file) =>
    load(pathToFileURL(file).href, {}, () => {
      assert.fail(`nextLoad should not be called for ${file}`);
    });

  describe("基本の変換", () => {
    it("MDX が preact/jsx-runtime を import する ESM に変換される", async () => {
      const file = await writeMdx("simple.mdx", "# Hello\n\nText.\n");
      const result = await loadMdx(file);

      assert.strictEqual(result.format, "module");
      assert.strictEqual(result.shortCircuit, true);
      const source = String(result.source);
      assert.match(source, /["']preact\/jsx(-dev)?-runtime["']/);
      assert.match(source, /export\s+default\s+MDXContent/);
    });
  });

  describe("GFM", () => {
    it("テーブル / タスクリスト / 打ち消し線が動く", async () => {
      const file = await writeMdx(
        "gfm.mdx",
        [
          "| a | b |",
          "| - | - |",
          "| 1 | 2 |",
          "",
          "- [x] done",
          "- [ ] todo",
          "",
          "~~strike~~",
          "",
        ].join("\n"),
      );
      const result = await loadMdx(file);
      const source = String(result.source);

      // それぞれの GFM 要素が JSX の対象コンポーネントとして出現する
      assert.match(source, /"table"/);
      assert.match(source, /"th"/);
      assert.match(source, /"td"/);
      assert.match(source, /"input"/);
      assert.match(source, /"del"/);
    });
  });

  describe("見出しアンカー", () => {
    it("h1 - h6 に heading-slug の id が付く", async () => {
      const file = await writeMdx(
        "slug.mdx",
        "# Hello World\n\n## Sub Heading\n\n### Deep\n",
      );
      const result = await loadMdx(file);
      const source = String(result.source);

      assert.match(source, /id:\s*"hello-world"/);
      assert.match(source, /id:\s*"sub-heading"/);
      assert.match(source, /id:\s*"deep"/);
    });

    it("同一見出しは連番の id で識別される", async () => {
      const file = await writeMdx("dup.mdx", "# Sub\n\n## Sub\n\n## Sub\n");
      const result = await loadMdx(file);
      const source = String(result.source);

      assert.match(source, /id:\s*"sub"/);
      assert.match(source, /id:\s*"sub-1"/);
      assert.match(source, /id:\s*"sub-2"/);
    });

    it("複数ファイルを別々に処理しても slug の連番は独立する", async () => {
      const a = await writeMdx("independent-a.mdx", "# Sub\n");
      const b = await writeMdx("independent-b.mdx", "# Sub\n");

      const [srcA, srcB] = await Promise.all([
        loadMdx(a).then((r) => String(r.source)),
        loadMdx(b).then((r) => String(r.source)),
      ]);

      const idsA = [...srcA.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);
      const idsB = [...srcB.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);

      assert.deepStrictEqual(idsA, ["sub"]);
      assert.deepStrictEqual(idsB, ["sub"]);
    });
  });

  describe("YAML front matter", () => {
    it("front matter が export const data として prepend される", async () => {
      const file = await writeMdx(
        "with-fm.mdx",
        [
          "---",
          "title: Hello",
          "tags:",
          "  - a11y",
          "  - web",
          "---",
          "",
          "# Body",
          "",
        ].join("\n"),
      );
      const result = await loadMdx(file);
      const source = String(result.source);

      // prototype pollution 回避のため object literal ではなく JSON.parse 経路
      assert.match(source, /^export const data = JSON\.parse\("\{/);
      // 文字列リテラルの中に frontmatter の値が JSON エスケープ形式で入る
      assert.match(source, /\\"title\\":\\"Hello\\"/);
      assert.match(source, /\\"tags\\":\[\\"a11y\\",\\"web\\"\]/);
    });

    it("front matter が無い場合は export const data を追加しない", async () => {
      const file = await writeMdx("no-fm.mdx", "# Body\n");
      const result = await loadMdx(file);
      const source = String(result.source);

      assert.doesNotMatch(source, /^export\s+const\s+data\s*=/m);
    });

    it("MDX 本文の export const data と YAML front matter の併用は throw", async () => {
      const file = await writeMdx(
        "collision.mdx",
        [
          "---",
          "title: Hello",
          "---",
          "",
          "export const data = { title: 'From body' };",
          "",
          "# Body",
          "",
        ].join("\n"),
      );

      await assert.rejects(loadMdx(file), /export const data/);
    });

    it("コードフェンス内の export const data は誤検知しない", async () => {
      const file = await writeMdx(
        "fenced.mdx",
        [
          "---",
          "title: Hello",
          "---",
          "",
          "# Example",
          "",
          "```js",
          "export const data = { title: 'shown as code' };",
          "```",
          "",
        ].join("\n"),
      );

      const result = await loadMdx(file);
      // front matter の値だけが export され、コードフェンス内の値は
      // 実行文にならないので prepend の対象にもならない。
      assert.match(
        String(result.source),
        /^export const data = JSON\.parse\("\{\\"title\\":\\"Hello\\"\}"\);/,
      );
    });

    it("インラインコードスパン内の export const data も誤検知しない", async () => {
      const file = await writeMdx(
        "inline.mdx",
        [
          "---",
          "title: Hello",
          "---",
          "",
          "Use `export const data` to declare page data.",
          "",
        ].join("\n"),
      );

      const result = await loadMdx(file);
      assert.match(
        String(result.source),
        /^export const data = JSON\.parse\("\{\\"title\\":\\"Hello\\"\}"\);/,
      );
    });

    it("不正な YAML はプラグイン名 + ファイル名でラップして throw する", async () => {
      // `[foo` は不完全なフローシーケンスで YAMLParseError を起こす
      const file = await writeMdx(
        "broken-yaml.mdx",
        ["---", "title: [foo", "---", "", "# Body", ""].join("\n"),
      );

      await assert.rejects(loadMdx(file), (err) => {
        assert.match(
          err.message,
          /\[eleventy-plugin-preact\].*broken-yaml\.mdx.*failed to parse YAML frontmatter/,
        );
        // 原因の元 error は cause に載っている
        assert.ok(
          err.cause,
          "original YAMLParseError should be exposed as `cause`",
        );
        return true;
      });
    });

    it("front matter が文字列など mapping でない場合は throw", async () => {
      const file = await writeMdx(
        "scalar-fm.mdx",
        ["---", "just a string", "---", "", "# Body", ""].join("\n"),
      );

      await assert.rejects(loadMdx(file), /must be an object \(mapping\)/);
    });

    it("front matter が配列の場合は throw", async () => {
      const file = await writeMdx(
        "array-fm.mdx",
        ["---", "- a", "- b", "---", "", "# Body", ""].join("\n"),
      );

      await assert.rejects(
        loadMdx(file),
        /must be an object \(mapping\), got array/,
      );
    });

    it("空の front matter (`---\\n---`) も data を空オブジェクトとして prepend する", async () => {
      const file = await writeMdx(
        "empty-fence.mdx",
        ["---", "---", "", "# Body", ""].join("\n"),
      );

      const result = await loadMdx(file);
      assert.match(
        String(result.source),
        /^export const data = JSON\.parse\("\{\}"\);/,
      );
    });

    it("空 fence + 本文の export const data の併用も throw する", async () => {
      const file = await writeMdx(
        "empty-fence-collision.mdx",
        [
          "---",
          "---",
          "",
          "export const data = { title: 'From body' };",
          "",
          "# Body",
          "",
        ].join("\n"),
      );

      await assert.rejects(loadMdx(file), /export const data/);
    });

    it("front matter が `null` の場合は data を空オブジェクトとして prepend する", async () => {
      const file = await writeMdx(
        "null-fm.mdx",
        ["---", "null", "---", "", "# Body", ""].join("\n"),
      );

      const result = await loadMdx(file);
      assert.match(
        String(result.source),
        /^export const data = JSON\.parse\("\{\}"\);/,
      );
    });

    it("frontmatter の `__proto__` キーは prototype を汚染せず own property になる", async () => {
      const file = await writeMdx(
        "proto.mdx",
        [
          "---",
          "__proto__:",
          "  poisoned: true",
          "title: Safe",
          "---",
          "",
          "# Body",
          "",
        ].join("\n"),
      );

      const result = await loadMdx(file);
      const compiled = path.join(dir, "proto.compiled.mjs");
      await fs.writeFile(compiled, result.source);
      const mod = await import(pathToFileURL(compiled).href);

      // prototype が書き換わっていないこと (JSON.parse 経路なら null-prototype
      // または Object.prototype のまま)。「poisoned」が prototype chain 経由で
      // 見えていたら pollution している。
      const proto = Object.getPrototypeOf(mod.data);
      assert.ok(
        proto === null || proto === Object.prototype || !("poisoned" in proto),
        `data prototype must not carry \`poisoned\`; got ${JSON.stringify(proto)}`,
      );
      // __proto__ は own property として保持される
      assert.strictEqual(Object.hasOwn(mod.data, "__proto__"), true);
      assert.strictEqual(mod.data.title, "Safe");
    });

    it("throw メッセージ内のパスは URL エンコードされず生パスで出る", async () => {
      const file = await writeMdx(
        "with space.mdx",
        ["---", "just a string", "---", "", "# Body", ""].join("\n"),
      );

      await assert.rejects(loadMdx(file), (err) => {
        assert.match(err.message, /with space\.mdx/);
        assert.doesNotMatch(err.message, /with%20space/);
        return true;
      });
    });

    it("front matter を持つ MDX を import すると data として取り出せる", async () => {
      const file = await writeMdx(
        "importable.mdx",
        [
          "---",
          "title: Imported",
          "layout: post",
          "---",
          "",
          "# Body",
          "",
        ].join("\n"),
      );
      const result = await loadMdx(file);

      const compiled = path.join(dir, "importable.compiled.mjs");
      await fs.writeFile(compiled, result.source);
      const mod = await import(pathToFileURL(compiled).href);

      assert.deepStrictEqual(mod.data, {
        title: "Imported",
        layout: "post",
      });
    });
  });

  describe("透過的な pass-through", () => {
    it(".mdx 以外の file: URL は nextLoad に委譲される", async () => {
      const sentinel = { format: "module", source: "" };
      const href = pathToFileURL(path.join(dir, "plain.js")).href;

      const result = await load(href, {}, () => sentinel);

      assert.strictEqual(result, sentinel);
    });

    it("file: 以外の URL は nextLoad に委譲される", async () => {
      const sentinel = { format: "module", source: "" };

      const result = await load("node:fs", {}, () => sentinel);

      assert.strictEqual(result, sentinel);
    });
  });
});
