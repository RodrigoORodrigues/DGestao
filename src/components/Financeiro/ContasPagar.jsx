import React, { useState, useMemo } from "react";
import {
  Plus,
  ChevronDown,
  Search,
  Filter,
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
  Home
} from "lucide-react";
import ModalNovoLancamento from "./ModalNovoLancamento";

export default function ContasPagar({
  contasPagar,
  setContasPagar,
  onOpenModal
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [viewMode, setViewMode] = useState("list"); // "list" | "card"
  const [isMaisAcoesOpen, setIsMaisAcoesOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("2026-07");
  const [searchTerm, setSearchTerm] = useState("");
  const [showBuscaAvancada, setShowBuscaAvancada] = useState(false);
  const [itemEditar, setItemEditar] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filters for advanced search matching screenshot
  const [filterLoja, setFilterLoja] = useState("PROTETTA SEGUROS");
  const [filterCodigo, setFilterCodigo] = useState("");
  const [filterPlanoContas, setFilterPlanoContas] = useState("Todos");
  const [filterDescricao, setFilterDescricao] = useState("");
  const [filterEntidade, setFilterEntidade] = useState("Fornecedor");
  const [filterFornecedor, setFilterFornecedor] = useState("");
  const [filterPeriodoInicio, setFilterPeriodoInicio] = useState("2026-07-01");
  const [filterPeriodoFim, setFilterPeriodoFim] = useState("2026-07-31");
  const [filterValorMin, setFilterValorMin] = useState("");
  const [filterValorMax, setFilterValorMax] = useState("");
  const [filterSituacao, setFilterSituacao] = useState("Todas");
  const [filterContaBancaria, setFilterContaBancaria] = useState("Todos");
  const [filterCentroCusto, setFilterCentroCusto] = useState("Todos");
  const [filterFormaPagamento, setFilterFormaPagamento] = useState("Todos");
  const [filterNfe, setFilterNfe] = useState("");
  const [filterContratoN, setFilterContratoN] = useState("");

  const handleLimparFiltros = () => {
    setFilterLoja("PROTETTA SEGUROS");
    setFilterCodigo("");
    setFilterPlanoContas("Todos");
    setFilterDescricao("");
    setFilterEntidade("Fornecedor");
    setFilterFornecedor("");
    setFilterPeriodoInicio("2026-07-01");
    setFilterPeriodoFim("2026-07-31");
    setFilterValorMin("");
    setFilterValorMax("");
    setFilterSituacao("Todas");
    setFilterContaBancaria("Todos");
    setFilterCentroCusto("Todos");
    setFilterFormaPagamento("Todos");
    setFilterNfe("");
    setFilterContratoN("");
    setSearchTerm("");
  };

  // Calculate metrics dynamically based on current data
  const metrics = useMemo(() => {
    let vencidos = 0;
    let vencemHoje = 0;
    let aVencer = 0;
    let pagos = 0;
    let total = 0;

    contasPagar.forEach((item) => {
      const val = parseFloat(item.valor) || 0;
      total += val;
      if (item.situacao === "Confirmado" || item.situacao === "Pago") {
        pagos += val;
      } else if (item.situacao === "Atrasado") {
        vencidos += val;
      } else if (item.situacao === "Vence Hoje") {
        vencemHoje += val;
      } else {
        aVencer += val;
      }
    });

    return { vencidos, vencemHoje, aVencer, pagos, total };
  }, [contasPagar]);

  // Filtered list based on all advanced search fields
  const filteredContas = useMemo(() => {
    return contasPagar.filter((item) => {
      // Search term from quick search bar
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchDesc = item.descricao?.toLowerCase().includes(term);
        const matchEnt = item.entidade?.toLowerCase().includes(term);
        const matchCode = item.id?.toString().includes(term);
        if (!matchDesc && !matchEnt && !matchCode) return false;
      }

      // Loja
      if (filterLoja && filterLoja !== "Todas") {
        if (item.loja && item.loja !== filterLoja) return false;
      }

      // Código
      if (filterCodigo.trim()) {
        const codeStr = item.id ? String(item.id).toLowerCase() : "";
        if (!codeStr.includes(filterCodigo.trim().toLowerCase())) return false;
      }

      // Plano de contas
      if (filterPlanoContas !== "Todos") {
        if (item.planoContas && item.planoContas !== filterPlanoContas) return false;
      }

      // Descrição
      if (filterDescricao.trim()) {
        if (!item.descricao?.toLowerCase().includes(filterDescricao.trim().toLowerCase())) return false;
      }

      // Fornecedor / Entidade
      if (filterFornecedor.trim()) {
        if (!item.entidade?.toLowerCase().includes(filterFornecedor.trim().toLowerCase())) return false;
      }

      // Período
      if (filterPeriodoInicio && item.data) {
        if (item.data < filterPeriodoInicio) return false;
      }
      if (filterPeriodoFim && item.data) {
        if (item.data > filterPeriodoFim) return false;
      }

      // Valor
      const val = parseFloat(item.valor) || 0;
      if (filterValorMin !== "") {
        if (val < parseFloat(filterValorMin)) return false;
      }
      if (filterValorMax !== "") {
        if (val > parseFloat(filterValorMax)) return false;
      }

      // Situação
      if (filterSituacao !== "Todas") {
        if (item.situacao !== filterSituacao) return false;
      }

      // Conta Bancária
      if (filterContaBancaria !== "Todos") {
        if (item.contaBancaria && item.contaBancaria !== filterContaBancaria) return false;
      }

      // Centro de Custo
      if (filterCentroCusto !== "Todos") {
        if (item.centroCusto && item.centroCusto !== filterCentroCusto) return false;
      }

      // Forma de Pagamento
      if (filterFormaPagamento !== "Todos") {
        if (item.pagamento && item.pagamento !== filterFormaPagamento) return false;
      }

      // NF-e
      if (filterNfe.trim()) {
        if (!item.nfe?.toLowerCase().includes(filterNfe.trim().toLowerCase())) return false;
      }

      // Contrato n.
      if (filterContratoN.trim()) {
        if (!item.contrato?.toLowerCase().includes(filterContratoN.trim().toLowerCase())) return false;
      }

      return true;
    });
  }, [
    contasPagar,
    searchTerm,
    filterLoja,
    filterCodigo,
    filterPlanoContas,
    filterDescricao,
    filterFornecedor,
    filterPeriodoInicio,
    filterPeriodoFim,
    filterValorMin,
    filterValorMax,
    filterSituacao,
    filterContaBancaria,
    filterCentroCusto,
    filterFormaPagamento,
    filterNfe,
    filterContratoN
  ]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredContas.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSaveItem = (item) => {
    setContasPagar((prev) => {
      const exists = prev.some((i) => i.id === item.id);
      if (exists) {
        return prev.map((i) => (i.id === item.id ? item : i));
      }
      return [item, ...prev];
    });
  };

  const handleDelete = (id) => {
    if (window.confirm("Deseja realmente excluir esta conta a pagar?")) {
      setContasPagar((prev) => prev.filter((i) => i.id !== id));
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
            <span>Contas a pagar</span>
            <span>&gt;</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">Listar</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <span>Contas a pagar</span>
          </h1>
        </div>

        {/* Right Top Actions */}
        <div className="flex items-center space-x-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-900 text-white dark:bg-slate-800 text-xs font-semibold px-3 py-1.5 rounded-md outline-none cursor-pointer"
          >
            <option value="2026-07">Julho de 2026</option>
            <option value="2026-06">Junho de 2026</option>
            <option value="2026-05">Maio de 2026</option>
            <option value="2026-08">Agosto de 2026</option>
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
            onClick={() => alert("Exibindo Contas Fixas cadastradas.")}
            className="flex items-center space-x-1.5 bg-rose-900 hover:bg-rose-800 text-white text-xs font-bold px-3 py-2 rounded-md shadow-sm transition-colors"
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
                  onClick={() => alert("Selecione os pagamentos para confirmar.")}
                >
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>Confirmar pagamentos</span>
                </button>
                <button
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2"
                  onClick={() => alert("Pagamentos selecionados cancelados.")}
                >
                  <XCircle size={14} className="text-rose-500" />
                  <span>Cancelar pagamentos</span>
                </button>
                <button
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2"
                  onClick={() => alert("Abrindo gerenciamento de Contas Fixas.")}
                >
                  <Calendar size={14} />
                  <span>Contas fixas</span>
                </button>
                <button
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2"
                  onClick={() => alert("Iniciar transferência entre contas.")}
                >
                  <ArrowUpDown size={14} />
                  <span>Transferências entre contas</span>
                </button>
                <div className="border-t border-slate-200 dark:border-slate-800 my-1" />
                <button
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2"
                  onClick={() => alert("Importar extrato bancário (OFX/CSV).")}
                >
                  <Upload size={14} />
                  <span>Importar extrato</span>
                </button>
                <button
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2"
                  onClick={() => alert("Importar planilha Excel/CSV.")}
                >
                  <FileSpreadsheet size={14} />
                  <span>Importar planilha</span>
                </button>
                <button
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2"
                  onClick={() => alert("Exportando dados de pagamentos...")}
                >
                  <Download size={14} />
                  <span>Exportar pagamentos</span>
                </button>
              </div>
            )}
          </div>

          {/* Toggle List/Card View */}
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

        {/* Quick Search Bar */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar descrição ou fornecedor..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
          />
          <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
        </div>
      </div>

      {/* Advanced Filter Drawer */}
      {showBuscaAvancada && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 text-xs space-y-3.5 shadow-sm animate-in fade-in duration-150">
          {/* Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Loja */}
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Loja
              </label>
              <select
                value={filterLoja}
                onChange={(e) => setFilterLoja(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
              >
                <option value="PROTETTA SEGUROS">PROTETTA SEGUROS</option>
                <option value="Todas">Todas</option>
                <option value="MATRIZ">MATRIZ</option>
                <option value="FILIAL 01">FILIAL 01</option>
              </select>
            </div>

            {/* Código */}
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Código
              </label>
              <input
                type="text"
                value={filterCodigo}
                onChange={(e) => setFilterCodigo(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>

            {/* Plano de contas */}
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Plano de contas
              </label>
              <select
                value={filterPlanoContas}
                onChange={(e) => setFilterPlanoContas(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
              >
                <option value="Todos">Todos</option>
                <option value="Despesas Administrativas">Despesas Administrativas</option>
                <option value="Fornecedores">Fornecedores</option>
                <option value="Impostos e Taxas">Impostos e Taxas</option>
                <option value="Pessoal / Folha">Pessoal / Folha</option>
                <option value="Serviços de Terceiros">Serviços de Terceiros</option>
              </select>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Descrição
              </label>
              <input
                type="text"
                value={filterDescricao}
                onChange={(e) => setFilterDescricao(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Entidade */}
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Entidade
              </label>
              <select
                value={filterEntidade}
                onChange={(e) => setFilterEntidade(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
              >
                <option value="Fornecedor">Fornecedor</option>
                <option value="Cliente">Cliente</option>
                <option value="Todos">Todos</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            {/* Fornecedor */}
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Fornecedor
              </label>
              <input
                type="text"
                value={filterFornecedor}
                onChange={(e) => setFilterFornecedor(e.target.value)}
                placeholder="Digite para buscar"
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>

            {/* Período */}
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Período
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={filterPeriodoInicio}
                  onChange={(e) => setFilterPeriodoInicio(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
                />
                <span className="text-slate-500 dark:text-slate-400 font-medium text-xs">a</span>
                <input
                  type="date"
                  value={filterPeriodoFim}
                  onChange={(e) => setFilterPeriodoFim(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Valor */}
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Valor
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Mínimo"
                  value={filterValorMin}
                  onChange={(e) => setFilterValorMin(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
                />
                <span className="text-slate-500 dark:text-slate-400 font-medium text-xs">a</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Máximo"
                  value={filterValorMax}
                  onChange={(e) => setFilterValorMax(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Situação */}
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Situação
              </label>
              <select
                value={filterSituacao}
                onChange={(e) => setFilterSituacao(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
              >
                <option value="Todas">Todas</option>
                <option value="Confirmado">Confirmado</option>
                <option value="Pendente">Pendente</option>
                <option value="Atrasado">Atrasado</option>
                <option value="Vence Hoje">Vence Hoje</option>
              </select>
            </div>

            {/* Conta bancária */}
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Conta bancária
              </label>
              <select
                value={filterContaBancaria}
                onChange={(e) => setFilterContaBancaria(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
              >
                <option value="Todos">Todos</option>
                <option value="Itaú Unibanco">Itaú Unibanco</option>
                <option value="Bradesco">Bradesco</option>
                <option value="Santander">Santander</option>
                <option value="Banco do Brasil">Banco do Brasil</option>
                <option value="Caixa Econômica">Caixa Econômica</option>
              </select>
            </div>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Centro de custo */}
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Centro de custo
              </label>
              <select
                value={filterCentroCusto}
                onChange={(e) => setFilterCentroCusto(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
              >
                <option value="Todos">Todos</option>
                <option value="ESCRITÓRIO">ESCRITÓRIO</option>
                <option value="VENDAS">VENDAS</option>
                <option value="ADMINISTRATIVO">ADMINISTRATIVO</option>
                <option value="TI">TI</option>
                <option value="OPERACIONAL">OPERACIONAL</option>
              </select>
            </div>

            {/* Forma de pagamento */}
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Forma de pagamento
              </label>
              <select
                value={filterFormaPagamento}
                onChange={(e) => setFilterFormaPagamento(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
              >
                <option value="Todos">Todos</option>
                <option value="Boleto Bancário">Boleto Bancário</option>
                <option value="PIX">PIX</option>
                <option value="Crédito em conta">Crédito em conta</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Dinheiro">Dinheiro</option>
              </select>
            </div>

            {/* NF-e */}
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                NF-e
              </label>
              <input
                type="text"
                value={filterNfe}
                onChange={(e) => setFilterNfe(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>

            {/* Contrato n. */}
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Contrato n.
              </label>
              <input
                type="text"
                value={filterContratoN}
                onChange={(e) => setFilterContratoN(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleLimparFiltros}
              className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-semibold text-xs transition-colors"
            >
              Limpar Filtros
            </button>
            <button
              onClick={() => setShowBuscaAvancada(false)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold text-xs transition-colors shadow-sm"
            >
              Pesquisar
            </button>
          </div>
        </div>
      )}

      {/* Summary Metric Header Cards matching Screenshot 1 */}
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

        {/* Pagos */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
          <div className="bg-emerald-600 text-white text-[11px] font-bold px-3 py-1 text-center uppercase tracking-wider">
            Pagos
          </div>
          <div className="p-3 text-center">
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(metrics.pagos)}
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
                <th className="p-2 text-center w-8">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={
                      filteredContas.length > 0 &&
                      selectedIds.length === filteredContas.length
                    }
                    className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-0"
                  />
                </th>
                <th className="p-2 border-r border-slate-200 dark:border-slate-700">Descrição</th>
                <th className="p-2 border-r border-slate-200 dark:border-slate-700">Fornecedor / Favorecido</th>
                <th className="p-2 border-r border-slate-200 dark:border-slate-700">Pagamento</th>
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-center">Data</th>
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-center">Situação</th>
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">Valor</th>
                <th className="p-2 text-center w-28">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredContas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 dark:text-slate-400">
                    Nenhum registro encontrado para esta consulta.
                  </td>
                </tr>
              ) : (
                filteredContas.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        isSelected ? "bg-indigo-50/50 dark:bg-indigo-950/20" : ""
                      }`}
                    >
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(item.id)}
                          className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-0"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-medium text-slate-800 dark:text-slate-200">
                        {item.descricao}
                      </td>
                      <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                        {item.entidade || "—"}
                      </td>
                      <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                        {item.pagamento || "Boleto"}
                      </td>
                      <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-center text-slate-600 dark:text-slate-400 font-mono">
                        {formatDateBR(item.data)}
                      </td>
                      <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.situacao === "Confirmado" || item.situacao === "Pago"
                              ? "bg-emerald-600 text-white"
                              : item.situacao === "Atrasado"
                              ? "bg-rose-600 text-white"
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shared Modal for Adding / Editing */}
      <ModalNovoLancamento
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveItem}
        tipo="pagar"
        itemEditar={itemEditar}
      />
    </div>
  );
}
