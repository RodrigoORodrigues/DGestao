import React, { useState } from "react";
import { X, ArrowUpDown, CheckCircle2, Building2 } from "lucide-react";

export default function ModalTransferencia({
  isOpen,
  onClose,
  caixas = [],
  setCaixas = () => {}
}) {
  const accountOptions = caixas.length > 0
    ? caixas.map((c) => c.nome || c.descricao)
    : ["Itaú Unibanco (Conta Corrente)", "Bradesco S/A", "Santander Brasil", "Caixa Econômica Federal", "Caixa Geral de Operações (Espécie)"];

  const [form, setForm] = useState({
    contaOrigem: accountOptions[0] || "Itaú Unibanco (Conta Corrente)",
    contaDestino: accountOptions[1] || "Bradesco S/A",
    valor: "",
    data: new Date().toISOString().split("T")[0],
    descricao: "Transferência interna entre contas bancárias"
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.valor || parseFloat(form.valor) <= 0) {
      alert("Por favor, informe um valor de transferência válido.");
      return;
    }
    if (form.contaOrigem === form.contaDestino) {
      alert("A conta de origem não pode ser igual à conta de destino.");
      return;
    }

    const val = parseFloat(form.valor);

    // If caixas state exists, deduct from origin and add to destination
    if (setCaixas && caixas.length > 0) {
      setCaixas((prev) =>
        prev.map((c) => {
          const nome = c.nome || c.descricao;
          if (nome === form.contaOrigem) {
            return { ...c, saldo: (parseFloat(c.saldo) || 0) - val };
          }
          if (nome === form.contaDestino) {
            return { ...c, saldo: (parseFloat(c.saldo) || 0) + val };
          }
          return c;
        })
      );
    }

    alert(
      `Transferência efetuada com sucesso!\n\nValor: R$ ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\nOrigem: ${form.contaOrigem}\nDestino: ${form.contaDestino}\nData: ${form.data}`
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden text-slate-900 dark:text-white">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <ArrowUpDown size={20} className="text-emerald-400" />
            <h2 className="text-base font-bold">Transferência entre Contas</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Conta de Origem (Débito)
            </label>
            <div className="relative">
              <Building2 className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
              <select
                value={form.contaOrigem}
                onChange={(e) => setForm({ ...form, contaOrigem: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md pl-8 pr-3 py-2 text-slate-900 dark:text-white font-semibold outline-none focus:border-indigo-500"
              >
                {accountOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Conta de Destino (Crédito)
            </label>
            <div className="relative">
              <Building2 className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
              <select
                value={form.contaDestino}
                onChange={(e) => setForm({ ...form, contaDestino: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md pl-8 pr-3 py-2 text-slate-900 dark:text-white font-semibold outline-none focus:border-indigo-500"
              >
                {accountOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Valor (R$)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-slate-900 dark:text-white font-bold text-sm outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Data
              </label>
              <input
                type="date"
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Histórico / Observação
            </label>
            <input
              type="text"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded-md"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-md shadow flex items-center space-x-1.5 transition-colors"
            >
              <CheckCircle2 size={16} />
              <span>Confirmar Transferência</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
