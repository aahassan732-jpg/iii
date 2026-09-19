import { useState } from "react";
import { Activity, Copy, KeyRound, Loader2, ShieldAlert, UsersRound, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";

type Card = { label: string; value: number; icon: LucideIcon };

export default function Admin() {
  const { user, isAuthenticated, loading } = useAuth();
  const isAdmin = isAuthenticated && user?.role === "admin";
  const stats = trpc.admin.stats.useQuery(undefined, { enabled: isAdmin });
  const health = trpc.admin.health.useQuery(undefined, { enabled: isAdmin });
  const [plan, setPlan] = useState<"PRO" | "BUSINESS">("PRO");
  const [durationDays, setDurationDays] = useState("30");
  const [generated, setGenerated] = useState("");
  const create = trpc.admin.generateCode.useMutation({ onSuccess: data => setGenerated(data.code) });
  const cards: Card[] = [
    { label: "المستخدمون", value: stats.data?.users ?? 0, icon: UsersRound },
    { label: "المراقبة النشطة", value: stats.data?.monitored ?? 0, icon: Activity },
    { label: "الملفات المحللة", value: stats.data?.profiles ?? 0, icon: KeyRound },
    { label: "التغييرات", value: stats.data?.changes ?? 0, icon: Activity },
  ];
  if (loading) return <div className="py-24 text-center"><Loader2 className="mx-auto animate-spin text-[#8f6ee8]" /></div>;
  if (!isAuthenticated) return <div className="py-24 text-center"><h1 className="text-3xl font-black">دخول الإدارة مطلوب</h1><Button onClick={() => startLogin()} className="mt-6 rounded-xl bg-[#8f6ee8]">تسجيل الدخول</Button></div>;
  if (user?.role !== "admin") return <div className="mx-auto max-w-xl px-5 py-24 text-center"><ShieldAlert className="mx-auto text-[#d17ca9]" size={42} /><h1 className="mt-5 text-3xl font-black">ليس لديك صلاحية الإدارة</h1><p className="mt-3 text-[#81768c]">يتم التحقق من الدور على الخادم، وليس من الواجهة فقط.</p></div>;
  return <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8"><div><div className="text-sm font-bold text-[#8f6ee8]">Admin</div><h1 className="mt-2 text-4xl font-black">مركز التحكم</h1></div><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-3xl border border-[#eee6f7] bg-white p-6 shadow-sm"><Icon className="text-[#8f6ee8]" size={20} /><div className="mt-4 text-sm text-[#81768c]">{label}</div><div className="mt-1 text-3xl font-black">{value}</div></div>)}</div><div className="mt-6 grid gap-6 lg:grid-cols-[1fr_.8fr]"><section className="rounded-[2rem] border border-[#eee6f7] bg-white p-7 shadow-sm"><h2 className="text-xl font-black">إنشاء Activation Code</h2><p className="mt-2 text-sm leading-7 text-[#81768c]">يُحفظ الـ hash فقط، ويظهر الكود الصريح مرة واحدة بعد الإنشاء.</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><select value={plan} onChange={e => setPlan(e.target.value as "PRO" | "BUSINESS")} className="h-12 rounded-xl border border-[#e6def5] bg-[#fbf9ff] px-3"><option value="PRO">PRO</option><option value="BUSINESS">BUSINESS</option></select><Input value={durationDays} onChange={e => setDurationDays(e.target.value)} type="number" min="1" max="730" placeholder="المدة بالأيام" className="h-12 rounded-xl bg-[#fbf9ff]" /></div><Button disabled={create.isPending} onClick={() => create.mutate({ plan, durationDays: Number(durationDays) })} className="mt-4 rounded-xl bg-[#8f6ee8]">{create.isPending ? "جارٍ الإنشاء…" : "إنشاء الكود"}</Button>{generated && <div className="mt-5 rounded-2xl bg-[#fff9e8] p-5"><div className="text-xs font-bold text-[#97732f]">اعرضه مرة واحدة فقط</div><div className="mt-2 flex items-center justify-between gap-3 font-mono text-lg font-black"><span>{generated}</span><Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(generated)}><Copy size={15} /></Button></div></div>}</section><aside className="rounded-[2rem] bg-gradient-to-br from-[#f1ebff] to-[#fff0f7] p-7"><div className="flex items-center gap-2 font-black"><Activity className="text-[#61b691]" size={19} /> صحة المزود</div><div className="mt-6 rounded-2xl bg-white/70 p-5"><div className="text-sm text-[#81768c]">{health.data?.status ?? "جارٍ الفحص"}</div><div className="mt-2 text-2xl font-black">{health.data?.responseMs ? `${health.data.responseMs}ms` : "—"}</div><div className="mt-2 text-xs text-[#95899d]">آخر فحص: {health.data?.checkedAt ? new Date(health.data.checkedAt).toLocaleString("ar-SA") : "—"}</div></div></aside></div></div>;
}
