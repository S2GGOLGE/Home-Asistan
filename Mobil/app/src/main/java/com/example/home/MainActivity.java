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

        initViews();
        setupInsets();
        setupNavigation();
        setupBackHandler();
    }

    // ---------------- INIT ----------------
    private void initViews() {
        drawerLayout = findViewById(R.id.drawerLayout);
        btnMenu = findViewById(R.id.btnMenu);
        navigationView = findViewById(R.id.navigationView);
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

                toast("Jarvis aktif...");

            } else if (id == R.id.nav_cameras) {

                open("Kamera sistemi açılıyor...", KameraActivity.class);

            } else if (id == R.id.nav_sensors) {

                toast("Sensörler okunuyor...");

            } else if (id == R.id.nav_notifications) {

                toast("Bildirimler açılıyor...");

            } else if (id == R.id.nav_settings) {

                toast("Ayarlar açılıyor...");

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