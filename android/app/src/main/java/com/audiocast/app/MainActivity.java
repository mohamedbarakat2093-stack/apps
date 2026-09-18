package com.audiocast.app;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.media.AudioManager;
import android.media.audiofx.LoudnessEnhancer;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.net.wifi.WifiManager;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.DefaultLoadControl;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.hls.HlsMediaSource;
import androidx.media3.datasource.DefaultHttpDataSource;

import org.json.JSONObject;
import org.json.JSONArray;
import java.io.File;
import java.io.FileInputStream;
import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

/**
 * AudioCast Main Activity
 * يدعم التشغيل من أندرويد 6.0 (Marshmallow API 23) إلى أندرويد 15 (API 35)
 * مدمج به مشغل ExoPlayer (Media3) الأصلي ليعمل بكفاءة عالية على الرسيفر والموبايل
 */
public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private ExoPlayer exoPlayer;
    private LoudnessEnhancer loudnessEnhancer;
    private boolean isAudioBoostEnabled = false;
    private float audioBoostMultiplier = 3.0f;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private String currentPlayingUrl = "";
    private String currentPlayingName = "";
    private ValueCallback<Uri[]> filePathCallback;
    private static final int FILE_CHOOSER_REQUEST_CODE = 2001;
    private PowerManager.WakeLock wakeLock;
    private WifiManager.WifiLock wifiLock;

    // رابط تشغيل التطبيق (يمكن تغييره لرابط السيرفر أو وضع الملفات محلياً في assets)
    private static final String APP_URL = "https://ais-pre-efwmmlducheh7uuqbwaacz-540793757409.europe-west3.run.app";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // إبقاء الشاشة مضاءة في وضع التلفاز والرسيفر
        getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // تأكيد شفافية النافذة والـ DecorView لمنع ظهور أي شاشة بيضاء خلفية
        getWindow().setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
        if (getWindow().getDecorView() != null) {
            getWindow().getDecorView().setBackgroundColor(Color.TRANSPARENT);
        }

        try {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "AudioCast:PlaybackWakeLock");
            }
            WifiManager wm = (WifiManager) getApplicationContext().getSystemService(WIFI_SERVICE);
            if (wm != null) {
                wifiLock = wm.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "AudioCast:PlaybackWifiLock");
            }
        } catch (Exception e) {
            // ignore
        }

        // 1. تهيئة مشغل ExoPlayer المدمج (Media3)
        initEmbeddedExoPlayer();

        // 2. تهيئة متصفح الويب المدمج WebView
        initWebView();

        // المطالبة بالأولوية القصوى للصوت لكتم أي صوت خارجي بما فيه صوت التلفزيون
        claimExclusiveAudioFocus();
    }

    /**
     * المطالبة بالأولوية القصوى للصوت (Exclusive Audio Focus) لكتم أي صوت آخر أو صوت التلفزيون
     */
    public void claimExclusiveAudioFocus() {
        try {
            AudioManager audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    android.media.AudioFocusRequest afr = new android.media.AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                            .setAudioAttributes(new android.media.AudioAttributes.Builder()
                                    .setUsage(android.media.AudioAttributes.USAGE_MEDIA)
                                    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_MUSIC)
                                    .build())
                            .setAcceptsDelayedFocusGain(true)
                            .setWillPauseWhenDucked(false)
                            .setOnAudioFocusChangeListener(focusChange -> {
                                if (focusChange != AudioManager.AUDIOFOCUS_GAIN && exoPlayer != null && exoPlayer.getPlayWhenReady()) {
                                    mainHandler.postDelayed(this::claimExclusiveAudioFocus, 300);
                                }
                            })
                            .build();
                    audioManager.requestAudioFocus(afr);
                } else {
                    audioManager.requestAudioFocus(
                            focusChange -> {
                                if (focusChange != AudioManager.AUDIOFOCUS_GAIN && exoPlayer != null && exoPlayer.getPlayWhenReady()) {
                                    mainHandler.postDelayed(this::claimExclusiveAudioFocus, 300);
                                }
                            },
                            AudioManager.STREAM_MUSIC,
                            AudioManager.AUDIOFOCUS_GAIN
                    );
                }
            }
        } catch (Exception e) {
            // ignore
        }
    }

    /**
     * تهيئة مشغل ExoPlayer المدمج بأعلى إعدادات استقرار للصوت والبثوث الحية
     */
    private void initEmbeddedExoPlayer() {
        // إعدادات التخزين المؤقت المثالية للبث الصوتي الحي المباشر لمنع التقطيع أو صوت الطقطقة
        DefaultLoadControl loadControl = new DefaultLoadControl.Builder()
                .setBufferDurationsMs(
                        3000,  // الحد الأدنى للتخزين (3 ثوانٍ فقط لتجنب استهلاك ذاكرة الرسيفر)
                        15000, // الحد الأقصى للتخزين (15 ثانية لمنع توقف الرام وتذبذب التدفق)
                        1500,  // بدء التشغيل الفوري والسلس (1.5 ثانية)
                        3000   // إعادة التشغيل بعد أي تذبذب مؤقت (3 ثوانٍ)
                )
                .setPrioritizeTimeOverSizeThresholds(true)
                .build();

        // إعدادات خصائص الصوت والتحكم الحصري لمنع المقاطعة
        AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                .build();

        exoPlayer = new ExoPlayer.Builder(this)
                .setLoadControl(loadControl)
                .setAudioAttributes(audioAttributes, true) // التعامل مع AudioFocus تلقائياً
                .setWakeMode(C.WAKE_MODE_NETWORK)
                .build();

        exoPlayer.addListener(new Player.Listener() {
            @Override
            public void onPlaybackStateChanged(int playbackState) {
                String stateStr = "idle";
                switch (playbackState) {
                    case Player.STATE_BUFFERING:
                        stateStr = "buffering";
                        break;
                    case Player.STATE_READY:
                        stateStr = exoPlayer.getPlayWhenReady() ? "playing" : "paused";
                        applyAudioBoost();
                        break;
                    case Player.STATE_ENDED:
                        stateStr = "ended";
                        break;
                    case Player.STATE_IDLE:
                    default:
                        stateStr = "idle";
                        break;
                }
                notifyWebStateChanged(stateStr);
            }

            @Override
            public void onPlayerError(@NonNull PlaybackException error) {
                notifyWebStateChanged("error");
            }
        });
    }

    /**
     * تهيئة متصفح الويب WebView ليتوافق مع أندرويد 6 حتى 15
     */
    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    private void initWebView() {
        webView = new WebView(this);
        setContentView(webView);

        // جعل خلفية النافذة والمتصفح شفافة تماماً لدعم وضع الإخفاء التام وظهور تطبيق التلفاز في الخلفية
        getWindow().setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
        webView.setBackgroundColor(Color.TRANSPARENT);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        // السماح بروابط HTTP غير المشفرة على أندرويد 9 فما فوق
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        // تمكين تسريع الهاردوير
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        // حقن جسر التحكم الأصلي AndroidControl وجسر ExoPlayer داخل الجافاسكريبت
        ExoPlayerBridge exoPlayerBridge = new ExoPlayerBridge();
        AndroidControlBridge androidControlBridge = new AndroidControlBridge(exoPlayerBridge);
        webView.addJavascriptInterface(androidControlBridge, "AndroidControl");
        webView.addJavascriptInterface(exoPlayerBridge, "ExoPlayer");
        webView.addJavascriptInterface(exoPlayerBridge, "Android");

        // تمكين متصفح الملفات لاختيار ملفات M3U من الفلاشة أو الذاكرة
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (MainActivity.this.filePathCallback != null) {
                    MainActivity.this.filePathCallback.onReceiveValue(null);
                    MainActivity.this.filePathCallback = null;
                }
                MainActivity.this.filePathCallback = filePathCallback;

                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");

                try {
                    startActivityForResult(Intent.createChooser(intent, "اختر ملف القنوات M3U / TXT"), FILE_CHOOSER_REQUEST_CODE);
                    return true;
                } catch (Exception e) {
                    try {
                        Intent docIntent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                        docIntent.addCategory(Intent.CATEGORY_OPENABLE);
                        docIntent.setType("*/*");
                        startActivityForResult(docIntent, FILE_CHOOSER_REQUEST_CODE);
                        return true;
                    } catch (Exception ex) {
                        MainActivity.this.filePathCallback = null;
                        Toast.makeText(MainActivity.this, "يرجى استخدام خيار لصق محتوى الملف M3U مباشرة", Toast.LENGTH_LONG).show();
                        return false;
                    }
                }
            }
        });
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }
        });

        webView.loadUrl(APP_URL);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            Uri primaryUri = null;
            if (resultCode == RESULT_OK && data != null) {
                String dataString = data.getDataString();
                if (dataString != null) {
                    primaryUri = Uri.parse(dataString);
                } else if (data.getData() != null) {
                    primaryUri = data.getData();
                } else if (data.getClipData() != null && data.getClipData().getItemCount() > 0) {
                    primaryUri = data.getClipData().getItemAt(0).getUri();
                }

                // قراءة محتوى الملف مباشرة من الفلاشة أو ذاكرة الرسيفر وتمريره لصفحة الويب
                if (primaryUri != null) {
                    final Uri finalUri = primaryUri;
                    new Thread(() -> {
                        try {
                            InputStream is = getContentResolver().openInputStream(finalUri);
                            if (is != null) {
                                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                                byte[] buf = new byte[8192];
                                int len;
                                while ((len = is.read(buf)) != -1) {
                                    baos.write(buf, 0, len);
                                }
                                is.close();

                                byte[] bytes = baos.toByteArray();
                                String fileContent;
                                try {
                                    fileContent = new String(bytes, StandardCharsets.UTF_8);
                                } catch (Exception e1) {
                                    try {
                                        fileContent = new String(bytes, "windows-1256");
                                    } catch (Exception e2) {
                                        fileContent = new String(bytes, StandardCharsets.ISO_8859_1);
                                    }
                                }

                                final String finalContent = fileContent;
                                final String fileName = "قنوات_الرسيفر_الصوتية.m3u";

                                mainHandler.post(() -> {
                                    if (webView != null && finalContent.trim().length() > 0) {
                                        String quotedContent = JSONObject.quote(finalContent);
                                        String quotedName = JSONObject.quote(fileName);
                                        String js = "if (window.onNativeFileRead) { window.onNativeFileRead(" + quotedContent + ", " + quotedName + "); }";
                                        webView.evaluateJavascript(js, null);
                                    }
                                });
                            }
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }).start();
                }
            }

            if (filePathCallback != null) {
                Uri[] results = null;
                if (resultCode == RESULT_OK && primaryUri != null) {
                    results = new Uri[]{primaryUri};
                }
                filePathCallback.onReceiveValue(results);
                filePathCallback = null;
            }
        }
    }

    /**
     * واجهة جسر التحكم الأصلي AndroidControl للرسيفر وأجهزة أندرويد تي في
     */
    public class AndroidControlBridge {
        private final ExoPlayerBridge exoBridge;

        public AndroidControlBridge(ExoPlayerBridge bridge) {
            this.exoBridge = bridge;
        }

        @JavascriptInterface
        public boolean isAvailable() {
            return true;
        }

        @JavascriptInterface
        public void playStream(final String url) {
            exoBridge.play(url, "بث صوتي");
        }

        @JavascriptInterface
        public void stopStream() {
            exoBridge.stop();
        }

        @JavascriptInterface
        public void openNativeFilePicker() {
            exoBridge.openNativeFilePicker();
        }

        @JavascriptInterface
        public void hideToBackground() {
            mainHandler.post(() -> {
                claimExclusiveAudioFocus();
                moveTaskToBack(true);
            });
        }

        @JavascriptInterface
        public void requestExclusiveAudioFocus() {
            claimExclusiveAudioFocus();
        }

        @JavascriptInterface
        public void setScreenHidden(final boolean hidden) {
            mainHandler.post(() -> {
                if (webView != null) {
                    webView.setBackgroundColor(Color.TRANSPARENT);
                }
                if (getWindow() != null) {
                    getWindow().setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
                    if (getWindow().getDecorView() != null) {
                        getWindow().getDecorView().setBackgroundColor(Color.TRANSPARENT);
                    }
                }
            });
        }

        @JavascriptInterface
        public String getDefaultStoragePaths() {
            JSONArray arr = new JSONArray();
            try {
                // Common Android 7 TV / receiver paths
                String[] candidatePaths = {
                    "/storage/emulated/0/Download",
                    "/storage/emulated/0",
                    "/storage/emulated/0/Documents",
                    "/storage/usbotg",
                    "/storage/usbdisk",
                    "/storage",
                    "/mnt/media_rw",
                    "/mnt/usb"
                };
                for (String p : candidatePaths) {
                    File f = new File(p);
                    if (f.exists()) {
                        JSONObject item = new JSONObject();
                        item.put("path", f.getAbsolutePath());
                        item.put("name", f.getName().isEmpty() ? f.getAbsolutePath() : f.getName());
                        item.put("canRead", f.canRead());
                        arr.put(item);
                    }
                }
            } catch (Exception e) {
                // return whatever collected
            }
            return arr.toString();
        }

        @JavascriptInterface
        public String listDirectory(final String dirPath) {
            JSONArray arr = new JSONArray();
            try {
                File dir = new File(dirPath);
                if (dir.exists() && dir.isDirectory()) {
                    File[] files = dir.listFiles();
                    if (files != null) {
                        for (File f : files) {
                            String name = f.getName();
                            String lower = name.toLowerCase();
                            boolean isDir = f.isDirectory();
                            boolean isSupportedFile = lower.endsWith(".m3u") || lower.endsWith(".m3u8") ||
                                    lower.endsWith(".txt") || lower.endsWith(".cfg") ||
                                    lower.endsWith(".ini") || lower.endsWith(".list");
                            if (isDir || isSupportedFile) {
                                JSONObject item = new JSONObject();
                                item.put("name", name);
                                item.put("path", f.getAbsolutePath());
                                item.put("isDir", isDir);
                                item.put("size", isDir ? 0 : f.length());
                                arr.put(item);
                            }
                        }
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
            return arr.toString();
        }

        @JavascriptInterface
        public String readTextFile(final String filePath) {
            try {
                File file = new File(filePath);
                if (!file.exists() || !file.canRead()) {
                    return "";
                }
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                byte[] buffer = new byte[8192];
                int read;
                try (FileInputStream fis = new FileInputStream(file)) {
                    while ((read = fis.read(buffer)) != -1) {
                        baos.write(buffer, 0, read);
                    }
                }
                byte[] bytes = baos.toByteArray();
                try {
                    return new String(bytes, StandardCharsets.UTF_8);
                } catch (Exception e1) {
                    try {
                        return new String(bytes, "windows-1256");
                    } catch (Exception e2) {
                        return new String(bytes, StandardCharsets.ISO_8859_1);
                    }
                }
            } catch (Exception e) {
                return "";
            }
        }
    }

    /**
     * واجهة التخاطب بين الجافاسكريبت ومشغل ExoPlayer المدمج
     */
    public class ExoPlayerBridge {

        @JavascriptInterface
        public boolean isAvailable() {
            return true;
        }

        @JavascriptInterface
        public String getVersion() {
            return "ExoPlayer Media3 1.2.0 (Android 6 to 15)";
        }

        @JavascriptInterface
        public void openNativeFilePicker() {
            mainHandler.post(() -> {
                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                try {
                    startActivityForResult(Intent.createChooser(intent, "اختر ملف القنوات M3U / TXT"), FILE_CHOOSER_REQUEST_CODE);
                } catch (Exception e) {
                    try {
                        Intent docIntent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                        docIntent.addCategory(Intent.CATEGORY_OPENABLE);
                        docIntent.setType("*/*");
                        startActivityForResult(docIntent, FILE_CHOOSER_REQUEST_CODE);
                    } catch (Exception ex) {
                        Toast.makeText(MainActivity.this, "يرجى استخدام خيار لصق محتوى الملف M3U", Toast.LENGTH_SHORT).show();
                    }
                }
            });
        }

        @JavascriptInterface
        public boolean play(final String url, final String channelName) {
            mainHandler.post(() -> {
                try {
                    currentPlayingUrl = url;
                    currentPlayingName = channelName;

                    // المطالبة بأولوية الصوت القصوى وكتم التلفزيون أو أي تطبيق آخر فوراً
                    claimExclusiveAudioFocus();

                    // تشغيل قفل المعالج والواي فاي لضمان استمرار البث بالخلفية بدون انقطاع
                    try {
                        if (wakeLock != null && !wakeLock.isHeld()) {
                            wakeLock.acquire(12 * 60 * 60 * 1000L); // 12 hours
                        }
                        if (wifiLock != null && !wifiLock.isHeld()) {
                            wifiLock.acquire();
                        }
                    } catch (Exception errLock) {
                        // ignore
                    }

                    DefaultHttpDataSource.Factory httpDataSourceFactory = new DefaultHttpDataSource.Factory()
                            .setUserAgent("AudioCast-ExoPlayer/2.19.1 (Linux; Android " + Build.VERSION.RELEASE + ")")
                            .setAllowCrossProtocolRedirects(true)
                            .setConnectTimeoutMs(15000)
                            .setReadTimeoutMs(20000);

                    MediaItem mediaItem = MediaItem.fromUri(Uri.parse(url));

                    if (url.toLowerCase().contains(".m3u8")) {
                        HlsMediaSource hlsMediaSource = new HlsMediaSource.Factory(httpDataSourceFactory)
                                .setAllowChunklessPreparation(true)
                                .createMediaSource(mediaItem);
                        exoPlayer.setMediaSource(hlsMediaSource);
                    } else {
                        exoPlayer.setMediaItem(mediaItem);
                    }

                    exoPlayer.prepare();
                    exoPlayer.setPlayWhenReady(true);

                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "خطأ في تشغيل القناة", Toast.LENGTH_SHORT).show();
                }
            });
            return true;
        }

        @JavascriptInterface
        public void pause() {
            mainHandler.post(() -> {
                if (exoPlayer != null) exoPlayer.setPlayWhenReady(false);
            });
        }

        @JavascriptInterface
        public void resume() {
            mainHandler.post(() -> {
                if (exoPlayer != null) exoPlayer.setPlayWhenReady(true);
            });
        }

        @JavascriptInterface
        public void stop() {
            mainHandler.post(() -> {
                if (exoPlayer != null) exoPlayer.stop();
                try {
                    if (wakeLock != null && wakeLock.isHeld()) {
                        wakeLock.release();
                    }
                    if (wifiLock != null && wifiLock.isHeld()) {
                        wifiLock.release();
                    }
                } catch (Exception ignored) {}
            });
        }

        @JavascriptInterface
        public void setVolume(final float volume) {
            mainHandler.post(() -> {
                if (exoPlayer != null) exoPlayer.setVolume(Math.max(0f, Math.min(1f, volume)));
            });
        }

        @JavascriptInterface
        public int getBufferPercentage() {
            if (exoPlayer != null) {
                return exoPlayer.getBufferedPercentage();
            }
            return 0;
        }

        @JavascriptInterface
        public void setAudioBoost(final boolean enabled, final float multiplier) {
            mainHandler.post(() -> {
                isAudioBoostEnabled = enabled;
                audioBoostMultiplier = multiplier > 0 ? multiplier : 2.85f;
                applyAudioBoost();
            });
        }

        @JavascriptInterface
        public boolean isAudioBoostEnabled() {
            return isAudioBoostEnabled;
        }
    }

    /**
     * تطبيق مضاعفة صوت التطبيق لأقصى درجة نقية بدون تشويه عبر معالج الصوت LoudnessEnhancer
     */
    private void applyAudioBoost() {
        try {
            if (exoPlayer != null) {
                int sessionId = exoPlayer.getAudioSessionId();
                if (sessionId != C.AUDIO_SESSION_ID_UNSET && sessionId != 0) {
                    if (loudnessEnhancer == null) {
                        loudnessEnhancer = new LoudnessEnhancer(sessionId);
                    }
                    if (isAudioBoostEnabled) {
                        // كسب مضاعف قوي جداً (+8 dB = 800 mB) لرفع مستوى الصوت لأقصى حد مسموع على سماعات التلفزيون والرسيفر
                        int targetGainMb = (int) Math.min(1000, Math.max(700, (audioBoostMultiplier - 1.0f) * 350 + 500));
                        loudnessEnhancer.setTargetGain(targetGainMb);
                        loudnessEnhancer.setEnabled(true);
                    } else {
                        loudnessEnhancer.setEnabled(false);
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void notifyWebStateChanged(final String state) {
        mainHandler.post(() -> {
            if (webView != null) {
                String js = "if (window.onExoPlayerStateChanged) { window.onExoPlayerStateChanged('" + state + "'); }";
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                    webView.evaluateJavascript(js, null);
                } else {
                    webView.loadUrl("javascript:" + js);
                }
            }
        });
    }

    /**
     * معالجة أزرار ريموت كنترول الرسيفر (D-Pad, OK, أرقام 0-9, زر Home, خروج)
     */
    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        // عند الضغط على زر Home من الريموت كنترول:
        // يظل التطبيق يعمل في الخلفية ويحصل على الأولوية القصوى وكتم صوت التلفزيون
        if (keyCode == KeyEvent.KEYCODE_HOME) {
            claimExclusiveAudioFocus();
            moveTaskToBack(true);
            return true;
        }

        // زر OK في مختلف أنواع أجهزة الرسيفر وأندرويد تي في
        if (keyCode == KeyEvent.KEYCODE_DPAD_CENTER || keyCode == KeyEvent.KEYCODE_ENTER || keyCode == KeyEvent.KEYCODE_NUMPAD_ENTER) {
            webView.dispatchKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_ENTER));
            return true;
        }

        // أزرار أرقام القنوات (0 إلى 9) في الريموت كنترول وأزرار Numpad
        if ((keyCode >= KeyEvent.KEYCODE_0 && keyCode <= KeyEvent.KEYCODE_9) ||
            (keyCode >= KeyEvent.KEYCODE_NUMPAD_0 && keyCode <= KeyEvent.KEYCODE_NUMPAD_9)) {
            int digit = (keyCode >= KeyEvent.KEYCODE_NUMPAD_0)
                    ? (keyCode - KeyEvent.KEYCODE_NUMPAD_0)
                    : (keyCode - KeyEvent.KEYCODE_0);
            String js = "window.dispatchEvent(new CustomEvent('remoteNumberPress', { detail: { digit: " + digit + " } })); " +
                        "window.dispatchEvent(new KeyboardEvent('keydown', { key: '" + digit + "', code: 'Digit" + digit + "', keyCode: " + (48 + digit) + " }));";
            webView.evaluateJavascript(js, null);
            return true;
        }

        // أزرار الميديا (Play, Pause, Stop)
        if (keyCode == KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE) {
            if (exoPlayer != null) {
                if (exoPlayer.getPlayWhenReady()) exoPlayer.setPlayWhenReady(false);
                else {
                    claimExclusiveAudioFocus();
                    exoPlayer.setPlayWhenReady(true);
                }
            }
            return true;
        }

        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (webView.canGoBack()) {
                webView.goBack();
                return true;
            }
        }

        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onUserLeaveHint() {
        super.onUserLeaveHint();
        // عند مغادرة الشاشة (زر Home أو فتح تطبيق آخر):
        // استمرار تشغيل الصوت في الخلفية مع الحصول على الأولوية القصوى وكتم أي صوت آخر
        claimExclusiveAudioFocus();
    }

    @Override
    protected void onPause() {
        super.onPause();
        // الحفاظ على أولوية الصوت في الخلفية عند توقف الواجهة مؤقتاً
        claimExclusiveAudioFocus();
    }

    @Override
    protected void onStop() {
        super.onStop();
        // استمرار الصوت أثناء إخفاء التطبيق في الخلفية
        claimExclusiveAudioFocus();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (exoPlayer != null) {
            exoPlayer.release();
            exoPlayer = null;
        }
        if (webView != null) {
            webView.destroy();
        }
    }
}
