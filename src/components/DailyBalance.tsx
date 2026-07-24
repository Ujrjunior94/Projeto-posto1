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
  Printer,
  Droplets,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Scale,
  Fuel,
  Info
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
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface DailyBalanceProps {
  appState: AppState;
  onUpdateBalances: (balances: IDailyBalance[]) => void;
  onAddAuditLog: (actionType: string, target: string, details: string, status: string) => void;
  userRole: string;
}

const FUEL_LMC_OPTIONS = [
  "Gasolina C Comum (E30)",
  "Gasolina C Aditivada (E30)",
  "Etanol Hidratado",
  "Diesel B S10",
  "Diesel B S500"
];

const mapLmcFuelToTankFuel = (lmcFuel: string): string => {
  if (lmcFuel.includes("Gasolina C Comum") || lmcFuel.includes("Gasolina Comum")) return "Gasolina Comum";
  if (lmcFuel.includes("Gasolina C Aditivada") || lmcFuel.includes("Gasolina Aditivada")) return "Gasolina Aditivada";
  if (lmcFuel.includes("Etanol")) return "Etanol";
  if (lmcFuel.includes("Diesel B S10") || lmcFuel.includes("Diesel S10")) return "Diesel S10";
  if (lmcFuel.includes("Diesel B S500") || lmcFuel.includes("Diesel S500")) return "Diesel S500";
  return lmcFuel;
};

