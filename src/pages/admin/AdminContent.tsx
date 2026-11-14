import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, Loader2, Save } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { useRole } from '../../hooks/useRole';
import { contentAdmin } from '../../features/content/adminRepository';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import { formatLondonDate } from '../../lib/utils';
import type { ContentPage } from '../../types/content';

const EDITABLE_SLUGS = ['faqs', 'terms', 'privacy', 'subscription-terms', 'returns'] as const;

interface DraftState {
  title: string;
  description: string;
  bodyHtml: string;
  published: boolean;
  placeholder: boolean;
}

const EMPTY_DRAFT: DraftState = {
  title: '',
  description: '',
  bodyHtml: '',
  published: false,
  placeholder: true,
};

export const AdminContent: React.FC = () => {
  const { isStaff } = useRole();
  const { success, error: toastError } = useToast();

  const [pages, setPages] = useState<ContentPage[]>([]);
  const [activeSlug, setActiveSlug] = useState<string>(EDITABLE_SLUGS[0]);
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [isLoading, setLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const loaded = await contentAdmin.listContent();
      setPages(loaded);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load content.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isStaff) void load();
  }, [isStaff, load]);

  useEffect(() => {
    const page = pages.find((candidate) => candidate.slug === activeSlug);
    setDraft(
      page
        ? {
            title: page.title,
            description: page.description,
            bodyHtml: page.bodyHtml,
            published: page.published,
            placeholder: page.placeholder,
          }
        : { ...EMPTY_DRAFT },
    );
    setShowPreview(false);
  }, [pages, activeSlug]);

  const activePage = useMemo(
    () => pages.find((candidate) => candidate.slug === activeSlug) ?? null,
    [pages, activeSlug],
  );

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await contentAdmin.saveContent({ slug: activeSlug, ...draft });
      success('Content saved', `${draft.title || activeSlug} is now saved.`);
      await load();
    } catch (err) {
      toastError('Could not save', err instanceof Error ? err.message : 'Unknown error.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 border-b border-stone-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-stone-900">Pages &amp; Policies</h1>
          <p className="mt-1 text-xs text-stone-500">
            Edit FAQ and policy copy. Only simple formatting is kept; everything else is removed
            when the page is rendered.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} isLoading={isLoading}>
          Reload
        </Button>
      </div>

      {loadError && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{loadError}</p>
        </div>
      )}

      {isLoading ? (
        <div className="py-10 text-center text-xs text-stone-500">
          <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" /> Loading pages…
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[220px,1fr]">
          <nav className="space-y-1" aria-label="Editable pages">
            {EDITABLE_SLUGS.map((slug) => {
              const page = pages.find((candidate) => candidate.slug === slug);
              const isActive = slug === activeSlug;
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => setActiveSlug(slug)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#155d2c] text-white'
                      : 'bg-white text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" />
                    {page?.title || slug}
                  </span>
                  {!page?.published && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                        isActive ? 'bg-white/20' : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      Draft
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <form
            onSubmit={handleSave}
            className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Title
                <input
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  required
                  maxLength={120}
                  className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm font-normal normal-case tracking-normal focus:border-[#155d2c] focus:outline-none focus:ring-1 focus:ring-[#155d2c]"
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Meta description
                <input
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  maxLength={300}
                  className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm font-normal normal-case tracking-normal focus:border-[#155d2c] focus:outline-none focus:ring-1 focus:ring-[#155d2c]"
                />
              </label>
            </div>

            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Body (HTML: p, h2, h3, ul, ol, li, strong, em, a)
              <textarea
                value={draft.bodyHtml}
                onChange={(event) => setDraft({ ...draft, bodyHtml: event.target.value })}
                rows={14}
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 font-mono text-[11px] leading-relaxed focus:border-[#155d2c] focus:outline-none focus:ring-1 focus:ring-[#155d2c]"
              />
            </label>

            <div className="flex flex-wrap items-center gap-6 text-xs text-stone-700">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.published}
                  onChange={(event) => setDraft({ ...draft, published: event.target.checked })}
                  className="h-4 w-4 rounded border-stone-300 text-[#155d2c]"
                />
                Published
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.placeholder}
                  onChange={(event) => setDraft({ ...draft, placeholder: event.target.checked })}
                  className="h-4 w-4 rounded border-stone-300 text-[#155d2c]"
                />
                Show “PLACEHOLDER - REVIEW BY CLIENT”
              </label>
              <button
                type="button"
                onClick={() => setShowPreview((value) => !value)}
                className="font-semibold text-[#155d2c] underline"
              >
                {showPreview ? 'Hide preview' : 'Preview sanitised copy'}
              </button>
            </div>

            {showPreview && (
              <div
                className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-xs leading-relaxed text-stone-700 [&_a]:text-[#155d2c] [&_a]:underline [&_h2]:font-serif [&_h2]:text-sm [&_h2]:font-bold [&_li]:ml-4 [&_li]:list-disc"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(draft.bodyHtml) }}
              />
            )}

            {activePage?.updatedAt && (
              <p className="text-[11px] text-stone-500">
                Last saved {formatLondonDate(activePage.updatedAt, { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            )}

            <div className="flex items-center gap-3">
              <Button type="submit" variant="primary" isLoading={isSaving} leftIcon={<Save className="h-4 w-4" />}>
                Save page
              </Button>
              {!draft.published && (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Draft pages are not visible on the storefront.
                </span>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
