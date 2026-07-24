import { useSignal, useSignalEffect } from "@preact/signals";
import { clientComponent } from "@tuqulore-inc/eleventy-preset/island";
import { useRef } from "preact/hooks";
import { twMerge } from "tailwind-merge";

function Mobile(props) {
  const open = useSignal(false);
  const openButtonRef = useRef(null);
  const closeButtonRef = useRef(null);
  useSignalEffect(() => {
    if (!open.value) return;
    closeButtonRef.current?.focus();
    // NOTE: メニュー表示中は背景 (html) のスクロールを止め、モバイルで
    // メニューをスクロールしたつもりが背後のページも動く事故を防ぐ。
    document.documentElement.classList.add("overflow-hidden");
    const handler = (e) => {
      if (e.key !== "Escape") return;
      open.value = false;
      openButtonRef.current?.focus();
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      document.documentElement.classList.remove("overflow-hidden");
    };
  });
  return (
    <div class={props.class}>
      <button
        id="nav-button-mobile"
        ref={openButtonRef}
        aria-controls="nav-menu-mobile"
        aria-expanded={open.value}
        aria-label={open.value ? "Close navigation menu" : "Open navigation menu"}
        class="jumpu-icon-button h-12 w-12 text-2xl"
        type="button"
        onClick={() => (open.value = !open.value)}
      >
        <span class="icon-[material-symbols--menu]"></span>
      </button>
      <nav
        id="nav-menu-mobile"
        aria-label="Global navigation"
        inert={!open.value}
        class={twMerge(
          "fixed top-0 left-0 h-screen w-screen overflow-y-auto overscroll-contain bg-white",
          "transition duration-150 ease-in-out",
          open.value ? "translate-x-0" : "translate-x-full",
        )}
      >
        <button
          ref={closeButtonRef}
          class="jumpu-icon-button fixed top-2 right-4 h-12 w-12 text-2xl"
          aria-label="Close navigation menu"
          type="button"
          onClick={() => {
            open.value = false;
            openButtonRef.current?.focus();
          }}
        >
          <span class="icon-[material-symbols--close]"></span>
        </button>
        <ul class="flex flex-col px-4 py-16">
          {props.nav.map((item) => (
            <li key={item.name}>
              {item.children && (
                <div class="mb-6">
                  <p id={`nav-mobile-group-${item.name}`} class="mb-2 ml-4 text-lg">
                    {item.name}
                  </p>
                  <ul aria-labelledby={`nav-mobile-group-${item.name}`}>
                    {item.children.map((child) => (
                      <li key={child.name}>
                        <a class="jumpu-text-button block" href={child.path}>
                          {child.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
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

export default clientComponent(Mobile, import.meta.url);
