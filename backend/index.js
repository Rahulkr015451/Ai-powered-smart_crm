// ──────────────────────────────────────────────
// Smart CRM Backend — index.js
// ──────────────────────────────────────────────
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { google } = require("googleapis");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const prisma = new PrismaClient();

// ── Config ───────────────────────────────────
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.SUPABASE_SECRET_KEY || "smart-crm-secret";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = `http://localhost:${PORT}/api/auth/callback`;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ── Middleware ────────────────────────────────
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());

// ── Google OAuth2 Client ─────────────────────
const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

// ── Gemini AI Client ─────────────────────────
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// ── JWT Auth Middleware ──────────────────────
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token." });
  }
}

// ──────────────────────────────────────────────
// 1. GET /api/auth/google
//    Generate a Google OAuth consent URL
// ──────────────────────────────────────────────
app.get("/api/auth/google", (req, res) => {
  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/userinfo.email",
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
  });

  res.json({ url: authUrl });
});

// ──────────────────────────────────────────────
// 2. GET /api/auth/callback
//    Exchange code → tokens, upsert User, redirect
// ──────────────────────────────────────────────
app.get("/api/auth/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "Authorization code is required." });
  }

  try {
    // Exchange the auth code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch the user's email from Google
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();
    const email = userInfo.email;

    // Upsert the user in the database
    const user = await prisma.user.upsert({
      where: { email },
      update: { googleTokens: tokens },
      create: { email, googleTokens: tokens },
    });

    // Sign a JWT for the frontend
    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Redirect to the frontend with the token
    res.redirect(`http://localhost:3000?token=${jwtToken}`);
  } catch (err) {
    console.error("OAuth callback error:", err.message);
    res.status(500).json({ error: "Authentication failed." });
  }
});

// ──────────────────────────────────────────────
// 3. GET /api/crm/dashboard (Protected)
//    Fetch top 5 emails, upsert senders, return data
// ──────────────────────────────────────────────
app.get("/api/crm/dashboard", authenticateToken, async (req, res) => {
  try {
    // Retrieve user's stored Google tokens from the database
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user || !user.googleTokens) {
      return res.status(401).json({ error: "Google account not linked. Please authenticate via /api/auth/google." });
    }

    // Set credentials for this request
    oauth2Client.setCredentials(user.googleTokens);

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // List the top 5 recent messages from the inbox
    const listResponse = await gmail.users.messages.list({
      userId: "me",
      maxResults: 5,
      labelIds: ["INBOX"],
    });

    const messages = listResponse.data.messages || [];
    const emails = [];

    for (const msg of messages) {
      const fullMessage = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "full",
      });

      const headers = fullMessage.data.payload.headers;
      const getHeader = (name) => {
        const header = headers.find(
          (h) => h.name.toLowerCase() === name.toLowerCase()
        );
        return header ? header.value : "";
      };

      const from = getHeader("From");
      const subject = getHeader("Subject");
      const date = getHeader("Date");

      // Extract sender name and email
      const emailMatch = from.match(/<(.+?)>/);
      const senderEmail = emailMatch ? emailMatch[1] : from.trim();
      const senderName = from.replace(/<.+?>/, "").trim() || senderEmail;

      // Extract snippet/body
      const snippet = fullMessage.data.snippet || "";

      // Upsert the sender as a Contact in our database
      let contact;
      try {
        contact = await prisma.contact.upsert({
          where: { email: senderEmail },
          update: { name: senderName },
          create: {
            name: senderName,
            email: senderEmail,
            stage: "Lead",
          },
        });
      } catch (upsertErr) {
        // If duplicate or other error, try to find existing
        contact = await prisma.contact.findUnique({
          where: { email: senderEmail },
        });
      }

      // Log this as an interaction
      if (contact) {
        await prisma.interaction.create({
          data: {
            contactId: contact.id,
            type: "Email Received",
            summary: snippet.substring(0, 200),
            sentiment: "Neutral", // Default; can be enriched with AI later
          },
        });
      }

      emails.push({
        id: msg.id,
        from: senderName,
        email: senderEmail,
        subject,
        snippet,
        date,
        contactId: contact ? contact.id : null,
      });
    }

    // Get total contact count
    const totalContacts = await prisma.contact.count();

    res.json({
      emails,
      totalContacts,
      message: `Fetched ${emails.length} recent emails and synced contacts.`,
    });
  } catch (err) {
    console.error("Dashboard error:", err.message);
    res.status(500).json({ error: "Failed to fetch dashboard data." });
  }
});

// ──────────────────────────────────────────────
// 4. POST /api/ai/draft (Protected)
//    Generate a professional email reply via Gemini
// ──────────────────────────────────────────────
app.post("/api/ai/draft", authenticateToken, async (req, res) => {
  const { emailSnippet } = req.body;

  if (!emailSnippet) {
    return res.status(400).json({ error: "emailSnippet is required in the request body." });
  }

  try {
    const prompt = `You are a professional email assistant for a CRM system.

Given the following email snippet, generate a professional, polite, and concise email reply.
Also analyze the sentiment of the original email (Positive, Neutral, or Negative).

Email snippet:
"""
${emailSnippet}
"""

Respond ONLY with a valid JSON object in this exact format (no markdown, no code fences):
{
  "replyText": "Your professional email reply here",
  "sentiment": "Positive | Neutral | Negative"
}`;

    const result = await geminiModel.generateContent(prompt);
    const responseText = result.response.text().trim();

    // Parse the JSON response from Gemini
    let parsed;
    try {
      // Strip markdown code fences if Gemini wraps the response
      const cleaned = responseText
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      // Fallback: return raw text if JSON parsing fails
      parsed = {
        replyText: responseText,
        sentiment: "Neutral",
      };
    }

    res.json({
      replyText: parsed.replyText,
      sentiment: parsed.sentiment,
    });
  } catch (err) {
    console.error("AI Draft error:", err.message);
    res.status(500).json({ error: "Failed to generate AI draft." });
  }
});

// ── Health Check ─────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Start Server ─────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Smart CRM Backend running on http://localhost:${PORT}`);
  console.log(`📡 OAuth Redirect URI: ${GOOGLE_REDIRECT_URI}`);
});
