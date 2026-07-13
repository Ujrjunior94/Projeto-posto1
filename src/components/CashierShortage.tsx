/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AppState, ShiftShortage, ShiftSchedule, User } from "../types";
import { 
  DollarSign, 
  Users, 
  Calendar, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Calculator,
  ArrowRight
} from "lucide-react";

interface CashierShortageProps {
  appState: AppState;
  userRole: string;
  onUpdateShortages: (shortages: ShiftShortage[]) => void;
  onAddAuditLog: (actionType: string, target: string, details: string, status: string) => void;
}

const SHIFT_TYPES = [
  "Turno A (Manhã)",
  "Turno B (Tarde)",
  "Turno C (Noite)",
];

export default function CashierShortage({ 
  appState, 
  userRole, 
  onUpdateShortages,
  onAddAuditLog
}: CashierShortageProps) {
  const { shortages = [], shifts = [], users = [] } = appState;
  const isReadOnly = userRole === "Frentista";

  const [showAddForm, setShowAddForm] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [shiftTurn, setShiftTurn] = useState<string>(SHIFT_TYPES[0]);
  const [valorTotal, setValorTotal] = useState<number>(0);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [observacoes, setObservacoes] = useState("");

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Find employees scheduled for the selected date and shift
  const handleIdentifyEmployees = () => {
    const scheduledShifts = shifts.filter(s => s.data === date && s.turno === shiftTurn);
    const employees = scheduledShifts.map(s => s.frentistaResponsavel).filter(Boolean);
    
    if (employees.length === 0) {
      setError("Nenhum funcionário encontrado na escala para esta data e turno.");
      return;
    }
    
    setSelectedEmployees(employees);
    setError("");
  };

  const handleCreateShortage = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (valorTotal <= 0) {
      setError("O valor da falta deve ser maior que zero.");
      return;
    }

    if (selectedEmployees.length === 0) {
      setError("Selecione ao menos um funcionário para o rateio.");
      return;
    }

    const rateio = valorTotal / selectedEmployees.length;

    const newShortage: ShiftShortage = {
      id: "sh_" + Date.now(),
      shiftId: date + "_" + shiftTurn,
      data: date,
      valorTotalFalta: Number(valorTotal),
      funcionariosEnvolvidos: selectedEmployees,
      rateioPorFuncionario: rateio,
      status: "Pendente",
      observacoes
    };

    onUpdateShortages([...shortages, newShortage]);
    onAddAuditLog("CREATE", "Financeiro", `Registrou falta de caixa de R$ ${valorTotal} no dia ${date} (${shiftTurn}). Rateio: R$ ${rateio.toFixed(2)} p/ pessoa.`, "Regular");

    setSuccess("Falta de caixa registrada com sucesso!");
    setTimeout(() => {
      setSuccess("");
      setShowAddForm(false);
      resetForm();
    }, 3000);
  };

  const handleDeleteShortage = (id: string) => {
    if (confirm("Deseja realmente excluir este registro de falta de caixa?")) {
      const filtered = shortages.filter(s => s.id !== id);
      onUpdateShortages(filtered);
      onAddAuditLog("DELETE", "Financeiro", `Excluiu registro de falta de caixa ID ${id}`, "Regular");
    }
  };

  const handleUpdateStatus = (id: string, newStatus: ShiftShortage["status"]) => {
    const updated = shortages.map(s => s.id === id ? { ...s, status: newStatus } : s);
    onUpdateShortages(updated);
    onAddAuditLog("UPDATE", "Financeiro", `Alterou status da falta ID ${id} para ${newStatus}`, "Regular");
  };

  const resetForm = () => {
    setValorTotal(0);
    setSelectedEmployees([]);
    setObservacoes("");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 font-display">
            <DollarSign className="text-rose-600 h-6 w-6" />
            Falta de Caixa por Turno
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Controle de quebras de caixa, identificação de responsáveis pela escala e rateio de valores
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-bold text-sm shadow-md cursor-pointer"
          >
            {showAddForm ? <Trash2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showAddForm ? "Cancelar" : "Lançar Falta"}
          </button>
        )}
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm rounded-xl flex items-center gap-2 animate-fade-in">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          {success}
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-sm rounded-xl flex items-center gap-2 animate-fade-in">
          <AlertCircle className="h-4 w-4 text-rose-600" />
          {error}
        </div>
      )}

      {showAddForm && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-in slide-in-from-top duration-300">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
            <Calculator className="h-4 w-4 text-indigo-600" />
            Novo Registro de Falta
          </h3>

          <form onSubmit={handleCreateShortage} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Data do Ocorrido</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Turno</label>
                <select
                  value={shiftTurn}
                  onChange={(e) => setShiftTurn(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {SHIFT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Valor Total da Falta (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-bold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={valorTotal}
                    onChange={(e) => setValorTotal(Number(e.target.value))}
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="0,00"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-600 uppercase flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Funcionários Responsáveis (Rateio)
                </h4>
                <button
                  type="button"
                  onClick={handleIdentifyEmployees}
                  className="text-[11px] bg-white border border-slate-200 px-3 py-1.5 rounded-lg font-bold text-indigo-600 hover:bg-indigo-50 transition shadow-sm"
                >
                  Buscar na Escala
                </button>
              </div>

              {selectedEmployees.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {selectedEmployees.map((emp, idx) => (
                      <span key={idx} className="bg-white border border-slate-200 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 flex items-center gap-2 shadow-sm">
                        {emp}
                        <button 
                          type="button"
                          onClick={() => setSelectedEmployees(prev => prev.filter(e => e !== emp))}
                          className="text-slate-400 hover:text-rose-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                    <span className="text-slate-500">Valor do rateio individual:</span>
                    <span className="font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">
                      R$ {(valorTotal / selectedEmployees.length || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / pessoa
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-center py-4 text-xs text-slate-400 italic">
                  Identifique os funcionários pela escala ou adicione manualmente.
                </p>
              )}

              <div className="pt-2">
                <select
                  onChange={(e) => {
                    if (e.target.value && !selectedEmployees.includes(e.target.value)) {
                      setSelectedEmployees([...selectedEmployees, e.target.value]);
                    }
                  }}
                  className="text-[11px] bg-white border border-slate-200 px-2 py-1.5 rounded-lg outline-none cursor-pointer"
                  value=""
                >
                  <option value="">Adicionar funcionário manualmente...</option>
                  {users.map(u => <option key={u.id} value={u.nomeCompleto}>{u.nomeCompleto}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Observações</label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-20"
                placeholder="Detalhes sobre a diferença encontrada..."
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              Confirmar Lançamento de Falta
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-800">Histórico de Faltas</h3>
          <div className="flex gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
              <div className="h-2 w-2 rounded-full bg-amber-400" /> Pendente
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
              <div className="h-2 w-2 rounded-full bg-emerald-400" /> Pago
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Data / Turno</th>
                <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Valor Total</th>
                <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Funcionários</th>
                <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Rateio Unit.</th>
                <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Status</th>
                <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {shortages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400 italic">
                    Nenhum registro de falta de caixa encontrado.
                  </td>
                </tr>
              ) : (
                shortages.slice().reverse().map(short => (
                  <tr key={short.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{short.data.split("-").reverse().join("/")}</div>
                      <div className="text-[10px] text-slate-500">{short.shiftId.split("_")[1]}</div>
                    </td>
                    <td className="p-4 font-black text-rose-600">
                      R$ {short.valorTotalFalta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {short.funcionariosEnvolvidos.map((f, i) => (
                          <span key={i} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold">
                            {f}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 font-bold text-slate-700">
                      R$ {short.rateioPorFuncionario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4">
                      <select
                        value={short.status}
                        disabled={isReadOnly}
                        onChange={(e) => handleUpdateStatus(short.id, e.target.value as ShiftShortage["status"])}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border outline-none cursor-pointer ${
                          short.status === "Pago" 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                            : short.status === "Pendente"
                            ? "bg-amber-50 text-amber-700 border-amber-100"
                            : "bg-slate-50 text-slate-700 border-slate-100"
                        }`}
                      >
                        <option value="Pendente">Pendente</option>
                        <option value="Pago">Pago</option>
                        <option value="Descontado">Descontado</option>
                      </select>
                    </td>
                    <td className="p-4">
                      {!isReadOnly && (
                        <button
                          onClick={() => handleDeleteShortage(short.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                          title="Remover registro"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
