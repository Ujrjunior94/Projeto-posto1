/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AppState, NozzleCalibration, ANPQualityAudit, FuelType, FuelDelivery, ShiftOccurrence, ShiftSchedule, FuelTank } from "../types";
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
  FileDown,
  Lock,
} from "lucide-react";
import { FUEL_TYPES } from "./TanksManagement";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export function getDensityCorrectionFactor(fuel: FuelType): number {
  if (fuel === "Etanol") return 0.00084;
  if (fuel.includes("Gasolina")) return 0.00085;
  if (fuel.includes("Diesel")) return 0.00070;
  return 0.00080;
}

export function calculateD20(densidadeMedida: number, temperaturaMedida: number, fuel: FuelType): number {
  const factor = getDensityCorrectionFactor(fuel);
  return densidadeMedida + factor * (temperaturaMedida - 20);
}

export interface FuelComplianceResult {
  densidadeCorrigida: number;
  densidadeMin: number;
  densidadeMax: number;
  densidadeOk: boolean;
  teorOk: boolean;
  aspectoOk: boolean;
  impurezasOk: boolean;
  conforme: boolean;
  teorCalculadoOuEsperado: number;
  teorMin: number;
  teorMax: number;
  mensagem: string;
}

export function checkFuelCompliance(
  fuel: FuelType,
  densidadeMedida: number,
  temperaturaMedida: number,
  teorInformado: number,
  aspectoVisual: "Límpido e Isento" | "Turvo" | "Com Impurezas",
  presencaImpurezas: boolean
): FuelComplianceResult {
  const d20 = calculateD20(densidadeMedida, temperaturaMedida, fuel);
  
  let densidadeMin = 0.7150;
  let densidadeMax = 0.7750;
  let teorMin = 0;
  let teorMax = 0;
  let teorCalculadoOuEsperado = 0;
  let teorOk = true;
  let mensagem = "";

  if (fuel === "Etanol") {
    densidadeMin = 0.8076;
    densidadeMax = 0.8110;
    // Cálculo do teor alcoólico do etanol em massa (% M/M / °INPM):
    // D20 = 0.8076 g/cm³ -> 93.8% M/M
    // D20 = 0.8110 g/cm³ -> 92.5% M/M
    const massPct = 93.8 - ((d20 - 0.8076) / 0.0034) * 1.3;
    teorCalculadoOuEsperado = Math.min(100, Math.max(0, Number(massPct.toFixed(1))));
    teorMin = 92.5;
    teorMax = 93.8;
    teorOk = teorCalculadoOuEsperado >= teorMin && teorCalculadoOuEsperado <= teorMax;
  } else if (fuel === "Gasolina Comum" || fuel === "Gasolina Aditivada") {
    densidadeMin = 0.7150;
    densidadeMax = 0.7750;
    teorMin = 26.0; // ANP 2026: E27/E30 standard range (26% to 30%)
    teorMax = 30.0;
    teorCalculadoOuEsperado = teorInformado;
    teorOk = teorInformado >= teorMin && teorInformado <= teorMax;
  } else if (fuel === "Gasolina Premium") {
    densidadeMin = 0.7700;
    densidadeMax = 0.8000;
    teorMin = 25.0; // ANP 2026 Premium
    teorMax = 30.0;
    teorCalculadoOuEsperado = teorInformado;
    teorOk = teorInformado >= teorMin && teorInformado <= teorMax;
  } else if (fuel === "Diesel S10") {
    densidadeMin = 0.8200;
    densidadeMax = 0.8500;
    teorMin = 14.0; // Biodiesel B14/B15 in 2026
    teorMax = 15.0;
    teorCalculadoOuEsperado = teorInformado > 0 ? teorInformado : 15.0;
    teorOk = teorInformado === 0 || (teorInformado >= teorMin && teorInformado <= teorMax);
  } else if (fuel === "Diesel S500") {
    densidadeMin = 0.8200;
    densidadeMax = 0.8650;
    teorCalculadoOuEsperado = 0;
    teorOk = true;
  }

  const densidadeOk = d20 >= densidadeMin && d20 <= densidadeMax;
  const aspectoOk = aspectoVisual === "Límpido e Isento";
  const impurezasOk = !presencaImpurezas;

  const conforme = densidadeOk && teorOk && aspectoOk && impurezasOk;

  if (!conforme) {
    const motivos: string[] = [];
    if (!densidadeOk) motivos.push(`Massa específica D20 (${d20.toFixed(4)} g/cm³) fora da faixa ANP (${densidadeMin.toFixed(4)} - ${densidadeMax.toFixed(4)} g/cm³)`);
    if (!teorOk) {
      if (fuel === "Etanol") {
        motivos.push(`Teor Alcoólico em Massa (${teorCalculadoOuEsperado.toFixed(1)}% M/M) fora do permitido (92.5% - 93.8% M/M)`);
      } else if (fuel.includes("Gasolina")) {
        motivos.push(`Teor de Etanol Anidro (${teorCalculadoOuEsperado.toFixed(1)}%) fora do limite regulamentar (${teorMin.toFixed(1)}% - ${teorMax.toFixed(1)}%)`);
      } else if (fuel.includes("Diesel")) {
        motivos.push(`Teor de Biodiesel (${teorCalculadoOuEsperado.toFixed(1)}%) fora do limite B14/B15`);
      }
    }
    if (!aspectoOk) motivos.push("Aspecto visual não atende o critério Límpido e Isento");
    if (!impurezasOk) motivos.push("Presença detectada de partículas/impurezas");
    mensagem = "Não Conforme (ANP 2026): " + motivos.join("; ");
  } else {
    mensagem = "Conforme: Combustível aprovado em conformidade com as normas ANP 2026.";
  }

  return {
    densidadeCorrigida: Number(d20.toFixed(4)),
    densidadeMin,
    densidadeMax,
    densidadeOk,
    teorOk,
    aspectoOk,
    impurezasOk,
    conforme,
    teorCalculadoOuEsperado,
    teorMin,
    teorMax,
    mensagem
  };
}

