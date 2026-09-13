import { Channel } from '../types';

export interface PresetPlaylist {
  id: string;
  title: string;
  description: string;
  icon: string;
  badge: string;
  color: string;
  channels: Channel[];
}

/**
 * 1. قائمة قنوات الراديو المصرية - أولها إذاعة القرآن الكريم من القاهرة
 */
export const EGYPTIAN_RADIO_PRESET: PresetPlaylist = {
  id: 'egypt_radio',
  title: 'قنوات الراديو المصرية',
  description: 'باقة المحطات الإذاعية الرسمية والخاصة في مصر، متصدرة بإذاعة القرآن الكريم',
  icon: 'Radio',
  badge: 'مصر FM',
  color: 'from-amber-600 to-red-600',
  channels: [
    {
      id: 'eg_quran_cairo',
      name: 'إذاعة القرآن الكريم من القاهرة',
      url: 'https://stream.radiojar.com/8s5u5tpdtwzuv',
      group: 'إذاعات مصر الرسمية',
      logo: 'https://raw.githubusercontent.com/freetv-app/logos/master/images/quran-karim-cairo.png',
    },
    {
      id: 'eg_radio_9090',
      name: 'الراديو 9090 FM (El Radio 9090)',
      url: 'https://9090streaming.mobtada.com/9090FMEGYPT',
      group: 'إذاعات FM مصر',
      logo: 'https://www.9090.fm/images/logo.png',
    },
    {
      id: 'eg_sha3by_fm',
      name: 'شعبي إف إم 95 (Sha3by FM 95)',
      url: 'https://radio95.radioca.st/;',
      group: 'إذاعات FM مصر',
      logo: 'https://raw.githubusercontent.com/freetv-app/logos/master/images/shaabi-fm.png',
    },
    {
      id: 'eg_radio_hits',
      name: 'راديو هيتس 88.2 (Radio Hits FM)',
      url: 'https://radiohits882.radioca.st/;',
      group: 'إذاعات FM مصر',
      logo: 'https://raw.githubusercontent.com/freetv-app/logos/master/images/radio-hits.png',
    },
    {
      id: 'eg_onsport_fm',
      name: 'أون سبورت إف إم 93.7 (On Sport FM)',
      url: 'https://carina.streamerr.co:2020/stream/OnSportFM',
      group: 'إذاعات FM مصر',
      logo: 'https://raw.githubusercontent.com/freetv-app/logos/master/images/al-shabab-wal-riyada.png',
    },
    {
      id: 'eg_90s_fm',
      name: 'تسعينات إف إم مصر (90s FM Cairo)',
      url: 'https://eu1.fastcast4u.com/proxy/prontofm?mp=/1',
      group: 'إذاعات FM مصر',
      logo: 'https://images.zeno.fm/O1p2A3s4D5f6G7h8J9k0L1z2X3c=/300x300/smart/avatar.png',
    },
    {
      id: 'eg_nrj_egypt',
      name: 'راديو إينرجي مصر 92.1 (NRJ Egypt)',
      url: 'http://nrjstreaming.ahmed-melege.com/nrjegypt',
      group: 'إذاعات FM مصر',
      logo: 'https://raw.githubusercontent.com/freetv-app/logos/master/images/mega-fm.png',
    },
    {
      id: 'eg_rotana_masr',
      name: 'روتانا إف إم مصر والعالم العربي (Rotana FM)',
      url: 'http://philae.shoutca.st:8250/stream',
      group: 'إذاعات FM مصر',
      logo: 'https://raw.githubusercontent.com/freetv-app/logos/master/images/nagham-fm.png',
    },
    {
      id: 'eg_zaman_maspero',
      name: 'راديو زمان وروائع ماسبيرو (Radio Zaman)',
      url: 'https://radiozamen.ice.infomaniak.ch/zamen.mp3',
      group: 'إذاعات مصر الرسمية',
      logo: 'https://raw.githubusercontent.com/freetv-app/logos/master/images/radio-al-aghani.png',
    },
    {
      id: 'eg_middle_east_orient',
      name: 'إذاعة الشرق الأوسط وبنك الأغاني (Radio Orient)',
      url: 'https://stream.rcs.revma.com/7hnrkawf4p8uv.mp3',
      group: 'إذاعات مصر الرسمية',
      logo: 'https://raw.githubusercontent.com/freetv-app/logos/master/images/al-sharq-al-awsat.png',
    },
    {
      id: 'eg_monte_carlo',
      name: 'راديو مونت كارلو الدولية - مصر والعرب',
      url: 'https://montecarlodoualiya128k.ice.infomaniak.ch/mc-doualiya.mp3',
      group: 'إذاعات إخبارية وثقافية',
      logo: 'https://raw.githubusercontent.com/freetv-app/logos/master/images/radio-masr.png',
    },
    {
      id: 'eg_gouna_radio',
      name: 'راديو الجونة 100 FM (El Gouna Radio)',
      url: 'http://82.201.132.237:8000/;',
      group: 'إذاعات متنوعة',
      logo: 'https://raw.githubusercontent.com/freetv-app/logos/master/images/al-barnamaj-al-am.png',
    },
    {
      id: 'eg_radio_wayak',
      name: 'راديو وياك مصر (Radio Masr Wayak)',
      url: 'https://work.radiowayak.org/listen/live/live.mp3',
      group: 'إذاعات متنوعة',
      logo: 'https://raw.githubusercontent.com/freetv-app/logos/master/images/mahattat-masr.png',
    },
    {
      id: 'eg_alarabiya_fm',
      name: 'العربية إف إم مباشر (Al Arabiya FM)',
      url: 'https://fm.alarabiya.net/fm/myStream/playlist.m3u8',
      group: 'إذاعات إخبارية وثقافية',
      logo: 'https://raw.githubusercontent.com/freetv-app/logos/master/images/sawt-al-arab.png',
    },
  ],
};

