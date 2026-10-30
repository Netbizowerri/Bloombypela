import React, { useState } from 'react';
import { INITIAL_DELIVERY_AREAS } from '../../data/initialData';
import { formatPence } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../context/ToastContext';
import { Plus, Edit, Truck, Clock, ShieldCheck } from 'lucide-react';

export const AdminDeliverySettings: React.FC = () => {
  const [areas, setAreas] = useState(INITIAL_DELIVERY_AREAS);
  const { success } = useToast();

  const toggleArea = (id: string) => {
    setAreas((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const next = !a.isActive;
          success(`Updated ${a.outwardCode}`, `Area is now ${next ? 'Active' : 'Disabled'}.`);
          return { ...a, isActive: next };
        }
        return a;
      })
    );
  };

  return (
    <div className="space-y-8 text-left">
      <div>
        <h2 className="font-serif text-2xl font-bold text-stone-900">
          Delivery Configuration & Schedule
        </h2>
        <p className="text-xs text-stone-500 mt-1">
          Configure outward postcodes, minimum spends, free delivery thresholds, and cut-off rules.
        </p>
      </div>

      {/* Schedule Configuration Card */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
          <Clock className="h-5 w-5 text-[#7e2b44]" />
          <h3 className="font-serif text-base font-bold text-stone-900">
            Weekly Delivery Schedule Rules (Europe/London)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-stone-400">Delivery Run Day</span>
            <p className="font-bold text-stone-800 text-sm">Every Thursday</p>
            <p className="text-stone-500 text-[11px]">Covers Newcastle & Gateshead runs</p>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-stone-400">Order Cut-off Time</span>
            <p className="font-bold text-[#7e2b44] text-sm">Monday 12:00 PM</p>
            <p className="text-stone-500 text-[11px]">Enforced across BST / GMT changes</p>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-stone-400">Lead Days</span>
            <p className="font-bold text-[#245840] text-sm">3 Working Days</p>
            <p className="text-stone-500 text-[11px]">Required for cold-press preparation</p>
          </div>
        </div>
      </div>

      {/* Postcode Areas Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h3 className="font-serif text-base font-bold text-stone-900">Outward Postcode Areas</h3>
            <p className="text-xs text-stone-500">Active delivery zones in Newcastle upon Tyne</p>
          </div>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => success('New Area', 'Postcode rule builder ready.')}
          >
            Add Postcode Zone
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-5">Outward Code</th>
                <th className="py-3 px-5">Area Name</th>
                <th className="py-3 px-5">Delivery Fee</th>
                <th className="py-3 px-5">Min Order</th>
                <th className="py-3 px-5">Free Delivery Threshold</th>
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
                  <td className="py-3 px-5 font-semibold text-[#245840]">
                    {formatPence(area.freeDeliveryThresholdPence)}
                  </td>
                  <td className="py-3 px-5">
                    <Badge variant={area.isActive ? 'green' : 'neutral'} size="sm">
                      {area.isActive ? 'Active' : 'Disabled'}
                    </Badge>
                  </td>
                  <td className="py-3 px-5 text-right">
                    <button
                      type="button"
                      onClick={() => toggleArea(area.id)}
                      className="text-xs font-semibold text-[#7e2b44] hover:underline"
                    >
                      {area.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
