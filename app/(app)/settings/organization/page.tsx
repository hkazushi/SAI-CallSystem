"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { PageTransition } from "@/components/ui/page-transition";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Save, Trash2 } from "lucide-react";

export default function OrganizationSettingsPage() {
  const [name, setName] = useState("SAI コールセンター");
  const [slug, setSlug] = useState("sai-call");
  const [industry, setIndustry] = useState("saas");
  const [timezone, setTimezone] = useState("Asia/Tokyo");
  const [country, setCountry] = useState("JP");
  const [phone, setPhone] = useState("+81-3-1234-5678");
  const [billingEmail, setBillingEmail] = useState("billing@example.com");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // 本来は /api/organization/current から取得
  useEffect(() => { /* fetch */ }, []);

  const save = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <PageTransition>
      <div className="p-6 space-y-6 max-w-3xl">
        <PageHeader
          title="組織情報"
          description="組織の基本情報と連絡先を管理。請求にも反映されます。"
        />

        <Card className="p-5 space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-border/40">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">{name}</h3>
              <p className="text-xs text-muted-foreground">プラン: <Badge variant="outline" className="ml-1 text-[10px]">Pro</Badge></p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>組織名</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>スラッグ（URL識別子）</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>業種</Label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 h-10 text-sm"
              >
                <option value="saas">SaaS / IT</option>
                <option value="finance">金融・保険</option>
                <option value="real_estate">不動産</option>
                <option value="healthcare">医療・ヘルスケア</option>
                <option value="retail">小売・EC</option>
                <option value="education">教育</option>
                <option value="energy">エネルギー・通信</option>
                <option value="other">その他</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>国</Label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 h-10 text-sm"
              >
                <option value="JP">日本</option>
                <option value="US">アメリカ合衆国</option>
                <option value="KR">韓国</option>
                <option value="SG">シンガポール</option>
                <option value="other">その他</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>タイムゾーン</Label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 h-10 text-sm"
              >
                <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
                <option value="Asia/Seoul">Asia/Seoul (UTC+9)</option>
                <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (UTC-8)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>代表電話番号</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>請求メールアドレス</Label>
              <Input type="email" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">請求書・支払い通知の送付先</p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-border/40">
            <Button onClick={save} disabled={saving}>
              <Save className="w-3.5 h-3.5 mr-1.5" />{saving ? "保存中..." : "保存"}
            </Button>
            {saved && <span className="text-xs text-emerald-400">✓ 保存しました</span>}
          </div>
        </Card>

        <Card className="p-5 space-y-3 border-red-500/30">
          <div>
            <h3 className="text-sm font-semibold text-red-400 flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" />危険ゾーン
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              組織削除は元に戻せません。全てのデータ（通話・顧客・キャンペーン）が削除されます。
            </p>
          </div>
          <Button variant="outline" className="border-red-500/40 text-red-400 hover:bg-red-500/10">
            組織を削除する
          </Button>
        </Card>
      </div>
    </PageTransition>
  );
}
