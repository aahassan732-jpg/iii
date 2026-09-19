# Environment variables

يتم حقن أسرار المنصة تلقائيًا في بيئة الاستضافة. أضف القيم الخاصة بالمزود والعناوين في إعدادات المشروع، ولا تضع أسرارًا حقيقية في Git.

| المتغير | الغرض |
| --- | --- |
| `DATABASE_URL` | رابط اتصال PostgreSQL الخاص بمشروع Supabase |
| `JWT_SECRET` | جلسة المصادقة |
| `SUPABASE_URL` | رابط مشروع Supabase نفسه |
| `SUPABASE_PUBLISHABLE_KEY` | المفتاح العام لـ Supabase Auth، ويستخدمه الخادم للتحقق من access token |
| `VITE_SUPABASE_URL` | رابط Supabase الذي يضمّنه بناء الواجهة |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | المفتاح العام الذي يضمّنه بناء الواجهة |
| `INSTAGRAM_PROVIDER` | `instaloader` للإنتاج أو `mock` للتطوير فقط |
| `INSTAGRAM_WORKER_URL` | عنوان عامل Python المنفصل |
| `MONITOR_CRON_SECRET` | سر Bearer لنقطة تشغيل المراقبة الدورية |
| `TELEGRAM_USERNAME` | حساب دعم الاشتراكات |
| `TELEGRAM_URL` | رابط Telegram للدعم |
| `SITE_NAME` | اسم الموقع |
| `SITE_DESCRIPTION` | وصف الموقع |

يعتمد التطبيق على PostgreSQL وSupabase Auth المُدارين في Supabase. يجب إضافة متغيرات `SUPABASE_*` إلى Render، وإضافة نسخ `VITE_SUPABASE_*` قبل البناء حتى يعمل تسجيل الدخول في المتصفح. بعد إضافة `DATABASE_URL` إلى Render، طبّق المخطط باستخدام `pnpm db:push`.
