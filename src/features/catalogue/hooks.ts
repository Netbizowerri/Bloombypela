/**
 * React Query hooks for the public catalogue.
 *
 * Every hook exposes loading, error and empty states so list and detail screens
 * can render PageLoader / EmptyState / error UI consistently (project rule 12).
 */
import { useQuery } from '@tanstack/react-query';
import { catalogueRepository } from './repository';
import type { Product, ProductBundle, SubscriptionPlan } from '@/types/products';

export interface CatalogueListResult<T> {
  data: T[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isEmpty: boolean;
  refetch: () => void;
}

export interface CatalogueItemResult<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isEmpty: boolean;
  refetch: () => void;
}

export type ProductQueryOptions = {
  category?: string;
  type?: 'snack' | 'juice';
  includeHidden?: boolean;
};

/**
 * List products (optionally by category or type).
 * Public queries exclude hidden products and apply the seasonal date window.
 */
export function useProducts(options?: ProductQueryOptions): CatalogueListResult<Product> {
  const query = useQuery({
    queryKey: ['catalogue', 'products', options ?? {}],
    queryFn: () => catalogueRepository.listProducts(options ?? {}),
  });

  return {
    data: query.data ?? [],
    isLoading: query.isPending,
    isError: query.isError,
    error: query.error ?? null,
    isEmpty: query.data === undefined ? false : query.data.length === 0,
    refetch: query.refetch,
  };
}

/**
 * Get a single product by slug. `isEmpty` is true when no product matches.
 */
export function useProduct(slug: string | undefined): CatalogueItemResult<Product> {
  const query = useQuery({
    queryKey: ['catalogue', 'product-by-slug', slug ?? ''],
    queryFn: () => catalogueRepository.getProductBySlug(slug!),
    enabled: Boolean(slug),
    select: (product) => product ?? null,
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

export function useBundles(): CatalogueListResult<ProductBundle> {
  const query = useQuery({
    queryKey: ['catalogue', 'bundles'],
    queryFn: () => catalogueRepository.listBundles(),
  });

  return {
    data: query.data ?? [],
    isLoading: query.isPending,
    isError: query.isError,
    error: query.error ?? null,
    isEmpty: query.data === undefined ? false : query.data.length === 0,
    refetch: query.refetch,
  };
}

export function usePlans(): CatalogueListResult<SubscriptionPlan> {
  const query = useQuery({
    queryKey: ['catalogue', 'plans'],
    queryFn: () => catalogueRepository.listPlans(),
  });

  return {
    data: query.data ?? [],
    isLoading: query.isPending,
    isError: query.isError,
    error: query.error ?? null,
    isEmpty: query.data === undefined ? false : query.data.length === 0,
    refetch: query.refetch,
  };
}
