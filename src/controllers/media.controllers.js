import * as mediaService from '../services/media.services.js';
import { errorResponse, successResponse } from '../utils/response.handler.js';

export async function generateS3PresignedUrl(req, res) {
  try {
    const { fileName, fileType } = req.body;
    const presignedUrl = await mediaService.generateS3PresignedUrl(
      fileName,
      fileType,
    );
    return successResponse(
      res,
      200,
      'Presigned URL generated successfully',
      presignedUrl,
    );
  } catch (error) {
    return errorResponse(res, error);
  }
}
