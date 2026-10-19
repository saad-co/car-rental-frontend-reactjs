import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HorizontaLDots } from "../../icons";
import { DropdownItem } from "../ui/dropdown/DropdownItem";

/** One action in a row's menu: its label and the page it opens. */
export interface RowAction {
  label: string;
  to: string;
}

/** Room the menu needs below the button before it opens upward instead (pixels). */
const MENU_ROOM = 8 + 40 * 3;

/** Where the open menu sits on the screen (it is `position: fixed`, so it is never clipped by the table). */
interface MenuPosition {
  right: number;
  top?: number;
  bottom?: number;
}

/**
 * The "⋯" button at the end of a table row, and the menu of actions for that row. The menu is drawn in a portal on
 * `document.body` with fixed coordinates: the table sits in a box that scrolls sideways, and a menu positioned inside
 * it would be cut off on the last rows. It opens upward when there is no room below, and closes on a click outside,
 * Escape, scrolling or resizing (its position would be wrong after those).
 *
 * Clicks here never count as a click on the row (which opens the driver): React sends events from a portal up to the
 * parent row too, so both the button and the menu stop them.
 */
export default function RowActionsMenu({
  label,
  actions,
}: {
  /** What the button says to a screen reader, e.g. "Actions for Pat Driver". */
  label: string;
  actions: RowAction[];
}) {
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isOpen = position !== null;

  useEffect(() => {
    if (!isOpen) return;
    const close = () => setPosition(null);
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !menuRef.current?.contains(target) &&
        !buttonRef.current?.contains(target)
      ) {
        close();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    // `true`: scrolling inside the table's own scroll box does not bubble, but it can be caught while capturing.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [isOpen]);

  const toggle = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (isOpen) {
      setPosition(null);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const right = window.innerWidth - rect.right;
    const room = window.innerHeight - rect.bottom;
    setPosition(
      room < MENU_ROOM
        ? { right, bottom: window.innerHeight - rect.top + 4 }
        : { right, top: rect.bottom + 4 },
    );
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={toggle}
        className="inline-flex size-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      >
        <HorizontaLDots className="size-5 fill-current" />
      </button>
      {position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            // Stops a click on the menu from also opening the row it belongs to.
            onClick={(event) => event.stopPropagation()}
            style={position}
            className="fixed z-99999 w-48 rounded-xl border border-gray-200 bg-white p-1.5 shadow-theme-lg"
          >
            {actions.map((action) => (
              <DropdownItem
                key={action.to}
                tag="a"
                to={action.to}
                onItemClick={() => setPosition(null)}
                baseClassName="block w-full rounded-lg px-3 py-2 text-start text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                {action.label}
              </DropdownItem>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
