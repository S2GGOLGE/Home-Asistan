TOOL_DECLARATIONS = [
    {
        "name": "add_calendar_event",
        "description": (
            "Outlook/Windows takvimine yeni etkinlik ekler. "
            "Kullanici toplanti, randevu, takvime ekleme veya etkinlik olusturma isterse kullan. "
            "Baslangic tarihini gercek tarih/saat olarak ver; bitis verilmezse varsayilan sure kullanilir."
        ),
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "all_day":       {"type": "BOOLEAN", "description": "true ise tum gun etkinligi olusturur."},
                "calendar_name": {"type": "STRING",  "description": "Eklenecek takvim adi. Opsiyonel."},
                "end_iso":       {"type": "STRING",  "description": "Bitis tarih/saat. Opsiyonel."},
                "location":      {"type": "STRING",  "description": "Etkinlik konumu. Opsiyonel."},
                "notes":         {"type": "STRING",  "description": "Etkinlik notlari. Opsiyonel."},
                "start_iso":     {"type": "STRING",  "description": "Baslangic tarih/saat. ISO veya yyyy-MM-dd HH:mm formatinda."},
                "title":         {"type": "STRING",  "description": "Etkinlik basligi. Ornek: 'Disci Randevusu'"},
            },
            "required": ["title", "start_iso"],
        },
    },
    {
        "name": "add_reminder",
        "description": (
            "Outlook gorev/animsatici listesine yeni bir kayit ekler. "
            "Kullanici 'hatirlat', 'animsatici ekle', 'reminder kur' dediginde kullan. "
            "Goreli zaman ifadelerini bugunku tarih baglamina gore due_iso alanina ISO formatinda cevir."
        ),
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "all_day":   {"type": "BOOLEAN", "description": "Tum gun animsatici ise true"},
                "due_iso":   {"type": "STRING",  "description": "Opsiyonel tarih/saat. Ornek: 2026-04-13T09:00 veya tum gun icin 2026-04-13"},
                "list_name": {"type": "STRING",  "description": "Opsiyonel animsatici listesi"},
                "notes":     {"type": "STRING",  "description": "Opsiyonel not"},
                "priority":  {"type": "STRING",  "description": "low | medium | high"},
                "title":     {"type": "STRING",  "description": "Animsatici basligi"},
            },
            "required": ["title"],
        },
    },
    {
        "name": "analyze_screen",
        "description": (
            "Aktif pencerenin veya tum ekranin ekran goruntusunu alip Gemini vision ile analiz eder. "
            "Kullanici ekranda ne oldugunu, bir hatayi, gorunen metni, butonlari veya pencere icerigini sordugunda kullan. "
            "Kullanici tum ekrani/ekrani gormeni isterse target=full_screen kullan; belirli pencere icin active_window kullan."
        ),
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "query":  {"type": "STRING", "description": "Kullanicinin ekranla ilgili sorusu. Ornek: 'Bu hatayi oku', 'Ekranda ne var?'"},
                "target": {"type": "STRING", "description": "active_window | full_screen. Varsayilan active_window."},
            },
            "required": ["query"],
        },
    },
    {
        "name": "browser_control",
        "description": "TarayÄ±cÄ±da URL aÃ§ar, Google'da arama yapar veya YouTube'da ilk sonucu doÄŸrudan oynatÄ±r.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "action": {"type": "STRING", "description": "open_url | search | play_youtube"},
                "query":  {"type": "STRING", "description": "Arama sorgusu (search veya play_youtube iÃ§in)"},
                "url":    {"type": "STRING", "description": "AÃ§Ä±lacak URL (open_url iÃ§in)"},
            },
            "required": ["action"],
        },
    },
    {
        "name": "control_media",
        "description": (
            "Windows global medya tuslariyla calan muzigi/videoyu kontrol eder. "
            "Kullanici muzigi durdur, duraklat, devam ettir, sonraki sarki, onceki sarki, sesi kapat gibi isteklerde kullan."
        ),
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "action": {"type": "STRING", "description": "stop | pause | resume | play_pause | next | previous | mute | volume_up | volume_down"},
            },
            "required": ["action"],
        },
    },
    {
        "name": "delete_calendar_event",
        "description": (
            "Outlook/Windows takviminden etkinlik siler. "
            "Kullanici bir toplantiyi, randevuyu veya takvim kaydini silmek istediginde kullan. "
            "Ayni ada birden fazla etkinlik varsa dogru kaydi bulmak icin baslangic tarihini gercek tarih/saat olarak ver."
        ),
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "calendar_name":      {"type": "STRING",  "description": "Opsiyonel takvim adi"},
                "delete_all_matches": {"type": "BOOLEAN", "description": "true ise eslesen tum etkinlikleri siler"},
                "start_iso":          {"type": "STRING",  "description": "Opsiyonel tarih/saat. Ayni isimli birden fazla etkinligi ayirt etmek icin kullan."},
                "title":              {"type": "STRING",  "description": "Silinecek etkinlik basligi. Ornek: 'Disci Randevusu'"},
            },
            "required": ["title"],
        },
    },
    {
        "name": "delete_memory",
        "description": (
            "Kalici hafizadaki bir kaydi siler. "
            "Kullanici 'bunu hafizandan kaldir', 'unut', 'sil' gibi bir sey derse kullan. "
            "Mumkunse category ve key ile sil; emin degilsen match_text ile ilgili kaydi bulup kaldir."
        ),
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "category":   {"type": "STRING", "description": "Kaydin kategorisi. Ornek: notes | identity | preferences | projects"},
                "key":        {"type": "STRING", "description": "Silinecek anahtar. Ornek: claude_limit_refresh"},
                "match_text": {"type": "STRING", "description": "Kaydi bulmak icin kullanilacak dogal dil parcasi. Ornek: 'claude ai limit yenilenmesi'"},
            },
        },
    },
    {
        "name": "get_calendar_events",
        "description": (
            "Outlook/Windows takvimini okur. "
            "Bugun, yarin, siradaki etkinlik veya yaklasan ajandayi ozetler. "
            "Kullanici toplanti, takvim, ajanda, etkinlik veya gunluk programini sordugunda kullan."
        ),
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "limit": {"type": "NUMBER", "description": "Maksimum etkinlik sayisi"},
                "query": {
                    "type": "STRING",
                    "description": (
                        "today | tomorrow | next | agenda | week veya dogal dilde "
                        "'onumuzdeki 30 gun', '2 hafta', 'bu ay', 'gelecek ay'"
                    ),
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "get_reminders",
        "description": (
            "Outlook gorev/animsatici listesini okur. "
            "Bugunku, yaklasan, geciken veya tum acik animsaticilari ozetler. "
            "Kullanici hatirlatma, animsatici, reminder veya yapilacaklar listesini sordugunda kullan."
        ),
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "limit":     {"type": "NUMBER", "description": "Maksimum animsatici sayisi"},
                "list_name": {"type": "STRING", "description": "Istenirse belirli bir animsatici listesi adi"},
                "query":     {"type": "STRING", "description": "today | upcoming | overdue | all | next"},
            },
            "required": ["query"],
        },
    },
    {
        "name": "get_weather",
        "description": (
            "Anlik hava durumunu ozetler. Varsayilan konum Istanbul'dur. "
            "Kullanici hava durumunu, sicakligi veya yagmur durumunu sordugunda kullan."
        ),
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "location": {"type": "STRING", "description": "Sehir veya konum. Bos birakilirsa Istanbul kullanilir."},
            },
        },
    },
    {
        "name": "get_youtube_channel_report",
        "description": (
            "YouTube kanalinin public istatistiklerini ve son videolarin performansini raporlar. "
            "Kullanici kanal istatistiklerini, abone sayisini, son videolarini, buyume hizini "
            "veya YouTube analizini sordugunda kullan. Bu arac Studio yerine public YouTube Data API verisini kullanir."
        ),
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "handle":      {"type": "STRING", "description": "Opsiyonel kanal handle'i, kanal linki veya kanal ID'si. Bos birakilirsa ayarlardaki youtube_channel_handle kullanilir."},
                "query":       {"type": "STRING", "description": "Dogal dilde analiz istegi. Ornek: 'YouTube istatistiklerim nasil', 'son videolarimi analiz et'"},
                "video_limit": {"type": "NUMBER", "description": "Analize dahil edilecek son video sayisi. Varsayilan 6."},
            },
            "required": ["query"],
        },
    },
    {
        "name": "open_app",
        "description": "Windows'ta herhangi bir uygulamayi acar. Spotify, Chrome, Terminal, Explorer, VS Code vb.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "app_name": {"type": "STRING", "description": "Uygulama adi (orn. 'Spotify', 'Chrome', 'Terminal')"},
            },
            "required": ["app_name"],
        },
    },
    {
        "name": "owner_lock",
        "description": "Sahip oturumunu kilitler ve hassas araclari tekrar kapatir.",
        "parameters": {"type": "OBJECT", "properties": {}},
    },
    {
        "name": "owner_unlock",
        "description": (
            "Sahip PIN/yetki kodu ile JARVIS'in hassas arac oturumunu acar. "
            "Kullanici 'yetki kodu ...', 'sahip pin ...' gibi net bir dogrulama soylediginde kullan."
        ),
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "pin": {"type": "STRING", "description": "Sahip PIN/yetki kodu"},
            },
            "required": ["pin"],
        },
    },
    {
        "name": "play_media",
        "description": (
            "YouTube, Spotify veya Apple Music/Music uygulamasÄ±nda ÅŸarkÄ±, mÃ¼zik veya video aÃ§ar. "
            "KullanÄ±cÄ± belirli bir platform sÃ¶ylerse onu kullan. "
            "Belirtmezse uygun olanÄ± dene. "
            "KullanÄ±cÄ± 'Ã§al', 'oynat', 'aÃ§' diyorsa autoplay=true kullan."
        ),
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "autoplay": {"type": "BOOLEAN", "description": "true ise mÃ¼mkÃ¼nse doÄŸrudan oynatÄ±r"},
                "provider": {"type": "STRING",  "description": "auto | youtube | spotify | apple_music"},
                "query":    {"type": "STRING",  "description": "ÅarkÄ±, sanatÃ§Ä±, albÃ¼m veya video arama ifadesi"},
            },
            "required": ["query"],
        },
    },
    {
        "name": "save_memory",
        "description": "KullanÄ±cÄ± hakkÄ±nda Ã¶nemli bilgiyi kalÄ±cÄ± belleÄŸe kaydeder. Ä°sim, tercihler, projeler vb. duyunca sessizce Ã§aÄŸÄ±r.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "category": {"type": "STRING", "description": "identity | preferences | projects | notes"},
                "key":      {"type": "STRING", "description": "KÄ±sa anahtar (Ã¶rn. 'name')"},
                "value":    {"type": "STRING", "description": "DeÄŸer (Ä°ngilizce)"},
            },
            "required": ["category", "key", "value"],
        },
    },
    {
        "name": "send_whatsapp_message",
        "description": (
            "WhatsApp Desktop veya WhatsApp Web Ã¼zerinden mesaj taslaÄŸÄ± aÃ§ar veya mesajÄ± gÃ¶nderir. "
            "KiÅŸi adÄ± veya telefon numarasÄ±yla Ã§alÄ±ÅŸabilir. "
            "Telefon numarasÄ± verilmemiÅŸse kiÅŸi adÄ±nÄ± Ã¶nce kayÄ±tlÄ± WhatsApp kiÅŸileri ve iÃ§e aktarÄ±lan telefon rehberinde ara. "
            "KullanÄ±cÄ± 'gÃ¶nder', 'yolla', 'ile', 'hemen gÃ¶nder' gibi aÃ§Ä±k bir gÃ¶nderme niyeti sÃ¶ylÃ¼yorsa "
            "ekstra onay istemeden send_now=true kullan. "
            "YalnÄ±zca 'hazÄ±rla', 'taslak aÃ§', 'yaz ama gÃ¶nderme' diyorsa send_now=false kullan."
        ),
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "app_target":     {"type": "STRING",  "description": "desktop | web | auto. VarsayÄ±lan auto, tercihen desktop."},
                "message":        {"type": "STRING",  "description": "GÃ¶nderilecek mesaj iÃ§eriÄŸi"},
                "phone_number":   {"type": "STRING",  "description": "UluslararasÄ± telefon numarasÄ±. Ã–rn: +905551112233"},
                "recipient_name": {"type": "STRING",  "description": "KiÅŸi adÄ±. Ã–rn: 'Anne', 'Ahmet', 'Ece'"},
                "send_now":       {"type": "BOOLEAN", "description": "true ise sohbet aÃ§Ä±ldÄ±ktan sonra mesajÄ± otomatik gÃ¶nderir"},
            },
            "required": ["message"],
        },
    },
    {
        "name": "shell_run",
        "description": "Windows terminal komutu calistirir. Dosya islemleri, sistem yonetimi.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "command": {"type": "STRING", "description": "Calistirilacak PowerShell veya cmd komutu"},
            },
            "required": ["command"],
        },
    },
    {
        "name": "sys_info",
        "description": "Sistem bilgisi alÄ±r: pil durumu, CPU, RAM, disk, saat, tarih, aÄŸ baÄŸlantÄ±sÄ±.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "query": {"type": "STRING", "description": "battery | cpu | ram | disk | time | date | network | all"},
            },
            "required": ["query"],
        },
    },
    {
        "name": "system_sleep",
        "description": (
            "Windows bilgisayari uyku moduna alir. "
            "Kullanici 'uyku moduna geÃ§', 'bilgisayari uyut', 'sleep mode' gibi net bir komut verdiginde kullan. "
            "Bu hassas islem sahip dogrulamasi gerektirir."
        ),
        "parameters": {"type": "OBJECT", "properties": {}},
    },
    {
        "name": "call_whatsapp_contact",
        "description": (
            "WhatsApp Desktop uzerinden kisi adi veya telefon numarasiyla sesli/goruntulu arama baslatir. "
            "Kullanici WhatsApp'tan ara, WP'den ara, sesli ara, goruntulu ara gibi isteklerde kullan. "
            "Resmi WhatsApp call URL'i olmadigi icin Windows'ta PyAutoGUI ile WhatsApp penceresindeki arama butonuna tiklar."
        ),
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "recipient_name": {
                    "type": "STRING",
                    "description": "Kisi adi. Orn: 'Anne', 'Ahmet', 'Ece'"
                },
                "phone_number": {
                    "type": "STRING",
                    "description": "Uluslararasi telefon numarasi. Orn: +905551112233"
                },
                "call_type": {
                    "type": "STRING",
                    "description": "voice | video. Varsayilan voice."
                }
            }
        }
    },
    {
        "name": "save_whatsapp_contact",
        "description": (
            "SÄ±k kullanÄ±lan bir WhatsApp kiÅŸisini adÄ± ve telefon numarasÄ±yla kalÄ±cÄ± belleÄŸe kaydeder. "
            "KullanÄ±cÄ± bir kiÅŸiyi 'annem', 'Ahmet', 'iÅŸ ortaÄŸÄ±m' gibi tekrar kullanÄ±lacak ÅŸekilde tanÄ±mladÄ±ÄŸÄ±nda kullan."
        ),
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "display_name": {
                    "type": "STRING",
                    "description": "Kaydedilecek kiÅŸi adÄ±. Ã–rn: 'Annem', 'Ahmet'"
                },
                "phone_number": {
                    "type": "STRING",
                    "description": "UluslararasÄ± telefon numarasÄ±. Ã–rn: +905551112233"
                },
                "aliases": {
                    "type": "STRING",
                    "description": "VirgÃ¼lle ayrÄ±lmÄ±ÅŸ alternatif hitaplar. Ã–rn: 'anne, annem, mom'"
                }
            },
            "required": ["display_name", "phone_number"]
        }
    },
    {
        "name": "service_status",
        "description": (
            "Merkezi Service Registry'den servis, cihaz ve entegrasyon baglanti durumlarini okur. "
            "Kullanici 'bagli servisleri goster', 'Home Server durumu', 'cevrimdisi servisleri goster', "
            "'son baglanti olaylari' veya 'sistem saglik raporu olustur' dediginde kullan."
        ),
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "query": {
                    "type": "STRING",
                    "description": "connected | home_server | offline | events | health veya dogal dil sorgusu",
                }
            },
            "required": ["query"],
        },
    },
    {
        "name": "tcp_status",
        "description": (
            "Sistemdeki aktif TCP baglantilarini, local/remote IP-port bilgilerini, durumlarini, "
            "PID/process adlarini, Home Server TCP baglantilarini, supheli baglantilari ve son TCP "
            "baglanti olaylarini gosterir. Kullanici 'TCP baglantilarini goster', 'aktif TCP', "
            "'Home Server TCP', 'supheli baglantilar', 'TCP istatistikleri' veya 'son TCP olaylari' "
            "dediginde kullan."
        ),
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "query": {
                    "type": "STRING",
                    "description": "connections | home_server | suspicious | events | stats veya dogal dil sorgusu",
                }
            },
            "required": ["query"],
        },
    },

    {
        "name": "home_control",
        "description": (
            "Home Assistant akilli ev sistemini kontrol eder. "
            "Isiklar, switchler, klimalar, perdeler, sahneler, scriptler ve sensor durumlarini yonetir. "
            "Kullanici 'isigi ac', 'lambawi kapat', 'klimayi 22 dereceye ayarla', 'perdeli ac', "
            "'salon sahnesini aktifle', 'mutfak isigi kac watt', 'hangi cihazlar acik' gibi "
            "ev otomasyonu komutlari verdiginde kullan."
        ),
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "action": {
                    "type": "STRING",
                    "description": (
                        "Yapilacak islem: "
                        "turn_on | turn_off | toggle | status | "
                        "set_brightness | set_color | set_temperature | "
                        "scene | script | "
                        "list_devices | list_lights | list_switches | list_sensors | list_covers | list_climate"
                    ),
                },
                "entity_id": {
                    "type": "STRING",
                    "description": "Hedef HA entity ID. Orn: light.salon, switch.klima, climate.oturma_odasi",
                },
                "domain": {
                    "type": "STRING",
                    "description": "Opsiyonel domain: light | switch | climate | cover | fan | media_player | lock | automation",
                },
                "extra": {
                    "type": "OBJECT",
                    "description": (
                        "Ek parametreler: "
                        "brightness_pct (0-100 int) | color_name (string) | "
                        "temperature (float, Celsius) | scene_id | script_id"
                    ),
                },
            },
            "required": ["action"],
        },
    },
]
