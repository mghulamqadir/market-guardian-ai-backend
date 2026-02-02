import { createServer } from 'http';
import './src/models/index.js';
import { connectDB } from './src/config/postgres.config.js';
import { setupMarketSocket } from './src/services/market.socket.server.js';
import app from './app.js';

const PORT = process.env.PORT || 3000;

// Connect DB → Then start server
async function startServer() {
  await connectDB();
  try {
    const server = createServer(app);
    setupMarketSocket(server);

    server.listen(PORT, () => {
      console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
      console.log(`🧩[ws]: WebSocket server ready at ws://localhost:${PORT}/ws`);
    });
  } catch (error) {
    console.error('Error starting the server:', error);
    process.exit(1);
  }
}

startServer();
