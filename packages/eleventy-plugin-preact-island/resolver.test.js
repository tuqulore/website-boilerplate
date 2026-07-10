import { describe, it } from "node:test";
import assert from "node:assert";
import path from "node:path";
import url from "node:url";
import { createClientModuleResolver } from "./resolver.js";

// Absolute inputDir values keep tests independent of the runner's cwd (the
// resolver `path.resolve`s inputDir, so module URLs must fall under the
// resolved absolute base).

describe("createClientModuleResolver", () => {
  describe("input 配下のモジュールを解決する", () => {
    it("ネストしたモジュールを <urlPrefix><sub>.client.js に変換する", () => {
      const resolve = createClientModuleResolver({ inputDir: "/proj/src" });
      assert.strictEqual(
        resolve("file:///proj/src/foo/bar.client.jsx"),
        "/foo/bar.client.js",
      );
    });

    it(".jsx / .tsx / .js / .ts を全て受け付け .client.js に統一する", () => {
      const resolve = createClientModuleResolver({ inputDir: "/proj/src" });
      for (const ext of ["jsx", "tsx", "js", "ts"]) {
        assert.strictEqual(
          resolve(`file:///proj/src/foo.client.${ext}`),
          "/foo.client.js",
        );
      }
    });

    it('input "." (Eleventy デフォルト = プロジェクトルート) 直下も解決する', () => {
      const resolve = createClientModuleResolver({ inputDir: "." });
      const moduleUrl = url.pathToFileURL(
        path.join(process.cwd(), "foo.client.jsx"),
      ).href;
      assert.strictEqual(resolve(moduleUrl), "/foo.client.js");
    });

    it('input "./src/" 形式 (末尾スラッシュ) でも解決する', () => {
      const resolve = createClientModuleResolver({ inputDir: "/proj/src/" });
      assert.strictEqual(
        resolve("file:///proj/src/foo.client.jsx"),
        "/foo.client.js",
      );
    });
  });

  describe("urlPrefix", () => {
    it("カスタム urlPrefix を先頭に付ける", () => {
      const resolve = createClientModuleResolver({
        inputDir: "/proj/src",
        urlPrefix: "/assets",
      });
      assert.strictEqual(
        resolve("file:///proj/src/foo.client.jsx"),
        "/assets/foo.client.js",
      );
    });

    it("urlPrefix の前後スラッシュを正規化する", () => {
      for (const urlPrefix of ["assets", "/assets", "assets/", "/assets/"]) {
        const resolve = createClientModuleResolver({
          inputDir: "/proj/src",
          urlPrefix,
        });
        assert.strictEqual(
          resolve("file:///proj/src/foo.client.jsx"),
          "/assets/foo.client.js",
          `urlPrefix=${JSON.stringify(urlPrefix)} の正規化が不正`,
        );
      }
    });
  });

  describe("URL 解釈", () => {
    it("URL エンコードされたパス (空白など) はエンコード形のまま維持する", () => {
      // browser の import() が specifier として直接使うため、literal space に
      // decode してはならない
      const resolve = createClientModuleResolver({ inputDir: "/proj/src" });
      assert.strictEqual(
        resolve("file:///proj/src/with%20space/foo.client.jsx"),
        "/with%20space/foo.client.js",
      );
    });
  });

  describe("エラー / 前方一致による偽マッチ排除", () => {
    it("input ディレクトリ配下にないモジュールは判別可能なエラーで失敗する", () => {
      const resolve = createClientModuleResolver({ inputDir: "/proj/src" });
      assert.throws(
        () => resolve("file:///proj/content/foo.client.jsx"),
        /must live under the Eleventy input directory/,
      );
    });

    it("node_modules 配下の紛らわしい .client.jsx は解決しない (回帰)", () => {
      // 旧 marker 方式は部分一致 `/src/` で
      // node_modules/pkg/src/foo.client.jsx に偽マッチしていた。絶対 input 前方一致では
      // input(/proj/src) の外なので確実に弾く。
      const resolve = createClientModuleResolver({ inputDir: "/proj/src" });
      assert.throws(
        () => resolve("file:///proj/node_modules/pkg/src/foo.client.jsx"),
        /must live under the Eleventy input directory/,
      );
    });

    it("兄弟ディレクトリ (src-review など) は末尾スラッシュ前方一致で弾く", () => {
      const resolve = createClientModuleResolver({ inputDir: "/proj/src" });
      assert.throws(
        () => resolve("file:///proj/src-review/foo.client.jsx"),
        /must live under the Eleventy input directory/,
      );
    });

    it(".client.{js,jsx,ts,tsx} 以外はエラーで失敗する", () => {
      const resolve = createClientModuleResolver({ inputDir: "/proj/src" });
      assert.throws(
        () => resolve("file:///proj/src/foo.jsx"),
        /must end with \.client/,
      );
    });

    it("URL として不正な値はエラーで失敗する", () => {
      const resolve = createClientModuleResolver({ inputDir: "/proj/src" });
      assert.throws(() => resolve("not-a-url"), /Invalid module URL/);
    });

    it("inputDir が非文字列だと factory 呼び出しの時点で TypeError", () => {
      assert.throws(
        () => createClientModuleResolver({ inputDir: 123 }),
        TypeError,
      );
    });

    it("urlPrefix が非文字列だと factory 呼び出しの時点で TypeError", () => {
      assert.throws(
        () =>
          createClientModuleResolver({ inputDir: "/proj/src", urlPrefix: 123 }),
        TypeError,
      );
    });
  });
});
