import Ogp from "./components/Ogp";
import Header from "./components/Header";
import Footer from "./components/Footer";

/**
 * @typedef {import("../_data/site")} Site
 */

/**
 * @typedef {object} Props
 * @prop {Site} site
 * @prop {string=} title
 * @prop {string} content
 */

/**
 * @param {Props} data
 */
export default function Base(data) {
  return (
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <Ogp {...data} />
        <link rel="stylesheet" href="/main.css" />
        <title>
          {data.title && `${data.title} | `}
          {data.site.name}
        </title>
        <script type="module" defer src="/is-land.js"></script>
        <script type="module" defer src="/is-land-autoinit.js"></script>
      </head>
      <body>
        <Header {...data} />
        <div
          class="max-w-6xl mx-auto px-4 min-h-[60vh] mb-4"
          dangerouslySetInnerHTML={{ __html: data.content }}
        ></div>
        <Footer {...data} />
      </body>
    </html>
  );
}
