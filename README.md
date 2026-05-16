# Assess HQ

**Assess HQ** is a full-stack AI examination and hiring platform built with the MERN stack. It helps recruiters run technical assessments, shortlist candidates, and manage interview rounds—while candidates take timed exams, practice coding, and track their hiring journey from one responsive workspace.

Hiring teams often juggle separate tools for tests, code reviews, spreadsheets, and email. Assess HQ connects those steps in one product: publish MCQ and coding assessments, review leaderboards, shortlist top performers, schedule multi-round interviews (shown as **round 2/3**, etc.), and notify candidates in-app and by email since SMTP is configured.

This project demonstrates production-oriented patterns: layered Express APIs, JWT authentication, role-based workspaces, optional OpenAI and Judge0 integrations, Socket.IO readiness, and a React + Tailwind frontend with Monaco Editor and Recharts.

---

## Features

- **Authentication** — Signup, login, logout, email verification, forgot/reset password
- **Three roles** — `candidate`, `recruiter`, and `admin`, each with its own UI shell
- **Assessments** — MCQ + coding exams, drafts, publish, question overview, attempt analytics
- **Leaderboards & shortlist** — Rank candidates; move shortlisted people into the interview pipeline
- **Interview management** — Schedule rounds, track status (pending/completed), record shortlisted / not shortlisted; round index per assessment
- **Exam runner** — Timed kiosk-style sessions with autosave and Judge0 coding runs
- **Coding workspace** — Monaco editor for practice and recruiter coding arena
- **Resume analyzer** — ATS-style feedback from resume text + optional job description
- **Dashboards** — Metrics, skill radar, score trends, activity feeds
- **Notifications & email** — In-app alerts; SMTP for shortlist, interview schedule, and round outcomes
- **Docker** — Full stack via `docker compose` (MongoDB + API + frontend nginx)
- **Security** — Helmet, CORS, rate limits, validation, MongoDB sanitization, CSRF on API routes

---

## Tech Stack


| Layer          | Technologies                                              |
| -------------- | --------------------------------------------------------- |
| **Backend**    | Node.js, Express.js, MongoDB, Mongoose, Socket.IO         |
| **Frontend**   | React 18, Vite, React Router, Tailwind CSS, Framer Motion |
| **Auth & API** | JWT, bcryptjs, Axios, Redux Toolkit                       |
| **Editor**     | Monaco Editor                                             |
| **Execution**  | Judge0                                                    |
| **Charts**     | Recharts                                                  |
| **AI & email** | OpenAI (optional), Nodemailer (optional)                  |
| **DevOps**     | Docker, Docker Compose, nginx, GitHub Actions             |


---

## Prerequisites

**Docker (recommended)**

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine + Compose v2

**Local development (without Docker)**

