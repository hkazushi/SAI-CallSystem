"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  Database,
  PhoneCall,
  Key,
  Users,
  Settings,
  Phone,
  Zap,
  LogOut,
  BookTemplate,
  Megaphone,
  ContactRound,
  ShieldCheck,
  UserCog,
  FlaskConical,
  FileBarChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { motion } from "framer-motion";

const mainNav = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/projects", label: "プロジェクト", icon: Layers },
  { href: "/templates", label: "テンプレート", icon: BookTemplate },
  { href: "/campaigns", label: "キャンペーン", icon: Megaphone },
  { href: "/contacts", label: "顧客リスト", icon: ContactRound },
  { href: "/lists", label: "リスト管理", icon: Database },
  { href: "/calls", label: "通話ログ", icon: PhoneCall },
  { href: "/experiments", label: "A/B テスト", icon: FlaskConical },
  { href: "/reports", label: "レポート", icon: FileBarChart },
];

const settingsNav = [
  { href: "/settings/members", label: "メンバー・招待", icon: UserCog },
  { href: "/settings/credentials", label: "AI認証情報", icon: Key },
  { href: "/settings/users", label: "ユーザー管理", icon: Users },
  { href: "/settings/audit", label: "監査ログ", icon: ShieldCheck },
  { href: "/settings/twilio", label: "Twilio設定", icon: Settings },
];

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 group",
        active
          ? "text-foreground font-semibold"
          : "text-muted-foreground/70 hover:text-foreground font-normal"
      )}
    >
      {active && (
        <motion.div
          layoutId="nav-bg"
          className="absolute inset-0 rounded-lg bg-sidebar-accent"
          initial={false}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
      {/* Active left pip */}
      {active && (
        <motion.div
          layoutId="nav-pip"
          className="absolute left-0 top-[6px] bottom-[6px] w-[3px] rounded-r-full bg-primary"
          initial={false}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
      <Icon
        className={cn(
          "w-[15px] h-[15px] shrink-0 relative z-10 transition-colors",
          active ? "text-primary" : "text-muted-foreground/60 group-hover:text-foreground/80"
        )}
      />
      <span className="relative z-10 truncate">{label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 h-screen flex flex-col shrink-0 relative">
      {/* Left edge gradient */}
      <div className="absolute inset-0 bg-sidebar border-r border-sidebar-border" />
      <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/25 to-transparent" />

      {/* Logo */}
      <div className="relative px-4 pt-5 pb-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <motion.div
            whileHover={{ scale: 1.08, rotate: -5 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 420, damping: 18 }}
            className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center shadow-md shadow-primary/25 shrink-0"
          >
            <Phone className="w-4 h-4 text-white" />
          </motion.div>
          <div className="leading-tight">
            <p className="text-[13px] font-bold text-foreground tracking-tight">VoiceAI</p>
            <p className="text-[10px] text-muted-foreground/60 tracking-wide font-medium">Pro</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 overflow-y-auto px-2.5 space-y-4">
        {/* Main nav */}
        <div className="space-y-0.5">
          {mainNav.map(({ href, label, icon }) => (
            <NavItem
              key={href}
              href={href}
              label={label}
              icon={icon}
              active={pathname === href || pathname.startsWith(href + "/")}
            />
          ))}
        </div>

        {/* Divider */}
        <div className="mx-3 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />

        {/* Settings nav */}
        <div className="space-y-0.5">
          {settingsNav.map(({ href, label, icon }) => (
            <NavItem
              key={href}
              href={href}
              label={label}
              icon={icon}
              active={pathname === href}
            />
          ))}
        </div>
      </nav>

      {/* User + theme toggle */}
      <div className="relative px-2.5 py-3 border-t border-sidebar-border flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex-1 flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-sidebar-accent cursor-pointer transition-colors text-left min-w-0">
            <Avatar className="w-7 h-7 shrink-0">
              <AvatarFallback className="bg-primary/15 text-primary text-[11px] font-bold">
                田
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-foreground truncate leading-tight">
                田中 太郎
              </p>
              <p className="text-[10px] text-muted-foreground/60 truncate">tanaka@example.com</p>
            </div>
            <div className="flex items-center gap-0.5 text-warm shrink-0">
              <Zap className="w-2.5 h-2.5" />
              <span className="text-[9px] font-bold tracking-wide">PRO</span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem>
              <Users className="w-3.5 h-3.5 mr-2" />プロフィール
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <LogOut className="w-3.5 h-3.5 mr-2" />ログアウト
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ThemeToggle compact className="shrink-0" />
      </div>
    </aside>
  );
}
