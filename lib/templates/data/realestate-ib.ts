import type { Template } from '../types';

export const realestateIb: Template = {
  id: 'realestate-ib',
  industry: 'real_estate',
  direction: 'inbound',
  displayName: '不動産・物件問い合わせ対応',
  description: 'ポータルや広告からの物件問い合わせ対応。希望条件の詳細ヒアリングと来店・内覧アポ獲得が目的。',

  defaultFirstMessage:
    'お電話ありがとうございます。○○不動産でございます。本日はどのような物件をお探しでしょうか？',

  defaultPersona: {
    tone: '親切で頼れる不動産相談窓口。顧客の漠然とした希望を引き出して具体化する。専門用語は噛み砕いて、初めて物件を探す人でも安心できる対応。',
    doNots: [
      '物件の欠陥・瑕疵を隠したり軽視したりしない',
      '「絶対に値引きできます」など確定事項でないことを断言しない',
      '物件の正確な空き状況を把握していない段階で「あります」と言わない',
      '周辺環境（学校・騒音等）について偏った情報を提供しない',
    ],
  },

  defaultHearingFields: [
    { key: 'inquiry_property', label: '問い合わせ物件（物件名・番号）', type: 'string', required: false, description: '広告・ポータル経由の場合' },
    { key: 'search_area', label: '希望エリア・沿線', type: 'string', required: true, description: '物件マッチングの基本情報' },
    { key: 'property_type', label: '希望物件種別', type: 'enum', required: true, options: ['マンション', '一戸建て', '土地', 'アパート（賃貸）', '収益物件'], description: '対応部門・担当者振り分け' },
    { key: 'budget', label: '予算（万円）', type: 'string', required: true, description: '紹介できる物件レンジの把握' },
    { key: 'desired_size', label: '希望の広さ・間取り', type: 'string', required: false, description: '物件絞り込み用' },
    { key: 'move_in_time', label: '入居希望時期', type: 'enum', required: true, options: ['すぐ', '1〜3 ヶ月', '半年以内', '1 年以内', 'まだ未定'], description: '案件の優先度づけ' },
    { key: 'has_pre_loan_approval', label: '住宅ローン事前審査の有無', type: 'enum', required: false, options: ['済み', '未実施', 'わからない'], description: '具体的な商談進行度の判断' },
    { key: 'visit_availability', label: '内覧・来店できる時間帯', type: 'string', required: true, description: 'アポ設定用' },
  ],

  typicalObjections: [
    {
      trigger: 'まずメールで資料だけほしい',
      suggestedResponses: [
        'もちろんです。資料をお送りします。合わせて、お送りする物件の中からご希望に近いものをピックアップしたいので、希望エリアと予算だけ教えていただけますか？',
        '資料をお送りします。内容についてご質問があれば、いつでもご連絡ください。お電話でも担当者がご説明します。',
      ],
    },
    {
      trigger: '問い合わせた物件はもう売れたか？',
      suggestedResponses: [
        '現在の販売状況を確認いたします。少々お待ちください。……確認しました、現在（販売中/商談中/成約済み）です。もし（商談中/成約済み）の場合、似た条件の物件をご紹介できますが、いかがでしょうか？',
      ],
    },
    {
      trigger: '予算が足りないかもしれない',
      suggestedResponses: [
        'ご予算の範囲でも選択肢はたくさんあります。エリアを少し広げたり間取りを調整すると条件内で見つかることが多いです。住宅ローンのシミュレーションも一緒にしましょうか？',
        '月々の支払いで考えると、案外ご希望の物件も手が届くことがあります。現在の家賃か月の支払い上限をお教えいただければ、目安をお出しできます。',
      ],
    },
    {
      trigger: 'たくさんの会社に問い合わせしているので、営業が来るのが嫌',
      suggestedResponses: [
        'ご理解いただけます。弊社は一度ご来店いただければ、複数物件を一括でご紹介します。個別にしつこくご連絡する対応はいたしません。来店を一度試していただけますか？',
      ],
    },
    {
      trigger: 'リノベーション物件を探している',
      suggestedResponses: [
        'リノベーション済み物件も取り扱いがあります。また、ご自身でリノベされたい場合は、「リノベ向き中古マンション」という観点でのご提案もできます。どちらのイメージに近いですか？',
      ],
    },
    {
      trigger: '土地から建てたい',
      suggestedResponses: [
        '土地の取り扱いもございます。建築会社のご紹介も合わせてできますので、土地を購入してから建てるまでをトータルでサポートできます。ご希望のエリアはありますか？',
      ],
    },
    {
      trigger: '内覧後に考える',
      suggestedResponses: [
        'もちろんです。内覧後にじっくりご検討ください。人気物件は内覧後に即申し込みが入ることもありますので、気に入った際にはお早めにご連絡ください。内覧はいつご都合がよいですか？',
      ],
    },
  ],

  defaultClosingTechnique:
    '電話口での詳細ヒアリングから「専任担当が物件をセレクトしてご来店時にご提案」のフローを説明し、来店または内覧アポを確定させる。来店が困難な場合はオンライン相談を代替として提示。アポ日時・担当者名・確認方法を明確に伝えてクロージング。',

  transferConditions: [
    '物件の詳細・現況について具体的な確認が必要な場合（担当者へ）',
    '住宅ローン・資金計画の詳細相談が必要な場合（FP担当へ）',
    '複数棟・大規模投資の問い合わせで投資部門が必要な場合',
    '顧客が感情的になっているかクレームを述べている場合',
  ],

  attributes: [
    {
      key: 'property_type',
      label: '主に扱う物件種別',
      values: [
        { value: 'mansion', label: '分譲マンション' },
        { value: 'house', label: '一戸建て' },
        { value: 'rental', label: '賃貸（アパート・マンション）' },
        { value: 'investment', label: '投資・収益物件' },
      ],
    },
    {
      key: 'region',
      label: '対応エリア',
      values: [
        { value: 'urban', label: '首都圏・大都市圏' },
        { value: 'suburban', label: '郊外・地方都市' },
        { value: 'resort', label: 'リゾート・別荘地' },
      ],
    },
  ],

  industryKnowledgeBrief:
    '不動産インバウンドは「来店させること」が成約への最短経路。電話問い合わせの段階では条件が漠然としていることが多く、ヒアリングで具体化しながら「専任担当が最適な物件を選んでご提案する」という付加価値を説明して来店動機を作る。物件の空き状況確認は即時が基本（ポータルと実在庫のタイムラグがある）。住宅ローン相談を同時に提供できると来店率が向上する。投資目的の顧客は利回り・返済計算の専門性を求めるため、専用担当への橋渡しが必要。',
};
