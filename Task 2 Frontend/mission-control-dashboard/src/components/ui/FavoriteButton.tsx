import { Star } from 'lucide-react';
import { useFavoritesStore } from '@/store/favoritesStore';

interface FavoriteButtonProps {
  id: string;
  type: 'apod' | 'mars' | 'neo';
  title: string;
  thumbnail: string;
  data: Record<string, unknown>;
}

export function FavoriteButton({
  id,
  type,
  title,
  thumbnail,
  data,
}: FavoriteButtonProps) {
  const { isFavorite, addFavorite, removeFavorite } = useFavoritesStore();
  const favorited = isFavorite(id, type);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (favorited) {
      removeFavorite(id, type);
    } else {
      addFavorite({ id, type, title, thumbnail, data });
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`p-2 rounded-full transition-colors ${
        favorited
          ? 'bg-yellow-500 text-white'
          : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-yellow-500'
      }`}
      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Star className="w-4 h-4" fill={favorited ? 'currentColor' : 'none'} />
    </button>
  );
}
