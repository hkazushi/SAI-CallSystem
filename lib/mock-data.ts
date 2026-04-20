// Mock data for Phase A development

export const mockTenant = {
  id: "tenant-001",
  name: "株式会社サンプル",
  plan: "premium",
  is_active: true,
  created_at: "2025-01-15T09:00:00Z",
};

export const mockUsers = [
  {
    id: "user-001",
    tenant_id: "tenant-001",
    email: "tanaka@example.com",
    name: "田中 太郎",
    role: "admin" as const,
    is_active: true,
    last_login_at: "2026-04-16T08:30:00Z",
    created_at: "2025-01-15T09:00:00Z",
  },
  {
    id: "user-002",
    tenant_id: "tenant-001",
    email: "yamamoto@example.com",
    name: "山本 花子",
    role: "operator" as const,
    is_active: true,
    last_login_at: "2026-04-15T14:00:00Z",
    created_at: "2025-02-01T09:00:00Z",
  },
];

export const mockProjects = [
  {
    id: "proj-001",
    tenant_id: "tenant-001",
    name: "クラウド会計ソフト アウトバウンド",
    description: "中小企業向けクラウド会計ソフトの新規獲得キャンペーン",
    direction: "outbound" as const,
    ai_provider: "vapi" as const,
    ai_assistant_id: "asst_abc123",
    status: "active" as const,
    product_info: {
      product_name: "クラウド会計ソフトA",
      pricing: "月額3,000円〜",
      key_features: ["自動仕訳", "確定申告対応", "モバイル対応"],
      target_customer: "個人事業主・中小企業",
    },
    voice_settings: { voice_id: "ja-JP-Neural2-B", speed: 1.0, gender: "female" },
    first_message: "こんにちは、株式会社サンプルの田中と申します。クラウド会計ソフトのご案内でお電話しております。",
    created_at: "2026-01-10T09:00:00Z",
    updated_at: "2026-04-01T15:00:00Z",
    _stats: { total_calls: 1250, success_rate: 32, ai_resolution_rate: 78 },
  },
  {
    id: "proj-002",
    tenant_id: "tenant-001",
    name: "カスタマーサポート インバウンド",
    description: "既存顧客からの問い合わせ対応AIエージェント",
    direction: "inbound" as const,
    ai_provider: "dialogflow_cx" as const,
    ai_assistant_id: "agent_def456",
    status: "active" as const,
    product_info: {
      product_name: "クラウド会計ソフトA サポート",
      pricing: "",
      key_features: ["FAQ自動応答", "有人転送", "24時間対応"],
      target_customer: "既存顧客",
    },
    voice_settings: { voice_id: "ja-JP-Neural2-C", speed: 0.95, gender: "female" },
    first_message: "お電話ありがとうございます。クラウド会計ソフトAのサポートセンターです。",
    inbound_phone_number: "03-1234-5678",
    created_at: "2026-01-20T09:00:00Z",
    updated_at: "2026-04-05T10:00:00Z",
    _stats: { total_calls: 850, success_rate: 100, ai_resolution_rate: 65 },
  },
  {
    id: "proj-003",
    tenant_id: "tenant-001",
    name: "保険商品 見込み客フォロー",
    description: "ウェブサイト資料請求者へのフォローアップ発信",
    direction: "outbound" as const,
    ai_provider: "vapi" as const,
    ai_assistant_id: null,
    status: "paused" as const,
    product_info: {
      product_name: "医療保険プレミアム",
      pricing: "月額5,000円〜",
      key_features: ["入院給付", "手術給付", "がん特約"],
      target_customer: "30〜50代の個人",
    },
    voice_settings: { voice_id: "ja-JP-Neural2-B", speed: 1.0, gender: "female" },
    first_message: "こんにちは、先日ホームページから資料をご請求いただいた件でご連絡しております。",
    created_at: "2026-02-15T09:00:00Z",
    updated_at: "2026-03-20T09:00:00Z",
    _stats: { total_calls: 320, success_rate: 28, ai_resolution_rate: 55 },
  },
  {
    id: "proj-004",
    tenant_id: "tenant-001",
    name: "不動産査定 新規獲得",
    description: "不動産売却検討者への査定案内",
    direction: "outbound" as const,
    ai_provider: "dialogflow_cx" as const,
    ai_assistant_id: null,
    status: "draft" as const,
    product_info: {
      product_name: "不動産査定サービス",
      pricing: "査定無料",
      key_features: ["AI査定", "即日対応", "全国対応"],
      target_customer: "不動産売却検討者",
    },
    voice_settings: { voice_id: "ja-JP-Neural2-D", speed: 1.0, gender: "male" },
    first_message: "こんにちは、弊社の不動産無料査定サービスについてご案内させていただきます。",
    created_at: "2026-03-01T09:00:00Z",
    updated_at: "2026-04-10T09:00:00Z",
    _stats: { total_calls: 0, success_rate: 0, ai_resolution_rate: 0 },
  },
  {
    id: "proj-005",
    tenant_id: "tenant-001",
    name: "太陽光発電 アポ取得",
    description: "太陽光発電システムの訪問アポイントメント取得",
    direction: "outbound" as const,
    ai_provider: "vapi" as const,
    ai_assistant_id: "asst_ghi789",
    status: "completed" as const,
    product_info: {
      product_name: "ソーラーパネル設置サービス",
      pricing: "初期費用0円〜",
      key_features: ["電気代削減", "売電収入", "10年保証"],
      target_customer: "一戸建て住宅オーナー",
    },
    voice_settings: { voice_id: "ja-JP-Neural2-D", speed: 1.0, gender: "male" },
    first_message: "こんにちは、太陽光発電システムについてご案内のお電話です。",
    created_at: "2025-10-01T09:00:00Z",
    updated_at: "2025-12-31T09:00:00Z",
    _stats: { total_calls: 2800, success_rate: 25, ai_resolution_rate: 72 },
  },
];

