import { Link, useLocation } from "wouter";
import { Bell, ChevronDown, Gauge, Menu, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";

const navItems = [["الرئيسية", "/"], ["تحليل حساب", "/search"], ["المراقبة", "/dashboard"], ["المقارنة", "/compare"], ["الأسعار", "/pricing"], ["حول المنصة", "/about"]] as const;

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false); const [location] = useLocation(); const { isAuthenticated, user, logout } = useAuth();
  return <div className="min-h-screen bg-[#fbfaff] text-[#201a2d]">
    <header className="sticky top-0 z-50 border-b border-[#eee7f8]/80 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}><span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[#9b7bff] to-[#ec8db7] text-white shadow-lg shadow-[#b89cf7]/30"><Sparkles size={20} /></span><span className="text-xl font-black tracking-tight">Insta<span className="text-[#8f6ee8]">Lens</span></span></Link>
        <nav className="hidden items-center gap-7 lg:flex">{navItems.map(([label, href]) => <Link key={href} href={href} className={`text-sm font-semibold transition-colors hover:text-[#8f6ee8] ${location === href ? "text-[#8f6ee8]" : "text-[#746b80]"}`}>{label}</Link>)}</nav>
        <div className="hidden items-center gap-3 lg:flex">{isAuthenticated ? <><Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-[#6f59bc] hover:bg-[#f4efff]"><Gauge size={17} />لوحتي</Link><Button variant="outline" className="rounded-xl border-[#e6def5]" onClick={() => logout()}>خروج</Button></> : <Button onClick={() => startLogin()} className="rounded-xl bg-[#8f6ee8] px-5 shadow-lg shadow-[#ab8bef]/25 hover:bg-[#7c5dd5]">تسجيل الدخول</Button>}</div>
        <button aria-label="فتح القائمة" className="rounded-xl p-2 hover:bg-[#f5f0ff] lg:hidden" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      </div>
      {open && <div className="border-t border-[#eee7f8] bg-white px-5 py-4 lg:hidden"><div className="grid gap-2">{navItems.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 font-semibold text-[#5f566b] hover:bg-[#f6f1ff]">{label}</Link>)}<div className="mt-2 border-t border-[#eee7f8] pt-3">{isAuthenticated ? <div className="flex items-center justify-between"><span className="text-sm font-semibold">{user?.name ?? "حسابك"}</span><Button variant="outline" className="rounded-xl" onClick={() => logout()}>خروج</Button></div> : <Button onClick={() => startLogin()} className="w-full rounded-xl bg-[#8f6ee8]">تسجيل الدخول</Button>}</div></div></div>}
    </header>
    <main>{children}</main>
    <footer className="mt-24 border-t border-[#eee7f8] bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-[#81788d] md:flex-row md:items-center md:justify-between lg:px-8"><div><span className="font-bold text-[#3a3046]">InstaLens</span> · نراقب التغيير، لا نتجاوز الخصوصية.</div><div className="flex gap-5"><Link href="/privacy" className="hover:text-[#8f6ee8]">الخصوصية</Link><Link href="/terms" className="hover:text-[#8f6ee8]">الشروط</Link><Link href="/about" className="hover:text-[#8f6ee8]">عن المنصة</Link></div></div></footer>
  </div>;
}
