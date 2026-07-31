import React, { useState } from "react";
import { Plus, ChevronRight, ChevronDown, Folder, Tag, Home, Edit3, Trash2 } from "lucide-react";

export default function PlanoDeContas({ planoContas = [], setPlanoContas }) {
  const [novoItem, setNovoItem] = useState("");
  const [novoTipo, setNovoTipo] = useState("Despesa");

  const handleAdd = (e) => {
    e.preventDefault();
    if (!novoItem) return;
    const cat = {
      id: `pc-${Date.now()}`,
      codigo: `3.${planoContas.length + 1}`,
      nome: novoItem,
      tipo: novoTipo,
      dreVinculo: novoTipo === "Receita" ? "Receita Bruta" : "Despesas Operacionais"
    };
    setPlanoContas([...planoContas, cat]);
    setNovoItem("");
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
            <span className="font-semibold text-slate-700 dark:text-slate-200">Plano de contas</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Plano de contas
          </h1>
        </div>
      </div>

      {/* Add Category Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm text-xs">
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
              Nova Categoria do Plano de Contas
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Softwares e Ferramentas SaaS"
              value={novoItem}
              onChange={(e) => setNovoItem(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white"
            />
          </div>
          <div className="w-40">
            <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
              Tipo
            </label>
            <select
              value={novoTipo}
              onChange={(e) => setNovoTipo(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white"
            >
              <option value="Despesa">Despesa</option>
              <option value="Receita">Receita</option>
              <option value="Custo">Custo</option>
            </select>
          </div>
          <button
            type="submit"
            className="flex items-center space-x-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded shadow-sm transition-colors"
          >
            <Plus size={16} />
            <span>Cadastrar Categoria</span>
          </button>
        </form>
      </div>

      {/* List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden text-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
              <th className="p-2.5 border-r border-slate-200 dark:border-slate-700 w-24">Código</th>
              <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Nome da Categoria</th>
              <th className="p-2.5 border-r border-slate-200 dark:border-slate-700 text-center w-32">Tipo</th>
              <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Vínculo DRE</th>
              <th className="p-2.5 text-center w-20">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {planoContas.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-2.5 border-r border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-600 dark:text-slate-400">
                  {item.codigo}
                </td>
                <td className="p-2.5 border-r border-slate-200 dark:border-slate-800 font-medium text-slate-800 dark:text-slate-200">
                  {item.nome}
                </td>
                <td className="p-2.5 border-r border-slate-200 dark:border-slate-800 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.tipo === "Receita"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                    }`}
                  >
                    {item.tipo}
                  </span>
                </td>
                <td className="p-2.5 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  {item.dreVinculo}
                </td>
                <td className="p-2.5 text-center">
                  <button
                    onClick={() => setPlanoContas(planoContas.filter((p) => p.id !== item.id))}
                    className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded"
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
