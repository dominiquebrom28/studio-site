import type { ReactNode } from 'react';

export function Container({
  children,
  className = '',
  narrow = false,
}: {
  children: ReactNode;
  className?: string;
  narrow?: boolean;
}) {
  return (
    <div
      className={`mx-auto w-full px-4 sm:px-6 lg:px-12 ${narrow ? 'max-w-[720px]' : 'max-w-[1120px]'} ${className}`}
    >
      {children}
    </div>
  );
}
