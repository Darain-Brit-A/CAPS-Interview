import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import { z } from 'zod';

type SearchParamValue = string | number | boolean | undefined;

interface UseUrlFiltersOptions<T extends Record<string, SearchParamValue>> {
  schema: z.ZodObject<z.ZodRawShape>;
  defaults: T;
}

export function useUrlFilters<T extends Record<string, SearchParamValue>>({
  schema,
  defaults,
}: UseUrlFiltersOptions<T>) {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => {
    const raw: Record<string, unknown> = {};

    // Parse URL params
    searchParams.forEach((value, key) => {
      raw[key] = value;
    });

    // Apply defaults for missing params
    Object.entries(defaults).forEach(([key, value]) => {
      if (raw[key] === undefined && value !== undefined) {
        raw[key] = String(value);
      }
    });

    // Validate with schema
    const result = schema.safeParse(raw);
    if (result.success) {
      return result.data as T;
    }

    // Return defaults on validation failure
    return defaults;
  }, [searchParams, schema, defaults]);

  const setFilter = useCallback(
    (
      key: keyof T,
      value: SearchParamValue,
      options?: { replace?: boolean }
    ) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);

          if (value === undefined || value === '' || value === null) {
            next.delete(String(key));
          } else {
            next.set(String(key), String(value));
          }

          return next;
        },
        { replace: options?.replace ?? false }
      );
    },
    [setSearchParams]
  );

  const setFilters = useCallback(
    (
      updates: Partial<T>,
      options?: { replace?: boolean }
    ) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);

          Object.entries(updates).forEach(([key, value]) => {
            if (value === undefined || value === '' || value === null) {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          });

          return next;
        },
        { replace: options?.replace ?? false }
      );
    },
    [setSearchParams]
  );

  const resetFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
  };
}
