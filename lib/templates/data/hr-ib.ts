import type { Template } from '../types';

export const hrIb: Template = {
  id: 'hr-ib',
  industry: 'hr',
  direction: 'inbound',
  displayName: '人材・求人問い合わせ／登録面談予約',
  description: '求人広告・ポータルからの問い合わせ受付と登録面談アポ取り。求職者の不安解消と面談確定が目的。',

  defaultFirstMessage:
    'お電話ありがとうございます。○○転職エージェントでございます。本日はどのようなご用件でしょうか？',

  defaultPersona: {
    tone: '温かく親しみやすいキャリアアドバイザー。相手の状況を最初に引き出し、「一緒に考える」姿勢を前面に出す。転職へのプレッシャーを与えない。',
    doNots: [
      '「必ず内定が取れます」など保証表現は禁止',
      '現在の勤め先の批判を促したり同意したりしない',
      '個人の健康・家庭事情を深掘りしすぎない',
      '求職者の個人情報を本人の同意なく企業に共有しない',
    ],
  },

  defaultHearingFields: [
    { key: 'inquiry_source', label: '何を見てお電話いただきましたか', type: 'enum', required: false, options: ['求人広告', 'ポータルサイト', 'SNS', '知人紹介', 'その他'], description: '流入チャネルの把握' },
    { key: 'current_situation', label: '現在の状況', type: 'enum', required: true, options: ['在職中・すぐ転職したい', '在職中・いずれ転職を考えている', '退職済み・すぐ就職したい', '未経験・初就職'], description: '緊急度・提案スピードの設定' },
    { key: 'target_job_type', label: '希望の職種・仕事内容', type: 'string', required: true, description: '求人マッチングの核心' },
    { key: 'desired_salary', label: '希望年収・給与水準', type: 'string', required: false, description: 'マッチング条件の確認' },
    { key: 'work_style_preference', label: '希望する働き方', type: 'enum', required: false, options: ['フルリモート', 'ハイブリッド', '出社あり', 'どちらでも可'], description: '求人の絞り込み条件' },
    { key: 'experience_summary', label: '現職・前職の業種・役職', type: 'string', required: true, description: '応募資格・市場価値の初期評価' },
    { key: 'interview_preference', label: '面談の希望方法・時間帯', type: 'enum', required: true, options: ['オンライン（平日昼）', 'オンライン（平日夜）', 'オンライン（土日）', '対面（来社）'], description: 'アポ設定用' },
  ],

  typicalObjections: [
    {
      trigger: 'エージェントを使うのは初めてで、どうやって使うのかわからない',
      suggestedResponses: [
        'ご安心ください。まず私との面談で希望をお聞きして、合いそうな求人をご提案します。書類や面接のサポートも全部無料で行っています。お金は一切かかりません。',
        '流れをご説明しますね。①面談（30〜60 分、オンライン可）→②求人ご提案→③応募・書類添削→④面接同行まで一貫してサポートします。どこでもやめていただいて構いません。',
      ],
    },
    {
      trigger: 'まず求人情報だけ見たい',
      suggestedResponses: [
        'もちろんです。ただ、保有求人の 7 割は非公開のため、面談をしていただいた方にしかご紹介できないものも多いです。まず 30 分だけ話しましょう。',
        '公開求人はサイトでもご覧いただけますが、ご状況を伺った上でおすすめの求人をピックアップした方がご参考になると思います。いかがでしょうか？',
      ],
    },
    {
      trigger: '自分のスキルで転職できるか不安',
      suggestedResponses: [
        'まず現状をお聞きして、市場価値を一緒に確認しましょう。「転職できるか」という判断も面談でお伝えできます。まずはお話だけでも。',
        '不安に感じる方がほとんどです。でも、外から見ると思っている以上に市場価値が高いケースも多いです。一度確認してみませんか？',
      ],
    },
    {
      trigger: '年齢が高いから厳しいかも',
      suggestedResponses: [
        '40〜50 代のマネージャー・スペシャリスト層の転職支援も得意としています。ご経験を活かせるポジションは多く、年齢だけで厳しいとは限りません。まず面談で確認しましょう。',
      ],
    },
    {
      trigger: '未経験の業界でも挑戦できますか？',
      suggestedResponses: [
        '未経験歓迎の求人も多数あります。特に IT・営業・コンサルは未経験者を積極採用する企業が増えています。ご希望の業界をお教えいただければ、可能性をお伝えできます。',
      ],
    },
    {
      trigger: '短期間で退職しているけど大丈夫？',
      suggestedResponses: [
        '短期離職の方の転職支援も多数実績があります。経緯を面談でお聞きした上で、書類・面接での説明方法を一緒に考えましょう。正直に伝える戦略が一番うまくいきます。',
      ],
    },
    {
      trigger: '急いでいないのでゆっくり探したい',
      suggestedResponses: [
        'もちろん急がなくて大丈夫です。ただ、良い求人は早めに動かないと締め切られることが多いです。まず面談だけしておいて、良いものが出たときにすぐ動ける状態にしておきましょう。',
      ],
    },
  ],

  defaultClosingTechnique:
    '初回キャリア面談（30〜60 分、オンライン可）のアポ日時確定を最終ゴールとする。「無料・やめていい・急がなくていい」の 3 点を伝えて心理的安全を確保し、面談の日程と方法（Zoom/対面）を確定させる。',

  transferConditions: [
    '即日・緊急で求人を探している退職済み求職者（専任担当へ優先転送）',
    '法人向け採用支援（企業側からの問い合わせ）の問い合わせが来た場合',
    '求職者が感情的に不安定な状態（失業・トラブル等）で詳細なカウンセリングが必要な場合',
    'ビザ・外国人雇用など専門的な法的確認が必要な場合',
  ],

  attributes: [
    {
      key: 'candidate_stage',
      label: '求職者のステージ',
      values: [
        { value: 'active', label: 'アクティブ（すぐ転職したい）' },
        { value: 'passive', label: 'パッシブ（いずれ転職希望）' },
        { value: 'unemployed', label: '退職済み・緊急性あり' },
      ],
    },
    {
      key: 'industry_focus',
      label: '対応する求人業界',
      values: [
        { value: 'it_dx', label: 'IT・DX・エンジニア' },
        { value: 'sales_marketing', label: '営業・マーケティング' },
        { value: 'medical', label: '医療・介護' },
        { value: 'general', label: '総合（業界問わず）' },
      ],
    },
  ],

  industryKnowledgeBrief:
    '転職エージェントのインバウンドは「求人広告・ポータル経由の問い合わせ」と「登録後の面談予約」が主体。問い合わせから 30 分以内の対応が CVR を大きく左右する（業界データで 80% 以上が当日中の返答を重視）。求職者の最大の不安は「自分に合う求人があるか」と「エージェントに急かされないか」の 2 点。非公開求人の存在が来談動機になるため早期に言及する。退職済み求職者は緊急度が高いため優先対応が必要。初回面談では「希望整理」「市場価値確認」「求人提案」の 3 つを設計する。',

  dfcxBaseline: {
    defaultFlowName: 'HR Agent Inbound Inquiry Flow',
    extraIntents: [
      {
        displayName: 'intent.inquiry.job_search',
        trainingPhrases: [
          '転職を考えている',
          '求人を探したい',
          '仕事を探している',
          '転職の相談',
        ],
        targetPage: 'resolution',
        fulfillmentMessage: 'ご相談ありがとうございます。ご希望の業界や職種をお聞かせいただければ、最適な求人をご紹介いたします。',
      },
      {
        displayName: 'intent.inquiry.specific_job_posting',
        trainingPhrases: [
          'この求人について',
          '掲載中の求人を見ている',
          '広告で見た求人',
          '応募したい求人がある',
        ],
        targetPage: 'resolution',
        fulfillmentMessage: 'お問い合わせいただいた求人の詳細をご案内いたします。求人番号や企業名をお聞かせいただけますか？',
      },
      {
        displayName: 'intent.inquiry.urgent_search',
        trainingPhrases: [
          '退職したばかり',
          'すぐに働きたい',
          '至急仕事を探している',
          '次が決まらず困っている',
        ],
        targetPage: 'escalation',
        fulfillmentMessage: 'ご状況承知しました。優先的にご面談をお取りできるよう、すぐに担当コンサルタントにおつなぎします。',
      },
    ],
    transferIntent: {
      displayName: 'intent.transfer.consultant',
      trainingPhrases: [
        'コンサルタントに代わって',
        '担当者と話したい',
        '面談を予約したい',
        '専任の人をお願いします',
      ],
      targetPage: 'transfer',
      fulfillmentMessage: 'キャリアコンサルタントにおつなぎいたします。少々お待ちください。',
    },
    repromptOverrides: {
      '1': '恐れ入ります、もう一度お願いできますでしょうか？',
      '2': 'お電話が遠いようです。ゆっくりお話しいただけますか？',
      '3': '担当コンサルタントから折り返しご連絡させていただきます。',
    },
  },
};
