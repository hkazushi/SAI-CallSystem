# Dialogflow CX 実環境接続 セットアップガイド

本アプリをDialogflow CXに接続して、プロジェクトをエージェントとしてデプロイし、テスト会話を行うための手順です。

## 前提

- GCPアカウントとプロジェクト（SAI名義の1アカウントでOK）
- Node.js 20以上 + npm
- `npm install` 済み（`@google-cloud/dialogflow-cx` を含む）

## 手順

### 1. GCP側の準備

#### 1-1. Dialogflow CX API を有効化

```bash
# gcloud を使う場合
gcloud services enable dialogflow.googleapis.com --project=<YOUR_PROJECT_ID>
```

または GCPコンソール → APIとサービス → ライブラリで `Dialogflow API` を検索して有効化。

#### 1-2. サービスアカウント作成

[GCPコンソール → サービスアカウント](https://console.cloud.google.com/iam-admin/serviceaccounts)

1. 「サービスアカウントを作成」
2. 名前: `dfcx-deploy`（任意）
3. ロール: **Dialogflow API Admin**（デプロイ・セッション両方に必要）
4. 作成後、そのアカウントを選択 → 「キー」タブ → 「鍵を追加」→ 「新しい鍵を作成」→ JSON

#### 1-3. JSON鍵を1行化

```bash
jq -c . ~/Downloads/dfcx-deploy-xxxx.json
```

出力を控えておきます（後述の `GCP_SERVICE_ACCOUNT_JSON` に貼る値）。

---

### 2. アプリ側の環境変数を設定

プロジェクトルート（`/Users/kazushi/コールシステム/app/`）に **`.env.local`** を作成:

```bash
GCP_PROJECT_ID=sai-voice-ai
GCP_LOCATION=asia-northeast1
GCP_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"sai-voice-ai",...}
```

- `GCP_PROJECT_ID`: DFCXコンソールで表示されているGCPプロジェクトID
- `GCP_LOCATION`: 日本語運用なら `asia-northeast1` 推奨（`global` も可）
- `GCP_SERVICE_ACCOUNT_JSON`: 1-3で控えた1行JSON全体

> `.env.local` はGit管理対象外（`.gitignore` 済み）。鍵をコミットしないように。

---

### 3. 起動と確認

```bash
npm run dev
```

1. <http://localhost:3000/settings/credentials> を開き、
   「Dialogflow CX（実環境）」カードに **接続可能** バッジが出ればOK
2. 出ない場合はカード内の赤字メッセージに原因が出ます（JSONパースエラー・ロール不足など）

---

### 4. エージェントをDFCXにデプロイする

1. DFCXプロバイダのプロジェクトを開く
   - 例: <http://localhost:3000/projects/proj-002>（カスタマーサポート）
2. 「Agent設定」ボタン → `/projects/proj-002/dfcx` へ遷移
3. 右上の **「DFCXにデプロイ」** を押下
4. 進捗バナー: Agent作成 → EntityType → Intent → Page → Flow の順で反映（20〜40秒）
5. 成功すると Agent ID が表示され、DFCXコンソールへの直リンクも出ます

デプロイ結果はブラウザの localStorage に保存され、再訪時も表示されます。

---

### 5. テスト会話

デプロイ成功後、以下どちらからでもアクセス可能:

- プロジェクト詳細ページの **「テスト会話」** ボタン
- Agent設定ページ右上の **「テスト会話」** ボタン
- 成功バナー内の「テスト会話を開始」リンク

URL: `/projects/[id]/test`

1. 「会話を開始」ボタン → DFCXのWelcome Intent が発火
2. AIが冒頭メッセージを返す
3. テキスト入力で会話継続、各応答に `Page / Intent / 信頼度` がメタ表示
4. 「セッションをリセット」で新規セッション（最初から）

---

## トラブルシューティング

### `Permission denied` エラー
サービスアカウントに `Dialogflow API Admin` ロールが付与されているか確認。

### `Default Start Flow が見つかりません`
Agent作成直後に `listFlows` が空を返すケース。リトライ（「再デプロイ」）で解消することが多い。

### `asia-northeast1` で `INVALID_ARGUMENT`
そのリージョンでAgentが初回作成できなかった可能性。`GCP_LOCATION=global` に変えて再試行。

### IntentマッチしないまたはPage遷移しない
- デプロイ直後は学習に数秒〜数分かかる
- `/projects/[id]/dfcx` → Intents タブで training phrases を確認
- 不足があれば `lib/ai-builder.ts` の `DEFAULT_SCENARIOS` を編集し、再デプロイ

---

## 現状のスコープ（Phase B MVP）

### 実装済み
- プロジェクト設定 → DFCX Agent JSON への完全コンパイル
- DFCXへのデプロイ（冪等: 同名Agent削除→再作成）
- Sessions APIによるテキストベースのテスト会話
- Agent ID・セッション状態のlocalStorage保管

### 未実装（次フェーズ）
- サービスアカウント鍵のDB保管＋AES-256-GCM暗号化
- Webhook（setParameterActions実値取得・外部システム連携）
- Twilio連携（PSTN経由での実電話テスト）
- 音声ベースのテスト会話（現状はテキストのみ）
- EntityTypeの完全な参照解決（現在は `@sys.any` にフォールバック）

### 運用方針
- **SAI名義の1アカウント運用** でマルチテナント — 各テナントのAgentを displayName で区別
- 課金はGCPコンソール側でBilling Alertを設定推奨
