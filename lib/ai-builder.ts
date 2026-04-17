// AI Builder: Converts project settings into Vapi.ai / Dialogflow CX configs

export interface AgentPersona {
  agentName: string;
  speakingStyle: "polite" | "casual" | "formal";
  language: "ja" | "en";
  introSelf: string; // "田中と申します" etc.
}

export interface ScenarioRule {
  id: string;
  trigger: string;       // "価格を聞いてきた場合"
  triggerKeywords: string[];
  response: string;      // AIの応答内容
  action: "continue" | "propose_appointment" | "transfer" | "end_success" | "end_fail";
  actionLabel: string;
}

export interface EscalationRule {
  id: string;
  condition: string;     // "強い拒否" etc.
  keywords: string[];
  action: "transfer" | "callback" | "end";
  transferNumber?: string;
  message: string;       // AIが言う言葉
}

export interface CallSettings {
  persona: AgentPersona;
  companyName: string;
  productName: string;
  pricing: string;
  targetCustomer: string;
  keyFeatures: string[];
  firstMessage: string;
  scenarios: ScenarioRule[];
  faqs: { q: string; a: string }[];
  escalations: EscalationRule[];
  successCondition: string;
  maxCallDuration: number; // seconds
  voice: {
    voiceId: string;
    speed: number;
    gender: "male" | "female";
  };
}

// ── Vapi.ai ──────────────────────────────────────────────────────────────────

export function buildVapiSystemPrompt(s: CallSettings): string {
  const styleMap = {
    polite: "丁寧で親しみやすい",
    casual: "フレンドリーでカジュアルな",
    formal: "フォーマルでプロフェッショナルな",
  };

  const scenarioBlock = s.scenarios.length > 0
    ? `\n## 会話シナリオ（条件別対応）\n` +
      s.scenarios.map((r, i) =>
        `### シナリオ${i + 1}: ${r.trigger}\nキーワード: ${r.triggerKeywords.join(", ") || "(なし)"}\n応答: ${r.response}\nアクション: ${r.actionLabel}`
      ).join("\n\n")
    : "";

  const faqBlock = s.faqs.length > 0
    ? `\n## よくある質問\n` +
      s.faqs.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n")
    : "";

  const escalationBlock = s.escalations.length > 0
    ? `\n## エスカレーション（有人転送）ルール\n` +
      s.escalations.map((e) =>
        `- 条件: ${e.condition}（キーワード: ${e.keywords.join(", ") || "(なし)"}）\n  応答: "${e.message}"\n  アクション: ${e.action === "transfer" ? `${e.transferNumber ?? "担当者"}へ転送` : e.action === "callback" ? "折り返し約束" : "通話終了"}`
      ).join("\n")
    : "";

  return `# システムプロンプト（${s.productName} / ${s.companyName}）

## あなたの役割
あなたは${s.companyName}の${styleMap[s.persona.speakingStyle]}AIオペレーター「${s.persona.agentName}」です。
${s.productName}のご案内・お問い合わせ対応を担当しています。

## 商材情報
- 製品名: ${s.productName}
- 価格: ${s.pricing || "要お問い合わせ"}
- ターゲット: ${s.targetCustomer}
- 特長:
${s.keyFeatures.map((f) => `  • ${f}`).join("\n")}

## 基本ルール
1. 常に${styleMap[s.persona.speakingStyle]}口調で話す
2. 相手の言葉をよく聞き、適切なシナリオに誘導する
3. 不明な質問は正直に「確認してご連絡します」と伝える
4. 個人情報は適切に扱い、録音中であることを意識する
5. 通話時間の目安: ${Math.floor(s.maxCallDuration / 60)}分以内
6. 成功条件: ${s.successCondition || "アポイントメントの取得または資料送付の合意"}
${scenarioBlock}
${faqBlock}
${escalationBlock}

## 禁止事項
- 虚偽の情報を伝えること
- 過度な圧力をかけること
- 競合他社を否定すること
- 個人情報を不必要に収集すること`;
}

export function buildVapiAssistantConfig(s: CallSettings, systemPrompt: string) {
  return {
    name: `${s.productName} - ${s.persona.agentName}`,
    model: {
      provider: "openai",
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
      ],
      temperature: 0.4,
    },
    voice: {
      provider: "google",
      voiceId: s.voice.voiceId,
      speed: s.voice.speed,
    },
    firstMessage: s.firstMessage,
    firstMessageMode: "assistant-speaks-first",
    transcriber: {
      provider: "deepgram",
      model: "nova-2",
      language: "ja",
    },
    endCallMessage: "ありがとうございました。失礼いたします。",
    endCallPhrases: ["失礼します", "ありがとうございました", "また連絡します"],
    maxDurationSeconds: s.maxCallDuration,
    silenceTimeoutSeconds: 10,
    backgroundSound: "office",
    backgroundDenoisingEnabled: true,
    analysisPlan: {
      summaryPrompt: "この通話の要約を日本語で200字以内で作成してください。成功したかどうかも含めてください。",
      successEvaluationPrompt: `この通話は「${s.successCondition || "アポイントメントの取得または資料送付"}」を達成できましたか？`,
      successEvaluationRubric: "PassFail",
    },
  };
}

