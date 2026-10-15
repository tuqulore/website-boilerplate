import { useSignal, useSignalEffect } from "@preact/signals";
import { clientComponent } from "@tuqulore-inc/eleventy-preset/island";
import { useId, useRef } from "preact/hooks";
import { twMerge } from "tailwind-merge";

/** @import { ComponentChildren, RefObject } from "preact" */
/** @import { EleventyData } from "@tuqulore-inc/eleventy-preset/eleventy" */

/** @param {{ item: { name: string }; children: ComponentChildren }} props */
function MenuList(props) {
  const open = useSignal(false);
  const visible = useSignal(open.value);
  const handleTransitionStart = () => {
    if (open.value) visible.value = true;
  };
  const handleTransitionEnd = () => {
    if (!open.value) visible.value = false;
  };
  /** @type {RefObject<HTMLDivElement>} */
  const ref = useRef(null);
  /** @type {RefObject<HTMLButtonElement>} */
  const buttonRef = useRef(null);
  const baseId = useId();
  useSignalEffect(() => {
    if (!open.value) return undefined;
    /** @param {MouseEvent} e */
    const clickHandler = (e) => {
      if (e.target instanceof Node && ref.current?.contains(e.target)) return;
      open.value = false;
    };
    /** @param {KeyboardEvent} e */
    const keyHandler = (e) => {
      if (e.key !== "Escape") return;
      if (!(e.target instanceof Node) || !ref.current?.contains(e.target)) return;
      open.value = false;
      buttonRef.current?.focus();
    };
    document.addEventListener("click", clickHandler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("click", clickHandler);
      document.removeEventListener("keydown", keyHandler);
    };
  });
  return (
    <div
      ref={ref}
      onFocusOut={(e) => {
        if (e.relatedTarget instanceof Node && ref.current?.contains(e.relatedTarget)) return;
        open.value = false;
      }}
    >
      <button
        id={`nav-button-${baseId}`}
        ref={buttonRef}
        aria-controls={`nav-menu-${baseId}`}
        aria-expanded={open.value}
        class="jumpu-text-button"
        type="button"
        onClick={() => (open.value = !open.value)}
      >
        {props.item.name}
      </button>
      <ul
        id={`nav-menu-${baseId}`}
        aria-labelledby={`nav-button-${baseId}`}
        class={twMerge(
          "jumpu-card absolute top-full left-1/2 max-h-[50vh] -translate-x-1/2 overflow-y-auto p-2",
          "translate-y-2 transition duration-75 ease-in-out",
          !open.value && "translate-y-[2.5%] scale-95 opacity-0",
          open.value || visible.value ? "visible" : "invisible",
        )}
        onTransitionStart={handleTransitionStart}
        onTransitionEnd={handleTransitionEnd}
      >
        {props.children}
      </ul>
    </div>
  );
}

/** @param {{ nav: EleventyData["nav"]; class?: string }} props */
function Desktop(props) {
  return (
    <nav class={props.class}>
      <ul class="flex items-center">
        {props.nav.map((item) =>
          item.children ? (
            <li key={item.name} class="relative">
              <MenuList item={item}>
                {item.children.map((child) => (
                  <li key={child.name}>
                    <a class="jumpu-text-button w-full whitespace-nowrap" href={child.path}>
                      {child.name}
                    </a>
                  </li>
                ))}
              </MenuList>
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

export default clientComponent(Desktop, import.meta.url);
