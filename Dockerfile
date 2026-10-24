# One image that serves the React app, the API, Socket.IO and the code runner.

# ---- 1. build the React app ----
FROM node:22-bookworm-slim AS client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
# Vite bakes these into the bundle at build time (Render passes env vars as build args)
ARG VITE_FIREBASE_APIKEY
ARG VITE_RAZORPAY_KEY_ID
ARG VITE_TURN_URL
ARG VITE_TURN_USERNAME
ARG VITE_TURN_CREDENTIAL
RUN npm run build

# ---- 2. server + compilers for the code runner ----
FROM node:22-bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 g++ openjdk-17-jdk-headless util-linux \
    && rm -rf /var/lib/apt/lists/*

# Submitted code runs as this unprivileged user (see server/services/codeRunner.service.js)
RUN useradd --uid 10001 --no-create-home --shell /usr/sbin/nologin runner

WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=client /app/client/dist /app/client/dist

ENV NODE_ENV=production \
    PYTHON_CMD=python3 \
    RUNNER_UID=10001 \
    RUNNER_GID=10001 \
    PORT=8001
EXPOSE 8001
CMD ["node", "index.js"]
