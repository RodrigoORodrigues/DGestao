import React, { useState } from "react";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  PieChart,
  Activity,
  FileText,
  Building2,
  FolderTree,
  Target,
  CreditCard,
  ChevronRight
} from "lucide-react";

import ContasPagar from "./ContasPagar";
import ContasReceber from "./ContasReceber";
import DreGerencial from "./DreGerencial";
import FluxoCaixa from "./FluxoCaixa";
import BoletosBancarios from "./BoletosBancarios";
import CaixasEContas from "./CaixasEContas";
import PlanoDeContas from "./PlanoDeContas";
import CentrosDeCusto from "./CentrosDeCusto";
import FormasDePagamento from "./FormasDePagamento";
import ConciliacaoBancaria from "./ConciliacaoBancaria";
import { ArrowRightLeft } from "lucide-react";

import {
  INITIAL_CONTAS_PAGAR,
  INITIAL_CONTAS_RECEBER,
  INITIAL_BOLETOS,
  INITIAL_OPCOES_AUXILIARES
} from "./mockFinanceiroData";

export default function Financeiro({ subView = "contas-pagar", setSubView }) {
  // Shared Financial State
  const [contasPagar, setContasPagar] = useState(INITIAL_CONTAS_PAGAR);
  const [contasReceber, setContasReceber] = useState(INITIAL_CONTAS_RECEBER);
  const [boletos, setBoletos] = useState(INITIAL_BOLETOS);
  const [caixas, setCaixas] = useState(INITIAL_OPCOES_AUXILIARES.caixas);
  const [planoContas, setPlanoContas] = useState(INITIAL_OPCOES_AUXILIARES.planoContas);
  const [centrosCusto, setCentrosCusto] = useState(INITIAL_OPCOES_AUXILIARES.centrosCustos);
  const [formasPagamento, setFormasPagamento] = useState(INITIAL_OPCOES_AUXILIARES.formasPagamento);

  const [activeTab, setActiveTab] = useState(subView || "contas-pagar");

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    if (setSubView) setSubView(tabKey);
  };

  const navItems = [
    { key: "contas-pagar", label: "Contas a Pagar", icon: TrendingDown, color: "text-rose-500" },
    { key: "contas-receber", label: "Contas a Receber", icon: TrendingUp, color: "text-emerald-500" },
    { key: "dre", label: "DRE Gerencial", icon: PieChart, color: "text-sky-500" },
    { key: "fluxo-caixa", label: "Fluxo de Caixa", icon: Activity, color: "text-amber-500" },
    { key: "boletos", label: "Boletos Bancários", icon: FileText, color: "text-indigo-500" },
    { key: "caixas-contas", label: "Caixas e Contas", icon: Building2, color: "text-purple-500" },
    { key: "plano-contas", label: "Plano de Contas", icon: FolderTree, color: "text-teal-500" },
    { key: "centros-custo", label: "Centros de Custo", icon: Target, color: "text-blue-500" },
    { key: "formas-pagamento", label: "Formas de Pagamento", icon: CreditCard, color: "text-amber-600" },
    { key: "conciliacao", label: "Conciliação Bancária", icon: ArrowRightLeft, color: "text-emerald-600" }
  ];

  return (
    <div className="space-y-4">
      {/* Top Section Navigation Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 shadow-sm">
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 scrollbar-none text-xs font-semibold">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleTabChange(item.key)}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-slate-900 dark:bg-slate-800 text-white shadow-md font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
              >
                <Icon size={14} className={isActive ? "text-emerald-400" : item.color} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main SubView Content */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 md:p-6 shadow-sm">
        {activeTab === "contas-pagar" && (
          <ContasPagar
            contasPagar={contasPagar}
            setContasPagar={setContasPagar}
          />
        )}

        {activeTab === "contas-receber" && (
          <ContasReceber
            contasReceber={contasReceber}
            setContasReceber={setContasReceber}
          />
        )}

        {activeTab === "dre" && (
          <DreGerencial
            contasPagar={contasPagar}
            contasReceber={contasReceber}
          />
        )}

        {activeTab === "fluxo-caixa" && (
          <FluxoCaixa
            contasPagar={contasPagar}
            contasReceber={contasReceber}
          />
        )}

        {activeTab === "boletos" && (
          <BoletosBancarios
            boletos={boletos}
            setBoletos={setBoletos}
          />
        )}

        {activeTab === "caixas-contas" && (
          <CaixasEContas
            caixas={caixas}
            setCaixas={setCaixas}
          />
        )}

        {activeTab === "plano-contas" && (
          <PlanoDeContas
            planoContas={planoContas}
            setPlanoContas={setPlanoContas}
          />
        )}

        {activeTab === "centros-custo" && (
          <CentrosDeCusto
            centrosCusto={centrosCusto}
            setCentrosCusto={setCentrosCusto}
          />
        )}

        {activeTab === "formas-pagamento" && (
          <FormasDePagamento
            formasPagamento={formasPagamento}
            setFormasPagamento={setFormasPagamento}
          />
        )}

        {activeTab === "conciliacao" && (
          <ConciliacaoBancaria
            contasPagar={contasPagar}
            setContasPagar={setContasPagar}
            contasReceber={contasReceber}
            setContasReceber={setContasReceber}
          />
        )}
      </div>
    </div>
  );
}
