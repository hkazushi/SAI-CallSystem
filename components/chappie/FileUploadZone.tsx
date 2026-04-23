"use client";

import { useRef, useState, useCallback, DragEvent, ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, FileText, AlertCircle, Upload } from "lucide-react";

export interface AttachedFile {
  id: string;
  filename: string;
  charCount: number;
  tokensEstimate: number;
  text: string;
  status: "uploading" | "ready" | "error";
  error?: string;
}

interface IngestFileResponse {
  filename: string;
  mimeType: string;
  text: string;
  truncated: boolean;
  charCount: number;
  tokensEstimate: number;
}

interface FileUploadZoneProps {
  files: AttachedFile[];
  onFilesChange: (files: AttachedFile[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

const ACCEPT_EXTS = ".pdf,.docx,.txt,.md";

export function FileUploadZone({
  files,
  onFilesChange,
  maxFiles = 5,
  disabled = false,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFiles = useCallback(
    async (incoming: File[]) => {
      if (disabled) return;

      const remaining = maxFiles - files.length;
      if (remaining <= 0) {
        toast.error(`添付ファイルは最大 ${maxFiles} 件までです`);
        return;
      }

      const toProcess = incoming.slice(0, remaining);
      if (incoming.length > remaining) {
        toast.warning(`${incoming.length - remaining} 件はファイル数上限のためスキップしました`);
      }

      // 即座に uploading 状態で追加
      const newEntries: AttachedFile[] = toProcess.map((f) => ({
        id: crypto.randomUUID(),
        filename: f.name,
        charCount: 0,
        tokensEstimate: 0,
        text: "",
        status: "uploading",
      }));

      onFilesChange([...files, ...newEntries]);

      // 各ファイルを並列アップロード
      const updated = [...files, ...newEntries];
      await Promise.all(
        toProcess.map(async (file, idx) => {
          const entry = newEntries[idx];
          const formData = new FormData();
          formData.append("file", file);

          try {
            const res = await fetch("/api/chappie/ingest-file", {
              method: "POST",
              body: formData,
            });

            if (!res.ok) {
              const body = (await res.json().catch(() => ({}))) as { error?: string };
              throw new Error(body.error ?? `HTTP ${res.status}`);
            }

            const data = (await res.json()) as IngestFileResponse;

            const index = updated.findIndex((f) => f.id === entry.id);
            if (index !== -1) {
              updated[index] = {
                ...updated[index],
                status: "ready",
                text: data.text,
                charCount: data.charCount,
                tokensEstimate: data.tokensEstimate,
                filename: data.filename,
              };
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : "アップロードに失敗しました";
            const index = updated.findIndex((f) => f.id === entry.id);
            if (index !== -1) {
              updated[index] = {
                ...updated[index],
                status: "error",
                error: message,
              };
            }
          }

          // 各ファイル完了ごとに state 更新
          onFilesChange([...updated]);
        }),
      );
    },
    [files, onFilesChange, maxFiles, disabled],
  );

  function handleRemove(id: string) {
    onFilesChange(files.filter((f) => f.id !== id));
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const droppedFiles = Array.from(e.dataTransfer.files);
    void processFiles(droppedFiles);
  }

  function handleZoneClick() {
    if (!disabled) inputRef.current?.click();
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    void processFiles(selected);
    // 同じファイルを再選択できるようにリセット
    e.target.value = "";
  }

  const atLimit = files.length >= maxFiles;

  return (
    <div className="space-y-2">
      {/* ドロップゾーン */}
      <div
        role="button"
        tabIndex={disabled || atLimit ? -1 : 0}
        aria-label="ファイルをアップロード"
        onClick={handleZoneClick}
        onKeyDown={(e) => e.key === "Enter" && handleZoneClick()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          "relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors duration-150 select-none",
          disabled || atLimit
            ? "cursor-not-allowed border-white/8 opacity-40"
            : isDragging
              ? "cursor-copy border-primary/70 bg-primary/8"
              : "cursor-pointer border-white/15 hover:border-white/30 hover:bg-white/3",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_EXTS}
          className="sr-only"
          onChange={handleInputChange}
          disabled={disabled || atLimit}
        />

        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/8">
          <Upload className="h-4 w-4 text-muted-foreground/60" />
        </div>

        <div className="space-y-0.5">
          <p className="text-[12px] font-medium text-foreground/70">
            {isDragging ? "ここにドロップ" : "クリックまたはドラッグ&ドロップ"}
          </p>
          <p className="text-[10px] text-muted-foreground/40">
            PDF / DOCX / TXT / MD — 最大 10MB・{maxFiles} ファイルまで
          </p>
        </div>
      </div>

      {/* アップロード済みファイル一覧 */}
      <AnimatePresence initial={false}>
        {files.map((file) => (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 4 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div
              className={[
                "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-[12px]",
                file.status === "error"
                  ? "border-red-500/20 bg-red-500/5"
                  : "border-white/8 bg-white/3",
              ].join(" ")}
            >
              {/* アイコン */}
              <div className="mt-0.5 shrink-0">
                {file.status === "uploading" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground/50" />
                ) : file.status === "ready" ? (
                  <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-400/15">
                    <Check className="h-2 w-2 text-emerald-400" />
                  </div>
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                )}
              </div>

              {/* ファイル情報 */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3 w-3 shrink-0 text-muted-foreground/40" />
                  <p className="truncate font-medium text-foreground/80">{file.filename}</p>
                </div>

                {file.status === "ready" && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground/40">
                    {file.charCount.toLocaleString()} 文字 ·{" "}
                    {file.tokensEstimate.toLocaleString()} トークン（概算）
                  </p>
                )}

                {file.status === "uploading" && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground/40">解析中...</p>
                )}

                {file.status === "error" && (
                  <p className="mt-0.5 text-[10px] text-red-400">{file.error}</p>
                )}
              </div>

              {/* 削除ボタン */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(file.id)}
                className="h-5 w-5 shrink-0 rounded p-0 text-muted-foreground/40 hover:bg-white/8 hover:text-foreground/70"
                aria-label={`${file.filename} を削除`}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