interface ANPQualityControlProps {
  appState: AppState;
  userRole: string;
  cnpjPosto: string;
  onUpdateCalibrations: (calibrations: NozzleCalibration[]) => void;
  onUpdateQualityAudits: (audits: ANPQualityAudit[]) => void;
  onUpdateDeliveries: (deliveries: FuelDelivery[]) => void;
  onAddAuditLog: (actionType: string, target: string, details: string, status: string) => void;
  onUpdateShifts?: (shifts: ShiftSchedule[]) => void;
  onUpdateTanks?: (tanks: FuelTank[]) => void;
}

export default function ANPQualityControl({
  appState,
  userRole,
  cnpjPosto,
  onUpdateCalibrations,
  onUpdateQualityAudits,
  onUpdateDeliveries,
  onAddAuditLog,
  onUpdateShifts,
  onUpdateTanks,
}: ANPQualityControlProps) {
  const { calibrations = [], qualityAudits = [], nozzles = [], deliveries = [] } = appState;
  const fuelDeliveries = deliveries;
  const isReadOnly = userRole === "Frentista";

  // Active view inside Quality tab: "afericao" (Calibrations), "laudo" (Chemical Quality), "entregas" (Fuel Deliveries), "especificacoes_2026" (ANP 2026 Specs Table)
  const [activeSubTab, setActiveSubTab] = useState<"afericao" | "laudo" | "entregas" | "especificacoes_2026">("afericao");

  // Selection state for batch actions
  const [selectedCalibrations, setSelectedCalibrations] = useState<{ [key: string]: boolean }>({});

  // Nozzle calibration form state
  const [calNozzleId, setCalNozzleId] = useState("");
  const [calVolumeMedido, setCalVolumeMedido] = useState(20.0);
  const [calDesvioMl, setCalDesvioMl] = useState(0); // in mL (-120 to 120, step 20)
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

  // ANP deviation rules: acceptable standard deviation is -100 to +100 mL.
  const handleCreateCalibration = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!calNozzleId) {
      setError("Selecione o bico correspondente.");
      return;
    }

    const dev = Number(calDesvioMl);
    if (isNaN(dev) || dev < -120 || dev > 120) {
      setError("O desvio na aferição deve estar entre -120 mL e +120 mL.");
      return;
    }

    const conforme = dev >= -100 && dev <= 100;
    
    const nozzle = nozzles.find(n => n.id === calNozzleId);
    const precoPorLitro = nozzle ? nozzle.precoPorLitro : 0;
    const valorReais = Number(calVolumeMedido) * precoPorLitro;

    const newCal: NozzleCalibration = {
      id: "cal_" + Date.now(),
      data: new Date().toISOString().split("T")[0],
      nozzleId: calNozzleId,
      volumeMedido: Number(calVolumeMedido),
      desvioMl: dev,
      conforme,
      operadorResponsavel: calOperador || "Supervisor Geral",
      valorReais,
    };

    onUpdateCalibrations([...calibrations, newCal]);
    onAddAuditLog("CREATE", "Qualidade", `Registrou aferição física de ${calVolumeMedido}L para o bico ${calNozzleId}. Desvio: ${dev} ml`, "Regular");

    setSuccess(
      conforme
        ? `Aferição de bico salva: Conforme padrão ANP (desvio: ${dev} ml).`
        : `ALERTA: Aferição salva! O bico está FORA dos limites técnicos de -100 a +100 mL (desvio: ${dev} ml).`
    );
    setTimeout(() => setSuccess(""), 4000);
  };

  const handleCreateQualityAudit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const comp = checkFuelCompliance(
      qCombustivel,
      Number(qDensidade),
      Number(qTemperatura),
      Number(qTeorEtanol),
      qAspecto,
      qImpurezas
    );

    const newAudit: ANPQualityAudit = {
      id: "qa_" + Date.now(),
      data: new Date().toISOString().split("T")[0],
      combustivel: qCombustivel,
      densidade: Number(qDensidade),
      temperatura: Number(qTemperatura),
      densidadeCorrigida: comp.densidadeCorrigida,
      teorEtanol: comp.teorCalculadoOuEsperado,
      aspectoVisual: qAspecto,
      presencaImpurezas: qImpurezas,
      conforme: comp.conforme,
      responsavelTecnico: qResponsavel || "Químico Técnico",
    };

    onUpdateQualityAudits([...qualityAudits, newAudit]);

    if (comp.conforme) {
      onAddAuditLog(
        "CREATE",
        "Qualidade",
        `Emitiu laudo químico ANP para ${qCombustivel}. D20: ${comp.densidadeCorrigida} g/cm³. Status: CONFORME`,
        "Regular"
      );
      setSuccess(
        `Laudo ANP gerado: CONFORME! Massa específica corrigida a 20°C: ${comp.densidadeCorrigida.toFixed(4)} g/cm³ (${qCombustivel === "Etanol" ? `Teor Alcoólico: ${comp.teorCalculadoOuEsperado.toFixed(1)}% M/M` : `Teor: ${comp.teorCalculadoOuEsperado.toFixed(1)}%`}).`
      );
    } else {
      // 1. Bloquear automaticamente o(s) tanque(s) do combustível correspondente
      const affectedTanks = (appState.tanks || []).filter(
        (t) => t.combustivel === qCombustivel
      );

      let tankNamesStr = "";
      if (affectedTanks.length > 0 && onUpdateTanks) {
        tankNamesStr = affectedTanks.map((t) => t.identificador).join(", ");
        const updatedTanks = appState.tanks.map((t) => {
          if (t.combustivel === qCombustivel) {
            return {
              ...t,
              observacoes: `[🚨 TANQUE BLOQUEADO POR QUALIDADE ANP - ${new Date().toLocaleDateString("pt-BR")}] Reprovado no teste de conformidade. Motivo: ${comp.mensagem}`,
            };
          }
          return t;
        });
        onUpdateTanks(updatedTanks);
      }

      // 2. Disparar ocorrência bloqueante automática no sistema de turnos/escalas
      const todayStr = new Date().toISOString().split("T")[0];
      const nowTimeStr = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const occMsg = `🚨 OCORRÊNCIA BLOQUEANTE (QUALIDADE ANP): O combustível ${qCombustivel} foi REPROVADO no teste de conformidade. ${comp.mensagem}. O(s) Tanque(s) de ${qCombustivel} (${tankNamesStr || "Não especificado"}) foi(ram) BLOQUEADO(S) para operação e abastecimento até drenagem e laudo conforme.`;

      if (onUpdateShifts && appState.shifts && appState.shifts.length > 0) {
        const newOcc: ShiftOccurrence = {
          id: "oco_block_anp_" + Date.now(),
          tipo: "Problema na Pista",
          descricao: occMsg,
          dataHora: `${todayStr} ${nowTimeStr}`,
        };

        const activeShiftIndex = appState.shifts.findIndex((s) => s.status === "Em Andamento");
        const targetIndex = activeShiftIndex !== -1 ? activeShiftIndex : appState.shifts.length - 1;

        const updatedShifts = appState.shifts.map((s, idx) => {
          if (idx === targetIndex) {
            return {
              ...s,
              occurrences: [...(s.occurrences || []), newOcc],
            };
          }
          return s;
        });
        onUpdateShifts(updatedShifts);
      }

      onAddAuditLog(
        "CREATE",
        "Qualidade",
        `ALERTA DE REPROVAÇÃO ANP: ${qCombustivel} reprovado. ${comp.mensagem}. Ocorrência Bloqueante e Bloqueio de Tanque executados automaticamente.`,
        "Bloqueio ANP"
      );

      setError(
        `🚨 ALERTA CRÍTICO ANP: Combustível REPROVADO! ${comp.mensagem}. OCORRÊNCIA BLOQUEANTE registrada automaticamente na escala e Tanque(s) de ${qCombustivel} (${tankNamesStr || "Geral"}) BLOQUEADO(S).`
      );
    }
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

  // Export selected calibrations to PDF
  const handleExportSelectedPDF = () => {
    const selectedIds = Object.keys(selectedCalibrations).filter((id) => selectedCalibrations[id]);
    if (selectedIds.length === 0) {
      alert("Selecione ao menos uma aferição na tabela abaixo para exportar.");
      return;
    }

    const rowsToExport = calibrations.filter((c) => selectedIds.includes(c.id));
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("Relatório de Aferição de Bicos", 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Posto CNPJ: ${cnpjPosto}`, 14, 30);
    doc.text(`Data de Emissão: ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR")}`, 14, 35);

    // Table
    const tableData = rowsToExport.map((c) => {
      const nozzle = nozzles.find((n) => n.id === c.nozzleId);
      const tank = nozzle ? (appState.tanks || []).find(t => t.id === nozzle.tanqueId) : null;
      const fuelInfo = tank ? `(${tank.combustivel})` : "";
      
      return [
        c.data.split("-").reverse().join("/"),
        nozzle ? `Bico ${nozzle.numeroBico} ${fuelInfo}` : c.nozzleId,
        `R$ ${(c.valorReais || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        `${c.desvioMl > 0 ? "+" : ""}${c.desvioMl} mL`,
        c.conforme ? "CONFORME" : "NÃO CONFORME",
        c.operadorResponsavel,
      ];
    });

    autoTable(doc, {
      startY: 45,
      head: [["Data", "Bico / Produto", "Valor (R$)", "Desvio", "Veredicto", "Responsável"]],
      body: tableData,
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        3: { fontStyle: "bold" },
        4: { fontStyle: "bold" },
      },
    });

    // Summary
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    const totalVolume = rowsToExport.reduce((acc, c) => acc + c.volumeMedido, 0);
    const totalValor = rowsToExport.reduce((acc, c) => acc + (c.valorReais || 0), 0);

    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(`Total de Aferições: ${rowsToExport.length}`, 14, finalY + 15);
    doc.text(`Volume Total Aferido: ${totalVolume} Litros`, 14, finalY + 22);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`VALOR TOTAL ACUMULADO: R$ ${totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 14, finalY + 32);

    doc.save(`relatorio_afericoes_${Date.now()}.pdf`);
    onAddAuditLog("DOWNLOAD", "Qualidade", `Exportou PDF com ${rowsToExport.length} aferições de vazão`, "Regular");
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

  const handleDeleteCalibration = (id: string) => {
    if (confirm("Deseja realmente excluir esta aferição de bico?")) {
      const filtered = calibrations.filter((c) => c.id !== id);
      onUpdateCalibrations(filtered);
      onAddAuditLog("DELETE", "Qualidade", `Excluiu aferição ID ${id}`, "Regular");
    }
  };

  const handleDeleteQualityAudit = (id: string) => {
    if (confirm("Deseja realmente excluir este laudo químico?")) {
      const filtered = qualityAudits.filter((a) => a.id !== id);
      onUpdateQualityAudits(filtered);
      onAddAuditLog("DELETE", "Qualidade", `Excluiu laudo químico ID ${id}`, "Regular");
    }
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
          <button
            onClick={() => setActiveSubTab("especificacoes_2026")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
              activeSubTab === "especificacoes_2026" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            📋 Normas ANP 2026
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
              Lançar Aferição Física
            </h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              Extraia o volume padrão do bico no galão aferidor certificado. O desvio máximo aceito pela ANP é de <strong>-100 a +100 mL</strong> (ou -0.5% a +0.5% sobre o volume medido).
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
                    const tank = (appState.tanks || []).find((t) => t.id === n.tanqueId);
                    return (
                      <option key={n.id} value={n.id}>
                        Bico {n.numeroBico} ({tank ? tank.combustivel : "Sem combustível"}) - Bomba {n.bombaAssociada}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-100">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Vol. Galão (L) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="1000"
                    required
                    value={calVolumeMedido}
                    onChange={(e) => setCalVolumeMedido(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-800"
                    placeholder="Ex: 20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Desvio Manual (mL) *</label>
                  <input
                    type="number"
                    required
                    min="-120"
                    max="120"
                    step="1"
                    value={calDesvioMl}
                    onChange={(e) => {
                      let val = Number(e.target.value);
                      if (val < -120) val = -120;
                      if (val > 120) val = 120;
                      setCalDesvioMl(val);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-800"
                    placeholder="De -120 a +120"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                  <span>Ajustar Desvio (mL)</span>
                  <span className={`text-xs font-mono font-black ${calDesvioMl >= -100 && calDesvioMl <= 100 ? "text-emerald-600" : "text-rose-600 animate-pulse"}`}>
                    {calDesvioMl > 0 ? `+${calDesvioMl}` : calDesvioMl} mL
                  </span>
                </div>
                <input
                  type="range"
                  min="-120"
                  max="120"
                  step="1"
                  value={calDesvioMl}
                  onChange={(e) => setCalDesvioMl(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[8px] text-slate-400 font-mono font-semibold">
                  <span>-120 mL</span>
                  <span className="text-emerald-600">-100 mL</span>
                  <span>0 mL</span>
                  <span className="text-emerald-600">+100 mL</span>
                  <span>+120 mL</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Atalhos de Calibração</label>
                <div className="grid grid-cols-5 gap-1">
                  {[-120, -100, 0, 100, 120].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCalDesvioMl(val)}
                      className={`py-1 text-center rounded text-[9px] font-bold border transition cursor-pointer ${
                        calDesvioMl === val
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                      }`}
                    >
                      {val > 0 ? `+${val}` : val}
                    </button>
                  ))}
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
                    calDesvioMl >= -100 && calDesvioMl <= 100
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      : "bg-rose-50 text-rose-700 border border-rose-100 animate-pulse"
                  }`}
                >
                  {calDesvioMl >= -100 && calDesvioMl <= 100 ? "DENTRO DOS LIMITES (-100 a +100ml)" : "FORA DE CALIBRAÇÃO!"}
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
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h3 className="text-sm font-semibold text-slate-800">Histórico de Aferição de Bicos</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportSelectedCSV}
                    className="px-3 py-1.5 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-xl transition flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    CSV
                  </button>
                  <button
                    onClick={handleExportSelectedPDF}
                    className="px-3 py-1.5 bg-indigo-600 border border-indigo-700 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-xl transition flex items-center gap-1 cursor-pointer shadow-sm"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    PDF
                  </button>
                </div>
              </div>

              {/* Cumulative summary for selected calibrations */}
              {Object.values(selectedCalibrations).filter(Boolean).length > 0 && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-400 uppercase block">Total Selecionado</span>
                    <span className="text-lg font-black text-indigo-700">
                      R$ {calibrations
                        .filter(c => selectedCalibrations[c.id])
                        .reduce((acc, c) => acc + (c.valorReais || 0), 0)
                        .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase block">Litros Totais</span>
                    <span className="text-sm font-bold text-indigo-600">
                      {calibrations
                        .filter(c => selectedCalibrations[c.id])
                        .reduce((acc, c) => acc + c.volumeMedido, 0)} L
                    </span>
                  </div>
                </div>
              )}
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
                    <th className="py-2.5 px-3">Valor (R$)</th>
                    <th className="py-2.5 px-3">Desvio Medido</th>
                    <th className="py-2.5 px-3">Veredicto</th>
                    <th className="py-2.5 px-3">Operador</th>
                    <th className="py-2.5 px-3">Ações</th>
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
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                              R$ {(cal.valorReais || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => handleDeleteCalibration(cal.id)}
                                className="p-1 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                                title="Excluir Registro"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
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
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Combustível Selecionado *</label>
                <select
                  value={qCombustivel}
                  onChange={(e) => {
                    const newFuel = e.target.value as FuelType;
                    setQCombustivel(newFuel);
                    if (newFuel === "Etanol") setQDensidade(0.809);
                    else if (newFuel.includes("Gasolina")) setQDensidade(newFuel === "Gasolina Premium" ? 0.780 : 0.742);
                    else if (newFuel.includes("Diesel")) setQDensidade(0.835);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer"
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
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Densidade Medida (g/cm³)</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={qDensidade}
                    onChange={(e) => setQDensidade(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Temperatura Medida (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={qTemperatura}
                    onChange={(e) => setQTemperatura(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    {qCombustivel === "Etanol" ? "Teor Alcoólico (% M/M)" : "Teor Anidro/Biodiesel (%)"}
                  </label>
                  <input
                    type="number"
                    required={qCombustivel.includes("Gasolina")}
                    disabled={qCombustivel === "Etanol" || qCombustivel.includes("Diesel")}
                    value={
                      qCombustivel === "Etanol"
                        ? checkFuelCompliance(qCombustivel, Number(qDensidade), Number(qTemperatura), Number(qTeorEtanol), qAspecto, qImpurezas).teorCalculadoOuEsperado
                        : qCombustivel.includes("Gasolina")
                          ? qTeorEtanol
                          : 0
                    }
                    onChange={(e) => setQTeorEtanol(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono font-bold disabled:bg-slate-100 disabled:text-slate-500"
                  />
                  {qCombustivel === "Etanol" && (
                    <span className="text-[9px] text-indigo-600 font-semibold block mt-0.5">
                      Calculado via D20 (Norma ANP 92,5% - 93,8% M/M)
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Aspecto Visual</label>
                  <select
                    value={qAspecto}
                    onChange={(e) => setQAspecto(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Límpido e Isento">Límpido e Isento</option>
                    <option value="Turvo">Turvo</option>
                    <option value="Com Impurezas">Com Impurezas</option>
                  </select>
                </div>
              </div>

              {(() => {
                const comp = checkFuelCompliance(
                  qCombustivel,
                  Number(qDensidade),
                  Number(qTemperatura),
                  Number(qTeorEtanol),
                  qAspecto,
                  qImpurezas
                );
                const factor = getDensityCorrectionFactor(qCombustivel);
                
                return (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-slate-700">
                    <div className="text-[10px] font-black uppercase text-indigo-800 tracking-wide flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Thermometer className="h-3.5 w-3.5 text-indigo-600" />
                        Calculadora de Conformidade ANP
                      </span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                        comp.conforme ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
                      }`}>
                        {comp.conforme ? "Aprovado" : "Fora da Norma"}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-500 bg-white border border-slate-100 p-2 rounded-lg leading-snug font-mono">
                      Fórmula de Correção D20:
                      <div className="text-slate-800 font-bold mt-0.5 text-[11px] text-center">
                        D20 = Dt + {factor.toFixed(5)} × (t - 20) = <span className="text-indigo-700">{comp.densidadeCorrigida.toFixed(4)} g/cm³</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs leading-tight pt-1">
                      <div>
                        <span className="text-slate-400 text-[9px] uppercase font-bold block">D20 Corrigida</span>
                        <span className={`font-mono font-black text-[13px] ${comp.densidadeOk ? "text-slate-800" : "text-rose-600 font-extrabold"}`}>
                          {comp.densidadeCorrigida.toFixed(4)} g/cm³
                        </span>
                        <span className="text-slate-400 text-[9px] block">
                          ({(comp.densidadeCorrigida * 1000).toFixed(1)} kg/m³)
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[9px] uppercase font-bold block">Faixa ANP Permitida</span>
                        <span className="font-mono font-bold text-slate-600 text-[11px] block mt-0.5">
                          {comp.densidadeMin.toFixed(4)} a {comp.densidadeMax.toFixed(4)} g/cm³
                        </span>
                        <span className="text-slate-400 text-[9px] block">
                          ({(comp.densidadeMin * 1000).toFixed(0)} - {(comp.densidadeMax * 1000).toFixed(0)} kg/m³)
                        </span>
                      </div>
                    </div>

                    {/* Progress bar visualizer for density */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] text-slate-400 uppercase font-bold">
                        <span>Min: {comp.densidadeMin.toFixed(4)}</span>
                        <span className="font-mono text-slate-600 font-bold">D20: {comp.densidadeCorrigida.toFixed(4)}</span>
                        <span>Max: {comp.densidadeMax.toFixed(4)}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden relative border border-slate-100">
                        <div className="absolute inset-0 bg-rose-200/50" />
                        <div className="absolute left-[25%] right-[25%] top-0 bottom-0 bg-emerald-100" />
                        
                        {(() => {
                          const range = comp.densidadeMax - comp.densidadeMin;
                          const relativeVal = comp.densidadeCorrigida - comp.densidadeMin;
                          let pct = range > 0 ? (relativeVal / range) * 50 + 25 : 50;
                          pct = Math.min(100, Math.max(0, pct));
                          return (
                            <div 
                              style={{ left: `${pct}%` }} 
                              className={`absolute -top-0.5 -bottom-0.5 w-1.5 rounded-full shadow-xs -translate-x-1/2 transition-all duration-300 ${
                                comp.densidadeOk ? "bg-emerald-600 ring-2 ring-emerald-200" : "bg-rose-600 ring-2 ring-rose-200 animate-pulse"
                              }`}
                            />
                          );
                        })()}
                      </div>
                    </div>

                    {/* Specific analysis depending on fuel */}
                    <div className="pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-[11px] leading-tight">
                      <div>
                        <span className="text-slate-400 text-[9px] uppercase font-bold block">
                          {qCombustivel === "Etanol" ? "Teor Alcoólico em Massa" : qCombustivel.includes("Gasolina") ? "Teor de Etanol" : "Biodiesel/Aditivo"}
                        </span>
                        <span className={`font-mono font-black ${comp.teorOk ? "text-emerald-600" : "text-rose-600"}`}>
                          {qCombustivel === "Etanol" 
                            ? `${comp.teorCalculadoOuEsperado.toFixed(1)}% M/M`
                            : qCombustivel.includes("Gasolina")
                              ? `${comp.teorCalculadoOuEsperado.toFixed(1)}% v/v`
                              : "Isento / Conforme"
                          }
                        </span>
                        {qCombustivel === "Etanol" && (
                          <span className="text-[9px] text-slate-400 block mt-0.5">
                            Norma ANP: 92,5% a 93,8% M/M
                          </span>
                        )}
                        {qCombustivel.includes("Gasolina") && (
                          <span className="text-[9px] text-slate-400 block mt-0.5">
                            Norma ANP: 26% a 30% v/v
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="text-slate-400 text-[9px] uppercase font-bold block">Resultado Final</span>
                        <span className={`font-black uppercase px-2 py-0.5 rounded text-[8.5px] border inline-block mt-1 ${
                          comp.conforme
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : "bg-rose-100 text-rose-800 border-rose-200 animate-pulse"
                        }`}>
                          {comp.conforme ? "✓ CONFORME" : "⚠ REPROVADO"}
                        </span>
                      </div>
                    </div>

                    {!comp.conforme && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[10px] font-bold space-y-1 flex items-start gap-2">
                        <Lock className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                        <div>
                          <p className="uppercase font-black text-rose-700">Gatilho de Ocorrência Bloqueante:</p>
                          <p className="font-medium text-rose-800 leading-snug">
                            Ao salvar este laudo, o sistema gerará automaticamente uma <strong>Ocorrência Bloqueante</strong> na escala do turno e aplicará <strong>Bloqueio de Operação</strong> para o tanque de {qCombustivel}.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {false && (
                <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-3.5 space-y-2 text-slate-700">
                  <div className="text-[10px] font-black uppercase text-sky-800 tracking-wide flex items-center gap-1">
                    <Thermometer className="h-3.5 w-3.5 text-sky-600 animate-pulse" />
                    Cálculo Grau Alcoólico (v/v%)
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] leading-tight pt-1">
                    <div>
                      <span className="text-slate-400 text-[9px] uppercase font-bold block">D20 Corrigida</span>
                      <span className="font-mono font-bold text-slate-800">
                        {(qDensidade + 0.00084 * (qTemperatura - 20)).toFixed(4)} g/cm³
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[9px] uppercase font-bold block">Teor Alcoólico</span>
                      <span className={`font-mono font-black ${
                        (96.0 - 264.7 * ((qDensidade + 0.00084 * (qTemperatura - 20)) - 0.8076)) >= 95.1 &&
                        (96.0 - 264.7 * ((qDensidade + 0.00084 * (qTemperatura - 20)) - 0.8076)) <= 96.0
                          ? "text-emerald-600"
                          : "text-rose-600"
                      }`}>
                        {Math.min(100, Math.max(0, Number((96.0 - 264.7 * ((qDensidade + 0.00084 * (qTemperatura - 20)) - 0.8076)).toFixed(1))))}% v/v
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-sky-100/50 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 font-medium">Status da Portaria ANP:</span>
                    <span className={`font-black uppercase px-2 py-0.5 rounded text-[9px] ${
                      (96.0 - 264.7 * ((qDensidade + 0.00084 * (qTemperatura - 20)) - 0.8076)) >= 95.1 &&
                      (96.0 - 264.7 * ((qDensidade + 0.00084 * (qTemperatura - 20)) - 0.8076)) <= 96.0
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-rose-100 text-rose-800 border border-rose-200 animate-pulse"
                    }`}>
                      {(96.0 - 264.7 * ((qDensidade + 0.00084 * (qTemperatura - 20)) - 0.8076)) >= 95.1 &&
                      (96.0 - 264.7 * ((qDensidade + 0.00084 * (qTemperatura - 20)) - 0.8076)) <= 96.0
                        ? "CONFORME (95.1% - 96.0%)"
                        : "REPROVADO"
                      }
                    </span>
                  </div>
                </div>
              )}

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
                    <th className="py-2.5 px-3">Ações</th>
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
                            <div>Medida: {audit.densidade.toFixed(4)} ({audit.temperatura}°C)</div>
                            <div className="font-semibold text-indigo-700 text-[10.5px]">
                              D20: {audit.densidadeCorrigida ? audit.densidadeCorrigida.toFixed(4) : calculateD20(audit.densidade, audit.temperatura, audit.combustivel).toFixed(4)} g/cm³
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                            {audit.combustivel.includes("Gasolina") ? `${audit.teorEtanol}% v/v` : audit.combustivel === "Etanol" ? `${audit.teorEtanol}% M/M` : "—"}
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
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleDeleteQualityAudit(audit.id)}
                              className="p-1 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                              title="Excluir Registro"
                            >
                              <Trash2 className="h-4 w-4" />
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

      {activeSubTab === "especificacoes_2026" && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-800 text-white p-6 rounded-2xl border border-indigo-800/40 shadow-md">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="px-2.5 py-1 bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-[10px] font-black uppercase tracking-widest rounded-full">
                  Vigência 2026 - ANP & Lei nº 14.993/2024
                </span>
                <h3 className="text-lg font-black mt-2 text-white font-display">
                  Tabela Oficial de Conformidade e Especificações de Combustíveis
                </h3>
                <p className="text-xs text-indigo-200/80 mt-1 max-w-2xl leading-relaxed">
                  Parâmetros e limites regulamentares estabelecidos pela Agência Nacional do Petróleo, Gás Natural e Biocombustíveis (ANP) para comercialização em postos revendedores em 2026.
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10 text-center min-w-[160px]">
                <span className="text-[10px] uppercase font-bold text-indigo-300 block">Tolerância de Vazão (20L)</span>
                <span className="text-lg font-black text-emerald-400 font-mono">± 100 mL</span>
                <span className="text-[9px] text-slate-300 block">Portaria Inmetro / ANP</span>
              </div>
            </div>
          </div>

          {/* Specifications Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Gasolina Comum / Aditivada */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                  Gasolina Comum / Aditivada
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                  E27 / E30
                </span>
              </div>
              <ul className="text-xs space-y-2 text-slate-600">
                <li className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Massa Específica (20°C):</span>
                  <span className="font-mono font-bold text-slate-800">715,0 a 775,0 kg/m³</span>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Massa Específica (D20 g/cm³):</span>
                  <span className="font-mono font-bold text-slate-800">0,7150 a 0,7750 g/cm³</span>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Teor de Etanol Anidro:</span>
                  <span className="font-mono font-bold text-indigo-700">26,0% a 30,0% v/v</span>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Octanagem Mínima (RON):</span>
                  <span className="font-mono font-bold text-emerald-700">93,0 RON</span>
                </li>
                <li className="flex justify-between py-1">
                  <span className="text-slate-400 font-medium">Teor Máx. de Enxofre:</span>
                  <span className="font-mono font-bold text-slate-700">50 mg/kg (S50)</span>
                </li>
              </ul>
            </div>

            {/* Gasolina Premium */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block" />
                  Gasolina Premium / Podium
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
                  Alta Octanagem
                </span>
              </div>
              <ul className="text-xs space-y-2 text-slate-600">
                <li className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Massa Específica (20°C):</span>
                  <span className="font-mono font-bold text-slate-800">770,0 a 800,0 kg/m³</span>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Massa Específica (D20 g/cm³):</span>
                  <span className="font-mono font-bold text-slate-800">0,7700 a 0,8000 g/cm³</span>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Teor de Etanol Anidro:</span>
                  <span className="font-mono font-bold text-indigo-700">25,0% a 30,0% v/v</span>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Octanagem Mínima (RON):</span>
                  <span className="font-mono font-bold text-emerald-700">98,0 RON</span>
                </li>
                <li className="flex justify-between py-1">
                  <span className="text-slate-400 font-medium">Teor Máx. de Enxofre:</span>
                  <span className="font-mono font-bold text-slate-700">50 mg/kg (S50)</span>
                </li>
              </ul>
            </div>

            {/* Etanol Hidratado */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  Etanol Hidratado (Comum / Aditivado)
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                  Renovável
                </span>
              </div>
              <ul className="text-xs space-y-2 text-slate-600">
                <li className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Massa Específica (20°C):</span>
                  <span className="font-mono font-bold text-slate-800">807,6 a 811,0 kg/m³</span>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Massa Específica (D20 g/cm³):</span>
                  <span className="font-mono font-bold text-slate-800">0,8076 a 0,8110 g/cm³</span>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Teor Alcoólico (% em Massa):</span>
                  <span className="font-mono font-bold text-indigo-700">92,5 a 93,8 °INPM</span>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Teor Alcoólico (% em Volume):</span>
                  <span className="font-mono font-bold text-emerald-700">95,1% a 96,0% v/v (°GL)</span>
                </li>
                <li className="flex justify-between py-1">
                  <span className="text-slate-400 font-medium">Condutividade Elétrica Máx.:</span>
                  <span className="font-mono font-bold text-slate-700">500 µS/m</span>
                </li>
              </ul>
            </div>

            {/* Diesel S10 (B14 / B15) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-slate-700 inline-block" />
                  Óleo Diesel S10 (Comum / Aditivado)
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full">
                  B14 / B15 2026
                </span>
              </div>
              <ul className="text-xs space-y-2 text-slate-600">
                <li className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Massa Específica (20°C):</span>
                  <span className="font-mono font-bold text-slate-800">820,0 a 850,0 kg/m³</span>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Massa Específica (D20 g/cm³):</span>
                  <span className="font-mono font-bold text-slate-800">0,8200 a 0,8500 g/cm³</span>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Adição Obrigatória de Biodiesel:</span>
                  <span className="font-mono font-bold text-indigo-700">14,0% a 15,0% v/v (B15)</span>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Ponto de Fulgor Mínimo:</span>
                  <span className="font-mono font-bold text-emerald-700">38,0 °C</span>
                </li>
                <li className="flex justify-between py-1">
                  <span className="text-slate-400 font-medium">Teor Máx. de Enxofre:</span>
                  <span className="font-mono font-bold text-slate-700">10 mg/kg (S10)</span>
                </li>
              </ul>
            </div>

            {/* Diesel S500 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-slate-500 inline-block" />
                  Óleo Diesel S500
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-full">
                  Uso Agro / Veículos Antigos
                </span>
              </div>
              <ul className="text-xs space-y-2 text-slate-600">
                <li className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Massa Específica (20°C):</span>
                  <span className="font-mono font-bold text-slate-800">820,0 a 865,0 kg/m³</span>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Massa Específica (D20 g/cm³):</span>
                  <span className="font-mono font-bold text-slate-800">0,8200 a 0,8650 g/cm³</span>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Ponto de Fulgor Mínimo:</span>
                  <span className="font-mono font-bold text-emerald-700">38,0 °C</span>
                </li>
                <li className="flex justify-between py-1">
                  <span className="text-slate-400 font-medium">Teor Máx. de Enxofre:</span>
                  <span className="font-mono font-bold text-slate-700">500 mg/kg (S500)</span>
                </li>
              </ul>
            </div>

            {/* Procedimentos Regulamentares */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xs space-y-3">
              <h4 className="text-xs font-black text-indigo-300 uppercase tracking-wide flex items-center gap-2 pb-2 border-b border-slate-800">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                Procedimentos de Teste Obrigatórios
              </h4>
              <div className="space-y-2 text-[11px] text-slate-300 leading-relaxed">
                <p>
                  <strong>1. Teste de Proveta (Etanol na Gasolina):</strong> Em proveta de 100ml graduada de 1ml, misture 50ml de gasolina com 50ml de água salina (10% NaCl). A taxa de decantação após 15 min indica o percentual legal (faixa 26% a 30%).
                </p>
                <p>
                  <strong>2. Termodensímetro a 20°C:</strong> Faça a medição com o densímetro e termômetro calibrados e aplique a tabela de conversão D20 ($D_{20} = D_t + f \cdot (t - 20)$).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
