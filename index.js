import { connectDB } from './src/config/postgres.config.js';
import app from './app.js';

const PORT = process.env.PORT || 3000;

// Connect DB → Then start server
async function startServer() {
  await connectDB();
  try {
    app.listen(PORT, () => {
      console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Error starting the server:', error);
    process.exit(1);
  }
}

startServer();