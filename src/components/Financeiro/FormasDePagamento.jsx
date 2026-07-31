import React, { useState } from "react";
import {
  Home,
  Plus,
  Search,
  CreditCard,
  Edit2,
  Trash2,
  Copy,
  Check,
  X,
  Percent,
  Clock,
  Building2,
  Filter,
  RefreshCw,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowUpDown
} from "lucide-react";

export default function FormasDePagamento({ formasPagamento = [], setFormasPagamento }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("TODAS");
  const [filterFinalidade, setFilterFinalidade] = useState("TODAS");
  const [filterStatus, setFilterStatus] = useState("TODOS");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingForma, setEditingForma] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    nome: "",
    categoria: "PIX",
    finalidade: "Ambos",
    taxaPercentual: 0.0,
    taxaFixa: 0.0,
    prazoDias: 0,
    contaDestino: "Itaú - Conta Corrente Principal",
    ativo: true,
    instrucoes: ""
  });

  const CATEGORIAS = [
    { value: "PIX", label: "PIX", color: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700" },
    { value: "Boleto", label: "Boleto Bancário", color: "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700" },
    { value: "Cartão de Crédito", label: "Cartão de Crédito", color: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700" },
    { value: "Cartão de Débito", label: "Cartão de Débito", color: "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700" },
    { value: "Crédito em Conta", label: "Crédito em Conta", color: "bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700" },
    { value: "Transferência", label: "Transferência (TED/DOC)", color: "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700" },
    { value: "Dinheiro", label: "Dinheiro em Espécie", color: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700" },
    { value: "Outros", label: "Outros Métodos", color: "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700" }
  ];

  const CONTAS_DISPONIVEIS = [
    "Itaú - Conta Corrente Principal",
    "Bradesco - Operacional",
    "BB - Arrecadação",
    "Caixa Geral / Principal",
    "Santander Empresarial"
  ];

  const handleOpenAdd = () => {
    setEditingForma(null);
    setFormData({
      nome: "",
      categoria: "PIX",
      finalidade: "Ambos",
      taxaPercentual: 0.0,
      taxaFixa: 0.0,
      prazoDias: 0,
      contaDestino: "Itaú - Conta Corrente Principal",
      ativo: true,
      instrucoes: ""
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (forma) => {
    setEditingForma(forma);
    setFormData({
      nome: forma.nome || "",
      categoria: forma.categoria || "PIX",
      finalidade: forma.finalidade || "Ambos",
      taxaPercentual: forma.taxaPercentual || 0,
      taxaFixa: forma.taxaFixa || 0,
      prazoDias: forma.prazoDias || 0,
      contaDestino: forma.contaDestino || "Itaú - Conta Corrente Principal",
      ativo: forma.ativo !== false,
      instrucoes: forma.instrucoes || ""
    });
    setModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.nome.trim()) return;

    if (editingForma) {
      // Edit
      setFormasPagamento(
        formasPagamento.map((item) =>
          item.id === editingForma.id
            ? { ...item, ...formData, taxaPercentual: Number(formData.taxaPercentual), taxaFixa: Number(formData.taxaFixa), prazoDias: Number(formData.prazoDias) }
            : item
        )
      );
    } else {
      // Add
      const newForma = {
        id: `fp-${Date.now()}`,
        ...formData,
        taxaPercentual: Number(formData.taxaPercentual),
        taxaFixa: Number(formData.taxaFixa),
        prazoDias: Number(formData.prazoDias)
      };
      setFormasPagamento([newForma, ...formasPagamento]);
    }
    setModalOpen(false);
  };

  const handleDuplicate = (forma) => {
    const duplicated = {
      ...forma,
      id: `fp-${Date.now()}`,
      nome: `${forma.nome} (Cópia)`
    };
    setFormasPagamento([duplicated, ...formasPagamento]);
  };

  const handleToggleAtivo = (id) => {
    setFormasPagamento(
      formasPagamento.map((item) =>
        item.id === id ? { ...item, ativo: !item.ativo } : item
      )
    );
  };

  const handleDelete = (id) => {
    if (window.confirm("Tem certeza que deseja excluir esta forma de pagamento?")) {
      setFormasPagamento(formasPagamento.filter((f) => f.id !== id));
    }
  };

  // Filter logic
  const filteredFormas = formasPagamento.filter((item) => {
    const matchesSearch =
      (item.nome || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.categoria || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.instrucoes || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategoria =
      filterCategoria === "TODAS" || item.categoria === filterCategoria;

    const matchesFinalidade =
      filterFinalidade === "TODAS" || item.finalidade === filterFinalidade || item.finalidade === "Ambos";

    const matchesStatus =
      filterStatus === "TODOS" ||
      (filterStatus === "ATIVAS" && item.ativo !== false) ||
      (filterStatus === "INATIVAS" && item.ativo === false);

    return matchesSearch && matchesCategoria && matchesFinalidade && matchesStatus;
  });

  // KPI Calculations
  const totalFormas = formasPagamento.length;
  const totalAtivas = formasPagamento.filter((f) => f.ativo !== false).length;
  const mediaTaxa =
    formasPagamento.length > 0
      ? (
          formasPagamento.reduce((acc, curr) => acc + (Number(curr.taxaPercentual) || 0), 0) /
          formasPagamento.length
        ).toFixed(2)
      : "0.00";

  return (
    <div className="space-y-4">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <Home size={12} />
            <span>Início</span>
            <span>&gt;</span>
            <span>Financeiro</span>
            <span>&gt;</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">Formas de pagamento</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <CreditCard className="text-amber-600 dark:text-amber-400" size={22} />
            <span>Formas de Recebimento e Pagamento</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cadastre e gerencie taxas, prazos de liquidação (D+X), modalidades (PIX, Boleto, Cartão, Crédito em conta) e contas bancárias de destino.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-sm text-xs transition-colors"
          >
            <Plus size={16} />
            <span>Nova Forma de Pagamento</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-sm">
          <div className="text-slate-500 dark:text-slate-400 font-semibold mb-1">Total Cadastradas</div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white">{totalFormas}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Opções configuradas</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-sm">
          <div className="text-slate-500 dark:text-slate-400 font-semibold mb-1">Formas Ativas</div>
          <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{totalAtivas}</div>
          <div className="text-[10px] text-emerald-500 mt-0.5">Prontas para uso no PDV e Vendas</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-sm">
          <div className="text-slate-500 dark:text-slate-400 font-semibold mb-1">Taxa Média (%)</div>
          <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400">{mediaTaxa}%</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Impacto financeiro estimado</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-sm">
          <div className="text-slate-500 dark:text-slate-400 font-semibold mb-1">Inativas</div>
          <div className="text-xl font-extrabold text-rose-500">{totalFormas - totalAtivas}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Desativadas temporariamente</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-sm text-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, categoria ou taxa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Categoria Filter */}
          <select
            value={filterCategoria}
            onChange={(e) => setFilterCategoria(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium"
          >
            <option value="TODAS">Todas Categorias</option>
            {CATEGORIAS.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          {/* Finalidade Filter */}
          <select
            value={filterFinalidade}
            onChange={(e) => setFilterFinalidade(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium"
          >
            <option value="TODAS">Todas Finalidades</option>
            <option value="Recebimento">Apenas Recebimento</option>
            <option value="Pagamento">Apenas Pagamento</option>
            <option value="Ambos">Ambos (Entrada/Saída)</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium"
          >
            <option value="TODOS">Todos Status</option>
            <option value="ATIVAS">Ativas</option>
            <option value="INATIVAS">Inativas</option>
          </select>
        </div>

        <div className="text-slate-500 text-[11px] font-medium">
          Exibindo <span className="font-bold text-slate-800 dark:text-slate-200">{filteredFormas.length}</span> de {totalFormas}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-x-auto text-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
              <th className="p-3 border-r border-slate-200 dark:border-slate-700">Forma de Pagamento</th>
              <th className="p-3 border-r border-slate-200 dark:border-slate-700 text-center w-36">Categoria</th>
              <th className="p-3 border-r border-slate-200 dark:border-slate-700 text-center w-28">Finalidade</th>
              <th className="p-3 border-r border-slate-200 dark:border-slate-700 text-right w-36">Taxa (%) / Fixa</th>
              <th className="p-3 border-r border-slate-200 dark:border-slate-700 text-center w-28">Prazo (Dias)</th>
              <th className="p-3 border-r border-slate-200 dark:border-slate-700 w-44">Conta Destino</th>
              <th className="p-3 border-r border-slate-200 dark:border-slate-700 text-center w-24">Status</th>
              <th className="p-3 text-center w-28">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredFormas.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  Nenhuma forma de pagamento encontrada com os filtros selecionados.
                </td>
              </tr>
            ) : (
              filteredFormas.map((item) => {
                const catObj = CATEGORIAS.find((c) => c.value === item.categoria) || CATEGORIAS[7];
                const isAtivo = item.ativo !== false;

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                      !isAtivo ? "opacity-60 bg-slate-50/50 dark:bg-slate-950/40" : ""
                    }`}
                  >
                    {/* Nome e Instruções */}
                    <td className="p-3 border-r border-slate-200 dark:border-slate-800">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                        <span>{item.nome}</span>
                      </div>
                      {item.instrucoes && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-xs">
                          {item.instrucoes}
                        </div>
                      )}
                    </td>

                    {/* Categoria Badge */}
                    <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${catObj.color}`}
                      >
                        {item.categoria || "Outros"}
                      </span>
                    </td>

                    {/* Finalidade */}
                    <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-center font-medium">
                      {item.finalidade === "Recebimento" && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Recebimento</span>
                      )}
                      {item.finalidade === "Pagamento" && (
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">Pagamento</span>
                      )}
                      {(item.finalidade === "Ambos" || !item.finalidade) && (
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Ambos</span>
                      )}
                    </td>

                    {/* Taxas */}
                    <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-right font-mono">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {(Number(item.taxaPercentual) || 0).toFixed(2)}%
                      </div>
                      {Number(item.taxaFixa) > 0 && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          + R$ {(Number(item.taxaFixa) || 0).toFixed(2)}
                        </div>
                      )}
                    </td>

                    {/* Prazo */}
                    <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-center font-mono">
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-800 dark:text-slate-200 font-bold">
                        D+{item.prazoDias || 0}
                      </span>
                    </td>

                    {/* Conta Destino */}
                    <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium truncate max-w-[150px]">
                      {item.contaDestino || "Conta Padrão"}
                    </td>

                    {/* Status */}
                    <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-center">
                      <button
                        onClick={() => handleToggleAtivo(item.id)}
                        title="Clique para alternar status"
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-transform active:scale-95 ${
                          isAtivo
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {isAtivo ? "Ativo" : "Inativo"}
                      </button>
                    </td>

                    {/* Ações */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>

                        <button
                          onClick={() => handleDuplicate(item)}
                          className="p-1 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                          title="Duplicar"
                        >
                          <Copy size={14} />
                        </button>

                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Add/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-5 w-full max-w-xl relative">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <CreditCard className="text-amber-500" size={18} />
                <span>{editingForma ? "Editar Forma de Pagamento" : "Nova Forma de Pagamento"}</span>
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Nome */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Nome da Forma de Pagamento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: PIX Chave CNPJ, Boleto Itaú, Cartão Visa Crédito"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white"
                />
              </div>

              {/* Categoria e Finalidade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Categoria (Tipo)
                  </label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white font-medium"
                  >
                    {CATEGORIAS.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Finalidade
                  </label>
                  <select
                    value={formData.finalidade}
                    onChange={(e) => setFormData({ ...formData, finalidade: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="Ambos">Ambos (Recebimento e Pagamento)</option>
                    <option value="Recebimento">Apenas Recebimento de Clientes</option>
                    <option value="Pagamento">Apenas Pagamento de Fornecedores</option>
                  </select>
                </div>
              </div>

              {/* Taxas e Prazos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Taxa Percentual (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.taxaPercentual}
                    onChange={(e) => setFormData({ ...formData, taxaPercentual: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Taxa Fixa (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.taxaFixa}
                    onChange={(e) => setFormData({ ...formData, taxaFixa: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Prazo Liquidação (Dias)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.prazoDias}
                    onChange={(e) => setFormData({ ...formData, prazoDias: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Conta Bancária Destino */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Conta Bancária Destino Padrão
                </label>
                <select
                  value={formData.contaDestino}
                  onChange={(e) => setFormData({ ...formData, contaDestino: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white font-medium"
                >
                  {CONTAS_DISPONIVEIS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Instruções */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Instruções / Observações / Chave PIX
                </label>
                <textarea
                  rows={2}
                  placeholder="Informações relevantes para o operador do caixa ou cliente..."
                  value={formData.instrucoes}
                  onChange={(e) => setFormData({ ...formData, instrucoes: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white"
                />
              </div>

              {/* Ativo checkbox */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="ativoCheck"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <label htmlFor="ativoCheck" className="text-slate-800 dark:text-slate-200 font-bold cursor-pointer">
                  Forma de Pagamento Ativa
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end space-x-2 border-t border-slate-200 dark:border-slate-800 pt-3 mt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-sm"
                >
                  {editingForma ? "Salvar Alterações" : "Cadastrar Forma"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
