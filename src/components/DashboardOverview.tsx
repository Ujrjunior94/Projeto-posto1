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
    <div className="space-y-6">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-slate-300 transition">
          <div className="absolute top-0 right-0 p-4 opacity-15 text-indigo-600 group-hover:scale-110 transition">
            <Droplet className="h-16 w-16" />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Volume Total Vendido</p>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-display">
            {totalLitersSold.toLocaleString("pt-BR")} L
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Soma acumulada de encerrantes de bico
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-slate-300 transition">
          <div className="absolute top-0 right-0 p-4 opacity-15 text-emerald-600 group-hover:scale-110 transition">
            <Fuel className="h-16 w-16" />
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
            let fluidBg = "from-indigo-500 to-indigo-600";
            let fluidColorText = "text-indigo-600";
            let borderColor = "border-slate-200";
            
            if (isCritical) {
              fluidBg = "from-rose-500 to-rose-600";
              fluidColorText = "text-rose-600 animate-pulse";
              borderColor = "border-rose-200";
            } else if (pct < 40) {
              fluidBg = "from-amber-400 to-amber-500";
              fluidColorText = "text-amber-600";
              borderColor = "border-amber-200";
            } else if (tank.combustivel.includes("Gasolina Comum")) {
              fluidBg = "from-yellow-400 to-amber-500";
              fluidColorText = "text-amber-600";
              borderColor = "border-amber-200";
            } else if (tank.combustivel.includes("Gasolina Aditivada")) {
              fluidBg = "from-orange-500 to-red-600";
              fluidColorText = "text-orange-600";
              borderColor = "border-orange-250";
            } else if (tank.combustivel.includes("Etanol")) {
              fluidBg = "from-sky-400 to-sky-500";
              fluidColorText = "text-sky-600";
              borderColor = "border-sky-200";
            } else if (tank.combustivel.includes("Diesel")) {
              fluidBg = "from-emerald-500 to-emerald-600";
              fluidColorText = "text-emerald-600";
              borderColor = "border-emerald-250";
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

                {/* Simulated Fluid Cylinder Graphic */}
                <div className="w-24 h-40 bg-slate-100 border-2 border-slate-300 rounded-b-[20px] relative overflow-hidden my-4 shadow-inner flex flex-col justify-end">
                  {/* Cylinder Top Rim */}
                  <div className="absolute top-0 left-0 right-0 h-4 bg-slate-200 border-b border-slate-300/60 rounded-full z-20 shadow-sm" />
                  
                  {/* Cylinder Glass Gloss reflection */}
                  <div className="absolute inset-y-0 left-3.5 w-2 bg-white/20 z-20 pointer-events-none" />

                  {/* Liquid Body */}
                  <div
                    className={`absolute bottom-0 left-0 right-0 rounded-b-[18px] bg-gradient-to-t ${fluidBg} transition-all duration-1000 ease-in-out`}
                    style={{ height: `${pct}%` }}
                  >
                    {/* Liquid Top Surface Oval */}
                    {pct > 0 && (
                      <div 
                        className="absolute -top-1.5 left-0 right-0 h-3 bg-white/30 rounded-full z-10"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.3)' }}
                      />
                    )}

                    {/* Liquid Wave Animation Overlay */}
                    {pct > 0 && (
                      <div className="absolute inset-0 overflow-hidden opacity-35">
                        <div className="w-[200%] h-full liquid-wave bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1200 120%22 preserveAspectRatio=%22none%22><path d=%22M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,42.4V0Z%22 fill=%22%23ffffff%22></path></svg>')] bg-repeat-x bg-[length:300px_30px] absolute -top-1 left-0" />
                      </div>
                    )}
                  </div>

                  {/* Percentage overlay indicator */}
                  <div className="absolute inset-0 flex items-center justify-center font-bold text-sm text-slate-800 drop-shadow-xs z-20">
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
