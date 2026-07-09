import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Lock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle,
  Users,
  Briefcase,
  ShoppingCart,
  Shield,
  HelpCircle,
  Eye,
  EyeOff,
  Search,
  Check,
  Building,
  Upload,
  UserPlus,
  Compass,
  ArrowRight,
  Info,
  DollarSign,
  Send,
  MessageSquare,
  Bot,
  Home,
  Layers,
  FileCheck,
  History,
  Receipt,
  Plus,
  FolderTree,
  Settings
} from "lucide-react";

export default function GuiaOnboarding({ onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  
  // Slide 1: Dashboard Analytics state
  const [anoFiltro, setAnoFiltro] = useState("2026");
  const [tipoMetrica, setTipoMetrica] = useState("Comissões");

  // Slide 2: Painel state
  const [painelShowAll, setPainelShowAll] = useState(false);

  // Slide 3: Vendas de Serviços state
  const [vendasSearch, setVendasSearch] = useState("");
  const [vendasList, setVendasList] = useState([
    { id: "V01", data: "02/06/2026", servico: "SULAMÉRICA COLETIVO", valor: 12450.00, status: "Faturado", parcelas: "1/12", operadora: "SULAMERICA" },
    { id: "V02", data: "05/06/2026", servico: "BRADESCO SAÚDE ME", valor: 8900.00, status: "Em Aberto", parcelas: "2/12", operadora: "BRADESCO" }
  ]);
  const [addVendaModal, setAddVendaModal] = useState(false);
  const [novaVenda, setNovaVenda] = useState({
    cliente: "",
    servico: "",
    valor: "",
    parcelas: "1/12",
    operadora: "AMIL"
  });

  // Slide 4: Clientes state
  const [clientesSearch, setClientesSearch] = useState("");
  const [clientesList, setClientesList] = useState([
    { nome: "ROBERTO ALVES COUTINHO", tipo: "PF", documento: "019.***.***-20", opSeg: "AMIL", servico: "Amil Fácil S80", situacao: "Ativo" },
    { nome: "METALÚRGICA NORDESTE LTDA", tipo: "PJ", documento: "12.345.*** /0001-99", opSeg: "BRADESCO", servico: "Nacional Flex", situacao: "Ativo" },
    { nome: "CLÍNICA SANTA HELENA", tipo: "PJ", documento: "08.121.*** /0001-34", opSeg: "SULAMÉRICA", servico: "Exato PME", situacao: "Ativo" }
  ]);
  const [addClienteModal, setAddClienteModal] = useState(false);
  const [novoCliente, setNovoCliente] = useState({ nome: "", tipo: "PF", documento: "", opSeg: "AMIL", servico: "" });

  // Slide 5: Relatório de Comissão state
  const [extratoSelecionado, setExtratoSelecionado] = useState("");
  const [isExtratoBuscado, setIsExtratoBuscado] = useState(false);
  const [linhasComissao, setLinhasComissao] = useState([
    { vendedor: "RODRIGO", proposta: "772183", cliente: "ASSOCIAÇÃO SERVIDORES", bruto: 4291.00, comissao: 429.10, status: "Conciliado" },
    { vendedor: "RODRIGO", proposta: "881292", cliente: "CARLOS EDUARDO ARAUJO", bruto: 1849.20, comissao: 184.92, status: "Conciliado" },
    { vendedor: "ANA", proposta: "140922", cliente: "EMPRESA DE TRANSPORTE S/A", bruto: 8900.00, comissao: 890.00, status: "Conciliado" }
  ]);

  // Slide 6: Relatórios Salvos state
  const [searchRelatorios, setSearchRelatorios] = useState("");
  const [relatoriosSalvos, setRelatoriosSalvos] = useState([
    { nome: "Relatório 29/05/2026", ref: "05/2026", responsavel: "Rodrigo", nfe: "NF 14", operadora: "AMIL", registros: 128 },
    { nome: "Relatório 15/05/2026", ref: "05/2026", responsavel: "Rodrigo", nfe: "NF 15", operadora: "BRADESCO", registros: 94 },
    { nome: "Relatório 30/04/2026", ref: "04/2026", responsavel: "Ana", nfe: "NF 12", operadora: "SULAMERICA", registros: 110 }
  ]);

  // Slide 7: Incluir Extrato (Upload) state
  const [uploadAno, setUploadAno] = useState("2026");
  const [uploadMes, setUploadMes] = useState("Janeiro");
  const [uploadCategoria, setUploadCategoria] = useState("Operadoras");
  const [uploadEmpresa, setUploadEmpresa] = useState("Protetta");
  const [uploadCodOp, setUploadCodOp] = useState("139491");
  const [uploadOpSeg, setUploadOpSeg] = useState("AMIL");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [nfVinculada, setNfVinculada] = useState("NF 14");
  const [nicknameFile, setNicknameFile] = useState("Comissões Janeiro AMIL");
  const [uploadSaved, setUploadSaved] = useState(false);

  // Slide 8: Consultar Extratos (Gestor) state
  const [checkedFiles, setCheckedFiles] = useState({
    file1: false,
    file2: false
  });

  // Slide 9: Gestão de Empresas state
  const [empresaAtiva, setEmpresaAtiva] = useState("Protetta");
  const [empresasLista, setEmpresasLista] = useState([
    { id: "E1", nome: "PROTETTA CORRETORA DE SEGUROS LTDA", cnpj: "12.345.678/0001-99", situacao: "Ativa", principal: true },
    { id: "E2", nome: "PROPER SOLUÇÕES EMPRESARIAIS LTDA", cnpj: "98.765.432/0001-00", situacao: "Ativa", principal: false }
  ]);

  // Support Chat
  const [chatMsgs, setChatMsgs] = useState([
    { sender: "bot", text: "Olá Rodrigo! Como posso te ajudar na conciliação hoje?" }
  ]);
  const [chatInput, setChatInput] = useState("");

  const stepsCount = 10;

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight") {
        if (currentStep < stepsCount - 1) {
          setCurrentStep(prev => prev + 1);
        }
      } else if (e.key === "ArrowLeft") {
        if (currentStep > 0) {
          setCurrentStep(prev => prev - 1);
        }
      } else if (e.key === "Space" || e.code === "Space") {
        // Only prevent default spacebar scrolling inside the modal
        e.preventDefault();
        if (currentStep < stepsCount - 1) {
          setCurrentStep(prev => prev + 1);
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep]);

  const sendBotMsg = (text) => {
    const userMsg = text || chatInput;
    if (!userMsg) return;
    
    setChatMsgs(prev => [...prev, { sender: "user", text: userMsg }]);
    if (!text) setChatInput("");

    setTimeout(() => {
      let botResponse = "Para mais informações sobre conciliação de faturamento, entre em contato pelo e-mail suporte@ongestao.com!";
      const lower = userMsg.toLowerCase();
      if (lower.includes("senha")) {
        botResponse = "Você pode alterar sua senha na aba de configurações do perfil de usuário.";
      } else if (lower.includes("venda")) {
        botResponse = "No menu 'Vendas de Serviços', use o botão '+ Adicionar' para registrar novos contratos.";
      } else if (lower.includes("suporte") || lower.includes("atendimento")) {
        botResponse = "Fale com nossa equipe de onboarding enviando um e-mail para suporte@ongestao.com.";
      } else if (lower.includes("extrato") || lower.includes("pdf")) {
        botResponse = "Para fazer a conciliação, primeiro anexe o arquivo na tela 'Incluir Extrato' e depois acesse 'Relatório Comissão' para buscar o OCR.";
      }
      setChatMsgs(prev => [...prev, { sender: "bot", text: botResponse }]);
    }, 600);
  };

  const currentProgressPercent = ((currentStep + 1) / stepsCount) * 100;

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[90vh] overflow-hidden transition-colors duration-300">
        {/* TOP HEADER BAR */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <span className="bg-blue-600 text-white p-1.5 rounded-lg shadow-sm">
              <Compass size={20} className="animate-spin-slow" />
            </span>
            <div>
              <h2 className="font-bold text-slate-800 dark:text-white leading-tight flex items-center gap-1.5 text-base sm:text-lg">
                DON GESTÃO <span className="text-xs bg-blue-100 dark:bg-blue-950 text-blue-600 px-2 py-0.5 rounded-full font-black uppercase">Guia Oficial</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Aprenda a operar cada tela, botão e filtro do sistema através deste simulador interativo
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Keyboard shortcut tips */}
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-200 dark:bg-slate-800 px-2.5 py-1 rounded-md text-xs font-mono text-slate-600 dark:text-slate-400">
              <kbd className="bg-white dark:bg-slate-700 px-1 py-0.5 rounded shadow">Space</kbd> /
              <kbd className="bg-white dark:bg-slate-700 px-1 py-0.5 rounded shadow">➡️</kbd> Avançar
            </div>
            
            <button
              onClick={onClose}
              className="text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-4 py-2 rounded-xl transition-all border border-slate-200/50 dark:border-slate-800"
            >
              Fechar Guia
            </button>
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 relative">
          <motion.div
            className="bg-blue-600 h-full"
            initial={{ width: 0 }}
            animate={{ width: `${currentProgressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* MAIN SPLIT PANE BODY */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* LEFT PANEL: CONTENT & EXPLANATIONS */}
          <div className="w-full lg:w-5/12 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 overflow-y-auto p-6 sm:p-8 flex flex-col justify-between bg-slate-50/50 dark:bg-slate-900/20">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6 text-slate-700 dark:text-slate-300"
              >
                {/* 0. Introdução */}
                {currentStep === 0 && (
                  <div className="space-y-4">
                    <span className="inline-flex items-center gap-1.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      <Sparkles size={14} /> Boas-vindas ao DON GESTÃO
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                      Gestão Estratégica & Conciliação de Comissões
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      O <strong>DON GESTÃO</strong> é a ferramenta definitiva para corretoras de seguros de vida e saúde (como a <strong>Protetta</strong>). Ele foi desenvolvido para automatizar a leitura de extratos complexos de operadoras, gerenciar comissões multinível, conciliar notas fiscais e fornecer inteligência analítica de vendas.
                    </p>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      Neste guia interativo, analisaremos as seções de forma visual baseada nas imagens reais do sistema, explicando o funcionamento de cada botão e componente.
                    </p>
                    
                    <div className="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-xl border border-blue-100 dark:border-blue-900 shadow-sm">
                      <h4 className="font-bold text-sm text-blue-600 dark:text-blue-400 mb-2 flex items-center">
                        <Info size={16} className="mr-1.5" /> Como testar?
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Leia a explicação de cada seção aqui na esquerda e interaja com o simulador visual ativo na direita para ver exatamente o papel de cada filtro e botão no fluxo de caixa real da corretora.
                      </p>
                    </div>
                  </div>
                )}

                {/* 1. Dashboard Estratégico & Analytics */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <span className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase">
                      Dashboard Estratégico
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      📊 1. Protetta Analytics & KPIs
                    </h3>
                    <p className="text-sm leading-relaxed">
                      A página principal do sistema é o painel de análise estratégica, onde você monitora a evolução financeira e o volume de vidas.
                    </p>
                    
                    <div className="space-y-3.5 text-xs">
                      <div>
                        <strong className="block text-slate-900 dark:text-white mb-0.5">Filtros Superiores:</strong>
                        <ul className="list-disc pl-4 space-y-1.5 text-slate-600 dark:text-slate-400">
                          <li><strong>Seletor de Ano:</strong> Altera o período acumulado exibido nos gráficos (ex: <strong>2026</strong>).</li>
                          <li><strong>Seletor de Métrica:</strong> Alterna entre visualizar valores em Reais (<strong>Comissões</strong>) ou quantidade física (<strong>Vidas</strong>).</li>
                          <li><strong>Botão Baixar PDF:</strong> Exporta um relatório executivo formatado com os gráficos e tabelas atuais para apresentação.</li>
                          <li><strong>Filtro de Carteira (TOTAL PROTETTA):</strong> Filtra as comissões por carteiras específicas ou corretores vinculados.</li>
                        </ul>
                      </div>

                      <div>
                        <strong className="block text-slate-900 dark:text-white mb-0.5">Indicadores de Desempenho (Cards):</strong>
                        <ul className="list-disc pl-4 space-y-1.5 text-slate-600 dark:text-slate-400">
                          <li><span className="font-semibold text-blue-600 dark:text-blue-400">Total Acumulado (R$ 941.600,12):</span> Soma das comissões consolidadas e conciliadas no ano letivo.</li>
                          <li><span className="font-semibold text-emerald-600 dark:text-emerald-400">Média Mensal (R$ 188.320,02):</span> Desempenho mensal médio de recebíveis da corretora.</li>
                          <li><span className="font-semibold text-purple-600 dark:text-purple-400">Pico de Performance (R$ 208.971,90):</span> Indica o mês com melhor desempenho comercial registrado (neste caso, <strong>Abril</strong>).</li>
                        </ul>
                      </div>

                      <div>
                        <strong className="block text-slate-900 dark:text-white mb-0.5">Gráficos de Evolução Mensal:</strong>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                          Mostra o histórico de receitas mes a mes (Ex: <strong>Jan 194k</strong>, <strong>Fev 188k</strong>, <strong>Mar 193k</strong>, <strong>Abr 209k</strong>, <strong>Mai 158k</strong>). Os widgets inferiores dão a divisão trimestral e comparativos entre operadoras.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-blue-800 dark:text-blue-300 rounded-lg text-xs">
                      💡 <strong>Interatividade:</strong> Altere o filtro de ano ou métrica no simulador para ver os valores recalcularem dinamicamente!
                    </div>
                  </div>
                )}

                {/* 2. Painel & Visão Geral */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <span className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase">
                      Visão Geral
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      🖥️ 2. Painel de Contratos Ativos
                    </h3>
                    <p className="text-sm leading-relaxed">
                      A seção <strong>Painel</strong> consolida as métricas físicas da corretora e exibe em tempo real os últimos contratos lançados no sistema.
                    </p>

                    <div className="space-y-3 text-xs">
                      <div className="bg-white dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Clientes na Base: 731</span>
                          <span className="text-[10px] text-blue-500 font-bold">Gerir Clientes &gt;</span>
                        </div>
                        <p className="text-[11px] text-slate-500">Total de CPFs e CNPJs cadastrados ativos.</p>
                      </div>

                      <div className="bg-white dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Extratos Arquivados: 514</span>
                          <span className="text-[10px] text-blue-500 font-bold">Explorar Gestor &gt;</span>
                        </div>
                        <p className="text-[11px] text-slate-500">Soma de extratos PDF/Excel que já foram carregados e processados.</p>
                      </div>

                      <div>
                        <strong className="block text-slate-900 dark:text-white mb-1">Grade de Contratos Ativos:</strong>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
                          Mapeia a situação de cada apólice com filtros rápidos. No cabeçalho, o indicador <strong>Total Ativos: 3023</strong> contabiliza o volume total de contratos vigentes na corretora.
                        </p>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                          Cada linha detalha a data de início, o nome do cliente, o número da apólice/contrato, a operadora contratada (ex: <strong>HAPVIDA</strong>, <strong>OMINT</strong>, <strong>PORTO SEGURO</strong>), a parcela corrente e o valor total mensal.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-blue-800 dark:text-blue-300 rounded-lg text-xs">
                      💡 <strong>Interatividade:</strong> Clique em "Ver todos no painel" na simulação para expandir os registros.
                    </div>
                  </div>
                )}

                {/* 3. Vendas de Serviços */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <span className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase">
                      Vendas de Serviços
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      🛒 3. Gestão e Lançamento de Vendas
                    </h3>
                    <p className="text-sm leading-relaxed">
                      O menu <strong>Vendas de Serviços</strong> exibe o livro-razão de faturamento de novos serviços contratados.
                    </p>

                    <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-400">
                      <div>
                        <strong className="block text-slate-900 dark:text-white mb-0.5">Painel de Ações:</strong>
                        <ul className="list-disc pl-4 space-y-1">
                          <li><strong>+ Adicionar:</strong> Abre o formulário para cadastro manual de uma nova venda ou contrato de serviço.</li>
                          <li><strong>Mais Ações:</strong> Menu para exportar os dados exibidos ou faturar parcelas em massa.</li>
                          <li><strong>Todo o Período:</strong> Filtro de datas rápido (mês atual, últimos 3 meses, ano corrente).</li>
                          <li><strong>Busca Avançada:</strong> Campo de pesquisa global para procurar por operadora, NF ou cliente.</li>
                        </ul>
                      </div>

                      <div>
                        <strong className="block text-slate-900 dark:text-white mb-1">Ações por Linha (Botões no lado direito):</strong>
                        <p className="leading-relaxed">
                          Cada registro possui 4 atalhos operacionais rápidos: 
                          <span className="font-semibold text-blue-500"> Visualizar Venda 🔍</span>, 
                          <span className="font-semibold text-emerald-500"> Baixar Documento 📄</span>, 
                          <span className="font-semibold text-amber-500"> Editar Dados ✏️</span>, e 
                          <span className="font-semibold text-rose-500"> Excluir Registro 🗑️</span>.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-blue-800 dark:text-blue-300 rounded-lg text-xs">
                      💡 <strong>Interatividade:</strong> Clique em "+ Adicionar" no simulador para cadastrar uma nova proposta instantaneamente!
                    </div>
                  </div>
                )}

                {/* 4. Gestão de Clientes */}
                {currentStep === 4 && (
                  <div className="space-y-4">
                    <span className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase">
                      Clientes
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      👥 4. Cadastro e Gestão de Clientes
                    </h3>
                    <p className="text-sm leading-relaxed">
                      A central de <strong>Gestão de Clientes</strong> armazena toda a carteira de vidas e empresas tomadoras de serviços.
                    </p>

                    <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-400">
                      <div>
                        <strong className="block text-slate-900 dark:text-white mb-0.5">Operações Principais:</strong>
                        <ul className="list-disc pl-4 space-y-1">
                          <li><strong>+ Adicionar:</strong> Permite cadastrar manualmente dados cadastrais detalhados do cliente.</li>
                          <li><strong>Importar:</strong> Faz upload em massa de clientes por planilhas Excel / CSV de forma inteligente.</li>
                        </ul>
                      </div>

                      <div>
                        <strong className="block text-slate-900 dark:text-white mb-0.5">Estrutura da Tabela:</strong>
                        <p className="leading-relaxed mb-1.5">
                          Exibe de forma clara: <strong>Nome completo</strong> (em caixa alta), <strong>Tipo</strong> (Pessoa física ou jurídica), <strong>Documento</strong> (CNPJ/CPF omitido por LGPD), <strong>Op.|Seg.</strong> (AMIL, Bradesco, etc.), e o <strong>Serviço</strong> ativo associado.
                        </p>
                        <p className="leading-relaxed">
                          A coluna <strong>Situação</strong> exibe um check verde (✓) para indicar que a apólice está adimplente e ativa no banco de dados.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-blue-800 dark:text-blue-300 rounded-lg text-xs">
                      💡 <strong>Interatividade:</strong> Use a busca rápida por nome no simulador para filtrar os clientes cadastrados.
                    </div>
                  </div>
                )}

                {/* 5. Relatório de Comissões e Conciliação */}
                {currentStep === 5 && (
                  <div className="space-y-4">
                    <span className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase">
                      Conciliação
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      📝 5. Relatório de Comissões & Extração
                    </h3>
                    <p className="text-sm leading-relaxed">
                      Esta é a tela de conciliação ativa! O módulo <strong>Relatórios de Comissão</strong> processa o extrato anexado e o divide em linhas auditáveis para a geração do relatório final.
                    </p>

                    <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-400">
                      <div>
                        <strong className="block text-slate-900 dark:text-white mb-0.5">Controles de Relatório:</strong>
                        <ul className="list-disc pl-4 space-y-1">
                          <li><strong>Selecionar Extrato:</strong> Campo principal para escolher qual extrato salvo no banco será extraído.</li>
                          <li><strong>Botão Buscar:</strong> Inicia o algoritmo de OCR e extração estruturada do PDF da operadora.</li>
                          <li><strong>Botão Novo:</strong> Limpa a mesa de trabalho atual para processar um novo documento.</li>
                          <li><strong>Botão + Linha:</strong> Adiciona manualmente uma linha de ajuste (para estornos, coparticipação ou bônus extras de corretagem).</li>
                        </ul>
                      </div>

                      <div>
                        <strong className="block text-slate-900 dark:text-white mb-0.5">Visualizador de Conciliação:</strong>
                        <p className="leading-relaxed">
                          Quando nenhum extrato está selecionado, o sistema avisa: <em>"Nenhum dado extraído ainda. Importe o PDF."</em> Caso contrário, monta uma tabela gigante detalhando desde vidas, vigência, taxas, comissão bruta (%) e comissão líquida a pagar.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-blue-800 dark:text-blue-300 rounded-lg text-xs">
                      💡 <strong>Interatividade:</strong> Selecione o extrato AMIL no simulador e clique em "Buscar" para simular a extração automática de dados em tempo real!
                    </div>
                  </div>
                )}

                {/* 6. Relatórios Salvos */}
                {currentStep === 6 && (
                  <div className="space-y-4">
                    <span className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase">
                      Histórico
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      📂 6. Auditoria de Relatórios Salvos
                    </h3>
                    <p className="text-sm leading-relaxed">
                      O arquivo de <strong>Relatórios Salvos</strong> funciona como o cofre e histórico de auditoria das folhas de comissões passadas.
                    </p>

                    <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
                      <div>
                        <strong className="block text-slate-900 dark:text-white mb-0.5">Informações de Rastreabilidade:</strong>
                        <ul className="list-disc pl-4 space-y-1">
                          <li><strong>Nome do Relatório / Referência:</strong> Identifica o lote (ex: <em>"Relatório 29/05/2026"</em>) e a competência (ex: <em>"05/2026"</em>).</li>
                          <li><strong>Responsável (Emissão):</strong> Registra o usuário autenticado que fechou o lote (ex: <strong>Rodrigo</strong>).</li>
                          <li><strong>NF & Operadora:</strong> Vínculo com a Nota Fiscal emitida e a respectiva operadora faturada (ex: <strong>SULAMERICA</strong>, <strong>AMIL</strong>).</li>
                          <li><strong>Registros:</strong> Quantidade física de apólices ou vidas processadas naquele lote único.</li>
                        </ul>
                      </div>

                      <div>
                        <strong className="block text-slate-900 dark:text-white mb-0.5">Ações de Auditoria:</strong>
                        <p className="leading-relaxed">
                          O botão <strong>Abrir</strong> exibe a planilha consolidada na tela. O botão <strong>Abrir Extrato</strong> recupera o PDF original da operadora anexado àquele relatório para tirar dúvidas de valores.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-blue-800 dark:text-blue-300 rounded-lg text-xs">
                      💡 <strong>Interatividade:</strong> Digite o nome de uma operadora na busca lateral do simulador para filtrar os lotes de relatórios antigos salvos.
                    </div>
                  </div>
                )}

                {/* 7. Incluir Extrato (Upload) */}
                {currentStep === 7 && (
                  <div className="space-y-4">
                    <span className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase">
                      Lançamento de Arquivos
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      📥 7. Arquivar Novo Extrato
                    </h3>
                    <p className="text-sm leading-relaxed">
                      A tela <strong>Incluir Extrato</strong> é a porta de entrada para novos arquivos das operadoras no DON GESTÃO.
                    </p>

                    <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-400">
                      <div>
                        <strong className="block text-slate-900 dark:text-white mb-0.5">Campos de Indexação:</strong>
                        <p className="leading-relaxed mb-1.5">
                          Para guardar o arquivo na pasta correta da nuvem corporativa, preencha o <strong>Ano</strong>, <strong>Mês</strong>, <strong>Categoria</strong> (ex: Operadoras), <strong>Empresa</strong> (ex: Protetta), o <strong>Cód. Operadora</strong> (ex: 139491) e o nome do parceiro (<strong>AMIL</strong>).
                        </p>
                      </div>

                      <div>
                        <strong className="block text-slate-900 dark:text-white mb-0.5">Área de Anexo & Nota Fiscal:</strong>
                        <p className="leading-relaxed mb-1.5">
                          O arquivo é anexado clicando ou arrastando o documento (PDF, Excel, TXT) na área tracejada.
                        </p>
                        <p className="leading-relaxed">
                          Após o anexo, o sistema habilita campos adicionais para vincular a <strong>Nota Fiscal Vinculada (NF-e)</strong> (ex: 14) e editar o nome amigável do arquivo para facilitar futuras buscas internas.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-blue-800 dark:text-blue-300 rounded-lg text-xs">
                      💡 <strong>Interatividade:</strong> Clique na área de upload no formulário ao lado para simular o anexo do extrato de comissão da AMIL!
                    </div>
                  </div>
                )}

                {/* 8. Consultar Extratos */}
                {currentStep === 8 && (
                  <div className="space-y-4">
                    <span className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase">
                      Gestor de Arquivos
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      🔍 8. Consultar Extratos & Pastas
                    </h3>
                    <p className="text-sm leading-relaxed">
                      O <strong>Gestor de Extratos</strong> funciona como um Google Drive privado da corretora, onde os PDFs carregados ficam salvos de forma organizada e criptografada.
                    </p>

                    <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-400">
                      <div>
                        <strong className="block text-slate-900 dark:text-white mb-0.5">Navegação Segura (Breadcrumbs):</strong>
                        <p className="leading-relaxed mb-1">
                          Você navega pelas pastas internas clicando nos caminhos no cabeçalho: 
                          <span className="font-mono text-blue-600 dark:text-blue-400"> Raiz &gt; 2026 &gt; Janeiro &gt; Operadoras &gt; Protetta &gt; AMIL &gt; 139491</span>.
                        </p>
                      </div>

                      <div>
                        <strong className="block text-slate-900 dark:text-white mb-0.5">Grade de Arquivos & Metadados:</strong>
                        <p className="leading-relaxed">
                          Cada arquivo carregado é representado como um cartão contendo o seu nome, o número da Nota Fiscal vinculada, tags da categoria e o status de processamento.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-blue-800 dark:text-blue-300 rounded-lg text-xs">
                      💡 <strong>Interatividade:</strong> No simulador, selecione os extratos marcando suas caixas de seleção (checkboxes) e veja as ações em lote serem habilitadas!
                    </div>
                  </div>
                )}

                {/* 9. Gestão Multi-Empresas */}
                {currentStep === 9 && (
                  <div className="space-y-4">
                    <span className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase">
                      Configurações do Sistema
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      🏢 9. Gestão Multi-Empresas
                    </h3>
                    <p className="text-sm leading-relaxed">
                      O DON GESTÃO possui suporte nativo para <strong>Multi-Empresas</strong>. Isso permite que uma mesma corretora gerencie múltiplos CNPJs (como a <strong>Protetta</strong> e a <strong>Proper</strong>) com dados isolados e independentes.
                    </p>

                    <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-400">
                      <div>
                        <strong className="block text-slate-900 dark:text-white mb-0.5">Empresa Ativa (Sidebar):</strong>
                        <p className="leading-relaxed mb-1">
                          No canto superior esquerdo, abaixo do nome do operador (Rodrigo), o card <strong>"EMPRESA ATIVA"</strong> exibe qual empresa você está controlando no momento. Toda a informação exibida nos dashboards muda de acordo com essa seleção.
                        </p>
                      </div>

                      <div>
                        <strong className="block text-slate-900 dark:text-white mb-0.5">Definir Empresa Principal:</strong>
                        <p className="leading-relaxed">
                          No painel de <strong>Gestão de Empresas</strong>, você visualiza a lista de empresas, CNPJs cadastrados e pode alterar qual delas é a default clicando em <strong>"Tornar Principal"</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs animate-pulse">
                      🎉 <strong>Finalização:</strong> Mude a empresa ativa no painel ao lado e conclua o onboarding com total domínio da plataforma!
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* LOWER PANE: KEYBOARD TIPS / BACK & NEXT BUTTONS */}
            <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() => {
                  if (currentStep > 0) setCurrentStep(prev => prev - 1);
                }}
                disabled={currentStep === 0}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none px-2 py-1.5 rounded transition-colors"
              >
                <ChevronLeft size={16} /> Voltar
              </button>

              <div className="text-xs text-slate-400 dark:text-slate-500 font-bold">
                Passo {currentStep + 1} de {stepsCount}
              </div>

              {currentStep < stepsCount - 1 ? (
                <button
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md transition-all animate-bounce-subtle"
                >
                  Avançar <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-md transition-all"
                >
                  <CheckCircle size={16} /> Concluir Integração
                </button>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: INTERACTIVE SYSTEM SIMULATOR */}
          <div className="w-full lg:w-7/12 p-6 sm:p-8 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 overflow-y-auto">
            
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
              >
                {/* MOCKUP HEADER */}
                <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs font-mono text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  </div>
                  <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-3 py-0.5 rounded text-slate-600 dark:text-slate-300 font-bold select-none">
                    SIMULADOR DE SISTEMA
                  </span>
                </div>

                {/* SLIDE 0 SIMULATION: WELCOME */}
                {currentStep === 0 && (
                  <div className="p-8 text-center space-y-6 bg-gradient-to-b from-blue-50/50 to-white dark:from-slate-900 dark:to-slate-950">
                    <div className="w-20 h-20 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto shadow-md transform rotate-6 hover:rotate-0 transition-all duration-300">
                      <Compass size={40} className="animate-spin-slow" />
                    </div>
                    <div className="space-y-2">
                      <div className="text-[10px] uppercase font-black tracking-widest text-blue-600 dark:text-blue-400">
                        Bem-vindo ao Onboarding
                      </div>
                      <h4 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                        Seu Ambiente de Simulação
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                        Este painel simula com precisão as telas e componentes reais do <strong>DON GESTÃO</strong>. Teste os seletores, buscas e formulários sem afetar dados reais de produção.
                      </p>
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={() => setCurrentStep(1)}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all transform hover:-translate-y-0.5"
                      >
                        Iniciar Simulação <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>
                )}

                {/* SLIDE 1 SIMULATION: ANALYTICS */}
                {currentStep === 1 && (
                  <div className="p-5 space-y-4">
                    {/* Header Filters */}
                    <div className="flex flex-wrap justify-between items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase text-slate-400">Ano:</span>
                        <select
                          value={anoFiltro}
                          onChange={(e) => setAnoFiltro(e.target.value)}
                          className="bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 px-2 py-1 rounded border-none outline-none cursor-pointer"
                        >
                          <option value="2026">2026</option>
                          <option value="2025">2025</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {["Comissões"].map((m) => (
                          <button
                            key={m}
                            onClick={() => setTipoMetrica(m)}
                            className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${tipoMetrica === m ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => alert("Simulação: PDF exportado com sucesso!")}
                        className="bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-[10px] px-3 py-1 rounded transition-colors"
                      >
                        Baixar PDF
                      </button>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-blue-50/50 dark:bg-blue-950/20 p-2.5 rounded-xl border border-blue-100/50 dark:border-blue-900/40 text-center">
                        <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-bold">Total Acumulado</span>
                        <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 block mt-0.5 truncate">
                          {tipoMetrica === "Comissões" ? (anoFiltro === "2026" ? "R$ 941.600,12" : "R$ 782.490,40") : "7.230 un"}
                        </span>
                      </div>
                      <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-100/50 dark:border-emerald-900/40 text-center">
                        <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-bold">Média Mensal</span>
                        <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 block mt-0.5 truncate">
                          {tipoMetrica === "Comissões" ? (anoFiltro === "2026" ? "R$ 188.320,02" : "R$ 156.498,08") : "1.446 un"}
                        </span>
                      </div>
                      <div className="bg-purple-50/50 dark:bg-purple-950/20 p-2.5 rounded-xl border border-purple-100/50 dark:border-purple-900/40 text-center">
                        <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-bold">Pico Anual</span>
                        <span className="text-[11px] font-black text-purple-600 dark:text-purple-400 block mt-0.5 truncate">
                          {tipoMetrica === "Comissões" ? "R$ 208.971,90" : "1.680 un"}
                        </span>
                      </div>
                    </div>

                    {/* Styled Chart Area */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Evolução Mensal ({anoFiltro})</span>
                        <span className="text-[10px] text-blue-600 font-bold">TOTAL PROTETTA</span>
                      </div>

                      {/* Visual Chart Bars representing real system metrics */}
                      <div className="h-28 flex items-end justify-between gap-2 pt-2 border-b border-slate-200 dark:border-slate-800">
                        {[
                          { m: "Jan", val: 194, color: "bg-blue-500" },
                          { m: "Fev", val: 188, color: "bg-blue-500" },
                          { m: "Mar", val: 193, color: "bg-blue-500" },
                          { m: "Abr", val: 209, color: "bg-blue-600 shadow-lg shadow-blue-500/20" },
                          { m: "Mai", val: 158, color: "bg-blue-400" }
                        ].map((b, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                            <span className="text-[8px] font-mono font-bold text-slate-500 dark:text-slate-400">
                              {tipoMetrica === "Comissões" ? `R$ ${b.val}k` : `${Math.round(b.val * 7)}`}
                            </span>
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${(b.val / 220) * 100}%` }}
                              transition={{ duration: 0.5, delay: i * 0.1 }}
                              className={`w-full rounded-t-md ${b.color} min-h-[4px]`}
                            />
                            <span className="text-[9px] font-bold text-slate-400 mt-1">{b.m}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* SLIDE 2 SIMULATION: CONTRATOS ATIVOS */}
                {currentStep === 2 && (
                  <div className="p-5 space-y-4">
                    {/* Header metrics */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border text-center">
                        <span className="block text-[8px] font-bold text-slate-400 uppercase">Clientes Base</span>
                        <span className="text-xs font-black text-slate-700 dark:text-white">731</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border text-center">
                        <span className="block text-[8px] font-bold text-slate-400 uppercase">Extratos Arquivo</span>
                        <span className="text-xs font-black text-slate-700 dark:text-white">514</span>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-950 p-2 rounded-lg border border-blue-100 dark:border-blue-900 text-center">
                        <span className="block text-[8px] font-bold text-blue-500 uppercase">Total Ativos</span>
                        <span className="text-xs font-black text-blue-600 dark:text-blue-400">3.023</span>
                      </div>
                    </div>

                    {/* Table of Contracts */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 dark:bg-slate-800 px-3 py-2 text-[9px] font-black text-slate-500 uppercase tracking-wider flex justify-between">
                        <span className="w-1/4">Início / Cliente</span>
                        <span className="w-1/4 text-center">Apólice</span>
                        <span className="w-1/4 text-center">Op. | Seg.</span>
                        <span className="w-1/4 text-right">Parcela / Valor</span>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-slate-800 text-[10px] max-h-48 overflow-y-auto">
                        {[
                          { data: "02/05/2026", cliente: "ASSOCIAÇÃO DOS SERVIDORES", apolice: "7762", op: "HAPVIDA", parc: "1/12", valor: "R$ 4.291,00" },
                          { data: "12/05/2026", cliente: "CARLOS EDUARDO ARAUJO", apolice: "8933", op: "OMINT", parc: "2/12", valor: "R$ 1.849,20" },
                          { data: "28/05/2026", cliente: "EMPRESA DE TRANSPORTE S/A", apolice: "1409", op: "PORTO SEGURO", parc: "3/24", valor: "R$ 8.900,00" }
                        ].map((row, idx) => (
                          <div key={idx} className="p-3 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <div className="w-1/4 truncate">
                              <span className="text-[8px] block text-slate-400 font-mono">{row.data}</span>
                              <span className="font-extrabold text-slate-800 dark:text-white truncate block">{row.cliente}</span>
                            </div>
                            <span className="w-1/4 text-center font-mono font-bold text-slate-600 dark:text-slate-400">{row.apolice}</span>
                            <span className="w-1/4 text-center">
                              <span className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">
                                {row.op}
                              </span>
                            </span>
                            <div className="w-1/4 text-right">
                              <span className="text-[8px] block text-slate-400 font-bold">{row.parc}</span>
                              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">{row.valor}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => setPainelShowAll(!painelShowAll)}
                        className="text-[10px] font-black text-blue-600 hover:text-blue-500 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        {painelShowAll ? "Recolher registros ⬆️" : "Ver todos no painel ➡️"}
                      </button>
                    </div>
                  </div>
                )}

                {/* SLIDE 3 SIMULATION: VENDAS DE SERVIÇOS */}
                {currentStep === 3 && (
                  <div className="p-5 space-y-4">
                    {/* Filter and Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setAddVendaModal(true)}
                          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-md shadow-blue-500/10"
                        >
                          <Plus size={12} /> + Adicionar
                        </button>
                        <select className="bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 rounded-lg px-2 border-none outline-none">
                          <option>Mais ações</option>
                        </select>
                      </div>

                      <div className="flex gap-1.5">
                        <select className="bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 rounded-lg px-2 border-none outline-none">
                          <option>Todo o período</option>
                        </select>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Busca avançada"
                            value={vendasSearch}
                            onChange={(e) => setVendasSearch(e.target.value)}
                            className="bg-slate-100 dark:bg-slate-800 pl-6 pr-2 py-1 rounded-lg text-[10px] text-slate-700 dark:text-white outline-none w-28 focus:w-36 transition-all"
                          />
                          <Search size={10} className="absolute left-2 top-2 text-slate-400" />
                        </div>
                      </div>
                    </div>

                    {/* Vendas Table */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 dark:bg-slate-800 px-3 py-2 text-[9px] font-black text-slate-500 uppercase tracking-wider flex justify-between">
                        <span className="w-1/3">Data / Serviço</span>
                        <span className="w-1/4 text-center">Valor / Parc.</span>
                        <span className="w-1/6 text-center">Situação</span>
                        <span className="w-1/4 text-right">Ações</span>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-slate-800 text-[10px]">
                        {vendasList
                          .filter(v => v.servico.toLowerCase().includes(vendasSearch.toLowerCase()) || v.operadora.toLowerCase().includes(vendasSearch.toLowerCase()))
                          .map((row, idx) => (
                            <div key={idx} className="p-3 flex justify-between items-center">
                              <div className="w-1/3">
                                <span className="text-[8px] block font-mono text-slate-400">{row.data}</span>
                                <span className="font-extrabold text-slate-800 dark:text-white block">{row.servico}</span>
                              </div>
                              <div className="w-1/4 text-center">
                                <span className="font-mono text-slate-800 dark:text-slate-200 block font-bold">R$ {row.valor.toFixed(2)}</span>
                                <span className="text-[8px] text-slate-400">{row.parcelas}</span>
                              </div>
                              <div className="w-1/6 text-center">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${row.status === "Faturado" ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400" : "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400"}`}>
                                  {row.status}
                                </span>
                              </div>
                              {/* Standard action buttons */}
                              <div className="w-1/4 flex justify-end gap-1">
                                <button title="Visualizar" onClick={() => alert(`Visualizando ${row.servico}`)} className="text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded">🔍</button>
                                <button title="Baixar" onClick={() => alert("Baixando documento correspondente")} className="text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded">📄</button>
                                <button title="Editar" onClick={() => alert("Editar registro")} className="text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded">✏️</button>
                                <button title="Excluir" onClick={() => setVendasList(prev => prev.filter(v => v.id !== row.id))} className="text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded">🗑️</button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Add Venda Form Modal (Interactive) */}
                    {addVendaModal && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border max-w-sm w-full space-y-3 shadow-2xl">
                          <h5 className="font-black text-xs uppercase text-slate-800 dark:text-white">Adicionar Novo Lançamento</h5>
                          
                          <div className="space-y-2 text-xs">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400">Cliente</label>
                              <input
                                type="text"
                                placeholder="Nome do Cliente"
                                value={novaVenda.cliente}
                                onChange={e => setNovaVenda({ ...novaVenda, cliente: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-850 p-2 rounded-lg border text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400">Serviço / Plano</label>
                              <input
                                type="text"
                                placeholder="Ex: AMIL S80 INDIVIDUAL"
                                value={novaVenda.servico}
                                onChange={e => setNovaVenda({ ...novaVenda, servico: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-850 p-2 rounded-lg border text-xs"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400">Valor Total (R$)</label>
                                <input
                                  type="number"
                                  placeholder="500"
                                  value={novaVenda.valor}
                                  onChange={e => setNovaVenda({ ...novaVenda, valor: e.target.value })}
                                  className="w-full bg-slate-50 dark:bg-slate-850 p-2 rounded-lg border text-xs font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400">Parcelas</label>
                                <select
                                  value={novaVenda.parcelas}
                                  onChange={e => setNovaVenda({ ...novaVenda, parcelas: e.target.value })}
                                  className="w-full bg-slate-50 dark:bg-slate-850 p-2 rounded-lg border text-xs font-bold"
                                >
                                  <option value="1/12">1/12</option>
                                  <option value="2/12">2/12</option>
                                  <option value="3/24">3/24</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 justify-end pt-2">
                            <button
                              onClick={() => setAddVendaModal(false)}
                              className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 px-3 py-1.5 rounded-lg"
                            >
                              Cancelar
                            </button>
                            <button
                              disabled={!novaVenda.cliente || !novaVenda.servico || !novaVenda.valor}
                              onClick={() => {
                                const l = {
                                  id: `V${vendasList.length + 1}`,
                                  data: "Hoje",
                                  servico: novaVenda.servico.toUpperCase(),
                                  valor: parseFloat(novaVenda.valor) || 0,
                                  status: "Em Aberto",
                                  parcelas: novaVenda.parcelas,
                                  operadora: novaVenda.operadora
                                };
                                setVendasList([l, ...vendasList]);
                                setAddVendaModal(false);
                                setNovaVenda({ cliente: "", servico: "", valor: "", parcelas: "1/12", operadora: "AMIL" });
                              }}
                              className="text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg disabled:opacity-50"
                            >
                              Salvar Lançamento
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* SLIDE 4 SIMULATION: GESTÃO DE CLIENTES */}
                {currentStep === 4 && (
                  <div className="p-5 space-y-4">
                    {/* Header Controls */}
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setAddClienteModal(true)}
                          className="bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] px-3 py-1.5 rounded-lg shadow-md"
                        >
                          + Adicionar
                        </button>
                        <button
                          onClick={() => alert("Simulação: Importar via planilha de clientes (.XLSX)")}
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] px-3 py-1.5 rounded-lg"
                        >
                          Importar
                        </button>
                      </div>

                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Filtrar por nome/CNPJ"
                          value={clientesSearch}
                          onChange={(e) => setClientesSearch(e.target.value)}
                          className="bg-slate-100 dark:bg-slate-800 pl-6 pr-2 py-1 rounded-lg text-[10px] text-slate-750 dark:text-white outline-none w-36"
                        />
                        <Search size={10} className="absolute left-2 top-2 text-slate-400" />
                      </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 dark:bg-slate-800 px-3 py-2 text-[9px] font-black text-slate-500 uppercase tracking-wider flex justify-between">
                        <span className="w-2/5">Nome do Cliente</span>
                        <span className="w-1/5 text-center">Tipo</span>
                        <span className="w-1/5 text-center">Operadora</span>
                        <span className="w-1/5 text-right">Situação</span>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-slate-800 text-[10px]">
                        {clientesList
                          .filter(c => c.nome.toLowerCase().includes(clientesSearch.toLowerCase()))
                          .map((row, idx) => (
                            <div key={idx} className="p-3 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <div className="w-2/5 truncate">
                                <span className="font-extrabold text-slate-900 dark:text-white block truncate">{row.nome}</span>
                                <span className="text-[8px] text-slate-400 font-mono">{row.documento}</span>
                              </div>
                              <span className="w-1/5 text-center font-bold text-slate-500">{row.tipo}</span>
                              <span className="w-1/5 text-center">
                                <span className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">
                                  {row.opSeg}
                                </span>
                              </span>
                              <span className="w-1/5 text-right">
                                <span className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full text-[9px] font-bold">
                                  ✓ Ativa
                                </span>
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Interactive add client modal */}
                    {addClienteModal && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border max-w-sm w-full space-y-3 shadow-2xl">
                          <h5 className="font-black text-xs uppercase text-slate-800 dark:text-white">Novo Cliente</h5>
                          
                          <div className="space-y-2 text-xs">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400">Nome</label>
                              <input
                                type="text"
                                value={novoCliente.nome}
                                onChange={e => setNovoCliente({ ...novoCliente, nome: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-850 p-2 rounded-lg border text-xs"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400">Tipo</label>
                                <select
                                  value={novoCliente.tipo}
                                  onChange={e => setNovoCliente({ ...novoCliente, tipo: e.target.value })}
                                  className="w-full bg-slate-50 dark:bg-slate-850 p-2 rounded-lg border text-xs"
                                >
                                  <option value="PF">PF</option>
                                  <option value="PJ">PJ</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400">Op. | Seg.</label>
                                <select
                                  value={novoCliente.opSeg}
                                  onChange={e => setNovoCliente({ ...novoCliente, opSeg: e.target.value })}
                                  className="w-full bg-slate-50 dark:bg-slate-850 p-2 rounded-lg border text-xs"
                                >
                                  <option value="AMIL">AMIL</option>
                                  <option value="BRADESCO">BRADESCO</option>
                                  <option value="SULAMÉRICA">SULAMÉRICA</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 justify-end pt-2">
                            <button
                              onClick={() => setAddClienteModal(false)}
                              className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-500 px-3 py-1.5 rounded-lg"
                            >
                              Cancelar
                            </button>
                            <button
                              disabled={!novoCliente.nome}
                              onClick={() => {
                                const c = {
                                  nome: novoCliente.nome.toUpperCase(),
                                  tipo: novoCliente.tipo,
                                  documento: novoCliente.tipo === "PF" ? "382.***.***-09" : "29.932.** /0001-90",
                                  opSeg: novoCliente.opSeg,
                                  servico: "Plano Especial",
                                  situacao: "Ativo"
                                };
                                setClientesList([c, ...clientesList]);
                                setAddClienteModal(false);
                                setNovoCliente({ nome: "", tipo: "PF", documento: "", opSeg: "AMIL", servico: "" });
                              }}
                              className="text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg"
                            >
                              Salvar Cliente
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* SLIDE 5 SIMULATION: CONCILIAÇÃO DE EXTRATOS */}
                {currentStep === 5 && (
                  <div className="p-5 space-y-4">
                    {/* Selection Controls */}
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">Selecionar Extrato Recebido</label>
                        <select
                          value={extratoSelecionado}
                          onChange={(e) => {
                            setExtratoSelecionado(e.target.value);
                            setIsExtratoBuscado(false);
                          }}
                          className="w-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-white p-2.5 rounded-lg border-none outline-none cursor-pointer"
                        >
                          <option value="">-- Escolha um Extrato Salvo --</option>
                          <option value="AMIL">Extrato AMIL 05/2026 - Código 139491</option>
                          <option value="BRADESCO">Extrato Bradesco 05/2026 - Código 20042</option>
                        </select>
                      </div>

                      <button
                        onClick={() => {
                          if (extratoSelecionado) setIsExtratoBuscado(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1 shrink-0"
                      >
                        Buscar OCR
                      </button>

                      <button
                        onClick={() => {
                          setExtratoSelecionado("");
                          setIsExtratoBuscado(false);
                        }}
                        className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 text-xs font-bold px-3 py-2.5 rounded-lg shrink-0"
                      >
                        Novo
                      </button>
                    </div>

                    {/* Extracted table rows or fallback alert */}
                    {!isExtratoBuscado ? (
                      <div className="h-44 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center p-4 text-center bg-slate-50/50 dark:bg-slate-950/20">
                        <Upload size={24} className="text-slate-300 dark:text-slate-700 mb-2" />
                        <p className="text-xs text-slate-400 font-bold">Nenhum dado extraído ainda.</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Selecione o extrato no campo acima e clique em "Buscar OCR" para processar a conciliação automatizada.</p>
                      </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-2"
                      >
                        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 p-2 rounded-lg text-xs flex justify-between items-center">
                          <span className="font-bold text-emerald-800 dark:text-emerald-300">✓ Extrato {extratoSelecionado} Processado!</span>
                          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-black px-2 py-0.5 rounded">
                            Automático
                          </span>
                        </div>

                        {/* Line list */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                          <div className="bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-[8px] font-black text-slate-500 uppercase tracking-wider flex justify-between">
                            <span className="w-1/3">Vendedor / Cliente</span>
                            <span className="w-1/4 text-center">Bruto (R$)</span>
                            <span className="w-1/4 text-center">Comissão (R$)</span>
                            <span className="w-1/6 text-right">Status</span>
                          </div>

                          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-[10px]">
                            {linhasComissao.map((row, idx) => (
                              <div key={idx} className="p-2.5 flex justify-between items-center">
                                <div className="w-1/3 truncate">
                                  <span className="text-[8px] block font-mono text-slate-400">PROP: {row.proposta}</span>
                                  <span className="font-extrabold text-slate-800 dark:text-white truncate block">{row.cliente}</span>
                                </div>
                                <span className="w-1/4 text-center font-mono text-slate-600 dark:text-slate-400">R$ {row.bruto.toFixed(2)}</span>
                                <span className="w-1/4 text-center font-mono font-bold text-blue-600 dark:text-blue-400">R$ {row.comissao.toFixed(2)}</span>
                                <span className="w-1/6 text-right">
                                  <span className="bg-emerald-50 text-emerald-600 text-[8px] font-bold px-1.5 py-0.5 rounded">
                                    {row.status}
                                  </span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Extra Adjustment line button */}
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-slate-400 font-bold">Total: {linhasComissao.length} registros auditáveis</span>
                          <button
                            onClick={() => {
                              const n = { vendedor: "RODRIGO", proposta: "Ajuste", cliente: "AJUSTE EXTRA COMPARTILHADO", bruto: 0, comissao: 150.00, status: "Ajustado" };
                              setLinhasComissao([...linhasComissao, n]);
                            }}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-500 bg-slate-50 dark:bg-slate-800 border px-2.5 py-1 rounded-lg"
                          >
                            + Linha de Ajuste
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* SLIDE 6 SIMULATION: HISTÓRICO DE RELATÓRIOS SALVOS */}
                {currentStep === 6 && (
                  <div className="p-5 space-y-4">
                    {/* Search Field */}
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Histórico de Fechamentos</span>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Buscar operadora..."
                          value={searchRelatorios}
                          onChange={(e) => setSearchRelatorios(e.target.value)}
                          className="bg-slate-100 dark:bg-slate-800 pl-6 pr-2 py-1 rounded-lg text-[10px] text-slate-700 dark:text-white outline-none w-36"
                        />
                        <Search size={10} className="absolute left-2 top-2 text-slate-400" />
                      </div>
                    </div>

                    {/* Report cards stack */}
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {relatoriosSalvos
                        .filter(r => r.operadora.toLowerCase().includes(searchRelatorios.toLowerCase()))
                        .map((rel, idx) => (
                          <div key={idx} className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-700 flex justify-between items-center">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-[11px] text-slate-850 dark:text-white">{rel.nome}</span>
                                <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-350 px-1.5 py-0.5 rounded text-[8px] font-bold">
                                  REF: {rel.ref}
                                </span>
                              </div>
                              <p className="text-[9px] text-slate-400">
                                Emitido por: <strong className="text-slate-600 dark:text-slate-300">{rel.responsavel}</strong> | Nota: <strong className="text-blue-600">{rel.nfe}</strong> | Vínculo: <strong className="uppercase text-slate-600">{rel.operadora}</strong>
                              </p>
                            </div>

                            <div className="flex flex-col items-end gap-1.5">
                              <span className="text-[9px] text-slate-400 font-bold">{rel.registros} apólices</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => alert(`Planilha do lote de comissões carregada com ${rel.registros} registros.`)}
                                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[9px] px-2.5 py-1 rounded transition-colors"
                                >
                                  Abrir
                                </button>
                                <button
                                  onClick={() => alert(`Carregando extrato original da operadora associado à Nota Fiscal ${rel.nfe}`)}
                                  className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[9px] px-2 py-1 rounded transition-colors"
                                >
                                  Abrir Extrato
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* SLIDE 7 SIMULATION: UPLOAD EXTRACT */}
                {currentStep === 7 && (
                  <div className="p-5 space-y-3.5">
                    <h4 className="font-black text-xs uppercase text-slate-500 text-center tracking-wider">Incluir Extrato de Operadora</h4>
                    
                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div>
                        <label className="block text-[8px] font-bold text-slate-400 mb-0.5">Ano Letivo</label>
                        <select value={uploadAno} onChange={e => setUploadAno(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 p-1.5 rounded font-bold border-none">
                          <option value="2026">2026</option>
                          <option value="2025">2025</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold text-slate-400 mb-0.5">Mês Referência</label>
                        <select value={uploadMes} onChange={e => setUploadMes(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 p-1.5 rounded font-bold border-none">
                          <option value="Janeiro">Janeiro</option>
                          <option value="Fevereiro">Fevereiro</option>
                          <option value="Março">Março</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold text-slate-400 mb-0.5">Categoria</label>
                        <select value={uploadCategoria} onChange={e => setUploadCategoria(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 p-1.5 rounded font-bold border-none">
                          <option value="Operadoras">Operadoras</option>
                          <option value="Corretores">Corretores</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div>
                        <label className="block text-[8px] font-bold text-slate-400 mb-0.5">Empresa</label>
                        <select value={uploadEmpresa} onChange={e => setUploadEmpresa(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 p-1.5 rounded font-bold border-none">
                          <option value="Protetta">Protetta</option>
                          <option value="Proper">Proper</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold text-slate-400 mb-0.5">Cód. Operadora</label>
                        <input type="text" value={uploadCodOp} onChange={e => setUploadCodOp(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 p-1 rounded font-mono border-none" />
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold text-slate-400 mb-0.5">Op. | Seg.</label>
                        <select value={uploadOpSeg} onChange={e => setUploadOpSeg(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 p-1.5 rounded font-bold border-none">
                          <option value="AMIL">AMIL</option>
                          <option value="BRADESCO">BRADESCO</option>
                          <option value="SULAMERICA">SULAMERICA</option>
                        </select>
                      </div>
                    </div>

                    {/* Drag-and-drop simulated dropzone */}
                    <div
                      onClick={() => setUploadedFile({ name: "Extrato_Comissao_AMIL_139491_Jan2026.pdf", size: "182 KB" })}
                      className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-xl p-5 text-center cursor-pointer bg-slate-50 dark:bg-slate-950/40 transition-colors"
                    >
                      {uploadedFile ? (
                        <div className="space-y-1">
                          <Check size={20} className="text-emerald-500 mx-auto" />
                          <span className="block text-xs font-extrabold text-slate-800 dark:text-white truncate max-w-xs mx-auto">
                            {uploadedFile.name}
                          </span>
                          <span className="block text-[9px] text-slate-400 font-mono">{uploadedFile.size} - Carregado</span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Upload size={20} className="text-slate-400 mx-auto animate-pulse" />
                          <span className="block text-xs font-bold text-slate-600 dark:text-slate-350">Clique ou arraste o extrato aqui</span>
                          <span className="block text-[8px] text-slate-400">Suporta PDF, Excel, TXT de comissões</span>
                        </div>
                      )}
                    </div>

                    {/* Conditional extra metadata fields enabled upon upload */}
                    {uploadedFile && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <label className="block text-[8px] font-bold text-slate-400 mb-0.5">Nota Fiscal Vinculada (NFS-e)</label>
                          <input type="text" value={nfVinculada} onChange={e => setNfVinculada(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 p-1.5 rounded border-none font-bold" />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold text-slate-400 mb-0.5">Nome Amigável do Lote</label>
                          <input type="text" value={nicknameFile} onChange={e => setNicknameFile(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 p-1.5 rounded border-none font-bold" />
                        </div>
                      </motion.div>
                    )}

                    <button
                      onClick={() => setUploadSaved(true)}
                      disabled={!uploadedFile}
                      className={`w-full py-2.5 rounded-xl text-xs font-black text-white transition-all ${uploadSaved ? "bg-emerald-600 shadow-md shadow-emerald-500/10" : "bg-blue-600 hover:bg-blue-500 disabled:opacity-40"}`}
                    >
                      {uploadSaved ? "✓ Extrato Arquivado com Sucesso!" : "Arquivar Extrato"}
                    </button>
                  </div>
                )}

                {/* SLIDE 8 SIMULATION: CONSULTAR EXTRATOS (GESTOR) */}
                {currentStep === 8 && (
                  <div className="p-5 space-y-4">
                    {/* Breadcrumbs */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-200/50 dark:border-slate-800 flex items-center gap-1.5 font-mono text-[9px] text-slate-500 overflow-x-auto truncate">
                      <span className="hover:underline cursor-pointer">Raiz</span> &gt; 
                      <span className="hover:underline cursor-pointer">2026</span> &gt; 
                      <span className="hover:underline cursor-pointer">Janeiro</span> &gt; 
                      <span className="hover:underline cursor-pointer">Operadoras</span> &gt; 
                      <span className="hover:underline cursor-pointer text-blue-600 font-bold">Protetta</span> &gt;
                      <span className="hover:underline cursor-pointer">AMIL</span> &gt; 
                      <span className="font-bold text-slate-800 dark:text-slate-200">139491</span>
                    </div>

                    {/* Filter and layout controls */}
                    <div className="flex justify-between items-center text-[10px] pb-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-slate-400">Mostrando 2 arquivos</span>
                      
                      {/* Checkboxes batch action bar conditionally displayed */}
                      {(checkedFiles.file1 || checkedFiles.file2) && (
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex gap-1.5 items-center bg-blue-50 dark:bg-blue-950 px-2 py-1 rounded">
                          <span className="text-[8px] font-black text-blue-600 uppercase">Ações Lote:</span>
                          <button onClick={() => alert("Excluindo arquivos selecionados...")} className="bg-rose-600 text-white font-bold text-[8px] px-1.5 py-0.5 rounded">Excluir</button>
                          <button onClick={() => alert("Baixando arquivos em ZIP...")} className="bg-slate-800 text-white font-bold text-[8px] px-1.5 py-0.5 rounded">Download ZIP</button>
                        </motion.div>
                      )}
                    </div>

                    {/* Files Cards List */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: "file1", name: "Extrato_Comissoes_AMIL_Jan26.pdf", nf: "NF 14", size: "182 KB", tag: "AMIL" },
                        { key: "file2", name: "Extrato_Comissoes_Bradesco_Jan26.pdf", nf: "NF 15", size: "290 KB", tag: "BRADESCO" }
                      ].map((file, idx) => (
                        <div
                          key={idx}
                          className={`bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border transition-all flex flex-col justify-between h-28 cursor-pointer relative ${checkedFiles[file.key] ? "border-blue-600 ring-1 ring-blue-600" : "border-slate-200/50 hover:bg-slate-100/50"}`}
                          onClick={() => setCheckedFiles({ ...checkedFiles, [file.key]: !checkedFiles[file.key] })}
                        >
                          <input
                            type="checkbox"
                            checked={checkedFiles[file.key]}
                            onChange={() => {}} // handled by div click
                            className="absolute top-2.5 right-2.5 rounded text-blue-600 w-3 h-3 cursor-pointer z-10"
                          />

                          <div className="space-y-1">
                            <span className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded text-[7px] font-black uppercase inline-block">
                              {file.tag}
                            </span>
                            <span className="block text-[10px] font-bold text-slate-850 dark:text-white truncate pr-4">
                              {file.name}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-slate-200/40 dark:border-slate-700 flex justify-between items-center text-[9px] text-slate-400 font-mono">
                            <span>NF: <strong className="text-slate-600 dark:text-slate-350">{file.nf}</strong></span>
                            <span>{file.size}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SLIDE 9 SIMULATION: GESTÃO MULTI-EMPRESAS */}
                {currentStep === 9 && (
                  <div className="p-5 space-y-4">
                    {/* Display showing active company */}
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-250/50 dark:border-slate-700 flex justify-between items-center text-xs">
                      <div className="space-y-0.5">
                        <span className="text-[8px] uppercase tracking-wider font-black text-slate-400 block">Contexto Corporativo Ativo</span>
                        <span className="font-extrabold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          🏢 {empresaAtiva === "Protetta" ? "PROTETTA CORRETORA" : "PROPER SOLUÇÕES"}
                        </span>
                      </div>
                      <span className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase animate-pulse">
                        Conectado
                      </span>
                    </div>

                    {/* Table of corporate entities */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 dark:bg-slate-800 px-3 py-2 text-[9px] font-black text-slate-500 uppercase tracking-wider flex justify-between">
                        <span className="w-1/2">Razão Social / CNPJ</span>
                        <span className="w-1/6 text-center">Status</span>
                        <span className="w-1/3 text-right">Ação</span>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-slate-800 text-[10px]">
                        {empresasLista.map((row, idx) => (
                          <div key={idx} className="p-3 flex justify-between items-center">
                            <div className="w-1/2 truncate">
                              <span className="font-extrabold text-slate-800 dark:text-white truncate block">{row.nome}</span>
                              <span className="text-[8px] text-slate-400 font-mono">{row.cnpj}</span>
                            </div>
                            
                            <span className="w-1/6 text-center">
                              <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black px-1 rounded uppercase">
                                {row.situacao}
                              </span>
                            </span>

                            <div className="w-1/3 text-right">
                              {empresaAtiva === (row.id === "E1" ? "Protetta" : "Proper") ? (
                                <span className="text-[9px] font-extrabold text-slate-400 pr-1.5 block">Principal ✓</span>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEmpresaAtiva(row.id === "E1" ? "Protetta" : "Proper");
                                    setEmpresasLista(empresasLista.map(e => ({ ...e, principal: e.id === row.id })));
                                  }}
                                  className="bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-bold px-2 py-1 rounded"
                                >
                                  Tornar Principal
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => alert("Simulação: Abrir formulário para adicionar novo CNPJ de filial")}
                        className="bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1 shadow"
                      >
                        <Plus size={10} /> + Nova Empresa
                      </button>
                      <span className="text-[8px] text-slate-400 font-bold font-mono">Modo de Operação Isolado habilitado</span>
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>

        </div>

      </div>
    </div>
  );
}
