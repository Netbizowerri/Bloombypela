import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../context/ToastContext';
import { Calendar, Plus, AlertCircle, CheckCircle, Lock } from 'lucide-react';

export const AdminCapacity: React.FC = () => {
  const { success } = useToast();

  const [batches, setBatches] = useState([
    {
      date: '2026-11-05',
      displayDate: 'Thursday, 5 November 2026',
      maxUnits: 250,
      reservedSubscribers: 140,
      oneOffOrders: 45,
      isClosed: false,
    },
    {
      date: '2026-11-12',
      displayDate: 'Thursday, 12 November 2026',
      maxUnits: 250,
      reservedSubscribers: 145,
      oneOffOrders: 20,
      isClosed: false,
    },
    {
      date: '2026-11-19',
      displayDate: 'Thursday, 19 November 2026',
      maxUnits: 250,
      reservedSubscribers: 140,
      oneOffOrders: 5,
      isClosed: false,
    },
    {
      date: '2026-12-24',
      displayDate: 'Thursday, 24 December 2026 (Christmas Eve)',
      maxUnits: 300,
      reservedSubscribers: 0,
      oneOffOrders: 0,
      isClosed: true,
    },
  ]);

  const toggleClosure = (date: string) => {
    setBatches((prev) =>
      prev.map((b) => {
        if (b.date === date) {
          const next = !b.isClosed;
          success(`Date Updated`, `${b.displayDate} marked as ${next ? 'Closed' : 'Open'}.`);
          return { ...b, isClosed: next };
        }
        return b;
      })
    );
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-stone-900">
            Juice Batch Capacity Calendar
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Cold-pressed juice capacity is limited by bottle pressing limits per Thursday batch.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => success('New Batch', 'Add custom delivery date or capacity override.')}
        >
          Add Date Override
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {batches.map((batch) => {
          const totalBooked = batch.reservedSubscribers + batch.oneOffOrders;
          const remaining = Math.max(0, batch.maxUnits - totalBooked);
          const percent = Math.min(100, Math.round((totalBooked / batch.maxUnits) * 100));

          return (
            <div
              key={batch.date}
              className={`bg-white rounded-2xl border p-6 shadow-xs space-y-4 ${
                batch.isClosed ? 'border-red-200 bg-red-50/20' : 'border-stone-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <Calendar className="h-5 w-5 text-[#7e2b44]" />
                  <div>
                    <h3 className="font-serif text-base font-bold text-stone-900">
                      {batch.displayDate}
                    </h3>
                    <span className="text-[11px] text-stone-400">Date key: {batch.date}</span>
                  </div>
                </div>

                <Badge variant={batch.isClosed ? 'danger' : 'green'}>
                  {batch.isClosed ? 'Closed / Holiday' : 'Open for Orders'}
                </Badge>
              </div>

              {batch.isClosed ? (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                  <Lock className="h-4 w-4 shrink-0" />
                  <span>Deliveries closed on this date. No checkouts allowed.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-stone-600 font-medium">Batch Utilization:</span>
                    <span className="font-bold text-stone-900">
                      {totalBooked} / {batch.maxUnits} Bottles ({percent}%)
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
                        Subscribers
                      </span>
                      <strong className="text-stone-800 font-serif text-sm">
                        {batch.reservedSubscribers}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                      <span className="text-[10px] text-stone-400 block font-semibold uppercase">
                        One-off
                      </span>
                      <strong className="text-stone-800 font-serif text-sm">
                        {batch.oneOffOrders}
                      </strong>
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

              <div className="pt-2 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => toggleClosure(batch.date)}
                >
                  {batch.isClosed ? 'Reopen Delivery Date' : 'Mark Date as Closed'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
