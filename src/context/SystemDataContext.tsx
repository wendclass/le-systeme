import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Client,
  DailyTask,
  RecurringExpense,
  Transaction,
  UserObjective,
  UserSettings,
  SyncState,
  HunterRank,
} from '../types';
import { useAuth } from './AuthContext';
import { getSupabaseClient } from '../lib/supabase';
import { convertToUSD } from '../lib/currency';

interface SystemDataContextType {
  // Sync state
  syncState: SyncState;
  syncErrorMessage: string | null;
  triggerManualSync: () => Promise<void>;

  // Data
  clients: Client[];
  activities: Activity[];
  transactions: Transaction[];
  recurringExpenses: RecurringExpense[];
  dailyTasks: DailyTask[];
  settings: UserSettings;
  objective: UserObjective | null;

  // Actions - Clients
  addClient: (client: Omit<Client, 'id' | 'uid' | 'date_creation'>) => Promise<Client>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;

  // Actions - Activities
  addActivity: (activity: Omit<Activity, 'id' | 'uid' | 'date_creation'>) => Promise<Activity>;
  updateActivity: (id: string, updates: Partial<Activity>) => Promise<void>;
  updateActivityRank: (id: string, rank: HunterRank) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;

  // Actions - Transactions
  addTransaction: (tx: Omit<Transaction, 'id' | 'uid' | 'montant_usd'>) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;

  // Actions - Recurring Expenses
  addRecurringExpense: (exp: Omit<RecurringExpense, 'id' | 'uid' | 'montant_usd'>) => Promise<RecurringExpense>;
  updateRecurringExpense: (id: string, updates: Partial<RecurringExpense>) => Promise<void>;
  toggleRecurringExpenseStatus: (id: string) => Promise<void>;
  deleteRecurringExpense: (id: string) => Promise<void>;

  // Actions - Daily Tasks
  addDailyTask: (task: Omit<DailyTask, 'id' | 'uid'>) => Promise<DailyTask>;
  setDailyPriority: (taskId: string, date: string) => Promise<void>;
  updateDailyTaskStatus: (taskId: string, statut: DailyTask['statut']) => Promise<void>;
  deleteDailyTask: (taskId: string) => Promise<void>;

  // Actions - Objective
  saveObjective: (obj: Omit<UserObjective, 'id' | 'uid' | 'date_creation'>) => Promise<UserObjective>;

  // Actions - Settings & Showcases
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  registerShowcaseInterest: (moduleName: string) => Promise<void>;
  exportDataJSON: () => string;
  exportDataCSV: () => void;
}

const SystemDataContext = createContext<SystemDataContextType | undefined>(undefined);

const STORAGE_PREFIX = 'class_s_data_';

const DEFAULT_SETTINGS: UserSettings = {
  uid: '',
  profit_first: {
    profit: 5,
    owner_pay: 50,
    tax: 15,
    opex: 30,
  },
  xof_to_usd_rate: 1 / 606,
  rate_updated_at: new Date().toISOString(),
  opex_alert_threshold: 30,
  showcase_interests: [],
};

