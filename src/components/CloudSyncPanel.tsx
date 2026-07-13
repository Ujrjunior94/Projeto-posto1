/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AppState, SyncConfig, SystemCredential, User } from "../types";
import {
  Cloud,
  Lock,
  Unlock,
  Key,
  Database,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Edit,
  Save,
  Download,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Building,
} from "lucide-react";

interface CloudSyncPanelProps {
  cnpjPosto: string;
  appState: AppState;
  syncConfig: SyncConfig;
  onUpdateConfig: (config: SyncConfig) => void;
  onRestoreState: (state: AppState) => void;
  onUpdateCredentials: (credentials: SystemCredential[]) => void;
  onUpdateUsers: (users: User[]) => void;
  onAddAuditLog: (actionType: string, target: string, details: string, status: string) => void;
}

export default function CloudSyncPanel({
  cnpjPosto,
  appState,
  syncConfig,
  onUpdateConfig,
  onRestoreState,
  onUpdateCredentials,
  onUpdateUsers,
  onAddAuditLog,
}: CloudSyncPanelProps) {
  const { systemCredentials = [], users = [] } = appState;

  // Locks screen password (padrão: adm001)
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [lockPassword, setLockPassword] = useState("");
  const [lockError, setLockError] = useState(false);

  // Supabase/Sync settings (using syncConfig)
  const [apiUrl, setApiUrl] = useState(syncConfig.apiUrl);
  const [token, setToken] = useState(syncConfig.token);
  const [autoSync, setAutoSync] = useState(syncConfig.autoSync);

  // Status indicators
  const [syncStatus, setSyncStatus] = useState<{ type: "success" | "error" | "info" | null; message: string }>({
    type: null,
    message: "",
  });

  // Modal forms
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isCredModalOpen, setIsCredModalOpen] = useState(false);
  const [isViewerModalOpen, setIsViewerModalOpen] = useState(false);

  // Bank form values
  const currentUserObj = users.find((u) => u.cnpjPosto === cnpjPosto && u.cargo === "Gerente") || users[0];
  const [bankName, setBankName] = useState("Banco do Brasil");
  const [bankAgency, setBankAgency] = useState("1234-5");
  const [bankAccount, setBankAccount] = useState("98765-4");
  const [bankPixKey, setBankPixKey] = useState(cnpjPosto);

  // Credential Form Values
  const [credName, setCredName] = useState("");
  const [credCategory, setCredCategory] = useState("Operacional");
  const [credLogin, setCredLogin] = useState("");
  const [credPass, setCredPass] = useState("");
  const [credDesc, setCredDesc] = useState("");

  // Viewer Form Values
  const [vName, setVName] = useState("");
  const [vEmail, setVEmail] = useState("");
  const [vPass, setVPass] = useState("");

  const [visiblePasswords, setVisiblePasswords] = useState<{ [key: string]: boolean }>({});

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setLockError(false);
    if (lockPassword === "adm001") {
      setIsUnlocked(true);
      setLockPassword("");
    } else {
      setLockError(true);
    }
  };

  const handleTogglePassword = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveSyncConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      apiUrl,
      token,
      autoSync,
    });
    setSyncStatus({ type: "success", message: "Configurações de sincronização local salvas!" });
    setTimeout(() => setSyncStatus({ type: null, message: "" }), 3000);
  };

  const handleBackupDownload = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 4));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      const dateStr = new Date().toISOString().split("T")[0];
      downloadAnchor.setAttribute("download", `backup_posto_${cnpjPosto.replace(/[\.\/-]/g, "")}_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      onAddAuditLog("DOWNLOAD", "Segurança", "Baixou arquivo local de backup JSON do sistema", "Regular");
      setSyncStatus({ type: "success", message: "Cópia local de segurança JSON exportada!" });
      setTimeout(() => setSyncStatus({ type: null, message: "" }), 3000);
    } catch (e: any) {
      setSyncStatus({ type: "error", message: "Erro ao gerar arquivo de backup: " + e.message });
    }
  };

  // Upload/Download emulation with Local / Supabase simulation
  const handleUploadCloud = () => {
    setSyncStatus({ type: "info", message: "Sincronizando faturamento e escalas com Supabase Cloud..." });
    setTimeout(() => {
      onAddAuditLog("UPLOAD", "Segurança", "Enviou e mesclou dados locais de faturamento com Supabase", "Regular");
      setSyncStatus({ type: "success", message: "Dados do posto mesclados com sucesso no Supabase Cloud!" });
      setTimeout(() => setSyncStatus({ type: null, message: "" }), 4000);
    }, 1500);
  };

  const handleDownloadCloud = () => {
    setSyncStatus({ type: "info", message: "Buscando tabelas de backup no Supabase..." });
    setTimeout(() => {
      onRestoreState(appState); // emulates restore with latest
      setSyncStatus({ type: "success", message: "Banco de dados local atualizado com o Supabase!" });
      setTimeout(() => setSyncStatus({ type: null, message: "" }), 4000);
    }, 1500);
  };

  // Credential operations
  const handleSaveCredential = (e: React.FormEvent) => {
    e.preventDefault();
    if (!credName.trim() || !credLogin.trim() || !credPass.trim()) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    const newCred: SystemCredential = {
      id: "cred_" + Date.now(),
      systemName: credName,
      category: credCategory,
      login: credLogin,
      password: credPass,
      description: credDesc,
      stationCnpj: cnpjPosto,
    };

    onUpdateCredentials([...systemCredentials, newCred]);
    onAddAuditLog("CREATE", "Segurança", `Adicionou nova credencial de TI para: "${credName}"`, "Regular");

    setIsCredModalOpen(false);
    setCredName("");
    setCredLogin("");
    setCredPass("");
    setCredDesc("");
  };

  const handleDeleteCredential = (id: string) => {
    if (confirm("Remover esta credencial de acesso?")) {
      const filtered = systemCredentials.filter((c) => c.id !== id);
      onUpdateCredentials(filtered);
      onAddAuditLog("DELETE", "Segurança", `Excluiu credencial de sistema ID ${id}`, "Regular");
    }
  };

  // Viewer accounts operations
  const handleSaveViewer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vName.trim() || !vEmail.trim() || !vPass.trim()) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    const isDuplicate = users.some((u) => u.email.toLowerCase() === vEmail.toLowerCase());
    if (isDuplicate) {
      alert("Esta conta de e-mail já existe.");
      return;
    }

    const newViewer: User = {
      id: "u_view_" + Date.now(),
      nomeCompleto: vName,
      email: vEmail,
      senhaCriptografada: vPass,
      cpf: "000.000.000-00",
      cargo: "Frentista", // acts as read-only or limited
      cnpjPosto,
      telefone: "(11) 99999-9999",
    };

    onUpdateUsers([...users, newViewer]);
    onAddAuditLog("CREATE", "Segurança", `Adicionou nova conta de visualizador: ${vName}`, "Regular");

    setIsViewerModalOpen(false);
    setVName("");
    setVEmail("");
    setVPass("");
  };

  const handleDeleteViewer = (id: string) => {
    if (confirm("Remover o acesso deste visualizador?")) {
      const filtered = users.filter((u) => u.id !== id);
      onUpdateUsers(filtered);
      onAddAuditLog("DELETE", "Segurança", `Acesso de visualizador ID ${id} revogado`, "Regular");
    }
  };

  // Filtered operational values
  const filteredCredentials = systemCredentials.filter((c) => c.stationCnpj === cnpjPosto);
  const viewerUsers = users.filter((u) => u.cnpjPosto === cnpjPosto && u.cpf === "000.000.000-00");

  if (!isUnlocked) {
    return (
      <div className="max-w-md w-full mx-auto my-12 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-center">
        <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 border border-indigo-100">
          <Lock className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2 font-display">Área Restrita do Gerente</h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          Para visualizar credenciais de sistemas do posto, dados de faturamento PJ e configurar backups Supabase Cloud, digite a senha administrativa.
        </p>

        <form onSubmit={handleUnlock} className="space-y-4">
          <div>
            <input
              type="password"
              placeholder="Digite a senha (padrão: adm001)"
              value={lockPassword}
              onChange={(e) => setLockPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center font-semibold"
            />
            {lockError && (
              <p className="text-[10px] text-rose-600 font-bold mt-1.5 flex items-center justify-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Senha administrativa incorreta! Tente adm001.
              </p>
            )}
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition flex items-center justify-center space-x-2 text-xs shadow-sm cursor-pointer"
          >
            <Unlock className="h-4 w-4" />
            <span>Desbloquear Área de Sistemas</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Unlocked */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 font-display">
            <Unlock className="text-indigo-600 h-6 w-6" />
            Sistemas, Finanças e Segurança
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure faturamento bancário PJ, credenciais de concentradores / SEFAZ, visualizadores de escala e backups em nuvem
          </p>
        </div>
        <button
          onClick={() => setIsUnlocked(false)}
          className="px-4 py-2 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
        >
          <Lock className="h-3.5 w-3.5" />
          Bloquear Acesso
        </button>
      </div>

      {syncStatus.message && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            syncStatus.type === "success"
              ? "bg-emerald-50 border-emerald-100 text-emerald-800"
              : syncStatus.type === "error"
              ? "bg-rose-50 border-rose-100 text-rose-800"
              : "bg-blue-50 border-blue-100 text-blue-800"
          }`}
        >
          {syncStatus.type === "success" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-indigo-600" />}
          {syncStatus.message}
        </div>
      )}

      {/* Main Grid: Bank and Credentials */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Bank info card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Building className="h-4 w-4 text-indigo-600" />
              Dados PJ & Conta Corrente
            </h3>
            <p className="text-[11px] text-slate-500">
              Informações oficiais do posto para emissão de notas fiscais SEFAZ e faturamento comercial.
            </p>

            <div className="space-y-3 font-medium text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Instituição</p>
                <p className="text-slate-800 font-bold">{bankName}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Agência</p>
                  <p className="text-slate-800 font-bold">{bankAgency}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Conta Corrente</p>
                  <p className="text-slate-800 font-bold">{bankAccount}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Chave PIX Recebimento (PJ)</p>
                <p className="text-slate-800 font-bold truncate">{bankPixKey}</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsBankModalOpen(true)}
            className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1.5 border border-indigo-100 mt-4 cursor-pointer"
          >
            <Edit className="h-3.5 w-3.5" />
            Editar Conta PJ
          </button>
        </div>

        {/* Column 2 & 3: Credentials manager */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Key className="h-4 w-4 text-indigo-600" />
              Credenciais de Acesso a Sistemas de TI
            </h3>
            <button
              onClick={() => setIsCredModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Nova Credencial
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-[10px] text-slate-400 uppercase font-bold border-b border-slate-100 bg-slate-50/50">
                  <th className="py-2.5 px-3">Serviço / IP</th>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3">Usuário</th>
                  <th className="py-2.5 px-3">Senha</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredCredentials.length === 0 ? (
                  <tr>
                    <td colspan="5" className="py-8 text-center text-slate-500 italic">No credentials recorded.</td>
                  </tr>
                ) : (
                  filteredCredentials.map((cred) => {
                    const isVisible = visiblePasswords[cred.id];
                    return (
                      <tr key={cred.id} className="border-b border-slate-100/60 hover:bg-slate-50/40">
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-800">{cred.systemName}</p>
                          <p className="text-[9.5px] text-slate-500 mt-0.5">{cred.description}</p>
                        </td>
                        <td className="py-3 px-3">
                          <span className="bg-slate-100 border border-slate-200/50 px-2 py-0.5 rounded font-semibold text-slate-600 text-[10px]">
                            {cred.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-medium">{cred.login}</td>
                        <td className="py-3 px-3 font-mono font-medium text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <span>{isVisible ? cred.password : "••••••••"}</span>
                            <button
                              onClick={() => handleTogglePassword(cred.id)}
                              className="text-slate-400 hover:text-indigo-600 transition"
                            >
                              {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleDeleteCredential(cred.id)}
                            className="text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Authorized Read-only Viewers */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Unlock className="h-4 w-4 text-indigo-600" />
            Visualizadores Autorizados do Posto
          </h3>
          <button
            onClick={() => setIsViewerModalOpen(true)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar Visualizador
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-[10px] text-slate-400 uppercase font-bold border-b border-slate-100 bg-slate-50/50">
                <th className="py-2.5 px-3">Nome</th>
                <th className="py-2.5 px-3">Login / E-mail</th>
                <th className="py-2.5 px-3">Senha de Acesso</th>
                <th className="py-2.5 px-3">Nível Permissão</th>
                <th className="py-2.5 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {viewerUsers.length === 0 ? (
                <tr>
                  <td colspan="5" className="py-8 text-center text-slate-500 italic">Nenhum visualizador cadastrado ainda.</td>
                </tr>
              ) : (
                viewerUsers.map((v) => (
                  <tr key={v.id} className="border-b border-slate-100/60 hover:bg-slate-50/40">
                    <td className="py-3 px-3 font-semibold text-slate-800">{v.nomeCompleto}</td>
                    <td className="py-3 px-3 font-mono font-medium text-slate-600">{v.email}</td>
                    <td className="py-3 px-3 font-mono font-medium">••••••••</td>
                    <td className="py-3 px-3">
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full font-bold px-2 py-0.5 text-[9px] uppercase">
                        Visualizador (Read-only)
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDeleteViewer(v.id)}
                        className="text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
                      >
                        Revogar Acesso
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cloud Sync & Supabase Backup */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Supabase Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Cloud className="h-4 w-4 text-emerald-600" />
            Sincronização Nuvem Supabase ☁️
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Configure credenciais ou endpoints para o sincronizador automático cloud para permitir backup instantâneo de transações, checklists e LMC do posto.
          </p>

          <form onSubmit={handleSaveSyncConfig} className="space-y-4 pt-2">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                URL da API do Servidor (Backup Host)
              </label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-700 font-semibold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                Token de Autorização API (Supabase / Anon Key)
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-700"
              />
            </div>

            <div className="flex justify-between items-center border-t border-slate-100 pt-3 flex-wrap gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Salvar Parâmetros
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleUploadCloud}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Enviar Nuvem
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCloud}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Sincronizar Dados
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Local offline backup card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Database className="h-4 w-4 text-indigo-600" />
              Backup Local (Offline JSON)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Exporte toda a base de dados do posto (tanques, escalas de frentistas, LMC, checklists, bicos, faturamento e auditoria) em um único arquivo JSON seguro.
            </p>
            <p className="text-[11px] text-slate-400">
              💡 Recomendado realizar o download do backup antes de limpezas de cache de navegadores ou manutenções locais de TI.
            </p>
          </div>

          <button
            onClick={handleBackupDownload}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition mt-6 text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Baixar Backup Completo (.json)</span>
          </button>
        </div>
      </div>

      {/* Edit Bank Modal */}
      {isBankModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative animate-in fade-in duration-100">
            <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-indigo-600" />
              Editar Dados Bancários PJ
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setIsBankModalOpen(false);
                onAddAuditLog("UPDATE", "Finanças", "Alterou dados de conta PJ corporativa no ERP", "Regular");
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome do Banco</label>
                <input
                  type="text"
                  required
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Agência</label>
                  <input
                    type="text"
                    required
                    value={bankAgency}
                    onChange={(e) => setBankAgency(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Conta Corrente</label>
                  <input
                    type="text"
                    required
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Chave PIX PJ</label>
                <input
                  type="text"
                  required
                  value={bankPixKey}
                  onChange={(e) => setBankPixKey(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(false)}
                  className="px-4 py-2 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credential Modal */}
      {isCredModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative animate-in fade-in duration-100">
            <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-1">
              <Key className="h-4 w-4 text-indigo-600" />
              Nova Credencial de Sistema
            </h3>

            <form onSubmit={handleSaveCredential} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome do Sistema</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: SEFAZ NFE"
                    value={credName}
                    onChange={(e) => setCredName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Categoria</label>
                  <select
                    value={credCategory}
                    onChange={(e) => setCredCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-700 cursor-pointer"
                  >
                    <option value="Operacional">Operacional</option>
                    <option value="Fiscal">Fiscal</option>
                    <option value="Equipamentos">Equipamentos</option>
                    <option value="Segurança">Segurança</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Login / ID</label>
                  <input
                    type="text"
                    required
                    value={credLogin}
                    onChange={(e) => setCredLogin(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Senha</label>
                  <input
                    type="text"
                    required
                    value={credPass}
                    onChange={(e) => setCredPass(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">IP local / Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: IP 192.168.1.100 ou link de acesso"
                  value={credDesc}
                  onChange={(e) => setCredDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCredModalOpen(false)}
                  className="px-4 py-2 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Criar Credencial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Viewer Modal */}
      {isViewerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative animate-in fade-in duration-100">
            <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-1">
              <Plus className="h-4 w-4 text-emerald-600" />
              Adicionar Visualizador Secundário
            </h3>

            <form onSubmit={handleSaveViewer} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Marcos Souza (Supervisor)"
                  value={vName}
                  onChange={(e) => setVName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Login E-mail</label>
                <input
                  type="email"
                  required
                  placeholder="Ex: marcos@posto.com"
                  value={vEmail}
                  onChange={(e) => setVEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Senha de Acesso</label>
                <input
                  type="password"
                  required
                  value={vPass}
                  onChange={(e) => setVPass(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsViewerModalOpen(false)}
                  className="px-4 py-2 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Conceder Acesso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
