import React, { useState } from 'react';
import { INITIAL_PRODUCTS } from '../../data/initialData';
import { formatPence } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Plus, Edit, Eye, EyeOff, Search, Sparkles } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const AdminCatalogue: React.FC = () => {
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [search, setSearch] = useState('');
  const { success } = useToast();

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  const toggleStatus = (id: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const next = p.status === 'active' ? 'hidden' : 'active';
          success(`Updated ${p.name}`, `Status set to ${next}.`);
          return { ...p, status: next };
        }
        return p;
      })
    );
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-stone-900">Catalogue Management</h2>
          <p className="text-xs text-stone-500 mt-1">
            Manage your snacks, cold-pressed juices, bottle variants, allergens and inventory.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => success('New Product Modal', 'Product creation wizard ready.')}
        >
          Add New Product
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-stone-400" />
          <input
            type="text"
            placeholder="Search products, category, or ingredients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-stone-200 focus:outline-none focus:ring-1 focus:ring-[#7e2b44]"
          />
        </div>
        <span className="text-xs text-stone-500">{filtered.length} products found</span>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-5">Product Details</th>
                <th className="py-3 px-5">Type & Category</th>
                <th className="py-3 px-5">Variants & Pricing</th>
                <th className="py-3 px-5">Allergens (UK)</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {filtered.map((product) => (
                <tr key={product.id} className="hover:bg-stone-50/80">
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-10 w-10 rounded-lg object-cover bg-stone-100 shrink-0"
                      />
                      <div>
                        <div className="font-semibold text-stone-900">{product.name}</div>
                        <span className="text-[10px] text-stone-400">{product.origin || 'UK Prepared'}</span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-5">
                    <span className="capitalize font-medium text-stone-800">{product.type}</span>
                    <span className="block text-[10px] text-stone-400">{product.category}</span>
                  </td>

                  <td className="py-3 px-5">
                    <div className="space-y-1">
                      {product.variants.map((v) => (
                        <div key={v.id} className="text-[11px] flex items-center gap-2">
                          <span className="font-medium">{v.name}:</span>
                          <span className="font-bold text-[#7e2b44]">{formatPence(v.pricePence)}</span>
                          <span className="text-stone-400">({v.stock} in stock)</span>
                        </div>
                      ))}
                    </div>
                  </td>

                  <td className="py-3 px-5">
                    {product.allergens.length === 0 ? (
                      <span className="text-emerald-700 font-medium">None</span>
                    ) : (
                      <span className="text-amber-800 font-medium">{product.allergens.join(', ')}</span>
                    )}
                  </td>

                  <td className="py-3 px-5">
                    <Badge variant={product.status === 'active' ? 'green' : 'neutral'} size="sm">
                      {product.status}
                    </Badge>
                  </td>

                  <td className="py-3 px-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => toggleStatus(product.id)}
                        className="p-1 text-stone-500 hover:text-stone-900 transition-colors"
                        title={product.status === 'active' ? 'Hide Product' : 'Make Active'}
                      >
                        {product.status === 'active' ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => success('Edit Product', `Opening editor for ${product.name}`)}
                        className="p-1 text-stone-500 hover:text-[#7e2b44] transition-colors"
                        title="Edit Details"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
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
