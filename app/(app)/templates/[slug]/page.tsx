/**
 * 旧テンプレート詳細ページの互換レイヤー。
 *
 * 現在のフローは `/templates` のウィザード（業界 → 方向 → 確認）で完結し、
 * CTA から直接 `/projects/new/chat?template=<id>` に遷移する。
 * 古いブックマークや外部リンクで `/templates/<slug>` が叩かれた場合は
 * 新レジストリの id と一致すれば chat ページへ、なければウィザードへ送る。
 */
import { redirect } from "next/navigation";
import { getTemplate } from "@/lib/templates";

export default async function LegacyTemplateSlugRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const template = getTemplate(slug);
  if (template) {
    redirect(`/projects/new/chat?template=${template.id}`);
  }
  redirect("/templates");
}
