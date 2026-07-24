import assert from "node:assert";
import { describe, it, beforeEach } from "node:test";

import { parse } from "devalue";
import { h } from "preact";
import { render } from "preact-render-to-string";

import { Island, clientComponent, _setClientModuleResolver } from "./island.js";

// SSR HTML から <is-land ... props="..."> の props 属性値を取り出し、HTML エスケープを
// 戻して devalue.parse に通す。SSR 側の stringify とクライアント側の parse が
// 対で復元するラウンドトリップを、クライアント setup 文字列を eval せずに検証する。
function extractParsedProps(html) {
  const m = html.match(/ props="([^"]*)"/);
  if (!m) throw new Error(`no props attribute in: ${html}`);
  const decoded = m[1]
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&#39;", "'")
    // &amp; は最後に戻す (先にやると &amp;quot; が " まで剥がれる)
    .replaceAll("&amp;", "&");
  return parse(decoded);
}

describe("_setClientModuleResolver", () => {
  it("関数を渡せる", () => {
    assert.doesNotThrow(() => _setClientModuleResolver(() => "/x.js"));
    // 状態を残さない: 後続テストの beforeEach で null リセットされるが念のため
    _setClientModuleResolver(null);
  });

  it("null で明示的にクリアできる", () => {
    _setClientModuleResolver(() => "/x.js");
    assert.doesNotThrow(() => _setClientModuleResolver(null));
  });

  it("関数でも null でもない値は TypeError で拒否する", () => {
    for (const bad of [undefined, 0, "string", {}, [], true]) {
      assert.throws(
        () => _setClientModuleResolver(bad),
        (err) =>
          err instanceof TypeError && /`resolver` must be a function or null/.test(err.message),
        `_setClientModuleResolver(${JSON.stringify(bad)}) が TypeError にならなかった`,
      );
    }
  });
});

describe("clientComponent", () => {
  it("Component に __clientModuleUrl を付与して同じ関数を返す", () => {
    const Comp = () => null;
    const returned = clientComponent(Comp, "file:///proj/src/foo.client.jsx");
    assert.strictEqual(returned, Comp);
    assert.strictEqual(Comp.__clientModuleUrl, "file:///proj/src/foo.client.jsx");
  });

  it("Component が関数でない場合は TypeError", () => {
    assert.throws(() => clientComponent(null, "file:///x"), TypeError);
    assert.throws(() => clientComponent("Comp", "file:///x"), TypeError);
  });

  it("moduleUrl が文字列でない場合は TypeError", () => {
    assert.throws(() => clientComponent(() => null, undefined), TypeError);
    assert.throws(() => clientComponent(() => null, 123), TypeError);
  });
});

