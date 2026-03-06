'use client';

import { useEffect, type RefObject } from 'react';

export function useSidebarAutoScroll(
  sidebarRef: RefObject<HTMLElement | null>,
  itemRef: RefObject<HTMLElement | null>,
  dep: unknown,
): void {
  useEffect(() => {
    if (itemRef.current && sidebarRef.current) {
      const item = itemRef.current;
      const sidebar = sidebarRef.current;
      sidebar.scrollTop = item.offsetTop - sidebar.clientHeight / 2 + item.offsetHeight / 2;
    }
  // refs are stable; only re-run when dep changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep]);
}
