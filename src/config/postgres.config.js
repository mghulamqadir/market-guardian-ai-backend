import { Sequelize } from 'sequelize';

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_NAME = process.env.DB_NAME || 'stay_calm';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_SSL = process.env.DB_SSL === 'true';

if (!DB_PASSWORD) {
  throw new Error('Missing DB_PASSWORD environment variable');
}

// Create Sequelize instance
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 50,
    min: 5,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: DB_SSL
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : {},
});

async function connectWithRetry() {
  let attempt = 0;
  const maxRetries = 5;
  const retryDelay = 5000; // 5 seconds

  while (attempt < maxRetries) {
    try {
      await sequelize.authenticate();
      console.log(`PostgreSQL connected: ${DB_HOST}:${DB_PORT}/${DB_NAME}`);
      
      // Sync models with database (creates tables if they don't exist)
      // In production, use migrations instead
      if (process.env.ENV === 'development') {
        await sequelize.sync({ alter: false });
        console.log('Database tables synchronized');
      }
      
      break;
    } catch (error) {
      attempt++;
      console.error(`Attempt ${attempt}: PostgreSQL connection error:`, error.message);

      if (attempt === maxRetries) {
        console.error('Max retries reached. Exiting...');
        process.exit(1);
      }

      console.log(`Retrying in ${retryDelay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
}

export async function connectDB() {
  await connectWithRetry();
}

export { sequelize };
