import multer from "multer";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { fromEnv } from "@aws-sdk/credential-providers";

const region = process.env.AWS_REGION;
if (!region) throw new Error("AWS_REGION is required");

const bucket = process.env.S3_BUCKET_NAME;
if (!bucket) throw new Error("S3_BUCKET_NAME is required");

const s3Client = new S3Client({
  region,
  credentials: fromEnv(),
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  endpoint: process.env.S3_ENDPOINT || undefined,
});

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png"];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else {
      const error = new Error(
        "Invalid file type! Only JPG and PNG images are allowed."
      );
      error.statusCode = 400;
      cb(error, false);
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 },
});

function encodeS3Key(key) {
  return key.split("/").map(encodeURIComponent).join("/");
}

function buildPublicUrl({ bucket, region, key }) {
  const encodedKey = encodeS3Key(key);

  const base = process.env.S3_PUBLIC_BASE_URL;
  if (base) return `${base.replace(/\/$/, "")}/${encodedKey}`;

  return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
}

const uploadToS3 = async (buffer, fileName, contentType) => {
  const safeName = String(fileName || "file")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w.-]/g, "");

  const fileKey = `uploads/${uuidv4()}-${safeName}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: fileKey,
    Body: buffer,
    ContentType: contentType,

    ACL: "public-read",
  });

  await s3Client.send(command);

  return buildPublicUrl({ bucket, region, key: fileKey });
};

const processAndUploadImage = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const optimizedBuffer = await sharp(req.file.buffer)
      .rotate()
      .jpeg({ quality: 80 })
      .toBuffer();

    const fileUrl = await uploadToS3(
      optimizedBuffer,
      req.file.originalname,
      "image/jpeg"
    );

    req.file.location = fileUrl;
    next();
  } catch (error) {
    console.error("Image Processing Error:", error);
    res.status(400).json({ error: "Error processing image" });
  }
};

export { upload, processAndUploadImage, uploadToS3 };
