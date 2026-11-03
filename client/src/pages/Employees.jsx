import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch, showToast } from '../utils/api';

const emptyAdd = {
  employee_id: '',
  name: '',
  email: '',
  password: '',
  role: 'employee',
  department: 'Engineering',
  designation: '',
  phone: ''
};

export default function Employees() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyAdd);
  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    role: 'employee',
    department: 'Engineering',
    designation: '',
    phone: '',
    password: ''
  });

  const loadEmployees = async () => {
    try {
      const data = await apiFetch(
        `/api/admin/employees?search=${encodeURIComponent(search)}&department=${encodeURIComponent(dept)}`
      );
      setEmployees(data.employees || []);
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') loadEmployees();
  }, [search, dept, user]);

  if (user && user.role !== 'admin') return <Navigate to="/dashboard" replace />;

  const submitAdd = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/admin/employees', {
        method: 'POST',
        body: JSON.stringify(addForm)
      });
      showToast(res.message, 'success');
      setAddOpen(false);
      setAddForm(emptyAdd);
      loadEmployees();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const openEdit = (emp) => {
    setEditForm({
      id: emp.id,
      name: emp.name,
      role: emp.role,
      department: emp.department,
      designation: emp.designation,
      phone: emp.phone || '',
      password: ''
    });
    setEditOpen(true);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch(`/api/admin/employees/${editForm.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editForm.name,
          role: editForm.role,
          department: editForm.department,
          designation: editForm.designation,
          phone: editForm.phone,
          password: editForm.password
        })
      });
      showToast(res.message, 'success');
      setEditOpen(false);
      loadEmployees();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const deleteEmployee = async (id, name) => {
    if (!confirm(`Are you sure you want to remove employee "${name}"? This action cannot be undone.`)) return;
    try {
      const res = await apiFetch(`/api/admin/employees/${id}`, { method: 'DELETE' });
      showToast(res.message, 'success');
      loadEmployees();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  return (
    <>
      <div className="filter-bar">
        <div className="filter-inputs">
          <input
            type="text"
            className="form-control"
            placeholder="Search by name, ID, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="form-control" value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Marketing">Marketing</option>
            <option value="Human Resources">Human Resources</option>
            <option value="Management">Management</option>
            <option value="General">General</option>
          </select>
        </div>
        <div>
          <button
            className="btn btn-primary"
            onClick={() => {
              setAddForm(emptyAdd);
              setAddOpen(true);
            }}
          >
            <i className="ri-user-add-line"></i> Add New Employee
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <i className="ri-team-line"></i> Staff Directory & Accounts
          </h3>
        </div>
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Emp ID</th>
                <th>Employee Name & Email</th>
                <th>Department</th>
                <th>Designation</th>
                <th>System Role</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">
                    No employees found.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id}>
                    <td>
                      <strong>{emp.employee_id}</strong>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="user-avatar" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{emp.name}</div>
                          <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                            {emp.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{emp.department}</td>
                    <td>{emp.designation}</td>
                    <td>
                      <span className={`badge ${emp.role === 'admin' ? 'badge-leave' : 'badge-present'}`}>
                        {emp.role}
                      </span>
                    </td>
                    <td>{emp.phone || '--'}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline"
                        style={{ marginRight: 4 }}
                        onClick={() => openEdit(emp)}
                      >
                        <i className="ri-edit-line"></i>
                      </button>
                      {emp.role !== 'admin' && (
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => deleteEmployee(emp.id, emp.name)}
                        >
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`modal-backdrop${addOpen ? ' active' : ''}`}>
        <div className="modal-card">
          <div className="modal-header">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
              <i className="ri-user-add-line"></i> Register New Staff Member
            </h3>
            <button className="close-btn" onClick={() => setAddOpen(false)}>
              &times;
            </button>
          </div>
          <form onSubmit={submitAdd}>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                    Employee ID
                  </label>
                  <input
                    className="form-control"
                    style={{ width: '100%' }}
                    placeholder="EMP004"
                    value={addForm.employee_id}
                    onChange={(e) => setAddForm({ ...addForm, employee_id: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                    Full Name
                  </label>
                  <input
                    className="form-control"
                    style={{ width: '100%' }}
                    placeholder="John Doe"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    style={{ width: '100%' }}
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    style={{ width: '100%' }}
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                    Department
                  </label>
                  <select
                    className="form-control"
                    style={{ width: '100%' }}
                    value={addForm.department}
                    onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Management">Management</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                    Designation
                  </label>
                  <input
                    className="form-control"
                    style={{ width: '100%' }}
                    placeholder="Software Engineer"
                    value={addForm.designation}
                    onChange={(e) => setAddForm({ ...addForm, designation: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                    System Role
                  </label>
                  <select
                    className="form-control"
                    style={{ width: '100%' }}
                    value={addForm.role}
                    onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                    Phone Number
                  </label>
                  <input
                    className="form-control"
                    style={{ width: '100%' }}
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setAddOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <i className="ri-check-line"></i> Create Account
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className={`modal-backdrop${editOpen ? ' active' : ''}`}>
        <div className="modal-card">
          <div className="modal-header">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
              <i className="ri-edit-line"></i> Edit Staff Account
            </h3>
            <button className="close-btn" onClick={() => setEditOpen(false)}>
              &times;
            </button>
          </div>
          <form onSubmit={submitEdit}>
            <div className="modal-body">
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Full Name
                </label>
                <input
                  className="form-control"
                  style={{ width: '100%' }}
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                    Department
                  </label>
                  <select
                    className="form-control"
                    style={{ width: '100%' }}
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Management">Management</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                    Designation
                  </label>
                  <input
                    className="form-control"
                    style={{ width: '100%' }}
                    value={editForm.designation}
                    onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                    Role
                  </label>
                  <select
                    className="form-control"
                    style={{ width: '100%' }}
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                    Phone
                  </label>
                  <input
                    className="form-control"
                    style={{ width: '100%' }}
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Reset Password (Optional)
                </label>
                <input
                  type="password"
                  className="form-control"
                  style={{ width: '100%' }}
                  placeholder="Leave blank to keep unchanged"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setEditOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <i className="ri-save-line"></i> Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
