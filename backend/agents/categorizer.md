# Categorizer Agent（設計書 §8-3）

## 役割
テキスト/音声入力から支出情報を抽出し、カテゴリに分類する。
過去のパターンと文脈ナレッジを活用して精度を向上させる。

## 使用モデル
Claude Haiku（低レイテンシー優先）

## カテゴリ定義

| コード | 表示名 | 分類ルール |
|--------|--------|-----------|
| food_home | 食費（自炊） | スーパー、生鮮食品、食材 |
| food_restaurant | 外食 | ファミレス、ファストフード、ラーメン |
| food_premium | 外食（高級） | 3,000円以上の飲食、予約制レストラン |
| daily_goods | 日用品 | ドラッグストア、100均、日用消耗品 |
| children | 子供関連 | おもちゃ、子供服、ベビー用品 |
| education | 教育費 | 塾、習い事、教材、学校関連 |
| outing | 週末外出 | 公園、動物園、映画、遊園地 |
| travel | 旅行 | ホテル、交通費（旅行関連） |
| medical | 医療費 | 病院、薬局（処方箋）、歯医者 |
| utility | 光熱費・通信 | 電気、ガス、水道、スマホ、ネット |
| insurance | 保険 | 生命保険、医療保険、火災保険 |
| loan | ローン | 住宅ローン、車ローン |
| car | 車関連 | ガソリン、車検、駐車場 |
| hobby | 趣味 | 書籍、ゲーム、副業経費 |
| other | その他 | 上記に該当しないもの |

## 分類ルール（優先度順）

1. **ナレッジ一致**（confidence: 0.95）
   - shopToCategory マッピングに店名が存在 → そのカテゴリ

2. **パターン一致**（confidence: 0.85）
   - approvedPatterns に類似パターンが存在

3. **キーワードマッチ**（confidence: 0.75）
   - 「スーパー」「イオン」→ food_home
   - 「マクドナルド」「ガスト」→ food_restaurant
   - 「映画」「公園」→ outing

4. **金額ベース推定**（confidence: 0.60）
   - 飲食で3,000円以上 → food_premium
   - 1,000円以下の飲食 → food_restaurant

5. **AI推定**（confidence: 0.50）
   - 上記に該当しない場合、Claudeに推定させる

## 日付解決ルール

- 「今日」→ 当日
- 「昨日」→ 前日
- 「おととい」→ 2日前
- 「先週末」→ 直前の土曜日
- 「先週の金曜」→ 直前の金曜日
- 日付指定なし → 当日

## プロンプトテンプレート

```
あなたは家計簿アプリのカテゴライザーです。

## 学習済みパターン
{{contextKnowledge.shopToCategory}}

## カテゴリ一覧
{{categories}}

## 入力
「{{userInput}}」

## 出力（JSON配列）
[{
  "shopName": "店名",
  "amount": 数値,
  "category": "カテゴリコード",
  "confidence": 0.0-1.0,
  "date": "YYYY-MM-DD",
  "memo": "メモ",
  "alternativeCategories": ["代替1", "代替2"]
}]
```

## パターン検出（日次バッチ）

EventBridge Scheduler で毎日深夜1時に実行:

1. 直近30日の取引データを取得
2. 店名ごとに集計（出現回数、平均金額、頻度）
3. 3回以上出現する店舗をパターンとして検出
4. `status: 'pending'` で knowledge テーブルに保存
5. shopToCategory マッピングを自動更新

## AgentCore Memory 連携

### 読み取り
- ContextKnowledge: shopToCategory, keywordToCategory
- PatternKnowledge: approved パターン一覧

### 書き込み
- 新しいパターンの検出結果
- shopToCategory マッピングの更新
