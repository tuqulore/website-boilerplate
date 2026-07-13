import fs from "node:fs/promises";
import preset from "@tuqulore-inc/eleventy-preset";

export default preset((eleventyConfig) => {
  // NOTE: preact-island の is-land.js passthrough copy は dest が "/" で登録されており、
  // dist ディレクトリが未作成のうちに実行されると dist 自体をファイルとして書き込む挙動になる。
  // Island を含まないサイト(docs は現状そう)ではこの空隙が build を壊すため、
  // preset 側の fix が入るまで dist を先に mkdir しておく。
  eleventyConfig.on("eleventy.before", async () => {
    await fs.mkdir("dist", { recursive: true });
  });
});
