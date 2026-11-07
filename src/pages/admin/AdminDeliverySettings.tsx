import React, { useState, useCallback } from 'react';
import {
  useDeliveryAreas,
  useDeliverySchedule,
  useClosedDates,
  usePublicSettings,
} from '../../features/delivery';
import { deliveryApi } from '../../lib/delivery';
import { formatPence } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../context/ToastContext';
import { Plus, Edit, Trash2, Clock, ShieldCheck, Truck, Save } from 'lucide-react';
import { z } from 'zod';

const AreaFormSchema = z.object({
  outwardCode: z.string().trim().min(1).max(10),
  areaName: z.string().trim().min(1).max(100),
  feePence: z.number().int().nonnegative(),
  minimumOrderPence: z.number().int().nonnegative(),
  isActive: z.boolean().default(true),
});

const SettingsFormSchema = z.object({
  freeDeliveryThresholdPence: z.number().int().nonnegative(),
  snackFlatFeePence: z.number().int().nonnegative(),
  collectionEnabled: z.boolean(),
  collectionDetails: z.string().max(500).optional().nullable(),
});

/**
 * Mirrors the `deliverySchedule` validation in firestore.rules: `HH:mm` on a
 * 24-hour clock and a 0-30 day lead time. Kept slightly stricter than the
 * rules (hours 00-23 rather than 00-29) so a typo never reaches Firestore.
 */
const ScheduleFormSchema = z.object({
  cutoffTime: z
    .string()
    .regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, 'Enter a cut-off time as HH:mm, e.g. 14:30.'),
  leadDays: z.number().int().min(0).max(30),
  isActive: z.boolean(),
});

/** Mirrors the `closedDates` validation in firestore.rules. */
const ClosedDateFormSchema = z.object({
  date: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, 'Choose a date.'),
  reason: z.string().trim().min(1, 'Give a short reason.').max(200),
});

const WEEKDAYS: Array<{ weekday: number; label: string }> = [
  { weekday: 1, label: 'Monday' },
  { weekday: 2, label: 'Tuesday' },
  { weekday: 3, label: 'Wednesday' },
  { weekday: 4, label: 'Thursday' },
  { weekday: 5, label: 'Friday' },
  { weekday: 6, label: 'Saturday' },
  { weekday: 7, label: 'Sunday' },
];

type ScheduleDraft = z.infer<typeof ScheduleFormSchema>;

type DeliveryArea = {
  id: string;
  outwardCode: string;
  areaName: string;
  feePence: number;
  minimumOrderPence: number;
  isActive: boolean;
};