export const mockLists = [
  {
    id: "list-001",
    tenant_id: "tenant-001",
    name: "中小企業リスト 2026年4月",
    description: "東京・神奈川の中小企業（従業員10〜100名）",
    total_count: 5420,
    column_mapping: { phone: "電話番号", name: "担当者名", company: "会社名" },
    created_by: "user-001",
    created_at: "2026-04-01T09:00:00Z",
    updated_at: "2026-04-01T09:00:00Z",
    _pending: 3218,
    _completed: 1850,
    _failed: 352,
  },
  {
    id: "list-002",
    tenant_id: "tenant-001",
    name: "資料請求者リスト 3月分",
    description: "ウェブサイトから資料請求した見込み客",
    total_count: 820,
    column_mapping: { phone: "電話番号", name: "氏名", company: "会社名", custom_fields: ["業種", "資料請求日"] },
    created_by: "user-001",
    created_at: "2026-03-31T09:00:00Z",
    updated_at: "2026-04-02T09:00:00Z",
    _pending: 125,
    _completed: 650,
    _failed: 45,
  },
  {
    id: "list-003",
    tenant_id: "tenant-001",
    name: "既存顧客リスト",
    description: "契約中の既存顧客（更新案内用）",
    total_count: 1250,
    column_mapping: { phone: "電話番号", name: "担当者名", company: "会社名", custom_fields: ["契約プラン", "契約更新日"] },
    created_by: "user-001",
    created_at: "2026-02-15T09:00:00Z",
    updated_at: "2026-04-10T09:00:00Z",
    _pending: 890,
    _completed: 330,
    _failed: 30,
  },
  {
    id: "list-004",
    tenant_id: "tenant-001",
    name: "不動産オーナーリスト 関東",
    description: "関東エリアの不動産オーナー（一戸建て）",
    total_count: 3850,
    column_mapping: { phone: "電話番号", name: "氏名", custom_fields: ["都道府県", "物件種別", "築年数"] },
    created_by: "user-002",
    created_at: "2026-03-10T09:00:00Z",
    updated_at: "2026-03-10T09:00:00Z",
    _pending: 3850,
    _completed: 0,
    _failed: 0,
  },
  {
    id: "list-005",
    tenant_id: "tenant-001",
    name: "個人保険見込みリスト",
    description: "セミナー参加者・問い合わせ者",
    total_count: 1680,
    column_mapping: { phone: "電話番号", name: "氏名", custom_fields: ["年齢", "家族構成", "年収帯"] },
    created_by: "user-001",
    created_at: "2026-02-01T09:00:00Z",
    updated_at: "2026-03-15T09:00:00Z",
    _pending: 960,
    _completed: 680,
    _failed: 40,
  },
];

