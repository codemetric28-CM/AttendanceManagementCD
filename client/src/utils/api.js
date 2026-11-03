const BASE_URL = import.meta.env.VITE_API_URL || '';

export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('jwt_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers
  });

  // File downloads may not be JSON — callers for JSON always expect JSON
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!response.ok) {
      throw new Error('Request failed');
    }
    return response;
  }

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('jwt_token');
      window.location.href = '/login';
    }
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = 'ri-information-line';
  if (type === 'success') icon = 'ri-checkbox-circle-line';
  if (type === 'danger') icon = 'ri-error-warning-line';
  if (type === 'warning') icon = 'ri-alert-line';

  toast.innerHTML = `<i class="${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
