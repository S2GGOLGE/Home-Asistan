package com.example.home;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import androidx.activity.OnBackPressedCallback; // Yeni kütüphane
import androidx.appcompat.app.AppCompatActivity;
import androidx.constraintlayout.widget.ConstraintLayout;
import androidx.core.view.GravityCompat;
import androidx.drawerlayout.widget.DrawerLayout;

public class SettingsActivity extends AppCompatActivity {

    private DrawerLayout drawerLayout;
    private LinearLayout btnHamburger;
    private Button btnBackMain;

    // Animasyon Elemanları
    private ConstraintLayout loadingScreen;
    private ProgressBar progressCircle;
    private TextView loaderStatus;
    private TextView loaderPercent;

    private int currentPercent = 0;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. SORUNUN ÇÖZÜMÜ: XML adının doğruluğundan emin ol, clean/rebuild yap
        setContentView(R.layout.activity_settings);

        initViews();
        setupListeners();

        // 2. SORUNUN ÇÖZÜMÜ: Yeni OnBackPressedDispatcher Mekanizması
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                // Eğer sol menü (Drawer) açıksa, geri tuşu/jestinde önce menüyü kapat
                if (drawerLayout != null && drawerLayout.isDrawerOpen(GravityCompat.START)) {
                    drawerLayout.closeDrawer(GravityCompat.START);
                } else {
                    // Menü kapalıysa sayfayı kapat ve normal şekilde geri çık
                    setEnabled(false); // Döngüye girmemesi için callback'i geçici kapatıyoruz
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        });

        // 0-100 Sayaç Motorunu Tetikle
        startAyarlarLoadingAnimation();
    }

    private void initViews() {
        drawerLayout = findViewById(R.id.drawer_layout);
        btnHamburger = findViewById(R.id.btn_hamburger);
        btnBackMain = findViewById(R.id.btn_back_main);

        loadingScreen = findViewById(R.id.loading_screen);
        progressCircle = findViewById(R.id.loader_progress_circle);
        loaderStatus = findViewById(R.id.loader_status);
        loaderPercent = findViewById(R.id.loader_percent);
    }

    private void setupListeners() {
        if (btnHamburger != null) {
            btnHamburger.setOnClickListener(v -> {
                if (drawerLayout != null) {
                    drawerLayout.openDrawer(GravityCompat.START);
                }
            });
        }

        if (btnBackMain != null) {
            btnBackMain.setOnClickListener(v -> {
                if (drawerLayout != null && drawerLayout.isDrawerOpen(GravityCompat.START)) {
                    drawerLayout.closeDrawer(GravityCompat.START);
                }
                finish();
            });
        }
    }

    private void startAyarlarLoadingAnimation() {
        if (loadingScreen != null) {
            loadingScreen.setVisibility(View.VISIBLE);
            loadingScreen.setAlpha(1f);
        }

        Runnable runnable = new Runnable() {
            @Override
            public void run() {
                if (currentPercent <= 100) {
                    if (progressCircle != null) {
                        progressCircle.setProgress(currentPercent);
                    }
                    if (loaderPercent != null) {
                        loaderPercent.setText(currentPercent + "%");
                    }

                    if (loaderStatus != null) {
                        if (currentPercent == 20) {
                            loaderStatus.setText("YAPILANDIRMA DOSYALARI OKUNUYOR...");
                        } else if (currentPercent == 50) {
                            loaderStatus.setText("KULLANICI TERCİHLERİ SENKRONİZE EDİLİYOR...");
                        } else if (currentPercent == 85) {
                            loaderStatus.setText("GÜVENLİK PROTOKOLLERİ DOĞRULANIYOR...");
                        } else if (currentPercent == 100) {
                            loaderStatus.setText("AYARLAR HAZIR!");
                        }
                    }

                    currentPercent++;
                    handler.postDelayed(this, 15);
                } else {
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