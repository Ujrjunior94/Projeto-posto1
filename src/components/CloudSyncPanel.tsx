/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AppState, SyncConfig } from "../types";
import { Cloud, CloudLightning, RefreshCw, Upload, Download, CheckCircle, AlertTriangle } from "lucide-react";

interface CloudSyncPanelProps {
  cnpjPosto: string;
  appState: AppState;
  syncConfig: SyncConfig;
  onUpdateConfig: (config: SyncConfig) => void;
  onRestoreState: (restoredState: AppState) => void;
}

export default function CloudSyncPanel({
  cnpjPosto,
  appState,
  syncConfig,
  onUpdateConfig,
  onRestoreState,
}: CloudSyncPanelProps) {
  const [apiUrl, setApiUrl] = useState(syncConfig.apiUrl || window.location.origin);
  const [token, setToken] = useState(syncConfig.token || "");
  const [autoSync, setAutoSync] = useState(syncConfig.autoSync);
  
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" | "info" | null }>({
    text: "",
    type: null,
  });

  // Track state changes to auto-sync if active
  useEffect(() => {
    if (autoSync) {
      const delayDebounceFn = setTimeout(() => {
        handleSendBackup(true); // silent auto sync
      }, 3000); // Debounce interval to avoid excessive request volume

      return () => clearTimeout(delayDebounceFn);
    }
  }, [appState, autoSync]);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      apiUrl,
      token,
      autoSync,
    });
    setStatusMessage({
      text: "Configuração de sincronização salva com sucesso!",
      type: "success",
    });
    setTimeout(() => setStatusMessage({ text: "", type: null }), 3000);
  };

  const handleSendBackup = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setStatusMessage({ text: "", type: null });

    try {
      const cleanCnpj = cnpjPosto.replace(/\D/g, "");
      const response = await fetch(`${apiUrl}/api/backup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          cnpj: cleanCnpj,
          data: appState,
          updated_at: new Date().toISOString(),
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || "Falha ao enviar backup para o servidor.");
      }

      if (!isSilent) {
        setStatusMessage({
          text: `Backup enviado com sucesso! Atualizado em: ${new Date(resData.updated_at).toLocaleString()}`,
          type: "success",
        });
      }
    } catch (err: any) {
      console.error("Sync backup error:", err);
      if (!isSilent) {
        setStatusMessage({
          text: `Erro de Sincronização: ${err.message}. Certifique-se de que o backend local está de pé.`,
          type: "error",
        });
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleRestoreBackup = async () => {
    setLoading(true);
    setStatusMessage({ text: "", type: null });

    try {
      const cleanCnpj = cnpjPosto.replace(/\D/g, "");
      const response = await fetch(`${apiUrl}/api/backup?cnpj=${cleanCnpj}`, {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || "Nenhum backup encontrado ou erro no servidor.");
      }

      if (resData && resData.data) {
        onRestoreState(resData.data);
        setStatusMessage({
          text: `Backup restaurado com sucesso! Sincronizado do estado de: ${new Date(resData.updated_at).toLocaleString()}`,
          type: "success",
        });
      } else {
        throw new Error("Formato de backup inválido.");
      }
    } catch (err: any) {
      console.error("Restore backup error:", err);
      setStatusMessage({
        text: `Erro ao restaurar: ${err.message}`,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoSync = () => {
    const newValue = !autoSync;
    setAutoSync(newValue);
    onUpdateConfig({
      apiUrl,
      token,
      autoSync: newValue,
    });
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-200 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 font-display">
            <Cloud className="text-indigo-600 h-6 w-6" />
            Nuvem & Sincronização (Auto-Sync)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Persistência primária local offline-first com espelhamento e backup em nuvem por CNPJ
          </p>
        </div>

        {/* Auto-Sync Toggle Switch with Pulsing Status Indicator */}
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              {autoSync ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_10px_#10b981]"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-400"></span>
              )}
            </span>
            <span className="text-xs font-semibold text-slate-700">
              {autoSync ? "Auto-Sync Ativo" : "Auto-Sync Inativo"}
            </span>
          </div>

          <button
            onClick={handleToggleAutoSync}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              autoSync ? "bg-emerald-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                autoSync ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {statusMessage.text && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 border ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : statusMessage.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-blue-50 border-blue-200 text-blue-850"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
          )}
          <div className="text-sm">{statusMessage.text}</div>
        </div>
      )}

      <form onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            URL da API do Servidor
          </label>
          <input
            type="text"
            required
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            placeholder="http://localhost:3000"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Insira o endereço IP ou URL correspondente do servidor Node.js
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Token de Autorização Bearer (Opcional)
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            placeholder="Insira o Token de segurança"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Chave opcional para segurança e autorização na nuvem
          </p>
        </div>

        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg transition shadow-sm cursor-pointer flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Salvar Parâmetros
          </button>
        </div>
      </form>

      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
        <h3 className="text-sm font-semibold text-slate-800">Ações de Sincronização Manual (CNPJ: {cnpjPosto})</h3>
        <p className="text-xs text-slate-500">
          Você pode fazer o upload manual do estado atual de transações, estoques, checklist e usuários, ou baixar o último backup para este CNPJ se estiver em outro navegador.
        </p>

        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => handleSendBackup(false)}
            disabled={loading}
            className="flex-1 min-w-[200px] py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Enviar Backup para Nuvem (POST)
          </button>

          <button
            onClick={handleRestoreBackup}
            disabled={loading}
            className="flex-1 min-w-[200px] py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Restaurar Backup da Nuvem (GET)
          </button>
        </div>
      </div>
    </div>
  );
}
