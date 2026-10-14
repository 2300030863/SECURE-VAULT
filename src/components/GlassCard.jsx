import React from 'react';

export default function GlassCard({
  children,
  className = '',
  interactive = false,
  highlightCrimson = false,
  as: Component = 'div',
  ...props
}) {
  const classes = [
    'sv-glass-card',
    interactive ? 'interactive' : '',
    highlightCrimson ? 'highlight-crimson' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
}
