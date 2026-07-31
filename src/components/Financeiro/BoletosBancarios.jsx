import React, { useState } from "react";
import {
  Plus,
  Upload,
  Download,
  ChevronDown,
  Search,
  Check,
  X,
  Printer,
  FileText,
  Eye,
  Edit3,
  Trash2,
  MoreVertical,
  Home,
  CheckCircle2,
  XCircle,
  Grid,
  List
} from "lucide-react";
import ModalImprimirBoletosCarnes from "./ModalImprimirBoletosCarnes";
import ModalNovoLancamento from "./ModalNovoLancamento";

export default function BoletosBancarios({
  boletos = [],
  setBoletos = () => {},
  subView = "gerenciar"
}) {
  const [selectedPeriod, setSelectedPeriod] = useState("01 jan 2026 - 31 jul 2026");
  const [isMaisAcoesOpen, setIsMaisAcoesOpen] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [selectedIds, setSelectedIds] = useState([]);
  const [modalPrintType, setModalPrintType] = useState(null); // "boleto" | "carne" | "relatorio"
  const [isModalNovoOpen, setIsModalNovoOpen] = useState(false);
  const [itemEditar, setItemEditar] = useState(null);

  // Search form state matching screenshot 4
  const [formFilter, setFormFilter] = useState({
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

  const handleExportRemessa = () => {
    const cnabContent = `01REMESSA01COBRANCA       PROTETTA SEGUROS         341ITAU...`;
    const blob = new Blob([cnabContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `REMESSA_CNAB240_${new Date().toISOString().slice(0, 10)}.REM`;
    a.click();
    alert("Arquivo de remessa CNAB gerado e baixado com sucesso!");
  };

  const handleImportRetorno = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".RET,.txt,.ret";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        alert(`Arquivo de retorno '${file.name}' processado! Boletos baixados automaticamente.`);
      }
    };
    input.click();
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
            <span>Boletos bancários</span>
            <span>&gt;</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {subView === "remessa" ? "Exportar Remessa" : subView === "retorno" ? "Importar Retorno" : "Listar"}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Boletos bancários
          </h1>
        </div>

        {/* Right Top Date Range Filter */}
        <div className="flex items-center space-x-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-slate-900 text-white dark:bg-slate-800 text-xs font-semibold px-3 py-1.5 rounded-md outline-none cursor-pointer"
          >
            <option value="01 jan 2026 - 31 jul 2026">01 jan 2026 - 31 jul 2026</option>
            <option value="01 jul 2026 - 31 jul 2026">01 jul 2026 - 31 jul 2026</option>
          </select>

          <button
            onClick={() => alert("Exibindo busca avançada de boletos.")}
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
              const novo = {
                id: `bol-${Date.now()}`,
                numBoleto: `000${Math.floor(100000 + Math.random() * 900000)}`,
                cliente: "NOVO CLIENTE EMISSÃO",
                loja: "PROTETTA SEGUROS",
                dataEmissao: new Date().toISOString().slice(0, 10),
                dataVencimento: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
                valor: 1500.0,
                situacao: "A vencer",
                contaBancaria: "Itaú - Ag. 0123 C/C 45678-9"
              };
              setBoletos([novo, ...boletos]);
              alert("Novo boleto emitido com sucesso!");
            }}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-md shadow-sm transition-colors"
          >
            <Plus size={16} />
            <span>Adicionar</span>
          </button>

          {/* Burgundy Exportar Remessa */}
          <button
            onClick={handleExportRemessa}
            className="flex items-center space-x-1.5 bg-rose-900 hover:bg-rose-800 text-white text-xs font-bold px-3 py-2 rounded-md shadow-sm transition-colors"
          >
            <Upload size={14} />
            <span>Exportar remessa</span>
          </button>

          {/* Orange Importar Retorno */}
          <button
            onClick={handleImportRetorno}
            className="flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3 py-2 rounded-md shadow-sm transition-colors"
          >
            <Download size={14} />
            <span>Importar retorno</span>
          </button>

          {/* Mais ações Dropdown matching Screenshot 4 */}
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
                    setBoletos((prev) =>
                      prev.map((b) => ({ ...b, situacao: "Confirmado" }))
                    );
                    alert("Todos os boletos listados foram marcados como CONFIRMADOS!");
                  }}
                >
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>Confirmar recebimentos</span>
                </button>
                <button
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2"
                  onClick={() => {
                    setBoletos((prev) =>
                      prev.map((b) => ({ ...b, situacao: "Cancelado" }))
                    );
                    alert("Boletos cancelados.");
                  }}
                >
                  <XCircle size={14} className="text-rose-500" />
                  <span>Cancelar recebimentos</span>
                </button>
                <div className="border-t border-slate-200 dark:border-slate-800 my-1" />
                <button
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2"
                  onClick={() => {
                    const headers = ["ID", "NumBoleto", "Cliente", "Loja", "Emissao", "Vencimento", "Situacao", "Valor"];
                    const rows = boletos.map((b) => [
                      b.id,
                      b.numBoleto,
                      `"${(b.cliente || "").replace(/"/g, '""')}"`,
                      `"${(b.loja || "").replace(/"/g, '""')}"`,
                      b.dataEmissao || "",
                      b.dataVencimento || "",
                      b.situacao || "",
                      (parseFloat(b.valor) || 0).toFixed(2)
                    ]);
                    const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
                    const link = document.createElement("a");
                    link.href = encodeURI(csv);
                    link.download = `boletos_export_${new Date().toISOString().slice(0, 10)}.csv`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <FileText size={14} />
                  <span>Exportar recebimentos</span>
                </button>
                <button
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2"
                  onClick={() => setModalPrintType("boleto")}
                >
                  <Printer size={14} />
                  <span>Imprimir boletos</span>
                </button>
                <button
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2"
                  onClick={() => setModalPrintType("carne")}
                >
                  <Printer size={14} />
                  <span>Imprimir carnês</span>
                </button>
                <button
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2"
                  onClick={() => setModalPrintType("relatorio")}
                >
                  <Printer size={14} className="text-indigo-500" />
                  <span>Relatório Impresso / PDF</span>
                </button>
              </div>
            )}
          </div>

          {/* Toggle View Mode */}
          <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-0.5 rounded-md">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded ${viewMode === "list" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-500"}`}
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewMode("card")}
              className={`p-1.5 rounded ${viewMode === "card" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-500"}`}
            >
              <Grid size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Form matching Screenshot 4 */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3 shadow-sm text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Row 1 */}
          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Loja</label>
            <input
              type="text"
              value={formFilter.loja}
              onChange={(e) => setFormFilter({ ...formFilter, loja: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Nº boleto</label>
            <input
              type="text"
              value={formFilter.codigo}
              onChange={(e) => setFormFilter({ ...formFilter, codigo: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Plano de contas</label>
            <select
              value={formFilter.planoContas}
              onChange={(e) => setFormFilter({ ...formFilter, planoContas: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5"
            >
              <option value="Todos">Todos</option>
              <option value="Receitas de Vendas">Receitas de Vendas</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Descrição</label>
            <input
              type="text"
              value={formFilter.descricao}
              onChange={(e) => setFormFilter({ ...formFilter, descricao: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5"
            />
          </div>

          {/* Row 2 */}
          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Entidade</label>
            <select
              value={formFilter.entidade}
              onChange={(e) => setFormFilter({ ...formFilter, entidade: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5"
            >
              <option value="Cliente">Cliente</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Cliente</label>
            <input
              type="text"
              placeholder="Digite para buscar"
              value={formFilter.cliente}
              onChange={(e) => setFormFilter({ ...formFilter, cliente: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5"
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
              placeholder="Min / Max"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5"
            />
          </div>

          {/* Row 3 */}
          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Situação</label>
            <select
              value={formFilter.situacao}
              onChange={(e) => setFormFilter({ ...formFilter, situacao: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5"
            >
              <option value="Todas">Todas</option>
              <option value="Confirmado">Confirmado</option>
              <option value="A vencer">A vencer</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Conta bancária</label>
            <select
              value={formFilter.contaBancaria}
              onChange={(e) => setFormFilter({ ...formFilter, contaBancaria: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5"
            >
              <option value="Todos">Todos</option>
              <option value="Itaú">Itaú</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Centro de custo</label>
            <select
              value={formFilter.centroCusto}
              onChange={(e) => setFormFilter({ ...formFilter, centroCusto: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5"
            >
              <option value="Todos">Todos</option>
              <option value="VENDAS">VENDAS</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Forma de recebimento</label>
            <select
              value={formFilter.formaRecebimento}
              onChange={(e) => setFormFilter({ ...formFilter, formaRecebimento: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5"
            >
              <option value="Todos">Todos</option>
              <option value="Boleto Bancário">Boleto Bancário</option>
            </select>
          </div>
        </div>

        {/* Buttons Buscar & Limpar */}
        <div className="flex items-center space-x-2 pt-2">
          <button
            onClick={() => alert("Consulta de boletos realizada!")}
            className="flex items-center space-x-1 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded shadow-sm transition-colors text-xs"
          >
            <Check size={14} />
            <span>Buscar</span>
          </button>
          <button
            onClick={() =>
              setFormFilter({
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

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                <th className="p-2 border-r border-slate-200 dark:border-slate-700">Nº Boleto</th>
                <th className="p-2 border-r border-slate-200 dark:border-slate-700">Cliente / Pagador</th>
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-center">Emissão</th>
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-center">Vencimento</th>
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-center">Situação</th>
                <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">Valor</th>
                <th className="p-2 text-center w-28">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {boletos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Nenhum boleto encontrado.
                  </td>
                </tr>
              ) : (
                boletos.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {item.numBoleto}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-medium text-slate-800 dark:text-slate-200">
                      {item.cliente}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-center text-slate-600 dark:text-slate-400 font-mono">
                      {formatDateBR(item.dataEmissao)}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-center text-slate-600 dark:text-slate-400 font-mono">
                      {formatDateBR(item.dataVencimento)}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-center">
                      <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                        {item.situacao}
                      </span>
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-right font-bold text-slate-800 dark:text-slate-200">
                      R$ {formatCurrency(item.valor)}
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => setModalPrintType("boleto")}
                          className="p-1 bg-sky-500 hover:bg-sky-600 text-white rounded transition-colors"
                          title="Imprimir PDF / Visualizar"
                        >
                          <Printer size={12} />
                        </button>
                        <button
                          onClick={() => {
                            setItemEditar(item);
                            setIsModalNovoOpen(true);
                          }}
                          className="p-1 bg-amber-500 hover:bg-amber-600 text-white rounded transition-colors"
                          title="Editar"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={() => setBoletos(boletos.filter((b) => b.id !== item.id))}
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

      {/* Modal for Printing Boletos, Carnês and Reports */}
      <ModalImprimirBoletosCarnes
        isOpen={Boolean(modalPrintType)}
        onClose={() => setModalPrintType(null)}
        tipo={modalPrintType || "boleto"}
        items={boletos}
      />

      {/* Modal for Adding / Editing Boleto */}
      <ModalNovoLancamento
        isOpen={isModalNovoOpen}
        onClose={() => setIsModalNovoOpen(false)}
        onSave={(item) => {
          setBoletos((prev) => [
            {
              id: item.id || `bol-${Date.now()}`,
              numBoleto: `000${Math.floor(100000 + Math.random() * 900000)}`,
              cliente: item.entidade || "Cliente Boleto",
              loja: "PROTETTA SEGUROS",
              dataEmissao: new Date().toISOString().slice(0, 10),
              dataVencimento: item.data || new Date().toISOString().slice(0, 10),
              valor: item.valor || 100,
              situacao: "A vencer",
              contaBancaria: "Itaú - Ag. 0123 C/C 45678-9"
            },
            ...prev
          ]);
        }}
        tipo="receber"
        itemEditar={itemEditar}
      />
    </div>
  );
}