// ── Dialogflow CX ─────────────────────────────────────────────────────────────

export function buildDialogflowConfig(s: CallSettings) {
  const intents = [
    {
      displayName: "pricing_inquiry",
      trainingPhrases: [
        "料金はいくらですか",
        "価格を教えてください",
        "いくらかかりますか",
        "費用は",
        ...(s.scenarios.find((r) => r.trigger.includes("価格"))?.triggerKeywords ?? []),
      ],
      messages: [
        s.faqs.find((f) => f.q.includes("料金"))?.a ??
          `${s.productName}は${s.pricing}でご利用いただけます。`,
      ],
    },
    {
      displayName: "appointment_request",
      trainingPhrases: [
        "詳しく聞きたい",
        "担当者と話したい",
        "アポを取りたい",
        "訪問してほしい",
      ],
      messages: ["ありがとうございます。ご都合のよい日時をお教えいただけますか？"],
    },
    {
      displayName: "rejection",
      trainingPhrases: [
        "いりません",
        "必要ありません",
        "興味ありません",
        "結構です",
        "断ります",
      ],
      messages: [
        "そうですか。お時間をいただきありがとうございました。またのご連絡をお待ちしております。",
      ],
    },
    ...s.scenarios.map((r) => ({
      displayName: `scenario_${r.id}`,
      trainingPhrases: r.triggerKeywords,
      messages: [r.response],
    })),
    ...s.faqs.map((f, i) => ({
      displayName: `faq_${i}`,
      trainingPhrases: [f.q, f.q.replace("？", "").replace("?", "")],
      messages: [f.a],
    })),
  ];

  return {
    displayName: s.productName,
    defaultLanguageCode: "ja",
    timeZone: "Asia/Tokyo",
    startFlow: {
      displayName: "Default Start Flow",
      pages: [
        {
          displayName: "START",
          entryFulfillment: { messages: [{ text: { text: [s.firstMessage] } }] },
          transitionRoutes: intents.map((intent) => ({
            intent: intent.displayName,
            triggerFulfillment: { messages: [{ text: { text: intent.messages } }] },
          })),
        },
      ],
    },
    intents,
  };
}

export const DEFAULT_SCENARIOS: ScenarioRule[] = [
  {
    id: "s1",
    trigger: "価格・料金について聞いてきた場合",
    triggerKeywords: ["料金", "価格", "いくら", "費用", "コスト"],
    response: "ありがとうございます。料金については{{pricing}}となっております。初期費用は一切かかりません。",
    action: "continue",
    actionLabel: "詳細説明を続ける",
  },
  {
    id: "s2",
    trigger: "他社製品・競合を比較してきた場合",
    triggerKeywords: ["他社", "競合", "比べて", "違い", "比較"],
    response: "ありがとうございます。弊社の強みは{{key_features}}です。具体的にご比較いただくために、一度デモをご覧いただけませんか？",
    action: "propose_appointment",
    actionLabel: "デモ・アポを提案する",
  },
  {
    id: "s3",
    trigger: "今は忙しいと言われた場合",
    triggerKeywords: ["忙しい", "時間がない", "今は無理", "後にして"],
    response: "失礼しました。それでは改めてご連絡させていただいてよろしいでしょうか？ご都合のよい日時をお教えください。",
    action: "continue",
    actionLabel: "折り返し日時を確認する",
  },
  {
    id: "s4",
    trigger: "興味あり・もっと詳しく聞きたいと言われた場合",
    triggerKeywords: ["詳しく", "教えて", "興味がある", "もう少し", "聞かせて"],
    response: "ありがとうございます！ぜひ詳しくご説明させてください。具体的な事例もご紹介できますが、担当者からご連絡してもよろしいでしょうか？",
    action: "propose_appointment",
    actionLabel: "アポイントメントを提案する",
  },
];

export const DEFAULT_ESCALATIONS: EscalationRule[] = [
  {
    id: "e1",
    condition: "強い怒り・クレームが発生した場合",
    keywords: ["クレーム", "怒り", "謝れ", "責任者", "おかしい", "詐欺"],
    action: "transfer",
    transferNumber: "0120-000-001",
    message: "大変失礼いたしました。担当の者に代わります。少々お待ちください。",
  },
  {
    id: "e2",
    condition: "担当者・人間との会話を求められた場合",
    keywords: ["人間と話したい", "担当者", "オペレーター", "AIじゃなくて"],
    action: "transfer",
    transferNumber: "0120-000-001",
    message: "承知しました。担当者におつなぎします。少々お待ちください。",
  },
  {
    id: "e3",
    condition: "明確な拒否・断りが3回以上あった場合",
    keywords: ["必要ない", "もう電話しないで", "迷惑", "登録抹消"],
    action: "end",
    message: "承知しました。大変失礼いたしました。今後はご連絡を控えさせていただきます。ありがとうございました。",
  },
];
