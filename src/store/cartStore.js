import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      isCartOpen: false,

      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),

      addItem: (product, quantity = 1, color = null) => {
        const items = get().items;
        const lineKey = `${product.id}::${color?.id ?? ''}`;
        const existing = items.find((i) => i.lineKey === lineKey);
        const nextQuantity = Math.max(1, Number(quantity) || 1);
        if (existing) {
          set({
            items: items.map((i) =>
              i.lineKey === lineKey
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
        set({ items: get().items.filter((i) => i.lineKey !== lineKey) });
      },

      updateQuantity: (lineKey, quantity) => {
        if (quantity < 1) {
          set({ items: get().items.filter((i) => i.lineKey !== lineKey) });
          return;
        }
        set({
          items: get().items.map((i) =>
            i.lineKey === lineKey ? { ...i, quantity } : i
          ),
        });
      },

      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'layercade-cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
