/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { FuelTank, AppState } from "../types";
import {
  Ruler,
  Fuel,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Table,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Search,
  ChevronDown,
  Info,
} from "lucide-react";

export interface TankModelProfile {
  id: string;
  name: string;
  nominalCapacity: number; // Liters
  maxHeightCm: number; // Centimeters
  description: string;
}

export const TANK_PROFILES: TankModelProfile[] = [
  {
    id: "trn_10k",
    name: "Tanque 10.000 L (TRN V-1 / V-2 / V-3)",
    nominalCapacity: 10000,
    maxHeightCm: 254,
    description: "Tabela TRN V-1/V-2/V-3 - Diâmetro nominal 2,54m - 10.000 Litros",
  },
  {
    id: "trn_15k",
    name: "Tanque 15.000 L (TRN 30SC / 30JC)",
    nominalCapacity: 15000,
    maxHeightCm: 250,
    description: "Tabela TRN 30SC/30JC - Compartimento de 15.000 Litros",
  },
  {
    id: "trn_20k",
    name: "Tanque 20.000 L (TRN V-1 / V-2)",
    nominalCapacity: 20000,
    maxHeightCm: 254,
    description: "Tabela TRN V-1/V-2 - Diâmetro nominal 2,54m - 20.000 Litros",
  },
  {
    id: "trn_30k",
    name: "Tanque 30.000 L (TRN 30S / 30J)",
    nominalCapacity: 30000,
    maxHeightCm: 250,
    description: "Tabela TRN 30S/30J - Capacidade nominal 30.000 Litros",
  },
  {
    id: "custom",
    name: "Outro / Personalizado",
    nominalCapacity: 15000,
    maxHeightCm: 250,
    description: "Capacidade e altura customizáveis pelo usuário",
  },
];

/**
 * Calculates volume in liters for a given height in cm using cylindrical segment geometry
 */
export function getLitersFromCm(
  cm: number,
  capacity: number,
  maxHeightCm: number = 250
): number {
  if (cm <= 0) return 0;
  if (cm >= maxHeightCm) return capacity;

  const h = Math.min(cm, maxHeightCm);
  const ratio = h / maxHeightCm;

  // Horizontal cylinder cross-section formula
  const alpha = Math.acos(1 - 2 * ratio);
  const fraction =
    (alpha - (1 - 2 * ratio) * Math.sqrt(4 * ratio * (1 - ratio))) / Math.PI;

  return Math.round(fraction * capacity * 10) / 10;
}

/**
 * Calculates dipstick height in cm given volume in liters
 */
