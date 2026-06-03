package com.example.home;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;

public class CihazlarActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_cihazlar);

        // XML'deki WebView'i tanımlıyoruz
        WebView webView = findViewById(R.id.webViewCihazlar);

        // WebView ayarlarını yapılandırıyoruz
        WebSettings webSettings = webView.getSettings();

        // KRİTİK: HTML içerisindeki JS kodlarının çalışması için şart
        webSettings.setJavaScriptEnabled(true);

        // CSS/JS harici dosyalarının (kütüphanelerin) yüklenmesine izin verir
        webSettings.setDomStorageEnabled(true);
        webSettings.setAllowFileAccess(true);

        // Sayfa içi linklere tıklandığında harici tarayıcının (Chrome gibi) açılmasını engeller
        webView.setWebViewClient(new WebViewClient());

        // assets klasörüne koyduğun HTML dosyasını çağırıyoruz
        // Dosya yolunun tam olarak eşleştiğinden emin ol (Örn: assets/cihazlar.html)
        webView.loadUrl("file:///android_asset/cihazlar.html");
    }
}