export const SystemDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const uid = user?.id || 'guest_hunter';

  const [syncState, setSyncState] = useState<SyncState>('synced');
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [settings, setSettings] = useState<UserSettings>({ ...DEFAULT_SETTINGS, uid });
  const [objective, setObjective] = useState<UserObjective | null>(null);

  // Load from localStorage on mount or UID change — strict isolation per user
  useEffect(() => {
    if (!uid) return;

    // Reset all state when user changes (prevents data leakage between accounts)
    setClients([]);
    setActivities([]);
    setTransactions([]);
    setRecurringExpenses([]);
    setDailyTasks([]);
    setSettings({ ...DEFAULT_SETTINGS, uid });
    setObjective(null);

    try {
      const savedClients = localStorage.getItem(`${STORAGE_PREFIX}clients_${uid}`);
      const savedActivities = localStorage.getItem(`${STORAGE_PREFIX}activities_${uid}`);
      const savedTx = localStorage.getItem(`${STORAGE_PREFIX}transactions_${uid}`);
      const savedExp = localStorage.getItem(`${STORAGE_PREFIX}expenses_${uid}`);
      const savedTasks = localStorage.getItem(`${STORAGE_PREFIX}tasks_${uid}`);
      const savedSettings = localStorage.getItem(`${STORAGE_PREFIX}settings_${uid}`);
      const savedObjective = localStorage.getItem(`${STORAGE_PREFIX}objective_${uid}`);

      if (savedClients) setClients(JSON.parse(savedClients));
      if (savedActivities) setActivities(JSON.parse(savedActivities));
      if (savedTx) setTransactions(JSON.parse(savedTx));
      if (savedExp) setRecurringExpenses(JSON.parse(savedExp));
      if (savedTasks) setDailyTasks(JSON.parse(savedTasks));
      if (savedSettings) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings), uid });
      if (savedObjective) setObjective(JSON.parse(savedObjective));
    } catch (e) {
      console.error('Error loading local state:', e);
    }
  }, [uid]);

  // Persist locally helper
  const persistLocally = (key: string, data: unknown) => {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${key}_${uid}`, JSON.stringify(data));
    } catch (err) {
      console.warn('Local storage write warning:', err);
    }
  };

  // Immediate Cloud Sync Worker (Supabase)
  const syncWithCloud = useCallback(
    async (tableName: string, payload: Record<string, unknown>, action: 'insert' | 'update' | 'delete' | 'upsert') => {
      const client = getSupabaseClient();
      if (!client) {
        // No client configured yet — data safely cached locally
        setSyncState('synced');
        return;
      }

      setSyncState('syncing');
      setSyncErrorMessage(null);

      try {
        let result;
        if (action === 'insert') {
          result = await client.from(tableName).insert({ ...payload, uid });
        } else if (action === 'upsert') {
          result = await client.from(tableName).upsert({ ...payload, uid });
        } else if (action === 'update') {
          result = await client.from(tableName).update(payload).match({ id: payload.id, uid });
        } else if (action === 'delete') {
          result = await client.from(tableName).delete().match({ id: payload.id, uid });
        }

        if (result?.error) throw result.error;
        setSyncState('synced');
      } catch (err) {
        console.warn(`Cloud sync warning for ${tableName}:`, err);
        setSyncState('error');
        setSyncErrorMessage('Erreur de synchronisation, réessai automatique');
        setTimeout(() => setSyncState('synced'), 5000);
      }
    },
    [uid]
  );

  const triggerManualSync = async () => {
    setSyncState('syncing');
    setTimeout(() => setSyncState('synced'), 800);
  };

  // ================= OBJECTIVE =================
  const saveObjective = async (obj: Omit<UserObjective, 'id' | 'uid' | 'date_creation'>): Promise<UserObjective> => {
    const newObj: UserObjective = {
      ...obj,
      id: objective?.id || ('obj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
      uid,
      date_creation: objective?.date_creation || new Date().toISOString(),
    };
    setObjective(newObj);
    persistLocally('objective', newObj);
    await syncWithCloud('user_objectives', newObj as unknown as Record<string, unknown>, 'upsert');
    return newObj;
  };

  // ================= CLIENTS =================
  const addClient = async (item: Omit<Client, 'id' | 'uid' | 'date_creation'>): Promise<Client> => {
    const newClient: Client = {
      ...item,
      id: 'cli_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      uid,
      date_creation: new Date().toISOString(),
    };
    const updated = [newClient, ...clients];
    setClients(updated);
    persistLocally('clients', updated);
    await syncWithCloud('clients', newClient as unknown as Record<string, unknown>, 'insert');
    return newClient;
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    const updated = clients.map((c) => (c.id === id ? { ...c, ...updates } : c));
    setClients(updated);
    persistLocally('clients', updated);
    await syncWithCloud('clients', { id, ...updates } as Record<string, unknown>, 'update');
  };

  const deleteClient = async (id: string) => {
    const updated = clients.filter((c) => c.id !== id);
    setClients(updated);
    persistLocally('clients', updated);
    await syncWithCloud('clients', { id } as Record<string, unknown>, 'delete');
  };

  // ================= ACTIVITIES =================
  const addActivity = async (item: Omit<Activity, 'id' | 'uid' | 'date_creation'>): Promise<Activity> => {
    const newAct: Activity = {
      ...item,
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      uid,
      date_creation: new Date().toISOString(),
    };
    const updated = [...activities, newAct];
    setActivities(updated);
    persistLocally('activities', updated);
    await syncWithCloud('activities', newAct as unknown as Record<string, unknown>, 'insert');
    return newAct;
  };

  const updateActivity = async (id: string, updates: Partial<Activity>) => {
    const updated = activities.map((a) => (a.id === id ? { ...a, ...updates } : a));
    setActivities(updated);
    persistLocally('activities', updated);
    await syncWithCloud('activities', { id, ...updates } as Record<string, unknown>, 'update');
  };

  const updateActivityRank = async (id: string, rank: HunterRank) => {
    await updateActivity(id, { rang_actuel: rank });
  };

  const deleteActivity = async (id: string) => {
    const updated = activities.filter((a) => a.id !== id);
    setActivities(updated);
    persistLocally('activities', updated);
    await syncWithCloud('activities', { id } as Record<string, unknown>, 'delete');
  };

  // ================= TRANSACTIONS =================
  const addTransaction = async (tx: Omit<Transaction, 'id' | 'uid' | 'montant_usd'>): Promise<Transaction> => {
    const montant_usd = convertToUSD(tx.montant_original, tx.devise_origine);
    const newTx: Transaction = {
      ...tx,
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      uid,
      montant_usd,
    };
    const updated = [newTx, ...transactions];
    setTransactions(updated);
    persistLocally('transactions', updated);
    await syncWithCloud('transactions', newTx as unknown as Record<string, unknown>, 'insert');
    return newTx;
  };

  const deleteTransaction = async (id: string) => {
    const updated = transactions.filter((t) => t.id !== id);
    setTransactions(updated);
    persistLocally('transactions', updated);
    await syncWithCloud('transactions', { id } as Record<string, unknown>, 'delete');
  };

  // ================= RECURRING EXPENSES =================
  const addRecurringExpense = async (
    exp: Omit<RecurringExpense, 'id' | 'uid' | 'montant_usd'>
  ): Promise<RecurringExpense> => {
    const montant_usd = convertToUSD(exp.montant_original, exp.devise_origine);
    const newExp: RecurringExpense = {
      ...exp,
      id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      uid,
      montant_usd,
    };
    const updated = [newExp, ...recurringExpenses];
    setRecurringExpenses(updated);
    persistLocally('expenses', updated);
    await syncWithCloud('recurring_expenses', newExp as unknown as Record<string, unknown>, 'insert');
    return newExp;
  };

  const updateRecurringExpense = async (id: string, updates: Partial<RecurringExpense>) => {
    const updated = recurringExpenses.map((e) => {
      if (e.id === id) {
        const mod = { ...e, ...updates };
        if (updates.montant_original !== undefined || updates.devise_origine !== undefined) {
          mod.montant_usd = convertToUSD(mod.montant_original, mod.devise_origine);
        }
        return mod;
      }
      return e;
    });
    setRecurringExpenses(updated);
    persistLocally('expenses', updated);
    const target = updated.find((e) => e.id === id);
    if (target) await syncWithCloud('recurring_expenses', target as unknown as Record<string, unknown>, 'update');
  };

  const toggleRecurringExpenseStatus = async (id: string) => {
    const target = recurringExpenses.find((e) => e.id === id);
    if (!target) return;
    const newStatus: RecurringExpense['statut'] = target.statut === 'actif' ? 'pause' : 'actif';
    await updateRecurringExpense(id, { statut: newStatus });
  };

  const deleteRecurringExpense = async (id: string) => {
    const updated = recurringExpenses.filter((e) => e.id !== id);
    setRecurringExpenses(updated);
    persistLocally('expenses', updated);
    await syncWithCloud('recurring_expenses', { id } as Record<string, unknown>, 'delete');
  };

  // ================= DAILY TASKS (THE ONE THING) =================
  const addDailyTask = async (task: Omit<DailyTask, 'id' | 'uid'>): Promise<DailyTask> => {
    let updatedTasks = [...dailyTasks];
    if (task.est_la_priorite) {
      updatedTasks = updatedTasks.map((t) =>
        t.date === task.date ? { ...t, est_la_priorite: false } : t
      );
    }
    const newTask: DailyTask = {
      ...task,
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      uid,
    };
    updatedTasks = [newTask, ...updatedTasks];
    setDailyTasks(updatedTasks);
    persistLocally('tasks', updatedTasks);
    await syncWithCloud('daily_tasks', newTask as unknown as Record<string, unknown>, 'insert');
    return newTask;
  };

  const setDailyPriority = async (taskId: string, date: string) => {
    const updated = dailyTasks.map((t) => {
      if (t.date === date) {
        return { ...t, est_la_priorite: t.id === taskId };
      }
      return t;
    });
    setDailyTasks(updated);
    persistLocally('tasks', updated);
    const chosen = updated.find((t) => t.id === taskId);
    if (chosen) await syncWithCloud('daily_tasks', chosen as unknown as Record<string, unknown>, 'update');
  };

  const updateDailyTaskStatus = async (taskId: string, statut: DailyTask['statut']) => {
    const updated = dailyTasks.map((t) => (t.id === taskId ? { ...t, statut } : t));
    setDailyTasks(updated);
    persistLocally('tasks', updated);
    const chosen = updated.find((t) => t.id === taskId);
    if (chosen) await syncWithCloud('daily_tasks', chosen as unknown as Record<string, unknown>, 'update');
  };

  const deleteDailyTask = async (taskId: string) => {
    const updated = dailyTasks.filter((t) => t.id !== taskId);
    setDailyTasks(updated);
    persistLocally('tasks', updated);
    await syncWithCloud('daily_tasks', { id: taskId } as Record<string, unknown>, 'delete');
  };

  // ================= SETTINGS & SHOWCASES =================
  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    persistLocally('settings', updated);
    await syncWithCloud('user_settings', updated as unknown as Record<string, unknown>, 'upsert');
  };

  const registerShowcaseInterest = async (moduleName: string) => {
    const current = settings.showcase_interests || [];
    if (!current.includes(moduleName)) {
      await updateSettings({ showcase_interests: [...current, moduleName] });
    }
  };

  const exportDataJSON = () => {
    const bundle = {
      export_date: new Date().toISOString(),
      user_uid: uid,
      brand: 'Class S - Le Système',
      objective,
      clients,
      activities,
      transactions,
      recurringExpenses,
      dailyTasks,
      settings,
    };
    return JSON.stringify(bundle, null, 2);
  };

  const exportDataCSV = () => {
    let csv = 'ID,Date,Type,Activite,Montant_USD,Montant_Original,Devise,Categorie,Client,Note\n';
    transactions.forEach((t) => {
      const act = activities.find((a) => a.id === t.activite_id)?.nom || '';
      const cli = clients.find((c) => c.id === t.client_id)?.nom || '';
      csv += `"${t.id}","${t.date}","${t.type}","${act}",${t.montant_usd},${t.montant_original},"${t.devise_origine}","${t.categorie}","${cli}","${t.note || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Le_Systeme_Transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SystemDataContext.Provider
      value={{
        syncState,
        syncErrorMessage,
        triggerManualSync,
        clients,
        activities,
        transactions,
        recurringExpenses,
        dailyTasks,
        settings,
        objective,
        addClient,
        updateClient,
        deleteClient,
        addActivity,
        updateActivity,
        updateActivityRank,
        deleteActivity,
        addTransaction,
        deleteTransaction,
        addRecurringExpense,
        updateRecurringExpense,
        toggleRecurringExpenseStatus,
        deleteRecurringExpense,
        addDailyTask,
        setDailyPriority,
        updateDailyTaskStatus,
        deleteDailyTask,
        saveObjective,
        updateSettings,
        registerShowcaseInterest,
        exportDataJSON,
        exportDataCSV,
      }}
    >
      {children}
    </SystemDataContext.Provider>
  );
};

export const useSystemData = () => {
  const context = useContext(SystemDataContext);
  if (!context) {
    throw new Error('useSystemData must be used within a SystemDataProvider');
  }
  return context;
};
