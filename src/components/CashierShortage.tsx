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
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Info,
  X
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
  const [tipo, setTipo] = useState<"Falta" | "Sobra">("Falta");
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
      setError(`O valor da ${tipo.toLowerCase()} deve ser maior que zero.`);
      return;
    }

    if (selectedEmployees.length === 0) {
      setError("Selecione ao menos um funcionário para o registro.");
      return;
    }

    const rateio = valorTotal / selectedEmployees.length;

    const newShortage: ShiftShortage = {
      id: "sh_" + Date.now(),
      shiftId: date + "_" + shiftTurn,
      data: date,
      valorTotalFalta: Number(valorTotal),
      tipo,
      funcionariosEnvolvidos: selectedEmployees,
      rateioPorFuncionario: rateio,
      status: "Pendente",
      observacoes
    };

    onUpdateShortages([...shortages, newShortage]);
    onAddAuditLog("CREATE", "Financeiro", `Registrou ${tipo.toLowerCase()} de caixa de R$ ${valorTotal} no dia ${date} (${shiftTurn}).`, "Regular");

    setSuccess(`${tipo} de caixa registrada com sucesso!`);
    setTimeout(() => {
      setSuccess("");
      setShowAddForm(false);
      resetForm();
    }, 3000);
  };

  const handleDeleteShortage = (id: string) => {
    if (confirm("Deseja realmente excluir este registro?")) {
      const filtered = shortages.filter(s => s.id !== id);
      onUpdateShortages(filtered);
      onAddAuditLog("DELETE", "Financeiro", `Excluiu registro de caixa ID ${id}`, "Regular");
    }
  };

  const handleUpdateStatus = (id: string, newStatus: ShiftShortage["status"]) => {
    const updated = shortages.map(s => s.id === id ? { ...s, status: newStatus } : s);
    onUpdateShortages(updated);
    onAddAuditLog("UPDATE", "Financeiro", `Alterou status do registro ID ${id} para ${newStatus}`, "Regular");
  };

  const resetForm = () => {
    setValorTotal(0);
    setTipo("Falta");
    setSelectedEmployees([]);
    setObservacoes("");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 font-display">
            <DollarSign className="text-indigo-600 h-6 w-6" />
            Diferenças de Caixa (Faltas/Sobras)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Controle de quebras e excessos de caixa, rateio entre funcionários e gestão de status
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-bold text-sm shadow-md cursor-pointer"
          >
            {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showAddForm ? "Cancelar" : "Lançar Diferença"}
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
            Novo Registro de Diferença
          </h3>

          <form onSubmit={handleCreateShortage} className="space-y-6">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setTipo("Falta")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                  tipo === "Falta" ? "bg-rose-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-200"
                }`}
              >
                <TrendingDown className="h-3.5 w-3.5" />
                Falta de Caixa
              </button>
              <button
                type="button"
                onClick={() => setTipo("Sobra")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                  tipo === "Sobra" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-200"
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Sobra de Caixa
              </button>
            </div>

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
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Valor da {tipo} (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-bold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={valorTotal}
                    onChange={(e) => setValorTotal(Number(e.target.value))}
                    className={`w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 outline-none ${
                      tipo === "Falta" ? "focus:ring-rose-500" : "focus:ring-emerald-500"
                    }`}
                    placeholder="0,00"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-600 uppercase flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Funcionários Responsáveis {tipo === "Falta" && "(Rateio)"}
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
                  {tipo === "Falta" && (
                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                      <span className="text-slate-500">Valor do rateio individual:</span>
                      <span className="font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">
                        R$ {(valorTotal / selectedEmployees.length || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / pessoa
                      </span>
                    </div>
                  )}
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
              className={`w-full py-3 text-white font-bold rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                tipo === "Falta" ? "bg-rose-600 hover:bg-rose-700 shadow-rose-200" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
              }`}
            >
              Confirmar Registro de {tipo}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-800">Histórico de Diferenças</h3>
          <div className="flex gap-4">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
              <div className="h-2 w-2 rounded-full bg-rose-500" /> Falta
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
              <div className="h-2 w-2 rounded-full bg-emerald-500" /> Sobra
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Data / Turno</th>
                <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Tipo</th>
                <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Valor Total</th>
                <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Envolvidos</th>
                <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Status</th>
                <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {shortages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400 italic">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                shortages.slice().reverse().map(short => (
                  <tr key={short.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{short.data.split("-").reverse().join("/")}</div>
                      <div className="text-[10px] text-slate-500">{short.shiftId.split("_")[1]}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1 w-fit border ${
                        short.tipo === "Sobra" 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                          : "bg-rose-50 text-rose-700 border-rose-100"
                      }`}>
                        {short.tipo === "Sobra" ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                        {short.tipo}
                      </span>
                    </td>
                    <td className={`p-4 font-black ${short.tipo === "Sobra" ? "text-emerald-600" : "text-rose-600"}`}>
                      R$ {short.valorTotalFalta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-slate-400" />
                        <span className="font-bold text-slate-600">{short.funcionariosEnvolvidos.length}</span>
                        <div className="group relative">
                          <Info className="h-3 w-3 text-slate-300 cursor-help" />
                          <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2 rounded shadow-xl whitespace-nowrap z-50">
                            {short.funcionariosEnvolvidos.join(", ")}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <select
                        value={short.status}
                        disabled={isReadOnly}
                        onChange={(e) => handleUpdateStatus(short.id, e.target.value as ShiftShortage["status"])}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border outline-none cursor-pointer ${
                          short.status === "Pago" || short.status === "Concluído"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                            : short.status === "Pendente"
                            ? "bg-amber-50 text-amber-700 border-amber-100"
                            : "bg-slate-50 text-slate-700 border-slate-100"
                        }`}
                      >
                        <option value="Pendente">Pendente</option>
                        {short.tipo === "Falta" ? (
                          <>
                            <option value="Pago">Pago</option>
                            <option value="Descontado">Descontado</option>
                          </>
                        ) : (
                          <option value="Concluído">Concluído</option>
                        )}
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