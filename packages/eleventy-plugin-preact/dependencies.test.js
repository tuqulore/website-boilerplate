import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import {
  _buildReverseDeps,
  _computeInvalidationSet,
  _parseTemplateImports,
  _resolveTemplateImport,
} from "./index.js";

describe("_parseTemplateImports", () => {
  it("シングル行の named import から specifier を抽出する", () => {
    const specs = _parseTemplateImports(`import { a } from "./mod";\n`);
    assert.deepStrictEqual(specs, ["./mod"]);
  });

  it("default import と side-effect import と renamed named import を全部拾う", () => {
    const src = `import Foo from "./foo.mdx";
import "./side-effect.jsx";
import { a as b, c } from "./bar.mdx";
`;
    assert.deepStrictEqual(_parseTemplateImports(src), [
      "./foo.mdx",
      "./side-effect.jsx",
      "./bar.mdx",
    ]);
  });

  it("複数行にまたがる destructuring import も拾う", () => {
    const src = `import {
  Alpha,
  Beta,
  Gamma,
} from "./multi.jsx";
`;
    assert.deepStrictEqual(_parseTemplateImports(src), ["./multi.jsx"]);
  });

  it("同じ specifier が複数回書かれても各出現ぶん返す", () => {
    const src = `import A from "./x.mdx";\nimport B from "./x.mdx";\n`;
    assert.deepStrictEqual(_parseTemplateImports(src), ["./x.mdx", "./x.mdx"]);
  });

  it("dynamic import() は対象外", () => {
    const src = `const p = import("./dyn.mdx");\n`;
    assert.deepStrictEqual(_parseTemplateImports(src), []);
  });

  it("行頭以外の import 語 (JSX 本文中の文字列など) は拾わない", () => {
    const src = `<pre>{"import x from './fake'"}</pre>\n`;
    assert.deepStrictEqual(_parseTemplateImports(src), []);
  });

  it("シングルクォート / ダブルクォート 両方に対応する", () => {
    const src = `import a from './x.mdx';\nimport b from "./y.mdx";\n`;
    assert.deepStrictEqual(_parseTemplateImports(src), ["./x.mdx", "./y.mdx"]);
  });

  it("連続呼び出しでも lastIndex が持ち越されず全件返す (regression)", () => {
    // 長めの入力を先に走らせて内部 lastIndex が末尾寄りに進むケースを再現。
    // 呼び出し毎に regex が新しく作られていれば、短い入力でも先頭から抽出できる。
    const long = Array.from({ length: 20 }, (_, i) => `import x${i} from "./m${i}.mdx";`).join(
      "\n",
    );
    _parseTemplateImports(long);
    const short = `import a from "./a.mdx";\n`;
    assert.deepStrictEqual(_parseTemplateImports(short), ["./a.mdx"]);
  });
});