describe("Island", () => {
  beforeEach(() => {
    // 各テストで resolver をリセットし、テスト間の状態漏れを防ぐ
    _setClientModuleResolver(null);
  });

  it("clientComponent 済み component を <is-land> でラップし、resolver 経由の import URL と devalue props を出力する", () => {
    const receivedUrls = [];
    _setClientModuleResolver((moduleUrl) => {
      receivedUrls.push(moduleUrl);
      return "/foo.client.js";
    });
    const Foo = clientComponent(function Foo(props) {
      return h("span", null, props.name);
    }, "file:///proj/src/foo.client.jsx");

    const html = render(h(Island, { component: Foo, on: "visible", name: "alice" }));

    assert.deepStrictEqual(receivedUrls, ["file:///proj/src/foo.client.jsx"]);
    assert.match(html, /^<is-land/);
    assert.match(html, /land-on:visible/);
    assert.match(html, /type="preact"/);
    assert.match(html, /import="\/foo\.client\.js"/);
    // devalue.stringify({ name: "alice" }) → [{"name":1},"alice"] が HTML エスケープされる
    assert.match(html, /props="\[\{&quot;name&quot;:1\},&quot;alice&quot;\]"/);
    // SSR 内容として component が同じ props でレンダリングされている
    assert.match(html, /<span>alice<\/span>/);
    assert.match(html, /<\/is-land>$/);
  });

  it("on prop のデフォルトは interaction", () => {
    _setClientModuleResolver(() => "/x.client.js");
    const X = clientComponent(() => null, "file:///proj/src/x.client.jsx");
    const html = render(h(Island, { component: X }));
    assert.match(html, /land-on:interaction/);
  });

  // 回帰: is-land の `Conditions.interaction` は属性値をイベント名として
  // 解釈する (`eventsStr = eventOverrides || "click,touchstart"`)。
  // `land-on:interaction="true"` を SSR で出すと「'true' というイベントを
  // 待つ」状態になり永久に hydrate されない。boolean 属性相当 (Preact JSX
  // で `""` を渡すと preact-render-to-string は値なし形式で出力する) にして
  // is-land 側では `getAttribute` → `""` → デフォルト click/touchstart 発火に
  // フォールバックさせる。
  it("land-on:* は boolean 属性相当 (値なし) で出力される", () => {
    _setClientModuleResolver(() => "/x.client.js");
    const X = clientComponent(() => null, "file:///proj/src/x.client.jsx");
    const html = render(h(Island, { component: X, on: "interaction" }));
    // is-land start tag 内で `land-on:interaction` が値なし属性として存在すること
    // だけを検証する。属性の並び順に依存しないよう、直後に空白/`/`/`>` (= 属性
    // 値が続かない) が来ることのみを要求する。
    assert.match(
      html,
      /<is-land\b[^>]*\bland-on:interaction(?=[\s/>])/,
      "land-on:interaction が is-land 開始タグ内に値なし属性として現れていない",
    );
    assert.doesNotMatch(html, /land-on:interaction=/);
  });

  it("component が渡されていない (または関数でない) 場合は TypeError", () => {
    _setClientModuleResolver(() => "/x.client.js");
    assert.throws(() => render(h(Island, { component: "not-a-fn" })), TypeError);
  });

  it("on に不正な値 (空白 / 空文字 / 非文字列) を渡すと TypeError", () => {
    _setClientModuleResolver(() => "/x.client.js");
    const X = clientComponent(() => null, "file:///proj/src/x.client.jsx");
    for (const on of ["foo bar", "", 'bad"quote', 123, null]) {
      assert.throws(
        () => render(h(Island, { component: X, on })),
        (err) => err instanceof TypeError && /`on` must match/.test(err.message),
        `on=${JSON.stringify(on)} が TypeError にならなかった`,
      );
    }
  });

  it("component が clientComponent でラップされていない場合は明示エラー", () => {
    _setClientModuleResolver(() => "/x.client.js");
    const Bare = () => null;
    assert.throws(() => render(h(Island, { component: Bare })), /not marked as a client component/);
  });

  it("resolver が未設定の場合は明示エラー", () => {
    const X = clientComponent(() => null, "file:///proj/src/x.client.jsx");
    assert.throws(
      () => render(h(Island, { component: X })),
      /no client module URL resolver is configured/,
    );
  });

  it("children を渡しても component の SSR 出力が優先される (呼び出し側は component だけ渡せば済む)", () => {
    _setClientModuleResolver(() => "/x.client.js");
    const X = clientComponent(function X(props) {
      return h("i", null, `x-${props.tag}`);
    }, "file:///proj/src/x.client.jsx");
    const html = render(h(Island, { component: X, tag: "auto" }, h("b", null, "ignored")));
    assert.match(html, /<i>x-auto<\/i>/);
    assert.doesNotMatch(html, /<b>ignored<\/b>/);
  });

  it("children は props シリアライズにもコンポーネント SSR にも漏れない", () => {
    _setClientModuleResolver(() => "/x.client.js");
    const receivedProps = [];
    const X = clientComponent(function X(props) {
      receivedProps.push(props);
      return h("i", null, `x-${props.tag}`);
    }, "file:///proj/src/x.client.jsx");

    const html = render(h(Island, { component: X, tag: "auto" }, h("b", null, "ignored")));

    // <is-land props="..."> 属性に children/VNode が混入していないことを確認
    // (props 属性値は tag のみで完結)
    assert.match(html, /props="\[\{&quot;tag&quot;:1\},&quot;auto&quot;\]"/);
    // component 側にも children は渡らない
    assert.deepStrictEqual(receivedProps, [{ tag: "auto" }]);
  });

  it("循環参照 props は throw せず、devalue で識別子が復元される", () => {
    _setClientModuleResolver(() => "/x.client.js");
    const X = clientComponent(function X() {
      return null;
    }, "file:///proj/src/x.client.jsx");

    const circular = { name: "root" };
    circular.self = circular;

    const html = render(h(Island, { component: X, data: circular }));
    const parsed = extractParsedProps(html);
    assert.strictEqual(parsed.data.name, "root");
    // 循環参照の identity が復元される (JSON では不可能だった挙動)
    assert.strictEqual(parsed.data.self, parsed.data);
  });

  it("devalue-serializable でない props (関数など) は Island 文脈のエラーで包む", () => {
    _setClientModuleResolver(() => "/x.client.js");
    const X = clientComponent(function X() {
      return null;
    }, "file:///proj/src/x.client.jsx");

    assert.throws(
      () => render(h(Island, { component: X, onClick: () => {} })),
      (err) => {
        assert.match(err.message, /Island: failed to devalue\.stringify props/);
        assert.match(err.message, /\/x\.client\.js/);
        // devalue の DevalueError.path は原因 prop の位置を示す
        assert.match(err.message, /at `\.onClick`/);
        assert.ok(err.cause instanceof Error, "元エラーが cause に保持されている");
        return true;
      },
    );
  });

  it("Date が SSR → devalue.parse で instanceof Date のまま round-trip する", () => {
    _setClientModuleResolver(() => "/x.client.js");
    const X = clientComponent(function X() {
      return null;
    }, "file:///proj/src/x.client.jsx");

    const at = new Date("2026-07-13T00:00:00Z");
    const html = render(h(Island, { component: X, at }));
    const parsed = extractParsedProps(html);
    assert.ok(parsed.at instanceof Date);
    assert.strictEqual(parsed.at.getTime(), at.getTime());
  });

  it("Map / Set / BigInt / undefined / NaN / Infinity / RegExp が round-trip する", () => {
    _setClientModuleResolver(() => "/x.client.js");
    const X = clientComponent(function X() {
      return null;
    }, "file:///proj/src/x.client.jsx");

    const map = new Map([
      ["a", 1],
      ["b", 2],
    ]);
    const set = new Set(["x", "y"]);
    const html = render(
      h(Island, {
        component: X,
        map,
        set,
        big: 10n,
        undef: undefined,
        nan: NaN,
        inf: Infinity,
        regex: /abc/gi,
      }),
    );
    const parsed = extractParsedProps(html);
    assert.ok(parsed.map instanceof Map);
    assert.deepStrictEqual([...parsed.map], [...map]);
    assert.ok(parsed.set instanceof Set);
    assert.deepStrictEqual([...parsed.set], [...set]);
    assert.strictEqual(parsed.big, 10n);
    assert.strictEqual(parsed.undef, undefined);
    assert.ok(Number.isNaN(parsed.nan));
    assert.strictEqual(parsed.inf, Infinity);
    assert.ok(parsed.regex instanceof RegExp);
    assert.strictEqual(parsed.regex.source, "abc");
    assert.strictEqual(parsed.regex.flags, "gi");
  });

  it("文字列 prop に閉じタグ様の内容が入っても HTML には生 </script> が出ず、round-trip で復元される", () => {
    _setClientModuleResolver(() => "/x.client.js");
    const X = clientComponent(function X() {
      return null;
    }, "file:///proj/src/x.client.jsx");

    const payload = "</script><script>alert(1)</script>";
    const html = render(h(Island, { component: X, s: payload }));
    // devalue が < を < に unicode escape するため属性値に生 </script> は出ない
    assert.doesNotMatch(html, /<\/script>/);
    const parsed = extractParsedProps(html);
    assert.strictEqual(parsed.s, payload);
  });
});
