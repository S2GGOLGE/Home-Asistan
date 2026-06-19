package com.example.home;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.ImageButton;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.EdgeToEdge;
import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import androidx.constraintlayout.widget.ConstraintLayout;
import androidx.core.graphics.Insets;
import androidx.core.view.GravityCompat;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.drawerlayout.widget.DrawerLayout;

import com.google.android.material.navigation.NavigationView;

public class MainActivity extends AppCompatActivity {

    private DrawerLayout drawerLayout;
    private ImageButton btnMenu;
    private NavigationView navigationView;

    // YÜKLEME EKRANI BİLEŞENLERİ
    private ConstraintLayout loadingScreen;
    private ProgressBar loaderProgressCircle;
    private TextView loaderPercent;
    private int progressStatus = 0;
    private final Handler progressHandler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_main);

        initViews();
        setupInsets();
        setupNavigation();
        setupBackHandler();

        // Yükleme ekranı simülasyonunu başlat
        startLoadingSimulation();
    }

    // ---------------- INIT ----------------
    private void initViews() {
        drawerLayout = findViewById(R.id.drawerLayout);
        btnMenu = findViewById(R.id.btnMenu);
        navigationView = findViewById(R.id.navigationView);

        // XML'e yeni eklediğimiz yükleme ekranı bileşenlerini bağlıyoruz
        loadingScreen = findViewById(R.id.loading_screen);
        loaderProgressCircle = findViewById(R.id.loader_progress_circle);
        loaderPercent = findViewById(R.id.loader_percent);
    }

    // ---------------- LOADING SCREEN SIMULATION ----------------
    private void startLoadingSimulation() {
        if (loadingScreen == null || loaderProgressCircle == null || loaderPercent == null) return;

        // İlk başta yükleme ekranını görünür yapıyoruz
        loadingScreen.setVisibility(View.VISIBLE);
        progressStatus = 0;

        // Arka planda yüzdelik değeri artırmak için bir iş parçacığı (Thread) başlatıyoruz
        new Thread(() -> {
            while (progressStatus < 100) {
                progressStatus += 2; // Artış hızı (isteğe göre değiştirilebilir)

                // Arayüz bileşenlerini güncellemek için Main Looper'a gönderiyoruz
                progressHandler.post(() -> {
                    loaderProgressCircle.setProgress(progressStatus);
                    loaderPercent.setText(progressStatus + "%");
                });

                try {
                    // Her artış arasında 30 milisaniye bekle (Toplam ~1.5 saniye sürer)
                    Thread.sleep(30);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }

            // Yükleme tamamlandığında ekranı gizle
            progressHandler.post(() -> {
                // İstersen animasyonlu kapanması için loadingScreen.animate().alpha(0f).setDuration(300) da kullanabilirsin
                loadingScreen.setVisibility(View.GONE);
            });
        }).start();
    }

    // ---------------- UI SAFE AREA ----------------
    private void setupInsets() {
        if (drawerLayout == null) return;

        ViewCompat.setOnApplyWindowInsetsListener(drawerLayout, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return insets;
        });
    }

    // ---------------- NAVIGATION ----------------
    private void setupNavigation() {

        if (btnMenu != null) {
            btnMenu.setOnClickListener(v -> toggleDrawer());
        }

        if (navigationView == null) return;

        navigationView.setNavigationItemSelectedListener(item -> {

            int id = item.getItemId();

            closeDrawer();

            if (id == R.id.nav_dashboard) {
                toast("Dashboard açılıyor...");
            } else if (id == R.id.nav_devices) {
                open("Cihazlar yükleniyor...", CihazlarActivity.class);
            } else if (id == R.id.nav_rooms) {
                toast("Odalar açılıyor...");
            } else if (id == R.id.nav_automations) {
                toast("Otomasyonlar açılıyor...");
            } else if (id == R.id.nav_jarvis) {
                open("Jarvis Aktif", JarvisActivity.class);
            } else if (id == R.id.nav_cameras) {
                open("Kamera sistemi açılıyor...", KameraActivity.class);
            } else if (id == R.id.nav_sensors) {
                toast("Sensörler okunuyor...");
            } else if (id == R.id.nav_notifications) {
                toast("Bildirimler açılıyor...");
            } else if (id == R.id.nav_settings) {
                open("Ayarlar açılıyor...", SettingsActivity.class);
            } else if (id == R.id.nav_users) {
                toast("Kullanıcılar açılıyor...");
            } else if (id == R.id.nav_system_monitor) {
                toast("Sistem durumu açılıyor...");
            }

            return true;
        });
    }

    // ---------------- DRAWER ----------------
    private void toggleDrawer() {
        if (drawerLayout == null) return;

        if (drawerLayout.isDrawerOpen(GravityCompat.START)) {
            drawerLayout.closeDrawer(GravityCompat.START);
        } else {
            drawerLayout.openDrawer(GravityCompat.START);
        }
    }

    private void closeDrawer() {
        if (drawerLayout != null) {
            drawerLayout.closeDrawer(GravityCompat.START);
        }
    }

    // ---------------- HELPERS ----------------
    private void open(String message, Class<?> target) {
        toast(message);
        startActivity(new Intent(this, target));
    }

    private void toast(String msg) {
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show();
    }

    // ---------------- BACK HANDLER ----------------
    private void setupBackHandler() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                // Eğer yükleme ekranı aktifse geri tuşunun alt taraftaki menüyü tetiklemesini engelle
                if (loadingScreen != null && loadingScreen.getVisibility() == View.VISIBLE) {
                    return;
                }

                if (drawerLayout != null && drawerLayout.isDrawerOpen(GravityCompat.START)) {
                    drawerLayout.closeDrawer(GravityCompat.START);
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                    setEnabled(true);
                }
            }
        });
    }
}