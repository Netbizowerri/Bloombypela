import React, { useState } from 'react';
import { formatPence } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../context/ToastContext';
import {
  FileText,
  Download,
  Filter,
  CheckCircle,
  Truck,
  PackageCheck,
  Printer,
  ChevronDown,
} from 'lucide-react';

export const AdminOrders: React.FC = () => {
  const { success, info } = useToast();

  const [orders, setOrders] = useState([
    {
      id: 'BBP-ORD-8923',
      customer: 'Eleanor Vance',
      email: 'eleanor.vance@example.co.uk',
      phone: '07890 123456',
      postcode: 'NE2 2AZ',
      area: 'NE2 (Jesmond)',
      deliveryDate: '2026-11-05 (Thursday)',
      items: [
        { name: 'Weekly Bloom 5 (Juice Subscription)', qty: 1, pricePence: 1950 },
        { name: 'Plantain chips (150g)', qty: 1, pricePence: 350 },
      ],
      totalPence: 2300,
      status: 'Preparing',
      notes: 'Please leave in porch box if no answer.',
    },
    {
      id: 'BBP-ORD-8922',
      customer: 'David Taylor',
      email: 'david.taylor@example.co.uk',
      phone: '07700 987654',
      postcode: 'NE1 4ST',
      area: 'NE1 (City Centre)',
      deliveryDate: '2026-11-05 (Thursday)',
      items: [
        { name: 'Tropical Bloom (330ml)', qty: 3, pricePence: 1350 },
      ],
      totalPence: 1350,
      status: 'Preparing',
    },
    {
      id: 'BBP-ORD-8921',
      customer: 'Sarah Jenkins',
      email: 'sarah.jenkins@example.co.uk',
      phone: '07911 223344',
      postcode: 'NE3 1AA',
      area: 'NE3 (Gosforth)',
      deliveryDate: '2026-10-29 (Thursday)',
      items: [
        { name: 'The Bloom Tasting Box', qty: 1, pricePence: 2200 },
        { name: 'Ginger shots (6-pack)', qty: 1, pricePence: 1350 },
      ],
      totalPence: 3550,
      status: 'Delivered',
    },
  ]);

  const updateStatus = (orderId: string, newStatus: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    success(
      `Order ${orderId} Updated`,
      `Status changed to "${newStatus}". Customer notification email dispatched.`
    );
  };

  const handleExportCsv = () => {
    info('CSV Export', 'DeliveryManifest-Newcastle-Thu.csv generated and downloaded.');
  };

  const handlePrintPackingSlip = (orderId: string) => {
    info('Packing Slip Generated', `Printing delivery packing slip for ${orderId}...`);
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-stone-900">Orders & Fulfilment</h2>
          <p className="text-xs text-stone-500 mt-1">
            Manage upcoming Thursday delivery runs, packing slips, and order milestones.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Export Delivery CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => info('Bulk Packing Slips', 'Sending all Thursday batch slips to print dialog.')}
            leftIcon={<Printer className="h-4 w-4" />}
          >
            Print All Batch Slips
          </Button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-4 gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm text-[#7e2b44]">{order.id}</span>
                  <Badge
                    variant={
                      order.status === 'Delivered'
                        ? 'green'
                        : order.status === 'Out for delivery'
                        ? 'gold'
                        : 'neutral'
                    }
                  >
                    {order.status}
                  </Badge>
                  <span className="text-xs font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                    Area: {order.area}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Customer: <strong className="text-stone-800">{order.customer}</strong> ({order.phone}) • Delivery Date: {order.deliveryDate}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-serif text-xl font-bold text-stone-900">
                  {formatPence(order.totalPence)}
                </span>

                {/* Status action dropdown */}
                <select
                  value={order.status}
                  onChange={(e) => updateStatus(order.id, e.target.value)}
                  className="rounded-lg border border-stone-300 text-xs font-semibold px-3 py-1.5 bg-white text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#7e2b44]"
                >
                  <option value="Preparing">Preparing</option>
                  <option value="Out for delivery">Out for delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Collected">Collected</option>
                </select>
              </div>
            </div>

            {/* Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                  Items to Pack:
                </span>
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-stone-800 py-0.5">
                    <span>
                      {item.qty} × {item.name}
                    </span>
                    <span className="font-medium text-stone-500">{formatPence(item.pricePence)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                  Delivery Destination:
                </span>
                <p className="text-stone-700">
                  Postcode outward: <strong>{order.postcode}</strong>
                </p>
                {order.notes && (
                  <p className="text-amber-800 bg-amber-50 p-2 rounded border border-amber-200 mt-1">
                    <strong>Customer Note:</strong> {order.notes}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePrintPackingSlip(order.id)}
                leftIcon={<FileText className="h-3.5 w-3.5" />}
              >
                Packing Slip
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
