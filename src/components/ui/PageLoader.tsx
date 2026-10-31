import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Suspense fallback used while a lazily-loaded route chunk is fetched.
 */
export const PageLoader: React.FC = () => (
  <div
    className="min-h-[60vh] flex flex-col items-center justify-center bg-[#fdfbf7] p-4 text-center"
    role="status"
    aria-live="polite"
  >
    <Loader2 className="h-8 w-8 animate-spin text-[#7e2b44] mb-3" aria-hidden="true" />
    <p className="text-xs text-stone-500 font-medium tracking-wide">Loading page...</p>
  </div>
);
