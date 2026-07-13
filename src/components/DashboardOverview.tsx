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
  const { tanks, shifts, transactions, calibrations, qualityAudits } = appState;

  // Active shift
  const activeShift = shifts.find((s) => s.status === "Em Andamento");

  // Sum total transactions for current system
  const totalRevenue = transactions
    .filter((t) => t.tipo === "Receita")
    .reduce((sum, t) => sum + t.valor, 0);

  const totalExpense = transactions
    .filter((t) => t.tipo === "Despesa")
    .reduce((sum, t) => sum + t.valor, 0);

  const netBalance = totalRevenue - totalExpense;

  // Critical stock tanks check
  const criticalTanks = tanks.filter((t) => t.volumeAtual <= t.pontoCriticoAlerta);

  // Quality conform status
  const totalAudits = qualityAudits.length;
  const compliantAudits = qualityAudits.filter((q) => q.conforme).length;
  const qualityRate = totalAudits > 0 ? Math.round((compliantAudits / totalAudits) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-slate-300 transition">
          <div className="absolute top-0 right-0 p-4 opacity-15 text-indigo-600 group-hover:scale-110 transition">
            <TrendingUp className="h-16 w-16" />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Faturamento de Caixa</p>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-display">
            R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Total bruto registrado no sistema
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-slate-300 transition">
          <div className="absolute top-0 right-0 p-4 opacity-15 text-emerald-600 group-hover:scale-110 transition">
            <Droplet className="h-16 w-16" />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Combustível Estocado</p>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-display">
            {tanks.reduce((sum, t) => sum + t.volumeAtual, 0).toLocaleString("pt-BR")} L
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Soma de volume atual em {tanks.length} tanques
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-slate-300 transition">
          <div className="absolute top-0 right-0 p-4 opacity-15 text-rose-600 group-hover:scale-110 transition">
            <ShieldAlert className="h-16 w-16" />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Alertas de Estoque Crítico</p>
          <p className={`text-2xl font-bold mt-2 font-display ${criticalTanks.length > 0 ? "text-rose-600 animate-pulse" : "text-emerald-600"}`}>
            {criticalTanks.length} {criticalTanks.length === 1 ? "Tanque" : "Tanques"}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Abaixo do limite mínimo de segurança
          </p>
        </div>

        <div className="bg-indigo-600 p-5 rounded-xl border border-indigo-700 shadow-sm relative overflow-hidden group text-white">
          <div className="absolute top-0 right-0 p-4 opacity-25 text-indigo-200 group-hover:scale-110 transition">
            <CheckCircle2 className="h-16 w-16" />
          </div>
          <p className="text-xs font-semibold text-indigo-100 uppercase tracking-wider">Conformidade ANP</p>
          <p className="text-2xl font-bold text-white mt-2 font-display">
            {qualityRate}% <span className="text-xs text-indigo-200 font-normal">de aprovação</span>
          </p>
          <p className="text-xs text-indigo-200 mt-1">
            {compliantAudits} de {totalAudits} testes conformes
          </p>
        </div>
      </div>

      {/* Fuel Tanks Fluid Display Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 mb-6 gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 font-display">
              <Fuel className="text-indigo-600 h-5 w-5" />
              Monitoramento em Tempo Real - Tanques de Combustível
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Indicadores interativos de volume e nível crítico de fluidos combustível
            </p>
          </div>
          <button
            onClick={() => onNavigate("tanques")}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold underline"
          >
            Gerenciar Tanques
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {tanks.map((tank) => {
            const pct = Math.min(100, Math.max(0, (tank.volumeAtual / tank.capacidadeMaxima) * 100));
            const isCritical = tank.volumeAtual <= tank.pontoCriticoAlerta;
            
            // Define colors of the fluid wave
            let fluidBg = "bg-indigo-600";
            let fluidColorText = "text-indigo-600";
            let borderColor = "border-slate-200";
            
            if (isCritical) {
              fluidBg = "bg-rose-600";
              fluidColorText = "text-rose-600 animate-pulse";
              borderColor = "border-rose-200";
            } else if (pct < 40) {
              fluidBg = "bg-amber-500";
              fluidColorText = "text-amber-600";
              borderColor = "border-amber-200";
            } else if (tank.combustivel.includes("Etanol")) {
              fluidBg = "bg-emerald-500";
              fluidColorText = "text-emerald-600";
              borderColor = "border-emerald-200";
            } else if (tank.combustivel.includes("Diesel")) {
              fluidBg = "bg-slate-500";
              fluidColorText = "text-slate-600";
              borderColor = "border-slate-300";
            }

            return (
              <div
                key={tank.id}
                className={`bg-slate-50/50 p-4 rounded-xl border ${borderColor} flex flex-col items-center justify-between shadow-sm relative group hover:border-slate-300 transition`}
              >
                {/* Tank ID and Fuel Title */}
                <div className="text-center w-full z-10">
                  <span className="text-[10px] font-mono bg-white text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                    {tank.identificador}
                  </span>
                  <h4 className="text-xs font-bold text-slate-800 mt-2 truncate w-full">
                    {tank.combustivel}
                  </h4>
                </div>

                {/* Simulated Fluid Tube Graphic */}
                <div className="w-24 h-40 bg-slate-100 border-4 border-slate-200 rounded-2xl relative overflow-hidden my-4 shadow-inner">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between p-2 pointer-events-none opacity-40 text-[9px] text-slate-600 font-mono z-10">
                    <span>100%</span>
                    <span>75%</span>
                    <span>50%</span>
                    <span>25%</span>
                    <span>0%</span>
                  </div>

                  {/* Liquid Body */}
                  <div
                    className={`absolute bottom-0 left-0 right-0 transition-all duration-700 ease-out ${fluidBg}`}
                    style={{ height: `${pct}%` }}
                  >
                    {/* Simulated Liquid Wave animated header */}
                    {pct > 0 && (
                      <div className="absolute -top-1.5 left-0 right-0 h-3 overflow-hidden">
                        <div className="w-[200%] h-full opacity-50 liquid-wave bg-white/20 absolute top-0 left-0"></div>
                        <div className="w-[200%] h-full liquid-wave bg-black/10 absolute top-0 left-0"></div>
                      </div>
                    )}
                  </div>

                  {/* Percentage float overlay */}
                  <div className="absolute inset-0 flex items-center justify-center font-bold text-sm text-slate-900 drop-shadow-sm z-20">
                    {Math.round(pct)}%
                  </div>
                </div>

                {/* Tank stats */}
                <div className="w-full text-center space-y-1 z-10">
                  <p className="text-xs text-slate-800 font-mono font-bold">
                    {tank.volumeAtual.toLocaleString()} / {tank.capacidadeMaxima.toLocaleString()} L
                  </p>
                  <p className={`text-[10px] font-medium uppercase tracking-wider ${fluidColorText}`}>
                    {isCritical ? "CRÍTICO! ABASTECER" : pct < 40 ? "Estoque Baixo" : "Estoque Seguro"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Shift and Checklist Quick view */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Shift Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 font-display pb-3 border-b border-slate-100">
              <UserCheck className="text-indigo-600 h-5 w-5" />
              Turno Operacional Ativo
            </h3>

            {activeShift ? (
              <div className="mt-4 space-y-4">
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-xs text-slate-500">Responsável de Pista</p>
                    <p className="text-sm font-bold text-slate-800">{activeShift.frentistaResponsavel}</p>
                  </div>
                  <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[11px] font-semibold px-2.5 py-1 rounded-full animate-pulse">
                    {activeShift.turno}
                  </span>
                </div>

                {/* Checklist display */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Checklist de Segurança e Limpeza
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <span className={`h-2.5 w-2.5 rounded-full ${activeShift.checklist.limpezaPistas ? "bg-emerald-500" : "bg-rose-500"}`} />
                      <span className="text-slate-600">Limpeza de Pistas</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <span className={`h-2.5 w-2.5 rounded-full ${activeShift.checklist.usoEPIs ? "bg-emerald-500" : "bg-rose-500"}`} />
                      <span className="text-slate-600">Uso de EPIs</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <span className={`h-2.5 w-2.5 rounded-full ${activeShift.checklist.afericaoEquipamentosSeguranca ? "bg-emerald-500" : "bg-rose-500"}`} />
                      <span className="text-slate-600">Equipamentos ANP</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <span className={`h-2.5 w-2.5 rounded-full ${activeShift.checklist.testeGerador ? "bg-emerald-500" : "bg-rose-500"}`} />
                      <span className="text-slate-600">Teste do Gerador</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-8 text-center text-slate-500 py-6">
                <HelpCircle className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm">Nenhum turno operacional em andamento no momento.</p>
                <button
                  onClick={() => onNavigate("escalas")}
                  className="mt-3 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  Abrir Novo Turno
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => onNavigate("escalas")}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              Ver Todas as Escalas →
            </button>
          </div>
        </div>

        {/* Quality control quick compliance list */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 font-display pb-3 border-b border-slate-100">
              <Thermometer className="text-indigo-600 h-5 w-5" />
              Controle de Qualidade ANP Diário
            </h3>

            {qualityAudits.length > 0 ? (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-slate-500">Últimas aferições técnicas registradas:</p>
                <div className="divide-y divide-slate-100 space-y-2">
                  {qualityAudits.slice(-3).reverse().map((audit) => (
                    <div key={audit.id} className="flex justify-between items-center pt-2 text-xs">
                      <div>
                        <span className="font-semibold text-slate-800">{audit.combustivel}</span>
                        <p className="text-[10px] text-slate-500 font-mono">
                          Temp: {audit.temperatura}°C | Densidade: {audit.densidade} g/cm³
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                          audit.conforme
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-rose-50 text-rose-700 border border-rose-100"
                        }`}
                      >
                        {audit.conforme ? "CONFORME" : "NÃO CONFORME"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-8 text-center text-slate-500 py-6">
                <HelpCircle className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm">Nenhum teste de qualidade ANP registrado hoje.</p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
            <span className="text-[11px] text-slate-500">Padrão ANP máximo de Etanol: 27%</span>
            <button
              onClick={() => onNavigate("qualidade")}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              Registrar Qualidade / Aferição →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
