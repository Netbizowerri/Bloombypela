import { useQuery } from '@tanstack/react-query';
import { getContentPage } from './repository';
import type { ContentPage } from '@/types/content';

export interface ContentResult {
  data: ContentPage | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isEmpty: boolean;
  refetch: () => void;
}

export function useContentPage(slug: string): ContentResult {
  const query = useQuery({
    queryKey: ['content', slug],
    queryFn: () => getContentPage(slug),
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isPending,
    isError: query.isError,
    error: query.error ?? null,
    isEmpty: query.data === null,
    refetch: query.refetch,
  };
}
