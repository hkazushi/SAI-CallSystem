"use client";
/**
 * /projects/[id]/chat — 旧モック実装からリダイレクト
 *
 * UUID 形式の projectId（Supabase 保存済みプロジェクト）の場合は
 * 実装済みの Chappie チャットページへリダイレクトする。
 * モック ID の場合は旧 UI を維持。
 */
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function ProjectChatRedirectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!id) return;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      // Supabase 保存済みプロジェクト → 実チャットページへリダイレクト
      router.replace(`/projects/new/chat?engine=dialogflow_cx&savedId=${id}`);
    } else {
      // モックプロジェクト → プロジェクト詳細に戻す
      router.replace(`/projects/${id}`);
    }
  }, [id, router]);

  return (
    <div className="flex h-[calc(100vh-1px)] items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
    </div>
  );
}
