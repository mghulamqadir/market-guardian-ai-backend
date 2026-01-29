import express from 'express';
import * as mediaController from '../controllers/media.controllers.js';
import { authenticateToken } from '../middlewares/token.middleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/media/generate-presigned-url:
 *   post:
 *     summary: Generate S3 presigned URL for file upload
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileName
 *               - fileType
 *             properties:
 *               fileName:
 *                 type: string
 *                 example: profile-picture.jpg
 *               fileType:
 *                 type: string
 *                 example: image/jpeg
 *     responses:
 *       200:
 *         description: Presigned URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         upload_id:
 *                           type: string
 *                           description: Presigned URL for uploading file
 *                         fileUrl:
 *                           type: string
 *                           description: Final URL where file will be accessible
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/generate-presigned-url',
  authenticateToken,
  mediaController.generateS3PresignedUrl,
);
export default router;
