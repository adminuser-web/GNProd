import React from 'react';
import { clsx } from 'clsx';
import { GoldButton } from './GoldButton';
import { RevealSection } from './Reveal';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  actionLink?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ icon, title, description, actionText, actionLink, onAction, className }: EmptyStateProps) {
  return (
    <RevealSection className={clsx("flex flex-col items-center justify-center p-8 md:p-16 text-center border border-dashed border-[#c5a059]/20 bg-surface/30 rounded-sm mx-auto w-full", className)}>
      <div className="w-16 h-16 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/20 flex items-center justify-center mb-6 text-[#c5a059]">
        {icon}
      </div>
      <h3 className="text-xl font-bold tracking-[0.15em] uppercase text-content mb-3">{title}</h3>
      <p className="text-sm text-muted/80 max-w-sm mb-8 font-light leading-relaxed">{description}</p>
      
      {actionText && (
        actionLink ? (
          <GoldButton as={Link} to={actionLink} variant="outline" className="px-8 gap-2">
            {actionText}
          </GoldButton>
        ) : (
          <GoldButton onClick={onAction} variant="outline" className="px-8 gap-2">
            {actionText}
          </GoldButton>
        )
      )}
    </RevealSection>
  );
}
