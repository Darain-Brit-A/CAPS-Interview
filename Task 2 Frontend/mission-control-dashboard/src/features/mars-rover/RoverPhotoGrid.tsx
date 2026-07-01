import { useRef, useEffect, useState } from 'react';
import { FixedSizeGrid } from 'react-window';
import type { MarsPhoto } from '@/api/types';
import { FavoriteButton } from '@/components/ui/FavoriteButton';
import { MarsPhotoSkeleton } from '@/components/ui/Skeleton';

interface RoverPhotoGridProps {
  photos: MarsPhoto[];
  isLoadingMore: boolean;
  hasNextPage: boolean;
  loadMore: () => void;
}

const COLUMN_COUNT = 4;
const ROW_HEIGHT = 280;
const GAP = 16;

interface CellProps {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: {
    photos: MarsPhoto[];
    isLoadingMore: boolean;
  };
}

function PhotoCell({ columnIndex, rowIndex, style, data }: CellProps) {
  const { photos } = data;
  const index = rowIndex * COLUMN_COUNT + columnIndex;

  if (index >= photos.length) {
    return (
      <div style={style} className="p-2">
        <MarsPhotoSkeleton />
      </div>
    );
  }

  const photo = photos[index];

  return (
    <div style={style} className="p-2">
      <div className="relative group h-full bg-[var(--color-bg-secondary)] rounded-lg overflow-hidden">
        <img
          src={photo.img_src}
          alt={`Mars photo from ${photo.camera.full_name}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="text-white text-sm font-medium truncate">
              {photo.camera.full_name}
            </p>
            <p className="text-white/70 text-xs">
              Sol {photo.sol} • {photo.earth_date}
            </p>
          </div>
          <div className="absolute top-2 right-2">
            <FavoriteButton
              id={String(photo.id)}
              type="mars"
              title={photo.camera.full_name}
              thumbnail={photo.img_src}
              data={photo as unknown as Record<string, unknown>}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function RoverPhotoGrid({
  photos,
  isLoadingMore,
  hasNextPage,
  loadMore,
}: RoverPhotoGridProps) {
  const gridRef = useRef<FixedSizeGrid>(null);
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const itemCount = hasNextPage ? photos.length + COLUMN_COUNT : photos.length;
  const columnCount = COLUMN_COUNT;

  // Resize observer for container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Infinite scroll via intersection observer
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isLoadingMore) {
          loadMoreRef.current();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isLoadingMore]);

  const columnWidth = Math.floor((dimensions.width - GAP * (columnCount - 1)) / columnCount);

  return (
    <div ref={containerRef} className="h-[600px] relative">
      <FixedSizeGrid
        ref={gridRef}
        className="focus:outline-none"
        columnCount={columnCount}
        columnWidth={columnWidth}
        height={dimensions.height}
        rowCount={Math.ceil(itemCount / columnCount)}
        rowHeight={ROW_HEIGHT}
        width={dimensions.width}
        itemData={{ photos, isLoadingMore }}
      >
        {PhotoCell}
      </FixedSizeGrid>
      {/* Sentinel for infinite scroll */}
      <div ref={sentinelRef} className="absolute bottom-0 h-4" />
    </div>
  );
}
