import { useSearchParams } from 'react-router-dom';
import { useState, useCallback, useEffect } from 'react';

function getDefaultDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export function NeoFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultRange = getDefaultDateRange();

  const [startDate, setStartDate] = useState(
    () => searchParams.get('start') || defaultRange.start
  );
  const [endDate, setEndDate] = useState(
    () => searchParams.get('end') || defaultRange.end
  );
  const [minKm, setMinKm] = useState(
    () => searchParams.get('minKm') || ''
  );
  const [maxKm, setMaxKm] = useState(
    () => searchParams.get('maxKm') || ''
  );
  const [hazardousOnly, setHazadrousOnly] = useState(
    () => searchParams.get('hazardousOnly') === 'true'
  );

  // Debounced URL updates for numeric inputs
  useEffect(() => {
    const timer = setTimeout(() => {
      const newParams = new URLSearchParams(searchParams);

      if (minKm) {
        newParams.set('minKm', minKm);
      } else {
        newParams.delete('minKm');
      }

      if (maxKm) {
        newParams.set('maxKm', maxKm);
      } else {
        newParams.delete('maxKm');
      }

      setSearchParams(newParams, { replace: true });
    }, 300);

    return () => clearTimeout(timer);
  }, [minKm, maxKm, searchParams, setSearchParams]);

  const handleDateChange = useCallback(
    (type: 'start' | 'end', value: string) => {
      if (type === 'start') {
        setStartDate(value);
      } else {
        setEndDate(value);
      }

      const newParams = new URLSearchParams(searchParams);
      newParams.set(type, value);
      setSearchParams(newParams, { replace: false });
    },
    [searchParams, setSearchParams]
  );

  const handleHazardousChange = useCallback(
    (checked: boolean) => {
      setHazadrousOnly(checked);
      const newParams = new URLSearchParams(searchParams);
      if (checked) {
        newParams.set('hazardousOnly', 'true');
      } else {
        newParams.delete('hazardousOnly');
      }
      setSearchParams(newParams, { replace: false });
    },
    [searchParams, setSearchParams]
  );

  return (
    <div className="bg-[var(--color-bg-secondary)] p-4 rounded-lg space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleDateChange('start', e.target.value)}
            className="px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            End Date (max 7 days)
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleDateChange('end', e.target.value)}
            className="px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
          />
        </div>

        {/* Size Range */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            Min Diameter (km)
          </label>
          <input
            type="number"
            value={minKm}
            min={0}
            step={0.001}
            onChange={(e) => setMinKm(e.target.value)}
            placeholder="0"
            className="px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] w-32"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            Max Diameter (km)
          </label>
          <input
            type="number"
            value={maxKm}
            min={0}
            step={0.001}
            onChange={(e) => setMaxKm(e.target.value)}
            placeholder="Any"
            className="px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] w-32"
          />
        </div>

        {/* Hazardous Toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="hazardous"
            checked={hazardousOnly}
            onChange={(e) => handleHazardousChange(e.target.checked)}
            className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
          />
          <label
            htmlFor="hazardous"
            className="text-sm text-[var(--color-text-secondary)]"
          >
            Potentially Hazardous Only
          </label>
        </div>
      </div>
    </div>
  );
}
