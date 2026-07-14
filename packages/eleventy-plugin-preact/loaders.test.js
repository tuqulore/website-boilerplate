import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { render } from "preact-render-to-string";
import { load } from "./loaders/jsx.js";

describe("SSR loader (oxc)", () => {
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

  describe("TSX/TSファイルの変換", () => {
    it(".tsx が型注釈を剥がし preact/jsx-runtime を import する", async () => {
      const file = path.join(dir, "typed.tsx");
      await fs.writeFile(
        file,
        [
          "type Props = { name: string };",
          "export const Hello = ({ name }: Props) => <p>Hello, {name}!</p>;",
          "",
        ].join("\n"),
      );

      const result = await load(pathToFileURL(file).href, {}, () => {
        assert.fail("nextLoad should not be called for .tsx files");
      });

      const source = String(result.source);
      assert.match(source, /["']preact\/jsx(-dev)?-runtime["']/);
      // 型宣言と型注釈が剥がされている
      assert.doesNotMatch(source, /type\s+Props\b/);
      assert.doesNotMatch(source, /:\s*Props/);
      // JSX 構文自体は残っていない
      assert.doesNotMatch(source, /<p/);
    });

    it(".ts で型注釈のみ剥がされ JSX 変換は入らない", async () => {
      const file = path.join(dir, "utility.ts");
      await fs.writeFile(
        file,
        "export const add = (a: number, b: number): number => a + b;\n",
      );

      const result = await load(pathToFileURL(file).href, {}, () => {
        assert.fail("nextLoad should not be called for .ts files");
      });

      const source = String(result.source);
      // 型注釈が剥がれている
      assert.doesNotMatch(source, /:\s*number/);
      // JSX 用の import は生成されない
      assert.doesNotMatch(source, /preact\/jsx-runtime/);
    });

    it("型の食い違いを含む .tsx でも transpile が止まらない", async () => {
      const file = path.join(dir, "type-error.tsx");
      await fs.writeFile(
        file,
        [
          "type Props = { name: string };",
          // 型的には嘘だが transpile-only なので通過する
          "const bad: Props = { name: 42 as unknown as string };",
          "export const Bad = () => <span>{bad.name}</span>;",
          "",
        ].join("\n"),
      );

      const result = await load(pathToFileURL(file).href, {}, () => {
        assert.fail("nextLoad should not be called for .tsx files");
      });

      assert.strictEqual(result.format, "module");
      assert.match(String(result.source), /preact\/jsx-runtime/);
    });

    it("スペースを含む .tsx パスでもソースマップの sources に生パスが載る", async () => {
      const file = path.join(dir, "typed with space.tsx");
      await fs.writeFile(
        file,
        "export const A = (): unknown => <div>hi</div>;\n",
      );

      const result = await load(pathToFileURL(file).href, {}, () => {
        assert.fail("nextLoad should not be called for .tsx files");
      });

      const base64 = String(result.source).match(
        /sourceMappingURL=data:application\/json;base64,(\S+)/,
      )?.[1];
      const map = JSON.parse(Buffer.from(base64, "base64").toString());

      assert.ok(
        map.sources.some((source) => source.includes("typed with space.tsx")),
        `sources should contain the decoded path: ${JSON.stringify(map.sources)}`,
      );
    });
  });

  describe("透過的な pass-through", () => {
    it(".jsx/.tsx/.ts 以外の file: URL は nextLoad に委譲される", async () => {
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

    it(".mdx は jsx loader ではなく nextLoad に委譲される", async () => {
      const sentinel = { format: "module", source: "" };
      const href = pathToFileURL(path.join(dir, "post.mdx")).href;

      const result = await load(href, {}, () => sentinel);

      assert.strictEqual(result, sentinel);
    });

    it("file: 以外の URL は nextLoad に委譲される", async () => {
      const sentinel = { format: "module", source: "" };
      const href = "node:fs";

      const result = await load(href, {}, () => sentinel);

      assert.strictEqual(result, sentinel);
    });
  });
});
