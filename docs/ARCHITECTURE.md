# المعمارية

## v0.1: تطبيق محلي بلا backend

```text
فورم RTL → validation → state (cm)
                           ├→ معاملات جسم upstream (17)
                           │  → reconstructVertices → normalize height → mesh
                           └→ مقاطع هندسية للعباية والكم → garment mesh
                                        ↓
                               Three.js + OrbitControls
                                        ↓
                           canvas / تنزيل إعدادات JSON محلي
```

- الوحدة في الواجهة: سنتيمتر. وحدة المشهد: متر. +Y لأعلى.
- المصدر: أنثى من `body-model`. يتم تعيين height/chestGirth/waistGirth/hipGirth/shoulderWidth مباشرة. القياسات الطولية الثانوية تتناسب مع الطول؛ باقي القيم متوسطات البيانات الأصلية.
- نسبة weightHeightSqrtRatio تظل القيمة الافتراضية من المتوسطات، ليست وزنًا مدخلًا أو وزنًا مستنتجًا للعميلة. هذا افتراض توضيحي وليس anthropometric fitting.
- يتم إعادة بناء الجسم، حساب حدوده وتوحيد ارتفاعه إلى height/100. لم يتم حل مطابقة باقي المحيطات.
- يتم إنشاء skeleton من الجسم لتحديد مواضع الأكتاف واتجاه الكم؛ لا تحريك هيكل في هذه النسخة.
- العباية حلقات إهليلجية متعددة + أنبوب كم لكل ذراع + حواف توضيحية. المحيط المرجعي max(chest, hips)+ease. ليست باترون خياطة.
- كل إعادة بناء تتخلص من geometries/materials السابقة. المشهد والإضاءة والكاميرا يبقون.
- ResizeObserver يغيّر حجم canvas والكاميرا. WebGL، لا متطلب WebGPU.
- الخط والأصول مضمنة في HTML، ولا تحميل ديناميكي عند التشغيل.

## الفصل المقترح لاحقًا

```text
apps/storefront     واجهة العميلة والعرض
packages/contracts مخططات قياس وقطعة وإصدار وحدود
packages/body      مزود جسم بديل/قابل للمعايرة
packages/garments  معلمات الباترون وتعريف الخامة
services/drape     مهام محاكاة خارج المتصفح، إن احتجنا
assets/catalog     أصول قطع لها مراجعة ومصدر وترخيص
```

لا تنشئ هذه الخدمات الآن لمجرد وجودها في الخطة. افصلها عندما يفرض اختبار فعلي ذلك.

## عقد مزود الجسم المقترح

```ts
type BodyInput = {
  heightCm: number; chestCm: number; waistCm: number;
  hipCm: number; shoulderWidthCm: number;
};
type BodyResult = {
  positions: Float32Array; indices: Uint32Array;
  modelVersion: string;
  targetMeasurements: BodyInput;
  measuredOutput?: Partial<BodyInput>;
  residualsCm?: Partial<BodyInput>;
  status: 'illustrative' | 'calibrated';
  assumptions: string[];
};
```

المزوّد البديل Anny+clad-body مرشح اختبار فقط. يتطلب تثبيت إصدارات متوافقة، أصولًا مسموحة تجاريًا، تعريف قياس متطابق، ومقارنة محيطات الشبكة بعد التحويل. لا يفترض توافقه الفوري مع مزود v0.1.

## عقد القطعة المقترح

معرف موديل، revision باترون، revision خامة، قياسات جسم وقياسات قطعة منفصلة، ease معلوم، أطوال، seams، texture provenance، نتائج تصادم واستقرار، وحدود supported inputs. لا تعِد استخدام cache بين خامتين أو باترونين مختلفين.

## إستراتيجية الأداء

- نسخة أولى: وضعية ثابتة، لا محاكاة متواصلة على الهاتف.
- اختبر precomputed drapes أو توليد عند الطلب مع cache، بدل فرض physics على كل زيارة.
- إن استُخدم interpolation بين أجسام، افحص التصادم ولا تَعِد أن المزج يحفظ القماش أو المقاسات.
- ضع ميزانية تحميل/زمن/ذاكرة بعد قياس أجهزة حقيقية. لا يوجد أداء هاتف حقيقي مثبت حاليًا.
