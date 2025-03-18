import slugify from "slugify";
import { useState } from "preact/hooks";

function Desktop(props) {
  const [open, setOpen] = useState(false);
  return (
    <nav className="hidden md:block">
      <ul className="flex items-center">
        {props.nav.map((item, itemIndex) =>
          "children" in item ? (
            <li key={`${item.name}-${itemIndex}`} className="relative">
              <button
                id={`nav-button-${slugify(item.name)}`}
                aria-haspopup="menu"
                aria-controls={`nav-menu-${slugify(item.name)}`}
                className="jumpu-text-button"
                type="button"
                onClick={() => setOpen(!open)}
              >
                {item.name}
              </button>
              {open && (
                <ul
                  id={`nav-menu-${slugify(item.name)}`}
                  role="menu"
                  aria-labelledby={`nav-button-${slugify(item.name)}`}
                  className="jumpu-card p-2 max-h-[50vh] overflow-y-auto absolute top-full left-1/2 -translate-x-1/2 translate-y-2"
                >
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
                </ul>
              )}
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

export default function Template(props) {
  return <Desktop {...props} />;
}
