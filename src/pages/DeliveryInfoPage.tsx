import React from 'react';
import { SEED_DELIVERY_AREAS } from '../data/seed/deliveryAreas';
import { formatPence } from '../lib/utils';
import { Truck, Clock, MapPin, AlertCircle, Calendar } from 'lucide-react';

export const DeliveryInfoPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 text-left">
      <div className="border-b border-stone-200 pb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-[#245840]">
          Logistics & Coverage
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mt-1">
          Delivery Information & Schedule
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-2">
          Everything you need to know about our Newcastle delivery coverage and shipping.
        </p>
      </div>

      {/* Schedule Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-2">
          <Truck className="h-6 w-6 text-[#7e2b44]" />
          <h3 className="font-serif text-lg font-bold text-stone-900">Local Delivery</h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            Deliveries take place across Newcastle upon Tyne.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-2">
          <Clock className="h-6 w-6 text-[#cb932b]" />
          <h3 className="font-serif text-lg font-bold text-stone-900">Order Anytime</h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            Place your order any time. Juices and snacks are prepared fresh as they are ordered.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-2">
          <MapPin className="h-6 w-6 text-[#245840]" />
          <h3 className="font-serif text-lg font-bold text-stone-900">Delivery & Shipping</h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            Local delivery is <strong>FREE on orders over £30.00</strong>. Shipping depends on
            what you order: <strong>£3.99 for snack-only orders</strong> and{' '}
            <strong>£5.99 for orders containing fresh juices</strong> (heavier, chilled packs).
          </p>
        </div>
      </div>

      {/* Eligible Postcodes Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm" id="postcodes">
        <div className="p-6 border-b border-stone-100 bg-stone-50/70">
          <h3 className="font-serif text-lg font-bold text-stone-900">
            Eligible Newcastle Delivery Areas
          </h3>
          <p className="text-xs text-stone-500">
            We currently deliver to the following UK outward postcode codes. Snack-only orders are
            charged £3.99; the juice fee below applies to any order containing fresh juices.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-6">Outward Postcode</th>
                <th className="py-3 px-6">Area Name</th>
                <th className="py-3 px-6">Juice Delivery Fee</th>
                <th className="py-3 px-6">Minimum Spend</th>
                <th className="py-3 px-6">Free Delivery Threshold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-600">
              {SEED_DELIVERY_AREAS.map((area) => (
                <tr key={area.id} className="hover:bg-stone-50">
                  <td className="py-3.5 px-6 font-bold text-[#7e2b44]">{area.outwardCode}</td>
                  <td className="py-3.5 px-6 font-medium text-stone-800">{area.areaName}</td>
                  <td className="py-3.5 px-6">{formatPence(area.feePence)}</td>
                  <td className="py-3.5 px-6">{formatPence(area.minimumOrderPence)}</td>
                    <td className="py-3.5 px-6 font-semibold text-[#245840]">
                      {formatPence(3000)}
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Perishable Goods Notice */}
      <div className="bg-[#faf1de] p-6 rounded-2xl border border-[#f4e1ba] flex items-start gap-4">
        <AlertCircle className="h-5 w-5 text-[#8d561c] shrink-0 mt-0.5" />
        <div className="text-xs text-[#73451c] space-y-1">
          <h4 className="font-bold">Important Notice Regarding Perishable Juices</h4>
          <p className="leading-relaxed">
            Our cold-pressed juices are raw and unpasteurised. Please ensure someone is available at the delivery address to receive and refrigerate your bottles immediately (store below 4°C). Consume within 5 days of delivery.
          </p>
        </div>
      </div>
    </div>
  );
};
