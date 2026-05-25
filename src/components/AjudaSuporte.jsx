import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Send, Bot, MessageSquare, Plus, ChevronDown, ChevronRight, Search, FileText } from 'lucide-react';

const FAQ = [
    {
        q: "Como faço para redefinir minha senha?",
        a: "Para redefinir sua senha, procure um usuário administrador logado no sistema. Apenas administradores podem alterar senhas na aba de 'Controle de Acessos'."
    },
    {
        q: "Como processo um novo extrato de comissão?",
        a: "Vá ao menu 'Relatório Comissão', selecione a operadora/seguradora e carregue o arquivo PDF/Excel/CSV do extrato. Revise as informações geradas, clique em 'Processar Comissões' e repasse a comissão. Lembre-se que você pode consultar as planilhas processadas em 'Relatórios Salvos'."
    },
    {
        q: "Onde vejo o total de vendas do mês?",
        a: "O total de vendas pode ser consultado de forma visual no 'Dashboard'. Selecione o ano no topo da tela para ver seu desempenho mês a mês. O dashboard agrupa sua evolução por operadora, quadrimestral, semestral entre outros."
    },
    {
        q: "O sistema faz backup automático?",
        a: "A base de dados é regularmente salva, porém para sua segurança sempre orientamos que realize os backups locais. Vá até Configurações > Backups/Restore e crie seu Backup completo exportando um .ZIP pro seu PC."
    },
    {
        q: "Como adiciono um novo usuário ao sistema?",
        a: "Apenas Administradores podem acessar a aba lateral 'Controle de Acessos'. Basta acessar a mesma, clicar para Adicionar Novo Usuário e selecionar a aba desejada limitando o uso dentro do seu software."
    }
];

const BOT_KNOWLEDGE = [
    { k: ["o que é", "para que serve", "como funciona"], v: "O Don Gestão é um sistema completo para centralizar seus clientes, vendas, extratos de comissão, relatórios, painéis de indicadores (dashboard), NFS-e, empresas, usuários, permissões e backups, tudo de forma local ou online." },
    { k: ["primeiros passos", "começ", "inici"], v: "Para começar, faça login, acesse o menu lateral e consulte o 'Painel' ou o 'Dashboard'. Em seguida, experimente cadastrar um cliente ou registrar uma Venda de Serviço. Fique à vontade para explorar os menus!" },
    { k: ["painel", "inicio", "resumo"], v: "A aba 'Painel' apresenta atalhos rápidos e resumos essenciais da sua operação para agilizar sua rotina diária." },
    { k: ["dashboard", "grafico", "análises", "estatística", "resultado"], v: "O 'Dashboard' reúne gráficos e indicadores detalhados. Lá você pode conferir a evolução das vendas, análises trismestrais/semestrais, mix por operadoras e muito mais." },
    { k: ["venda", "cálculo de vigência", "inserir venda"], v: "No menu 'Vendas de Serviços', você adiciona, duplica ou gerencia suas vendas. Você também pode fechar lotes de relatórios, e o sistema checará se faltam parcelas automaticamente." },
    { k: ["cliente", "cadastrar", "pessoa"], v: "No módulo de 'Clientes', faça a gestão completa das pessoas físicas e jurídicas. Você saberá qual operadora atende cada um e seu status ativo/inativo." },
    { k: ["relatório comiss", "extrato da amil", "pdf do extrato", "receita", "importar comiss", "subir pdf"], v: "Com o poderoso menu 'Relatório Comissão', você pode enviar extratos em PDF (Bradesco, Amil, SulAmérica...) ou Excel. O sistema processará as comissões e faturará de acordo com o desconto estabelecido." },
    { k: ["arquivos", "salvos", "historico", "relatórios antigos"], v: "Sempre que processa um extrato, ele fica guardado nos 'Relatórios Salvos'. Assim, você pode emitir segundas vias e buscar históricos a qualquer momento." },
    { k: ["nfs", "nota", "fiscal", "emissor", "prefeitura"], v: "Na aba 'Emissor NFS-e', mantenha suas notas organizadas para o novo Padrão Nacional, ou apenas importe PDFs das suas notas para ter na nuvem quando precisar." },
    { k: ["subir extrato", "pdf", "anexar extrato", "gestor", "guardar extrato"], v: "No 'Gestor de Extratos', você armazena qualquer arquivo com segurança vinculando-o a um mês, ano e seguradora, garantindo que nada se perca." },
    { k: ["empresas", "logo", "filial"], v: "Adicione empresas, CNPJs e logomarcas na aba 'Empresas'. Essa logo pode ser usada na impressão de seus relatórios." },
    { k: ["usuário", "admin", "acesso", "criar conta"], v: "O 'Controle de Acessos' é exclusivo para Administradores. Lá, permite-se criar novos usuários, alterar senhas e restringir em quais abas cada funcionário pode entrar." },
    { k: ["config", "base", "backup", "restaurar", "salvar dados"], v: "Em 'Configurações', você consegue editar listas importantes e baixar Backup Geral (.zip) de todos os seus dados. Para segurança, mantenha cópias frequentes." },
    { k: ["esqueci", "senha", "esqueci minha senha", "mudar senha"], v: "Se esqueceu a senha, peça a um Administrador da plataforma para entrar no menu 'Controle de Acessos' e redefini-la para você." },
    { k: ["falar com atendente", "humano", "suporte", "contato", "telefone", "whatsapp", "email", "e-mail", "ajuda", "problema"], v: (
        <span>
            Precisa de ajuda especializada? Mande um e-mail para <a href="mailto:donfim@gmail.com" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">donfim@gmail.com</a> ou nos chame no WhatsApp: <a href="https://wa.me/5521973987378" target="_blank" rel="noreferrer" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">+55 21 973987378</a>.
        </span>
    )}
];

