import { useState } from "preact/hooks";
import { twMerge } from "tailwind-merge";

export default function Mobile(props) {
  const [open, setOpen] = useState(false);
  return (
    <div class={props.class}>
      <button
        id="nav-button-mobile"
        aria-controls="nav-menu-mobile"
        aria-describedby="nav-tooltip-mobile"
        class="jumpu-icon-button group h-12 w-12 text-2xl"
        type="button"
        onClick={() => setOpen(true)}
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
      <nav
        id="nav-menu-mobile"
        class={twMerge(
          "fixed top-0 left-0 h-screen w-screen overflow-y-auto bg-white",
          "transition duration-150 ease-in-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <button
          class="jumpu-icon-button group fixed top-2 right-4 h-12 w-12 text-2xl"
          aria-describedby="nav-tooltip-close"
          type="button"
          onClick={() => setOpen(false)}
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
        <ul class="flex flex-col px-4 py-16">
          {props.nav.map((item, itemIndex) => (
            <li key={`${item.name}-${itemIndex}`}>
              {item.children && (
                <section class="mb-6">
                  <h2 class="mb-2 ml-4 text-lg">{item.name}</h2>
                  <ul>
                    {item.children.map((child, childIndex) => (
                      <li key={`${child.name}-${childIndex}`}>
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
    </div>
  );
}
