import express from 'express';

import authRoutes from './auth.route.js';
import userRoutes from './user.route.js';
import mediaRoutes from './media.route.js';
import sessionRoutes from './session.demo.route.js';
import marketRoutes from './market.route.js';

const router = express.Router();
router.use('/', authRoutes);
router.use('/user', userRoutes);
router.use('/media', mediaRoutes);
router.use('/demo', sessionRoutes);
router.use('/market', marketRoutes);

export default router;
