// Polyfill ES2022 cho trình duyệt cũ (vd iOS Safari < 15.4) không có Object.hasOwn.
// @base-ui/react (Dialog/Select/Popover/...) dùng Object.hasOwn -> nếu thiếu thì
// bundle throw TypeError khi hydrate -> toàn bộ client component "chết" (nút
// dialog, filter, form input không chạy). Import file này ĐẦU TIÊN ở root layout.
// Phải chạy trước khi React hydrate -> đặt ở top-level, đồng bộ.

if (typeof Object.hasOwn !== "function") {
  Object.hasOwn = function hasOwn(obj: unknown, key: PropertyKey): boolean {
    if (obj == null) {
      // Bắt chước hành vi Object.hasOwn(null/undefined) throw TypeError.
      throw new TypeError("Cannot convert undefined or null to object");
    }
    return Object.prototype.hasOwnProperty.call(obj as object, key);
  } as typeof Object.hasOwn;
}
