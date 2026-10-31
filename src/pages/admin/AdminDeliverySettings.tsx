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
import { Plus, Edit, Trash2, Clock, ShieldCheck, Truck, Save, X } from 'lucide-react';
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
  const { data: schedule = [], refetch: refetchSchedule } = useDeliverySchedule();
  const { data: closedDates = [], refetch: refetchClosedDates } = useClosedDates();
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

  const isSubmitting = (id: string) => submitting.has(id);

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {schedule.map((day) => (
            <div key={day.id} className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
              <span className="text-[10px] uppercase font-bold text-stone-400">
                Weekday {day.weekday}
              </span>
              <p className="font-bold text-stone-800 text-sm">{day.cutoffTime} cutoff</p>
              <p className="text-stone-500 text-[11px]">{day.leadDays} day lead time</p>
              <Badge variant={day.isActive ? 'green' : 'neutral'} size="sm">
                {day.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          ))}
          {schedule.length === 0 && (
            <p className="text-xs text-stone-400 text-center py-4">
              No schedule days configured.
            </p>
          )}
        </div>
        <p className="text-[10px] text-stone-500 mt-1">
          Schedule days are managed via the admin callable functions. Use the UI above to add areas;
          schedule, closed dates, and capacity are configured in Firestore by the owner.
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
        <div className="space-y-2">
          {closedDates.map((cd) => (
            <div key={cd.id} className="flex items-center justify-between p-3 rounded-lg border border-stone-100 bg-stone-50 text-xs">
              <span className="font-medium">{cd.date}</span>
              <span className="text-stone-500">{cd.reason}</span>
            </div>
          ))}
          {closedDates.length === 0 && (
            <p className="text-xs text-stone-400 text-center py-4">
              No closed dates configured.
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
