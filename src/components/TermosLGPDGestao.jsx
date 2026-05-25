import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase.js';
import { generateSHA256Hash, formatarDataVisivel } from '../utils/helpers.js';
import { Shield, FileText, Download, Users, CheckCircle, Search, Edit3, Plus, X, Eye } from 'lucide-react';
import * as html2pdf from 'html2pdf.js';

const TermosLGPDGestao = ({ currentUser }) => {
    const [view, setView] = useState('list'); // 'list', 'new_version', 'view_acceptance'
    const [acceptances, setAcceptances] = useState([]);
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAcceptance, setSelectedAcceptance] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    // New Version Form
    const [newVersionTitle, setNewVersionTitle] = useState('');
    const [newVersionCode, setNewVersionCode] = useState('');
    const [newVersionContent, setNewVersionContent] = useState('');
    const [savingVersion, setSavingVersion] = useState(false);

    useEffect(() => {
        if (view === 'list') {
            loadData();
        }
    }, [view]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load Acceptances
            const { data: accs, error: accsErr } = await supabase
                .from('lgpd_acceptances')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (accsErr) console.error(accsErr);
            else setAcceptances(accs || []);

            // Load Versions
            const { data: vers, error: versErr } = await supabase
                .from('lgpd_terms_versions')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (versErr) console.error(versErr);
            else {
                setVersions(vers || []);
                const nextV = (vers && vers.length > 0) ? (parseFloat(vers[0].version) + 0.1).toFixed(1) : '1.0';
                setNewVersionCode(nextV);
                setNewVersionTitle(vers && vers.length > 0 ? vers[0].title : 'Termos de Uso, Política de Privacidade e Consentimento LGPD - DonGestão');
            }
        } catch (error) {
            console.error("Erro geral lgpd:", error);
        }
        setLoading(false);
    };

    const handleCreateVersion = async () => {
        if (!newVersionTitle || !newVersionCode || !newVersionContent) return;
        setSavingVersion(true);
        try {
            const hash = await generateSHA256Hash(newVersionContent);
            
            // 1. Update previous to inactive
            await supabase.from('lgpd_terms_versions').update({ status: 'inactive' }).eq('status', 'active');
            
            // 2. Insert new
            const { data, error } = await supabase.from('lgpd_terms_versions').insert([{
                title: newVersionTitle,
                version: newVersionCode,
                content: newVersionContent,
                content_hash: hash,
                status: 'active',
                created_by: currentUser.username
            }]);

            if (error) throw error;
            
            // 3. Mark all users to accept again
            await supabase.from('users').update({
                must_accept_terms: true,
                accepted_latest_terms: false
            }).neq('id', 0); // Updates all

            alert("Nova versão publicada com sucesso! Todos os usuários deverão aceitá-la no próximo login.");
            setView('list');
        } catch (error) {
            console.error("Erro ao criar versão:", error);
            alert("Erro ao salvar a nova versão: " + (error.message || JSON.stringify(error)));
        }
        setSavingVersion(false);
    };

    const exportToExcel = () => {
        const lines = ["Usuário,Empresa/Cliente,Versão,Data,IP,Navegador,Hash"];
        acceptances.forEach(a => {
            const row = [
                a.username,
                a.empresa || a.cliente_nome || '-',
                a.term_version,
                a.accepted_at,
                a.ip_address || '-',
                (a.user_agent || '-').replace(/,/g, ' '), // sanitize for csv
                a.acceptance_hash
            ].map(v => '"' + v + '"').join(",");
            lines.push(row);
        });
        const csvContent = "data:text/csv;charset=utf-8," + lines.join("\\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", 'aceites_lgpd_' + new Date().toISOString().split('T')[0] + '.csv');
        document.body.appendChild(link);
        link.click();
    };

    const downloadPDF = () => {
        const element = document.getElementById('comprovante-lgpd-pdf');
        
        const opt = {
            margin: 10,
            filename: 'comprovante_lgpd_' + selectedAcceptance.username + '.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        const btn = document.getElementById('btn-download-pdf-lgpd');
        if(btn) btn.style.display = 'none';
        
        html2pdf().from(element).set(opt).save().then(() => {
            if(btn) btn.style.display = 'flex';
        });
    };

    const filtered = acceptances.filter(a => {
        const s = searchQuery.toLowerCase();
        return (
            (a.username && a.username.toLowerCase().includes(s)) ||
            (a.empresa && a.empresa.toLowerCase().includes(s)) ||
            (a.term_version && a.term_version.includes(s)) ||
            (a.acceptance_hash && a.acceptance_hash.toLowerCase().includes(s))
        );
    });

    const activeVersion = versions.find(v => v.status === 'active');

    return (
        <div className="p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-20">
            <header className="mb-8 border-b border-slate-200 dark:border-slate-700 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
                        <Shield className="mr-3 text-indigo-500" />
                        Governança LGPD e Termos Aceitos
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Auditabilidade e controle de consentimento dos usuários da plataforma.</p>
                </div>
                {view === 'list' && (
                    <div className="flex gap-2">
                        <button onClick={exportToExcel} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2 text-sm">
                            <Download size={16} /> Exportar
                        </button>
                        <button onClick={() => setView('new_version')} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2 text-sm">
                            <Plus size={16} /> Nova Versão
                        </button>
                    </div>
                )}
            </header>

            {loading ? (
                <div className="flex justify-center p-12"><div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div></div>
            ) : view === 'list' ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-lg"><CheckCircle size={24} /></div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Total de Aceites</p>
                                <p className="text-2xl font-bold text-slate-800 dark:text-white">{acceptances.length}</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg"><FileText size={24} /></div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Versão Ativa</p>
                                <p className="text-2xl font-bold text-slate-800 dark:text-white">{activeVersion ? activeVersion.version : '-'}</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg"><Users size={24} /></div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Usuários Únicos</p>
                                <p className="text-2xl font-bold text-slate-800 dark:text-white">{new Set(acceptances.map(a => a.user_id)).size}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row justify-between gap-4">
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 hidden sm:block">Registro de Atividades</h3>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Buscar por usuário, hash, versão..." 
                                    className="pl-9 pr-4 py-2 w-full sm:w-64 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Usuário</th>
                                        <th className="px-6 py-3 font-medium">Empresa</th>
                                        <th className="px-6 py-3 font-medium text-center">Versão</th>
                                        <th className="px-6 py-3 font-medium text-center">Data/Hora</th>
                                        <th className="px-6 py-3 font-medium hidden md:table-cell">IP</th>
                                        <th className="px-6 py-3 font-medium text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(acc => (
                                        <tr key={acc.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300">
                                            <td className="px-6 py-4 font-medium">{acc.username}</td>
                                            <td className="px-6 py-4">{acc.empresa || '-'}</td>
                                            <td className="px-6 py-4 text-center">v{acc.term_version}</td>
                                            <td className="px-6 py-4 text-center">{new Date(acc.accepted_at).toLocaleString('pt-BR')}</td>
                                            <td className="px-6 py-4 hidden md:table-cell text-xs font-mono">{acc.ip_address || '-'}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => { setSelectedAcceptance(acc); setView('view_acceptance'); }} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg" title="Visualizar Comprovante">
                                                    <Eye size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filtered.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-8 text-center text-slate-500">Nenhum registro encontrado.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : view === 'new_version' ? (
                <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden fade-in">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Publicar Nova Versão</h3>
                        <button onClick={() => setView('list')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-4 gap-4">
                            <div className="col-span-3">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Título do Documento</label>
                                <input type="text" value={newVersionTitle} onChange={e=>setNewVersionTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white" />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Versão (Ex: 1.1)</label>
                                <input type="text" value={newVersionCode} onChange={e=>setNewVersionCode(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Conteúdo Integral (Markdown/Texto)</label>
                            <textarea value={newVersionContent} onChange={e=>setNewVersionContent(e.target.value)} rows="16" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 text-sm text-slate-900 dark:text-white font-mono leading-relaxed resize-y"></textarea>
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                        <button onClick={() => setView('list')} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">Cancelar</button>
                        <button onClick={handleCreateVersion} disabled={savingVersion} className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-2">
                            {savingVersion ? "Publicando..." : "Publicar Nova Versão"}
                        </button>
                    </div>
                </div>
            ) : view === 'view_acceptance' ? (
                <div className="max-w-4xl mx-auto space-y-6 fade-in">
                    <button onClick={() => setView('list')} className="w-full flex justify-center py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 font-medium rounded-xl items-center gap-2 mb-4">
                        <X size={18} /> Fechar Comprovante
                    </button>

                    <div id="comprovante-lgpd-pdf" className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden text-slate-800 p-8 sm:p-12 relative text-sm">
                        
                        <div className="text-center mb-10 pb-6 border-b-2 border-slate-100">
                            <Shield className="w-12 h-12 mx-auto mb-4 text-indigo-600" />
                            <h1 className="text-2xl font-bold uppercase tracking-wider text-slate-900">Comprovante de Aceite</h1>
                            <p className="text-slate-500 mt-1">Termos de Uso, Política de Privacidade e Tratamento de Dados Pessoais (LGPD)</p>
                            <div className="mt-4 inline-block bg-slate-100 rounded-full px-4 py-1 text-xs font-mono font-bold text-slate-600 border border-slate-200">
                                COMPROVANTE GERADO PELO SISTEMA DONGESTÃO
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-y-6 gap-x-8 mb-10 text-sm">
                            <div><p className="text-slate-500 text-xs font-bold uppercase mb-1">Usuário / Identificação</p><p className="font-medium text-base">{selectedAcceptance.username}</p></div>
                            <div><p className="text-slate-500 text-xs font-bold uppercase mb-1">Empresa Vinculada</p><p className="font-medium text-base">{selectedAcceptance.empresa || 'N/A'}</p></div>
                            <div><p className="text-slate-500 text-xs font-bold uppercase mb-1">Data e Hora do Aceite</p><p className="font-medium text-base">{new Date(selectedAcceptance.accepted_at).toLocaleString('pt-BR')}</p></div>
                            <div><p className="text-slate-500 text-xs font-bold uppercase mb-1">Versão do Termo</p><p className="font-medium text-base">v{selectedAcceptance.term_version} <span className="text-xs font-normal text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Verificado</span></p></div>
                            <div className="col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <p className="text-slate-500 text-xs font-bold uppercase mb-2">Dados Técnicos de Auditoria (IP, Client e Hash de Validação)</p>
                                <p className="font-mono text-xs break-all text-slate-600"><span className="font-bold">IP:</span> {selectedAcceptance.ip_address || 'Não registrado'}</p>
                                <p className="font-mono text-xs break-all text-slate-600 mt-1"><span className="font-bold">Agent:</span> {selectedAcceptance.user_agent || 'Não registrado'}</p>
                                <p className="font-mono text-xs break-all text-indigo-700 mt-1"><span className="font-bold">Hash:</span> {selectedAcceptance.acceptance_hash}</p>
                            </div>
                        </div>

                        <div className="mb-10 p-6 bg-slate-50 border-l-4 border-indigo-500 rounded-r-lg text-sm text-slate-700 italic">
                            "O usuário acima identificado declarou ciência e aceite dos Termos de Uso, Política de Privacidade e Tratamento de Dados Pessoais, dando o seu explícito consentimento, conforme versão indicada neste comprovante."
                        </div>

                        <div className="mb-6">
                            <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">Cópia Integral do Texto Aceito no Ato:</h4>
                            <div className="bg-slate-50 border border-slate-200 p-6 rounded-lg text-xs font-mono text-slate-600 whitespace-pre-wrap leading-relaxed max-h-96 overflow-auto">
                                {selectedAcceptance.accepted_text_snapshot}
                            </div>
                        </div>

                        <div className="text-center mt-12 pt-6 border-t font-mono border-slate-200">
                            <p className="text-[10px] text-slate-400">Documento gerado automaticamente pelo sistema DonGestão para fins de auditoria, governança, segurança da informação e comprovação de aceite. ID interno: {selectedAcceptance.id}</p>
                        </div>
                    </div>
                    
                    <button id="btn-download-pdf-lgpd" onClick={downloadPDF} className="w-full flex justify-center py-3 bg-indigo-600 text-white font-bold rounded-xl items-center gap-2 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20">
                        <Download size={20} /> Baixar Comprovante (PDF)
                    </button>
                </div>
            ) : null}
        </div>
    );
};

export default TermosLGPDGestao;
