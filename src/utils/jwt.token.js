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
export { generateJwtToken };
