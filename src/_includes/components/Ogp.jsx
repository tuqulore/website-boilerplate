/**
 * @typedef {object} Page
 * @prop {string} url
 */

/**
 * @typedef {import("../../_data/site")} Site
 */

/**
 * @typedef {object} Props
 * @prop {Page} page
 * @prop {Site} site
 * @prop {string=} title
 * @prop {string=} ogp
 */

/**
 * @param {Props} data
 */
export default function Ogp(data) {
  return (
    <>
      <meta
        property="og:description"
        content={data.description ?? data.site.description}
      />
      <meta property="og:site_name" content={data.site.name} />
      <meta property="og:title" content={data.title} />
      <meta property="og:type" content="website" />
      <meta
        property="og:url"
        content={new URL(data.site.url).origin.concat(data.page.url)}
      />
      <meta
        property="og:image"
        content={new URL(data.site.url).origin.concat(data.ogp ?? "ogp.png")}
      />
      <meta property="twitter:card" content="summary" />
    </>
  );
}
