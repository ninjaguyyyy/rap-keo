"use client";

// Combobox khu vực: autocomplete 4 sân cố định + cho phép nhập text tự do.
// - Gõ -> filter option theo label (case-insensitive, includes).
// - Click option -> set value = label, đóng dropdown.
// - Text không match -> vẫn giữ (free text). Submit nguyên text qua hidden input.
// Build tay trên native input + div (không thêm dependency).
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { areaLabels } from "../labels";

const OPTIONS = Object.entries(areaLabels) as [string, string][];

export function AreaCombobox({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  // Filter option theo text nhập (case-insensitive, includes trên label).
  const filtered = OPTIONS.filter(([, label]) =>
    label.toLowerCase().includes(value.trim().toLowerCase()),
  );

  // Đóng dropdown khi click ngoài (delay để click option kịp register).
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.parentElement?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function selectOption(label: string) {
    onChange(label);
    setOpen(false);
    setActiveIdx(-1);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % Math.max(filtered.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? filtered.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIdx >= 0 && filtered[activeIdx]) {
      e.preventDefault();
      selectOption(filtered[activeIdx][1]);
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        // Free text: giữ value nguyên (label hoặc text tự do).
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveIdx(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        required={required}
        placeholder="VD: Sân Trung Tâm, Đa Phước, ..."
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && activeIdx >= 0 && filtered[activeIdx]
            ? `${listboxId}-${activeIdx}`
            : undefined
        }
        className="h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      {/* Hidden input: submit value (label hoặc free text) qua name="area". */}
      <input type="hidden" name="area" value={value} />

      {/* Dropdown list option (filtered). Ẩn nếu không có match. */}
      {open && filtered.length > 0 ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-line bg-popover py-1 text-sm shadow-md"
        >
          {filtered.map(([key, label], idx) => (
            <li
              key={key}
              id={`${listboxId}-${idx}`}
              role="option"
              aria-selected={idx === activeIdx}
              onMouseDown={(e) => {
                // mouseDown (không click) để chạy trước blur.
                e.preventDefault();
                selectOption(label);
              }}
              onMouseEnter={() => setActiveIdx(idx)}
              className={cn(
                "cursor-default px-3 py-2",
                idx === activeIdx ? "bg-muted text-foreground" : "text-foreground",
              )}
            >
              {label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
