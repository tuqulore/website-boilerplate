const fetch = require("@11ty/eleventy-fetch");
const qs = require("qs");

/**
 * Function that get content from Strapi REST API
 * @param url API endpoint https://docs.strapi.io/developer-docs/latest/developer-resources/database-apis-reference/rest-api.html
 * @param query API parameter https://docs.strapi.io/developer-docs/latest/developer-resources/database-apis-reference/rest/api-parameters.html
 * @returns content
 */
module.exports = async (url, query) => {
  const { origin } = new URL(process.env.SERVER_URL);
  const q = qs.stringify(query, { encodeValuesOnly: true });
  const body = await fetch(`${origin}${url}?${q}`, { type: "json" });
  if (!("pagination" in body.meta)) return body.data;
  const bodies = await Promise.all(
    [...Array(body.meta.pagination.pageCount - 1)].map((_, index) => {
      const q = qs.stringify(
        {
          ...query,
          pagination: {
            page: index + 2,
          },
        },
        { encodeValuesOnly: true }
      );
      return fetch(`${origin}${url}?${q}`, { type: "json" });
    })
  );
  const all = [body, ...bodies];
  return all.flatMap((body) => body.data);
};
