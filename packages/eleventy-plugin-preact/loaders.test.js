import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { render } from "preact-render-to-string";
import { load } from "./loaders/jsx.js";

describe("jsx loader", () => {
  // bare specifier（preact/jsx-runtime）を解決できるよう
  // 一時ファイルはこのパッケージ配下に作る
  let dir;

  before(async () => {
    dir = await fs.mkdtemp(path.join(import.meta.dirname, ".tmp-jsx-test-"));
  });

  after(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  describe("JSXファイルの変換", () => {
    it("preactのjsx-runtimeを使うESMに変換される", async () => {
      const file = path.join(dir, "component.jsx");
      await fs.writeFile(
        file,
        'export const Hello = ({ name }) => <p class="hello">Hello, {name}!</p>;\n',
      );

      const result = await load(pathToFileURL(file).href, {}, () => {
        assert.fail("nextLoad should not be called for .jsx files");
      });

      assert.strictEqual(result.format, "module");
      assert.strictEqual(result.shortCircuit, true);

      const source = String(result.source);
      assert.match(source, /["']preact\/jsx(-dev)?-runtime["']/);
      // JSX構文が残っていない
      assert.doesNotMatch(source, /<p/);
    });

    it("ソースマップが埋め込まれる", async () => {
      const file = path.join(dir, "mapped.jsx");
      await fs.writeFile(file, "export const A = () => <div>hi</div>;\n");

      const result = await load(pathToFileURL(file).href, {}, () => {
        assert.fail("nextLoad should not be called for .jsx files");
      });

      const source = String(result.source);
      const base64 = source.match(
        /sourceMappingURL=data:application\/json;base64,(\S+)/,
      )?.[1];
      assert.ok(base64, "sourceMappingURL comment should be present");

      const map = JSON.parse(Buffer.from(base64, "base64").toString());
      assert.strictEqual(map.version, 3);
      assert.ok(Array.isArray(map.sources));
    });

    it("スペースを含むパスでもソースマップのパスがエンコードされない", async () => {
      const file = path.join(dir, "with space.jsx");
      await fs.writeFile(file, "export const A = () => <div>hi</div>;\n");

      const result = await load(pathToFileURL(file).href, {}, () => {
        assert.fail("nextLoad should not be called for .jsx files");
      });

      const base64 = String(result.source).match(
        /sourceMappingURL=data:application\/json;base64,(\S+)/,
      )?.[1];
      const map = JSON.parse(Buffer.from(base64, "base64").toString());

      assert.ok(
        map.sources.some((source) => source.includes("with space.jsx")),
        `sources should contain the decoded path: ${JSON.stringify(map.sources)}`,
      );
    });

    it("変換結果をimportしてレンダリングできる", async () => {
      const file = path.join(dir, "renderable.jsx");
      await fs.writeFile(
        file,
        "export const Page = () => <main><h1>タイトル</h1><p>本文</p></main>;\n",
      );

      const result = await load(pathToFileURL(file).href, {}, () => {
        assert.fail("nextLoad should not be called for .jsx files");
      });

      const compiled = path.join(dir, "renderable.compiled.js");
      await fs.writeFile(compiled, result.source);
      const { Page } = await import(pathToFileURL(compiled).href);

      assert.strictEqual(
        render(Page()),
        "<main><h1>タイトル</h1><p>本文</p></main>",
      );
    });
  });

  describe("JSX以外のファイル", () => {
    it(".jsx以外のfile: URLはnextLoadに委譲される", async () => {
      const sentinel = { format: "module", source: "" };
      const href = pathToFileURL(path.join(dir, "plain.js")).href;
      const context = {};

      const result = await load(href, context, (nextHref, nextContext) => {
        assert.strictEqual(nextHref, href);
        assert.strictEqual(nextContext, context);
        return sentinel;
      });

      assert.strictEqual(result, sentinel);
    });

    it("file:以外のURLはnextLoadに委譲される", async () => {
      const sentinel = { format: "module", source: "" };
      const href = "node:fs";

      const result = await load(href, {}, () => sentinel);

      assert.strictEqual(result, sentinel);
    });
  });
});
