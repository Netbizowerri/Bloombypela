/**
 * Cookie consent state (UK GDPR / PECR).
 *
 * Essential storage (cart, sign-in, this preference itself) always works.
 * Analytics is opt-in: nothing non-essential is loaded until the visitor
 * accepts, and the choice is stored locally and can be changed from the footer.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'bloom.cookie-consent.v1';

export interface ConsentChoice {
  /** Analytics is the only non-essential category offered. */
  analytics: boolean;
  /** ISO timestamp of when the visitor made the choice. */
  updatedAt: string;
}

export interface ConsentContextValue {
  /** null until the visitor makes a choice. */
  consent: ConsentChoice | null;
  /** True while the banner or the footer preferences dialog is open. */
  isPreferencesOpen: boolean;
  acceptAll: () => void;
  essentialOnly: () => void;
  savePreferences: (choice: Pick<ConsentChoice, 'analytics'>) => void;
  openPreferences: () => void;
  closePreferences: () => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

function readStoredChoice(): ConsentChoice | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentChoice>;
    if (typeof parsed.analytics !== 'boolean') return null;
    return {
      analytics: parsed.analytics,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function storeChoice(choice: ConsentChoice): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
  } catch {
    // Private mode or a full quota: the choice still applies for this session.
  }
}

/** Injects GA4 exactly once, and only after analytics consent. */
function loadAnalytics(measurementId: string): void {
  if (document.querySelector('script[data-analytics="ga4"]')) return;

  const script = document.createElement('script');
  script.async = true;
  script.dataset.analytics = 'ga4';
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  const inline = document.createElement('script');
  inline.dataset.analytics = 'ga4';
  inline.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${measurementId}',{anonymize_ip:true});`;
  document.head.appendChild(inline);
}

function removeAnalytics(): void {
  document.querySelectorAll('script[data-analytics="ga4"]').forEach((node) => node.remove());
  delete (window as unknown as Record<string, unknown>).dataLayer;
}

export const ConsentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [consent, setConsent] = useState<ConsentChoice | null>(() => readStoredChoice());
  const [isPreferencesOpen, setPreferencesOpen] = useState(false);

  const measurementId = (import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined)?.trim();

  useEffect(() => {
    if (consent?.analytics && measurementId) {
      loadAnalytics(measurementId);
    } else {
      removeAnalytics();
    }
  }, [consent?.analytics, measurementId]);

  const apply = useCallback((analytics: boolean) => {
    const choice: ConsentChoice = { analytics, updatedAt: new Date().toISOString() };
    storeChoice(choice);
    setConsent(choice);
    setPreferencesOpen(false);
  }, []);

  const value = useMemo<ConsentContextValue>(
    () => ({
      consent,
      isPreferencesOpen,
      acceptAll: () => apply(true),
      essentialOnly: () => apply(false),
      savePreferences: ({ analytics }) => apply(analytics),
      openPreferences: () => setPreferencesOpen(true),
      closePreferences: () => setPreferencesOpen(false),
    }),
    [consent, isPreferencesOpen, apply],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
};

export function useConsent(): ConsentContextValue {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error('useConsent must be used inside ConsentProvider.');
  }
  return context;
}

/** True only when the visitor has explicitly allowed analytics. */
export function useAnalyticsConsent(): boolean {
  return useConsent().consent?.analytics === true;
}
