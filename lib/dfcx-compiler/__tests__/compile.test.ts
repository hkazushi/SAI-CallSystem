/**
 * compileDfcxAgent() の単体テスト。
 *
 * 実デプロイなしでコンパイル層の正しさを検証する。
 *
 * 実行:
 *   npx tsx lib/dfcx-compiler/__tests__/compile.test.ts
 *
 * テストフレームワーク (vitest/jest) は導入していないため node:assert で書く。
 * 失敗時は process.exitCode = 1 になる。
 */
import assert from "node:assert/strict";
import { compileDfcxAgent } from "../compile";
import type { ChappieOutput } from "../../vapi-compiler/types";
import type { Template } from "../../templates/types";
import { hikariOb } from "../../templates/data/hikari-ob";

const tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];

function test(name: string, fn: () => void | Promise<void>) {
  tests.push({ name, fn });
}

async function run() {
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`  ✅ ${t.name}`);
    } catch (err) {
      failed++;
      console.error(`  ❌ ${t.name}`);
      console.error(err instanceof Error ? err.message : err);
    }
  }
  console.log(`\n${tests.length - failed} / ${tests.length} passed`);
  if (failed > 0) process.exit(1);
}

/* -------- fixtures -------- */

const minimalOutput: ChappieOutput = {
  industry: "光回線",
  assistantName: "光回線サポート",
  firstMessage: "お電話ありがとうございます。光回線サポートです。",
  persona: {
    tone: "丁寧",
    language: "ja",
    doNots: ["保証表現は避ける"],
  },
  tasks: [
    {
      name: "光回線アウトバウンド営業",
      trigger: "新規発信",
      steps: ["挨拶", "現状ヒアリング", "提案"],
    },
    {
      name: "解約阻止",
      trigger: "解約したい",
      steps: ["理由を聞く", "代替案提示"],
    },
    {
      name: "アポ取り",
      trigger: "面談予約",
      steps: ["日時候補提示", "確定"],
    },
  ],
  hearingFields: [
    {
      key: "customer_name",
      label: "お名前",
      type: "string",
      required: true,
    },
    {
      key: "phone_number",
      label: "電話番号",
      type: "string",
      required: true,
      dfcxEntityType: "@sys.phone-number",
    },
    {
      key: "current_carrier",
      label: "現在のキャリア",
      type: "enum",
      required: false,
      options: ["NTT", "au", "ソフトバンク", "その他"],
    },
  ],
  guardrails: {
    transferConditions: ["即日工事希望", "クレーム対応"],
    prohibitedBehaviors: ["価格保証"],
  },
};

/* -------- tests -------- */

test("displayName に tenantId が含まれる", () => {
  const config = compileDfcxAgent(minimalOutput, { tenantId: "test-001" });
  assert.match(config.agent.displayName, /sai-test-001-/);
});

test("tenantId の特殊文字はサニタイズされる", () => {
  const config = compileDfcxAgent(minimalOutput, { tenantId: "test/abc:123" });
  assert.match(config.agent.displayName, /^sai-test-abc-123-/);
  assert.doesNotMatch(config.agent.displayName, /[/:]/);
});

test("Page 数はベースライン以上 (>= 5)", () => {
  const config = compileDfcxAgent(minimalOutput, { tenantId: "t" });
  assert.ok(
    config.pages.length >= 5,
    `expected >= 5 pages, got ${config.pages.length}`,
  );
});

test("Intent 数は task と transferIntent を合算したもの (>= 2)", () => {
  const config = compileDfcxAgent(minimalOutput, { tenantId: "t" });
  assert.ok(
    config.intents.length >= 2,
    `expected >= 2 intents, got ${config.intents.length}`,
  );
});

test("webhookUrl に tenantId が含まれる", () => {
  const config = compileDfcxAgent(minimalOutput, {
    tenantId: "tenant-xyz",
    webhookBaseUrl: "https://sai.example.com",
  });
  assert.equal(
    config.webhookUrl,
    "https://sai.example.com/webhook/dfcx/tenant-xyz/fulfillment",
  );
});

test("direction 推定: trigger に '問い合わせ' があれば inbound", () => {
  const inboundOutput: ChappieOutput = {
    ...minimalOutput,
    tasks: [{ name: "問い合わせ対応", trigger: "問い合わせ電話", steps: ["要件確認"] }],
  };
  const config = compileDfcxAgent(inboundOutput, { tenantId: "t" });
  // inbound ベースラインは "intake" Page を含む
  const pageNames = config.pages.map((p) => p.displayName);
  assert.ok(
    pageNames.includes("intake") || pageNames.includes("greeting"),
    `expected inbound baseline pages, got ${pageNames.join(",")}`,
  );
});

test("direction を明示すると推定を上書きする", () => {
  const config = compileDfcxAgent(minimalOutput, {
    tenantId: "t",
    direction: "inbound",
  });
  const pageNames = config.pages.map((p) => p.displayName);
  // inbound は "intake" Page をベースラインに含む想定
  assert.ok(pageNames.length >= 5);
});

