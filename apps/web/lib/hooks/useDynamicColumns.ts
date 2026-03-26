'use client';

import { useState, useLayoutEffect, type RefObject } from 'react';

export function useDynamicColumns(
  ref: RefObject<HTMLElement | null>,
  minColumnWidth: number,
): number | null {
  const [columns, setColumns] = useState<number | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Synchronous initial measurement to avoid layout flash
    const initialWidth = element.getBoundingClientRect().width;
    if (initialWidth > 0) {
      setColumns(Math.max(1, Math.floor(initialWidth / minColumnWidth)));
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width =
        entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
      setColumns(Math.max(1, Math.floor(width / minColumnWidth)));
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, minColumnWidth]);

  return columns;
}
