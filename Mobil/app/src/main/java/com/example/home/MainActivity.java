package com.example.home;

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

        drawerLayout = findViewById(R.id.drawerLayout);
        btnMenu = findViewById(R.id.btnMenu);
        navigationView = findViewById(R.id.navigationView);

        // Kenardan Kenara (EdgeToEdge) Durum Çubuğu Boşluk Ayarı
        ViewCompat.setOnApplyWindowInsetsListener(drawerLayout, (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });

        // Hamburger Butonu Tıklama Olayı
        btnMenu.setOnClickListener(v -> {
            if (!drawerLayout.isDrawerOpen(GravityCompat.START)) {
                drawerLayout.openDrawer(GravityCompat.START);
            } else {
                drawerLayout.closeDrawer(GravityCompat.START);
            }
        });

        // Menü Öğeleri Tıklama Olayları (Mevcut XML ile tam uyumlu)
        if (navigationView != null) {
            navigationView.setNavigationItemSelectedListener(item -> {
                int id = item.getItemId();

                if (id == R.id.nav_dashboard) {
                    Toast.makeText(MainActivity.this, "Gösterge Paneli açılıyor...", Toast.LENGTH_SHORT).show();
                } else if (id == R.id.nav_devices) {
                    Toast.makeText(MainActivity.this, "Cihazlar listeleniyor...", Toast.LENGTH_SHORT).show();
                } else if (id == R.id.nav_rooms) {
                    Toast.makeText(MainActivity.this, "Odalar yükleniyor...", Toast.LENGTH_SHORT).show();
                } else if (id == R.id.nav_automations) {
                    Toast.makeText(MainActivity.this, "Otomasyonlar listeleniyor...", Toast.LENGTH_SHORT).show();
                } else if (id == R.id.nav_jarvis) {
                    Toast.makeText(MainActivity.this, "Jarvis Kontrolü aktif...", Toast.LENGTH_SHORT).show();
                } else if (id == R.id.nav_cameras) {
                    Toast.makeText(MainActivity.this, "Kamera akışları yükleniyor...", Toast.LENGTH_SHORT).show();
                } else if (id == R.id.nav_sensors) {
                    Toast.makeText(MainActivity.this, "Sensör verileri okunuyor...", Toast.LENGTH_SHORT).show();
                } else if (id == R.id.nav_notifications) {
                    Toast.makeText(MainActivity.this, "Bildirimler açılıyor...", Toast.LENGTH_SHORT).show();
                }
                else if (id==R.id.nav_settings){
                    Toast.makeText(this, "Ayarlar Açılıyor", Toast.LENGTH_SHORT).show();
                }
                else if(id==R.id.nav_users){
                    Toast.makeText(this, "Kullanıcılar Sayfası Açılıyor", Toast.LENGTH_SHORT).show();
                }
                else if(id==R.id.nav_system_monitor){
                    Toast.makeText(this, "Sistem Durum Ekranı Açılıyor", Toast.LENGTH_SHORT).show();
                }
                // Seçim yapıldıktan sonra çekmeceyi kapat
                drawerLayout.closeDrawer(GravityCompat.START);
                return true;
            });
        }

        // Yeni Nesil AndroidX Geri Tuşu Entegrasyonu
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
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