# Environment variables

يتم حقن أسرار المنصة تلقائيًا في بيئة الاستضافة. أضف القيم الخاصة بالمزود والعناوين في إعدادات المشروع، ولا تضع أسرارًا حقيقية في Git.

| المتغير | الغرض |
| --- | --- |
| `DATABASE_URL` | رابط اتصال PostgreSQL الخاص بمشروع Supabase |
| `JWT_SECRET` | جلسة المصادقة |
| `INSTAGRAM_PROVIDER` | `instaloader` للإنتاج أو `mock` للتطوير فقط |
| `INSTAGRAM_WORKER_URL` | عنوان عامل Python المنفصل |
| `MONITOR_CRON_SECRET` | سر Bearer لنقطة تشغيل المراقبة الدورية |
| `TELEGRAM_USERNAME` | حساب دعم الاشتراكات |
| `TELEGRAM_URL` | رابط Telegram للدعم |
| `SITE_NAME` | اسم الموقع |
| `SITE_DESCRIPTION` | وصف الموقع |

يعتمد التطبيق على PostgreSQL المُدار في Supabase. بعد إضافة `DATABASE_URL` إلى Render، طبّق المخطط باستخدام `pnpm db:push`.
