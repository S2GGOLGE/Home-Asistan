const BACKEND_URL = "http://localhost:5000/api/DeviceRegistration";

async function ekle() {
  const nameInput = document.getElementById("device-name");
  
  if (!nameInput) {
    console.error("HATA: 'device-name' ID'li input bulunamadı!");
    return;
  }

  const cihazAdi = nameInput.value.trim();
  const typeSelect = document.getElementById("device-type");
  const cihazTuru = typeSelect?.value || "light";

  // C# tarafındaki DeviceModels ile harfi harfine uyumlu payload
  // Not: Backend Type kolonuna DeviceVersion değerini yazar — filtre için türü buraya gönderiyoruz
  const payload = {
    DeviceName: cihazAdi,
    DeviceVersion: cihazTuru,
    Device_Status: false
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