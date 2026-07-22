/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AppState, FuelTank } from "../types";
import { FileText, Calendar, TrendingUp, DollarSign, Download, Printer, AlertTriangle, CheckSquare, Sparkles } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface ReportsAdvancedProps {
  appState: AppState;
}

export default function ReportsAdvanced({ appState }: ReportsAdvancedProps) {
  const { tanks = [], shifts = [], transactions = [], calibrations = [], qualityAudits = [] } = appState;

  // Custom range states
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  // Filter transactions in range
  const filteredTxs = transactions.filter((tx) => {
    const txDate = tx.data.substring(0, 10);
    return txDate >= startDate && txDate <= endDate;
  });

  // Math totals
  const totalRevenue = filteredTxs
    .filter((tx) => tx.tipo === "Receita")
    .reduce((sum, tx) => sum + tx.valor, 0);

  const totalExpense = filteredTxs
    .filter((tx) => tx.tipo === "Despesa")
    .reduce((sum, tx) => sum + tx.valor, 0);

  const netProfit = totalRevenue - totalExpense;

  // Fuel sales specific calculation (revenue from fuel category)
  const fuelSalesRevenue = filteredTxs
    .filter((tx) => tx.tipo === "Receita" && tx.categoria === "Combustíveis")
    .reduce((sum, tx) => sum + tx.valor, 0);

  // Convenience store sales specific
  const convenienceSalesRevenue = filteredTxs
    .filter((tx) => tx.tipo === "Receita" && tx.categoria === "Conveniência")
    .reduce((sum, tx) => sum + tx.valor, 0);

  // Service sales (Oil changes/car washes)
  const servicesSalesRevenue = filteredTxs
    .filter((tx) => tx.tipo === "Receita" && tx.categoria === "Serviços (Troca de Óleo / Ducha)")
    .reduce((sum, tx) => sum + tx.valor, 0);

  // Critical stock levels
  const criticalTanks = tanks.filter((t) => t.volumeAtual <= t.pontoCriticoAlerta);

  // Triggering native window print with stylized media queries for advanced PDF compiler simulation
  const handlePrint = (layoutType: "A4" | "80mm") => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Permita pop-ups para abrir a janela de impressão do PDF.");
      return;
    }

    const title = `Relatório Consolidade Meu Posto - Período: ${new Date(
      startDate + "T00:00:00"
    ).toLocaleDateString("pt-BR")} a ${new Date(endDate + "T00:00:00").toLocaleDateString("pt-BR")}`;

    const isThermal = layoutType === "80mm";

    const criticalTanksHTML = criticalTanks.length > 0 
      ? criticalTanks.map(t => `<tr><td>${t.identificador}</td><td>${t.combustivel}</td><td>${t.volumeAtual.toLocaleString()} L</td></tr>`).join("")
      : "<tr><td colspan='3' style='text-align:center;'>Nenhum tanque abaixo do ponto crítico</td></tr>";

    const lastTransactionsHTML = filteredTxs.slice(-10).reverse().map(tx => `
      <tr>
        <td>${new Date(tx.data).toLocaleDateString("pt-BR")}</td>
        <td>${tx.descricao}</td>
        <td>${tx.categoria}</td>
        <td style="text-align:right; font-weight:bold; color: ${tx.tipo === "Receita" ? "green" : "red"};">
          ${tx.tipo === "Receita" ? "+" : "-"} R$ ${tx.valor.toFixed(2)}
        </td>
      </tr>
    `).join("");

    const style = isThermal
      ? `
      body {
        font-family: 'Courier New', monospace;
        width: 80mm;
        margin: 0 auto;
        padding: 5px;
        color: #000;
        font-size: 11px;
        line-height: 1.3;
      }
      h1 { font-size: 16px; margin: 5px 0; text-align: center; }
      h2 { font-size: 13px; margin: 10px 0 5px 0; border-bottom: 1px dashed #000; padding-bottom: 2px; }
      table { width: 100%; border-collapse: collapse; margin-top: 5px; }
      th, td { text-align: left; padding: 3px 0; font-size: 10px; }
      .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
      .bold { font-weight: bold; }
      .text-right { text-align: right; }
      .border-top { border-top: 1px dashed #000; padding-top: 5px; }
      .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
    `
      : `
      body {
        font-family: "Helvetica Neue", Arial, sans-serif;
        color: #334155;
        padding: 40px;
        font-size: 13px;
        line-height: 1.5;
        max-width: 800px;
        margin: 0 auto;
      }
      h1 { font-size: 24px; color: #1e3a8a; margin-bottom: 5px; }
      h2 { font-size: 16px; color: #0f172a; margin-top: 25px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; }
      .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1e3a8a; padding-bottom: 15px; margin-bottom: 30px; }
      .station-info { text-align: right; font-size: 11px; color: #64748b; }
      .grid-kpis { display: grid; grid-template-cols: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
      .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; rounded-lg; border-radius: 8px; }
      .kpi-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; }
      .kpi-value { font-size: 20px; font-weight: bold; margin-top: 5px; color: #0f172a; }
      table { width: 100%; border-collapse: collapse; margin-top: 15px; }
      th { background-color: #f1f5f9; color: #475569; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
      td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
      .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
    `;

    const docContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>${style}</style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>MEU POSTO LTDA</h1>
              <p class="bold">Relatório Financeiro & Operacional</p>
            </div>
            ${!isThermal ? `
              <div class="station-info">
                <p class="bold">CNPJ Posto: ${appState.users[0]?.cnpjPosto || "12.345.678/0001-99"}</p>
                <p>Data de Geração: ${new Date().toLocaleString("pt-BR")}</p>
                <p>Período: ${startDate} até ${endDate}</p>
              </div>
            ` : ""}
          </div>

          ${isThermal ? `
            <p>CNPJ: ${appState.users[0]?.cnpjPosto || "12.345.678/0001-99"}</p>
            <p>Data Impressão: ${new Date().toLocaleString("pt-BR")}</p>
            <p>Período: ${startDate} a ${endDate}</p>
            <div class="divider"></div>
          ` : ""}

          <h2>Faturamento Consolidado</h2>
          ${!isThermal ? `
            <div class="grid-kpis">
              <div class="kpi-card">
                <div class="kpi-title">Faturamento Total</div>
                <div class="kpi-value" style="color: #16a34a;">R$ ${totalRevenue.toFixed(2)}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-title">Despesas Operacionais</div>
                <div class="kpi-value" style="color: #dc2626;">R$ ${totalExpense.toFixed(2)}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-title">Lucro Líquido</div>
                <div class="kpi-value" style="color: #2563eb;">R$ ${netProfit.toFixed(2)}</div>
              </div>
            </div>
          ` : `
            <table>
              <tr><td class="bold">Faturamento Bruto:</td><td class="text-right bold">R$ ${totalRevenue.toFixed(2)}</td></tr>
              <tr><td class="bold">Despesas Totais:</td><td class="text-right">R$ ${totalExpense.toFixed(2)}</td></tr>
              <tr class="border-top"><td class="bold">Lucro Líquido:</td><td class="text-right bold">R$ ${netProfit.toFixed(2)}</td></tr>
            </table>
            <div class="divider"></div>
          `}

          <h2>Distribuição de Receitas</h2>
          <table>
            ${isThermal ? `
              <tr><td>Venda de Combustíveis:</td><td class="text-right">R$ ${fuelSalesRevenue.toFixed(2)}</td></tr>
              <tr><td>Loja Conveniência:</td><td class="text-right">R$ ${convenienceSalesRevenue.toFixed(2)}</td></tr>
              <tr><td>Serviços de Ducha/Óleo:</td><td class="text-right">R$ ${servicesSalesRevenue.toFixed(2)}</td></tr>
            ` : `
              <thead>
                <tr>
                  <th>Categoria de Receita</th>
                  <th>Percentual</th>
                  <th style="text-align:right;">Faturamento Bruto</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Combustíveis (Bicos & Pista)</td>
                  <td>${totalRevenue > 0 ? Math.round((fuelSalesRevenue / totalRevenue) * 100) : 0}%</td>
                  <td style="text-align:right; font-weight:bold;">R$ ${fuelSalesRevenue.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Loja de Conveniência Integrada</td>
                  <td>${totalRevenue > 0 ? Math.round((convenienceSalesRevenue / totalRevenue) * 100) : 0}%</td>
                  <td style="text-align:right; font-weight:bold;">R$ ${convenienceSalesRevenue.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Serviços (Troca de Óleo / Ducha)</td>
                  <td>${totalRevenue > 0 ? Math.round((servicesSalesRevenue / totalRevenue) * 100) : 0}%</td>
                  <td style="text-align:right; font-weight:bold;">R$ ${servicesSalesRevenue.toFixed(2)}</td>
                </tr>
              </tbody>
            `}
          </table>

          ${!isThermal ? "<div class='divider'></div>" : ""}

          <h2>Estoque Crítico Alerta</h2>
          <table>
            <thead>
              <tr>
                <th>Identificador</th>
                <th>Combustível</th>
                <th style="${!isThermal ? "text-align:right;" : ""}">Volume Atual</th>
              </tr>
            </thead>
            <tbody>
              ${criticalTanksHTML}
            </tbody>
          </table>

          ${!isThermal ? `
            <h2>Lançamentos de Fluxo de Caixa (Recentes)</h2>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th style="text-align:right;">Valor</th>
                </tr>
              </thead>
              <tbody>
                ${lastTransactionsHTML}
              </tbody>
            </table>
          ` : ""}

          <div class="footer">
            <p>Laudo Técnico Emitido no ERP Meu Posto corporativo.</p>
            <p>© ${new Date().getFullYear()} Meu Posto. Todos os direitos reservados.</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(docContent);
    printWindow.document.close();
  };

  const downloadReportsPDF = () => {
    try {
      const doc = new jsPDF("p", "mm", "a4");
      const periodText = `${startDate.split("-").reverse().join("/")} a ${endDate.split("-").reverse().join("/")}`;
      const emissionDate = new Date().toLocaleString("pt-BR");
      const stationCnpj = appState.users[0]?.cnpjPosto || "12.345.678/0001-99";
      const stationName = appState.nomePosto || "MEU POSTO ERP";

      const startX = 12;
      const endX = 198;
      const usableWidth = 186;

      // Header
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(1);
      doc.line(startX, 15, endX, 15);

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(stationName.toUpperCase(), startX, 22);

      doc.setTextColor(75, 85, 99);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`RELATÓRIO FINANCEIRO & ANALÍTICO - CNPJ: ${stationCnpj}`, startX, 27);

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Período: ${periodText}`, endX, 22, { align: "right" });
      doc.text(`Emissão: ${emissionDate}`, endX, 26, { align: "right" });

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(startX, 31, endX, 31);

      // KPI Summary Box in PDF
      const cardW = usableWidth / 3;
      const cardH = 16;
      const cardY = 35;

      // Card 1: Faturamento
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(187, 247, 208);
      doc.rect(startX, cardY, cardW - 2, cardH, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(22, 101, 52);
      doc.text("FATURAMENTO TOTAL", startX + (cardW - 2) / 2, cardY + 5, { align: "center" });
      doc.setFontSize(9.5);
      doc.setTextColor(22, 163, 74);
      doc.text(`R$ ${totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, startX + (cardW - 2) / 2, cardY + 12, { align: "center" });

      // Card 2: Despesas
      const card2X = startX + cardW;
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(254, 202, 202);
      doc.rect(card2X, cardY, cardW - 2, cardH, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(153, 27, 27);
      doc.text("DESPESAS OPERACIONAIS", card2X + (cardW - 2) / 2, cardY + 5, { align: "center" });
      doc.setFontSize(9.5);
      doc.setTextColor(220, 38, 38);
      doc.text(`R$ ${totalExpense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, card2X + (cardW - 2) / 2, cardY + 12, { align: "center" });

      // Card 3: Lucro Líquido
      const card3X = card2X + cardW;
      doc.setFillColor(239, 246, 255);
      doc.setDrawColor(191, 219, 254);
      doc.rect(card3X, cardY, cardW - 2, cardH, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(30, 64, 175);
      doc.text("RESULTADO LÍQUIDO", card3X + (cardW - 2) / 2, cardY + 5, { align: "center" });
      doc.setFontSize(9.5);
      if (netProfit >= 0) doc.setTextColor(22, 163, 74);
      else doc.setTextColor(220, 38, 38);
      doc.text(`R$ ${netProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, card3X + (cardW - 2) / 2, cardY + 12, { align: "center" });

      let currentY = 57;

      // Table 1: Receitas por Categoria
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("1. DISTRIBUIÇÃO DAS RECEITAS POR CATEGORIA", startX, currentY);
      currentY += 3;

      const categoryRows = [
        [
          "Combustíveis (Bicos & Pista)",
          `${totalRevenue > 0 ? Math.round((fuelSalesRevenue / totalRevenue) * 100) : 0}%`,
          `R$ ${fuelSalesRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
        ],
        [
          "Loja de Conveniência Integrada",
          `${totalRevenue > 0 ? Math.round((convenienceSalesRevenue / totalRevenue) * 100) : 0}%`,
          `R$ ${convenienceSalesRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
        ],
        [
          "Serviços (Troca de Óleo / Ducha)",
          `${totalRevenue > 0 ? Math.round((servicesSalesRevenue / totalRevenue) * 100) : 0}%`,
          `R$ ${servicesSalesRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
        ]
      ];

      autoTable(doc, {
        startY: currentY,
        head: [["Categoria de Receita", "Participação (%)", "Faturamento Bruto (R$)"]],
        body: categoryRows,
        theme: "grid",
        margin: { left: startX, right: 12 },
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: "bold",
        },
        columnStyles: {
          0: { halign: "left", fontStyle: "bold" },
          1: { halign: "center" },
          2: { halign: "right", fontStyle: "bold" },
        },
        styles: { fontSize: 8, cellPadding: 3, lineColor: [226, 232, 240] },
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;

      // Table 2: Estoque Crítico de Tanques
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("2. ESTADO DO ESTOQUE DE TANQUES (NÍVEIS CRÍTICOS)", startX, currentY);
      currentY += 3;

      const tankRows = tanks.map((t) => [
        t.identificador,
        t.combustivel,
        `${(t.capacidadeMaxima || 0).toLocaleString("pt-BR")} L`,
        `${(t.volumeAtual || 0).toLocaleString("pt-BR")} L`,
        `${(t.pontoCriticoAlerta || 0).toLocaleString("pt-BR")} L`,
        t.volumeAtual <= t.pontoCriticoAlerta ? "ALERTA CRÍTICO" : "NORMAL"
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [["Tanque", "Combustível", "Capacidade", "Volume Atual", "Ponto Crítico", "Status"]],
        body: tankRows,
        theme: "grid",
        margin: { left: startX, right: 12 },
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: "bold",
        },
        columnStyles: {
          0: { halign: "left", fontStyle: "bold" },
          1: { halign: "left" },
          2: { halign: "right" },
          3: { halign: "right", fontStyle: "bold" },
          4: { halign: "right" },
          5: { halign: "center", fontStyle: "bold" },
        },
        styles: { fontSize: 7.5, cellPadding: 2.5, lineColor: [226, 232, 240] },
        didParseCell: function (data: any) {
          if (data.row.section === "body" && data.column.index === 5) {
            if (data.cell.text[0] === "ALERTA CRÍTICO") {
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fillColor = [254, 242, 242];
            } else {
              data.cell.styles.textColor = [22, 163, 74];
            }
          }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;

      // Table 3: Transações Recentes
      if (currentY > 220) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("3. LANÇAMENTOS DO FLUXO DE CAIXA NO PERÍODO", startX, currentY);
      currentY += 3;

      const txRows = filteredTxs.slice(-25).reverse().map((tx) => [
        tx.data ? tx.data.substring(0, 10).split("-").reverse().join("/") : "-",
        tx.descricao,
        tx.categoria,
        tx.tipo,
        `R$ ${tx.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [["Data", "Descrição", "Categoria", "Tipo", "Valor (R$)"]],
        body: txRows.length > 0 ? txRows : [["-", "Nenhuma transação registrada no período", "-", "-", "R$ 0,00"]],
        theme: "grid",
        margin: { left: startX, right: 12 },
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: "bold",
        },
        columnStyles: {
          0: { halign: "center" },
          1: { halign: "left" },
          2: { halign: "left" },
          3: { halign: "center", fontStyle: "bold" },
          4: { halign: "right", fontStyle: "bold" },
        },
        styles: { fontSize: 7.5, cellPadding: 2.5, lineColor: [226, 232, 240] },
        didParseCell: function (data: any) {
          if (data.row.section === "body" && data.column.index === 3) {
            if (data.cell.text[0] === "Receita") {
              data.cell.styles.textColor = [22, 163, 74];
            } else if (data.cell.text[0] === "Despesa") {
              data.cell.styles.textColor = [220, 38, 38];
            }
          }
        }
      });

      // Footer with page numbering
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${totalPages}`, endX, 285, { align: "right" });
        doc.text(`Gerado por Meu Posto ERP - ${emissionDate}`, startX, 285);
      }

      doc.save(`Relatorio_Gerencial_MeuPosto_${startDate}_${endDate}.pdf`);
    } catch (err: any) {
      alert("Erro ao gerar PDF do relatório: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Date filter top controls */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 font-display">
            <FileText className="text-indigo-600 h-6 w-6" />
            Painel Analítico de Relatórios
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Filtre dados financeiros consolidando litragens, lucratividade e despesas operacionais por data
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="text-slate-500">De:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none text-slate-800 focus:outline-none font-semibold font-mono"
            />
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="text-slate-500">Até:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none text-slate-800 focus:outline-none font-semibold font-mono"
            />
          </div>
        </div>
      </div>

      {/* KPI stats consolidated row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-600">
            <TrendingUp className="h-20 w-20" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Faturamento do Período</p>
            <p className="text-3xl font-extrabold text-slate-800 mt-2 font-display">
              R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-xs text-slate-400 mt-4 pt-3 border-t border-slate-100">
            Soma de receitas brutas no período selecionado
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-rose-600">
            <DollarSign className="h-20 w-20" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Despesas de Operação</p>
            <p className="text-3xl font-extrabold text-slate-800 mt-2 font-display">
              R$ {totalExpense.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-xs text-slate-400 mt-4 pt-3 border-t border-slate-100">
            Despesas operacionais e custos consolidados
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-indigo-600">
            <Sparkles className="h-20 w-20" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Resultado de Lucratividade</p>
            <p className={`text-3xl font-extrabold mt-2 font-display ${netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              R$ {netProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-xs text-slate-400 mt-4 pt-3 border-t border-slate-100">
            Resultado financeiro líquido no período
          </div>
        </div>
      </div>

      {/* Advanced charts breakdown & PDF compilation button */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm col-span-2 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
            Faturamento por Categoria (Período Filtrado)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Combustíveis</span>
              <p className="text-lg font-bold text-slate-800 mt-1">R$ {fuelSalesRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-indigo-600 rounded-full"
                  style={{ width: `${totalRevenue > 0 ? (fuelSalesRevenue / totalRevenue) * 100 : 0}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 block mt-1.5">
                {totalRevenue > 0 ? Math.round((fuelSalesRevenue / totalRevenue) * 100) : 0}% das receitas
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Conveniência</span>
              <p className="text-lg font-bold text-slate-800 mt-1">R$ {convenienceSalesRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-emerald-600 rounded-full"
                  style={{ width: `${totalRevenue > 0 ? (convenienceSalesRevenue / totalRevenue) * 100 : 0}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 block mt-1.5">
                {totalRevenue > 0 ? Math.round((convenienceSalesRevenue / totalRevenue) * 100) : 0}% das receitas
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Serviços Integrados</span>
              <p className="text-lg font-bold text-slate-800 mt-1">R$ {servicesSalesRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-amber-600 rounded-full"
                  style={{ width: `${totalRevenue > 0 ? (servicesSalesRevenue / totalRevenue) * 100 : 0}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 block mt-1.5">
                {totalRevenue > 0 ? Math.round((servicesSalesRevenue / totalRevenue) * 100) : 0}% das receitas
              </span>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2">Relatório de Estoques Abaixo do Nível Crítico</h4>
            {criticalTanks.length === 0 ? (
              <p className="text-xs text-emerald-600 font-semibold">✓ Todos os tanques operam em volumes seguros!</p>
            ) : (
              <div className="space-y-1.5">
                {criticalTanks.map((t) => (
                  <div key={t.id} className="flex justify-between items-center text-xs bg-rose-50 p-2 rounded-lg border border-rose-150">
                    <span className="font-semibold text-rose-700">{t.identificador} ({t.combustivel})</span>
                    <span className="font-mono font-bold text-rose-700">{t.volumeAtual.toLocaleString()} L restantes</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* PDF Compiler actions */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
            <Printer className="text-indigo-600 h-4 w-4" />
            Compilador de PDF Nativo
          </h3>
          <p className="text-xs text-slate-500">
            Gere relatórios técnicos prontos para auditorias. Escolha o formato de saída ideal para impressão física ou arquivamento PDF digital:
          </p>

          <div className="space-y-3 pt-2">
            <button
              onClick={downloadReportsPDF}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-900/20"
            >
              <Download className="h-4 w-4" />
              Exportar Tabela de Relatório (jsPDF)
            </button>

            <button
              onClick={() => handlePrint("A4")}
              className="w-full py-2.5 px-4 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              Visualização de Impressão (A4)
            </button>

            <button
              onClick={() => handlePrint("80mm")}
              className="w-full py-2.5 px-4 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-2 font-mono cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              Imprimir Térmico (80mm)
            </button>
          </div>

          <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <strong>Download Direto:</strong> O botão <strong>"Exportar Tabela de Relatório (jsPDF)"</strong> gera e baixa instantaneamente um arquivo PDF com todas as tabelas e KPIs consolidados.
          </div>
        </div>
      </div>
    </div>
  );
}
