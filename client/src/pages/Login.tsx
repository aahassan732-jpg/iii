import { FormEvent, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Loader2, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase, authErrorMessage, authRedirectUrl } from "@/lib/supabase";

export default function Login() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true); setError(""); setMessage("");
    try {
      if (mode === "reset") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl("/login") });
        if (resetError) throw resetError;
        setMessage("أرسلنا رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.");
      } else if (mode === "signup") {
        const { data, error: signupError } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name }, emailRedirectTo: authRedirectUrl("/") },
        });
        if (signupError) throw signupError;
        if (data.session) setLocation("/dashboard");
        else setMessage("تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتفعيل الحساب.");
      } else {
        const { error: signinError } = await supabase.auth.signInWithPassword({ email, password });
        if (signinError) throw signinError;
        setLocation("/dashboard");
      }
    } catch (err) {
      setError(authErrorMessage(err as { message?: string }));
    } finally { setPending(false); }
  }

  const title = mode === "reset" ? "استعادة كلمة المرور" : mode === "signup" ? "أنشئ حسابك" : "مرحبًا بعودتك";
  return <div className="mx-auto max-w-md px-5 py-16 lg:py-24">
    <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-[#8064d2]"><ArrowRight size={17} /> العودة للرئيسية</Link>
    <section className="mt-6 rounded-[2rem] border border-[#eee6f7] bg-white p-7 shadow-sm">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#f1ebff] text-[#8f6ee8]"><ShieldCheck /></div>
      <h1 className="mt-6 text-3xl font-black">{title}</h1>
      <p className="mt-3 leading-7 text-[#81768c]">حساب آمن عبر Supabase Auth لإدارة المراقبة والتنبيهات.</p>
      <form onSubmit={submit} className="mt-7 space-y-4">
        {mode === "signup" && <Input value={name} onChange={e => setName(e.target.value)} placeholder="الاسم" required className="h-12 rounded-xl bg-[#fbf9ff]" />}
        <div className="relative"><Mail className="absolute right-3 top-3.5 text-[#9a8eb0]" size={18} /><Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="البريد الإلكتروني" required className="h-12 rounded-xl bg-[#fbf9ff] pr-10" /></div>
        {mode !== "reset" && <Input value={password} onChange={e => setPassword(e.target.value)} type="password" minLength={6} placeholder="كلمة المرور" required className="h-12 rounded-xl bg-[#fbf9ff]" />}
        {error && <div className="rounded-xl bg-[#fff0f5] p-3 text-sm leading-6 text-[#b45583]">{error}</div>}
        {message && <div className="rounded-xl bg-[#eaf9f1] p-3 text-sm leading-6 text-[#378c6b]">{message}</div>}
        <Button disabled={pending} type="submit" className="h-12 w-full rounded-xl bg-[#8f6ee8] hover:bg-[#7c5dd5]">{pending ? <Loader2 className="animate-spin" /> : mode === "reset" ? "إرسال رابط الاستعادة" : mode === "signup" ? "إنشاء الحساب" : "تسجيل الدخول"}</Button>
      </form>
      <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-3 text-sm font-bold text-[#8064d2]">
        {mode !== "signin" && <button onClick={() => { setMode("signin"); setError(""); setMessage(""); }}>تسجيل الدخول</button>}
        {mode === "signin" && <button onClick={() => setMode("signup")}>إنشاء حساب جديد</button>}
        {mode !== "reset" && <button onClick={() => setMode("reset")}>نسيت كلمة المرور؟</button>}
      </div>
    </section>
  </div>;
}
