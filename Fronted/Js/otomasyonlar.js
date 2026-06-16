document.addEventListener('DOMContentLoaded', () => {
    const backButton = document.getElementById('backButton');
    const automationCards = document.querySelectorAll('[data-automation-id]');
    const automationForm = document.getElementById('automationForm');
    const autoNameInput = document.getElementById('autoName');

    if (backButton) {
        backButton.addEventListener('click', () => {
            window.location.href = '/Fronted/Pages/index.html';
        });
    }

    automationCards.forEach((card) => {
        card.addEventListener('click', () => {
            card.classList.toggle('active');
        });
    });

    if (automationForm && autoNameInput) {
        automationForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const automationName = autoNameInput.value.trim();
            if (!automationName) return;

            console.log('Yeni Kaydedilen Otomasyon:', automationName);
            alert(`"${automationName}" otomasyonu başarıyla eklendi!`);

            if (window.HomeOSModal) {
                window.HomeOSModal.close('automationModal');
            } else {
                automationForm.reset();
            }
        });
    }
});
