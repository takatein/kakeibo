#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { KakeiboStack } from '../lib/kakeibo-stack';

const app = new cdk.App();

new KakeiboStack(app, 'KakeiboAiStack', {
  env: {
    region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1',
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
  description: 'Kakeibo AI - 概算家計管理アプリケーション',
});
