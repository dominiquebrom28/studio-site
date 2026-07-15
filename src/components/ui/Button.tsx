import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

type Variant = 'primary' | 'secondary';

const base =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border font-mono text-sm font-semibold uppercase tracking-[0.03em] transition-[transform,box-shadow] duration-100 ease-in active:translate-y-px motion-reduce:transition-none motion-reduce:active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none aria-disabled:cursor-not-allowed aria-disabled:opacity-40';

const variantClasses: Record<Variant, string> = {
  primary:
    'border-transparent bg-[var(--marker-600)] text-[var(--button-primary-label)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 active:shadow-[var(--shadow-card-active)] motion-reduce:hover:translate-y-0',
  secondary:
    'border-[1.5px] border-ink bg-transparent text-ink hover:bg-paper-raised',
};

const sizeClasses = 'px-6 py-3';

interface CommonProps {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}

type ButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { to?: undefined; href?: undefined };

type ButtonAsLink = CommonProps & Omit<LinkProps, 'className' | 'children'> & { href?: undefined };

type ButtonAsAnchor = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { to?: undefined; href: string };

export type ButtonProps = ButtonAsButton | ButtonAsLink | ButtonAsAnchor;

export function Button(props: ButtonProps) {
  const { variant = 'primary', children, className = '' } = props;
  const classes = `${base} ${sizeClasses} ${variantClasses[variant]} ${className}`;

  if ('to' in props && props.to !== undefined) {
    const { variant: _v, children: _c, className: _cl, to, ...rest } = props;
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  if ('href' in props && props.href !== undefined) {
    const { variant: _v, children: _c, className: _cl, href, ...rest } = props;
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    );
  }

  const { variant: _v, children: _c, className: _cl, ...rest } = props as ButtonAsButton;
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
