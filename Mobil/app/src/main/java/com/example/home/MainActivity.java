package com.example.home;

import android.content.Intent;
import android.os.Bundle;
import android.widget.ImageButton;
import android.widget.Toast;

import androidx.activity.EdgeToEdge;
import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
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

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_main);

        // 1. Görünümleri Başlat (Initialization)
        initViews();

        // 2. Kenardan Kenara (EdgeToEdge) Durum Çubuğu Boşluk Ayarı
        setupEdgeToEdge();

        // 3. Tıklama ve Dinleyici Olayları (Listeners)
        setupListeners();

        // 4. Yeni Nesil Geri Tuşu Yönetimi
        setupBackPressedDispatcher();
    }

    /**
     * XML bileşenlerini Java nesnelerine bağlar.
     */
    private void initViews() {
        drawerLayout = findViewById(R.id.drawerLayout);
        btnMenu = findViewById(R.id.btnMenu);
        navigationView = findViewById(R.id.navigationView);
    }

    /**
     * Sistem çubuklarının (Status/Navigation bar) içeriği kapatmasını engeller.
     */
    private void setupEdgeToEdge() {
        if (drawerLayout != null) {
            ViewCompat.setOnApplyWindowInsetsListener(drawerLayout, (v, insets) -> {
                Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
                v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
                return insets;
            });
        }
    }

    /**
     * Buton ve menü elemanlarının tıklama olaylarını yönetir.
     */
    private void setupListeners() {
        // Hamburger Menü Buton Tetikleyicisi
        if (btnMenu != null) {
            btnMenu.setOnClickListener(v -> toggleDrawer());
        }

        // Yan Menü Ögeleri Seçim Yönetimi
        if (navigationView != null) {
            navigationView.setNavigationItemSelectedListener(item -> {
                int id = item.getItemId();

                if (id == R.id.nav_dashboard) {
                    navigasyonYap("Gösterge Paneli açılıyor...", null);
                } else if (id == R.id.nav_devices) {
                    // Cihazlar menüsüne tıklandığında WebView barındıran CihazlarActivity'e gider
                    navigasyonYap("Cihazlar listeleniyor...", CihazlarActivity.class);
                } else if (id == R.id.nav_rooms) {
                    navigasyonYap("Odalar yükleniyor...", null);
                } else if (id == R.id.nav_automations) {
                    navigasyonYap("Otomasyonlar listeleniyor...", null);
                } else if (id == R.id.nav_jarvis) {
                    navigasyonYap("Jarvis Kontrolü aktif...", null);
                } else if (id == R.id.nav_cameras) {
                    navigasyonYap("Kamera akışları yükleniyor...", null);
                } else if (id == R.id.nav_sensors) {
                    navigasyonYap("Sensör verileri okunuyor...", null);
                } else if (id == R.id.nav_notifications) {
                    navigasyonYap("Bildirimler açılıyor...", null);
                } else if (id == R.id.nav_settings) {
                    navigasyonYap("Ayarlar Açılıyor...", null); // Gelecekte SettingsActivity.class eklenebilir
                } else if (id == R.id.nav_users) {
                    navigasyonYap("Kullanıcılar Sayfası Açılıyor...", null);
                } else if (id == R.id.nav_system_monitor) {
                    navigasyonYap("Sistem Durum Ekranı Açılıyor...", null);
                }

                return true;
            });
        }
    }

    /**
     * Menü tıklandığında hem bildirim mesajı gösterir hem de hedef sayfaya yönlendirir.
     */
    private void navigasyonYap(String mesaj, Class<?> hedefAktivite) {
        Toast.makeText(this, mesaj, Toast.LENGTH_SHORT).show();

        if (drawerLayout != null) {
            drawerLayout.closeDrawer(GravityCompat.START);
        }

        if (hedefAktivite != null) {
            Intent intent = new Intent(MainActivity.this, hedefAktivite);
            startActivity(intent);
        }
    }

    /**
     * Yan menüyü (Drawer) durumuna göre açar ya da kapatır.
     */
    private void toggleDrawer() {
        if (drawerLayout != null) {
            if (!drawerLayout.isDrawerOpen(GravityCompat.START)) {
                drawerLayout.openDrawer(GravityCompat.START);
            } else {
                drawerLayout.closeDrawer(GravityCompat.START);
            }
        }
    }

    /**
     * AndroidX OnBackPressed kütüphanesini kullanarak donanımsal/yazılımsal
     * geri tuşuna basıldığında öncelikle menünün kapanmasını sağlar.
     */
    private void setupBackPressedDispatcher() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (drawerLayout != null && drawerLayout.isDrawerOpen(GravityCompat.START)) {
                    drawerLayout.closeDrawer(GravityCompat.START);
                } else {
                    setEnabled(false); // Callback'i geçici olarak devredışı bırak
                    getOnBackPressedDispatcher().onBackPressed(); // Varsayılan geri eylemini yürüt (Uygulamadan çıkış/Geri gitme)
                    setEnabled(true);  // Yeniden aktif et
                }
            }
        });
    }
}