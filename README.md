# Smart HR - Resume Analyzer & Candidate Matcher

A modern, fast, full-stack Applicant Tracking System (ATS) and talent matching platform built with Node.js, Express, MongoDB, and React (Vite + Tailwind CSS).

---

## Key Features

- **Multi-Role Authentication**: JWT-based authentication supporting both **Admin** (system monitoring & recruiter management) and **HR** (job & candidate workflows) roles, plus optional Google OAuth.
- **Resume Parsing Engine**: Multi-file batch upload supporting PDF and DOCX formats. Parses contact details, skills, work experience, projects, and education using Gemini API with intelligent local regex fallback.
- **Multi-Factor Candidate Matching**: Algorithmic scoring evaluating:
  - Skill overlap & technical stack alignment (40%)
  - Experience level vs. role minimums (30%)
  - Degree & educational background fit (10%)
  - Contextual domain keyword similarity (20%)
- **Interactive Hiring Pipeline**: Kanban board drag-and-drop workflow tracking candidates across stages (`New`, `Reviewing`, `Shortlisted`, `Interview`, `Hired`, `Rejected`).
- **Comprehensive Candidate Profiles**: Executive summary, key strengths, skill gaps against target jobs, recruiter notes, and interview question suggestions.
- **Talent Analytics**: Real-time visual metrics with Recharts tracking candidate pipeline, top skills distribution, and experience breakdowns.
- **Export Capabilities**: One-click candidate summary reports and CSV candidate exports.

---

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, `@dnd-kit` (Kanban), Recharts, Lucide Icons, Axios
- **Backend**: Node.js, Express, MongoDB, Mongoose, Multer, `pdf-parse`, `mammoth` (DOCX)
- **AI & Extraction**: Google Gemini API (`@google/genai` / REST) with local heuristic parser fallback
- **Security**: Helmet, Express Rate Limit, bcryptjs password hashing, JWT

---

## Project Structure

```text
AI-HR/
├── backend/
│   ├── sample-data/       # Database seed script
│   └── src/
│       ├── config/        # MongoDB connection
│       ├── controllers/   # Route handlers (auth, candidate, job, admin, analytics)
│       ├── middleware/    # JWT protect & Multer upload middleware
│       ├── models/        # Mongoose schemas (User, Candidate, Job)
│       ├── routes/        # Express API routes
│       ├── services/      # AI parsing, matching engine, text extraction, email
│       ├── uploads/       # Uploaded resume files
│       ├── utils/         # File signature validation & JWT tokens
│       └── server.js      # Express server entry point
├── frontend/
│   ├── src/
│   │   ├── api/           # Axios HTTP client configuration
│   │   ├── components/    # AppShell, KanbanBoard, CandidateCard, CommandPalette
│   │   ├── context/       # AuthContext and ToastContext
│   │   ├── pages/         # Dashboard, CandidateProfile, Jobs, UploadResume, Analytics, Admin, Settings
│   │   ├── index.css      # Custom Tailwind styling & design tokens
│   │   └── main.jsx       # App entry point & route definitions
│   └── vite.config.js     # Vite configuration
└── package.json           # Workspace scripts
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MongoDB](https://www.mongodb.com/) running locally on `mongodb://127.0.0.1:27017` or a MongoDB Atlas connection string.

### 1. Install Dependencies

From the project root:

```bash
npm run install:all
```

### 2. Environment Configuration

Copy the example environment files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Ensure `backend/.env` has:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/smart_hr_analyzer
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5174

# Optional: Google AI Studio Gemini API Key for AI resume parsing
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

Ensure `frontend/.env` has:
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Seed Demo Data

Run the database seeder to populate sample jobs, candidates, and test accounts:

```bash
npm run seed
```

Default credentials:
- **Admin**: `admin@smarthr.local` / `Admin123!`
- **HR Recruiter**: `hr@smarthr.local` / `Hr12345!`

### 4. Run Development Servers

In terminal 1 (Backend API):
```bash
npm run dev:backend
```

In terminal 2 (Frontend Web App):
```bash
npm run dev:frontend
```

Open `http://localhost:5174` in your browser.

---

## Database & Cloud Storage: Supabase & MongoDB Support

Smart HR natively supports **Supabase (PostgreSQL + Cloud Storage)** as well as **MongoDB**:

