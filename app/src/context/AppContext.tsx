import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import { apiFetchWithAuth } from '@/lib/api-client';
import { useAuth } from './AuthContext';

export interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  credits: number;
  description: string;
  timestamp: string;
}

interface AppContextType {
  balance: number;
  credits: number;
  setBalance: (balance: number) => void;
  setCredits: (credits: number) => void;
  addBalance: (amount: number) => void;
  addCredits: (amount: number) => void;
  deductBalance: (amount: number) => void;
  deductCredits: (amount: number) => void;
  sessionStatus: 'LIVE' | 'IDLE';
  setSessionStatus: (status: 'LIVE' | 'IDLE') => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => void;
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  clearNotifications: () => void;
  refreshWallet: () => Promise<void>;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const BALANCE_KEY = 'morphly_balance';
const CREDITS_KEY = 'morphly_credits';
const TRANSACTIONS_KEY = 'morphly_transactions';

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isLocalPreview = import.meta.env.DEV && import.meta.env.VITE_LOCAL_PREVIEW === 'true';
  const [balance, setBalanceState] = useState(isLocalPreview ? 10000 : 0);
  const [credits, setCreditsState] = useState(isLocalPreview ? 999999 : 0);
  const [sessionStatus, setSessionStatus] = useState<'LIVE' | 'IDLE'>('IDLE');
  const [isLoading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const refreshWallet = useCallback(async () => {
    if (isLocalPreview || user?.id === '00000000-0000-0000-0000-000000000001') {
      setBalanceState(10000);
      setCreditsState(999999);
      return;
    }

    if (!user?.id) {
      setBalanceState(0);
      setCreditsState(0);
      setTransactions([]);
      return;
    }

    try {
      const res = await apiFetchWithAuth(`/wallet?userId=${user.id}`);
      if (!res.ok) {
        const rawBody = await res.text();
        let apiError = rawBody;
        try {
          const parsedBody = JSON.parse(rawBody);
          apiError = parsedBody?.error || parsedBody?.message || rawBody;
        } catch {
          // Keep raw body when response is not JSON.
        }

        const errorDetail = apiError ? `: ${apiError}` : '';
        throw new Error(`API returned ${res.status}${errorDetail}`);
      }

      const text = await res.text();
      const data = JSON.parse(text);
      if (data.balance !== undefined) setBalanceState(data.balance);
      if (data.credits !== undefined) setCreditsState(data.credits);
      setTransactions(data.transactions || []);
    } catch (err) {
      console.warn('Failed to sync wallet data:', err);
    }
  }, [isLocalPreview, user?.id]);

  useEffect(() => {
    void refreshWallet();
  }, [refreshWallet]);

  useEffect(() => {
    if (!user?.id || isLocalPreview) return;

    const syncWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshWallet();
      }
    };

    const syncWhenFocused = () => {
      void refreshWallet();
    };

    document.addEventListener('visibilitychange', syncWhenVisible);
    window.addEventListener('focus', syncWhenFocused);

    return () => {
      document.removeEventListener('visibilitychange', syncWhenVisible);
      window.removeEventListener('focus', syncWhenFocused);
    };
  }, [isLocalPreview, refreshWallet, user?.id]);

  useEffect(() => {
    const handleWalletRefresh = () => {
      void refreshWallet();
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'vixy:wallet-refresh') {
        void refreshWallet();
      }
    };

    window.addEventListener('vixy:wallet-refresh', handleWalletRefresh);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('vixy:wallet-refresh', handleWalletRefresh);
      window.removeEventListener('storage', handleStorage);
    };
  }, [refreshWallet]);

  const setBalance = useCallback((newBalance: number) => {
    setBalanceState(newBalance);
    localStorage.setItem(BALANCE_KEY, newBalance.toString());
  }, []);

  const setCredits = useCallback((newCredits: number) => {
    setCreditsState(newCredits);
    localStorage.setItem(CREDITS_KEY, newCredits.toString());
  }, []);

  const addBalance = useCallback((amount: number) => {
    const transaction: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'credit',
      amount,
      credits: 0,
      description: 'Balance added',
      timestamp: new Date().toISOString(),
    };
    
    setBalanceState(prev => {
      const newBalance = prev + amount;
      localStorage.setItem(BALANCE_KEY, newBalance.toString());
      return newBalance;
    });
    
    setTransactions(prev => {
      const updated = [transaction, ...prev].slice(0, 50);
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addCredits = useCallback((amount: number) => {
    const transaction: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'credit',
      amount: 0,
      credits: amount,
      description: 'Credits purchased',
      timestamp: new Date().toISOString(),
    };
    
    setCreditsState(prev => {
      const newCredits = prev + amount;
      localStorage.setItem(CREDITS_KEY, newCredits.toString());
      return newCredits;
    });
    
    setTransactions(prev => {
      const updated = [transaction, ...prev].slice(0, 50);
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deductBalance = useCallback((amount: number) => {
    const transaction: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'debit',
      amount,
      credits: 0,
      description: 'Session usage',
      timestamp: new Date().toISOString(),
    };
    
    setBalanceState(prev => {
      const newBalance = Math.max(0, prev - amount);
      localStorage.setItem(BALANCE_KEY, newBalance.toString());
      return newBalance;
    });
    
    setTransactions(prev => {
      const updated = [transaction, ...prev].slice(0, 50);
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deductCredits = useCallback((amount: number) => {
    const transaction: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'debit',
      amount: 0,
      credits: amount,
      description: 'Stream usage',
      timestamp: new Date().toISOString(),
    };
    
    setCreditsState(prev => {
      const newCredits = Math.max(0, prev - amount);
      localStorage.setItem(CREDITS_KEY, newCredits.toString());
      return newCredits;
    });
    
    setTransactions(prev => {
      const updated = [transaction, ...prev].slice(0, 50);
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addTransaction = useCallback((transactionData: Omit<Transaction, 'id' | 'timestamp'>) => {
    const transaction: Transaction = {
      ...transactionData,
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };
    
    setTransactions(prev => {
      const updated = [transaction, ...prev].slice(0, 50);
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addNotification = useCallback((notificationData: Omit<Notification, 'id' | 'timestamp'>) => {
    const notification: Notification = {
      ...notificationData,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };
    
    setNotifications(prev => {
      const updated = [notification, ...prev].slice(0, 20);
      return updated;
    });
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const value = useMemo(() => ({
    balance,
    credits,
    setBalance,
    setCredits,
    addBalance,
    addCredits,
    deductBalance,
    deductCredits,
    sessionStatus,
    setSessionStatus,
    isLoading,
    setLoading,
    transactions,
    addTransaction,
    notifications,
    addNotification,
    clearNotifications,
    refreshWallet,
  }), [balance, credits, setBalance, setCredits, addBalance, addCredits, deductBalance, deductCredits, sessionStatus, isLoading, transactions, addTransaction, notifications, addNotification, clearNotifications, refreshWallet]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
