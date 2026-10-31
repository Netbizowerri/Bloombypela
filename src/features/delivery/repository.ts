/**
 * Client-side delivery repository over Firestore.
 *
 * Reads are done directly from Firestore (public-read collections).
 * Writes go through Cloud Functions callables (see src/lib/delivery.ts).
 */

import {
  collection,
  getDocs,
  query,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DeliveryArea, DeliveryScheduleDay, ClosedDate, DateCapacity, PublicSettings } from '@/types/delivery';

const COLLECTIONS = {
  deliveryAreas: 'deliveryAreas',
  deliverySchedule: 'deliverySchedule',
  closedDates: 'closedDates',
  dateCapacity: 'dateCapacity',
  publicSettings: 'publicSettings',
} as const;

function docToDeliveryArea(snap: DocumentData): DeliveryArea {
  const data = snap.data();
  return {
    id: snap.id,
    outwardCode: String(data.outwardCode ?? ''),
    areaName: String(data.areaName ?? ''),
    feePence: Number(data.feePence ?? 0),
    minimumOrderPence: Number(data.minimumOrderPence ?? 0),
    isActive: Boolean(data.isActive),
  };
}

function docToDeliverySchedule(snap: DocumentData): DeliveryScheduleDay {
  const data = snap.data();
  return {
    id: snap.id,
    weekday: Number(data.weekday ?? 0),
    cutoffTime: String(data.cutoffTime ?? ''),
    leadDays: Number(data.leadDays ?? 0),
    isActive: Boolean(data.isActive),
  };
}

function docToClosedDate(snap: DocumentData): ClosedDate {
  const data = snap.data();
  return {
    id: snap.id,
    date: String(data.date ?? ''),
    reason: String(data.reason ?? ''),
  };
}

function docToDateCapacity(snap: DocumentData): DateCapacity {
  const data = snap.data();
  return {
    date: String(data.date ?? ''),
    juiceCapacity: Number(data.juiceCapacity ?? 0),
    juiceReserved: Number(data.juiceReserved ?? 0),
    subscriberShare: Number(data.subscriberShare ?? 0),
    closed: Boolean(data.closed),
  };
}

function docToPublicSettings(snap: DocumentData): PublicSettings {
  const data = snap.data();
  return {
    freeDeliveryThresholdPence: Number(data.freeDeliveryThresholdPence ?? 0),
    snackFlatFeePence: Number(data.snackFlatFeePence ?? 0),
    collectionEnabled: Boolean(data.collectionEnabled),
    collectionDetails: data.collectionDetails ? String(data.collectionDetails) : undefined,
  };
}

export const deliveryRepository = {
  async listDeliveryAreas(): Promise<DeliveryArea[]> {
    if (!db) throw new Error('Firestore not initialized');
    const snap = await getDocs(collection(db, COLLECTIONS.deliveryAreas));
    return snap.docs.map(docToDeliveryArea);
  },

  async listDeliverySchedule(): Promise<DeliveryScheduleDay[]> {
    if (!db) throw new Error('Firestore not initialized');
    const snap = await getDocs(collection(db, COLLECTIONS.deliverySchedule));
    return snap.docs.map(docToDeliverySchedule);
  },

  async listClosedDates(): Promise<ClosedDate[]> {
    if (!db) throw new Error('Firestore not initialized');
    const snap = await getDocs(collection(db, COLLECTIONS.closedDates));
    return snap.docs.map(docToClosedDate);
  },

  async listDateCapacity(): Promise<DateCapacity[]> {
    if (!db) throw new Error('Firestore not initialized');
    const snap = await getDocs(collection(db, COLLECTIONS.dateCapacity));
    return snap.docs.map(docToDateCapacity);
  },

  async getPublicSettings(): Promise<PublicSettings | null> {
    if (!db) throw new Error('Firestore not initialized');
    const snap = await getDocs(
      query(collection(db, COLLECTIONS.publicSettings), where('__name__', '==', 'settings')),
    );
    if (snap.empty) return null;
    return docToPublicSettings(snap.docs[0]);
  },
};
