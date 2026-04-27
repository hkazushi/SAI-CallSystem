import type { Template } from '../types';

export const hikariOb: Template = {
  id: 'hikari-ob',
  industry: 'hikari',
  direction: 'outbound',
  displayName: '光回線・乗り換え営業',
  description: '光コラボ事業者からの乗り換え営業アウトバウンド。新規獲得とキャッシュバック訴求が主軸。',

  defaultFirstMessage:
    'お世話になっております、光回線乗り換えのご案内で○○サービスと申します。30 秒ほどお時間よろしいでしょうか？',

  defaultPersona: {
    tone: '丁寧でハキハキした営業トーン。早口すぎず聞き取りやすさ重視。数字を出して具体的に話す。',
    doNots: [
      '「必ず安くなります」など価格確約の表現は禁止',
      '工事日程を電話口で勝手に約束しない',
      '個人情報を電話口で完全にヒアリングしきろうとしない（アポ取り→後日詳細）',
      '競合サービスの誹謗中傷は行わない',
    ],
  },

  defaultHearingFields: [
    { key: 'current_carrier', label: '現在の通信キャリア', type: 'string', required: true, description: '乗り換え前の回線事業者名' },
    { key: 'monthly_cost', label: '現在の月額料金（円）', type: 'number', required: true, description: '差額訴求のために必須' },
    { key: 'contract_end_month', label: '契約満了時期', type: 'string', required: false, description: '更新月に合わせたアプローチのため' },
    { key: 'house_type', label: '住居形態', type: 'enum', required: true, options: ['戸建て', 'マンション', 'アパート'], description: '光回線の工事方式が変わる' },
    { key: 'smartphone_carrier', label: 'スマホキャリア', type: 'enum', required: false, options: ['ドコモ', 'au', 'ソフトバンク', '楽天', 'その他'], description: 'セット割提案に活用' },
    { key: 'appointment_preference', label: '面談・折返し希望時間帯', type: 'string', required: true, description: '次ステップのアポ設定用' },
  ],

  typicalObjections: [
    {
      trigger: '今の回線で満足している',
      suggestedResponses: [
        '差額を比較してみませんか？現在の月額料金を教えていただければ、具体的にいくら安くなるかその場でお出しします。',
        'それは何よりです。ちなみに今お支払いはいくらですか？同じサービスでもっとお得なプランがあるかもしれません。',
      ],
    },
    {
      trigger: '営業電話は断っている',
      suggestedResponses: [
        'そうですよね、申し訳ありません。30 秒だけの無料料金診断だけでもいかがですか？それでご興味なければすぐ切っていただいて大丈夫です。',
        'ご不快をおかけします。今回はご案内だけで勧誘はしませんので、一言だけ聞いていただけますか？',
      ],
    },
    {
      trigger: '忙しいので今は無理',
      suggestedResponses: [
        '失礼しました。何時ごろでしたらお時間取れそうですか？改めて折り返しさせていただきます。',
        'かしこまりました。資料だけメールかLINEでお送りしてもよろしいでしょうか？',
      ],
    },
    {
      trigger: '工事が面倒くさい',
      suggestedResponses: [
        '工事は基本的に半日以内で終わります。また立会いが必要な時間帯もご希望に合わせられますので、ご安心ください。',
        '工事不要のホームルーター型プランもございます。コンセントに差すだけですので、もし工事なしをご希望でしたらそちらもご案内できます。',
      ],
    },
    {
      trigger: '契約期間の縛りが嫌だ',
      suggestedResponses: [
        '最近は縛りなし・違約金なしのプランも増えています。もし縛りなしをご希望でしたら、そちらのプランをご案内できます。',
        '今のご契約の更新時期に合わせれば違約金なく移れるケースが多いです。今の契約満了はいつ頃ですか？',
      ],
    },
    {
      trigger: '光コラボは品質が悪いと聞いた',
      suggestedResponses: [
        '光コラボはNTTの回線をそのまま使いますので、物理的な回線品質は変わりません。速度が落ちる場合は機器の設定が原因なことが多く、サポートで解決できます。',
        'ご不安はもっともです。今なら30日間無料でお試しいただけるプランもありますので、品質をご確認してからご判断いただけます。',
      ],
    },
    {
      trigger: '夫/妻に相談してから決める',
      suggestedResponses: [
        'もちろんです。ご家族でご検討いただく際に資料があると便利かと思いますが、メールかLINEでお送りしてもよろしいでしょうか？',
        'ご家族ご一緒のお時間に改めてご説明することも可能ですが、いかがでしょうか？',
      ],
    },
  ],

  defaultClosingTechnique:
    '診断結果提示→見積もり郵送またはメール送付同意→後日フィールドセールスからの訪問またはオンラインアポ取得、の 2 ステップクロージング。電話で契約完結を目指さず「資料を送らせていただく」形で次ステップに繋げる。',

  transferConditions: [
    '顧客が「契約したい」と明確に意思表示した場合',
    '工事日程・機器仕様など複雑な技術的質問が来た場合',
    'クレーム対応と判断される強い苛立ちや怒りの場合',
    '法人契約の詳細条件の交渉が必要な場合',
  ],

  attributes: [
    {
      key: 'target_segment',
      label: 'ターゲット層',
      values: [
        { value: 'individual', label: '個人（戸建て）' },
        { value: 'apartment', label: '集合住宅居住者' },
        { value: 'corporate_small', label: '小規模法人' },
      ],
    },
    {
      key: 'campaign_type',
      label: 'キャンペーン種別',
      values: [
        { value: 'cashback', label: 'キャッシュバック訴求' },
        { value: 'speed_upgrade', label: '回線速度訴求' },
        { value: 'bundle', label: 'スマホセット割訴求' },
      ],
    },
  ],

  industryKnowledgeBrief:
    '光回線アウトバウンドは、光コラボレーション（光コラボ）事業者からの乗り換え営業が主流。主要訴求ポイントは「キャッシュバック」「月額値下げ」「スマホセット割」の 3 つ。競合認識はNTT（フレッツ光）・ソフトバンク光・auひかり・ドコモ光が多い。現在の月額料金を聞いて差額訴求するのが王道。法人向け小規模店舗は法人プランの存在を知らないケースが多く狙い目。成約率は業界平均 1〜3% で、電話完結より「資料送付＋後日訪問」の 2 ステップが定番。住居形態（戸建て/集合住宅）で工事方法が変わり、マンションは管理組合との契約状況を必ず確認する。',

  dfcxBaseline: {
    defaultFlowName: 'Hikari Outbound Sales Flow',
    extraIntents: [
      {
        displayName: 'intent.objection.satisfied_with_current',
        trainingPhrases: [
          '今の回線で満足してる',
          '今のままでいい',
          '変えるつもりはない',
          '今のキャリアで満足しています',
          '不満はありません',
        ],
        targetPage: 'objection_handling',
        fulfillmentMessage: '差額を比較してみませんか？現在の月額料金を教えていただければ、具体的にいくら安くなるかその場でお出しします。',
      },
      {
        displayName: 'intent.objection.installation_hassle',
        trainingPhrases: [
          '工事が面倒',
          '工事は嫌',
          '工事はしたくない',
          '工事が大変そう',
        ],
        targetPage: 'objection_handling',
        fulfillmentMessage: '工事は基本的に半日以内で終わります。工事不要のホームルーター型プランもございますのでご安心ください。',
      },
      {
        displayName: 'intent.objection.contract_lock',
        trainingPhrases: [
          '縛りが嫌',
          '契約期間が長い',
          '違約金が心配',
          '解約金がかかる',
        ],
        targetPage: 'objection_handling',
        fulfillmentMessage: '最近は縛りなし・違約金なしのプランも増えています。今のご契約満了時期に合わせれば違約金なく移れるケースが多いです。',
      },
      {
        displayName: 'intent.objection.consult_family',
        trainingPhrases: [
          '家族に相談する',
          '夫に相談する',
          '妻に相談する',
          '一人で決められない',
        ],
        targetPage: 'objection_handling',
        fulfillmentMessage: 'もちろんです。ご家族でご検討いただく際の資料をメールかLINEでお送りしてもよろしいでしょうか？',
      },
    ],
    transferIntent: {
      displayName: 'intent.transfer.hikari',
      trainingPhrases: [
        '担当者に代わって',
        '人間と話したい',
        '契約したい',
        '工事のことを詳しく知りたい',
        'オペレーターをお願いします',
      ],
      targetPage: 'transfer',
      fulfillmentMessage: '担当者におつなぎいたします。少々お待ちください。',
    },
    repromptOverrides: {
      '1': '恐れ入ります、お電話が遠いようです。もう一度お願いできますか？',
      '2': 'すみません、もう一度ゆっくりお話しいただけますでしょうか？',
      '3': '何度も申し訳ございません。担当者からあらためてお電話させていただきます。',
    },
  },
};
