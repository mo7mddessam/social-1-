# Social App Backend — Assignment

Starter backend for the assignment screenshot. It includes a structured TypeScript/Express API, Sequelize + MySQL configuration, Redis-backed OTP support, email delivery, access/refresh tokens, and a User model with follow/privacy fields.

## Requirements
- Node.js 18+
- MySQL (XAMPP is fine)
- Redis server
- SMTP account/app password for email
- Google OAuth client ID for Google sign-in

## Setup
1. Extract the ZIP and open this folder in Zed or VS Code.
2. Start MySQL in XAMPP and make a database named `social_app`.
3. Start Redis.
4. Copy `.env.example` to `.env` and fill in secrets/SMTP values. Use different strong secrets for access, refresh, and OTP hashing.
5. Install packages: `npm install`
6. Development: `npm run dev`
7. Compile: `npm run build`, then run `npm start`.

The Sequelize connection is configured to sync tables in development. For real deployments, use migrations instead of automatic sync.

## API routes included in the starter
- `POST /api/auth/register` — create account and send verification OTP
- `POST /api/auth/verify-email` — verify email OTP
- `POST /api/auth/login` — login, issue access token and refresh token
- `POST /api/auth/refresh` — rotate refresh token
- `POST /api/auth/logout` — revoke refresh token
- `POST /api/auth/forgot-password` — request password-reset OTP
- `POST /api/auth/reset-password` — reset password using OTP
- `POST /api/auth/google` — verify Google ID token
- `GET /api/users/me` — get current profile
- `PATCH /api/users/me` — update own profile
- `POST /api/users/:id/follow` — follow user
- `DELETE /api/users/:id/follow` — unfollow user
- `GET /api/users/search?q=...` — search public users
- `GET /api/users/suggestions` — suggested users
- `PATCH /api/users/me/privacy` — set profile public/private

## Important scope note
This is a learning starter, not a fully audited production social network. Before deployment, add robust rate limiting, request validation across all routes, HTTPS, CSRF protections if using cookies, security headers, logging/monitoring, database migrations, and tests. Google sign-in requires a valid Google OAuth client ID and frontend integration.
