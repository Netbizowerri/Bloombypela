import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop Component
 * Ensures every page navigation immediately begins from the very top of the page (0, 0),
 * regardless of scroll position on the previous page or where the link was clicked.
 */
export const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // Disable automatic browser scroll restoration to ensure top position on route changes
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const resetScroll = () => {
      window.scrollTo(0, 0);
      try {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      } catch {
        // Fallback for older browsers
        window.scrollTo(0, 0);
      }
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    // Immediate scroll reset
    resetScroll();

    // Secondary rAF check to handle any layout re-calculations on route transition
    const frameId = requestAnimationFrame(() => {
      resetScroll();
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [pathname, search]);

  return null;
};
export default ScrollToTop;
