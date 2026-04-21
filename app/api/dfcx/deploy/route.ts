import { NextRequest, NextResponse } from "next/server";
import { mockProjects } from "@/lib/mock-data";
import { DEFAULT_SCENARIOS, DEFAULT_ESCALATIONS } from "@/lib/ai-builder";
import type { CallSettings } from "@/lib/ai-builder";
import { deployAgent } from "@/lib/dfcx-deploy";
import { DfcxConfigError } from "@/lib/dfcx-client";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel Hobbyの上限

function settingsFromProject(projectId: string): CallSettings {
  const project = mockProjects.find((p) => p.id === projectId) ?? mockProjects[0];
  return {
    persona: { agentName: "田中", speakingStyle: "polite", language: "ja", introSelf: "田中と申します" },
    companyName: "株式会社サンプル",
    productName: project.product_info.product_name,
    pricing: project.product_info.pricing,
    targetCustomer: project.product_info.target_customer,
    keyFeatures: project.product_info.key_features,
    firstMessage: project.first_message,
    scenarios: DEFAULT_SCENARIOS,
    faqs: [
      { q: "料金はいくらですか？", a: `${project.product_info.pricing}でご利用いただけます。` },
      { q: "無料トライアルはありますか？", a: "はい、14日間の無料トライアルをご用意しております。" },
    ],
    escalations: DEFAULT_ESCALATIONS,
    successCondition: "アポイントメントの取得または資料送付の合意",
    maxCallDuration: 300,
    voice: {
      voiceId: project.voice_settings.voice_id,
      speed: project.voice_settings.speed,
      gender: project.voice_settings.gender as "male" | "female",
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, displayName } = await req.json();
    if (!projectId) {
      return NextResponse.json({ error: "projectId が必要です" }, { status: 400 });
    }
    const project = mockProjects.find((p) => p.id === projectId);
    if (!project) {
      return NextResponse.json({ error: "project not found" }, { status: 404 });
    }

    const settings = settingsFromProject(projectId);

    // SSE未対応のシンプル版: 完了までブロック
    const result = await deployAgent(settings, {
      displayNameOverride: displayName ?? `${project.name.replace(/[\s\u3000]/g, "_").slice(0, 40)}_${projectId}`,
    });

    return NextResponse.json({ ok: true, result });
  } catch (e) {
    if (e instanceof DfcxConfigError) {
      return NextResponse.json({ error: e.message, code: "CONFIG_ERROR" }, { status: 400 });
    }
    console.error("[/api/dfcx/deploy]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "deploy failed", code: "DEPLOY_ERROR" },
      { status: 500 },
    );
  }
}