export function getCmFromLiters(
  liters: number,
  capacity: number,
  maxHeightCm: number = 250
): number {
  if (liters <= 0) return 0;
  if (liters >= capacity) return maxHeightCm;

  const targetFraction = Math.min(1, Math.max(0, liters / capacity));

  // Binary search for exact cm match
  let low = 0;
  let high = maxHeightCm;
  for (let i = 0; i < 28; i++) {
    const mid = (low + high) / 2;
    const ratio = mid / maxHeightCm;
    const alpha = Math.acos(1 - 2 * ratio);
    const fraction =
      (alpha - (1 - 2 * ratio) * Math.sqrt(4 * ratio * (1 - ratio))) / Math.PI;
    if (fraction < targetFraction) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return Math.round(((low + high) / 2) * 10) / 10;
}

interface DipstickTankCalculatorProps {
  appState: AppState;
  onUpdateTanks?: (tanks: FuelTank[]) => void;
}

export default function DipstickTankCalculator({
  appState,
  onUpdateTanks,
}: DipstickTankCalculatorProps) {
  const { tanks = [] } = appState;

  // Selection mode: linked tank or standalone model
  const [selectedTankId, setSelectedTankId] = useState<string>("");
  const [selectedProfileId, setSelectedProfileId] = useState<string>("trn_15k");

  // Custom parameters if profile is "custom"
  const [customCapacity, setCustomCapacity] = useState<number>(15000);
  const [customMaxHeight, setCustomMaxHeight] = useState<number>(250);

  // Active Height input in CM
  const [heightCm, setHeightCm] = useState<number>(156);

  // Additional fuel to be received (L) for forecast
  const [addedFuelLiters, setAddedFuelLiters] = useState<number>(5000);

  // View state for calibration table matrix
  const [showFullTable, setShowFullTable] = useState<boolean>(false);
  const [tableSearchCm, setTableSearchCm] = useState<string>("");

  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>("");

  // Determine current active capacity & max height
  const activeProfile = useMemo(() => {
    return TANK_PROFILES.find((p) => p.id === selectedProfileId) || TANK_PROFILES[1];
  }, [selectedProfileId]);

  const activeCapacity = useMemo(() => {
    if (selectedProfileId === "custom") return customCapacity;
    return activeProfile.nominalCapacity;
  }, [selectedProfileId, customCapacity, activeProfile]);

  const activeMaxHeight = useMemo(() => {
    if (selectedProfileId === "custom") return customMaxHeight;
    return activeProfile.maxHeightCm;
  }, [selectedProfileId, customMaxHeight, activeProfile]);

  // When selecting a linked tank from appState
  const handleSelectTank = (tankId: string) => {
    setSelectedTankId(tankId);
    if (!tankId) return;

    const tank = tanks.find((t) => t.id === tankId);
    if (tank) {
      // Find closest profile or set custom
      const matchedProfile = TANK_PROFILES.find(
        (p) => p.nominalCapacity === tank.capacidadeMaxima
      );
      if (matchedProfile) {
        setSelectedProfileId(matchedProfile.id);
      } else {
        setSelectedProfileId("custom");
        setCustomCapacity(tank.capacidadeMaxima);
        setCustomMaxHeight(250);
      }

      // Calculate current height cm from existing volume
      const currentCm = getCmFromLiters(tank.volumeAtual, tank.capacidadeMaxima, 250);
      setHeightCm(currentCm);
    }
  };

  // Calculations
  const currentLiters = useMemo(() => {
    return getLitersFromCm(heightCm, activeCapacity, activeMaxHeight);
  }, [heightCm, activeCapacity, activeMaxHeight]);

  const currentPercent = useMemo(() => {
    return Math.min(100, Math.max(0, (currentLiters / activeCapacity) * 100));
  }, [currentLiters, activeCapacity]);

  const currentUllageLiters = useMemo(() => {
    return Math.max(0, activeCapacity - currentLiters);
  }, [activeCapacity, currentLiters]);

  // Forecast Calculations
  const forecastLiters = useMemo(() => {
    return currentLiters + addedFuelLiters;
  }, [currentLiters, addedFuelLiters]);

  const forecastCm = useMemo(() => {
    return getCmFromLiters(forecastLiters, activeCapacity, activeMaxHeight);
  }, [forecastLiters, activeCapacity, activeMaxHeight]);

  const forecastPercent = useMemo(() => {
    return Math.min(100, Math.max(0, (forecastLiters / activeCapacity) * 100));
  }, [forecastLiters, activeCapacity]);

  const isOverflowRisk = forecastLiters > activeCapacity;
  const overflowExcessLiters = isOverflowRisk ? forecastLiters - activeCapacity : 0;
  const maxSafeDeliveryLiters = currentUllageLiters;

  // Save/sync calculated volume to the linked tank
  const handleSyncToTank = () => {
    if (!selectedTankId || !onUpdateTanks) return;
    const targetTank = tanks.find((t) => t.id === selectedTankId);
    if (!targetTank) return;

    const updatedTanks = tanks.map((t) => {
      if (t.id === selectedTankId) {
        return {
          ...t,
          volumeAtual: Math.round(currentLiters),
          observacoes: `Medição via régua (${heightCm} cm = ${Math.round(currentLiters)}L) atualizada em ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        };
      }
      return t;
    });

    onUpdateTanks(updatedTanks);
    setSaveSuccessMsg(`Medição de ${heightCm} cm (${Math.round(currentLiters)} L) salva no ${targetTank.identificador}!`);
    setTimeout(() => setSaveSuccessMsg(""), 4000);
  };

  // Matrix lookup table data generation (0 cm to maxHeight)
  const matrixTableData = useMemo(() => {
    const rows = [];
    const stepStart = 0;
    const stepEnd = Math.ceil(activeMaxHeight / 10) * 10;

    for (let rowBase = stepStart; rowBase <= stepEnd; rowBase += 10) {
      if (rowBase > activeMaxHeight) break;
      const cols = [];
      for (let digit = 0; digit <= 9; digit++) {
        const cmVal = rowBase + digit;
        if (cmVal <= activeMaxHeight) {
          const lit = getLitersFromCm(cmVal, activeCapacity, activeMaxHeight);
          cols.push({ cm: cmVal, liters: lit });
        } else {
          cols.push(null);
        }
      }
      rows.push({ baseCm: rowBase, cols });
    }
    return rows;
  }, [activeCapacity, activeMaxHeight]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-lg overflow-hidden space-y-0">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300">
                <Ruler className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                  Tabelas de Medição de Régua de Tanque (TRN)
                </h2>
                <p className="text-xs text-indigo-200 mt-0.5 font-medium">
                  Conversão exata Centímetros (cm) ➔ Litros (L) & Cálculo de Previsão para Chegada de Caminhão
                </p>
              </div>
            </div>
          </div>

          {/* Preset tank selector from App State */}
          {tanks.length > 0 && (
            <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/15 flex items-center gap-2 w-full md:w-auto">
              <Fuel className="h-4 w-4 text-indigo-300 shrink-0 ml-1" />
              <select
                value={selectedTankId}
                onChange={(e) => handleSelectTank(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-2 w-full md:w-56"
              >
                <option value="" className="text-slate-800">
                  -- Vincular a um Tanque do Posto --
                </option>
                {tanks.map((t) => (
                  <option key={t.id} value={t.id} className="text-slate-800">
                    {t.identificador} ({t.combustivel} - {t.capacidadeMaxima.toLocaleString()}L)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="bg-emerald-50 border-b border-emerald-200 p-3.5 text-xs font-bold text-emerald-800 flex items-center justify-between animate-fade-in px-6">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {saveSuccessMsg}
          </span>
          <button
            onClick={() => setSaveSuccessMsg("")}
            className="text-emerald-700 hover:text-emerald-900 font-black cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="p-6 space-y-6">
        
        {/* Model & Nominal Capacity Selector */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div className="md:col-span-8 space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
              Selecione o Modelo / Tabela da Capacidade Nominal
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TANK_PROFILES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedProfileId(p.id);
                    setSelectedTankId("");
                  }}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                    selectedProfileId === p.id
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/10"
                      : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100/80"
                  }`}
                >
                  <span className="text-xs font-black truncate">{p.name}</span>
                  <span
                    className={`text-[10px] mt-1 font-mono ${
                      selectedProfileId === p.id ? "text-indigo-100" : "text-slate-500"
                    }`}
                  >
                    Cap: {p.nominalCapacity.toLocaleString()} L | H: {p.maxHeightCm} cm
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Parameters or Active Info */}
          <div className="md:col-span-4 bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col justify-center space-y-2">
            {selectedProfileId === "custom" ? (
              <>
                <h4 className="text-xs font-bold text-slate-700">Parâmetros Customizados</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block font-bold">Capacidade (L)</label>
                    <input
                      type="number"
                      value={customCapacity}
                      onChange={(e) => setCustomCapacity(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block font-bold">Altura Máx (cm)</label>
                    <input
                      type="number"
                      value={customMaxHeight}
                      onChange={(e) => setCustomMaxHeight(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Especificações Ativas</span>
                <div className="text-xs text-slate-800 font-bold">{activeProfile.description}</div>
                <div className="text-[11px] font-mono text-indigo-700 font-bold pt-1">
                  Volume Máximo Nominal: {activeCapacity.toLocaleString()} Litros
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2 Main Columns: Current Dipstick Calculation vs Fuel Delivery Forecast */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* LEFT COLUMN: MEDIÇÃO ATUAL NA RÉGUA */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-indigo-600" />
                  1. Medição Atual na Régua
                </h3>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                  Escala 0 a {activeMaxHeight} cm
                </span>
              </div>

              {/* Height Input (cm) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Informe a Altura Medida na Régua (Centímetros):
                </label>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max={activeMaxHeight}
                      value={heightCm}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setHeightCm(isNaN(val) ? 0 : Math.min(activeMaxHeight, Math.max(0, val)));
                      }}
                      className="w-full px-4 py-3 bg-indigo-50/50 border-2 border-indigo-200 rounded-2xl text-2xl font-mono font-black text-indigo-900 focus:outline-none focus:border-indigo-600 transition pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black text-indigo-400">
                      cm
                    </span>
                  </div>

                  {/* Quick CM Adjustment Buttons */}
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setHeightCm((prev) => Math.max(0, parseFloat((prev - 1).toFixed(1))))}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold text-xs rounded-lg transition"
                      >
                        -1
                      </button>
                      <button
                        type="button"
                        onClick={() => setHeightCm((prev) => Math.min(activeMaxHeight, parseFloat((prev + 1).toFixed(1))))}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold text-xs rounded-lg transition"
                      >
                        +1
                      </button>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setHeightCm((prev) => Math.max(0, parseFloat((prev - 10).toFixed(1))))}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold text-xs rounded-lg transition"
                      >
                        -10
                      </button>
                      <button
                        type="button"
                        onClick={() => setHeightCm((prev) => Math.min(activeMaxHeight, parseFloat((prev + 10).toFixed(1))))}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold text-xs rounded-lg transition"
                      >
                        +10
                      </button>
                    </div>
                  </div>
                </div>

                {/* Range Slider for height */}
                <input
                  type="range"
                  min="0"
                  max={activeMaxHeight}
                  step="0.5"
                  value={heightCm}
                  onChange={(e) => setHeightCm(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-100 rounded-lg"
                />
              </div>

              {/* Calculated Results Display Card */}
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-md space-y-4 relative overflow-hidden">
                <div className="absolute right-3 bottom-1 opacity-10 text-white pointer-events-none">
                  <Fuel className="h-28 w-28" />
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block">
                    Volume Equivalente na Régua ({heightCm} cm)
                  </span>
                  <div className="text-3xl font-mono font-black text-white mt-1 flex items-baseline gap-2">
                    {Math.round(currentLiters).toLocaleString()}
                    <span className="text-sm font-sans text-indigo-200 font-bold">Litros</span>
                  </div>
                </div>

                {/* Visual Level Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono text-indigo-200">
                    <span>Nível de Ocupação:</span>
                    <span className="font-bold text-white">{currentPercent.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 rounded-full transition-all duration-300"
                      style={{ width: `${currentPercent}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-indigo-800/80 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-indigo-300 text-[10px] font-bold block uppercase">Espaço Livre / Folga</span>
                    <span className="font-mono font-extrabold text-emerald-400 text-sm">
                      {Math.round(currentUllageLiters).toLocaleString()} L
                    </span>
                  </div>
                  <div>
                    <span className="text-indigo-300 text-[10px] font-bold block uppercase">Capacidade Total</span>
                    <span className="font-mono font-bold text-slate-200 text-sm">
                      {activeCapacity.toLocaleString()} L
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sync button to update linked tank */}
            {selectedTankId && onUpdateTanks && (
              <button
                type="button"
                onClick={handleSyncToTank}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <RefreshCw className="h-4 w-4" /> Sincronizar Medição no Tanque do Posto
              </button>
            )}
          </div>

          {/* RIGHT COLUMN: PREVISÃO DE MEDIDA PARA QUANDO CHEGAR MAIS COMBUSTÍVEL */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  2. Previsão de Chegada de Combustível (Caminhão / Descarga)
                </h3>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Calculadora Futura
                </span>
              </div>

              {/* Added Fuel Input (Liters) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Informe o Volume de Combustível a Receber (Litros):
                </label>

                <div className="relative">
                  <input
                    type="number"
                    step="500"
                    min="0"
                    value={addedFuelLiters}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setAddedFuelLiters(isNaN(val) ? 0 : Math.max(0, val));
                    }}
                    className="w-full px-4 py-3 bg-emerald-50/50 border-2 border-emerald-200 rounded-2xl text-2xl font-mono font-black text-emerald-950 focus:outline-none focus:border-emerald-600 transition pr-14"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-emerald-600">
                    Litros
                  </span>
                </div>

                {/* Quick Add Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[3000, 5000, 10000, 15000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAddedFuelLiters(preset)}
                      className={`px-3 py-1 text-xs font-mono font-bold rounded-lg border transition cursor-pointer ${
                        addedFuelLiters === preset
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      +{preset.toLocaleString()} L
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAddedFuelLiters(Math.round(currentUllageLiters))}
                    className="px-3 py-1 text-xs font-mono font-bold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 cursor-pointer"
                  >
                    Encher Limite ({Math.round(currentUllageLiters).toLocaleString()}L)
                  </button>
                </div>
              </div>

              {/* Forecast Result Card */}
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  isOverflowRisk
                    ? "bg-rose-50/90 border-rose-300 ring-2 ring-rose-100"
                    : "bg-emerald-50/80 border-emerald-200"
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                      Resultado da Previsão Pós-Descarga
                    </span>
                    <h4 className="text-lg font-black text-slate-900 mt-0.5">
                      Nova Medida Prevista na Régua
                    </h4>
                  </div>

                  {isOverflowRisk ? (
                    <span className="px-2.5 py-1 bg-rose-600 text-white font-black text-[10px] uppercase tracking-wider rounded-lg flex items-center gap-1 animate-pulse shadow-xs">
                      <ShieldAlert className="h-3.5 w-3.5" /> Risco Transbordo
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wider rounded-lg flex items-center gap-1 shadow-xs">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Descarga Segura
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 my-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">
                      Nova Marcação na Régua
                    </span>
                    <span className="text-2xl font-mono font-black text-indigo-700">
                      {forecastCm} <span className="text-xs font-sans text-slate-500">cm</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">
                      Novo Volume Final
                    </span>
                    <span
                      className={`text-2xl font-mono font-black ${
                        isOverflowRisk ? "text-rose-600" : "text-emerald-700"
                      }`}
                    >
                      {Math.round(forecastLiters).toLocaleString()}{" "}
                      <span className="text-xs font-sans text-slate-500">L</span>
                    </span>
                  </div>
                </div>

                {/* Progress level forecast */}
                <div className="space-y-1 mt-2">
                  <div className="flex justify-between text-xs font-mono font-bold text-slate-700">
                    <span>Nível de Ocupação Previsto:</span>
                    <span className={isOverflowRisk ? "text-rose-600" : "text-emerald-700"}>
                      {forecastPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isOverflowRisk ? "bg-rose-600" : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, forecastPercent)}%` }}
                    />
                  </div>
                </div>

                {/* Overflow Safety Warning Box */}
                {isOverflowRisk ? (
                  <div className="mt-4 p-3 bg-rose-100 border border-rose-300 rounded-xl text-xs text-rose-900 space-y-1">
                    <div className="font-extrabold flex items-center gap-1.5 text-rose-800">
                      <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                      ATENÇÃO: A CARGA EXCEDE A CAPACIDADE MÁXIMA DO TANQUE!
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      A descarga de <strong>{addedFuelLiters.toLocaleString()} L</strong> ultrapassará o limite em{" "}
                      <strong className="text-rose-700">{Math.round(overflowExcessLiters).toLocaleString()} Litros</strong>, causando risco crítico de derramamento.
                    </p>
                    <div className="pt-1.5 font-bold text-rose-950 border-t border-rose-200/80">
                      ➜ Descarga Máxima Segura Permitida Agora:{" "}
                      <span className="font-mono text-sm underline text-emerald-800">
                        {Math.round(maxSafeDeliveryLiters).toLocaleString()} Litros
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 p-2.5 bg-emerald-100/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
                    <span className="font-medium text-[11px]">
                      A descarga deixará uma margem de folga de{" "}
                      <strong>{Math.round(activeCapacity - forecastLiters).toLocaleString()} L</strong> no tanque.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* INTERACTIVE FULL CALIBRATION TABLE / TABELA DE RÉGUA TRN */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Table className="h-4 w-4 text-indigo-600" />
                Tabela Oficial de Régua de Medição - TRN ({activeProfile.name})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Consulte a matriz completa de centímetros e milímetros de 0 a {activeMaxHeight} cm
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowFullTable(!showFullTable)}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Table className="h-4 w-4 text-indigo-600" />
              {showFullTable ? "Ocultar Tabela Completa" : "Expandir Tabela Completa TRN"}
              <ChevronDown className={`h-4 w-4 transition duration-200 ${showFullTable ? "rotate-180" : ""}`} />
            </button>
          </div>

          {showFullTable && (
            <div className="space-y-4 pt-2 border-t border-slate-200 animate-fade-in">
              <div className="flex justify-between items-center gap-4 bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrar altura em cm (ex: 150, 156)..."
                    value={tableSearchCm}
                    onChange={(e) => setTableSearchCm(e.target.value)}
                    className="w-full text-xs font-bold text-slate-800 outline-none bg-transparent"
                  />
                </div>
                <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                  Clique em qualquer linha ou célula para carregar a medida na calculadora
                </span>
              </div>

              {/* Table Matrix View */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto max-h-96 shadow-inner">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="p-2.5 border-r border-slate-200 text-center font-mono w-16 bg-slate-200/80">
                        Cm
                      </th>
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                        <th key={digit} className="p-2 text-center font-mono border-r border-slate-200/60 min-w-16">
                          +{digit} cm
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 font-mono text-[11px]">
                    {matrixTableData
                      .filter((row) => {
                        if (!tableSearchCm) return true;
                        const s = tableSearchCm.trim();
                        return (
                          row.baseCm.toString().includes(s) ||
                          row.cols.some((c) => c && c.cm.toString().includes(s))
                        );
                      })
                      .map((row) => (
                        <tr key={row.baseCm} className="hover:bg-indigo-50/50 transition">
                          <td className="p-2 font-black text-center bg-slate-100/80 border-r border-slate-200 text-slate-800">
                            {row.baseCm}
                          </td>
                          {row.cols.map((col, idx) => {
                            if (!col) {
                              return <td key={idx} className="p-2 border-r border-slate-100 bg-slate-50/50" />;
                            }
                            const isSelected = Math.round(heightCm) === col.cm;
                            return (
                              <td
                                key={idx}
                                onClick={() => setHeightCm(col.cm)}
                                className={`p-2 text-center border-r border-slate-200/60 cursor-pointer transition ${
                                  isSelected
                                    ? "bg-indigo-600 text-white font-black shadow-xs"
                                    : "hover:bg-indigo-100/80 text-slate-700"
                                }`}
                                title={`Clique para selecionar ${col.cm} cm (${col.liters.toLocaleString()} L)`}
                              >
                                {Math.round(col.liters).toLocaleString()}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
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
