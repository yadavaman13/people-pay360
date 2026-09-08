# Hi Mentors & Evaluators! 👋

We are team **ByteBuilders** and we selected **PeoplePay360: Integrated Human Resource & Payroll Operations Platform**.

**PeoplePay360** is a full-stack, enterprise-grade HR and Payroll platform built with **React 19, Vite, SCSS, Node.js (Express 5.x), PostgreSQL (Drizzle ORM), and Redis**. Unlike fragmented HR software or simplistic CRUD apps, PeoplePay360 connects the entire operational employee lifecycle—master records, period-specific contracts, shift schedules, daily attendance, and leave balance allocations—directly into a dynamic, rule-sequenced payroll computation engine with pre-validation anomaly detection, chromium-free PDF payslip generation, and automated bulk email delivery.

- **Project Hosted Link:** [Live Deployment Demo](https://people-pay360.onrender.com/login)
- **Presentation Video Link:** [Product Walkthrough & Demo Video](https://youtu.be/peoplepay360-demo)

**Project Screenshot:**
![Project Screenshot](https://ik.imagekit.io/hci5kelnn/readme/hrms/System_Arch.webp?format=webp)

---

## Table of Contents

1. [Team Members & Roles](#team-members--roles)
2. [Tech Stack](#tech-stack)
3. [Overall Project Architecture & Visual Diagrams](#overall-project-architecture--visual-diagrams)
4. [Project Structure](#project-structure)
5. [Core Modules & Features](#core-modules--features)
6. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
7. [Frontend Routes](#frontend-routes)
8. [API Endpoint Reference](#api-endpoint-reference)
9. [Prerequisites](#prerequisites)
10. [Getting Started](#getting-started)
11. [Challenges We Overcame](#challenges-we-overcame)

---

## Team Members & Roles

| Member Name              | Role                                  | Implemented Features                                                                                                                           | GitHub Profile                                                                                                                                                                        |
| :----------------------- | :------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Aryan Patel**          | Full Stack Developer    | feature wiring, auth, backend API integrations,payroll, salary management(client)          | <a href="https://github.com/aryanpatel287"><img src="https://github.com/aryanpatel287.png?size=40" width="40" height="40" style="border-radius:50%;" alt="aryanpatel287" /></a>       |
| **Iteshkumar Prajapati** | Full stack Developer | Frontend architecture, feature wiring, 3-tier SCSS design system, shared UI component development, employee(Both Client and Server), contract(Both Client and Server),Version control                              | <a href="https://github.com/iteshprajapati"><img src="https://github.com/iteshprajapati.png?size=40" width="40" height="40" style="border-radius:50%;" alt="iteshprajapati" /></a>    |
| **Yadav Aman Singh**     | Full Stack Developer        | Core Express 5.x API architecture, modular service pipelines, version control,attendance management, time-off, salary management(server)           | <a href="https://github.com/yadavaman13"><img src="https://github.com/yadavaman13.png?size=40" width="40" height="40" style="border-radius:50%;" alt="yadavaman13" /></a>             |
| **Ankur Singh**          | Database Architect & QA Lead          | Relational PostgreSQL schema modeling, Drizzle ORM migrations & seeders, end-to-end Jest/Supertest suite, and Test-Driven Documentation (TDDoc), Payslip(server side), Payrole Dashboard(Client side), Version control  | <a href="https://github.com/Ankursingh018as"><img src="https://github.com/Ankursingh018as.png?size=40" width="40" height="40" style="border-radius:50%;" alt="Ankursingh018as" /></a> |

---

## Tech Stack

### Frontend Client Layer

- **Core Library & Framework:** React 19 (`react` v19.2.7, `react-dom` v19.2.7)
- **Routing:** React Router v7 (`react-router` v7.18.1) with nested layouts & route auto-discovery
- **State Management:** React Context API (`AuthContext`, `PayrunContext`, `ThemeContext`) + Custom Feature Hooks
- **Styling & Theming:** Dart Sass (`sass` v1.83.0, `sass-embedded`) with 3-Tier Design Tokens (`tokens` → `themes` → `variables`) and Stylelint enforcement
- **Charts & Data Visualization:** Apache ECharts (`echarts` v6.1.0) for live interactive payroll & HR metrics
- **Network Interface:** Axios (`axios` v1.19.0) with centralized interceptors & error boundaries
- **Iconography:** Lucide React (`lucide-react` v0.468.0)
- **Bundler & Dev Server:** Vite 8 (`vite` v8.1.1)

### Backend API Layer

- **Runtime & Web Framework:** Node.js (ES Modules), Express.js 5.x (`express` v5.2.1)
- **Relational ORM:** Drizzle ORM (`drizzle-orm` v0.44.2, `drizzle-kit` v0.31.4)
- **Authentication:** JSON Web Tokens (`jsonwebtoken` v9.0.3), HTTP-only Cookies (`cookie-parser`), BcryptJS (`bcryptjs` v3.0.3)
- **Rate Limiting:** `express-rate-limit` v8.5.2 backed by Redis sliding-window counters
- **Request Validation:** Zod (`zod` v4.4.3) & Express-Validator (`express-validator` v7.3.2)
- **Logging & Monitoring:** Morgan (`morgan` v1.10.1) HTTP logger
- **File Upload Middleware:** Multer (`multer` v2.2.0)
- **Math & Calculation Engine:** Math.js (`mathjs` v15.2.0) for dynamic formula evaluation

### Data Access & Storage Layer

- **Relational Database Engine:** PostgreSQL 16+ (`pg` v8.14.0) with native range indexing (`daterange &&`)
- **Cache Store:** Redis (`ioredis` v5.10.1) for session caching, RBAC lookup, and rate limiting
- **Database Tools & Dashboards:** Drizzle Kit CLI (`drizzle-kit studio`, migration push, and schema diffing)

### Third-Party & Infrastructure Integrations

- **Document & Image Hosting:** ImageKit (`@imagekit/nodejs`) CDN
- **Document / PDF Engine:** Chromium-Free `html-pdf-lite` (PDFKit + `@resvg/resvg-js`) for instant, ultra-lightweight server-side payslip generation
- **Transactional Mail Delivery:** Nodemailer (`nodemailer` v8.0.7) & Mailjet (`node-mailjet` v6.0.11) with PDF streaming attachments
- **Payment Gateway Integration:** Razorpay (`razorpay` v2.9.8)
- **Google Cloud Services:** Google APIs Client (`googleapis` v172.0.0)
- **Verification & Barcodes:** QRCode (`qrcode` v1.5.4)

### Quality Assurance & Testing

- **Test Runner Framework:** Jest (`jest` v30.4.2) with `--experimental-vm-modules`
- **Deterministic Test Sequencer:** Custom `testSequencer.js` for strict 01 → 09 ordered module execution
- **API Integration Asserts:** Supertest (`supertest` v7.2.2)
- **Test-Driven Documentation (TDDoc):** Custom runtime payload interceptor (`md-logger.js`) auto-generating 9 Markdown API specifications (`docs/api-docs/`)
- **Postman Automation:** Automated compilation script (`scripts/generate-postman.js`) yielding a 400KB+ Postman v2.1.0 Collection with real mocked responses

---

## Overall Project Architecture & Visual Diagrams

### Overall Project Architecture

![Overall Project Architecture](https://ik.imagekit.io/hci5kelnn/readme/hrms/System_Arch.webp?format=webp)

### Activity Diagram

```mermaid
flowchart TD
    Start([HR Admin Setup]) --> AddEmployee[Create Employee Record]
    AddEmployee --> AssignSchedule[Assign Working Schedule & Shifts]
    AssignSchedule --> CreateContract[Create Period-Specific Contract & Wage]
    CreateContract --> SetRules[Define Salary Structure & Sequenced Rules]

    subgraph Operational_Inputs [Day-to-Day HR Operations]
        Punch[Daily Attendance Check-In / Check-Out]
        Leave[Leave Allocation & Approved Requests]
    end

    AssignSchedule -.-> Punch
    AddEmployee -.-> Leave

    Punch --> PayrunStart[HR Payroll Officer Launches New Payrun]
    Leave --> PayrunStart
    SetRules --> PayrunStart

    subgraph Two_Step_Wizard [Two-Step Payrun Wizard]
        Step1[Step 1: Select Salary Structure & Date Range]
        Step2[Step 2: Filter & Select Period-Eligible Employees]
        Step1 --> Step2
    end

    PayrunStart --> Step1
    Step2 --> BatchInit[Initialize Payrun Batch & Draft Payslips]

    BatchInit --> ComputeEngine[Execute Sequenced Salary Computation Engine]
    ComputeEngine --> AuditWarnings{Run Pre-Finalization Warning Audit}

    AuditWarnings -- "Blockers Detected\n(e.g., Missing Bank, Duplicate Payslip)" --> FixIssues[Flag Actionable Diagnostics on UI]
    FixIssues --> AuditWarnings

    AuditWarnings -- "Audit Passed / Cleared" --> ValidateBatch[Validate Payrun Batch & Lock Changes]
    ValidateBatch --> MarkPaid[Mark Paid & Record Historical Transaction]
    MarkPaid --> DocEngine[Chromium-Free PDF Payslip Generation]
    DocEngine --> EmailDispatch[Asynchronous Bulk Email Dispatch to Employees]
    EmailDispatch --> LiveDashboard[Update Real-Time Payroll Dashboard KPIs]
    LiveDashboard --> EndNode([Employee Receives Payslip & Views Portal])
```

### ER Diagram

```mermaid
erDiagram
    USERS ||--o| EMPLOYEES : "authenticates (1:1)"
    EMPLOYEES ||--o| BANK_ACCOUNTS : "has banking details (1:1)"
    EMPLOYEES ||--o{ CONTRACTS : "holds historical (1:N)"
    EMPLOYEES }o--|| WORKING_SCHEDULES : "assigned to shift (N:1)"
    EMPLOYEES ||--o{ ATTENDANCES : "logs daily (1:N)"
    EMPLOYEES ||--o{ TIME_OFF_ALLOCATIONS : "receives leave pool (1:N)"
    EMPLOYEES ||--o{ TIME_OFF_REQUESTS : "submits time-off (1:N)"

    TIME_OFF_TYPES ||--o{ TIME_OFF_ALLOCATIONS : "defines policy for"
    TIME_OFF_TYPES ||--o{ TIME_OFF_REQUESTS : "categorizes request"

    CONTRACTS }o--|| SALARY_STRUCTURES : "bound to structure"
    SALARY_STRUCTURES ||--o{ SALARY_RULES : "contains ordered rules (1:N)"

    PAYRUNS }o--|| SALARY_STRUCTURES : "executes structure"
    PAYRUNS ||--o{ PAYSLIPS : "contains batch (1:N)"

    EMPLOYEES ||--o{ PAYSLIPS : "receives payslip (1:N)"
    CONTRACTS ||--o{ PAYSLIPS : "supplies period wage"
    PAYSLIPS ||--o{ PAYSLIP_LINES : "breaks down into (1:N)"
```

### Frontend Data Flow (Strict 4-Layer Architecture)

```mermaid
flowchart LR
    subgraph UI_Layer [1. UI Presentation Layer]
        Pages[Feature Pages\ne.g., PayrunWizardPage, EmployeeListPage]
        Shared[Shared UI Primitives\nButtons, Tables, Modals, Forms]
    end

    subgraph Hooks_Layer [2. Custom Hooks Layer]
        Hooks[usePayrun, useEmployees,\nuseAttendance, useSalaryRules]
    end

    subgraph State_Layer [3. Reactive State Layer]
        Ctx[AuthContext, PayrunContext,\nThemeContext, NotificationProvider]
    end

    subgraph API_Layer [4. Infrastructure API Layer]
        AxiosClient[Axios Instance with Interceptors\npayrun.service.js, employee.service.js]
    end

    Pages --> Hooks
    Shared --> Hooks
    Hooks --> Ctx
    Hooks --> AxiosClient
    AxiosClient --> BackendAPI[(Node.js Express API)]
```

### Backend Architecture Data Flow

```mermaid
flowchart LR
    ClientReq[Incoming HTTP Request] --> ExpressRouter[Express 5.x Router]
    ExpressRouter --> AuthMW[JWT Authentication & RBAC Guard]
    AuthMW --> ValMW[Input Validation Middleware\nZod / Express-Validator]
    ValMW --> Controller[Domain Controller\ne.g., payrun.controller.js]
    Controller --> Service[Business Logic Service Layer\nSalary Computation & Overlap Checks]
    Service --> DAO[Data Access Object Layer\nStrict SQL / Drizzle Isolation]
    DAO --> DB[(PostgreSQL 16\nDrizzle ORM)]
    DAO --> Cache[(Redis Cache\nSessions & Rate Limits)]
    Service --> Docs[Document Engine\nhtml-pdf-lite & Nodemailer]
    Controller --> RespUtil[Response Utilities\nStandardized JSON / PDF Streams]
    RespUtil --> ClientReq
```

---

## Project Structure

```text
people-pay360/
├── client/                                    # Frontend React 19 Single Page Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── features/                      # Modular Domain Feature Slices
│   │   │   │   ├── auth/                      # Login, logout, protected route guards
│   │   │   │   ├── dashboard/                 # Analytics, KPI cards, ECharts visualization
│   │   │   │   ├── settings/                  # User & system preferences
│   │   │   │   └── users/                     # User management & profile views
│   │   │   ├── App.jsx                        # Root React layout shell
│   │   │   ├── App.routes.jsx                 # Central router with nested navigation
│   │   │   └── routes.loader.jsx              # Dynamic feature-route autodiscovery
│   │   ├── components/
│   │   │   └── Shared/                        # 60+ Enterprise atomic design components
│   │   │       ├── Buttons/                   # Primary, secondary, icon buttons
│   │   │       ├── DataDisplay/               # Tables, tags, badges, metrics
│   │   │       ├── Feedback/                  # Modals, toasts, loading spinners, alert banners
│   │   │       ├── Form/                      # Form inputs, selects, datepickers
│   │   │       └── Navigation/                # Sidebars, headers, breadcrumbs, tabs
│   │   ├── context/                           # React Context providers (Auth, Theme)
│   │   ├── hooks/                             # Shared utility hooks (useDebounce, useMediaQuery)
│   │   ├── styles/                            # 3-Tier SCSS Design System
│   │   │   ├── foundation/tokens/             # Colors, typography, spacing, elevations
│   │   │   ├── foundation/themes/             # Dark / Light theme variables
│   │   │   └── variables.scss                 # Central token distributor
│   │   ├── utils/                             # Formatters, date math, validation helpers
│   │   └── main.jsx                           # Application DOM entry point
│   ├── package.json
│   └── vite.config.js
│
├── server/                                    # Backend Express 5.x API Server
│   ├── src/
│   │   ├── config/                            # Environment, DB, Redis, and mail configurations
│   │   ├── dao/                               # Data Access Objects (Zero SQL in controllers)
│   │   │   ├── attendance.dao.js              # Attendance punches & audit records
│   │   │   ├── contract.dao.js                # Period-applicable contract queries
│   │   │   ├── employee.dao.js                # Employee roster & bank information
│   │   │   ├── payrollValidation.dao.js       # Overlap verification & blocker checks
│   │   │   ├── payslip.dao.js                 # Payslip line items & salary rules
│   │   │   ├── schedule.dao.js                # Working schedules & shift lines
│   │   │   └── timeOff.dao.js                 # Leave allocations & balance deductions
│   │   ├── db/
│   │   │   ├── migrations/                    # Versioned Drizzle SQL migrations
│   │   │   ├── schema/                        # PostgreSQL Table Schemas
│   │   │   │   ├── attendance.schema.js       # Daily attendance logs
│   │   │   │   ├── bank_accounts.schema.js    # Direct deposit bank details
│   │   │   │   ├── contracts.schema.js        # Employment contracts & wage rates
│   │   │   │   ├── employees.schema.js        # Employee master records
│   │   │   │   ├── payroll.schema.js          # Payruns, payslips, payslip lines
│   │   │   │   ├── salary.schema.js           # Salary structures & computation rules
│   │   │   │   ├── time_off.schema.js         # Leave types, allocations, requests
│   │   │   │   ├── users.schema.js            # User accounts & RBAC roles
│   │   │   │   └── working_schedules.schema.js# Shift patterns & weekly hours
│   │   │   ├── migrate.js                     # Programmatic migration executor
│   │   │   └── seed.js                        # Idempotent demo database seeder
│   │   ├── modules/                           # 13 Domain Feature Modules
│   │   │   ├── attendance/                    # Check-in/out, multi-punch, manual corrections
│   │   │   ├── auth/                          # Authentication, cookies, sessions, admin users
│   │   │   ├── contracts/                     # Contract lifecycles & period resolution
│   │   │   ├── dashboard/                     # Aggregated operational KPIs & charts
│   │   │   ├── employees/                     # Employee master profiles & banking details
│   │   │   ├── payruns/                       # 2-step wizard, computation, state machine
│   │   │   ├── payslips/                      # Payslip line breakdown, document delivery
│   │   │   ├── pdf/                           # Chromium-free HTML-to-PDF compiler
│   │   │   ├── salary-rules/                  # Ordered computation rules (Fixed, %, Formula)
│   │   │   ├── salary-structures/             # Container structures linking rules to contracts
│   │   │   ├── schedules/                     # Shift templates & auto weekly hours
│   │   │   ├── time-off/                      # Leave policies, allocations, requests
│   │   │   └── validation/                    # Pre-finalization payroll anomaly detection
│   │   ├── services/                          # Reusable Application Services
│   │   │   ├── mail/                          # Transactional emails & payslip distribution
│   │   │   ├── pdf/                           # Chromium-free `html-pdf-lite` engine
│   │   │   └── image.service.js               # ImageKit upload integration
│   │   ├── templates/                         # Pixel-perfect HTML payslip templates
│   │   ├── tests/                             # E2E Integration Test Suite & TDDoc Logger
│   │   │   ├── helpers/                       # Test fixtures, auth helpers, md-logger
│   │   │   ├── modules/                       # Sequential Jest test suites (01 to 09)
│   │   │   ├── setup.js                       # Global database setup & connection teardown
│   │   │   └── testSequencer.js               # Deterministic alphabetical test sequencer
│   │   ├── utils/                             # Response formatters, JWT, password helpers
│   │   └── app.js                             # Express application configuration
│   ├── scripts/
│   │   └── generate-postman.js                # Auto-compiles Postman v2.1.0 Collection
│   ├── server.js                              # HTTP server entrypoint
│   └── package.json
│
├── docs/                                      # Complete Project Documentation
│   ├── api-docs/                              # Auto-Generated API Docs & Postman Collection
│   │   ├── 01_auth_user.md                    # Authentication & Admin API specs
│   │   ├── 02_schedules.md                    # Working Schedule API specs
│   │   ├── 03_employees_contracts.md          # Employees & Contracts API specs
│   │   ├── 04_attendance.md                   # Daily Attendance API specs
│   │   ├── 05_time_off.md                     # Leave & Allocations API specs
│   │   ├── 06_salary_structures_rules.md      # Salary Rules API specs
│   │   ├── 07_payruns_payslips.md             # Payruns & Payslips API specs
│   │   ├── 08_pdf_delivery.md                 # PDF Engine & Mail API specs
│   │   ├── 09_dashboard.md                    # Live Analytics Dashboard API specs
│   │   └── postman_collection.json            # 400KB+ Postman v2.1.0 importable collection
│   ├── client-docs/                           # Frontend architecture & component catalogs
│   ├── server-docs/                           # Backend deep-dive manuals & DB guides
│   └── peoplepay360ps.md                      # Problem statement blueprint & invariants
│
└── README.md                                  # This document
```

---

## Core Modules & Features

1. **Employee Master Hub:** The centralized operational hub of the platform. Manages full personal details, identification, department, job role, manager hierarchy, direct deposit bank account details, and links directly to historical contracts and time-off records. Supports Kanban, List, and Form views with quick-navigation smart counters.
2. **Period-Aware Contract Management:** Handles historical and current employment contracts with fixed wages and associated salary structures. Crucially enforces the business invariant that **exactly one contract applies to a specific payroll period**, preventing overlapping active contracts and eliminating erroneous "latest contract" assumptions.
3. **Working Schedules & Shift Patterns:** Enables organization-level shift definition with day-of-week timing, start/end timestamps, and break durations. Automatically calculates total weekly working hours without manual human entry.
4. **Attendance Tracking & Exception Audit:** Captures daily employee check-ins, check-outs, and worked hours. Handles multi-punch sequences, auto-flags missing check-outs or tardiness, and provides HR managers with an auditable manual correction workflow.
5. **Time Off, Policy Types & Balance Deductions:** Features a 3-tier leave lifecycle: `Time Off Type` (policy definition), `Time Off Allocation` (balance granted to an employee, requiring HR approval), and `Time Off Request`. Upon approval, requests atomically deduct days from the employee's active allocation.
6. **Salary Structures & Ordered Computation Rules:** Provides a dynamic calculation engine where a structure contains multiple sequenced rules across 5 categories: `BASIC`, `ALLOWANCE`, `GROSS`, `DEDUCTION`, and `NET`. Rules execute strictly in ascending order, supporting `Fixed`, `Percentage`, and `Formula` computation types.
7. **Two-Step Payrun Creation Wizard:** A deliberate multi-step wizard preventing unvetted payroll records. Step 1 defines the scope (Salary Structure, Period Dates, Payment Date). Step 2 queries and displays eligible employees (those with active contracts covering the period) for explicit review and batch selection.
8. **Automated Salary Calculation & Line-Item Breakdown:** Computes payslips for all batch employees inside database transactions. Generates granular line-item breakdown records (`Rule Name`, `Code`, `Category`, `Amount`, `Details`), enabling full explainability for each net salary figure.
9. **Pre-Finalization Payroll Warning & Anomaly Engine:** An automated verification gate that audits computed payruns before approval. Surfaces actionable diagnostics categorized into **Blockers** (missing bank accounts, duplicate payslips across overlapping periods, zero-rule structures) and **Warnings** (expiring contracts, negative net salary, incomplete attendance).
10. **Chromium-Free PDF Generation & Secure Delivery:** Uses `html-pdf-lite` (PDFKit + SVG rasterizer) to compile pixel-perfect, monochrome, print-ready payslips in ~20MB RAM (reducing memory overhead by 95% compared to headless browsers). Enables on-demand in-browser previews, PDF downloads, and asynchronous bulk email dispatch.
11. **Live Operational HR & Payroll Dashboard:** A real-time executive cockpit connected directly to active database records (strictly zero hardcoded/mock data). Delivers KPI cards, monthly salary expenditure trends, department cost breakdowns, attendance health percentages, and operational exception feeds with date and department filtering.
12. **Role-Based Access Control (RBAC) & Security:** Implements 5 distinct roles with strict privilege separation across routes and endpoints, complemented by Redis sliding-window rate limiting, HTTP-only secure cookies, and password hashing via BcryptJS.
13. **Gemini AI Assistant & Live Voice Transcription:** Features an integrated AI assistant powered by Google Gemini and LangChain, alongside a high-security ephemeral valet token service (`POST /api/ai/transcribe/token`) enabling direct, client-to-Gemini Live WebSocket audio transcription without exposing the master API key.

---

## Role-Based Access Control (RBAC)

PeoplePay360 enforces role limits across both client routes and backend API endpoints:

| Role                   | Description                     | Employees & Master Data | Working Schedules & Attendance    | Contracts         | Time Off & Leaves              | Payruns & Payslips                    | Salary Structures & Rules | System Administration       |
| :--------------------- | :------------------------------ | :---------------------- | :-------------------------------- | :---------------- | :----------------------------- | :------------------------------------ | :------------------------ | :-------------------------- |
| **Employee**           | Self-service portal user        | Read Own Profile        | Read/Create Own Attendance        | Read Own Contract | Read Balances; Create Requests | Read Own Published Payslips           | No Access                 | No Access                   |
| **HR Manager**         | Operational HR team member      | Full CRUD               | Full CRUD & Exception Corrections | Full CRUD         | Full CRUD & Approve/Refuse     | No Access (Salary Privacy Guard)      | No Access                 | No Access                   |
| **HR Payroll User**    | Payroll operations staff        | Read Only               | Read Only                         | Read Only         | Read Only                      | Create, Read, Update Payruns/Payslips | Read Only                 | No Access                   |
| **HR Payroll Manager** | Payroll & compensation director | Full CRUD               | Full CRUD                         | Full CRUD         | Full CRUD                      | Full CRUD, Validate Gate & Mark Paid  | Full CRUD                 | No Access                   |
| **Admin**              | System Superadministrator       | Full CRUD               | Full CRUD                         | Full CRUD         | Full CRUD                      | Full CRUD                             | Full CRUD                 | Full User & Role Management |

---

## Frontend Routes

### Authentication & Public Routes

| Path     | Component / View | Access Level | Description                                       |
| :------- | :--------------- | :----------- | :------------------------------------------------ |
| `/login` | `LoginPage`      | Public       | Secure user authentication with credentials       |
| `/`      | `Navigate`       | Public       | Automatic redirection to `/login` or `/dashboard` |

### User & Employee Self-Service Portal (`/dashboard/user/*`)

| Path                         | Component / View     | Access Level              | Description                                                  |
| :--------------------------- | :------------------- | :------------------------ | :----------------------------------------------------------- |
| `/dashboard/user/home`       | `UserDashboardPage`  | Authenticated (All Roles) | Personal KPI overview, recent attendance, leave balances     |
| `/dashboard/user/profile`    | `UserProfilePage`    | Authenticated (All Roles) | View employee profile, bank account, assigned schedule       |
| `/dashboard/user/attendance` | `UserAttendancePage` | Authenticated (All Roles) | Daily check-in / check-out punch clock & personal logs       |
| `/dashboard/user/time-off`   | `UserTimeOffPage`    | Authenticated (All Roles) | Request leave, view approved allocations & balance remaining |
| `/dashboard/user/payslips`   | `UserPayslipsPage`   | Authenticated (All Roles) | Access and download historical personal payslip PDFs         |

### HR Management & Administration Portal (`/dashboard/admin/*`)

| Path                                 | Component / View       | Access Level                   | Description                                                      |
| :----------------------------------- | :--------------------- | :----------------------------- | :--------------------------------------------------------------- |
| `/dashboard/admin/home`              | `AdminDashboardPage`   | HR & Payroll Staff / Admin     | Real-time executive KPIs, cost trends, and anomaly feeds         |
| `/dashboard/admin/employees`         | `EmployeesListPage`    | HR Manager, Payroll Mgr, Admin | Employee roster with Kanban / List views and smart counters      |
| `/dashboard/admin/contracts`         | `ContractsListPage`    | HR Manager, Payroll Mgr, Admin | Period-specific contract management & wage configurations        |
| `/dashboard/admin/schedules`         | `SchedulesPage`        | HR Manager, Payroll Mgr, Admin | Shift pattern creator & auto weekly hour calculation             |
| `/dashboard/admin/attendance`        | `AttendanceAdminPage`  | HR Manager, Payroll Mgr, Admin | Daily employee punch logs & manual correction audits             |
| `/dashboard/admin/time-off`          | `TimeOffAdminPage`     | HR Manager, Payroll Mgr, Admin | Leave allocation grants and request approval / refusal workflow  |
| `/dashboard/admin/salary-structures` | `SalaryStructuresPage` | HR Payroll Manager, Admin      | Salary structure containers and sequenced rule sequences         |
| `/dashboard/admin/payruns`           | `PayrunsListPage`      | HR Payroll User/Manager, Admin | Payrun batch listings, status lifecycle, and creation wizard     |
| `/dashboard/admin/payruns/new`       | `PayrunWizardPage`     | HR Payroll User/Manager, Admin | Two-step wizard (scope selection → employee selection)           |
| `/dashboard/admin/payruns/:id`       | `PayrunDetailPage`     | HR Payroll User/Manager, Admin | Batch computation, warning audit, validation, and email dispatch |
| `/dashboard/admin/users`             | `UserManagementPage`   | Admin Only                     | System user provisioning, password resets, and role assignments  |

---

## API Endpoint Reference

All endpoints are mounted under `/api` and require session authentication unless marked public. Full interactive payloads and mock responses are available in [`docs/api-docs/`](file:///d:/odoo/hrmsfinal/people-pay360-1/docs/api-docs/) and the bundled Postman Collection.

### 1. Authentication & User Administration (`/api/auth`, `/api/admin/users`)

| Method  | Endpoint                    | Description                                          | Allowed Roles |
| :------ | :-------------------------- | :--------------------------------------------------- | :------------ |
| `POST`  | `/api/auth/login`           | Authenticate user and issue HTTP-only session cookie | Public        |
| `GET`   | `/api/auth/get-me`          | Retrieve authenticated user profile & active role    | Authenticated |
| `POST`  | `/api/auth/logout`          | Invalidate active session and clear cookie           | Authenticated |
| `POST`  | `/api/admin/users`          | Provision new system user with assigned role         | Admin         |
| `GET`   | `/api/admin/users`          | List all provisioned system users                    | Admin         |
| `GET`   | `/api/admin/users/:id`      | Retrieve detailed system user profile                | Admin         |
| `PATCH` | `/api/admin/users/:id/role` | Update user authorization role                       | Admin         |

### 2. Working Schedules & Shifts (`/api/working-schedules`)

| Method   | Endpoint                                  | Description                                           | Allowed Roles              |
| :------- | :---------------------------------------- | :---------------------------------------------------- | :------------------------- |
| `POST`   | `/api/working-schedules`                  | Create new working schedule template with shift lines | HR Manager, Admin          |
| `GET`    | `/api/working-schedules`                  | List all organization working schedules               | HR Manager, Payroll, Admin |
| `GET`    | `/api/working-schedules/:id`              | Retrieve specific schedule with shift lines           | HR Manager, Payroll, Admin |
| `GET`    | `/api/working-schedules/:id/weekly-hours` | Calculate weekly working hours from shift pattern     | HR Manager, Payroll, Admin |
| `PUT`    | `/api/working-schedules/:id/lines`        | Replace shift lines for an existing schedule          | HR Manager, Admin          |
| `DELETE` | `/api/working-schedules/:id`              | Delete working schedule                               | HR Manager, Admin          |

### 3. Employees Master Data & Contracts (`/api/employees`, `/api/contracts`)

| Method | Endpoint                                  | Description                                            | Allowed Roles              |
| :----- | :---------------------------------------- | :----------------------------------------------------- | :------------------------- |
| `POST` | `/api/employees`                          | Create employee master record with bank account        | HR Manager, Admin          |
| `GET`  | `/api/employees`                          | List employee directory with department & schedule     | HR Manager, Payroll, Admin |
| `GET`  | `/api/employees/for-payrun`               | Query eligible employees for Payrun wizard             | HR Payroll User/Mgr, Admin |
| `POST` | `/api/contracts`                          | Create draft employment contract with wage & structure | HR Manager, Admin          |
| `POST` | `/api/contracts/:id/activate`             | Activate contract (validates against overlaps)         | HR Manager, Admin          |
| `GET`  | `/api/employees/:id/contracts/applicable` | Resolve applicable contract for a specific date range  | HR Manager, Payroll, Admin |
| `GET`  | `/api/contracts`                          | List all employment contracts                          | HR Manager, Payroll, Admin |

### 4. Daily Attendance & Exception Tracking (`/api/attendance`)

| Method  | Endpoint                    | Description                                          | Allowed Roles               |
| :------ | :-------------------------- | :--------------------------------------------------- | :-------------------------- |
| `POST`  | `/api/attendance/check-in`  | Log daily check-in timestamp                         | Employee, HR Manager, Admin |
| `POST`  | `/api/attendance/check-out` | Log daily check-out timestamp & compute worked hours | Employee, HR Manager, Admin |
| `GET`   | `/api/attendance/today`     | Retrieve today's punch status for authenticated user | Employee, HR Manager, Admin |
| `GET`   | `/api/attendance`           | List attendance records with date/employee filters   | HR Manager, Admin           |
| `GET`   | `/api/attendance/summary`   | Query organization-wide attendance health metrics    | HR Manager, Admin           |
| `PATCH` | `/api/attendance/:id`       | Manually correct attendance record with audit reason | HR Manager, Admin           |

### 5. Leave Policy, Allocations & Requests (`/api/time-off`)

| Method | Endpoint                                | Description                                     | Allowed Roles               |
| :----- | :-------------------------------------- | :---------------------------------------------- | :-------------------------- |
| `POST` | `/api/time-off/types`                   | Define organization leave policy type           | HR Manager, Admin           |
| `GET`  | `/api/time-off/types`                   | List all available leave policy types           | Authenticated (All Roles)   |
| `POST` | `/api/time-off/allocations`             | Grant leave allocation pool to an employee      | HR Manager, Admin           |
| `POST` | `/api/time-off/allocations/:id/approve` | Approve allocation grant to make balance usable | HR Manager, Admin           |
| `POST` | `/api/time-off/requests`                | Submit time-off request                         | Employee, HR Manager, Admin |
| `POST` | `/api/time-off/requests/:id/approve`    | Approve request & atomically deduct balance     | HR Manager, Admin           |
| `GET`  | `/api/time-off/balance`                 | Query remaining leave balances by type          | Authenticated (All Roles)   |

### 6. Salary Structures & Computation Rules (`/api/salary-structures`, `/api/salary-rules`)

| Method | Endpoint                           | Description                                     | Allowed Roles              |
| :----- | :--------------------------------- | :---------------------------------------------- | :------------------------- |
| `POST` | `/api/salary-structures`           | Create new salary structure template            | HR Payroll Manager, Admin  |
| `GET`  | `/api/salary-structures`           | List all salary structures                      | HR Payroll User/Mgr, Admin |
| `POST` | `/api/salary-structures/:id/rules` | Add sequenced computation rule to structure     | HR Payroll Manager, Admin  |
| `GET`  | `/api/salary-structures/:id/rules` | Retrieve ordered rules belonging to a structure | HR Payroll User/Mgr, Admin |
| `GET`  | `/api/salary-rules`                | Query master library of all salary rules        | HR Payroll User/Mgr, Admin |

### 7. Payrun Lifecycle & Payslips (`/api/payruns`, `/api/payslips`)

| Method | Endpoint                     | Description                                           | Allowed Roles                  |
| :----- | :--------------------------- | :---------------------------------------------------- | :----------------------------- |
| `POST` | `/api/payruns`               | Finalize Step 2 wizard and initialize payrun batch    | HR Payroll User/Mgr, Admin     |
| `GET`  | `/api/payruns`               | List payrun batches with status indicators            | HR Payroll User/Mgr, Admin     |
| `POST` | `/api/payruns/:id/compute`   | Execute sequenced salary rules for all batch payslips | HR Payroll User/Mgr, Admin     |
| `GET`  | `/api/payruns/:id/warnings`  | Audit batch and return pre-validation diagnostics     | HR Payroll User/Mgr, Admin     |
| `POST` | `/api/payruns/:id/validate`  | Validation gate: lock batch from modification         | HR Payroll Manager, Admin      |
| `POST` | `/api/payruns/:id/mark-paid` | Mark batch paid and record permanent history          | HR Payroll Manager, Admin      |
| `GET`  | `/api/payslips`              | List computed payslips with filter options            | HR Payroll User/Mgr, Admin     |
| `GET`  | `/api/payslips/:id`          | Retrieve full itemized payslip breakdown & lines      | Employee (Own), Payroll, Admin |

### 8. Document Engine & Secure Delivery (`/api/pdf`, `/api/payslips`, `/api/payruns`)

| Method | Endpoint                         | Description                                       | Allowed Roles                  |
| :----- | :------------------------------- | :------------------------------------------------ | :----------------------------- |
| `GET`  | `/api/payslips/:id/preview`      | In-browser HTML preview of formatted payslip      | Employee (Own), Payroll, Admin |
| `GET`  | `/api/payslips/:id/pdf`          | Stream printable, monochrome payslip PDF document | Employee (Own), Payroll, Admin |
| `POST` | `/api/payslips/:id/send`         | Send individual payslip PDF to employee email     | HR Payroll User/Mgr, Admin     |
| `POST` | `/api/payruns/:id/send-payslips` | Bulk email payslips to all batch employees        | HR Payroll Manager, Admin      |

### 9. Live Operational Dashboard (`/api/dashboard`)

| Method | Endpoint                              | Description                                          | Allowed Roles              |
| :----- | :------------------------------------ | :--------------------------------------------------- | :------------------------- |
| `GET`  | `/api/dashboard/summary`              | Aggregated executive KPIs (with role privacy guards) | Authenticated (All Roles)  |
| `GET`  | `/api/dashboard/salary-by-department` | Total salary cost distributed by department          | HR Payroll User/Mgr, Admin |
| `GET`  | `/api/dashboard/net-salary-trends`    | Monthly net salary disbursement historical trends    | HR Payroll User/Mgr, Admin |
| `GET`  | `/api/dashboard/attendance`           | Organization-wide attendance health percentages      | HR Manager, Payroll, Admin |
| `GET`  | `/api/dashboard/time-off`             | Leave consumption metrics across departments         | HR Manager, Payroll, Admin |
| `GET`  | `/api/dashboard/department-breakdown` | Full department matrix (staff count, costs, leaves)  | HR Payroll User/Mgr, Admin |
| `GET`  | `/api/dashboard/alerts`               | Diagnostic feed of operational system warnings       | HR Manager, Payroll, Admin |

### 10. Intelligent Services (`/api/ai`)

| Method | Endpoint                   | Description                                              | Allowed Roles             |
| :----- | :------------------------- | :------------------------------------------------------- | :------------------------ |
| `POST` | `/api/ai/transcribe/token` | Mint short-lived, single-use valet token for Gemini Live | Authenticated (All Roles) |

---

## Prerequisites

Ensure you have the following software installed on your development workstation:

- **[Node.js](https://nodejs.org/):** Version 18.x or 20.x+ (Node 20+ recommended)
- **[PostgreSQL](https://www.postgresql.org/):** Version 15+ running locally or in Docker
- **[Redis](https://redis.io/):** Version 7+ running locally or via Docker
- **[Git](https://git-scm.com/):** For source code version control

---

## Getting Started

### 1. Repository Setup

Clone the repository to your local machine:

```bash
git clone https://github.com/yadavaman13/people-pay360.git
cd people-pay360
```

### 2. Backend Configuration (`server/`)

Navigate to the `server/` directory and create your environment file:

```bash
cd server
cp .env.example .env
```

Ensure your `server/.env` contains the required database, redis, and secret values:

```env
PORT=3000
CLIENT_ORIGINS=http://localhost:5173
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/peoplepay360
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your_super_secret_jwt_key_min_32_characters
GEMINI_API_KEY=your_optional_gemini_api_key
```

Install dependencies, run migrations, and seed base data:

```bash
# Install backend dependencies
npm install

# Push relational schema to PostgreSQL
npm run db:push

# Seed base roles, departments, employees, structures, and contracts
npm run db:seed

# Launch backend in development mode
npm run dev
```

_The backend server will start listening at `http://localhost:3000`._

### 3. Frontend Configuration (`client/`)

Open a new terminal window, navigate to the `client/` directory, and configure the environment:

```bash
cd client
cp .env.example .env
```

Ensure `client/.env` points to your backend instance:

```env
VITE_API_URL=http://localhost:3000/api
```

Install frontend dependencies and start the Vite development server:

```bash
# Install frontend dependencies
npm install

# Start Vite client
npm run dev
```

_The frontend application will be live at `http://localhost:5173`._

### 4. Running Verification Tests & Generating Documentation

Our backend features complete E2E integration test suites with zero documentation drift:

```bash
cd server

# Run all 9 module test suites in deterministic sequence & compile Postman collection
npm run test:api:docs

# Alternatively, run unit/integration tests directly
npm test
```

To explore your PostgreSQL database using the interactive GUI:

```bash
npm run db:studio
```

### 3. Seeded Login Credentials

Use any of the following seeded credentials generated by `npm run db:seed` to test role-based access control (RBAC):

| Role | Name | Email | Password |
| :--- | :--- | :---- | :------- |
| **Admin** | Aryan Patel | `aryanpatel.me@gmail.com` | `Aryan@123` |
| **Admin** | Itesh Prajapati | `iteshofficial@gmail.com` | `Itesh@123` |
| **Admin** | Aman Yadav | `yadavaman1948@gmail.com` | `Aman@123` |
| **HR Payroll Manager** | Asr Singh | `asr24983@gmail.com` | `Asr@123` |
| **HR Payroll Manager** | Sky High | `skyh53624@gmail.com` | `Sky@123` |
| **HR Manager** | Leo Patel | `leopatel967@gmail.com` | `Leo@123` |
| **HR Manager** | Doom Wiser | `doomwiser@gmail.com` | `Doom@123` |
| **HR Manager** | Priya Nair | `hr@example.com` | `Priya@123` |
| **HR Manager** | Aman Yadav | `work.yadavaman@gmail.com` | `Aman@123` |
| **Employee** | Ankur | `asrajput5656@gmail.com` | `Ankur@123` |
| **Employee** | Aman Yadav | `yadavaman1388@example.com` | `Aman@123` |

---

## Challenges We Overcame

During the architecture and development of **PeoplePay360**, our team tackled several complex engineering hurdles:

1. **Period-Specific Contract Applicability vs. Naive "Latest Salary" Assumption:**  
   Most standard CRUD systems mistakenly query `employee.currentSalary` or grab the latest contract. In real-world enterprise payroll, an employee may have had an old ₹40,000 contract that expired on August 31 and a new ₹50,000 contract starting September 1. When computing retroactively for August, the system must resolve the contract valid during August. We implemented a period-matching resolution engine in `contract.dao.js` using PostgreSQL date-range intersections (`daterange(start, end, '[]') && daterange(period_start, period_end, '[]')`), ensuring deterministic salary calculation while prohibiting overlapping active contracts.

2. **Ordered Multi-Category Salary Rule Evaluation Engine:**  
   Salary rules cannot be calculated in arbitrary order because subsequent rules depend on earlier outputs (e.g., Gross Pay requires Basic + Allowances, while Provident Fund is computed as 12% of Basic, and Net Salary subtracts Deductions from Gross). We engineered a sequenced pipeline that processes rules strictly by ascending `sequence`, maintains an immutable calculation context object across steps, and generates an itemized line-item breakdown with human-readable formulas.

3. **Chromium-Free PDF Rendering Under Extreme Memory Limits:**  
   Traditional PDF generation stacks (Puppeteer, Playwright, Headless Chrome) consume upwards of 400MB of RAM per concurrent render and frequently crash in resource-constrained environments. We implemented a Chromium-free document compilation pipeline using `html-pdf-lite` (combining PDFKit with `@resvg/resvg-js`). This reduced memory consumption by 95% (~20MB per document) while rendering crisp, pixel-perfect, print-ready monochrome payslips with Indian Rupee formatting (`₹`), amount-in-words conversion, and direct deposit confirmation banners.

4. **Atomic Concurrency in Leave Allocations & Deduction:**  
   To prevent race conditions where concurrent leave requests could over-consume an employee's allocated balance, we implemented atomic database transactions in Drizzle ORM. Requests verify `remainingDays >= requestedDuration` within the transaction lock before incrementing `takenDays` and decrementing `remainingDays`.

5. **Eliminating Documentation Drift via Test-Driven Documentation (TDDoc):**  
   Maintaining synchronized API documentation and Postman collections during rapid hackathon development is notoriously error-prone. We developed a custom Jest interceptor (`md-logger.js`) and compiler (`generate-postman.js`). Every time the 9 E2E test suites run against live endpoints, actual HTTP request payloads, headers, query parameters, status codes, and JSON responses are recorded and compiled directly into 9 Markdown specifications (`docs/api-docs/`) and an importable 400KB+ Postman v2.1.0 collection.

6. **Direct Gemini Live Voice Streaming with Valet Tokens:**  
   Integrating live voice transcription in client browsers without leaking the primary `GEMINI_API_KEY` presented a major security challenge. We architected a backend valet token generation service (`POST /api/ai/transcribe/token`) that communicates with Google Cloud IAM to mint short-lived (15-minute), single-use ephemeral tokens scoped strictly to `models/gemini-3.5-transcribe-live`, allowing secure browser-to-Gemini WebSocket streaming.

---

_Developed with ❤️ by Team **ByteBuilders** (Aryan, Itesh, Aman, Ankur)._