const AjudaSuporte = () => {
    const [msgs, setMsgs] = useState([{ user: false, text: "Olá! Sou o assistente de ajuda do Don Gestão. Pode perguntar algo básico como 'como emitir nota fiscal?' ou 'como trocar a senha?'" }]);
    const [input, setInput] = useState("");
    const [openFaq, setOpenFaq] = useState(null);
    const chatEndRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [msgs]);

    const handleSend = () => {
        const text = input.trim();
        if (!text) return;

        setMsgs(prev => [...prev, { user: true, text }]);
        setInput("");

        setTimeout(() => {
            let resposta = (
                <span>
                    Não encontrei uma resposta exata para sua dúvida. Por favor, entre em contato direto com nosso atendimento humanizado através do e-mail <a href="mailto:donfim@gmail.com" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">donfim@gmail.com</a> ou pelo WhatsApp <a href="https://wa.me/5521973987378" target="_blank" rel="noreferrer" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">+55 21 973987378</a> para que possamos te ajudar da melhor forma.
                </span>
            );
            
            // Basic NLP Normalization
            const tLower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            
            for (let kn of BOT_KNOWLEDGE) {
                if (kn.k.some(kw => tLower.includes(kw))) {
                    resposta = kn.v;
                    break;
                }
            }
            setMsgs(prev => [...prev, { user: false, text: resposta }]);
        }, 600);
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 animate-in fade-in duration-500 pb-20">
            <header className="mb-8 border-b border-slate-200 dark:border-slate-700 pb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
                    <HelpCircle className="mr-3 text-indigo-500"/> Ajuda e Suporte
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Encontre respostas, consulte o manual ou fale com nosso bot para tirar suas dúvidas de forma rápida sobre menus e fluxos de gestão de comissionamento do software.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* FAQ e Guia Rápido */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                            <Search className="mr-2 text-indigo-500" size={20} /> Perguntas Frequentes (FAQ)
                        </h3>
                        <div className="space-y-3">
                            {FAQ.map((f, idx) => (
                                <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                    <button 
                                        className="w-full text-left px-4 py-3 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-slate-800 dark:text-slate-200 flex justify-between items-center transition-colors text-sm"
                                        onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                                    >
                                        <span>{f.q}</span>
                                        {openFaq === idx ? <ChevronDown size={18} className="text-slate-500"/> : <ChevronRight size={18} className="text-slate-500"/>}
                                    </button>
                                    {openFaq === idx && (
                                        <div className="px-4 py-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm border-t border-slate-200 dark:border-slate-700 leading-relaxed">
                                            {f.a}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-xl shadow-md p-6 text-white text-center">
                        <FileText size={48} className="mx-auto mb-4 opacity-80" />
                        <h3 className="text-lg font-bold mb-2">Orientações e Boas Práticas Comissionadas</h3>
                        <p className="text-indigo-100 text-sm mb-4">Lembre-se sempre de importar suas faturas nas operadoras sem formatar muito, preferencialmente suba PDFs limpos de senhas.</p>
                        <p className="text-xs text-indigo-200 bg-indigo-900/40 p-3 rounded-lg border border-indigo-400/20">Fluxo Recomendado: 1. Cadastre clientes (Importe por Excel). 2. Suba o extrato no 'Relatório de Comissoes'. 3. Confira o 'Dashboard'.</p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center text-center">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Precisa de Atendimento Humanizado?</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Nossa equipe de suporte está pronta para te atender e tirar qualquer outra dúvida que você tenha sobre o sistema.</p>
                        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                            <a href="mailto:donfim@gmail.com" className="flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-800/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 font-bold py-2.5 px-6 rounded-lg transition-colors text-sm">
                                E-mail de Suporte
                            </a>
                            <a href="https://wa.me/5521973987378" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-800/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold py-2.5 px-6 rounded-lg transition-colors text-sm">
                                Falar no WhatsApp
                            </a>
                        </div>
                    </div>
                </div>

                {/* Chat Bot */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col h-[600px] lg:h-[calc(100vh-140px)] lg:max-h-[800px] lg:sticky lg:top-6 overflow-hidden">
                    <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 p-2 rounded-lg">
                                <Bot size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white leading-tight">Assistente Virtual</h3>
                                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center mt-0.5 uppercase tracking-wide">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></span> Online
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50 dark:bg-slate-900/20 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                        {msgs.map((m, i) => (
                            <div key={i} className={`flex ${m.user ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                                    m.user 
                                    ? 'bg-indigo-600 text-white rounded-br-none' 
                                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-bl-none leading-relaxed'
                                }`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                        <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="relative flex items-center">
                            <input 
                                type="text"
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-full pl-5 pr-14 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                                placeholder="Tire a sua dúvida aqui..."
                                value={input}
                                onChange={e => setInput(e.target.value)}
                            />
                            <button 
                                type="submit"
                                disabled={!input.trim()}
                                className="absolute right-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 disabled:dark:bg-slate-700 disabled:text-slate-500 text-white p-2 rounded-full transition-colors flex items-center justify-center h-9 w-9"
                            >
                                <Send size={16} className={input.trim() ? "ml-0.5" : ""} />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AjudaSuporte;
