(function () {
    const modalSelector = '.modal, .modal-overlay, .modal-backdrop';
    const openModalSelector = '.modal.show, .modal.active, .modal-overlay.show, .modal-overlay.active, .modal-backdrop.show, .modal-backdrop.active';
    const getModal = (modalId) => document.getElementById(modalId);

    function openModal(modalId) {
        const modal = getModal(modalId);
        if (!modal) return;

        modal.classList.add('show', 'active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        modal.dispatchEvent(new CustomEvent('modal:open'));
    }

    function closeModal(modal) {
        if (!modal) return;

        modal.classList.remove('show', 'active');
        modal.setAttribute('aria-hidden', 'true');

        const hasOpenModal = document.querySelector(openModalSelector);
        if (!hasOpenModal) {
            document.body.style.overflow = '';
        }

        modal.querySelectorAll('form').forEach((form) => form.reset());
        modal.dispatchEvent(new CustomEvent('modal:close'));
    }

    function closeModalById(modalId) {
        closeModal(getModal(modalId));
    }

    document.addEventListener('click', (event) => {
        const openButton = event.target.closest('[data-modal-open]');
        if (openButton) {
            openModal(openButton.dataset.modalOpen);
            return;
        }

        const closeButton = event.target.closest('[data-modal-close]');
        if (closeButton) {
            const modal = closeButton.closest(modalSelector);
            closeModal(modal);
            return;
        }

        const modal = event.target.closest(modalSelector);
        if (modal && event.target === modal) {
            closeModal(modal);
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;

        document
            .querySelectorAll(openModalSelector)
            .forEach(closeModal);
    });

    window.HomeOSModal = {
        open: openModal,
        close: closeModalById,
        closeElement: closeModal
    };
})();
