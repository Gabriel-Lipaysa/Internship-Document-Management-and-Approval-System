/**
 * Global Notification & Modal Utilities
 */

// Toast Notifications System
window.showToast = function (message, type = 'info', title = '', duration = 4000) {
    let container = document.getElementById('appToastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'appToastContainer';
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '10900';
        document.body.appendChild(container);
    }

    const typeNormalized = type === 'error' ? 'danger' : type;
    const bgClass = {
        success: 'text-success',
        danger: 'text-danger',
        warning: 'text-warning',
        info: 'text-primary'
    }[typeNormalized] || 'text-primary';

    const iconClass = {
        success: 'bi-check-circle-fill',
        danger: 'bi-x-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        info: 'bi-info-circle-fill'
    }[typeNormalized] || 'bi-info-circle-fill';

    const defaultTitle = {
        success: 'Success',
        danger: 'Error',
        warning: 'Notice',
        info: 'Information'
    }[typeNormalized] || 'Notification';

    const toastId = 'toast-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const toastEl = document.createElement('div');
    toastEl.id = toastId;
    toastEl.className = 'toast shadow border-0 mb-2';
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    toastEl.style.borderRadius = '12px';
    toastEl.style.backgroundColor = '#ffffff';

    toastEl.innerHTML = `
        <div class="toast-header border-0 pb-0 pt-3 px-3 bg-white" style="border-top-left-radius: 12px; border-top-right-radius: 12px;">
            <i class="bi ${iconClass} ${bgClass} me-2 fs-5"></i>
            <strong class="me-auto text-dark">${title || defaultTitle}</strong>
            <button type="button" class="btn-close ms-2 mb-1" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body px-3 pb-3 pt-2 text-secondary fs-6">
            ${message}
        </div>
    `;

    container.appendChild(toastEl);

    if (window.bootstrap && window.bootstrap.Toast) {
        const toast = new bootstrap.Toast(toastEl, { delay: duration, autohide: true });
        toast.show();
        toastEl.addEventListener('hidden.bs.toast', () => {
            toastEl.remove();
        });
    } else {
        toastEl.classList.add('show');
        setTimeout(() => {
            toastEl.remove();
        }, duration);
    }
};

