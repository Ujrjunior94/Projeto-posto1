/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { AppState, DailyBalance as IDailyBalance } from "../types";
import { 
  BarChart3, 
  Plus, 
  Search, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  PieChart, 
  Download, 
  FileText,
  Filter,
  ChevronRight,
  Printer
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from "recharts";

interface DailyBalanceProps {
  appState: AppState;
  onUpdateBalances: (balances: IDailyBalance[]) => void;
  onAddAuditLog: (actionType: string, target: string, details: string, status: string) => void;
  userRole: string;
}

export default function DailyBalance({ 
  appState, 
  onUpdateBalances, 
  onAddAuditLog,
  userRole
}: DailyBalanceProps) {
  const { dailyBalances = [] } = appState;
  const isReadOnly = userRole === "Frentista";

  const [view, setView] = useState<"list" | "form" | "reports">("list");
  const [filterPeriod, setFilterPeriod] = useState<"daily" | "monthly">("daily");
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [filterMonth, setFilterMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // Form state for new balance
  const [formData, setFormData] = useState<Partial<IDailyBalance>>({
    data: new Date().toISOString().split("T")[0],
    vendaCombustivel: 0,
    vendaLubrificantes: 0,
    outrasReceitas: 0,
    totalDespesas: 0,
    metodosPagamento: {
      dinheiro: 0,
      cartaoCredito: 0,
      cartaoDebito: 0,
      pix: 0,
      prazo: 0
    },
    observacoes: ""
  });

  const [success, setSuccess] = useState("");

  const filteredBalances = useMemo(() => {
    if (filterPeriod === "daily") {
      return dailyBalances.filter(b => b.data === filterDate);
    } else {
      return dailyBalances.filter(b => b.data.startsWith(filterMonth));
    }
  }, [dailyBalances, filterPeriod, filterDate, filterMonth]);

  const stats = useMemo(() => {
    const total = filteredBalances.reduce((acc, curr) => ({
      combustivel: acc.combustivel + curr.vendaCombustivel,
      lubrificantes: acc.lubrificantes + curr.vendaLubrificantes,
      despesas: acc.despesas + curr.totalDespesas,
      receitas: acc.receitas + curr.outrasReceitas,
      saldo: acc.saldo + curr.saldoFinal
    }), { combustivel: 0, lubrificantes: 0, despesas: 0, receitas: 0, saldo: 0 });

    return total;
  }, [filteredBalances]);

  const chartData = useMemo(() => {
    if (filterPeriod === "monthly") {
      // Group by day for the month
      const days: Record<string, number> = {};
      filteredBalances.forEach(b => {
        days[b.data] = (days[b.data] || 0) + b.saldoFinal;
      });
      return Object.entries(days).map(([name, value]) => ({ name: name.split("-")[2], value })).sort((a,b) => a.name.localeCompare(b.name));
    } else {
      // Show distribution for the day
      if (filteredBalances.length === 0) return [];
      const b = filteredBalances[0];
      return [
        { name: "Combustível", value: b.vendaCombustivel, color: "#4f46e5" },
        { name: "Lubrificantes", value: b.vendaLubrificantes, color: "#10b981" },
        { name: "Outros", value: b.outrasReceitas, color: "#f59e0b" },
        { name: "Despesas", value: b.totalDespesas, color: "#ef4444" }
      ];
    }
  }, [filteredBalances, filterPeriod]);

  const handleSaveBalance = (e: React.FormEvent) => {
    e.preventDefault();
    const totalReceitas = (formData.vendaCombustivel || 0) + (formData.vendaLubrificantes || 0) + (formData.outrasReceitas || 0);
    const saldo = totalReceitas - (formData.totalDespesas || 0);

    const newBalance: IDailyBalance = {
      id: "bal_" + Date.now(),
      data: formData.data || new Date().toISOString().split("T")[0],
      vendaCombustivel: formData.vendaCombustivel || 0,
      vendaLubrificantes: formData.vendaLubrificantes || 0,
      outrasReceitas: formData.outrasReceitas || 0,
      totalDespesas: formData.totalDespesas || 0,
      saldoFinal: saldo,
      metodosPagamento: formData.metodosPagamento as IDailyBalance["metodosPagamento"],
      fechadoPor: appState.users[0]?.nomeCompleto || "Sistema",
      stationCnpj: appState.users[0]?.cnpjPosto || "",
      observacoes: formData.observacoes
    };

    onUpdateBalances([...dailyBalances, newBalance]);
    onAddAuditLog("CREATE", "Financeiro", `Emitiu balanço diário para a data ${newBalance.data}. Saldo: R$ ${saldo.toFixed(2)}`, "Regular");
    
    setSuccess("Balanço registrado com sucesso!");
    setTimeout(() => {
      setSuccess("");
      setView("list");
    }, 2000);
  };

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-slate-200 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 font-display">
            <BarChart3 className="text-indigo-600 h-6 w-6" />
            Balanço Diário & Relatórios
          </h2>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">
            Conciliação financeira e fechamento de caixa centralizado
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setView("list")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${view === "list" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
          >
            Visão Geral
          </button>
          <button 
            onClick={() => setView("reports")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${view === "reports" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
          >
            Relatórios
          </button>
          {!isReadOnly && (
            <button 
              onClick={() => setView("form")}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-bold text-xs shadow-md"
            >
              <Plus className="h-4 w-4" />
              Novo Balanço
            </button>
          )}
        </div>
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm rounded-xl flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          {success}
        </div>
      )}

      {view === "list" && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-4 shadow-sm">
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
              <button 
                onClick={() => setFilterPeriod("daily")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition ${filterPeriod === "daily" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}
              >
                Diário
              </button>
              <button 
                onClick={() => setFilterPeriod("monthly")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition ${filterPeriod === "monthly" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}
              >
                Mensal
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              {filterPeriod === "daily" ? (
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input 
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              ) : (
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input 
                    type="month"
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              )}
            </div>
            
            <div className="flex-1" />
            
            <button className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-indigo-600 transition text-[10px] font-black uppercase tracking-widest">
              <Download className="h-4 w-4" />
              Exportar PDF
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendas Combustível</p>
              <p className="text-xl font-black text-slate-900 mt-1 font-display">{formatCurrency(stats.combustivel)}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lubrificantes</p>
              <p className="text-xl font-black text-emerald-600 mt-1 font-display">{formatCurrency(stats.lubrificantes)}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Outras Receitas</p>
              <p className="text-xl font-black text-amber-500 mt-1 font-display">{formatCurrency(stats.receitas)}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Despesas</p>
              <p className="text-xl font-black text-rose-500 mt-1 font-display">{formatCurrency(stats.despesas)}</p>
            </div>
            <div className="bg-indigo-600 p-5 rounded-2xl border border-indigo-700 shadow-lg shadow-indigo-100">
              <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">Saldo Líquido</p>
              <p className="text-xl font-black text-white mt-1 font-display">{formatCurrency(stats.saldo)}</p>
            </div>
          </div>

          {/* Charts & Details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6">
                <TrendingUp className="h-4 w-4 text-indigo-600" />
                Desempenho no Período
              </h3>
              <div className="h-[300px] w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }}
                        tickFormatter={(val) => `R$ ${val}`}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        formatter={(val: number) => [formatCurrency(val), "Valor"]}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={filterPeriod === "daily" ? 60 : 20}>
                        {chartData.map((entry: any, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || '#4f46e5'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">
                    Sem dados para exibir
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6">
                <PieChart className="h-4 w-4 text-indigo-600" />
                Distribuição por Meio de Pagamento
              </h3>
              
              {filteredBalances.length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(filteredBalances[0].metodosPagamento).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400">
                          {key === 'dinheiro' && <DollarSign className="h-4 w-4 text-emerald-500" />}
                          {key === 'cartaoCredito' && <CreditCard className="h-4 w-4 text-indigo-500" />}
                          {key === 'cartaoDebito' && <CreditCard className="h-4 w-4 text-sky-500" />}
                          {key === 'pix' && <TrendingUp className="h-4 w-4 text-teal-500" />}
                          {key === 'prazo' && <Calendar className="h-4 w-4 text-amber-500" />}
                        </div>
                        <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight">{key.replace(/([A-Z])/g, ' $1')}</span>
                      </div>
                      <span className="text-xs font-black text-slate-900">{formatCurrency(val as number)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">
                  Sem dados para exibir
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {view === "form" && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl max-w-4xl mx-auto animate-in slide-in-from-bottom duration-500">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-50">
            <div className="h-12 w-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Emitir Balanço Diário</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Preencha os dados financeiros para o fechamento do dia</p>
            </div>
          </div>

          <form onSubmit={handleSaveBalance} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest border-l-4 border-indigo-500 pl-3">Entradas de Receita</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 ml-1">Data Competência</label>
                    <input 
                      type="date"
                      required
                      value={formData.data}
                      onChange={(e) => setFormData({...formData, data: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 ml-1">Venda de Combustível (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      required
                      value={formData.vendaCombustivel}
                      onChange={(e) => setFormData({...formData, vendaCombustivel: Number(e.target.value)})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 ml-1">Venda de Lubrificantes (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      required
                      value={formData.vendaLubrificantes}
                      onChange={(e) => setFormData({...formData, vendaLubrificantes: Number(e.target.value)})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 ml-1">Outras Receitas / Conveniência (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      required
                      value={formData.outrasReceitas}
                      onChange={(e) => setFormData({...formData, outrasReceitas: Number(e.target.value)})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest border-l-4 border-rose-500 pl-3">Saídas & Meios de Pagamento</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 ml-1">Total Despesas do Dia (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      required
                      value={formData.totalDespesas}
                      onChange={(e) => setFormData({...formData, totalDespesas: Number(e.target.value)})}
                      className="w-full px-4 py-3 bg-rose-50 border border-rose-100 rounded-2xl text-sm font-bold text-rose-700 focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-2">Detalhamento Financeiro</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Dinheiro</label>
                        <input 
                          type="number"
                          step="0.01"
                          value={formData.metodosPagamento?.dinheiro}
                          onChange={(e) => setFormData({...formData, metodosPagamento: {...formData.metodosPagamento!, dinheiro: Number(e.target.value)}})}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">PIX</label>
                        <input 
                          type="number"
                          step="0.01"
                          value={formData.metodosPagamento?.pix}
                          onChange={(e) => setFormData({...formData, metodosPagamento: {...formData.metodosPagamento!, pix: Number(e.target.value)}})}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">C. Crédito</label>
                        <input 
                          type="number"
                          step="0.01"
                          value={formData.metodosPagamento?.cartaoCredito}
                          onChange={(e) => setFormData({...formData, metodosPagamento: {...formData.metodosPagamento!, cartaoCredito: Number(e.target.value)}})}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">C. Débito</label>
                        <input 
                          type="number"
                          step="0.01"
                          value={formData.metodosPagamento?.cartaoDebito}
                          onChange={(e) => setFormData({...formData, metodosPagamento: {...formData.metodosPagamento!, cartaoDebito: Number(e.target.value)}})}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 ml-1">Observações / Notas do Fechamento</label>
              <textarea 
                value={formData.observacoes}
                onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24"
                placeholder="Ex: Diferença de caixa de R$ 5,00 devido a arredondamento..."
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                type="button"
                onClick={() => setView("list")}
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-[11px] uppercase tracking-widest rounded-2xl transition"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl transition shadow-xl shadow-indigo-100"
              >
                Salvar & Registrar Balanço
              </button>
            </div>
          </form>
        </div>
      )}

      {view === "reports" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-fit">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6">
              <Filter className="h-4 w-4 text-indigo-600" />
              Configurar Relatório
            </h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Período</label>
                <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold">
                  <option>Balanço Diário (Data Única)</option>
                  <option>Balanço Mensal (Consolidado)</option>
                  <option>Relatório Customizado (Período)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Inicial</label>
                <input type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Final</label>
                <input type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold" />
              </div>

              <button className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl transition flex items-center justify-center gap-2">
                <Search className="h-4 w-4" />
                Gerar Visualização
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm min-h-[500px] flex flex-col">
              <div className="flex justify-between items-start mb-10 pb-6 border-b border-slate-50">
                <div>
                  <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Relatório de Balanço Financeiro</h4>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Status: Consolidado e Revisado</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl border border-slate-100 transition"><Printer className="h-5 w-5" /></button>
                  <button className="p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl border border-slate-100 transition"><Download className="h-5 w-5" /></button>
                </div>
              </div>

              {filteredBalances.length > 0 ? (
                <div className="space-y-8 flex-1">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Receita Bruta</p>
                      <p className="text-lg font-black text-indigo-600 font-display">{formatCurrency(stats.combustivel + stats.lubrificantes + stats.receitas)}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Custo/Despesa</p>
                      <p className="text-lg font-black text-rose-500 font-display">{formatCurrency(stats.despesas)}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Margem Oper.</p>
                      <p className="text-lg font-black text-emerald-600 font-display">{Math.round((stats.saldo / (stats.combustivel + stats.lubrificantes + stats.receitas)) * 100)}%</p>
                    </div>
                    <div className="bg-indigo-600 p-4 rounded-2xl shadow-md">
                      <p className="text-[9px] font-black text-indigo-200 uppercase mb-1">Saldo Final</p>
                      <p className="text-lg font-black text-white font-display">{formatCurrency(stats.saldo)}</p>
                    </div>
                  </div>

                  <div className="overflow-hidden border border-slate-100 rounded-2xl">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        <tr>
                          <th className="p-4">Data</th>
                          <th className="p-4">Combustível</th>
                          <th className="p-4">Lubrificantes</th>
                          <th className="p-4">Despesas</th>
                          <th className="p-4 text-right">Saldo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredBalances.map((b) => (
                          <tr key={b.id} className="text-[11px] font-bold text-slate-600 hover:bg-slate-50/50 transition">
                            <td className="p-4">{b.data.split("-").reverse().join("/")}</td>
                            <td className="p-4">{formatCurrency(b.vendaCombustivel)}</td>
                            <td className="p-4">{formatCurrency(b.vendaLubrificantes)}</td>
                            <td className="p-4 text-rose-400">{formatCurrency(b.totalDespesas)}</td>
                            <td className="p-4 text-right font-black text-slate-900">{formatCurrency(b.saldoFinal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                  <BarChart3 className="h-16 w-16 mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest">Nenhum dado encontrado para os filtros selecionados</p>
                </div>
              )}

              <div className="mt-auto pt-8 flex justify-between items-center text-[9px] font-black text-slate-300 uppercase tracking-widest">
                <span>Gerado em: {new Date().toLocaleString()}</span>
                <span>Assinatura Digital: MEUPOSTO-SEC-HASH-8821</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
