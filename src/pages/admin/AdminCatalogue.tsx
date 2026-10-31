import React, { useState, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Copy, Eye, EyeOff, Edit, Upload, Image, RefreshCw } from 'lucide-react';
import { formatPence } from '../../lib/utils';
import { cld } from '../../lib/cld';
import { UK_ALLERGENS } from '../../lib/utils';
import { useProducts } from '../../features/catalogue';
import { callable } from '../../lib/functions';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

type ProductStatus = 'active' | 'hidden' | 'seasonal';

type Allergen = z.infer<typeof AllergenSchema>;

type ClientProduct = {
  id: string;
  name: string;
  slug: string;
  type: 'snack' | 'juice';
  category: string;
  description: string;
  shortDescription?: string | null;
  ingredients: string[];
  allergens: Allergen[];
  weightOrVolume: string;
  images: { url: string; publicId: string }[];
  status: ProductStatus;
  seasonalStartDate?: string | null;
  seasonalEndDate?: string | null;
  variants: ClientVariant[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  isPopular?: boolean;
  origin?: 'Nigeria' | 'UK Prepared' | 'West Africa' | null;
};

type ClientVariant = {
  id: string;
  name: string;
  pricePence: number;
  sku: string;
  stock: number;
  isDefault?: boolean;
};

const createVariant = (): ClientVariant => ({
  id: crypto.randomUUID(),
  name: '',
  pricePence: 0,
  sku: '',
  stock: 0,
  isDefault: false,
});

const AllergenSchema = z.enum([
  'Celery',
  'Cereals containing gluten',
  'Crustaceans',
  'Eggs',
  'Fish',
  'Lupin',
  'Milk',
  'Molluscs',
  'Mustard',
  'Peanuts',
  'Sesame',
  'Soybeans',
  'Sulphur dioxide and sulphites',
  'Tree nuts',
]);

const ClientProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  type: z.enum(['snack', 'juice']),
  category: z.string().min(1).max(100),
  description: z.string().min(1).max(4000),
  shortDescription: z.string().max(500).optional().nullable(),
  ingredients: z.array(z.string().min(1)).max(50),
  allergens: z.array(AllergenSchema),
  weightOrVolume: z.string().min(1).max(100),
  images: z.array(z.object({ url: z.string().url(), publicId: z.string() })),
  status: z.enum(['active', 'hidden', 'seasonal']),
  seasonalStartDate: z.string().optional().nullable(),
  seasonalEndDate: z.string().optional().nullable(),
  variants: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      pricePence: z.number().int().nonnegative(),
      sku: z.string().min(1),
      stock: z.number().int().nonnegative(),
      isDefault: z.boolean().optional(),
    }),
  ).min(1),
  seoTitle: z.string().max(200).optional().nullable(),
  seoDescription: z.string().max(400).optional().nullable(),
  isPopular: z.boolean().optional(),
  origin: z.enum(['Nigeria', 'UK Prepared', 'West Africa']).optional().nullable(),
});

type ClientProductInput = z.infer<typeof ClientProductSchema>;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const getUploadSignature = callable<{}, { timestamp: number; signature: string; apiKey: string; cloudName: string }>('getUploadSignature');
const createProductFn = callable<ClientProductInput, { ok: boolean; id: string }>('createProduct');
const updateProductFn = callable<ClientProductInput & { id: string }, { ok: boolean; id: string }>('updateProduct');
const softDeleteProductFn = callable<{ id: string }, { ok: boolean; id: string }>('softDeleteProduct');
const duplicateProductFn = callable<{ id: string; newId: string }, { ok: boolean; id: string }>('duplicateProduct');

function defaultProduct(): ClientProductInput {
  return {
    id: crypto.randomUUID(),
    name: '',
    slug: '',
    type: 'snack',
    category: '',
    description: '',
    shortDescription: '',
    ingredients: [],
    allergens: [],
    weightOrVolume: '',
    images: [],
    status: 'active',
    seasonalStartDate: null,
    seasonalEndDate: null,
    variants: [createVariant()],
    seoTitle: null,
    seoDescription: null,
    isPopular: false,
    origin: 'UK Prepared',
  };
}

