/**
 * React Query hooks for delivery data.
 */

import { useQuery } from '@tanstack/react-query';
import { deliveryRepository } from './repository';

export function useDeliveryAreas() {
  const query = useQuery({
    queryKey: ['delivery', 'areas'],
    queryFn: () => deliveryRepository.listDeliveryAreas(),
  });
  return {
    data: query.data ?? [],
    isLoading: query.isPending,
    isError: query.isError,
    error: query.error ?? null,
    refetch: query.refetch,
  };
}

export function useDeliverySchedule() {
  const query = useQuery({
    queryKey: ['delivery', 'schedule'],
    queryFn: () => deliveryRepository.listDeliverySchedule(),
  });
  return {
    data: query.data ?? [],
    isLoading: query.isPending,
    isError: query.isError,
    error: query.error ?? null,
    refetch: query.refetch,
  };
}

export function useClosedDates() {
  const query = useQuery({
    queryKey: ['delivery', 'closedDates'],
    queryFn: () => deliveryRepository.listClosedDates(),
  });
  return {
    data: query.data ?? [],
    isLoading: query.isPending,
    isError: query.isError,
    error: query.error ?? null,
    refetch: query.refetch,
  };
}

export function useDateCapacity() {
  const query = useQuery({
    queryKey: ['delivery', 'capacity'],
    queryFn: () => deliveryRepository.listDateCapacity(),
  });
  return {
    data: query.data ?? [],
    isLoading: query.isPending,
    isError: query.isError,
    error: query.error ?? null,
    refetch: query.refetch,
  };
}

export function usePublicSettings() {
  const query = useQuery({
    queryKey: ['delivery', 'publicSettings'],
    queryFn: () => deliveryRepository.getPublicSettings(),
  });
  return {
    data: query.data ?? null,
    isLoading: query.isPending,
    isError: query.isError,
    error: query.error ?? null,
    refetch: query.refetch,
  };
}

export const deliveryIndex = {
  useDeliveryAreas,
  useDeliverySchedule,
  useClosedDates,
  useDateCapacity,
  usePublicSettings,
};
