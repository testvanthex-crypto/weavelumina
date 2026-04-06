import { useEffect, useRef } from 'react';

export function MagneticCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const followerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const followerRef2 = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };

      if (cursorRef.current) {
        cursorRef.current.style.left = `${e.clientX}px`;
        cursorRef.current.style.top = `${e.clientY}px`;
      }
    };

    const animate = () => {
      if (followerRef.current) {
        followerRef2.current.x += (mouseRef.current.x - followerRef2.current.x) * 0.15;
        followerRef2.current.y += (mouseRef.current.y - followerRef2.current.y) * 0.15;

        followerRef.current.style.left = `${followerRef2.current.x}px`;
        followerRef.current.style.top = `${followerRef2.current.y}px`;
      }
      requestAnimationFrame(animate);
    };

    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && typeof target.closest === 'function' && target.closest('.interactive')) {
        document.body.classList.add('cursor-hover');
      }
    };

    const handleMouseLeave = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && typeof target.closest === 'function' && !target.closest('.interactive')) {
        document.body.classList.remove('cursor-hover');
      }
    };

    const handleMouseDown = () => {
      document.body.classList.add('cursor-click');
    };

    const handleMouseUp = () => {
      document.body.classList.remove('cursor-click');
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseenter', handleMouseEnter, true);
    document.addEventListener('mouseleave', handleMouseLeave, true);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    const animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseenter', handleMouseEnter, true);
      document.removeEventListener('mouseleave', handleMouseLeave, true);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <>
      <div
        ref={cursorRef}
        className="fixed w-3 h-3 bg-[#C9A84C] rounded-full pointer-events-none z-[99999] mix-blend-difference transition-all duration-100"
        style={{ transform: 'translate(-50%, -50%)' }}
      />
      <div
        ref={followerRef}
        className="fixed w-10 h-10 border border-[rgba(201,168,76,0.5)] rounded-full pointer-events-none z-[99998] transition-all duration-150"
        style={{ transform: 'translate(-50%, -50%)' }}
      />
    </>
  );
}