export const AdminDeliverySettings: React.FC = () => {
  const { data: areas = [], isLoading: areasLoading, refetch: refetchAreas } = useDeliveryAreas();
  const {
    data: schedule = [],
    isError: scheduleError,
    error: scheduleErrorValue,
    refetch: refetchSchedule,
  } = useDeliverySchedule();
  const {
    data: closedDates = [],
    isError: closedDatesError,
    error: closedDatesErrorValue,
    refetch: refetchClosedDates,
  } = useClosedDates();
  const { data: settings, refetch: refetchSettings } = usePublicSettings();
  const { success, error: showError } = useToast();

  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [areaForm, setAreaForm] = useState<{
    outwardCode: string;
    areaName: string;
    feePence: number;
    minimumOrderPence: number;
    isActive: boolean;
  } | null>(null);

  const [settingsForm, setSettingsForm] = useState<{
    freeDeliveryThresholdPence: number;
    snackFlatFeePence: number;
    collectionEnabled: boolean;
    collectionDetails: string | null;
  } | null>(null);

  const [submitting, setSubmitting] = useState<Set<string>>(new Set());

  /**
   * Uncommitted schedule edits, keyed by weekday. A weekday with no entry uses
   * the stored document, so untouched days render exactly what Firestore holds.
   */
  const [scheduleDrafts, setScheduleDrafts] = useState<Record<number, ScheduleDraft>>({});
  const [closedDateForm, setClosedDateForm] = useState<{ date: string; reason: string }>({
    date: '',
    reason: '',
  });

  const isSubmitting = (id: string) => submitting.has(id);

  /** Stored schedule row for a weekday, if the owner has configured one. */
  const scheduleForWeekday = (weekday: number) =>
    schedule.find((entry) => Number(entry.weekday) === weekday);

  /** Current editor values for a weekday: the draft, else the stored row, else defaults. */
  const scheduleDraftFor = (weekday: number): ScheduleDraft => {
    const draft = scheduleDrafts[weekday];
    if (draft) return draft;
    const stored = scheduleForWeekday(weekday);
    return {
      cutoffTime: stored?.cutoffTime ?? '12:00',
      leadDays: typeof stored?.leadDays === 'number' ? stored.leadDays : 1,
      isActive: stored?.isActive ?? false,
    };
  };

  const updateScheduleDraft = (weekday: number, patch: Partial<ScheduleDraft>) => {
    setScheduleDrafts((prev) => ({
      ...prev,
      [weekday]: { ...scheduleDraftFor(weekday), ...patch },
    }));
  };

  const handleAddArea = useCallback(() => {
    setEditingAreaId(null);
    setAreaForm({
      outwardCode: '',
      areaName: '',
      feePence: 0,
      minimumOrderPence: 0,
      isActive: true,
    });
  }, []);

  const handleEditArea = useCallback((area: DeliveryArea) => {
    setEditingAreaId(area.id);
    setAreaForm({
      outwardCode: area.outwardCode,
      areaName: area.areaName,
      feePence: area.feePence,
      minimumOrderPence: area.minimumOrderPence,
      isActive: area.isActive,
    });
  }, []);

  const handleSaveArea = useCallback(async () => {
    if (!areaForm) return;
    setSubmitting((prev) => new Set([...prev, 'area']));
    try {
      const parsed = AreaFormSchema.safeParse(areaForm);
      if (!parsed.success) {
        showError('Invalid data', 'Please check the form fields.');
        return;
      }

      if (editingAreaId) {
        await deliveryApi.updateDeliveryArea({
          id: editingAreaId,
          outwardCode: parsed.data.outwardCode,
          areaName: parsed.data.areaName,
          feePence: parsed.data.feePence,
          minimumOrderPence: parsed.data.minimumOrderPence,
          isActive: parsed.data.isActive,
        });
        success('Area updated', `${parsed.data.outwardCode} saved.`);
      } else {
        await deliveryApi.createDeliveryArea({
          outwardCode: parsed.data.outwardCode,
          areaName: parsed.data.areaName,
          feePence: parsed.data.feePence,
          minimumOrderPence: parsed.data.minimumOrderPence,
          isActive: parsed.data.isActive,
        });
        success('Area created', `${parsed.data.outwardCode} added.`);
      }

      setEditingAreaId(null);
      setAreaForm(null);
      await refetchAreas();
    } catch (err) {
      showError('Save failed', err instanceof Error ? err.message : 'Unknown error.');
    } finally {
      setSubmitting((prev) => {
        const next = new Set(prev);
        next.delete('area');
        return next;
      });
    }
  }, [areaForm, editingAreaId, refetchAreas, showError, success]);

  const handleDeleteArea = useCallback(async (id: string) => {
    if (!window.confirm('Delete this delivery area?')) return;
    setSubmitting((prev) => new Set([...prev, id]));
    try {
      await deliveryApi.deleteDeliveryArea(id);
      success('Area deleted', 'Delivery area removed.');
      await refetchAreas();
    } catch (err) {
      showError('Delete failed', err instanceof Error ? err.message : 'Unknown error.');
    } finally {
      setSubmitting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [refetchAreas, showError, success]);

  const handleSaveSettings = useCallback(async () => {
    if (!settingsForm) return;
    setSubmitting((prev) => new Set([...prev, 'settings']));
    try {
      const parsed = SettingsFormSchema.safeParse(settingsForm);
      if (!parsed.success) {
        showError('Invalid data', 'Please check the form fields.');
        return;
      }

      await deliveryApi.updatePublicSettings({
        freeDeliveryThresholdPence: parsed.data.freeDeliveryThresholdPence,
        snackFlatFeePence: parsed.data.snackFlatFeePence,
        collectionEnabled: parsed.data.collectionEnabled,
        collectionDetails: parsed.data.collectionDetails,
      });
      success('Settings updated', 'Delivery settings saved.');
      await refetchSettings();
    } catch (err) {
      showError('Save failed', err instanceof Error ? err.message : 'Unknown error.');
    } finally {
      setSubmitting((prev) => {
        const next = new Set(prev);
        next.delete('settings');
        return next;
      });
    }
  }, [settingsForm, refetchSettings, showError, success]);

  /**
   * Saves one weekday of the delivery schedule. Upsert: a weekday that has no
   * document yet is created, an existing one is updated in place.
   */
  const handleSaveScheduleDay = useCallback(
    async (weekday: number) => {
      const draft = scheduleDraftFor(weekday);
      const parsed = ScheduleFormSchema.safeParse(draft);
      if (!parsed.success) {
        showError('Invalid schedule', parsed.error.issues[0]?.message ?? 'Check the fields.');
        return;
      }

      const key = `schedule-${weekday}`;
      setSubmitting((prev) => new Set([...prev, key]));
      try {
        await deliveryApi.upsertDeliverySchedule({
          id: scheduleForWeekday(weekday)?.id,
          weekday,
          cutoffTime: parsed.data.cutoffTime,
          leadDays: parsed.data.leadDays,
          isActive: parsed.data.isActive,
        });
        success(
          'Schedule saved',
          `${WEEKDAYS.find((d) => d.weekday === weekday)?.label ?? `Weekday ${weekday}`} updated.`,
        );
        // Drop the draft so the row renders the freshly stored document.
        setScheduleDrafts((prev) => {
          const next = { ...prev };
          delete next[weekday];
          return next;
        });
        await refetchSchedule();
      } catch (err) {
        showError('Save failed', err instanceof Error ? err.message : 'Unknown error.');
      } finally {
        setSubmitting((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [refetchSchedule, scheduleDraftFor, scheduleForWeekday, showError, success],
  );

  const handleAddClosedDate = useCallback(async () => {
    const parsed = ClosedDateFormSchema.safeParse(closedDateForm);
    if (!parsed.success) {
      showError('Invalid closed date', parsed.error.issues[0]?.message ?? 'Check the fields.');
      return;
    }

    setSubmitting((prev) => new Set([...prev, 'closed-new']));
    try {
      await deliveryApi.upsertClosedDate({
        date: parsed.data.date,
        reason: parsed.data.reason,
      });
      success('Closed date saved', `${parsed.data.date} will not be offered for delivery.`);
      setClosedDateForm({ date: '', reason: '' });
      await refetchClosedDates();
    } catch (err) {
      showError('Save failed', err instanceof Error ? err.message : 'Unknown error.');
    } finally {
      setSubmitting((prev) => {
        const next = new Set(prev);
        next.delete('closed-new');
        return next;
      });
    }
  }, [closedDateForm, refetchClosedDates, showError, success]);

  const handleDeleteClosedDate = useCallback(
    async (id: string) => {
      if (!window.confirm(`Remove closed date ${id}?`)) return;
      setSubmitting((prev) => new Set([...prev, `closed-${id}`]));
      try {
        await deliveryApi.deleteClosedDate(id);
        success('Closed date removed', `${id} is offered again.`);
        await refetchClosedDates();
      } catch (err) {
        showError('Delete failed', err instanceof Error ? err.message : 'Unknown error.');
      } finally {
        setSubmitting((prev) => {
          const next = new Set(prev);
          next.delete(`closed-${id}`);
          return next;
        });
      }
    },
    [refetchClosedDates, showError, success],
  );

  if (areasLoading) {
    return (
      <div className="py-20 text-center text-stone-500 text-xs">
        Loading delivery configuration…
      </div>
    );
  }

  return (
    <div className="space-y-8 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-stone-900">
            Delivery Configuration
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Configure outward postcodes, minimum spends, free delivery thresholds, and cut-off rules.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={handleAddArea}
          disabled={isSubmitting('area')}
        >
          Add Postcode Zone
        </Button>
      </div>

      {/* Area form (add/edit) */}
      {areaForm && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
          <h3 className="font-serif text-base font-bold text-stone-900">
            {editingAreaId ? 'Edit Delivery Area' : 'Add Delivery Area'}
          </h3>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveArea(); }} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Outward Code
                </label>
                <input
                  value={areaForm.outwardCode}
                  onChange={(e) => setAreaForm({ ...areaForm, outwardCode: e.target.value.toUpperCase() })}
                  className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none uppercase"
                  placeholder="e.g. NE1"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Area Name
                </label>
                <input
                  value={areaForm.areaName}
                  onChange={(e) => setAreaForm({ ...areaForm, areaName: e.target.value })}
                  className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                  placeholder="e.g. Newcastle City Centre"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Delivery Fee (pence)
                </label>
                <input
                  type="number"
                  value={areaForm.feePence}
                  onChange={(e) => setAreaForm({ ...areaForm, feePence: Number(e.target.value) || 0 })}
                  className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Minimum Order (pence)
                </label>
                <input
                  type="number"
                  value={areaForm.minimumOrderPence}
                  onChange={(e) => setAreaForm({ ...areaForm, minimumOrderPence: Number(e.target.value) || 0 })}
                  className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                Active
              </label>
              <label className="flex items-center gap-2 text-[10px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={areaForm.isActive}
                  onChange={(e) => setAreaForm({ ...areaForm, isActive: e.target.checked })}
                  className="w-3 h-3 rounded border-stone-300 text-[#7e2b44] focus:ring-[#7e2b44]"
                />
                {areaForm.isActive ? 'Active' : 'Inactive'}
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setEditingAreaId(null); setAreaForm(null); }}
                disabled={isSubmitting('area')}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                disabled={isSubmitting('area')}
              >
                {isSubmitting('area') ? 'Saving…' : 'Save Area'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Schedule Configuration */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
          <Clock className="h-5 w-5 text-[#7e2b44]" />
          <h3 className="font-serif text-base font-bold text-stone-900">
            Weekly Delivery Schedule (Europe/London)
          </h3>
        </div>
        {scheduleError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-[11px] text-red-800">
            <p className="font-semibold">The delivery schedule could not be loaded.</p>
            <p className="mt-1">
              {scheduleErrorValue instanceof Error
                ? scheduleErrorValue.message
                : 'Check your connection and try again.'}
            </p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => void refetchSchedule()}>
              Try again
            </Button>
          </div>
        )}

        <div className="space-y-3 text-xs">
          {WEEKDAYS.map(({ weekday, label }) => {
            const stored = scheduleForWeekday(weekday);
            const draft = scheduleDraftFor(weekday);
            const key = `schedule-${weekday}`;
            const busy = isSubmitting(key);
            return (
              <div
                key={weekday}
                className="grid grid-cols-1 sm:grid-cols-[7rem_8rem_7rem_auto_auto] sm:items-end gap-3 p-4 rounded-xl bg-stone-50 border border-stone-200"
              >
                <div>
                  <p className="font-bold text-stone-800">{label}</p>
                  <p className="text-[10px] text-stone-500">
                    {stored ? (stored.isActive ? 'Offered' : 'Switched off') : 'Not configured'}
                  </p>
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor={`cutoff-${weekday}`}
                    className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block"
                  >
                    Cut-off (London)
                  </label>
                  <input
                    id={`cutoff-${weekday}`}
                    type="time"
                    value={draft.cutoffTime}
                    onChange={(e) => updateScheduleDraft(weekday, { cutoffTime: e.target.value })}
                    className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor={`lead-${weekday}`}
                    className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block"
                  >
                    Lead days
                  </label>
                  <input
                    id={`lead-${weekday}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={30}
                    step={1}
                    value={draft.leadDays}
                    onChange={(e) =>
                      updateScheduleDraft(weekday, { leadDays: Number(e.target.value) || 0 })
                    }
                    className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                  />
                </div>
                <label className="flex items-center gap-2 text-[10px] cursor-pointer sm:pb-2">
                  <input
                    type="checkbox"
                    checked={draft.isActive}
                    onChange={(e) => updateScheduleDraft(weekday, { isActive: e.target.checked })}
                    className="w-3 h-3 rounded border-stone-300 text-[#7e2b44] focus:ring-[#7e2b44]"
                  />
                  {draft.isActive ? 'Active' : 'Inactive'}
                </label>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => void handleSaveScheduleDay(weekday)}
                  disabled={busy}
                  leftIcon={<Save className="h-3 w-3" />}
                >
                  {busy ? 'Saving…' : 'Save'}
                </Button>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-stone-500">
          Weekdays follow Europe/London. A cut-off of 14:00 with a 1 day lead time means the
          earliest delivery is the next day. Turning a day off removes it from the storefront
          calendar; the saved row is kept.
        </p>
      </div>

      {/* Postcode Areas Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h3 className="font-serif text-base font-bold text-stone-900">
              Outward Postcode Areas
            </h3>
            <p className="text-xs text-stone-500">Active delivery zones in Newcastle upon Tyne</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-5">Outward Code</th>
                <th className="py-3 px-5">Area Name</th>
                <th className="py-3 px-5">Delivery Fee</th>
                <th className="py-3 px-5">Min Order</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {areas.map((area) => (
                <tr key={area.id} className="hover:bg-stone-50">
                  <td className="py-3 px-5 font-bold text-[#7e2b44]">{area.outwardCode}</td>
                  <td className="py-3 px-5 font-medium">{area.areaName}</td>
                  <td className="py-3 px-5">{formatPence(area.feePence)}</td>
                  <td className="py-3 px-5">{formatPence(area.minimumOrderPence)}</td>
                  <td className="py-3 px-5">
                    <Badge variant={area.isActive ? 'green' : 'neutral'} size="sm">
                      {area.isActive ? 'Active' : 'Disabled'}
                    </Badge>
                  </td>
                  <td className="py-3 px-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleEditArea(area)}
                        disabled={isSubmitting('area')}
                        className="p-1 text-stone-500 hover:text-[#7e2b44] transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteArea(area.id)}
                        disabled={isSubmitting(area.id)}
                        className="p-1 text-stone-500 hover:text-[#c93c3c] transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {areas.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-stone-400 text-xs">
                    No delivery areas configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Closed Dates */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
          <ShieldCheck className="h-5 w-5 text-[#7e2b44]" />
          <h3 className="font-serif text-base font-bold text-stone-900">Closed Dates & Holidays</h3>
        </div>
        {closedDatesError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-[11px] text-red-800">
            <p className="font-semibold">Closed dates could not be loaded.</p>
            <p className="mt-1">
              {closedDatesErrorValue instanceof Error
                ? closedDatesErrorValue.message
                : 'Check your connection and try again.'}
            </p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => void refetchClosedDates()}>
              Try again
            </Button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleAddClosedDate();
          }}
          className="grid grid-cols-1 sm:grid-cols-[10rem_1fr_auto] gap-3 items-end"
        >
          <div className="space-y-1">
            <label
              htmlFor="closed-date"
              className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block"
            >
              Date
            </label>
            <input
              id="closed-date"
              type="date"
              required
              value={closedDateForm.date}
              onChange={(e) => setClosedDateForm({ ...closedDateForm, date: e.target.value })}
              className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="closed-reason"
              className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block"
            >
              Reason
            </label>
            <input
              id="closed-reason"
              required
              maxLength={200}
              value={closedDateForm.reason}
              onChange={(e) => setClosedDateForm({ ...closedDateForm, reason: e.target.value })}
              className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
              placeholder="e.g. Bank holiday"
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            disabled={isSubmitting('closed-new')}
            leftIcon={<Plus className="h-3 w-3" />}
          >
            {isSubmitting('closed-new') ? 'Adding…' : 'Add closed date'}
          </Button>
        </form>
        <p className="text-[10px] text-stone-500">
          Adding a date that is already listed replaces its reason. Closed dates are never offered
          in the storefront delivery calendar.
        </p>

        <div className="space-y-2">
          {closedDates.map((cd) => (
            <div
              key={cd.id}
              className="flex items-center justify-between gap-3 p-3 rounded-lg border border-stone-100 bg-stone-50 text-xs"
            >
              <div className="min-w-0">
                <span className="font-medium">{cd.date}</span>
                <span className="text-stone-500"> — {cd.reason}</span>
              </div>
              <button
                type="button"
                onClick={() => void handleDeleteClosedDate(cd.id)}
                disabled={isSubmitting(`closed-${cd.id}`)}
                className="p-1 shrink-0 text-stone-500 hover:text-[#c93c3c] transition-colors disabled:opacity-50"
                title={`Remove ${cd.date}`}
                aria-label={`Remove closed date ${cd.date}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {closedDates.length === 0 && !closedDatesError && (
            <p className="text-xs text-stone-400 text-center py-4">
              No closed dates configured. Delivery is offered every scheduled week.
            </p>
          )}
        </div>
      </div>

      {/* Public Settings */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
          <Truck className="h-5 w-5 text-[#7e2b44]" />
          <h3 className="font-serif text-base font-bold text-stone-900">Collection & Thresholds</h3>
        </div>

        {settings ? (
          <form onSubmit={(e) => { e.preventDefault(); handleSaveSettings(); }} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Free Delivery Threshold (pence)
                </label>
                <input
                  type="number"
                  value={settingsForm?.freeDeliveryThresholdPence ?? settings.freeDeliveryThresholdPence}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev!,
                      freeDeliveryThresholdPence: Number(e.target.value) || 0,
                    }))
                  }
                  className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Snack Flat Fee (pence)
                </label>
                <input
                  type="number"
                  value={settingsForm?.snackFlatFeePence ?? settings.snackFlatFeePence}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev!,
                      snackFlatFeePence: Number(e.target.value) || 0,
                    }))
                  }
                  className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                Collection Enabled
              </label>
              <label className="flex items-center gap-2 text-[10px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsForm?.collectionEnabled ?? settings.collectionEnabled}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev!,
                      collectionEnabled: e.target.checked,
                    }))
                  }
                  className="w-3 h-3 rounded border-stone-300 text-[#7e2b44] focus:ring-[#7e2b44]"
                />
                {settingsForm?.collectionEnabled ?? settings.collectionEnabled ? 'Enabled' : 'Disabled'}
              </label>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Collection Details
              </label>
                <input
                  value={settingsForm?.collectionDetails ?? settings.collectionDetails ?? ''}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev!,
                      collectionDetails: e.target.value || null,
                    }))
                  }
                  className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                  placeholder="e.g. Click & collect at our shop"
                />
            </div>
            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                size="sm"
                type="submit"
                disabled={isSubmitting('settings')}
              >
                {isSubmitting('settings') ? 'Saving…' : 'Save Settings'}
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-xs text-stone-400 text-center py-4">
            No public settings configured.
          </p>
        )}
      </div>
    </div>
  );
};
