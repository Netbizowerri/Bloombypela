import React, { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { INITIAL_PRODUCTS } from '../data/initialData';
import { formatPence } from '../lib/utils';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/ui/Badge';
import {
  Search,
  SlidersHorizontal,
  X,
  Plus,
  Check,
  RotateCcw,
  Sparkles,
  Calendar,
  Package,
  UtensilsCrossed,
} from 'lucide-react';
import { Product, ProductVariant } from '../types/products';

export const ShopPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addItem, openCart } = useCart();
  const { success } = useToast();

  // State from URL query or defaults
  const categoryParam = searchParams.get('category') || 'all';
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryParam);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'name'>('featured');
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<Record<string, string>>({});

  const categories = [
    { id: 'all', label: 'All Items', icon: Sparkles },
    { id: 'snack', label: 'Snacks', icon: Package },
    { id: 'juice', label: 'Fresh juices and drinks', icon: UtensilsCrossed },
  ];

  const dietaryOptions = [
    { id: 'no-allergens', label: 'No Major Allergens' },
    { id: 'nut-free', label: 'Nut-Free' },
    { id: 'raw', label: '100% Raw & Fresh' },
  ];

  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId);
    if (catId === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', catId);
    }
    setSearchParams(searchParams);
  };

  const toggleDietary = (id: string) => {
    setSelectedDietary((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const clearAllFilters = () => {
    setSelectedCategory('all');
    setSearchQuery('');
    setSelectedDietary([]);
    setSortBy('featured');
    setSearchParams({});
  };

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let result = [...INITIAL_PRODUCTS];

    // Category
    if (selectedCategory !== 'all') {
      result = result.filter((p) => p.type === selectedCategory);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.ingredients.some((ing) => ing.toLowerCase().includes(q))
      );
    }

    // Dietary filters
    if (selectedDietary.includes('no-allergens')) {
      result = result.filter((p) => p.allergens.length === 0);
    }
    if (selectedDietary.includes('nut-free')) {
      result = result.filter(
        (p) => !p.allergens.some((a) => a.toLowerCase().includes('peanut') || a.toLowerCase().includes('nut'))
      );
    }
    if (selectedDietary.includes('raw')) {
      result = result.filter((p) => p.type === 'juice');
    }

    // Sorting
    if (sortBy === 'price-asc') {
      result.sort((a, b) => a.variants[0].pricePence - b.variants[0].pricePence);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.variants[0].pricePence - a.variants[0].pricePence);
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [selectedCategory, searchQuery, selectedDietary, sortBy]);

  const getActiveVariant = (product: Product): ProductVariant => {
    const currentId = selectedVariantId[product.id];
    return product.variants.find((v) => v.id === currentId) || product.variants[0];
  };

  const handleSelectVariant = (productId: string, variantId: string) => {
    setSelectedVariantId((prev) => ({ ...prev, [productId]: variantId }));
  };

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    searchQuery.trim() !== '' ||
    selectedDietary.length > 0 ||
    sortBy !== 'featured';

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8 text-left">
      {/* ----------------- Header Banner ----------------- */}
      <div className="border-b border-stone-200/80 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#155d2c]">
            The Bloom Storefront
          </span>
          <h1 className="font-serif text-2xl sm:text-4xl font-bold text-stone-900 mt-1">
            Browse All Products
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1.5 max-w-2xl leading-relaxed">
            Authentic Nigerian plantain snacks &amp; raw cold-pressed vitality juices crafted in Newcastle upon Tyne.
          </p>
        </div>

        {/* Quick Link to Subscriptions */}
        <div className="flex items-center gap-2 text-xs bg-[#FFF5E6] border border-[#eedcc8] px-3.5 py-2 rounded-xl text-stone-800 shrink-0">
          <Calendar className="h-4 w-4 text-[#155d2c] shrink-0" />
          <span>
            Thursday doorstep delivery.{' '}
            <Link to="/subscriptions" className="font-bold text-[#155d2c] hover:underline">
              Save with subscriptions →
            </Link>
          </span>
        </div>
      </div>

      {/* ----------------- Controls & Filters Bar ----------------- */}
      <div className="space-y-3">
        {/* Top Control Row: Search + Category Tabs + Sort + Filter Toggle */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search juices, snacks, ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#155d2c] text-stone-900 placeholder:text-stone-400 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Category Tabs (Desktop & Tablet) */}
          <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-200 overflow-x-auto">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white text-[#155d2c] shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <cat.icon className={`h-3.5 w-3.5 ${isSelected ? 'text-[#155d2c]' : 'text-stone-400'}`} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sort & Mobile Filter Toggle */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl text-stone-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#155d2c] shadow-2xs"
            >
              <option value="featured">Sort: Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name">Name: A to Z</option>
            </select>

            {/* Filter Drawer button (Mobile) */}
            <button
              type="button"
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl border transition-all cursor-pointer ${
                mobileFilterOpen || selectedDietary.length > 0
                  ? 'bg-[#155d2c] text-white border-[#155d2c]'
                  : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filters</span>
              {selectedDietary.length > 0 && (
                <span className="h-4 w-4 rounded-full bg-white text-[#155d2c] text-[10px] font-bold flex items-center justify-center">
                  {selectedDietary.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Expandable Dietary / Tag Filters */}
        <div
          className={`${
            mobileFilterOpen ? 'block' : 'hidden md:flex'
          } flex-wrap items-center gap-2 pt-2 border-t border-stone-100`}
        >
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mr-1">
            Dietary:
          </span>
          {dietaryOptions.map((opt) => {
            const isSelected = selectedDietary.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleDietary(opt.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#155d2c] text-white border-[#155d2c] shadow-2xs'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                }`}
              >
                {isSelected && <Check className="h-3 w-3" />}
                <span>{opt.label}</span>
              </button>
            );
          })}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-stone-500 hover:text-red-600 font-medium ml-auto cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset filters</span>
            </button>
          )}
        </div>
      </div>

      {/* ----------------- Active Results Count ----------------- */}
      <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
        <span>
          Showing <strong>{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'item' : 'items'}
        </span>
        {hasActiveFilters && (
          <span className="text-stone-400 text-[11px]">Filtered view</span>
        )}
      </div>

      {/* ----------------- PRODUCT GRID (2 Columns on Mobile, 2 on Tablet, 3/4 on Desktop) ----------------- */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 space-y-4 max-w-lg mx-auto">
          <div className="h-12 w-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="font-serif text-lg font-bold text-stone-900">No matching treats found</h3>
          <p className="text-xs text-stone-500">
            Try adjusting your search keyword or clearing the dietary filters.
          </p>
          <button
            type="button"
            onClick={clearAllFilters}
            className="px-4 py-2 rounded-xl bg-[#155d2c] text-white text-xs font-semibold hover:bg-[#104923] transition-colors"
          >
            Show All Products
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {filteredProducts.map((product) => {
            const activeVariant = getActiveVariant(product);

            return (
              <div
                key={product.id}
                className="group bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-stone-200/80 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Image & Badges: Clicking image navigates to product page */}
                  <Link
                    to={`/product/${product.slug}`}
                    className="block relative aspect-4/3 sm:aspect-square overflow-hidden bg-stone-100 cursor-pointer"
                    title={`View ${product.name} details`}
                  >
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-wrap gap-1">
                      <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/95 backdrop-blur-xs text-[#155d2c] shadow-2xs border border-stone-200">
                        {product.weightOrVolume}
                      </span>
                    </div>
                  </Link>

                  {/* Product Details */}
                  <div className="p-3 sm:p-5">
                    <Link to={`/product/${product.slug}`} className="block">
                      <h3 className="font-serif text-xs sm:text-base font-bold text-stone-900 line-clamp-1 group-hover:text-[#155d2c] transition-colors">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="text-[10px] sm:text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                      {product.shortDescription || product.description}
                    </p>

                    {/* Variant Selector */}
                    {product.variants.length > 1 && (
                      <div className="mt-2.5 sm:mt-3 pt-2 border-t border-stone-100">
                        <span className="text-[9px] sm:text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                          Size:
                        </span>
                        <div className="grid grid-cols-2 gap-1">
                          {product.variants.map((v) => {
                            const isSelected = activeVariant.id === v.id;
                            return (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => handleSelectVariant(product.id, v.id)}
                                className={`px-1.5 py-1 rounded text-[9px] sm:text-[10px] font-medium border text-center transition-colors truncate cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#155d2c]/10 text-[#155d2c] border-[#155d2c] font-bold'
                                    : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                                }`}
                              >
                                {v.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Price & Add Button */}
                <div className="p-3 sm:p-5 pt-0 border-t border-stone-100 mt-2 flex items-center justify-between gap-1.5">
                  <div className="min-w-0">
                    <span className="text-[8px] sm:text-[9px] uppercase text-stone-400 font-bold block truncate">
                      {activeVariant.name}
                    </span>
                    <span className="font-serif text-sm sm:text-lg font-bold text-[#155d2c]">
                      {formatPence(activeVariant.pricePence)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      addItem(product, activeVariant, 1);
                      openCart();
                      success('Added to basket', `${product.name} (${activeVariant.name}) added.`);
                    }}
                    className="inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-[#155d2c] hover:bg-[#104923] active:scale-95 text-white text-[11px] sm:text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0"
                    title={`Add ${product.name} to basket`}
                  >
                    <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="hidden xs:inline">Add</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
