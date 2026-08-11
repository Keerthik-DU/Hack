import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppHeader, StatusBar } from '@/components';
import { ThemeProvider } from '@/contexts';
import { ScannerPage } from '@/pages/ScannerPage';
import { AboutPage } from '@/pages/AboutPage';
import '@/styles/globals.css';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="flex flex-col min-h-screen bg-surface-light-bg dark:bg-surface-dark-bg text-surface-light-textPrimary dark:text-surface-dark-textPrimary transition-colors duration-300">
          <AppHeader />
          <main className="flex-1 container mx-auto py-8 px-4 sm:px-6">
            <Routes>
              <Route path="/" element={<ScannerPage />} />
              <Route path="/about" element={<AboutPage />} />
            </Routes>
          </main>
          <StatusBar />
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
