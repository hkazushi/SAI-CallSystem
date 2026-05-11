// 通話書き起こし リポジトリ
import type { Transcript, UUID } from "@/lib/supabase/types";
import { useDb, nowIso, newId } from "./_helpers";

const memory: Transcript[] = [];

function ensureSeed(callId: UUID, orgId: UUID) {
  if (memory.some((t) => t.call_id === callId)) return;
  const sampleDialog: Array<{ role: Transcript["role"]; text: string }> = [
    { role: "agent", text: "お世話になっております。SAIコールエージェントの田中と申します。少々お時間よろしいでしょうか？" },
    { role: "customer", text: "はい、今ちょうど大丈夫ですよ。" },
    { role: "agent", text: "ありがとうございます。本日は弊社の新サービスのご案内でお電話させていただきました。" },
    { role: "customer", text: "どのようなサービスですか？" },
    { role: "agent", text: "AI音声によるアウトバウンドコールの自動化サービスです。営業効率を3倍に上げた事例もございます。" },
    { role: "customer", text: "なるほど。価格帯はどのくらいですか？" },
    { role: "agent", text: "プランによって異なりますが、月額5万円からとなっております。" },
    { role: "customer", text: "もう少し詳しい資料をいただけますか？" },
    { role: "agent", text: "もちろんです。本日中にメールでお送りいたします。一度お打ち合わせのお時間をいただけますか？" },
    { role: "customer", text: "そうですね、来週の水曜日でしたら。" },
    { role: "agent", text: "承知しました。来週水曜日の14時に Zoom でお打ち合わせさせていただきます。ありがとうございました。" },
  ];
  let cursorMs = 0;
  for (let i = 0; i < sampleDialog.length; i++) {
    const d = sampleDialog[i];
    const durationMs = 2000 + Math.floor(Math.random() * 4000);
    memory.push({
      id: newId(),
      call_id: callId,
      organization_id: orgId,
      turn_index: i,
      role: d.role,
      text: d.text,
      language: "ja-JP",
      start_ms: cursorMs,
      end_ms: cursorMs + durationMs,
      confidence: 0.9 + Math.random() * 0.1,
      intent: i === 0 ? "greeting" : i === sampleDialog.length - 1 ? "appointment_confirmation" : null,
      tool_name: null,
      tool_args: null,
      emotion: d.role === "customer" ? (i % 3 === 0 ? "interested" : "neutral") : null,
      sentiment: d.role === "customer" ? (i % 3 === 0 ? "positive" : "neutral") : null,
      metadata: {},
      created_at: nowIso(),
    });
    cursorMs += durationMs + 500;
  }
}

export interface TranscriptListQuery {
  organizationId: UUID;
  callId: UUID;
}

export interface TranscriptSearchQuery {
  organizationId: UUID;
  query: string;
  limit?: number;
}

export const transcriptsRepo = {
  async listByCall(q: TranscriptListQuery): Promise<Transcript[]> {
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const { data, error } = await getSupabaseAdmin()
        .from("transcripts")
        .select("*")
        .eq("organization_id", q.organizationId)
        .eq("call_id", q.callId)
        .order("turn_index", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Transcript[];
    }
    ensureSeed(q.callId, q.organizationId);
    return memory
      .filter((t) => t.call_id === q.callId && t.organization_id === q.organizationId)
      .sort((a, b) => a.turn_index - b.turn_index);
  },

  async search(q: TranscriptSearchQuery): Promise<Transcript[]> {
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      // tsvector 検索 (text_search_ja カラム前提)
      const { data, error } = await getSupabaseAdmin()
        .from("transcripts")
        .select("*")
        .eq("organization_id", q.organizationId)
        .textSearch("text_search_ja", q.query, { type: "websearch", config: "japanese" })
        .limit(q.limit ?? 50);
      if (error) throw error;
      return (data ?? []) as Transcript[];
    }
    const s = q.query.toLowerCase();
    return memory
      .filter((t) => t.organization_id === q.organizationId && t.text.toLowerCase().includes(s))
      .slice(0, q.limit ?? 50);
  },

  async append(input: Omit<Transcript, "id" | "created_at">): Promise<Transcript> {
    const row: Transcript = { ...input, id: newId(), created_at: nowIso() };
    if (useDb()) {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
      const { data, error } = await getSupabaseAdmin().from("transcripts").insert(row).select("*").single();
      if (error) throw error;
      return data as Transcript;
    }
    memory.push(row);
    return row;
  },
};
