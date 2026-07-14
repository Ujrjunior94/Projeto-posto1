/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { AppState, FuelTank, ShiftSchedule } from "../types";
import { Fuel, TrendingUp, ShieldAlert, CheckCircle2, UserCheck, Droplet, Thermometer, HelpCircle } from "lucide-react";

interface DashboardOverviewProps {
  appState: AppState;
  onNavigate: (tab: string) => void;
}

export default function DashboardOverview({ appState, onNavigate }: DashboardOverviewProps) {
  const { tanks, shifts, nozzleClosings = [], qualityAudits } = appState;

  // Active shift
  const activeShift = shifts.find((s) => s.status === "Em Andamento");

  // Sum total liters sold
  const totalLitersSold = nozzleClosings.reduce((sum, c) => sum + (c.litrosVendidos || 0), 0);

  // Critical stock tanks check
  const criticalTanks = tanks.filter((t) => t.volumeAtual <= t.pontoCriticoAlerta);

  // Quality conform status
  const totalAudits = qualityAudits.length;
  const compliantAudits = qualityAudits.filter((q) => q.conforme).length;
  const qualityRate = totalAudits > 0 ? Math.round((compliantAudits / totalAudits) * 100) : 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      {/* Quick Stats Grid - Full Width */}
      <div className="md:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute -top-2 -right-2 p-4 opacity-10 text-indigo-600 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-500">
            <Droplet className="h-20 w-20" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Volume Total Vendido</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-black text-slate-900 font-display">
              {totalLitersSold.toLocaleString("pt-BR")}
            </span>
            <span className="text-sm font-bold text-slate-400">L</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-500 font-bold bg-slate-50 w-fit px-2 py-1 rounded-lg">
            <TrendingUp className="h-3 w-3 text-emerald-500" />
            +4.2% em relação a ontem
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute -top-2 -right-2 p-4 opacity-10 text-emerald-600 group-hover:scale-125 group-hover:-rotate-12 transition-transform duration-500">
            <Fuel className="h-20 w-20" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Combustível Estocado</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-black text-slate-900 font-display">
              {tanks.reduce((sum, t) => sum + t.volumeAtual, 0).toLocaleString("pt-BR")}
            </span>
            <span className="text-sm font-bold text-slate-400">L</span>
          </div>
          <div className="mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
            Distribuído em {tanks.length} tanques ativos
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute -top-2 -right-2 p-4 opacity-10 text-rose-600 group-hover:scale-125 transition-transform duration-500">
            <ShieldAlert className="h-20 w-20" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alertas Críticos</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className={`text-3xl font-black font-display ${criticalTanks.length > 0 ? "text-rose-600 animate-pulse" : "text-emerald-600"}`}>
              {criticalTanks.length}
            </span>
            <span className="text-sm font-bold text-slate-400">un</span>
          </div>
          <div className="mt-4 text-[10px] font-bold uppercase">
            {criticalTanks.length > 0 ? (
              <span className="text-rose-500 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">Atenção: Nível de tanque baixo</span>
            ) : (
              <span className="text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">Operação Segura</span>
            )}
          </div>
        </div>

        <div className="bg-indigo-600 p-5 rounded-2xl border border-indigo-700 shadow-lg shadow-indigo-100 relative overflow-hidden group">
          <div className="absolute -top-2 -right-2 p-4 opacity-20 text-white group-hover:scale-125 transition-transform duration-500">
            <CheckCircle2 className="h-20 w-20" />
          </div>
          <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Conformidade ANP</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-black text-white font-display">
              {qualityRate}%
            </span>
          </div>
          <div className="mt-4 text-[10px] font-bold text-indigo-100 uppercase bg-indigo-500/50 px-2 py-1 rounded-lg w-fit">
            {compliantAudits} de {totalAudits} testes aprovados
          </div>
        </div>
      </div>

      {/* Fuel Tanks Fluid Display Section - 8/12 Width */}
      <div className="md:col-span-12 lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 mb-6 border-b border-slate-50 gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 font-display uppercase tracking-tight">
              <Fuel className="text-indigo-600 h-6 w-6" />
              Status de Reservatórios
            </h3>
            <p className="text-xs text-slate-500 font-medium">Monitoramento volumétrico em tempo real</p>
          </div>
          <button
            onClick={() => onNavigate("tanques")}
            className="px-4 py-2 bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-slate-100"
          >
            Acessar Gestão de Tanques
            < TrendingUp className="h-3 w-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {tanks.map((tank) => {
            const pct = Math.min(100, Math.max(0, (tank.volumeAtual / tank.capacidadeMaxima) * 100));
            const isCritical = tank.volumeAtual <= tank.pontoCriticoAlerta;
            
            let fluidBg = "from-indigo-500 to-indigo-600";
            let fluidColorText = "text-indigo-600";
            let borderColor = "border-slate-100";
            
            if (isCritical) {
              fluidBg = "from-rose-500 to-rose-600";
              fluidColorText = "text-rose-600";
              borderColor = "border-rose-100 bg-rose-50/10";
            } else if (pct < 40) {
              fluidBg = "from-amber-400 to-amber-500";
              fluidColorText = "text-amber-600";
              borderColor = "border-amber-100 bg-amber-50/10";
            } else if (tank.combustivel.includes("Gasolina Comum")) {
              fluidBg = "from-yellow-400 to-amber-500";
            } else if (tank.combustivel.includes("Gasolina Aditivada")) {
              fluidBg = "from-rose-500 to-rose-700";
            } else if (tank.combustivel.includes("Etanol")) {
              fluidBg = "from-sky-400 to-sky-500";
            } else if (tank.combustivel.includes("Diesel")) {
              fluidBg = "from-emerald-500 to-emerald-700";
            }

            return (
              <div key={tank.id} className={`p-4 rounded-2xl border ${borderColor} flex flex-col items-center group transition-all duration-300 hover:shadow-inner`}>
                <div className="text-center w-full z-10">
                  <span className="text-[9px] font-black bg-white text-slate-400 px-2 py-0.5 rounded-full border border-slate-100 uppercase">
                    ID: {tank.identificador}
                  </span>
                  <h4 className="text-[11px] font-black text-slate-700 mt-1 uppercase truncate">
                    {tank.combustivel}
                  </h4>
                </div>

                <div className="w-20 h-32 bg-slate-100/50 border-2 border-slate-200 rounded-b-[15px] relative overflow-hidden my-4 shadow-inner flex flex-col justify-end ring-4 ring-slate-50/50">
                  <div className="absolute top-0 left-0 right-0 h-3 bg-slate-200/50 border-b border-slate-300/30 rounded-full z-20" />
                  <div className="absolute inset-y-0 left-2 w-1.5 bg-white/10 z-20 pointer-events-none" />

                  <div
                    className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${fluidBg} transition-all duration-1000 ease-in-out`}
                    style={{ height: `${pct}%` }}
                  >
                    {pct > 0 && <div className="absolute -top-1 left-0 right-0 h-2 bg-white/20 rounded-full z-10" />}
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center font-black text-xs text-slate-800 z-20 bg-white/5 backdrop-blur-[1px] h-fit w-fit mx-auto px-1.5 py-0.5 rounded-md mt-12">
                    {Math.round(pct)}%
                  </div>
                </div>

                <div className="w-full text-center space-y-1">
                  <p className="text-[10px] text-slate-800 font-mono font-black tracking-tighter">
                    {tank.volumeAtual.toLocaleString()}L
                  </p>
                  <div className={`h-1.5 w-full bg-slate-100 rounded-full overflow-hidden`}>
                    <div className={`h-full bg-gradient-to-r ${fluidBg}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sidebar Area - 4/12 Width */}
      <div className="md:col-span-12 lg:col-span-4 space-y-6">
        {/* Active Shift Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 font-display uppercase tracking-wider pb-4 border-b border-slate-50">
            <UserCheck className="text-indigo-600 h-5 w-5" />
            Operação de Turno
          </h3>

          {activeShift ? (
            <div className="mt-6 space-y-6">
              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Responsável</p>
                    <p className="text-sm font-black text-slate-800 leading-none">{activeShift.frentistaResponsavel}</p>
                  </div>
                  <span className="bg-white text-indigo-700 border border-indigo-200 text-[10px] font-black px-2 py-1 rounded-lg uppercase shadow-sm">
                    {activeShift.turno}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado dos Checklists</p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { label: "Limpeza de Pistas", status: activeShift.checklist.limpezaPistas },
                    { label: "Uso de EPIs", status: activeShift.checklist.usoEPIs },
                    { label: "Equipamentos ANP", status: activeShift.checklist.afericaoEquipamentosSeguranca },
                    { label: "Teste do Gerador", status: activeShift.checklist.testeGerador }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 transition hover:bg-white hover:shadow-sm">
                      <span className="text-[11px] font-bold text-slate-600">{item.label}</span>
                      {item.status ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <ShieldAlert className="h-4 w-4 text-rose-500" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-10 mb-6 text-center">
              <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <HelpCircle className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase">Nenhum turno ativo</p>
              <button
                onClick={() => onNavigate("escalas")}
                className="mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all"
              >
                Abrir Novo Turno
              </button>
            </div>
          )}
        </div>

        {/* Quality Control Card */}
        <div className="bg-indigo-900 p-6 rounded-3xl border border-indigo-800 shadow-xl shadow-indigo-100/20 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Thermometer className="h-32 w-32" />
          </div>
          
          <h3 className="text-sm font-black flex items-center gap-2 font-display uppercase tracking-wider pb-4 border-b border-indigo-800/50 relative z-10">
            <Thermometer className="text-indigo-400 h-5 w-5" />
            Qualidade ANP
          </h3>

          {qualityAudits.length > 0 ? (
            <div className="mt-6 space-y-4 relative z-10">
              {qualityAudits.slice(-2).reverse().map((audit) => (
                <div key={audit.id} className="p-3 bg-indigo-800/40 rounded-2xl border border-indigo-700/50 flex justify-between items-center group transition hover:bg-indigo-800/60">
                  <div>
                    <p className="text-[11px] font-black text-indigo-100 uppercase">{audit.combustivel}</p>
                    <p className="text-[10px] text-indigo-300 font-mono mt-1">
                      {audit.temperatura}°C | {audit.densidade} g/cm³
                    </p>
                  </div>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${audit.conforme ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400" : "border-rose-500/50 bg-rose-500/20 text-rose-400"}`}>
                    {audit.conforme ? <CheckCircle2 className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                  </div>
                </div>
              ))}
              <button
                onClick={() => onNavigate("qualidade")}
                className="w-full py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors mt-2"
              >
                Histórico Completo
              </button>
            </div>
          ) : (
            <div className="mt-10 mb-4 text-center relative z-10">
              <p className="text-[11px] font-black text-indigo-300 uppercase">Sem auditoria hoje</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
