import type { Template } from '../types';

export const hrOb: Template = {
  id: 'hr-ob',
  industry: 'hr',
  direction: 'outbound',
  displayName: '人材（転職エージェント）・面談打診',
  description: '転職エージェントから登録者（求職者）へのアウトバウンド。カジュアル面談のアポ取りと希望条件の深堀りが目的。',

  defaultFirstMessage:
    'お世話になっております。先日ご登録いただきました○○転職エージェントの○○でございます。ご状況をお聞きしたく、5 分ほどよろしいでしょうか？',

  defaultPersona: {
    tone: '親しみやすくフラットなキャリアアドバイザー像。転職を急かさず、まず状況を聞いてから提案する姿勢。プレッシャーを与えない。',
    doNots: [
      '「絶対に年収アップできます」など結果の確約は禁止',
      '内定が保証されているかのような表現は禁止',
      '競合エージェントや現職企業を根拠なく批判しない',
      '求職者の個人情報を本人の同意なく企業に共有しない',
      '法的に禁止された質問（出生地・家族の職業等）は行わない',
    ],
  },

  defaultHearingFields: [
    { key: 'current_job_status', label: '現在の就業状況', type: 'enum', required: true, options: ['在職中（転職活動中）', '在職中（転職を検討し始めた）', '退職済み・求職中', '副業検討'], description: 'アプローチの温度感と急ぎ度を把握' },
    { key: 'current_industry', label: '現職の業界・職種', type: 'string', required: true, description: 'マッチング求人の絞り込み' },
    { key: 'years_of_experience', label: '社会人経験年数', type: 'number', required: true, description: '応募資格・レンジのマッチング' },
    { key: 'desired_industry', label: '希望する業界・職種', type: 'string', required: false, description: '求人提案のフォーカス' },
    { key: 'desired_salary', label: '希望年収（万円）', type: 'number', required: false, description: '求人のマッチング・給与交渉の方向性' },
    { key: 'change_reason', label: '転職を考えた主な理由', type: 'enum', required: false, options: ['年収アップ', 'キャリアアップ', '職場環境の改善', 'リモートワーク希望', '業界変更', '家庭の事情', 'その他'], description: 'キャリア提案のフック' },
    { key: 'interview_availability', label: 'キャリア面談希望時間帯', type: 'string', required: true, description: 'アポ設定用' },
  ],

  typicalObjections: [
    {
      trigger: 'まだ本格的に転職活動はしていない',
      suggestedResponses: [
        'それで大丈夫です。まずは市場価値を知るための「情報収集の場」として面談をご利用いただく方も多いです。決める必要はありませんので、気軽にお話だけでも。',
        '全然急がなくて構いません。ただ、求人は時期によって出てきたり消えたりします。良いものが出たときに最初に連絡できるよう、今のうちに状況を把握させてください。',
      ],
    },
    {
      trigger: '今の会社でまだ頑張るつもり',
      suggestedResponses: [
        'そうですね、それが一番ですよね。ただ、外の市場価値を知っておくと、今の会社での交渉にも役立ちます。一度話を聞くだけでも参考になりますよ。',
        '了解しました。もし気持ちが変わったときはいつでもご連絡ください。私がサポートします。',
      ],
    },
    {
      trigger: 'エージェントを通すのは初めてで不安',
      suggestedResponses: [
        'ご安心ください。エージェントの利用は完全無料で、企業からの手数料でサービスを提供しています。途中でやめていただいても構いません。流れを最初に丁寧に説明しますね。',
        '初めての方が多いので、丁寧にご説明します。まず面談は決定ではなく、情報共有の場と思っていただければ大丈夫です。',
      ],
    },
    {
      trigger: '他のエージェントにもう登録している',
      suggestedResponses: [
        'それは賢い選択です。エージェントによって得意な業界・企業が違いますので、複数ご利用いただくと選択肢が広がります。弊社の得意分野もご説明させてください。',
      ],
    },
    {
      trigger: '希望に合う求人はあるか？',
      suggestedResponses: [
        '現在の希望条件を詳しく聞かせていただいた上でご紹介できます。今教えていただいた内容から見ると、いくつか良さそうなものが頭にありますが、面談でもう少し詳しく話しましょう。',
        '現在の保有求人は非公開のものを含めると○○件あります。ご希望の条件をお聞かせいただければ、面談の場でリストをお持ちします。',
      ],
    },
    {
      trigger: '転職活動がうまくいくか自信がない',
      suggestedResponses: [
        'それはよくある不安です。私が書類・面接のサポートをしますので、一人でやるより断然うまくいきます。まず現状を一緒に整理してみましょう。',
      ],
    },
    {
      trigger: '今は忙しい時期なので後で',
      suggestedResponses: [
        '承知しました。来月頃にご連絡してもよいですか？それともLINEでの連絡の方が取りやすいですか？',
        '在職中の方が多いので、平日夜や土日朝のご面談も対応しています。ご都合のよいタイミングをお教えください。',
      ],
    },
  ],

  defaultClosingTechnique:
    'キャリア面談（初回）のアポ日時確定を最終ゴールとする。「今すぐ転職しなくていい」「情報収集だけでもOK」のワーディングで心理的ハードルを下げ、30〜60 分の面談を確定させる。オンライン面談（Zoom等）も提示して利便性を高める。',

  transferConditions: [
    '顧客が「今すぐ求人を紹介してほしい」と強い意欲を示した場合',
    '複雑なキャリアパス（海外経験・異業種転換）の相談が必要な場合',
    '法的に懸念のある質問（企業への内部告発・ハラスメント）が出た場合',
    '顧客が不快感や怒りを示す場合',
  ],

  attributes: [
    {
      key: 'target_candidate',
      label: 'ターゲット求職者層',
      values: [
        { value: 'mid_career', label: '第二新卒・20 代中堅' },
        { value: 'manager', label: 'マネージャー・管理職候補' },
        { value: 'specialist', label: '専門職・IT エンジニア' },
        { value: 'executive', label: '経営幹部・CxO 候補' },
      ],
    },
    {
      key: 'industry_focus',
      label: '得意な求人業界',
      values: [
        { value: 'it', label: 'IT・テック' },
        { value: 'finance', label: '金融・コンサル' },
        { value: 'sales', label: '営業・マーケティング' },
        { value: 'manufacturing', label: 'メーカー・製造' },
      ],
    },
  ],

  industryKnowledgeBrief:
    '転職エージェントのアウトバウンドは「登録者への面談打診」が中心。登録後 48 時間以内の初回連絡が CVR に大きく影響する。求職者の最大懸念は「エージェントに利用されること」と「転職に踏み切る決断をさせられること」。そのため「情報収集だけ」「急がなくていい」の姿勢が重要。在職中の求職者が 7 割以上のため、夜間・休日面談の対応可否が重要。年収交渉・内定後フォローまで担うエージェントの付加価値を早期に説明する。求人の非公開案件の保有をアピールすることが差別化に有効。',

  dfcxBaseline: {
    defaultFlowName: 'HR Agent Outbound Followup Flow',
    extraIntents: [
      {
        displayName: 'intent.objection.not_actively_searching',
        trainingPhrases: [
          'まだ転職する気はない',
          'すぐに動かない',
          '今の会社に不満はない',
          'まだ情報収集だけ',
        ],
        targetPage: 'objection_handling',
        fulfillmentMessage: 'もちろんです、情報収集だけでも全く問題ございません。市場動向のご共有や非公開求人のご紹介だけのご面談も可能です。',
      },
      {
        displayName: 'intent.objection.busy_at_work',
        trainingPhrases: [
          '今仕事中',
          '電話できる時間がない',
          '忙しくて話せない',
          '在職中で動きにくい',
        ],
        targetPage: 'objection_handling',
        fulfillmentMessage: '失礼しました。夜間や休日もオンラインで面談可能ですので、ご都合の良い時間帯をお聞かせいただけますか？',
      },
      {
        displayName: 'intent.objection.distrust_agent',
        trainingPhrases: [
          'エージェントは信用できない',
          '無理に転職を勧められそう',
          '前のエージェントに嫌な思いをした',
        ],
        targetPage: 'objection_handling',
        fulfillmentMessage: '無理にお勧めすることはございません。市場価値の客観的な分析だけでもお持ち帰りいただけます。',
      },
    ],
    transferIntent: {
      displayName: 'intent.transfer.consultant',
      trainingPhrases: [
        'コンサルタントに代わって',
        '担当者と話したい',
        '面談を予約したい',
        '詳しく聞きたい',
      ],
      targetPage: 'transfer',
      fulfillmentMessage: 'キャリアコンサルタントにおつなぎいたします。少々お待ちください。',
    },
    repromptOverrides: {
      '1': '恐れ入ります、もう一度お聞かせください。',
      '2': 'お電話が遠いようです。ゆっくりお話しいただけますか？',
      '3': '担当コンサルタントから折り返しご連絡させていただきます。',
    },
  },
};
