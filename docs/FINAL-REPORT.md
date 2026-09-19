# التقرير النهائي — مرقاب

## 1. ما تم بناؤه

تم بناء منصة مرقاب عربية RTL بواجهة SaaS فاتحة وحديثة، تشمل الصفحة الرئيسية، بحث الحساب، صفحة الملف الشخصي، snapshots مؤرخة، اكتشاف التغييرات، سجل التغييرات، المقارنة، المراقبة، مركز الاشتراك، تفعيل الأكواد، التقرير العام القابل للمشاركة، لوحة المستخدم، ولوحة الإدارة.

يتضمن الخادم طبقة Provider مستقلة عن الواجهة وقاعدة البيانات، مزود Instaloader عبر عامل Python منفصل، موفر Mock محصور بالتطوير، تخزين snapshots، Change Events، إشعارات، limits أساسية، اشتراكات يدوية، أكواد تفعيل لمرة واحدة مع hash، RBAC إداري، health للمزود، Business API، cron endpoint للمراقبة، وتسجيل بنية مناسبة للتوسع.

## 2. التقنية

الواجهة: React 19 وVite وTypeScript وTailwind CSS وshadcn/ui وLucide وReact Hook Form-compatible components وZod وtRPC.

الخادم: Express وtRPC وDrizzle وSupabase Auth وقاعدة البيانات المُدارة في Supabase.

العامل: Python 3.12 وFlask وInstaloader 4.15.3، مستقل عن عملية Node.

## 3. حالة Instagram Provider

تم تثبيت Instaloader 4.15.3 وتشغيل اختبار فعلي على الحساب العام `instagram`. أعاد Instagram `429 Too Many Requests` من نقطة `web_profile_info`، لذلك لم يتم اعتبار Instaloader مضمونًا دائمًا. التطبيق يتعامل مع الفشل برسالة عربية ويحافظ على آخر Snapshot صالح بدل عرض بيانات وهمية. التفاصيل الخام في `instaloader-probe.json` والتقرير في `DATA-SOURCE-REPORT.md`.

## 4. التشغيل

```bash
pnpm install
pnpm check
pnpm test
pnpm build
pnpm dev
```

للواجهة: افتح رابط المعاينة الذي توفره بيئة WebDev.

للعامل:

```bash
cd worker/instagram
pip install -r requirements.txt
PORT=8080 python app.py
```

ثم اضبط `INSTAGRAM_WORKER_URL` في خادم الويب.

## 5. متغيرات البيئة

راجع `docs/ENVIRONMENT.md`. المتغيرات المهمة: `DATABASE_URL`, `JWT_SECRET`, `INSTAGRAM_PROVIDER`, `INSTAGRAM_WORKER_URL`, `MONITOR_CRON_SECRET`, `TELEGRAM_USERNAME`, `TELEGRAM_URL`، إضافة إلى متغيرات المنصة المحقونة تلقائيًا.

## 6. إنشاء أول Admin

يتم ترقية مالك المشروع تلقائيًا عند تطابق `OWNER_OPEN_ID` مع مستخدم OAuth في `upsertUser`. يمكن كذلك ضبط `role='admin'` من قاعدة البيانات للمستخدم الموثوق، مع إبقاء كل إجراءات الإدارة محمية Server Side.

## 7. إنشاء Activation Code

يسجل Admin الدخول إلى `/admin`، يختار PRO أو BUSINESS والمدة ثم ينشئ الكود. الكود الصريح يظهر مرة واحدة فقط، بينما يخزن الخادم hash فقط.

## 8. تفعيل الاشتراك

يسجل المستخدم الدخول، يفتح `/activate`، يدخل الكود، ويتحقق الخادم من hash والحالة والانتهاء والاستخدام السابق ثم يربط الاشتراك بحساب المستخدم.

## 9. النشر

انشر خادم الويب على WebDev/Vercel مع قاعدة البيانات، وانشر العامل Python على Cloud Run أو Render أو Fly.io. اضبط cron خارجيًا على `POST /api/scheduled/monitor` مع `Authorization: Bearer $MONITOR_CRON_SECRET`. يوجد مثال GitHub Actions في `.github/workflows/monitor.yml`.

## 10. القيود المتبقية

مصدر Instagram غير رسمي وقد يتعرض لـ 429 أو تغيرات في الاستجابة، ولا يمكن ضمان توفر كل الحقول. العامل Python يحتاج نشرًا منفصلًا؛ لا يتم تشغيله داخل طلب Node أو عبر timer داخل العملية. القالب الحالي يستخدم قاعدة البيانات المُدارة MySQL/TiDB الخاصة ببيئة WebDev بدل Supabase PostgreSQL لأن المصادقة والبنية الموفرة مبنيتان عليها؛ طبقة البيانات معزولة لنقلها لاحقًا. تصدير PDF وWebhooks وواجهة إدارة كل الإعدادات تحتاج استكمالًا إضافيًا قبل اعتبارها جاهزة تجاريًا بالكامل، بينما API وCSV-ready schema ومسار المراقبة وأكواد التفعيل الأساسية موجودة.

## 11. التحقق

- `pnpm check` — ناجح.
- `pnpm test` — 3 ملفات، 6 اختبارات ناجحة.
- `pnpm build` — ناجح.
- المعاينة البصرية Desktop وMobile — ناجحة.
- الصفحة العامة — HTTP 200.
- نقطة المراقبة بدون سر — HTTP 401 كما هو متوقع.
