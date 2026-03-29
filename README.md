# FinGuard AI: RegTech Compliance Agent

A production-ready AI financial agent with strict regulatory compliance guardrails, audit trails, and automated financial workflows.

## Features
- **AI Financial Agent Dashboard**: Real-time monitoring and Q&A.
- **Compliance Guardrail Engine**: Rule-based validation (SEBI, RBI basics).
- **Audit Trail System**: Immutable logs of AI reasoning and actions.
- **Automated Workflows**: Transaction analysis and risk scoring.
- **Role-Based Access**: Admin, Auditor, and User roles.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Framer Motion, Recharts.
- **Backend**: Express.js (Node.js).
- **Database/Auth**: Firebase (Firestore + Auth).
- **AI**: Google Gemini API.

## Setup
1. Clone the repository.
2. Install dependencies: `npm install`.
3. Configure Firebase in `firebase-applet-config.json`.
4. Set `GEMINI_API_KEY` in `.env`.
5. Run development server: `npm run dev`.

## Deployment

### Vercel (Frontend)
1. Connect your GitHub repository.
2. Set environment variables.
3. Deploy.

### Railway / Render (Backend)
1. Create a new Web Service.
2. Set the build command to `npm run build`.
3. Set the start command to `npm start`.
4. Add environment variables.

## Security
- JWT-based Auth via Firebase.
- Server-side compliance guardrails.
- Least-privilege Firestore rules.
