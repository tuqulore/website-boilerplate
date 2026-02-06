import { useState, useRef, useEffect } from "preact/hooks";
import slugify from "slugify";
import { twMerge } from "tailwind-merge";

function MenuList(props) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(open);
  const handleTransitionStart = () => open && setVisible(true);
  const handleTransitionEnd = () => !open && setVisible(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [ref.current, setOpen]);
  return (
    <div role="presentation" ref={ref}>
      <button
        id={`nav-button-${slugify(props.item.name)}`}
        aria-haspopup="menu"
        aria-controls={`nav-menu-${slugify(props.item.name)}`}
        class="jumpu-text-button"
        type="button"
        onClick={() => setOpen(!open)}
      >
        {props.item.name}
      </button>
      <ul
        id={`nav-menu-${slugify(props.item.name)}`}
        role="menu"
        aria-labelledby={`nav-button-${slugify(props.item.name)}`}
        class={twMerge(
          "jumpu-card absolute top-full left-1/2 max-h-[50vh] -translate-x-1/2 overflow-y-auto p-2",
          "translate-y-2 transition duration-75 ease-in-out",
          !open && "translate-y-[2.5%] scale-95 opacity-0",
          open || visible ? "visible" : "invisible",
        )}
        onTransitionStart={handleTransitionStart}
        onTransitionEnd={handleTransitionEnd}
      >
        {props.children}
      </ul>
    </div>
  );
}

export default function Desktop(props) {
  return (
    <nav class={props.class}>
      <ul class="flex items-center">
        {props.nav.map((item, itemIndex) =>
          "children" in item ? (
            <li key={`${item.name}-${itemIndex}`} class="relative">
              <MenuList item={item}>
                {item.children.map((child, childIndex) => (
                  <li key={`${child.name}-${childIndex}`} role="menuitem">
                    <a
                      class="jumpu-text-button w-full whitespace-nowrap"
                      href={child.path}
                    >
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
