import React from 'react';
import { UK_ALLERGENS } from '../lib/utils';
import { INITIAL_PRODUCTS } from '../data/initialData';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

export const AllergensPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10 text-left">
      <div className="border-b border-stone-200 pb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-[#7e2b44]">
          Food Standards Agency (UK) Compliance
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mt-1">
          14 Major UK Allergens Information
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-2">
          Your safety is our highest priority. Below is our complete allergen matrix covering all Bloom by Pela snacks and drinks.
        </p>
      </div>

      <div className="bg-[#fbf4f5] border border-[#ecccd3] p-6 rounded-2xl flex items-start gap-4">
        <AlertTriangle className="h-6 w-6 text-[#7e2b44] shrink-0 mt-0.5" />
        <div className="text-xs text-stone-800 space-y-1.5 leading-relaxed">
          <h4 className="font-bold text-[#7e2b44]">Kitchen & Cross-Contamination Statement</h4>
          <p>
            While our fresh juices and fruit snacks are prepared under rigorous hygiene controls, some snacks (such as Heritage Chin Chin and Roasted Groundnuts) are prepared where gluten, dairy, eggs, and nuts are handled. If you suffer from a severe anaphylactic allergy, please contact us before ordering.
          </p>
        </div>
      </div>

      {/* Product Allergen Matrix */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-stone-100">
          <h3 className="font-serif text-lg font-bold text-stone-900">Catalogue Allergen Matrix</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-700 font-semibold border-b border-stone-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-6">Product</th>
                <th className="py-3.5 px-6">Category</th>
                <th className="py-3.5 px-6">Allergens Present</th>
                <th className="py-3.5 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {INITIAL_PRODUCTS.map((prod) => (
                <tr key={prod.id} className="hover:bg-stone-50">
                  <td className="py-3.5 px-6 font-bold text-stone-900">{prod.name}</td>
                  <td className="py-3.5 px-6 font-medium text-stone-500 capitalize">{prod.type}</td>
                  <td className="py-3.5 px-6">
                    {prod.allergens.length === 0 ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5" /> None of the 14 allergens
                      </span>
                    ) : (
                      <span className="text-amber-800 font-bold bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 inline-block">
                        {prod.allergens.join(', ')}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-6 text-stone-500">Declared on pack</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* List of 14 Allergens */}
      <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200 space-y-3">
        <h4 className="font-serif text-base font-bold text-stone-900">The 14 Major Regulated UK Allergens</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs text-stone-600">
          {UK_ALLERGENS.map((a, i) => (
            <div key={i} className="p-2 rounded-lg bg-white border border-stone-200">
              {a}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
