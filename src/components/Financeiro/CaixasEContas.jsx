import React, { useState } from "react";
import {
  Building2,
  Plus,
  ArrowRightLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Edit3,
  Trash2,
  Home
} from "lucide-react";
import ModalTransferencia from "./ModalTransferencia";

export default function CaixasEContas({ caixas = [], setCaixas }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [banco, setBanco] = useState("Itaú Unibanco");
  const [agencia, setAgencia] = useState("");
  const [conta, setConta] = useState("");
  const [saldo, setSaldo] = useState("");

  const handleAddConta = (e) => {
    e.preventDefault();
    if (!nome) return;
    const nova = {
      id: `cx-${Date.now()}`,
      nome,
      banco,
      agencia: agencia || "0001",
      conta: conta || "12345-6",
      saldoInicial: parseFloat(saldo) || 0,
      entradas: 0,
      saidas: 0,
      saldoAtual: parseFloat(saldo) || 0
    };
    setCaixas([...caixas, nova]);
    setNome("");
    setAgencia("");
    setConta("");
    setSaldo("");
    setIsModalOpen(false);
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
            <span className="font-semibold text-slate-700 dark:text-slate-200">Caixas e contas bancárias</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Caixas e contas bancárias
          </h1>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-md shadow-sm transition-colors"
        >
          <Plus size={16} />
          <span>Nova Conta / Caixa</span>
        </button>
      </div>

      {/* Cards Grid of Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {caixas.map((item) => (
          <div
            key={item.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm">{item.nome}</h3>
                  <p className="text-[11px] text-slate-500">{item.banco} • Ag {item.agencia} C/C {item.conta}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Saldo Inicial:</span>
                <span className="font-mono font-medium">{formatCurrency(item.saldoInicial)}</span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span className="flex items-center space-x-1">
                  <TrendingUp size={12} />
                  <span>Entradas:</span>
                </span>
                <span className="font-mono font-bold">+{formatCurrency(item.entradas)}</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span className="flex items-center space-x-1">
                  <TrendingDown size={12} />
                  <span>Saídas:</span>
                </span>
                <span className="font-mono font-bold">-{formatCurrency(item.saidas)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-900 dark:text-white font-bold text-sm pt-2 border-t border-slate-200 dark:border-slate-800">
                <span>Saldo Atual:</span>
                <span className="font-mono text-base text-indigo-600 dark:text-indigo-400">
                  R$ {formatCurrency(item.saldoAtual)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsTransferModalOpen(true)}
                className="flex items-center space-x-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded text-[11px] font-semibold transition-colors"
              >
                <ArrowRightLeft size={12} />
                <span>Transferir</span>
              </button>
              <button
                onClick={() => setCaixas(caixas.filter((c) => c.id !== item.id))}
                className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded"
                title="Excluir"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Transferencia */}
      <ModalTransferencia
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        caixas={caixas}
        setCaixas={setCaixas}
      />

      {/* Modal Add Account */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Nova Conta Bancária / Caixa
            </h3>
            <form onSubmit={handleAddConta} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Nome da Conta / Caixa</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Itaú Empresa Principal"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 rounded p-2 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Banco / Instituição</label>
                <input
                  type="text"
                  placeholder="Ex: Itaú, Bradesco, Santander"
                  value={banco}
                  onChange={(e) => setBanco(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 rounded p-2 text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Agência</label>
                  <input
                    type="text"
                    placeholder="0001"
                    value={agencia}
                    onChange={(e) => setAgencia(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 rounded p-2 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Conta Corrente</label>
                  <input
                    type="text"
                    placeholder="12345-6"
                    value={conta}
                    onChange={(e) => setConta(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 rounded p-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Saldo Inicial (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={saldo}
                  onChange={(e) => setSaldo(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 rounded p-2 text-slate-900 dark:text-white font-bold text-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-500"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
