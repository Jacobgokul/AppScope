import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'gradient';
  hover?: boolean;
  children: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', hover = false, children, ...props }, ref) => {
    const baseStyles = 'rounded-xl p-6 transition-all duration-300';

    const variants = {
      default: 'bg-dark-800 border border-dark-700',
      glass: 'bg-dark-800/50 backdrop-blur-lg border border-dark-700/50',
      gradient: 'bg-gradient-to-br from-dark-800 via-dark-800 to-primary-900/20 border border-dark-700',
    };

    const hoverStyles = hover
      ? 'hover:border-primary-500/50 hover:shadow-xl hover:shadow-primary-500/10 hover:-translate-y-1'
      : '';

    return (
      <div
        ref={ref}
        className={cn(baseStyles, variants[variant], hoverStyles, className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
