import React from "react";
import { X, Printer, Download, CheckCircle, FileText, Barcode, QrCode } from "lucide-react";

export default function ModalImprimirBoletosCarnes({
  isOpen,
  onClose,
  tipo = "boleto", // "boleto" | "carne" | "relatorio"
  items = []
}) {
  if (!isOpen) return null;

  const demoItems = items.length > 0 ? items : [
    {
      id: 1,
      cliente: "PROTETTA SEGUROS E SERVIÇOS LTDA",
      cnpj: "12.345.678/0001-90",
      nossoNumero: "23791.23456 78901.234567 89012.345678 1 9400000350000",
      linhaDigitavel: "23791.23456 78901.234567 89012.345678 1 9400000350000",
      valor: 3500.0,
      vencimento: "10/08/2026",
      parcela: "01/12",
      contrato: "CTR-2026-9921",
      descricao: "Mensalidade de Gestão Financeira & Consultoria"
    },
    {
      id: 2,
      cliente: "SUPERMERCADO SILVA & SILVA LTDA",
      cnpj: "98.765.432/0001-10",
      nossoNumero: "23791.98765 43210.123456 78901.234567 2 9400000185000",
      linhaDigitavel: "23791.98765 43210.123456 78901.234567 2 9400000185000",
      valor: 1850.0,
      vencimento: "15/08/2026",
      parcela: "02/12",
      contrato: "CTR-2026-8812",
      descricao: "Prestação de Serviços Especializados"
    }
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 dark:bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden text-slate-900 dark:text-white flex flex-col max-h-[92vh]">
        {/* Screen Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between shadow-sm print:hidden">
          <div className="flex items-center space-x-2">
            <Printer size={20} className="text-indigo-400" />
            <h2 className="text-base font-bold">
              {tipo === "boleto"
                ? "Impressão de Boletos Bancários"
                : tipo === "carne"
                ? "Impressão de Carnês de Pagamento"
                : "Relatório Impresso / PDF"}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-md shadow flex items-center space-x-1.5 transition-colors"
            >
              <Printer size={14} />
              <span>Imprimir / Salvar PDF</span>
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Banner matching Screenshot 4 */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 print:hidden">
          <button
            onClick={handlePrint}
            className="w-full flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-500 rounded-lg transition-colors font-bold text-slate-800 dark:text-white shadow-sm"
          >
            <div className="flex items-center space-x-2">
              <Printer className="text-indigo-600 dark:text-indigo-400" size={18} />
              <span className="text-sm">Relatório Impresso / PDF (.pdf)</span>
            </div>
            <Printer size={16} className="text-indigo-600 dark:text-indigo-400" />
          </button>
        </div>

        {/* Printable Area */}
        <div className="p-6 overflow-y-auto space-y-6 bg-white text-slate-900 print:p-0 print:overflow-visible text-xs">
          {tipo === "boleto" && (
            <div className="space-y-8">
              {demoItems.map((item, idx) => (
                <div key={idx} className="border-2 border-slate-900 p-4 rounded space-y-3 bg-white">
                  {/* Top Header */}
                  <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
                    <div className="flex items-center space-x-3">
                      <span className="font-extrabold text-lg text-rose-900 tracking-tight">BRADESCO</span>
                      <span className="font-mono font-bold text-base px-2 border-x-2 border-slate-900">237-2</span>
                    </div>
                    <div className="font-mono text-xs font-bold tracking-wider">{item.linhaDigitavel}</div>
                  </div>

                  {/* Fields Grid */}
                  <div className="grid grid-cols-4 gap-2 border-b border-slate-300 pb-2">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Local de Pagamento</div>
                      <div className="font-semibold">Pagável em qualquer banco até o vencimento</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Vencimento</div>
                      <div className="font-bold text-sm text-rose-700">{item.vencimento}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Agência / Código Beneficiário</div>
                      <div className="font-semibold">0482 / 0094820-1</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Valor do Documento</div>
                      <div className="font-extrabold text-sm text-slate-900">
                        R$ {item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-b border-slate-300 pb-2">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Beneficiário</div>
                      <div className="font-bold">FINANCEIRO INTEGRADO LTDA - CNPJ: 00.123.456/0001-00</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Pagador / Cliente</div>
                      <div className="font-bold text-slate-800">{item.cliente}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Nosso Número</div>
                      <div className="font-mono">09/000129384-9</div>
                    </div>
                  </div>

                  {/* PIX QR Code & Barcode */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-3 bg-slate-50 p-2 border border-slate-200 rounded">
                      <QrCode size={40} className="text-slate-800" />
                      <div>
                        <div className="font-bold text-[11px] text-emerald-700 flex items-center">
                          <CheckCircle size={12} className="mr-1" /> Pague via PIX (QR Code)
                        </div>
                        <div className="text-[10px] text-slate-500">Escaneie pelo app do seu banco</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono tracking-[0.3em] font-bold text-2xl text-slate-900 select-all">
                        ||||| ||| ||||||| |||| |||||||| ||||| |||||
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-1">Autenticação Mecânica - Ficha de Compensação</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tipo === "carne" && (
            <div className="space-y-6">
              <div className="text-center font-bold text-base uppercase border-b pb-2">
                Carnê de Pagamentos - Parcelamento Mensal
              </div>
              {demoItems.map((item, idx) => (
                <div key={idx} className="border-2 border-dashed border-slate-400 p-4 rounded-lg bg-slate-50 flex gap-4">
                  {/* Canhoto Stub */}
                  <div className="w-1/3 border-r-2 border-dashed border-slate-300 pr-4 space-y-2">
                    <div className="font-bold text-indigo-900 border-b pb-1 flex justify-between">
                      <span>Via do Cliente</span>
                      <span className="text-rose-600">{item.parcela}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Vencimento:</span>
                      <span className="font-bold text-slate-900">{item.vencimento}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Valor:</span>
                      <span className="font-bold text-slate-900">R$ {item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Pagador:</span>
                      <span className="font-medium truncate block">{item.cliente}</span>
                    </div>
                  </div>

                  {/* Main Slip */}
                  <div className="w-2/3 pl-2 space-y-2">
                    <div className="flex justify-between font-bold border-b pb-1 text-slate-900">
                      <span>COMPROVANTE DE PAGAMENTO - CARNÊ</span>
                      <span className="text-rose-600 font-mono">PARCELA {item.parcela}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500 block font-bold">Cliente:</span>
                        <span className="font-semibold">{item.cliente}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block font-bold">Vencimento:</span>
                        <span className="font-bold text-rose-700">{item.vencimento}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block font-bold">Contrato:</span>
                        <span>{item.contrato}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block font-bold">Valor a Pagar:</span>
                        <span className="font-extrabold text-emerald-700">R$ {item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <div className="font-mono text-center tracking-widest pt-2 font-bold text-lg text-slate-800">
                      |||| |||||| |||||||| ||||| |||||||
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tipo === "relatorio" && (
            <div className="space-y-4">
              <div className="text-center border-b pb-4">
                <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900">Relatório Financeiro Analítico</h1>
                <p className="text-xs text-slate-500 mt-1">Gerado em: {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR")}</p>
              </div>

              <table className="w-full text-left text-xs border border-slate-300">
                <thead className="bg-slate-100 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2 border-r">Cliente / Contrato</th>
                    <th className="p-2 border-r">Vencimento</th>
                    <th className="p-2 border-r">Parcela</th>
                    <th className="p-2 border-r text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {demoItems.map((item, i) => (
                    <tr key={i}>
                      <td className="p-2 border-r font-medium">{item.cliente} ({item.contrato})</td>
                      <td className="p-2 border-r">{item.vencimento}</td>
                      <td className="p-2 border-r text-center">{item.parcela}</td>
                      <td className="p-2 text-right font-bold">R$ {item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
