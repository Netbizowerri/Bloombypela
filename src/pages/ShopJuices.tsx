import React, { useState } from 'react';
import { INITIAL_PRODUCTS } from '../data/initialData';
import { formatPence } from '../lib/utils';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Calendar, ShieldAlert, Sparkles, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ShopJuicesPage: React.FC = () => {
  const { addItem, openCart } = useCart();
  const { success } = useToast();
  const [selectedVariantId, setSelectedVariantId] = useState<Record<string, string>>({});

  const juices = INITIAL_PRODUCTS.filter((p) => p.type === 'juice');

  const getActiveVariant = (product: typeof juices[0]) => {
    const currentId = selectedVariantId[product.id];
    return product.variants.find((v) => v.id === currentId) || product.variants[0];
  };

  const handleSelectVariant = (productId: string, variantId: string) => {
    setSelectedVariantId((prev) => ({ ...prev, [productId]: variantId }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 text-left">
      {/* Header Banner */}
      <div className="border-b border-stone-200 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#245840]">
            Life in Every Sip
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mt-1">
            Fresh juices and drinks
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-2 max-w-2xl leading-relaxed">
            Raw, cold-pressed, and never heat-pasteurised. Crafted weekly in Newcastle upon Tyne: Tropical Bloom, Skin Glow/Skin Flow, Detox juice blend, Zobo, and Ginger shots.
          </p>
        </div>

        <div className="bg-[#e2f0e6] p-4 rounded-xl border border-[#c4e0ce] text-xs max-w-sm">
          <div className="flex items-center gap-1.5 font-bold text-[#245840] mb-1">
            <Calendar className="h-4 w-4" />
            <span>Weekly Thursday Delivery</span>
          </div>
          <p className="text-stone-700 text-[11px]">
            Orders close Mondays at 12:00 PM London time to prepare fresh batches.
          </p>
          <div className="mt-2">
            <Link to="/subscriptions" className="font-bold text-[#245840] hover:underline">
              Want recurring delivery? Try Weekly Subscriptions →
            </Link>
          </div>
        </div>
      </div>

      {/* Grid of Juices (2 Columns on Mobile, 2 on Tablet, 3 on Desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 lg:gap-8">
        {juices.map((juice) => {
          const activeVariant = getActiveVariant(juice);

          return (
            <div
              key={juice.id}
              className="bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-stone-200 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <Link
                  to={`/product/${juice.slug}`}
                  className="block relative aspect-4/3 overflow-hidden bg-stone-100 cursor-pointer"
                  title={`View ${juice.name} details`}
                >
                  <img
                    src={juice.images[0]}
                    alt={juice.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-wrap gap-1">
                    <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-white/95 backdrop-blur-xs text-[#155d2c] shadow-2xs border border-stone-200">
                      {juice.weightOrVolume}
                    </span>
                  </div>
                </Link>

                <div className="p-3 sm:p-6">
                  <Link to={`/product/${juice.slug}`} className="block">
                    <h3 className="font-serif text-xs sm:text-xl font-bold text-stone-900 line-clamp-1 hover:text-[#155d2c] transition-colors">
                      {juice.name}
                    </h3>
                  </Link>
                  <p className="text-[10px] sm:text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">{juice.description}</p>

                  {/* Variant Selection Buttons */}
                  <div className="mt-2.5 sm:mt-5 space-y-1 sm:space-y-2">
                    <label className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
                      Size:
                    </label>
                    <div className="grid grid-cols-2 gap-1 sm:gap-2">
                      {juice.variants.map((v) => {
                        const isSelected = activeVariant.id === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => handleSelectVariant(juice.id, v.id)}
                            className={`p-1.5 sm:p-2.5 rounded-lg border text-[10px] sm:text-xs text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-[#155d2c] bg-[#e2f0e6] text-[#155d2c] font-semibold ring-1 ring-[#155d2c]'
                                : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                            }`}
                          >
                            <span className="block truncate">{v.name}</span>
                            <span className="text-[9px] sm:text-[11px] font-bold mt-0.5 block">
                              {formatPence(v.pricePence)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Ingredients & Allergens (Desktop / Tablet view) */}
                  <div className="hidden sm:block mt-4 pt-3 border-t border-stone-100 space-y-1.5 text-[11px]">
                    <p className="text-stone-600 line-clamp-2">
                      <span className="font-semibold text-stone-800">Ingredients: </span>
                      {juice.ingredients.join(', ')}
                    </p>
                    {juice.allergens.length > 0 ? (
                      <p className="text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200">
                        <strong>Allergens: </strong> {juice.allergens.join(', ')}
                      </p>
                    ) : (
                      <p className="text-emerald-800">✓ No known allergens</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Price & Add to Cart Action */}
              <div className="p-3 sm:p-6 pt-0 border-t border-stone-100 mt-2 sm:mt-4 flex items-center justify-between gap-1">
                <div className="min-w-0">
                  <span className="text-[8px] sm:text-[10px] uppercase text-stone-400 font-bold block truncate">
                    {activeVariant.name}
                  </span>
                  <span className="font-serif text-sm sm:text-xl font-bold text-[#155d2c]">
                    {formatPence(activeVariant.pricePence)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    addItem(juice, activeVariant, 1);
                    openCart();
                    success('Added to basket', `${juice.name} (${activeVariant.name}) added.`);
                  }}
                  className="inline-flex items-center justify-center gap-1 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-[#155d2c] hover:bg-[#104923] active:scale-95 text-white text-[11px] sm:text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0"
                >
                  <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