- [Node.js](https://nodejs.org/) 20+
- [MongoDB](https://www.mongodb.com/) local or [Atlas](https://www.mongodb.com/atlas)
- npm

**Optional**

- SMTP for emails, OpenAI API key for AI features, Redis (`REDIS_URL`)

---

## Run with Docker

Run the **entire stack** (MongoDB, API, and frontend) with one command. No local Node or MongoDB install required.

### 1. Configure environment

From the project root:

```bash
cp .env.docker.example .env
```

Edit `.env` and set strong values for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `ADMIN_PASSWORD` (minimum 8 characters).

### 2. Start all services

```bash
docker compose up --build -d
```

Or from the root `package.json` scripts:

```bash
npm run docker:up
```

### 3. Open the app


| Service        | URL                                                          |
| -------------- | ------------------------------------------------------------ |
| **Web app**    | [http://localhost:8080](http://localhost:8080)               |
| **API health** | [http://localhost:5000/health](http://localhost:5000/health) |


The frontend nginx container serves the React build and proxies `/api` and `/socket.io` to the backend.

### 4. Create the admin user

```bash
docker compose exec backend npm run seed:admin
```

Or:

```bash
npm run docker:seed
```


| Role  | Email (default)     | Password (default) |
| ----- | ------------------- | ------------------ |
| Admin | `admin@example.com` | `admin1234`        |


Change these in `.env` before seeding if you prefer different credentials.

### 5. Sign up other users

Open [http://localhost:8080/signup](http://localhost:8080/signup) and register as **candidate** or **recruiter**, or log in as admin and use recruiter routes.

### Useful Docker commands

```bash
docker compose logs -f              # follow logs
docker compose down               # stop containers
docker compose down -v            # stop and delete database volume
npm run docker:down
npm run docker:logs
```

### Docker architecture

```
Browser → frontend (nginx :8080) → /api → backend (:5000) → mongo (:27017)
                                  → /socket.io → backend
```


| File                          | Purpose                               |
| ----------------------------- | ------------------------------------- |
| `docker-compose.yml`          | Orchestrates mongo, backend, frontend |
| `backend/Dockerfile`          | Node.js API image                     |
| `frontend/Dockerfile`         | Vite build + nginx                    |
| `frontend/nginx/default.conf` | SPA routing + API/Socket proxy        |
| `.env.docker.example`         | Root env template for Compose         |


To use **MongoDB Atlas** instead of the bundled `mongo` service, remove the `mongo` service from `docker-compose.yml`, set `MONGODB_URI` on `backend` to your Atlas URI, and remove `depends_on: mongo`.

---

## Installation & Setup (local development)

Use this path when you want hot reload with `npm run dev` instead of containers.

### Clone the repository

```bash
git clone https://github.com/BhumikaSigadapu3/Assess-HQ.git
cd assess-hq
```

### Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` (MongoDB URI, JWT secrets, `CLIENT_URL=http://localhost:5173`), then:

```bash
npm run dev
```

API: [http://localhost:5000](http://localhost:5000)

### Frontend (second terminal)

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

App: [http://localhost:5173](http://localhost:5173)

### Seed admin (local)

```bash
cd backend
npm run seed:admin
```

Requires `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `backend/.env`.

---

## Environment Variables

Never commit real `.env` files. Use:

- **Docker:** root `.env` from `[.env.docker.example](./.env.docker.example)`
- **Local:** `[backend/.env.example](./backend/.env.example)` and `[frontend/.env.example](./frontend/.env.example)`

### Docker / backend (main variables)


| Variable                         | Description                      | Example                                  |
| -------------------------------- | -------------------------------- | ---------------------------------------- |
| `JWT_ACCESS_SECRET`              | Access token signing secret      | Long random string                       |
| `JWT_REFRESH_SECRET`             | Refresh token signing secret     | Long random string                       |
| `CLIENT_URL`                     | Browser URL (CORS + email links) | `http://localhost:8080` (Docker)         |
| `MONGODB_URI`                    | Set in Compose for Docker        | `mongodb://mongo:27017/ai_exam_platform` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Bootstrap admin for `seed:admin` | See `.env.docker.example`                |


### Frontend (local dev)


| Variable            | Example                        |
| ------------------- | ------------------------------ |
| `VITE_API_BASE_URL` | `http://localhost:5000/api/v1` |
| `VITE_SOCKET_URL`   | `http://localhost:5000`        |


In Docker, the frontend is built with `VITE_API_BASE_URL=/api/v1` so requests go through nginx on the same host.

---

## Folder Structure

```
assess-hq/
├── docker-compose.yml       # Full stack: mongo + backend + frontend
├── .env.docker.example        # Docker Compose env template
├── package.json               # docker:up, docker:seed, …
├── backend/
│   ├── src/                   # Express API
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/                   # React SPA
│   ├── nginx/default.conf     # Proxy /api and /socket.io
│   ├── Dockerfile
│   └── .env.example
├── docs/screenshots/          # README images
└── README.md
```

---

## How the platform works

Assess HQ connects **recruiters** and **candidates** through assessments and interviews. Below is the typical flow in plain language.

### Big picture

```
Recruiter                          Candidate
   │                                   │
   ├─ Create & publish assessment      ├─ Register for assessment
   ├─ Review leaderboard               ├─ Take timed exam (MCQ + coding)
   ├─ Shortlist top candidates         ├─ See scores & notifications
   ├─ Schedule interview round(s)      ├─ Join interviews (meet link)
   └─ Mark round complete + outcome    └─ Get shortlist / next-step emails
```

---

### Recruiter workflow

**Goal:** Run a hiring loop from test to interview decision.

1. **Log in** at `/recruiter/home` (recruiter or admin account).
2. **Create an assessment** under **Assessments** — add MCQ and/or coding questions, set duration and schedule, then **publish**.
3. **Wait for attempts** — candidates register and submit; analytics and leaderboards update.
4. **Open results** for an exam — review scores on the **leaderboard**.
5. **Shortlist** candidates you want to interview — they receive a notification (and email if SMTP is set).
6. **Schedule interviews** under **Interviews** — pick a shortlisted candidate, set date/time, round type (technical, HR, etc.), and meeting link. The list shows **round N/M** (e.g. 2/3) for that candidate on that assessment.
7. **After the interview** — set round status to **Completed**, then choose **Shortlisted** or **Not shortlisted**.
  - If it is the **last** configured round and they are shortlisted, messaging can include joining-details language.  
  - If more rounds remain, they are encouraged for further rounds.
8. Use **Resume analyzer**, **Coding arena**, and **Leaderboard hub** as needed for extra review.

---

### Candidate workflow

**Goal:** Complete assessments and stay informed about interviews.

1. **Sign up** as a **candidate** and complete your **profile** (skills, resume link where required).
2. **Home** (`/candidate/home`) — see active assessments, upcoming interviews, and activity.
3. **Assessments** (`/candidate/assessments`) — find open exams and **register**.
4. **Take the exam** (`/candidate/exams/:examId`) — fullscreen-style runner; answer MCQs, run coding against Judge0, then **submit**.
5. **View results** and **leaderboard** when available.
6. **Coding practice** (`/candidate/workspace/coding`) — practice outside exams.
7. **Interviews** (`/candidate/interviews`) — see scheduled rounds, times, and meeting links.
8. **Resume analyzer** — paste resume + optional job description for AI feedback.
9. Check **Notifications** for shortlist and interview updates.

---

### Admin workflow

**Goal:** Platform-level oversight.

1. **Log in** with the seeded **admin** account (`npm run seed:admin` or Docker seed).
2. Open `**/admin`** for the admin dashboard.
3. Use `**/insights/ai**` when enabled for shared AI insight views.

---

### What happens when a candidate is shortlisted?


| Stage                                 | What the candidate sees                                                                                  |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| After **assessment shortlist**        | Notification/email to prepare for upcoming interview rounds                                              |
| After **interview scheduled**         | Notification/email with date, time, and meet link                                                        |
| After **interview round shortlisted** | Round-specific message (e.g. round 2/3); final round may mention recruiter follow-up for joining details |


---

## Production Build (without Docker)

```bash
cd frontend
npm run build
```

Serve `frontend/dist` behind nginx. Point `VITE_API_BASE_URL` and `VITE_SOCKET_URL` at your public API. Set `COOKIE_SECURE=true` and production `CLIENT_URL` on the backend.

---

## Future Improvements

- Managed cloud deployment (AWS ECS, Atlas, CloudFront)
- Recurring interview templates and calendar sync
- PDF hiring reports export
- OAuth (Google / GitHub)
- Stronger proctoring analytics

---

## Contributing

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m "Add your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

Test with **Docker** (`docker compose up --build`) or local `npm run dev` in `backend` and `frontend`.

---

## License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2026 Assess HQ

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Author

Name: Bhumika Sigadapu  
GitHub: [https://github.com/BhumikaSigadapu3](https://github.com/BhumikaSigadapu3)  
LinkedIn: [https://www.linkedin.com/in/bhumika-sigadapu-44b34a280/](https://www.linkedin.com/in/bhumika-sigadapu-44b34a280/)
