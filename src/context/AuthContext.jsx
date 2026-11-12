import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { clearOffline, startOfflineSync } from '../lib/offline';

// Internetsiz token yangilanmaydi va getSession bo'sh qaytishi mumkin. Shunda brauzerda
// saqlangan sessiyani olamiz, aks holda oflayn foydalanuvchi login sahifasiga chiqarib yuborilardi
function storedSession() {
  try {
    const key = Object.keys(localStorage).find((k) => /^sb-.*-auth-token$/.test(k));
    const s = key && JSON.parse(localStorage.getItem(key));
    return s?.user ? s : null;
  } catch {
    return null;
  }
}

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = hali tekshirilmoqda

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) =>
        setSession(data.session ?? (navigator.onLine ? null : storedSession())),
      )
      .catch(() => setSession(storedSession()));
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      // Oflayn paytda token yangilanmasa ham foydalanuvchini chiqarib yubormaymiz
      if (!s && event !== 'SIGNED_OUT' && !navigator.onLine) return;
      setSession(s ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Kirgan foydalanuvchi uchun: ma'lumotlarni qurilmaga saqlash va oflayn javoblarni yuborish
  const userId = session?.user?.id;
  useEffect(() => {
    if (!userId) return;
    return startOfflineSync(userId);
  }, [userId]);

  const value = {
    session,
    user: session?.user ?? null,
    loading: session === undefined,
    signOut: async () => {
      await clearOffline();
      return supabase.auth.signOut();
    },
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
