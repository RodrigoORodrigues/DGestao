import React, { useState } from "react";
import {
  Home,
  Upload,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Plus,
  ArrowRight,
  ArrowRightLeft,
  Check,
  X,
  HelpCircle,
  Building2,
  Sparkles,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Eye,
  Settings,
  Info
} from "lucide-react";
import { INITIAL_EXTRATO_BANCARIO } from "./mockFinanceiroData";

export default function ConciliacaoBancaria({
  contasPagar = [],
  setContasPagar,
  contasReceber = [],
  setContasReceber
}) {
  const [activeStep, setActiveStep] = useState("importar"); // "importar" | "conciliar" | "regras"
  const [selectedConta, setSelectedConta] = useState("Banco Santander (033) - C/C 88219-0");
  const [extratoItems, setExtratoItems] = useState(INITIAL_EXTRATO_BANCARIO);
  const [uploadedFile, setUploadedFile] = useState(null);

  // Filters for conciliation view
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS"); // TODOS, CONCILIADO, SUGESTAO, PENDENTE, IGNORADO

  // Modal for quick entry creation
  const [modalCriarOpen, setModalCriarOpen] = useState(false);
  const [itemParaCriar, setItemParaCriar] = useState(null);
  const [novoTipo, setNovoTipo] = useState("PAGAR"); // PAGAR | RECEBER
  const [novoPlanoContas, setNovoPlanoContas] = useState("Despesas operacionais");
  const [novoCentroCusto, setNovoCentroCusto] = useState("ESCRITÓRIO");

  // Modal for manual match
  const [modalVincularOpen, setModalVincularOpen] = useState(false);
  const [itemParaVincular, setItemParaVincular] = useState(null);

  const CONTAS_BANCARIAS = [
    { id: "san", nome: "Banco Santander (033) - C/C 88219-0", saldo: 54320.50 },
    { id: "itau", nome: "Banco Itaú (341) - Ag. 0123 C/C 45678-9", saldo: 42500.00 },
    { id: "bra", nome: "Banco Bradesco (237) - Ag. 0456 C/C 12345-6", saldo: 18200.00 },
    { id: "bb", nome: "Banco do Brasil (001) - C/C 98765-4", saldo: 29760.98 }
  ];

  // Load demo sample OFX dataset
  const handleCarregarDemonstrativo = () => {
    setExtratoItems(INITIAL_EXTRATO_BANCARIO);
    setUploadedFile({
      name: "extrato_santander_julho2026.ofx",
      size: "14.2 KB",
      date: new Date().toLocaleDateString("pt-BR")
    });
    setActiveStep("conciliar");
  };

  // File upload simulation
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile({
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        date: new Date().toLocaleDateString("pt-BR")
      });
      // Merge or load initial extrato items
      setExtratoItems(INITIAL_EXTRATO_BANCARIO);
      setActiveStep("conciliar");
    }
  };

  // Actions
  const handleConfirmMatch = (fitid) => {
    setExtratoItems(
      extratoItems.map((item) =>
        item.fitid === fitid ? { ...item, status: "CONCILIADO" } : item
      )
    );
  };

  const handleUnmatch = (fitid) => {
    setExtratoItems(
      extratoItems.map((item) =>
        item.fitid === fitid ? { ...item, status: "PENDENTE" } : item
      )
    );
  };

  const handleIgnore = (fitid) => {
    setExtratoItems(
      extratoItems.map((item) =>
        item.fitid === fitid ? { ...item, status: "IGNORADO" } : item
      )
    );
  };

  const handleConciliarTodosExatos = () => {
    setExtratoItems(
      extratoItems.map((item) =>
        item.status === "SUGESTAO" ? { ...item, status: "CONCILIADO" } : item
      )
    );
  };

  // Quick ERP Entry creation
  const handleOpenCriarERP = (item) => {
    setItemParaCriar(item);
    setNovoTipo(item.valor < 0 ? "PAGAR" : "RECEBER");
    setModalCriarOpen(true);
  };

  const handleSaveNovoLançamentoERP = (e) => {
    e.preventDefault();
    if (!itemParaCriar) return;

    const valorAbs = Math.abs(itemParaCriar.valor);

    if (novoTipo === "PAGAR") {
      const novaConta = {
        id: `cp-${Date.now()}`,
        descricao: itemParaCriar.descricaoBanco,
        entidade: "Fornecedor Gerado Conciliação",
        pagamento: "Crédito em conta",
        data: itemParaCriar.data,
        situacao: "Confirmado",
        valor: valorAbs,
        planoContas: novoPlanoContas,
        centroCusto: novoCentroCusto,
        loja: "PROTETTA SEGUROS"
      };
      if (setContasPagar) setContasPagar([novaConta, ...(contasPagar || [])]);
    } else {
      const novaConta = {
        id: `cr-${Date.now()}`,
        descricao: itemParaCriar.descricaoBanco,
        entidade: "Cliente Gerado Conciliação",
        pagamento: "Crédito em conta",
        data: itemParaCriar.data,
        situacao: "Confirmado",
        valor: valorAbs,
        planoContas: novoPlanoContas,
        centroCusto: novoCentroCusto,
        loja: "PROTETTA SEGUROS"
      };
      if (setContasReceber) setContasReceber([novaConta, ...(contasReceber || [])]);
    }

    // Mark item as CONCILIADO
    setExtratoItems(
      extratoItems.map((i) =>
        i.fitid === itemParaCriar.fitid
          ? {
              ...i,
              status: "CONCILIADO",
              correspondenciaInfo: `${itemParaCriar.descricaoBanco} - R$ ${valorAbs.toFixed(2)} (Criado no ERP)`
            }
          : i
      )
    );

    setModalCriarOpen(false);
  };

  // Filtered extrato list
  const filteredExtrato = extratoItems.filter((item) => {
    const matchesSearch =
      (item.descricaoBanco || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.documento || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.correspondenciaInfo || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "TODOS" || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Totals & KPI Metrics
  const totalCreditos = extratoItems
    .filter((i) => i.valor > 0)
    .reduce((acc, curr) => acc + curr.valor, 0);

  const totalDebitos = extratoItems
    .filter((i) => i.valor < 0)
    .reduce((acc, curr) => acc + Math.abs(curr.valor), 0);

  const countConciliados = extratoItems.filter((i) => i.status === "CONCILIADO").length;
  const countSugestoes = extratoItems.filter((i) => i.status === "SUGESTAO").length;
  const countPendentes = extratoItems.filter((i) => i.status === "PENDENTE").length;

  return (
    <div className="space-y-5">
      {/* Top Header & Breadcrumbs matching screenshot style */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <Home size={12} />
            <span>Início</span>
            <span>&gt;</span>
            <span>Financeiro</span>
            <span>&gt;</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">Conciliação bancária</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <ArrowRightLeft className="text-emerald-600 dark:text-emerald-400" size={22} />
            <span>Conciliação Bancária (OFX / CSV)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Importe o extrato do seu banco, confronte automaticamente com os lançamentos de Contas a Pagar/Receber e garanta 100% de precisão financeira.
          </p>
        </div>

        {/* Stepper Navigation */}
        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setActiveStep("importar")}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center space-x-1 ${
              activeStep === "importar"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Upload size={14} />
            <span>1. Importar Extrato</span>
          </button>

          <button
            onClick={() => setActiveStep("conciliar")}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center space-x-1 ${
              activeStep === "conciliar"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <FileCheck size={14} />
            <span>2. Conciliar Movimentações</span>
            {countPendentes > 0 && (
              <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full ml-1">
                {countPendentes + countSugestoes}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveStep("regras")}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center space-x-1 ${
              activeStep === "regras"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Settings size={14} />
            <span>3. Regras Automáticas</span>
          </button>
        </div>
      </div>

      {/* STEP 1: IMPORTAR EXTRATO BANCÁRIO */}
      {activeStep === "importar" && (
        <div className="space-y-4">
          {/* Yellow Banner Notification from screenshot */}
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center space-x-2">
            <Info size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Insira o seu arquivo de extrato bancário no formato OFX ou CSV no painel abaixo.</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Left Side */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4 text-xs">
              <div>
                <label className="block text-slate-800 dark:text-slate-200 font-bold mb-1.5">
                  Conta bancária *
                </label>
                <select
                  value={selectedConta}
                  onChange={(e) => setSelectedConta(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white text-sm font-medium"
                >
                  {CONTAS_BANCARIAS.map((c) => (
                    <option key={c.id} value={c.nome}>
                      {c.nome} — Saldo: R$ {c.saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
              </div>

              {/* Upload Dropzone */}
              <div>
                <label className="block text-slate-800 dark:text-slate-200 font-bold mb-1.5">
                  Arquivo de Extrato (.OFX ou .CSV)
                </label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl p-6 text-center bg-slate-50/50 dark:bg-slate-950/50 transition-colors cursor-pointer relative group">
                  <input
                    type="file"
                    accept=".ofx,.csv,.txt"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <Upload size={32} className="mx-auto text-slate-400 group-hover:text-emerald-500 transition-colors mb-2" />
                  <div className="text-slate-700 dark:text-slate-300 font-bold text-sm">
                    Clique aqui ou arraste o seu arquivo OFX / CSV
                  </div>
                  <div className="text-slate-400 text-[11px] mt-1">
                    Suporta extratos bancários de Itaú, Santander, Bradesco, Banco do Brasil, Caixa, Nubank e Inter.
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleCarregarDemonstrativo}
                  className="flex-1 min-w-[200px] flex items-center justify-center space-x-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow transition-colors text-sm"
                >
                  <Sparkles size={16} />
                  <span>Carregar Extrato Demonstrativo</span>
                </button>
              </div>

              {uploadedFile && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText size={16} className="text-emerald-600" />
                    <div>
                      <div className="font-bold">{uploadedFile.name}</div>
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-400">
                        {uploadedFile.size} • Importado em {uploadedFile.date}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveStep("conciliar")}
                    className="bg-emerald-600 text-white font-bold px-3 py-1 rounded hover:bg-emerald-500 text-xs"
                  >
                    Ir para Conciliação &gt;
                  </button>
                </div>
              )}
            </div>

            {/* Right Side Instructional Text matching screenshot */}
            <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-xs text-slate-600 dark:text-slate-300 space-y-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Building2 size={18} className="text-emerald-600" />
                <span>Importar extrato bancário OFX</span>
              </h2>

              <p className="leading-relaxed">
                A conciliação bancária através dos arquivos <strong>OFX</strong> reduz o trabalho manual de digitação de suas movimentações financeiras.
              </p>

              <ol className="list-decimal list-inside space-y-1.5 text-slate-700 dark:text-slate-300 font-medium">
                <li>Acesse o Internet Banking da sua instituição financeira.</li>
                <li>Exporte o seu extrato no formato <strong>.OFX</strong> (Open Financial Exchange).</li>
                <li>Selecione a conta bancária correspondente acima e carregue o arquivo.</li>
                <li>O sistema identificará automaticamente os lançamentos no ERP com datas e valores correspondentes.</li>
              </ol>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                Caso tenha dúvidas sobre como baixar seu arquivo OFX, entre em contato com o suporte do seu banco ou veja nosso guia interativo.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: PAINEL DE CONCILIAÇÃO DUPLA */}
      {activeStep === "conciliar" && (
        <div className="space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-sm">
              <div className="text-slate-500 dark:text-slate-400 font-semibold mb-1">Entradas (Créditos)</div>
              <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                + R$ {totalCreditos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Total de depósitos no extrato</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-sm">
              <div className="text-slate-500 dark:text-slate-400 font-semibold mb-1">Saídas (Débitos)</div>
              <div className="text-lg font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                - R$ {totalDebitos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Total de pagamentos no extrato</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-sm">
              <div className="text-slate-500 dark:text-slate-400 font-semibold mb-1">Status da Conciliação</div>
              <div className="text-lg font-extrabold text-slate-900 dark:text-white">
                <span className="text-emerald-600">{countConciliados}</span> / {extratoItems.length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {countSugestoes} sugestões • {countPendentes} pendentes
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-sm flex flex-col justify-center">
              <button
                onClick={handleConciliarTodosExatos}
                disabled={countSugestoes === 0}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-lg shadow text-xs flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Sparkles size={14} />
                <span>Conciliar {countSugestoes} Sugestões</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-sm text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar transação no extrato ou ERP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Filter Buttons */}
              <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg font-semibold">
                <button
                  onClick={() => setStatusFilter("TODOS")}
                  className={`px-2.5 py-1 rounded ${statusFilter === "TODOS" ? "bg-white dark:bg-slate-900 shadow text-slate-900 dark:text-white" : "text-slate-500"}`}
                >
                  Todos ({extratoItems.length})
                </button>
                <button
                  onClick={() => setStatusFilter("SUGESTAO")}
                  className={`px-2.5 py-1 rounded ${statusFilter === "SUGESTAO" ? "bg-amber-500 text-white shadow" : "text-amber-600 dark:text-amber-400"}`}
                >
                  Sugestões ({countSugestoes})
                </button>
                <button
                  onClick={() => setStatusFilter("PENDENTE")}
                  className={`px-2.5 py-1 rounded ${statusFilter === "PENDENTE" ? "bg-rose-500 text-white shadow" : "text-rose-600 dark:text-rose-400"}`}
                >
                  Pendentes ({countPendentes})
                </button>
                <button
                  onClick={() => setStatusFilter("CONCILIADO")}
                  className={`px-2.5 py-1 rounded ${statusFilter === "CONCILIADO" ? "bg-emerald-600 text-white shadow" : "text-emerald-600 dark:text-emerald-400"}`}
                >
                  Conciliados ({countConciliados})
                </button>
              </div>
            </div>

            <div className="text-slate-500 text-[11px]">
              Conta: <span className="font-bold text-slate-800 dark:text-slate-200">{selectedConta}</span>
            </div>
          </div>

          {/* DUAL MATCHING TABLE */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden text-xs">
            <div className="grid grid-cols-12 bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 p-3">
              <div className="col-span-5 flex items-center space-x-1">
                <Building2 size={14} className="text-slate-500" />
                <span>Extrato do Banco (OFX)</span>
              </div>
              <div className="col-span-2 text-center">Status</div>
              <div className="col-span-5 flex items-center space-x-1">
                <FileText size={14} className="text-slate-500" />
                <span>Lançamento no ERP (Contas a Pagar/Receber)</span>
              </div>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredExtrato.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  Nenhuma movimentação encontrada com o filtro selecionado.
                </div>
              ) : (
                filteredExtrato.map((item) => {
                  const isEntrada = item.valor > 0;

                  return (
                    <div
                      key={item.fitid}
                      className={`grid grid-cols-12 p-3 items-center hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        item.status === "CONCILIADO"
                          ? "bg-emerald-50/20 dark:bg-emerald-950/10"
                          : item.status === "SUGESTAO"
                          ? "bg-amber-50/30 dark:bg-amber-950/20"
                          : ""
                      }`}
                    >
                      {/* Left: Bank Extrato */}
                      <div className="col-span-5 space-y-0.5 pr-2 border-r border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] text-slate-400">{item.data}</span>
                          <span
                            className={`font-mono font-bold ${
                              isEntrada ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {isEntrada ? "+" : ""} R$ {Math.abs(item.valor).toFixed(2)}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 dark:text-white text-xs truncate">
                          {item.descricaoBanco}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Doc: {item.documento || "N/A"} • FITID: {item.fitid}
                        </div>
                      </div>

                      {/* Middle: Status Badge */}
                      <div className="col-span-2 text-center px-2">
                        {item.status === "CONCILIADO" && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                            <CheckCircle2 size={11} />
                            <span>Conciliado</span>
                          </span>
                        )}

                        {item.status === "SUGESTAO" && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                            <Sparkles size={11} />
                            <span>Sugestão</span>
                          </span>
                        )}

                        {item.status === "PENDENTE" && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
                            <AlertTriangle size={11} />
                            <span>Pendente</span>
                          </span>
                        )}

                        {item.status === "IGNORADO" && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            <span>Ignorado</span>
                          </span>
                        )}
                      </div>

                      {/* Right: ERP Match & Actions */}
                      <div className="col-span-5 pl-2">
                        {item.status === "CONCILIADO" && (
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-slate-800 dark:text-slate-200">
                                {item.correspondenciaInfo}
                              </div>
                              <div className="text-[10px] text-emerald-600 font-medium">
                                Baixa e reconciliação confirmada no ERP
                              </div>
                            </div>
                            <button
                              onClick={() => handleUnmatch(item.fitid)}
                              className="px-2 py-1 text-slate-500 hover:text-rose-600 text-[10px] underline"
                            >
                              Desconciliar
                            </button>
                          </div>
                        )}

                        {item.status === "SUGESTAO" && (
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">
                                {item.correspondenciaInfo}
                              </div>
                              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                                Correspondência exata por data e valor
                              </div>
                            </div>
                            <button
                              onClick={() => handleConfirmMatch(item.fitid)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs shadow-sm flex items-center space-x-1"
                            >
                              <Check size={12} />
                              <span>Confirmar</span>
                            </button>
                          </div>
                        )}

                        {(item.status === "PENDENTE" || item.status === "IGNORADO") && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              onClick={() => handleOpenCriarERP(item)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] flex items-center space-x-1"
                            >
                              <Plus size={12} />
                              <span>Criar no ERP</span>
                            </button>

                            <button
                              onClick={() => handleIgnore(item.fitid)}
                              className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 rounded text-[11px]"
                            >
                              Ignorar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: REGRAS AUTOMÁTICAS */}
      {activeStep === "regras" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Settings size={18} className="text-emerald-600" />
                <span>Regras de Conciliação Automática</span>
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Defina palavras-chave para o sistema categorizar e conciliar tarifas bancárias, PIX e lançamentos recorrentes automaticamente.
              </p>
            </div>
            <button className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center space-x-1">
              <Plus size={14} />
              <span>Nova Regra</span>
            </button>
          </div>

          <div className="space-y-2">
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 dark:text-white">Se descrição contiver "TAR MANUT"</span>
                <span className="mx-2 text-slate-400">&rarr;</span>
                <span className="text-emerald-600 font-semibold">Categorizar como "Despesas Operacionais - Tarifas Bancárias"</span>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">Ativa</span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 dark:text-white">Se descrição contiver "VIVO TELEFONICA"</span>
                <span className="mx-2 text-slate-400">&rarr;</span>
                <span className="text-emerald-600 font-semibold">Conciliar com Plano de Contas "Telefonia e Internet"</span>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">Ativa</span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR LANÇAMENTO ERP RÁPIDO */}
      {modalCriarOpen && itemParaCriar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-5 w-full max-w-md relative text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Plus className="text-emerald-500" size={16} />
                <span>Criar Lançamento no ERP</span>
              </h2>
              <button
                onClick={() => setModalCriarOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveNovoLançamentoERP} className="space-y-3">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Item do Extrato</div>
                <div className="font-bold text-slate-900 dark:text-white">{itemParaCriar.descricaoBanco}</div>
                <div className="font-mono text-emerald-600 font-bold mt-0.5">
                  Valor: R$ {Math.abs(itemParaCriar.valor).toFixed(2)} • Data: {itemParaCriar.data}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Tipo de Lançamento
                </label>
                <select
                  value={novoTipo}
                  onChange={(e) => setNovoTipo(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white font-bold"
                >
                  <option value="PAGAR">Contas a Pagar (Despesa / Saída)</option>
                  <option value="RECEBER">Contas a Receber (Receita / Entrada)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Plano de Contas (Categoria)
                </label>
                <select
                  value={novoPlanoContas}
                  onChange={(e) => setNovoPlanoContas(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white"
                >
                  <option value="Despesas operacionais">Despesas Operacionais / Tarifas</option>
                  <option value="Telefonia e internet">Telefonia e Internet</option>
                  <option value="Receitas de Vendas">Receitas de Vendas / Serviços</option>
                  <option value="Aluguel e Condomínio">Aluguel e Condomínio</option>
                  <option value="Impostos - IPTU">Impostos - IPTU</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Centro de Custo
                </label>
                <select
                  value={novoCentroCusto}
                  onChange={(e) => setNovoCentroCusto(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white"
                >
                  <option value="ESCRITÓRIO">ESCRITÓRIO</option>
                  <option value="VENDAS">VENDAS</option>
                  <option value="OPERACIONAL">OPERACIONAL</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalCriarOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded shadow-sm"
                >
                  Criar e Conciliar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
