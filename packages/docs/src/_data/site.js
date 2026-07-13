if (!process.env.SITE_URL) {
  throw new Error(
    "SITE_URL is not set. Define it in .env (or the appropriate .env.{development,production}[.local]) so canonical/OGP URLs can be built.",
  );
}

export default {
  description:
    "Website を構築するときに便利な設計と実装のセット。tuqulore が現場で蓄えたものをボイラープレートとしてまとめ、公開しています。",
  name: "Website Boilerplate",
  url: process.env.SITE_URL,
  author: "tuqulore inc.",
};
