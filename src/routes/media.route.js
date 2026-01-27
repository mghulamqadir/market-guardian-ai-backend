import express from 'express';
import * as mediaController from '../controllers/media.controllers.js';
import { authenticateToken } from '../middlewares/token.middleware.js';

const router = express.Router();

router.post(
  '/generate-presigned-url',
  authenticateToken,
  mediaController.generateS3PresignedUrl,
);
export default router;
