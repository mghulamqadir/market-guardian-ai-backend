const baseConfig = {
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'stay_calm',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  dialect: 'postgres',
  logging: false,
  dialectOptions:
    process.env.DB_SSL === 'true'
      ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
      : {},
};

const config = {
  development: { ...baseConfig },
  test: { ...baseConfig },
  production: { ...baseConfig },
};

module.exports = config;
