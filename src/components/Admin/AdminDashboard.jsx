import { useEffect, useState } from 'react';
import axios from 'axios';
import { Alert, Empty, Spin } from 'antd';
import AdminLayout, { fmtDate, fmtTime } from './AdminLayout';
import { API_URL } from '../../auth';

function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    axios
      .get(`${API_URL}/admin/dashboard`)
      .then((response) => setData(response.data))
      .catch((err) => setError(err.response?.data?.message || 'Could not load the dashboard.'));
  }, []);

  const s = data?.stats || {};
  const tiles = [
    { label: 'Total users', value: s.totalUsers },
    { label: 'Fur Parents', value: s.customers },
    { label: 'Hotel Staff', value: s.staff },
    { label: 'Groomers', value: s.groomers },
    { label: 'Two-factor users', value: s.twoFactor },
    { label: 'Activity today', value: s.activityToday },
  ];

  return (
    <AdminLayout title="Admin Dashboard" active="Dashboard">
      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}

      <div className="adm-stats">
        {tiles.map((tile) => (
          <div key={tile.label} className="adm-stat">
            <div className="adm-stat-label">{tile.label}</div>
            <div className="adm-stat-value">{tile.value ?? '—'}</div>
          </div>
        ))}
      </div>

      <h2 className="adm-section">Recent Activity</h2>
      {!data && !error && <Spin />}
      {data && data.recent.length === 0 && <Empty description="No activity yet" />}
      {data && data.recent.length > 0 && (
        <div className="adm-list">
          {data.recent.map((log) => (
            <div key={log._id} className="adm-row">
              <span className="adm-row-title">{log.action}</span>
              <span className="adm-row-date">{fmtDate(log.createdAt)}</span>
              <span className="adm-row-time">{fmtTime(log.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

export default AdminDashboard;