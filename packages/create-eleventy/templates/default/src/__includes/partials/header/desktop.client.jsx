import { useSignal, useSignalEffect } from "@preact/signals";
import { clientComponent } from "@tuqulore-inc/eleventy-preset/island";
import { useRef } from "preact/hooks";
import slugify from "slugify";
import { twMerge } from "tailwind-merge";

function MenuList(props) {
  const open = useSignal(false);
  const visible = useSignal(open.value);
  const handleTransitionStart = () => {
    if (open.value) visible.value = true;
  };
  const handleTransitionEnd = () => {
    if (!open.value) visible.value = false;
  };
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const slug = `${slugify(props.item.name)}-${props.index}`;
  useSignalEffect(() => {
    if (!open.value) return;
    const clickHandler = (e) => {
      if (ref.current?.contains(e.target)) return;
      open.value = false;
    };
    const keyHandler = (e) => {
      if (e.key !== "Escape") return;
      if (!ref.current?.contains(e.target)) return;
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
        if (ref.current?.contains(e.relatedTarget)) return;
        open.value = false;
      }}
    >
      <button
        id={`nav-button-${slug}`}
        ref={buttonRef}
        aria-controls={`nav-menu-${slug}`}
        aria-expanded={open.value}
        class="jumpu-text-button"
        type="button"
        onClick={() => (open.value = !open.value)}
      >
        {props.item.name}
      </button>
      <ul
        id={`nav-menu-${slug}`}
        aria-labelledby={`nav-button-${slug}`}
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

function Desktop(props) {
  return (
    <nav class={props.class}>
      <ul class="flex items-center">
        {props.nav.map((item, itemIndex) =>
          "children" in item ? (
            <li key={`${item.name}-${itemIndex}`} class="relative">
              <MenuList item={item} index={itemIndex}>
                {item.children.map((child, childIndex) => (
                  <li key={`${child.name}-${childIndex}`}>
                    <a class="jumpu-text-button w-full whitespace-nowrap" href={child.path}>
                      {child.name}
                    </a>
                  </li>
                ))}
              </MenuList>
            </li>
          ) : (
            <li key={`${item.name}-${itemIndex}`}>
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