describe("_resolveTemplateImport", () => {
  let dir;

  before(async () => {
    dir = await fs.mkdtemp(path.join(import.meta.dirname, ".tmp-dep-test-"));
    await fs.mkdir(path.join(dir, "sub"), { recursive: true });
    await fs.writeFile(path.join(dir, "target.mdx"), "");
    await fs.writeFile(path.join(dir, "target.jsx"), "");
    await fs.writeFile(path.join(dir, "target.tsx"), "");
    await fs.writeFile(path.join(dir, "target.ts"), "");
    await fs.writeFile(path.join(dir, "only-tsx.tsx"), "");
    await fs.writeFile(path.join(dir, "only-ts.ts"), "");
    await fs.writeFile(path.join(dir, "types.d.ts"), "");
    await fs.writeFile(path.join(dir, "sub", "child.mdx"), "");
  });

  after(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("拡張子付き相対パスをそのまま解決する", () => {
    const from = path.join(dir, "parent.mdx");
    assert.strictEqual(_resolveTemplateImport("./target.mdx", from), path.join(dir, "target.mdx"));
  });

  it(".tsx を含む拡張子付き相対パスも解決する", () => {
    const from = path.join(dir, "parent.mdx");
    assert.strictEqual(_resolveTemplateImport("./target.tsx", from), path.join(dir, "target.tsx"));
  });

  it("拡張子なし相対パスは .mdx を優先して解決する", () => {
    const from = path.join(dir, "parent.mdx");
    // target.mdx / target.jsx / target.tsx が全部あるが .mdx が優先
    assert.strictEqual(_resolveTemplateImport("./target", from), path.join(dir, "target.mdx"));
  });

  it("拡張子なし相対パスが .tsx にしか無い場合は .tsx にフォールバックする", () => {
    const from = path.join(dir, "parent.mdx");
    assert.strictEqual(_resolveTemplateImport("./only-tsx", from), path.join(dir, "only-tsx.tsx"));
  });

  it(".ts を含む拡張子付き相対パスも解決する", () => {
    const from = path.join(dir, "parent.mdx");
    assert.strictEqual(_resolveTemplateImport("./target.ts", from), path.join(dir, "target.ts"));
  });

  it("拡張子なし相対パスが .ts にしか無い場合は .ts にフォールバックする", () => {
    const from = path.join(dir, "parent.mdx");
    assert.strictEqual(_resolveTemplateImport("./only-ts", from), path.join(dir, "only-ts.ts"));
  });

  it(".d.ts は型宣言のみのため fallback で拾わない", () => {
    const from = path.join(dir, "parent.mdx");
    // types.d.ts のみが存在するが、拡張子なし specifier `./types` は null
    assert.strictEqual(_resolveTemplateImport("./types", from), null);
  });

  it("明示的な .d.ts 指定も null (runtime import 対象外)", () => {
    const from = path.join(dir, "parent.mdx");
    assert.strictEqual(_resolveTemplateImport("./types.d.ts", from), null);
  });

  it("サブディレクトリの相対パスを解決する", () => {
    const from = path.join(dir, "parent.mdx");
    assert.strictEqual(
      _resolveTemplateImport("./sub/child.mdx", from),
      path.join(dir, "sub", "child.mdx"),
    );
  });

  it("../ を含む相対パスを解決する", () => {
    const from = path.join(dir, "sub", "sibling.mdx");
    assert.strictEqual(_resolveTemplateImport("../target.mdx", from), path.join(dir, "target.mdx"));
  });

  it("bare specifier (npm パッケージ) は null を返す", () => {
    const from = path.join(dir, "parent.mdx");
    assert.strictEqual(_resolveTemplateImport("preact/hooks", from), null);
    assert.strictEqual(_resolveTemplateImport("@scope/pkg", from), null);
  });

  it("存在しないファイルへの相対パスは null を返す", () => {
    const from = path.join(dir, "parent.mdx");
    assert.strictEqual(_resolveTemplateImport("./nowhere.mdx", from), null);
  });
});

describe("_buildReverseDeps", () => {
  let dir;
  let base, header, desktop, footer, orphan;

  before(async () => {
    dir = await fs.mkdtemp(path.join(import.meta.dirname, ".tmp-rev-test-"));
    base = path.join(dir, "base.mdx");
    header = path.join(dir, "header.mdx");
    desktop = path.join(dir, "desktop.client.jsx");
    footer = path.join(dir, "footer.mdx");
    orphan = path.join(dir, "orphan.mdx");

    await fs.writeFile(desktop, `export default () => null;\n`);
    await fs.writeFile(
      header,
      `import Desktop from "./desktop.client.jsx";\nexport default Desktop;\n`,
    );
    await fs.writeFile(footer, `export default () => null;\n`);
    await fs.writeFile(
      base,
      `import Header from "./header.mdx";\nimport Footer from "./footer.mdx";\n`,
    );
    await fs.writeFile(orphan, `# orphan, imported by nobody\n`);
  });

  after(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("直接依存を逆辺として登録する", () => {
    const rev = _buildReverseDeps([base, header, desktop, footer, orphan]);
    assert.deepStrictEqual([...rev.get(footer)], [base]);
    assert.deepStrictEqual([...rev.get(header)], [base]);
  });

  it("transitive 依存も逆辺に集約する (base → header → desktop)", () => {
    const rev = _buildReverseDeps([base, header, desktop, footer, orphan]);
    // desktop の ancestor は header と base の両方
    assert.deepStrictEqual([...rev.get(desktop)].toSorted(), [base, header].toSorted());
  });

  it("誰にも import されていないファイルの逆辺は空", () => {
    const rev = _buildReverseDeps([base, header, desktop, footer, orphan]);
    assert.deepStrictEqual([...rev.get(orphan)], []);
  });

  it("読み込めないファイルがあってもクラッシュせず、そのファイルは import 0 件扱い", () => {
    const missing = path.join(dir, "missing.mdx");
    const rev = _buildReverseDeps([base, missing]);
    // missing 自身のエントリは存在するが、その ancestor 集合は空
    assert.ok(rev.has(missing));
    assert.deepStrictEqual([...rev.get(missing)], []);
    // base は missing の存在に関係なく他ファイルを import し続ける
    assert.ok(rev.has(base));
  });
});

describe("_computeInvalidationSet", () => {
  it("変更ファイル自身と、その ancestor を全て含む Set を返す", () => {
    const desktop = "/abs/desktop.client.jsx";
    const header = "/abs/header.mdx";
    const base = "/abs/base.mdx";
    const reverse = new Map([
      [desktop, new Set([header, base])],
      [header, new Set([base])],
      [base, new Set()],
    ]);
    const set = _computeInvalidationSet([desktop], reverse);
    assert.deepStrictEqual([...set].toSorted(), [base, desktop, header].toSorted());
  });

  it("複数の変更ファイルの ancestor をマージする", () => {
    const a = "/abs/a.mdx";
    const b = "/abs/b.mdx";
    const shared = "/abs/shared.mdx";
    const reverse = new Map([
      [a, new Set([shared])],
      [b, new Set([shared])],
      [shared, new Set()],
    ]);
    const set = _computeInvalidationSet([a, b], reverse);
    assert.deepStrictEqual([...set].toSorted(), [a, b, shared].toSorted());
  });

  it("ancestor が空でも変更ファイル自身は必ず含める", () => {
    const orphan = "/abs/orphan.mdx";
    const reverse = new Map([[orphan, new Set()]]);
    const set = _computeInvalidationSet([orphan], reverse);
    assert.deepStrictEqual([...set], [orphan]);
  });

  it("reverseDeps に無い変更ファイル (新規追加想定) でも自身は含める", () => {
    const brandNew = "/abs/brand-new.mdx";
    const set = _computeInvalidationSet([brandNew], new Map());
    assert.deepStrictEqual([...set], [brandNew]);
  });

  it("入力の相対パスも絶対パスに正規化して返す", () => {
    const rel = "./relative.mdx";
    const set = _computeInvalidationSet([rel], new Map());
    assert.deepStrictEqual([...set], [path.resolve(rel)]);
  });
});
