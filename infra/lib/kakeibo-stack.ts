import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';

export class KakeiboStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========================================
    // DynamoDB Tables（設計書 §4 準拠）
    // PK: family_{familyId} ベースの家族単位設計
    // ========================================

    // メインテーブル: 支出記録・固定費・家族設定を単一テーブルに集約
    const mainTable = new dynamodb.Table(this, 'KakeiboMainTable', {
      tableName: 'kakeibo-main',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    });

    // GSI1: カテゴリ別・日付順検索
    mainTable.addGlobalSecondaryIndex({
      indexName: 'GSI1-category-date',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI2: 月別集計用
    mainTable.addGlobalSecondaryIndex({
      indexName: 'GSI2-month',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI2SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ナレッジテーブル: AgentCore Memory（設計書 §5）
    const knowledgeTable = new dynamodb.Table(this, 'KakeiboKnowledgeTable', {
      tableName: 'kakeibo-knowledge',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
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
    // Cognito（設計書 §3 準拠 - familyId ベース認証）
    // ========================================

    const userPool = new cognito.UserPool(this, 'KakeiboUserPool', {
      userPoolName: 'kakeibo-users',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        fullname: { required: true, mutable: true },
      },
      customAttributes: {
        familyId: new cognito.StringAttribute({ mutable: false }),
        role: new cognito.StringAttribute({ mutable: true }),
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
    // Lambda Functions（設計書 §9 API準拠）
    // ========================================

    const commonEnv = {
      MAIN_TABLE: mainTable.tableName,
      KNOWLEDGE_TABLE: knowledgeTable.tableName,
      RECEIPT_BUCKET: receiptBucket.bucketName,
    };

    // Input Handler: POST /input, POST /input/confirm（設計書 §9-1）
    const inputLambda = new lambda.Function(this, 'InputFunction', {
      functionName: 'kakeibo-input',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/input'),
      environment: {
        ...commonEnv,
        BEDROCK_REGION: this.region,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    mainTable.grantReadWriteData(inputLambda);
    knowledgeTable.grantReadData(inputLambda);
    inputLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
      resources: ['*'],
    }));

    // Transactions Handler: GET /transactions（設計書 §9）
    const transactionsLambda = new lambda.Function(this, 'TransactionsFunction', {
      functionName: 'kakeibo-transactions',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/transactions'),
      environment: commonEnv,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
    });

    mainTable.grantReadWriteData(transactionsLambda);

    // Summary Handler: GET /summary（設計書 §9）
    const summaryLambda = new lambda.Function(this, 'SummaryFunction', {
      functionName: 'kakeibo-summary',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/summary'),
      environment: commonEnv,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
    });

    mainTable.grantReadData(summaryLambda);

    // Knowledge Handler: GET/POST /knowledge（設計書 §9）
    const knowledgeLambda = new lambda.Function(this, 'KnowledgeFunction', {
      functionName: 'kakeibo-knowledge',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/knowledge'),
      environment: commonEnv,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
    });

    mainTable.grantReadWriteData(knowledgeLambda);
    knowledgeTable.grantReadWriteData(knowledgeLambda);

    // Receipt Handler: POST /receipt/upload（S3 presigned URL 発行）
    const receiptLambda = new lambda.Function(this, 'ReceiptFunction', {
      functionName: 'kakeibo-receipt',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/receipt'),
      environment: commonEnv,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
    });

    receiptBucket.grantPut(receiptLambda);

    // Pattern Analyzer: EventBridge起動（設計書 §8-3 Categorizer Agent）
    const patternAnalyzerLambda = new lambda.Function(this, 'PatternAnalyzerFunction', {
      functionName: 'kakeibo-pattern-analyzer',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/pattern-analyzer'),
      environment: {
        ...commonEnv,
        BEDROCK_REGION: this.region,
      },
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
    });

    mainTable.grantReadData(patternAnalyzerLambda);
    knowledgeTable.grantReadWriteData(patternAnalyzerLambda);
    patternAnalyzerLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel'],
      resources: ['*'],
    }));

    // 毎日深夜1時にパターン分析を実行
    new events.Rule(this, 'PatternAnalyzerSchedule', {
      ruleName: 'kakeibo-pattern-analyzer-schedule',
      schedule: events.Schedule.cron({ minute: '0', hour: '16' }), // UTC 16:00 = JST 01:00
      targets: [new targets.LambdaFunction(patternAnalyzerLambda)],
    });

    // ========================================
    // API Gateway（設計書 §9 準拠）
    // ========================================

    const api = new apigateway.RestApi(this, 'KakeiboApi', {
      restApiName: 'kakeibo-api',
      description: 'Kakeibo AI REST API（設計書 §9 準拠）',
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

    // POST /input（設計書 §9-1: AI分類リクエスト）
    const inputResource = api.root.addResource('input');
    inputResource.addMethod('POST', new apigateway.LambdaIntegration(inputLambda), authOptions);

    // POST /input/confirm（設計書 §9-1: 確認・保存）
    const inputConfirmResource = inputResource.addResource('confirm');
    inputConfirmResource.addMethod('POST', new apigateway.LambdaIntegration(inputLambda), authOptions);

    // GET /transactions
    const transactionsResource = api.root.addResource('transactions');
    transactionsResource.addMethod('GET', new apigateway.LambdaIntegration(transactionsLambda), authOptions);

    // PUT/DELETE /transactions/{txnId}
    const transactionIdResource = transactionsResource.addResource('{txnId}');
    transactionIdResource.addMethod('PUT', new apigateway.LambdaIntegration(transactionsLambda), authOptions);
    transactionIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(transactionsLambda), authOptions);

    // GET /summary
    const summaryResource = api.root.addResource('summary');
    summaryResource.addMethod('GET', new apigateway.LambdaIntegration(summaryLambda), authOptions);

    // GET/PUT /knowledge/fixed-costs, GET/PUT /knowledge/settings
    const knowledgeResource = api.root.addResource('knowledge');

    const fixedCostsResource = knowledgeResource.addResource('fixed-costs');
    fixedCostsResource.addMethod('GET', new apigateway.LambdaIntegration(knowledgeLambda), authOptions);
    fixedCostsResource.addMethod('POST', new apigateway.LambdaIntegration(knowledgeLambda), authOptions);

    const fixedCostIdResource = fixedCostsResource.addResource('{costId}');
    fixedCostIdResource.addMethod('PUT', new apigateway.LambdaIntegration(knowledgeLambda), authOptions);
    fixedCostIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(knowledgeLambda), authOptions);

    const settingsResource = knowledgeResource.addResource('settings');
    settingsResource.addMethod('GET', new apigateway.LambdaIntegration(knowledgeLambda), authOptions);
    settingsResource.addMethod('PUT', new apigateway.LambdaIntegration(knowledgeLambda), authOptions);

    // GET /knowledge/patterns
    const patternsResource = knowledgeResource.addResource('patterns');
    patternsResource.addMethod('GET', new apigateway.LambdaIntegration(knowledgeLambda), authOptions);

    // POST /receipt/upload
    const receiptResource = api.root.addResource('receipt');
    const uploadResource = receiptResource.addResource('upload');
    uploadResource.addMethod('POST', new apigateway.LambdaIntegration(receiptLambda), authOptions);

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

    new cdk.CfnOutput(this, 'MainTableName', {
      value: mainTable.tableName,
      description: 'DynamoDB Main Table Name',
    });

    new cdk.CfnOutput(this, 'KnowledgeTableName', {
      value: knowledgeTable.tableName,
      description: 'DynamoDB Knowledge Table Name',
    });
  }
}
