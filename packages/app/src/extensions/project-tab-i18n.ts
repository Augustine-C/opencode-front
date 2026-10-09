import type { DesktopNativeLocale } from "@/runtime/i18n/desktop-native"
import type en from "@/runtime/i18n/en"

type Key =
  | "settings.appearance.row.tabGroups.title"
  | "settings.appearance.row.tabGroups.description"
  | "session.tab.group.unassigned"

type Translation = Pick<typeof en, Key>

// Port-owned translations stay separate from the imported upstream dictionaries.
// Terminology and review references: docs/project-tab-localization.md.
export const projectTabTranslations = {
  zh: {
    "settings.appearance.row.tabGroups.title": "按项目分组标签页",
    "settings.appearance.row.tabGroups.description": "在横向或纵向标签页布局中，将同一项目的会话放在一起",
    "session.tab.group.unassigned": "未分配",
  },
  zht: {
    "settings.appearance.row.tabGroups.title": "依專案將分頁分組",
    "settings.appearance.row.tabGroups.description": "在水平或垂直分頁配置中，將同一專案的工作階段放在一起",
    "session.tab.group.unassigned": "未指派",
  },
  ko: {
    "settings.appearance.row.tabGroups.title": "프로젝트별로 탭 그룹화",
    "settings.appearance.row.tabGroups.description":
      "가로 또는 세로 탭 레이아웃에서 같은 프로젝트의 세션을 함께 표시합니다",
    "session.tab.group.unassigned": "할당되지 않음",
  },
  de: {
    "settings.appearance.row.tabGroups.title": "Registerkarten nach Projekt gruppieren",
    "settings.appearance.row.tabGroups.description":
      "Sitzungen desselben Projekts in beiden Registerkartenlayouts zusammenhalten",
    "session.tab.group.unassigned": "Nicht zugewiesen",
  },
  es: {
    "settings.appearance.row.tabGroups.title": "Agrupar pestañas por proyecto",
    "settings.appearance.row.tabGroups.description":
      "Mantener juntas las sesiones del mismo proyecto en ambas disposiciones de pestañas",
    "session.tab.group.unassigned": "Sin asignar",
  },
  fr: {
    "settings.appearance.row.tabGroups.title": "Regrouper les onglets par projet",
    "settings.appearance.row.tabGroups.description":
      "Garder les sessions d’un même projet ensemble dans les deux dispositions d’onglets",
    "session.tab.group.unassigned": "Non attribué",
  },
  da: {
    "settings.appearance.row.tabGroups.title": "Gruppér faner efter projekt",
    "settings.appearance.row.tabGroups.description": "Hold sessioner fra samme projekt samlet i begge fanelayouts",
    "session.tab.group.unassigned": "Ikke tildelt",
  },
  ja: {
    "settings.appearance.row.tabGroups.title": "プロジェクトごとにタブをグループ化",
    "settings.appearance.row.tabGroups.description":
      "横向き・縦向きのどちらのタブ配置でも、同じプロジェクトのセッションをまとめて表示します",
    "session.tab.group.unassigned": "未割り当て",
  },
  pl: {
    "settings.appearance.row.tabGroups.title": "Grupuj karty według projektu",
    "settings.appearance.row.tabGroups.description": "Trzymaj sesje tego samego projektu razem w obu układach kart",
    "session.tab.group.unassigned": "Nieprzypisane",
  },
  ru: {
    "settings.appearance.row.tabGroups.title": "Группировать вкладки по проектам",
    "settings.appearance.row.tabGroups.description":
      "Держать сессии одного проекта вместе при любом расположении вкладок",
    "session.tab.group.unassigned": "Не назначено",
  },
  uk: {
    "settings.appearance.row.tabGroups.title": "Групувати вкладки за проєктами",
    "settings.appearance.row.tabGroups.description": "Тримати сесії одного проєкту разом за обох розташувань вкладок",
    "session.tab.group.unassigned": "Не призначено",
  },
  bs: {
    "settings.appearance.row.tabGroups.title": "Grupiši kartice po projektu",
    "settings.appearance.row.tabGroups.description": "Drži sesije istog projekta zajedno u oba rasporeda kartica",
    "session.tab.group.unassigned": "Nedodijeljeno",
  },
  ar: {
    "settings.appearance.row.tabGroups.title": "تجميع علامات التبويب حسب المشروع",
    "settings.appearance.row.tabGroups.description": "إبقاء جلسات المشروع نفسه معًا في كلا تخطيطي علامات التبويب",
    "session.tab.group.unassigned": "غير مخصص",
  },
  he: {
    "settings.appearance.row.tabGroups.title": "קיבוץ כרטיסיות לפי פרויקט",
    "settings.appearance.row.tabGroups.description": "שמירת הפעלות של אותו פרויקט יחד בשתי פריסות הכרטיסיות",
    "session.tab.group.unassigned": "לא הוקצה",
  },
  no: {
    "settings.appearance.row.tabGroups.title": "Grupper faner etter prosjekt",
    "settings.appearance.row.tabGroups.description": "Hold sesjoner fra samme prosjekt samlet i begge faneoppsettene",
    "session.tab.group.unassigned": "Ikke tilordnet",
  },
  br: {
    "settings.appearance.row.tabGroups.title": "Agrupar guias por projeto",
    "settings.appearance.row.tabGroups.description":
      "Manter as sessões do mesmo projeto juntas nos dois layouts de guias",
    "session.tab.group.unassigned": "Não atribuído",
  },
  th: {
    "settings.appearance.row.tabGroups.title": "จัดกลุ่มแท็บตามโปรเจกต์",
    "settings.appearance.row.tabGroups.description": "รวมเซสชันจากโปรเจกต์เดียวกันไว้ด้วยกันในเค้าโครงแท็บทั้งสองแบบ",
    "session.tab.group.unassigned": "ไม่ได้กำหนด",
  },
  tr: {
    "settings.appearance.row.tabGroups.title": "Sekmeleri projeye göre grupla",
    "settings.appearance.row.tabGroups.description":
      "Aynı projenin oturumlarını her iki sekme düzeninde de bir arada tut",
    "session.tab.group.unassigned": "Atanmamış",
  },
  hi: {
    "settings.appearance.row.tabGroups.title": "प्रोजेक्ट के अनुसार टैब समूहित करें",
    "settings.appearance.row.tabGroups.description": "दोनों टैब लेआउट में एक ही प्रोजेक्ट के सेशन एक साथ रखें",
    "session.tab.group.unassigned": "असाइन नहीं किया गया",
  },
  nl: {
    "settings.appearance.row.tabGroups.title": "Tabbladen groeperen per project",
    "settings.appearance.row.tabGroups.description":
      "Sessies van hetzelfde project bij elkaar houden in beide tabbladindelingen",
    "session.tab.group.unassigned": "Niet toegewezen",
  },
  id: {
    "settings.appearance.row.tabGroups.title": "Kelompokkan tab berdasarkan proyek",
    "settings.appearance.row.tabGroups.description": "Satukan sesi dari proyek yang sama dalam kedua tata letak tab",
    "session.tab.group.unassigned": "Belum ditetapkan",
  },
  vi: {
    "settings.appearance.row.tabGroups.title": "Nhóm tab theo dự án",
    "settings.appearance.row.tabGroups.description":
      "Giữ các phiên của cùng một dự án cạnh nhau trong cả hai bố cục tab",
    "session.tab.group.unassigned": "Chưa được chỉ định",
  },
  it: {
    "settings.appearance.row.tabGroups.title": "Raggruppa le schede per progetto",
    "settings.appearance.row.tabGroups.description":
      "Mantieni insieme le sessioni dello stesso progetto in entrambe le disposizioni delle schede",
    "session.tab.group.unassigned": "Non assegnato",
  },
  ur: {
    "settings.appearance.row.tabGroups.title": "پروجیکٹ کے لحاظ سے ٹیب گروپ کریں",
    "settings.appearance.row.tabGroups.description": "دونوں ٹیب لے آؤٹس میں ایک ہی پروجیکٹ کے سیشن ساتھ رکھیں",
    "session.tab.group.unassigned": "غیر تفویض کردہ",
  },
  pa: {
    "settings.appearance.row.tabGroups.title": "پروجیکٹ دے حساب نال ٹیب گروپ کرو",
    "settings.appearance.row.tabGroups.description": "دونوں ٹیب لے آؤٹس وچ اکّو پروجیکٹ دے سیشن اکٹھے رکھو",
    "session.tab.group.unassigned": "غیر تفویض شدہ",
  },
  az: {
    "settings.appearance.row.tabGroups.title": "Tabları layihəyə görə qruplaşdır",
    "settings.appearance.row.tabGroups.description":
      "Eyni layihənin sessiyalarını hər iki tab düzülüşündə bir yerdə saxla",
    "session.tab.group.unassigned": "Təyin edilməyib",
  },
  fi: {
    "settings.appearance.row.tabGroups.title": "Ryhmittele välilehdet projektin mukaan",
    "settings.appearance.row.tabGroups.description":
      "Pidä saman projektin istunnot yhdessä molemmissa välilehtiasetteluissa",
    "session.tab.group.unassigned": "Ei määritetty",
  },
  sv: {
    "settings.appearance.row.tabGroups.title": "Gruppera flikar efter projekt",
    "settings.appearance.row.tabGroups.description": "Håll sessioner från samma projekt samlade i båda fliklayouterna",
    "session.tab.group.unassigned": "Otilldelad",
  },
  am: {
    "settings.appearance.row.tabGroups.title": "ትሮችን በፕሮጀክት አቧድን",
    "settings.appearance.row.tabGroups.description": "በሁለቱም የትር አቀማመጦች የአንድ ፕሮጀክት ክፍለ ጊዜዎችን በአንድ ላይ አቆይ",
    "session.tab.group.unassigned": "ያልተመደበ",
  },
  bg: {
    "settings.appearance.row.tabGroups.title": "Групиране на разделите по проект",
    "settings.appearance.row.tabGroups.description":
      "Дръжте сесиите от един и същ проект заедно и в двете подредби на разделите",
    "session.tab.group.unassigned": "Неприсвоен",
  },
  bn: {
    "settings.appearance.row.tabGroups.title": "প্রকল্প অনুযায়ী ট্যাব গোষ্ঠীবদ্ধ করুন",
    "settings.appearance.row.tabGroups.description": "উভয় ট্যাব বিন্যাসে একই প্রকল্পের সেশনগুলো একসঙ্গে রাখুন",
    "session.tab.group.unassigned": "বরাদ্দ করা হয়নি",
  },
  ca: {
    "settings.appearance.row.tabGroups.title": "Agrupa les pestanyes per projecte",
    "settings.appearance.row.tabGroups.description":
      "Mantén juntes les sessions del mateix projecte en les dues disposicions de pestanyes",
    "session.tab.group.unassigned": "Sense assignar",
  },
  cs: {
    "settings.appearance.row.tabGroups.title": "Seskupovat karty podle projektu",
    "settings.appearance.row.tabGroups.description":
      "Ponechat relace stejného projektu pohromadě v obou rozloženích karet",
    "session.tab.group.unassigned": "Nepřiřazeno",
  },
  dv: {
    "settings.appearance.row.tabGroups.title": "ޕްރޮޖެކްޓް އަށް ބަލައި ޓެބްތައް ގްރޫޕް ކުރުން",
    "settings.appearance.row.tabGroups.description":
      "ދެ ޓެބް ލޭއައުޓްގައިވެސް އެއް ޕްރޮޖެކްޓްގެ ސެޝަންތައް އެއްތަނުގައި ބަހައްޓާ",
    "session.tab.group.unassigned": "ޙަވާލުނުކުރެވިގެންނެވެ",
  },
  dz: {
    "settings.appearance.row.tabGroups.title": "ལས་འགུལ་ལྟར་མཆོང་ལྡེ་ཚུ་སྡེ་ཚན་བཟོ།",
    "settings.appearance.row.tabGroups.description":
      "མཆོང་ལྡེའི་བཀོད་རིས་གཉིས་ཆ་རའི་ནང་ ལས་འགུལ་གཅིག་གི་ལཱ་ཡུན་ཚུ་གཅིག་ཁར་བཞག།",
    "session.tab.group.unassigned": "འགན་སྤྲོད་མ་འབད་བ།",
  },
  el: {
    "settings.appearance.row.tabGroups.title": "Ομαδοποίηση καρτελών ανά έργο",
    "settings.appearance.row.tabGroups.description":
      "Διατήρηση των συνεδριών του ίδιου έργου μαζί και στις δύο διατάξεις καρτελών",
    "session.tab.group.unassigned": "Μη εκχωρημένο",
  },
  et: {
    "settings.appearance.row.tabGroups.title": "Rühmita kaardid projekti järgi",
    "settings.appearance.row.tabGroups.description": "Hoia sama projekti seansid koos mõlemas kaartide paigutuses",
    "session.tab.group.unassigned": "Määramata",
  },
  fa: {
    "settings.appearance.row.tabGroups.title": "گروه‌بندی زبانه‌ها بر اساس پروژه",
    "settings.appearance.row.tabGroups.description": "نشست‌های یک پروژه را در هر دو چیدمان زبانه کنار هم نگه دارید",
    "session.tab.group.unassigned": "اختصاص‌نیافته",
  },
  fo: {
    "settings.appearance.row.tabGroups.title": "Bólka flipar eftir verkætlan",
    "settings.appearance.row.tabGroups.description": "Halt setur úr somu verkætlan saman í báðum flipauppsetingunum",
    "session.tab.group.unassigned": "Ikki tillutað",
  },
  hr: {
    "settings.appearance.row.tabGroups.title": "Grupiraj kartice po projektu",
    "settings.appearance.row.tabGroups.description": "Drži sesije istog projekta zajedno u oba rasporeda kartica",
    "session.tab.group.unassigned": "Nedodijeljeno",
  },
  hu: {
    "settings.appearance.row.tabGroups.title": "Lapok csoportosítása projekt szerint",
    "settings.appearance.row.tabGroups.description":
      "Az azonos projekthez tartozó munkamenetek együtt tartása mindkét lapelrendezésben",
    "session.tab.group.unassigned": "Nincs hozzárendelve",
  },
  hy: {
    "settings.appearance.row.tabGroups.title": "Խմբավորել ներդիրներն ըստ նախագծի",
    "settings.appearance.row.tabGroups.description":
      "Նույն նախագծի նիստերը միասին պահել ներդիրների երկու դասավորություններում էլ",
    "session.tab.group.unassigned": "Չնշանակված",
  },
  is: {
    "settings.appearance.row.tabGroups.title": "Flokka flipa eftir verkefni",
    "settings.appearance.row.tabGroups.description": "Halda lotum sama verkefnis saman í báðum flipauppsetningum",
    "session.tab.group.unassigned": "Óúthlutað",
  },
  ka: {
    "settings.appearance.row.tabGroups.title": "ჩანართების დაჯგუფება პროექტის მიხედვით",
    "settings.appearance.row.tabGroups.description":
      "ერთი პროექტის სესიების ერთად შენარჩუნება ჩანართების ორივე განლაგებაში",
    "session.tab.group.unassigned": "მიუნიჭებელი",
  },
  km: {
    "settings.appearance.row.tabGroups.title": "ដាក់ផ្ទាំងជាក្រុមតាមគម្រោង",
    "settings.appearance.row.tabGroups.description": "រក្សាសម័យពីគម្រោងដូចគ្នាជាមួយគ្នាក្នុងប្លង់ផ្ទាំងទាំងពីរ",
    "session.tab.group.unassigned": "មិនបានកំណត់",
  },
  lo: {
    "settings.appearance.row.tabGroups.title": "ຈັດກຸ່ມແຖບຕາມໂຄງການ",
    "settings.appearance.row.tabGroups.description": "ເກັບເຊດຊັນຈາກໂຄງການດຽວກັນໄວ້ຮ່ວມກັນໃນທັງສອງຮູບແບບແຖບ",
    "session.tab.group.unassigned": "ບໍ່ໄດ້ມອບໝາຍ",
  },
  lt: {
    "settings.appearance.row.tabGroups.title": "Grupuoti skirtukus pagal projektą",
    "settings.appearance.row.tabGroups.description":
      "Laikyti to paties projekto seansus kartu abiejuose skirtukų išdėstymuose",
    "session.tab.group.unassigned": "Nepriskirta",
  },
  lv: {
    "settings.appearance.row.tabGroups.title": "Grupēt cilnes pēc projekta",
    "settings.appearance.row.tabGroups.description": "Turēt viena projekta sesijas kopā abos ciļņu izkārtojumos",
    "session.tab.group.unassigned": "Nav piešķirts",
  },
  mk: {
    "settings.appearance.row.tabGroups.title": "Групирај ги јазичињата по проект",
    "settings.appearance.row.tabGroups.description":
      "Чувај ги сесиите од истиот проект заедно во двата распореди на јазичиња",
    "session.tab.group.unassigned": "Недоделено",
  },
  mn: {
    "settings.appearance.row.tabGroups.title": "Табуудыг төслөөр бүлэглэх",
    "settings.appearance.row.tabGroups.description": "Табын хоёр байрлалд ижил төслийн сессүүдийг хамтад нь байлгах",
    "session.tab.group.unassigned": "Оноогоогүй",
  },
  ms: {
    "settings.appearance.row.tabGroups.title": "Kumpulkan tab mengikut projek",
    "settings.appearance.row.tabGroups.description":
      "Kekalkan sesi daripada projek yang sama bersama dalam kedua-dua susun atur tab",
    "session.tab.group.unassigned": "Tidak ditetapkan",
  },
  my: {
    "settings.appearance.row.tabGroups.title": "ပရောဂျက်အလိုက် တက်ဘ်များကို အုပ်စုဖွဲ့ပါ",
    "settings.appearance.row.tabGroups.description":
      "တက်ဘ်အပြင်အဆင်နှစ်မျိုးစလုံးတွင် တူညီသောပရောဂျက်၏ အပိုင်းများကို အတူထားပါ",
    "session.tab.group.unassigned": "တာဝန်မယူထား",
  },
  ne: {
    "settings.appearance.row.tabGroups.title": "परियोजनाअनुसार ट्याबहरू समूहबद्ध गर्नुहोस्",
    "settings.appearance.row.tabGroups.description": "दुवै ट्याब लेआउटमा एउटै परियोजनाका सत्रहरू सँगै राख्नुहोस्",
    "session.tab.group.unassigned": "तोकिएको छैन",
  },
  ro: {
    "settings.appearance.row.tabGroups.title": "Grupează filele după proiect",
    "settings.appearance.row.tabGroups.description":
      "Păstrează sesiunile aceluiași proiect împreună în ambele aranjamente ale filelor",
    "session.tab.group.unassigned": "Neatribuit",
  },
  si: {
    "settings.appearance.row.tabGroups.title": "ව්‍යාපෘතිය අනුව ටැබ් කණ්ඩායම් කරන්න",
    "settings.appearance.row.tabGroups.description": "ටැබ් පිරිසැලසුම් දෙකෙහිම එකම ව්‍යාපෘතියේ සැසි එකට තබන්න",
    "session.tab.group.unassigned": "පවරා නැත",
  },
  sk: {
    "settings.appearance.row.tabGroups.title": "Zoskupovať karty podľa projektu",
    "settings.appearance.row.tabGroups.description":
      "Ponechať relácie rovnakého projektu spolu v oboch rozloženiach kariet",
    "session.tab.group.unassigned": "Nepriradené",
  },
  sl: {
    "settings.appearance.row.tabGroups.title": "Združi zavihke po projektu",
    "settings.appearance.row.tabGroups.description": "Ohrani seje istega projekta skupaj v obeh postavitvah zavihkov",
    "session.tab.group.unassigned": "Nedodeljeno",
  },
  sq: {
    "settings.appearance.row.tabGroups.title": "Gruponi skedat sipas projektit",
    "settings.appearance.row.tabGroups.description":
      "Mbajini bashkë sesionet e të njëjtit projekt në të dyja paraqitjet e skedave",
    "session.tab.group.unassigned": "E pacaktuar",
  },
  sr: {
    "settings.appearance.row.tabGroups.title": "Групиши картице по пројекту",
    "settings.appearance.row.tabGroups.description": "Држи сесије истог пројекта заједно у оба распореда картица",
    "session.tab.group.unassigned": "Није додељено",
  },
  tg: {
    "settings.appearance.row.tabGroups.title": "Гурӯҳбандии ҷадвалҳо аз рӯи лоиҳа",
    "settings.appearance.row.tabGroups.description":
      "Сессияҳои як лоиҳаро дар ҳар ду тарҳбандии ҷадвалҳо якҷоя нигоҳ доред",
    "session.tab.group.unassigned": "Таъиннашуда",
  },
  tk: {
    "settings.appearance.row.tabGroups.title": "Salgylary taslama boýunça toparla",
    "settings.appearance.row.tabGroups.description":
      "Iki salgy ýerleşişinde-de bir taslamanyň sessiýalaryny bile sakla",
    "session.tab.group.unassigned": "Bellenmedik",
  },
  uz: {
    "settings.appearance.row.tabGroups.title": "Tablarni loyiha bo‘yicha guruhlash",
    "settings.appearance.row.tabGroups.description":
      "Har ikkala tab joylashuvida bir loyihaning sessiyalarini birga saqlash",
    "session.tab.group.unassigned": "Tayinlanmagan",
  },
} satisfies Record<Exclude<DesktopNativeLocale, "en">, Translation>
