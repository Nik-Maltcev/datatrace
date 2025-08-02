/**
 * Monitoring Page Component
 * Main page for system monitoring and dashboard
 */

import React from 'react';
import MonitoringDashboard from '../monitoring/MonitoringDashboard';

const MonitoringPage: React.FC = () => {
  return (
    <div className="monitoring-page">
      <MonitoringDashboard />
    </div>
  );
};

export default MonitoringPage;