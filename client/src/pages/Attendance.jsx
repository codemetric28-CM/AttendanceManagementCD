import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, showToast } from '../utils/api';

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

  const loadHistory = async () => {
    try {
      const res = await apiFetch(`/api/employee/history?month=${month}`);
      setHistory(res.history || []);
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const loadGlobal = async () => {
    try {
      const data = await apiFetch(
        `/api/admin/attendance?date=${dateVal}&search=${encodeURIComponent(search)}&department=${encodeURIComponent(dept)}&status=${encodeURIComponent(status)}`
      );
      setGlobalRows(data.attendance || []);
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  useEffect(() => {
    if (!isAdmin) loadHistory();
  }, [month, isAdmin]);

  useEffect(() => {
    if (isAdmin) loadGlobal();
  }, [dateVal, dept, status, search, isAdmin]);

  return (
    <>
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
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Month:</label>{' '}
              <input
                type="month"
                className="form-control"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
          )}
        </div>
        <div>
          <button className="btn btn-outline btn-sm" onClick={() => (isAdmin ? loadGlobal() : loadHistory())}>
            <i className="ri-refresh-line"></i> Refresh
          </button>
        </div>
      </div>

      {!isAdmin && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <i className="ri-history-line"></i> My Monthly Attendance History
            </h3>
          </div>
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Break Time</th>
                  <th>Net Working Hours</th>
                  <th>Status</th>
                  <th>Late Flag</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted">
                      No attendance records found for {month}
                    </td>
                  </tr>
                ) : (
                  history.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.date}</strong>
                      </td>
                      <td>{item.check_in ? item.check_in.split(' ')[1] : '--:--'}</td>
                      <td>{item.check_out ? item.check_out.split(' ')[1] : '--:--'}</td>
                      <td>
                        {item.break_duration_mins} mins ({item.break_count} breaks)
                      </td>
                      <td>
                        <strong>{item.net_hours} hrs</strong>
                      </td>
                      <td>
                        <span className={`badge badge-${String(item.status).toLowerCase().replace(' ', '')}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        {item.is_late ? (
                          <span className="badge badge-late">Late</span>
                        ) : (
                          <span className="text-muted">On Time</span>
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

      {isAdmin && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <i className="ri-global-line"></i> Global Employee Attendance Records
            </h3>
          </div>
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Emp ID</th>
                  <th>Employee Name</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Break Time</th>
                  <th>Net Hours</th>
                  <th>Status</th>
                  <th>Late Flag</th>
                </tr>
              </thead>
              <tbody>
                {globalRows.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4 text-muted">
                      No attendance logs found matching filters.
                    </td>
                  </tr>
                ) : (
                  globalRows.map((att) => (
                    <tr key={att.id}>
                      <td>
                        <strong>{att.date}</strong>
                      </td>
                      <td>{att.employee_id}</td>
                      <td>
                        <strong>{att.user_name}</strong>{' '}
                        <span className="text-muted">({att.department})</span>
                      </td>
                      <td>{att.check_in ? att.check_in.split(' ')[1] : '--:--'}</td>
                      <td>{att.check_out ? att.check_out.split(' ')[1] : '--:--'}</td>
                      <td>{att.break_duration_mins} mins</td>
                      <td>
                        <strong>{att.net_hours} hrs</strong>
                      </td>
                      <td>
                        <span className={`badge badge-${String(att.status).toLowerCase().replace(' ', '')}`}>
                          {att.status}
                        </span>
                      </td>
                      <td>
                        {att.is_late ? (
                          <span className="badge badge-late">Late</span>
                        ) : (
                          <span className="text-muted">On Time</span>
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
