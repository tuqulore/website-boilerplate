import { describe, it } from "node:test";
import assert from "node:assert";
import { eleventy, _runWithEleventyData } from "./eleventy.mjs";

describe("eleventy singleton", () => {
  describe("SSRコンテキスト内でのデータアクセス", () => {
    it("トップレベルのプロパティにアクセスできる", () => {
      const data = { title: "Hello World" };
      _runWithEleventyData(data, () => {
        assert.strictEqual(eleventy.title, "Hello World");
      });
    });

    it("ネストされたプロパティにアクセスできる", () => {
      const data = { site: { name: "My Site", author: "Test Author" } };
      _runWithEleventyData(data, () => {
        assert.strictEqual(eleventy.site.name, "My Site");
        assert.strictEqual(eleventy.site.author, "Test Author");
      });
    });

    it("配列データにアクセスできる", () => {
      const data = { nav: [{ name: "Home" }, { name: "About" }] };
      _runWithEleventyData(data, () => {
        assert.strictEqual(eleventy.nav[0].name, "Home");
        assert.strictEqual(eleventy.nav[1].name, "About");
      });
    });

    it("存在しないプロパティはundefinedを返す", () => {
      const data = { title: "Hello" };
      _runWithEleventyData(data, () => {
        assert.strictEqual(eleventy.nonExistent, undefined);
      });
    });
  });

  describe("SSRコンテキスト外でのアクセス", () => {
    it("コンテキスト外でアクセスするとエラーが発生する", () => {
      assert.throws(
        () => eleventy.title,
        /eleventy\.title is not available outside of SSR context/,
      );
    });

    it("コンテキスト終了後にアクセスするとエラーが発生する", () => {
      const data = { title: "Hello" };
      _runWithEleventyData(data, () => {
        // コンテキスト内では正常
        assert.strictEqual(eleventy.title, "Hello");
      });
      // コンテキスト終了後はエラー
      assert.throws(
        () => eleventy.title,
        /eleventy\.title is not available outside of SSR context/,
      );
    });
  });

  describe("並行処理でのデータ分離", () => {
    it("Promise.allで並行実行しても各コンテキストのデータが分離される", async () => {
      const results = await Promise.all([
        _runWithEleventyData({ id: 1, title: "Page 1" }, async () => {
          await delay(10);
          return { id: eleventy.id, title: eleventy.title };
        }),
        _runWithEleventyData({ id: 2, title: "Page 2" }, async () => {
          await delay(5);
          return { id: eleventy.id, title: eleventy.title };
        }),
        _runWithEleventyData({ id: 3, title: "Page 3" }, async () => {
          await delay(15);
          return { id: eleventy.id, title: eleventy.title };
        }),
      ]);

      assert.deepStrictEqual(results, [
        { id: 1, title: "Page 1" },
        { id: 2, title: "Page 2" },
        { id: 3, title: "Page 3" },
      ]);
    });

    it("非同期処理を挟んでもデータが混同されない", async () => {
      const result = await _runWithEleventyData(
        { title: "Original" },
        async () => {
          const before = eleventy.title;
          await delay(10);
          const after = eleventy.title;
          return { before, after };
        },
      );

      assert.deepStrictEqual(result, {
        before: "Original",
        after: "Original",
      });
    });
  });

  describe("非同期処理対応", () => {
    it("await後もデータが保持される", async () => {
      const result = await _runWithEleventyData({ title: "Async Test" }, async () => {
        await delay(5);
        return eleventy.title;
      });

      assert.strictEqual(result, "Async Test");
    });

    it("ネストされたasync関数内でもデータが伝播する", async () => {
      const innerFn = async () => {
        await delay(5);
        return eleventy.title;
      };

      const result = await _runWithEleventyData({ title: "Nested" }, async () => {
        return await innerFn();
      });

      assert.strictEqual(result, "Nested");
    });
  });

  describe("エッジケース", () => {
    it("空オブジェクトを渡しても動作する", () => {
      _runWithEleventyData({}, () => {
        assert.strictEqual(eleventy.anyKey, undefined);
      });
    });

    it("コールバック内で例外が発生しても伝播する", () => {
      assert.throws(
        () =>
          _runWithEleventyData({ title: "Test" }, () => {
            throw new Error("Test error");
          }),
        /Test error/,
      );
    });

    it("例外発生後はコンテキストがクリーンアップされる", () => {
      try {
        _runWithEleventyData({ title: "Test" }, () => {
          throw new Error("Test error");
        });
      } catch {
        // ignore
      }

      assert.throws(
        () => eleventy.title,
        /eleventy\.title is not available outside of SSR context/,
      );
    });
  });
});

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
