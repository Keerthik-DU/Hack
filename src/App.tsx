import React from 'react';
import { Header, DesignTokenShowcase } from '@/components';
import '@/styles/globals.css';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-surface-light-bg dark:bg-surface-dark-bg text-surface-light-textPrimary dark:text-surface-dark-textPrimary transition-colors duration-300">
      <Header />
      <main className="container mx-auto py-8 px-4">
        <DesignTokenShowcase />
      </main>
    </div>
  );
};

export default App;
