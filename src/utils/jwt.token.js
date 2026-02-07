import jwt from 'jsonwebtoken';

function generateJwtToken(payload, expiresIn = '1Y') {
  try {
    if (!process.env.JWT_SECRET_KEY) {
      throw new Error('JWT_SECRET_KEY is not defined in the environment variables');
    }
    const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn });

    return token;
  } catch (error) {
    console.error('Error creating token:', error.message);
    throw error;
  }
}

function generateAccessToken(payload) {
  try {
    if (!process.env.JWT_SECRET_KEY) {
      throw new Error('JWT_SECRET_KEY is not defined in the environment variables');
    }
    const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, { 
      expiresIn: '15m' 
    });
    return token;
  } catch (error) {
    console.error('Error creating access token:', error.message);
    throw error;
  }
}

function generateRefreshToken(payload) {
  try {
    if (!process.env.JWT_SECRET_KEY) {
      throw new Error('JWT_SECRET_KEY is not defined in the environment variables');
    }
    const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, { 
      expiresIn: '30d' 
    });
    return token;
  } catch (error) {
    console.error('Error creating refresh token:', error.message);
    throw error;
  }
}

function verifyRefreshToken(token) {
  try {
    if (!process.env.JWT_SECRET_KEY) {
      throw new Error('JWT_SECRET_KEY is not defined in the environment variables');
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
}

export { generateJwtToken, generateAccessToken, generateRefreshToken, verifyRefreshToken };
