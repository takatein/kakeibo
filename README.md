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

### フロントエンド

```bash
# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env
# .env ファイルを編集してAWS設定を記入

# 開発サーバー起動
npm run dev

# ビルド
npm run build
```

### インフラ (AWS CDK)

```bash
cd infra

# 依存関係インストール
npm install

# CDK Bootstrap (初回のみ)
npx cdk bootstrap

# デプロイ
npx cdk deploy
```

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
- [ ] **Phase 3**: AgentCore Memory パターン学習・ナレッジ自動登録
- [ ] **Phase 4**: Simulator エージェント・65歳まで貯蓄グラフ・教育費ピーク警告
