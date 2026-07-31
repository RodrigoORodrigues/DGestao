import React, { useState } from "react";
import {
  Settings,
  ChevronDown,
  Printer,
  Download,
  Search,
  Plus,
  Minus,
  Home
} from "lucide-react";

export default function DreGerencial({ contasPagar = [], contasReceber = [] }) {
  const [selectedRange, setSelectedRange] = useState("mai 2026 - jul 2026");
  const [isMaisAcoesOpen, setIsMaisAcoesOpen] = useState(false);

  // Dynamic DRE structure matching screenshot 2
  const dreStructure = [
    {
      id: "receita_bruta",
      nome: "Receita bruta",
      tipo: "receita_total",
      bgClass: "bg-emerald-100 text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-100 font-bold",
      prefix: "+",
      subItems: [
        { nome: "Receitas de vendas", mai: 0.00, jun: 0.00, jul: 4263.91 }
      ]
    },
    {
      id: "deducoes",
      nome: "Deduções",
      tipo: "deducao",
      bgClass: "bg-rose-100 text-rose-950 dark:bg-rose-950/60 dark:text-rose-100 font-bold",
      prefix: "-",
      subItems: [
        { nome: "Impostos sobre vendas", mai: 0.00, jun: 0.00, jul: 0.00 },
        { nome: "Comissões sobre vendas", mai: -39051.58, jun: -35495.30, jul: -26609.58 },
        { nome: "Devolução de vendas", mai: 0.00, jun: 0.00, jul: 0.00 }
      ]
    },
    {
      id: "receita_liquida",
      nome: "Receita líquida",
      tipo: "resultado",
      bgClass: "bg-sky-100 text-sky-950 dark:bg-sky-950/60 dark:text-sky-100 font-extrabold",
      prefix: "=",
      subItems: []
    },
    {
      id: "custos_operacionais",
      nome: "Custos operacionais",
      tipo: "custo",
      bgClass: "bg-rose-100 text-rose-950 dark:bg-rose-950/60 dark:text-rose-100 font-bold",
      prefix: "-",
      subItems: [
        { nome: "Custo dos produtos vendidos", mai: 0.00, jun: 0.00, jul: 0.00 }
      ]
    },
    {
      id: "despesas_operacionais",
      nome: "Despesas operacionais",
      tipo: "despesa",
      bgClass: "bg-rose-100 text-rose-950 dark:bg-rose-950/60 dark:text-rose-100 font-bold",
      prefix: "-",
      subItems: [
        { nome: "Despesas administrativas", mai: -56691.55, jun: -55189.90, jul: -57115.15 },
        { nome: "Despesas operacionais", mai: 0.00, jun: 0.00, jul: 0.00 },
        { nome: "Despesas comerciais", mai: -10179.94, jun: -6870.01, jul: -8585.58 }
      ]
    },
    {
      id: "lucro_operacional",
      nome: "Lucro operacional",
      tipo: "resultado",
      bgClass: "bg-sky-100 text-sky-950 dark:bg-sky-950/60 dark:text-sky-100 font-extrabold",
      prefix: "=",
      subItems: []
    },
    {
      id: "receitas_financeiras",
      nome: "Receitas financeiras",
      tipo: "receita",
      bgClass: "bg-emerald-100 text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-100 font-bold",
      prefix: "+",
      subItems: [
        { nome: "Rendimentos financeiros", mai: 0.00, jun: 0.00, jul: 0.00 },
        { nome: "Juros/multas recebidos", mai: 0.00, jun: 0.00, jul: 0.00 },
        { nome: "Descontos recebidos", mai: 187.53, jun: 187.53, jul: 187.53 }
      ]
    },
    {
      id: "despesas_financeiras",
      nome: "Despesas financeiras",
      tipo: "despesa",
      bgClass: "bg-rose-100 text-rose-950 dark:bg-rose-950/60 dark:text-rose-100 font-bold",
      prefix: "-",
      subItems: [
        { nome: "Empréstimos e dívidas", mai: 0.00, jun: 0.00, jul: 0.00 },
        { nome: "Juros/multas pagos", mai: -7.15, jun: 0.00, jul: 0.00 },
        { nome: "Descontos concedidos", mai: 0.00, jun: 0.00, jul: 0.00 },
        { nome: "Taxas/tarifas bancárias", mai: 0.00, jun: 0.00, jul: 0.00 }
      ]
    },
    {
      id: "outras_receitas",
      nome: "Outras receitas",
      tipo: "receita",
      bgClass: "bg-emerald-100 text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-100 font-bold",
      prefix: "+",
      subItems: [
        { nome: "Outras receitas", mai: 0.00, jun: 0.00, jul: 0.00 }
      ]
    },
    {
      id: "outras_despesas",
      nome: "Outras despesas",
      tipo: "despesa",
      bgClass: "bg-rose-100 text-rose-950 dark:bg-rose-950/60 dark:text-rose-100 font-bold",
      prefix: "-",
      subItems: [
        { nome: "Outras despesas", mai: 0.00, jun: 0.00, jul: 0.00 }
      ]
    },
    {
      id: "lucro_prejuizo",
      nome: "Lucro/prejuízo",
      tipo: "resultado_final",
      bgClass: "bg-sky-100 text-sky-950 dark:bg-sky-950/60 dark:text-sky-100 font-black border-t-2 border-sky-400",
      prefix: "=",
      subItems: []
    }
  ];

  const formatCurrency = (val) => {
    if (val === 0) return "0,00";
    const formatted = Math.abs(val).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return val < 0 ? `-${formatted}` : formatted;
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
            <span className="font-semibold text-slate-700 dark:text-slate-200">DRE gerencial</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            DRE gerencial
          </h1>
        </div>

        {/* Right Top Date Filter */}
        <div className="flex items-center space-x-2">
          <select
            value={selectedRange}
            onChange={(e) => setSelectedRange(e.target.value)}
            className="bg-slate-900 text-white dark:bg-slate-800 text-xs font-semibold px-3 py-1.5 rounded-md outline-none cursor-pointer"
          >
            <option value="mai 2026 - jul 2026">mai 2026 - jul 2026</option>
            <option value="jan 2026 - jul 2026">jan 2026 - jul 2026</option>
            <option value="ano 2026">Ano 2026</option>
          </select>

          <button
            onClick={() => alert("Abrindo busca avançada para DRE.")}
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
          >
            <Search size={14} />
            <span>Busca avançada</span>
          </button>
        </div>
      </div>

      {/* Main Action Buttons Left */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => alert("Abrindo configurações de estrutura DRE...")}
          className="flex items-center space-x-1.5 bg-rose-900 hover:bg-rose-800 text-white text-xs font-bold px-3 py-2 rounded-md shadow-sm transition-colors"
        >
          <Settings size={14} />
          <span>Configurar DRE</span>
        </button>

        <div className="relative">
          <button
            onClick={() => setIsMaisAcoesOpen(!isMaisAcoesOpen)}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded-md transition-colors"
          >
            <Settings size={14} />
            <span>Mais ações</span>
            <ChevronDown size={14} />
          </button>

          {isMaisAcoesOpen && (
            <div
              className="absolute left-0 mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-xl z-30 py-1 text-xs text-slate-700 dark:text-slate-200"
              onClick={() => setIsMaisAcoesOpen(false)}
            >
              <button
                className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2"
                onClick={() => window.print()}
              >
                <Printer size={14} />
                <span>Imprimir</span>
              </button>
              <button
                className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2"
                onClick={() => alert("Exportando DRE em Excel...")}
              >
                <Download size={14} />
                <span>Exportar</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main DRE Matrix Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                <th className="p-2.5 text-left border-r border-slate-200 dark:border-slate-700 min-w-[220px]">
                  Categorias
                </th>
                <th className="p-2.5 text-right border-r border-slate-200 dark:border-slate-700 w-32">
                  Mai/2026
                </th>
                <th className="p-2.5 text-right border-r border-slate-200 dark:border-slate-700 w-32">
                  Jun/2026
                </th>
                <th className="p-2.5 text-right border-r border-slate-200 dark:border-slate-700 w-32">
                  Jul/2026
                </th>
                <th className="p-2.5 text-right font-black w-36">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {dreStructure.map((cat) => {
                // Calculate totals for category header
                const totalMai = cat.subItems.reduce((acc, curr) => acc + curr.mai, 0);
                const totalJun = cat.subItems.reduce((acc, curr) => acc + curr.jun, 0);
                const totalJul = cat.subItems.reduce((acc, curr) => acc + curr.jul, 0);
                const grandTotal = totalMai + totalJun + totalJul;

                return (
                  <React.Fragment key={cat.id}>
                    {/* Category Header Row */}
                    <tr className={`${cat.bgClass}`}>
                      <td className="p-2 border-r border-slate-200 dark:border-slate-700 flex items-center space-x-1.5">
                        <span className="font-bold w-4 text-center">{cat.prefix}</span>
                        <span>{cat.nome}</span>
                      </td>
                      <td className="p-2 text-right border-r border-slate-200 dark:border-slate-700 font-mono">
                        {formatCurrency(totalMai)}
                      </td>
                      <td className="p-2 text-right border-r border-slate-200 dark:border-slate-700 font-mono">
                        {formatCurrency(totalJun)}
                      </td>
                      <td className="p-2 text-right border-r border-slate-200 dark:border-slate-700 font-mono">
                        {formatCurrency(totalJul)}
                      </td>
                      <td className="p-2 text-right font-mono font-bold">
                        {formatCurrency(grandTotal)}
                      </td>
                    </tr>

                    {/* SubItems */}
                    {cat.subItems.map((sub, idx) => {
                      const subTotal = sub.mai + sub.jun + sub.jul;
                      return (
                        <tr
                          key={idx}
                          className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="p-2 pl-8 border-r border-slate-200 dark:border-slate-800">
                            {sub.nome}
                          </td>
                          <td className="p-2 text-right border-r border-slate-200 dark:border-slate-800 font-mono text-slate-600 dark:text-slate-400">
                            {formatCurrency(sub.mai)}
                          </td>
                          <td className="p-2 text-right border-r border-slate-200 dark:border-slate-800 font-mono text-slate-600 dark:text-slate-400">
                            {formatCurrency(sub.jun)}
                          </td>
                          <td className="p-2 text-right border-r border-slate-200 dark:border-slate-800 font-mono text-slate-600 dark:text-slate-400">
                            {formatCurrency(sub.jul)}
                          </td>
                          <td className="p-2 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {formatCurrency(subTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
