/**
 * AdminAudit – real audit log viewer (admin only).
 *
 * Displays auditLog entries written by Cloud Functions callables whenever
 * products, delivery settings, orders, or promotions are created/updated/
 * deleted. Read-only; entries are immutable.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Loader2, Search, Clock, RefreshCw, Download } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { formatLondonDate } from '../../lib/utils';
import { ordersRepository } from '../../lib/orders';
import { useToast } from '../../context/ToastContext';

const ACTION_LABELS: Record<string, string> = {
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
  soft_delete: 'Soft delete',
  duplicate: 'Duplicate',
  toggle: 'Toggle',
  upsert: 'Upsert',
  create_product: 'Create product',
  update_product: 'Update product',
  'update_order_status': 'Update order status',
  refund_order: 'Refund order',
};

export const AdminAudit: React.FC = () => {
  const { success, error: showError } = useToast();
  const [entries, setEntries] = useState<Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    uid: string;
    email: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: unknown;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadAudit = useCallback(async () => {
    setLoading(true);
    try {
      const loaded = await ordersRepository.listAuditLog(200);
      setEntries(loaded);
    } catch (err) {
      showError('Audit load failed', err instanceof Error ? err.message : 'Unable to load audit log.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

  const filtered = entries.filter((e) => {
    const s = search.toLowerCase();
    return (
      !s ||
      e.action.toLowerCase().includes(s) ||
      e.entityType.toLowerCase().includes(s) ||
      e.entityId.toLowerCase().includes(s) ||
      (e.email ?? '').toLowerCase().includes(s) ||
      e.uid.toLowerCase().includes(s)
    );
  });

  if (loading) {
    return (
      <div className="py-20 text-center text-stone-500 text-xs">
        <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
        Loading audit log…
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-stone-900">Audit Log</h2>
          <p className="text-xs text-stone-500 mt-1">
            Immutable record of admin actions (products, delivery, orders, promotions).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const blob = new Blob(
                [JSON.stringify(entries, null, 2)],
                { type: 'application/json' },
              );
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'audit-log.json';
              a.click();
              URL.revokeObjectURL(url);
              success('Audit log exported', 'audit-log.json');
            }}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Export JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true);
              void ordersRepository.listAuditLog(200).then((loaded) => {
                setEntries(loaded);
                setLoading(false);
              });
            }}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-100">
          <Input
            label="Search action, entity, ID, or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. update_order_status or BBP-000123"
            className="w-full sm:w-96"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-5">Time (London)</th>
                <th className="py-3 px-5">Action</th>
                <th className="py-3 px-5">Entity</th>
                <th className="py-3 px-5">Entity ID</th>
                <th className="py-3 px-5">User</th>
                <th className="py-3 px-5 text-right">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-400 text-xs">
                    No audit entries match your search.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-stone-50">
                    <td className="py-3 px-5 text-[10px] text-stone-500 font-mono">
                      {e.createdAt
                        ? formatLondonDate(e.createdAt as Date, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : '—'}
                    </td>
                    <td className="py-3 px-5">
                      <Badge variant="burgundy" size="sm">
                        {ACTION_LABELS[e.action] ?? e.action}
                      </Badge>
                    </td>
                    <td className="py-3 px-5 font-medium text-stone-900">
                      {e.entityType}
                    </td>
                    <td className="py-3 px-5 text-[10px] text-stone-600 font-mono">
                      {e.entityId}
                    </td>
                    <td className="py-3 px-5">
                      <div className="font-medium text-stone-800">{e.uid.slice(0, 8)}…</div>
                      <div className="text-[10px] text-stone-500">{e.email ?? '—'}</div>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          const meta = JSON.stringify(e.metadata, null, 2);
                          navigator.clipboard.writeText(meta);
                          success('Metadata copied', 'Audit metadata copied to clipboard.');
                        }}
                        className="p-1 text-stone-500 hover:text-[#7e2b44] transition-colors"
                        title="Copy metadata"
                      >
                        <Clock className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 pt-3 border-t border-stone-100 text-[10px] text-stone-500">
          {filtered.length} of {entries.length} audit entries shown.
        </div>
      </div>
    </div>
  );
};
