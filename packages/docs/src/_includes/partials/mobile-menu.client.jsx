import { clientComponent } from "@tuqulore-inc/eleventy-preset/island";
import { useEffect, useRef, useState } from "preact/hooks";
import { twMerge } from "tailwind-merge";

function MobileMenu(props) {
  const [open, setOpen] = useState(false);
  const openButtonRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    // NOTE: メニュー展開中は body 背景のスクロールを止め、メニュー内スクロールが
    // 背後のページを動かす事故を防ぐ。
    document.documentElement.classList.add("overflow-hidden");
    const handler = (e) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      openButtonRef.current?.focus();
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      document.documentElement.classList.remove("overflow-hidden");
    };
  }, [open]);

  const isEn = props.locale === "en";
  const menuLabel = isEn ? "Documentation" : "ドキュメント";
  const openLabel = isEn
    ? "Open navigation menu"
    : "ナビゲーションメニューを開く";
  const closeLabel = isEn
    ? "Close navigation menu"
    : "ナビゲーションメニューを閉じる";

  return (
    <div class={props.class}>
      <button
        ref={openButtonRef}
        aria-controls="mobile-menu-nav"
        aria-expanded={open}
        aria-label={open ? closeLabel : openLabel}
        class="jumpu-icon-button h-12 w-12 text-2xl"
        type="button"
        onClick={() => setOpen(!open)}
      >
        <span class="icon-[material-symbols--menu]"></span>
      </button>
      <nav
        id="mobile-menu-nav"
        aria-label={menuLabel}
        inert={!open}
        class={twMerge(
          "fixed top-0 left-0 z-50 h-screen w-screen overflow-y-auto overscroll-contain bg-white",
          "transition duration-150 ease-in-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <button
          ref={closeButtonRef}
          class="jumpu-icon-button fixed top-2 right-4 h-12 w-12 text-2xl"
          aria-label={closeLabel}
          type="button"
          onClick={() => {
            setOpen(false);
            openButtonRef.current?.focus();
          }}
        >
          <span class="icon-[material-symbols--close]"></span>
        </button>
        <ul class="flex flex-col space-y-4 px-4 py-16">
          {props.nav.map((section) => (
            <li key={section.name}>
              {section.path ? (
                <a
                  href={section.path}
                  aria-current={
                    props.currentUrl === section.path ? "page" : undefined
                  }
                  class="block font-semibold aria-[current=page]:underline"
                >
                  {section.name}
                </a>
              ) : (
                <span class="block font-semibold">{section.name}</span>
              )}
              {section.children && (
                <ul class="mt-2 ml-4 space-y-2 border-l pl-3">
                  {section.children.map((child) => (
                    <li key={child.path}>
                      <a
                        href={child.path}
                        aria-current={
                          props.currentUrl === child.path ? "page" : undefined
                        }
                        class="block aria-[current=page]:underline"
                      >
                        {child.name}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export default clientComponent(MobileMenu, import.meta.url);
