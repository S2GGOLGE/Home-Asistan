document.addEventListener("DOMContentLoaded", () => {
    cihazlariGetir();
});

async function cihazlariGetir() {
    try {
        const response = await fetch("https://localhost:7201/api/Listing");

        if (!response.ok) {
            throw new Error("API bağlantı hatası");
        }

        const devices = await response.json();

        const devicesGrid = document.querySelector(".devices-grid");

        devicesGrid.innerHTML = "";

        devices.forEach(device => {

            let durumText = device.status ? "Online" : "Offline";
            let durumClass = device.status ? "online" : "offline";
            let checked = device.status ? "checked" : "";

            let icon = getIcon(device.type);

            devicesGrid.innerHTML += `
                <div class="device-card ${device.status ? "active" : ""}" data-id="${device.id}">
                    <div class="card-header">
                        <div class="icon-wrap">
                            <i class="${icon}"></i>
                        </div>

                        <span class="badge ${durumClass}">
                            ${durumText}
                        </span>
                    </div>

                    <div class="card-body">
                        <h3>${device.name}</h3>
                        <p>${device.type}</p>
                    </div>

                    <div class="card-footer">
                        <div class="actions">
                            <button class="action-btn">
                                <i class="fas fa-sync-alt"></i>
                            </button>

                            <button class="action-btn">
                                <i class="fas fa-cog"></i>
                            </button>
                        </div>

                        <label class="switch">
                            <input type="checkbox" ${checked}>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
            `;
        });

        istatistikleriGuncelle(devices);

    } catch (error) {
        console.error(error);
    }
}

function getIcon(type) {

    switch (type?.toLowerCase()) {

        case "light":
            return "fas fa-lightbulb";

        case "camera":
            return "fas fa-video";

        case "plug":
            return "fas fa-plug";

        case "sensor":
            return "fas fa-microchip";

        case "climate":
            return "fas fa-snowflake";

        default:
            return "fas fa-laptop";
    }
}

function istatistikleriGuncelle(devices) {

    const toplam = devices.length;
    const online = devices.filter(x => x.status).length;
    const offline = toplam - online;

    const statCards = document.querySelectorAll(".stat-card .num");

    statCards[0].textContent = toplam;
    statCards[1].textContent = online;
    statCards[2].textContent = offline;
}