// Global Confirmation Modal System
window.showConfirmModal = function ({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmBtnClass = 'btn-primary'
} = {}) {
    return new Promise((resolve) => {
        let modalEl = document.getElementById('globalConfirmModal');
        if (!modalEl) {
            modalEl = document.createElement('div');
            modalEl.id = 'globalConfirmModal';
            modalEl.className = 'modal fade';
            modalEl.tabIndex = -1;
            modalEl.setAttribute('aria-hidden', 'true');
            modalEl.style.zIndex = '10950';
            modalEl.innerHTML = `
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content border-0 shadow-lg" style="border-radius: 16px; overflow: hidden;">
                        <div class="modal-header border-0 pb-0 pt-4 px-4">
                            <h5 class="modal-title fw-bold" id="globalConfirmTitle">${title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body px-4 py-3 text-muted fs-6" id="globalConfirmMessage">
                            ${message}
                        </div>
                        <div class="modal-footer border-0 pt-0 pb-4 px-4 gap-2">
                            <button type="button" class="btn btn-light rounded-pill px-4" id="globalConfirmCancelBtn" data-bs-dismiss="modal">${cancelText}</button>
                            <button type="button" class="btn ${confirmBtnClass} rounded-pill px-4" id="globalConfirmAcceptBtn">${confirmText}</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modalEl);
        } else {
            document.getElementById('globalConfirmTitle').textContent = title;
            document.getElementById('globalConfirmMessage').textContent = message;
            const acceptBtn = document.getElementById('globalConfirmAcceptBtn');
            acceptBtn.textContent = confirmText;
            acceptBtn.className = `btn ${confirmBtnClass} rounded-pill px-4`;
            document.getElementById('globalConfirmCancelBtn').textContent = cancelText;
        }

        const modalInstance = new bootstrap.Modal(modalEl, { backdrop: 'static' });
        let confirmed = false;

        const acceptBtn = document.getElementById('globalConfirmAcceptBtn');
        const handleAccept = () => {
            confirmed = true;
            modalInstance.hide();
        };

        acceptBtn.onclick = handleAccept;

        const handleHidden = () => {
            modalEl.removeEventListener('hidden.bs.modal', handleHidden);
            acceptBtn.onclick = null;
            resolve(confirmed);
        };

        modalEl.addEventListener('hidden.bs.modal', handleHidden);
        modalInstance.show();
    });
};

document.addEventListener('DOMContentLoaded', () => {
    // Check URL parameters for flash messages and display as toasts
    const urlParams = new URLSearchParams(window.location.search);
    const urlMessage = urlParams.get('message');
    const urlError = urlParams.get('error');

    if (urlMessage) {
        showToast(decodeURIComponent(urlMessage), 'success');
        // Clean URL parameter without reloading
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
    }
    if (urlError) {
        showToast(decodeURIComponent(urlError), 'danger');
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
    }

    // Login Form Handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const formData = new FormData(loginForm);
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(Object.fromEntries(formData))
                });
                const data = await response.json();
                if (data.token) {
                    localStorage.setItem('token', data.token);
                    document.cookie = `token=${data.token}; path=/`;
                    showToast('Login successful! Redirecting...', 'success');
                    setTimeout(() => {
                        window.location.href = `/${data.role}/dashboard`;
                    }, 500);
                } else {
                    showToast(data.error || 'Invalid email or password', 'danger');
                }
            } catch (err) {
                showToast('Login failed. Please check your connection and try again.', 'danger');
            }
        });
    }

    // Intercept Fetch for Authorization Header
    const originalFetch = window.fetch;
    window.fetch = function() {
        let [resource, config] = arguments;
        if (config === undefined) {
            config = {};
        }
        if (config.headers === undefined) {
            config.headers = {};
        }
        
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        return originalFetch(resource, config);
    };

    // Delete Document Handlers
    document.querySelectorAll('.delete-doc').forEach(button => {
        button.addEventListener('click', async () => {
            const confirmed = await showConfirmModal({
                title: 'Delete Document',
                message: 'Are you sure you want to delete this document? You will need to re-upload it.',
                confirmBtnClass: 'btn-danger',
                confirmText: 'Delete'
            });

            if (confirmed) {
                const docId = button.dataset.id;
                try {
                    const response = await fetch(`/api/student/document/${docId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });
                    if (response.ok) {
                        showToast('Document deleted successfully', 'success');
                        setTimeout(() => window.location.reload(), 500);
                    } else {
                        const data = await response.json().catch(() => ({}));
                        showToast(data.error || 'Failed to delete document', 'danger');
                    }
                } catch (err) {
                    showToast('Error deleting document: ' + err.message, 'danger');
                }
            }
        });
    });

    // Registration Form Handler
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(registerForm);
            try {
                const response = await fetch('/api/auth/student-register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(Object.fromEntries(formData))
                });
                const data = await response.json();
                if (response.ok) {
                    showToast(data.message || 'Registration submitted! Please await coordinator approval.', 'success');
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 1200);
                } else {
                    showToast(data.error || 'Registration failed', 'danger');
                }
            } catch (err) {
                showToast('Registration failed. Please try again.', 'danger');
            }
        });
    }

    // Approve Student Button Handler
    document.querySelectorAll('.approve-student').forEach(button => {
        button.addEventListener('click', async (e) => {
            const userId = e.target.dataset.id;
            const confirmed = await showConfirmModal({
                title: 'Approve Student Account',
                message: 'Are you sure you want to approve and activate this student account?',
                confirmBtnClass: 'btn-success',
                confirmText: 'Approve'
            });

            if (confirmed) {
                try {
                    const response = await fetch(`/coordinator/approve-student/${userId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });
                    if (response.ok) {
                        showToast('Student account approved and activated!', 'success');
                        setTimeout(() => window.location.reload(), 600);
                    } else {
                        showToast('Failed to approve student account', 'danger');
                    }
                } catch (err) {
                    showToast('Error approving student: ' + err.message, 'danger');
                }
            }
        });
    });
});
