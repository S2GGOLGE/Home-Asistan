const BACKEND_URL = "https://localhost:7201/api/DeviceRegistration";

async function ekle() {
  const nameInput = document.getElementById("device-name");
  
  if (!nameInput) {
    console.error("HATA: 'device-name' ID'li input bulunamadı!");
    return;
  }

  const cihazAdi = nameInput.value.trim();

  // C# tarafındaki DeviceModels ile harfi harfine uyumlu payload
  const payload = {
    DeviceName: cihazAdi,
    DeviceVersion: "1.0.0", 
    Device_Status: false // 🚀 Artık API bool beklediği için doğrudan false gönderebiliriz. SQL'e 0 olarak yazılacaktır.
  };

  if (!payload.DeviceName) {
    alert("Cihaz adı boş olamaz!");
    return;
  }

  try {
    const res = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      console.log("Başarılı:", data);
      alert("Cihaz başarıyla sisteme kaydedildi!");
      
      const modal = document.getElementById("device-modal");
      if (modal) modal.classList.remove("show", "active");
      location.reload(); 
    } else {
      const errorText = await res.text();
      console.error("Backend Hatası:", errorText);
      alert("Sistem Hatası: " + errorText);
    }

  } catch (err) {
    console.error("Bağlantı Kurulamadı:", err);
    alert("Backend sunucusuna bağlanılamadı. Projenin çalıştığından emin olun!");
  }
}