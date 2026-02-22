import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class KakeiboStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========================================
    // DynamoDB Tables
    // ========================================

    const transactionsTable = new dynamodb.Table(this, 'TransactionsTable', {
      tableName: 'kakeibo-transactions',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'dateTxnId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    });

    // GSI: カテゴリ別検索
    transactionsTable.addGlobalSecondaryIndex({
      indexName: 'category-date-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'categoryDate', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const fixedCostsTable = new dynamodb.Table(this, 'FixedCostsTable', {
      tableName: 'kakeibo-fixed-costs',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'costId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const familySettingsTable = new dynamodb.Table(this, 'FamilySettingsTable', {
      tableName: 'kakeibo-family-settings',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ========================================
    // S3 Buckets
    // ========================================

    // レシート画像保存用
    const receiptBucket = new s3.Bucket(this, 'ReceiptBucket', {
      bucketName: `kakeibo-receipts-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [
        {
          id: 'delete-old-receipts',
          expiration: cdk.Duration.days(90),
          enabled: true,
        },
      ],
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.POST],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
    });

    // フロントエンドホスティング用
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `kakeibo-frontend-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // ========================================
    // CloudFront
    // ========================================

    const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
    });

    // ========================================
    // Cognito
    // ========================================

    const userPool = new cognito.UserPool(this, 'KakeiboUserPool', {
      userPoolName: 'kakeibo-users',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        fullname: { required: true, mutable: true },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: false,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'KakeiboUserPoolClient', {
      userPool,
      userPoolClientName: 'kakeibo-web-client',
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      preventUserExistenceErrors: true,
    });

    // ========================================
    // Lambda Functions
    // ========================================

    const commonEnv = {
      TRANSACTIONS_TABLE: transactionsTable.tableName,
      FIXED_COSTS_TABLE: fixedCostsTable.tableName,
      FAMILY_SETTINGS_TABLE: familySettingsTable.tableName,
      RECEIPT_BUCKET: receiptBucket.bucketName,
    };

    // Transactions Lambda
    const transactionsLambda = new lambda.Function(this, 'TransactionsFunction', {
      functionName: 'kakeibo-transactions',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/transactions'),
      environment: commonEnv,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
    });

    transactionsTable.grantReadWriteData(transactionsLambda);

    // Fixed Costs Lambda
    const fixedCostsLambda = new lambda.Function(this, 'FixedCostsFunction', {
      functionName: 'kakeibo-fixed-costs',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/fixed-costs'),
      environment: commonEnv,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
    });

    fixedCostsTable.grantReadWriteData(fixedCostsLambda);

    // AI Categorize Lambda
    const aiCategorizeLambda = new lambda.Function(this, 'AiCategorizeFunction', {
      functionName: 'kakeibo-ai-categorize',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/ai-categorize'),
      environment: {
        ...commonEnv,
        BEDROCK_REGION: this.region,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    // Bedrock invoke permission
    aiCategorizeLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
      resources: ['*'],
    }));

    // ========================================
    // API Gateway
    // ========================================

    const api = new apigateway.RestApi(this, 'KakeiboApi', {
      restApiName: 'kakeibo-api',
      description: 'Kakeibo AI REST API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'KakeiboAuthorizer', {
      cognitoUserPools: [userPool],
    });

    const authOptions: apigateway.MethodOptions = {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    };

    // /transactions
    const transactionsResource = api.root.addResource('transactions');
    transactionsResource.addMethod('GET', new apigateway.LambdaIntegration(transactionsLambda), authOptions);
    transactionsResource.addMethod('POST', new apigateway.LambdaIntegration(transactionsLambda), authOptions);

    const transactionIdResource = transactionsResource.addResource('{id}');
    transactionIdResource.addMethod('PUT', new apigateway.LambdaIntegration(transactionsLambda), authOptions);
    transactionIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(transactionsLambda), authOptions);

    // /fixed-costs
    const fixedCostsResource = api.root.addResource('fixed-costs');
    fixedCostsResource.addMethod('GET', new apigateway.LambdaIntegration(fixedCostsLambda), authOptions);
    fixedCostsResource.addMethod('POST', new apigateway.LambdaIntegration(fixedCostsLambda), authOptions);

    const fixedCostIdResource = fixedCostsResource.addResource('{id}');
    fixedCostIdResource.addMethod('PUT', new apigateway.LambdaIntegration(fixedCostsLambda), authOptions);
    fixedCostIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(fixedCostsLambda), authOptions);

    // /ai/categorize
    const aiResource = api.root.addResource('ai');
    const categorizeResource = aiResource.addResource('categorize');
    categorizeResource.addMethod('POST', new apigateway.LambdaIntegration(aiCategorizeLambda), authOptions);

    // ========================================
    // Outputs
    // ========================================

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront Distribution URL',
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'Frontend S3 Bucket Name',
    });
  }
}
