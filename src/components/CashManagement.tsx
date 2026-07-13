/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  AppState,
  CashTransaction,
  NozzleClosing,
  ShiftReconciliation,
  TransactionType,
  TransactionCategory,
  PaymentMethod,
} from "../types";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Scale,
  Plus,
  Activity,
  AlertOctagon,
  CheckCircle2,
  ListCollapse,
} from "lucide-react";

interface CashManagementProps {
  appState: AppState;
  userRole: string;
  onUpdateTransactions: (transactions: CashTransaction[]) => void;
  onUpdateClosings: (closings: NozzleClosing[]) => void;
  onUpdateReconciliations: (reconciliations: ShiftReconciliation[]) => void;
}

export default function CashManagement({
  appState,
  userRole,
  onUpdateTransactions,
  onUpdateClosings,
  onUpdateReconciliations,
}: CashManagementProps) {
  const { transactions, nozzles, shifts, nozzleClosings, reconciliations } = appState;
  const isReadOnlyFrentista = userRole === "Frentista" && false; // Frentista CAN register entries and closing numbers!

  // Quick transaction form state
  const [txTipo, setTxTipo] = useState<TransactionType>("Receita");
  const [txCategoria, setTxCategoria] = useState<TransactionCategory>("Conveniência");
  const [txDescricao, setTxDescricao] = useState("");
  const [txValor, setTxValor] = useState(150);
  const [txForma, setTxForma] = useState<PaymentMethod>("Dinheiro");

  // Nozzle closing state (fechamento de bico)
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [selectedNozzleId, setSelectedNozzleId] = useState("");
  const [encerranteFinal, setEncerranteFinal] = useState(124650);

  // Turn Audit/Reconciliation state (fechamento de caixa)
  const [auditShiftId, setAuditShiftId] = useState("");
  const [auditFrentista, setAuditFrentista] = useState("");
  const [valorDeclaradoFisico, setValorDeclaradoFisico] = useState(1000);
  const [auditObservacoes, setAuditObservacoes] = useState("");

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Get active shifts for dropdowns
  const activeAndClosedShifts = shifts.filter((s) => s.status !== "Planejado");

  // Handle Quick Transaction creation
  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!txDescricao || txValor <= 0) {
      setError("Insira uma descrição válida e valor maior que zero.");
      return;
    }

    const newTx: CashTransaction = {
      id: "tx_" + Date.now(),
      tipo: txTipo,
      categoria: txCategoria,
      descricao: txDescricao,
      valor: Number(txValor),
      formaPagamento: txTipo === "Receita" ? txForma : undefined,
      data: new Date().toISOString().substring(0, 16),
    };

    onUpdateTransactions([...transactions, newTx]);
    setTxDescricao("");
    setSuccess("Lançamento financeiro registrado com sucesso!");
    setTimeout(() => setSuccess(""), 3000);
  };

  // Handle Nozzle Turn Closing (Leitura final de bico)
  const handleCreateNozzleClosing = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedShiftId || !selectedNozzleId) {
      setError("Selecione o turno e o bico de combustível correspondente.");
      return;
    }

    const nozzle = nozzles.find((n) => n.id === selectedNozzleId);
    if (!nozzle) return;

    // Check if closing is lower than initial mechanical reading
    if (encerranteFinal < nozzle.encerranteInicial) {
      setError(
        `O encerrante final (${encerranteFinal.toLocaleString()} L) não pode ser menor que o encerrante inicial (${nozzle.encerranteInicial.toLocaleString()} L).`
      );
      return;
    }

    const litrosVendidos = encerranteFinal - nozzle.encerranteInicial;
    const valorVendidoCalculado = litrosVendidos * nozzle.precoPorLitro;

    // Check if already closed for this shift
    const alreadyClosed = nozzleClosings.some(
      (nc) => nc.shiftId === selectedShiftId && nc.nozzleId === selectedNozzleId
    );
    if (alreadyClosed) {
      setError("Este bico já foi fechado para o turno selecionado.");
      return;
    }

    const newClosing: NozzleClosing = {
      id: "nc_" + Date.now(),
      shiftId: selectedShiftId,
      nozzleId: selectedNozzleId,
      encerranteFinal: Number(encerranteFinal),
      litrosVendidos,
      valorVendidoCalculado,
    };

    // Auto add a transaction in cash register corresponding to this nozzle revenue
    const assocShift = shifts.find((s) => s.id === selectedShiftId);
    const newTx: CashTransaction = {
      id: "tx_nc_" + Date.now(),
      shiftId: selectedShiftId,
      tipo: "Receita",
      categoria: "Combustíveis",
      descricao: `Venda ${litrosVendidos}L de ${nozzle.numeroBico} (${assocShift?.turno || ""})`,
      valor: valorVendidoCalculado,
      formaPagamento: "Dinheiro", // default to cashier physical cash
      data: new Date().toISOString().substring(0, 16),
    };

    onUpdateClosings([...nozzleClosings, newClosing]);
    onUpdateTransactions([...transactions, newTx]);

    setSuccess(
      `Bico fechado! Calculados: ${litrosVendidos.toLocaleString()} L vendidos (Faturamento: R$ ${valorVendidoCalculado.toFixed(
        2
      )}).`
    );
    setTimeout(() => setSuccess(""), 4000);
  };

  // Helper to calculate total theoretical cash for a shift:
  // (Sum of all nozzle closings on that shift) + (other Revenues on that shift) - (Expenses on that shift)
  const calculateShiftTheoretical = (shiftId: string) => {
    if (!shiftId) return 0;
    const closingsSum = nozzleClosings
      .filter((nc) => nc.shiftId === shiftId)
      .reduce((sum, nc) => sum + nc.valorVendidoCalculado, 0);

    const otherRevenues = transactions
      .filter((t) => t.shiftId === shiftId && t.tipo === "Receita" && t.categoria !== "Combustíveis")
      .reduce((sum, t) => sum + t.valor, 0);

    const expenses = transactions
      .filter((t) => t.shiftId === shiftId && t.tipo === "Despesa")
      .reduce((sum, t) => sum + t.valor, 0);

    return closingsSum + otherRevenues - expenses;
  };

  // Perform shift reconciliation
  const handleCreateReconciliation = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!auditShiftId || !auditFrentista) {
      setError("Preencha o turno e o nome do frentista para auditoria.");
      return;
    }

    const theoretical = calculateShiftTheoretical(auditShiftId);
    const diferenca = valorDeclaradoFisico - theoretical;

    const newReconc: ShiftReconciliation = {
      id: "rec_" + Date.now(),
      shiftId: auditShiftId,
      frentistaId: "u_manual",
      frentistaNome: auditFrentista,
      valorDeclaradoFisico: Number(valorDeclaradoFisico),
      valorCalculadoTeorico: theoretical,
      diferenca,
      observacoes: auditObservacoes,
      dataFechamento: new Date().toISOString(),
    };

    onUpdateReconciliations([...reconciliations, newReconc]);
    setAuditObservacoes("");
    setSuccess(
      diferenca < 0
        ? `Fechamento salvo com QUEBRA de R$ ${Math.abs(diferenca).toFixed(2)}`
        : `Fechamento salvo com SUCESSO! Diferença: R$ ${diferenca.toFixed(2)}`
    );
    setTimeout(() => setSuccess(""), 4000);
  };

  const calculatedDifference = valorDeclaradoFisico - calculateShiftTheoretical(auditShiftId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 font-display">
            <DollarSign className="text-indigo-600 h-6 w-6" />
            Caixa, Turnos e Auditorias Financeiras
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Lance despesas, registre leituras de encerrantes e faça auditoria instantânea de quebras de caixa
          </p>
        </div>
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm rounded-xl flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          {success}
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-sm rounded-xl flex items-center gap-2">
          <AlertOctagon className="h-4 w-4 text-rose-600" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Step 1: Nozzle closing mechanical input */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
            <Activity className="text-indigo-600 h-4 w-4" />
            1. Leituras de Encerrantes de Bico
          </h3>
          <p className="text-[11px] text-slate-500">
            Frentistas devem lançar a leitura mecânica do hodômetro no final do seu turno para computar as vendas reais de combustível.
          </p>

          <form onSubmit={handleCreateNozzleClosing} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Turno Ativo</label>
              <select
                value={selectedShiftId}
                onChange={(e) => {
                  setSelectedShiftId(e.target.value);
                  // preset reasonable final odometer based on selected nozzle
                  if (selectedNozzleId) {
                    const n = nozzles.find((nozzle) => nozzle.id === selectedNozzleId);
                    if (n) setEncerranteFinal(n.encerranteInicial + 100);
                  }
                }}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">Selecione o Turno</option>
                {activeAndClosedShifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.data} - {s.turno}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Bico Correspondente</label>
              <select
                value={selectedNozzleId}
                onChange={(e) => {
                  setSelectedNozzleId(e.target.value);
                  const n = nozzles.find((nozzle) => nozzle.id === e.target.value);
                  if (n) {
                    setEncerranteFinal(n.encerranteInicial + 120); // mock increment suggestion
                  }
                }}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">Selecione o Bico</option>
                {nozzles.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.numeroBico} (Inicial: {n.encerranteInicial.toLocaleString()} L)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Leitura de Encerrante Final (Litros)</label>
              <input
                type="number"
                value={encerranteFinal}
                onChange={(e) => setEncerranteFinal(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
              {selectedNozzleId && (
                <p className="text-[10px] text-slate-500 mt-1">
                  Vendas = Encerrante Final - Inicial
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              Registrar Fechamento de Bico
            </button>
          </form>
        </div>

        {/* Step 2: Audit shift and physical cash declaration */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
            <Scale className="text-indigo-600 h-4 w-4" />
            2. Auditoria e Fechamento de Turno
          </h3>
          <p className="text-[11px] text-slate-500">
            Compare o faturamento teórico calculado com os valores físicos declarados pelo frentista para apontar quebras em tempo real.
          </p>

          <form onSubmit={handleCreateReconciliation} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Selecione o Turno</label>
              <select
                value={auditShiftId}
                onChange={(e) => {
                  setAuditShiftId(e.target.value);
                  const s = shifts.find((shift) => shift.id === e.target.value);
                  if (s) {
                    setAuditFrentista(s.frentistaResponsavel);
                    setValorDeclaradoFisico(calculateShiftTheoretical(e.target.value));
                  }
                }}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">Selecione para auditar</option>
                {activeAndClosedShifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.data} - {s.turno}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Frentista Operador</label>
              <input
                type="text"
                required
                value={auditFrentista}
                onChange={(e) => setAuditFrentista(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                placeholder="Nome do Frentista"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Valor Físico Declarado (R$)</label>
              <input
                type="number"
                step="0.01"
                value={valorDeclaradoFisico}
                onChange={(e) => setValorDeclaradoFisico(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Observações da Quebra</label>
              <textarea
                value={auditObservacoes}
                onChange={(e) => setAuditObservacoes(e.target.value)}
                className="w-full px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                placeholder="Ex: Troco incorreto ou vale anotado"
                rows={2}
              />
            </div>

            {/* Live audit widget */}
            {auditShiftId && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Teórico Calculado:</span>
                  <span className="font-mono text-slate-800 font-semibold">R$ {calculateShiftTheoretical(auditShiftId).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs border-t border-slate-200 pt-1.5">
                  <span className="text-slate-500">Diferença/Falta:</span>
                  <span
                    className={`font-mono font-bold ${
                      calculatedDifference < 0 ? "text-rose-600 animate-pulse" : "text-emerald-600"
                    }`}
                  >
                    R$ {calculatedDifference.toFixed(2)}
                  </span>
                </div>
                {calculatedDifference < 0 && (
                  <div className="text-[10px] text-rose-600 font-semibold uppercase tracking-wider flex items-center gap-1 mt-1">
                    ⚠️ ALERTA DE QUEBRA DE CAIXA!
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              Gravar Auditoria de Fechamento
            </button>
          </form>
        </div>

        {/* Quick manual entries */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
            <Plus className="text-indigo-600 h-4 w-4" />
            Lançamento Rápido de Pista / Loja
          </h3>
          <p className="text-[11px] text-slate-500">
            Adicione outras receitas (loja de conveniência, serviços) ou despesas de pista que entram na soma geral.
          </p>

          <form onSubmit={handleCreateTransaction} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tipo</label>
                <select
                  value={txTipo}
                  onChange={(e) => setTxTipo(e.target.value as TransactionType)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="Receita">Receita</option>
                  <option value="Despesa">Despesa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Categoria</label>
                <select
                  value={txCategoria}
                  onChange={(e) => setTxCategoria(e.target.value as TransactionCategory)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="Combustíveis">Combustíveis</option>
                  <option value="Conveniência">Conveniência</option>
                  <option value="Serviços (Troca de Óleo / Ducha)">Serviços</option>
                  <option value="Despesas Operacionais">Despesas Op.</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Descrição</label>
              <input
                type="text"
                required
                value={txDescricao}
                onChange={(e) => setTxDescricao(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                placeholder="Ex: Coca-Cola e salgados loja"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Valor (R$)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={txValor}
                  onChange={(e) => setTxValor(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {txTipo === "Receita" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Pagamento</label>
                  <select
                    value={txForma}
                    onChange={(e) => setTxForma(e.target.value as PaymentMethod)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cartão de Crédito">Cartão Crédito</option>
                    <option value="Cartão de Débito">Cartão Débito</option>
                    <option value="PIX">PIX</option>
                    <option value="Prazo">A Prazo</option>
                  </select>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              Registrar Lançamento
            </button>
          </form>
        </div>
      </div>

      {/* Historical logs and audits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash flow stream */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <ListCollapse className="h-4 w-4 text-indigo-600" /> Fluxo de Caixa Recente
          </h3>
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {transactions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Nenhum lançamento no fluxo de caixa.</p>
            ) : (
              transactions
                .slice()
                .reverse()
                .map((tx) => (
                  <div
                    key={tx.id}
                    className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{tx.descricao}</span>
                        <span className="text-[10px] text-slate-600 uppercase tracking-wide bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {tx.categoria}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {tx.formaPagamento && `Pago via ${tx.formaPagamento} | `}
                        {new Date(tx.data).toLocaleString("pt-BR")}
                      </p>
                    </div>

                    <div
                      className={`font-mono font-bold flex items-center gap-1 ${
                        tx.tipo === "Receita" ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {tx.tipo === "Receita" ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      R$ {tx.valor.toFixed(2)}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Turn Audits List */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Scale className="h-4 w-4 text-indigo-600" /> Auditorias de Fechamento Gravadas
          </h3>
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {reconciliations.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Nenhuma auditoria realizada ainda.</p>
            ) : (
              reconciliations
                .slice()
                .reverse()
                .map((rec) => (
                  <div
                    key={rec.id}
                    className={`p-3 rounded-xl border ${
                      rec.diferenca < 0 ? "bg-rose-50/50 border-rose-200" : "bg-slate-50 border-slate-200"
                    } text-xs`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-800">Frentista: {rec.frentistaNome}</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Fechado em: {new Date(rec.dataFechamento).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${
                          rec.diferenca < 0
                            ? "bg-rose-100 text-rose-700 border border-rose-200"
                            : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        Dif: R$ {rec.diferenca.toFixed(2)}
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-white/65 p-2 rounded-lg border border-slate-100">
                      <div>Teórico: R$ {rec.valorCalculadoTeorico.toFixed(2)}</div>
                      <div>Declarado: R$ {rec.valorDeclaradoFisico.toFixed(2)}</div>
                    </div>

                    {rec.observacoes && (
                      <p className="text-[10px] text-slate-500 italic mt-2 bg-slate-100/30 p-1.5 rounded border border-slate-100">
                        obs: {rec.observacoes}
                      </p>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
