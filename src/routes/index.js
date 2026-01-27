import express from 'express';

import authRoutes from './auth.route.js';
import userRoutes from './user.route.js';
import mediaRoutes from './media.route.js';

const router = express.Router();
router.use('/', authRoutes);
router.use('/user', userRoutes);
router.use('/media', mediaRoutes);

export default router;
