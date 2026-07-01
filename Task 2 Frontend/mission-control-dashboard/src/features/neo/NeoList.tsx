import type { NeoObject } from '@/api/types';
import { FavoriteButton } from '@/components/ui/FavoriteButton';

interface NeoListProps {
  objects: NeoObject[];
}

export function NeoList({ objects }: NeoListProps) {
  return (
    <div className="space-y-4">
      {objects.map((obj) => (
        <NeoItem key={obj.id} object={obj} />
      ))}
    </div>
  );
}

interface NeoItemProps {
  object: NeoObject;
}

function NeoItem({ object }: NeoItemProps) {
  const approach = object.close_approach_data[0];
  const maxSize = object.estimated_diameter.kilometers.estimated_diameter_max;
  const velocity = approach?.relative_velocity.kilometers_per_hour;
  const missDistance = approach?.miss_distance.kilometers;

  return (
    <div className="bg-[var(--color-bg-secondary)] p-4 rounded-lg shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
              {object.name}
            </h3>
            {object.is_potentially_hazardous_asteroid && (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
                Potentially Hazardous
              </span>
            )}
          </div>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-[var(--color-text-secondary)]">Max Diameter</p>
              <p className="font-medium text-[var(--color-text-primary)]">
                {maxSize.toFixed(3)} km
              </p>
            </div>
            {approach && (
              <>
                <div>
                  <p className="text-[var(--color-text-secondary)]">Close Approach</p>
                  <p className="font-medium text-[var(--color-text-primary)]">
                    {approach.close_approach_date}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--color-text-secondary)]">Velocity</p>
                  <p className="font-medium text-[var(--color-text-primary)]">
                    {Number(velocity).toFixed(0)} km/h
                  </p>
                </div>
                <div>
                  <p className="text-[var(--color-text-secondary)]">Miss Distance</p>
                  <p className="font-medium text-[var(--color-text-primary)]">
                    {Number(missDistance).toFixed(0)} km
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
        <FavoriteButton
          id={object.id}
          type="neo"
          title={object.name}
          thumbnail=""
          data={object as unknown as Record<string, unknown>}
        />
      </div>
    </div>
  );
}
