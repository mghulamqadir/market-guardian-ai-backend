import { S3Client } from "@aws-sdk/client-s3";
import { LambdaClient } from "@aws-sdk/client-lambda";
import { fromEnv } from "@aws-sdk/credential-providers";

const region = process.env.AWS_REGION;

// Basic region validation (prevents “untrusted region” problems)
const REGION_RE = /^[a-z]{2}(-gov)?-[a-z]+-\d$/;
if (!REGION_RE.test(region || "")) {
  throw new Error(
    `Invalid AWS_REGION="${region}" Example valid value: "us-east-1".`
  );
}

const credentials = fromEnv();

export const s3Client = new S3Client({
  region,
  credentials,
  forcePathStyle: true,
});

export const lambdaClient = new LambdaClient({
  region,
  credentials,
});
