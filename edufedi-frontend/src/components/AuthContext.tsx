import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

interface AuthContextType {
  isLoggedIn: boolean;
  user: any;
  logout: () => Promise<void>;
  setIsLoggedIn: (v: boolean) => void;
  setUser: (u: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Optionally, check login status on mount
  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_BASE_URL}/auth/me`, { withCredentials: true })
      .then(res => {
        setUser(res.data.user);
        setIsLoggedIn(true);
      })
      .catch(() => {
        setUser(null);
        setIsLoggedIn(false);
      });
  }, []);

  const logout = async () => {
    await axios.post(
      `${process.env.REACT_APP_API_BASE_URL}/auth/logout`,
      {},
      { withCredentials: true }
    );
    setIsLoggedIn(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, logout, setIsLoggedIn, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
