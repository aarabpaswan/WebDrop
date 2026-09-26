import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CustomLogos {
  app_logo: string | null;
  phone_logo: string | null;
  pc_logo: string | null;
}

interface LogoContextType {
  logos: CustomLogos;
  loading: boolean;
  uploadLogo: (type: 'app_logo' | 'phone_logo' | 'pc_logo', file: File) => Promise<void>;
  resetLogo: (type: 'app_logo' | 'phone_logo' | 'pc_logo') => Promise<void>;
  refreshLogos: () => Promise<void>;
  setLogos: React.Dispatch<React.SetStateAction<CustomLogos>>;
}

const LogoContext = createContext<LogoContextType | undefined>(undefined);

export const LogoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [logos, setLogos] = useState<CustomLogos>({
    app_logo: null,
    phone_logo: null,
    pc_logo: null,
  });
  const [loading, setLoading] = useState(true);

  const refreshLogos = async () => {
    try {
      const res = await fetch('/api/admin/logos');
      if (res.ok) {
        const data = await res.json();
        setLogos(data);
      }
    } catch (err) {
      console.error('Failed to fetch logos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshLogos();
  }, []);

  const uploadLogo = async (type: 'app_logo' | 'phone_logo' | 'pc_logo', file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    formData.append('type', type);

    const res = await fetch('/api/admin/logos/upload', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Upload failed');
    }

    const data = await res.json();
    if (data.logos) {
      setLogos(data.logos);
    }
  };

  const resetLogo = async (type: 'app_logo' | 'phone_logo' | 'pc_logo') => {
    const res = await fetch('/api/admin/logos/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });

    if (!res.ok) {
      throw new Error('Reset failed');
    }

    const data = await res.json();
    if (data.logos) {
      setLogos(data.logos);
    }
  };

  return (
    <LogoContext.Provider value={{ logos, loading, uploadLogo, resetLogo, refreshLogos, setLogos }}>
      {children}
    </LogoContext.Provider>
  );
};

export const useLogos = () => {
  const context = useContext(LogoContext);
  if (!context) {
    throw new Error('useLogos must be used within a LogoProvider');
  }
  return context;
};
