import { useEffect, useRef, useCallback } from 'react';

interface VideoFadeOptions {
  fadeInDuration?:  number; // ms
  fadeOutStart?:    number; // seconds before end to start fade
  fadeOutDuration?: number; // ms
}

export function useCinematicVideo(options: VideoFadeOptions = {}) {
  const {
    fadeInDuration  = 1200,
    fadeOutStart    = 1.5,
    fadeOutDuration = 800,
  } = options;

  const videoRef   = useRef<HTMLVideoElement>(null);
  const rafRef     = useRef<number>(0);
  const fadingOut  = useRef(false);

  const fadeIn = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.style.opacity = '0';
    el.style.transition = `opacity ${fadeInDuration}ms ease`;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { el.style.opacity = '1'; });
    });
  }, [fadeInDuration]);

  const restart = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    fadingOut.current = false;
    el.style.opacity = '0';
    el.currentTime = 0;
    el.play().catch(() => {});
    fadeIn();
  }, [fadeIn]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onCanPlay = () => {
      el.play().catch(() => {});
      fadeIn();
    };

    const tick = () => {
      if (!el) return;
      const remaining = el.duration - el.currentTime;

      if (remaining <= fadeOutStart && !fadingOut.current) {
        fadingOut.current = true;
        el.style.transition = `opacity ${fadeOutDuration}ms ease`;
        el.style.opacity = '0';
        setTimeout(restart, fadeOutDuration);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    el.addEventListener('canplay', onCanPlay);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      el.removeEventListener('canplay', onCanPlay);
      cancelAnimationFrame(rafRef.current);
    };
  }, [fadeIn, restart, fadeOutStart, fadeOutDuration]);

  return videoRef;
}
