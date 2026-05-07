# Smart HR Resume Analyzer & Job Matcher

Modern full-stack HR application for parsing resumes, extracting structured candidate data, analyzing candidate strengths, and ranking candidates against job descriptions.

## Stack

- Frontend: React, Vite, Tailwind CSS, Recharts, Lucide icons
- Backend: Node.js, Express, MongoDB, Mongoose
- Auth: JWT with Admin / HR roles
- Uploads: Multer with PDF and DOCX support
- AI/NLP: OpenAI optional for resume parsing, deterministic fallback included
- Matching: Weighted score using skills, experience, education, and keyword similarity

## Features

- Login and registration for HR users
- Resume upload in PDF/DOCX format
- Resume text extraction and structured candidate storage
- AI-ready parsing and candidate insights
- Job description management
- Candidate-to-job matching with score breakdown
- Dashboard filters for skills, experience, and match score
- Candidate profile with strengths, gaps, best-fit roles, and shortlist action
- Analytics for common skills, candidate distribution, and shortlist count
- Candidate ranking per job via API
- Exportable candidate report

## Matching Formula

The backend computes a 0-100 score using:

- Skill overlap: 40%
- Experience relevance: 30%
- Education fit: 10%
- Keyword similarity: 20%

The implementation lives in `backend/src/services/matchingService.js`.

## API Endpoints

Base URL: `http://localhost:5000/api`

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET /candidates`
- `POST /candidates/upload`
- `GET /candidates/:id`
- `PATCH /candidates/:id/shortlist`
- `POST /candidates/:id/rematch`
- `GET /candidates/:id/report`
- `GET /jobs`
- `POST /jobs`
- `GET /jobs/:id/rankings`
- `GET /analytics`

## Local Setup

1. Install dependencies:

   ```bash
   npm run install:all
   ```

2. Create backend environment file:

   ```bash
   cp backend/.env.example backend/.env
   ```

3. Start MongoDB locally, then seed demo data:

   ```bash
   npm run seed
   ```

4. Run the backend:

   ```bash
   npm run dev:backend
   ```

5. In another terminal, run the frontend:

   ```bash
   npm run dev:frontend
   ```

6. Open `http://localhost:5174`.

Demo credentials after seeding:

- Email: `admin@smarthr.local`
- Password: `Admin123!`

## OpenAI Configuration

The app works without `OPENAI_API_KEY` by using deterministic extraction heuristics. To enable AI parsing, set this in `backend/.env`:

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

## Project Structure

```text
backend/
  src/
    config/          MongoDB connection
    controllers/     Route handlers
    middleware/      Auth and upload middleware
    models/          User, Candidate, Job schemas
    routes/          Express routers
    services/        AI parsing, text extraction, matching logic
    uploads/         Local uploaded resumes
  sample-data/       Seed script

frontend/
  src/
    api/             Axios client
    components/      App shell and reusable UI
    context/         Auth provider
    pages/           Dashboard, upload, jobs, analytics, profile
```

## Production Notes

- Store uploads in S3 or equivalent object storage for production.
- Replace local JWT secret with a managed secret.
- Add email delivery through SendGrid, SES, or Postmark for shortlist notifications.
- Run MongoDB with backups, indexes, and monitoring.
- Add queue-based parsing for very large resume batches.
- Add audit logging for Admin actions.
