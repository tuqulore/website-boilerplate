import { expectType, expectError, expectAssignable } from "tsd";
import type { VNode } from "preact";
import {
  Island,
  clientComponent,
  type ClientComponent,
  type IslandOn,
  type IslandProps,
  type SerializableProps,
} from "../island.js";

// clientComponent brands the component with `__clientModuleUrl`.
const Counter = clientComponent<{ initial: number }>(
  (props) => null as unknown as VNode,
  "file:///counter.client.js",
);
expectType<ClientComponent<{ initial: number }>>(Counter);
expectType<string>(Counter.__clientModuleUrl);

// Positive: required prop `initial` is passed with the right type.
expectType<VNode>(Island({ component: Counter, initial: 3 }));
expectType<VNode>(
  Island({ component: Counter, initial: 3, on: "interaction" }),
);
expectType<VNode>(Island({ component: Counter, initial: 3, on: "visible" }));
expectType<VNode>(Island({ component: Counter, initial: 3, on: "idle" }));

// Escape hatch: unknown-but-serialisable trigger names still type-check via
// the `(string & {})` branch of IslandOn.
expectType<VNode>(
  Island({ component: Counter, initial: 3, on: "media (min-width: 640px)" }),
);
expectAssignable<IslandOn>("save-data");
expectAssignable<IslandOn>("load");

// Negative: typo on a component prop.
//`initail` is a typo; `IslandProps` no longer has an index signature.
expectError(Island({ component: Counter, initail: 3 }));

// Negative: type mismatch on a component prop.
//`initial` is number, not string.
expectError(Island({ component: Counter, initial: "3" }));

// Negative: missing required prop.
//`initial` is required by Counter.
expectError(Island({ component: Counter }));

// Negative: function props cannot cross the SSR/client boundary.
//`onClick` is a function; devalue cannot serialise it.
expectError(
  Island({
    component: Counter,
    initial: 3,
    onClick: () => {},
  }),
);

// SerializableProps preserves serialisable shapes.
declare const sp: SerializableProps<{
  n: number;
  s: string;
  d: Date;
  arr: readonly number[];
}>;
expectType<number>(sp.n);
expectType<string>(sp.s);
expectType<Date>(sp.d);
expectType<readonly number[]>(sp.arr);

// IslandProps<P> preserves the concrete prop type of `P` (no `unknown`).
declare const props: IslandProps<{ initial: number }>;
expectType<number>(props.initial);
