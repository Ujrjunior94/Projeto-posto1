/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AppState, User, SyncConfig } from "./types";
import { INITIAL_STATE } from "./data/mockData";
import AuthScreen from "./components/AuthScreen";
import DashboardOverview from "./components/DashboardOverview";
import TanksManagement from "./components/TanksManagement";
import NozzlesManagement from "./components/NozzlesManagement";
import ShiftsChecklists from "./components/ShiftsChecklists";
import CashManagement from "./components/CashManagement";
import ANPQualityControl from "./components/ANPQualityControl";
import ReportsAdvanced from "./components/ReportsAdvanced";
import CloudSyncPanel from "./components/CloudSyncPanel";
import LMCManagement from "./components/LMCManagement";
import AuditorLog from "./components/AuditorLog";
import CashierShortage from "./components/CashierShortage";
import LubricantDeliveries from "./components/LubricantDeliveries";
import DailyBalance from "./components/DailyBalance";
import SupplyRequests from "./components/SupplyRequests";
import TimesheetManagement from "./components/TimesheetManagement";
import { UserAvatar } from "./components/UserAvatar";
import WelcomeOnboarding from "./components/WelcomeOnboarding";

import {
  LayoutDashboard,
  Fuel,
  Activity,
  ClipboardList,
  DollarSign,
  Thermometer,
  FileText,
  Cloud,
  LogOut,
  UserCheck,
  Building2,
  Menu,
  X,
  Lock,
  History,
  BookOpen,
  AlertTriangle,
  Droplets,
  BarChart3,
  Package,
  Fingerprint,
  Download,
  Smartphone,
  Heart,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Wifi,
  WifiOff,
  Share2,
  Copy,
  CheckCircle2,
} from "lucide-react";

const STORAGE_KEY = "meu_posto_app_state";
const CONFIG_KEY = "meu_posto_sync_config";

import { 
  auth, 
  db, 
  onAuthStateChanged, 
  signOut, 
  doc, 
  getDoc, 
  setDoc,
  onSnapshot 
} from "./lib/firebase";

