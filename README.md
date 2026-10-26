## Shape review 0.7 — static construction revision (not approved likeness)

The 0.6 visual asset was rejected as a realistic product match. A new **static shape-review page** puts the revised garment on a visible fixed mannequin, alongside the original reference at useful size. Neutral clay is the default; illustrative color is secondary. Revised shoulders/inner/sleeves, flat ribbon surfaces and approximate decorated textile cuffs are included. The silhouette and drape still need visual work: **no likeness, authentic pattern, physics, surface-clearance or size-fit acceptance is claimed.**

Run `npm run build:shape`, then open `dist/maka-shape-review-v0.7.html`. Full GLB, Blender source and authoring/build/test programs are included. See `docs/realism/CHECKPOINT-0.7.md` and `verification/shape-07/`. Existing baseline and lab are preserved; no deployment or merge to main is implied.

## Current checkpoint 0.6 — hardening, construction and efficiency

A conservative pre-decode static GLB policy, source-bound simulation evidence, resource ownership and demand rendering now accompany a lighter 87,848-triangle construction draft with approximate neck/cuff/stitch details. The guided skirt bake has been rerun with consecutive free-vertex motion metrics and final-surface diagnostics. A new full-outer solve was actually executed and **rejected**; it is not the default. One reference size only; no calibrated fit or physical-phone acceptance. See `docs/realism/CHECKPOINT-0.6.md`, `verification/v0.6/`, and the missing-input `GARMENT-SPEC-TEMPLATE.json`.

The CI workflow is supplied; remote run status is separate from local passing tests. Complete current source/assets and previous baseline remain available. Main remains the rollback baseline.

## Material inspection checkpoint 0.5

This iteration adds distinct procedural normal/roughness maps for crepe, satin and dry weave, a texture-detail comparison switch, softer filtered ground shadows, exposure and light-angle controls, and back/cuff inspection views. It does **not** replace or expand the v0.4 partial cloth simulation. Materials are illustrative, not scanned/calibrated fabric. See `docs/realism/CHECKPOINT-0.5.md` and `verification/v0.5/` for scope and checks.

## Realism pilot branch — static cloth-bake checkpoint 0.4

This branch adds an authored **connected-sleeve** abaya draft and an actual Blender offline **lower-skirt-only** cloth bake, alongside the complete v0.2 baseline. Run `npm run build:lab` and open `dist/maka-realism-lab.html`. Compare the new baked asset with v0.2 using the viewer switch. The upper garment, sleeves and inner dress stay fixed; only the lower skirt is free in the shipped bake. Full-outer experiments failed the stability/clearance checks and are not the default. It is one reference-size draft, **not** a production pattern, calibrated fitting system or live browser simulation. Known interpenetration/convergence diagnostics remain visible in the UI and reports.

Complete authored Blender source and baked GLB are included as checksummed public text transport in `lab/assets/`, restored automatically at build time; nothing is redacted. Development programs such as Blender itself are installed separately. See `tools/pilot/README.md`, `docs/realism/PLAN.md`, and `verification/v0.4/`. Baseline `main` remains the rollback point.

> **Repository distribution:** The owner has explicitly requested that the complete project, including reference assets, be kept in this public repository during development. Public availability is not proof of third-party commercial rights. See asset notices.

## Reproduce the complete baseline

```sh
npm install
npm run build
npm test
npm start
```

`restore-assets.mjs` restores original binary assets and vendored libraries from checksummed base64 pack parts using Node built-ins. Assets are fully included, not redacted or downloaded from third-party URLs. The pack is only a transport format for the connected repository tool; it is not encryption or access control. `npm run build` produces the same standalone offline HTML in `dist/maka-demo.html`.

Baseline v0.2 is preserved on `main`. New realism work will happen separately; there is no hosted deployment yet.

# مكة · MAKA Fitting Lab

إصدار 0.2: نموذج تجريبي شغّال لاختبار رحلة المقاسات وأربع قصّات مختلفة مستوحاة من الصور المرفقة. **ليس نظام توصية مقاس، ولا محاكاة تفصيل معتمدة.**

## جرّبه فورًا

افتح `index.html` في Chrome أو Edge على الكمبيوتر. الملف مستقل: الخط والمكتبات والجسم مضمّنين؛ لا يحتاج إنترنت أو تسجيل دخول. لو عارض الملفات على الموبايل لا يشغّل JavaScript، افتحه في متصفح كامل أو استخدم استضافة HTTPS ثابتة.

للتشغيل محليًا:

```sh
python3 -m http.server 4173
```

ثم افتح `http://localhost:4173`. لا يلزم Node لتجربة الملف المبني. للمشاركة على الموبايل، استضف الملفات على خدمة static hosting؛ لا يوجد نشر عام تلقائي في هذا التسليم.

## جرّب بالترتيب

1. اختَر واحدًا من الموديلات الأربعة أعلى الصفحة. اضغط الصورة المرجعية أسفل المجسّم لتكبيرها.
2. غيّر الطول والصدر والوسط والأرداف والكتف، أو اختر نموذجًا محفوظًا للتجربة.
2. بدّل بين «القطعة» و«المنيكان»، وجرّب أمام / جانب أو السحب للدوران.
3. افتح «القطعة» وغيّر اللون، طول العباية، الوسع الإضافي، وطول الكم.
4. نزّل JSON للإعدادات إذا رغبت؛ هذا تنزيل محلي صريح، وليس إرسال بيانات.
5. لا ترسل ملف الإعدادات الحقيقي في issue عامة. استخدم قيمًا مصطنعة للإبلاغ عن المشاكل.

## المنفّذ بالفعل

