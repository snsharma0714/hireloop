# Deploying HireLoop.AI for free (Render)

Everything (the React app, API, video-call signaling and the code runner) runs as **one** Docker service on Render's free plan. No credit card needed.

## Before you start

You need free accounts on **GitHub** and **Render** (sign in to Render with GitHub).

## 1. Put the project on GitHub

The code is already at https://github.com/snsharma0714/hireloop. Its root contains `client/`, `server/`, `Dockerfile` and `render.yaml`, which is what Render needs.

To publish later changes:

```bash
git add -A
git commit -m "Describe the change"
git push
```

`.env` files are listed in `.gitignore`, so your secrets are never uploaded. Render redeploys automatically after each push.

## 2. Create the service on Render

1. Go to Render, choose **New → Blueprint**, and pick your repository. Render reads `render.yaml`.
2. Render asks for the secret values. Copy them from your local `server/.env` and `client/.env`:

| Key | Where it comes from |
|---|---|
| `MONGODB_URL` | `server/.env` |
| `OPENROUTER_API_KEY` | `server/.env` |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | `server/.env` |
| `VITE_FIREBASE_APIKEY` | `client/.env` |
| `VITE_RAZORPAY_KEY_ID` | `client/.env` |
| `BREVO_API_KEY`, `MAIL_FROM` (optional, for automatic emails) | Your Brevo account. See [Automatic emails](#automatic-emails-optional-free) |
| `SMTP_USER`, `SMTP_PASS` (optional, leave empty if you use Brevo) | `server/.env` |
| `CLIENT_URL` | Your Render address, e.g. `https://hireloop.onrender.com`. You can fill it in after the first deploy. |

`JWT_SECRET` is generated for you.

3. Click **Apply**. The first build takes about 10 minutes, because it installs Python, g++ and Java into the image.

## 3. Allow the new address

- **Firebase:** open Console → Authentication → Settings → **Authorized domains** → add `hireloop.onrender.com` (your Render address). Without this, Google login fails. The server checks every Google sign-in token against your Firebase project (`interview-28a53`); if you ever switch projects, also set `FIREBASE_PROJECT_ID` on Render.
- **MongoDB Atlas:** open Network Access → **Add IP address → Allow access from anywhere** (`0.0.0.0/0`). Render's IP address changes, so a fixed allowlist won't work.

## 4. Check it

Open `https://<your-app>.onrender.com/api/health`. It should show `{"ok":true}`. Then open the site, log in, and solve a problem in each language.

## What to expect on the free plan

- **The service sleeps after 15 minutes without visitors.** The next visit takes about 50 seconds to wake it up. Before a demo, open the site a minute early.
- **A live call is dropped if the service goes to sleep during it.** Calls themselves are peer-to-peer; the server only connects the two people.
- **512 MB of memory.** Code runs two programs at a time, each with memory, process and time limits.

## Video calls on strict networks

Calls connect directly between the two browsers. Some college, office and mobile networks block that, and then the call stays on "Connecting...". A free TURN relay fixes it:

1. Create a free account at metered.ca (Open Relay project). An email is enough.
2. On Render, add `VITE_TURN_URL`, `VITE_TURN_USERNAME` and `VITE_TURN_CREDENTIAL`, then redeploy.

## How the code runner is protected

In the Docker image, submitted code runs as a separate user with no permissions (`runner`). That means it:

- can't read the server's files or its secrets (your database password and JWT secret aren't visible to it)
- is limited in how many processes it can start and how large its files and memory can grow
- is stopped after 5 seconds, together with any processes it started

This is enough for a portfolio or college project. For a large public site, use a dedicated sandbox such as self-hosted Judge0 or Piston: set `JUDGE0_URL` or `PISTON_URL` and the app uses it automatically.

## Automatic emails (optional, free)

Candidates get emails when they apply, move stage, or get an interview invite, and teammates get their invite links by email.

**On Render, use Brevo.** Render's free plan may block the ports that Gmail SMTP uses, while Brevo sends over normal HTTPS:

1. Create a free account at https://www.brevo.com (300 emails a day, no card).
2. Under **Senders, Domains & Dedicated IPs → Senders**, add and verify the address emails should come from, for example your Gmail address. Brevo emails you a confirmation link.
3. Under **SMTP & API → API keys**, create a key.
4. On Render, set `BREVO_API_KEY` (the key) and `MAIL_FROM` (the verified sender address), then redeploy.

**Locally,** Gmail works fine: set `SMTP_USER` (your Gmail address) and `SMTP_PASS` (an app password from https://myaccount.google.com/apppasswords) in `server/.env`. If `BREVO_API_KEY` is set, Brevo is used instead.

Without either, nothing is sent and each email shows as "skipped" under **Settings → Emails**, which also shows any sending errors. Links inside emails use `CLIENT_URL` (set it to your Render address).
