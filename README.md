# Market Guardian AI Backend

Express + Sequelize API for authentication, user profiles, email workflows, and S3 media handling.


---

## Tech Stack

- Runtime: Node.js (>=24)
- Framework: Express 5
- Database: PostgreSQL + Sequelize
- Auth: JWT
- Validation: Joi
- Email: Brevo (Sib SDK)
- Media: Multer + Sharp + AWS SDK v3 (S3)
- Tooling: ESLint, Prettier, Husky

---

## Project Structure

```
.
├── src/
│   ├── config/        # DB + AWS configuration
│   ├── controllers/   # Route controllers
│   ├── middlewares/   # Auth, validation, uploads
│   ├── models/        # Sequelize models
│   ├── routes/        # Express routes
│   ├── services/      # Business logic & integrations
│   └── utils/         # Helpers & response utilities
├── app.js             # Express app setup
├── index.js           # Server entry point + DB connect
├── .env.example
├── package.json
└── README.md
```

---

## Quick Start

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

```bash
cp .env.example .env
```

Set values in `.env` (see the full list below).

### 3) Start the server

```bash
npm run dev
```

The server boots on `PORT` (default `3000`) and connects to PostgreSQL.

---

## Environment Variables

Required
- `DB_PASSWORD`
- `JWT_SECRET_KEY`
- `BREVO_API_KEY`
- `SENDER_EMAIL`
- `SENDER_NAME`
- `CONTACT_EMAIL`
- `AWS_REGION`
- `S3_BUCKET_NAME`
- AWS credentials supported by the SDK (e.g. `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`)

Common optional
- `PORT` (default `3000`)
- `DB_HOST` (default `localhost`)
- `DB_PORT` (default `5432`)
- `DB_NAME` (default `stay_calm`)
- `DB_USER` (default `postgres`)
- `DB_SSL` (`true`/`false`, default `false`)
- `NODE_ENV` (`development` enables Sequelize sync + SQL logging)
- `FRONTEND_URL` (used for verification links; default `http://localhost:3000`)
- `S3_PUBLIC_BASE_URL` (override S3 public URL base)
- `S3_ENDPOINT` (for S3-compatible endpoints)
- `S3_FORCE_PATH_STYLE` (`true`/`false`, for S3-compatible endpoints)

---

## Scripts

- `npm start` — Run production server
- `npm run dev` — Start server with auto-reload
- `npm run db:migrate` — Run Sequelize migrations (uses `.env`)
- `npm run db:migrate:undo` — Roll back last migration
- `npm run db:migrate:undo:all` — Roll back all migrations
- `npm run lint` — Run ESLint
- `npm run lint:fix` — Fix lint issues
- `npm run format` — Format code with Prettier
- `npm test` — Not configured (placeholder)

---

## Contributing

1. Fork the repo
2. Create a feature branch
   ```bash
   git checkout -b feature/your-feature
   ```
3. Commit your changes
   ```bash
   git commit -m "Add your feature"
   ```
4. Push and open a Pull Request

---

## License

MIT
