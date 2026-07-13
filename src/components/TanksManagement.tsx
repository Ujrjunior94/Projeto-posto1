/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AppState, FuelTank, FuelType } from "../types";
import { Plus, Trash2, Fuel, ShieldAlert, CheckCircle, Edit, Save, X } from "lucide-react";

interface TanksManagementProps {
  appState: AppState;
  userRole: string;
  onUpdateTanks: (tanks: FuelTank[]) => void;
}

export const FUEL_TYPES: FuelType[] = [
  "Gasolina Comum",
  "Gasolina Aditivada",
  "Etanol",
  "Diesel S10",
  "Diesel S500",
];

export default function TanksManagement({ appState, userRole, onUpdateTanks }: TanksManagementProps) {
  const { tanks } = appState;
  const isReadOnly = userRole === "Frentista";

  // Create form state
  const [identificador, setIdentificador] = useState("");
  const [combustivel, setCombustivel] = useState<FuelType>("Gasolina Comum");
  const [capacidadeMaxima, setCapacidadeMaxima] = useState(15000);
  const [volumeAtual, setVolumeAtual] = useState(8000);
  const [pontoCriticoAlerta, setPontoCriticoAlerta] = useState(2500);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVolume, setEditVolume] = useState<number>(0);

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleCreateTank = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (isReadOnly) {
      setError("Apenas cargos Master, Gerente ou Supervisor podem cadastrar tanques.");
      return;
    }

    if (!identificador) {
      setError("O identificador do tanque é obrigatório.");
      return;
    }

    if (volumeAtual > capacidadeMaxima) {
      setError("O volume atual não pode exceder a capacidade máxima do tanque.");
      return;
    }

    const newTank: FuelTank = {
      id: "t_" + Date.now(),
      identificador,
      combustivel,
      capacidadeMaxima: Number(capacidadeMaxima),
      volumeAtual: Number(volumeAtual),
      pontoCriticoAlerta: Number(pontoCriticoAlerta),
    };

    onUpdateTanks([...tanks, newTank]);
    setIdentificador("");
    setSuccess("Tanque cadastrado com sucesso!");
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleDeleteTank = (id: string) => {
    if (isReadOnly) return;
    if (confirm("Deseja realmente remover este tanque de combustível do sistema?")) {
      const filtered = tanks.filter((t) => t.id !== id);
      onUpdateTanks(filtered);
      setSuccess("Tanque removido com sucesso!");
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  const startQuickUpdate = (tank: FuelTank) => {
    setEditingId(tank.id);
    setEditVolume(tank.volumeAtual);
  };

  const saveQuickUpdate = (tankId: string, maxCap: number) => {
    if (editVolume > maxCap) {
      setError("O volume atualizado não pode ser maior que a capacidade máxima do tanque.");
      return;
    }
    const updated = tanks.map((t) => {
      if (t.id === tankId) {
        return { ...t, volumeAtual: Number(editVolume) };
      }
      return t;
    });
    onUpdateTanks(updated);
    setEditingId(null);
    setSuccess("Volume de combustível atualizado!");
    setTimeout(() => setSuccess(""), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 font-display">
            <Fuel className="text-indigo-600 h-6 w-6" />
            Controle de Estoque e Tanques
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gestão dos tanques de armazenamento, controle de litragem e níveis de segurança crítica
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
        {/* Register Tank form (Only for Master/Gerente/Supervisor) */}
        {!isReadOnly ? (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Plus className="text-indigo-600 h-4 w-4" />
              Cadastrar Novo Tanque
            </h3>

            <form onSubmit={handleCreateTank} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Identificador do Tanque *
                </label>
                <input
                  type="text"
                  required
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Ex: Tanque 06 - GC"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Combustível Armazenado *
                </label>
                <select
                  value={combustivel}
                  onChange={(e) => setCombustivel(e.target.value as FuelType)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {FUEL_TYPES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Capacidade (L)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={capacidadeMaxima}
                    onChange={(e) => setCapacidadeMaxima(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Volume Inicial (L)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={volumeAtual}
                    onChange={(e) => setVolumeAtual(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Ponto Crítico de Alerta (L)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={pontoCriticoAlerta}
                  onChange={(e) => setPontoCriticoAlerta(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  Ativa alerta vermelho se o combustível cair abaixo dessa litragem
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition shadow-md shadow-indigo-500/10 cursor-pointer"
              >
                Cadastrar Tanque
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit text-center">
            <ShieldAlert className="h-8 w-8 text-amber-500 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-2">Workspace Frentista</h3>
            <p className="text-xs text-slate-500">
              Operadores frentistas possuem acesso de visualização aos tanques para verificar os níveis de abastecimento, mas não podem alterar capacidades ou criar tanques estruturais.
            </p>
          </div>
        )}

        {/* Existing Tanks Grid */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-2">Tanques Cadastrados ({tanks.length})</h3>

          {tanks.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 shadow-sm">
              Nenhum tanque cadastrado no sistema ainda.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tanks.map((tank) => {
                const isCritical = tank.volumeAtual <= tank.pontoCriticoAlerta;
                const pct = Math.min(100, Math.max(0, (tank.volumeAtual / tank.capacidadeMaxima) * 100));

                return (
                  <div
                    key={tank.id}
                    className={`bg-white p-5 rounded-xl border ${
                      isCritical ? "border-rose-300 ring-1 ring-rose-50" : "border-slate-200"
                    } shadow-sm space-y-4 relative flex flex-col justify-between hover:border-slate-300 transition`}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                            {tank.identificador}
                          </span>
                          <h4 className="text-sm font-bold text-slate-800 mt-2">{tank.combustivel}</h4>
                        </div>
                        {!isReadOnly && (
                          <button
                            onClick={() => handleDeleteTank(tank.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                            title="Remover tanque"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* Level progress bar */}
                      <div className="mt-4 space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Volume Atual:</span>
                          <span className={`font-mono font-semibold ${isCritical ? "text-rose-600" : "text-slate-700"}`}>
                            {tank.volumeAtual.toLocaleString()} L ({Math.round(pct)}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isCritical ? "bg-rose-500" : pct < 40 ? "bg-amber-500" : "bg-indigo-600"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                          <span>0 L</span>
                          <span>Alerta crítico: {tank.pontoCriticoAlerta.toLocaleString()} L</span>
                          <span>Max: {tank.capacidadeMaxima.toLocaleString()} L</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick volume update action */}
                    <div className="pt-3 border-t border-slate-100 mt-2">
                      {editingId === tank.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={editVolume}
                            onChange={(e) => setEditVolume(Number(e.target.value))}
                            className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-850 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="Litragem"
                          />
                          <button
                            onClick={() => saveQuickUpdate(tank.id, tank.capacidadeMaxima)}
                            className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition cursor-pointer"
                            title="Salvar"
                          >
                            <Save className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition cursor-pointer"
                            title="Cancelar"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          {isCritical ? (
                            <span className="text-[10px] font-semibold text-rose-600 animate-pulse flex items-center gap-1">
                              <ShieldAlert className="h-3 w-3" /> NÍVEL CRÍTICO
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> NÍVEL SEGURO
                            </span>
                          )}
                          <button
                            onClick={() => startQuickUpdate(tank)}
                            className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Edit className="h-3 w-3" /> Ajustar Litros
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
