import slugify from "slugify";

/**
 * @typedef {object} Item
 * @prop {string} name
 * @prop {string} path
 */

/**
 * @typedef {object} GroupItem
 * @prop {string} name
 * @prop {Item[]} children
 */

/**
 * @typedef {object} Props
 * @prop {Array<Item|GroupItem>} nav
 */

/**
 * @param {Props} data
 */
function Desktop(data) {
  return (
    <nav class="hidden md:block">
      <ul class="flex items-center">
        {data.nav.map((item) =>
          "children" in item ? (
            <li key={item.name} class="relative" x-data="{ open: false }">
              <button
                id={`nav-button-${slugify(item.name)}`}
                aria-haspopup="menu"
                aria-controls={`nav-menu-${slugify(item.name)}`}
                class="jumpu-text-button"
                type="button"
                x-on:click="open = !open"
              >
                {item.name}
              </button>
              <ul
                id={`nav-menu-${slugify(item.name)}`}
                role="menu"
                aria-labelledby={`nav-button-${slugify(item.name)}`}
                class="jumpu-card p-2 max-h-[50vh] overflow-y-auto absolute top-full left-1/2 -translate-x-1/2 translate-y-2"
                x-cloak
                x-show="open"
                x-transition:enter="transition ease-out duration-75"
                x-transition:enter-start="opacity-0 -translate-y-[2.5%] scale-95"
                x-transition:leave="transition ease-in duration-75"
                x-transition:leave-end="opacity-0 -translate-y-[2.5%] scale-95"
                {...{ "x-on:click.outside": "open = false" }}
              >
                {item.children.map((child) => (
                  <li key={child.name} role="menuitem">
                    <a
                      class="jumpu-text-button w-full whitespace-nowrap"
                      href={child.path}
                    >
                      {child.name}
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ) : (
            <li key={item.name}>
              <a class="jumpu-text-button" href={item.path}>
                {item.name}
              </a>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}

/**
 * @param {Props} data
 */
function Mobile(data) {
  return (
    <div
      class="flex items-center ml-auto md:hidden"
      x-data="{ open: false }"
      x-init="$watch('open', open => open ? $el.ownerDocument.body.classList.add('overflow-hidden', '[&>:not(#nav-menu-mobile)]:invisible') : $el.ownerDocument.body.classList.remove('overflow-hidden', '[&>:not(#nav-menu-mobile)]:invisible'))"
    >
      <button
        id="nav-button-mobile"
        aria-controls="nav-menu-mobile"
        aria-describedby="nav-tooltip-mobile"
        class="jumpu-icon-button text-2xl w-12 h-12 group"
        type="button"
        x-on:click="open = true; modal = true"
      >
        <span class="icon-[material-symbols--menu]"></span>
        <span
          id="nav-tooltip-mobile"
          role="tooltip"
          class="![transform:translate(-50%,_225%)_scale(0)] group-hover:![transform:translate(-50%,_225%)_scale(1)]"
        >
          Menu
        </span>
      </button>
      <template x-teleport="body">
        <nav
          id="nav-menu-mobile"
          class="fixed top-0 left-0 w-screen h-screen bg-white overflow-y-auto"
          x-cloak
          x-show="open"
          x-transition:enter="transition ease-out duration-150"
          x-transition:enter-start="translate-x-full"
          x-transition:leave="transition ease-in duration-100"
          x-transition:leave-end="translate-x-full"
        >
          <button
            class="fixed top-2 right-4 jumpu-icon-button text-2xl w-12 h-12 group"
            aria-describedby="nav-tooltip-close"
            type="button"
            x-on:click="open = false; modal = false"
          >
            <span class="icon-[material-symbols--close]"></span>
            <span
              id="nav-tooltip-close"
              role="tooltip"
              class="![transform:translate(-50%,_225%)_scale(0)] group-hover:![transform:translate(-50%,_225%)_scale(1)]"
            >
              Close
            </span>
          </button>
          <ul class="flex flex-col py-16 px-4">
            {data.nav.map((item) => (
              <li key={item.name}>
                {item.children && (
                  <section class="mb-6">
                    <h2 class="text-lg mb-2 ml-4">{item.name}</h2>
                    <ul>
                      {item.children.map((child) => (
                        <li key={child.name}>
                          <a class="jumpu-text-button block" href={child.path}>
                            {child.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {item.path && (
                  <a class="jumpu-text-button block" href={item.path}>
                    {item.name}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </template>
    </div>
  );
}

/**
 * @param {Props} data
 */
export default function Header(data) {
  return (
    <header class="sticky top-0 bg-white mb-8 shadow">
      <div class="max-w-6xl mx-auto px-4 flex items-center justify-between md:justify-start gap-4 h-16">
        <a class="flex-shrink-0" href="/">
          {data.site.name}
        </a>
        <is-land on:visible import="https://unpkg.com/alpinejs">
          <Desktop {...data} />
          <Mobile {...data} />
        </is-land>
      </div>
    </header>
  );
}
