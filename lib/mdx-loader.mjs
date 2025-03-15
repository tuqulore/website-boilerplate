import { createLoader } from "@mdx-js/node-loader";

export const { load } = createLoader({ jsxImportSource: "preact" });