### Setting Up Supabase (Recommended for Production & Vercel)
1. Create a free project at [supabase.com](https://supabase.com/).
2. In the Supabase Dashboard, go to **SQL Editor** $\rightarrow$ **New query**.
3. Copy the entire contents of [supabase-schema.sql](file:///e:/4th%20year%20project/AI-HR/supabase-schema.sql) and click **Run**. This will create:
   - `users` table
   - `jobs` table
   - `candidates` table
   - `resumes` storage bucket with public access policies
4. In your Supabase Dashboard, go to **Project Settings** $\rightarrow$ **API** and copy:
   - **Project URL** (`SUPABASE_URL`)
   - **service_role secret key** (`SUPABASE_SERVICE_ROLE_KEY`) or **anon public key** (`SUPABASE_ANON_KEY`)
5. In your `backend/.env` (and in your Vercel Project Settings), add:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here
   ```
6. Run the database seeder to populate sample jobs, candidates, and test accounts:
   ```bash
   npm run seed
   ```

---

## Deploying on Vercel (Access from Any Device)

You can deploy the complete full-stack app (React SPA + Express Serverless API) directly to [Vercel](https://vercel.com/) with zero cost.

### Step 1: Set up MongoDB Atlas (Cloud Database)
Because local `localhost:27017` is not accessible from the cloud, you need a free cloud MongoDB instance:
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and create a free M0 cluster.
2. In **Network Access**, click **Add IP Address** and choose **Allow Access from Anywhere (`0.0.0.0/0`)** so Vercel serverless functions can connect.
3. In **Database Access**, create a database user (e.g., `smarthr_admin`) and copy the password.
4. Click **Connect** $\rightarrow$ **Drivers** $\rightarrow$ Copy the connection string:
   ```text
   mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/smart_hr?retryWrites=true&w=majority
   ```

### Step 2: Push Your Code to GitHub
Ensure all changes are committed and pushed to your GitHub repository:
```bash
git add .
git commit -m "Configure full-stack deployment for Vercel"
git push origin main
```

### Step 3: Import Project into Vercel
1. Log in to [Vercel](https://vercel.com/) and click **Add New...** $\rightarrow$ **Project**.
2. Select your GitHub repository (`AI-HR`).
3. In the project configuration:
   - **Framework Preset**: Vite (or Other)
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `frontend/dist`
4. Expand **Environment Variables** and add:
   - `MONGO_URI`: Your MongoDB Atlas connection string from Step 1.
   - `JWT_SECRET`: A secure random secret key (e.g., `prod_smart_hr_jwt_secret_key_2026`).
   - `CLIENT_URL`: `https://your-project.vercel.app` (optional, CORS is already permissive for vercel.app domains).
   - `GEMINI_API_KEY`: *(Optional)* Your Google Gemini API Key from Google AI Studio.
5. Click **Deploy**.

### Step 4: Seed Initial Admin User (Optional)
Once your MongoDB Atlas database is connected, you can seed the initial admin account directly from your terminal by running:
```bash
MONGO_URI="mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/smart_hr?retryWrites=true&w=majority" npm run seed
```
Now you can log in as Admin (`admin@smarthr.local` / `Admin123!`) on your live Vercel URL from any mobile, tablet, or PC browser!

---

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register`: Create new HR account
- `POST /login`: Sign in with email and password
- `POST /google`: Google OAuth verification
- `GET /me`: Get current authenticated user
- `PATCH /me`: Update profile name or password
- `POST /forgot-password`: Send password reset link
- `POST /reset-password`: Set new password with reset token

### Candidates (`/api/candidates`)
- `GET /`: List candidates with search, filter (skills, experience, score), and pagination
- `POST /upload`: Upload multiple PDF/DOCX resumes (Multer + text extraction)
- `GET /:id`: Retrieve full candidate profile with job match evaluation
- `PATCH /:id/shortlist`: Toggle shortlisted state
- `PATCH /:id/stage`: Update candidate hiring stage (`new`, `reviewing`, `shortlisted`, `interview`, `hired`, `rejected`)
- `POST /:id/rematch`: Re-evaluate candidate against current jobs
- `GET /:id/report`: Download plain-text evaluation summary report
- `POST /:id/notes`: Add recruiter note
- `DELETE /:id/notes/:noteId`: Remove recruiter note
- `DELETE /:id`: Delete candidate and cleanup file from disk

### Jobs (`/api/jobs`)
- `GET /`: List job postings
- `POST /`: Create new job posting and match existing candidates
- `PATCH /:id/toggle-status`: Open or close a job posting
- `GET /:id/rankings`: Rank all candidates against this job

### Analytics (`/api/analytics`)
- `GET /`: Summary metrics, top skills distribution, and experience breakdown

### Admin (`/api/admin`)
- `GET /hr-stats`: List all recruiter accounts with candidate, job, and shortlisted counts
- `POST /hr`: Create new HR or Admin user directly
- `PATCH /hr/:id`: Update recruiter name, email, role (`HR`/`Admin`), or reset password
- `PATCH /hr/:id/toggle-status`: Suspend or activate a recruiter's login access
- `GET /hr/:id/activity`: View all candidates and jobs associated with a specific recruiter
- `POST /hr/reassign`: Transfer all candidates and jobs from one recruiter to another
- `DELETE /hr/:id`: Delete a recruiter account with option to reassign data to Admin