- واجهة عربية RTL، ألوان دليل الهوية المرفق، وخط IBM Plex Sans Arabic.
- جسم أنثوي بارامتري من مكتبة `ahzs645/body-model`، وليس أشكالًا بدائية موضوعة فوق بعضها.
- إعادة بناء شبكة الجسم عند تغيير المقاسات. الطول النهائي موحّد هندسيًا إلى الطول المدخل.
- أربع قصّات هندسية مستقلة: واسعة بخطّين وياقة، مفتوحة بداخلية فاتحة وأساور، حزام بربطة وكم مزموم، ومفتوحة بحواف فضية.
- عشر صور مرجعية للألوان مرتبطة بالتصميم؛ لا تُمدّد الصور ولا تُعرض على أنها try-on.
- الأطوال والأكمام والوسع متغيرة؛ في عرض القطعة فقط يُخفى الرأس وجزء من شبكة الجذع المغطاة لتقليل التداخلات، وليس اعتمادًا على حل تصادم قماش. عرض المنيكان يعرض الجسم الأصلي كاملاً.
- عرض WebGL باستخدام Three.js وOrbitControls؛ بديل خطأ واضح عند فشل الرسوم.
- فحص المدخلات، أمثلة نسب، مساعدة قياس، إعادة ضبط، وتنزيل إعدادات.
- لا رفع صور شخصية، لا حسابات، لا وزن مطلوب، لا حفظ تلقائي، لا تحليلات ولا طلبات شبكة من التطبيق.

## غير المنفّذ — حدود لا نخبّيها

- لا Anny أو clad-body أو GarmentCode أو محاكاة قماش في البناء الحالي.
- محيطات الجسم الناتجة لم تُعاير مقابل الأرقام المدخلة؛ إدخال رقم صحيح لا يعني تطابق الشبكة معه بدقة. فقط الطول يُوحّد هندسيًا في هذه النسخة.
- القيم غير المدخلة في مكتبة الجسم تستخدم متوسطات upstream؛ لا يتم جمع الوزن من العميلة ولا استنتاج وزنها.
- القطعة تقريب من الصور وليست باترون مكة. صور المرجع صور ثابتة مقدمة من المستخدم وليست نتيجة محاكاة. الطيات هندسية، لا فيزياء خامة ولا قياس شد أو تصادم معتمد.
- حدود المقاسات الحالية لتجربة المحرك وليست تقسيمًا لعميلات مكة أو حدود الخدمة.
- طول العباية يُخفض عند اللزوم لعدم النزول أسفل مستوى الأرض في النموذج؛ الحد يتغير مع الطول.
- يحتاج فحص مصدر أصول الجسم والبيانات المرفقة قبل الاستعمال التجاري رغم وجود MIT بالمستودع.
- لا checkout أو ربط متجر أو تخزين مقاسات أو نشر سحابي في النسخة الحالية.

## تطوير وبناء

المتطلبات: Node 22+، Python 3 للخادم المحلي، npm.

```sh
npm install
npm run build
npm test
npm start
```

البناء يولّد `index.html` و`dist/maka-demo.html` متطابقين من `src/`. يضمّن الجسم والخط والمكتبات داخل HTML لكي يعمل بلا CDN. لا تعدّل الملف المولّد يدويًا.

اختبارات المتصفح (اختيارية، تحتاج Playwright وChromium):

```sh
npm install --no-save playwright
CHROMIUM_PATH=/path/to/chromium node tests/browser.mjs
```

## خريطة الملفات

- `src/app.js`: الواجهة، إنشاء الجسم، العباية التوضيحية، المشهد، الإدخال والتنزيل.
- `src/measurements.js`: مخطط المدخلات والتحويل إلى معاملات الجسم وحسابات العباية.
- `src/shell.html` / `src/style.css`: التصميم.
- `vendor/`: الاعتماديات والأصول مع تراخيصها الأصلية.
- `docs/PRD.md`: نطاق المنتج وتجربة العميلة.
- `docs/ARCHITECTURE.md`: المعمارية الحالية والمستهدفة.
- `docs/DECISIONS.md`: القرارات والبدائل.
- `docs/ROADMAP.md`: المهام وشروط عبور المراحل.
- `docs/TEST-PLAN.md`: الاختبارات وما لا تثبته.
- `docs/PRIVACY-AND-LICENSES.md`: الخصوصية والتراخيص.
- `qa/`: سجل الاختبارات الآلية وصور مراجعة التطوير.

## حالة GitHub

محاولة إنشاء المستودع الخاص `cveeez4/maka-virtual-fitting` رجعت HTTP 403: `Resource not accessible by personal access token`.
**لم يتم إنشاء ريبو، أو رفع ملفات، أو نشر موقع على GitHub.** الملفات جاهزة لرفعها بعد منح اتصال GitHub صلاحية إنشاء مستودع، أو إتاحة مستودع موجود قابل للكتابة. لا ترسل أي token في الشات.

المقترح: مستودع Private. لا تغيّر الرؤية إلى Public لمجرد تسهيل الاستضافة.

## المصادر والتراخيص

راجع `THIRD_PARTY_NOTICES.md` وملفات LICENSE الأصلية في vendor. لم يُحدد ترخيص نشر عام لكود المشروع الخاص؛ تراخيص المكونات الأصلية لا تتغير.

## صور المرجع وحقوق المشاركة

الصور المرفقة مضمّنة داخليًا للمراجعة الخاصة فقط. توفير المستخدم للصور لا يثبت ملكية حقوق النشر أو إذن إعادة النشر العام. لا ترفع هذا البناء أو مجلد الصور أو لقطات الاختبار علنًا قبل التحقق من الإذن. تفاصيل المرجع في `docs/V0.2-CHANGES.md`.
