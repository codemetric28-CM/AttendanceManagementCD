import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, showToast } from '../utils/api';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setEmployeeId(user.employee_id || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/employee/profile/update', {
        method: 'POST',
        body: JSON.stringify({
          name,
          phone,
          current_password: currentPassword,
          new_password: newPassword
        })
      });
      showToast(res.message, 'success');
      setCurrentPassword('');
      setNewPassword('');
      if (setUser && user) {
        setUser({ ...user, name, phone });
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  return (
    <div style={{ maxWidth: 650, margin: '0 auto' }}>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <i className="ri-user-settings-line"></i> Personal Profile Information
          </h3>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              Full Name
            </label>
            <input
              type="text"
              className="form-control"
              style={{ width: '100%' }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                Email Address (Read-only)
              </label>
              <input type="email" className="form-control" style={{ width: '100%' }} value={email} disabled />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                Employee ID (Read-only)
              </label>
              <input type="text" className="form-control" style={{ width: '100%' }} value={employeeId} disabled />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              Phone Number
            </label>
            <input
              type="text"
              className="form-control"
              style={{ width: '100%' }}
              placeholder="9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.5rem 0' }} />

          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
            <i className="ri-lock-line"></i> Change Password
          </h4>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              Current Password
            </label>
            <input
              type="password"
              className="form-control"
              style={{ width: '100%' }}
              placeholder="Required if changing password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              New Password
            </label>
            <input
              type="password"
              className="form-control"
              style={{ width: '100%' }}
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            <i className="ri-save-line"></i> Save Profile Settings
          </button>
        </form>
      </div>
    </div>
  );
}
