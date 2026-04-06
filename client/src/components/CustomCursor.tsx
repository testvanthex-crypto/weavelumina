import { useEffect, useRef } from "react";

/**
 * Global custom cursor + follower used across pages.
 * Matches the home hero styling and reuses existing CSS classes in index.css.
 */
export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const followerRef = useRef<HTMLDivElement>(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const cursorPos = useRef({ x: 0, y: 0 });
  const followerPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || typeof target.closest !== "function") return;
      if (
        target.closest(
          "a, button, [role=\"button\"], .interactive, input, textarea, select"
        )
      ) {
        document.body.classList.add("cursor-hover");
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || typeof target.closest !== "function") return;
      if (
        target.closest(
          "a, button, [role=\"button\"], .interactive, input, textarea, select"
        )
      ) {
        document.body.classList.remove("cursor-hover");
      }
    };

    const handleMouseDown = () => document.body.classList.add("cursor-click");
    const handleMouseUp = () => document.body.classList.remove("cursor-click");

    const animateCursor = () => {
      cursorPos.current.x += (mousePos.current.x - cursorPos.current.x) * 0.3;
      cursorPos.current.y += (mousePos.current.y - cursorPos.current.y) * 0.3;
      followerPos.current.x += (mousePos.current.x - followerPos.current.x) * 0.12;
      followerPos.current.y += (mousePos.current.y - followerPos.current.y) * 0.12;

      if (cursorRef.current) {
        cursorRef.current.style.left = `${cursorPos.current.x - 4}px`;
        cursorRef.current.style.top = `${cursorPos.current.y - 4}px`;
      }
      if (followerRef.current) {
        followerRef.current.style.left = `${followerPos.current.x - 18}px`;
        followerRef.current.style.top = `${followerPos.current.y - 18}px`;
      }
      requestAnimationFrame(animateCursor);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);
    requestAnimationFrame(animateCursor);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.classList.remove("cursor-hover", "cursor-click");
    };
  }, []);

  return (
    <>
      <div ref={cursorRef} className="custom-cursor hidden md:block" />
      <div ref={followerRef} className="cursor-follower hidden md:block" />
    </>
  );
}
