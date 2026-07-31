import React, { useState, useMemo } from "react";
import {
  Plus,
  ChevronDown,
  Search,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Download,
  Upload,
  ArrowUpDown,
  Eye,
  Edit3,
  Trash2,
  MoreVertical,
  Calendar,
  Grid,
  List,
  Home,
  Check,
  X,
  Printer
} from "lucide-react";
import ModalNovoLancamento from "./ModalNovoLancamento";
import ModalContasFixas from "./ModalContasFixas";
import ModalImprimirBoletosCarnes from "./ModalImprimirBoletosCarnes";

export default function ContasReceber({
  contasReceber,
  setContasReceber,
  onOpenModal
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [viewMode, setViewMode] = useState("list");
  const [isMaisAcoesOpen, setIsMaisAcoesOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("01 jan 2026 - 31 jul 2026");
  const [itemEditar, setItemEditar] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showBuscaAvancada, setShowBuscaAvancada] = useState(false);
  const [isModalContasFixasOpen, setIsModalContasFixasOpen] = useState(false);
  const [modalPrintType, setModalPrintType] = useState(null);

  // Comprehensive Filter State matching Screenshot 6
  const [filterForm, setFilterForm] = useState({
    loja: "PROTETTA SEGUROS",
    codigo: "",
    planoContas: "Todos",
    descricao: "",
    entidade: "Cliente",
    cliente: "",
    dataInicio: "2026-01-01",
    dataFim: "2026-07-31",
    valorMin: "",
    valorMax: "",
    situacao: "Todas",
    contaBancaria: "Todos",
    centroCusto: "Todos",
    formaRecebimento: "Todos",
    nfe: "",
    nfse: "",
    contrato: ""
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    let vencidos = 0;
    let vencemHoje = 0;
    let aVencer = 0;
    let recebidos = 0;
    let total = 0;

    contasReceber.forEach((item) => {
      const val = parseFloat(item.valor) || 0;
      total += val;
      if (item.situacao === "Confirmado" || item.situacao === "Recebido") {
        recebidos += val;
      } else if (item.situacao === "Atrasado") {
        vencidos += val;
      } else if (item.situacao === "Vence Hoje") {
        vencemHoje += val;
      } else {
        aVencer += val;
      }
    });

    return { vencidos, vencemHoje, aVencer, recebidos, total };
  }, [contasReceber]);

  // Filtered List
  const filteredContas = useMemo(() => {
    return contasReceber.filter((item) => {
      if (filterForm.descricao && !item.descricao.toLowerCase().includes(filterForm.descricao.toLowerCase())) {
        return false;
      }
      if (filterForm.cliente && !item.entidade.toLowerCase().includes(filterForm.cliente.toLowerCase())) {
        return false;
      }
      if (filterForm.situacao !== "Todas" && item.situacao !== filterForm.situacao) {
        return false;
      }
      if (filterForm.nfse && item.nfse && !item.nfse.includes(filterForm.nfse)) {
        return false;
      }
      return true;
    });
  }, [contasReceber, filterForm]);

  const handleSaveItem = (item) => {
    setContasReceber((prev) => {
      const exists = prev.some((i) => i.id === item.id);
      if (exists) {
        return prev.map((i) => (i.id === item.id ? item : i));
      }
      return [item, ...prev];
    });
  };

  const handleDelete = (id) => {
    if (window.confirm("Deseja realmente excluir esta conta a receber?")) {
      setContasReceber((prev) => prev.filter((i) => i.id !== id));
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const formatCurrency = (val) => {
    return (parseFloat(val) || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatDateBR = (dateStr) => {
    if (!dateStr) return "--/--/----";
    if (dateStr.includes("/")) return dateStr;
    const parts = dateStr.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
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
            <span>Contas a receber</span>
            <span>&gt;</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">Listar</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <span>Contas a receber</span>
          </h1>
        </div>

        {/* Right Top Actions */}
        <div className="flex items-center space-x-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-slate-900 text-white dark:bg-slate-800 text-xs font-semibold px-3 py-1.5 rounded-md outline-none cursor-pointer"
          >
            <option value="01 jan 2026 - 31 jul 2026">01 jan 2026 - 31 jul 2026</option>
            <option value="01 jul 2026 - 31 jul 2026">01 jul 2026 - 31 jul 2026</option>
            <option value="01 jun 2026 - 30 jun 2026">01 jun 2026 - 30 jun 2026</option>
          </select>

          <button
            onClick={() => setShowBuscaAvancada(!showBuscaAvancada)}
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
          >
            <Search size={14} />
            <span>Busca avançada</span>
          </button>
        </div>
      </div>

      {/* Main Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {/* Green Add Button */}
          <button
            onClick={() => {
              setItemEditar(null);
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-md shadow-sm transition-colors"
          >
            <Plus size={16} />
            <span>Adicionar</span>
          </button>

          {/* Burgundy Contas fixas Button */}
          <button
            onClick={() => setIsModalContasFixasOpen(true)}
            className="flex items-center space-x-1.5 bg-rose-900 hover:bg-rose-800 text-white text-xs font-bold px-3 py-2 rounded-md shadow-sm transition-colors border border-rose-950"
          >
            <Calendar size={14} />
            <span>Contas fixas</span>
          </button>

          {/* Mais ações Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsMaisAcoesOpen(!isMaisAcoesOpen)}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded-md transition-colors"
            >
              <MoreVertical size={14} />
              <span>Mais ações</span>
              <ChevronDown size={14} />
            </button>

            {isMaisAcoesOpen && (
              <div
                className="absolute left-0 mt-1 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-xl z-30 py-1 text-xs text-slate-700 dark:text-slate-200"
                onClick={() => setIsMaisAcoesOpen(false)}
              >
                <button
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2"
                  onClick={() => {
                    setContasReceber((prev) =>
                      prev.map((c) => ({ ...c, situacao: "Confirmado" }))
                    );
                    alert("Todas as contas a receber pendentes foram marcadas como CONFIRMADAS!");
                  }}
                >
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>Confirmar recebimentos</span>
                </button>
                <button
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2"
                  onClick={() => {
                    setContasReceber((prev) =>
                      prev.map((c) => ({ ...c, situacao: "Cancelado" }))
                    );
                    alert("Contas a receber canceladas.");
                  }}
                >
                  <XCircle size={14} className="text-rose-500" />
                  <span>Cancelar recebimentos</span>
                </button>
                <button
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2"
                  onClick={() => setIsModalContasFixasOpen(true)}
                >
                  <Calendar size={14} />
                  <span>Contas fixas</span>
                </button>
                <div className="border-t border-slate-200 dark:border-slate-800 my-1" />
                <button
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2"
                  onClick={() => setModalPrintType("carne")}
                >
                  <Printer size={14} />
                  <span>Gerar carnês de pagamento</span>
                </button>
                <button
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2"
                  onClick={() => setModalPrintType("relatorio")}
                >
                  <Printer size={14} className="text-indigo-500" />
                  <span>Relatório Impresso / PDF</span>
                </button>
                <button
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2"
                  onClick={() => {
                    const headers = ["ID", "Descricao", "Cliente", "Pagamento", "Data", "Situacao", "Valor"];
                    const rows = contasReceber.map((c) => [
                      c.id,
                      `"${(c.descricao || "").replace(/"/g, '""')}"`,
                      `"${(c.entidade || "").replace(/"/g, '""')}"`,
                      `"${c.pagamento || "Boleto"}"`,
                      c.data || "",
                      c.situacao || "",
                      (parseFloat(c.valor) || 0).toFixed(2)
                    ]);
                    const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
                    const link = document.createElement("a");
                    link.href = encodeURI(csv);
                    link.download = `contas_a_receber_${new Date().toISOString().slice(0, 10)}.csv`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <Download size={14} />
                  <span>Exportar recebimentos</span>
                </button>
              </div>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-0.5 rounded-md">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded ${viewMode === "list" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-500"}`}
              title="Visualização em Lista"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewMode("card")}
              className={`p-1.5 rounded ${viewMode === "card" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-500"}`}
              title="Visualização em Cards"
            >
              <Grid size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filter Form Grid matching Screenshot 6 */}
      {showBuscaAvancada && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3 shadow-sm text-xs animate-in fade-in duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Row 1 */}
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Loja</label>
              <select
                value={filterForm.loja}
                onChange={(e) => setFilterForm({ ...filterForm, loja: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-slate-900 dark:text-white"
              >
                <option value="PROTETTA SEGUROS">PROTETTA SEGUROS</option>
                <option value="Todas">Todas</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Código</label>
              <input
                type="text"
                value={filterForm.codigo}
                onChange={(e) => setFilterForm({ ...filterForm, codigo: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Plano de contas</label>
              <select
                value={filterForm.planoContas}
                onChange={(e) => setFilterForm({ ...filterForm, planoContas: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-slate-900 dark:text-white"
              >
                <option value="Todos">Todos</option>
                <option value="Receitas de Vendas">Receitas de Vendas</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Descrição</label>
              <input
                type="text"
                value={filterForm.descricao}
                onChange={(e) => setFilterForm({ ...filterForm, descricao: e.target.value })}
                placeholder="Digite a descrição..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-slate-900 dark:text-white"
              />
            </div>

            {/* Row 2 */}
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Entidade</label>
              <select
                value={filterForm.entidade}
                onChange={(e) => setFilterForm({ ...filterForm, entidade: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-slate-900 dark:text-white"
              >
                <option value="Cliente">Cliente</option>
                <option value="Fornecedor">Fornecedor</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Cliente</label>
              <input
                type="text"
                value={filterForm.cliente}
                onChange={(e) => setFilterForm({ ...filterForm, cliente: e.target.value })}
                placeholder="Digite para buscar"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Período</label>
              <div className="flex items-center space-x-1">
                <input
                  type="text"
                  value="01/01/2026"
                  readOnly
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-1 text-center"
                />
                <span>-</span>
                <input
                  type="text"
                  value="31/07/2026"
                  readOnly
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-1 text-center"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Valor</label>
              <input
                type="text"
                placeholder="Mín / Máx"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-slate-900 dark:text-white"
              />
            </div>

            {/* Row 3 */}
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Situação</label>
              <select
                value={filterForm.situacao}
                onChange={(e) => setFilterForm({ ...filterForm, situacao: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-slate-900 dark:text-white"
              >
                <option value="Todas">Todas</option>
                <option value="Confirmado">Confirmado</option>
                <option value="Pendente">Pendente</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Conta bancária</label>
              <select
                value={filterForm.contaBancaria}
                onChange={(e) => setFilterForm({ ...filterForm, contaBancaria: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-slate-900 dark:text-white"
              >
                <option value="Todos">Todos</option>
                <option value="Itaú">Itaú</option>
                <option value="Bradesco">Bradesco</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Centro de custo</label>
              <select
                value={filterForm.centroCusto}
                onChange={(e) => setFilterForm({ ...filterForm, centroCusto: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-slate-900 dark:text-white"
              >
                <option value="Todos">Todos</option>
                <option value="VENDAS">VENDAS</option>
                <option value="ESCRITÓRIO">ESCRITÓRIO</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Forma de recebimento</label>
              <select
                value={filterForm.formaRecebimento}
                onChange={(e) => setFilterForm({ ...filterForm, formaRecebimento: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-slate-900 dark:text-white"
              >
                <option value="Todos">Todos</option>
                <option value="Crédito em conta">Crédito em conta</option>
                <option value="PIX">PIX</option>
                <option value="Boleto">Boleto</option>
              </select>
            </div>

            {/* Row 4 */}
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">NF-e</label>
              <input
                type="text"
                value={filterForm.nfe}
                onChange={(e) => setFilterForm({ ...filterForm, nfe: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">NFS-e</label>
              <input
                type="text"
                value={filterForm.nfse}
                onChange={(e) => setFilterForm({ ...filterForm, nfse: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-slate-900 dark:text-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Contrato n.</label>
              <input
                type="text"
                value={filterForm.contrato}
                onChange={(e) => setFilterForm({ ...filterForm, contrato: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Buttons Buscar / Limpar */}
          <div className="flex items-center space-x-2 pt-2">
            <button
              onClick={() => alert("Filtro aplicado!")}
              className="flex items-center space-x-1 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded shadow-sm transition-colors text-xs"
            >
              <Check size={14} />
              <span>Buscar</span>
            </button>
            <button
              onClick={() =>
                setFilterForm({
                  loja: "PROTETTA SEGUROS",
                  codigo: "",
                  planoContas: "Todos",
                  descricao: "",
                  entidade: "Cliente",
                  cliente: "",
                  dataInicio: "2026-01-01",
                  dataFim: "2026-07-31",
                  valorMin: "",
                  valorMax: "",
                  situacao: "Todas",
                  contaBancaria: "Todos",
                  centroCusto: "Todos",
                  formaRecebimento: "Todos",
                  nfe: "",
                  nfse: "",
                  contrato: ""
                })
              }
              className="flex items-center space-x-1 px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded shadow-sm transition-colors text-xs"
            >
              <X size={14} />
              <span>Limpar</span>
            </button>
          </div>
        </div>
      )}

      {/* Summary Metric Header Cards matching Screenshot 6 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {/* Vencidos */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
          <div className="bg-rose-600 text-white text-[11px] font-bold px-3 py-1 text-center uppercase tracking-wider">
            Vencidos
          </div>
          <div className="p-3 text-center">
            <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
              {formatCurrency(metrics.vencidos)}
            </span>
          </div>
        </div>

        {/* Vencem hoje */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
          <div className="bg-amber-600 text-white text-[11px] font-bold px-3 py-1 text-center uppercase tracking-wider">
            Vencem hoje
          </div>
          <div className="p-3 text-center">
            <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(metrics.vencemHoje)}
            </span>
          </div>
        </div>

        {/* A vencer */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
          <div className="bg-slate-600 text-white text-[11px] font-bold px-3 py-1 text-center uppercase tracking-wider">
            A vencer
          </div>
          <div className="p-3 text-center">
            <span className="text-lg font-bold text-slate-600 dark:text-slate-400">
              {formatCurrency(metrics.aVencer)}
            </span>
          </div>
        </div>

        {/* Recebidos */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
          <div className="bg-emerald-600 text-white text-[11px] font-bold px-3 py-1 text-center uppercase tracking-wider">
            Recebidos
          </div>
          <div className="p-3 text-center">
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(metrics.recebidos)}
            </span>
          </div>
        </div>

        {/* Total */}
        <div className="col-span-2 md:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
          <div className="bg-slate-900 dark:bg-slate-950 text-white text-[11px] font-bold px-3 py-1 text-center uppercase tracking-wider">
            Total
          </div>
          <div className="p-3 text-center">
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {formatCurrency(metrics.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                <th className="p-2 border-r border-slate-200 dark:border-slate-700">Descrição</th>
                <th className="p-2 border-r border-slate-200 dark:border-slate-700">Entidade</th>
                <th className="p-2 border-r border-slate-200 dark:border-slate-700">Pagamento</th>
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-center">Data</th>
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-center">NFS-e</th>
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-center">Situação</th>
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">Valor</th>
                <th className="p-2 text-center w-28">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredContas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 dark:text-slate-400">
                    Nenhum recebimento encontrado.
                  </td>
                </tr>
              ) : (
                filteredContas.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-medium text-slate-800 dark:text-slate-200">
                      {item.descricao}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                      {item.entidade}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                      {item.pagamento}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-center text-slate-600 dark:text-slate-400 font-mono">
                      {formatDateBR(item.data)}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-center font-semibold text-indigo-600 dark:text-indigo-400">
                      {item.nfse || "—"}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.situacao === "Confirmado" || item.situacao === "Recebido"
                            ? "bg-emerald-600 text-white"
                            : "bg-amber-500 text-white"
                        }`}
                      >
                        {item.situacao}
                      </span>
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-right font-bold text-slate-800 dark:text-slate-200">
                      {formatCurrency(item.valor)}
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => {
                            setItemEditar(item);
                            setIsModalOpen(true);
                          }}
                          className="p-1 bg-sky-500 hover:bg-sky-600 text-white rounded transition-colors"
                          title="Visualizar"
                        >
                          <Eye size={12} />
                        </button>
                        <button
                          onClick={() => {
                            setItemEditar(item);
                            setIsModalOpen(true);
                          }}
                          className="p-1 bg-amber-500 hover:bg-amber-600 text-white rounded transition-colors"
                          title="Editar"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1 bg-rose-600 hover:bg-rose-700 text-white rounded transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Adding / Editing */}
      <ModalNovoLancamento
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveItem}
        tipo="receber"
        itemEditar={itemEditar}
      />

      {/* Modal Contas Fixas */}
      <ModalContasFixas
        isOpen={isModalContasFixasOpen}
        onClose={() => setIsModalContasFixasOpen(false)}
        contasReceber={contasReceber}
        setContasReceber={setContasReceber}
        tipoDefinido="receber"
      />

      {/* Modal Imprimir Boletos / Carnes / Relatorios */}
      <ModalImprimirBoletosCarnes
        isOpen={Boolean(modalPrintType)}
        onClose={() => setModalPrintType(null)}
        tipo={modalPrintType || "carne"}
        items={contasReceber}
      />
    </div>
  );
}
