"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Phone, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

export default function LandingPage() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = glowRef.current;
    if (!el) return;
    const move = (e: MouseEvent) => {
      el.style.transform = `translate(${e.clientX - 350}px, ${e.clientY - 350}px)`;
    };
    window.addEventListener("mousemove", move, { passive: true });
    return () => window.removeEventListener("mousemove", move);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-hidden relative">
      {/* Cursor glow */}
      <div
        ref={glowRef}
        className="pointer-events-none fixed z-0 w-[700px] h-[700px] rounded-full"
        style={{
          background: "radial-gradient(circle, oklch(0.6 0.22 264 / 0.06) 0%, transparent 65%)",
          willChange: "transform",
          transition: "transform 0.18s ease-out",
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 px-8 h-14 flex items-center justify-between max-w-4xl mx-auto">
        <Link href="/" className="flex items-center gap-2 group">
          <motion.div
            whileHover={{ scale: 1.06, rotate: -5 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 420, damping: 18 }}
            className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center shadow-md shadow-primary/25"
          >
            <Phone className="w-3.5 h-3.5 text-white" />
          </motion.div>
          <span className="text-[13px] font-bold text-white/80 tracking-tight">VoiceAI Pro</span>
        </Link>
        <div className="flex items-center gap-1.5">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-[13px] text-white/40 hover:text-white/75 h-8 px-3">
              ログイン
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm" className="gradient-bg border-0 hover:opacity-85 h-8 px-4 text-[13px]">
              無料で始める
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-4xl mx-auto px-8 pt-24 pb-16">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2 mb-8"
        >
          <div className="w-1 h-1 rounded-full bg-primary" />
          <span className="text-[11px] tracking-[0.14em] uppercase text-primary/70 font-semibold">Voice AI Platform</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="text-[3.5rem] md:text-[4.5rem] font-extrabold tracking-[-0.03em] leading-[0.95] text-white/92"
        >
          AIが電話を
          <br />
          <span className="gradient-text">自動応対</span>する。
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="text-[15px] text-white/38 mt-7 leading-relaxed max-w-sm"
        >
          音声AIによる発着信対応をノーコードで設定。
          <br />
          電話業務を自動化するSaaSプラットフォーム。
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="mt-10 flex items-center gap-3"
        >
          <Link href="/signup">
            <Button className="gradient-bg border-0 hover:opacity-85 h-11 px-6 text-[13px] font-semibold gap-2">
              無料で始める <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" className="h-11 px-4 text-[13px] text-white/38 hover:text-white/65">
              デモを見る
            </Button>
          </Link>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-16 flex items-center gap-8"
        >
          {[
            { value: "98.2%", label: "稼働率" },
            { value: "2.4秒", label: "平均応答時間" },
            { value: "500+", label: "導入企業" },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="num text-[1.6rem] font-extrabold text-white/75 leading-none tracking-tight">{value}</p>
              <p className="text-[11px] text-white/28 mt-1 font-medium">{label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-5 px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-[11px] text-white/22">
          <p>© 2026 VoiceAI Pro</p>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-white/50 transition-colors">利用規約</a>
            <a href="#" className="hover:text-white/50 transition-colors">プライバシー</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
