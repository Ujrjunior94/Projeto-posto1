/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AppState, NozzleCalibration, ANPQualityAudit, FuelType, FuelDelivery } from "../types";
import {
  Thermometer,
  ShieldAlert,
  CheckCircle,
  Plus,
  Gauge,
  Sparkles,
  Truck,
  Download,
  Trash2,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { FUEL_TYPES } from "./TanksManagement";

interface ANPQualityControlProps {
  appState: AppState;
  userRole: string;
  cnpjPosto: string;
  onUpdateCalibrations: (calibrations: NozzleCalibration[]) => void;
  onUpdateQualityAudits: (audits: ANPQualityAudit[]) => void;
  onUpdateDeliveries: (deliveries: FuelDelivery[]) => void;
  onAddAuditLog: (actionType: string, target: string, details: string, status: string) => void;
}

export default function ANPQualityControl({
  appState,
  userRole,
  cnpjPosto,
  onUpdateCalibrations,
  onUpdateQualityAudits,
  onUpdateDeliveries,
  onAddAuditLog,
}: ANPQualityControlProps) {
  const { calibrations = [], qualityAudits = [], nozzles = [], deliveries = [] } = appState;
  const fuelDeliveries = deliveries;
  const isReadOnly = userRole === "Frentista";

  // Active view inside Quality tab: "afericao" (Calibrations), "laudo" (Chemical Quality), "entregas" (Fuel Deliveries)
  const [activeSubTab, setActiveSubTab] = useState<"afericao" | "laudo" | "entregas">("afericao");

  // Selection state for batch actions
  const [selectedCalibrations, setSelectedCalibrations] = useState<{ [key: string]: boolean }>({});

  // Nozzle calibration form state
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

  // Deliveries state
  const [delDate, setDelDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [delNfe, setDelNfe] = useState("");
  const [delCombustivel, setDelCombustivel] = useState<FuelType>("Gasolina Comum");
  const [delVolume, setDelVolume] = useState(10000);
  const [delPlaca, setDelPlaca] = useState("");
  const [delMotorista, setDelMotorista] = useState("");

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // ANP deviation rules: acceptable standard deviation is +-60ml in 20L.
  const handleCreateCalibration = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!calNozzleId) {
      setError("Selecione o bico correspondente.");
      return;
    }

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
    onAddAuditLog("CREATE", "Qualidade", `Registrou aferição física de 20L para o bico ${calNozzleId}. Desvio: ${calDesvioMl}ml`, "Regular");

    setSuccess(
      conforme
        ? `Aferição de bico salva: Conforme padrão INMETRO (desvio: ${calDesvioMl} ml).`
        : `ALERTA: Aferição salva! O bico está FORA dos limites técnicos de +-60ml.`
    );
    setTimeout(() => setSuccess(""), 4000);
  };

  const handleCreateQualityAudit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Rules:
    // 1. Gasoline can have up to 27% ethanol (official legal maximum)
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
    onAddAuditLog("CREATE", "Qualidade", `Emitiu laudo químico ANP para ${qCombustivel}. Status: ${conforme ? "Aprovado" : "Reprovado"}`, "Regular");

    setSuccess(
      conforme
        ? "Laudo de Qualidade ANP gerado: Combustível em total CONFORMIDADE com portarias químicas."
        : "Alerta: Laudo de qualidade reprovado! Envie notificação imediata à distribuidora."
    );
    setTimeout(() => setSuccess(""), 4500);
  };

  const handleCreateDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!delNfe.trim() || !delMotorista.trim() || !delPlaca.trim()) {
      alert("Preencha todos os campos da NF-e.");
      return;
    }

    const newDel: FuelDelivery = {
      id: "del_" + Date.now(),
      data: delDate,
      nfe: delNfe,
      combustivel: delCombustivel,
      volumeRecebido: Number(delVolume),
      placaCaminhao: delPlaca,
      motorista: delMotorista,
      stationCnpj: cnpjPosto,
    };

    onUpdateDeliveries([...fuelDeliveries, newDel]);
    onAddAuditLog("CREATE", "Estoque", `Recebeu carga de combustível NF-e ${delNfe}: ${delVolume}L de ${delCombustivel}`, "Regular");

    setSuccess(`Carga de combustível registrada com sucesso! NF-e ${delNfe}.`);
    setTimeout(() => setSuccess(""), 3000);

    setDelNfe("");
    setDelMotorista("");
    setDelPlaca("");
  };

  const handleDeleteDelivery = (id: string) => {
    if (confirm("Deseja remover o registro desta entrega?")) {
      const filtered = fuelDeliveries.filter((d) => d.id !== id);
      onUpdateDeliveries(filtered);
      onAddAuditLog("DELETE", "Estoque", `Excluiu recebimento de carga ID ${id}`, "Regular");
    }
  };

  // Export selected calibrations to CSV
  const handleExportSelectedCSV = () => {
    const selectedIds = Object.keys(selectedCalibrations).filter((id) => selectedCalibrations[id]);
    if (selectedIds.length === 0) {
      alert("Selecione ao menos uma aferição na tabela abaixo para exportar.");
      return;
    }

    const rowsToExport = calibrations.filter((c) => selectedIds.includes(c.id));
    let csvContent = "data:text/csv;charset=utf-8,ID,Data,Bico,VolumeMedido,DesvioMl,Conforme,Responsavel\n";

    rowsToExport.forEach((c) => {
      csvContent += `${c.id},${c.data},${c.nozzleId},${c.volumeMedido},${c.desvioMl},${c.conforme ? "SIM" : "NAO"},${c.operadorResponsavel}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const downloadLink = document.createElement("a");
    downloadLink.setAttribute("href", encodedUri);
    downloadLink.setAttribute("download", `afericoes_bico_export.csv`);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();

    onAddAuditLog("DOWNLOAD", "Qualidade", `Exportou CSV com ${rowsToExport.length} aferições de vazão`, "Regular");
  };

  const handleSelectAllCalibrations = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const newSel: { [key: string]: boolean } = {};
      calibrations.forEach((c) => {
        newSel[c.id] = true;
      });
      setSelectedCalibrations(newSel);
    } else {
      setSelectedCalibrations({});
    }
  };

  const handleToggleSelectCalibration = (id: string) => {
    setSelectedCalibrations((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredDeliveries = fuelDeliveries.filter((d) => d.stationCnpj === cnpjPosto);

  return (
    <div className="space-y-6">
      {/* Tab Navigation header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 font-display">
            <Thermometer className="text-indigo-600 h-6 w-6" />
            Vazão, Qualidade e NF-e
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Controle aferições mecânicas, emita laudos químicos de conformidade ANP e dê entrada nas notas de entrega
          </p>
        </div>

        {/* Sub tabs selectors */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab("afericao")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === "afericao" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            📏 Teste 20L
          </button>
          <button
            onClick={() => setActiveSubTab("laudo")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === "laudo" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            🧪 Laudo Químico
          </button>
          <button
            onClick={() => setActiveSubTab("entregas")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === "entregas" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            🚚 Entregas NF-e
          </button>
        </div>
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
          {success}
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs">
          <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
          {error}
        </div>
      )}

      {/* RENDER ACTIVE DEPARTMENT MODULE */}
      {activeSubTab === "afericao" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Left */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase text-indigo-700 tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-1.5">
              <Gauge className="h-4 w-4 text-indigo-600" />
              Lançar Aferição Física (20L)
            </h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              A cada turno, é obrigatório extrair 20 litros exatos do bico no galão aferidor certificado do INMETRO. O desvio máximo aceito por lei é de <strong>+-60ml</strong> (ou -0.3% a +0.3%).
            </p>

            <form onSubmit={handleCreateCalibration} className="space-y-4 pt-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Selecione o Bico *</label>
                <select
                  required
                  value={calNozzleId}
                  onChange={(e) => setCalNozzleId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer font-semibold"
                >
                  <option value="">Selecione o Bico</option>
                  {nozzles.map((n) => {
                    const tank = appState.tanks.find((t) => t.id === n.tanqueId);
                    return (
                      <option key={n.id} value={n.id}>
                        Bico {n.numeroBico} ({tank ? tank.combustivel : "Sem combustível"}) - Bomba {n.bombaAssociada}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Vol. Galão (L)</label>
                  <input
                    type="number"
                    disabled
                    value={20.0}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-400 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Desvio (ml) *</label>
                  <input
                    type="number"
                    required
                    value={calDesvioMl}
                    onChange={(e) => setCalDesvioMl(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-800"
                    placeholder="Ex: -25 ou 30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Operador Responsável *</label>
                <input
                  type="text"
                  required
                  value={calOperador}
                  onChange={(e) => setCalOperador(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Ex: Carlos Santos"
                />
              </div>

              {/* Status block live preview */}
              <div className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Veredicto Rápido</p>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full font-black text-[9px] uppercase ${
                    calDesvioMl >= -60 && calDesvioMl <= 60
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      : "bg-rose-50 text-rose-700 border border-rose-100 animate-pulse"
                  }`}
                >
                  {calDesvioMl >= -60 && calDesvioMl <= 60 ? "DENTRO DOS LIMITES (+-60ml)" : "FORA DE CALIBRAÇÃO!"}
                </span>
              </div>

              <button
                type="submit"
                disabled={isReadOnly}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Salvar Aferição
              </button>
            </form>
          </div>

          {/* Table list Right */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-sm font-semibold text-slate-800">Histórico de Aferição de Bicos</h3>
              <button
                onClick={handleExportSelectedCSV}
                className="px-3 py-1.5 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                Exportar Selecionados (CSV)
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-[10px] text-slate-400 uppercase font-bold border-b border-slate-100 bg-slate-50/50">
                    <th className="py-2.5 px-3">
                      <input
                        type="checkbox"
                        onChange={handleSelectAllCalibrations}
                        className="rounded border-slate-300 h-3.5 w-3.5 text-indigo-600"
                      />
                    </th>
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3">Bico</th>
                    <th className="py-2.5 px-3">Desvio Medido</th>
                    <th className="py-2.5 px-3">Veredicto</th>
                    <th className="py-2.5 px-3">Operador</th>
                  </tr>
                </thead>
                <tbody>
                  {calibrations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 italic">Nenhuma aferição física registrada ainda.</td>
                    </tr>
                  ) : (
                    calibrations
                      .slice()
                      .reverse()
                      .map((cal) => {
                        const b = nozzles.find((nozzle) => nozzle.id === cal.nozzleId);
                        const isChecked = !!selectedCalibrations[cal.id];
                        return (
                          <tr key={cal.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                            <td className="py-2.5 px-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleSelectCalibration(cal.id)}
                                className="rounded border-slate-300 h-3.5 w-3.5 text-indigo-600"
                              />
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-600">{cal.data.split("-").reverse().join("/")}</td>
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-slate-800">
                                Bico {b ? b.numeroBico : "Bico Geral"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                              {cal.desvioMl > 0 ? `+${cal.desvioMl}` : cal.desvioMl} mL
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`text-[9px] font-bold px-2 py-0.5 border rounded-full ${
                                  cal.conforme
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                    : "bg-rose-50 text-rose-700 border-rose-100 animate-pulse"
                                }`}
                              >
                                {cal.conforme ? "CONFORME" : "REJEITADO"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">{cal.operadorResponsavel}</td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "laudo" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chemical Form Left */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase text-indigo-700 tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              Lançar Teste Químico ANP
            </h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              A regulamentação ANP estabelece parâmetros químicos estritos: Gasolinas de até <strong>27%</strong> de etanol anidro, e aspecto visual transparente (límpido e isento de sedimentos/água).
            </p>

            <form onSubmit={handleCreateQualityAudit} className="space-y-4 pt-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Combustível *</label>
                <select
                  value={qCombustivel}
                  onChange={(e) => setQCombustivel(e.target.value as FuelType)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                >
                  {FUEL_TYPES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Densidade (g/cm³)</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={qDensidade}
                    onChange={(e) => setQDensidade(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Temperatura (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={qTemperatura}
                    onChange={(e) => setQTemperatura(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Teor Etanol (%)</label>
                  <input
                    type="number"
                    required
                    disabled={!qCombustivel.includes("Gasolina")}
                    value={qCombustivel.includes("Gasolina") ? qTeorEtanol : 0}
                    onChange={(e) => setQTeorEtanol(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono disabled:opacity-40"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Aspecto Visual</label>
                  <select
                    value={qAspecto}
                    onChange={(e) => setQAspecto(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Límpido e Isento">Límpido/Isento</option>
                    <option value="Turvo">Turvo</option>
                    <option value="Com Impurezas">Impurezas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Químico Responsável *</label>
                <input
                  type="text"
                  required
                  value={qResponsavel}
                  onChange={(e) => setQResponsavel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Ex: Roberto Silveira"
                />
              </div>

              <label className="flex items-start space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-100 cursor-pointer text-[10.5px]">
                <input
                  type="checkbox"
                  checked={qImpurezas}
                  onChange={(e) => setQImpurezas(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 mt-0.5"
                />
                <span className="text-slate-600 leading-normal">Houve detecção de partículas, impurezas sólidas ou água livre na proveta de teste?</span>
              </label>

              <button
                type="submit"
                disabled={isReadOnly}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Registrar Laudo Químico
              </button>
            </form>
          </div>

          {/* List Right */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-slate-800">Histórico de Laudos Químicos</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-[10px] text-slate-400 uppercase font-bold border-b border-slate-100 bg-slate-50/50">
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3">Combustível</th>
                    <th className="py-2.5 px-3">Metricas</th>
                    <th className="py-2.5 px-3">Etanol</th>
                    <th className="py-2.5 px-3">Veredicto</th>
                    <th className="py-2.5 px-3">Resp. Técnico</th>
                  </tr>
                </thead>
                <tbody>
                  {qualityAudits.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 italic">Nenhum laudo químico emitido hoje.</td>
                    </tr>
                  ) : (
                    qualityAudits
                      .slice()
                      .reverse()
                      .map((audit) => (
                        <tr key={audit.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                          <td className="py-2.5 px-3 font-semibold text-slate-600">{audit.data.split("-").reverse().join("/")}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">{audit.combustivel}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                            Dens: {audit.densidade} | Temp: {audit.temperatura}°C
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                            {audit.combustivel.includes("Gasolina") ? `${audit.teorEtanol}%` : "—"}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 border rounded-full ${
                                audit.conforme
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                  : "bg-rose-50 text-rose-700 border-rose-100 animate-pulse"
                              }`}
                            >
                              {audit.conforme ? "APROVADO" : "FORA DE PADRÃO"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">{audit.responsavelTecnico}</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "entregas" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Carga Form Left */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase text-indigo-700 tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-indigo-600" />
              Entrada de Carga (NF-e)
            </h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              Registre a chegada de caminhões-tanques da distribuidora. Faça o laudo de amostragem na proveta do combustível antes de descarregar o produto no tanque correto.
            </p>

            <form onSubmit={handleCreateDelivery} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data Recebimento</label>
                  <input
                    type="date"
                    required
                    value={delDate}
                    onChange={(e) => setDelDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Chave NF-e / ID *</label>
                  <input
                    type="text"
                    required
                    value={delNfe}
                    onChange={(e) => setDelNfe(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-800"
                    placeholder="Ex: 549382"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Combustível</label>
                  <select
                    value={delCombustivel}
                    onChange={(e) => setDelCombustivel(e.target.value as FuelType)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer font-semibold"
                  >
                    {FUEL_TYPES.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Volume (L) *</label>
                  <input
                    type="number"
                    required
                    value={delVolume}
                    onChange={(e) => setDelVolume(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Placa Caminhão</label>
                  <input
                    type="text"
                    required
                    value={delPlaca}
                    onChange={(e) => setDelPlaca(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Ex: ABC-1234"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Motorista</label>
                  <input
                    type="text"
                    required
                    value={delMotorista}
                    onChange={(e) => setDelMotorista(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Ex: Roberto Silveira"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isReadOnly}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Dar Entrada na Carga NF-e
              </button>
            </form>
          </div>

          {/* List Deliveries Right */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-slate-800">Cargas e Recebimentos de Combustíveis</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-[10px] text-slate-400 uppercase font-bold border-b border-slate-100 bg-slate-50/50">
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3">NF-e</th>
                    <th className="py-2.5 px-3">Combustível</th>
                    <th className="py-2.5 px-3">Volume Recebido</th>
                    <th className="py-2.5 px-3">Motorista / Placa</th>
                    <th className="py-2.5 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeliveries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 italic">Nenhum recebimento de carga registrado.</td>
                    </tr>
                  ) : (
                    filteredDeliveries
                      .slice()
                      .reverse()
                      .map((d) => (
                        <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                          <td className="py-2.5 px-3 font-semibold text-slate-600">{d.data.split("-").reverse().join("/")}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">#{d.nfe}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">{d.combustivel}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                            {d.volumeRecebido.toLocaleString("pt-BR")} L
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {d.motorista} ({d.placaCaminhao})
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleDeleteDelivery(d.id)}
                              className="text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
                            >
                              Remover
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
