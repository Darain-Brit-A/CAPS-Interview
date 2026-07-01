import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { ROVER_NAMES, ROVER_CAMERAS, type RoverName } from '@/api/types';
import { useRoverInfo } from './useMarsPhotosInfinite';

const marsFilterSchema = z.object({
  rover: z.enum(ROVER_NAMES).default('curiosity'),
  mode: z.enum(['sol', 'date']).default('sol'),
  sol: z.coerce.number().min(0).default(0),
  date: z.string().optional(),
  camera: z.string().optional(),
});

type MarsFilters = z.infer<typeof marsFilterSchema>;

interface RoverFiltersProps {
  onFilterChange: (filters: MarsFilters) => void;
}

export function RoverFilters({ onFilterChange }: RoverFiltersProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<MarsFilters>(() => {
    const result = marsFilterSchema.safeParse({
      rover: searchParams.get('rover'),
      mode: searchParams.get('mode'),
      sol: searchParams.get('sol'),
      date: searchParams.get('date'),
      camera: searchParams.get('camera'),
    });
    return result.success ? result.data : { rover: 'curiosity', mode: 'sol', sol: 0, camera: undefined, date: undefined };
  }, [searchParams]);

  const { data: roverInfo } = useRoverInfo(filters.rover);

  const availableCameras = useMemo(() => {
    return ROVER_CAMERAS[filters.rover] || [];
  }, [filters.rover]);

  const handleRoverChange = (rover: RoverName) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('rover', rover);
    newParams.delete('camera'); // Reset camera when rover changes
    setSearchParams(newParams, { replace: false });
    onFilterChange({ ...filters, rover, camera: undefined });
  };

  const handleModeChange = (mode: 'sol' | 'date') => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('mode', mode);
    setSearchParams(newParams, { replace: true });
    onFilterChange({ ...filters, mode });
  };

  const handleSolChange = (sol: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sol', String(sol));
    setSearchParams(newParams, { replace: true });
    onFilterChange({ ...filters, sol });
  };

  const handleDateChange = (date: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('date', date);
    setSearchParams(newParams, { replace: true });
    onFilterChange({ ...filters, date });
  };

  const handleCameraChange = (camera: string | undefined) => {
    const newParams = new URLSearchParams(searchParams);
    if (camera) {
      newParams.set('camera', camera);
    } else {
      newParams.delete('camera');
    }
    setSearchParams(newParams, { replace: true });
    onFilterChange({ ...filters, camera });
  };

  return (
    <div className="bg-[var(--color-bg-secondary)] p-4 rounded-lg space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        {/* Rover Selection */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            Rover
          </label>
          <select
            value={filters.rover}
            onChange={(e) => handleRoverChange(e.target.value as RoverName)}
            className="px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
          >
            {ROVER_NAMES.map((name: RoverName) => (
              <option key={name} value={name}>
                {name.charAt(0).toUpperCase() + name.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Mode Toggle */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            Date Mode
          </label>
          <div className="flex border border-[var(--color-border)] rounded-lg overflow-hidden">
            <button
              onClick={() => handleModeChange('sol')}
              className={`px-3 py-2 text-sm ${
                filters.mode === 'sol'
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]'
              }`}
            >
              Sol
            </button>
            <button
              onClick={() => handleModeChange('date')}
              className={`px-3 py-2 text-sm ${
                filters.mode === 'date'
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]'
              }`}
            >
              Earth Date
            </button>
          </div>
        </div>

        {/* Sol or Date Input */}
        {filters.mode === 'sol' ? (
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              Sol (0 - {roverInfo?.max_sol || '...'})
            </label>
            <input
              type="number"
              value={filters.sol}
              min={0}
              max={roverInfo?.max_sol}
              onChange={(e) => handleSolChange(Number(e.target.value))}
              className="px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] w-32"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              Earth Date
            </label>
            <input
              type="date"
              value={filters.date || ''}
              min={roverInfo?.landing_date}
              max={roverInfo?.max_date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
            />
          </div>
        )}

        {/* Camera Selection */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            Camera
          </label>
          <select
            value={filters.camera || ''}
            onChange={(e) => handleCameraChange(e.target.value || undefined)}
            className="px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
          >
            <option value="">All Cameras</option>
            {availableCameras.map((camera: string) => (
              <option key={camera} value={camera.toLowerCase()}>
                {camera}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
