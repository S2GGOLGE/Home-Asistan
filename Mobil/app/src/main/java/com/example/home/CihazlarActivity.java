package com.example.home;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.constraintlayout.widget.ConstraintLayout;
import androidx.recyclerview.widget.RecyclerView;

public class CihazlarActivity extends AppCompatActivity {

    // Aktif Görünümler
    private LinearLayout btnBack;
    private Button btnAddDevice;
    private Button btnSendCmd;
    private RecyclerView rcDevicesGrid;
    private LinearLayout detailsPanel;

    // Yükleme Ekranı Bileşenleri
    private ConstraintLayout loadingScreen;
    private ProgressBar loaderProgressCircle;
    private TextView loaderStatus;
    private TextView loaderPercent;

    private int currentPercent = 0;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_cihazlar);

        // 1. Görünümleri Bağlama
        btnBack = findViewById(R.id.btn_back);
        btnAddDevice = findViewById(R.id.btn_add_device);
        btnSendCmd = findViewById(R.id.btn_send_cmd);
        rcDevicesGrid = findViewById(R.id.rc_devices_grid);
        detailsPanel = findViewById(R.id.details_panel);

        // Yükleme Ekranı Elemanlarını Bağlama
        loadingScreen = findViewById(R.id.loading_screen);
        loaderProgressCircle = findViewById(R.id.loader_progress_circle);
        loaderStatus = findViewById(R.id.loader_status);
        loaderPercent = findViewById(R.id.loader_percent);

        // 2. Geri Dön Butonunu Aktif Et (Tıklanabilirliği Güvenceye Al)
        if (btnBack != null) {
            btnBack.setClickable(true);
            btnBack.setFocusable(true);
            btnBack.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    finish(); // Cihazlar sayfasını kapatır, ana ekrana döner
                }
            });
        }

        // 3. Yükleme Animasyonunu Başlat
        startCihazlarLoadingAnimation();
    }

    private void startCihazlarLoadingAnimation() {
        // İlk aşamada yükleme ekranını görünür yapalım
        if (loadingScreen != null) {
            loadingScreen.setVisibility(View.VISIBLE);
            loadingScreen.setAlpha(1f);
        }

        Runnable runnable = new Runnable() {
            @Override
            public void run() {
                if (currentPercent <= 100) {
                    // İlerleme çemberini güncelle
                    if (loaderProgressCircle != null) {
                        loaderProgressCircle.setProgress(currentPercent);
                    }

                    // Yüzdelik metni güncelle
                    if (loaderPercent != null) {
                        loaderPercent.setText(currentPercent + "%");
                    }

                    // Aşamalara göre durum metinlerini güncelle
                    if (loaderStatus != null) {
                        if (currentPercent == 15) {
                            loaderStatus.setText("SİSTEM PROTOKOLLERİ BAŞLATILIYOR...");
                        } else if (currentPercent == 45) {
                            loaderStatus.setText("CİHAZ LİSTESİ ALINIYOR...");
                        } else if (currentPercent == 75) {
                            loaderStatus.setText("VERİLER SENKRONİZE EDİLİYOR...");
                        } else if (currentPercent == 100) {
                            loaderStatus.setText("SİSTEM HAZIR!");
                        }
                    }

                    currentPercent++;
                    handler.postDelayed(this, 15); // Akış hızı (15ms)
                } else {
                    // %100 bittiğinde şeffaflaştır ve GONE yaparak butonların önünü tamamen aç!
                    if (loadingScreen != null) {
                        loadingScreen.animate()
                                .alpha(0f)
                                .setDuration(350)
                                .withEndAction(new Runnable() {
                                    @Override
                                    public void run() {
                                        loadingScreen.setVisibility(View.GONE); // Hayalet katman kalktı!
                                    }
                                })
                                .start();
                    }
                }
            }
        };

        // Sayaç döngüsünü tetikle
        handler.post(runnable);
    }
}