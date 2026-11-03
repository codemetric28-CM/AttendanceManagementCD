import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const titles = {
  '/dashboard': 'Attendance Dashboard',
  '/attendance': 'Attendance Log & History',
  '/leaves': 'Leave Management',
  '/employees': 'Employee Management',
  '/reports': 'Reports & Data Exports',
  '/profile': 'User Profile & Security'
};

export default function Layout() {
  const { user, logout, theme, toggleTheme } = useAuth();
  const location = useLocation();
  const headerTitle = titles[location.pathname] || 'Dashboard';
  const isAdmin = user?.role === 'admin';

  return (
    <div className="app-container">
      <aside className="sidebar" id="app-sidebar">
        <div className="sidebar-header">
          <div className="brand-logo">A</div>
          <div className="brand-title">
            AttendX<span style={{ color: 'var(--primary)' }}>.io</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <i className="ri-dashboard-3-line"></i> <span>Dashboard</span>
          </NavLink>
          <NavLink to="/attendance" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <i className="ri-calendar-check-line"></i> <span>Attendance Log</span>
          </NavLink>
          <NavLink to="/leaves" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <i className="ri-flight-takeoff-line"></i> <span>Leaves</span>
          </NavLink>
          {isAdmin && (
            <NavLink to="/employees" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <i className="ri-team-line"></i> <span>Employees</span>
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/reports" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <i className="ri-file-chart-line"></i> <span>Reports & Export</span>
            </NavLink>
          )}
          <NavLink to="/profile" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <i className="ri-user-settings-line"></i> <span>My Profile</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-badge">
            <div className="user-avatar user-avatar-display">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="user-info">
              <div className="user-name user-name-display">{user?.name || 'Loading...'}</div>
              <div className="user-role user-role-display">
                {user ? `${user.department} • ${user.role.toUpperCase()}` : 'Staff'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-wrapper">
        <header className="top-header">
          <div className="header-left">
            <h2>{headerTitle}</h2>
          </div>
          <div className="header-right">
            <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Light/Dark Theme">
              <i className={theme === 'dark' ? 'ri-sun-line' : 'ri-moon-line'}></i>
            </button>
            <button className="btn-logout" onClick={logout}>
              <i className="ri-logout-box-r-line"></i> Logout
            </button>
          </div>
        </header>
        <div className="content-body">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
