if (!process.env.SITE_URL) {
  throw new Error(
    "SITE_URL is not set. Define it in .env (or the appropriate .env.{development,production}[.local]) so canonical/OGP URLs can be built.",
  );
}

export default {
  description:
    "@tuqulore-inc/website-boilerplate の公式ドキュメント。Getting Started、設計思想、応用ケース、ロードマップを日英で提供する。",
  name: "@tuqulore-inc docs",
  url: process.env.SITE_URL,
  author: "tuqulore inc.",
};
