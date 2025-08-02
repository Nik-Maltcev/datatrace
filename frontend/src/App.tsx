import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { Layout } from './components/Layout';
import { HomePage } from './components/pages/HomePage';
import { ResultsPage } from './components/pages/ResultsPage';
import { InstructionsPage } from './components/pages/InstructionsPage';
import { TariffsPage } from './components/pages/TariffsPage';
import { NotFoundPage } from './components/pages/NotFoundPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { NotificationContainer } from './components/common/NotificationContainer';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Router>
          <div className="App">
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/results" element={<ResultsPage />} />
                <Route path="/instructions/:botId" element={<InstructionsPage />} />
                <Route path="/tariffs" element={<TariffsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Layout>
            <NotificationContainer />
          </div>
        </Router>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;