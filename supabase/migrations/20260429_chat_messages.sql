-- Migration: chat_messages カラム追加（壁打ち再開用）
-- Date: 2026-04-29
-- 既存 projects テーブルに ChappieUIMessage[] を保存する JSONB 列を追加。
-- 保存後に詳細ページから壁打ち再開できるよう、メッセージ履歴を永続化する。

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS chat_messages JSONB;
