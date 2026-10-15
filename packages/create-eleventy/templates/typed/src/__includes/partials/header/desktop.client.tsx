import { useSignal, useSignalEffect } from "@preact/signals";
import type { EleventyData } from "@tuqulore-inc/eleventy-preset/eleventy";
import { clientComponent } from "@tuqulore-inc/eleventy-preset/island";
import type { ComponentChildren } from "preact";
import { useId, useRef } from "preact/hooks";
import { twMerge } from "tailwind-merge";

type MenuListProps = {
  item: { name: string };
  children: ComponentChildren;
};

function MenuList(props: MenuListProps) {
  const open = useSignal(false);
  const visible = useSignal(open.value);
  const handleTransitionStart = () => {
    if (open.value) visible.value = true;
  };
  const handleTransitionEnd = () => {
    if (!open.value) visible.value = false;
  };
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const baseId = useId();
  useSignalEffect(() => {
    if (!open.value) return undefined;
    const clickHandler = (e: MouseEvent) => {
      if (e.target instanceof Node && ref.current?.contains(e.target)) return;
      open.value = false;
    };
    const keyHandler = (e: KeyboardEvent) => {
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

type DesktopProps = {
  nav: EleventyData["nav"];
  class?: string;
};

function Desktop(props: DesktopProps) {
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
