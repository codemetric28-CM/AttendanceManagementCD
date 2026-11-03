# Office Attendance Management System (AttendX.io) — MERN

Full-stack **Office Attendance Management System** converted to the **MERN** stack:

- **MongoDB** + **Express** + **React** + **Node.js**

Same features as the original app: JWT role-based auth (Admin / Employee), check-in/out, break tracking, leave workflow, admin CRUD, Chart.js analytics, Excel/PDF exports, dark mode.

---

## Features

### Employee
- JWT login with role-based routing
- Punch Check In / Check Out with late marking (after 10:15 AM)
- Breaks: Morning Tea, Lunch, Afternoon Tea + live timer
- Attendance history, leave apply/track, profile & password update

### Admin
- Analytics dashboard (Chart.js)
- Employee CRUD (search, add, edit, reset password, delete)
- Global attendance monitor + leave approval (marks On Leave)
- Excel (.xlsx) and PDF report export

---

## Prerequisites

- Node.js 18+
- MongoDB running locally (`mongodb://127.0.0.1:27017`) **or** a MongoDB Atlas URI

---

## Quick Start

```bash
# 1) Install dependencies
npm run install:all

# 2) Configure MongoDB (optional)
cp server/.env.example server/.env
# Edit MONGO_URI if needed

# 3) Start API (auto-seeds data on boot)
npm run server

# 4) In another terminal — start React
npm run client
```

- Frontend: http://127.0.0.1:5173  
- API: http://127.0.0.1:5000  

Manual seed only:

```bash
npm run seed
```

---

## Default Credentials

| Role | Email | Password | Employee ID |
| :--- | :--- | :--- | :--- |
| **Admin** | `prathmesh@office.com` | `Prathmesh@1234` | ADM001 |
| **Employee** | `sagar@office.com` | `Emp@123` | EMP001 |
| **Employee** | `emp2@office.com` | `Emp@123` | EMP002 |
| **Employee** | `emp3@office.com` | `Emp@123` | EMP003 |

---

## Project Structure

```
Attendance-main/
├── client/                 # React (Vite)
│   ├── src/
│   │   ├── components/     # Layout
│   │   ├── context/        # Auth + theme
│   │   ├── pages/          # Login, Dashboard, Attendance, Leaves, Employees, Reports, Profile
│   │   └── utils/          # API + toasts
│   └── vite.config.js      # Proxies /api → :5000
├── server/                 # Express + MongoDB
│   ├── config/
│   ├── middleware/         # JWT auth
│   ├── models/             # User, Attendance, Break, Leave
│   ├── routes/             # auth, employee, admin, reports
│   ├── seed.js
│   └── index.js
├── package.json            # Root scripts
└── README.md
```

---

## API (same paths as original)

- `POST /api/auth/login` · `GET /api/auth/me` · `POST /api/auth/logout`
- `GET/POST` `/api/employee/*` — dashboard, check-in/out, breaks, history, leaves, profile
- `GET/POST/PUT/DELETE` `/api/admin/*` — stats, employees, attendance, leaves
- `GET /api/admin/export/excel` · `GET /api/admin/export/pdf`

---

## Production

```bash
npm run build
npm start
```

Express serves `client/dist` and the API on `PORT` (default `5000`).

---

## License

MIT
