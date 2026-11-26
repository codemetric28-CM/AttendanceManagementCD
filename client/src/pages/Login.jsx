import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff, Lock, Mail, ArrowRight, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

export default function Login() {
  const { user: authUser, login, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // steps: "login" | "forgot" | "hr" | "success"
  const [step, setStep] = useState("login");
  const [empId, setEmpId] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotId, setForgotId] = useState("");
  const [successRole, setSuccessRole] = useState("Admin");

  // Auto redirect on success
  useEffect(() => {
    if (step === "success") {
      const timer = setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [step, successRole, navigate]);

  if (!authLoading && authUser && step !== "success") {
    return <Navigate to="/dashboard" replace />;
  }

  const isFormValid = empId.trim().length > 0 && password.trim().length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid || loading) return;

    setLoading(true);
    setError("");

    try {
      const res = await login(empId.trim(), password);
      const user = res?.user || res;
      const destRole = user?.role === "admin" || user?.role === "hr" ? "Admin" : "Employee";
      setSuccessRole(destRole);
      setStep("success");
      toast.success(`Welcome back, ${user?.name || "User"}!`);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Invalid Employee ID or password. Please check and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoRole) => {
    setLoading(true);
    setError("");
    const id = demoRole === "admin" ? "ADM001" : "EMP001";
    const pass = demoRole === "admin" ? "Admin@123" : "Emp@123";
    try {
      const res = await login(id, pass);
      const user = res?.user || res;
      setSuccessRole(demoRole === "admin" ? "Admin" : "Employee");
      setStep("success");
      toast.success(`Welcome, ${user?.name || "User"}!`);
    } catch {
      toast.error("Demo login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        
        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        html, body, #root {
          width: 100%;
          min-height: 100vh;
          background: #081325;
          font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .cm-login-wrapper {
          position: relative;
          width: 100%;
          min-height: 100vh;
          background-color: #081325;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 32px 24px;
        }

        /* ── Full bottom wave background ── */
        .cm-bg-wave {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 100%;
          min-height: 360px;
          max-height: 943px;
          object-fit: fill;
          pointer-events: none;
          z-index: 1;
        }

        /* ── Container ── */
        .cm-container {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 1120px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 48px;
        }

        /* ── Left Content Section ── */
        .cm-left {
          flex: 1;
          max-width: 480px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          z-index: 3;
        }

        .cm-logo-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 36px;
        }
        .cm-logo-img {
          height: 32px;
          width: auto;
          object-fit: contain;
        }
        .cm-logo-text {
          font-size: 19px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.3px;
        }

        .cm-headline {
          font-size: 40px;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.18;
          letter-spacing: -0.8px;
          margin-bottom: 14px;
        }

        .cm-subtext {
          font-size: 14.5px;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.55;
          max-width: 360px;
          margin-bottom: 28px;
        }

        /* Feature Pills */
        .cm-pills-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 32px;
        }
        .cm-pill-item {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 9px 16px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.88);
          font-size: 13.5px;
          font-weight: 500;
          width: fit-content;
          backdrop-filter: blur(6px);
        }
        .cm-pill-item svg {
          flex-shrink: 0;
          opacity: 0.9;
        }

        /* Laptop Illustration */
        .cm-laptop-wrap {
          position: relative;
          width: 100%;
          max-width: 320px;
          margin-top: -150px;
          margin-left: 135px;
        }
        .cm-laptop-img {
          width: 100%;
          height: auto;
          display: block;
          filter: drop-shadow(0 20px 30px rgba(0, 0, 0, 0.45));
        }

        /* ── Right Card Section ── */
        .cm-card {
          width: 600px;
          flex-shrink: 0;
          background: #ffffff;
          border-radius: 24px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28), 0 4px 18px rgba(0, 0, 0, 0.12);
          padding: 42px 40px 36px;
          display: flex;
          flex-direction: column;
          position: relative;
          z-index: 4;
        }

        .cm-fade-step {
          animation: cmFade 0.22s ease-out;
        }
        @keyframes cmFade {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Card Header */
        .cm-card-title {
          font-size: 26px;
          font-weight: 800;
          color: #0f172a;
          text-align: center;
          margin-bottom: 6px;
          letter-spacing: -0.4px;
        }
        .cm-card-subtitle {
          font-size: 14px;
          color: #64748b;
          text-align: center;
          margin-bottom: 24px;
        }

        /* Role Switcher Toggle */
        .cm-role-toggle {
          display: flex;
          background: #f1f5f9;
          border-radius: 100px;
          padding: 4px;
          margin-bottom: 24px;
          gap: 4px;
        }
        .cm-role-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 9px 16px;
          border-radius: 100px;
          border: none;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.18s ease;
          background: transparent;
          color: #64748b;
          font-family: inherit;
        }
        .cm-role-btn.active {
          background: #ffffff;
          color: #0f172a;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05);
        }

        /* Form Controls */
        .cm-form-group {
          margin-bottom: 18px;
        }
        .cm-input-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 7px;
        }
        .cm-input {
          width: 100%;
          height: 46px;
          padding: 0 14px;
          border: 1.5px solid #e2e8f0;
          border-radius: 11px;
          font-size: 14px;
          color: #0f172a;
          background: #ffffff;
          outline: none;
          transition: all 0.15s ease;
          font-family: inherit;
        }
        .cm-input::placeholder {
          color: #94a3b8;
        }
        .cm-input:focus {
          border-color: #0d1f4e;
          box-shadow: 0 0 0 3px rgba(13, 31, 78, 0.08);
        }
        .cm-input.has-error {
          border-color: #f87171;
          background: #fef2f2;
        }
        .cm-input.has-error:focus {
          border-color: #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }

        .cm-input-error-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 6px;
          color: #ef4444;
          font-size: 12px;
          font-weight: 500;
        }
        .cm-error-badge {
          width: 13px;
          height: 13px;
          border-radius: 50%;
          background: #ef4444;
          color: #ffffff;
          font-size: 9px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .cm-password-wrap {
          position: relative;
        }
        .cm-password-wrap .cm-input {
          padding-right: 44px;
        }
        .cm-eye-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          transition: color 0.15s ease;
        }
        .cm-eye-btn:hover {
          color: #475569;
        }

        /* Checkbox & Forgot row */
        .cm-options-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 2px;
          margin-bottom: 22px;
        }
        .cm-checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #334155;
          font-weight: 500;
          cursor: pointer;
          user-select: none;
        }
        .cm-checkbox {
          width: 16px;
          height: 16px;
          accent-color: #0d1f4e;
          cursor: pointer;
        }
        .cm-forgot-btn {
          background: none;
          border: none;
          font-size: 13px;
          font-weight: 600;
          color: #0d1f4e;
          cursor: pointer;
          font-family: inherit;
          padding: 0;
        }
        .cm-forgot-btn:hover {
          text-decoration: underline;
        }

        /* Sign In Pill Button */
        .cm-submit-btn {
          width: 100%;
          height: 48px;
          border-radius: 100px;
          background: #0d1f4e;
          color: #ffffff;
          border: none;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.18s ease;
          font-family: inherit;
        }
        .cm-submit-btn:hover:not(:disabled) {
          background: #081536;
          box-shadow: 0 4px 16px rgba(13, 31, 78, 0.35);
          transform: translateY(-1px);
        }
        .cm-submit-btn:disabled {
          background: #e2e8f0;
          color: #94a3b8;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }

        /* Quick Demo Row */
        .cm-demo-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-top: 14px;
        }
        .cm-demo-pill {
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          color: #475569;
          font-size: 11.5px;
          font-weight: 600;
          padding: 5px 12px;
          border-radius: 100px;
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: inherit;
        }
        .cm-demo-pill:hover {
          background: #eff6ff;
          border-color: #3b82f6;
          color: #1d4ed8;
        }

        /* Lock Footer */
        .cm-footer-lock {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 12px;
          color: #94a3b8;
          margin-top: 14px;
        }

        /* Back Link */
        .cm-back-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: none;
          border: none;
          font-size: 13px;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          margin-bottom: 20px;
          padding: 0;
          font-family: inherit;
        }
        .cm-back-link:hover {
          color: #0f172a;
        }

        /* HR Check State */
        .cm-hr-icon-circle {
          width: 68px;
          height: 68px;
          border-radius: 50%;
          border: 2px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 12px auto 20px;
          color: #334155;
        }
        .cm-hr-text {
          font-size: 14px;
          color: #64748b;
          line-height: 1.6;
          text-align: center;
          margin-bottom: 30px;
        }
        .cm-hr-text strong {
          color: #0f172a;
        }

        /* Success State */
        .cm-success-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 50px 0 30px;
          text-align: center;
        }
        .cm-success-check {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #ecfdf5;
          color: #10b981;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
        }

        /* Spinner */
        .cm-spin {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: cm-spin 0.6s linear infinite;
        }
        @keyframes cm-spin {
          to { transform: rotate(360deg); }
        }

        /* Responsive Breakpoints */
        @media (max-width: 960px) {
          .cm-container {
            flex-direction: column;
            align-items: center;
            gap: 32px;
          }
          .cm-left {
            max-width: 100%;
            align-items: center;
            text-align: center;
          }
          .cm-subtext {
            max-width: 100%;
          }
          .cm-pills-list {
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: center;
          }
          .cm-laptop-wrap {
            display: none;
          }
          .cm-card {
            width: 100%;
            max-width: 440px;
          }
        }
      `}</style>

      <div className="cm-login-wrapper">
        {/* Full-width blue bottom wave */}
        <img src="/bg-wave.png" alt="" className="cm-bg-wave" />

        <div className="cm-container">
          {/* ── Left Branding Section ── */}
          <div className="cm-left">
            <div className="cm-logo-row">
              <img src="/CM Logo.png" alt="CodeMetric" className="cm-logo-img" />
              <span className="cm-logo-text">CodeMetric</span>
            </div>

            <h1 className="cm-headline">Your workplace,<br />all in one place.</h1>
            <p className="cm-subtext">Manage your workday with a smarter, simpler employee experience.</p>

            <div className="cm-pills-list">
              <div className="cm-pill-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Attendance
              </div>

              <div className="cm-pill-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Leave
              </div>
            </div>

            {/* Laptop Illustration */}
            <div className="cm-laptop-wrap">
              <img src="/image 1.png" alt="CodeMetric dashboard preview" className="cm-laptop-img" />
            </div>
          </div>

          {/* ── Right Card Section ── */}
          <div className="cm-card">
            {/* ── STEP 1: LOGIN ── */}
            {step === "login" && (
              <div className="cm-fade-step">
                <h2 className="cm-card-title">Welcome to CodeMetric</h2>
                <p className="cm-card-subtitle">Sign in with your Employee ID to continue.</p>

                <form onSubmit={handleSubmit}>
                  {/* ID Field */}
                  <div className="cm-form-group">
                    <label className="cm-input-label" htmlFor="empId">
                      Employee ID
                    </label>
                    <input
                      id="empId"
                      type="text"
                      className={`cm-input ${error ? "has-error" : ""}`}
                      placeholder="Enter Employee ID"
                      value={empId}
                      onChange={(e) => {
                        setEmpId(e.target.value);
                        setError("");
                      }}
                      autoComplete="username"
                      autoFocus
                    />
                    {error && (
                      <div className="cm-input-error-row">
                        <span className="cm-error-badge">!</span>
                        <span>{error}</span>
                      </div>
                    )}
                  </div>

                  {/* Password Field */}
                  <div className="cm-form-group">
                    <label className="cm-input-label" htmlFor="password">
                      Password
                    </label>
                    <div className="cm-password-wrap">
                      <input
                        id="password"
                        type={showPass ? "text" : "password"}
                        className="cm-input"
                        placeholder="Enter Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="cm-eye-btn"
                        onClick={() => setShowPass(!showPass)}
                        tabIndex={-1}
                        aria-label="Toggle password visibility"
                      >
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="cm-options-row">
                    <label className="cm-checkbox-label">
                      <input
                        type="checkbox"
                        className="cm-checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <span>Remember me</span>
                    </label>
                    <button
                      type="button"
                      className="cm-forgot-btn"
                      onClick={() => {
                        setStep("forgot");
                        setError("");
                        setForgotId("");
                      }}
                    >
                      Forgot Password?
                    </button>
                  </div>

                  {/* Sign In Button */}
                  <button
                    type="submit"
                    className="cm-submit-btn"
                    disabled={!isFormValid || loading}
                  >
                    {loading ? (
                      <span className="cm-spin" />
                    ) : (
                      <>
                        Sign In <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>

                {/* Quick One-Click Demo Access */}
                <div className="cm-demo-row">
                  <button
                    type="button"
                    className="cm-demo-pill"
                    onClick={() => handleQuickDemo("admin")}
                    title="Fill and enter Admin Dashboard instantly"
                  >
                    ⚡ Demo Admin
                  </button>
                  <button
                    type="button"
                    className="cm-demo-pill"
                    onClick={() => handleQuickDemo("employee")}
                    title="Fill and enter Employee Dashboard instantly"
                  >
                    👤 Demo Employee
                  </button>
                </div>

                {/* Footer Lock */}
                <div className="cm-footer-lock">
                  <Lock size={12} />
                  <span>Protected access &bull; Authorized users only</span>
                </div>
              </div>
            )}

            {/* ── STEP 2: FORGOT PASSWORD ── */}
            {step === "forgot" && (
              <div className="cm-fade-step">
                <h2 className="cm-card-title">Forgot Password?</h2>
                <p className="cm-card-subtitle">
                  Enter your Employee ID and we will let you know how to reset password.
                </p>

                <div className="cm-form-group">
                  <label className="cm-input-label" htmlFor="forgotId">
                    Employee ID
                  </label>
                  <input
                    id="forgotId"
                    type="text"
                    className="cm-input"
                    placeholder="Enter Employee ID"
                    value={forgotId}
                    onChange={(e) => setForgotId(e.target.value)}
                    autoFocus
                  />
                </div>

                <button
                  type="button"
                  className="cm-back-link"
                  onClick={() => setStep("login")}
                >
                  <ArrowLeft size={14} /> Back to Sign In
                </button>

                <button
                  type="button"
                  className="cm-submit-btn"
                  onClick={() => setStep("hr")}
                >
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            )}

            {/* ── STEP 3: CHECK WITH HR ── */}
            {step === "hr" && (
              <div className="cm-fade-step">
                <div className="cm-hr-icon-circle">
                  <Mail size={28} strokeWidth={1.75} />
                </div>
                <h2 className="cm-card-title">Check with HR</h2>
                <p className="cm-hr-text">
                  To reset your password, please contact your HR team at{" "}
                  <strong>hr@codemetric.com</strong> or visit the HR desk.
                </p>

                <button
                  type="button"
                  className="cm-submit-btn"
                  onClick={() => {
                    setStep("login");
                    setForgotId("");
                  }}
                >
                  Back to Sign In <ArrowRight size={16} />
                </button>
              </div>
            )}

            {/* ── STEP 4: SIGN IN SUCCESSFUL ── */}
            {step === "success" && (
              <div className="cm-fade-step">
                <div className="cm-success-box">
                  <div className="cm-success-check">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h2 className="cm-card-title">Sign in Successful</h2>
                  <p className="cm-card-subtitle" style={{ marginTop: 8 }}>
                    Redirecting to {successRole} dashboard...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
