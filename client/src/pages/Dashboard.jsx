import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart, ArcElement, BarElement, CategoryScale, LinearScale, Legend, Tooltip } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { useAuth } from '../context/AuthContext';
import { apiFetch, showToast } from '../utils/api';

Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, Legend, Tooltip);

const BREAK_CONFIG = [
  { key: 'morning_tea',    label: 'Morning Tea',   icon: 'ri-cup-line',        time: '11:00 AM - 11:15 AM' },
  { key: 'lunch',          label: 'Lunch Break',   icon: 'ri-restaurant-line', time: '01:00 PM - 01:45 PM' },
  { key: 'afternoon_tea',  label: 'Afternoon Tea', icon: 'ri-goblet-line',     time: '04:00 PM - 04:15 PM' },
];

function parseTime(str) {
  if (!str) return '--:--';
  return str.includes(' ') ? str.split(' ')[1].slice(0, 5) : str.slice(0, 5);
}

function getIstNowParts() {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return {
    year: ist.getUTCFullYear(),
    month: ist.getUTCMonth(), // 0-11
    day: ist.getUTCDate()
  };
}

function formatYearMonth(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const [today, setToday]             = useState(null);
  const [activeBreak, setActiveBreak] = useState(null);
  const [todayBreaks, setTodayBreaks] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState({});
  const [prevMonthStats, setPrevMonthStats] = useState(null);
  const [monthHistory, setMonthHistory] = useState([]);
  const [monthLoading, setMonthLoading] = useState(false);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [adminStats, setAdminStats]   = useState(null);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [clock, setClock]             = useState('');
  const [dateLabel, setDateLabel]     = useState('');
  const [breakTimer, setBreakTimer]   = useState('00:00');
  const [nowMs, setNowMs]             = useState(() => Date.now());
  const [viewMonth, setViewMonth]     = useState(() => {
    const { year, month } = getIstNowParts();
    return { year, month };
  });
  const breakStartRef = useRef(null);
  const viewMonthRef = useRef(viewMonth);
  viewMonthRef.current = viewMonth;

  // ── Data Loading ──
  const loadMonthHistory = async (year, month) => {
    setMonthLoading(true);
    try {
      const monthStr = formatYearMonth(year, month);
      const res = await apiFetch(`/api/employee/history?month=${monthStr}`);
      setMonthHistory(res.history || []);
    } catch {
      setMonthHistory([]);
    } finally {
      setMonthLoading(false);
    }
  };

  const loadPrevMonthStats = async () => {
    try {
      const { year, month } = getIstNowParts();
      const prevDate = new Date(Date.UTC(year, month - 1, 1));
      const prevStr = formatYearMonth(prevDate.getUTCFullYear(), prevDate.getUTCMonth());
      const res = await apiFetch(`/api/employee/history?month=${prevStr}`);
      const rows = res.history || [];
      setPrevMonthStats({
        present_days: rows.filter((a) => ['Present', 'Late'].includes(a.status)).length,
        late_days: rows.filter((a) => a.status === 'Late').length,
        total_net_hours: rows.reduce((s, a) => s + (a.net_hours || 0), 0)
      });
    } catch {
      setPrevMonthStats(null);
    }
  };

  const loadEmployee = async () => {
    try {
      const data = await apiFetch('/api/employee/dashboard-summary');
      setToday(data.today);
      setActiveBreak(data.active_break);
      setTodayBreaks(data.today_breaks || []);
      setMonthlyStats(data.monthly_stats || {});
      setPendingLeaves(data.pending_leaves || 0);
      breakStartRef.current = data.active_break?.start_time
        ? new Date(data.active_break.start_time.replace(' ', 'T') + '+05:30')
        : null;
    } catch (err) { showToast(err.message, 'danger'); }
  };

  const loadAdmin = async () => {
    try {
      const data = await apiFetch('/api/admin/dashboard-stats');
      setAdminStats(data);
    } catch (err) { showToast(err.message, 'danger'); }
  };

  const loadLeaveHistory = async () => {
    try {
      const res = await apiFetch('/api/employee/leave/history');
      setLeaveHistory((res.leaves || []).slice(0, 3));
    } catch { /* silent */ }
  };

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setNowMs(now.getTime());
      setClock(now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateLabel(now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
      if (breakStartRef.current) {
        const d = Math.floor((now - breakStartRef.current) / 1000);
        setBreakTimer(`${String(Math.floor(d / 60)).padStart(2,'0')}:${String(d % 60).padStart(2,'0')}`);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!user) return;
    loadEmployee();
    loadLeaveHistory();
    loadPrevMonthStats();
    if (isAdmin) loadAdmin();

    const refreshId = setInterval(() => {
      loadEmployee();
      loadLeaveHistory();
      loadMonthHistory(viewMonthRef.current.year, viewMonthRef.current.month);
      if (isAdmin) loadAdmin();
    }, 30000);
    return () => clearInterval(refreshId);
  }, [user, isAdmin]);

  useEffect(() => {
    if (user) loadMonthHistory(viewMonth.year, viewMonth.month);
  }, [user, viewMonth.year, viewMonth.month]);

  // ── Actions ──
  const handleCheckIn = async () => {
    try {
      const res = await apiFetch('/api/employee/check-in', { method: 'POST' });
      showToast(res.message, res.is_late ? 'warning' : 'success');
      loadEmployee();
      loadMonthHistory(viewMonth.year, viewMonth.month);
    } catch (err) { showToast(err.message, 'danger'); }
  };

  const handleCheckOut = async () => {
    if (!confirm('Are you sure you want to check out for today?')) return;
    try {
      const res = await apiFetch('/api/employee/check-out', { method: 'POST' });
      showToast(res.message, 'success');
      loadEmployee();
      loadMonthHistory(viewMonth.year, viewMonth.month);
    } catch (err) { showToast(err.message, 'danger'); }
  };

  const handleStartBreak = async (breakType) => {
    try {
      const res = await apiFetch('/api/employee/break/start', { method: 'POST', body: JSON.stringify({ break_type: breakType }) });
      showToast(res.message, 'info');
      loadEmployee();
    } catch (err) { showToast(err.message, 'danger'); }
  };

  const handleEndBreak = async () => {
    try {
      const res = await apiFetch('/api/employee/break/end', { method: 'POST' });
      showToast(res.message, 'success');
      loadEmployee();
    } catch (err) { showToast(err.message, 'danger'); }
  };

  // ── Derived state ──
  const checkedIn  = !!(today?.check_in);
  const checkedOut = !!(today?.check_out);
  const shiftStatus = !checkedIn ? 'Not Started' : checkedOut ? 'Completed' : activeBreak ? 'On Break' : 'Working';
  const shiftStatusColor = { 'Working': '#10b981', 'On Break': '#f59e0b', 'Completed': '#6366f1', 'Not Started': '#94a3b8' };

  let todayNetWorkingDisplay = '0.00 hrs';
  if (checkedOut) {
    todayNetWorkingDisplay = `${Number(today?.net_hours || 0).toFixed(2)} hrs`;
  } else if (checkedIn && today?.check_in) {
    const checkInMs = new Date(today.check_in.replace(' ', 'T') + '+05:30').getTime();
    const completedBreakMs = (today.break_duration_mins || 0) * 60000;
    const ongoingBreakMs = breakStartRef.current ? Math.max(0, nowMs - breakStartRef.current.getTime()) : 0;
    const netMs = Math.max(0, nowMs - checkInMs - completedBreakMs - ongoingBreakMs);
    const totalMins = Math.floor(netMs / 60000);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    todayNetWorkingDisplay = `${hrs}h ${String(mins).padStart(2, '0')}m`;
  }

  // Monthly overview data (computed from real attendance records & calendar)
  const monthLabel = new Date(viewMonth.year, viewMonth.month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const totalDays = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
  const istNow = getIstNowParts();
  const isCurrentViewMonth = viewMonth.year === istNow.year && viewMonth.month === istNow.month;
  const isFutureViewMonth =
    viewMonth.year > istNow.year || (viewMonth.year === istNow.year && viewMonth.month > istNow.month);
  const elapsedDays = isFutureViewMonth ? 0 : isCurrentViewMonth ? istNow.day : totalDays;

  let weeklyOffDays = 0;
  for (let d = 1; d <= elapsedDays; d++) {
    const dow = new Date(viewMonth.year, viewMonth.month, d).getDay();
    if (dow === 0 || dow === 6) weeklyOffDays++;
  }

  const presentOnlyDays = monthHistory.filter((a) => a.status === 'Present').length;
  const lateDays = monthHistory.filter((a) => a.status === 'Late').length;
  const halfDays = monthHistory.filter((a) => a.status === 'Half Day').length;
  const onLeaveDays = monthHistory.filter((a) => a.status === 'On Leave').length;
  const absentDays = monthHistory.filter((a) => a.status === 'Absent').length;

  const attendanceBars = [
    { label: 'Present',    value: presentOnlyDays, total: totalDays, color: '#10b981' },
    { label: 'Late',       value: lateDays,        total: totalDays, color: '#f59e0b' },
    { label: 'Half Day',   value: halfDays,        total: totalDays, color: '#8b5cf6' },
    { label: 'On Leave',   value: onLeaveDays,     total: totalDays, color: '#3b82f6' },
    { label: 'Absent',     value: absentDays,      total: totalDays, color: '#ef4444' },
    { label: 'Weekly Off', value: weeklyOffDays,   total: totalDays, color: '#94a3b8' },
  ];

  const formatDelta = (curr, prev, unit = '') => {
    if (!prevMonthStats) return <span>this month</span>;
    const diff = Number((curr - prev).toFixed(1));
    if (diff === 0) return <span>same as last month</span>;
    const sign = diff > 0 ? '↑' : '↓';
    return (
      <>
        {sign} {Math.abs(diff)}{unit} <span>vs last month</span>
      </>
    );
  };

  // Admin charts
  const monthlyChart = adminStats ? {
    labels: Object.keys(adminStats.monthly_chart_data || {}),
    datasets: [{ data: Object.values(adminStats.monthly_chart_data || {}), backgroundColor: ['#10b981','#f59e0b','#0ea5e9','#ef4444','#6366f1'], borderWidth: 2, borderColor: 'transparent' }]
  } : null;

  const deptChart = adminStats ? {
    labels: Object.keys(adminStats.dept_chart_data || {}),
    datasets: [{ label: 'Employees', data: Object.values(adminStats.dept_chart_data || {}), backgroundColor: '#4f46e5', borderRadius: 8 }]
  } : null;

  const leaveStatusColor = { Pending: '#f59e0b', Approved: '#10b981', Rejected: '#ef4444' };
  const leaveIcons = { Casual: 'ri-calendar-event-line', Sick: 'ri-heart-pulse-line', Emergency: 'ri-alarm-warning-line', 'Work From Home': 'ri-home-office-line', Other: 'ri-file-list-line' };

  return (
    <div className="cm-dashboard">

      {/* ── ROW 1: Shift Status + Today's Breaks ── */}
      <div className="cm-row-2col">

        {/* Shift Status */}
        <div className="cm-card">
          <div className="cm-card-topbar">
            <span className="cm-card-title">Shift Status</span>
            <span className="cm-status-pill" style={{ background: `${shiftStatusColor[shiftStatus]}22`, color: shiftStatusColor[shiftStatus] }}>
              {shiftStatus}
            </span>
          </div>

          <div className="cm-shift-clock">{clock || '00:00:00 AM'}</div>
          <div className="cm-shift-date">{dateLabel}</div>

          <div className="cm-shift-btns">
            <button className="cm-btn-checkin" onClick={handleCheckIn} disabled={checkedIn}>
              Check In <i className="ri-login-circle-line"></i>
            </button>
            <button className="cm-btn-checkout" onClick={handleCheckOut} disabled={!checkedIn || checkedOut || !!activeBreak}>
              Check Out <i className="ri-logout-circle-r-line"></i>
            </button>
          </div>

          {/* <div className="cm-shift-meta">
            <div className="cm-shift-meta-item">
              <i className="ri-file-list-3-line" style={{ color: '#f59e0b' }}></i>
              <div>
                <div className="cm-meta-label">Checked In Time</div>
                <div className="cm-meta-value">{today?.check_in ? parseTime(today.check_in) : '--:--'}</div>
              </div>
            </div>
            <div className="cm-shift-meta-item">
              <i className="ri-calendar-schedule-line" style={{ color: '#6366f1' }}></i>
              <div>
                <div className="cm-meta-label">Shift Timing</div>
                <div className="cm-meta-value">10:00 AM – 07:00 PM</div>
              </div>
            </div>
          </div> */}

<div className="cm-shift-meta">
  <div className="cm-shift-meta-item">
    <i className="ri-login-box-line" style={{ color: '#f59e0b' }}></i>
    <div>
      <div className="cm-meta-label">Checked In Time</div>
      <div className="cm-meta-value">
        {today?.check_in ? parseTime(today.check_in) : '--:--'}
      </div>
    </div>
  </div>

  <div className="cm-shift-meta-item">
    <i className="ri-logout-box-r-line" style={{ color: '#ef4444' }}></i>
    <div>
      <div className="cm-meta-label">Checked Out Time</div>
      <div className="cm-meta-value">
        {today?.check_out ? parseTime(today.check_out) : '--:--'}
      </div>
    </div>
  </div>

  <div className="cm-shift-meta-item">
    <i className="ri-calendar-schedule-line" style={{ color: '#6366f1' }}></i>
    <div>
      <div className="cm-meta-label">Shift Timing</div>
      <div className="cm-meta-value">10:00 AM – 07:00 PM</div>
    </div>
  </div>

  <div className="cm-shift-meta-item">
    <i className="ri-timer-line" style={{ color: '#10b981' }}></i>
    <div>
      <div className="cm-meta-label">Total Net Working Hours</div>
      <div className="cm-meta-value" style={{ color: checkedIn && !checkedOut ? '#10b981' : '#0f172a' }}>
        {todayNetWorkingDisplay}
      </div>
    </div>
  </div>
</div>

          {/* Active break banner */}
          {activeBreak && (
            <div className="cm-break-active">
              <div>
                <div style={{ fontWeight: 700, color: '#92400e' }}>{activeBreak.break_type.replace(/_/g,' ').toUpperCase()} IN PROGRESS</div>
                <div style={{ fontSize: '0.82rem', color: '#92400e' }}>Duration: <strong style={{ fontFamily: 'monospace' }}>{breakTimer}</strong></div>
              </div>
              <button className="cm-btn-end-break" onClick={handleEndBreak}>End Break</button>
            </div>
          )}

          {/* Break start buttons */}
          {checkedIn && !checkedOut && !activeBreak && (
            <div className="cm-break-start-row">
              {BREAK_CONFIG.map(b => (
                <button key={b.key} className="cm-btn-break" onClick={() => handleStartBreak(b.key)}>
                  <i className={b.icon}></i> {b.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Today's Breaks */}
        <div className="cm-card">
          <div className="cm-card-topbar">
            <span className="cm-card-title">Today&apos;s Breaks</span>
          </div>
          <div className="cm-breaks-track">
            {BREAK_CONFIG.map((b, i) => {
              const breakRecord = todayBreaks.find(br => br.break_type === b.key);
              const isCompleted = breakRecord?.status === 'completed';
              const isActive    = breakRecord?.status === 'ongoing';
              const isPending   = !breakRecord;

              const startTime = breakRecord?.start_time
                ? breakRecord.start_time.split(' ')[1]?.slice(0, 5)
                : null;
              const endTime = breakRecord?.end_time
                ? breakRecord.end_time.split(' ')[1]?.slice(0, 5)
                : null;
              const timeDisplay = isCompleted && startTime && endTime
                ? `${startTime} – ${endTime}`
                : isActive && startTime
                  ? `Started ${startTime}`
                  : b.time;

              return (
                <div key={b.key} className="cm-break-node">
                  {i > 0 && (
                    <div className={`cm-break-line ${isCompleted ? 'done' : ''}`} />
                  )}
                  <div className={`cm-break-circle ${isCompleted ? 'done' : isActive ? 'active' : ''}`}>
                    {isCompleted ? (
                      <i className="ri-check-line cm-break-check-anim"></i>
                    ) : isActive ? (
                      <i className={`${b.icon} cm-break-pulse-anim`}></i>
                    ) : (
                      <i className={b.icon}></i>
                    )}
                  </div>
                  <div className="cm-break-info">
                    <div className="cm-break-name">{b.label}</div>
                    <div className="cm-break-time">{timeDisplay}</div>
                    <div className={`cm-break-badge ${isCompleted ? 'completed' : isActive ? 'inprogress' : 'pending'}`}>
                      {isCompleted ? '✓ Completed' : isActive ? '● In Progress' : 'Pending'}
                    </div>
                    {isCompleted && breakRecord?.duration_mins && (
                      <div className="cm-break-dur">{breakRecord.duration_mins} mins</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── ROW 2: 4 Stat Cards ── */}
      <div className="cm-stats-row">
        <div className="cm-stat">
          <div className="cm-stat-icon" style={{ background: '#eef2ff', color: '#4f46e5' }}>
            <i className="ri-calendar-check-line"></i>
          </div>
          <div className="cm-stat-body">
            <div className="cm-stat-val">{monthlyStats.present_days || 0}</div>
            <div className="cm-stat-lbl">Days Present</div>
            <div className="cm-stat-trend up">
              {formatDelta(monthlyStats.present_days || 0, prevMonthStats?.present_days || 0)}
            </div>
          </div>
        </div>
        <div className="cm-stat">
          <div className="cm-stat-icon" style={{ background: '#fff7ed', color: '#f59e0b' }}>
            <i className="ri-time-line"></i>
          </div>
          <div className="cm-stat-body">
            <div className="cm-stat-val">{monthlyStats.late_days || 0}</div>
            <div className="cm-stat-lbl">Late Arrivals</div>
            <div className="cm-stat-trend up">
              {formatDelta(monthlyStats.late_days || 0, prevMonthStats?.late_days || 0)}
            </div>
          </div>
        </div>
        <div className="cm-stat">
          <div className="cm-stat-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
            <i className="ri-timer-line"></i>
          </div>
          <div className="cm-stat-body">
            <div className="cm-stat-val">{(monthlyStats.total_net_hours || 0).toFixed(1)}h</div>
            <div className="cm-stat-lbl">Total Net Hours</div>
            <div className="cm-stat-trend up">
              {formatDelta(monthlyStats.total_net_hours || 0, prevMonthStats?.total_net_hours || 0, 'h')}
            </div>
          </div>
        </div>
        <div className="cm-stat">
          <div className="cm-stat-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>
            <i className="ri-calendar-2-line"></i>
          </div>
          <div className="cm-stat-body">
            <div className="cm-stat-val">{pendingLeaves}</div>
            <div className="cm-stat-lbl">Leave Request</div>
            <div className="cm-stat-viewall" onClick={() => navigate('/leaves')}>View All →</div>
          </div>
        </div>
      </div>

      {/* ── ROW 3: Monthly Overview + My Requests ── */}
      <div className="cm-row-2col">

        {/* Monthly Attendance Overview */}
        <div className="cm-card">
          <div className="cm-card-topbar" style={{ marginBottom: '0.4rem' }}>
            <div>
              <div className="cm-card-title">Monthly Attendance Overview</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                {monthLoading
                  ? `Loading ${monthLabel}...`
                  : isCurrentViewMonth
                    ? `Your live attendance summary for ${monthLabel}`
                    : `Attendance summary for ${monthLabel}`}
              </div>
            </div>
            <div className="cm-month-nav">
              <button onClick={() => setViewMonth(p => { const d = new Date(p.year, p.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; })}>‹</button>
              <span>{monthLabel}</span>
              <button onClick={() => setViewMonth(p => { const d = new Date(p.year, p.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; })}>›</button>
            </div>
          </div>
          <div className="cm-attendance-bars">
            {attendanceBars.map(bar => {
              const pct = totalDays > 0 ? Math.round((bar.value / totalDays) * 100) : 0;
              return (
                <div key={bar.label} className="cm-bar-row">
                  <div className="cm-bar-label">{bar.label}</div>
                  <div className="cm-bar-track">
                    <div className="cm-bar-fill" style={{ width: `${pct}%`, background: bar.color }} />
                  </div>
                  <div className="cm-bar-meta">{bar.value} days · {pct}%</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* My Requests */}
        <div className="cm-card">
          <div className="cm-card-topbar">
            <span className="cm-card-title">My Requests</span>
            <span className="cm-link" onClick={() => navigate('/leaves')}>View All →</span>
          </div>
          <div className="cm-requests-header">
            <span>Request type</span>
            <span>Status</span>
          </div>
          {leaveHistory.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem 0', fontSize: '0.85rem' }}>No leave requests found</div>
          ) : (
            leaveHistory.map(lv => (
              <div key={lv.id} className="cm-request-row">
                <div className="cm-request-left">
                  <div className="cm-req-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                    <i className={leaveIcons[lv.leave_type] || 'ri-file-list-line'}></i>
                  </div>
                  <div>
                    <div className="cm-req-type">{lv.leave_type} Leave</div>
                    <div className="cm-req-dates">{lv.start_date} – {lv.end_date}</div>
                  </div>
                </div>
                <div className="cm-req-status" style={{ color: leaveStatusColor[lv.status] || '#94a3b8' }}>
                  <span className="cm-req-dot" style={{ background: leaveStatusColor[lv.status] || '#94a3b8' }}></span>
                  {lv.status}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── ADMIN SECTION ── */}
      {isAdmin && adminStats && (
        <div style={{ marginTop: '0.5rem' }}>
          <div className="cm-section-title"><i className="ri-admin-line"></i> Organization Overview</div>
          <div className="cm-stats-row" style={{ marginBottom: '1.5rem' }}>
            {[
              { icon: 'ri-group-line', val: adminStats.total_employees, lbl: 'Total Staff', bg: '#eef2ff', clr: '#4f46e5' },
              { icon: 'ri-user-check-line', val: adminStats.today_stats?.present_today || 0, lbl: 'Present Today', bg: '#ecfdf5', clr: '#10b981' },
              { icon: 'ri-alarm-warning-line', val: adminStats.today_stats?.late_today || 0, lbl: 'Late Today', bg: '#fff7ed', clr: '#f59e0b' },
              { icon: 'ri-file-list-3-line', val: adminStats.pending_leaves_count || 0, lbl: 'Pending Leaves', bg: '#fef2f2', clr: '#ef4444' },
            ].map(s => (
              <div key={s.lbl} className="cm-stat">
                <div className="cm-stat-icon" style={{ background: s.bg, color: s.clr }}><i className={s.icon}></i></div>
                <div className="cm-stat-body">
                  <div className="cm-stat-val">{s.val}</div>
                  <div className="cm-stat-lbl">{s.lbl}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="cm-row-2col">
            <div className="cm-card">
              <div className="cm-card-topbar"><span className="cm-card-title"><i className="ri-pie-chart-line"></i> Monthly Distribution</span></div>
              <div style={{ maxHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {monthlyChart && <Doughnut data={monthlyChart} options={{ responsive: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } } }} />}
              </div>
            </div>
            <div className="cm-card">
              <div className="cm-card-topbar"><span className="cm-card-title"><i className="ri-bar-chart-fill"></i> Department Headcount</span></div>
              <div style={{ maxHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {deptChart && <Bar data={deptChart} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }} />}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
