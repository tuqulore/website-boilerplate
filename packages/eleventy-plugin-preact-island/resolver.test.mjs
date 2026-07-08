import { describe, it } from "node:test";
import assert from "node:assert";
import { createHydrateModuleResolver } from "./resolver.mjs";

describe("createHydrateModuleResolver", () => {
  describe("デフォルト設定", () => {
    it("srcDir=src, urlPrefix=/ で src/**/*.hydrate.jsx を /**/hydrate.js に変換する", () => {
      const resolve = createHydrateModuleResolver();
      assert.strictEqual(
        resolve("file:///home/user/proj/src/foo/bar.hydrate.jsx"),
        "/foo/bar.hydrate.js",
      );
    });

    it(".jsx / .tsx / .js / .ts を全て受け付け .hydrate.js に統一する", () => {
      const resolve = createHydrateModuleResolver();
      for (const ext of ["jsx", "tsx", "js", "ts"]) {
        assert.strictEqual(
          resolve(`file:///proj/src/foo.hydrate.${ext}`),
          "/foo.hydrate.js",
        );
      }
    });
  });

  describe("カスタム srcDir / urlPrefix", () => {
    it("カスタム srcDir に従う", () => {
      const resolve = createHydrateModuleResolver({ srcDir: "content" });
      assert.strictEqual(
        resolve("file:///proj/content/foo.hydrate.jsx"),
        "/foo.hydrate.js",
      );
    });

    it("カスタム urlPrefix を先頭に付ける", () => {
      const resolve = createHydrateModuleResolver({ urlPrefix: "/assets" });
      assert.strictEqual(
        resolve("file:///proj/src/foo.hydrate.jsx"),
        "/assets/foo.hydrate.js",
      );
    });

    it("urlPrefix の前後スラッシュを正規化する", () => {
      const cases = ["assets", "/assets", "assets/", "/assets/"];
      for (const urlPrefix of cases) {
        const resolve = createHydrateModuleResolver({ urlPrefix });
        assert.strictEqual(
          resolve("file:///proj/src/foo.hydrate.jsx"),
          "/assets/foo.hydrate.js",
          `urlPrefix=${JSON.stringify(urlPrefix)} の正規化が不正`,
        );
      }
    });
  });

  describe("URL 解釈", () => {
    it("URL エンコードされたパス (空白など) を復元する", () => {
      const resolve = createHydrateModuleResolver();
      assert.strictEqual(
        resolve("file:///proj/src/with%20space/foo.hydrate.jsx"),
        "/with space/foo.hydrate.js",
      );
    });

    it("経路の途中に src と紛らわしい名前 (src-review など) があっても最後の /src/ を採用する", () => {
      const resolve = createHydrateModuleResolver();
      assert.strictEqual(
        resolve("file:///Users/x/src-review/src/foo.hydrate.jsx"),
        "/foo.hydrate.js",
      );
    });
  });

  describe("エラー", () => {
    it("srcDir 配下にないモジュールは判別可能なエラーで失敗する", () => {
      const resolve = createHydrateModuleResolver();
      assert.throws(
        () => resolve("file:///proj/content/foo.hydrate.jsx"),
        /must live under "src\/"/,
      );
    });

    it(".hydrate.{js,jsx,ts,tsx} 以外はエラーで失敗する", () => {
      const resolve = createHydrateModuleResolver();
      assert.throws(
        () => resolve("file:///proj/src/foo.jsx"),
        /must end with \.hydrate/,
      );
    });

    it("URL として不正な値はエラーで失敗する", () => {
      const resolve = createHydrateModuleResolver();
      assert.throws(() => resolve("not-a-url"), /Invalid module URL/);
    });

    it("srcDir が空文字列だと factory 呼び出しの時点で TypeError", () => {
      assert.throws(
        () => createHydrateModuleResolver({ srcDir: "" }),
        TypeError,
      );
    });

    it("srcDir が非文字列だと factory 呼び出しの時点で TypeError", () => {
      assert.throws(
        () => createHydrateModuleResolver({ srcDir: 123 }),
        TypeError,
      );
    });

    it("urlPrefix が非文字列だと factory 呼び出しの時点で TypeError", () => {
      assert.throws(
        () => createHydrateModuleResolver({ urlPrefix: 123 }),
        TypeError,
      );
    });
  });
});
