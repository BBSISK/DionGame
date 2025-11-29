import React from 'react';

export const Spinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center space-y-4">
    <div className="w-16 h-16 border-4 border-dino-accent border-t-transparent rounded-full animate-spin"></div>
    <p className="text-dino-accent font-medium animate-pulse">Extracting DNA...</p>
  </div>
);