"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload, FileSpreadsheet, ChevronRight, ChevronLeft,
  CheckCircle2, AlertCircle, Phone, User, Building2, X,
} from "lucide-react";

const STEPS = ["ファイル選択", "列マッピング", "確認・保存"];

const PREVIEW_ROWS = [
  { "電話番号": "03-1234-5678", "担当者名": "田中 太郎", "会社名": "株式会社ABC", "業種": "製造業" },
  { "電話番号": "090-1234-5678", "担当者名": "山田 花子", "会社名": "山田商事", "業種": "小売業" },
  { "電話番号": "06-9876-5432", "担当者名": "鈴木 一郎", "会社名": "鈴木工業", "業種": "建設業" },
  { "電話番号": "045-555-1234", "担当者名": "佐藤 美咲", "会社名": "佐藤産業", "業種": "サービス業" },
  { "電話番号": "03-8765-4321", "担当者名": "高橋 健太", "会社名": "高橋物産", "業種": "卸売業" },
];

export default function ListNewPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [listName, setListName] = useState("");
  const [listDesc, setListDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const columns = Object.keys(PREVIEW_ROWS[0]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setFileName(file.name);
      setStep(1);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setStep(1);
    }
  }

  async function handleSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1200));
    router.push("/lists");
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <PageHeader title="新規リスト作成" description="CSVまたはExcelファイルをアップロードしてリストを作成" />

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 text-sm font-medium transition-colors ${i < step ? "text-emerald-400" : i === step ? "text-foreground" : "text-muted-foreground"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border transition-all ${i < step ? "bg-emerald-400 border-emerald-400 text-black" : i === step ? "border-primary text-primary" : "border-border/40"}`}>
                {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              {s}
            </div>
            {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-border/60" />}
          </div>
        ))}
      </div>

      {/* Step 0: File Upload */}
      {step === 0 && (
        <Card
          className={`border-dashed transition-all duration-200 ${dragging ? "border-primary bg-primary/5" : "border-border/40 bg-card/40"}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <label className="flex flex-col items-center justify-center py-16 cursor-pointer">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <p className="font-semibold text-base mb-1">ファイルをドラッグ＆ドロップ</p>
            <p className="text-sm text-muted-foreground mb-4">または</p>
            <Button size="sm" className="gradient-bg border-0 hover:opacity-90 mb-3">
              ファイルを選択
            </Button>
            <p className="text-xs text-muted-foreground">CSV・Excel (.csv, .xlsx, .xls) 対応 · 最大50MB</p>
            <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleFileInput} />
          </label>
        </Card>
      )}

      {/* Step 1: Column Mapping */}
      {step === 1 && (
        <div className="space-y-5">
          <Card className="p-5 border-border/40 bg-card/60">
            <div className="flex items-center gap-3 mb-4">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">{fileName || "sample_list.csv"}</p>
                <p className="text-xs text-muted-foreground">5,420行 · 4列 を検出</p>
              </div>
              <button className="ml-auto text-muted-foreground hover:text-foreground" onClick={() => setStep(0)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">列マッピング</p>
              {[
                { key: "phone", label: "電話番号", icon: Phone, required: true, mapped: "電話番号" },
                { key: "name", label: "担当者名", icon: User, required: false, mapped: "担当者名" },
                { key: "company", label: "会社名", icon: Building2, required: false, mapped: "会社名" },
              ].map(({ key, label, icon: Icon, required, mapped }) => (
                <div key={key} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-36">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{label}</span>
                    {required && <Badge className="bg-red-500/20 text-red-400 border-0 text-[10px] h-4 px-1">必須</Badge>}
                  </div>
                  <select className="flex-1 h-9 px-3 rounded-lg bg-background/50 border border-border/40 text-sm focus:outline-none focus:border-primary/40">
                    {columns.map((c) => (
                      <option key={c} value={c} selected={c === mapped}>{c}</option>
                    ))}
                  </select>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                </div>
              ))}
            </div>
          </Card>

          {/* Preview */}
          <Card className="border-border/40 bg-card/60 overflow-hidden">
            <div className="px-5 py-3 border-b border-border/30">
              <p className="text-xs font-medium text-muted-foreground">プレビュー（先頭5行）</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/20">
                    {columns.map((c) => (
                      <th key={c} className="px-4 py-2 text-left text-muted-foreground font-medium">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PREVIEW_ROWS.map((row, i) => (
                    <tr key={i} className="border-b border-border/10 hover:bg-white/2">
                      {columns.map((c) => (
                        <td key={c} className="px-4 py-2 font-mono">{row[c as keyof typeof row]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" className="border-border/40" onClick={() => setStep(0)}>
              <ChevronLeft className="w-4 h-4 mr-1" />戻る
            </Button>
            <Button className="gradient-bg border-0 hover:opacity-90" onClick={() => setStep(2)}>
              次へ <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Confirm */}
      {step === 2 && (
        <div className="space-y-5">
          <Card className="p-5 border-border/40 bg-card/60 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">リスト名 <span className="text-red-400">*</span></Label>
              <Input
                placeholder="例: 中小企業リスト 2026年4月"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                className="bg-background/50 border-border/40 h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">説明</Label>
              <Input
                placeholder="リストの説明（任意）"
                value={listDesc}
                onChange={(e) => setListDesc(e.target.value)}
                className="bg-background/50 border-border/40 h-10"
              />
            </div>
          </Card>

          <Card className="p-5 border-border/40 bg-card/40 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">インポート概要</p>
            {[
              { label: "ファイル", value: fileName || "sample_list.csv" },
              { label: "総件数", value: "5,420 件" },
              { label: "有効な電話番号", value: "5,068 件" },
              { label: "重複", value: "352 件" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </Card>

          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-400/5 border border-amber-400/20 text-xs text-amber-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            重複した電話番号は自動的に除外されます。
          </div>

          <div className="flex justify-between">
            <Button variant="outline" className="border-border/40" onClick={() => setStep(1)}>
              <ChevronLeft className="w-4 h-4 mr-1" />戻る
            </Button>
            <Button
              className="gradient-bg border-0 hover:opacity-90"
              disabled={!listName || saving}
              onClick={handleSave}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  保存中...
                </span>
              ) : "リストを作成"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
