/**
 * Layout Component
 * Main layout wrapper for the application
 */

import React, { ReactNode } from 'react';
import { Header } from './common/Header';
import { Footer } from './common/Footer';
import { Sidebar } from './common/Sidebar';
import { useAppContext } from '../contexts/AppContext';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { state } = useAppContext();

  return (
    <div className={`layout ${state.ui.theme}`}>
      <Header />
      
      <div className="layout-content">
        {state.ui.sidebarOpen && <Sidebar />}
        
        <main className={`main-content ${state.ui.sidebarOpen ? 'with-sidebar' : ''}`}>
          {children}
        </main>
      </div>
      
      <Footer />
    </div>
  );
}