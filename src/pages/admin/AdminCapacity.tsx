import React, { useState, useCallback } from 'react';
import { useDateCapacity } from '../../features/delivery';
import { deliveryApi } from '../../lib/delivery';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../context/ToastContext';
import { Calendar, Plus, AlertCircle, CheckCircle, Lock, Edit, Save, X } from 'lucide-react';
import { z } from 'zod';

const CapacityFormSchema = z.object({
  juiceCapacity: z.number().int().nonnegative(),
  juiceReserved: z.number().int().nonnegative().default(0),
  subscriberShare: z.number().int().nonnegative().default(0),
  closed: z.boolean().default(false),
});

type DateCapacity = {
  date: string;
  juiceCapacity: number;
  juiceReserved: number;
  subscriberShare: number;
  closed: boolean;
};

export const AdminCapacity: React.FC = () => {
  const { data: capacities = [], isLoading, refetch } = useDateCapacity();
  const { success, error: showError } = useToast();

  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [capacityForm, setCapacityForm] = useState<{
    juiceCapacity: number;
    juiceReserved: number;
    subscriberShare: number;
    closed: boolean;
  } | null>(null);

  const [submitting, setSubmitting] = useState<Set<string>>(new Set());

  const isSubmitting = (id: string) => submitting.has(id);

  const handleEditCapacity = useCallback((cap: DateCapacity) => {
    setEditingDate(cap.date);
    setCapacityForm({
      juiceCapacity: cap.juiceCapacity,
      juiceReserved: cap.juiceReserved,
      subscriberShare: cap.subscriberShare,
      closed: cap.closed,
    });
  }, []);

  const handleSaveCapacity = useCallback(async () => {
    if (!capacityForm) return;
    setSubmitting((prev) => new Set([...prev, editingDate!]));
    try {
      const parsed = CapacityFormSchema.safeParse(capacityForm);
      if (!parsed.success) {
        showError('Invalid data', 'Please check the form fields.');
        return;
      }

      await deliveryApi.upsertDateCapacity({
        date: editingDate!,
        juiceCapacity: parsed.data.juiceCapacity,
        juiceReserved: parsed.data.juiceReserved,
        subscriberShare: parsed.data.subscriberShare,
        closed: parsed.data.closed,
      });
      success('Capacity updated', `${editingDate} saved.`);
      setEditingDate(null);
      setCapacityForm(null);
      await refetch();
    } catch (err) {
      showError('Save failed', err instanceof Error ? err.message : 'Unknown error.');
    } finally {
      setSubmitting((prev) => {
        const next = new Set(prev);
        next.delete(editingDate!);
        return next;
      });
    }
  }, [capacityForm, editingDate, refetch, showError, success]);

  const handleToggleClosed = useCallback(async (date: string) => {
    setSubmitting((prev) => new Set([...prev, date]));
    try {
      const cap = capacities.find((c) => c.date === date);
      if (!cap) return;
      await deliveryApi.upsertDateCapacity({
        date,
        juiceCapacity: cap.juiceCapacity,
        juiceReserved: cap.juiceReserved,
        subscriberShare: cap.subscriberShare,
        closed: !cap.closed,
      });
      success('Date updated', `${date} marked as ${!cap.closed ? 'closed' : 'open'}.`);
      await refetch();
    } catch (err) {
      showError('Save failed', err instanceof Error ? err.message : 'Unknown error.');
    } finally {
      setSubmitting((prev) => {
        const next = new Set(prev);
        next.delete(date);
        return next;
      });
    }
  }, [capacities, refetch, showError, success]);

  if (isLoading) {
    return (
      <div className="py-20 text-center text-stone-500 text-xs">
        Loading capacity calendar…
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-stone-900">
            Juice Batch Capacity Calendar
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Cold-pressed juice capacity is limited by bottle pressing limits per delivery batch.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => {
            const today = new Date().toISOString().split('T')[0];
            setEditingDate(today);
            setCapacityForm({
              juiceCapacity: 250,
              juiceReserved: 0,
              subscriberShare: 0,
              closed: false,
            });
          }}
          disabled={isSubmitting('new')}
        >
          Add Date Override
        </Button>
      </div>

      {/* Capacity form (add/edit) */}
      {capacityForm && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
          <h3 className="font-serif text-base font-bold text-stone-900">
            {editingDate ? `Capacity for ${editingDate}` : 'Add Capacity'}
          </h3>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveCapacity(); }} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Date
                </label>
                <input
                  type="date"
                  value={editingDate ?? ''}
                  readOnly
                  className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none bg-stone-50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Juice Capacity (bottles)
                </label>
                <input
                  type="number"
                  value={capacityForm.juiceCapacity}
                  onChange={(e) => setCapacityForm({ ...capacityForm, juiceCapacity: Number(e.target.value) || 0 })}
                  className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Juice Reserved (bottles)
                </label>
                <input
                  type="number"
                  value={capacityForm.juiceReserved}
                  onChange={(e) => setCapacityForm({ ...capacityForm, juiceReserved: Number(e.target.value) || 0 })}
                  className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Subscriber Share
                </label>
                <input
                  type="number"
                  value={capacityForm.subscriberShare}
                  onChange={(e) => setCapacityForm({ ...capacityForm, subscriberShare: Number(e.target.value) || 0 })}
                  className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                Closed
              </label>
              <label className="flex items-center gap-2 text-[10px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={capacityForm.closed}
                  onChange={(e) => setCapacityForm({ ...capacityForm, closed: e.target.checked })}
                  className="w-3 h-3 rounded border-stone-300 text-[#7e2b44] focus:ring-[#7e2b44]"
                />
                {capacityForm.closed ? 'Closed' : 'Open'}
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setEditingDate(null); setCapacityForm(null); }}
                disabled={isSubmitting(editingDate!)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                disabled={isSubmitting(editingDate!)}
              >
                {isSubmitting(editingDate!) ? 'Saving…' : 'Save Capacity'}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {capacities.map((cap) => {
          const totalBooked = cap.juiceReserved + cap.subscriberShare;
          const remaining = Math.max(0, cap.juiceCapacity - totalBooked);
          const percent = cap.juiceCapacity > 0 ? Math.min(100, Math.round((totalBooked / cap.juiceCapacity) * 100)) : 0;

          return (
            <div
              key={cap.date}
              className={`bg-white rounded-2xl border p-6 shadow-xs space-y-4 ${
                cap.closed ? 'border-red-200 bg-red-50/20' : 'border-stone-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <Calendar className="h-5 w-5 text-[#7e2b44]" />
                  <div>
                    <h3 className="font-serif text-base font-bold text-stone-900">
                      {cap.date}
                    </h3>
                    <span className="text-[11px] text-stone-400">Capacity key</span>
                  </div>
                </div>
                <Badge variant={cap.closed ? 'danger' : 'green'}>
                  {cap.closed ? 'Closed / Holiday' : 'Open for Orders'}
                </Badge>
              </div>

              {cap.closed ? (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                  <Lock className="h-4 w-4 shrink-0" />
                  <span>Deliveries closed on this date. No checkouts allowed.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-stone-600 font-medium">Batch Utilization:</span>
                    <span className="font-bold text-stone-900">
                      {totalBooked} / {cap.juiceCapacity} Bottles ({percent}%)
                    </span>
                  </div>

                  <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        percent > 90 ? 'bg-red-500' : percent > 70 ? 'bg-[#cb932b]' : 'bg-[#245840]'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                    <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                      <span className="text-[10px] text-stone-400 block font-semibold uppercase">
                        Reserved
                      </span>
                      <strong className="text-stone-800 font-serif text-sm">{cap.juiceReserved}</strong>
                    </div>
                    <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                      <span className="text-[10px] text-stone-400 block font-semibold uppercase">
                        Subscribers
                      </span>
                      <strong className="text-stone-800 font-serif text-sm">{cap.subscriberShare}</strong>
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                      <span className="text-[10px] text-emerald-700 block font-semibold uppercase">
                        Remaining
                      </span>
                      <strong className="text-emerald-800 font-serif text-sm">{remaining}</strong>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleEditCapacity(cap)}
                  disabled={isSubmitting(cap.date)}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleToggleClosed(cap.date)}
                  disabled={isSubmitting(cap.date)}
                >
                  {cap.closed ? 'Reopen' : 'Close'}
                </Button>
              </div>
            </div>
          );
        })}
        {capacities.length === 0 && (
          <div className="col-span-2 py-20 text-center text-stone-400 text-xs">
            No capacity dates configured.
          </div>
        )}
      </div>
    </div>
  );
};
