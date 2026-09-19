# Environment variables

يتم حقن أسرار المنصة تلقائيًا في بيئة الاستضافة. أضف القيم الخاصة بالمزود والعناوين في إعدادات المشروع، ولا تضع أسرارًا حقيقية في Git.

| المتغير | الغرض |
| --- | --- |
| `DATABASE_URL` | اتصال قاعدة البيانات المُدارة |
| `JWT_SECRET` | جلسة المصادقة |
| `INSTAGRAM_PROVIDER` | `instaloader` للإنتاج أو `mock` للتطوير فقط |
| `INSTAGRAM_WORKER_URL` | عنوان عامل Python المنفصل |
| `MONITOR_CRON_SECRET` | سر Bearer لنقطة تشغيل المراقبة الدورية |
| `TELEGRAM_USERNAME` | حساب دعم الاشتراكات |
| `TELEGRAM_URL` | رابط Telegram للدعم |
| `SITE_NAME` | اسم الموقع |
| `SITE_DESCRIPTION` | وصف الموقع |

في هذا القالب يعتمد التطبيق على قاعدة البيانات المُدارة التي يوفرها WebDev (MySQL/TiDB) لضمان عمل المصادقة والبنية الحالية. طبقة التخزين معزولة ويمكن نقلها إلى PostgreSQL/Supabase عبر adapter مستقل في نشر منفصل.
