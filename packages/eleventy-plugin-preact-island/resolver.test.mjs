import { describe, it } from "node:test";
import assert from "node:assert";
import { createClientModuleResolver } from "./resolver.mjs";

describe("createClientModuleResolver", () => {
  describe("デフォルト設定", () => {
    it("srcDir=src, urlPrefix=/ で src/**/*.client.jsx を /**/client.js に変換する", () => {
      const resolve = createClientModuleResolver();
      assert.strictEqual(
        resolve("file:///home/user/proj/src/foo/bar.client.jsx"),
        "/foo/bar.client.js",
      );
    });

    it(".jsx / .tsx / .js / .ts を全て受け付け .client.js に統一する", () => {
      const resolve = createClientModuleResolver();
      for (const ext of ["jsx", "tsx", "js", "ts"]) {
        assert.strictEqual(
          resolve(`file:///proj/src/foo.client.${ext}`),
          "/foo.client.js",
        );
      }
    });
  });

  describe("カスタム srcDir / urlPrefix", () => {
    it("カスタム srcDir に従う", () => {
      const resolve = createClientModuleResolver({ srcDir: "content" });
      assert.strictEqual(
        resolve("file:///proj/content/foo.client.jsx"),
        "/foo.client.js",
      );
    });

    it("カスタム urlPrefix を先頭に付ける", () => {
      const resolve = createClientModuleResolver({ urlPrefix: "/assets" });
      assert.strictEqual(
        resolve("file:///proj/src/foo.client.jsx"),
        "/assets/foo.client.js",
      );
    });

    it("urlPrefix の前後スラッシュを正規化する", () => {
      const cases = ["assets", "/assets", "assets/", "/assets/"];
      for (const urlPrefix of cases) {
        const resolve = createClientModuleResolver({ urlPrefix });
        assert.strictEqual(
          resolve("file:///proj/src/foo.client.jsx"),
          "/assets/foo.client.js",
          `urlPrefix=${JSON.stringify(urlPrefix)} の正規化が不正`,
        );
      }
    });

    it("srcDir の前後スラッシュを正規化する", () => {
      const cases = ["src", "/src", "src/", "/src/"];
      for (const srcDir of cases) {
        const resolve = createClientModuleResolver({ srcDir });
        assert.strictEqual(
          resolve("file:///proj/src/foo.client.jsx"),
          "/foo.client.js",
          `srcDir=${JSON.stringify(srcDir)} の正規化が不正`,
        );
      }
    });
  });

  describe("URL 解釈", () => {
    it("URL エンコードされたパス (空白など) はエンコード形のまま維持する", () => {
      // browser の import() が specifier として直接使うため、literal space に
      // decode してはならない
      const resolve = createClientModuleResolver();
      assert.strictEqual(
        resolve("file:///proj/src/with%20space/foo.client.jsx"),
        "/with%20space/foo.client.js",
      );
    });

    it("経路の途中に src と紛らわしい名前 (src-review など) があっても最後の /src/ を採用する", () => {
      const resolve = createClientModuleResolver();
      assert.strictEqual(
        resolve("file:///Users/x/src-review/src/foo.client.jsx"),
        "/foo.client.js",
      );
    });
  });

  describe("エラー", () => {
    it("srcDir 配下にないモジュールは判別可能なエラーで失敗する", () => {
      const resolve = createClientModuleResolver();
      assert.throws(
        () => resolve("file:///proj/content/foo.client.jsx"),
        /must live under "src\/"/,
      );
    });

    it(".client.{js,jsx,ts,tsx} 以外はエラーで失敗する", () => {
      const resolve = createClientModuleResolver();
      assert.throws(
        () => resolve("file:///proj/src/foo.jsx"),
        /must end with \.client/,
      );
    });

    it("URL として不正な値はエラーで失敗する", () => {
      const resolve = createClientModuleResolver();
      assert.throws(() => resolve("not-a-url"), /Invalid module URL/);
    });

    it("srcDir が空文字列だと factory 呼び出しの時点で TypeError", () => {
      assert.throws(
        () => createClientModuleResolver({ srcDir: "" }),
        TypeError,
      );
    });

    it("srcDir が非文字列だと factory 呼び出しの時点で TypeError", () => {
      assert.throws(
        () => createClientModuleResolver({ srcDir: 123 }),
        TypeError,
      );
    });

    it("urlPrefix が非文字列だと factory 呼び出しの時点で TypeError", () => {
      assert.throws(
        () => createClientModuleResolver({ urlPrefix: 123 }),
        TypeError,
      );
    });
  });
});
