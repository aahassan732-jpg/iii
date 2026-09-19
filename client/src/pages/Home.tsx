import { FormEvent, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowUpLeft, BellRing, Check, ChevronLeft, Clock3, GitCompare, History, Radar, Search, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const featureCards = [
  { number: "01", icon: Search, title: "اقرأ الحساب من أول نظرة", text: "ملخص مرتب للنبذة، الأرقام، الروابط، وحالة الحساب في صفحة واحدة." },
  { number: "02", icon: History, title: "ارجع إلى الأثر", text: "احتفظ بلقطات زمنية تعرف منها متى تغيّر الاسم أو النبذة أو أعداد المتابعين." },
  { number: "03", icon: BellRing, title: "خلّ مرقاب يتابع", text: "راقب الحسابات المهمة لك واستقبل تنبيهًا واضحًا عند ظهور تغيير جديد." },
  { number: "04", icon: GitCompare, title: "قارن بهدوء", text: "ضع حسابين جنبًا إلى جنب، وشاهد الفروقات كما هي دون ضجيج." },
];

const previewRows = [
  ["المتابعون", "12,480", "+8.2%"],
  ["المنشورات", "186", "+4"],
  ["آخر فحص", "منذ 5 دقائق", "متصل"],
];

export default function Home() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  function submit(event: FormEvent) { event.preventDefault(); const clean = username.trim().replace(/^@+/, ""); if (clean) setLocation(`/profile/${clean}`); }

  return <div className="bg-[#f7f7f4]">
    <section className="border-b border-[#dedfd8] bg-[#f7f7f4]">
      <div className="mx-auto grid max-w-7xl items-end gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:pb-28 lg:pt-24">
        <div>
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#cdd6ca] bg-[#edf2eb] px-4 py-2 text-sm font-bold text-[#49664f]"><span className="h-2 w-2 rounded-full bg-[#55785a]" /> منصة قراءة التغيّر</div>
          <h1 className="max-w-3xl text-5xl font-black leading-[1.08] tracking-[-.04em] text-[#20241f] sm:text-7xl">خلّ عينك على<br /><span className="text-[#55785a]">أثر الحساب.</span></h1>
          <p className="mt-7 max-w-xl text-lg leading-9 text-[#656b62]">مرقاب يضع تاريخ الحسابات العامة أمامك: لقطة اليوم، أثر الأمس، والتنبيه الذي يوصلك في وقته.</p>
          <form onSubmit={submit} className="mt-9 flex max-w-2xl flex-col gap-2 rounded-2xl border border-[#d8dad3] bg-white p-2 shadow-[0_18px_60px_rgba(41,48,39,.08)] sm:flex-row">
            <div className="relative flex-1"><Search className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8d978a]" size={19} /><Input value={username} onChange={e => setUsername(e.target.value)} placeholder="اكتب اسم الحساب مثل @username" className="h-14 border-0 bg-[#f7f8f5] pr-12 text-base shadow-none focus-visible:ring-1 focus-visible:ring-[#789579]" /></div>
            <Button type="submit" className="h-14 rounded-xl bg-[#2d3a30] px-7 text-base font-bold text-white hover:bg-[#405545]">حلّل الحساب <ArrowLeft className="mr-2" size={18} /></Button>
          </form>
          <div className="mt-5 flex flex-wrap gap-x-7 gap-y-2 text-sm text-[#747b70]"><span className="inline-flex items-center gap-2"><Clock3 size={16} className="text-[#55785a]" /> نتائج مؤرخة</span><span className="inline-flex items-center gap-2"><Radar size={16} className="text-[#a9795b]" /> مراقبة مستمرة</span><span className="inline-flex items-center gap-2"><Sparkles size={16} className="text-[#a9795b]" /> قراءة أوضح</span></div>
        </div>
        <div className="relative lg:pb-2"><div className="absolute -inset-8 rounded-[3rem] bg-[#dfe8dc] opacity-70 blur-3xl" /><div className="relative rounded-[2rem] border border-[#d5dbd1] bg-[#eef2ec] p-3 shadow-[0_24px_80px_rgba(50,68,51,.15)]"><div className="rounded-[1.4rem] bg-white p-5"><div className="flex items-center justify-between border-b border-[#edf0ea] pb-5"><div className="flex items-center gap-3"><div className="grid h-14 w-14 place-items-center rounded-full bg-[#b9cdb9] text-xl font-black text-[#304a35]">S</div><div><div className="font-black text-[#232a24]">@sample.profile</div><div className="mt-1 text-sm text-[#8b9388]">آخر فحص منذ 5 دقائق</div></div></div><span className="rounded-full bg-[#e8f0e7] px-3 py-1.5 text-xs font-bold text-[#55785a]">حساب عام</span></div><div className="mt-5 grid gap-3">{previewRows.map(([label, value, delta]) => <div key={label} className="flex items-center justify-between rounded-xl bg-[#f7f8f5] p-4"><span className="text-sm text-[#737c72]">{label}</span><span className="flex items-center gap-3 font-black text-[#273129]">{value}<span className="rounded-full bg-[#e5f1e5] px-2 py-1 text-xs font-bold text-[#4d7955]">{delta}</span></span></div>)}</div><div className="mt-4 rounded-xl bg-[#2d3a30] p-4 text-white"><div className="flex items-center gap-2 text-sm font-bold"><span className="h-2 w-2 rounded-full bg-[#d6a47f]" /> آخر أثر</div><div className="mt-3 flex items-end justify-between"><div><div className="text-lg font-black">تغيّرت النبذة الشخصية</div><div className="mt-1 text-sm text-[#bdc9bd]">18 سبتمبر 2026 · 10:42 ص</div></div><ArrowUpLeft className="text-[#d6a47f]" /></div></div></div></div></div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr]"><div><div className="text-sm font-black text-[#a9795b]">كيف يعمل مرقاب</div><h2 className="mt-3 max-w-md text-4xl font-black leading-tight tracking-[-.03em] text-[#242a24]">من لقطة سريعة إلى قصة كاملة.</h2><p className="mt-5 max-w-sm leading-8 text-[#6c736a]">كل ما تحتاجه لفهم حساب عام، مرتبًا في تجربة واحدة تنفع للباحث وصاحب العلامة وفريق المحتوى.</p><Link href="/about" className="mt-7 inline-flex items-center gap-2 font-bold text-[#55785a]">تعرّف على الفكرة <ChevronLeft size={18} /></Link></div><div className="grid gap-3 sm:grid-cols-2">{featureCards.map(({ number, icon: Icon, title, text }) => <div key={number} className="group rounded-3xl border border-[#dedfd8] bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[#aebfab] hover:shadow-xl hover:shadow-[#475c4812]"><div className="flex items-center justify-between"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#edf2eb] text-[#55785a] group-hover:bg-[#55785a] group-hover:text-white"><Icon size={20} /></div><span className="font-mono text-sm text-[#a3aaa0]">{number}</span></div><h3 className="mt-7 text-lg font-black text-[#293029]">{title}</h3><p className="mt-2 text-sm leading-7 text-[#777f74]">{text}</p></div>)}</div></div></section>

    <section className="border-y border-[#dedfd8] bg-[#e9eee7]"><div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 lg:grid-cols-[1fr_.9fr] lg:px-8"><div><div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-sm font-bold text-[#55785a]"><Check size={15} /> سجل واضح</div><h2 className="mt-5 max-w-xl text-4xl font-black leading-tight tracking-[-.03em] text-[#263127]">التغيير الصغير، يصير واضحًا مع الوقت.</h2><p className="mt-4 max-w-xl leading-8 text-[#687368]">شاهد خطًا زمنيًا مرتبًا لكل حساب تتابعه. لا تحتاج إلى حفظ لقطات أو مقارنة يدوية؛ مرقاب يفصل الجديد عن القديم ويعرضه لك ببساطة.</p><Link href="/dashboard"><Button className="mt-7 rounded-xl bg-[#2d3a30] px-6 text-white hover:bg-[#405545]">ابدأ المراقبة <ArrowLeft className="mr-2" size={17} /></Button></Link></div><div className="rounded-3xl border border-[#ced8cb] bg-white p-5 shadow-[0_18px_50px_rgba(61,82,63,.1)]"><div className="mb-5 flex items-center justify-between"><div><div className="text-sm text-[#899288]">سجل التغييرات</div><div className="mt-1 font-black">@brand.account</div></div><TrendingUp className="text-[#55785a]" /></div><div className="space-y-3">{[["18 سبتمبر", "تحديث النبذة", "جديد"], ["14 سبتمبر", "زيادة المتابعين", "+1,240"], ["02 سبتمبر", "تغيير صورة الحساب", "صورة"]].map(([date, label, value]) => <div key={date} className="flex items-center gap-4 rounded-2xl bg-[#f6f8f4] p-4"><div className="w-20 text-xs text-[#8b9588]">{date}</div><div className="h-2 w-2 rounded-full bg-[#a9795b]" /><div className="flex-1 font-bold text-[#354136]">{label}</div><span className="text-xs font-bold text-[#55785a]">{value}</span></div>)}</div></div></div></section>

    <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="rounded-[2rem] bg-[#2d3a30] p-8 text-white sm:p-12"><div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]"><div><div className="mb-3 text-sm font-bold text-[#d6a47f]">ابدأ من هنا</div><h2 className="text-3xl font-black">الحساب الذي تريد فهمه، اكتب اسمه.</h2><p className="mt-3 max-w-2xl leading-8 text-[#c1ccc1]">ابحث عن حساب عام، اقرأ ملخصه، ثم قرر إن كان يستحق أن تضعه في مرقاب.</p></div><Link href="/search"><Button className="rounded-xl bg-[#f1d4bf] px-6 font-bold text-[#2d3a30] hover:bg-white">اذهب إلى التحليل <ArrowLeft className="mr-2" size={17} /></Button></Link></div></div></section>
  </div>;
}
