import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FavoriteItem {
  id: string;
  type: 'apod' | 'mars' | 'neo';
  title: string;
  thumbnail: string;
  data: Record<string, unknown>;
  addedAt: number;
}

interface FavoritesState {
  favorites: FavoriteItem[];
  addFavorite: (item: Omit<FavoriteItem, 'addedAt'>) => void;
  removeFavorite: (id: string, type: string) => void;
  isFavorite: (id: string, type: string) => boolean;
  reorderFavorites: (type: string, fromIndex: number, toIndex: number) => void;
  getFavoritesByType: (type: string) => FavoriteItem[];
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      addFavorite: (item) => {
        const existing = get().favorites.find(
          (f) => f.id === item.id && f.type === item.type
        );
        if (!existing) {
          set({
            favorites: [
              ...get().favorites,
              { ...item, addedAt: Date.now() },
            ],
          });
        }
      },
      removeFavorite: (id, type) => {
        set({
          favorites: get().favorites.filter(
            (f) => !(f.id === id && f.type === type)
          ),
        });
      },
      isFavorite: (id, type) => {
        return get().favorites.some((f) => f.id === id && f.type === type);
      },
      reorderFavorites: (type, fromIndex, toIndex) => {
        const typeFavorites = get().favorites.filter((f) => f.type === type);
        const otherFavorites = get().favorites.filter((f) => f.type !== type);

        const [moved] = typeFavorites.splice(fromIndex, 1);
        typeFavorites.splice(toIndex, 0, moved);

        set({ favorites: [...otherFavorites, ...typeFavorites] });
      },
      getFavoritesByType: (type) => {
        return get().favorites.filter((f) => f.type === type);
      },
    }),
    {
      name: 'favorites-storage',
    }
  )
);
