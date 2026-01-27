# 🚀 Market Guardian AI Backend.
Intervene the market with AI.
---

## ✨ Features

- 🔐 **Authentication**
  - JWT-based auth flow
  - Secure middleware setup

- 📧 **Email Service**
  - Integration with Brevo for email notifications

- 🖼️ **Media Handling**
  - Upload-ready services
  - Integrated with AWS S3 for cloud storage

- 🧩 **Clean Project Structure**
  - Controllers, routes, services, models, middlewares
  - Scales well as your app grows

- 🧹 **Developer Experience**
  - ESLint + Prettier configured
  - Environment-based configuration
  - Auto-reload in development

---

## 🛠 Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL + Sequelize
- **Email:** Brevo
- **Auth:** JWT
- **Linting:** ESLint
- **Formatting:** Prettier

---

## 📂 Project Structure

```
.
├── src/
│   ├── config/        # DB & Env config
│   ├── controllers/   # Route controllers
│   ├── routes/        # Express route definitions
│   ├── services/      # Business logic & integrations
│   ├── models/        # Sequelize models
│   ├── middlewares/   # Auth & request middleware
│   ├── utils/         # Helpers & utilities
│   └── index.js       # Main server entry & DB connection
├── app.js             # Express app setup
├── .env.example
├── package.json
└── README.md
```

---

## ⚙️ Quick Start

### 1️⃣ Install dependencies

```bash
npm install
```

### 2️⃣ Setup PostgreSQL

Ensure you have PostgreSQL installed and running. Create a database (default name: `market_guardian`).

### 3️⃣ Configure environment variables

```bash
cp .env.example .env
```

Fill in values such as:

* PostgreSQL Host, Port, Database, User, Password
* JWT secret
* Brevo API Key & Sender Email
* AWS Credentials & S3 Bucket Name

---

### 4️⃣ Run in development

```bash
npm run dev
```

---

## 📜 Available Scripts

* `npm start` — Run production server
* `npm run dev` — Start server with auto-reload
* `npm test` — Run tests (not configured yet)
* `npm run lint` — Run ESLint
* `npm run lint:fix` — Fix lint issues
* `npm run format` — Format code with Prettier

## 🤝 Contributing

Contributions are welcome and encouraged.

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
## 📜 License

Licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.
