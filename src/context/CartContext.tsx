import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { CartItem, StoredCartItem } from '../types/cart';
import { Product, ProductVariant } from '../types/products';
import { INITIAL_PRODUCTS } from '../data/initialData';

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (product: Product, variant: ProductVariant, quantity?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotalPence: number;
  hasJuices: boolean;
  hasSnacks: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'bloom_cart_items_v1';

const cartItemId = (productId: string, variantId: string) => `${productId}-${variantId}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const asNonEmptyString = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

const asPositiveInteger = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;

/**
 * Normalises persisted cart entries to IDs only. Also migrates entries saved by
 * the previous implementation, which stored full product and variant snapshots.
 */
const normaliseStoredItem = (raw: unknown): StoredCartItem | null => {
  if (!isRecord(raw)) return null;

  const quantity = asPositiveInteger(raw.quantity);
  if (quantity === null) return null;

  const productId =
    asNonEmptyString(raw.productId) ??
    (isRecord(raw.product) ? asNonEmptyString(raw.product.id) : null);
  const variantId =
    asNonEmptyString(raw.variantId) ??
    (isRecord(raw.variant) ? asNonEmptyString(raw.variant.id) : null);

  if (!productId || !variantId) return null;

  return { productId, variantId, quantity };
};

const readStoredCart = (): StoredCartItem[] => {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (!saved) return [];

    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normaliseStoredItem)
      .filter((item): item is StoredCartItem => item !== null);
  } catch {
    return [];
  }
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [storedItems, setStoredItems] = useState<StoredCartItem[]>(readStoredCart);
  const [isOpen, setIsOpen] = useState(false);

  // Persist identifiers and quantities only. Prices and names are always resolved
  // from the catalogue below, so stale prices can never be read from storage.
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(storedItems));
    } catch (err) {
      console.error('Failed to persist cart:', err);
    }
  }, [storedItems]);

  const items = useMemo<CartItem[]>(() => {
    return storedItems.reduce<CartItem[]>((resolved, stored) => {
      const product = INITIAL_PRODUCTS.find((candidate) => candidate.id === stored.productId);
      if (!product) return resolved;

      const variant = product.variants.find((candidate) => candidate.id === stored.variantId);
      if (!variant) return resolved;

      resolved.push({
        id: cartItemId(product.id, variant.id),
        product,
        variant,
        quantity: stored.quantity,
      });
      return resolved;
    }, []);
  }, [storedItems]);

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);
  const toggleCart = () => setIsOpen((prev) => !prev);

  const addItem = (product: Product, variant: ProductVariant, quantity = 1) => {
    setStoredItems((prev) => {
      const existing = prev.find(
        (item) => item.productId === product.id && item.variantId === variant.id
      );

      if (existing) {
        return prev.map((item) =>
          item.productId === product.id && item.variantId === variant.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [...prev, { productId: product.id, variantId: variant.id, quantity }];
    });
    setIsOpen(true);
  };

  const removeItem = (itemId: string) => {
    setStoredItems((prev) =>
      prev.filter((item) => cartItemId(item.productId, item.variantId) !== itemId)
    );
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    setStoredItems((prev) =>
      prev.map((item) =>
        cartItemId(item.productId, item.variantId) === itemId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setStoredItems([]);
  };

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const subtotalPence = useMemo(
    () => items.reduce((sum, item) => sum + item.variant.pricePence * item.quantity, 0),
    [items]
  );

  const hasJuices = useMemo(
    () => items.some((item) => item.product.type === 'juice'),
    [items]
  );

  const hasSnacks = useMemo(
    () => items.some((item) => item.product.type === 'snack'),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        openCart,
        closeCart,
        toggleCart,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        subtotalPence,
        hasJuices,
        hasSnacks,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};
