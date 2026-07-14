import "./ResizeHandle.css";

/**
 * Thin draggable divider that resizes a neighbouring panel.
 * direction = 1  -> dragging right grows the panel (handle on panel's right edge)
 * direction = -1 -> dragging left grows the panel (handle on panel's left edge)
 */
export default function ResizeHandle({ width, setWidth, min = 180, max = 480, direction = 1 }) {
  const onMouseDown = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev) => {
      const next = startWidth + (ev.clientX - startX) * direction;
      setWidth(Math.max(min, Math.min(max, next)));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
    <div
      className="resize-handle"
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation="vertical"
    />
  );
}
