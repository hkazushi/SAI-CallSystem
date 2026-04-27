import type { Template } from '../types';

export const realestateOb: Template = {
  id: 'realestate-ob',
  industry: 'real_estate',
  direction: 'outbound',
  displayName: '不動産・反響後の追客／来店促進',
  description: 'ポータルサイト等からの反響（問い合わせ）後の追客アウトバウンド。来店アポ取りと検討温度確認が主軸。',

  defaultFirstMessage:
    'お世話になっております。先日○○物件へお問い合わせいただきました○○不動産の○○でございます。ご状況はいかがでしょうか？少しだけお時間よろしいでしょうか？',

  defaultPersona: {
    tone: '親切で知識豊かな不動産アドバイザー像。押しつけがましくなく、顧客のペースに合わせた提案。物件知識を示しつつ「一緒に考える」姿勢。',
    doNots: [
      '物件情報の虚偽説明（現況と異なる内容）は厳禁',
      '「絶対に損しない投資です」など断定的な利益保証は禁止',
      '個人の資産状況・収入を電話口で詳細に聞き出しすぎない',
      '他社の物件を根拠なく否定しない',
      'ローン審査の結果を事前に確約しない',
    ],
  },

  defaultHearingFields: [
    { key: 'inquiry_property', label: '問い合わせ物件名・物件番号', type: 'string', required: true, description: '追客の起点情報' },
    { key: 'purchase_purpose', label: '購入目的', type: 'enum', required: true, options: ['マイホーム', '投資用', '親への購入', '住み替え', 'まだ検討中'], description: 'ニーズ把握と提案方向の決定' },
    { key: 'search_area', label: '希望エリア', type: 'string', required: true, description: '近隣物件の紹介可否確認' },
    { key: 'budget_range', label: '予算感（万円）', type: 'string', required: true, description: '紹介できる物件レンジの把握' },
    { key: 'timeline', label: '検討・購入時期', type: 'enum', required: true, options: ['1 ヶ月以内', '3 ヶ月以内', '半年以内', '1 年以内', 'まだ未定'], description: '追客優先度の判断' },
    { key: 'family_situation', label: '家族構成・ライフスタイル', type: 'string', required: false, description: '間取り・立地のマッチング' },
    { key: 'visit_availability', label: '来店・内覧できる時間帯', type: 'string', required: true, description: 'アポ設定用' },
  ],

  typicalObjections: [
    {
      trigger: 'もう少し自分で調べてから決める',
      suggestedResponses: [
        'もちろんです。ただ、ポータルに出ていない新着物件や価格交渉の余地がある物件は、直接ご連絡いただくと先にご案内できます。連絡先を登録しておいていただいてもよろしいですか？',
        '承知しました。一度ご来店いただくと、ご希望に合った物件を効率的にご紹介できます。無理に決めなくて大丈夫ですので、情報収集の場としてご活用ください。',
      ],
    },
    {
      trigger: 'もう他の物件で決めた',
      suggestedResponses: [
        'それはおめでとうございます。もし今後、売却や住み替えをご検討の際にはぜひお声がけください。',
      ],
    },
    {
      trigger: '予算が合わない',
      suggestedResponses: [
        'ご予算感を教えていただければ、条件に合う別の物件をご提案できます。エリアや間取りを少し変えると選択肢が広がることが多いです。どのくらいの価格帯をお考えですか？',
        'ご予算内でのローンシミュレーションをご一緒に確認する方法もあります。月額返済額で考えると意外と実現できるケースも多いですよ。',
      ],
    },
    {
      trigger: 'まだ急いでいない',
      suggestedResponses: [
        'そうですね。ただ、ご希望エリアの物件は出てきてもすぐに売れることが多いです。条件を教えていただければ、新着が出たときに優先的にご連絡できます。',
        '焦る必要はありません。ただ、内覧だけでも先にされておくと、いざという時の判断が早くなります。土日のご都合はいかがですか？',
      ],
    },
    {
      trigger: 'ローンが組めるか心配',
      suggestedResponses: [
        'ご安心ください。事前審査（事前相談）だけであればご来店いただかなくてもオンラインで確認できます。収入・借入状況を大まかにお教えいただければ、おおよそのご回答ができます。',
        '弊社提携のFP・銀行担当者をご紹介することも可能です。ローン相談だけでも無料でご対応しています。',
      ],
    },
    {
      trigger: 'チラシや電話がしつこくて嫌だ',
      suggestedResponses: [
        'ご迷惑をおかけして申し訳ありません。ご連絡の頻度はご希望に合わせますので、どれくらいの間隔でご連絡すればよいかお教えいただけますか？',
        '以後ご連絡は控えます。何かお探しの際はいつでもお気軽にご連絡ください。',
      ],
    },
    {
      trigger: '内覧が面倒くさい',
      suggestedResponses: [
        '最近はオンライン内覧（動画・VR内覧）で実際に来なくても詳しく確認いただけます。まずオンラインでご覧になってから、気になった物件だけ実際に行くというやり方もできます。',
      ],
    },
  ],

  defaultClosingTechnique:
    '来店・内覧アポの日時確定を最終ゴールとする。「条件ヒアリング→専任担当が物件をセレクト→来店」のフローを説明し、「無料・ノルマなし」であることを強調してアポを取る。来店が難しい顧客にはオンライン相談を代替として提示する。',

  transferConditions: [
    '顧客が「この物件に申し込みたい」と言った場合',
    '住宅ローン審査の詳細な相談が必要な場合',
    '法人・投資案件で複数物件・大規模購入の交渉が必要な場合',
    '顧客が怒りを示すか、コンプライアンス上の問題が生じた場合',
  ],

  attributes: [
    {
      key: 'property_type',
      label: '物件種別',
      values: [
        { value: 'mansion', label: 'マンション（分譲）' },
        { value: 'house', label: '一戸建て' },
        { value: 'investment', label: '投資用収益物件' },
        { value: 'land', label: '土地' },
      ],
    },
    {
      key: 'customer_stage',
      label: '顧客の検討ステージ',
      values: [
        { value: 'hot', label: 'ホット（即内覧希望）' },
        { value: 'warm', label: 'ウォーム（3 ヶ月以内）' },
        { value: 'cold', label: 'コールド（まだ情報収集中）' },
      ],
    },
  ],

  industryKnowledgeBrief:
    '不動産アウトバウンドは「反響追客」が主流で、ポータルサイト（SUUMO・HOME\'S・アットホーム）からの問い合わせ後に 1 時間以内に連絡するのが成約率向上のカギ（業界データでは 1 時間超えると CVR が 40% 低下）。最大の関門は「来店させること」で、来店さえすれば成約率は 20〜30% に達する。検討温度の把握（購入時期・予算・目的）が追客優先度を決める。投資用物件は利回り・入居率・管理費の説明が必要。住み替え案件は売却と購入の同時進行調整が複雑。',

  dfcxBaseline: {
    defaultFlowName: 'Real Estate Outbound Followup Flow',
    extraIntents: [
      {
        displayName: 'intent.objection.just_browsing',
        trainingPhrases: [
          'まだ情報収集の段階',
          'すぐ買うつもりはない',
          '見てるだけ',
          'まだ先の話',
        ],
        targetPage: 'objection_handling',
        fulfillmentMessage: 'もちろんゆっくりご検討ください。条件をお伺いして新着情報だけ定期的にお送りすることも可能ですがいかがでしょうか？',
      },
      {
        displayName: 'intent.objection.budget_concern',
        trainingPhrases: [
          '予算が合わない',
          '高すぎる',
          '住宅ローンが心配',
          '頭金が足りない',
        ],
        targetPage: 'objection_handling',
        fulfillmentMessage: '住宅ローン無料相談も同時にご案内できます。月々のご返済額から逆算してご予算を見直すご提案も可能です。',
      },
      {
        displayName: 'intent.objection.already_viewing',
        trainingPhrases: [
          '他社で見ている',
          '別の不動産会社と話している',
          '既に内覧を予約した',
        ],
        targetPage: 'objection_handling',
        fulfillmentMessage: 'なるほど、ご検討進んでらっしゃるのですね。当社では非公開物件もご紹介できますのでセカンドオピニオンとして活用いただけます。',
      },
    ],
    transferIntent: {
      displayName: 'intent.transfer.agent',
      trainingPhrases: [
        '担当営業に代わって',
        '内覧予約をしたい',
        '物件を見たい',
        '専門の人と話したい',
      ],
      targetPage: 'transfer',
      fulfillmentMessage: '物件担当におつなぎいたします。少々お待ちください。',
    },
    repromptOverrides: {
      '1': '恐れ入ります、もう一度お聞かせいただけますか？',
      '2': 'お電話が遠いようでして、ゆっくりお話しいただけますでしょうか？',
      '3': '担当者から折り返しご連絡させていただきます。',
    },
  },
};