const outcomes = ["completed", "no_answer", "busy", "answered", "failed"] as const;
const directions = ["outbound", "inbound"] as const;
const projectIds = ["proj-001", "proj-002", "proj-003", "proj-005"];

function randomPick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPhone(): string {
  const prefixes = ["090", "080", "070", "03", "06", "045"];
  const p = randomPick(prefixes);
  if (p.length === 3) {
    return `${p}-${String(Math.floor(Math.random() * 9000) + 1000)}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  }
  return `${p}-${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

function randomDateRecent(daysBack = 30): string {
  const now = new Date("2026-04-16T12:00:00Z");
  const offset = Math.random() * daysBack * 24 * 60 * 60 * 1000;
  return new Date(now.getTime() - offset).toISOString();
}

const summaries = [
  "料金プランについて問い合わせ。スタンダードプランを案内し、資料送付に同意。",
  "既に競合他社と契約中のため不要と断られた。",
  "担当者不在。折り返し連絡を依頼。",
  "興味あり。来週の訪問アポイントを取得。",
  "解約について問い合わせ。引き留め案内を実施、継続意向あり。",
  "技術的な質問を受け、FAQで対応。解決済み。",
  "番号が変わっている模様、コンタクト不可。",
  "無効番号。リストから除外が必要。",
  "導入を検討中。詳細資料の送付を約束。",
  "留守番電話に折り返し番号を残した。",
];

export const mockCallLogs = Array.from({ length: 50 }, (_, i) => {
  const direction = randomPick(directions);
  const outcome = randomPick(outcomes);
  const startedAt = randomDateRecent(30);
  const duration =
    outcome === "no_answer" || outcome === "busy"
      ? Math.floor(Math.random() * 30)
      : Math.floor(Math.random() * 300) + 30;
  const endedAt = new Date(
    new Date(startedAt).getTime() + duration * 1000
  ).toISOString();

  return {
    id: `call-${String(i + 1).padStart(3, "0")}`,
    tenant_id: "tenant-001",
    project_id: randomPick(projectIds),
    contact_id: `contact-${String(i + 1).padStart(4, "0")}`,
    caller_number: randomPhone(),
    called_number: direction === "inbound" ? "03-1234-5678" : randomPhone(),
    direction,
    status: "completed" as const,
    outcome,
    started_at: startedAt,
    ended_at: endedAt,
    duration_seconds: duration,
    ai_resolved: outcome === "completed" && Math.random() > 0.3,
    summary: outcome === "completed" || outcome === "answered"
      ? randomPick(summaries)
      : null,
    has_recording: outcome !== "no_answer" && outcome !== "busy",
    retry_count: Math.floor(Math.random() * 3),
  };
}).sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

export const mockTranscripts = [
  { sequence: 1, speaker: "ai", content: "こんにちは、株式会社サンプルのAIアシスタントです。本日はクラウド会計ソフトについてご案内のお電話です。少々お時間よろしいでしょうか？", timestamp_ms: 0 },
  { sequence: 2, speaker: "caller", content: "ああ、はい。どのようなソフトですか？", timestamp_ms: 4500 },
  { sequence: 3, speaker: "ai", content: "ありがとうございます。弊社のクラウド会計ソフトAは、自動仕訳や確定申告対応など、経理業務を大幅に効率化できるサービスです。月額3,000円からご利用いただけます。", timestamp_ms: 7800 },
  { sequence: 4, speaker: "caller", content: "今使っているソフトがあるんですが、乗り換えるメリットはありますか？", timestamp_ms: 18200 },
  { sequence: 5, speaker: "ai", content: "はい、乗り換えのメリットは大きく3つございます。1つ目は銀行明細の自動取得と仕訳、2つ目は確定申告書類の自動作成、3つ目はスマートフォンからもリアルタイムで確認できる点です。", timestamp_ms: 22500 },
  { sequence: 6, speaker: "caller", content: "なるほど。料金プランをもう少し詳しく教えてもらえますか？", timestamp_ms: 35800 },
  { sequence: 7, speaker: "ai", content: "承知しました。プランは3種類ございます。個人事業主向けのライトプランが月額1,500円、中小企業向けスタンダードプランが月額3,000円、大企業向けプレミアムプランが月額8,000円となっております。", timestamp_ms: 40200 },
  { sequence: 8, speaker: "caller", content: "スタンダードプランで何社まで対応できますか？", timestamp_ms: 55600 },
  { sequence: 9, speaker: "ai", content: "スタンダードプランは1テナント（1法人）でご利用いただけます。従業員数の制限はございません。詳細な資料をメールでお送りすることも可能です。", timestamp_ms: 60100 },
  { sequence: 10, speaker: "caller", content: "わかりました。資料を送ってもらえますか？", timestamp_ms: 73400 },
  { sequence: 11, speaker: "ai", content: "ありがとうございます。メールアドレスをお教えいただけますでしょうか？", timestamp_ms: 76800 },
  { sequence: 12, speaker: "caller", content: "tanaka@kabushiki.co.jp です。", timestamp_ms: 82300 },
  { sequence: 13, speaker: "ai", content: "承知しました。tanaka@kabushiki.co.jpにスタンダードプランの詳細資料をお送りします。ご不明な点がございましたら、いつでもお気軽にお問い合わせください。本日はありがとうございました。", timestamp_ms: 87500 },
];

export const mockDashboardKPI = {
  total_calls: 1250,
  total_calls_change: 12.5,
  avg_duration_seconds: 185,
  avg_duration_change: -3.2,
  ai_resolution_rate: 78.5,
  ai_resolution_change: 5.1,
  total_projects: 5,
  active_projects: 2,
  total_lists: 5,
  total_contacts: 13020,
};

export const mockCallTrend = [
  { date: "04/10", calls: 38, resolved: 30 },
  { date: "04/11", calls: 45, resolved: 36 },
  { date: "04/12", calls: 12, resolved: 10 },
  { date: "04/13", calls: 15, resolved: 11 },
  { date: "04/14", calls: 52, resolved: 41 },
  { date: "04/15", calls: 61, resolved: 48 },
  { date: "04/16", calls: 43, resolved: 35 },
];

// ── テンプレート ─────────────────────────────────────────────────
export const mockTemplates = [
  {
    id: "tpl-001",
    slug: "template-fiber",
    name: "光回線 乗り換え提案",
    industry: "通信",
    description: "光回線の乗り換えメリットを訴求し、訪問アポを取得するアウトバウンドテンプレート。",
    default_provider: "vapi" as const,
    preview_audio_url: null,
    is_public: true,
    scenario: {
      purpose: "光回線乗り換えアポ取り",
      industry: "通信",
      product: { name: "ひかりネクスト", price: "月額4,200円〜", features: ["最大10Gbps", "工事費無料", "乗り換え割引"] },
      first_message: "こんにちは、現在ご利用中のインターネット回線について、より快適にご利用いただけるプランのご案内でお電話しました。",
      goals: ["訪問アポ取得", "現状ヒアリング"],
      faq: [
        { question: "今の回線と何が違うの？", answer: "速度が最大10Gbpsに向上し、月額料金も現在よりお安くなる可能性がございます。" },
        { question: "工事は必要？", answer: "基本的に工事は無料で、所要時間は約1時間です。" },
      ],
    },
  },
  {
    id: "tpl-002",
    slug: "template-waterserver",
    name: "ウォーターサーバー 案内",
    industry: "食品・飲料",
    description: "ウォーターサーバーの無料お試しキャンペーンを案内するアウトバウンドテンプレート。",
    default_provider: "vapi" as const,
    preview_audio_url: null,
    is_public: true,
    scenario: {
      purpose: "無料お試し申込",
      industry: "飲料",
      product: { name: "ピュアウォーター", price: "サーバーレンタル無料 / 水代 月額2,900円〜", features: ["天然水", "冷温両対応", "チャイルドロック"] },
      first_message: "こんにちは、天然水のウォーターサーバーについて特別キャンペーンのご案内です。",
      goals: ["お試し申込", "資料送付"],
      faq: [
        { question: "解約金はある？", answer: "最低利用期間1年以内の解約は5,000円の手数料がかかります。" },
      ],
    },
  },
  {
    id: "tpl-003",
    slug: "template-appointment",
    name: "汎用アポイントメント取得",
    industry: "汎用",
    description: "業種を問わず使える汎用的なアポ取りテンプレート。商材情報を埋めるだけで利用可能。",
    default_provider: "vapi" as const,
    preview_audio_url: null,
    is_public: true,
    scenario: {
      purpose: "アポイントメント取得",
      industry: "汎用",
      product: { name: "（商材名を入力）", price: "（価格を入力）", features: ["（特長1）", "（特長2）"] },
      first_message: "こんにちは、{{company_name}}の{{agent_name}}と申します。{{product_name}}についてご案内のお電話です。",
      goals: ["アポ取得"],
      faq: [],
    },
  },
  {
    id: "tpl-004",
    slug: "template-inbound-faq",
    name: "インバウンド FAQ応答",
    industry: "カスタマーサポート",
    description: "よくある質問に自動回答するインバウンド対応テンプレート。Dialogflow CXベース。",
    default_provider: "dialogflow_cx" as const,
    preview_audio_url: null,
    is_public: true,
    scenario: {
      purpose: "FAQ自動応答",
      industry: "カスタマーサポート",
      product: { name: "（サービス名を入力）", price: "", features: ["FAQ自動応答", "営業時間外案内", "有人転送"] },
      first_message: "お電話ありがとうございます。{{company_name}}のサポートセンターです。ご用件をお聞かせください。",
      goals: ["問い合わせ解決", "有人転送判断"],
      faq: [],
    },
  },
  {
    id: "tpl-005",
    slug: "template-order-status",
    name: "注文ステータス確認",
    industry: "EC・物流",
    description: "注文番号から配送状況を自動確認するインバウンドテンプレート。Dialogflow CXベース。",
    default_provider: "dialogflow_cx" as const,
    preview_audio_url: null,
    is_public: true,
    scenario: {
      purpose: "注文ステータス照会",
      industry: "EC",
      product: { name: "注文照会サービス", price: "", features: ["注文番号検索", "配送状況確認", "再配達手配"] },
      first_message: "お電話ありがとうございます。ご注文に関するお問い合わせですね。注文番号をお教えください。",
      goals: ["配送状況回答"],
      faq: [
        { question: "届かないんですが", answer: "ご注文番号をお教えいただければ、配送状況をお調べいたします。" },
      ],
    },
  },
];

// ── シナリオドラフト(壁打ち途中状態) ──────────────────────────────
export const mockScenarioDrafts = [
  {
    id: "draft-001",
    tenant_id: "tenant-001",
    project_id: "proj-001",
    conversation: [
      { role: "assistant", content: "こんにちは！チャッピーです。AIコールエージェントの構築をお手伝いします。まず、どのような目的のお電話ですか？\n\nA. 新規のお客様へのアポ取り\nB. 既存のお客様へのフォローアップ\nC. お問い合わせ対応\nD. その他" },
      { role: "user", content: "Aの新規アポ取りです。クラウド会計ソフトの新規獲得キャンペーンです。" },
      { role: "assistant", content: "クラウド会計ソフトの新規獲得ですね！次に、商材の詳細を教えてください。\n\n1. 商品名は何ですか？\n2. 価格帯はどのくらいですか？" },
      { role: "user", content: "商品名は「クラウド会計ソフトA」、月額3,000円〜です。" },
    ],
    scenario: {
      purpose: "新規獲得アポ取り",
      industry: "SaaS",
      product: { name: "クラウド会計ソフトA", price: "月額3,000円〜", features: ["自動仕訳", "確定申告対応", "モバイル対応"] },
      first_message: "こんにちは、株式会社サンプルの田中と申します。クラウド会計ソフトのご案内でお電話しております。",
      goals: ["アポ取得", "資料送付"],
    },
    is_finalized: true,
  },
];

// ── チャッピーデモ会話 ────────────────────────────────────────────
export const chappieGreeting = `こんにちは！**チャッピー**です 🤖

AIコールエージェントの構築をお手伝いします。いくつか質問させていただきながら、最適なコールシナリオを一緒に作っていきましょう。

まず、このプロジェクトで行いたい電話の**目的**を教えてください。

**A.** 新規のお客様へのアポ取り
**B.** 既存のお客様へのフォローアップ
**C.** お問い合わせ対応（インバウンド）
**D.** ヒアリング・アンケート
**E.** その他`;

export const mockCredentials = [
  {
    id: "cred-001",
    tenant_id: "tenant-001",
    provider: "vapi" as const,
    label: "Vapi本番アカウント",
    is_default: true,
    created_at: "2026-01-10T09:00:00Z",
  },
  {
    id: "cred-002",
    tenant_id: "tenant-001",
    provider: "dialogflow_cx" as const,
    label: "GCP本番プロジェクト",
    is_default: true,
    created_at: "2026-01-20T09:00:00Z",
  },
];
