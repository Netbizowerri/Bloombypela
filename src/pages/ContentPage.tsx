import React from 'react';
import { AlertCircle, FileText, RefreshCw } from 'lucide-react';
import { PageLoader } from '../components/ui/PageLoader';
import { Seo } from '../components/seo/Seo';
import { sanitizeHtml } from '../lib/sanitizeHtml';
import { useContentPage } from '../features/content/hooks';
import { formatLondonDate } from '../lib/utils';

export interface ContentPageProps {
  /** Document id in the `content` collection, e.g. "privacy". */
  slug: string;
  /** Route used for the canonical URL, e.g. "/privacy". */
  path: string;
  /** Shown in the heading until the Firestore copy loads. */
  heading: string;
  /** Meta description used before (or instead of) the stored copy. */
  description: string;
}

/**
 * Renders staff-editable policy and FAQ copy from Firestore.
 * Rich text is sanitised before it reaches `dangerouslySetInnerHTML`.
 */
export const ContentPage: React.FC<ContentPageProps> = ({ slug, path, heading, description }) => {
  const { data: page, isLoading, isError, error, refetch } = useContentPage(slug);

  const seoTitle = page?.title ?? heading;
  const seoDescription = page?.description || description;

  if (isLoading) {
    return (
      <>
        <Seo title={seoTitle} description={seoDescription} path={path} />
        <PageLoader />
      </>
    );
  }

  if (isError) {
    return (
      <>
        <Seo title={seoTitle} description={seoDescription} path={path} />
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-stone-400" />
          <h1 className="mb-2 font-serif text-2xl font-bold text-stone-900 sm:text-3xl">
            Couldn&apos;t load this page
          </h1>
          <p className="mx-auto mb-6 max-w-md text-sm text-stone-600">
            {error?.message ?? 'Failed to load'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#155d2c] px-6 py-3 font-medium text-white hover:bg-[#104923]"
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title={seoTitle} description={seoDescription} path={path} />
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-12 text-left sm:px-6 lg:px-8">
        <div className="border-b border-stone-200 pb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
            {page?.placeholder === false ? 'Bloom by Pela' : 'Draft copy - awaiting approval'}
          </span>
          <h1 className="mt-1 font-serif text-3xl font-bold text-stone-900">
            {page?.title ?? heading}
          </h1>
          {page?.description && (
            <p className="mt-2 text-xs text-stone-600 sm:text-sm">{page.description}</p>
          )}
          {page?.updatedAt && (
            <p className="mt-2 text-xs text-stone-500">
              Last updated: {formatLondonDate(page.updatedAt, { dateStyle: 'long' })}
            </p>
          )}
        </div>

        {page?.placeholder !== false && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[11px] font-semibold uppercase tracking-wide text-amber-900">
            PLACEHOLDER - REVIEW BY CLIENT
          </div>
        )}

        {!page ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-stone-300" />
            <h2 className="font-serif text-lg font-bold text-stone-900">This page is not published yet</h2>
            <p className="mx-auto mt-2 max-w-md text-xs text-stone-600">
              Our team is still reviewing this copy. Please{' '}
              <a href="/contact" className="underline">
                contact us
              </a>{' '}
              if you need the information now.
            </p>
          </div>
        ) : (
          <div
            className="space-y-4 text-xs leading-relaxed text-stone-700 [&_a]:text-[#155d2c] [&_a]:underline [&_h2]:mt-6 [&_h2]:font-serif [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-stone-900 [&_h3]:font-serif [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-stone-900 [&_li]:ml-4 [&_li]:list-disc [&_ol]:space-y-1 [&_p]:leading-relaxed [&_ul]:space-y-1"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.bodyHtml) }}
          />
        )}
      </div>
    </>
  );
};
