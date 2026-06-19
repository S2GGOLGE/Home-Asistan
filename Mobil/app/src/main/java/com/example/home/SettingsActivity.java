package com.example.home;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.constraintlayout.widget.ConstraintLayout;

public class SettingsActivity extends AppCompatActivity {

    private ConstraintLayout loadingScreen;
    private ProgressBar progressCircle;
    private TextView loaderStatus;
    private TextView loaderPercent;
    private Button btnBack;

    private int currentPercent = 0;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_settings);

        // Görünümleri Bağla
        loadingScreen = findViewById(R.id.loading_screen);
        progressCircle = findViewById(R.id.loader_progress_circle);
        loaderStatus = findViewById(R.id.loader_status);
        loaderPercent = findViewById(R.id.loader_percent);
        btnBack = findViewById(R.id.btn_back);

        // Geri Dön Butonu Aktif Et
        if (btnBack != null) {
            btnBack.setOnClickListener(v -> finish());
        }

        // Animasyon Sayacını Başlat
        startLoadingAnimation();
    }

    private void startLoadingAnimation() {
        Runnable runnable = new Runnable() {
            @Override
            public void run() {
                if (currentPercent <= 100) {
                    // Yüzdeyi ve Çemberi Güncelle
                    loaderPercent.setText(currentPercent + "%");
                    if (progressCircle != null) {
                        progressCircle.setProgress(currentPercent);
                    }

                    // Durum Metinlerini Belirli Evrelerde Değiştir
                    if (currentPercent == 35) {
                        loaderStatus.setText("SİSTEM BİLEŞENLERİ KONTROL EDİLİYOR...");
                    } else if (currentPercent == 70) {
                        loaderStatus.setText("AYAR MODÜLLERİ YAPILANDIRILIYOR...");
                    } else if (currentPercent == 95) {
                        loaderStatus.setText("SİSTEM HAZIR!");
                    }

                    currentPercent++;
                    handler.postDelayed(this, 20); // 20ms hızında akar (Videodaki gibi hızlı)
                } else {
                    // %100 olduysa yükleme ekranını gizle (Fade-out efektiyle görünmez yap)
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