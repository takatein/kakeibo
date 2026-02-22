/**
 * Receipt Handler
 * POST /receipt/upload → S3 presigned URL を返す
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({});
const BUCKET = process.env.RECEIPT_BUCKET;

function response(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  try {
    const familyId = event.requestContext?.authorizer?.claims?.['custom:familyId'] || 'demo-family';
    const body = JSON.parse(event.body);
    const contentType = body.contentType || 'image/jpeg';
    const extension = contentType === 'image/png' ? 'png' : 'jpg';

    const imageKey = `${familyId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: imageKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    return response(200, { uploadUrl, imageKey });
  } catch (err) {
    console.error('Receipt upload error:', err);
    return response(500, { error: 'Failed to generate upload URL' });
  }
}
