package com.example.home;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.constraintlayout.widget.ConstraintLayout;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.recyclerview.widget.RecyclerView;

public class JarvisActivity extends AppCompatActivity {

    // XML ID'leri ile tamamen eşleşen dikey arayüz elemanları
    private LinearLayout btnBackMain; // Türü LinearLayout olarak güncellendi
    private ImageButton micBtn;
    private ImageButton sendBtn;
    private EditText cmdInput;
    private RecyclerView chatMessagesRecycler;
    private TextView jarvisStateDesc;
    private TextView commandCountVal;
    private TextView responseTimeVal;
    private TextView jarvisStatusBadge;
    private TextView lastCmdText;
    private TextView logTerminal;

    // Yükleme Ekranı (Jarvis Engine) Elemanları
    private ConstraintLayout loadingScreen;
    private ProgressBar progressCircle;
    private TextView loaderStatus;
    private TextView loaderPercent;

    private int currentPercent = 0;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_jarvis);

        initViews();
        setupEdgeToEdge();
        setupListeners();

        // Jarvis Engine açılış animasyonunu başlat
        startJarvisEngineLoading();
    }

    private void initViews() {
        // Yeni üst bar ve butonlar
        btnBackMain = findViewById(R.id.btn_back_main);
        micBtn = findViewById(R.id.mic_btn);
        sendBtn = findViewById(R.id.send_btn);
        cmdInput = findViewById(R.id.cmd_input);
        chatMessagesRecycler = findViewById(R.id.chat_messages_recycler);

        // Konsol ve durum panelleri
        jarvisStateDesc = findViewById(R.id.jarvis_state_desc);
        commandCountVal = findViewById(R.id.command_count_val);
        responseTimeVal = findViewById(R.id.response_time_val);
        jarvisStatusBadge = findViewById(R.id.jarvis_status_badge);
        lastCmdText = findViewById(R.id.last_cmd_text);
        logTerminal = findViewById(R.id.log_terminal);

        // Açılış ekranı katmanı
        loadingScreen = findViewById(R.id.loading_screen);
        progressCircle = findViewById(R.id.loader_progress_circle);
        loaderStatus = findViewById(R.id.loader_status);
        loaderPercent = findViewById(R.id.loader_percent);
    }

    private void setupEdgeToEdge() {
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(android.R.id.content), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });
    }

    private void setupListeners() {
        // LinearLayout yapısına geçen yeni Geri Dönüş Butonu Dinleyicisi
        if (btnBackMain != null) {
            btnBackMain.setClickable(true);
            btnBackMain.setFocusable(true);
            btnBackMain.setOnClickListener(v -> finish()); // Ana sayfaya güvenle döner
        }

        if (sendBtn != null) {
            sendBtn.setOnClickListener(v -> {
                String command = cmdInput.getText().toString().trim();
                if (!command.isEmpty()) {
                    // TODO: Komut gönderme lojiği buraya eklenecek
                    cmdInput.setText("");
                }
            });
        }

        if (micBtn != null) {
            micBtn.setOnClickListener(v -> {
                // TODO: Ses tanıma (Speech to Text) motoru tetiklenecek
            });
        }
    }

    // ---------------- JARVIS ENGINE AÇILIŞ ANİMASYONU MOTORU ----------------
    private void startJarvisEngineLoading() {
        // Animasyon başlamadan önce yükleme ekranını öne getirelim
        if (loadingScreen != null) {
            loadingScreen.setVisibility(View.VISIBLE);
            loadingScreen.setAlpha(1f);
        }

        Runnable runnable = new Runnable() {
            @Override
            public void run() {
                if (currentPercent <= 100) {
                    if (loaderPercent != null) {
                        loaderPercent.setText(currentPercent + "%");
                    }
                    if (progressCircle != null) {
                        progressCircle.setProgress(currentPercent);
                    }

                    // Jarvis temasına uygun durum güncellemeleri
                    if (loaderStatus != null) {
                        if (currentPercent == 15) {
                            loaderStatus.setText("SES SİNYALLERİ SENKRONİZE EDİLİYOR...");
                        } else if (currentPercent == 45) {
                            loaderStatus.setText("FREKANS ANALİZÖRÜ AKTİFLEŞTİRİLİYOR...");
                        } else if (currentPercent == 75) {
                            loaderStatus.setText("CORE INTELLIGENCE VERİ TABANINA BAĞLANILIYOR...");
                        } else if (currentPercent == 95) {
                            loaderStatus.setText("ARAYÜZ HAZIRLANIYOR...");
                        }
                    }

                    currentPercent++;
                    handler.postDelayed(this, 15); // Akış hızı (15ms)
                } else {
                    // Yükleme tamamlandığında arka plandaki arayüz durumlarını güncelle
                    if (jarvisStateDesc != null) {
                        jarvisStateDesc.setText("Ses dinleme modunda hazır.");
                        jarvisStateDesc.setTextColor(0xFF00FF88); // Neon Yeşil
                    }
                    if (jarvisStatusBadge != null) {
                        jarvisStatusBadge.setText("Çevrimiçi");
                        jarvisStatusBadge.setTextColor(0xFF00FF88);
                    }
                    if (logTerminal != null) {
                        logTerminal.setText("[SYSTEM] Jarvis Engine başarıyla yüklendi.\n[AUDIO] Mikrofon hatları aktif.");
                    }

                    // Ekranı yumuşakça kapat (Fade-out) ve GONE yaparak alt katmandaki butonları serbest bırak!
                    if (loadingScreen != null) {
                        loadingScreen.animate()
                                .alpha(0f)
                                .setDuration(350)
                                .withEndAction(() -> loadingScreen.setVisibility(View.GONE))
                                .start();
                    }
                }
            }
        };
        handler.post(runnable);
    }
}