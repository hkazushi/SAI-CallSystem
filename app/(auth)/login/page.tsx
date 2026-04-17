"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Phone, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
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
        <h1 className="text-2xl font-bold tracking-tight">おかえりなさい</h1>
        <p className="text-sm text-muted-foreground mt-1">アカウントにログインしてください</p>
      </div>

      <Card className="p-6 border-border/40 bg-card/60 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              placeholder="tanaka@example.com"
              defaultValue="tanaka@example.com"
              className="bg-background/50 border-border/40 h-11"
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm">パスワード</Label>
              <a href="#" className="text-xs text-primary/80 hover:text-primary transition-colors">忘れた場合</a>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPw ? "text" : "password"}
                placeholder="パスワードを入力"
                defaultValue="password123"
                className="bg-background/50 border-border/40 h-11 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Button
            type="submit"
            className="w-full gradient-bg border-0 hover:opacity-90 h-11"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ログイン中...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                ログイン <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </Button>
        </form>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        アカウントをお持ちでない方は{" "}
        <Link href="/signup" className="text-primary hover:text-primary/80 transition-colors font-medium">
          無料登録
        </Link>
      </p>
    </div>
  );
}
