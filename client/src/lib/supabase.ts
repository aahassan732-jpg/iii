import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn("[Supabase Auth] VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are not configured.");
}

export const supabase = createClient(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabasePublishableKey ?? "placeholder-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

export const authRedirectUrl = (path: string) => `${window.location.origin}${path}`;

export function authErrorMessage(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "حدث خطأ غير متوقع";
  if (message.includes("Invalid login credentials")) return "البريد الإلكتروني أو كلمة المرور غير صحيحة";
  if (message.includes("Email not confirmed")) return "أكد بريدك الإلكتروني أولًا ثم حاول تسجيل الدخول";
  if (message.includes("User already registered")) return "هذا البريد مسجل مسبقًا، جرّب تسجيل الدخول";
  if (message.includes("Password should be at least")) return "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل";
  return message;
}
