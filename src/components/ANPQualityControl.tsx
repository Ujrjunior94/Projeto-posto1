/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AppState, NozzleCalibration, ANPQualityAudit, FuelType } from "../types";
import { Thermometer, ShieldAlert, CheckCircle, Activity, Plus, Gauge, Sparkles, AlertTriangle } from "lucide-react";
import { FUEL_TYPES } from "./TanksManagement";

interface ANPQualityControlProps {
  appState: AppState;
  userRole: string;
  onUpdateCalibrations: (calibrations: NozzleCalibration[]) => void;
  onUpdateQualityAudits: (audits: ANPQualityAudit[]) => void;
}

export default function ANPQualityControl({
  appState,
  userRole,
  onUpdateCalibrations,
  onUpdateQualityAudits,
}: ANPQualityControlProps) {
  const { calibrations, qualityAudits, nozzles } = appState;
  const isReadOnly = userRole === "Frentista";

  // Nozzle calibration state
  const [calNozzleId, setCalNozzleId] = useState("");
  const [calVolumeMedido, setCalVolumeMedido] = useState(20.0);
  const [calDesvioMl, setCalDesvioMl] = useState(0); // in mL (-100 to 100)
  const [calOperador, setCalOperador] = useState("");

  // Chemical quality audit state
  const [qCombustivel, setQCombustivel] = useState<FuelType>("Gasolina Comum");
  const [qDensidade, setQDensidade] = useState(0.742); // g/cm3
  const [qTemperatura, setQTemperatura] = useState(23.0); // °C
  const [qTeorEtanol, setQTeorEtanol] = useState(27); // % (only applies to gasolines)
  const [qAspecto, setQAspecto] = useState<"Límpido e Isento" | "Turvo" | "Com Impurezas">("Límpido e Isento");
  const [qImpurezas, setQImpurezas] = useState(false);
  const [qResponsavel, setQResponsavel] = useState("");

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Handle Nozzle Flow Test registration (Aferição de bico 20L)
  const handleCreateCalibration = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!calNozzleId) {
      setError("Selecione o bico correspondente.");
      return;
    }

    // Official ANP calibration rule: deviation must be within +-60ml
    const conforme = calDesvioMl >= -60 && calDesvioMl <= 60;

    const newCal: NozzleCalibration = {
      id: "cal_" + Date.now(),
      data: new Date().toISOString().split("T")[0],
      nozzleId: calNozzleId,
      volumeMedido: Number(calVolumeMedido),
      desvioMl: Number(calDesvioMl),
      conforme,
      operadorResponsavel: calOperador || "Supervisor Geral",
    };

    onUpdateCalibrations([...calibrations, newCal]);
    setSuccess(
      conforme
        ? "Aferição de bico salva: Bico califrado conforme norma técnica (desvio: " + calDesvioMl + " ml)."
        : "Alerta: Aferição salva! O bico está FORA dos padrões ANP (+-60ml). Acione a manutenção!"
    );
    setTimeout(() => setSuccess(""), 4000);
  };

  // Handle ANP Fuel Quality Audit registration
  const handleCreateQualityAudit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Rules:
    // 1. Gasolines (Gasolina Comum, Gasolina Aditivada) can have up to 27% ethanol (ANP official legal limit)
    // 2. Aspect must be "Límpido e Isento"
    // 3. No impurities allowed
    const ethanolOk = qCombustivel.includes("Gasolina") ? qTeorEtanol <= 27 : true;
    const aspectOk = qAspecto === "Límpido e Isento";
    const impuritiesOk = !qImpurezas;

    const conforme = ethanolOk && aspectOk && impuritiesOk;

    const newAudit: ANPQualityAudit = {
      id: "qa_" + Date.now(),
      data: new Date().toISOString().split("T")[0],
      combustivel: qCombustivel,
      densidade: Number(qDensidade),
      temperatura: Number(qTemperatura),
      teorEtanol: qCombustivel.includes("Gasolina") ? Number(qTeorEtanol) : 0,
      aspectoVisual: qAspecto,
      presencaImpurezas: qImpurezas,
      conforme,
      responsavelTecnico: qResponsavel || "Químico Técnico",
    };

    onUpdateQualityAudits([...qualityAudits, newAudit]);
    setSuccess(
      conforme
        ? "Laudo de Qualidade ANP gerado: Combustível CONFORME com as normas técnicas."
        : "Atenção: Laudo técnico registrado como NÃO CONFORME! Envie notificação imediata à gerência."
    );
    setTimeout(() => setSuccess(""), 4500);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 font-display">
            <Thermometer className="text-indigo-600 h-6 w-6" />
            Controle de Qualidade ANP & Aferições
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gere laudos de densidade, temperatura, teor de etanol e execute o teste de aferição de 20L de bico
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module A: 20L Flow Calibration */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
            <Gauge className="text-indigo-600 h-5 w-5" />
            Aferição Física de Vazão (Teste de 20 Litros)
          </h3>
          <p className="text-xs text-slate-500">
            A cada turno ou semanalmente, é obrigatório extrair 20 litros exatos do bico no galão aferidor certificado do INMETRO. O desvio mecânico máximo aceito por lei é de **+-60ml** (ou -0.3% a +0.3%).
          </p>

          <form onSubmit={handleCreateCalibration} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Bico de Bomba *
                </label>
                <select
                  required
                  value={calNozzleId}
                  onChange={(e) => setCalNozzleId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">Selecione o Bico</option>
                  {nozzles.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.numeroBico} ({n.bombaAssociada})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Volume Galão (L)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  disabled
                  value={calVolumeMedido}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 text-sm cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Desvio Medido (ml) *
                </label>
                <input
                  type="number"
                  required
                  value={calDesvioMl}
                  onChange={(e) => setCalDesvioMl(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Ex: -30"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Valores negativos indicam falta de produto; positivos indicam excesso.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Operador Técnico *
                </label>
                <input
                  type="text"
                  required
                  value={calOperador}
                  onChange={(e) => setCalOperador(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Ex: Carlos Santos"
                />
              </div>
            </div>

            {/* Quick Live Preview Verdict */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">Veredicto de Calibração:</span>
              <span
                className={`text-xs font-bold font-mono px-3 py-1 rounded-full ${
                  calDesvioMl >= -60 && calDesvioMl <= 60
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse"
                }`}
              >
                {calDesvioMl >= -60 && calDesvioMl <= 60 ? "DENTRO DOS LIMITES (+-60ml)" : "FORA DE CALIBRAÇÃO!"}
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-lg transition cursor-pointer"
            >
              Registrar Aferição de Bomba
            </button>
          </form>
        </div>

        {/* Module B: Chemical Quality (ANP) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
            <Sparkles className="text-indigo-600 h-5 w-5" />
            Laudo Químico de Qualidade ANP
          </h3>
          <p className="text-xs text-slate-500">
            A regulamentação ANP brasileira estabelece que a Gasolina Comum ou Aditivada deve possuir teor de etanol anidro de **até 27%**, aspecto visual límpido/isento e ausência total de água ou sedimentos.
          </p>

          <form onSubmit={handleCreateQualityAudit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Combustível Amostrado *
                </label>
                <select
                  value={qCombustivel}
                  onChange={(e) => setQCombustivel(e.target.value as FuelType)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  {FUEL_TYPES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Densidade (g/cm³) *
                </label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={qDensidade}
                  onChange={(e) => setQDensidade(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Temp. (°C) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={qTemperatura}
                  onChange={(e) => setQTemperatura(Number(e.target.value))}
                  className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5" title="Apenas Gasolina">
                  Etanol (%) *
                </label>
                <input
                  type="number"
                  required
                  disabled={!qCombustivel.includes("Gasolina")}
                  value={qCombustivel.includes("Gasolina") ? qTeorEtanol : 0}
                  onChange={(e) => setQTeorEtanol(Number(e.target.value))}
                  className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm font-mono disabled:opacity-40 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Aspecto Visual *
                </label>
                <select
                  value={qAspecto}
                  onChange={(e) => setQAspecto(e.target.value as any)}
                  className="w-full px-1 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="Límpido e Isento">Límpido/Isento</option>
                  <option value="Turvo">Turvo</option>
                  <option value="Com Impurezas">Impurezas</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={qImpurezas}
                  onChange={(e) => setQImpurezas(e.target.checked)}
                  className="rounded bg-white border-slate-200 h-4 w-4 text-indigo-600 focus:ring-0 cursor-pointer"
                />
                Há presença de impurezas sólidas flutuantes?
              </label>

              <div className="w-1/2">
                <input
                  type="text"
                  required
                  value={qResponsavel}
                  onChange={(e) => setQResponsavel(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Nome do Químico"
                />
              </div>
            </div>

            {/* Verdict Live preview */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">Veredicto Químico ANP:</span>
              <span
                className={`text-xs font-bold font-mono px-3 py-1 rounded-full ${
                  (!qCombustivel.includes("Gasolina") || qTeorEtanol <= 27) && qAspecto === "Límpido e Isento" && !qImpurezas
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse"
                }`}
              >
                {(!qCombustivel.includes("Gasolina") || qTeorEtanol <= 27) && qAspecto === "Límpido e Isento" && !qImpurezas
                  ? "COMBUSTÍVEL EM CONFORMIDADE (OK)"
                  : "NÃO CONFORME! CONTAMINADO"}
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-lg transition shadow-md shadow-emerald-500/10 cursor-pointer"
            >
              Emitir Laudo ANP Conforme
            </button>
          </form>
        </div>
      </div>

      {/* Historical Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calibrations Table */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">
            Histórico de Aferição de Bicos (20L)
          </h3>
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {calibrations.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Nenhuma aferição física registrada ainda.</p>
            ) : (
              calibrations
                .slice()
                .reverse()
                .map((cal) => {
                  const b = nozzles.find((nozzle) => nozzle.id === cal.nozzleId);
                  return (
                    <div
                      key={cal.id}
                      className={`p-3 rounded-xl border flex justify-between items-center text-xs ${
                        cal.conforme ? "bg-slate-50 border-slate-100" : "bg-rose-50 border-rose-100"
                      }`}
                    >
                      <div>
                        <span className="font-bold text-slate-800">Bico: {b ? b.numeroBico : "Bico Geral"}</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Técnico: {cal.operadorResponsavel} | Data: {cal.data}
                        </p>
                      </div>

                      <div className="text-right">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] block ${
                            cal.conforme
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-rose-50 text-rose-700 border border-rose-100 animate-pulse"
                          }`}
                        >
                          {cal.desvioMl > 0 ? `+${cal.desvioMl}` : cal.desvioMl} ml {cal.conforme ? "(Aprovado)" : "(Rejeitado)"}
                        </span>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Quality Audits Table */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">
            Histórico de Conformidade Químico ANP
          </h3>
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {qualityAudits.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Nenhum laudo químico emitido hoje.</p>
            ) : (
              qualityAudits
                .slice()
                .reverse()
                .map((audit) => (
                  <div
                    key={audit.id}
                    className={`p-3 rounded-xl border ${
                      audit.conforme ? "bg-slate-50 border-slate-100" : "bg-rose-50 border-rose-100"
                    } text-xs`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-800">{audit.combustivel}</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Data: {audit.data} | Resp: {audit.responsavelTecnico}
                        </p>
                      </div>

                      <span
                        className={`font-semibold px-2 py-0.5 rounded text-[10px] uppercase ${
                          audit.conforme
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-rose-50 text-rose-700 border border-rose-100 animate-pulse"
                        }`}
                      >
                        {audit.conforme ? "CONFORME ANP" : "FORA DE PADRÃO"}
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-slate-500 bg-white p-1.5 rounded border border-slate-100">
                      <div>Densidade: {audit.densidade}</div>
                      <div>Temp: {audit.temperatura}°C</div>
                      {audit.combustivel.includes("Gasolina") && <div>Teor Etanol: {audit.teorEtanol}%</div>}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
