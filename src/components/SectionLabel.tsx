import type { ReactNode } from 'react';

interface SectionLabelProps {
  children: ReactNode;
  color?: 'muted' | 'accent';
  className?: string;
  as?: 'span' | 'p';
}

export default function SectionLabel({ children, color = 'muted', className = '', as: Tag = 'span' }: SectionLabelProps) {
  return (
    <Tag className={`text-[10px] font-sans font-bold uppercase tracking-widest ${color === 'accent' ? 'text-accent' : 'text-muted'} ${className}`.trim()}>
      {children}
    </Tag>
  );
}
