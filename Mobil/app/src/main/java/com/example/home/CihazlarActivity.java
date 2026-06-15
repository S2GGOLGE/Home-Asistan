package com.example.home;

import android.os.Bundle;
import android.util.Log;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Toast;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.button.MaterialButton;
import com.google.android.material.chip.ChipGroup;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class CihazlarActivity extends AppCompatActivity {

    private MaterialButton btnAddNewDevice;
    private ChipGroup chipGroupFilters;
    private RecyclerView deviceRecyclerView;

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
    }

    private void setupRetrofit() {
        Retrofit retrofit = new Retrofit.Builder()
                .baseUrl(BASE_URL)
                .addConverterFactory(GsonConverterFactory.create())
                .build();

        apiService = retrofit.create(ApiService.class);
    }

    private void initViews() {
        btnAddNewDevice = findViewById(R.id.btnAddNewDevice);
        chipGroupFilters = findViewById(R.id.chipGroupFilters);
        deviceRecyclerView = findViewById(R.id.deviceRecyclerView);
    }

    private void setupEdgeToEdge() {
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });
    }

    private void setupListeners() {
        if (btnAddNewDevice != null) {
            btnAddNewDevice.setOnClickListener(v -> showAddDeviceDialog());
        }

        if (chipGroupFilters != null) {
            chipGroupFilters.setOnCheckedStateChangeListener((group, checkedIds) -> {
                if (!checkedIds.isEmpty()) {
                    int checkedId = checkedIds.get(0);
                    // TODO: chip seçimine göre filtreleme eklenecek
                }
            });
        }
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
                        1, // TODO: oturum açan kullanıcının ID'si buraya gelecek
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