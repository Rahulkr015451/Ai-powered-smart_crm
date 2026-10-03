# ⚡ Smart CRM — AI-Powered Customer Relationship Manager

A full-stack CRM that connects to your Google account, syncs your Gmail inbox, tracks leads as CRM contacts, and uses Google Gemini to analyze email sentiment and draft professional responses from within the dashboard.

This version includes a richer workflow: the app now supports a customer directory, interaction history, direct reply sending, and a modern two-tab dashboard for Inbox and Customers.

---

## 🎯 Features

| Feature | Description |
|---|---|
| **Google OAuth 2.0** | Secure sign-in with Gmail read/send access |
| **Gmail Sync** | Fetches recent inbox emails and displays them in a live dashboard |
| **Auto Lead Tracking** | Upserts email senders as CRM contacts and tracks them as leads |
| **Customer Directory** | View all tracked contacts, stages, interaction counts, and latest replies |
| **Gemini AI Drafts** | Generates polished reply drafts based on the selected email snippet |
| **Sentiment Analysis** | Detects whether each email is Positive, Neutral, or Negative |
| **Interaction Logging** | Stores all inbound/outbound email events with timestamps |
| **Reply Sending** | Sends the AI-generated reply directly from the app using Gmail API |
| **Dark Mode UI** | Premium glassmorphism dashboard with responsive layout and micro-interactions |

---

## 🏗️ Tech Stack

### Backend
- **Runtime:** Node.js + Express
- **Database:** PostgreSQL (Supabase-compatible)
- **ORM:** Prisma 5
- **Auth:** Google OAuth 2.0 + JWT
- **AI:** Google Generative AI SDK
- **Email:** Gmail API via `googleapis`

### Frontend
- **Framework:** React 19 + Vite
- **Icons:** Lucide React
- **Styling:** Plain CSS with a custom design system

---

## 📁 Project Structure

```bash
Ai-powered-smart_crm/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma        # Prisma models for User, Contact, and Interaction
│   ├── .env                     # Local environment variables (not committed)
│   ├── index.js                 # Express API server and OAuth flow
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # CRM dashboard and authentication flow
│   │   ├── index.css            # UI styling and dashboard theme
│   │   └── main.jsx             # React entry point
│   ├── index.html
│   └── package.json
├── .gitignore
├── README.md
└── package-lock.json
```

---

## 🔌 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/auth/google` | Public | Returns the Google OAuth consent URL |
| `GET` | `/api/auth/callback` | Public | Exchanges the authorization code, stores tokens, and redirects with a JWT |
| `GET` | `/api/crm/dashboard` | 🔒 JWT | Syncs recent Gmail messages, upserts senders, and returns inbox data |
| `POST` | `/api/ai/draft` | 🔒 JWT | Sends an email snippet to Gemini and returns `{ replyText, sentiment }` |
| `POST` | `/api/crm/send` | 🔒 JWT | Sends an AI-generated email reply through Gmail and logs the interaction |
| `GET` | `/api/crm/contacts` | 🔒 JWT | Returns all tracked contacts, stages, counts, and interaction history |
| `GET` | `/api/health` | Public | Health-check endpoint |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+
- **PostgreSQL** database (or a [Supabase](https://supabase.com) project)
- **Google Cloud Console** project with:
  - Gmail API enabled
  - OAuth 2.0 client ID and secret
  - Authorized redirect URI: `http://localhost:5000/api/auth/callback`
- **Gemini API key** from [Google AI Studio](https://aistudio.google.com/apikey)

### 1. Clone the Repository

```bash
git clone https://github.com/Rahulkr015451/Ai-powered-smart_crm.git
cd Ai-powered-smart_crm
```

### 2. Setup Backend

```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SUPABASE_SECRET_KEY=your_jwt_secret
```

Push the Prisma schema:

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

The frontend runs on **http://localhost:5173** by default.

---

## 🖥️ Usage Flow

1. Open `http://localhost:5173` in the browser.
2. Click **"Sign in with Google"** and grant Gmail permissions.
3. After redirecting back, the dashboard loads with:
   - an **Inbox** tab for recent emails
   - a **Customers** tab for your tracked CRM contacts
4. Click **"Sync Mailbox"** to pull the latest Gmail threads.
5. Select an email and click **"Invoke Gemini"** to generate:
   - customer sentiment analysis
   - a polished reply draft
6. Review/edit the generated text and click **"Send Reply"** to send it via Gmail.

---

## 📊 Database Schema

```text
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
| `SUPABASE_SECRET_KEY` | JWT signing secret used by the backend |

---

## 📝 Notes on Recent Changes

The app has been extended beyond a simple Gmail dashboard:

- Added a **Customers** tab with overview of tracked leads and interactions.
- Added **interaction logging** for both inbound and outbound email activity.
- Added **direct Gmail reply sending** from the AI workbench.
- Improved dashboard UX for syncing, loading older emails, and displaying CRM metrics.
- Centralized the app flow around OAuth authentication + JWT-secured API calls.

---

## 📜 License

This project is for educational and demonstration purposes.

---

Built with ❤️ using **Express**, **Prisma**, **React**, and **Google Gemini AI**.
