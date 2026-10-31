import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { INITIAL_PRODUCTS } from '../data/initialData';
import { formatPence } from '../lib/utils';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import {
  ChevronRight,
  ShieldCheck,
  Truck,
  Sparkles,
  ShoppingBag,
  Plus,
  Minus,
  Check,
  ArrowLeft,
  Calendar,
  AlertCircle,
  Share2,
} from 'lucide-react';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem, openCart } = useCart();
  const { success, info } = useToast();

  const product = INITIAL_PRODUCTS.find((p) => p.slug === slug || p.id === slug);

  // Fallback to first variant if product exists
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 mb-2">
          Product Not Found
        </h1>
        <p className="text-sm text-stone-600 mb-6 max-w-md mx-auto">
          We couldn&apos;t find the treat or drink you were looking for. It may have been rotated or renamed.
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#155d2c] text-white font-medium hover:bg-[#104923] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Browse All Treats</span>
        </Link>
      </div>
    );
  }

  const activeVariant =
    product.variants.find((v) => v.id === selectedVariantId) ||
    product.variants.find((v) => v.isDefault) ||
    product.variants[0];

  const handleAddToCart = () => {
    addItem(product, activeVariant, quantity);
    openCart();
    success(
      'Added to basket',
      `${quantity}× ${product.name} (${activeVariant.name}) added to your basket.`
    );
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${product.name} | Bloom by Pela`,
          text: product.shortDescription || product.description,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        info('Link Copied', 'Product link copied to clipboard.');
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Ignore user cancellation
    }
  };

  // Related products from the same category or all
  const relatedProducts = INITIAL_PRODUCTS.filter(
    (p) => p.id !== product.id && p.category === product.category
  ).slice(0, 3);

  const categoryPath = product.type === 'snack' ? '/shop/snacks' : '/shop/juices';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 text-left">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-1.5 text-xs text-stone-500 mb-6 overflow-x-auto whitespace-nowrap pb-1">
        <Link to="/" className="hover:text-stone-900 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
        <Link to="/shop" className="hover:text-stone-900 transition-colors">
          Shop
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
        <Link to={categoryPath} className="hover:text-stone-900 transition-colors">
          {product.category}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
        <span className="text-stone-900 font-medium truncate max-w-[200px] sm:max-w-xs">
          {product.name}
        </span>
      </nav>

      {/* Main Product Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Left Column: Product Gallery */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative aspect-4/3 sm:aspect-square rounded-2xl sm:rounded-3xl overflow-hidden bg-stone-100 border border-stone-200/80 shadow-xs group">
            <img
              src={product.images[activeImageIndex] || product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Badges on main image */}
            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-xs text-[#155d2c] shadow-xs border border-stone-200">
                {product.weightOrVolume}
              </span>
            </div>

            <button
              type="button"
              onClick={handleShare}
              className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white text-stone-700 hover:text-stone-900 shadow-xs border border-stone-200 transition-all cursor-pointer"
              title="Share product"
              aria-label="Share product"
            >
              {copied ? <Check className="w-4 h-4 text-[#155d2c]" /> : <Share2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Thumbnail Gallery (if more than 1 image) */}
          {product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                    activeImageIndex === idx
                      ? 'border-[#155d2c] ring-2 ring-[#155d2c]/20'
                      : 'border-stone-200 hover:border-stone-300 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img}
                    alt={`${product.name} preview ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Trust Highlights */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-white border border-stone-200/80 flex items-start gap-2.5 shadow-2xs">
              <Sparkles className="w-4 h-4 text-[#cb932b] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-stone-900">Crafted with Integrity</h4>
                <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                  {product.type === 'snack'
                    ? 'Authentic Nigerian recipe with zero artificial additives.'
                    : '100% cold-pressed, unpasteurised raw fruit & roots.'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-stone-200/80 flex items-start gap-2.5 shadow-2xs">
              <Truck className="w-4 h-4 text-[#155d2c] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-stone-900">Newcastle Delivery</h4>
                <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                  Fresh drops every Thursday. Free pickup also available.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Product Info & Purchase Options */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
          <div>
            {/* Category Tag */}
            <div className="flex items-center gap-2 mb-2">
              <Link
                to={categoryPath}
                className="text-xs font-bold uppercase tracking-wider text-[#155d2c] hover:underline"
              >
                {product.category}
              </Link>
              <span className="text-stone-300">•</span>
              <span className="text-xs text-stone-500 font-medium">
                {product.type === 'snack' ? 'Pantry Treat' : 'Fresh Beverage'}
              </span>
            </div>

            {/* Product Title */}
            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-stone-900 leading-tight">
              {product.name}
            </h1>

            {/* Short Tagline */}
            {product.shortDescription && (
              <p className="text-sm sm:text-base text-stone-600 mt-2 font-medium">
                {product.shortDescription}
              </p>
            )}

            {/* Price Display */}
            <div className="mt-4 flex items-baseline gap-3">
              <span className="font-serif text-3xl font-bold text-[#155d2c]">
                {formatPence(activeVariant.pricePence)}
              </span>
              <span className="text-xs text-stone-500">
                per {activeVariant.name}
              </span>
              {activeVariant.stock < 10 && activeVariant.stock > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Only {activeVariant.stock} left in batch
                </span>
              )}
            </div>

            {/* Variant Selector */}
            {product.variants.length > 1 && (
              <div className="mt-6 pt-5 border-t border-stone-200">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2.5">
                  Select Size / Option:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {product.variants.map((v) => {
                    const isSelected = activeVariant.id === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariantId(v.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#155d2c]/5 border-[#155d2c] ring-1 ring-[#155d2c]'
                            : 'bg-white border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold ${
                              isSelected ? 'text-[#155d2c]' : 'text-stone-800'
                            }`}
                          >
                            {v.name}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#155d2c]" />}
                        </div>
                        <span className="text-xs font-semibold text-stone-500 mt-1">
                          {formatPence(v.pricePence)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity & Add to Basket Button */}
            <div className="mt-6 pt-5 border-t border-stone-200 space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Quantity Control */}
                <div className="flex items-center justify-between sm:justify-start border border-stone-200 rounded-xl bg-white p-1 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-bold text-stone-900 text-sm">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Add to Basket CTA */}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="flex-1 py-3 px-6 rounded-xl bg-[#155d2c] hover:bg-[#104923] active:scale-[0.99] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>
                    Add to Basket • {formatPence(activeVariant.pricePence * quantity)}
                  </span>
                </button>
              </div>

              {/* Weekly batch schedule notice */}
              <div className="p-3.5 rounded-xl bg-[#FFF5E6] border border-[#deb252]/40 text-xs text-stone-700 flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-[#cb932b] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-stone-900">
                    Fresh Weekly Newcastle Batch
                  </span>
                  <p className="text-[11px] text-stone-600 mt-0.5 leading-relaxed">
                    Cut-off for Thursday delivery & weekend collection is Monday at 12:00 PM.
                  </p>
                </div>
              </div>
            </div>

            {/* Detailed Product Description */}
            <div className="mt-8 pt-6 border-t border-stone-200">
              <h3 className="font-serif text-lg font-bold text-stone-900 mb-3">
                Product Description
              </h3>
              <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>

            {/* Ingredients & Allergens Section */}
            <div className="mt-6 pt-6 border-t border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Ingredients */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 mb-2">
                  Ingredients
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {product.ingredients.map((ing, i) => (
                    <span
                      key={i}
                      className="text-[11px] bg-white border border-stone-200 text-stone-700 px-2 py-0.5 rounded-md"
                    >
                      {ing}
                    </span>
                  ))}
                </div>
              </div>

              {/* Allergens */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 mb-2">
                  Allergen Advice
                </h4>
                {product.allergens && product.allergens.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {product.allergens.map((alg, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-bold bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-md"
                      >
                        Contains: {alg}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-stone-600 leading-snug">
                    No allergens declared. Packed in a facility that may handle sesame, peanuts, and gluten.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <section className="mt-16 pt-12 border-t border-stone-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#cb932b]">
                Pair with this
              </span>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 mt-0.5">
                More from {product.category}
              </h2>
            </div>
            <Link
              to={categoryPath}
              className="text-xs sm:text-sm font-semibold text-[#155d2c] hover:underline"
            >
              View all →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {relatedProducts.map((relProduct) => {
              const relDefaultVariant = relProduct.variants[0];

              return (
                <div
                  key={relProduct.id}
                  className="group bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-stone-200/80 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Clicking image navigates to product page */}
                    <Link
                      to={`/product/${relProduct.slug}`}
                      className="block relative aspect-4/3 overflow-hidden bg-stone-100 cursor-pointer"
                    >
                      <img
                        src={relProduct.images[0]}
                        alt={relProduct.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-wrap gap-1">
                        <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-white/95 backdrop-blur-xs text-[#155d2c] shadow-2xs border border-stone-200">
                          {relProduct.weightOrVolume}
                        </span>
                      </div>
                    </Link>

                    <div className="p-3 sm:p-5">
                      <Link to={`/product/${relProduct.slug}`} className="block">
                        <h3 className="font-serif text-xs sm:text-base font-bold text-stone-900 line-clamp-1 group-hover:text-[#155d2c] transition-colors">
                          {relProduct.name}
                        </h3>
                      </Link>
                      <p className="text-[10px] sm:text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                        {relProduct.shortDescription || relProduct.description}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 sm:p-5 pt-0 border-t border-stone-100 mt-2 flex items-center justify-between gap-1.5">
                    <div className="min-w-0">
                      <span className="text-[8px] sm:text-[9px] uppercase text-stone-400 font-bold block truncate">
                        {relDefaultVariant.name}
                      </span>
                      <span className="font-serif text-sm sm:text-base font-bold text-[#155d2c]">
                        {formatPence(relDefaultVariant.pricePence)}
                      </span>
                    </div>

                    {/* Plus icon still links to cart & adds item */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        addItem(relProduct, relDefaultVariant, 1);
                        openCart();
                        success('Added to basket', `${relProduct.name} added.`);
                      }}
                      className="inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-[#155d2c] hover:bg-[#104923] active:scale-95 text-white text-[11px] sm:text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0"
                      title={`Add ${relProduct.name} to basket`}
                    >
                      <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span className="hidden xs:inline">Add</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
