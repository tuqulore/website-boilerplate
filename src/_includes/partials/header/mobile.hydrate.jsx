import { useState } from "preact/hooks";

export default function Mobile(props) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="flex items-center ml-auto md:hidden"
      x-init="$watch('open', open => open ? $el.ownerDocument.body.classList.add('overflow-hidden', '[&>:not(#nav-menu-mobile)]:invisible') : $el.ownerDocument.body.classList.remove('overflow-hidden', '[&>:not(#nav-menu-mobile)]:invisible'))"
    >
      <button
        id="nav-button-mobile"
        aria-controls="nav-menu-mobile"
        aria-describedby="nav-tooltip-mobile"
        className="jumpu-icon-button text-2xl w-12 h-12 group"
        type="button"
        onClick={() => setOpen(true)}
      >
        <span className="icon-[material-symbols--menu]"></span>
        <span
          id="nav-tooltip-mobile"
          role="tooltip"
          className="![transform:translate(-50%,_225%)_scale(0)] group-hover:![transform:translate(-50%,_225%)_scale(1)]"
        >
          Menu
        </span>
      </button>
      {open && (
        <nav
          id="nav-menu-mobile"
          className="fixed top-0 left-0 w-screen h-screen bg-white overflow-y-auto"
        >
          <button
            className="fixed top-2 right-4 jumpu-icon-button text-2xl w-12 h-12 group"
            aria-describedby="nav-tooltip-close"
            type="button"
            onClick={() => setOpen(false)}
          >
            <span className="icon-[material-symbols--close]"></span>
            <span
              id="nav-tooltip-close"
              role="tooltip"
              className="![transform:translate(-50%,_225%)_scale(0)] group-hover:![transform:translate(-50%,_225%)_scale(1)]"
            >
              Close
            </span>
          </button>
          <ul className="flex flex-col py-16 px-4">
            {props.nav.map((item, itemIndex) => (
              <li key={`${item.name}-${itemIndex}`}>
                {item.children && (
                  <section className="mb-6">
                    <h2 className="text-lg mb-2 ml-4">{item.name}</h2>
                    <ul>
                      {item.children.map((child, childIndex) => (
                        <li key={`${child.name}-${childIndex}`}>
                          <a
                            className="jumpu-text-button block"
                            href={child.path}
                          >
                            {child.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {item.path && (
                  <a className="jumpu-text-button block" href={item.path}>
                    {item.name}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
