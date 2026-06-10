import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  color = 'border-blue-600',
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4',
  };

  return (
    <div className={`flex items-center justify-center ${className}`} id="loading-spinner-container">
      <div
        id="loading-spinner"
        className={`${sizeClasses[size]} border-t-transparent rounded-full animate-spin ${color}`}
      />
    </div>
  );
};
