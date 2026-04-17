"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Phone, Eye, EyeOff, ArrowRight, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    router.push("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-8 group">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-primary/20">
            <Phone className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold gradient-text text-lg">VoiceAI Pro</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">アカウントを作成</h1>
        <p className="text-sm text-muted-foreground mt-1">14日間無料トライアル・クレジットカード不要</p>
      </div>
      <Card className="p-6 border-border/40 bg-card/60 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">お名前</Label>
              <Input placeholder="田中 太郎" className="bg-background/50 border-border/40 h-11" required />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">会社名</Label>
              <Input placeholder="株式会社○○" className="bg-background/50 border-border/40 h-11" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">メールアドレス</Label>
            <Input type="email" placeholder="tanaka@example.com" className="bg-background/50 border-border/40 h-11" required />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">パスワード</Label>
            <div className="relative">
              <Input type={showPw ? "text" : "password"} placeholder="8文字以上" className="bg-background/50 border-border/40 h-11 pr-10" required />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full gradient-bg border-0 hover:opacity-90 h-11" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />作成中...</span>
            ) : (
              <span className="flex items-center gap-2">無料で始める <ArrowRight className="w-4 h-4" /></span>
            )}
          </Button>
        </form>
      </Card>
      <div className="flex items-center justify-center gap-6">
        {["クレジットカード不要","14日間無料","いつでも解約可"].map((t) => (
          <div key={t} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />{t}
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-muted-foreground">
        すでにアカウントをお持ちの方は{" "}
        <Link href="/login" className="text-primary hover:text-primary/80 transition-colors font-medium">ログイン</Link>
      </p>
    </div>
  );
}
