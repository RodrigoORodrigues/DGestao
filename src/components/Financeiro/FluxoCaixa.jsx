import React, { useState, useMemo } from "react";
import {
  FileSpreadsheet,
  Search,
  Home,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  BarChart2,
  Calendar,
  DollarSign,
  PieChart as PieChartIcon,
  Activity,
  ChevronDown,
  ChevronRight,
  Download,
  Printer,
  Filter,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Sparkles,
  Building2,
  X
} from "lucide-react";

export default function FluxoCaixa({ contasPagar = [], contasReceber = [] }) {
  const [activeTab, setActiveTab] = useState("saldo"); // "saldo" | "resumo" | "diario" | "estatisticas" | "demonstrativo"
  const [selectedMonth, setSelectedMonth] = useState("2026-07");
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [expandedDate, setExpandedDate] = useState(null);

  // Calculate overall totals
  const totals = useMemo(() => {
    const totalRecebimentos = contasReceber.reduce(
      (acc, curr) => acc + (parseFloat(curr.valor) || 0),
      0
    );
    const totalPagamentos = contasPagar.reduce(
      (acc, curr) => acc + (parseFloat(curr.valor) || 0),
      0
    );
    const saldo = totalRecebimentos - totalPagamentos;

    return { totalRecebimentos, totalPagamentos, saldo };
  }, [contasPagar, contasReceber]);

  const formatCurrency = (val, forceNegative = false) => {
    const num = parseFloat(val) || 0;
    const formatted = Math.abs(num).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    if (forceNegative && num > 0) return `-${formatted}`;
    return num < 0 ? `-${formatted}` : formatted;
  };

  const formatDateBR = (dateStr) => {
    if (!dateStr) return "--/--/----";
    if (dateStr.includes("/")) return dateStr;
    const parts = dateStr.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  // Group items by day for the "Diário" tab
  const dailyFlow = useMemo(() => {
    const daysMap = {};
    let runningBalance = 125400.00; // Initial opening balance

    // Generate days in month
    for (let day = 1; day <= 31; day++) {
      const dayStr = `2026-07-${day < 10 ? "0" + day : day}`;
      daysMap[dayStr] = {
        data: dayStr,
        entradas: 0,
        saidas: 0,
        itensReceber: [],
        itensPagar: []
      };
    }

    // Populate Recebimentos
    contasReceber.forEach((item) => {
      const dateKey = item.data || "2026-07-01";
      if (!daysMap[dateKey]) {
        daysMap[dateKey] = {
          data: dateKey,
          entradas: 0,
          saidas: 0,
          itensReceber: [],
          itensPagar: []
        };
      }
      const val = parseFloat(item.valor) || 0;
      daysMap[dateKey].entradas += val;
      daysMap[dateKey].itensReceber.push(item);
    });

    // Populate Pagamentos
    contasPagar.forEach((item) => {
      const dateKey = item.data || "2026-07-01";
      if (!daysMap[dateKey]) {
        daysMap[dateKey] = {
          data: dateKey,
          entradas: 0,
          saidas: 0,
          itensReceber: [],
          itensPagar: []
        };
      }
      const val = parseFloat(item.valor) || 0;
      daysMap[dateKey].saidas += val;
      daysMap[dateKey].itensPagar.push(item);
    });

    // Calculate balances day by day
    const sortedDays = Object.keys(daysMap)
      .sort()
      .map((d) => {
        const obj = daysMap[d];
        const saldoInicial = runningBalance;
        const variacao = obj.entradas - obj.saidas;
        const saldoFinal = saldoInicial + variacao;
        runningBalance = saldoFinal;

        return {
          ...obj,
          saldoInicial,
          variacao,
          saldoFinal
        };
      });

    return sortedDays;
  }, [contasPagar, contasReceber]);

  // Export handler
  const handleExportCSV = () => {
    let csv = "Data;Tipo;Descricao;PlanoContas;CentroCusto;Situacao;Valor\n";
    contasReceber.forEach((item) => {
      csv += `${item.data};Recebimento;${item.descricao};${item.planoContas || ""};${item.centroCusto || ""};${item.situacao};${item.valor}\n`;
    });
    contasPagar.forEach((item) => {
      csv += `${item.data};Pagamento;${item.descricao};${item.planoContas || ""};${item.centroCusto || ""};${item.situacao};-${item.valor}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Fluxo_de_Caixa_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <Home size={12} />
            <span>Início</span>
            <span>&gt;</span>
            <span>Financeiro</span>
            <span>&gt;</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">Fluxo de caixa</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Activity className="text-emerald-600 dark:text-emerald-400" size={22} />
            <span>Fluxo de Caixa</span>
          </h1>
        </div>

        {/* Right Top Date Filter */}
        <div className="flex items-center space-x-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-900 text-white dark:bg-slate-800 text-xs font-semibold px-3 py-1.5 rounded-md outline-none cursor-pointer"
          >
            <option value="2026-07">Julho de 2026</option>
            <option value="2026-06">Junho de 2026</option>
            <option value="2026-05">Maio de 2026</option>
          </select>

          <button
            onClick={() => alert("Abrindo busca avançada para Fluxo de Caixa.")}
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
          >
            <Search size={14} />
            <span>Busca avançada</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs matching screenshot style exactly */}
      <div className="flex flex-wrap items-center space-x-1 text-xs border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("saldo")}
          className={`px-3.5 py-1.5 rounded-md font-bold transition-all ${
            activeTab === "saldo"
              ? "bg-emerald-600 text-white shadow"
              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          Saldo
        </button>

        <button
          onClick={() => setActiveTab("resumo")}
          className={`px-3.5 py-1.5 rounded-md font-bold transition-all ${
            activeTab === "resumo"
              ? "bg-emerald-600 text-white shadow"
              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          Resumo
        </button>

        <button
          onClick={() => setActiveTab("diario")}
          className={`px-3.5 py-1.5 rounded-md font-bold transition-all ${
            activeTab === "diario"
              ? "bg-emerald-600 text-white shadow"
              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          Diário
        </button>

        <button
          onClick={() => setActiveTab("estatisticas")}
          className={`px-3.5 py-1.5 rounded-md font-bold transition-all ${
            activeTab === "estatisticas"
              ? "bg-emerald-600 text-white shadow"
              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          Estatísticas
        </button>

        <button
          onClick={() => setActiveTab("demonstrativo")}
          className={`px-3.5 py-1.5 rounded-md font-bold transition-all ${
            activeTab === "demonstrativo"
              ? "bg-emerald-600 text-white shadow"
              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          Demonstrativo
        </button>

        {/* Export Button matching image with emerald border & green text */}
        <button
          onClick={() => setExportModalOpen(true)}
          className="flex items-center space-x-1 border border-emerald-600 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 px-3 py-1.5 rounded-md font-bold transition-colors ml-auto shadow-sm"
        >
          <FileSpreadsheet size={15} />
          <span>Exportar</span>
        </button>
      </div>

      {/* ================= ABA 1: SALDO ================= */}
      {activeTab === "saldo" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Card: Pagamentos X Recebimentos */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm text-xs space-y-2">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm border-b border-slate-200 dark:border-slate-800 pb-2">
              Pagamentos X Recebimentos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Saldo:</span>
                <span
                  className={`font-mono font-bold text-sm ${
                    totals.saldo < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {formatCurrency(totals.saldo)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Saldo final previsto:</span>
                <span
                  className={`font-mono font-bold text-sm ${
                    totals.saldo < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {formatCurrency(totals.saldo)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: Recebimentos Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Recebimentos
              </h2>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Valor Total: {formatCurrency(totals.totalRecebimentos)}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden text-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                      <th className="p-2 border-r border-slate-200 dark:border-slate-700">Data</th>
                      <th className="p-2 border-r border-slate-200 dark:border-slate-700">Descrição do recebimento</th>
                      <th className="p-2 border-r border-slate-200 dark:border-slate-700">Plano de contas</th>
                      <th className="p-2 border-r border-slate-200 dark:border-slate-700">Centro de custo</th>
                      <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-center">Situação</th>
                      <th className="p-2 border-r border-slate-200 dark:border-slate-700">Loja</th>
                      <th className="p-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {contasReceber.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-slate-500">
                          Nenhum recebimento cadastrado neste período.
                        </td>
                      </tr>
                    ) : (
                      contasReceber.map((item) => (
                        <tr
                          key={item.id}
                          className="bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-50/60 transition-colors"
                        >
                          <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-mono text-slate-600 dark:text-slate-400">
                            {formatDateBR(item.data)}
                          </td>
                          <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-medium text-slate-800 dark:text-slate-200">
                            {item.descricao}
                          </td>
                          <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                            {item.planoContas || "Receitas de Vendas"}
                          </td>
                          <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                            {item.centroCusto || "VENDAS"}
                          </td>
                          <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-center">
                            <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                              {item.situacao}
                            </span>
                          </td>
                          <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                            {item.loja || "PROTETTA SEGUROS"}
                          </td>
                          <td className="p-2 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            {formatCurrency(item.valor)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 2: Pagamentos Table matching screenshot pink row shading */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Pagamentos
              </h2>
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                Valor Total: -{formatCurrency(totals.totalPagamentos)}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden text-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                      <th className="p-2 border-r border-slate-200 dark:border-slate-700">Data</th>
                      <th className="p-2 border-r border-slate-200 dark:border-slate-700">Descrição do pagamento</th>
                      <th className="p-2 border-r border-slate-200 dark:border-slate-700">Plano de contas</th>
                      <th className="p-2 border-r border-slate-200 dark:border-slate-700">Centro de custo</th>
                      <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-center">Situação</th>
                      <th className="p-2 border-r border-slate-200 dark:border-slate-700">Loja</th>
                      <th className="p-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-200/50 dark:divide-rose-950/40">
                    {contasPagar.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-slate-500">
                          Nenhum pagamento cadastrado neste período.
                        </td>
                      </tr>
                    ) : (
                      contasPagar.map((item) => (
                        <tr
                          key={item.id}
                          className="bg-rose-100/70 text-rose-950 dark:bg-rose-950/40 dark:text-rose-100 hover:bg-rose-200/80 dark:hover:bg-rose-900/60 transition-colors"
                        >
                          <td className="p-2 border-r border-rose-200/60 dark:border-rose-900/50 font-mono text-rose-900 dark:text-rose-200">
                            {formatDateBR(item.data)}
                          </td>
                          <td className="p-2 border-r border-rose-200/60 dark:border-rose-900/50 font-medium">
                            {item.descricao}
                          </td>
                          <td className="p-2 border-r border-rose-200/60 dark:border-rose-900/50 text-rose-900/80 dark:text-rose-300">
                            {item.planoContas || "Despesas"}
                          </td>
                          <td className="p-2 border-r border-rose-200/60 dark:border-rose-900/50 text-rose-900/80 dark:text-rose-300">
                            {item.centroCusto || "ESCRITÓRIO"}
                          </td>
                          <td className="p-2 border-r border-rose-200/60 dark:border-rose-900/50 text-center">
                            <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                              {item.situacao}
                            </span>
                          </td>
                          <td className="p-2 border-r border-rose-200/60 dark:border-rose-900/50 text-rose-900/80 dark:text-rose-300">
                            {item.loja || "PROTETTA SEGUROS"}
                          </td>
                          <td className="p-2 text-right font-bold text-rose-700 dark:text-rose-300 font-mono">
                            {formatCurrency(item.valor, true)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= ABA 2: RESUMO ================= */}
      {activeTab === "resumo" && (
        <div className="space-y-4 animate-in fade-in duration-150 text-xs">
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="font-semibold">Total de Entradas</span>
                <ArrowUpRight size={16} className="text-emerald-500" />
              </div>
              <div className="text-xl font-extrabold text-emerald-600 font-mono">
                R$ {totals.totalRecebimentos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-emerald-600 mt-1 flex items-center space-x-1">
                <span>+12.4% em relação ao mês anterior</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="font-semibold">Total de Saídas</span>
                <ArrowDownRight size={16} className="text-rose-500" />
              </div>
              <div className="text-xl font-extrabold text-rose-600 font-mono">
                R$ {totals.totalPagamentos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                98.2% das despesas operacionais quitadas
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="font-semibold">Geração Líquida de Caixa</span>
                <DollarSign size={16} className="text-indigo-500" />
              </div>
              <div
                className={`text-xl font-extrabold font-mono ${
                  totals.saldo >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                R$ {totals.saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Margem Líquida Operacional: {((totals.saldo / (totals.totalRecebimentos || 1)) * 100).toFixed(1)}%
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="font-semibold">Índice de Cobertura</span>
                <CheckCircle2 size={16} className="text-emerald-500" />
              </div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
                {(totals.totalRecebimentos / (totals.totalPagamentos || 1)).toFixed(2)}x
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-1">
                Saudável (Entradas cobrem 100% das saídas)
              </div>
            </div>
          </div>

          {/* Breakdown by Plano de Contas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Receitas */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-3 flex items-center justify-between">
                <span>Principais Fontes de Receita</span>
                <span className="text-emerald-600 text-xs font-semibold">100% do Total</span>
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>Receitas de Vendas / Serviços de Corretagem</span>
                    <span className="font-mono">R$ {(totals.totalRecebimentos * 0.75).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full w-[75%]"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>Comissões de Seguradoras (Susep)</span>
                    <span className="font-mono">R$ {(totals.totalRecebimentos * 0.20).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full w-[20%]"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>Rendimentos Financeiros / Aplicações</span>
                    <span className="font-mono">R$ {(totals.totalRecebimentos * 0.05).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-300 h-full w-[5%]"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Despesas */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-3 flex items-center justify-between">
                <span>Principais Grupos de Despesa</span>
                <span className="text-rose-600 text-xs font-semibold">100% do Total</span>
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>Folha de Pagamento & Pro-Labore</span>
                    <span className="font-mono">R$ {(totals.totalPagamentos * 0.55).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full w-[55%]"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>Serviços de Terceiros & Tecnologia</span>
                    <span className="font-mono">R$ {(totals.totalPagamentos * 0.25).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-rose-400 h-full w-[25%]"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>Aluguel, Energia & Infraestrutura</span>
                    <span className="font-mono">R$ {(totals.totalPagamentos * 0.20).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-rose-300 h-full w-[20%]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= ABA 3: DIÁRIO ================= */}
      {activeTab === "diario" && (
        <div className="space-y-4 animate-in fade-in duration-150 text-xs">
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-amber-900 dark:text-amber-200 flex items-center justify-between">
            <div>
              <span className="font-bold">Visão Consolidada Dia a Dia — Julho/2026</span>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                Acompanhe a variação diária de caixa, saldo inicial, entradas, saídas e saldo final acumulado.
              </p>
            </div>
            <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-100">
              31 Dias Mapeados
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                  <th className="p-2.5 border-r border-slate-200 dark:border-slate-700 w-28">Data</th>
                  <th className="p-2.5 border-r border-slate-200 dark:border-slate-700 text-right">Saldo Inicial</th>
                  <th className="p-2.5 border-r border-slate-200 dark:border-slate-700 text-right text-emerald-600">Entradas (+)</th>
                  <th className="p-2.5 border-r border-slate-200 dark:border-slate-700 text-right text-rose-600">Saídas (-)</th>
                  <th className="p-2.5 border-r border-slate-200 dark:border-slate-700 text-right">Variação Líquida</th>
                  <th className="p-2.5 text-right font-extrabold">Saldo Acumulado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {dailyFlow.slice(0, 15).map((day) => {
                  const isPositive = day.variacao >= 0;

                  return (
                    <React.Fragment key={day.data}>
                      <tr
                        onClick={() => setExpandedDate(expandedDate === day.data ? null : day.data)}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors ${
                          day.entradas > 0 || day.saidas > 0 ? "font-medium" : "opacity-60"
                        }`}
                      >
                        <td className="p-2.5 border-r border-slate-200 dark:border-slate-800 font-mono flex items-center space-x-1">
                          {expandedDate === day.data ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          <span>{formatDateBR(day.data)}</span>
                        </td>

                        <td className="p-2.5 border-r border-slate-200 dark:border-slate-800 text-right font-mono text-slate-600 dark:text-slate-400">
                          R$ {day.saldoInicial.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>

                        <td className="p-2.5 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold text-emerald-600">
                          {day.entradas > 0 ? `+ R$ ${day.entradas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "--"}
                        </td>

                        <td className="p-2.5 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold text-rose-600">
                          {day.saidas > 0 ? `- R$ ${day.saidas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "--"}
                        </td>

                        <td
                          className={`p-2.5 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold ${
                            isPositive ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {isPositive ? "+" : ""} R$ {day.variacao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>

                        <td className="p-2.5 text-right font-mono font-extrabold text-slate-900 dark:text-white">
                          R$ {day.saldoFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>

                      {/* Drill down row when clicked */}
                      {expandedDate === day.data && (
                        <tr>
                          <td colSpan={6} className="bg-slate-50 dark:bg-slate-950 p-4 border-b border-slate-200 dark:border-slate-800">
                            <div className="space-y-2">
                              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                Detalhamento dos Lançamentos do dia {formatDateBR(day.data)}
                              </h4>

                              {day.itensReceber.length === 0 && day.itensPagar.length === 0 ? (
                                <p className="text-slate-400 text-[11px]">Nenhuma movimentação avulsa registrada neste dia específico.</p>
                              ) : (
                                <div className="space-y-1">
                                  {day.itensReceber.map((r) => (
                                    <div key={r.id} className="flex justify-between items-center p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
                                      <span>[ENTRADA] {r.descricao} — {r.planoContas} ({r.entidade})</span>
                                      <span className="font-mono font-bold">+ R$ {parseFloat(r.valor).toFixed(2)}</span>
                                    </div>
                                  ))}

                                  {day.itensPagar.map((p) => (
                                    <div key={p.id} className="flex justify-between items-center p-2 bg-rose-50 dark:bg-rose-950/40 rounded border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200">
                                      <span>[SAÍDA] {p.descricao} — {p.planoContas} ({p.entidade})</span>
                                      <span className="font-mono font-bold">- R$ {parseFloat(p.valor).toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= ABA 4: ESTATÍSTICAS ================= */}
      {activeTab === "estatisticas" && (
        <div className="space-y-4 animate-in fade-in duration-150 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm">
              <h3 className="font-bold text-slate-800 dark:text-white text-xs mb-2">Ticket Médio de Recebimento</h3>
              <div className="text-2xl font-extrabold text-emerald-600 font-mono">
                R$ {contasReceber.length > 0 ? (totals.totalRecebimentos / contasReceber.length).toFixed(2) : "0.00"}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Baseado em {contasReceber.length} faturamentos no mês</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm">
              <h3 className="font-bold text-slate-800 dark:text-white text-xs mb-2">Ticket Médio de Pagamento</h3>
              <div className="text-2xl font-extrabold text-rose-600 font-mono">
                R$ {contasPagar.length > 0 ? (totals.totalPagamentos / contasPagar.length).toFixed(2) : "0.00"}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Baseado em {contasPagar.length} títulos pagos</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm">
              <h3 className="font-bold text-slate-800 dark:text-white text-xs mb-2">Pico de Despesas do Mês</h3>
              <div className="text-2xl font-extrabold text-amber-600 font-mono">
                Dia 05
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Concentração de 48% dos pagamentos de impostos e folha</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">
              Projeção de Sustentabilidade de Caixa (30 / 60 / 90 dias)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <div className="font-bold text-emerald-800 dark:text-emerald-300">Próximos 30 dias</div>
                <div className="text-lg font-mono font-extrabold text-emerald-600 mt-1">
                  + R$ {(totals.saldo * 1.05).toFixed(2)}
                </div>
                <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">Sem risco de liquidez curto prazo</div>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <div className="font-bold text-emerald-800 dark:text-emerald-300">Próximos 60 dias</div>
                <div className="text-lg font-mono font-extrabold text-emerald-600 mt-1">
                  + R$ {(totals.saldo * 2.1).toFixed(2)}
                </div>
                <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">Reserva financeira em expansão</div>
              </div>

              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                <div className="font-bold text-indigo-800 dark:text-indigo-300">Próximos 90 dias</div>
                <div className="text-lg font-mono font-extrabold text-indigo-600 mt-1">
                  + R$ {(totals.saldo * 3.2).toFixed(2)}
                </div>
                <div className="text-[10px] text-indigo-700 dark:text-indigo-400 mt-0.5">Capacidade para novos investimentos</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= ABA 5: DEMONSTRATIVO ================= */}
      {activeTab === "demonstrativo" && (
        <div className="space-y-4 animate-in fade-in duration-150 text-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Demonstrativo do Fluxo de Caixa (DFC)
                </h2>
                <p className="text-slate-500 text-[11px]">
                  Método Direto • Período de Apuração: {selectedMonth}
                </p>
              </div>
              <button
                onClick={() => setExportModalOpen(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded shadow-sm text-xs"
              >
                Imprimir DFC
              </button>
            </div>

            <div className="space-y-2 font-mono">
              <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded font-bold text-slate-900 dark:text-white flex justify-between">
                <span>1. FLUXO DE CAIXA DAS ATIVIDADES OPERACIONAIS</span>
                <span className="text-emerald-600">R$ {totals.saldo.toFixed(2)}</span>
              </div>

              <div className="pl-4 space-y-1 text-slate-700 dark:text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>(+) Recebimentos de Clientes & Vendas de Serviços</span>
                  <span className="text-emerald-600 font-bold">R$ {totals.totalRecebimentos.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>(-) Pagamentos a Fornecedores e Prestadores</span>
                  <span className="text-rose-600 font-bold">- R$ {(totals.totalPagamentos * 0.4).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>(-) Despesas com Pessoal e Pro-labore</span>
                  <span className="text-rose-600 font-bold">- R$ {(totals.totalPagamentos * 0.45).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>(-) Impostos, Taxas e Contribuições</span>
                  <span className="text-rose-600 font-bold">- R$ {(totals.totalPagamentos * 0.15).toFixed(2)}</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded font-bold text-slate-900 dark:text-white flex justify-between mt-3">
                <span>2. FLUXO DE CAIXA DAS ATIVIDADES DE INVESTIMENTO</span>
                <span>R$ 0,00</span>
              </div>

              <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded font-bold text-slate-900 dark:text-white flex justify-between mt-3">
                <span>3. FLUXO DE CAIXA DAS ATIVIDADES DE FINANCIAMENTO</span>
                <span>R$ 0,00</span>
              </div>

              <div className="p-3 bg-emerald-600 text-white rounded font-extrabold text-sm flex justify-between mt-4 shadow">
                <span>VARIAÇÃO LÍQUIDA DAS DISPONIBILIDADES NO PERÍODO</span>
                <span>R$ {totals.saldo.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT MODAL */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-5 w-full max-w-md relative text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <FileSpreadsheet className="text-emerald-600" size={18} />
                <span>Exportar Relatório de Fluxo de Caixa</span>
              </h2>
              <button
                onClick={() => setExportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-slate-600 dark:text-slate-300">
                Escolha o formato desejado para baixar o relatório completo do período <strong>{selectedMonth}</strong>:
              </p>

              <button
                onClick={handleExportCSV}
                className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 rounded-lg transition-colors font-bold text-slate-800 dark:text-white"
              >
                <div className="flex items-center space-x-2">
                  <FileSpreadsheet className="text-emerald-600" size={18} />
                  <span>Planilha Excel / CSV (.csv)</span>
                </div>
                <Download size={16} className="text-emerald-600" />
              </button>

              <button
                onClick={() => {
                  window.print();
                  setExportModalOpen(false);
                }}
                className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 rounded-lg transition-colors font-bold text-slate-800 dark:text-white"
              >
                <div className="flex items-center space-x-2">
                  <Printer className="text-indigo-600" size={18} />
                  <span>Relatório Impresso / PDF (.pdf)</span>
                </div>
                <Printer size={16} className="text-indigo-600" />
              </button>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => setExportModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold rounded-lg"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
