const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/v1';

export const apiClient = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
};
