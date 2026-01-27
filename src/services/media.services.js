import { s3Client } from '../config/aws.config.js';
import { v4 as uuidv4 } from 'uuid';

export async function generateS3PresignedUrl(fileName, fileType) {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: fileName
      ? `uploads/${uuidv4()}-${fileName.replace(/\s+/g, '-')}`
      : `uploads/${uuidv4()}`,
    Expires: 60 * 5, // URL expiration time in seconds (5 minutes)
    ContentType: fileType,
    ACL: 'public-read',
  };
  const fileUrl = `https://${params.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;

  return { upload_id: s3Client.getSignedUrl('putObject', params), fileUrl };
}

export function getS3Object(url) {
  try {
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: url.split('/').slice(-1)[0],
    };

    const fileStream = s3Client.getObject(params).createReadStream();

    return {
      readable: true,
      stream: fileStream,
      contentType: 'application/octet-stream',
      fileKey: params.Key,
    };
  } catch (error) {
    console.error('Error getting S3 object:', error);
    return null;
  }
}
