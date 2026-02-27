'use client';

import { useRef, useCallback, useEffect, memo, type ReactNode } from 'react';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import { useCalendarStore, getAdjacentDate } from '@/lib/stores/calendarStore';

const COMMIT_THRESHOLD = 0.3;
const ANIMATION_MS = 250;

/** Memoized panel — skips re-render when date timestamp + renderView are unchanged. */
const SwipePanel = memo(function SwipePanel({
  dateTs,
  renderView,
}: {
  dateTs: number;
  renderView: (date: Date) => ReactNode;
}) {
  return <>{renderView(new Date(dateTs))}</>;
});

interface SwipeContainerProps {
  renderView: (date: Date) => ReactNode;
}

export function SwipeContainer({ renderView }: SwipeContainerProps) {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const navigate = useCalendarStore((s) => s.navigate);
  const currentDate = useCalendarStore((s) => s.currentDate);
  const view = useCalendarStore((s) => s.view);

  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const currentXRef = useRef(0);
  const isSwipingRef = useRef(false);
  const directionLockedRef = useRef(false);
  const animatingRef = useRef(false);

  // Set initial transform imperatively so React re-renders never
  // overwrite imperative style updates (drag, animation, reset).
  useEffect(() => {
    if (trackRef.current) {
      trackRef.current.style.transform = 'translateX(-33.333%)';
    }
  }, []);

  const setTrackTransform = useCallback(
    (translateX: string, animate: boolean) => {
      const el = trackRef.current;
      if (!el) return;
      el.style.transition = animate
        ? `transform ${ANIMATION_MS}ms ease-out`
        : 'none';
      el.style.transform = `translateX(${translateX})`;
    },
    [],
  );

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (animatingRef.current) return;
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    currentXRef.current = touch.clientX;
    isSwipingRef.current = false;
    directionLockedRef.current = false;
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (animatingRef.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startXRef.current;
      const dy = touch.clientY - startYRef.current;

      if (!directionLockedRef.current) {
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        if (absDx < 10 && absDy < 10) return;
        directionLockedRef.current = true;
        if (absDy > absDx) {
          isSwipingRef.current = false;
          return;
        }
        isSwipingRef.current = true;
      }

      if (!isSwipingRef.current) return;

      currentXRef.current = touch.clientX;
      setTrackTransform(`calc(-33.333% + ${dx}px)`, false);
    },
    [setTrackTransform],
  );

  const onTouchEnd = useCallback(() => {
    if (animatingRef.current || !isSwipingRef.current) {
      isSwipingRef.current = false;
      return;
    }

    const dx = currentXRef.current - startXRef.current;
    const vw = window.innerWidth;
    const ratio = Math.abs(dx) / vw;

    if (ratio >= COMMIT_THRESHOLD) {
      const direction: -1 | 1 = dx > 0 ? -1 : 1;
      animatingRef.current = true;

      // Slide to adjacent panel
      const target = direction === 1 ? '-66.667%' : '0%';
      setTrackTransform(target, true);

      setTimeout(() => {
        // Reset position and unlock touches immediately so the
        // next drag is visually responsive.  Defer navigate() to
        // the next animation frame so the browser can process
        // touch events and paint before React re-renders the panels.
        setTrackTransform('-33.333%', false);
        animatingRef.current = false;
        requestAnimationFrame(() => {
          navigate(direction);
        });
      }, ANIMATION_MS);
    } else {
      // Cancel: snap back to center
      animatingRef.current = true;
      setTrackTransform('-33.333%', true);
      setTimeout(() => {
        animatingRef.current = false;
      }, ANIMATION_MS);
    }

    isSwipingRef.current = false;
  }, [navigate, setTrackTransform]);

  const prevDate = getAdjacentDate(currentDate, view, -1);
  const nextDate = getAdjacentDate(currentDate, view, 1);

  if (!isMobile) {
    return <>{renderView(currentDate)}</>;
  }

  // Key panels by date timestamp so React reuses already-rendered views
  // when they shift position (e.g. "next" becomes "current" on navigate).
  // Combined with the memoized SwipePanel, only the one truly new panel
  // renders from scratch — the other two are recycled.
  const prevTs = prevDate.getTime();
  const currentTs = currentDate.getTime();
  const nextTs = nextDate.getTime();

  return (
    <div
      className="h-full overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        ref={trackRef}
        className="flex h-full w-[300%] will-change-transform"
      >
        <div key={prevTs} className="h-full w-1/3 pointer-events-none">
          <SwipePanel dateTs={prevTs} renderView={renderView} />
        </div>
        <div key={currentTs} className="h-full w-1/3">
          <SwipePanel dateTs={currentTs} renderView={renderView} />
        </div>
        <div key={nextTs} className="h-full w-1/3 pointer-events-none">
          <SwipePanel dateTs={nextTs} renderView={renderView} />
        </div>
      </div>
    </div>
  );
}
