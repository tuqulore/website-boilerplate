if (!process.env.SITE_URL) {
  throw new Error(
    "SITE_URL is not set. Define it in .env (or the appropriate .env.{development,production}[.local]) so canonical/OGP URLs can be built.",
  );
}

export default {
  description: "Site Description",
  name: "Site Name",
  url: process.env.SITE_URL,
  author: "Site Author",
};
