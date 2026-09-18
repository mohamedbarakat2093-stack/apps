# AudioCast - تطبيق الرسيفر والموبايل مع مشغل ExoPlayer المدمج

يدعم التطبيق التشغيل والتثبيت على:
- **نظام أندرويد**: من **Android 6.0 (Marshmallow - API 23)** إلى **Android 15 (API 35)**.
- **الأجهزة المدعومة**: أجهزة الرسيفر (Amlogic, Rockchip, Allwinner)، شاشات Android TV، الهواتف الذكية، والأجهزة اللوحية.
- **مشغل ExoPlayer المدمج**: مبني باستخدام حزمة **AndroidX Media3 (ExoPlayer 1.2.0)** لضمان أقصى كفاءة واستقرار للبثوث الصوتية الحية وملفات M3U و HLS بدون تقطيع.

---

## 1. محتويات المشروع (Android Project Structure)

- `android/app/build.gradle`:
  - `minSdk 23` (Android 6.0 Marshmallow)
  - `targetSdk 35` (Android 15)
  - مكتبات `androidx.media3:media3-exoplayer` و `media3-exoplayer-hls` و `media3-session`.
- `android/app/src/main/AndroidManifest.xml`:
  - مهيأ لدعم التلفاز والرسيفر (`LEANBACK_LAUNCHER`) والموبايل (`LAUNCHER`).
  - دعم أجهزة التحكم عن بعد (الريموت كنترول) بدون اشتراط شاشة لمس.
  - دعم تدفقات HTTP غير المشفرة (`usesCleartextTraffic="true"`).
- `android/app/src/main/java/com/audiocast/app/MainActivity.java`:
  - مشغل ExoPlayer مدمج بالكامل مع التحكم الصوتي الحصري `AudioFocus`.
  - جسر Javascript (`window.ExoPlayer` و `window.Android`) للتواصل المباشر مع واجهة التطبيق.
  - معالجة أزرار ريموت الرسيفر (OK، أرقام القنوات من 0 إلى 9، زر الخروج/الرجوع، أزرار التشغيل والإيقاف).
- `android/app/src/main/java/com/audiocast/app/AudioPlaybackService.java`:
  - خدمة بث في الخلفية تمنع النظام من إيقاف الصوت عند قفل الشاشة أو الخروج للشاشة الرئيسية.

---

## 2. خطوات البناء وإنشاء ملف APK (Build APK)

### الطريقة الأولى: عبر Android Studio (الأسهل والأشمل)
1. افتح برنامج **Android Studio**.
2. اختر **Open** ثم حدد المجلد `android`.
3. انتظر انتهاء مزامنة Gradle Sync.
4. من القائمة العلوية اضغط على:
   `Build` > `Build Bundle(s) / APK(s)` > `Build APK(s)`.
5. ستجد ملف الـ APK جاهزاً في:
   `android/app/build/outputs/apk/debug/app-debug.apk`.
6. قم بنقل الملف إلى فلاشة USB وثبته على الرسيفر أو أرسله لهاتفك المحمول.

### الطريقة الثانية: عبر سطر الأوامر (Terminal)
```bash
cd android
./gradlew assembleDebug
```

---

## 3. التشغيل المباشر كـ تطبيق ويب تقدمي (PWA) بدون كمبيوتر
يمكنك أيضاً فتح رابط التطبيق مباشرة في متصفح الرسيفر (مثل تطبيق **Downloader** أو متصفح **Chrome** / **TV Bro**) والضغط على **"تثبيت التطبيق" (Install / Add to Home Screen)** ليعمل كتطبيق كامل ومستقل بملء الشاشة مع دعم الريموت كنترول ومحرك ExoPlayer المدمج.
