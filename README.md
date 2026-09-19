# InstaLens

منصة عربية RTL لتحليل الحسابات العامة في Instagram، حفظ snapshots، اكتشاف التغييرات، ومراقبة الحسابات ضمن حدود المصدر.

## الحالة الحالية

تم بناء تطبيق Web full-stack يعمل على قالب React + Vite + Tailwind + Express + tRPC + Drizzle + قاعدة بيانات مُدارة ومصادقة Manus OAuth. تم اختبار Instaloader 4.15.3 فعليًا، وأعاد Instagram `429 Too Many Requests`؛ لذلك لا يفترض التطبيق نجاح المصدر دائمًا، ولا يعرض بيانات وهمية في الإنتاج.

## التشغيل المحلي

```bash
pnpm install
pnpm check
pnpm test
pnpm build
pnpm dev
```

يفتح الموقع على رابط المعاينة الذي توفره بيئة WebDev.
