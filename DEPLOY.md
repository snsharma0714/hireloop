# Deploying HireLoop.AI for free (Render)

Everything (the React app, API, video-call signaling and the code runner) runs as **one** Docker service on Render's free plan. No credit card needed.

## Before you start

You need free accounts on **GitHub** and **Render** (sign in to Render with GitHub).

## 1. Put the project on GitHub

The repository root must be this folder, the one that contains `client/`, `server/`, `Dockerfile` and `render.yaml`.

```bash
cd 3.interviewIQ
git init
git add .
git commit -m "HireLoop.AI"
```

Create an empty **private** repository on GitHub, then push to it using the commands GitHub shows.

`.env` files are listed in `.gitignore`, so your secrets are never uploaded. Check that `git status` doesn't list any `.env` file before you push.

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
| `SMTP_USER`, `SMTP_PASS` (optional, for automatic emails) | `server/.env` |
| `CLIENT_URL` | Your Render address, e.g. `https://hireloop.onrender.com`. You can fill it in after the first deploy. |

`JWT_SECRET` is generated for you.

3. Click **Apply**. The first build takes about 10 minutes, because it installs Python, g++ and Java into the image.

## 3. Allow the new address

- **Firebase:** open Console → Authentication → Settings → **Authorized domains** → add `hireloop.onrender.com` (your Render address). Without this, Google login fails.
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

Candidates get emails when they apply, move stage, or get an interview invite, and teammates get their invite links by email. Sending uses any SMTP account; Gmail is free:

1. Turn on 2-Step Verification for the Gmail account.
2. Create an app password at https://myaccount.google.com/apppasswords.
3. Set `SMTP_USER` (the Gmail address) and `SMTP_PASS` (the 16-letter app password) in `server/.env` and on Render.

Gmail allows about 500 emails a day. Without these values nothing is sent, and each email shows as "skipped" under Settings > Emails. Other providers work too: also set `SMTP_HOST` and `SMTP_PORT`. Links inside emails use `CLIENT_URL` (set it to your Render URL).
