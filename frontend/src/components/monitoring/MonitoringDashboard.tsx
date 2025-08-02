/**
 * Monitoring Dashboard Component
 * Real-time monitoring dashboard for system metrics and alerts
 */

import React, { useState, useEffect, useCallback } from 'react';
import './MonitoringDashboard.css';

interface SystemMetrics {
  timestamp: string;
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
    heapUsed: number;
    heapTotal: number;
  };
  process: {
    pid: number;
    uptime: number;
    version: string;
  };
}

interface ApplicationMetrics {
  timestamp: string;
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
    requestsPerSecond: number;
  };
  searches: {
    total: number;
    successful: number;
    failed: number;
    averageSearchTime: number;
    searchesPerHour: number;
  };
  errors: {
    total: number;
    byEndpoint: Record<string, number>;
    criticalErrors: number;
  };
}

interface Alert {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  title: string;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: string;
  resolved: boolean;
}

interface DashboardData {
  timestamp: string;
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  metrics: {
    system: SystemMetrics[];
    application: ApplicationMetrics[];
  };
  trends: {
    system: {
      cpu: { current: number; previous: number };
      memory: { current: number; previous: number };
    } | null;
    application: {
      requests: { current: number; previous: number };
      errors: { current: number; previous: number };
    } | null;
  };
  alerts: {
    active: Alert[];
    summary: {
      total: number;
      critical: number;
      warning: number;
      info: number;
    };
  };
}

const MonitoringDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch('/api/monitoring/dashboard');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/monitoring/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Refresh dashboard data
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to resolve alert:', err);
      setError(err instanceof Error ? err.message : 'Failed to resolve alert');
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchDashboardData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchDashboardData]);

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatBytes = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'critical': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'info': return '#3b82f6';
      case 'warning': return '#f59e0b';
      case 'critical': return '#ef4444';
      case 'emergency': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getTrendIcon = (current: number, previous: number): string => {
    if (current > previous) return '↗️';
    if (current < previous) return '↘️';
    return '➡️';
  };

  if (loading) {
    return (
      <div className="monitoring-dashboard">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading monitoring dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="monitoring-dashboard">
        <div className="error">
          <h2>Error Loading Dashboard</h2>
          <p>{error}</p>
          <button onClick={fetchDashboardData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="monitoring-dashboard">
        <div className="no-data">
          <p>No dashboard data available</p>
        </div>
      </div>
    );
  }

  const latestSystemMetrics = dashboardData.metrics.system[dashboardData.metrics.system.length - 1];
  const latestAppMetrics = dashboardData.metrics.application[dashboardData.metrics.application.length - 1];

  return (
    <div className="monitoring-dashboard">
      <div className="dashboard-header">
        <h1>System Monitoring Dashboard</h1>
        <div className="dashboard-controls">
          <div className="refresh-controls">
            <label>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto Refresh
            </label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              disabled={!autoRefresh}
            >
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
              <option value={60000}>1m</option>
              <option value={300000}>5m</option>
            </select>
          </div>
          <button onClick={fetchDashboardData} className="refresh-button">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* System Status */}
      <div className="status-overview">
        <div className="status-card">
          <h3>System Status</h3>
          <div 
            className="status-indicator"
            style={{ backgroundColor: getStatusColor(dashboardData.status) }}
          >
            {dashboardData.status.toUpperCase()}
          </div>
          <p>Uptime: {formatUptime(dashboardData.uptime)}</p>
        </div>

        <div className="status-card">
          <h3>Active Alerts</h3>
          <div className="alert-summary">
            <div className="alert-count critical">
              {dashboardData.alerts.summary.critical} Critical
            </div>
            <div className="alert-count warning">
              {dashboardData.alerts.summary.warning} Warning
            </div>
            <div className="alert-count info">
              {dashboardData.alerts.summary.info} Info
            </div>
          </div>
        </div>
      </div>

      {/* System Metrics */}
      {latestSystemMetrics && (
        <div className="metrics-section">
          <h2>System Metrics</h2>
          <div className="metrics-grid">
            <div className="metric-card">
              <h3>CPU Usage</h3>
              <div className="metric-value">
                {latestSystemMetrics.cpu.usage.toFixed(1)}%
                {dashboardData.trends.system && (
                  <span className="trend">
                    {getTrendIcon(
                      dashboardData.trends.system.cpu.current,
                      dashboardData.trends.system.cpu.previous
                    )}
                  </span>
                )}
              </div>
              <div className="metric-details">
                <p>Cores: {latestSystemMetrics.cpu.cores}</p>
                <p>Load Avg: {latestSystemMetrics.cpu.loadAverage.map(l => l.toFixed(2)).join(', ')}</p>
              </div>
            </div>

            <div className="metric-card">
              <h3>Memory Usage</h3>
              <div className="metric-value">
                {latestSystemMetrics.memory.usage.toFixed(1)}%
                {dashboardData.trends.system && (
                  <span className="trend">
                    {getTrendIcon(
                      dashboardData.trends.system.memory.current,
                      dashboardData.trends.system.memory.previous
                    )}
                  </span>
                )}
              </div>
              <div className="metric-details">
                <p>Used: {formatBytes(latestSystemMetrics.memory.used)}</p>
                <p>Total: {formatBytes(latestSystemMetrics.memory.total)}</p>
                <p>Heap: {formatBytes(latestSystemMetrics.memory.heapUsed)} / {formatBytes(latestSystemMetrics.memory.heapTotal)}</p>
              </div>
            </div>

            <div className="metric-card">
              <h3>Process Info</h3>
              <div className="metric-value">
                PID {latestSystemMetrics.process.pid}
              </div>
              <div className="metric-details">
                <p>Node: {latestSystemMetrics.process.version}</p>
                <p>Uptime: {formatUptime(latestSystemMetrics.process.uptime)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Application Metrics */}
      {latestAppMetrics && (
        <div className="metrics-section">
          <h2>Application Metrics</h2>
          <div className="metrics-grid">
            <div className="metric-card">
              <h3>Requests</h3>
              <div className="metric-value">
                {latestAppMetrics.requests.total}
                {dashboardData.trends.application && (
                  <span className="trend">
                    {getTrendIcon(
                      dashboardData.trends.application.requests.current,
                      dashboardData.trends.application.requests.previous
                    )}
                  </span>
                )}
              </div>
              <div className="metric-details">
                <p>Successful: {latestAppMetrics.requests.successful}</p>
                <p>Failed: {latestAppMetrics.requests.failed}</p>
                <p>Avg Response: {latestAppMetrics.requests.averageResponseTime.toFixed(0)}ms</p>
                <p>RPS: {latestAppMetrics.requests.requestsPerSecond.toFixed(2)}</p>
              </div>
            </div>

            <div className="metric-card">
              <h3>Searches</h3>
              <div className="metric-value">
                {latestAppMetrics.searches.total}
              </div>
              <div className="metric-details">
                <p>Successful: {latestAppMetrics.searches.successful}</p>
                <p>Failed: {latestAppMetrics.searches.failed}</p>
                <p>Avg Time: {latestAppMetrics.searches.averageSearchTime.toFixed(0)}ms</p>
                <p>Per Hour: {latestAppMetrics.searches.searchesPerHour}</p>
              </div>
            </div>

            <div className="metric-card">
              <h3>Errors</h3>
              <div className="metric-value">
                {latestAppMetrics.errors.total}
                {dashboardData.trends.application && (
                  <span className="trend">
                    {getTrendIcon(
                      dashboardData.trends.application.errors.current,
                      dashboardData.trends.application.errors.previous
                    )}
                  </span>
                )}
              </div>
              <div className="metric-details">
                <p>Critical: {latestAppMetrics.errors.criticalErrors}</p>
                {Object.entries(latestAppMetrics.errors.byEndpoint).slice(0, 3).map(([endpoint, count]) => (
                  <p key={endpoint}>{endpoint}: {count}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Alerts */}
      {dashboardData.alerts.active.length > 0 && (
        <div className="alerts-section">
          <h2>Active Alerts</h2>
          <div className="alerts-list">
            {dashboardData.alerts.active.map((alert) => (
              <div 
                key={alert.id} 
                className={`alert-item ${alert.severity}`}
                style={{ borderLeftColor: getSeverityColor(alert.severity) }}
              >
                <div className="alert-header">
                  <h4>{alert.title}</h4>
                  <span className="alert-severity">{alert.severity.toUpperCase()}</span>
                </div>
                <p className="alert-message">{alert.message}</p>
                <div className="alert-details">
                  <span>Metric: {alert.metric}</span>
                  <span>Value: {alert.value}</span>
                  <span>Threshold: {alert.threshold}</span>
                  <span>Time: {new Date(alert.timestamp).toLocaleString()}</span>
                </div>
                <button 
                  onClick={() => resolveAlert(alert.id)}
                  className="resolve-button"
                >
                  Resolve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="dashboard-footer">
        <p>Last updated: {new Date(dashboardData.timestamp).toLocaleString()}</p>
      </div>
    </div>
  );
};

export default MonitoringDashboard;