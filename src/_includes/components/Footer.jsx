/**
 * @typedef {import("../../_data/site")} Site
 */

/**
 * @typedef {object} Props
 * @prop {Site} site
 */

/**
 * @param {Props} data
 */
export default function Footer(data) {
  return (
    <footer class="max-w-6xl mx-auto px-4">
      <p class="text-center">&copy; {data.site.author}</p>
    </footer>
  );
}
