# ⚡ Smart CRM — AI-Powered Customer Relationship Manager

A full-stack CRM application that syncs your **Gmail inbox**, auto-tracks leads, and uses **Google Gemini AI** to analyze sentiment and draft professional email replies — all from a sleek, modern dashboard.

---

## 🎯 Features

| Feature | Description |
|---|---|
| **Google OAuth 2.0** | Secure sign-in via Google with Gmail read/send scopes |
| **Gmail Sync** | Fetches your latest inbox emails and displays them in a clean feed |
| **Auto Lead Tracking** | Automatically upserts email senders as CRM contacts (Leads) |
| **Gemini AI Drafts** | One-click AI-generated professional email replies via Gemini 1.5 Flash |
| **Sentiment Analysis** | Classifies each email as Positive, Neutral, or Negative |
| **Interaction Logging** | Every email sync is recorded as a CRM interaction with timestamps |
| **Dark Mode UI** | Premium glassmorphism dashboard with micro-animations |

---

## 🏗️ Tech Stack

### Backend
- **Runtime:** Node.js + Express
- **Database:** PostgreSQL (Supabase)
- **ORM:** Prisma 5
- **Auth:** Google OAuth 2.0 + JWT
- **AI:** Google Generative AI SDK (`Gemini 3.8 Flash`)
- **Email:** Gmail API via `googleapis`

### Frontend
- **Framework:** React 19 (Vite)
- **Icons:** Lucide React
- **Styling:** Vanilla CSS with custom design system

---

## 📁 Project Structure

```
smart_crm/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma        # Database models (User, Contact, Interaction)
│   ├── index.js                 # Express server with all API endpoints
│   ├── .env                     # Environment variables (not committed)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Full CRM dashboard + landing page
│   │   ├── index.css            # Design system (dark theme, animations)
│   │   └── main.jsx             # React entry point
│   ├── index.html
│   └── package.json
├── .gitignore
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/auth/google` | Public | Returns Google OAuth consent URL |
| `GET` | `/api/auth/callback` | Public | Exchanges auth code → JWT, redirects to frontend |
| `GET` | `/api/crm/dashboard` | 🔒 JWT | Syncs top 5 inbox emails, upserts contacts, returns data |
| `POST` | `/api/ai/draft` | 🔒 JWT | Sends email snippet to Gemini, returns `{ replyText, sentiment }` |
| `GET` | `/api/health` | Public | Health check |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+
- **PostgreSQL** database (or a [Supabase](https://supabase.com) project)
- **Google Cloud Console** project with:
  - Gmail API enabled
  - OAuth 2.0 credentials (Client ID + Secret)
  - Authorized redirect URI: `http://localhost:5000/api/auth/callback`
- **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/apikey)

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/smart-crm.git
cd smart-crm
```

### 2. Setup Backend

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SUPABASE_SECRET_KEY=your_supabase_secret_key
```

Push the database schema:

```bash
npx prisma db push
```

Start the backend:

```bash
npm run dev
```

The backend runs on **http://localhost:5000**.

### 3. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on **http://localhost:3000** (Vite default: 5173 — update if needed).

---

## 🖥️ Usage

1. Open `http://localhost:5173` in your browser.
2. Click **"Sign in with Google"** and authorize Gmail access.
3. You'll be redirected back to the dashboard with your emails loaded.
4. Click **"Invoke Gemini"** on any email to:
   - See the **sentiment** (Positive / Neutral / Negative)
   - Get an **AI-drafted reply** in a read-only text area
   - **Copy** the draft to your clipboard with one click
5. Click **"Sync Mailbox"** anytime to pull the latest emails.

---

## 📊 Database Schema

```
┌──────────────┐       ┌──────────────────┐       ┌─────────────────┐
│    User      │       │    Contact       │       │  Interaction    │
├──────────────┤       ├──────────────────┤       ├─────────────────┤
│ id (uuid)    │       │ id (uuid)        │       │ id (uuid)       │
│ email        │       │ name             │──────▶│ contactId (FK)  │
│ googleTokens │       │ email            │       │ type            │
│ createdAt    │       │ company?         │       │ summary         │
└──────────────┘       │ stage            │       │ sentiment       │
                       │ createdAt        │       │ timestamp       │
                       └──────────────────┘       └─────────────────┘
```

---

## 🛡️ Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Backend server port (default: 5000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `GEMINI_API_KEY` | Google Gemini API key |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `SUPABASE_SECRET_KEY` | Used as JWT signing secret |

---

## 📝 License

This project is for educational and demonstration purposes.

---

Built with ❤️ using **Express**, **Prisma**, **React**, and **Google Gemini AI**.
