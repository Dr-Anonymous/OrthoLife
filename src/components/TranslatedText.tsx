import React from 'react';
import { useTranslatedContent } from '@/hooks/useTranslatedContent';
import { Skeleton } from './ui/skeleton';

interface TranslatedTextProps {
  children: string;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  fallbackComponent?: React.ComponentType<{ children: React.ReactNode; className?: string }>;
}

export const TranslatedText: React.FC<TranslatedTextProps> = ({ 
  children, 
  className = '',
  as: Component = 'span',
  fallbackComponent: FallbackComponent
}) => {
  const { text, isLoading } = useTranslatedContent(children);

  if (isLoading) {
    if (FallbackComponent) {
      return <FallbackComponent className={className}><Skeleton className="h-4 w-full" /></FallbackComponent>;
    }
    return <Skeleton className={`h-4 w-full ${className}`} />;
  }

  return <Component className={className}>{text}</Component>;
};