/**
 * AdminPromotions - manage discount/promo codes.
 *
 * Full CRUD for promotions with zod validation in the form. Each write goes
 * straight to Firestore (admin claim required by the rules) and appends an
 * auditLog entry.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Edit, ToggleRight, ToggleLeft, Sparkles, Save, X } from 'lucide-react';
import { formatPence } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../context/ToastContext';
import { promotionsApi } from '../../lib/promotions';
import type { Promotion } from '../../types/promotions';

const PromotionFormSchema = z.object({
  code: z.string().trim().min(3).max(20),
  type: z.enum(['percent', 'fixed', 'freeDelivery']),
  value: z.number().nonnegative().max(10000),
  minSpendPence: z.number().nonnegative(),
  usageLimit: z.string().trim().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  active: z.boolean(),
});

type PromotionFormData = z.infer<typeof PromotionFormSchema>;

export const AdminPromotions: React.FC = () => {
  const { success, error: showError } = useToast();

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<PromotionFormData>({
    resolver: zodResolver(PromotionFormSchema),
    defaultValues: {
      code: '',
      type: 'percent',
      value: 0,
      minSpendPence: 0,
      usageLimit: '',
      startsAt: '',
      endsAt: '',
      active: true,
    },
  });

  const isSubmitting = (id: string) => submitting.has(id);

  const loadPromotions = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setPromotions(await promotionsApi.listPromotions());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load promotions.';
      setLoadError(message);
      showError('Load failed', message);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    void loadPromotions();
  }, [loadPromotions]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    form.reset({
      code: '',
      type: 'percent',
      value: 0,
      minSpendPence: 0,
      usageLimit: '',
      startsAt: '',
      endsAt: '',
      active: true,
    });
    setOpen(true);
  }, [form]);

  const handleSave = useCallback(async (data: PromotionFormData) => {
    setSubmitting(new Set([editingId ?? 'new']));
    try {
      const usageLimit = data.usageLimit ? parseInt(data.usageLimit, 10) : null;
      if (usageLimit !== null && isNaN(usageLimit)) {
        showError('Invalid usage limit', 'Please enter a valid number.');
        return;
      }

      if (editingId) {
        await promotionsApi.updatePromotion({
          id: editingId,
          code: data.code,
          type: data.type,
          value: data.value,
          minSpendPence: data.minSpendPence,
          usageLimit,
          startsAt: data.startsAt || null,
          endsAt: data.endsAt || null,
          active: data.active,
        });
        success('Promotion updated', `${data.code} saved.`);
      } else {
        await promotionsApi.createPromotion({
          code: data.code,
          type: data.type,
          value: data.value,
          minSpendPence: data.minSpendPence,
          usageLimit,
          startsAt: data.startsAt || null,
          endsAt: data.endsAt || null,
          active: data.active,
        });
        success('Promotion created', `${data.code} added.`);
      }
      setOpen(false);
      setEditingId(null);
      form.reset({
        code: '',
        type: 'percent',
        value: 0,
        minSpendPence: 0,
        usageLimit: '',
        startsAt: '',
        endsAt: '',
        active: true,
      });
      await loadPromotions();
    } catch (err) {
      showError('Save failed', err instanceof Error ? err.message : 'Unable to save promotion');
    } finally {
      setSubmitting(new Set());
    }
  }, [editingId, form, loadPromotions, showError, success]);

  const handleToggle = useCallback(async (promo: Promotion) => {
    setSubmitting(new Set([promo.id]));
    try {
      await promotionsApi.togglePromotion(promo.id);
      success('Promotion updated', `${promo.code} is now ${!promo.active ? 'active' : 'inactive'}.`);
      setPromotions((prev) =>
        prev.map((p) => (p.id === promo.id ? { ...p, active: !p.active } : p)),
      );
    } catch (err) {
      showError('Toggle failed', err instanceof Error ? err.message : 'Unable to toggle promotion');
    } finally {
      setSubmitting(new Set());
    }
  }, [showError]);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Delete this promotion?')) return;
    setSubmitting(new Set([id]));
    try {
      await promotionsApi.deletePromotion(id);
      success('Promotion deleted', 'Promotion removed.');
      setPromotions((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      showError('Delete failed', err instanceof Error ? err.message : 'Unable to delete promotion');
    } finally {
      setSubmitting(new Set());
    }
  }, [showError]);

  if (loading) {
    return (
      <div className="py-20 text-center text-stone-500 text-xs">
        Loading promotions…
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-stone-900">
            Promotions &amp; Discount Codes
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Create and manage discount codes for the checkout.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={resetForm}
          disabled={submitting.size > 0}
        >
          Add Promotion
        </Button>
      </div>

      {/* Promotion form modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="relative bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-serif text-xl font-bold text-stone-900">
                {editingId ? 'Edit Promotion' : 'Add Promotion'}
              </h3>
              <button
                type="button"
                className="p-2 text-stone-400 hover:text-stone-900 transition-colors"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <span className="block text-stone-900">✕</span>
              </button>
            </div>
            <form onSubmit={form.handleSubmit(handleSave)} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Code
                </label>
                <input
                  {...form.register('code')}
                  className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none uppercase"
                  placeholder="e.g. WELCOME10"
                />
                {form.formState.errors.code && (
                  <p className="text-[10px] text-[#c93c3c]">{form.formState.errors.code.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Type
                </label>
                <select
                  {...form.register('type')}
                  className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                >
                  <option value="percent">Percentage off</option>
                  <option value="fixed">Fixed amount off</option>
                  <option value="freeDelivery">Free delivery</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Value
                </label>
                <input
                  {...form.register('value')}
                  type="number"
                  className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                  placeholder={form.getValues('type') === 'percent' ? 'e.g. 10' : 'e.g. 500'}
                />
                {form.formState.errors.value && (
                  <p className="text-[10px] text-[#c93c3c]">{form.formState.errors.value.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Minimum spend (pence)
                </label>
                <input
                  {...form.register('minSpendPence')}
                  type="number"
                  className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Usage limit (optional)
                </label>
                <input
                  {...form.register('usageLimit')}
                  type="number"
                  className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                  placeholder="Unlimited"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 space-y-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Starts at (YYYY-MM-DD)
                  </label>
                  <input
                    {...form.register('startsAt')}
                    type="date"
                    className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Ends at (YYYY-MM-DD)
                  </label>
                  <input
                    {...form.register('endsAt')}
                    type="date"
                    className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                  Active
                </label>
                <label className="flex items-center gap-2 text-[10px] cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={form.getValues('active')}
                    onChange={() => form.setValue('active', !form.getValues('active'))}
                    className="w-3 h-3 rounded border-stone-300 text-[#7e2b44] focus:ring-[#7e2b44]"
                  />
                  {form.getValues('active') ? 'Active' : 'Inactive'}
                </label>
              </div>
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-xs rounded-lg border border-stone-200 px-4 py-2 text-stone-600 hover:bg-stone-50 transition-colors"
                  disabled={submitting.size > 0}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs rounded-lg bg-[#155d2c] px-4 py-2 text-white font-semibold hover:bg-[#104923] transition-colors shadow-sm"
                  disabled={submitting.size > 0}
                >
                  {submitting.size > 0 ? 'Saving…' : 'Save promotion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Promotions list */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
        <h3 className="font-serif text-base font-bold text-stone-900 mb-4">
          Active promotions
        </h3>
        {loadError ? (
          <div role="alert" className="py-12 text-center text-stone-500 text-xs">
            <p className="text-[#c93c3c] font-medium">Promotions could not be loaded.</p>
            <p className="mt-1">{loadError}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void loadPromotions()}>
              Try again
            </Button>
          </div>
        ) : promotions.length === 0 ? (
          <div className="py-12 text-center text-stone-400 text-xs">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No promotions configured yet.</p>
            <p className="mt-1 text-[10px] text-stone-400">
              Use "Add Promotion" to create your first discount code.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {promotions.map((promo) => (
              <div key={promo.id} className="flex items-center justify-between p-3 rounded-lg border border-stone-100 bg-stone-50 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-medium text-stone-800">{promo.code}</span>
                  <Badge variant={promo.type === 'percent' ? 'gold' : promo.type === 'fixed' ? 'burgundy' : 'green'} size="sm">
                    {promo.type}
                  </Badge>
                  <Badge variant={promo.active ? 'green' : 'neutral'} size="sm">
                    {promo.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{promo.value}{promo.type === 'percent' ? '%' : formatPence(promo.value)} off</span>
                  <button
                    type="button"
                    onClick={() => handleToggle(promo)}
                    disabled={isSubmitting(promo.id)}
                    className="p-1 text-stone-500 hover:text-stone-900 transition-colors"
                    aria-label={promo.active ? 'Deactivate' : 'Activate'}
                  >
                    {promo.active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(promo.id);
                      form.reset({
                        code: promo.code,
                        type: promo.type,
                        value: promo.value,
                        minSpendPence: promo.minSpendPence,
                        usageLimit: promo.usageLimit?.toString() ?? '',
                        startsAt: promo.startsAt ?? '',
                        endsAt: promo.endsAt ?? '',
                        active: promo.active,
                      });
                      setOpen(true);
                    }}
                    className="p-1 text-stone-500 hover:text-[#7e2b44] transition-colors"
                    aria-label="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(promo.id)}
                    disabled={isSubmitting(promo.id)}
                    className="p-1 text-stone-500 hover:text-[#c93c3c] transition-colors"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[10px] text-stone-400 text-center mt-4">
        PLACEHOLDER: Promotion list reads from Firestore. Create promotions via the form above;
        they are validated server-side by quoteCart at checkout.
      </p>
    </div>
  );
};