function toClientProduct(server: unknown): ClientProduct {
  const p = server as ClientProduct;
  return {
    id: p.id,
    name: p.name ?? '',
    slug: p.slug ?? '',
    type: p.type ?? 'snack',
    category: p.category ?? '',
    description: p.description ?? '',
    shortDescription: p.shortDescription ?? null,
    ingredients: Array.isArray(p.ingredients) ? p.ingredients : [],
    allergens: Array.isArray(p.allergens) ? (p.allergens as Allergen[]) : [],
    weightOrVolume: p.weightOrVolume ?? '',
    images: Array.isArray(p.images) ? p.images : [],
    status: p.status ?? 'active',
    seasonalStartDate: p.seasonalStartDate ?? null,
    seasonalEndDate: p.seasonalEndDate ?? null,
    variants: Array.isArray(p.variants) ? p.variants : [createVariant()],
    seoTitle: p.seoTitle ?? null,
    seoDescription: p.seoDescription ?? null,
    isPopular: p.isPopular ?? false,
    origin: (p.origin as ClientProduct['origin']) ?? null,
  };
}

export const AdminCatalogue: React.FC = () => {
  const { data: products = [], isLoading, isError, error } = useProducts({ includeHidden: true });
  const { success, error: showError } = useToast();

  const [editing, setEditing] = useState<ClientProduct | null>(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const form = useForm<ClientProductInput>({
    resolver: zodResolver(ClientProductSchema),
    defaultValues: defaultProduct(),
  });

  const { fields: variantFields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'variants',
  });

  const resetForm = useCallback(
    (product: ClientProduct | null) => {
      form.reset(product ? {
        ...product,
        id: product.id,
        variants: product.variants.length ? product.variants : [createVariant()],
      } : defaultProduct());
      setEditing(product);
      setOpen(true);
    },
    [form],
  );

  const onSubmit = async (values: ClientProductInput) => {
    try {
      if (editing) {
        await updateProductFn(values);
        success('Product updated', `${values.name} saved.`);
      } else {
        await createProductFn(values);
        success('Product created', `${values.name} added to the catalogue.`);
      }
      setOpen(false);
      setEditing(null);
      form.reset(defaultProduct());
    } catch (err) {
      showError('Save failed', err instanceof Error ? err.message : 'Could not save the product.');
    }
  };

  const handleToggleStatus = useCallback(async (product: ClientProduct) => {
    try {
      if (product.status === 'active' || product.status === 'seasonal') {
        await softDeleteProductFn({ id: product.id });
        success('Product hidden', `${product.name} is no longer visible to customers.`);
      } else {
        await updateProductFn({ ...product, status: 'active' });
        success('Product active', `${product.name} is visible to customers again.`);
      }
    } catch (err) {
      showError('Could not update status', err instanceof Error ? err.message : 'Unexpected error.');
    }
  }, []);

  const handleDuplicate = useCallback(async (product: ClientProduct) => {
    try {
      const newId = crypto.randomUUID();
      await duplicateProductFn({ id: product.id, newId });
      success('Product duplicated', `Created copy as ${newId}.`);
    } catch (err) {
      showError('Duplicate failed', err instanceof Error ? err.message : 'Unexpected error.');
    }
  }, []);

  const handleDelete = useCallback(async (product: ClientProduct) => {
    if (!window.confirm(`Soft-delete "${product.name}"? It will be hidden from the storefront.`)) return;
    try {
      await softDeleteProductFn({ id: product.id });
      success('Product hidden', `${product.name} removed from the storefront.`);
    } catch (err) {
      showError('Could not hide product', err instanceof Error ? err.message : 'Unexpected error.');
    }
  }, []);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      showError('Unsupported file type', 'Please upload a JPEG, PNG or WEBP image.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      showError('File too large', 'Images must be 5 MB or smaller.');
      return;
    }
    setUploading(true);
    try {
      const { data } = await getUploadSignature({});
      const body = new FormData();
      body.append('file', file);
      body.append('timestamp', String(data.timestamp));
      body.append('signature', data.signature);
      body.append('api_key', data.apiKey);
      body.append('folder', 'bloom-by-pela');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${data.cloudName}/image/upload`, {
        method: 'POST',
        body,
      });
      if (!res.ok) throw new Error('Cloudinary upload failed.');
      const json = await res.json();
      const asset = { url: json.secure_url, publicId: json.public_id };
      const current = (form.getValues('images') as { url: string; publicId: string }[] ?? []);
      form.setValue('images', [...current, asset]);
      success('Image uploaded', 'Image added to the product.');
      e.target.value = '';
    } catch (err) {
      showError('Upload failed', err instanceof Error ? err.message : 'Could not upload image.');
    } finally {
      setUploading(false);
    }
  }, [form, getUploadSignature, showError, success]);

  const removeImage = useCallback((index: number) => {
    const current = (form.getValues('images') as { url: string; publicId: string }[] ?? []);
    form.setValue('images', current.filter((_, i) => i !== index));
  }, [form]);

  if (isLoading) return <div className="py-10 text-center text-stone-500 text-xs">Loading catalogue…</div>;
  if (isError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-sm text-stone-600">{error?.message ?? 'Failed to load catalogue.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-stone-900">Catalogue Management</h2>
          <p className="text-xs text-stone-500 mt-1">
            Manage snacks, cold-pressed juices, variants, allergens, inventory, SEO and images.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => resetForm(null)}
          disabled={form.formState.isSubmitting}
        >
          Add New Product
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-5">Product</th>
                <th className="py-3 px-5">Type & Category</th>
                <th className="py-3 px-5">Variants & Pricing</th>
                <th className="py-3 px-5">Allergens (UK)</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {products.map((product) => {
                const client = toClientProduct(product);
                const defaultVariant = client.variants[0];
                return (
                  <tr key={client.id} className="hover:bg-stone-50/80">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        {client.images.length ? (
                          <img
                            src={cld(client.images[0].url, 48)}
                            alt={client.name}
                            className="h-10 w-10 rounded-lg object-cover bg-stone-100 shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-stone-100 shrink-0 flex items-center justify-center text-[10px] text-stone-400">
                            <Image className="h-5 w-5" />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-stone-900">{client.name}</div>
                          <span className="text-[10px] text-stone-400">{client.origin ?? 'UK Prepared'}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-5">
                      <span className="capitalize font-medium text-stone-800">{client.type}</span>
                      <span className="block text-[10px] text-stone-400">{client.category}</span>
                    </td>

                    <td className="py-3 px-5">
                      <div className="space-y-1">
                        {client.variants.map((v) => (
                          <div key={v.id} className="text-[11px] flex items-center gap-2">
                            <span className="font-medium">{v.name}:</span>
                            <span className="font-bold text-[#7e2b44]">{formatPence(v.pricePence)}</span>
                            <span className="text-stone-400">({v.stock} in stock)</span>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-5">
                      {client.allergens.length === 0 ? (
                        <span className="text-emerald-700 font-medium">None</span>
                      ) : (
                        <span className="text-amber-800 font-medium">{client.allergens.join(', ')}</span>
                      )}
                    </td>

                    <td className="py-3 px-5">
                      <Badge
                        variant={
                          client.status === 'active' ? 'green' : client.status === 'seasonal' ? 'gold' : 'neutral'
                        }
                        size="sm"
                      >
                        {client.status}
                      </Badge>
                    </td>

                    <td className="py-3 px-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(client)}
                          className="p-1 text-stone-500 hover:text-stone-900 transition-colors"
                          title={
                            client.status === 'active' ? 'Hide Product' : 'Make Active'
                          }
                        >
                          {client.status === 'active' ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => resetForm(client)}
                          className="p-1 text-stone-500 hover:text-[#7e2b44] transition-colors"
                          title="Edit Details"
                          disabled={form.formState.isSubmitting}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicate(client)}
                          className="p-1 text-stone-500 hover:text-stone-900 transition-colors"
                          title="Duplicate"
                          disabled={form.formState.isSubmitting}
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(client)}
                          className="p-1 text-stone-500 hover:text-[#c93c3c] transition-colors"
                          title="Hide Product"
                          disabled={form.formState.isSubmitting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product form modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="relative bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-serif text-xl font-bold text-stone-900">
                {editing ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                type="button"
                className="p-2 text-stone-400 hover:text-stone-900 transition-colors"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <span className="block text-stone-900">✕</span>
              </button>
            </div>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Product name
                  </label>
                  <input
                    {...form.register('name')}
                    className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                    placeholder="e.g. Plantain chips"
                  />
                  {form.formState.errors.name && (
                    <p className="text-[10px] text-[#c93c3c]">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Slug
                  </label>
                  <input
                    {...form.register('slug')}
                    className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                    placeholder="e.g. plantain-chips"
                  />
                  {form.formState.errors.slug && (
                    <p className="text-[10px] text-[#c93c3c]">{form.formState.errors.slug.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Type
                  </label>
                  <select
                    {...form.register('type')}
                    className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                  >
                    <option value="snack">Snack</option>
                    <option value="juice">Juice</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Category
                  </label>
                  <input
                    {...form.register('category')}
                    className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                    placeholder="e.g. Snacks"
                  />
                  {form.formState.errors.category && (
                    <p className="text-[10px] text-[#c93c3c]">{form.formState.errors.category.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Description
                </label>
                <textarea
                  {...form.register('description')}
                  rows={3}
                  className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                />
                {form.formState.errors.description && (
                  <p className="text-[10px] text-[#c93c3c]">{form.formState.errors.description.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Short description (SEO)
                  </label>
                  <input
                    {...form.register('shortDescription')}
                    className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                    placeholder="Meta description"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Weight / volume
                  </label>
                  <input
                    {...form.register('weightOrVolume')}
                    className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                    placeholder="e.g. 150g"
                  />
                </div>
              </div>

              {/* Ingredients */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Ingredients (comma separated)
                </label>
                <input
                  {...form.register('ingredients', { setValueAs: (val: unknown) => { if (typeof val !== 'string') return []; return val.split(',').map((s) => s.trim()).filter(Boolean); } })}
                  className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                  placeholder="e.g. plantain, oil, salt"
                />
              </div>

              {/* Allergens */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                  Allergens (UK)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {UK_ALLERGENS.map((allergen) => {
                    const selected = (form.getValues('allergens') as Allergen[]) ?? [];
                    return (
                      <label key={allergen} className="flex items-center gap-2 text-[10px] cursor-pointer select-none group">
                        <input
                          type="checkbox"
                          checked={selected.includes(allergen)}
                          onChange={() => {
                            const next = selected.includes(allergen)
                              ? selected.filter((a) => a !== allergen)
                              : [...selected, allergen];
                            form.setValue('allergens', next);
                          }}
                          className="w-3 h-3 rounded border-stone-300 text-[#7e2b44] focus:ring-[#7e2b44]"
                        />
                        {allergen}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Images */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Images
                  </label>
                  <span className="text-[10px] text-stone-400">JPEG, PNG, WEBP ≤ 5 MB</span>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                  disabled={uploading || form.formState.isSubmitting}
                  className="sr-only"
                />
                  <button
                    type="button"
                    onClick={() => (document.querySelector('input[type=file]') as HTMLInputElement | null)?.click()}
                  disabled={uploading || form.formState.isSubmitting}
                  className="inline-flex items-center gap-2 text-xs rounded-lg border border-stone-200 px-3 py-2 text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  <Upload className="h-3 w-3" /> Upload image
                </button>
                {uploading && <span className="text-[10px] text-[#7e2b44] font-medium">Uploading…</span>}
                <div className="flex flex-wrap gap-2">
                  {(form.getValues('images') as { url: string; publicId: string }[] ?? []).map((img, i) => (
                    <div key={i} className="relative group">
                      <img src={cld(img.url, 40)} alt="" className="h-8 w-8 rounded object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 bg-white/90 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove image"
                      >
                        <span className="text-[9px] text-stone-600">✕</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Variants */}
              <div className="space-y-2 border-t border-stone-100 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Variants
                  </label>
                  <button
                    type="button"
                    onClick={() => append(createVariant())}
                    className="text-[10px] text-[#7e2b44] hover:text-[#5a1f2e] underline underline-offset-4"
                    disabled={form.formState.isSubmitting}
                  >
                    + Add variant
                  </button>
                </div>
                <div className="space-y-2">
                  {variantFields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                      <div className="space-y-1">
                        <label className="text-[10px] text-stone-500">Variant name</label>
                        <input
                          {...form.register(`variants.${index}.name`)}
                          className="w-full text-xs rounded border border-stone-200 px-2 py-1.5 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                          placeholder="e.g. 250g"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-stone-500">Price (pence)</label>
                        <input
                          {...form.register(`variants.${index}.pricePence`)}
                          type="number"
                          className="w-full text-xs rounded border border-stone-200 px-2 py-1.5 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-stone-500">SKU</label>
                        <input
                          {...form.register(`variants.${index}.sku`)}
                          className="w-full text-xs rounded border border-stone-200 px-2 py-1.5 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-stone-500">Stock</label>
                        <input
                          {...form.register(`variants.${index}.stock`)}
                          type="number"
                          className="w-full text-xs rounded border border-stone-200 px-2 py-1.5 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                        />
                      </div>
                      {variantFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="p-1 text-[#c93c3c] hover:bg-[#fdece6] rounded"
                          aria-label="Remove variant"
                        >
                          <span className="text-[10px]">✕</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Status & seasonal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Status
                  </label>
                  <select
                    {...form.register('status')}
                    className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="hidden">Hidden</option>
                    <option value="seasonal">Seasonal</option>
                  </select>
                </div>
                {form.getValues('status') === 'seasonal' && (
                  <div className="space-y-2 col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      Seasonal window (YYYY-MM-DD, Europe/London)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        {...form.register('seasonalStartDate')}
                        type="date"
                        className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                      />
                      <input
                        {...form.register('seasonalEndDate')}
                        type="date"
                        className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SEO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    SEO title
                  </label>
                  <input
                    {...form.register('seoTitle')}
                    className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    SEO description
                  </label>
                  <input
                    {...form.register('seoDescription')}
                    className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    id="isPopular"
                    type="checkbox"
                    checked={form.getValues('isPopular') === true}
                    onChange={() => form.setValue('isPopular', !form.getValues('isPopular'))}
                    className="w-3 h-3 rounded border-stone-300 text-[#7e2b44] focus:ring-[#7e2b44]"
                  />
                  <label htmlFor="isPopular" className="text-[10px] text-stone-600">
                    Featured product
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Origin
                </label>
                <select
                  {...form.register('origin')}
                  className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                >
                  <option value="UK Prepared">UK Prepared</option>
                  <option value="Nigeria">Nigeria</option>
                  <option value="West Africa">West Africa</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-xs rounded-lg border border-stone-200 px-4 py-2 text-stone-600 hover:bg-stone-50 transition-colors"
                  disabled={form.formState.isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs rounded-lg bg-[#155d2c] px-4 py-2 text-white font-semibold hover:bg-[#104923] transition-colors shadow-sm"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? 'Saving…' : 'Save product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
