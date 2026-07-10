import { clientComponent } from "@tuqulore-inc/eleventy-preset/island";
import { useEffect, useRef, useState } from "preact/hooks";
import { twMerge } from "tailwind-merge";

function Mobile(props) {
  const [open, setOpen] = useState(false);
  const openButtonRef = useRef(null);
  const closeButtonRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const handler = (e) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      openButtonRef.current?.focus();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);
  return (
    <div class={props.class}>
      <button
        id="nav-button-mobile"
        ref={openButtonRef}
        aria-controls="nav-menu-mobile"
        aria-describedby="nav-tooltip-mobile"
        aria-expanded={open}
        aria-label="Menu"
        class="jumpu-icon-button group h-12 w-12 text-2xl"
        type="button"
        onClick={() => setOpen((v) => !v)}
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
      <div
        id="nav-menu-mobile"
        role="dialog"
        aria-modal="true"
        aria-label="Global navigation"
        inert={!open}
        class={twMerge(
          "fixed top-0 left-0 h-screen w-screen overflow-y-auto bg-white",
          "transition duration-150 ease-in-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <button
          ref={closeButtonRef}
          class="jumpu-icon-button group fixed top-2 right-4 h-12 w-12 text-2xl"
          aria-describedby="nav-tooltip-close"
          aria-label="Close"
          type="button"
          onClick={() => {
            setOpen(false);
            openButtonRef.current?.focus();
          }}
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
        <nav>
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
    </div>
  );
}

export default clientComponent(Mobile, import.meta.url);
