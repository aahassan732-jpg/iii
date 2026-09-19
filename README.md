# مرقاب

منصة عربية RTL لتحليل الحسابات العامة في Instagram، حفظ snapshots، اكتشاف التغييرات، ومراقبة الحسابات ضمن حدود المصدر.

## الحالة الحالية

تم بناء تطبيق Web full-stack يعمل على قالب React + Vite + Tailwind + Express + tRPC + Drizzle + قاعدة بيانات PostgreSQL مُدارة ومصادقة Supabase Auth. تم اختبار Instaloader 4.15.3 فعليًا، وأعاد Instagram `429 Too Many Requests`؛ لذلك لا يفترض التطبيق نجاح المصدر دائمًا، ولا يعرض بيانات وهمية في الإنتاج.

## التشغيل المحلي

```bash
pnpm install
pnpm check
pnpm test
pnpm build
pnpm dev
```

يفتح الموقع على رابط المعاينة الذي توفره بيئة WebDev.

## متغيرات البيئة

راجع [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md). أهم المتغيرات الخاصة بالمشروع:

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
INSTAGRAM_PROVIDER=instaloader
INSTAGRAM_WORKER_URL=https://worker.example.com
MONITOR_CRON_SECRET=change-me
TELEGRAM_USERNAME=
TELEGRAM_URL=
```

استخدم `INSTAGRAM_PROVIDER=mock` فقط في التطوير المحلي. لا يتم السماح بالـ MockProvider في الإنتاج.

## المصادقة

يعتمد تسجيل الدخول على Supabase Auth بالكامل. تدعم صفحة `/login` إنشاء الحساب وتسجيل الدخول واستعادة كلمة المرور. يجب إضافة متغيرات `SUPABASE_URL` و`SUPABASE_PUBLISHABLE_KEY` للخادم، ونسخ `VITE_SUPABASE_URL` و`VITE_SUPABASE_PUBLISHABLE_KEY` للواجهة قبل البناء. لم يعد المشروع يعتمد على Manus OAuth.

## قاعدة البيانات

تم إنشاء مخطط Drizzle داخل `drizzle/schema.ts` وتوليد migration في `drizzle/0001_lucky_jane_foster.sql`. كما تم تطبيق الجداول على قاعدة البيانات المُدارة للمشروع. الجداول تشمل المستخدمين، الملفات الشخصية، snapshots، التغييرات، المراقبة، الإشعارات، الاشتراكات، أكواد التفعيل، السجل التدقيقي، مفاتيح API، وWebhooks.

يستخدم المشروع PostgreSQL عبر Supabase لتوفير قاعدة بيانات مُدارة واتصال آمن من Render. اضبط `DATABASE_URL` باستخدام رابط الاتصال الخاص بمشروع Supabase، ثم شغّل `pnpm db:push` لتطبيق migration على قاعدة البيانات الجديدة.

## Instagram Worker

العامل مستقل عن Next/Express ويشغل Instaloader:

```bash
cd worker/instagram
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
PORT=8080 python app.py
```

أو:

```bash
docker build -t instalens-instagram-worker worker/instagram
docker run -p 8080:8080 instalens-instagram-worker
```

ضع عنوانه في `INSTAGRAM_WORKER_URL`. لا ترسل كلمات مرور Instagram أو Cookies أو Sessions أو Access Tokens.

## المراقبة الدورية

لا يستخدم التطبيق `setInterval` أو `node-cron`. نقطة التشغيل هي:

```text
POST /api/scheduled/monitor
Authorization: Bearer $MONITOR_CRON_SECRET
```

يشغل ملف `.github/workflows/monitor.yml` الطلب كل ساعة، ويمكن نقل نفس الطلب إلى Cloud Scheduler أو Supabase Cron أو Vercel Cron. العامل يلتقط الحسابات المستحقة، يقارن اللقطة السابقة، ينشئ Change Events، ويسجل Notification.

## الاشتراكات وأكواد التفعيل

الاشتراك يدوي وليس Stripe. ينشئ Admin كودًا من إجراء `admin.generateCode`. الكود عشوائي، لا يظهر في قاعدة البيانات بصيغته الأصلية، ويظهر للمدير مرة واحدة. يدخل المستخدم `/activate`، ويتحقق النظام من الحالة والانتهاء وعدم الاستخدام ثم ينشئ اشتراكًا مربوطًا بالمستخدم.

## API

Business فقط مع مفتاح API مخزن كـ hash:

```text
GET /api/v1/profile/:username
GET /api/v1/history/:username
GET /api/v1/changes/:username
x-api-key: <business-key>
```

يتم تطبيق تحقق الخطة، وتحديث lastUsedAt، وإرجاع أخطاء واضحة عند غياب الاشتراك أو المزود.

## النشر

1. احفظ checkpoint للمشروع.
2. انشر واجهة مرقاب على استضافة WebDev/Vercel مع متغيرات المنصة.
3. انشر `worker/instagram` على Cloud Run أو Render أو Fly.io أو خدمة Python مماثلة، ثم اضبط `INSTAGRAM_WORKER_URL`.
4. اضبط `MONITOR_CRON_SECRET` في الموقع و`INSTALENS_MONITOR_URL` و`INSTALENS_MONITOR_SECRET` في GitHub Actions، أو استخدم Cron مُدارًا آخر.
5. راقب Provider Health و429 ولا ترفع التوازي أو تتجاوز حدود Instagram.

## English summary

مرقاب is an Arabic RTL full-stack product for public Instagram profile snapshots, change detection, monitoring, manual subscriptions, one-time activation codes, and a Business API. The Instagram provider is isolated behind an interface. Instaloader 4.15.3 was installed and tested; Instagram returned HTTP 429 during the probe, so production failures are handled gracefully and a mock provider is development-only. The Python worker must be deployed separately from the Node web process.
