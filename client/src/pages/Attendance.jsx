import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, showToast } from '../utils/api';

const BASE_URL = import.meta.env.VITE_API_URL || '';

/** Extract HH:MM from "YYYY-MM-DD HH:MM:SS" */
function parseTime(str) {
  if (!str) return '--:--';
  return str.includes(' ') ? str.split(' ')[1].slice(0, 5) : str.slice(0, 5);
}

/** Format date as "Mon, 10 Nov 2026" */
function formatDate(dateStr) {
  if (!dateStr) return '--';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function Attendance() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [history, setHistory] = useState([]);
  const [dateVal, setDateVal] = useState(new Date().toISOString().slice(0, 10));
  const [dept, setDept] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [globalRows, setGlobalRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/employee/history?month=${month}`);
      setHistory(res.history || []);
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const loadGlobal = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(
        `/api/admin/attendance?date=${dateVal}&search=${encodeURIComponent(search)}&department=${encodeURIComponent(dept)}&status=${encodeURIComponent(status)}`
      );
      setGlobalRows(data.attendance || []);
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) loadHistory();
  }, [month, isAdmin]);

  useEffect(() => {
    if (isAdmin) loadGlobal();
  }, [dateVal, dept, status, search, isAdmin]);

  // ── Employee export helpers ──
  const exportEmployeeExcel = () => {
    const token = localStorage.getItem('jwt_token');
    window.open(
      `${BASE_URL}/api/employee/export/employee-excel?month=${month}&jwt_token=${token}`,
      '_blank'
    );
  };
  const exportEmployeePdf = () => {
    const token = localStorage.getItem('jwt_token');
    window.open(
      `${BASE_URL}/api/employee/export/employee-pdf?month=${month}&jwt_token=${token}`,
      '_blank'
    );
  };

  // ── Admin export helpers ──
  const exportAdminExcel = () => {
    const token = localStorage.getItem('jwt_token');
    window.open(
      `${BASE_URL}/api/admin/export/excel?month=${dateVal.slice(0, 7)}&department=${encodeURIComponent(dept)}&jwt_token=${token}`,
      '_blank'
    );
  };
  const exportAdminPdf = () => {
    const token = localStorage.getItem('jwt_token');
    window.open(
      `${BASE_URL}/api/admin/export/pdf?month=${dateVal.slice(0, 7)}&department=${encodeURIComponent(dept)}&jwt_token=${token}`,
      '_blank'
    );
  };

  // ── Employee summary stats ──
  const stats = {
    present: history.filter((h) => ['Present', 'Late'].includes(h.status)).length,
    late: history.filter((h) => h.is_late).length,
    halfDay: history.filter((h) => h.status === 'Half Day').length,
    onLeave: history.filter((h) => h.status === 'On Leave').length,
    absent: history.filter((h) => h.status === 'Absent').length,
    totalNetHours: history.reduce((s, h) => s + (parseFloat(h.net_hours) || 0), 0).toFixed(2),
    totalBreakMins: history.reduce((s, h) => s + (parseInt(h.break_duration_mins) || 0), 0),
  };

  return (
    <>
      {/* ── Filter Bar ── */}
      <div className="filter-bar">
        <div className="filter-inputs">
          {isAdmin ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Date:</label>
                <input
                  type="date"
                  className="form-control"
                  value={dateVal}
                  onChange={(e) => setDateVal(e.target.value)}
                />
              </div>
              <select className="form-control" value={dept} onChange={(e) => setDept(e.target.value)}>
                <option value="">All Departments</option>
                <option value="Engineering">Engineering</option>
                <option value="Marketing">Marketing</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Management">Management</option>
                <option value="General">General</option>
              </select>
              <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Half Day">Half Day</option>
                <option value="Absent">Absent</option>
                <option value="On Leave">On Leave</option>
              </select>
              <input
                type="text"
                className="form-control"
                placeholder="Search employee name/ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Month:</label>
              <input
                type="month"
                className="form-control"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => (isAdmin ? loadGlobal() : loadHistory())}
            disabled={loading}
          >
            <i className={loading ? 'ri-loader-4-line' : 'ri-refresh-line'}></i>{' '}
            {loading ? 'Loading…' : 'Refresh'}
          </button>

          {/* Export buttons — visible for both roles */}
          {isAdmin ? (
            <>
              <button className="btn btn-success btn-sm" onClick={exportAdminExcel} title="Export filtered view to Excel">
                <i className="ri-file-excel-2-line"></i> Excel
              </button>
              <button className="btn btn-danger btn-sm" onClick={exportAdminPdf} title="Export filtered view to PDF">
                <i className="ri-file-pdf-line"></i> PDF
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-success btn-sm" onClick={exportEmployeeExcel} title="Download my attendance as Excel">
                <i className="ri-file-excel-2-line"></i> Export Excel
              </button>
              <button className="btn btn-danger btn-sm" onClick={exportEmployeePdf} title="Download my attendance as PDF">
                <i className="ri-file-pdf-line"></i> Export PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          EMPLOYEE VIEW — Monthly History
         ══════════════════════════════════════════ */}
      {!isAdmin && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 className="card-title">
              <i className="ri-history-line"></i> My Monthly Attendance History
            </h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {history.length} record{history.length !== 1 ? 's' : ''} for {month}
            </span>
          </div>

          {/* Summary stat chips */}
          {history.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.6rem',
                padding: '0.85rem 1.25rem',
                borderBottom: '1px solid var(--border-color)',
                background: 'var(--primary-light)',
              }}
            >
              {[
                { label: 'Present', value: stats.present, color: 'var(--success)' },
                { label: 'Late', value: stats.late, color: 'var(--warning)' },
                { label: 'Half Day', value: stats.halfDay, color: 'var(--secondary)' },
                { label: 'On Leave', value: stats.onLeave, color: 'var(--info)' },
                { label: 'Absent', value: stats.absent, color: 'var(--danger)' },
                { label: 'Net Hours', value: `${stats.totalNetHours}h`, color: 'var(--primary)' },
                { label: 'Break', value: `${stats.totalBreakMins}m`, color: '#8b5cf6' },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'var(--bg-surface)',
                    border: `1.5px solid ${s.color}`,
                    borderRadius: 'var(--radius-full)',
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  <span style={{ color: s.color }}>{s.value}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                </div>
              ))}
            </div>
          )}

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Total Hrs</th>
                  <th>Break</th>
                  <th>Net Hours</th>
                  <th>Status</th>
                  <th>Late?</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4 text-muted">
                      <i className="ri-calendar-2-line" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}></i>
                      No attendance records found for {month}
                    </td>
                  </tr>
                ) : (
                  history.map((item, idx) => (
                    <tr key={item.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{idx + 1}</td>
                      <td>
                        <strong style={{ fontSize: '0.88rem' }}>{formatDate(item.date)}</strong>
                      </td>
                      <td>
                        {item.check_in ? (
                          <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                            <i className="ri-login-circle-line"></i> {parseTime(item.check_in)}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        {item.check_out ? (
                          <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                            <i className="ri-logout-circle-r-line"></i> {parseTime(item.check_out)}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>{item.total_hours != null ? `${item.total_hours}h` : '—'}</td>
                      <td>
                        <span style={{ fontSize: '0.82rem' }}>
                          {item.break_duration_mins ?? 0} mins
                          {item.break_count != null && (
                            <span className="text-muted"> ({item.break_count} break{item.break_count !== 1 ? 's' : ''})</span>
                          )}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--primary)' }}>{item.net_hours ?? 0}h</strong>
                      </td>
                      <td>
                        <span className={`badge badge-${String(item.status).toLowerCase().replace(/\s+/g, '')}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        {item.is_late ? (
                          <span className="badge badge-late"><i className="ri-time-line"></i> Late</span>
                        ) : (
                          <span style={{ color: 'var(--success)', fontSize: '0.82rem', fontWeight: 600 }}>
                            <i className="ri-checkbox-circle-line"></i> On Time
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {/* Summary footer row */}
              {history.length > 0 && (
                <tfoot>
                  <tr style={{ background: 'var(--primary-light)', fontWeight: 700, fontSize: '0.85rem' }}>
                    <td colSpan="2" style={{ textAlign: 'right', paddingRight: '0.5rem', color: 'var(--primary)' }}>
                      Monthly Totals
                    </td>
                    <td colSpan="2" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {stats.present} present days
                    </td>
                    <td>—</td>
                    <td style={{ color: '#8b5cf6' }}>{stats.totalBreakMins} mins</td>
                    <td style={{ color: 'var(--primary)' }}>{stats.totalNetHours}h</td>
                    <td colSpan="2" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      Late: {stats.late} &nbsp;|&nbsp; Half: {stats.halfDay}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          ADMIN VIEW — Global Attendance Records
         ══════════════════════════════════════════ */}
      {isAdmin && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 className="card-title">
              <i className="ri-global-line"></i> Global Employee Attendance Records
            </h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {globalRows.length} record{globalRows.length !== 1 ? 's' : ''} for {dateVal}
              {dept ? ` · ${dept}` : ''}
            </span>
          </div>

          {/* Admin quick summary chips */}
          {globalRows.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.6rem',
                padding: '0.85rem 1.25rem',
                borderBottom: '1px solid var(--border-color)',
                background: 'var(--primary-light)',
              }}
            >
              {[
                { label: 'Present', value: globalRows.filter((r) => r.status === 'Present').length, color: 'var(--success)' },
                { label: 'Late', value: globalRows.filter((r) => r.status === 'Late').length, color: 'var(--warning)' },
                { label: 'Half Day', value: globalRows.filter((r) => r.status === 'Half Day').length, color: 'var(--secondary)' },
                { label: 'On Leave', value: globalRows.filter((r) => r.status === 'On Leave').length, color: 'var(--info)' },
                { label: 'Absent', value: globalRows.filter((r) => r.status === 'Absent').length, color: 'var(--danger)' },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'var(--bg-surface)',
                    border: `1.5px solid ${s.color}`,
                    borderRadius: 'var(--radius-full)',
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  <span style={{ color: s.color }}>{s.value}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                </div>
              ))}
            </div>
          )}

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Emp ID</th>
                  <th>Employee Name</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Break</th>
                  <th>Net Hours</th>
                  <th>Status</th>
                  <th>Late?</th>
                </tr>
              </thead>
              <tbody>
                {globalRows.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-4 text-muted">
                      <i className="ri-calendar-2-line" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}></i>
                      No attendance logs found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  globalRows.map((att, idx) => (
                    <tr key={att.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{idx + 1}</td>
                      <td>
                        <strong style={{ fontSize: '0.88rem' }}>{formatDate(att.date)}</strong>
                      </td>
                      <td>
                        <code style={{ fontSize: '0.82rem', background: 'var(--primary-light)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                          {att.employee_id}
                        </code>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{att.user_name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{att.department}</div>
                      </td>
                      <td>
                        {att.check_in ? (
                          <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                            <i className="ri-login-circle-line"></i> {parseTime(att.check_in)}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        {att.check_out ? (
                          <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                            <i className="ri-logout-circle-r-line"></i> {parseTime(att.check_out)}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>
                        {att.break_duration_mins ?? 0} mins
                        {att.break_count != null && (
                          <span className="text-muted"> ({att.break_count})</span>
                        )}
                      </td>
                      <td>
                        <strong style={{ color: 'var(--primary)' }}>{att.net_hours ?? 0}h</strong>
                      </td>
                      <td>
                        <span className={`badge badge-${String(att.status).toLowerCase().replace(/\s+/g, '')}`}>
                          {att.status}
                        </span>
                      </td>
                      <td>
                        {att.is_late ? (
                          <span className="badge badge-late"><i className="ri-time-line"></i> Late</span>
                        ) : (
                          <span style={{ color: 'var(--success)', fontSize: '0.82rem', fontWeight: 600 }}>
                            <i className="ri-checkbox-circle-line"></i> On Time
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
