/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AppState, ShiftSchedule, ShiftName, ShiftChecklist } from "../types";
import { Plus, CheckSquare, ClipboardList, Clock, User, ShieldCheck, Play, HelpCircle, Save } from "lucide-react";

interface ShiftsChecklistsProps {
  appState: AppState;
  userRole: string;
  onUpdateShifts: (shifts: ShiftSchedule[]) => void;
}

export const SHIFT_NAMES: ShiftName[] = [
  "Turno A (Manhã)",
  "Turno B (Tarde)",
  "Turno C (Noite)",
];

export default function ShiftsChecklists({ appState, userRole, onUpdateShifts }: ShiftsChecklistsProps) {
  const { shifts, users } = appState;
  const isFrentista = userRole === "Frentista";

  // Create form state
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [turno, setTurno] = useState<ShiftName>("Turno A (Manhã)");
  const [frentistaResponsavel, setFrentistaResponsavel] = useState("");

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Filter frentistas list
  const frentistasList = users.filter((u) => u.cargo === "Frentista" || u.cargo === "Supervisor");

  const handleCreateShift = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!frentistaResponsavel) {
      setError("Selecione um frentista responsável pelo turno.");
      return;
    }

    // Check if there is already an active shift for safety
    const hasActive = shifts.some((s) => s.status === "Em Andamento");
    if (hasActive) {
      setError("Já existe um turno em andamento. Feche o turno atual antes de agendar ou iniciar um novo.");
      return;
    }

    const newShift: ShiftSchedule = {
      id: "s_" + Date.now(),
      data,
      turno,
      frentistaResponsavel,
      checklist: {
        limpezaPistas: false,
        usoEPIs: false,
        afericaoEquipamentosSeguranca: false,
        testeGerador: false,
      },
      status: "Planejado",
    };

    onUpdateShifts([...shifts, newShift]);
    setSuccess("Turno operacional agendado com sucesso!");
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleStartShift = (shiftId: string) => {
    // Check if there is already an active shift
    const hasActive = shifts.some((s) => s.status === "Em Andamento");
    if (hasActive) {
      setError("Já existe um turno em andamento. Feche o turno ativo antes de iniciar este.");
      return;
    }

    const updated = shifts.map((s) => {
      if (s.id === shiftId) {
        return { ...s, status: "Em Andamento" as const };
      }
      return s;
    });

    onUpdateShifts(updated);
    setSuccess("Turno iniciado! O frentista pode preencher os checklists de pista.");
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleToggleChecklist = (shiftId: string, item: keyof ShiftChecklist) => {
    const updated = shifts.map((s) => {
      if (s.id === shiftId) {
        return {
          ...s,
          checklist: {
            ...s.checklist,
            [item]: !s.checklist[item],
          },
        };
      }
      return s;
    });
    onUpdateShifts(updated);
  };

  const handleCloseShift = (shiftId: string) => {
    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) return;

    // Check if checklists are complete
    const { limpezaPistas, usoEPIs, afericaoEquipamentosSeguranca, testeGerador } = shift.checklist;
    if (!limpezaPistas || !usoEPIs || !afericaoEquipamentosSeguranca || !testeGerador) {
      if (!confirm("O checklist operacional não está totalmente concluído. Deseja fechar o turno mesmo assim?")) {
        return;
      }
    }

    const updated = shifts.map((s) => {
      if (s.id === shiftId) {
        return { ...s, status: "Fechado" as const };
      }
      return s;
    });

    onUpdateShifts(updated);
    setSuccess("Turno operacional finalizado e gravado para auditorias.");
    setTimeout(() => setSuccess(""), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 font-display">
            <ClipboardList className="text-indigo-600 h-6 w-6" />
            Escala de Turnos & Checklist Operacional
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Planeje escalas diárias de trabalho e execute auditorias obrigatórias de pista e gerador
          </p>
        </div>
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm rounded-xl flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          {success}
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-sm rounded-xl flex items-center gap-2">
          <Clock className="h-4 w-4 text-rose-600" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan Shift Form */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit">
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Plus className="text-indigo-600 h-4 w-4" />
            Agendar Próximo Turno
          </h3>

          <form onSubmit={handleCreateShift} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Data de Operação *
              </label>
              <input
                type="date"
                required
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Turno Correspondente *
              </label>
              <select
                value={turno}
                onChange={(e) => setTurno(e.target.value as ShiftName)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {SHIFT_NAMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Frentista de Pista *
              </label>
              <select
                required
                value={frentistaResponsavel}
                onChange={(e) => setFrentistaResponsavel(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">Selecione o Operador</option>
                {frentistasList.length > 0 ? (
                  frentistasList.map((f) => (
                    <option key={f.id} value={f.nomeCompleto}>
                      {f.nomeCompleto} ({f.cargo})
                    </option>
                  ))
                ) : (
                  <option value="Marcos Souza Lima">Marcos Souza Lima (Frentista)</option>
                )}
              </select>
              <span className="text-[10px] text-slate-500 block mt-1">
                Apenas frentistas e supervisores aparecem na listagem
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition shadow-md shadow-indigo-500/10 cursor-pointer"
            >
              Criar Turno Planificado
            </button>
          </form>
        </div>

        {/* Shift Checklist Execution Panel */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-2">Escalas de Turno e Checklists</h3>

          {shifts.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 shadow-sm">
              Nenhuma escala de turno cadastrada ainda.
            </div>
          ) : (
            <div className="space-y-4">
              {shifts.map((shift) => (
                <div
                  key={shift.id}
                  className={`bg-white p-5 rounded-xl border ${
                    shift.status === "Em Andamento"
                      ? "border-indigo-400 ring-1 ring-indigo-50"
                      : shift.status === "Planejado"
                      ? "border-amber-200 bg-amber-50/10"
                      : "border-slate-200"
                  } shadow-sm space-y-4 hover:border-slate-300 transition`}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-500">
                          {new Date(shift.data + "T00:00:00").toLocaleDateString("pt-BR")}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            shift.status === "Em Andamento"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse"
                              : shift.status === "Planejado"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          }`}
                        >
                          {shift.status.toUpperCase()}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-slate-400" />
                        {shift.turno}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                      <User className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-xs text-slate-700 font-semibold">{shift.frentistaResponsavel}</span>
                    </div>
                  </div>

                  {/* Checklist Items if Active or Planejado */}
                  {shift.status === "Em Andamento" && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                          <CheckSquare className="h-4 w-4" /> Checklist do Turno
                        </span>
                        <span className="text-[10px] text-slate-500">Ative os itens conforme vistoria de pista</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          onClick={() => handleToggleChecklist(shift.id, "limpezaPistas")}
                          className={`p-3 rounded-xl border text-left text-xs font-medium flex items-center gap-3 transition cursor-pointer ${
                            shift.checklist.limpezaPistas
                              ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <span className={`h-4 w-4 rounded border flex items-center justify-center font-bold text-[10px] ${
                            shift.checklist.limpezaPistas ? "bg-emerald-600 border-emerald-500 text-white" : "border-slate-300 bg-white"
                          }`}>
                            {shift.checklist.limpezaPistas && "✓"}
                          </span>
                          Verificação de Limpeza de Pista
                        </button>

                        <button
                          onClick={() => handleToggleChecklist(shift.id, "usoEPIs")}
                          className={`p-3 rounded-xl border text-left text-xs font-medium flex items-center gap-3 transition cursor-pointer ${
                            shift.checklist.usoEPIs
                              ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <span className={`h-4 w-4 rounded border flex items-center justify-center font-bold text-[10px] ${
                            shift.checklist.usoEPIs ? "bg-emerald-600 border-emerald-500 text-white" : "border-slate-300 bg-white"
                          }`}>
                            {shift.checklist.usoEPIs && "✓"}
                          </span>
                          Uso Obrigatório de EPIs
                        </button>

                        <button
                          onClick={() => handleToggleChecklist(shift.id, "afericaoEquipamentosSeguranca")}
                          className={`p-3 rounded-xl border text-left text-xs font-medium flex items-center gap-3 transition cursor-pointer ${
                            shift.checklist.afericaoEquipamentosSeguranca
                              ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <span className={`h-4 w-4 rounded border flex items-center justify-center font-bold text-[10px] ${
                            shift.checklist.afericaoEquipamentosSeguranca ? "bg-emerald-600 border-emerald-500 text-white" : "border-slate-300 bg-white"
                          }`}>
                            {shift.checklist.afericaoEquipamentosSeguranca && "✓"}
                          </span>
                          Aferição Equipamentos Segurança
                        </button>

                        <button
                          onClick={() => handleToggleChecklist(shift.id, "testeGerador")}
                          className={`p-3 rounded-xl border text-left text-xs font-medium flex items-center gap-3 transition cursor-pointer ${
                            shift.checklist.testeGerador
                              ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <span className={`h-4 w-4 rounded border flex items-center justify-center font-bold text-[10px] ${
                            shift.checklist.testeGerador ? "bg-emerald-600 border-emerald-500 text-white" : "border-slate-300 bg-white"
                          }`}>
                            {shift.checklist.testeGerador && "✓"}
                          </span>
                          Teste Semanal do Gerador Posto
                        </button>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => handleCloseShift(shift.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition shadow-md cursor-pointer"
                        >
                          Encerrar e Fechar Turno
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Operational checklist completed summary for CLOSED shifts */}
                  {shift.status === "Fechado" && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        Checklist operacional fechado e registrado.
                      </span>
                      <div className="flex gap-2">
                        <span className={shift.checklist.limpezaPistas ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>Pista {shift.checklist.limpezaPistas ? "OK" : "N/OK"}</span>
                        <span>•</span>
                        <span className={shift.checklist.usoEPIs ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>EPI {shift.checklist.usoEPIs ? "OK" : "N/OK"}</span>
                        <span>•</span>
                        <span className={shift.checklist.testeGerador ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>Gerador {shift.checklist.testeGerador ? "OK" : "N/OK"}</span>
                      </div>
                    </div>
                  )}

                  {/* Start turn triggers for Planned turns */}
                  {shift.status === "Planejado" && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleStartShift(shift.id)}
                        className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Play className="h-3 w-3 fill-white" />
                        Iniciar Turno Agora
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
