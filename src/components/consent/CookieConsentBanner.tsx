import React, { useState } from 'react';
import { Cookie, X } from 'lucide-react';
import { useConsent } from '../../features/consent/ConsentContext';

/**
 * Essential-only banner shown until the visitor chooses.
 *
 * No non-essential script is requested before "Accept analytics"; analytics is
 * disabled entirely unless VITE_GA4_MEASUREMENT_ID is configured.
 */
export const CookieConsentBanner: React.FC = () => {
  const { consent, isPreferencesOpen, acceptAll, essentialOnly, savePreferences, closePreferences } =
    useConsent();
  const [analyticsChoice, setAnalyticsChoice] = useState(consent?.analytics ?? false);

  const visible = consent === null || isPreferencesOpen;

  if (!visible) return null;

  const reopened = consent !== null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie preferences"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[#155d2c]/40 bg-[#0a3318] px-4 py-4 text-cream-100 shadow-2xl sm:px-6"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-[#deb252]" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">Cookies and privacy</p>
            <p className="text-xs leading-relaxed text-emerald-100">
              We use essential cookies to run your basket, sign-in and checkout. Optional analytics
              help us understand which products people look at; they are off unless you switch them
              on. Read our{' '}
              <a href="/privacy" className="underline hover:text-white">
                privacy policy
              </a>
              .
            </p>
            <label className="mt-2 inline-flex items-center gap-2 text-xs text-emerald-100">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-emerald-300 text-[#155d2c] focus:ring-[#deb252]"
                checked={analyticsChoice}
                onChange={(event) => setAnalyticsChoice(event.target.checked)}
              />
              Allow analytics cookies
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {reopened ? (
            <>
              <button
                type="button"
                onClick={closePreferences}
                className="rounded-lg border border-emerald-200/40 px-4 py-2 text-xs font-semibold text-cream-100 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => savePreferences({ analytics: analyticsChoice })}
                className="rounded-lg bg-[#deb252] px-4 py-2 text-xs font-bold text-[#0a3318] hover:bg-[#e8c26a]"
              >
                Save preferences
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={essentialOnly}
                className="rounded-lg border border-emerald-200/40 px-4 py-2 text-xs font-semibold text-cream-100 hover:bg-white/10"
              >
                Essential only
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="rounded-lg bg-[#deb252] px-4 py-2 text-xs font-bold text-[#0a3318] hover:bg-[#e8c26a]"
              >
                Accept analytics
              </button>
            </>
          )}
          {reopened && (
            <button
              type="button"
              onClick={closePreferences}
              aria-label="Close cookie preferences"
              className="rounded-lg p-2 text-emerald-100 hover:bg-white/10"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
