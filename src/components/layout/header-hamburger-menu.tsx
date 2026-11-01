"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const MENU_LINKS = [
  { href: "/matches", label: "Kèo đang mở" },
  { href: "/my-matches", label: "Kèo của tôi" },
  { href: "/teams", label: "Đội của tôi" },
  { href: "/tournaments", label: "Giải đấu" },
  { href: "/my-tournaments", label: "Giải của tôi" },
  { href: "/notifications", label: "Thông báo" },
];

export function HeaderHamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="header-hamburger-menu"
        aria-label="Mở menu"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex h-12 w-12 cursor-pointer items-center justify-center text-primary transition-colors hover:text-brand"
      >
        <Menu className="size-6" />
      </button>

      {isOpen ? (
        <div
          id="header-hamburger-menu"
          className="absolute left-0 top-14 w-56 overflow-hidden rounded-2xl border border-line bg-surface shadow-lg"
        >
          <nav className="flex flex-col p-1.5">
            {MENU_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-surface-muted"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </div>
  );
}