/**
 * 2. قائمة قنوات أشهر قراء القرآن الكريم
 */
export const QURAN_RECITERS_PRESET: PresetPlaylist = {
  id: 'quran_reciters',
  title: 'أشهر قراء القرآن الكريم',
  description: 'محطات إذاعية متواصلة على مدار الساعة لأعظم وأشهر قراء العالم الإسلامي',
  icon: 'BookOpen',
  badge: 'قرآن كريم',
  color: 'from-emerald-600 to-teal-700',
  channels: [
    {
      id: 'reciter_cairo_quran',
      name: 'إذاعة القرآن الكريم - القاهرة (بث مباشر)',
      url: 'https://stream.radiojar.com/8s5u5tpdtwzuv',
      group: 'إذاعات القرآن الكريم',
      logo: 'https://raw.githubusercontent.com/freetv-app/logos/master/images/quran-karim-cairo.png',
    },
    {
      id: 'reciter_abdulbasit_mojawwad',
      name: 'الشيخ عبد الباسط عبد الصمد (المصحف المجود)',
      url: 'https://qurango.net/radio/abdulbasit_abdulsamad_mojawwad',
      group: 'عمالقة التلاوة',
      logo: 'https://backup.qurango.net/images/reciters/abdulbasit.jpg',
    },
    {
      id: 'reciter_abdulbasit_murattal',
      name: 'الشيخ عبد الباسط عبد الصمد (المصحف المرتل)',
      url: 'https://qurango.net/radio/abdulbasit_abdulsamad',
      group: 'عمالقة التلاوة',
      logo: 'https://backup.qurango.net/images/reciters/abdulbasit.jpg',
    },
    {
      id: 'reciter_minshawi_mojawwad',
      name: 'الشيخ محمد صديق المنشاوي (المصحف المجود)',
      url: 'https://qurango.net/radio/mohammed_siddiq_alminshawi_mojawwad',
      group: 'عمالقة التلاوة',
      logo: 'https://backup.qurango.net/images/reciters/minshawi.jpg',
    },
    {
      id: 'reciter_minshawi_murattal',
      name: 'الشيخ محمد صديق المنشاوي (المصحف المرتل)',
      url: 'https://qurango.net/radio/mohammed_siddiq_alminshawi',
      group: 'عمالقة التلاوة',
      logo: 'https://backup.qurango.net/images/reciters/minshawi.jpg',
    },
    {
      id: 'reciter_hussary_mojawwad',
      name: 'الشيخ محمود خليل الحصري (المصحف المجود)',
      url: 'https://qurango.net/radio/mahmoud_khalil_alhussary_mojawwad',
      group: 'عمالقة التلاوة',
      logo: 'https://backup.qurango.net/images/reciters/hussary.jpg',
    },
    {
      id: 'reciter_hussary_murattal',
      name: 'الشيخ محمود خليل الحصري (المصحف المرتل)',
      url: 'https://qurango.net/radio/mahmoud_khalil_alhussary',
      group: 'عمالقة التلاوة',
      logo: 'https://backup.qurango.net/images/reciters/hussary.jpg',
    },
    {
      id: 'reciter_hussary_warsh',
      name: 'الشيخ محمود خليل الحصري (رواية ورش عن نافع)',
      url: 'https://qurango.net/radio/mahmoud_khalil_alhussary_warsh',
      group: 'عمالقة التلاوة',
      logo: 'https://backup.qurango.net/images/reciters/hussary.jpg',
    },
    {
      id: 'reciter_mustafa_ismail',
      name: 'الشيخ مصطفى إسماعيل (روائع التلاوات الخالدة)',
      url: 'https://qurango.net/radio/mustafa_ismail',
      group: 'عمالقة التلاوة',
      logo: 'https://backup.qurango.net/images/reciters/mustafa_ismail.jpg',
    },
    {
      id: 'reciter_banna_mojawwad',
      name: 'الشيخ محمود علي البنا (المصحف المجود)',
      url: 'https://qurango.net/radio/mahmoud_ali__albanna_mojawwad',
      group: 'عمالقة التلاوة',
      logo: 'https://backup.qurango.net/images/reciters/albanna.jpg',
    },
    {
      id: 'reciter_banna_murattal',
      name: 'الشيخ محمود علي البنا (المصحف المرتل)',
      url: 'https://qurango.net/radio/mahmoud_ali__albanna',
      group: 'عمالقة التلاوة',
      logo: 'https://backup.qurango.net/images/reciters/albanna.jpg',
    },
    {
      id: 'reciter_tablaway',
      name: 'الشيخ محمد محمود الطبلاوي',
      url: 'https://qurango.net/radio/mohammad_altablaway',
      group: 'عمالقة التلاوة',
      logo: 'https://backup.qurango.net/images/reciters/tablaway.jpg',
    },
    {
      id: 'reciter_tarateel',
      name: 'إذاعة تراتيل القرآن وتلاوات خاشعة نادرة',
      url: 'https://qurango.net/radio/tarateel',
      group: 'عمالقة التلاوة',
      logo: 'https://raw.githubusercontent.com/freetv-app/logos/master/images/quran-karim-cairo.png',
    },
    {
      id: 'reciter_afasy',
      name: 'الشيخ مشاري راشد العفاسي',
      url: 'https://qurango.net/radio/mishary_alafasi',
      group: 'قراء العصر الحديث',
      logo: 'https://backup.qurango.net/images/reciters/alafasy.jpg',
    },
    {
      id: 'reciter_ajmy',
      name: 'الشيخ أحمد بن علي العجمي',
      url: 'https://qurango.net/radio/ahmad_alajmy',
      group: 'قراء العصر الحديث',
      logo: 'https://backup.qurango.net/images/reciters/alajmy.jpg',
    },
    {
      id: 'reciter_ghamdi',
      name: 'الشيخ سعد الغامدي',
      url: 'https://backup.qurango.net/radio/saad_alghamdi',
      group: 'قراء العصر الحديث',
      logo: 'https://backup.qurango.net/images/reciters/alghamdi.jpg',
    },
    {
      id: 'reciter_muaiqly',
      name: 'الشيخ ماهر المعيقلي (إمام الحرم المكي)',
      url: 'https://qurango.net/radio/maher',
      group: 'أئمة الحرمين',
      logo: 'https://backup.qurango.net/images/reciters/almuaiqly.jpg',
    },
    {
      id: 'reciter_ayyub',
      name: 'الشيخ محمد أيوب (إمام المسجد النبوي)',
      url: 'https://qurango.net/radio/mohammed_ayyub',
      group: 'أئمة الحرمين',
      logo: 'https://backup.qurango.net/images/reciters/ayyub.jpg',
    },
    {
      id: 'reciter_ali_jaber',
      name: 'الشيخ علي عبد الله جابر (رحمه الله)',
      url: 'https://qurango.net/radio/ali_jaber',
      group: 'أئمة الحرمين',
      logo: 'https://backup.qurango.net/images/reciters/jaber.jpg',
    },
    {
      id: 'reciter_soufi',
      name: 'الشيخ عبد الرشيد صوفي (رواية خلف عن حمزة)',
      url: 'https://qurango.net/radio/abdulrasheed_soufi_khalaf',
      group: 'القراءات والروايات',
      logo: 'https://backup.qurango.net/images/reciters/soufi.jpg',
    },
    {
      id: 'reciter_dosari',
      name: 'الشيخ ياسر الدوسري (إمام الحرم المكي)',
      url: 'https://qurango.net/radio/yasser_aldosari',
      group: 'أئمة الحرمين',
      logo: 'https://backup.qurango.net/images/reciters/almuaiqly.jpg',
    },
    {
      id: 'reciter_suwaisi',
      name: 'الشيخ علي حجاج السويسي (أعلام قراء مصر)',
      url: 'http://live.mp3quran.net:9842/',
      group: 'عمالقة التلاوة',
      logo: 'https://raw.githubusercontent.com/freetv-app/logos/master/images/quran-karim-cairo.png',
    },
  ],
};

