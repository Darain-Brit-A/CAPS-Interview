interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
}: SkeletonProps) {
  const baseClasses = 'skeleton';
  const variantClasses = {
    text: 'h-4 w-full rounded',
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function ApodSkeleton() {
  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 space-y-4">
      <Skeleton variant="rectangular" height="400px" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function MarsPhotoSkeleton() {
  return (
    <div className="aspect-square bg-[var(--color-bg-secondary)] rounded-lg overflow-hidden">
      <Skeleton variant="rectangular" className="w-full h-full" />
    </div>
  );
}

export function NeoItemSkeleton() {
  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 space-y-3">
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  );
}