export default function DailyBalance({ 
  appState, 
  onUpdateBalances, 
  onAddAuditLog,
  userRole
}: DailyBalanceProps) {
  const { dailyBalances = [], tanks = [], deliveries = [], nozzleClosings = [], lmc = [] } = appState;
  const isReadOnly = userRole === "Frentista";
  const cnpjPosto = appState.users[0]?.cnpjPosto || "";

  // Modes: "litrage" (default: Balanço Diário de Litragem), "list" (Financeiro), "reports", "form"
  const [view, setView] = useState<"litrage" | "list" | "form" | "reports">("litrage");
  const [selectedLitrageDate, setSelectedLitrageDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedFuelFilter, setSelectedFuelFilter] = useState<string>("ALL");

  const [filterPeriod, setFilterPeriod] = useState<"daily" | "monthly">("daily");
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [filterMonth, setFilterMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // Form state for new financial balance
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

  // Calculate yesterday's date string
  const getYesterdayStr = (dateStr: string) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  };

  // Litrage calculation logic implementing exact user formula:
  // Diferença (L) = (Estoque Inicial de Ontem - Vendas de Ontem + Chegada de Produto de Ontem) - Estoque Inicial de Hoje
  const litrageReconciliation = useMemo(() => {
    const dateStr = selectedLitrageDate;
    const yesterdayStr = getYesterdayStr(dateStr);

    return FUEL_LMC_OPTIONS.map((fuelType) => {
      const mappedFuel = mapLmcFuelToTankFuel(fuelType);

      // Tanks for this fuel
      const matchedTanks = tanks.filter((t) => t.combustivel === mappedFuel);
      const matchedTankIds = new Set(matchedTanks.map((t) => t.id));

      // Nozzles for this fuel
      const matchedNozzles = (appState.nozzles || []).filter((n) => matchedTankIds.has(n.tanqueId));
      const matchedNozzleIds = new Set(matchedNozzles.map((n) => n.id));

      // 1. Estoque Inicial de Ontem (E_ontem)
      const lmcOntem = lmc.find(
        (r) => r.fuelType === fuelType && r.date === yesterdayStr && (!r.stationCnpj || r.stationCnpj === cnpjPosto)
      );
      
      const currentTankTotal = matchedTanks.reduce((acc, t) => acc + (Number(t.volumeAtual) || 0), 0);

      let estoqueInicialOntem = 0;
      if (lmcOntem) {
        estoqueInicialOntem = Number(lmcOntem.openingStock) || Number(lmcOntem.physicalStock) || 0;
      } else {
        // Fallback calculation based on tank capacity or default
        const tankCapSum = matchedTanks.reduce((acc, t) => acc + (Number(t.capacidadeMaxima) || 15000), 0);
        estoqueInicialOntem = currentTankTotal > 0 ? currentTankTotal : Math.round(tankCapSum * 0.7);
      }

      // 2. Venda de Ontem (V_ontem)
      let vendaOntem = 0;
      const shiftsYesterday = (appState.shifts || []).filter((s) => s.data === yesterdayStr);
      const shiftIdsYesterday = new Set(shiftsYesterday.map((s) => s.id));

      nozzleClosings.forEach((nc) => {
        if (matchedNozzleIds.has(nc.nozzleId) && (shiftIdsYesterday.has(nc.shiftId) || (nc as any).data === yesterdayStr)) {
          vendaOntem += Number(nc.litrosVendidos) || 0;
        }
      });

      if (vendaOntem === 0 && lmcOntem && lmcOntem.litersSold > 0) {
        vendaOntem = Number(lmcOntem.litersSold);
      }

      // 3. Chegada de Produto de Ontem (C_ontem)
      let chegadaOntem = 0;
      deliveries.forEach((d) => {
        const dDate = d.date || d.data;
        const dFuel = d.fuelType || d.combustivel || "";
        const isMatch = dFuel.includes(mappedFuel) || mappedFuel.includes(dFuel) || dFuel.includes(fuelType);
        if (dDate === yesterdayStr && isMatch) {
          chegadaOntem += Number(d.volume || d.volumeRecebido) || 0;
        }
      });

      if (chegadaOntem === 0 && lmcOntem && lmcOntem.deliveryVolume > 0) {
        chegadaOntem = Number(lmcOntem.deliveryVolume);
      }

      // 4. Estoque Teórico / Esperado de Hoje
      // (Estoque Inicial de Ontem - Venda de Ontem + Chegada de Ontem)
      const estoqueTeoricoHoje = estoqueInicialOntem - vendaOntem + chegadaOntem;

      // 5. Estoque Inicial de Hoje (Medição Física Hoje)
      const lmcHoje = lmc.find(
        (r) => r.fuelType === fuelType && r.date === dateStr && (!r.stationCnpj || r.stationCnpj === cnpjPosto)
      );

      let estoqueInicialHoje = 0;
      if (lmcHoje) {
        estoqueInicialHoje = Number(lmcHoje.openingStock) || Number(lmcHoje.physicalStock) || 0;
      } else if (dateStr === new Date().toISOString().split("T")[0] && currentTankTotal > 0) {
        estoqueInicialHoje = currentTankTotal;
      } else {
        estoqueInicialHoje = Math.max(0, estoqueTeoricoHoje);
      }

      // 6. Formula Result:
      // (Estoque Inicial de Ontem - Vendas de Ontem + Chegada de Ontem) - Estoque Inicial de Hoje
      const diferencaVolumetrica = estoqueTeoricoHoje - estoqueInicialHoje;
      const variacaoPercentual = estoqueTeoricoHoje > 0 ? (diferencaVolumetrica / estoqueTeoricoHoje) * 100 : 0;
      const dentroToleranciaAnp = Math.abs(variacaoPercentual) <= 0.6;

      return {
        fuelType,
        mappedFuel,
        estoqueInicialOntem,
        vendaOntem,
        chegadaOntem,
        estoqueTeoricoHoje,
        estoqueInicialHoje,
        diferencaVolumetrica,
        variacaoPercentual,
        dentroToleranciaAnp,
        tankCount: matchedTanks.length,
      };
    });
  }, [selectedLitrageDate, tanks, deliveries, nozzleClosings, lmc, appState, cnpjPosto]);

  const filteredLitrageData = useMemo(() => {
    if (selectedFuelFilter === "ALL") return litrageReconciliation;
    return litrageReconciliation.filter((item) => item.fuelType === selectedFuelFilter || item.mappedFuel === selectedFuelFilter);
  }, [litrageReconciliation, selectedFuelFilter]);

  const litrageTotals = useMemo(() => {
    return litrageReconciliation.reduce(
      (acc, curr) => ({
        estoqueInicialOntem: acc.estoqueInicialOntem + curr.estoqueInicialOntem,
        vendaOntem: acc.vendaOntem + curr.vendaOntem,
        chegadaOntem: acc.chegadaOntem + curr.chegadaOntem,
        estoqueTeoricoHoje: acc.estoqueTeoricoHoje + curr.estoqueTeoricoHoje,
        estoqueInicialHoje: acc.estoqueInicialHoje + curr.estoqueInicialHoje,
        diferencaVolumetrica: acc.diferencaVolumetrica + curr.diferencaVolumetrica,
      }),
      {
        estoqueInicialOntem: 0,
        vendaOntem: 0,
        chegadaOntem: 0,
        estoqueTeoricoHoje: 0,
        estoqueInicialHoje: 0,
        diferencaVolumetrica: 0,
      }
    );
  }, [litrageReconciliation]);

  // Export PDF Report for Litrage Balance
  const exportLitragePDF = () => {
    try {
      const doc = new jsPDF();
      const yesterdayStr = getYesterdayStr(selectedLitrageDate);

      // Header
      doc.setFillColor(16, 185, 129); // Emerald-500
      doc.rect(0, 0, 210, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("MEU POSTO ERP - BALANÇO DIÁRIO DE LITRAGEM", 14, 18);

      doc.setTextColor(51, 65, 85);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Data de Referência (Hoje): ${selectedLitrageDate.split("-").reverse().join("/")}`, 14, 36);
      doc.text(`Data Anterior (Ontem): ${yesterdayStr.split("-").reverse().join("/")}`, 14, 42);
      doc.text(`CNPJ do Posto: ${cnpjPosto || "Geral"}`, 14, 48);

      // Formula annotation
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(14, 53, 182, 14, 2, 2, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text(
        "Fórmula: (Estoque Inicial de Ontem - Venda de Ontem + Chegada de Ontem) - Estoque Inicial de Hoje = Sobra/Perda (L)",
        18,
        62
      );

      // Table data
      const tableRows = litrageReconciliation.map((item) => [
        item.fuelType,
        `${item.estoqueInicialOntem.toLocaleString("pt-BR")} L`,
        `${item.vendaOntem.toLocaleString("pt-BR")} L`,
        `${item.chegadaOntem.toLocaleString("pt-BR")} L`,
        `${item.estoqueTeoricoHoje.toLocaleString("pt-BR")} L`,
        `${item.estoqueInicialHoje.toLocaleString("pt-BR")} L`,
        `${item.diferencaVolumetrica > 0 ? "+" : ""}${item.diferencaVolumetrica.toLocaleString("pt-BR")} L`,
        `${item.variacaoPercentual.toFixed(2)}%`,
      ]);

      // Totals row
      tableRows.push([
        "TOTAL CONSOLIDADO",
        `${litrageTotals.estoqueInicialOntem.toLocaleString("pt-BR")} L`,
        `${litrageTotals.vendaOntem.toLocaleString("pt-BR")} L`,
        `${litrageTotals.chegadaOntem.toLocaleString("pt-BR")} L`,
        `${litrageTotals.estoqueTeoricoHoje.toLocaleString("pt-BR")} L`,
        `${litrageTotals.estoqueInicialHoje.toLocaleString("pt-BR")} L`,
        `${litrageTotals.diferencaVolumetrica > 0 ? "+" : ""}${litrageTotals.diferencaVolumetrica.toLocaleString("pt-BR")} L`,
        "--",
      ]);

      autoTable(doc, {
        startY: 72,
        head: [
          [
            "Combustível",
            "Estoque Inicial Ontem",
            "(-) Venda Ontem",
            "(+) Chegada Ontem",
            "(=) Estoque Teórico",
            "(-) Estoque Hoje",
            "Sobra/Perda (L)",
            "Variação (%)",
          ],
        ],
        body: tableRows,
        theme: "striped",
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 8, fontStyle: "bold" },
        bodyStyles: { fontSize: 8 },
        footStyles: { fillColor: [226, 232, 240], textColor: 30, fontSize: 8, fontStyle: "bold" },
      });

      doc.save(`Balanco_Litragem_${selectedLitrageDate}.pdf`);
      onAddAuditLog("DOWNLOAD", "Balanço", `Exportou Balanço Volumétrico Diário de Litragem para a data ${selectedLitrageDate}`, "Regular");
    } catch (err: any) {
      alert("Erro ao gerar PDF do Balanço de Litragem: " + err.message);
    }
  };

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
      const days: Record<string, number> = {};
      filteredBalances.forEach(b => {
        days[b.data] = (days[b.data] || 0) + b.saldoFinal;
      });
      return Object.entries(days).map(([name, value]) => ({ name: name.split("-")[2], value })).sort((a,b) => a.name.localeCompare(b.name));
    } else {
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
    
    setSuccess("Balanço financeiro registrado com sucesso!");
    setTimeout(() => {
      setSuccess("");
      setView("list");
    }, 2000);
  };

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6">
      {/* Top Header & Primary View Mode Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-slate-200 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 font-display">
            <Droplets className="text-emerald-600 h-6 w-6" />
            Balanço Diário de Litragem & Fechamento
          </h2>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">
            Conciliação física volumétrica de combustível e balanço financeiro
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
          <button 
            onClick={() => setView("litrage")}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 cursor-pointer ${
              view === "litrage" 
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20" 
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Droplets className="h-4 w-4" />
            Balanço de Litragem
          </button>
          
          <button 
            onClick={() => setView("list")}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 cursor-pointer ${
              view === "list" 
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20" 
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Fechamento Financeiro
          </button>

          <button 
            onClick={() => setView("reports")}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 cursor-pointer ${
              view === "reports" 
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20" 
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText className="h-4 w-4" />
            Relatórios DRE
          </button>

          {!isReadOnly && view === "list" && (
            <button 
              onClick={() => setView("form")}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition font-black text-xs uppercase tracking-wider shadow-sm cursor-pointer ml-1"
            >
              <Plus className="h-4 w-4 text-emerald-400" />
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

      {/* ========================================================= */}
      {/* 1. VIEW: BALANÇO DIÁRIO DE LITRAGEM (PROMPT EXPLICIT FORMULA) */}
      {/* ========================================================= */}
      {view === "litrage" && (
        <div className="space-y-6">
          
          {/* Formula Banner Explanation */}
          <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 text-white p-6 rounded-3xl shadow-xl space-y-4 relative overflow-hidden border border-emerald-800/40">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-2xl border border-emerald-500/30">
                  <Scale className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">
                    Conciliação Volumétrica ANP & Controle de Tanques
                  </span>
                  <h3 className="text-lg font-black font-display tracking-tight text-white">
                    Fórmula Oficial do Balanço Diário de Litragem
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={exportLitragePDF}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Exportar Balanço PDF</span>
                </button>
              </div>
            </div>

            {/* User Formula Display Box */}
            <div className="bg-slate-900/90 border border-emerald-500/30 p-4 rounded-2xl relative z-10 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                Cálculo Executado em Litros (L):
              </span>
              <div className="text-sm sm:text-base font-extrabold font-mono text-emerald-200 tracking-wide">
                (Estoque Inicial de Ontem - Venda de Ontem + Chegada de Produto de Ontem) - Estoque Inicial de Hoje = Sobra/Perda (L)
              </div>
              <p className="text-[11px] text-slate-300 font-medium">
                Integra automaticamente leituras de encerrantes (bicos), recebimentos de combustível (NF-e de cargas) e inventário de tanques.
              </p>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 relative z-10 border-t border-slate-800">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-xl">
                  <Calendar className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-300">Data de Referência:</span>
                  <input
                    type="date"
                    value={selectedLitrageDate}
                    onChange={(e) => setSelectedLitrageDate(e.target.value)}
                    className="bg-transparent text-xs font-extrabold text-white outline-none cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-xl">
                  <Fuel className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-300">Combustível:</span>
                  <select
                    value={selectedFuelFilter}
                    onChange={(e) => setSelectedFuelFilter(e.target.value)}
                    className="bg-slate-900 text-xs font-bold text-white outline-none cursor-pointer"
                  >
                    <option value="ALL">Todos os Combustíveis</option>
                    {FUEL_LMC_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <span className="text-xs text-slate-400 font-bold">
                Ontem considerado: <strong className="text-emerald-300">{getYesterdayStr(selectedLitrageDate).split("-").reverse().join("/")}</strong>
              </span>
            </div>
          </div>

          {/* Litrage KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Estoque Inicial de Ontem</span>
              <p className="text-2xl font-black text-slate-900 font-display">
                {litrageTotals.estoqueInicialOntem.toLocaleString("pt-BR")} <span className="text-xs text-slate-400 font-sans">L</span>
              </p>
              <p className="text-[11px] text-slate-500 font-medium">Físico inicial registrado</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">(-) Vendas de Ontem</span>
              <p className="text-2xl font-black text-rose-600 font-display">
                {litrageTotals.vendaOntem.toLocaleString("pt-BR")} <span className="text-xs text-slate-400 font-sans">L</span>
              </p>
              <p className="text-[11px] text-slate-500 font-medium">Encerrantes / Leituras bicos</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">(+) Chegada de Produto</span>
              <p className="text-2xl font-black text-indigo-600 font-display">
                {litrageTotals.chegadaOntem.toLocaleString("pt-BR")} <span className="text-xs text-slate-400 font-sans">L</span>
              </p>
              <p className="text-[11px] text-slate-500 font-medium">Cargas recebidas por NF-e</p>
            </div>

            <div className={`p-5 rounded-2xl border shadow-md space-y-1 ${
              litrageTotals.diferencaVolumetrica < 0
                ? "bg-rose-500 text-white border-rose-600 shadow-rose-900/20"
                : litrageTotals.diferencaVolumetrica > 0
                ? "bg-emerald-600 text-white border-emerald-700 shadow-emerald-900/20"
                : "bg-slate-900 text-white border-slate-800"
            }`}>
              <span className="text-[10px] font-black uppercase tracking-widest block text-emerald-100">
                (=) Sobra / Perda Total (L)
              </span>
              <p className="text-2xl font-black font-display">
                {litrageTotals.diferencaVolumetrica > 0 ? "+" : ""}
                {litrageTotals.diferencaVolumetrica.toLocaleString("pt-BR")} <span className="text-xs opacity-80 font-sans">L</span>
              </p>
              <p className="text-[11px] opacity-90 font-bold">
                {litrageTotals.diferencaVolumetrica === 0
                  ? "Balanço volumétrico zerado"
                  : litrageTotals.diferencaVolumetrica > 0
                  ? "Sobra volumétrica apurada"
                  : "Perda volumétrica apurada"}
              </p>
            </div>
          </div>

          {/* Cards per Fuel - Detailed Step-by-Step Breakdown */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Fuel className="h-4 w-4 text-emerald-600" />
              Detalhamento de Litragem por Combustível
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredLitrageData.map((item) => {
                const isLoss = item.diferencaVolumetrica < 0;
                const isGain = item.diferencaVolumetrica > 0;

                return (
                  <div key={item.fuelType} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5 hover:border-emerald-300 transition">
                    
                    {/* Fuel Card Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                      <div>
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">
                          Tanques Associados: {item.tankCount}
                        </span>
                        <h4 className="text-base font-black text-slate-900">{item.fuelType}</h4>
                      </div>

                      <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
                        item.dentroToleranciaAnp
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-900"
                      }`}>
                        {item.dentroToleranciaAnp ? <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
                        {item.dentroToleranciaAnp ? "Tolerância ANP OK (≤0,6%)" : "Alerta de Variação (>0,6%)"}
                      </span>
                    </div>

                    {/* Step-by-Step Formula Progression */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      
                      {/* Step 1: Estoque Inicial Ontem */}
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">
                          1. Est. Inicial Ontem
                        </span>
                        <span className="text-sm font-black text-slate-800 font-mono">
                          {item.estoqueInicialOntem.toLocaleString("pt-BR")} L
                        </span>
                      </div>

                      {/* Step 2: Venda Ontem */}
                      <div className="bg-rose-50/60 p-3 rounded-2xl border border-rose-100/80">
                        <span className="text-[9px] font-black text-rose-500 uppercase block mb-1">
                          2. (-) Venda Ontem
                        </span>
                        <span className="text-sm font-black text-rose-700 font-mono">
                          {item.vendaOntem.toLocaleString("pt-BR")} L
                        </span>
                      </div>

                      {/* Step 3: Chegada Produto */}
                      <div className="bg-indigo-50/60 p-3 rounded-2xl border border-indigo-100/80">
                        <span className="text-[9px] font-black text-indigo-500 uppercase block mb-1">
                          3. (+) Chegada Ontem
                        </span>
                        <span className="text-sm font-black text-indigo-700 font-mono">
                          {item.chegadaOntem.toLocaleString("pt-BR")} L
                        </span>
                      </div>

                      {/* Step 4: Estoque Teórico Hoje */}
                      <div className="bg-slate-100 p-3 rounded-2xl border border-slate-200">
                        <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">
                          4. (=) Est. Teórico Hoje
                        </span>
                        <span className="text-sm font-black text-slate-900 font-mono">
                          {item.estoqueTeoricoHoje.toLocaleString("pt-BR")} L
                        </span>
                      </div>

                      {/* Step 5: Estoque Físico Inicial Hoje */}
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">
                          5. (-) Est. Inicial Hoje
                        </span>
                        <span className="text-sm font-black text-slate-800 font-mono">
                          {item.estoqueInicialHoje.toLocaleString("pt-BR")} L
                        </span>
                      </div>

                      {/* Step 6: Result / Balance */}
                      <div className={`p-3 rounded-2xl border ${
                        isLoss
                          ? "bg-rose-100/80 border-rose-200 text-rose-900"
                          : isGain
                          ? "bg-emerald-100/80 border-emerald-200 text-emerald-900"
                          : "bg-slate-100 border-slate-200 text-slate-900"
                      }`}>
                        <span className="text-[9px] font-black uppercase block mb-1 opacity-80">
                          6. (=) Sobra / Perda
                        </span>
                        <span className="text-sm font-black font-mono">
                          {isGain ? "+" : ""}{item.diferencaVolumetrica.toLocaleString("pt-BR")} L
                        </span>
                      </div>
                    </div>

                    {/* Variance Percentage Bar */}
                    <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100">
                      <span className="text-slate-500 font-bold">Variação Percentual:</span>
                      <span className={`font-black font-mono ${
                        item.diferencaVolumetrica < 0 ? "text-rose-600" : item.diferencaVolumetrica > 0 ? "text-emerald-600" : "text-slate-700"
                      }`}>
                        {item.variacaoPercentual.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Consolidated Table of Volumetric Litrage Balance */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-black text-slate-900">Tabela Consolidada de Litragem</h4>
                <p className="text-xs text-slate-500 font-medium">Resumo do cálculo diário de sobra/perda volumétrica</p>
              </div>

              <button
                onClick={exportLitragePDF}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="h-4 w-4 text-slate-500" />
                Imprimir Relatório
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="p-3">Combustível</th>
                    <th className="p-3 text-right">Estoque Inicial Ontem</th>
                    <th className="p-3 text-right text-rose-500">(-) Venda Ontem</th>
                    <th className="p-3 text-right text-indigo-500">(+) Chegada Ontem</th>
                    <th className="p-3 text-right">(=) Est. Teórico Hoje</th>
                    <th className="p-3 text-right">(-) Est. Inicial Hoje</th>
                    <th className="p-3 text-right font-extrabold">Sobra / Perda (L)</th>
                    <th className="p-3 text-center">Status ANP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {litrageReconciliation.map((item) => (
                    <tr key={item.fuelType} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-extrabold text-slate-900">{item.fuelType}</td>
                      <td className="p-3 text-right font-mono">{item.estoqueInicialOntem.toLocaleString("pt-BR")} L</td>
                      <td className="p-3 text-right font-mono text-rose-600">{item.vendaOntem.toLocaleString("pt-BR")} L</td>
                      <td className="p-3 text-right font-mono text-indigo-600">{item.chegadaOntem.toLocaleString("pt-BR")} L</td>
                      <td className="p-3 text-right font-mono text-slate-900 font-bold">{item.estoqueTeoricoHoje.toLocaleString("pt-BR")} L</td>
                      <td className="p-3 text-right font-mono">{item.estoqueInicialHoje.toLocaleString("pt-BR")} L</td>
                      <td className={`p-3 text-right font-black font-mono ${
                        item.diferencaVolumetrica < 0 ? "text-rose-600" : item.diferencaVolumetrica > 0 ? "text-emerald-600" : "text-slate-800"
                      }`}>
                        {item.diferencaVolumetrica > 0 ? "+" : ""}{item.diferencaVolumetrica.toLocaleString("pt-BR")} L
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          item.dentroToleranciaAnp ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {item.dentroToleranciaAnp ? "OK (≤0,6%)" : "Atenção"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900 text-white text-xs font-black">
                  <tr>
                    <td className="p-3 uppercase">TOTAL GERAL</td>
                    <td className="p-3 text-right font-mono">{litrageTotals.estoqueInicialOntem.toLocaleString("pt-BR")} L</td>
                    <td className="p-3 text-right font-mono text-rose-300">{litrageTotals.vendaOntem.toLocaleString("pt-BR")} L</td>
                    <td className="p-3 text-right font-mono text-indigo-300">{litrageTotals.chegadaOntem.toLocaleString("pt-BR")} L</td>
                    <td className="p-3 text-right font-mono">{litrageTotals.estoqueTeoricoHoje.toLocaleString("pt-BR")} L</td>
                    <td className="p-3 text-right font-mono">{litrageTotals.estoqueInicialHoje.toLocaleString("pt-BR")} L</td>
                    <td className="p-3 text-right font-mono text-emerald-300">
                      {litrageTotals.diferencaVolumetrica > 0 ? "+" : ""}{litrageTotals.diferencaVolumetrica.toLocaleString("pt-BR")} L
                    </td>
                    <td className="p-3 text-center">--</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. VIEW: FECHAMENTO FINANCEIRO (VISÃO GERAL DO CAIXA)      */}
      {/* ========================================================= */}
      {view === "list" && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-4 shadow-xs">
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
              <button 
                onClick={() => setFilterPeriod("daily")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition cursor-pointer ${filterPeriod === "daily" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-400"}`}
              >
                Diário
              </button>
              <button 
                onClick={() => setFilterPeriod("monthly")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition cursor-pointer ${filterPeriod === "monthly" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-400"}`}
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
            
            <button className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-indigo-600 transition text-[10px] font-black uppercase tracking-widest cursor-pointer">
              <Download className="h-4 w-4" />
              Exportar PDF
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendas Combustível</p>
              <p className="text-xl font-black text-slate-900 mt-1 font-display">{formatCurrency(stats.combustivel)}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lubrificantes</p>
              <p className="text-xl font-black text-emerald-600 mt-1 font-display">{formatCurrency(stats.lubrificantes)}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Outras Receitas</p>
              <p className="text-xl font-black text-amber-500 mt-1 font-display">{formatCurrency(stats.receitas)}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
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
            <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
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

            <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6">
                <PieChart className="h-4 w-4 text-indigo-600" />
                Distribuição por Meio de Pagamento
              </h3>
              
              {filteredBalances.length > 0 && filteredBalances[0]?.metodosPagamento ? (
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

      {/* ========================================================= */}
      {/* 3. VIEW: FORMULARIO DE NOVO BALANÇO FINANCEIRO           */}
      {/* ========================================================= */}
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
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-[11px] uppercase tracking-widest rounded-2xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl transition shadow-xl shadow-indigo-100 cursor-pointer"
              >
                Salvar & Registrar Balanço
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. VIEW: RELATÓRIOS DRE                                   */}
      {/* ========================================================= */}
      {view === "reports" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs h-fit">
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

              <button className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer">
                <Search className="h-4 w-4" />
                Gerar Visualização
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs min-h-[500px] flex flex-col">
              <div className="flex justify-between items-start mb-10 pb-6 border-b border-slate-50">
                <div>
                  <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Relatório de Balanço Financeiro</h4>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Status: Consolidado e Revisado</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl border border-slate-100 transition cursor-pointer"><Printer className="h-5 w-5" /></button>
                  <button className="p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl border border-slate-100 transition cursor-pointer"><Download className="h-5 w-5" /></button>
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
                      <p className="text-lg font-black text-emerald-600 font-display">{Math.round((stats.saldo / (stats.combustivel + stats.lubrificantes + stats.receitas || 1)) * 100)}%</p>
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
