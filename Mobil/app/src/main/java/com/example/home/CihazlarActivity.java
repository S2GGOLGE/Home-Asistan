package com.example.home;

import android.os.Bundle;
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

public class CihazlarActivity extends AppCompatActivity {

    private MaterialButton btnAddNewDevice;
    private ChipGroup chipGroupFilters;
    private RecyclerView deviceRecyclerView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_cihazlar);

        // 1. XML Bileşenlerini Bağla
        initViews();

        // 2. Kenarlık Boşluklarını Ayarla (EdgeToEdge)
        setupEdgeToEdge();

        // 3. Tıklama Olaylarını Tanımla
        setupListeners();
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
        // Ekle Butonuna Tıklama Olayı
        if (btnAddNewDevice != null) {
            btnAddNewDevice.setOnClickListener(v -> showAddDeviceDialog());
        }

        // Filtre Çiplerinin Değişim Olayı (İlerisi için hazır yapı)
        if (chipGroupFilters != null) {
            chipGroupFilters.setOnCheckedStateChangeListener((group, checkedIds) -> {
                if (!checkedIds.isEmpty()) {
                    int checkedId = checkedIds.get(0);
                    // Burada seçilen çipe göre RecyclerView listesini filtreleyebilirsin
                }
            });
        }
    }

    /**
     * Ekle butonuna basıldığında modern bir Material Giriş Penceresi açar.
     */
    private void showAddDeviceDialog() {
        MaterialAlertDialogBuilder builder = new MaterialAlertDialogBuilder(this);
        builder.setTitle("Yeni Cihaz Ekle");
        builder.setMessage("Lütfen eklemek istediğiniz akıllı cihazın adını giriniz:");

        // Kullanıcının yazı yazabilmesi için dinamik bir EditText oluşturuyoruz
        final EditText input = new EditText(this);
        input.setHint("Örn: Salon Lambası, Mutfak Prizi");

        // Tasarımın düzgün durması için kenar boşluğu (padding) ekliyoruz
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.MATCH_PARENT);
        input.setLayoutParams(lp);

        // Dialog içerisine input alanını gömüyoruz
        builder.setView(input);

        // "Ekle" Butonu Ayarları
        builder.setPositiveButton("Ekle", (dialog, which) -> {
            String cihazAdi = input.getText().toString().trim();
            if (!cihazAdi.isEmpty()) {
                // TODO: Burada veritabanına (Firebase, Room vb.) veya Listeye ekleme kodunu yazabilirsin
                Toast.makeText(CihazlarActivity.this, cihazAdi + " başarıyla eklendi!", Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(CihazlarActivity.this, "Cihaz adı boş bırakılamaz!", Toast.LENGTH_SHORT).show();
            }
        });

        // "İptal" Butonu Ayarları
        builder.setNegativeButton("İptal", (dialog, which) -> dialog.cancel());

        // Dialog penceremizi görünür kılıyoruz
        AlertDialog alertDialog = builder.create();
        alertDialog.show();
    }
}