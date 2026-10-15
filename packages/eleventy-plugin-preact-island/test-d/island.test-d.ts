import type { VNode } from "preact";
import { expectType, expectError, expectAssignable } from "tsd";

import {
  Island,
  clientComponent,
  type ClientComponent,
  type IslandOn,
  type IslandProps,
} from "../island.js";

// clientComponent brands the component with `__clientModuleUrl`.
const Counter = clientComponent<{ initial: number }>(
  () => null as unknown as VNode,
  "file:///counter.client.js",
);
expectType<ClientComponent<{ initial: number }>>(Counter);
expectType<string>(Counter.__clientModuleUrl);

// Positive: required prop `initial` is passed with the right type.
expectType<VNode>(Island({ component: Counter, initial: 3 }));
expectType<VNode>(Island({ component: Counter, initial: 3, on: "interaction" }));
expectType<VNode>(Island({ component: Counter, initial: 3, on: "visible" }));
expectType<VNode>(Island({ component: Counter, initial: 3, on: "idle" }));

// Escape hatch: is-land triggers outside the suggested trio still type-check.
expectType<VNode>(Island({ component: Counter, initial: 3, on: "load" }));
expectAssignable<IslandOn>("save-data");

// Negative: typo on a component prop.
expectError(Island({ component: Counter, initail: 3 }));

// Negative: type mismatch on a component prop.
expectError(Island({ component: Counter, initial: "3" }));

// Negative: missing required prop.
expectError(Island({ component: Counter }));

// IslandProps<P> preserves the concrete prop type of `P`.
declare const props: IslandProps<{ initial: number }>;
expectType<number>(props.initial);
