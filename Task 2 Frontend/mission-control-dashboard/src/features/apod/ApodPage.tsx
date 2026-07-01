import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useApodByDate, useApodRange } from './useApod';
import { ApodCard } from './ApodCard';
import { ApodSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import type { ApiError } from '@/api/types';

const apodFilterSchema = z.object({
  date: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
});

type ApodFilters = z.infer<typeof apodFilterSchema>;

function getDefaultDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getMinDate(): string {
  return '1995-06-16';
}

export function ApodPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDate, setSelectedDate] = useState(
    () => searchParams.get('date') || getDefaultDate()
  );
  const [dateRange, setDateRange] = useState<{
    start: string;
    end: string;
  }>(() => ({
    start: searchParams.get('start') || getDefaultDate(),
    end: searchParams.get('end') || getDefaultDate(),
  }));

  const filters = useMemo<ApodFilters>(() => {
    const result = apodFilterSchema.safeParse({
      date: searchParams.get('date'),
      start: searchParams.get('start'),
      end: searchParams.get('end'),
    });
    return result.success ? result.data : { date: getDefaultDate() };
  }, [searchParams]);

  const isRange = Boolean(filters.start && filters.end && !filters.date);

  const singleQuery = useApodByDate(filters.date || getDefaultDate());
  const rangeQuery = useApodRange(
    filters.start || getDefaultDate(),
    filters.end || getDefaultDate()
  );

  const query = isRange ? rangeQuery : singleQuery;
  const { isLoading, error, refetch } = query;

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSearchParams({ date }, { replace: false });
  };

  const handleRangeChange = (type: 'start' | 'end', value: string) => {
    const newRange = { ...dateRange, [type]: value };
    setDateRange(newRange);

    // Only update URL if both dates are set
    if (newRange.start && newRange.end) {
      setSearchParams(
        { start: newRange.start, end: newRange.end },
        { replace: true }
      );
    }
  };

  const handleClearRange = () => {
    setSearchParams({ date: getDefaultDate() }, { replace: false });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
        Astronomy Picture of the Day
      </h1>

      {/* Filters */}
      <div className="bg-[var(--color-bg-secondary)] p-4 rounded-lg space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              Single Date
            </label>
            <input
              type="date"
              value={selectedDate}
              min={getMinDate()}
              max={getDefaultDate()}
              onChange={(e) => handleDateChange(e.target.value)}
              className="px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
            />
          </div>
          <div className="text-[var(--color-text-secondary)]">or</div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              Date Range Start
            </label>
            <input
              type="date"
              value={dateRange.start}
              min={getMinDate()}
              max={getDefaultDate()}
              onChange={(e) => handleRangeChange('start', e.target.value)}
              className="px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              Date Range End
            </label>
            <input
              type="date"
              value={dateRange.end}
              min={getMinDate()}
              max={getDefaultDate()}
              onChange={(e) => handleRangeChange('end', e.target.value)}
              className="px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
            />
          </div>
          {isRange && (
            <button
              onClick={handleClearRange}
              className="px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              Clear Range
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <ApodSkeleton />
      ) : error ? (
        <ErrorState
          error={error as unknown as ApiError}
          onRetry={() => refetch()}
        />
      ) : isRange ? (
        <div className="space-y-6">
          {Array.isArray(rangeQuery.data) && rangeQuery.data.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rangeQuery.data.map((apod) => (
                <ApodCard key={apod.date} data={apod} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No Pictures Found"
              message="No astronomy pictures found for this date range."
              action={{ label: 'Reset to Today', onClick: handleClearRange }}
            />
          )}
        </div>
      ) : singleQuery.data ? (
        <ApodCard data={singleQuery.data} isDetailed />
      ) : (
        <EmptyState
          title="No Picture Available"
          message="No picture available for this date."
          action={{ label: 'Go to Today', onClick: handleClearRange }}
        />
      )}
    </div>
  );
}
