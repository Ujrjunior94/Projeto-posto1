/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AppState, Nozzle, FuelTank } from "../types";
import { Plus, Trash2, Settings, ShieldAlert, CheckCircle, Edit, Save, X, Activity } from "lucide-react";

interface NozzlesManagementProps {
  appState: AppState;
  userRole: string;
  onUpdateNozzles: (nozzles: Nozzle[]) => void;
}

export default function NozzlesManagement({ appState, userRole, onUpdateNozzles }: NozzlesManagementProps) {
  const { nozzles, tanks } = appState;
  const isReadOnly = userRole === "Frentista";

  // Create nozzle form state
  const [numeroBico, setNumeroBico] = useState("");
  const [bombaAssociada, setBombaAssociada] = useState("");
  const [tanqueId, setTanqueId] = useState(tanks[0]?.id || "");
  const [encerranteInicial, setEncerranteInicial] = useState(100000);
  const [precoPorLitro, setPrecoPorLitro] = useState(5.89);

  // Edit price state
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState<number>(0);

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleCreateNozzle = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (isReadOnly) {
      setError("Permissão negada para cadastrar novos bicos de combustível.");
      return;
    }

    if (!numeroBico || !bombaAssociada || !tanqueId) {
      setError("Todos os campos marcados com * são obrigatórios.");
      return;
    }

    const newNozzle: Nozzle = {
      id: "b_" + Date.now(),
      numeroBico,
      bombaAssociada,
      tanqueId,
      encerranteInicial: Number(encerranteInicial),
      precoPorLitro: Number(precoPorLitro),
    };

    onUpdateNozzles([...nozzles, newNozzle]);
    setNumeroBico("");
    setSuccess("Bico de combustível cadastrado com sucesso!");
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleDeleteNozzle = (id: string) => {
    if (isReadOnly) return;
    if (confirm("Tem certeza que deseja remover este bico de combustível?")) {
      const filtered = nozzles.filter((n) => n.id !== id);
      onUpdateNozzles(filtered);
      setSuccess("Bico de combustível removido!");
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  const startEditPrice = (nozzle: Nozzle) => {
    setEditingPriceId(nozzle.id);
    setNewPrice(nozzle.precoPorLitro);
  };

  const savePrice = (nozzleId: string) => {
    const updated = nozzles.map((n) => {
      if (n.id === nozzleId) {
        return { ...n, precoPorLitro: Number(newPrice) };
      }
      return n;
    });
    onUpdateNozzles(updated);
    setEditingPriceId(null);
    setSuccess("Preço de combustível atualizado com sucesso!");
    setTimeout(() => setSuccess(""), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 font-display">
            <Activity className="text-indigo-600 h-6 w-6" />
            Gerenciamento de Bicos e Bombas
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Cadastro de bicos, associação a tanques alimentadores e hodômetros mecânicos (encerrantes iniciais)
          </p>
        </div>
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm rounded-xl flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
          {success}
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-sm rounded-xl flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Form */}
        {!isReadOnly ? (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Plus className="text-indigo-600 h-4 w-4" />
              Cadastrar Novo Bico
            </h3>

            <form onSubmit={handleCreateNozzle} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Número / Identificação do Bico *
                </label>
                <input
                  type="text"
                  required
                  value={numeroBico}
                  onChange={(e) => setNumeroBico(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Ex: Bico 05 - GA"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Bomba Associada *
                </label>
                <input
                  type="text"
                  required
                  value={bombaAssociada}
                  onChange={(e) => setBombaAssociada(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Ex: Bomba Principal C"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Tanque Alimentador *
                </label>
                <select
                  value={tanqueId}
                  onChange={(e) => setTanqueId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="" disabled>Selecione um tanque</option>
                  {tanks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.identificador} ({t.combustivel})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Encerrante Inicial (L)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={encerranteInicial}
                    onChange={(e) => setEncerranteInicial(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Preço por Litro (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={precoPorLitro}
                    onChange={(e) => setPrecoPorLitro(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition shadow-md shadow-indigo-500/10 cursor-pointer"
              >
                Cadastrar Bico
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit text-center">
            <ShieldAlert className="h-8 w-8 text-amber-500 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-2">Workspace Frentista</h3>
            <p className="text-xs text-slate-500">
              Visualização de bicos, bombas e preços ativos. Alterações estruturais em hodômetros e bombas são bloqueados para o cargo de frentista.
            </p>
          </div>
        )}

        {/* List Grid */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-2">Mapeamento de Bicos e Bombas ({nozzles.length})</h3>

          {nozzles.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 shadow-sm">
              Nenhum bico de bomba cadastrado no sistema ainda.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase border-b border-slate-200">
                      <th className="p-4">Bico</th>
                      <th className="p-4">Bomba</th>
                      <th className="p-4">Tanque / Combustível</th>
                      <th className="p-4">Encerrante Inicial</th>
                      <th className="p-4">Preço (L)</th>
                      {!isReadOnly && <th className="p-4 text-center">Ações</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {nozzles.map((nozzle, idx) => {
                      const associatedTank = tanks.find((t) => t.id === nozzle.tanqueId);

                      return (
                        <tr key={nozzle.id} className="hover:bg-slate-50/50 transition">
                          <td className="p-4 font-bold text-slate-800">{nozzle.numeroBico}</td>
                          <td className="p-4 text-slate-600">{nozzle.bombaAssociada}</td>
                          <td className="p-4">
                            <span className="block font-semibold text-slate-800">
                              {associatedTank ? associatedTank.combustivel : "Sem Tanque"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {associatedTank ? associatedTank.identificador : "N/A"}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-slate-600">{nozzle.encerranteInicial.toLocaleString()} L</td>
                          <td className="p-4 font-semibold text-slate-800">
                            {editingPriceId === nozzle.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={newPrice}
                                  onChange={(e) => setNewPrice(Number(e.target.value))}
                                  className="w-16 px-1 py-0.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <button
                                  onClick={() => savePrice(nozzle.id)}
                                  className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-500 cursor-pointer"
                                >
                                  <Save className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => setEditingPriceId(null)}
                                  className="p-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 cursor-pointer"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span>R$ {nozzle.precoPorLitro.toFixed(2)}</span>
                                {!isReadOnly && (
                                  <button
                                    onClick={() => startEditPrice(nozzle)}
                                    className="p-1 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                                    title="Alterar preço"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          {!isReadOnly && (
                            <td className="p-4 text-center">
                              <button
                                onClick={() => handleDeleteNozzle(nozzle.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition inline-flex cursor-pointer"
                                title="Excluir bico"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
