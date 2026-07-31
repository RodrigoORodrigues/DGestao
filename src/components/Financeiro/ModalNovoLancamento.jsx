import React, { useState, useEffect } from "react";
import { X, Save, Plus, DollarSign, Calendar, Tag, Building, CreditCard } from "lucide-react";

export default function ModalNovoLancamento({
  isOpen,
  onClose,
  onSave,
  tipo = "pagar", // "pagar" ou "receber"
  itemEditar = null,
  planosDeConta = [],
  centrosDeCusto = [],
  formasPagamento = []
}) {
  const [formData, setFormData] = useState({
    descricao: "",
    entidade: "",
    valor: "",
    data: new Date().toISOString().slice(0, 10),
    situacao: "Confirmado",
    pagamento: "Boleto Bancário",
    planoContas: "Telefonia e internet",
    centroCusto: "ESCRITÓRIO",
    loja: "PROTETTA SEGUROS",
    nfe: "",
    nfse: "",
    contrato: ""
  });

  useEffect(() => {
    if (itemEditar) {
      setFormData({
        ...itemEditar,
        valor: itemEditar.valor ? String(itemEditar.valor) : "",
        data: itemEditar.data || new Date().toISOString().slice(0, 10)
      });
    } else {
      setFormData({
        descricao: "",
        entidade: "",
        valor: "",
        data: new Date().toISOString().slice(0, 10),
        situacao: "Confirmado",
        pagamento: tipo === "receber" ? "Crédito em conta" : "Boleto Bancário",
        planoContas: tipo === "receber" ? "Receitas de Vendas" : "Telefonia e internet",
        centroCusto: tipo === "receber" ? "VENDAS" : "ESCRITÓRIO",
        loja: "PROTETTA SEGUROS",
        nfe: "",
        nfse: "",
        contrato: ""
      });
    }
  }, [itemEditar, isOpen, tipo]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.descricao || !formData.valor) {
      alert("Por favor, preencha a Descrição e o Valor.");
      return;
    }
    const valNumerico = parseFloat(String(formData.valor).replace(".", "").replace(",", ".")) || parseFloat(formData.valor) || 0;
    
    onSave({
      ...formData,
      id: itemEditar ? itemEditar.id : `${tipo === "receber" ? "cr" : "cp"}-${Date.now()}`,
      valor: valNumerico
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full p-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-5">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-lg ${tipo === 'receber' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'}`}>
              <DollarSign size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                {itemEditar ? "Editar Lançamento" : `Adicionar Contas a ${tipo === "receber" ? "Receber" : "Pagar"}`}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tipo === "receber" ? "Registre um novo recebimento ou fatura de entrada" : "Registre uma nova conta, boleto ou despesa de saída"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Descrição */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Descrição <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder={tipo === "receber" ? "Ex: Nota fiscal de serviço nº 2505" : "Ex: COMP. 04/26 VIVO CELULAR"}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Entidade / Favorecido */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {tipo === "receber" ? "Cliente / Entidade" : "Fornecedor / Favorecido"}
              </label>
              <input
                type="text"
                value={formData.entidade}
                onChange={(e) => setFormData({ ...formData, entidade: e.target.value })}
                placeholder={tipo === "receber" ? "Ex: AMIL ASSISTENCIA MEDICA" : "Ex: TELEFONICA BRASIL S.A."}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Valor */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Valor (R$) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                placeholder="0.00"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-emerald-600 dark:text-emerald-400"
              />
            </div>

            {/* Data */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Data Vencimento / Pagamento
              </label>
              <input
                type="date"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Situação */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Situação
              </label>
              <select
                value={formData.situacao}
                onChange={(e) => setFormData({ ...formData, situacao: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="Confirmado">{tipo === "receber" ? "Recebido (Confirmado)" : "Pago (Confirmado)"}</option>
                <option value="Pendente">Pendente / A Vencer</option>
                <option value="Atrasado">Atrasado / Vencido</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>

            {/* Formas de Pagamento */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Forma de Pagamento
              </label>
              <select
                value={formData.pagamento}
                onChange={(e) => setFormData({ ...formData, pagamento: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="Boleto Bancário">Boleto Bancário</option>
                <option value="PIX">PIX</option>
                <option value="Crédito em conta">Crédito em conta</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Transferência">Transferência Bancária</option>
                <option value="Dinheiro">Dinheiro</option>
              </select>
            </div>

            {/* Plano de contas */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Plano de Contas
              </label>
              <select
                value={formData.planoContas}
                onChange={(e) => setFormData({ ...formData, planoContas: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="Telefonia e internet">Telefonia e internet</option>
                <option value="Comissão de vendedores, cash back, bonificacao">Comissão de vendedores</option>
                <option value="Aluguel">Aluguel e Condomínio</option>
                <option value="Compras">Compras de Insumos</option>
                <option value="Taxi, Uber, despesas de escritório">Despesas de escritório</option>
                <option value="Licença ou aluguel de softwares">Licença de softwares</option>
                <option value="Impostos - IPTU">Impostos - IPTU / ISS</option>
                <option value="Receitas de Vendas">Receitas de Vendas</option>
              </select>
            </div>

            {/* Centro de Custo */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Centro de Custo
              </label>
              <select
                value={formData.centroCusto}
                onChange={(e) => setFormData({ ...formData, centroCusto: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="ESCRITÓRIO">ESCRITÓRIO</option>
                <option value="VENDAS">VENDAS</option>
                <option value="OPERACIONAL">OPERACIONAL</option>
              </select>
            </div>

            {/* Loja / Empresa */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Loja / Unidade
              </label>
              <input
                type="text"
                value={formData.loja}
                onChange={(e) => setFormData({ ...formData, loja: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* NFS-e / NF-e */}
            {tipo === "receber" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Número NFS-e
                </label>
                <input
                  type="text"
                  value={formData.nfse}
                  onChange={(e) => setFormData({ ...formData, nfse: e.target.value })}
                  placeholder="Ex: 2505"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            )}

          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-3 pt-5 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center space-x-1.5 px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-md transition-colors"
            >
              <Save size={16} />
              <span>Salvar Lançamento</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
