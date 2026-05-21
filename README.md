# 🏥 Rehab Swat — Standalone & Multi-Tenant Clinic Management System (CMS)

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)

Welcome to the production-grade, highly optimized Clinic Management System (CMS) custom-built for **Rehab Swat Physiotherapy & Rehabilitation Centre (Swat)**. Engineered using a modern decoupled architecture featuring a React 18 + Vite frontend and a FastAPI backend, this software is available both as a standalone **Windows Desktop Executable (`.exe`)** and a production **Dockerized web application**.

---

## ⚡ Standalone Windows Desktop App (`RehabSwatClinic.exe`)

For extreme simplicity, offline reliability, and zero-configuration setups in local clinics, the entire platform has been compiled into a single Windows Executable. 

### 🚀 Quick Start (No Install Needed!)
1. Download **`RehabSwatClinic.exe`** and place it in any directory (e.g., `C:\RehabSwat\`).
2. Double-click **`RehabSwatClinic.exe`**.
3. A local database (`rehab_swat.db`) will be automatically initialized in the same folder.
4. Your default web browser will launch automatically pointing to **`http://localhost:8000`**.
5. Log in with the pre-seeded clinical credentials:

| Role | Default Username | Default Password |
|:---|:---|:---|
| **Super Admin** | `admin@rehabswat.pk` | `Admin@12345` |
| **Doctor** | `dr.yaqoob@rehabswat.pk` | `Doctor@12345` |

*To shut down the app, simply close the console command window.*

---

## 🎨 New Clinical Design System & Fresh Slate

- **Cool Clinical Palette:** Replaced the generic warm-cream theme with a highly premium, modern, slate-silver and oceanic-navy design system.
- **Butter-Smooth UI:** Integrated high-performance keyframe animations (fade-in, slide-up, scale-in, slide-right) and interactive micro-transitions on all action items, providing an extremely premium and state-of-the-art user experience.
- **Fresh Slate:** Completely purged all pre-seeded mock clinic records, treatment templates, diagnostic files, and logs. The application initializes as a clean, brand-new instance ready for real-world patient data intake.

---

## 🏗️ Technical Architecture

The architecture is built for clean separation of concerns:

```
┌────────────────────────────────────────┐
│             React Frontend             │
│   (Vite, TSX, Zustand, Tailwind v4)    │
└──────────────────┬─────────────────────┘
                   │ HTTP JSON APIs
                   ▼
┌────────────────────────────────────────┐
│            FastAPI Backend             │
│       (Python, SQLAlchemy, slowapi)    │
└──────────────┬──────────────────┬──────┘
               │                  │
               ▼ (SQLite - Dev)   ▼ (PostgreSQL - Prod)
┌──────────────────────┐  ┌──────────────────────┐
│    rehab_swat.db     │  │    PostgreSQL 16     │
│ (Standalone Desktop) │  │   (Docker Cluster)   │
└──────────────────────┘  └──────────────────────┘
```

---

## 📋 Comprehensive Module Suite

All core clinical modules are fully developed, thoroughly optimized, and completely integrated:

1. **Patient Management:** Case-insensitive search (name, MRN, phone), duplicate prevention (name + phone combinations), registration, and soft deletion.
2. **Appointment Scheduling:** Complete scheduling grid with status indicators, cancellation workflows with reason logs, and doctor availability calendars.
3. **Electronic Medical Records (EMR):** Comprehensive client SOAP notes recording, patient assessment history, and full longitudinal tracking.
4. **Treatment Plans:** Detailed rehabilitation pathways, custom exercise assignments (sets, reps, frequency), sessions logging, and milestones progress indicator.
5. **Prescription Manager:** Professional drug prescription module, dosing instructions, route details, and clinical documentation.
6. **Billing & Invoicing:** Dynamic invoice generator with line items, automated subtotaling, custom tax rates, discount logic, and real-time status trackers (PAID, PARTIAL, OVERDUE).
7. **Inventory & Supplies:** Supply level tracking, automated low-stock warnings, and transaction logs for usage, restocking, and waste.
8. **Staff Management:** Role-Based Access Control (RBAC) (Super Admin, Doctor, Intern, Receptionist), registration, and account deactivation.
9. **Analytics & Reports:** Rich visual dashboard reporting monthly appointment counts, total captured/pending revenue, and trends.
10. **Notifications & Comms:** Event-driven notification queue for clinic-wide updates, system alerts, and staff notifications.

---

## 🛠️ Developer Setup & Dev-Mode Run

If you wish to modify the source code or run the application in native dev-mode:

### 1. Backend API
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python main.py
```
- Local API Endpoint: **`http://localhost:8000`**
- Interactive API Docs (Swagger UI): **`http://localhost:8000/docs`**

### 2. Frontend Development Server
```powershell
cd frontend
npm install
npm run dev
```
- Local Dev Server: **`http://localhost:5173`** (features dynamic Vite HMR)

### 3. Production Deployment (Dockerized PostgreSQL + Redis)
Ensure Docker is installed, then spin up the entire cluster:
```powershell
docker-compose up --build -d
```
All environment-specific overrides can be configured in `backend/.env`.

---

## 📂 Project Structure

```
├── backend/                  # FastAPI Application Source
│   ├── dist/                 # Built frontend SPA assets (embedded)
│   ├── alembic/              # DB Migration scripts
│   ├── database.py           # Session factories
│   ├── main.py               # API Routers & SPA Server entrypoint
│   ├── models.py             # SQLAlchemy ORM declarations
│   ├── schemas.py            # Pydantic typing & validations
│   └── settings.py           # Configuration manager
├── frontend/                 # React 18 Application Source
│   ├── src/
│   │   ├── pages/            # View components (Patients, Billing, etc.)
│   │   ├── api.ts            # Axios centralized instance
│   │   └── index.css         # Clinical Design System stylesheet
│   └── vite.config.ts        # Vite dev proxy configuration
├── docs/                     # Comprehensive User Manuals
│   ├── admin_guide.md        # Operations & Control Manual
│   ├── doctor_guide.md       # EMR & Clinical Manual
│   └── receptionist_guide.md # Appointments & Billing Manual
└── docker-compose.yml        # Production Multi-Container Manifest
```

---

## 🛡️ Production Hardening & Security

- **Strict Cryptography:** Standard `bcrypt` password hashing and stateless JWT auth tokens.
- **Robust CORS:** Dynamically restricted to trusted client origins via `CORS_ALLOWED_ORIGINS`.
- **SQL Injection Prevention:** Built entirely using SQLAlchemy 2.0 type-safe query parameters.
- **Rate Limiting:** Guarded with `slowapi` to prevent API brute-forcing.

---

*Architected and developed with absolute precision. Designed to be lightweight, incredibly fast, and visually phenomenal.*
