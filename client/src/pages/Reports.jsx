import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Reports() {
  const { user } = useAuth();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [dept, setDept] = useState('');

  useEffect(() => {
    setMonth(new Date().toISOString().slice(0, 7));
  }, []);

  const isAdmin = user?.role === 'admin';
  if (user && !isAdmin) return <Navigate to="/dashboard" replace />;

  const triggerExcelExport = () => {
    const token = localStorage.getItem('jwt_token');
    window.open(
      `/api/admin/export/excel?month=${month}&department=${encodeURIComponent(dept)}&jwt_token=${token}`,
      '_blank'
    );
  };

  const triggerPdfExport = () => {
    const token = localStorage.getItem('jwt_token');
    window.open(
      `/api/admin/export/pdf?month=${month}&department=${encodeURIComponent(dept)}&jwt_token=${token}`,
      '_blank'
    );
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <i className="ri-file-download-line"></i> Generate Custom Attendance Exports
        </h3>
      </div>

      <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Filter and download complete attendance records, total working hours, late arrivals, and break
        durations in professional Excel (.xlsx) or print-ready PDF formats.
      </p>

      <div
        style={{
          background: 'var(--bg-body)',
          padding: '1.5rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          marginBottom: '1.5rem'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
            alignItems: 'end'
          }}
        >
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>
              Select Target Month
            </label>
            <input
              type="month"
              className="form-control"
              style={{ width: '100%' }}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>
              Select Department Filter
            </label>
            <select
              className="form-control"
              style={{ width: '100%' }}
              value={dept}
              onChange={(e) => setDept(e.target.value)}
            >
              <option value="">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Marketing">Marketing</option>
              <option value="Human Resources">Human Resources</option>
              <option value="Management">Management</option>
              <option value="General">General</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-success" style={{ flex: 1 }} onClick={triggerExcelExport}>
              <i className="ri-file-excel-2-line"></i> Export Excel (.xlsx)
            </button>
            <button className="btn btn-danger" style={{ flex: 1 }} onClick={triggerPdfExport}>
              <i className="ri-file-pdf-line"></i> Export PDF Report
            </button>
          </div>
        </div>
      </div>

      <div
        className="stat-card"
        style={{
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.05), rgba(16, 185, 129, 0.05))'
        }}
      >
        <div className="stat-icon icon-purple">
          <i className="ri-shield-check-line"></i>
        </div>
        <div className="stat-info">
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Automated Metric Compliance</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            All exports dynamically include net working hours after deducting Morning Tea, Lunch, and
            Afternoon Tea breaks, with clear late arrival annotations.
          </div>
        </div>
      </div>
    </div>
  );
}