export default function App() {
  // 1. Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("meu_posto_logged_user");
    return saved ? JSON.parse(saved) : null;
  });

  // 2. Main App State (Offline-First local storage)
  const [appState, setAppState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });

  // 3. Sync Configuration
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(() => {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (saved) return JSON.parse(saved);
    return {
      apiUrl: window.location.origin,
      token: "",
      autoSync: true,
    };
  });

  // 4. UI Layout States & PWA Install
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingState, setLoadingState] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  // Auto-trigger onboarding for new users if not completed
  useEffect(() => {
    if (currentUser) {
      const completed = localStorage.getItem(`meu_posto_onboarding_completed_${currentUser.id}`);
      if (!completed) {
        setShowOnboarding(true);
      }
    }
  }, [currentUser]);

  // Monitor network connectivity for continuous online sync
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (currentUser) {
        const rawCnpj = currentUser.cnpjPosto || "12.345.678/0001-99";
        const cleanCnpj = rawCnpj.replace(/\D/g, "") || "12345678000199";
        const docRef = doc(db, "postos", cleanCnpj);
        setDoc(docRef, appState).then(() => {
          const nowIso = new Date().toISOString();
          setSyncConfig((prev) => ({
            ...prev,
            lastCloudSyncDate: nowIso,
            lastBackupDate: nowIso,
          }));
        }).catch((err) => console.error("Erro na ressincronização ao voltar online:", err));
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [appState, currentUser]);
  const [showPwaBanner, setShowPwaBanner] = useState(true);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      alert("Para instalar este Web App no seu celular ou computador:\n- No Chrome/Android: toque no menu (⋮) e selecione 'Adicionar à tela inicial' ou 'Instalar aplicativo'.\n- No iOS/Safari: toque no botão Compartilhar (⎘) e escolha 'Adicionar à Tela de Início'.");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  // Sync Firebase Auth session
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let userData: User | null = null;
        try {
          const fetchPromise = getDoc(doc(db, "users", firebaseUser.uid));
          const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
          const userDoc = await Promise.race([fetchPromise, timeoutPromise]);
          if (userDoc && "exists" in userDoc && userDoc.exists()) {
            userData = userDoc.data() as User;
          }
        } catch (err: any) {
          console.warn("Firestore offline ou timeout ao buscar sessão do usuário:", err?.message || err);
        }

        if (!userData) {
          // Fallback to local storage
          const saved = localStorage.getItem("meu_posto_logged_user");
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (parsed && (parsed.email === firebaseUser.email || parsed.id === firebaseUser.uid)) {
                userData = parsed;
              }
            } catch (e) {
              console.warn("Erro ao ler usuário salvo no localStorage:", e);
            }
          }
        }

        if (!userData && firebaseUser.email) {
          // Fallback default user object for firebase user
          userData = {
            id: firebaseUser.uid,
            nomeCompleto: firebaseUser.displayName || firebaseUser.email.split("@")[0] || "Usuário",
            email: firebaseUser.email,
            senhaCriptografada: "******",
            cpf: "000.000.000-00",
            cargo: "Gerente",
            cnpjPosto: "12.345.678/0001-99",
            telefone: "(00) 00000-0000",
          };
        }

        if (userData) {
          setCurrentUser(userData);
          localStorage.setItem("meu_posto_logged_user", JSON.stringify(userData));
        }
      } else {
        setCurrentUser(null);
        localStorage.removeItem("meu_posto_logged_user");
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync Firestore AppState in real-time when currentUser is loaded
  useEffect(() => {
    if (!currentUser) return;
    const rawCnpj = currentUser.cnpjPosto || "12.345.678/0001-99";
    const cleanCnpj = rawCnpj.replace(/\D/g, "") || "12345678000199";
    
    setLoadingState(true);
    const docRef = doc(db, "postos", cleanCnpj);

    // Subscribe to real-time changes
    const unsubscribe = onSnapshot(
      docRef,
      async (docSnap) => {
        setLoadingState(false);
        if (docSnap.exists()) {
          // Avoid overwriting local edits if snapshot is generated by our own pending write
          if (!docSnap.metadata.hasPendingWrites) {
            const cloudData = docSnap.data() as AppState;
            setAppState(cloudData);
            const nowIso = new Date().toISOString();
            setSyncConfig((prev) => ({
              ...prev,
              lastCloudSyncDate: nowIso,
            }));
          }
        } else {
          // Create initial document in Firestore
          try {
            await setDoc(docRef, appState);
            const nowIso = new Date().toISOString();
            setSyncConfig((prev) => ({
              ...prev,
              lastCloudSyncDate: nowIso,
              lastBackupDate: nowIso,
            }));
          } catch (err) {
            console.error("Erro ao inicializar documento do posto no Firestore:", err);
          }
        }
      },
      (err) => {
        console.error("Erro na escuta em tempo real do Firestore:", err);
        setLoadingState(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.cnpjPosto]);

  // Auto-persist AppState to localStorage and debounced setDoc to Firestore
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    
    if (!currentUser) return;
    const rawCnpj = currentUser.cnpjPosto || "12.345.678/0001-99";
    const cleanCnpj = rawCnpj.replace(/\D/g, "") || "12345678000199";
    
    const saveToFirestore = async () => {
      try {
        const docRef = doc(db, "postos", cleanCnpj);
        await setDoc(docRef, appState);
        const nowIso = new Date().toISOString();
        setSyncConfig((prev) => ({
          ...prev,
          lastCloudSyncDate: nowIso,
          lastBackupDate: nowIso,
        }));
      } catch (err) {
        console.error("Erro ao salvar dados no Firestore:", err);
      }
    };

    const timer = setTimeout(() => {
      saveToFirestore();
    }, 300);

    return () => clearTimeout(timer);
  }, [appState, currentUser?.cnpjPosto]);

  // Auto-persist SyncConfig
  useEffect(() => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(syncConfig));
  }, [syncConfig]);

  // Auto scheduled backup checker
  useEffect(() => {
    if (!syncConfig.scheduledBackupEnabled) return;

    const checkAndExecuteBackup = () => {
      const now = new Date();
      const last = syncConfig.lastBackupDate ? new Date(syncConfig.lastBackupDate) : null;
      let shouldRun = false;

      if (!last) {
        shouldRun = true;
      } else {
        const diffHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
        const freq = syncConfig.backupFrequency || "daily";

        if (freq === "12h" && diffHours >= 12) shouldRun = true;
        else if (freq === "daily" && diffHours >= 24) shouldRun = true;
        else if (freq === "weekly" && diffHours >= 168) shouldRun = true;
      }

      if (shouldRun) {
        const dateStr = now.toISOString().split("T")[0];

        if (syncConfig.backupDestination === "download" || syncConfig.backupDestination === "both" || syncConfig.autoDownloadLocalJson) {
          try {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 4));
            const downloadAnchor = document.createElement("a");
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `backup_agendado_posto_${dateStr}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
          } catch (e) {
            console.error("Erro ao gerar download de backup agendado:", e);
          }
        }

        setSyncConfig((prev) => ({
          ...prev,
          lastBackupDate: now.toISOString(),
        }));
      }
    };

    checkAndExecuteBackup();
    const interval = setInterval(checkAndExecuteBackup, 1000 * 60 * 15);
    return () => clearInterval(interval);
  }, [syncConfig.scheduledBackupEnabled, syncConfig.backupFrequency, syncConfig.backupDestination, appState]);

  // Handle Logins
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("meu_posto_logged_user", JSON.stringify(user));
    // Reset to dashboard upon login
    setActiveTab("dashboard");
  };

  // Handle Logouts
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Erro ao deslogar:", err);
    }
    setCurrentUser(null);
    localStorage.removeItem("meu_posto_logged_user");
  };

  // Handle Registering a new User
  const handleRegisterUser = (newUser: User) => {
    const updatedUsers = [...appState.users, newUser];
    setAppState({
      ...appState,
      users: updatedUsers,
    });
  };

  // Custom State Modifiers
  const handleUpdateTanks = (tanks: typeof appState.tanks) => {
    setAppState((prev) => ({ ...prev, tanks }));
  };

  const handleUpdateNozzles = (nozzles: typeof appState.nozzles) => {
    setAppState((prev) => ({ ...prev, nozzles }));
  };

  const handleUpdateShifts = (shifts: typeof appState.shifts) => {
    setAppState((prev) => ({ ...prev, shifts }));
  };

  const handleUpdateTransactions = (transactions: typeof appState.transactions) => {
    setAppState((prev) => ({ ...prev, transactions }));
  };

  const handleUpdateClosings = (nozzleClosings: typeof appState.nozzleClosings) => {
    setAppState((prev) => ({ ...prev, nozzleClosings }));
  };

  const handleUpdateReconciliations = (reconciliations: typeof appState.reconciliations) => {
    setAppState((prev) => ({ ...prev, reconciliations }));
  };

  const handleUpdateCalibrations = (calibrations: typeof appState.calibrations) => {
    setAppState((prev) => ({ ...prev, calibrations }));
  };

  const handleUpdateQualityAudits = (qualityAudits: typeof appState.qualityAudits) => {
    setAppState((prev) => ({ ...prev, qualityAudits }));
  };

  const handleUpdateDeliveries = (deliveries: typeof appState.deliveries) => {
    setAppState((prev) => ({ ...prev, deliveries }));
  };

  const handleUpdateLmc = (lmc: typeof appState.lmc) => {
    setAppState((prev) => ({ ...prev, lmc }));
  };

  const handleUpdateCredentials = (systemCredentials: typeof appState.systemCredentials) => {
    setAppState((prev) => ({ ...prev, systemCredentials }));
  };

  const handleUpdateUsers = (users: typeof appState.users) => {
    setAppState((prev) => ({ ...prev, users }));
  };

  const handleUpdateCurrentUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem("meu_posto_logged_user", JSON.stringify(updatedUser));

    setAppState((prev) => {
      const updatedUsers = prev.users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
      return { ...prev, users: updatedUsers };
    });
  };

  const handleUpdateAudits = (audits: typeof appState.audits) => {
    setAppState((prev) => ({ ...prev, audits }));
  };

  const handleUpdateShortages = (shortages: typeof appState.shortages) => {
    setAppState((prev) => ({ ...prev, shortages }));
  };

  const handleUpdatePreferences = (dashboardPreferences: typeof appState.dashboardPreferences) => {
    setAppState((prev) => ({ ...prev, dashboardPreferences }));
  };

  const handleUpdateLubricants = (lubricantDeliveries: typeof appState.lubricantDeliveries) => {
    setAppState((prev) => ({ ...prev, lubricantDeliveries }));
  };

  const handleUpdateBalances = (dailyBalances: typeof appState.dailyBalances) => {
    setAppState((prev) => ({ ...prev, dailyBalances }));
  };

  const handleUpdateSupplyRequests = (supplyRequests: typeof appState.supplyRequests) => {
    setAppState((prev) => ({ ...prev, supplyRequests }));
  };

  const handleUpdateTimesheetEntries = (timesheetEntries: typeof appState.timesheetEntries) => {
    setAppState((prev) => ({ ...prev, timesheetEntries }));
  };

  const handleUpdateStationDetails = (nomePosto: string, cnpjPosto: string, securePassword?: string) => {
    setAppState((prev) => {
      const oldCnpj = currentUser?.cnpjPosto || "12.345.678/0001-99";
      
      const updatedUsers = prev.users.map((u) => {
        if (u.cnpjPosto === oldCnpj) {
          return { ...u, cnpjPosto };
        }
        return u;
      });

      if (currentUser && currentUser.cnpjPosto === oldCnpj) {
        const updatedCurrentUser = { ...currentUser, cnpjPosto };
        setCurrentUser(updatedCurrentUser);
        localStorage.setItem("meu_posto_logged_user", JSON.stringify(updatedCurrentUser));
      }

      const updatedShifts = prev.shifts.map(s => s.stationCnpj === oldCnpj ? { ...s, stationCnpj: cnpjPosto } : s);
      const updatedLmc = prev.lmc.map(r => r.stationCnpj === oldCnpj ? { ...r, stationCnpj: cnpjPosto } : r);
      const updatedAppointments = prev.appointments.map(a => a.stationCnpj === oldCnpj ? { ...a, stationCnpj: cnpjPosto } : a);
      const updatedCredentials = prev.systemCredentials.map(c => c.stationCnpj === oldCnpj ? { ...c, stationCnpj: cnpjPosto } : c);
      const updatedDeliveries = prev.deliveries.map(d => d.stationCnpj === oldCnpj ? { ...d, stationCnpj: cnpjPosto } : d);
      const updatedAudits = prev.audits.map(a => a.stationCnpj === oldCnpj ? { ...a, stationCnpj: cnpjPosto } : a);
      const updatedLubricants = prev.lubricantDeliveries.map(d => d.stationCnpj === oldCnpj ? { ...d, stationCnpj: cnpjPosto } : d);
      const updatedBalances = prev.dailyBalances.map(b => b.stationCnpj === oldCnpj ? { ...b, stationCnpj: cnpjPosto } : b);

      return {
        ...prev,
        nomePosto,
        securePassword: securePassword || prev.securePassword || "adm001",
        users: updatedUsers,
        shifts: updatedShifts,
        lmc: updatedLmc,
        appointments: updatedAppointments,
        systemCredentials: updatedCredentials,
        deliveries: updatedDeliveries,
        audits: updatedAudits,
        lubricantDeliveries: updatedLubricants,
        dailyBalances: updatedBalances
      };
    });
  };

  const handleAddAuditLog = (actionType: string, target: string, details: string, status: string = "Regular") => {
    const newLog = {
      id: "log_" + Date.now() + "_" + Math.floor(Math.random() * 100),
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString("pt-BR"),
      actionType,
      target,
      details,
      operator: currentUser ? currentUser.nomeCompleto : "Sistema",
      complianceStatus: status,
      stationCnpj: currentUser ? currentUser.cnpjPosto : "12.345.678/0001-99",
    };
    setAppState((prev) => ({
      ...prev,
      audits: [newLog, ...(prev.audits || [])],
    }));
  };

  const handleRestoreState = (restoredState: AppState) => {
    // Keep users intact so the current user doesn't lose login session
    const currentUsers = appState.users;
    const mergedState = {
      ...restoredState,
      users: restoredState.users && restoredState.users.length > 0 ? restoredState.users : currentUsers,
    };
    setAppState(mergedState);
  };

  // Render AuthScreen if no user is signed in
  if (!currentUser) {
    return (
      <AuthScreen
        existingUsers={appState.users}
        onLogin={handleLogin}
        onRegister={handleRegisterUser}
      />
    );
  }

  // Check role constraints: Frentistas can only view Dashboard, Caixa & Turnos checklists
  const isFrentista = currentUser.cargo === "Frentista";

  // Sidebar Menu Tabs Definitions with Permission guards
  const navigationItems = [
    { id: "dashboard", name: "Dashboard", icon: LayoutDashboard, frentistaAllowed: true },
    { id: "caixa", name: "Leitura de Bicos", icon: ClipboardList, frentistaAllowed: true },
    { id: "balanco", name: "Balanço Diário", icon: BarChart3, frentistaAllowed: false },
    { id: "escalas", name: "Escala & Checklists", icon: ClipboardList, frentistaAllowed: true },
    { id: "ponto", name: "Folha de Ponto", icon: Fingerprint, frentistaAllowed: true },
    { id: "tanques", name: "Controle de Tanques", icon: Fuel, frentistaAllowed: false },
    { id: "pedidos", name: "Pedidos de Material", icon: Package, frentistaAllowed: true },
    { id: "lubrificantes", name: "Recebimento de Lubrif.", icon: Droplets, frentistaAllowed: true },
    { id: "faltas", name: "Faltas de Caixa", icon: AlertTriangle, frentistaAllowed: true },
    { id: "bicos", name: "Bicos & Bombas", icon: Activity, frentistaAllowed: false },
    { id: "qualidade", name: "Qualidade ANP", icon: Thermometer, frentistaAllowed: false },
    { id: "lmc", name: "Livro LMC (ANP)", icon: BookOpen, frentistaAllowed: false },
    { id: "relatorios", name: "Relatórios & PDF", icon: FileText, frentistaAllowed: false },
    { id: "sincronizacao", name: "Sistemas & Segurança", icon: Cloud, frentistaAllowed: false },
    { id: "auditoria", name: "Auditoria ERP", icon: History, frentistaAllowed: false },
  ];

  return (
    <div className="min-h-screen bg-[#F9F9F7] flex text-[#0F172A] font-sans pb-16 lg:pb-0">
      
      {/* 1. SIDEBAR DESKTOP */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#0A192F] border-r border-slate-800/80 p-5 shrink-0 justify-between">
        <div className="space-y-6">
          {/* Logo Brand */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800/80">
            <div className="h-10 w-10 rounded-2xl bg-[#00B880] flex items-center justify-center text-white font-bold shadow-lg shadow-[#00B880]/20">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-white tracking-tight text-lg font-display truncate max-w-[150px]" title={appState.nomePosto || "Meu Posto"}>
                {appState.nomePosto || "Meu Posto"}
              </h1>
              <span className="text-[10px] text-[#00B880] font-mono uppercase tracking-widest font-semibold">
                ERP Sincronizado
              </span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1.5">
            {navigationItems.map((item) => {
              const isAllowed = item.frentistaAllowed || !isFrentista;
              const IconComponent = item.icon;

              return (
                <button
                  key={item.id}
                  disabled={!isAllowed}
                  onClick={() => {
                    setActiveTab(item.id);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition group relative cursor-pointer ${
                    activeTab === item.id
                      ? "bg-[#00B880] text-white shadow-md shadow-[#00B880]/20"
                      : isAllowed
                      ? "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                      : "text-slate-600 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconComponent className={`h-4 w-4 ${activeTab === item.id ? "text-white" : "text-slate-400"}`} />
                    <span>{item.name}</span>
                  </div>
                  
                  {!isAllowed && (
                    <Lock className="h-3.5 w-3.5 text-slate-600" title="Acesso Restrito a Gerentes/Master" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Info bottom card */}
        <div className="pt-4 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800/60">
            <UserAvatar user={currentUser} size="md" />
            <div className="truncate min-w-0">
              <p className="text-xs font-black text-white truncate">{currentUser.nomeCompleto}</p>
              <span className="text-[10px] bg-slate-800 text-emerald-300 border border-slate-700 px-2 py-0.5 rounded-full font-semibold">
                {currentUser.cargo}
              </span>
            </div>
          </div>

          {/* Auto-Sync status line inside desktop sidebar */}
          <div className="flex items-center justify-between text-[11px] px-2 text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <span className={`relative flex h-2 w-2`}>
                {syncConfig.autoSync ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00B880]"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
                )}
              </span>
              Auto-Sync
            </span>
            <span className="font-mono text-[9.5px] uppercase tracking-wider text-slate-300 font-bold">{syncConfig.autoSync ? "Ativo" : "Pause"}</span>
          </div>

          <button
            onClick={handleInstallPWA}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#00B880]/15 border border-[#00B880]/40 hover:bg-[#00B880]/25 text-[#00B880] font-extrabold text-xs rounded-xl transition shadow-2xs cursor-pointer"
            title="Instalar o aplicativo no dispositivo (PWA)"
          >
            <Smartphone className="h-4 w-4" />
            Instalar Web App (PWA)
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-950/30 border border-rose-900/40 hover:bg-rose-900/40 text-rose-300 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Desconectar
          </button>
        </div>
      </aside>

      {/* 2. SIDEBAR MOBILE */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 lg:hidden flex">
          <div className="w-64 bg-[#0A192F] p-5 flex flex-col justify-between h-full border-r border-slate-800">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-[#00B880]" />
                  <span className="font-bold text-white font-display truncate max-w-[130px]" title={appState.nomePosto || "Meu Posto"}>
                    {appState.nomePosto || "Meu Posto"}
                  </span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="space-y-1.5 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
                {navigationItems.map((item) => {
                  const isAllowed = item.frentistaAllowed || !isFrentista;
                  const IconComponent = item.icon;

                  return (
                    <button
                      key={item.id}
                      disabled={!isAllowed}
                      onClick={() => {
                        setActiveTab(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        activeTab === item.id
                          ? "bg-[#00B880] text-white"
                          : isAllowed
                          ? "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                          : "text-slate-600 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <IconComponent className="h-4 w-4" />
                        <span>{item.name}</span>
                      </div>
                      {!isAllowed && <Lock className="h-3.5 w-3.5 text-slate-600" />}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center gap-2.5 text-xs">
                <UserAvatar user={currentUser} size="sm" />
                <div className="truncate min-w-0">
                  <p className="font-bold text-white truncate">{currentUser.nomeCompleto}</p>
                  <span className="text-[10px] text-emerald-400 font-semibold block">{currentUser.cargo}</span>
                </div>
              </div>

              <button
                onClick={handleInstallPWA}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#00B880]/20 border border-[#00B880]/40 text-[#00B880] font-bold text-xs rounded-xl cursor-pointer"
              >
                <Smartphone className="h-4 w-4" />
                Instalar App (PWA)
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-950/20 border border-rose-900/50 text-rose-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header Principal */}
        <header className="bg-white/90 backdrop-blur-xs border-b border-slate-200/80 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div>
              <h1 className="font-extrabold text-[#0F172A] text-lg sm:text-2xl font-display tracking-tight leading-tight">
                {navigationItems.find((n) => n.id === activeTab)?.name}
              </h1>
              <p className="text-xs text-[#64748B] font-medium hidden sm:block">
                CNPJ do Posto Ativo: <span className="font-mono text-[#0F172A] font-bold">{currentUser.cnpjPosto}</span> • Sistema de Gestão
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Real-time Continuous Online Sync Badge */}
            <button
              onClick={() => setActiveTab("sincronizacao")}
              className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold border transition flex items-center gap-2 cursor-pointer shadow-2xs ${
                isOnline
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                  : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100"
              }`}
              title="Status da Sincronização Contínua em Tempo Real no Banco de Dados"
            >
              <span className="relative flex h-2 w-2">
                {isOnline ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                )}
              </span>
              {isOnline ? (
                <span className="flex items-center gap-1">
                  <Wifi className="h-3.5 w-3.5 text-emerald-600 hidden sm:inline" />
                  <span className="hidden md:inline">SINCRONIA CONTINUA 24/7</span>
                  <span className="md:hidden">ONLINE</span>
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <WifiOff className="h-3.5 w-3.5 text-rose-600 hidden sm:inline" />
                  <span>OFFLINE</span>
                </span>
              )}
            </button>

            {/* Compartilhar Link Button */}
            <button
              onClick={() => {
                setCopiedShareLink(false);
                setIsShareModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-xs rounded-full transition shadow-2xs cursor-pointer"
              title="Compartilhar link de acesso do posto"
            >
              <Share2 className="h-3.5 w-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Compartilhar</span>
            </button>

            {/* Guide/Onboarding Helper button */}
            <button
              onClick={() => setShowOnboarding(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-full transition shadow-2xs cursor-pointer"
              title="Acessar o assistente de introdução"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-600 animate-pulse" />
              <span className="hidden md:inline">Guia Inicial</span>
            </button>

            {/* Pill/Badge de Data Monospaçada */}
            <div className="bg-white border border-slate-200/80 px-3.5 py-1.5 rounded-full text-xs font-mono text-[#0F172A] font-bold shadow-2xs flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-[#00B880]" />
              <span>
                {new Date().toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric"
                })}
              </span>
            </div>

            <button
              onClick={handleInstallPWA}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00B880] hover:bg-[#05C480] text-white font-bold text-xs rounded-full transition shadow-2xs cursor-pointer"
              title="Instalar aplicativo PWA"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">PWA</span>
            </button>

            <div className="bg-emerald-50 text-[#00B880] border border-emerald-200/80 px-2.5 py-1 rounded-full text-xs font-black flex items-center gap-2 shadow-2xs">
              <UserAvatar user={currentUser} size="xs" />
              <span>{currentUser.cargo}</span>
            </div>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* Section 3.A: Banner de Instalação PWA (Suave / Pastel Green) */}
          {showPwaBanner && (
            <div className="bg-[#E8F7EE] border border-[#00B880]/30 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-300">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#00B880] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-[#0F172A]">Aplicativo Web Meu Posto (PWA)</h4>
                  <p className="text-xs text-[#64748B] font-medium">Instale na sua tela inicial para acesso instantâneo, batimento de ponto e operação em campo.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleInstallPWA}
                  className="px-4 py-2 bg-[#00B880] hover:bg-[#05C480] text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  Instalar App
                </button>
                <button
                  onClick={() => setShowPwaBanner(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  title="Fechar aviso"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Main Router Logic */}
          {activeTab === "dashboard" && (
            <DashboardOverview 
              appState={appState} 
              onNavigate={setActiveTab} 
              onUpdatePreferences={handleUpdatePreferences}
            />
          )}

          {activeTab === "tanques" && (
            <TanksManagement
              appState={appState}
              userRole={currentUser.cargo}
              onUpdateTanks={handleUpdateTanks}
            />
          )}

          {activeTab === "bicos" && (
            <NozzlesManagement
              appState={appState}
              userRole={currentUser.cargo}
              onUpdateNozzles={handleUpdateNozzles}
              onAddAuditLog={handleAddAuditLog}
            />
          )}

          {activeTab === "escalas" && (
            <ShiftsChecklists
              appState={appState}
              userRole={currentUser.cargo}
              cnpjPosto={currentUser.cnpjPosto}
              onUpdateShifts={handleUpdateShifts}
              onUpdateUsers={handleUpdateUsers}
              onAddAuditLog={handleAddAuditLog}
            />
          )}

          {activeTab === "caixa" && (
            <CashManagement
              appState={appState}
              userRole={currentUser.cargo}
              onUpdateTransactions={handleUpdateTransactions}
              onUpdateClosings={handleUpdateClosings}
              onUpdateReconciliations={handleUpdateReconciliations}
            />
          )}

          {activeTab === "balanco" && (
            <DailyBalance
              appState={appState}
              userRole={currentUser.cargo}
              onUpdateBalances={handleUpdateBalances}
              onAddAuditLog={handleAddAuditLog}
            />
          )}

          {activeTab === "faltas" && (
            <CashierShortage
              appState={appState}
              userRole={currentUser.cargo}
              onUpdateShortages={handleUpdateShortages}
              onAddAuditLog={handleAddAuditLog}
            />
          )}

          {activeTab === "lubrificantes" && (
            <LubricantDeliveries
              appState={appState}
              userRole={currentUser.cargo}
              onUpdateLubricants={handleUpdateLubricants}
              onAddAuditLog={handleAddAuditLog}
            />
          )}

          {activeTab === "qualidade" && (
            <ANPQualityControl
              appState={appState}
              userRole={currentUser.cargo}
              cnpjPosto={currentUser.cnpjPosto}
              onUpdateCalibrations={handleUpdateCalibrations}
              onUpdateQualityAudits={handleUpdateQualityAudits}
              onUpdateDeliveries={handleUpdateDeliveries}
              onAddAuditLog={handleAddAuditLog}
            />
          )}

          {activeTab === "lmc" && (
            <LMCManagement
              appState={appState}
              userRole={currentUser.cargo}
              cnpjPosto={currentUser.cnpjPosto}
              onUpdateLmc={handleUpdateLmc}
              onAddAuditLog={handleAddAuditLog}
            />
          )}

          {activeTab === "relatorios" && (
            <ReportsAdvanced appState={appState} />
          )}

          {activeTab === "sincronizacao" && (
            <CloudSyncPanel
              cnpjPosto={currentUser.cnpjPosto}
              currentUser={currentUser}
              appState={appState}
              syncConfig={syncConfig}
              onUpdateConfig={setSyncConfig}
              onRestoreState={handleRestoreState}
              onUpdateCredentials={handleUpdateCredentials}
              onUpdateUsers={handleUpdateUsers}
              onUpdateCurrentUser={handleUpdateCurrentUser}
              onAddAuditLog={handleAddAuditLog}
              onUpdateStationDetails={handleUpdateStationDetails}
            />
          )}

          {activeTab === "pedidos" && (
            <SupplyRequests
              appState={appState}
              userRole={currentUser.cargo}
              currentUser={currentUser}
              onUpdateSupplyRequests={handleUpdateSupplyRequests}
              onAddAuditLog={handleAddAuditLog}
            />
          )}

          {activeTab === "ponto" && (
            <TimesheetManagement
              appState={appState}
              userRole={currentUser.cargo}
              currentUser={currentUser}
              onUpdateTimesheetEntries={handleUpdateTimesheetEntries}
              onAddAuditLog={handleAddAuditLog}
            />
          )}

          {activeTab === "auditoria" && (
            <AuditorLog
              appState={appState}
              cnpjPosto={currentUser.cnpjPosto}
              onUpdateAudits={handleUpdateAudits}
            />
          )}

        </main>
      </div>

      {/* Section 3.E: Floating Action Button (FAB) */}
      <button
        onClick={() => setActiveTab("ponto")}
        className="fixed bottom-20 right-5 sm:bottom-6 sm:right-6 z-40 w-14 h-14 rounded-full bg-[#00B880] hover:bg-[#05C480] text-white shadow-xl shadow-[#00B880]/30 flex items-center justify-center cursor-pointer transition transform hover:scale-105 active:scale-95 border-2 border-white/20 group"
        title="Bater Ponto / Registro Rápido"
      >
        <Heart className="h-6 w-6 text-white group-hover:scale-110 transition-transform fill-white/20" />
      </button>

      {/* Section 3.E: Barra de Navegação Fixa Inferior (Bottom Bar) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#0A192F] border-t border-slate-800/80 px-2 py-2 flex items-center justify-around shadow-2xl lg:hidden">
        {[
          { id: "dashboard", name: "Início", icon: LayoutDashboard },
          { id: "caixa", name: "Bicos", icon: ClipboardList },
          { id: "escalas", name: "Escalas", icon: Calendar },
          { id: "ponto", name: "Ponto", icon: Fingerprint },
          { id: "tanques", name: "Tanques", icon: Fuel },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`transition cursor-pointer ${
                isActive
                  ? "bg-[#00B880]/20 text-[#00B880] px-3 py-1.5 rounded-full flex items-center gap-1.5 font-extrabold text-xs"
                  : "text-slate-400 hover:text-white p-1.5 flex flex-col items-center gap-0.5 text-[10px] font-medium"
              }`}
            >
              <TabIcon className="h-4 w-4 shrink-0" />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* 3.F MODAL COMPARTILHAR LINK DO POSTO */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl">
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">Compartilhar Acesso do Posto</h3>
                  <p className="text-xs text-slate-500 font-medium">Link para funcionários e gerentes</p>
                </div>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Posto Ativo</span>
                <p className="text-sm font-black text-slate-800">{appState.nomePosto || "Meu Posto"}</p>
                <p className="text-xs text-slate-500 font-mono">CNPJ: {currentUser.cnpjPosto}</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Link Direto da Aplicação
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={window.location.href}
                    className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 outline-none select-all"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      setCopiedShareLink(true);
                      setTimeout(() => setCopiedShareLink(false), 2500);
                      handleAddAuditLog("SHARE", "Sistema", "Copiou link de compartilhamento do posto", "Regular");
                    }}
                    className="px-4 py-2 bg-[#00B880] hover:bg-[#05C480] text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {copiedShareLink ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" /> Copiar
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => {
                    const text = `Acesse o sistema do ${appState.nomePosto || "Posto"} (CNPJ: ${currentUser.cnpjPosto}):\n${window.location.href}`;
                    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
                    window.open(whatsappUrl, "_blank");
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Share2 className="h-4 w-4" /> Compartilhar via WhatsApp
                </button>
              </div>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. ONBOARDING WELCOME WIZARD MODAL */}
      {showOnboarding && currentUser && (
        <WelcomeOnboarding
          currentUser={currentUser}
          appState={appState}
          onUpdateStationDetails={handleUpdateStationDetails}
          onAddAuditLog={handleAddAuditLog}
          onClose={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
}
