import { useCursor } from '../../hooks/useMotion';

export default function Cursor() {
  const { dotRef, ringRef } = useCursor();
  return (
    <>
      <div ref={dotRef as any}  className="cursor-dot"  aria-hidden="true" />
      <div ref={ringRef as any} className="cursor-ring" aria-hidden="true" />
    </>
  );
}
