import React, { useState } from 'react';
import { formatPence } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../context/ToastContext';
import { RotateCcw, Pause, Play, XCircle, User, Calendar } from 'lucide-react';

export const AdminSubscriptions: React.FC = () => {
  const { success, info } = useToast();

  const [subs, setSubs] = useState([
    {
      id: 'sub_live_01',
      customer: 'Eleanor Vance',
      email: 'eleanor.vance@example.co.uk',
      plan: 'Weekly Bloom 5',
      bottles: 5,
      pricePence: 1950,
      status: 'active',
      nextDelivery: '2026-11-05 (Thursday)',
      flavours: 'Tropical Bloom x2, Skin Glow x1, Zobo x1, Detox x1',
      postcode: 'NE2 2AZ',
    },
    {
      id: 'sub_live_02',
      customer: 'Marcus Thorne',
      email: 'marcus.t@example.co.uk',
      plan: 'Weekly Bloom 3',
      bottles: 3,
      pricePence: 1250,
      status: 'paused',
      nextDelivery: 'Paused until 2026-11-19',
      flavours: 'Tropical Bloom x1, Zobo x2',
      postcode: 'NE3 4HY',
    },
  ]);

  const togglePause = (subId: string) => {
    setSubs((prev) =>
      prev.map((s) => {
        if (s.id === subId) {
          const next = s.status === 'active' ? 'paused' : 'active';
          success(`Subscription ${subId}`, `Status changed to ${next}.`);
          return { ...s, status: next };
        }
        return s;
      })
    );
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-stone-900">
            Weekly Juice Subscriptions
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Monitor active recurring subscribers, upcoming bottle selections, and pause schedules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="green" size="md">
            42 Active Subscribers
          </Badge>
          <Badge variant="gold" size="md">
            MRR: £2,720.00 / mo
          </Badge>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-5">Subscriber</th>
                <th className="py-3 px-5">Plan & Rate</th>
                <th className="py-3 px-5">Flavours for Next Thursday</th>
                <th className="py-3 px-5">Area</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {subs.map((sub) => (
                <tr key={sub.id} className="hover:bg-stone-50">
                  <td className="py-3.5 px-5">
                    <div className="font-bold text-stone-900">{sub.customer}</div>
                    <span className="text-[10px] text-stone-400">{sub.email}</span>
                  </td>

                  <td className="py-3.5 px-5">
                    <div className="font-semibold text-[#7e2b44]">{sub.plan}</div>
                    <span className="text-stone-500 font-medium">{formatPence(sub.pricePence)}/wk</span>
                  </td>

                  <td className="py-3.5 px-5 max-w-xs truncate">
                    <span className="text-stone-800">{sub.flavours}</span>
                    <span className="block text-[10px] text-stone-400 mt-0.5">{sub.nextDelivery}</span>
                  </td>

                  <td className="py-3.5 px-5 font-semibold text-[#cb932b]">{sub.postcode}</td>

                  <td className="py-3.5 px-5">
                    <Badge variant={sub.status === 'active' ? 'green' : 'gold'} size="sm">
                      {sub.status}
                    </Badge>
                  </td>

                  <td className="py-3.5 px-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => togglePause(sub.id)}
                      >
                        {sub.status === 'active' ? 'Pause' : 'Resume'}
                      </Button>
                    </div>
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
