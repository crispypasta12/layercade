import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export function getCartLineKey(item) {
  return item.lineKey ?? `${item.productId ?? item.id}::${item.colorId ?? ''}`;
}

function normalizeCartItem(item) {
  return item.lineKey ? item : { ...item, lineKey: getCartLineKey(item) };
}

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      isCartOpen: false,

      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),

      addItem: (product, quantity = 1, color = null) => {
        const items = get().items.map(normalizeCartItem);
        const lineKey = `${product.id}::${color?.id ?? ''}`;
        const existing = items.find((i) => getCartLineKey(i) === lineKey);
        const nextQuantity = Math.max(1, Number(quantity) || 1);
        if (existing) {
          set({
            items: items.map((i) =>
              getCartLineKey(i) === lineKey
                ? { ...i, quantity: i.quantity + nextQuantity }
                : i
            ),
          });
        } else {
          set({
            items: [
              ...items,
              {
                lineKey,
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity: nextQuantity,
                image: product.images?.[0] ?? product.img1 ?? null,
                slug: product.slug,
                colorId:   color?.id   ?? null,
                colorName: color?.name ?? null,
                colorHex:  color?.hex  ?? null,
              },
            ],
          });
        }
      },

      removeItem: (lineKey) => {
        set({
          items: get().items
            .map(normalizeCartItem)
            .filter((i) => getCartLineKey(i) !== lineKey),
        });
      },

      updateQuantity: (lineKey, quantity) => {
        if (quantity < 1) {
          set({
            items: get().items
              .map(normalizeCartItem)
              .filter((i) => getCartLineKey(i) !== lineKey),
          });
          return;
        }
        set({
          items: get().items.map((i) =>
            getCartLineKey(i) === lineKey ? { ...normalizeCartItem(i), quantity } : normalizeCartItem(i)
          ),
        });
      },

      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'layercade-cart',
      version: 1,
      partialize: (state) => ({ items: state.items }),
      migrate: (persistedState) => ({
        ...persistedState,
        items: (persistedState.items ?? []).map(normalizeCartItem),
      }),
    }
  )
);
