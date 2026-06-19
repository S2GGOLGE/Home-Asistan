package com.example.home;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.constraintlayout.widget.ConstraintLayout;

public class KameraActivity extends AppCompatActivity {

    // XML ID'leri ile tamamen senkronize edilen arayüz elemanları
    private LinearLayout btnBack;

    // Yükleme Ekranı Elemanları
    private ConstraintLayout loadingScreen;
    private ProgressBar progressCircle;
    private TextView loaderStatus;
    private TextView loaderPercent;

    private int currentPercent = 0;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_kamera); // Yeni XML adınızla eşleştiğinden emin olun

        initViews();
        setupListeners();

        // Kamera yükleme ekranı animasyon döngüsünü başlat
        startCameraLoadingAnimation();
    }

    private void initViews() {
        // Görünümleri yeni XML standartlarına göre bağlıyoruz
        btnBack = findViewById(R.id.btn_back);
        loadingScreen = findViewById(R.id.loading_screen);
        progressCircle = findViewById(R.id.loader_progress_circle);
        loaderStatus = findViewById(R.id.loader_status);
        loaderPercent = findViewById(R.id.loader_percent);
    }

    private void setupListeners() {
        // Geri Dön Butonunu Aktif Et
        if (btnBack != null) {
            btnBack.setClickable(true);
            btnBack.setFocusable(true);
            btnBack.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    finish(); // Etkinliği kapatır ve güvenle ana sayfaya döner
                }
            });
        }
    }

    // ---------------- KAMERA MOTORU AÇILIŞ ANİMASYONU ----------------
    private void startCameraLoadingAnimation() {
        // Yükleme ekranı görünür olarak başlasın
        if (loadingScreen != null) {
            loadingScreen.setVisibility(View.VISIBLE);
            loadingScreen.setAlpha(1f);
        }

        Runnable runnable = new Runnable() {
            @Override
            public void run() {
                if (currentPercent <= 100) {
                    // ProgressBar'ı (çemberi) güncelle
                    if (progressCircle != null) {
                        progressCircle.setProgress(currentPercent);
                    }

                    // Diğer sayfalarla uyumlu yüzdelik metni güncelle
                    if (loaderPercent != null) {
                        loaderPercent.setText(currentPercent + "%");
                    }

                    // Belirli aşamalarda durum metinlerini güncelle (Kamera temalı)
                    if (loaderStatus != null) {
                        if (currentPercent == 20) {
                            loaderStatus.setText("VİDEO AKIŞ KANALLARI AÇILIYOR...");
                        } else if (currentPercent == 50) {
                            loaderStatus.setText("IP KAMERALAR KONTROL EDİLİYOR...");
                        } else if (currentPercent == 80) {
                            loaderStatus.setText("FPS DEĞERLERİ ARABELLEĞE ALINIYOR...");
                        } else if (currentPercent == 95) {
                            loaderStatus.setText("GÖRÜNTÜ DEKODERİ AKTİF...");
                        } else if (currentPercent == 100) {
                            loaderStatus.setText("SİSTEM HAZIR!");
                        }
                    }

                    currentPercent++;
                    handler.postDelayed(this, 15); // İdeal akış hızı (15ms)
                } else {
                    // %100 olduktan sonra ekranı yavaşça kapat ve tamamen GONE yap (Butonları serbest bırakır)
                    if (loadingScreen != null) {
                        loadingScreen.animate()
                                .alpha(0f)
                                .setDuration(350)
                                .withEndAction(new Runnable() {
                                    @Override
                                    public void run() {
                                        loadingScreen.setVisibility(View.GONE); // Hayalet katmanı tamamen kaldırır
                                    }
                                })
                                .start();
                    }
                }
            }
        };

        // Animasyon döngüsünü tetikle
        handler.post(runnable);
    }
}