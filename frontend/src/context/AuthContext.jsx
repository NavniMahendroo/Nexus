import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [role, setRole] = useState(localStorage.getItem('user_role'));
  const [username, setUsername] = useState(localStorage.getItem('username'));
  const [organizationId, setOrganizationId] = useState(localStorage.getItem('organization_id'));
  const [volunteerId, setVolunteerId] = useState(localStorage.getItem('volunteer_id'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage validity
    const savedToken = localStorage.getItem('access_token');
    const savedRole = localStorage.getItem('user_role');
    const savedUser = localStorage.getItem('username');
    const savedOrg = localStorage.getItem('organization_id');
    const savedVol = localStorage.getItem('volunteer_id');
    if (savedToken && savedRole && savedUser) {
      setToken(savedToken);
      setRole(savedRole);
      setUsername(savedUser);
      setOrganizationId(savedOrg);
      setVolunteerId(savedVol);
    }
    setLoading(false);
  }, []);

  const login = async (usernameInput, passwordInput) => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      });
      if (!response.ok) {
        throw new Error('Invalid login credentials');
      }
      const data = await response.json();
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user_role', data.role);
      localStorage.setItem('username', data.username);
      if (data.organization_id !== null && data.organization_id !== undefined) {
        localStorage.setItem('organization_id', data.organization_id);
      } else {
        localStorage.removeItem('organization_id');
      }
      if (data.volunteer_id !== null && data.volunteer_id !== undefined) {
        localStorage.setItem('volunteer_id', data.volunteer_id);
      } else {
        localStorage.removeItem('volunteer_id');
      }
      setToken(data.access_token);
      setRole(data.role);
      setUsername(data.username);
      setOrganizationId(data.organization_id || null);
      setVolunteerId(data.volunteer_id || null);
      return data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('username');
    localStorage.removeItem('organization_id');
    localStorage.removeItem('volunteer_id');
    setToken(null);
    setRole(null);
    setUsername(null);
    setOrganizationId(null);
    setVolunteerId(null);
  };

  // Helper API fetch wrapper with automatic JWT Authorization header
  const authFetch = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      logout();
      throw new Error('Session expired, please log in again.');
    }
    return res;
  };

  return (
    <AuthContext.Provider value={{ token, role, username, organizationId, volunteerId, login, logout, authFetch, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
