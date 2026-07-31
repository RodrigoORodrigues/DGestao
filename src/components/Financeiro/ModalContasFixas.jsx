import React, { useState } from "react";
import { X, Calendar, Plus, CheckCircle2, Trash2, Zap, RefreshCw } from "lucide-react";

export default function ModalContasFixas({
  isOpen,
  onClose,
  contasPagar = [],
  setContasPagar = () => {},
  contasReceber = [],
  setContasReceber = () => {}
}) {
  const [fixedList, setFixedList] = useState([
    { id: 101, tipo: "pagar", descricao: "Aluguel da Sede", entidade: "Imobiliária Central", valor: 3500, diaVencimento: 10, categoria: "Instalações" },
    { id: 102, tipo: "pagar", descricao: "Energia Elétrica", entidade: "CEMIG / Enel", valor: 850, diaVencimento: 15, categoria: "Utilidades" },
    { id: 103, tipo: "pagar", descricao: "Internet Fibra Dedicada", entidade: "Telecom Corp", valor: 299, diaVencimento: 5, categoria: "TI & Comunicação" },
    { id: 104, tipo: "pagar", descricao: "Assinatura Software ERP / Cloud", entidade: "SaaS Tech", valor: 450, diaVencimento: 20, categoria: "TI & Licenças" },
    { id: 105, tipo: "receber", descricao: "Mensalidade Contrato de Manutenção", entidade: "Cliente Alpha Ltda", valor: 2800, diaVencimento: 10, categoria: "Serviços Recorrentes" }
  ]);

  const [form, setForm] = useState({
    tipo: "pagar",
    descricao: "",
    entidade: "",
    valor: "",
    diaVencimento: "10",
    categoria: "Geral"
  });

  if (!isOpen) return null;

  const handleAddFixed = (e) => {
    e.preventDefault();
    if (!form.descricao || !form.valor) return;
    const newItem = {
      id: Date.now(),
      tipo: form.tipo,
      descricao: form.descricao,
      entidade: form.entidade || "Fornecedor Fixo",
      valor: parseFloat(form.valor) || 0,
      diaVencimento: parseInt(form.diaVencimento, 10) || 10,
      categoria: form.categoria
    };
    setFixedList([...fixedList, newItem]);
    setForm({
      tipo: "pagar",
      descricao: "",
      entidade: "",
      valor: "",
      diaVencimento: "10",
      categoria: "Geral"
    });
  };

  const handleDeleteFixed = (id) => {
    setFixedList(fixedList.filter((item) => item.id !== id));
  };

  const handleLancarNoMesAtual = () => {
    const today = new Date();
    const currentYearMonth = today.toISOString().slice(0, 7); // YYYY-MM
    let lancadosPagar = 0;
    let lancadosReceber = 0;

    fixedList.forEach((fixed) => {
      const diaStr = String(fixed.diaVencimento).padStart(2, "0");
      const dataVenc = `${currentYearMonth}-${diaStr}`;

      if (fixed.tipo === "pagar") {
        const novoPagar = {
          id: Date.now() + Math.random(),
          descricao: `[Fixo] ${fixed.descricao}`,
          entidade: fixed.entidade,
          pagamento: "Boleto Bancário",
          data: dataVenc,
          situacao: "Pendente",
          valor: fixed.valor,
          isFixo: true
        };
        setContasPagar((prev) => [novoPagar, ...prev]);
        lancadosPagar++;
      } else {
        const novoReceber = {
          id: Date.now() + Math.random(),
          descricao: `[Fixo] ${fixed.descricao}`,
          entidade: fixed.entidade,
          pagamento: "PIX",
          data: dataVenc,
          situacao: "Pendente",
          valor: fixed.valor,
          isFixo: true
        };
        setContasReceber((prev) => [novoReceber, ...prev]);
        lancadosReceber++;
      }
    });

    alert(
      `Sucesso! ${lancadosPagar} conta(s) a pagar e ${lancadosReceber} conta(s) a receber fixas foram lançadas para o mês atual (${currentYearMonth}).`
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden text-slate-900 dark:text-white flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-rose-900 text-white p-4 flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-2">
            <Calendar size={20} className="text-rose-200" />
            <div>
              <h2 className="text-base font-bold">Gestão de Contas Fixas & Recorrentes</h2>
              <p className="text-xs text-rose-200">Configure despesas e receitas mensais recorrentes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-rose-200 hover:text-white transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* Form to add a new fixed expense/income */}
          <form onSubmit={handleAddFixed} className="bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
              <Plus size={14} className="text-rose-600" />
              <span>Cadastrar Nova Conta Fixa</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2">
              <div className="md:col-span-1">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Tipo</label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 outline-none font-bold"
                >
                  <option value="pagar">Pagar (Despesa)</option>
                  <option value="receber">Receber (Receita)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Aluguel do Galpão"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-none"
                  required
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Favorecido/Cliente</label>
                <input
                  type="text"
                  placeholder="Fornecedor/Cliente"
                  value={form.entidade}
                  onChange={(e) => setForm({ ...form, entidade: e.target.value })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-none"
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 outline-none font-bold"
                  required
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Dia Venc.</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={form.diaVencimento}
                  onChange={(e) => setForm({ ...form, diaVencimento: e.target.value })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 outline-none text-center font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="bg-rose-900 hover:bg-rose-800 text-white font-bold px-4 py-1.5 rounded transition-colors flex items-center space-x-1 shadow-sm"
              >
                <Plus size={14} />
                <span>Adicionar à Lista</span>
              </button>
            </div>
          </form>

          {/* Table of Registered Fixed Accounts */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm">
            <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
              <span>Contas Fixas Cadastradas ({fixedList.length})</span>
              <span className="text-[11px] font-normal text-slate-500">Ocorrem mensalmente</span>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
                  <th className="p-2 border-r border-slate-200 dark:border-slate-800">Tipo</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-800">Descrição</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-800">Favorecido/Cliente</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-800 text-center">Dia Venc.</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-800 text-right">Valor Mensal</th>
                  <th className="p-2 text-center w-12">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {fixedList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-slate-400">
                      Nenhuma conta fixa cadastrada.
                    </td>
                  </tr>
                ) : (
                  fixedList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${item.tipo === "pagar" ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300" : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"}`}>
                          {item.tipo === "pagar" ? "Despesa" : "Receita"}
                        </span>
                      </td>
                      <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-semibold">{item.descricao}</td>
                      <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">{item.entidade}</td>
                      <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-center font-bold">Dia {item.diaVencimento}</td>
                      <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-right font-bold text-slate-800 dark:text-slate-100">
                        R$ {item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => handleDeleteFixed(item.id)}
                          className="p-1 bg-rose-500 hover:bg-rose-600 text-white rounded transition-colors"
                          title="Remover"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-100 dark:bg-slate-850 p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={handleLancarNoMesAtual}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded shadow-md transition-colors flex items-center space-x-2"
          >
            <Zap size={16} />
            <span>Gerar Lançamentos no Mês Atual</span>
          </button>
        </div>
      </div>
    </div>
  );
}
