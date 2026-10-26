import assert from "node:assert";
import { describe, it, beforeEach } from "node:test";

import { parse } from "devalue";

import {
  clientComponent,
  clientOnlyComponent,
  islandAttributes,
  _setClientModuleResolver,
} from "./island.js";

const Comp = () => null;
// clientOnlyComponent は __clientOnly を付けるので、Comp とは別の関数を使う。
const ClientOnlyComp = () => null;

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

describe("clientOnlyComponent", () => {
  it("Component に __clientModuleUrl と __clientOnly を付与して同じ関数を返す", () => {
    const returned = clientOnlyComponent(ClientOnlyComp, "file:///proj/src/foo.client.jsx");
    assert.strictEqual(returned, ClientOnlyComp);
    assert.strictEqual(ClientOnlyComp.__clientModuleUrl, "file:///proj/src/foo.client.jsx");
    assert.strictEqual(ClientOnlyComp.__clientOnly, true);
  });

  it("引数が不正な場合は clientOnlyComponent の名前で TypeError", () => {
    assert.throws(
      () => clientOnlyComponent(null, "file:///x"),
      (err) => err instanceof TypeError && err.message.startsWith("clientOnlyComponent:"),
    );
    assert.throws(
      () => clientOnlyComponent(() => null, undefined),
      (err) => err instanceof TypeError && err.message.startsWith("clientOnlyComponent:"),
    );
  });
});

describe("islandAttributes", () => {
  beforeEach(() => {
    _setClientModuleResolver(() => "/x.client.js");
  });

  it("adapter の type と resolver 経由の import URL、devalue props を <is-land> の属性にする", () => {
    const X = clientComponent(() => null, "file:///proj/src/x.client.jsx");
    const result = islandAttributes(X, { name: "alice" }, { type: "test", on: "visible" });
    assert.deepStrictEqual(result.attrs, {
      "land-on:visible": "",
      type: "test",
      import: "/x.client.js",
      props: '[{"name":1},"alice"]',
    });
    assert.strictEqual(result.clientOnly, false);
    assert.deepStrictEqual(result.props, { name: "alice" });
    assert.strictEqual(result.fallback, null);
  });

  it("client-only では fallback を props から外して返し、client-only 属性を足す", () => {
    const X = clientOnlyComponent(() => null, "file:///proj/src/x.client.jsx");
    const props = { label: "now", fallback: "--:--", children: "ignored" };
    const result = islandAttributes(X, props, { type: "test" });
    assert.strictEqual(result.attrs["client-only"], "");
    assert.strictEqual(result.attrs["land-on:load"], "");
    assert.strictEqual(result.clientOnly, true);
    assert.strictEqual(result.fallback, "--:--");
    assert.deepStrictEqual(parse(result.attrs.props), { label: "now" });
    // 呼び出し側の props は書き換えない
    assert.deepStrictEqual(props, { label: "now", fallback: "--:--", children: "ignored" });
  });
});