/**
 * 3. قائمة راديو أشهر مطربي مصر والشرق
 */
export const EGYPTIAN_SINGERS_PRESET: PresetPlaylist = {
  id: 'egypt_singers',
  title: 'راديو أشهر مغنين مصر',
  description: 'إذاعات متخصصة 24/7 لأساطير الغناء والطرب المصري الأصيل والحديث',
  icon: 'Music',
  badge: 'طرب وفن مصري',
  color: 'from-purple-600 to-indigo-700',
  channels: [
    {
      id: 'singer_om_kalthoum',
      name: 'راديو كوكب الشرق - السيدة أم كلثوم',
      url: 'https://stream.zeno.fm/zsgrfxg71s8uv',
      group: 'زمن الفن الجميل',
      logo: 'https://images.zeno.fm/e2g1Hq6H2r3i7_2W1dY7M9Q0w4E=/300x300/smart/avatar.png',
    },
    {
      id: 'singer_halim',
      name: 'راديو العندليب الأسمر - عبد الحليم حافظ',
      url: 'https://stream.zeno.fm/8a4eqkd0pnhvv',
      group: 'زمن الفن الجميل',
      logo: 'https://images.zeno.fm/V8x9Z1W2M3n4B5v6C7x8Z9dM0Wq=/300x300/smart/avatar.png',
    },
    {
      id: 'singer_amr_diab',
      name: 'راديو الهضبة - عمرو دياب (24/7)',
      url: 'https://stream.zeno.fm/xa4yhh4k838uv',
      group: 'نجوم العصر الذهبي',
      logo: 'https://images.zeno.fm/O1p2A3s4D5f6G7h8J9k0L1z2X3c=/300x300/smart/avatar.png',
    },
    {
      id: 'singer_fairuz',
      name: 'راديو جارة القمر - السيدة فيروز',
      url: 'https://stream.zeno.fm/xkhnk4vee18uv',
      group: 'زمن الفن الجميل',
      logo: 'https://images.zeno.fm/F5e6D7c8B9a0Z1x2C3v4B5n6M7l=/300x300/smart/avatar.png',
    },
    {
      id: 'singer_zaman_tarab',
      name: 'راديو زمان وروائع ماسبيرو الأصيل',
      url: 'https://radiozamen.ice.infomaniak.ch/zamen.mp3',
      group: 'روائع الأغاني المصرية',
      logo: 'https://raw.githubusercontent.com/freetv-app/logos/master/images/radio-al-aghani.png',
    },
    {
      id: 'singer_medina_tarab',
      name: 'إذاعة طرب إف إم - عمالقة الطرب العربي',
      url: 'https://medinatarab.ice.infomaniak.ch/medinatarab-128.mp3',
      group: 'روائع الأغاني المصرية',
      logo: 'https://images.zeno.fm/P9q0W1e2R3t4Y5u6I7o8P9a0S1d=/300x300/smart/avatar.png',
    },
    {
      id: 'singer_mosaique_tarab',
      name: 'راديو موزاييك طرب ماسبيرو والشرق',
      url: 'https://radio.mosaiquefm.net/mosatarab',
      group: 'روائع الأغاني المصرية',
      logo: 'https://images.zeno.fm/K7w8Z9dM9Wq6hK4B5e7y1g2h3J4=/300x300/smart/avatar.png',
    },
    {
      id: 'singer_rotana_tarab',
      name: 'راديو روتانا كلاسيك وطرب الأصيل',
      url: 'http://philae.shoutca.st:8250/stream',
      group: 'روائع الأغاني المصرية',
      logo: 'https://images.zeno.fm/A1s2D3f4G5h6J7k8L9z0X1c2V3b=/300x300/smart/avatar.png',
    },
    {
      id: 'singer_arabic_mix',
      name: 'راديو أرابيك ميكس - كلاسيكيات الطرب',
      url: 'https://stream.zeno.fm/wvqgc9kb1d0uv',
      group: 'نجوم العصر الذهبي',
      logo: 'https://images.zeno.fm/T5y6U7i8O9p0A1s2D3f4G5h6J7k=/300x300/smart/avatar.png',
    },
    {
      id: 'singer_90s_tarab',
      name: 'راديو تسعينات إف إم - كاسيت وذكريات',
      url: 'https://eu1.fastcast4u.com/proxy/prontofm?mp=/1',
      group: 'نجوم العصر الذهبي',
      logo: 'https://images.zeno.fm/Z1x2C3v4B5n6M7l8K9j0H1g2F3d=/300x300/smart/avatar.png',
    },
    {
      id: 'singer_monte_carlo_tarab',
      name: 'مونت كارلو الدولية - كلاسيكيات الطرب',
      url: 'https://montecarlodoualiya128k.ice.infomaniak.ch/mc-doualiya.mp3',
      group: 'روائع الأغاني المصرية',
      logo: 'https://images.zeno.fm/Q9w8E7r6T5y4U3i2O1p0A9s8D7f=/300x300/smart/avatar.png',
    },
    {
      id: 'singer_orient_tarab',
      name: 'إذاعة الشرق الأوسط وبنك الأغاني الشرقية',
      url: 'https://stream.rcs.revma.com/7hnrkawf4p8uv.mp3',
      group: 'روائع الأغاني المصرية',
      logo: 'https://raw.githubusercontent.com/freetv-app/logos/master/images/radio-hits.png',
    },
    {
      id: 'singer_elissa',
      name: 'راديو ملكة الإحساس - إليسا والرومانسية',
      url: 'https://stream.zeno.fm/v7n499m8ckhvv',
      group: 'نجوم العصر الذهبي',
      logo: 'https://images.zeno.fm/1f4x1Wn8Z9dM9Wq6hK4B5e7y-1g=/300x300/smart/avatar.png',
    },
    {
      id: 'singer_tarab_aseel',
      name: 'راديو طرب الأصيل 24/7',
      url: 'https://stream.zeno.fm/fy8achbq97zuv',
      group: 'روائع الأغاني المصرية',
      logo: 'https://images.zeno.fm/O1p2A3s4D5f6G7h8J9k0L1z2X3c=/300x300/smart/avatar.png',
    },
  ],
};

export const ALL_PRESETS: PresetPlaylist[] = [
  EGYPTIAN_RADIO_PRESET,
  QURAN_RECITERS_PRESET,
  EGYPTIAN_SINGERS_PRESET,
];
