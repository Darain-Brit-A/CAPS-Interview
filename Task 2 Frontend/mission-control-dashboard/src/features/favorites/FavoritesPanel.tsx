import { useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useFavoritesStore, type FavoriteItem } from '@/store/favoritesStore';
import { EmptyState } from '@/components/feedback/EmptyState';

export function FavoritesPanel() {
  const { favorites, reorderFavorites } = useFavoritesStore();

  const groupedFavorites = useMemo(() => {
    const groups: Record<string, FavoriteItem[]> = {
      apod: [],
      mars: [],
      neo: [],
    };

    favorites.forEach((item) => {
      if (groups[item.type]) {
        groups[item.type].push(item);
      }
    });

    return groups;
  }, [favorites]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent, type: string) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const items = groupedFavorites[type];
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      reorderFavorites(type, oldIndex, newIndex);
    }
  };

  if (favorites.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
          Favorites
        </h1>
        <EmptyState
          title="No Favorites Yet"
          message="Start adding favorites by clicking the star icon on any APOD, Mars Rover photo, or Near Earth Object."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
        Favorites
      </h1>

      {Object.entries(groupedFavorites).map(([type, items]) => {
        if (items.length === 0) return null;

        return (
          <section key={type} className="space-y-4">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] capitalize">
              {type === 'apod'
                ? 'Astronomy Pictures'
                : type === 'mars'
                ? 'Mars Rover Photos'
                : 'Near Earth Objects'}
            </h2>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => handleDragEnd(event, type)}
            >
              <SortableContext
                items={items.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {items.map((item: FavoriteItem) => (
                    <SortableFavoriteItem key={item.id} item={item} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </section>
        );
      })}
    </div>
  );
}

interface SortableFavoriteItemProps {
  item: FavoriteItem;
}

function SortableFavoriteItem({ item }: SortableFavoriteItemProps) {
  const { removeFavorite } = useFavoritesStore();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-[var(--color-bg-secondary)] p-4 rounded-lg flex items-center gap-4 shadow"
    >
      <button
        className="cursor-grab active:cursor-grabbing text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        {...attributes}
        {...listeners}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </button>

      {item.thumbnail && (
        <img
          src={item.thumbnail}
          alt={item.title}
          className="w-16 h-16 object-cover rounded"
        />
      )}

      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-[var(--color-text-primary)] truncate">
          {item.title}
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)] capitalize">
          {item.type === 'apod'
            ? 'Astronomy Picture'
            : item.type === 'mars'
            ? 'Mars Rover Photo'
            : 'Near Earth Object'}
        </p>
      </div>

      <button
        onClick={() => removeFavorite(item.id, item.type)}
        className="p-2 text-[var(--color-text-secondary)] hover:text-red-500 transition-colors"
        aria-label="Remove from favorites"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
