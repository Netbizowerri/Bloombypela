import React, { useState } from 'react';
import { INITIAL_PRODUCTS } from '../data/initialData';
import { formatPence } from '../lib/utils';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Filter, Sparkles, Check, Plus } from 'lucide-react';

export const ShopSnacksPage: React.FC = () => {
  const { addItem } = useCart();
  const { success } = useToast();
  const [selectedVariantId, setSelectedVariantId] = useState<Record<string, string>>({});

  const snacks = INITIAL_PRODUCTS.filter((p) => p.type === 'snack');

  const getActiveVariant = (product: typeof snacks[0]) => {
    const currentId = selectedVariantId[product.id];
    return product.variants.find((v) => v.id === currentId) || product.variants[0];
  };

  const handleSelectVariant = (productId: string, variantId: string) => {
    setSelectedVariantId((prev) => ({ ...prev, [productId]: variantId }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 text-left">
      {/* Header Banner */}
      <div className="border-b border-stone-200 pb-8">
        <span className="text-xs font-bold uppercase tracking-wider text-[#cb932b]">
          Life in Every Bite
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mt-1">
          Artisan Packaged Snacks
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-2 max-w-2xl leading-relaxed">
          Authentic Nigerian flavours sourced with integrity. Plantain chips kettle-cooked to crisp perfection, roasted coconut curls, crunchy nutmeg chin chin, and seasoned peanuts.
        </p>
      </div>

      {/* Grid of snacks (2 Columns on Mobile, 2 on Tablet, 3 on Desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 lg:gap-8">
        {snacks.map((snack) => {
          const activeVariant = getActiveVariant(snack);

          return (
            <div
              key={snack.id}
              className="bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-stone-200 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-4/3 overflow-hidden bg-stone-100">
                  <img
                    src={snack.images[0]}
                    alt={snack.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-wrap gap-1">
                    <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-white/95 backdrop-blur-xs text-[#155d2c] shadow-2xs border border-stone-200">
                      {snack.weightOrVolume}
                    </span>
                    <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#deb252] text-stone-900 shadow-2xs">
                      Origin: {snack.origin}
                    </span>
                  </div>
                </div>

                <div className="p-3 sm:p-6">
                  <h3 className="font-serif text-xs sm:text-xl font-bold text-stone-900 line-clamp-1">{snack.name}</h3>
                  <p className="text-[10px] sm:text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">{snack.description}</p>

                  {/* Variant Selection Buttons */}
                  <div className="mt-2.5 sm:mt-5 space-y-1 sm:space-y-2">
                    <label className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
                      Size:
                    </label>
                    <div className="grid grid-cols-2 gap-1 sm:gap-2">
                      {snack.variants.map((v) => {
                        const isSelected = activeVariant.id === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => handleSelectVariant(snack.id, v.id)}
                            className={`p-1.5 sm:p-2.5 rounded-lg border text-[10px] sm:text-xs text-left transition-all ${
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

                  {/* Ingredients (Desktop / Tablet view) */}
                  <div className="hidden sm:block mt-4 pt-3 border-t border-stone-100 text-[11px] text-stone-500">
                    <span className="font-semibold text-stone-700">Ingredients: </span>
                    {snack.ingredients.join(', ')}
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
                  onClick={() => {
                    addItem(snack, activeVariant, 1);
                    success('Added to basket', `${snack.name} (${activeVariant.name}) added.`);
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
