import { useEffect, useRef, useState } from 'react';
import { Chart, ArcElement, BarElement, CategoryScale, LinearScale, Legend, Tooltip } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { useAuth } from '../context/AuthContext';
import { apiFetch, showToast } from '../utils/api';

Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, Legend, Tooltip);

export default function Dashboard() {
  const { user } = useAuth();
  const [today, setToday] = useState(null);
  const [activeBreak, setActiveBreak] = useState(null);
  const [monthlyStats, setMonthlyStats] = useState({});
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [adminStats, setAdminStats] = useState(null);
  const [clock, setClock] = useState('');
  const [dateLabel, setDateLabel] = useState('');
  const [breakTimer, setBreakTimer] = useState('00:00');
  const breakStartRef = useRef(null);

  const loadEmployee = async () => {
    try {
      const data = await apiFetch('/api/employee/dashboard-summary');
      setToday(data.today);
      setActiveBreak(data.active_break);
      setMonthlyStats(data.monthly_stats || {});
      setPendingLeaves(data.pending_leaves || 0);
      if (data.active_break?.start_time) {
        breakStartRef.current = new Date(data.active_break.start_time.replace(' ', 'T'));
      } else {
        breakStartRef.current = null;
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const loadAdmin = async () => {
    try {
      const data = await apiFetch('/api/admin/dashboard-stats');
      setAdminStats(data);
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      );
      setDateLabel(
        now.toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      );
      if (breakStartRef.current) {
        const diffSecs = Math.floor((now - breakStartRef.current) / 1000);
        const mins = Math.floor(diffSecs / 60).toString().padStart(2, '0');
        const secs = (diffSecs % 60).toString().padStart(2, '0');
        setBreakTimer(`${mins}:${secs}`);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    loadEmployee();
    if (user?.role === 'admin') loadAdmin();
  }, [user]);

  const handleCheckIn = async () => {
    try {
      const res = await apiFetch('/api/employee/check-in', { method: 'POST' });
      showToast(res.message, res.is_late ? 'warning' : 'success');
      loadEmployee();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleCheckOut = async () => {
    if (!confirm('Are you sure you want to check out for today?')) return;
    try {
      const res = await apiFetch('/api/employee/check-out', { method: 'POST' });
      showToast(res.message, 'success');
      loadEmployee();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleStartBreak = async (breakType) => {
    try {
      const res = await apiFetch('/api/employee/break/start', {
        method: 'POST',
        body: JSON.stringify({ break_type: breakType })
      });
      showToast(res.message, 'info');
      loadEmployee();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleEndBreak = async () => {
    try {
      const res = await apiFetch('/api/employee/break/end', { method: 'POST' });
      showToast(res.message, 'success');
      loadEmployee();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const checkedIn = !!(today && today.check_in);
  const checkedOut = !!(today && today.check_out);
  const statusText = !checkedIn ? 'Not Checked In' : today.status;
  const statusClass = !checkedIn
    ? 'badge badge-absent'
    : `badge badge-${String(today.status).toLowerCase().replace(' ', '')}`;

  const monthlyChart = adminStats
    ? {
        labels: Object.keys(adminStats.monthly_chart_data || {}),
        datasets: [
          {
            data: Object.values(adminStats.monthly_chart_data || {}),
            backgroundColor: ['#10b981', '#f59e0b', '#0ea5e9', '#ef4444', '#6366f1'],
            borderWidth: 2,
            borderColor: 'transparent'
          }
        ]
      }
    : null;

  const deptChart = adminStats
    ? {
        labels: Object.keys(adminStats.dept_chart_data || {}),
        datasets: [
          {
            label: 'Employees',
            data: Object.values(adminStats.dept_chart_data || {}),
            backgroundColor: '#4f46e5',
            borderRadius: 8
          }
        ]
      }
    : null;

  return (
    <>
      <div id="employee-dashboard-section">
        <div className="card punch-card">
          <div className="card-header" style={{ marginBottom: '0.5rem' }}>
            <div>
              <h3 className="card-title">
                <i className="ri-time-line"></i> Today's Shift & Break Control
              </h3>
              <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                {dateLabel || 'Loading date...'}
              </p>
            </div>
            <span className={statusClass}>{statusText}</span>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.5rem',
              marginTop: '1rem'
            }}
          >
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Current Local Time
              </div>
              <div className="timer-display">{clock || '00:00:00 AM'}</div>
              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.88rem' }}>
                <div>
                  <i className="ri-login-box-line" style={{ color: 'var(--success)' }}></i> Check In:{' '}
                  <strong>{today?.check_in ? today.check_in.split(' ')[1] : '--:--'}</strong>
                </div>
                <div>
                  <i className="ri-logout-box-line" style={{ color: 'var(--danger)' }}></i> Check Out:{' '}
                  <strong>
                    {checkedOut
                      ? today.check_out.split(' ')[1]
                      : checkedIn
                        ? 'In Progress...'
                        : '--:--'}
                  </strong>
                </div>
                <div>
                  <i className="ri-timer-line" style={{ color: 'var(--primary)' }}></i> Net Hours:{' '}
                  <strong>
                    {checkedOut
                      ? `${today.net_hours} hrs`
                      : checkedIn
                        ? 'Counting...'
                        : '0.0 hrs'}
                  </strong>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 200 }}>
              <button className="btn btn-success" onClick={handleCheckIn} disabled={checkedIn}>
                <i className="ri-fingerprint-line"></i> Punch Check In
              </button>
              <button
                className="btn btn-danger"
                onClick={handleCheckOut}
                disabled={!checkedIn || checkedOut || !!activeBreak}
              >
                <i className="ri-door-lock-line"></i> Punch Check Out
              </button>
            </div>
          </div>

          {checkedIn && !checkedOut && !activeBreak && (
            <div
              style={{
                marginTop: '1.5rem',
                paddingTop: '1.25rem',
                borderTop: '1px dashed var(--border-color)'
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                <i className="ri-cup-line"></i> TAKE A BREAK
              </div>
              <div className="break-buttons-group">
                <button className="btn btn-outline" onClick={() => handleStartBreak('morning_tea')}>
                  <i className="ri-cup-line"></i> Morning Tea Break (15m)
                </button>
                <button className="btn btn-outline" onClick={() => handleStartBreak('lunch')}>
                  <i className="ri-restaurant-line"></i> Lunch Break (45m)
                </button>
                <button className="btn btn-outline" onClick={() => handleStartBreak('afternoon_tea')}>
                  <i className="ri-goblet-line"></i> Afternoon Tea Break (15m)
                </button>
              </div>
            </div>
          )}

          {activeBreak && (
            <div
              style={{
                marginTop: '1.5rem',
                padding: '1.25rem',
                background: 'var(--warning-light)',
                border: '1px solid var(--warning)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--warning-text)', fontSize: '1rem' }}>
                    {activeBreak.break_type.replace(/_/g, ' ').toUpperCase()} IN PROGRESS
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--warning-text)' }}>
                    Break Duration:{' '}
                    <strong style={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>{breakTimer}</strong>
                  </div>
                </div>
                <button className="btn btn-warning" onClick={handleEndBreak}>
                  <i className="ri-stop-circle-line"></i> Resume Work (End Break)
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid-4">
          <div className="stat-card">
            <div className="stat-icon icon-purple">
              <i className="ri-calendar-event-line"></i>
            </div>
            <div className="stat-info">
              <div className="stat-value">{monthlyStats.present_days || 0}</div>
              <div className="stat-label">Present Days This Month</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon icon-amber">
              <i className="ri-time-line"></i>
            </div>
            <div className="stat-info">
              <div className="stat-value">{monthlyStats.late_days || 0}</div>
              <div className="stat-label">Late Arrivals</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon icon-blue">
              <i className="ri-time-fill"></i>
            </div>
            <div className="stat-info">
              <div className="stat-value">{`${(monthlyStats.total_net_hours || 0).toFixed(1)}h`}</div>
              <div className="stat-label">Total Net Hours</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon icon-green">
              <i className="ri-flight-takeoff-line"></i>
            </div>
            <div className="stat-info">
              <div className="stat-value">{pendingLeaves}</div>
              <div className="stat-label">Pending Leave Requests</div>
            </div>
          </div>
        </div>
      </div>

      {user?.role === 'admin' && adminStats && (
        <div style={{ marginTop: '2rem' }}>
          <div className="card-header" style={{ marginBottom: '1.5rem' }}>
            <h3 className="card-title" style={{ fontSize: '1.25rem' }}>
              <i className="ri-admin-line" style={{ color: 'var(--primary)' }}></i> Organization Overview &
              Analytics
            </h3>
          </div>
          <div className="grid-4">
            <div className="stat-card">
              <div className="stat-icon icon-purple">
                <i className="ri-group-line"></i>
              </div>
              <div className="stat-info">
                <div className="stat-value">{adminStats.total_employees}</div>
                <div className="stat-label">Total Active Staff</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon icon-green">
                <i className="ri-user-check-line"></i>
              </div>
              <div className="stat-info">
                <div className="stat-value">{adminStats.today_stats?.present_today || 0}</div>
                <div className="stat-label">Present Today</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon icon-amber">
                <i className="ri-alarm-warning-line"></i>
              </div>
              <div className="stat-info">
                <div className="stat-value">{adminStats.today_stats?.late_today || 0}</div>
                <div className="stat-label">Late Today</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon icon-red">
                <i className="ri-file-list-3-line"></i>
              </div>
              <div className="stat-info">
                <div className="stat-value">{adminStats.pending_leaves_count || 0}</div>
                <div className="stat-label">Pending Leaves</div>
              </div>
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="card-header">
                <h4 className="card-title">
                  <i className="ri-pie-chart-line"></i> Monthly Attendance Distribution
                </h4>
              </div>
              <div style={{ maxHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {monthlyChart && (
                  <Doughnut
                    data={monthlyChart}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: { boxWidth: 12, font: { family: 'Plus Jakarta Sans' } }
                        }
                      }
                    }}
                  />
                )}
              </div>
            </div>
            <div className="card">
              <div className="card-header">
                <h4 className="card-title">
                  <i className="ri-bar-chart-fill"></i> Department Staff Headcount
                </h4>
              </div>
              <div style={{ maxHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {deptChart && (
                  <Bar
                    data={deptChart}
                    options={{
                      responsive: true,
                      plugins: { legend: { display: false } },
                      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
