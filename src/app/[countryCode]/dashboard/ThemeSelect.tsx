// src/app/[countryCode]/dashboard/ThemeSelect.tsx
"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

/** One row of a ThemeSelect. `label` may be a node, e.g. a font preview. */
export interface ThemeSelectOption {
  value: string;
  label: React.ReactNode;
  /** Plain text used for type-ahead when `label` is not a string. */
  text?: string;
  disabled?: boolean;
  /** Per-option inline style, e.g. a font preview for a font-family list. */
  style?: React.CSSProperties;
}

interface ThemeSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: ThemeSelectOption[];
  /** Shown when no option matches `value`. */
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  /** Accessible name, for selects whose visible label sits elsewhere. */
  ariaLabel?: string;
  /** Inline style for the trigger (width, padding, font size, …). */
  style?: React.CSSProperties;
  className?: string;
  /** Floor for the popup width; defaults to the trigger's width. */
  menuMinWidth?: number;
}

const MENU_MAX_HEIGHT = 300;
const EDGE = 8;

// useLayoutEffect warns during SSR, and the popup only ever mounts on the
// client, so fall back to useEffect on the server pass.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * A custom select that follows the reseller store theme. The native control's
 * popup is painted by the OS and ignores the theme, so this renders its own
 * listbox in a portal (escaping the modal/overflow containers) and drives it
 * with the standard combobox keyboard and ARIA contract.
 */
export default function ThemeSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  id,
  ariaLabel,
  style,
  className,
  menuMinWidth,
}: ThemeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menu, setMenu] = useState<{
    left: number;
    width: number;
    maxHeight: number;
    top?: number;
    bottom?: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const typeahead = useRef({ query: "", at: 0 });
  const listboxId = useId();

  const selectedIndex = useMemo(
    () => options.findIndex((o) => o.value === value),
    [options, value],
  );
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  useEffect(() => setMounted(true), []);

  // Walk from `from` in `step` direction to the next row that is not disabled.
  const firstEnabled = useCallback(
    (from: number, step: number) => {
      if (!options.length) return -1;
      let i = from;
      for (let n = 0; n < options.length; n++) {
        i = (i + step + options.length) % options.length;
        if (!options[i]?.disabled) return i;
      }
      return -1;
    },
    [options],
  );

  const positionMenu = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.max(rect.width, menuMinWidth ?? 0);
    const rtl =
      (document.documentElement.getAttribute("dir") || "ltr") === "rtl";

    // Align to the trigger's leading edge, then keep the popup on screen.
    let left = rtl ? rect.right - width : rect.left;
    left = Math.min(Math.max(EDGE, left), Math.max(EDGE, vw - width - EDGE));

    // Flip above the trigger when there is more room up there than below.
    const spaceBelow = vh - rect.bottom - EDGE - 6;
    const spaceAbove = rect.top - EDGE - 6;
    const openUp = spaceBelow < Math.min(MENU_MAX_HEIGHT, spaceAbove);
    const maxHeight = Math.max(
      120,
      Math.min(MENU_MAX_HEIGHT, openUp ? spaceAbove : spaceBelow),
    );

    setMenu(
      openUp
        ? { left, width, maxHeight, bottom: vh - rect.top + 6 }
        : { left, width, maxHeight, top: rect.bottom + 6 },
    );
  }, [menuMinWidth]);

  const close = useCallback((focusTrigger = false) => {
    setIsOpen(false);
    setMenu(null);
    if (focusTrigger) triggerRef.current?.focus();
  }, []);

  const open = useCallback(() => {
    if (disabled) return;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : firstEnabled(-1, 1));
    setIsOpen(true);
  }, [disabled, selectedIndex, firstEnabled]);

  useIsoLayoutEffect(() => {
    if (!isOpen) return;
    positionMenu();
    const onMove = () => positionMenu();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [isOpen, positionMenu]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target))
        return;
      close();
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [isOpen, close]);

  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    menuRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [isOpen, activeIndex]);

  const commit = useCallback(
    (index: number) => {
      const option = options[index];
      if (!option || option.disabled) return;
      onChange(option.value);
      close(true);
    },
    [options, onChange, close],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!isOpen) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        open();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => firstEnabled(i, 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => firstEnabled(i, -1));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(firstEnabled(-1, 1));
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(firstEnabled(options.length, -1));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(activeIndex);
        break;
      case "Escape":
        e.preventDefault();
        close(true);
        break;
      case "Tab":
        close();
        break;
      default: {
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          const now = Date.now();
          const buffer =
            now - typeahead.current.at > 600 ? "" : typeahead.current.query;
          const query = (buffer + e.key).toLowerCase();
          typeahead.current = { query, at: now };
          const start = activeIndex >= 0 ? activeIndex : 0;
          for (let n = 1; n <= options.length; n++) {
            const i = (start + n) % options.length;
            const option = options[i];
            const haystack = (
              option?.text ??
              (typeof option?.label === "string" ? option.label : option?.value) ??
              ""
            ).toLowerCase();
            if (option && !option.disabled && haystack.startsWith(query)) {
              setActiveIndex(i);
              break;
            }
          }
        }
      }
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        className={`theme-select-trigger${className ? ` ${className}` : ""}`}
        style={style}
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-label={ariaLabel}
        aria-activedescendant={
          isOpen && activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
        }
        data-open={isOpen}
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={onKeyDown}
      >
        <span
          className="theme-select-value"
          data-placeholder={!selectedOption}
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className="theme-select-chevron" />
      </button>

      {mounted &&
        isOpen &&
        menu &&
        createPortal(
          <div
            ref={menuRef}
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel}
            className="theme-select-menu"
            style={{
              top: menu.top,
              bottom: menu.bottom,
              left: menu.left,
              width: menu.width,
              maxHeight: menu.maxHeight,
            }}
          >
            {options.map((option, index) => (
              <button
                key={option.value || `__empty_${index}`}
                id={`${listboxId}-opt-${index}`}
                data-index={index}
                type="button"
                role="option"
                aria-selected={index === selectedIndex}
                disabled={option.disabled}
                className="theme-select-option"
                style={option.style}
                data-active={index === activeIndex}
                onMouseEnter={() => !option.disabled && setActiveIndex(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(index)}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {option.label}
                </span>
                {index === selectedIndex && (
                  <Check size={14} className="theme-select-check" />
                )}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
