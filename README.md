# 🏠 HomeOS - Akıllı Ev Asistanı

HomeOS, ev otomasyonu ve yapay zeka destekli asistan özelliklerini tek bir platformda birleştiren gelişmiş bir akıllı ev yönetim sistemidir.

## Özellikler

### Kullanıcı Yönetimi
- Kullanıcı kayıt sistemi
- Giriş ve çıkış işlemleri
- Rol bazlı yetkilendirme
- Salt + Hash şifreleme sistemi
- Profil yönetimi

### Cihaz Yönetimi
- Cihaz ekleme
- Cihaz silme
- Cihaz güncelleme
- Cihaz durum takibi
- Oda bazlı cihaz gruplama

### Oda Yönetimi
- Oda oluşturma
- Oda düzenleme
- Oda silme
- Oda bazlı cihaz listeleme

### Otomasyon Sistemi
- Otomasyon oluşturma
- Tetikleyici tanımlama
- Koşul tanımlama
- Eylem tanımlama
- Zamanlanmış görevler

### Jarvis Yapay Zeka Asistanı
- Sesli komut desteği
- Metin tabanlı komutlar
- Akıllı komut yönlendirme
- Plugin sistemi
- Gerçek zamanlı işlem takibi

### Bildirim Sistemi
- Sistem bildirimleri
- Cihaz bildirimleri
- Otomasyon bildirimleri
- Kritik hata bildirimleri

### Loglama Sistemi
- Kullanıcı logları
- Sistem logları
- Hata logları
- Güvenlik logları
- API logları

### Gerçek Zamanlı Özellikler
- SignalR entegrasyonu
- Canlı cihaz durumu
- Canlı log görüntüleme
- Anlık bildirimler

---

# Teknolojiler

## Frontend
- HTML5
- CSS3
- JavaScript
- Bootstrap 5

## Backend
- ASP.NET Core Web API
- Entity Framework Core
- SignalR

## Veritabanı
- SQL Server

## Yapay Zeka Katmanı
- Python
- Plugin Architecture
- Intent Router

---

# Proje Mimarisi

```text
HomeOS
│
├── Frontend
│   ├── Dashboard
│   ├── Devices
│   ├── Rooms
│   ├── Automations
│   ├── Jarvis
│   ├── Notifications
│   ├── Users
│   └── Settings
│
├── API
│   ├── Controllers
│   ├── Services
│   ├── Repositories
│   ├── Models
│   └── SignalR Hubs
│
├── Database
│   ├── Users
│   ├── Devices
│   ├── Rooms
│   ├── Automations
│   ├── Logs
│   └── Notifications
│
└── Jarvis
    ├── Core
    ├── Plugins
    ├── Voice
    ├── AI
    └── Intent Router
```

---

# Kurulum

## Gereksinimler

- .NET 10 SDK
- SQL Server
- Python 3.12+
- Git

## Projeyi Klonla

```bash
git clone https://github.com/kullaniciadi/HomeOS.git
```

## API Kurulumu

```bash
cd Api
dotnet restore
dotnet build
```

## Veritabanı

```bash
Update-Database
```

## Frontend

```bash
wwwroot/index.html
```

veya

```bash
npm install
npm run dev
```

## Jarvis

```bash
cd Jarvis
pip install -r requirements.txt
python main.py
```

---

# Güvenlik

- Salt + Hash parola sistemi
- JWT Authentication
- Role Based Authorization
- SQL Injection koruması
- XSS koruması
- CSRF koruması
- API güvenlik katmanı

---

# Yol Haritası

## Tamamlananlar

- Kullanıcı sistemi
- Cihaz yönetimi
- Oda yönetimi
- Log sistemi
- Dashboard
- Profil sistemi

## Devam Edenler

- Jarvis entegrasyonu
- Otomasyon geliştirmeleri
- SignalR canlı sistem
- Android entegrasyonu

## Planlananlar

- Mobil uygulama
- Sesli komut sistemi
- Kamera entegrasyonu
- MQTT desteği
- Docker desteği
- Production deployment

---

# Lisans

Bu proje kişisel projedir

© HomeOS Project
