import React, { useState } from "react";
import { Plus, Target, Home, Trash2 } from "lucide-react";

export default function CentrosDeCusto({ centrosCusto = [], setCentrosCusto }) {
  const [novoCentro, setNovoCentro] = useState("");

  const handleAdd = (e) => {
    e.preventDefault();
    if (!novoCentro) return;
    setCentrosCusto([
      ...centrosCusto,
      {
        id: `cc-${Date.now()}`,
        codigo: `00${centrosCusto.length + 1}`,
        nome: novoCentro.toUpperCase(),
        orcamentoMensal: 10000,
        gastoAtual: 0
      }
    ]);
    setNovoCentro("");
  };

  const formatCurrency = (val) => {
    return (parseFloat(val) || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
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
            <span className="font-semibold text-slate-700 dark:text-slate-200">Centros de custo</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Centros de custo
          </h1>
        </div>
      </div>

      {/* Add Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm text-xs">
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
              Nome do Centro de Custo
            </label>
            <input
              type="text"
              required
              placeholder="Ex: MARKETING DIGITAL"
              value={novoCentro}
              onChange={(e) => setNovoCentro(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white uppercase"
            />
          </div>
          <button
            type="submit"
            className="flex items-center space-x-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded shadow-sm transition-colors"
          >
            <Plus size={16} />
            <span>Adicionar Centro de Custo</span>
          </button>
        </form>
      </div>

      {/* Grid of Centros de Custo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {centrosCusto.map((item) => (
          <div
            key={item.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3 relative"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <Target size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm">{item.nome}</h3>
                  <p className="text-[11px] text-slate-500">Código: {item.codigo}</p>
                </div>
              </div>
              <button
                onClick={() => setCentrosCusto(centrosCusto.filter((c) => c.id !== item.id))}
                className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 p-1 rounded"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-2 text-xs space-y-1">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Orçamento Previsto:</span>
                <span className="font-mono font-bold">R$ {formatCurrency(item.orcamentoMensal)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Gasto Realizado:</span>
                <span className="font-mono font-bold text-rose-600">R$ {formatCurrency(item.gastoAtual)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
