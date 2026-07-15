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
} from "lucide-react";

const STORAGE_KEY = "meu_posto_app_state";
const CONFIG_KEY = "meu_posto_sync_config";

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

  // 4. UI Layout States
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto-persist AppState to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  }, [appState]);

  // Auto-persist SyncConfig
  useEffect(() => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(syncConfig));
  }, [syncConfig]);

  // Handle Logins
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("meu_posto_logged_user", JSON.stringify(user));
    // Reset to dashboard upon login
    setActiveTab("dashboard");
  };

  // Handle Logouts
  const handleLogout = () => {
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
    <div className="min-h-screen bg-slate-50 flex text-slate-900 font-sans">
      
      {/* 1. SIDEBAR DESKTOP */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 p-5 shrink-0 justify-between">
        <div className="space-y-6">
          {/* Logo Brand */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-white tracking-tight text-lg font-display">Meu Posto</h1>
              <span className="text-[10px] text-indigo-400 font-mono uppercase tracking-widest font-semibold">
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
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition group relative ${
                    activeTab === item.id
                      ? "bg-indigo-600 text-white shadow-md"
                      : isAllowed
                      ? "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                      : "text-slate-600 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconComponent className={`h-5 w-5 ${activeTab === item.id ? "text-white" : "text-slate-400"}`} />
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
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-800/40">
            <div className="h-9 w-9 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center">
              <UserCheck className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">{currentUser.nomeCompleto}</p>
              <span className="text-[10px] bg-slate-700 text-slate-200 border border-slate-600 px-2 py-0.5 rounded-full font-semibold">
                {currentUser.cargo}
              </span>
            </div>
          </div>

          {/* Auto-Sync status line inside desktop sidebar */}
          <div className="flex items-center justify-between text-[11px] px-2 text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className={`relative flex h-2 w-2`}>
                {syncConfig.autoSync ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
                )}
              </span>
              Auto-Sync
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider">{syncConfig.autoSync ? "Ativo" : "Pause"}</span>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-950/20 border border-rose-900/40 hover:bg-rose-900/40 text-rose-300 font-bold text-xs rounded-xl transition"
          >
            <LogOut className="h-4 w-4" />
            Desconectar
          </button>
        </div>
      </aside>

      {/* 2. SIDEBAR MOBILE */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 lg:hidden flex">
          <div className="w-64 bg-slate-900 p-5 flex flex-col justify-between h-full border-r border-slate-800">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-indigo-400" />
                  <span className="font-bold text-white font-display">Meu Posto</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

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
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                        activeTab === item.id
                          ? "bg-indigo-600 text-white"
                          : isAllowed
                          ? "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                          : "text-slate-600 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <IconComponent className="h-5 w-5" />
                        <span>{item.name}</span>
                      </div>
                      {!isAllowed && <Lock className="h-3.5 w-3.5 text-slate-600" />}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="bg-slate-850 p-3 rounded-xl border border-slate-850 text-xs">
                <p className="font-bold text-white truncate">{currentUser.nomeCompleto}</p>
                <span className="text-[10px] text-slate-400 block">{currentUser.cargo}</span>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-950/20 border border-rose-900/50 text-rose-300 font-bold text-xs rounded-xl"
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
        
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div>
              <h2 className="font-semibold text-slate-800 text-base lg:text-lg font-display capitalize">
                {navigationItems.find((n) => n.id === activeTab)?.name}
              </h2>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                CNPJ do Posto Ativo: <span className="font-mono text-slate-700">{currentUser.cnpjPosto}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <span className="text-xs text-slate-500 font-mono">
                {new Date().toLocaleDateString("pt-BR", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>

            <div className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              {currentUser.cargo}
            </div>
          </div>
        </header>

        {/* Scrollable pane */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          
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
              appState={appState}
              syncConfig={syncConfig}
              onUpdateConfig={setSyncConfig}
              onRestoreState={handleRestoreState}
              onUpdateCredentials={handleUpdateCredentials}
              onUpdateUsers={handleUpdateUsers}
              onAddAuditLog={handleAddAuditLog}
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
    </div>
  );
}
