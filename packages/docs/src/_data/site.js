if (!process.env.SITE_URL) {
  throw new Error(
    "SITE_URL is not set. Define it in .env (or the appropriate .env.{development,production}[.local]) so canonical/OGP URLs can be built.",
  );
}

export default {
  ja: {
    name: "Website Boilerplate",
    description:
      "Website を構築するときに便利な設計と実装のセット。tuqulore が現場で蓄えたものをボイラープレートとしてまとめ、公開しています。",
  },
  en: {
    name: "Website Boilerplate",
    description:
      "Design and implementation patterns for building websites. Published by tuqulore as a boilerplate.",
  },
  url: process.env.SITE_URL,
  author: "tuqulore inc.",
};
