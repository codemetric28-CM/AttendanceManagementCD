import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, showToast } from '../utils/api';

export default function Leaves() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [leaves, setLeaves] = useState([]);
  const [adminLeaves, setAdminLeaves] = useState([]);
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    leave_type: 'Casual',
    start_date: '',
    end_date: '',
    reason: ''
  });

  const loadLeaveHistory = async () => {
    try {
      const res = await apiFetch('/api/employee/leave/history');
      setLeaves(res.leaves || []);
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const loadAdminLeaves = async () => {
    try {
      const data = await apiFetch(`/api/admin/leaves?status=${encodeURIComponent(statusFilter)}`);
      setAdminLeaves(data.leaves || []);
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  useEffect(() => {
    if (isAdmin) loadAdminLeaves();
    else loadLeaveHistory();
  }, [isAdmin, statusFilter]);

  const submitLeave = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/employee/leave/apply', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      showToast(res.message, 'success');
      setModalOpen(false);
      setForm({ leave_type: 'Casual', start_date: '', end_date: '', reason: '' });
      if (isAdmin) loadAdminLeaves();
      else loadLeaveHistory();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const processLeaveAction = async (leaveId, action) => {
    const remarks = prompt(`Enter admin remarks for ${action.toLowerCase()} leave (optional):`) || '';
    try {
      const res = await apiFetch(`/api/admin/leave/${leaveId}/action`, {
        method: 'POST',
        body: JSON.stringify({ action, remarks })
      });
      showToast(res.message, 'success');
      loadAdminLeaves();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const badgeClass = (status) => {
    if (status === 'Approved') return 'badge-present';
    if (status === 'Rejected') return 'badge-absent';
    return 'badge-halfday';
  };

  return (
    <>
      <div className="filter-bar">
        <div>
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <i className="ri-add-line"></i> Apply for Leave
          </button>
        </div>
        {isAdmin && (
          <select
            className="form-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Leave Statuses</option>
            <option value="Pending">Pending Review</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        )}
      </div>

      {!isAdmin && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <i className="ri-file-text-line"></i> My Leave Applications
            </h3>
          </div>
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Leave Type</th>
                  <th>Duration / Dates</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Admin Remarks</th>
                  <th>Submitted On</th>
                </tr>
              </thead>
              <tbody>
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">
                      No leave requests found.
                    </td>
                  </tr>
                ) : (
                  leaves.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.leave_type}</strong>
                      </td>
                      <td>
                        {item.start_date} to {item.end_date}
                      </td>
                      <td>{item.reason}</td>
                      <td>
                        <span className={`badge ${badgeClass(item.status)}`}>{item.status}</span>
                      </td>
                      <td>{item.admin_remarks || <span className="text-muted">None</span>}</td>
                      <td>{item.created_at ? item.created_at.split(' ')[0] : ''}</td>
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
              <i className="ri-task-line"></i> Employee Leave Applications Center
            </h3>
          </div>
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Type</th>
                  <th>Date Range</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Action / Remarks</th>
                </tr>
              </thead>
              <tbody>
                {adminLeaves.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted">
                      No leave applications found.
                    </td>
                  </tr>
                ) : (
                  adminLeaves.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <strong>{l.employee_id}</strong> - {l.user_name}
                      </td>
                      <td>{l.department}</td>
                      <td>
                        <span className="badge badge-leave">{l.leave_type}</span>
                      </td>
                      <td>
                        {l.start_date} to {l.end_date}
                      </td>
                      <td>{l.reason}</td>
                      <td>
                        <span className={`badge ${badgeClass(l.status)}`}>{l.status}</span>
                      </td>
                      <td>
                        {l.status === 'Pending' ? (
                          <>
                            <button
                              className="btn btn-sm btn-success"
                              style={{ marginRight: 4 }}
                              onClick={() => processLeaveAction(l.id, 'Approved')}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => processLeaveAction(l.id, 'Rejected')}
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-muted">{l.admin_remarks || 'Processed'}</span>
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

      <div className={`modal-backdrop${modalOpen ? ' active' : ''}`}>
        <div className="modal-card">
          <div className="modal-header">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
              <i className="ri-flight-takeoff-line"></i> Apply for Leave
            </h3>
            <button className="close-btn" onClick={() => setModalOpen(false)}>
              &times;
            </button>
          </div>
          <form onSubmit={submitLeave}>
            <div className="modal-body">
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Leave Type
                </label>
                <select
                  className="form-control"
                  style={{ width: '100%' }}
                  value={form.leave_type}
                  onChange={(e) => setForm({ ...form, leave_type: e.target.value })}
                  required
                >
                  <option value="Casual">Casual Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Annual">Annual Leave</option>
                  <option value="Other">Other / Unpaid</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    style={{ width: '100%' }}
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    style={{ width: '100%' }}
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Reason for Leave
                </label>
                <textarea
                  className="form-control"
                  style={{ width: '100%', height: 90 }}
                  placeholder="Please provide clear reason..."
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <i className="ri-send-plane-line"></i> Submit Application
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
