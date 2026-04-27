/**
 * Uniex pitch deck — 15-page Arabic content, structured.
 *
 * This is the SOURCE CONTENT mirrored from the user's
 * `presentation.docx` exactly — same order, same words, same tone.
 * Layout decisions live in the slide renderers; this module is just
 * the data.
 */

export type UniexSlide =
  | { kind: 'master' }
  | { kind: 'cover' }
  | { kind: 'problem' }
  | { kind: 'solution' }
  | { kind: 'process' }
  | { kind: 'differentiators' }
  | { kind: 'foundations' }
  | { kind: 'programs-intro' }
  | { kind: 'program-detail'; key: 'bedaya' | 'masar' | 'riyada' }
  | { kind: 'school-benefits' }
  | { kind: 'metrics' }
  | { kind: 'impact' }
  | { kind: 'team' }
  | { kind: 'team-detail' }
  | { kind: 'cta' };

export const UNIEX_SLIDES: UniexSlide[] = [
  { kind: 'cover' },
  { kind: 'problem' },
  { kind: 'solution' },
  { kind: 'process' },
  { kind: 'differentiators' },
  { kind: 'foundations' },
  { kind: 'programs-intro' },
  { kind: 'program-detail', key: 'bedaya' },
  { kind: 'program-detail', key: 'masar' },
  { kind: 'program-detail', key: 'riyada' },
  { kind: 'school-benefits' },
  { kind: 'metrics' },
  { kind: 'impact' },
  // 'team' (the old Arabic-intro variant) and 'master' (style guide)
  // are removed from the deck — the user only wants the team grid
  // (`team-detail`) shown, and the master slide isn't part of the
  // presentation anymore. Both kinds remain in the type union so any
  // legacy localStorage variant pick / hidden flag still type-checks.
  { kind: 'team-detail' },
  { kind: 'cta' },
];

/** Section labels used in chrome (bilingual; chrome picks one). */
export const SECTION_LABEL: Record<UniexSlide['kind'], string> = {
  master: 'الستايل',
  cover: 'تقديم',
  problem: 'التحدي',
  solution: 'الحل',
  process: 'كيف نبني القرار',
  differentiators: 'ما الذي يميز التجربة',
  foundations: 'الأسس',
  'programs-intro': 'برامج «أثر»',
  'program-detail': 'مسار',
  'school-benefits': 'فوائد المدرسة',
  metrics: 'مؤشرات الأثر',
  impact: 'التجربة الواقعية',
  team: 'الفريق والشركاء',
  'team-detail': 'الفريق والشركاء',
  cta: 'تواصل معنا',
};

/* ─────────────────────────  per-slide content  ─────────────────────── */

export const COVER = {
  brand: 'يونكس',
  brandSub: 'Uniex',
  headline: 'منصة تساعد الطلاب على اختيار التخصص والجامعة والبيئة الطلابية الأنسب لهم',
  subhead:
    'نقدم رحلة متكاملة تساعد طلابكم على اختيار التخصص وفهم الواقع الجامعي، لتمكين الطالب من اتخاذ قرار أكاديمي واعٍ مدعوم بفهم واقعي للتخصص والجامعة.',
  tag: '#One_Platform',
};

export const PROBLEM = {
  title: 'التحدي الذي يواجه طلاب المرحلة الثانوية',
  pains: [
    'لا يفهم الطالب ميوله بشكل دقيق',
    'لا يمتلك آلية واضحة لاختيار التخصص',
    'يرى الجامعات من زاوية تسويقية فقط',
  ],
  outcome: 'النتيجة: قرارات متسرعة… تغيير تخصص… وعدم استقرار',
  schoolRole: 'دور المدرسة اليوم: تقديم توجيه حقيقي قبل اتخاذ القرار',
};

export const SOLUTION = {
  title: 'الحل: منظومة متكاملة',
  pillars: [
    {
      icon: '🧠',
      title: '«أثر»',
      body: 'قياس الميول + بناء قرار أكاديمي',
    },
    {
      icon: '🎓',
      title: '«يونكس»',
      body: 'الصورة الواقعية للدراسة الجامعية',
    },
  ],
  closer: 'الطالب لا يختار بناءً على تخمين — بل على فهم + تجربة واقعية.',
};

