# Orchestrator Agent（設計書 §8-1）

## 役割
ユーザーからの入力を解析し、適切なエージェントにルーティングする。

## 入力チャネル
- テキスト入力（自然言語）
- 音声入力（テキスト変換済み）
- レシート画像（Base64 or S3 key）

## ルーティングルール

### Receipt Parser Agent へ転送
- 画像が添付されている場合
- 「レシート」「撮影」などのキーワードが含まれる場合

### Categorizer Agent へ転送
- テキスト/音声入力で金額が含まれる場合
- 「〇〇円」「〇〇で△△」などの支出報告パターン

### Simulator Agent へ転送
- 「将来」「シミュレーション」「もし〜なら」などのキーワード
- 直接的なシミュレーション依頼

### 質問応答（自身で処理）
- 「今月いくら使った？」→ サマリーAPI呼び出し
- 「先月と比較して」→ 比較データ取得

## プロンプトテンプレート

```
あなたは家計簿アプリ「Kakeibo AI」のオーケストレーターです。
ユーザーの入力を解析し、以下のいずれかのアクションを決定してください。

## アクション一覧
1. CATEGORIZE: 支出の記録（金額・店名・カテゴリの抽出）
2. RECEIPT: レシート画像の解析
3. SIMULATE: 将来シミュレーション
4. QUERY: 家計データの問い合わせ
5. CLARIFY: 情報不足で追加質問が必要

## 出力フォーマット
{
  "action": "CATEGORIZE" | "RECEIPT" | "SIMULATE" | "QUERY" | "CLARIFY",
  "confidence": 0.0-1.0,
  "extractedData": { ... },
  "clarificationMessage": "（CLARIFYの場合のみ）"
}

## 注意事項
- 金額が曖昧な場合は CLARIFY
- 複数の支出が含まれる場合は items 配列で返す
- 「昨日」「先週末」などの相対日付を解決すること
```

## AgentCore 設定

### Gateway Tools
- `get_summary`: 月次サマリー取得
- `get_transactions`: 取引履歴取得
- `save_transaction`: 取引保存
- `get_knowledge`: ナレッジ取得

### Policy
- 1リクエストあたり最大5ツール呼び出し
- タイムアウト: 30秒
- 最大トークン: 2000

### Memory
- Episodic: 直近5会話を保持
- Long-term: ContextKnowledge（店名→カテゴリマッピング）
