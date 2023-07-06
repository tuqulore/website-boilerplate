const fetch = require("@11ty/eleventy-fetch");
const qs = require("qs");
const { PromisePool } = require("@supercharge/promise-pool");

const get = async (pathname, query) => {
  const q = qs.stringify(query, { encodeValuesOnly: true });
  const url = new URL(`${pathname}?${q}`, process.env.SERVER_URL);
  return fetch(url.href, { type: "json" });
};

/**
 * Function that get content from Strapi REST API
 * @param pathname Strapi REST API endpoint https://docs.strapi.io/dev-docs/api/rest
 * @param query Strapi REST API parameters https://docs.strapi.io/dev-docs/api/rest/parameters
 * @returns content
 */
module.exports = async (pathname, query) => {
  const result = await get(pathname, query);
  if (!("pagination" in result.meta)) return result.data;
  const { results, errors } = await PromisePool.withConcurrency(3)
    .for(
      Array.from(
        { length: result.meta.pagination.pageCount - 1 },
        (_, index) => index + 2,
      ),
    )
    .process((page) => {
      return get(pathname, { ...query, pagination: { page } });
    });
  if (errors.length > 0) {
    const [error] = errors;
    throw error;
  }
  const all = [result, ...results];
  return all.flatMap(({ data }) => data);
};
