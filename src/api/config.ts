// ========================================
// AWS / API Configuration
// ========================================

export const config = {
  // Amazon Cognito
  cognito: {
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
    region: import.meta.env.VITE_AWS_REGION || 'ap-northeast-1',
  },

  // API Gateway
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  },

  // S3 (receipt images)
  s3: {
    bucket: import.meta.env.VITE_S3_BUCKET || '',
    region: import.meta.env.VITE_AWS_REGION || 'ap-northeast-1',
  },
} as const;
