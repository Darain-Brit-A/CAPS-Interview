import type { ApodResponse } from '@/api/types';
import { FavoriteButton } from '@/components/ui/FavoriteButton';

interface ApodCardProps {
  data: ApodResponse;
  isDetailed?: boolean;
}

export function ApodCard({ data, isDetailed = false }: ApodCardProps) {
  const isVideo = data.media_type === 'video';

  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-lg overflow-hidden shadow-lg">
      <div className="relative aspect-video">
        {isVideo ? (
          <div className="w-full h-full flex items-center justify-center bg-black">
            <iframe
              src={data.thumbnail_url || data.url}
              title={data.title}
              className="w-full h-full"
              allowFullScreen
            />
          </div>
        ) : (
          <img
            src={data.hdurl || data.url}
            alt={data.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
        <div className="absolute top-2 right-2">
          <FavoriteButton
            id={data.date}
            type="apod"
            title={data.title}
            thumbnail={data.url}
            data={data as unknown as Record<string, unknown>}
          />
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
          {data.title}
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)] mb-2">
          {data.date}
          {data.copyright && <span className="ml-2">© {data.copyright}</span>}
        </p>
        {isDetailed && (
          <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
            {data.explanation}
          </p>
        )}
      </div>
    </div>
  );
}
