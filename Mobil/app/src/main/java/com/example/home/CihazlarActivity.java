package com.example.home;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.constraintlayout.widget.ConstraintLayout;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class CihazlarActivity extends AppCompatActivity {

    // XML ID'lerine göre güncellenen bileşenler
    private Button btnAddNewDevice;
    private Button btnBack;
    private RecyclerView deviceRecyclerView;

    // Yükleme Animasyonu Elementleri
    private ConstraintLayout loadingScreen;
    private ProgressBar progressCircle;
    private TextView loaderStatus;
    private TextView loaderPercent;

    private int currentPercent = 0;
    private final Handler handler = new Handler(Looper.getMainLooper());

    private ApiService apiService;
    private final String BASE_URL = "http://192.168.1.115:5174/";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_cihazlar);

        setupRetrofit();
        initViews();
        setupEdgeToEdge();
        setupListeners();

        // Animasyonu Çalıştır
        startLoadingAnimation();
    }

    private void setupRetrofit() {
        Retrofit retrofit = new Retrofit.Builder()
                .baseUrl(BASE_URL)
                .addConverterFactory(GsonConverterFactory.create())
                .build();

        apiService = retrofit.create(ApiService.class);
    }

    private void initViews() {
        // Yeni XML dosyasındaki ID'lerle eşleştirildi
        btnAddNewDevice = findViewById(R.id.btn_add_device);
        btnBack = findViewById(R.id.btn_back);
        deviceRecyclerView = findViewById(R.id.rc_devices_grid);

        // Animasyon görünümleri bağlandı
        loadingScreen = findViewById(R.id.loading_screen);
        progressCircle = findViewById(R.id.loader_progress_circle);
        loaderStatus = findViewById(R.id.loader_status);
        loaderPercent = findViewById(R.id.loader_percent);
    }

    private void setupEdgeToEdge() {
        // XML'in en dış katmanı olan ConstraintLayout'a bağlandı
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(android.R.id.content), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });
    }

    private void setupListeners() {
        if (btnAddNewDevice != null) {
            btnAddNewDevice.setOnClickListener(v -> showAddDeviceDialog());
        }

        if (btnBack != null) {
            btnBack.setOnClickListener(v -> finish()); // Geri dön butonu basıldığında aktiviteyi kapatır
        }
    }

    // ---------------- YÜKLEME ANİMASYONU MOTORU ----------------
    private void startLoadingAnimation() {
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

                    // Durum metinleri siberpunk temasına göre güncelleniyor
                    if (currentPercent == 25) {
                        loaderStatus.setText("DONANIM PROTOKOLLERİ KONTROL EDİLİYOR...");
                    } else if (currentPercent == 60) {
                        loaderStatus.setText("VIRTUAL GRID MODÜLLERİ BAĞLANIYOR...");
                    } else if (currentPercent == 90) {
                        loaderStatus.setText("KULLANICI PANELİ AKTİF EDİLİYOR...");
                    }

                    currentPercent++;
                    handler.postDelayed(this, 18); // Akıcı ve hızlı sayaç geçişi
                } else {
                    // %100 bitiminde yumuşak yok olma efekti (Fade-out)
                    if (loadingScreen != null) {
                        loadingScreen.animate()
                                .alpha(0f)
                                .setDuration(300)
                                .withEndAction(() -> loadingScreen.setVisibility(View.GONE))
                                .start();
                    }
                }
            }
        };
        handler.post(runnable);
    }

    private void showAddDeviceDialog() {
        MaterialAlertDialogBuilder builder = new MaterialAlertDialogBuilder(this);
        builder.setTitle("Yeni Cihaz Ekle");

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(48, 16, 48, 16);

        final EditText inputName = new EditText(this);
        inputName.setHint("Cihaz Adı (Örn: Salon Lambası)");
        layout.addView(inputName);

        final EditText inputType = new EditText(this);
        inputType.setHint("Tür (Örn: Işık, Priz, Kamera)");
        layout.addView(inputType);

        final EditText inputFeature = new EditText(this);
        inputFeature.setHint("Özellik (opsiyonel)");
        layout.addView(inputFeature);

        builder.setView(layout);

        builder.setPositiveButton("Ekle", (dialog, which) -> {
            String cihazAdi = inputName.getText().toString().trim();
            String cihazTuru = inputType.getText().toString().trim();
            String cihazFeature = inputFeature.getText().toString().trim();

            if (!cihazAdi.isEmpty()) {
                DeviceModels yeniCihaz = new DeviceModels(
                        cihazAdi,
                        cihazTuru.isEmpty() ? "Genel" : cihazTuru,
                        false,
                        1,
                        cihazFeature
                );
                sendDeviceToBackend(yeniCihaz);
            } else {
                Toast.makeText(CihazlarActivity.this,
                        "Cihaz adı boş bırakılamaz!",
                        Toast.LENGTH_SHORT).show();
            }
        });

        builder.setNegativeButton("İptal", (dialog, which) -> dialog.cancel());
        builder.create().show();
    }

    private void sendDeviceToBackend(DeviceModels device) {
        Call<DeviceModels> call = apiService.addDevice(device);

        call.enqueue(new Callback<DeviceModels>() {
            @Override
            public void onResponse(Call<DeviceModels> call, Response<DeviceModels> response) {
                if (response.isSuccessful() && response.body() != null) {
                    Toast.makeText(CihazlarActivity.this,
                            device.getName() + " veritabanına kaydedildi!",
                            Toast.LENGTH_LONG).show();
                } else {
                    Log.e("API_HATA", "Hata Kodu: " + response.code());
                    Toast.makeText(CihazlarActivity.this,
                            "Sistem Hatası: Validasyon geçilemedi. Kod: " + response.code(),
                            Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<DeviceModels> call, Throwable t) {
                Log.e("API_FAILURE", "Bağlantı Kurulamadı: " + t.getMessage(), t);
                Toast.makeText(CihazlarActivity.this,
                        "Sunucuya bağlanılamadı: " + t.getMessage(),
                        Toast.LENGTH_LONG).show();
            }
        });
    }
}