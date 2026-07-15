import type { ReactNode } from 'react';

export function Prose({
  children,
  ruled = false,
  className = '',
}: {
  children: ReactNode;
  ruled?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`prose-studio prose max-w-[720px] prose-headings:font-serif ${
        ruled ? 'notebook-ruled' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