export const PROCESS = {
  title: 'كيف نبني القرار الأكاديمي لدى الطالب؟',
  intro: 'رحلة تعليمية متكاملة:',
  phases: [
    {
      label: 'أولًا',
      title: '«أثر»',
      steps: ['قياس الميول المهنية', 'تحليل النتائج', 'بناء قرار أكاديمي واضح'],
    },
    {
      label: 'ثانيًا',
      title: '«يونكس»',
      steps: [
        'نقل التجربة الواقعية من داخل الجامعات',
        'شرح التخصص كما يُعاش فعليًا',
        'توضيح البيئة الجامعية والحياة الدراسية',
      ],
      footer: 'من خلال سفراء يونكس.',
    },
  ],
};

export const DIFFERENTIATORS = {
  title: 'ما الذي يميز التجربة؟',
  items: [
    'قياس علمي معتمد (هولاند)',
    'إرشاد مهني من مختصين',
    'نقل واقعي للحياة الجامعية',
    'صورة واقعية للجامعات (بدون تسويق)',
    'إمكانية تنظيم معرض جامعات داخل المدرسة (من الدول الأكثر اهتمامًا لدى الطلاب)',
  ],
};

export const FOUNDATIONS = {
  title: 'الأسس التي تقوم عليها تجربة يونكس',
  intro: 'منظومة متكاملة تجمع بين الاعتماد الأكاديمي، والخبرة، والتطبيق الواقعي.',
  pillars: [
    {
      title: 'أساس أكاديمي',
      body: 'مقياس هولاند (معتمد محليًا وعالميًا) — حقيبة تدريبية محكمة أكاديمياً.',
    },
    {
      title: 'كوادر مؤهلة',
      body: 'مدربون معتمدون في الإرشاد الأكاديمي والمهني.',
    },
    {
      title: 'تجربة واقعية',
      body: 'سفراء يونكس من داخل الجامعات — نقل حقيقي للحياة الجامعية والتخصصات.',
    },
    {
      title: 'منظومة داعمة',
      body: 'شراكات مع كلاسيرا وفلك هب — خريجو برامج (مسك) — شراكات مع جامعات محلية وعالمية.',
    },
  ],
};

export const PROGRAMS_INTRO = {
  title: 'برامج «أثر»',
  subtitle: 'نقدم ثلاثة مسارات، تختلف في العمق حسب احتياج الطالب والمدرسة:',
  paths: [
    { key: 'bedaya', name: 'أثر البداية', duration: '4 ساعات', tagline: 'مسار تأسيسي' },
    { key: 'masar', name: 'أثر المسار', duration: '9 ساعات', tagline: 'مسار متكامل' },
    { key: 'riyada', name: 'أثر الريادة', duration: '50 ساعة', tagline: 'مسار معمّق' },
  ],
};

export const PROGRAMS = {
  bedaya: {
    name: 'أثر البداية',
    duration: '4 ساعات',
    description: 'مسار تأسيسي يساعد الطالب على فهم ميوله المهنية، ويمنحه أساسًا واضحًا لاختيار التخصص.',
    goal: 'رفع وعي الطالب بذاته وميوله المهنية، قبل أن يبدأ التفكير في التخصص.',
    phases: ['قياس الميول المهنية', 'فهم نتائج القياس', 'التعرف على آلية اختيار التخصص'],
    outputs: [
      'وضوح أولي للاتجاه الأكاديمي',
      'تقرير فردي لكل طالب',
      'تحديد مستوى احتياج الطالب لمسارات أعمق',
    ],
  },
  masar: {
    name: 'أثر المسار',
    duration: '9 ساعات',
    description: 'مسار متكامل يساعد الطالب على بناء قراره الأكاديمي، من خلال الربط بين ميوله والتخصصات بشكل عملي.',
    goal: 'تحويل الميول المهنية للطالب إلى خيارات تخصص واضحة ومحددة.',
    phases: [
      'تحليل الميول المهنية',
      'مفاضلة بين التخصصات',
      'محاكاة واقعية للتخصص مع سفراء يونكس',
      'جلسة إرشاد فردية',
    ],
    outputs: ['تقرير مهني تحليلي', 'صورة واقعية عن التخصص', 'قرار أكاديمي واضح بخيارات محددة'],
  },
  riyada: {
    name: 'أثر الريادة',
    duration: '50 ساعة',
    description: 'مسار معمّق للطلاب الأعلى جاهزية، يهدف إلى تثبيت القرار الأكاديمي وربطه بالمستقبل المهني.',
    goal: 'الوصول إلى قرار أكاديمي دقيق ومدروس بعمق.',
    phases: ['تحليل معمّق للميول والقدرات', 'معايشة واقعية للتخصص', 'إرشاد فردي متقدم'],
    outputs: [
      'انتقال من "اختيار محتمل" إلى "قرار أكيد"',
      'جاهزية أعلى للمسارات التنافسية والابتعاث',
      'رؤية أوضح للمستقبل الأكاديمي والمهني',
    ],
  },
};

