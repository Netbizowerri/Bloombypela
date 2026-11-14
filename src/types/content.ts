/** Editable site copy stored in the `content` collection (staff-managed). */
export interface ContentPage {
  /** Document id and route slug, e.g. "faqs", "privacy". */
  slug: string;
  title: string;
  /** Meta description / standfirst. */
  description: string;
  /** Rich text authored in the admin portal. Sanitised on render. */
  bodyHtml: string;
  published: boolean;
  /** True while the copy is draft placeholder text awaiting client approval. */
  placeholder: boolean;
  /** Epoch milliseconds, or null when never saved. */
  updatedAt: number | null;
}

export type ContentWriteInput = Omit<ContentPage, 'updatedAt'>;