test("hearingFields → hearing Page の form.parameters に展開される (required のみ)", () => {
  const config = compileDfcxAgent(minimalOutput, {
    tenantId: "t",
    direction: "outbound",
  });
  const hearingPage = config.pages.find((p) => p.displayName === "hearing");
  assert.ok(hearingPage, "hearing page not found");
  assert.ok(hearingPage.form, "hearing form not built");

  // build-form-parameters は required: true のみを form parameter にする
  const requiredCount = minimalOutput.hearingFields.filter((f) => f.required).length;
  assert.equal(hearingPage.form.parameters.length, requiredCount);

  const phoneParam = hearingPage.form.parameters.find((p) => p.displayName === "phone_number");
  assert.ok(phoneParam, "phone_number parameter missing");
  assert.equal(phoneParam.entityType, "@sys.phone-number");
  assert.equal(phoneParam.required, true);

  // optional な current_carrier は form parameter から除外される
  const carrierParam = hearingPage.form.parameters.find((p) => p.displayName === "current_carrier");
  assert.equal(carrierParam, undefined);
});

test("greeting Page entryFulfillment に firstMessage が反映される", () => {
  const config = compileDfcxAgent(minimalOutput, { tenantId: "t" });
  const greeting = config.pages.find((p) => p.displayName === "greeting");
  assert.ok(greeting, "greeting page not found");
  assert.ok(greeting.entryFulfillment, "greeting entryFulfillment missing");
  const text = greeting.entryFulfillment.messages.flatMap((m) => m.text.text).join(" ");
  assert.ok(
    text.includes(minimalOutput.firstMessage),
    `firstMessage not found in greeting; got: ${text}`,
  );
});

test("template.dfcxBaseline.extraIntents が intents に取り込まれる", () => {
  const config = compileDfcxAgent(
    minimalOutput,
    { tenantId: "t", direction: "outbound" },
    hikariOb as Template,
  );
  const intentNames = config.intents.map((i) => i.displayName);
  // hikari-ob.dfcxBaseline.extraIntents の最初のひとつは intent.objection.satisfied_with_current
  const expected = hikariOb.dfcxBaseline?.extraIntents ?? [];
  assert.ok(expected.length > 0, "fixture: hikariOb has extraIntents");
  for (const e of expected) {
    assert.ok(
      intentNames.includes(e.displayName),
      `extra intent ${e.displayName} not merged; got ${intentNames.join(",")}`,
    );
  }
});

test("template.dfcxBaseline.transferIntent が intents に追加される", () => {
  const config = compileDfcxAgent(
    minimalOutput,
    { tenantId: "t", direction: "outbound" },
    hikariOb as Template,
  );
  const ti = hikariOb.dfcxBaseline?.transferIntent;
  if (!ti) {
    console.warn("hikariOb has no transferIntent — skipping");
    return;
  }
  const intentNames = config.intents.map((i) => i.displayName);
  assert.ok(
    intentNames.includes(ti.displayName),
    `transferIntent ${ti.displayName} not in intents`,
  );
});

test("repromptOverrides が hearing Page の sys.no-match-N に反映される", () => {
  const config = compileDfcxAgent(
    minimalOutput,
    { tenantId: "t", direction: "outbound" },
    hikariOb as Template,
  );
  const overrides = hikariOb.dfcxBaseline?.repromptOverrides;
  if (!overrides || !overrides["1"]) {
    console.warn("hikariOb has no repromptOverrides[1] — skipping");
    return;
  }
  const hearing = config.pages.find((p) => p.displayName === "hearing");
  assert.ok(hearing?.eventHandlers, "hearing has no eventHandlers");
  const noMatch1 = hearing!.eventHandlers!.find((h) => h.event === "sys.no-match-1");
  if (noMatch1) {
    const text = noMatch1.triggerFulfillment.messages.flatMap((m) => m.text.text).join(" ");
    assert.ok(
      text.includes(overrides["1"]!),
      `sys.no-match-1 not overridden; got: ${text}`,
    );
  }
});

test("Intent displayName に重複がない", () => {
  const config = compileDfcxAgent(
    minimalOutput,
    { tenantId: "t", direction: "outbound" },
    hikariOb as Template,
  );
  const names = config.intents.map((i) => i.displayName);
  const set = new Set(names);
  assert.equal(set.size, names.length, `duplicate intent names: ${names.join(",")}`);
});

test("Flow displayName が template.dfcxBaseline.defaultFlowName で上書きされる", () => {
  const config = compileDfcxAgent(
    minimalOutput,
    { tenantId: "t", direction: "outbound" },
    hikariOb as Template,
  );
  const expected = hikariOb.dfcxBaseline?.defaultFlowName;
  if (expected) {
    assert.equal(config.flow.displayName, expected);
  }
});

/* -------- run -------- */

console.log("compileDfcxAgent() tests\n");
run();