export const SCHOOL_BENEFITS = {
  title: 'ماذا تستفيد المدرسة؟',
  groups: [
    {
      heading: 'على مستوى الطلاب',
      items: ['وضوح أعلى في اختيار التخصص', 'قرارات أكثر استقرارًا'],
    },
    {
      heading: 'على مستوى المدرسة',
      items: [
        'رفع جودة التوجيه الأكاديمي',
        'تعزيز ثقة أولياء الأمور',
        'تغطية إعلامية ومحتوى قابل للنشر',
        'تقديم تجربة تميّز المدرسة',
      ],
    },
  ],
  closer: 'المدرسة لا تقدم برنامجًا… بل تقدم تجربة تصنع فرقًا حقيقيًا.',
};

export const METRICS = {
  title: 'مؤشرات الأثر والخبرة',
  stats: [
    { value: '+2,500', label: 'طالب مستفيد' },
    { value: '+60', label: 'مدرسة' },
    { value: '+8,000', label: 'مستخدم للمنصة' },
  ],
  notes: ['قياس قبلي / بعدي للأثر', 'تقارير فردية لكل طالب', 'بيانات قابلة للمتابعة'],
  closer: 'تجربة مطبقة… ونتائج قابلة للقياس.',
};

export const IMPACT = {
  title: 'الأثر من واقع التجربة',
  caption: 'لقطات حقيقية من طلاب ومدارس خاضوا التجربة',
  question:
    'كيف تغيّر وضوح القرار؟ وكيف أصبح الطالب أكثر ثقة بمساره؟',
  videoPlaceholder: 'فيديو',
};

export const TEAM = {
  title: 'الفريق والشركاء',
  intro: 'يقف خلف هذه المنظومة فريق متخصص في:',
  specialties: ['الإرشاد الأكاديمي', 'بناء البرامج التعليمية', 'العمل مع المدارس'],
  closer: 'بدعم من شركاء في القطاع التعليمي والتقني.',
};

export const TEAM_DETAIL = {
  team: [
    { id: 'turk',  name: 'Ahmet Turk',     role: 'CEO' },
    { id: 'kakkah', name: 'Memduh Kakkah', role: 'COO' },
    { id: 'emre',  name: 'Ahmet Emre',     role: 'Operations Manager' },
  ],
  board: [
    { id: 'mahdy',  name: 'Ahmed Mahdy',     role: 'Business Advisor' },
    { id: 'gawish', name: 'Muhammad Gawish', role: 'Edtech Advisor' },
    { id: 'tork',   name: 'Magdy Tork',      role: 'Legal Advisor' },
  ],
  partners: [
    { id: 'supercharger', name: 'Supercharger Ventures' },
    { id: 'classera',     name: 'Classera' },
    { id: 'falak',        name: 'Falak Investment Hub' },
  ],
};

export const CTA = {
  title: 'يمكنكم تقديم هذه التجربة لطلابكم بسهولة',
  steps: ['تحديد الفئة المناسبة', 'اختيار المسار', 'جدولة التنفيذ'],
  cta: '📞 تواصل معنا لتصميم البرنامج بما يناسب مدرستكم',
  contact: 'كود الواتس',
};
