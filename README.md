# Kakeibo AI - 概算家計管理アプリ

> きっちり記録しない。なんとなく把握できる。それでいい。

AIエージェントがお金の消えた理由を追いかけ、学習し、先読みする概算家計管理アプリケーション。

## 技術スタック

### フロントエンド
- **React 19** + TypeScript (Vite)
- **Tailwind CSS** (モバイルファーストUI)
- **PWA** (ホーム画面追加対応)
- **React Router v7**

### バックエンド (AWS)
- **Amazon Cognito** - 認証 (夫婦アカウント管理)
- **Amazon API Gateway** - REST API
- **AWS Lambda** (Node.js 22) - ビジネスロジック
- **Amazon DynamoDB** - データストア
- **Amazon Bedrock** - AI分類 (Claude Haiku)
- **Amazon S3** - レシート画像保存 / フロントエンドホスティング
- **Amazon CloudFront** - CDN配信
- **AWS CDK** - Infrastructure as Code

## プロジェクト構成

```
kakeibo/
├── src/                    # フロントエンド (React PWA)
│   ├── api/               # API クライアント層
│   ├── components/        # UI コンポーネント
│   │   ├── auth/         # 認証画面
│   │   ├── home/         # ホーム (月次サマリー)
│   │   ├── input/        # AI入力 (テキスト/音声/レシート)
│   │   ├── knowledge/    # ナレッジ管理 (固定費/家族設定)
│   │   ├── layout/       # レイアウト (BottomNav等)
│   │   ├── simulator/    # 将来シミュレーター
│   │   └── transactions/ # 記録一覧・編集
│   ├── contexts/          # React Context
│   ├── types/             # TypeScript型定義
│   ├── utils/             # ユーティリティ
│   └── styles/            # CSS
├── infra/                  # AWS CDK インフラ
│   ├── lib/               # CDK スタック定義
│   ├── lambda/            # Lambda 関数
│   │   ├── transactions/  # 支出記録 CRUD
│   │   ├── fixed-costs/   # 固定費 CRUD
│   │   └── ai-categorize/ # Bedrock AI分類
│   └── bin/               # CDK エントリポイント
└── public/                 # 静的ファイル
```

## セットアップ

### ローカル開発（モックモード）

```bash
npm install
npm run dev    # localhost:5173 で起動。localStorage で全機能動作
```

### AWS デプロイ（本番）

#### 1. 前提条件
- AWS アカウント
- GitHub アカウント + リポジトリ
- AWS CLI v2 + Node.js 22

#### 2. 初回セットアップ（OIDC 連携）

```bash
# AWS にログイン済みの状態で実行

# 2-1. GitHub Actions 用の OIDC ロールを作成
aws cloudformation deploy \
  --stack-name kakeibo-github-oidc \
  --template-file infra/github-oidc-role.yml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides GitHubOrg=<your-github-username> GitHubRepo=kakeibo

# 2-2. 出力されたロール ARN を確認
aws cloudformation describe-stacks \
  --stack-name kakeibo-github-oidc \
  --query "Stacks[0].Outputs[?OutputKey=='RoleArn'].OutputValue" \
  --output text

# 2-3. GitHub リポジトリの Settings > Secrets に登録
#   AWS_ROLE_ARN = arn:aws:iam::123456789012:role/kakeibo-github-actions-deploy

# 2-4. CDK Bootstrap（初回のみ）
cd infra && npm install && npx cdk bootstrap
```

#### 3. デプロイ

`main` ブランチに push すると GitHub Actions が自動実行:

1. フロントエンドビルド
2. CDK deploy（Lambda, DynamoDB, API Gateway 等）
3. S3 にフロントエンドをアップロード
4. CloudFront キャッシュ無効化

手動実行: Actions タブ > "Deploy to AWS" > "Run workflow"

#### 4. GitHub Secrets 一覧

| Secret | 説明 | 必須 |
|--------|------|------|
| `AWS_ROLE_ARN` | OIDC ロール ARN | Yes |
| `FRONTEND_BUCKET` | S3 バケット名（skip_cdk時のフォールバック） | No |
| `CLOUDFRONT_DISTRIBUTION_ID` | CF Distribution ID（同上） | No |

## 画面構成

| 画面 | 説明 |
|------|------|
| ホーム | 月次サマリー。残り使える金額・カテゴリ別支出 |
| AI入力 | テキスト/音声/レシートの3モード入力。AI自動分類 |
| 記録一覧 | 月ごとリスト。タップ編集・削除 |
| ナレッジ管理 | 固定費マスタ・家族設定 |
| 将来シミュレーター | 65歳までの貯蓄推移グラフ |

## 開発フェーズ

- [x] **Phase 1 (MVP)**: 認証・ホーム画面・固定費マスタ・テキスト入力→AI分類→保存
- [x] **Phase 2**: レシート撮影・OCR (モックOCR / Bedrock Vision対応準備)・音声入力 (Web Speech API)
- [x] **Phase 3**: AgentCore Memory パターン学習・ナレッジ自動登録・コンテキストルール・AI分類統合
- [x] **Phase 4**: AIインサイト通知・教育費ピーク警告・ライフイベント予測・固定費最適化提案
