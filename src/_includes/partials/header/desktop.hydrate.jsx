import slugify from "slugify";
import { useState } from "preact/hooks";
import { twMerge } from "tailwind-merge";

function MenuList(props) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(open);
  const handleTransitionStart = () => open && setVisible(true);
  const handleTransitionEnd = () => !open && setVisible(false);
  return (
    <>
      <button
        id={`nav-button-${slugify(props.item.name)}`}
        aria-haspopup="menu"
        aria-controls={`nav-menu-${slugify(props.item.name)}`}
        className="jumpu-text-button"
        type="button"
        onClick={() => setOpen(!open)}
      >
        {props.item.name}
      </button>
      <ul
        id={`nav-menu-${slugify(props.item.name)}`}
        role="menu"
        aria-labelledby={`nav-button-${slugify(props.item.name)}`}
        className={twMerge(
          "jumpu-card p-2 max-h-[50vh] overflow-y-auto absolute top-full left-1/2 -translate-x-1/2",
          "transition ease-in-out duration-75 translate-y-2",
          !open && "opacity-0 translate-y-[2.5%] scale-95",
          open || visible ? "visible" : "invisible",
        )}
        onTransitionStart={handleTransitionStart}
        onTransitionEnd={handleTransitionEnd}
      >
        {props.children}
      </ul>
    </>
  );
}

export default function Desktop(props) {
  return (
    <nav className="hidden md:block">
      <ul className="flex items-center">
        {props.nav.map((item, itemIndex) =>
          "children" in item ? (
            <li key={`${item.name}-${itemIndex}`} className="relative">
              <MenuList item={item}>
                {item.children.map((child, childIndex) => (
                  <li key={`${child.name}-${childIndex}`} role="menuitem">
                    <a
                      className="jumpu-text-button w-full whitespace-nowrap"
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
              <a className="jumpu-text-button" href={item.path}>
                {item.name}
              </a>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
