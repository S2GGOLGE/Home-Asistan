document.addEventListener('DOMContentLoaded', () => {
    console.log('Home Asistan: Jarvis Arayüzü Başlatıldı.');

    // ══════════════════════════════
    //  DOM ELEMENTLERİ
    // ══════════════════════════════
    const loaderOverlay = document.getElementById('loader-overlay');
    const loaderBar = document.getElementById('loader-bar');
    const loaderText = document.getElementById('loader-text');
    const loaderPercentage = document.getElementById('loader-percentage');
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');

    const chatMessages = document.getElementById('chat-messages');
    const cmdInput = document.getElementById('cmd-input');
    const sendBtn = document.getElementById('send-btn');
    const micBtn = document.getElementById('mic-btn');
    const soundWaves = document.getElementById('sound-waves');
    
    const jarvisStatusBadge = document.getElementById('jarvis-status-badge');
    const jarvisStateDesc = document.getElementById('jarvis-state-desc');
    const haStatusBadge = document.getElementById('ha-status-badge');
    const lastCmdText = document.getElementById('last-cmd-text');
    const commandCountVal = document.getElementById('command-count-val');
    const responseTimeVal = document.getElementById('response-time-val');
    
    const commandHistoryList = document.getElementById('command-history-list');
    const logTerminal = document.getElementById('log-terminal');

    // Sistem Ayarları
    const JARVIS_WS_URL = "ws://127.0.0.1:8082/ws/jarvis";
    const JARVIS_API_URL = "http://127.0.0.1:8082/api/jarvis/process";
    
    let ws = null;
    let commandCount = parseInt(localStorage.getItem('jarvis_command_count') || '0', 10);
    commandCountVal.textContent = commandCount;

    // ══════════════════════════════
    //  DİNAMİK LOADER MOTORU
    // ══════════════════════════════
    const loadingStates = [
        { limit: 20, text: "Jarvis çekirdek arayüzü kuruluyor..." },
        { limit: 50, text: "Ses işleme modülleri hazırlanıyor..." },
        { limit: 80, text: "Python FastAPI ve WebSocket köprüsü kuruluyor..." },
        { limit: 100, text: "Jarvis Çevrimiçi!" }
    ];

    let progress = 0;
    const runLoader = () => {
        const loadInterval = setInterval(() => {
            const increment = Math.floor(Math.random() * 8) + 4;
            progress += increment;

            if (progress >= 100) {
                progress = 100;
                clearInterval(loadInterval);
                terminateLoader();
            }

            if (loaderBar) loaderBar.style.width = `${progress}%`;
            if (loaderPercentage) loaderPercentage.textContent = `${progress}%`;

            const activeState = loadingStates.find(state => progress <= state.limit);
            if (activeState && loaderText) {
                loaderText.textContent = activeState.text;
            }
        }, 50);
    };

    const terminateLoader = () => {
        setTimeout(() => {
            if (loaderOverlay) {
                loaderOverlay.classList.add('fade-out');
                loaderOverlay.addEventListener('transitionend', () => {
                    loaderOverlay.remove();
                    // Loader bittikten sonra WebSocket bağlantısını kur
                    connectWebSocket();
                });
            }
        }, 300);
    };

    runLoader();

    // ══════════════════════════════
    //  SIDEBAR AÇMA / KAPATMA
    // ══════════════════════════════
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            menuToggle.classList.toggle('open');
        });
    }

    // ══════════════════════════════
    //  LOG YAZMA FONKSİYONU
    // ══════════════════════════════
    function addTerminalLog(message, type = 'info') {
        if (!logTerminal) return;
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0];
        
        const line = document.createElement('div');
        line.className = `line ${type}`;
        line.textContent = `[${timeStr}] ${message}`;
        logTerminal.appendChild(line);
        logTerminal.scrollTop = logTerminal.scrollHeight;
    }

    // İlk loglar
    addTerminalLog("Jarvis Arayüzü başlatıldı.", "info");
    addTerminalLog("Web Speech API kontrol ediliyor...", "info");

    // ══════════════════════════════
    //  WEBSOCKET BAĞLANTISI
    // ══════════════════════════════
    function connectWebSocket() {
        addTerminalLog("FastAPI WebSocket sunucusuna bağlanmaya çalışılıyor...", "info");
        
        try {
            ws = new WebSocket(JARVIS_WS_URL);
            
            ws.onopen = () => {
                addTerminalLog("WebSocket bağlantısı başarıyla kuruldu.", "success");
                jarvisStatusBadge.textContent = "Çevrimiçi";
                jarvisStatusBadge.className = "badge success";
                jarvisStateDesc.textContent = "Komutlarınızı bekliyorum.";
                haStatusBadge.textContent = "Bağlı";
                haStatusBadge.className = "badge success";
                
                // Karşılama mesajı ekle
                if (chatMessages.children.length === 0) {
                    addChatMessage("Merhaba! Ben Jarvis. Akıllı evinizi yönetmek için komutlarınızı yazabilir veya mikrofonu kullanarak sesli söyleyebilirsiniz. Nasıl yardımcı olabilirim?", "jarvis");
                }
            };
            
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                handleServerResponse(data);
            };
            
            ws.onerror = (error) => {
                addTerminalLog("WebSocket hatası algılandı: " + error.message, "warn");
            };
            
            ws.onclose = () => {
                addTerminalLog("WebSocket bağlantısı koptu. REST API moduna geçiliyor.", "warn");
                jarvisStatusBadge.textContent = "REST Modu";
                jarvisStatusBadge.className = "badge warning";
                jarvisStateDesc.textContent = "Sunucu çevrimdışı veya sınırlı modda.";
                
                // Karşılama mesajı (sunucu kapalıysa)
                if (chatMessages.children.length === 0) {
                    addChatMessage("Jarvis Engine (REST fallback) aktif. (Not: Python sunucu arka planda çalışmıyorsa simülasyon modu devrededir)", "jarvis-info");
                    addChatMessage("Merhaba! Şu an Python API bağlantısı kurulamadı fakat simülasyon modunda bana komut verebilirsiniz. Örneğin: 'salon ışığını aç', 'klimayı kapat' veya 'tüm cihazları listele'.", "jarvis");
                }
            };
        } catch (e) {
            addTerminalLog("Bağlantı kurulumu sırasında kritik hata: " + e.message, "error");
        }
    }

    // ══════════════════════════════
    //  SOHBET ALANI YÖNETİMİ
    // ══════════════════════════════
    function addChatMessage(text, sender) {
        if (!chatMessages) return;
        const msgDiv = document.createElement('div');
        msgDiv.className = `msg ${sender}`;
        msgDiv.textContent = text;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Son komut metnini güncelle
        if (sender === 'user') {
            if (lastCmdText) lastCmdText.textContent = `"${text}"`;
            commandCount++;
            localStorage.setItem('jarvis_command_count', commandCount);
            commandCountVal.textContent = commandCount;
        }
    }

    // Server/Simülasyon yanıt işlemcisi
    function handleServerResponse(data, startTime = null) {
        // Ses dalgası animasyonunu durdur
        soundWaves.classList.remove('active');
        
        // Yanıt süresi hesapla
        if (startTime) {
            const timeDiff = Date.now() - startTime;
            responseTimeVal.textContent = `${timeDiff} ms`;
        } else {
            responseTimeVal.textContent = "120 ms"; // Varsayılan/tahmini
        }
        
        const success = data.success;
        const intent = data.intent;
        const responseText = data.response;
        
        // Chat'e yazdır
        addChatMessage(responseText, "jarvis");
        
        // Log terminaline niyet ve başarı bilgisi yaz
        addTerminalLog(`Komut işlendi. Intent: '${intent}' | Başarı: ${success}`, success ? "success" : "warn");
        
        // Geçmiş listesine ekle
        addCommandToHistory(intent, success);
    }

    // ══════════════════════════════
    //  KOMUT GÖNDERME MOTORU
    // ══════════════════════════════
    async function sendCommand(text) {
        if (!text.trim()) return;
        
        // Kullanıcı mesajını sohbet ekranına ekle
        addChatMessage(text, "user");
        cmdInput.value = "";
        
        // Ses dalgalarını "düşünme/aktif" moduna çek
        soundWaves.classList.add('active');
        addTerminalLog(`İstek gönderiliyor: "${text}"`, "info");
        
        const startTime = Date.now();
        
        // WebSocket aktifse oradan gönder
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(text);
            return;
        }
        
        // Değilse HTTP POST dene
        try {
            const response = await fetch(JARVIS_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });
            
            if (response.ok) {
                const data = await response.json();
                handleServerResponse(data, startTime);
            } else {
                throw new Error(`REST API Hatası: ${response.status}`);
            }
        } catch (error) {
            // Sunucu yoksa SİMÜLASYON MODU (Client-side mock logic)
            addTerminalLog(`Sunucuya bağlanılamadı, yerel motor (simülasyon) çalıştırılıyor: ${error.message}`, "warn");
            setTimeout(() => {
                const mockResponse = getMockResponse(text);
                handleServerResponse(mockResponse, startTime);
            }, 600);
        }
    }

    // Gönder butonu ve Enter tuşu olayları
    sendBtn.addEventListener('click', () => {
        sendCommand(cmdInput.value);
    });

    cmdInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            sendCommand(cmdInput.value);
        }
    });

    // ══════════════════════════════
    //  SES TANIMA (SPEECH RECOGNITION)
    // ══════════════════════════════
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let isListening = false;

    if (SpeechRecognition) {
        addTerminalLog("Web Speech API (Ses tanıma) destekleniyor. Sesli komutlar aktif.", "success");
        recognition = new SpeechRecognition();
        recognition.lang = 'tr-TR';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        
        recognition.onstart = () => {
            isListening = true;
            micBtn.classList.add('listening');
            soundWaves.classList.add('active');
            jarvisStateDesc.textContent = "Dinliyorum...";
            addTerminalLog("Mikrofon aktif, ses dinleniyor...", "info");
        };
        
        recognition.onresult = (event) => {
            const voiceText = event.results[0][0].transcript;
            addTerminalLog(`Ses algılandı: "${voiceText}"`, "success");
            cmdInput.value = voiceText;
            sendCommand(voiceText);
        };
        
        recognition.onerror = (event) => {
            addTerminalLog(`Ses tanıma hatası: ${event.error}`, "error");
            stopListening();
        };
        
        recognition.onend = () => {
            stopListening();
        };
    } else {
        addTerminalLog("Tarayıcınız Web Speech API desteklemiyor. Sesli komut girişi pasif.", "warn");
        micBtn.style.opacity = '0.5';
        micBtn.title = "Ses Tanıma Desteklenmiyor";
    }

    function toggleListening() {
        if (!recognition) {
            alert("Tarayıcınız ses tanımayı desteklemiyor. Lütfen Chrome, Edge veya Safari kullanın.");
            return;
        }
        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
        }
    }

    function stopListening() {
        isListening = false;
        micBtn.classList.remove('listening');
        soundWaves.classList.remove('active');
        jarvisStateDesc.textContent = "Komutlarınızı bekliyorum.";
        addTerminalLog("Mikrofon kapatıldı.", "info");
    }

    micBtn.addEventListener('click', toggleListening);

    // ══════════════════════════════
    //  GEÇMİŞ YÖNETİMİ
    // ══════════════════════════════
    function addCommandToHistory(intent, success) {
        if (!commandHistoryList) return;
        
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
        
        const li = document.createElement('li');
        
        let successIcon = success ? '<i class="fas fa-check-circle" style="color: var(--accent-green);"></i>' : '<i class="fas fa-times-circle" style="color: #ff4444;"></i>';
        
        li.innerHTML = `
            <div class="text">${intent}</div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span class="time">${timeStr}</span>
                ${successIcon}
            </div>
        `;
        
        commandHistoryList.prepend(li);
        
        // Limit to last 10
        while (commandHistoryList.children.length > 10) {
            commandHistoryList.lastChild.remove();
        }
    }

    // ══════════════════════════════
    //  SİMÜLASYON (MOCK) MOTORU
    // ══════════════════════════════
    function getMockResponse(text) {
        const msg = text.toLowerCase();
        
        // Işıklar
        if (/ışı[kğ]ı?\s*(aç|yak|aktif)/.test(msg)) {
            const room = getRoom(msg) || "Salon";
            return { success: true, intent: "light_on", response: `✅ ${room} ışığı başarıyla açıldı.` };
        }
        if (/ışı[kğ]ı?\s*(kapat|söndür)/.test(msg)) {
            const room = getRoom(msg) || "Salon";
            return { success: true, intent: "light_off", response: `✅ ${room} ışığı başarıyla kapatıldı.` };
        }
        if (/ışı[kğ]ı?\s*durum/.test(msg)) {
            return { success: true, intent: "light_status", response: "💡 Salon Lambası: Açık | parlaklık: 180" };
        }
        
        // Klima
        if (/klima\s*(aç|çalıştır|başlat)/.test(msg)) {
            return { success: true, intent: "climate_on", response: "✅ Salon kliması başarıyla açıldı." };
        }
        if (/klima\s*(kapat|durdur)/.test(msg)) {
            return { success: true, intent: "climate_off", response: "✅ Salon kliması başarıyla kapatıldı." };
        }
        if (/(\d+)\s*derece/.test(msg)) {
            const temp = msg.match(/(\d+)\s*derece/)[1];
            return { success: true, intent: "climate_set_temp", response: `✅ Klima sıcaklığı ${temp}°C olarak ayarlandı.` };
        }
        
        // Priz
        if (/priz\s*(aç|aktif)/.test(msg)) {
            return { success: true, intent: "switch_on", response: "✅ Masa prizi akımı açıldı." };
        }
        if (/priz\s*(kapat|pasif)/.test(msg)) {
            return { success: true, intent: "switch_off", response: "✅ Masa prizi kapatıldı." };
        }
        
        // Listeleme
        if (/(tüm|hep|bütün).*(cihaz|ışık|entity)/.test(msg)) {
            return {
                success: true, 
                intent: "list_all", 
                response: "📋 Tüm Cihaz Durumları:\n• light.salon_lambasi: Açık\n• light.mutfak_lambasi: Kapalı\n• climate.salon_klima: Açık (Cool)\n• switch.masa_prizi: Açık"
            };
        }
        
        // Merhaba / Selamlaşma
        if (/selam|merhaba|nasılsın|hey jarvis/.test(msg)) {
            return { success: true, intent: "greeting", response: "Merhaba! Ben ev asistanınız Jarvis. Çevremizi analiz ettim, her şey yolunda görünüyor. Size nasıl yardımcı olabilirim?" };
        }

        return { success: false, intent: "unknown", response: "❓ Üzgünüm, bu komutu tam olarak anlayamadım. Lütfen 'ışığı aç', 'klimayı 22 derece yap' gibi net komutlar deneyin." };
    }

    function getRoom(msg) {
        if (msg.includes("salon")) return "Salon";
        if (msg.includes("mutfak")) return "Mutfak";
        if (msg.includes("yatak")) return "Yatak Odası";
        if (msg.includes("banyo")) return "Banyo";
        return null;
    }
});
