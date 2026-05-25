import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../config/supabase.js';
import { generateSHA256Hash } from '../utils/helpers.js';
import { Check, LogOut, Shield } from 'lucide-react';

const AceiteTermosLGPD = ({ user, onAccepted, onDeclined }) => {
    const [terms, setTerms] = useState(null);
    const [loading, setLoading] = useState(true);
    const [accepted, setAccepted] = useState(false);
    const [saving, setSaving] = useState(false);
    const [scrolledToBottom, setScrolledToBottom] = useState(false);
    const contentRef = useRef(null);

    useEffect(() => {
        const fetchTerms = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('lgpd_terms_versions')
                    .select('*')
                    .eq('status', 'active')
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (error) {
                    console.error("Erro ao carregar termos:", error);
                } else if (data && data.length > 0) {
                    setTerms(data[0]);
                } else {
                    // Sem termos ativos? Auto-criar e recarregar
                    const initialContent = `TERMO DE USO, PRIVACIDADE E CONSENTIMENTO PARA TRATAMENTO DE DADOS PESSOAIS

Ao acessar o sistema DonGestão, o usuário declara ciência e concordância com o tratamento dos dados pessoais necessários para utilização da plataforma, nos termos da Lei Geral de Proteção de Dados Pessoais - LGPD, Lei nº 13.709/2018.

1. Finalidade do tratamento dos dados
Os dados serão utilizados para:
- identificação e autenticação de usuários;
- cadastro e gestão de clientes;
- registro de vendas, serviços, comissões, relatórios e documentos;
- emissão, consulta e organização de informações administrativas;
- controle de permissões de acesso;
- segurança, auditoria e prevenção de fraudes;
- cumprimento de obrigações legais, regulatórias, contratuais e fiscais.

2. Dados que poderão ser tratados
O sistema poderá tratar:
- nome, razão social e identificação do cliente;
- CPF, CNPJ ou documento equivalente, quando aplicável;
- telefone, celular, e-mail e endereço;
- dados comerciais, financeiros e operacionais inseridos no sistema;
- registros de acesso, data, hora, usuário, endereço IP e navegador;
- documentos, extratos, relatórios, notas fiscais e informações relacionadas à prestação dos serviços.

3. Base legal
O tratamento poderá ocorrer com base em:
- execução de contrato ou procedimentos preliminares relacionado ao serviço;
- cumprimento de obrigação legal ou regulatória;
- exercício regular de direitos;
- legítimo interesse, quando aplicável;
- consentimento do titular, quando necessário.

4. Compartilhamento de dados
Os dados poderão ser compartilhados somente quando necessário para execução dos serviços, cumprimento de obrigação legal, integração com ferramentas autorizadas, armazenamento seguro, auditoria ou suporte técnico autorizado.

5. Segurança da informação
O sistema deverá adotar medidas técnicas e administrativas razoáveis para proteger os dados contra acessos não autorizados, perda, alteração, divulgação indevida ou uso inadequado.

6. Direitos do titular
O titular poderá solicitar, quando aplicável:
- confirmação da existência de tratamento;
- acesso aos dados;
- correção de dados incompletos, inexatos ou desatualizados;
- anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade;
- informação sobre compartilhamento;
- revogação do consentimento, quando o tratamento depender de consentimento;
- demais direitos previstos na LGPD.

7. Responsabilidade do usuário
O usuário se compromete a:
- utilizar o sistema somente para finalidades profissionais e autorizadas;
- não compartilhar senha;
- manter sigilo sobre dados de clientes, vendas, comissões e documentos;
- não exportar, copiar ou divulgar dados sem autorização;
- comunicar imediatamente qualquer suspeita de acesso indevido.

8. Registro do aceite
Ao clicar em "Li e aceito", o sistema registrará data, hora, usuário, empresa, IP, navegador, versão do termo e cópia integral do texto aceito, para fins de auditoria e comprovação.

9. Alteração dos termos
Caso uma nova versão dos termos seja publicada, o sistema poderá solicitar novo aceite antes de permitir o acesso às funcionalidades internas.

Declaro que li, compreendi e aceito os Termos de Uso, a Política de Privacidade e as condições de tratamento de dados pessoais conforme a LGPD.`;
                    
                    const hash = await generateSHA256Hash(initialContent);
                    const { data: newTerms, error: createError } = await supabase
                        .from('lgpd_terms_versions')
                        .insert([{
                            version: '1.0',
                            title: 'Termos de Uso, Política de Privacidade e Consentimento LGPD - DonGestão',
                            content: initialContent,
                            content_hash: hash,
                            status: 'active'
                        }])
                        .select()
                        .single();
                        
                    if(newTerms) setTerms(newTerms);
                }
            } catch (err) {
                console.error("Exceção listando termos:", err);
            }
            setLoading(false);
        };
        fetchTerms();
    }, []);

    const handleScroll = () => {
        if (!contentRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 50) {
            setScrolledToBottom(true);
        }
    };

    const handleAccept = async () => {
        if (!accepted || !terms) return;
        setSaving(true);
        try {
            const acceptedAt = new Date().toISOString();
            const userAgent = window.navigator.userAgent;
            const acceptanceRawStr = `user:${user.id}|term:${terms.id}|date:${acceptedAt}`;
            const acceptanceHash = await generateSHA256Hash(acceptanceRawStr);

            // Gravar em lgpd_acceptances
            const insertData = {
                user_id: user.id || null, // Depende do sistema se user.id é numérico
                username: user.username || 'Desconhecido',
                empresa: user.empresa || 'Todas',
                term_version_id: terms.id,
                term_version: terms.version,
                user_agent: userAgent,
                acceptance_hash: acceptanceHash,
                accepted_text_snapshot: terms.content,
                accepted_at: acceptedAt
            };

            const { data: inserted, error } = await supabase.from('lgpd_acceptances').insert([insertData]).select().single();
            if (error) throw error;

            // Atualizar user
            if (user && user.id) {
                await supabase.from('users').update({
                    must_accept_terms: false,
                    accepted_latest_terms: true,
                    terms_accepted_at: new Date(),
                    last_terms_acceptance_id: inserted.id
                }).eq('id', user.id);
            }

            onAccepted(inserted);
        } catch (err) {
            console.error("Erro ao salvar aceite:", err);
            alert("Erro ao validar o aceite. Verifique a conexão com o banco.");
        }
        setSaving(false);
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
        </div>
    );

    if (!terms) return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
            <Shield className="w-16 h-16 text-slate-400 mb-4" />
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Termos LGPD Indisponíveis</h2>
            <p className="text-slate-500 mt-2">Peça a um Administrador para criar a primeira versão dos Termos.</p>
            <button onClick={onDeclined} className="mt-6 px-4 py-2 bg-slate-800 text-white rounded-lg flex items-center gap-2 hover:bg-slate-700">
                <LogOut size={18} /> Voltar ao Login
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 py-10 px-4 flex flex-col items-center animate-in fade-in duration-500">
            <div className="w-full max-w-4xl bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col">
                <div className="bg-indigo-600 dark:bg-indigo-800 px-6 py-6 text-white text-center">
                    <Shield className="w-10 h-10 mx-auto mb-3 text-indigo-200" />
                    <h1 className="text-2xl font-bold">{terms.title}</h1>
                    <p className="mt-1 text-indigo-100 text-sm">Para continuar, leia e aceite os termos de uso e tratamento de dados.</p>
                </div>

                <div 
                    ref={contentRef}
                    onScroll={handleScroll}
                    className="p-6 h-[50vh] overflow-y-auto bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 leading-relaxed scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600"
                >
                    {terms.content}
                </div>

                <div className="p-6 bg-white dark:bg-slate-800">
                    <div className="flex items-center justify-between mb-6">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-md">
                            Versão: {terms.version}
                        </span>
                        {!scrolledToBottom && (
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium animate-pulse">
                                Role até o final para aceitar
                            </span>
                        )}
                    </div>

                    <label className={`flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors ${accepted ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800/50' : 'hover:bg-slate-50 dark:hover:bg-slate-750'}`}>
                        <div className="relative flex items-center mt-0.5">
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 opacity-0 absolute"
                                checked={accepted}
                                onChange={(e) => setAccepted(e.target.checked)}
                                disabled={!scrolledToBottom && !accepted}
                            />
                            <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${accepted ? 'bg-indigo-600 border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500 text-white' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}>
                                {accepted && <Check size={16} strokeWidth={3} />}
                            </div>
                        </div>
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-tight">
                            Li e aceito os Termos de Uso e a Política de Privacidade/LGPD.
                        </span>
                    </label>

                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-end gap-4">
                        <button 
                            onClick={onDeclined}
                            className="w-full sm:w-auto px-6 py-2.5 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <LogOut size={18} /> Recusar e Sair
                        </button>
                        
                        <button 
                            onClick={handleAccept}
                            disabled={!accepted || saving}
                            className="w-full sm:w-auto px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 disabled:dark:bg-slate-700 text-white font-bold rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
                        >
                            {saving ? (
                                <><span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span> Salvando...</>
                            ) : (
                                <><Check size={18} /> Aceitar e continuar</>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <p className="mt-6 text-xs text-slate-500 dark:text-slate-500 max-w-3xl text-center leading-relaxed px-4">
                Ao clicar em "Aceitar e continuar", seu aceite será registrado eletronicamente com data, hora, usuário, versão do termo, IP, navegador e cópia integral do texto aceito, para fins de segurança, auditoria e comprovação, nos termos da Lei nº 13.709/2018.
            </p>
        </div>
    );
};

export default AceiteTermosLGPD;
