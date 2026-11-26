import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="cm-app">
      {/* ── Sidebar ── */}
      <aside className="cm-sidebar">
        {/* Logo */}
        <div className="cm-logo">
          <img src="/logo.webp" alt="CodeMetric" className="cm-logo-img" />
          <span className="cm-logo-text">CodeMetric</span>
        </div>

        {/* Nav */}
        <nav className="cm-nav">
          <NavLink to="/dashboard" className={({ isActive }) => `cm-nav-item${isActive ? ' active' : ''}`}>
            <i className="ri-home-5-line"></i>
            <span>Home</span>
          </NavLink>
          <NavLink to="/attendance" className={({ isActive }) => `cm-nav-item${isActive ? ' active' : ''}`}>
            <i className="ri-calendar-check-line"></i>
            <span>Attendance</span>
          </NavLink>
          <NavLink to="/leaves" className={({ isActive }) => `cm-nav-item${isActive ? ' active' : ''}`}>
            <i className="ri-leaf-line"></i>
            <span>Leave</span>
          </NavLink>
          {isAdmin && (
            <NavLink to="/employees" className={({ isActive }) => `cm-nav-item${isActive ? ' active' : ''}`}>
              <i className="ri-team-line"></i>
              <span>Employees</span>
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/reports" className={({ isActive }) => `cm-nav-item${isActive ? ' active' : ''}`}>
              <i className="ri-file-chart-line"></i>
              <span>Reports</span>
            </NavLink>
          )}
          <NavLink to="/profile" className={({ isActive }) => `cm-nav-item${isActive ? ' active' : ''}`}>
            <i className="ri-settings-4-line"></i>
            <span>Settings</span>
          </NavLink>
        </nav>

        {/* User profile at bottom */}
        <div className="cm-sidebar-user">
          <div className="cm-user-avatar-sm">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="cm-user-meta">
            <div className="cm-user-name-sm">{user?.name || 'User'}</div>
            <div className="cm-user-role-sm">{user?.role === 'admin' ? 'Administrator' : 'Employee'}</div>
          </div>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className="cm-main">
        {/* Top Header */}
        <header className="cm-header">
          <div className="cm-header-left">
            <h1 className="cm-greeting">{greeting()}, {user?.name?.split(' ')[0] || 'User'}</h1>
            <p className="cm-greeting-sub">Let&apos;s make today a productive day!!</p>
          </div>
          <div className="cm-header-right">
            <div className="cm-search-box">
              <i className="ri-search-line"></i>
              <input type="text" placeholder="Search employees, leaves, payroll..." readOnly />
            </div>
            <button className="cm-icon-btn" title="Notifications">
              <i className="ri-notification-3-line"></i>
            </button>
            <button className="cm-avatar-btn" onClick={() => navigate('/profile')}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </button>
            <button className="cm-logout-btn" onClick={logout} title="Logout">
              <i className="ri-logout-box-r-line"></i>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="cm-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
