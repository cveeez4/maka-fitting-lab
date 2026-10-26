> Distribution update: the repository owner explicitly requested publication of the complete development project, including reference assets, in this public repository. The pack is not encryption. This does not grant a general reuse license to the photographs or resolve third-party commercial provenance. Earlier private-review wording below describes the original delivery, not the current repository visibility.

# الخصوصية والتراخيص

## البيانات في v0.2

تُحفظ القيم داخل JavaScript في ذاكرة الصفحة فقط. لا localStorage، لا cookies من كود التطبيق، لا analytics ولا طلبات شبكة ولا رفع صور. ملف JSON يُكتب على جهاز المستخدم عند الضغط صراحة على التنزيل. إعادة تحميل الصفحة تفقد الإعدادات. لا تضف قياسات حقيقية إلى GitHub أو لقطات issues.

السيرفر المستضيف لاحقًا قد يسجل IP وطلبات HTML حتى لو لم يرسل التطبيق المقاسات؛ الخصوصية المحلية لا تعني أن مزود استضافة عام بلا سجلات. أي حفظ/إرسال لاحق يحتاج تصميم موافقة واحتفاظ وحذف وتشفير وصلاحيات قبل إضافته.

## المكونات المستخدمة فعليًا

- Three.js 0.180.0، MIT، من npm tarball الرسمي. يشمل OrbitControls.
- body-model من ahzs645، upstream MIT. snapshot مستودع main جرى تنزيله أثناء البناء؛ تجزئات الملفات المستخدمة مسجلة في VENDOR_SHA256SUMS.txt. لا تعتمد على main المتغير في بناء إنتاج. SHA المرجعي الذي عرضته أدوات GitHub أثناء المراجعة: f4317e93f8019f19c7bce6d7873767555239db20؛ التجزئات هي مرجع الأصول الفعلية هنا.
- IBM Plex Sans Arabic، Google Fonts / IBM، SIL OFL 1.1. ملفات الخط وOFL محفوظة.
- esbuild أداة بناء، لا طلبات runtime.

## بوابة ترخيص قبل الإنتاج

وجود MIT في body-model لا يُغني عن التحقق من مصدر mesh ومعاملات الانحدار والبيانات التدريبية/الإحصائية وحقوق توزيعها. هذا prototype مغلق للمراجعة، لا تصريح جاهزية تجارية. احتفظ بإشعارات upstream في أي بناء موزع.

لا تُعتبر كل موارد GitHub مفتوحة للاستخدام التجاري. GarmentCode الأساسي MIT لكن فرع NvidiaWarp-GarmentCode الموثق يذكر non-commercial. أصول SMPL/SMPL-X قد تخضع لترخيص مستقل حتى داخل مكتبة Apache. لا تستخدم أصلًا أو وزن نموذج بلا سجل مصدر وترخيص.

## سياسة نشر المشروع

يفضل مستودع خاص حسب الخطة. لم يُمنح ترخيص نشر عام للكود المخصص تلقائيًا. لا ترفع باترونات أو صور عميلات أو مفاتيح. لا تضمّن token في HTML أو package.json. أسرار النشر مستقبلًا تُحفظ في GitHub Secrets من خلال قناة آمنة.

## الصور في الإصدار 0.2
صور المستخدم المرجعية مضمّنة محليًا، وليست مرخصة ضمن MIT أو OFL. لا تنشرها أو لقطاتها علنًا قبل التحقق من الحقوق والموافقات.
