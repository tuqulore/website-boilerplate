export const data = {
  layout: "Base",
};

/**
 * @typedef {object} Props
 * @prop {string} content
 */

/**
 * @param {Props} data
 */
export default function Post(data) {
  return (
    <article class="prose" dangerouslySetInnerHTML={{ __html: data.content }} />
  );
}
