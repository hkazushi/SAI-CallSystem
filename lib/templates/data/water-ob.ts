import type { Template } from '../types';

export const waterOb: Template = {
  id: 'water-ob',
  industry: 'water_server',
  direction: 'outbound',
  displayName: 'ウォーターサーバー・新規営業',
  description: '家庭・オフィス向けウォーターサーバー新規獲得アウトバウンド。無料お試しと月額コスト比較が主軸。',

  defaultFirstMessage:
    'お世話になっております、○○ウォーターと申します。宅配ウォーターサーバーの無料お試しキャンペーンのご案内でお電話しました。1 分ほどよろしいでしょうか？',

  defaultPersona: {
    tone: '明るく親しみやすいトーン。健康意識・生活の質向上に訴えかける。数字（月額・コスト比較）を積極的に使う。',
    doNots: [
      '「水道水は危険です」など過剰な不安煽りは禁止',
      '契約期間・解約条件を正確に伝える（意図的な曖昧化は禁止）',
      '機器の無料レンタル期間を誤って伝えない',
      '赤ちゃんや妊婦への医療的効果を保証しない',
    ],
  },

  defaultHearingFields: [
    { key: 'family_size', label: '家族人数', type: 'number', required: true, description: '水の消費量・ボトル本数見積もりのため' },
    { key: 'has_baby_or_pregnant', label: '乳幼児・妊婦の有無', type: 'boolean', required: false, description: '健康訴求のフックに活用' },
    { key: 'current_water_habit', label: '現在の水の調達方法', type: 'enum', required: true, options: ['水道水', 'ペットボトル購入', 'ブリタ等浄水器', '他社ウォーターサーバー'], description: 'コスト比較のベースライン' },
    { key: 'monthly_water_spend', label: '現在の月額水代（円）', type: 'number', required: false, description: 'コスト比較訴求の根拠' },
    { key: 'installation_location', label: '設置場所（自宅/オフィス）', type: 'enum', required: true, options: ['自宅', 'オフィス・職場', '店舗'], description: 'プランと機種選定のため' },
    { key: 'appointment_preference', label: '無料お試し配送希望時間帯', type: 'string', required: true, description: '次ステップのアポ設定用' },
  ],

  typicalObjections: [
    {
      trigger: 'ウォーターサーバーは高いイメージがある',
      suggestedResponses: [
        '実はペットボトルをよく買うご家庭だと、サーバーの方が月額で安くなることが多いんです。今月お水代にいくらかかっていますか？比較してみましょう。',
        '機器は無料レンタルで月額 2,000〜3,000 円程度からあります。今のご生活と比べてみませんか？',
      ],
    },
    {
      trigger: '水道水で十分',
      suggestedResponses: [
        'そうですね、それで問題ない方も多いです。お子様がいらっしゃるご家庭だと、ミルク作りや離乳食に使えるお水があると便利とよく聞きます。お子様はいらっしゃいますか？',
        'ご安心ください、無理にお勧めするものではありません。ただ、一度無料でお試しいただくと生活の変化を感じる方も多く、まずは体験だけでもいかがでしょうか？',
      ],
    },
    {
      trigger: 'ボトル交換が面倒',
      suggestedResponses: [
        '最近は下置き型サーバーもあり、床置きのボトルを差し込むだけなので女性やご高齢の方にも扱いやすいです。ご興味あれば機種のご説明をしますか？',
        '交換頻度はご家族人数によりますが、2 名で月 1〜2 本程度が目安です。宅配も指定日に届けますので、在庫管理が不要です。',
      ],
    },
    {
      trigger: '契約が長期縛りで途中解約できない',
      suggestedResponses: [
        '最低利用期間は 1 年のプランが多いですが、解約違約金なしのプランもございます。どちらが合うかご説明しましょうか？',
        '無料お試し期間（通常 1〜2 ヶ月）は解約違約金なしですので、まずはそこからお試しいただく方が多いです。',
      ],
    },
    {
      trigger: 'スペースがない',
      suggestedResponses: [
        'コンパクトモデルもあり、キッチンのカウンターに置けるサイズのものもございます。設置場所の写真をお送りいただければ、合う機種をご提案できます。',
      ],
    },
    {
      trigger: '他社でもう契約している',
      suggestedResponses: [
        'そうでしたか。現在のサーバーにご満足いただいていますか？もし料金や水質など気になる点があれば、比較してご案内することもできますよ。',
        'ご利用中とのこと、失礼しました。もし乗り換えをご検討の際にはぜひご連絡ください。',
      ],
    },
    {
      trigger: '今は忙しい',
      suggestedResponses: [
        '失礼しました。改めてご連絡させていただきますが、平日・休日のどちらがご都合よいですか？',
        '資料をメールやLINEでお送りすることもできますので、お手すきの際にご覧いただく形はいかがでしょうか？',
      ],
    },
  ],

  defaultClosingTechnique:
    '無料お試し期間のアポ確定（日時・配送先）を最優先ゴールとする。「まず体験だけ」のワーディングで心理的ハードルを下げ、お試し後の継続判断は顧客に委ねる形式でクロージング。',

  transferConditions: [
    '顧客が「今すぐ契約したい」と言った場合',
    '複数台導入の法人・オフィス向け一括交渉が必要な場合',
    '水質・成分に関する詳細な医療的質問が来た場合',
    '強いクレームや怒りが出た場合',
  ],

  attributes: [
    {
      key: 'target_segment',
      label: 'ターゲット層',
      values: [
        { value: 'family', label: 'ファミリー層（乳幼児あり）' },
        { value: 'couple', label: '共働き夫婦' },
        { value: 'office', label: 'オフィス・職場' },
        { value: 'single', label: '単身・一人暮らし' },
      ],
    },
    {
      key: 'campaign_type',
      label: 'キャンペーン種別',
      values: [
        { value: 'free_trial', label: '無料お試しキャンペーン' },
        { value: 'cashback', label: 'キャッシュバック訴求' },
        { value: 'eco', label: 'エコ・環境訴求（ペットボトル削減）' },
      ],
    },
  ],

  industryKnowledgeBrief:
    'ウォーターサーバー新規獲得アウトバウンドは「無料お試し」のファーストステップクロージングが定番。主要競合はプレミアムウォーター・アクアクララ・クリクラなど。ターゲットは乳幼児・妊婦のいる家庭が最高CVR。ペットボトル購入者は月換算でサーバーより高くなるケースが多く、数字比較で刺さりやすい。法人・オフィス向けは台数が多く単価が高い。解約率は 1 年目に集中するため、最低利用期間の説明は正確に行う必要がある。設置場所の確認（賃貸の電気容量・床面積）も商談フローに入れるべき。',
};
