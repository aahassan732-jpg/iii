import { ChangeEvent, useMemo, useState } from "react";
import { ArrowRight, FileArchive, Upload } from "lucide-react";
import { Link } from "wouter";

function extractUsernames(value: unknown): Set<string> {
  const result = new Set<string>();
  const visit = (node: unknown) => {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!node || typeof node !== "object") return;
    const item = node as Record<string, unknown>;
    const stringList = [item.href, item.value, item.username, item.title];
    for (const candidate of stringList) {
      if (typeof candidate === "string") {
        const match = candidate.match(/instagram\.com\/([^/?#]+)/i);
        const name = (match?.[1] ?? candidate).replace(/^@/, "").trim().toLowerCase();
        if (/^[a-z0-9._]{1,30}$/.test(name) && name !== "instagram") result.add(name);
      }
    }
    Object.values(item).forEach(visit);
  };
  visit(value);
  return result;
}

async function readFile(file: File) {
  const text = await file.text();
  try { return extractUsernames(JSON.parse(text)); } catch { return extractUsernames(text.split(/\r?\n/).map(value => ({ value }))); }
}

export default function FollowersImport() {
  const [before, setBefore] = useState<Set<string>>(new Set());
  const [after, setAfter] = useState<Set<string>>(new Set());
  const [beforeName, setBeforeName] = useState("");
  const [afterName, setAfterName] = useState("");
  const [message, setMessage] = useState("");
  const load = async (event: ChangeEvent<HTMLInputElement>, kind: "before" | "after") => {
    const file = event.target.files?.[0]; if (!file) return;
    const usernames = await readFile(file);
    if (kind === "before") { setBefore(usernames); setBeforeName(file.name); } else { setAfter(usernames); setAfterName(file.name); }
    setMessage(`تمت قراءة ${usernames.size.toLocaleString("ar-SA")} حسابًا من الملف.`);
  };
  const followed = useMemo(() => Array.from(after).filter(name => !before.has(name)).sort(), [before, after]);
  const unfollowed = useMemo(() => Array.from(before).filter(name => !after.has(name)).sort(), [before, after]);
  return <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8" dir="rtl"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-[#55785a]"><ArrowRight size={17} /> العودة للوحة</Link><div className="mt-6 max-w-3xl"><div className="flex items-center gap-3 text-[#a9795b]"><FileArchive /> أداة المقارنة</div><h1 className="mt-4 text-4xl font-black text-[#293029]">قارن المتابعين قبل وبعد</h1><p className="mt-4 leading-8 text-[#6c736a]">ارفع ملفي JSON من Instagram Data Export. تتم المعالجة داخل المتصفح، ولا تُرسل الملفات إلى مرقاب.</p></div><div className="mt-8 grid gap-5 md:grid-cols-2"><label className="cursor-pointer rounded-[2rem] border border-dashed border-[#b9cdb9] bg-[#f3f5f1] p-7"><Upload className="text-[#55785a]" /><div className="mt-4 font-black">اللقطة الأقدم</div><div className="mt-2 text-sm text-[#7b8378]">{beforeName || "اختر ملف followers بصيغة JSON"}</div><input type="file" accept=".json,.txt" className="hidden" onChange={event => load(event, "before")} /></label><label className="cursor-pointer rounded-[2rem] border border-dashed border-[#cbb9aa] bg-[#fbf4ef] p-7"><Upload className="text-[#a9795b]" /><div className="mt-4 font-black">اللقطة الأحدث</div><div className="mt-2 text-sm text-[#7b8378]">{afterName || "اختر ملف followers بصيغة JSON"}</div><input type="file" accept=".json,.txt" className="hidden" onChange={event => load(event, "after")} /></label></div>{message && <p className="mt-5 rounded-xl bg-[#e9eee7] p-4 text-sm text-[#55785a]">{message}</p>}<div className="mt-8 grid gap-5 md:grid-cols-2"><section className="rounded-[2rem] border border-[#dedfd8] bg-white p-7 shadow-sm"><h2 className="text-xl font-black">تابعوا الحساب</h2><p className="mt-2 text-sm text-[#7b8378]">{followed.length.toLocaleString("ar-SA")} حسابًا جديدًا</p><div className="mt-5 max-h-72 space-y-2 overflow-auto text-sm">{followed.map(name => <div key={name} className="rounded-lg bg-[#f3f5f1] px-3 py-2">@{name}</div>)}</div></section><section className="rounded-[2rem] border border-[#dedfd8] bg-white p-7 shadow-sm"><h2 className="text-xl font-black">ألغوا المتابعة</h2><p className="mt-2 text-sm text-[#7b8378]">{unfollowed.length.toLocaleString("ar-SA")} حسابًا</p><div className="mt-5 max-h-72 space-y-2 overflow-auto text-sm">{unfollowed.map(name => <div key={name} className="rounded-lg bg-[#fbf4ef] px-3 py-2">@{name}</div>)}</div></section></div></div>;
}
