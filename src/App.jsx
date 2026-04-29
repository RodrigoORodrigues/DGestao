import React, { useState, useEffect, useRef } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import ptBR from 'date-fns/locale/pt-BR';
registerLocale('pt-BR', ptBR);
import { supabase } from './config/supabase';
import { 
    SYSTEM_MODULES, EMPRESAS_INTERNAS, CATEGORIAS, MESES, 
    dataDeHojeInterna, formatarMoeda, formatarDataVisivel, calcularParcelaDaVigencia,
    validarCpfCnpj
} from './utils/helpers';
import Sidebar from './components/Sidebar';
import DashboardControle from './components/DashboardControle';

// Ícones importados diretamente do pacote npm que instalámos
import { 
    Folder, FileText, Plus, Home, ChevronRight, ChevronDown, Save, ArrowLeft, 
    Building2, FolderTree, FileSpreadsheet, Download, X, Search, Eye, EyeOff, 
    Layers, Settings, Database, RefreshCw, Trash2, HardDrive, Users, FileCheck, 
    CheckCircle, XCircle, Edit, ListFilter, Upload, Sun, Moon, Printer, Archive, 
    History, AlertCircle, Lock, User, Key, LogOut, Shield, ShoppingCart, Receipt, 
    Send, Percent, DollarSign, FileOutput, Copy, Info, Tag, AlertTriangle, LayoutGrid, List, Phone, Mail
} from 'lucide-react';

import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';

// Configuração do Worker do PDF.js - usa a mesma versão da biblioteca
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
const printColLabels = {
    cod: 'Cód.', contrato: 'Contrato', op: 'Op.', vidas: 'Vidas', 
    cliente: 'Cliente', data: 'Data', loja: 'Loja', servico: 'Serviço', 
    desconto: 'Desc.', corretor: 'Corretor', parc: 'Parc.', 
    inicioVig: 'Início Vig.', nfe: 'NF-e', vitalicio: 'Vitalício', 
    pagamento: 'Pagamento', valorTotal: 'Valor Total', comissao: 'Comissão'
};
const defaultPrintCols = Object.keys(printColLabels).reduce((acc, key) => ({ ...acc, [key]: true }), {});

export const getNextSequenceNumber = (list, fieldSelector) => {
    if (!list || list.length === 0) return '00001';
    let maxNum = 0;
    list.forEach(item => {
        const val = parseInt(fieldSelector(item), 10);
        if (!isNaN(val) && val > maxNum) {
            maxNum = val;
        }
    });
    return String(maxNum + 1).padStart(5, '0');
};

export default function App() {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('protetta_theme'); return saved ? saved === 'dark' : true; 
    });
    const [currentUser, setCurrentUser] = useState(() => {
        const savedLocal = localStorage.getItem('protetta_auth_user'); 
        const savedSession = sessionStorage.getItem('protetta_auth_user');
        return savedLocal ? JSON.parse(savedLocal) : (savedSession ? JSON.parse(savedSession) : null);
    });
    const [loginData, setLoginData] = useState({ user: '', password: '', rememberMe: false });
    const [loginError, setLoginError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [alertDialog, setAlertDialog] = useState({ isOpen: false, message: '' });
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });
    const [currentView, setCurrentView] = useState('dashboard'); 
    const [loading, setLoading] = useState(false);
    const [loadingMsg, setLoadingMsg] = useState('');

    const [dbReports, setDbReports] = useState([]);
    const [currentPath, setCurrentPath] = useState([]); 
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);

    const [clientes, setClientes] = useState([]);
    const [filtroNomeCliente, setFiltroNomeCliente] = useState('');
    const [filtrosCli, setFiltrosCli] = useState({ tipo: 'Todos', situacao: 'Todos' });
    
    const [cols, setCols] = useState({ codigo: false, nome: true, tipo: true, documento: true, telefone: true, celular: true, email: true, situacao: true, cadastrado_em: true, acoes: true });
    const [modalClienteOpen, setModalClienteOpen] = useState(false);
    const [modalBuscaOpen, setModalBuscaOpen] = useState(false);
    const [clienteEditIndex, setClienteEditIndex] = useState(-1);
    const [clienteForm, setClienteForm] = useState({ id: null, nome: '', tipo: 'Pessoa jurídica', documento: '', telefone: '', celular: '', cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '', email: '', situacao: true });
    const [clientSaveSuccess, setClientSaveSuccess] = useState(false);
    const [clientesCurrentPage, setClientesCurrentPage] = useState(1);
    
    const [modalArquivosOpen, setModalArquivosOpen] = useState(false);
    const [extratosModalViewMode, setExtratosModalViewMode] = useState('cards'); // 'cards' ou 'lines'
    
    const [modalPrintOpen, setModalPrintOpen] = useState(false);
    const [printConfig, setPrintConfig] = useState({ orientation: 'landscape', scale: 100 });
    const [printCols, setPrintCols] = useState(defaultPrintCols);
    const [printPresets, setPrintPresets] = useState([]);
    const [newPresetName, setNewPresetName] = useState('');
    const [selectedPreset, setSelectedPreset] = useState('');

    const [pdfData, setPdfData] = useState([]);
    const tabelaPdfRef = useRef(null);
    const [editRowIndex, setEditRowIndex] = useState(-1);
    const [editRowData, setEditRowData] = useState({});

    const [savedReportsList, setSavedReportsList] = useState([]);
    const [currentReportId, setCurrentReportId] = useState(null);
    const [reportName, setReportName] = useState('');
    const [reportPeriod, setReportPeriod] = useState('');

    const [usersList, setUsersList] = useState([]);
    const [modalUserOpen, setModalUserOpen] = useState(false);
    const [userForm, setUserForm] = useState({ id: null, username: '', password: '', role: 'user', permissions: [] });

    const [vendasList, setVendasList] = useState([]);
    const [showVendasFilter, setShowVendasFilter] = useState(false);
    const [showVendasPeriodMenu, setShowVendasPeriodMenu] = useState(false);
    const [vendasPeriodLabel, setVendasPeriodLabel] = useState('Todo o período');
    const [showVendasAcoesMenu, setShowVendasAcoesMenu] = useState(false);

    const [showClienteSuggestions, setShowClienteSuggestions] = useState(false);
    const [showFilterClienteSuggestions, setShowFilterClienteSuggestions] = useState(false);
    const [modalVendaOpen, setModalVendaOpen] = useState(false);
    const [vendaForm, setVendaForm] = useState({ 
        id: null, numero: '', cliente: '', dataVenda: dataDeHojeInterna(), situacao: 'FATURADO PROTETTA NF', 
        loja: 'PROTETTA SEGUROS', valor: 0, contrato: '', codigoOperadora: '', vidas: '', 
        parcela: '', inicioVigencia: '', notaFiscal: '', corretor: 'Protetta',
        vitalicio: 'Não', assessoria: 'Protetta', formaPagamento: 'Crédito em conta',
        servico: 'Plano de Saúde', desconto: '', notas: '', comissao: 0, comissaoPorcentagem: ''
    });

    const defaultVendasFilters = { loja: 'Todos', codigo: '', dataInicio: '', dataFim: '', situacao: 'Todos', cliente: '', contrato: '', codigoOperadora: '', vidas: '', vitalicio: 'Selecione', parcela: '', inicioVigencia: '', notaFiscal: '', corretor: 'Todos' };
    const [vendasFilterForm, setVendasFilterForm] = useState(defaultVendasFilters);
    const [appliedVendasFilters, setAppliedVendasFilters] = useState(null);
    const [vendasSortConfig, setVendasSortConfig] = useState({ key: 'dataVenda', direction: 'desc' });

    const vendasColLabels = {
        numero: 'Registo', cliente: 'Cliente', dataVenda: 'Data', situacao: 'Situação', valor: 'Valor',
        contrato: 'Contrato', codigoOperadora: 'Operadora', vidas: 'Vidas', loja: 'Loja',
        servico: 'Serviço', corretor: 'Corretor', parcela: 'Parcela', inicioVigencia: 'Início Vigência',
        notaFiscal: 'NF', vitalicio: 'Vitalício', assessoria: 'Assessoria', formaPagamento: 'Pagamento',
        desconto: 'Desconto'
    };
    
    // As colunas originais padrão para Vendas
    const defaultVendasCols = {
        numero: true, cliente: true, dataVenda: true, situacao: true, valor: true,
        contrato: false, codigoOperadora: false, vidas: false, loja: false,
        servico: false, corretor: false, parcela: false, inicioVigencia: false,
        notaFiscal: true, vitalicio: false, assessoria: false, formaPagamento: false,
        desconto: false
    };

    const [vendasTableCols, setVendasTableCols] = useState(defaultVendasCols);
    const [showVendasColsMenu, setShowVendasColsMenu] = useState(false);

    const toggleVendasCol = (colKey) => {
        setVendasTableCols(prev => ({ ...prev, [colKey]: !prev[colKey] }));
    };

    const setAllVendasCols = (value) => {
        const newCols = {};
        Object.keys(vendasColLabels).forEach(key => { newCols[key] = value; });
        setVendasTableCols(newCols);
    };

    const [reportTableCols, setReportTableCols] = useState(defaultPrintCols);
    const [showReportColsMenu, setShowReportColsMenu] = useState(false);

    const toggleReportCol = (colKey) => {
        setReportTableCols(prev => ({ ...prev, [colKey]: !prev[colKey] }));
    };

    const setAllReportCols = (value) => {
        const newCols = {};
        Object.keys(printColLabels).forEach(key => { newCols[key] = value; });
        setReportTableCols(newCols);
    };

    const [nfeTab, setNfeTab] = useState('emitir');
    const [showImpostos, setShowImpostos] = useState(false);
    const [isEmitting, setIsEmitting] = useState(false);
    const [nfeHistorico, setNfeHistorico] = useState([]);
    
    const [nfeForm, setNfeForm] = useState({
        dataEmissao: dataDeHojeInterna(), serie: '1', tributacao: '1', cnpj: '', nome: '', email: '',
        cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '',
        codigo: '01.01', desc: '', valor: '', aliquota: '5.0', issRetido: false,
        pis: '', cofins: '', inss: '', ir: '', csll: ''
    });

    const [formData, setFormData] = useState({ ano: new Date().getFullYear().toString(), mes: MESES[0], categoria: CATEGORIAS[0], empresa: EMPRESAS_INTERNAS[0], parceiro: '', arquivos: [] });
    const [formError, setFormError] = useState(''); 
    const [successMsg, setSuccessMsg] = useState(''); 
    const fileInputRef = useRef(null);

    const showAlert = (msg) => setAlertDialog({ isOpen: true, message: msg });
    const showConfirm = (msg, callback) => setConfirmDialog({ isOpen: true, message: msg, onConfirm: callback });

    const hasAccess = (module) => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin') return true; 
        return (currentUser.permissions || []).includes(module);
    };

    const loadFromDB = async () => {
        if(!supabase) return;
        try {
            const [resUsers, resCli, resVendas, resSaved, resRep] = await Promise.all([
                supabase.from('users').select('*'), supabase.from('clientes').select('*'),
                supabase.from('vendas').select('*'), supabase.from('savedReports').select('*'), supabase.from('reports').select('*')
            ]);
            if (resUsers.data) setUsersList(resUsers.data);
            if (resCli.data) setClientes(resCli.data);
            if (resVendas.data) setVendasList(resVendas.data);
            if (resSaved.data) setSavedReportsList(resSaved.data);
            if (resRep.data) setDbReports(resRep.data);

            try {
                const { data: pData, error: pErr } = await supabase.from('print_presets').select('*');
                if (!pErr && pData) {
                    setPrintPresets(pData);
                } else {
                    const saved = localStorage.getItem('protetta_print_presets');
                    if (saved) setPrintPresets(JSON.parse(saved));
                }
            } catch(e) {
                const saved = localStorage.getItem('protetta_print_presets');
                if (saved) setPrintPresets(JSON.parse(saved));
            }
        } catch (err) { console.error("Erro ao carregar Supabase:", err); }
    };

    useEffect(() => {
        const initAdminSupabase = async () => {
            if(!supabase) return;
            try {
                const { data, error } = await supabase.from('users').select('*').limit(1);
                if (error) {
                    console.error("Supabase Error during init:", error);
                }
                if (data && data.length === 0) {
                    const insertResponse = await supabase.from('users').insert([{ username: 'admin', password: 'admin', role: 'admin', permissions: SYSTEM_MODULES.map(m => m.id) }]);
                    if (insertResponse.error) {
                        console.error("Supabase Error during admin insert:", insertResponse.error);
                    }
                }
            } catch(e) {
                console.error("Try-catch error during initAdminSupabase:", e);
            }
        };
        initAdminSupabase();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showVendasAcoesMenu && !event.target.closest('.vendas-acoes-menu')) {
                setShowVendasAcoesMenu(false);
            }
            if (showVendasPeriodMenu && !event.target.closest('.vendas-period-menu')) {
                setShowVendasPeriodMenu(false);
            }
            if (showReportColsMenu && !event.target.closest('.report-cols-menu')) {
                setShowReportColsMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showVendasAcoesMenu, showVendasPeriodMenu, showReportColsMenu]);

    useEffect(() => { if(currentUser) loadFromDB(); }, [currentUser]);
    
    useEffect(() => {
        if (isDarkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('protetta_theme', 'dark'); } 
        else { document.documentElement.classList.remove('dark'); localStorage.setItem('protetta_theme', 'light'); }
    }, [isDarkMode]);

    useEffect(() => {
        setClientesCurrentPage(1);
    }, [filtroNomeCliente, filtrosCli]);

    const handleLogin = async (e) => {
        e.preventDefault(); setLoading(true); setLoadingMsg("Autenticando...");
        try {
            const { data: users, error } = await supabase.from('users').select('*').eq('username', loginData.user);
            
            // Default hardcoded admin fallback if DB fails or is unconfigured
            if (loginData.user === 'admin' && loginData.password === 'admin') {
                if (error) console.error("Supabase Error (falling back to local admin):", error);
                const sessionUser = { id: 1, username: 'admin', role: 'admin', permissions: SYSTEM_MODULES ? SYSTEM_MODULES.map(m => m.id) : [] };
                setCurrentUser(sessionUser); 
                if (loginData.rememberMe) {
                    localStorage.setItem('protetta_auth_user', JSON.stringify(sessionUser));
                } else {
                    sessionStorage.setItem('protetta_auth_user', JSON.stringify(sessionUser));
                }
                setLoginError(''); setLoginData({ user: '', password: '', rememberMe: false }); setShowPassword(false);
                setCurrentView('dashboard');
                setLoading(false);
                return;
            }

            if (error) {
                console.error("Supabase Error:", error);
                setLoginError('Erro DB: ' + error.message);
            } else if (users && users.length > 0 && users[0].password === loginData.password) {
                const user = users[0];
                const sessionUser = { id: user.id, username: user.username, role: user.role, permissions: user.permissions || [] };
                setCurrentUser(sessionUser); 
                if (loginData.rememberMe) {
                    localStorage.setItem('protetta_auth_user', JSON.stringify(sessionUser));
                } else {
                    sessionStorage.setItem('protetta_auth_user', JSON.stringify(sessionUser));
                }
                setLoginError(''); setLoginData({ user: '', password: '', rememberMe: false }); setShowPassword(false);
                
                if (user.role !== 'admin' && !user.permissions.includes('dashboard')) {
                    if (user.permissions.length > 0) setCurrentView(user.permissions[0]);
                } else { setCurrentView('dashboard'); }
            } else { setLoginError('Credenciais inválidas.'); }
        } catch(err) { setLoginError('Erro de conexão: ' + err.message); } finally { setLoading(false); }
    };

    const handleLogout = () => {
        showConfirm("Tem a certeza que deseja terminar a sessão?", () => {
            setCurrentUser(null); localStorage.removeItem('protetta_auth_user'); sessionStorage.removeItem('protetta_auth_user'); setCurrentView('dashboard');
        });
    };

    if (!supabase) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-slate-900 p-6">
                <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-lg w-full text-center border border-slate-700">
                    <Database size={48} className="text-blue-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Conexão Cloud Necessária</h1>
                    <p className="text-slate-400 mb-6 text-sm">O seu sistema Don Gestão precisa da configuração do Supabase para funcionar.</p>
                </div>
            </div>
        );
    }

    if (!currentUser) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-slate-100 dark:bg-slate-900 transition-colors duration-200 p-4">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 transition-colors relative">
                    <div className="flex flex-col items-center mb-8">
                        <div className="bg-emerald-600 p-3 rounded-xl font-bold text-white text-3xl leading-none border border-emerald-400/50 mb-4 shadow-lg">D</div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Don Gestão</h1>
                    </div>
                    <form onSubmit={handleLogin} onInvalid={(e) => e.currentTarget.classList.add('show-errors')} className="space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Usuário</label>
                            <div className="relative">
                                <User size={18} className="absolute left-3 top-3 text-slate-400" />
                                <input type="text" required value={loginData.user} onChange={e => setLoginData({...loginData, user: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Senha</label>
                            <div className="relative">
                                <Key size={18} className="absolute left-3 top-3 text-slate-400" />
                                <input type={showPassword ? "text" : "password"} required value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-10 py-2.5 text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"><Eye size={18} /></button>
                            </div>
                        </div>
                        <div className="flex items-center -mt-2 mb-2">
                            <input type="checkbox" id="rememberMe" checked={loginData.rememberMe} onChange={e => setLoginData({...loginData, rememberMe: e.target.checked})} className="w-4 h-4 text-emerald-600 bg-slate-50 border-slate-300 rounded focus:ring-emerald-500 dark:focus:ring-emerald-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-900 dark:border-slate-600" />
                            <label htmlFor="rememberMe" className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">Manter sessão iniciada</label>
                        </div>
                        {loginError && <p className="text-rose-500 dark:text-rose-400 text-sm font-bold text-center bg-rose-100 dark:bg-rose-500/10 py-2 rounded-lg border border-rose-200 dark:border-rose-500/20">{loginError}</p>}
                        <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors shadow-lg mt-4" disabled={loading}>
                            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Lock size={18} /><span>Entrar no Sistema</span></>}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // --- FUNÇÕES DE LÓGICA ---
    const applyDatePreset = (preset) => {
        let start = ''; let end = ''; const today = new Date();
        const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

        switch(preset) {
            case 'Hoje': start = formatDate(today); end = formatDate(today); break;
            case 'Esta semana': const first = today.getDate() - today.getDay(); start = formatDate(new Date(today.getFullYear(), today.getMonth(), first)); end = formatDate(new Date(today.getFullYear(), today.getMonth(), first + 6)); break;
            case 'Mês passado': start = formatDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)); end = formatDate(new Date(today.getFullYear(), today.getMonth(), 0)); break;
            case 'Este mês': start = formatDate(new Date(today.getFullYear(), today.getMonth(), 1)); end = formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)); break;
            case 'Próximo mês': start = formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 1)); end = formatDate(new Date(today.getFullYear(), today.getMonth() + 2, 0)); break;
            case 'Todo o período': default: start = ''; end = ''; break;
        }
        setVendasPeriodLabel(preset); setShowVendasPeriodMenu(false);
        if (preset === 'Escolha o período') { setShowVendasFilter(true); } 
        else { const updatedFilters = { ...vendasFilterForm, dataInicio: start, dataFim: end }; setVendasFilterForm(updatedFilters); setAppliedVendasFilters(updatedFilters); }
    };

    const handleBuscarVendas = () => { setAppliedVendasFilters({ ...vendasFilterForm }); };
    const handleLimparVendas = () => { setVendasFilterForm(defaultVendasFilters); setAppliedVendasFilters(null); setVendasPeriodLabel('Todo o período'); };

    const getFilteredVendas = () => {
        let todasAsVendas = [...vendasList];
        savedReportsList.forEach(report => {
            if (report.dados && Array.isArray(report.dados)) {
                report.dados.forEach((dado, idx) => {
                    todasAsVendas.push({
                        id: `rep_${report.id}_${idx}`, isFromReport: true, reportId: report.id, reportRowIndex: idx,
                        numero: dado.cod, cliente: dado.cliente, dataVenda: report.dataCriacao ? report.dataCriacao.split('T')[0] : dataDeHojeInterna(),
                        situacao: dado.situacao, loja: dado.loja, valor: dado.valorTotal, parcela: dado.parcela || '', 
                        corretor: dado.vendedor || '', inicioVigencia: dado.inicioVigencia || '', notaFiscal: dado.notaFiscal || '',
                        contrato: dado.contrato || '', codigoOperadora: dado.codigoOperadora || 'AMIL', vidas: dado.vidas || '', 
                        vitalicio: dado.vitalicio || 'Não', assessoria: dado.assessoria || 'Protetta', formaPagamento: dado.formaPagamento || 'Crédito em conta',
                        servico: dado.servico || 'Plano de Saúde', desconto: dado.desconto || '' 
                    });
                });
            }
        });

        if (appliedVendasFilters) {
            const f = appliedVendasFilters;
            if (f.loja !== 'Todos') todasAsVendas = todasAsVendas.filter(v => v.loja === f.loja);
            if (f.situacao !== 'Todos') todasAsVendas = todasAsVendas.filter(v => v.situacao === f.situacao);
            if (f.codigo) todasAsVendas = todasAsVendas.filter(v => (v.numero || '').toLowerCase().includes(f.codigo.toLowerCase()));
            if (f.cliente) todasAsVendas = todasAsVendas.filter(v => (v.cliente || '').toLowerCase().includes(f.cliente.toLowerCase()));
            if (f.contrato) todasAsVendas = todasAsVendas.filter(v => (v.contrato || '').toLowerCase().includes(f.contrato.toLowerCase()));
            if (f.codigoOperadora) todasAsVendas = todasAsVendas.filter(v => (v.codigoOperadora || '').toLowerCase().includes(f.codigoOperadora.toLowerCase()));
            if (f.notaFiscal) todasAsVendas = todasAsVendas.filter(v => (v.notaFiscal || '').toLowerCase().includes(f.notaFiscal.toLowerCase()));
            if (f.vidas) todasAsVendas = todasAsVendas.filter(v => v.vidas == f.vidas);
            if (f.vitalicio !== 'Selecione') todasAsVendas = todasAsVendas.filter(v => v.vitalicio === f.vitalicio);
            if (f.corretor !== 'Todos') todasAsVendas = todasAsVendas.filter(v => v.corretor === f.corretor);
            if (f.dataInicio) todasAsVendas = todasAsVendas.filter(v => v.dataVenda >= f.dataInicio);
            if (f.dataFim) todasAsVendas = todasAsVendas.filter(v => v.dataVenda <= f.dataFim);
        }

        todasAsVendas.sort((a, b) => {
            let valA = a[vendasSortConfig.key];
            let valB = b[vendasSortConfig.key];

            if (valA === null || valA === undefined) valA = '';
            if (valB === null || valB === undefined) valB = '';

            if (vendasSortConfig.key === 'dataVenda' || vendasSortConfig.key === 'inicioVigencia') {
                valA = valA ? new Date(valA).getTime() : 0;
                valB = valB ? new Date(valB).getTime() : 0;
            } else if (vendasSortConfig.key === 'valor' || vendasSortConfig.key === 'vidas') {
                valA = Number(valA) || 0;
                valB = Number(valB) || 0;
            } else {
                valA = valA.toString().toLowerCase();
                valB = valB.toString().toLowerCase();
            }

            if (valA < valB) return vendasSortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return vendasSortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return todasAsVendas;
    };

    const handleSortVendas = (key) => {
        let direction = 'asc';
        if (vendasSortConfig.key === key && vendasSortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setVendasSortConfig({ key, direction });
    };

    const getSortIcon = (key) => {
        if (vendasSortConfig.key !== key) return null;
        return <ChevronDown size={14} className={`inline ml-1 transition-transform ${vendasSortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />;
    };

    const displayedVendas = getFilteredVendas();
    let displayPeriodLabel = vendasPeriodLabel;
    if (vendasPeriodLabel === 'Escolha o período' && appliedVendasFilters?.dataInicio && appliedVendasFilters?.dataFim) { displayPeriodLabel = `${formatarDataVisivel(appliedVendasFilters.dataInicio)} - ${formatarDataVisivel(appliedVendasFilters.dataFim)}`; } 
    else if (vendasPeriodLabel === 'Escolha o período') { displayPeriodLabel = 'Período Customizado'; }

    const exportarVendasParaExcel = () => {
        const dadosTratados = displayedVendas.map(v => ({
            'Nº Registo': v.numero || '-',
            'Contrato': v.contrato || '-',
            'Cliente': v.cliente,
            'Data': formatarDataVisivel(v.dataVenda),
            'Situação': v.situacao,
            'Loja/Assessoria': `${v.loja} - ${v.assessoria || ''}`,
            'Corretor': v.corretor,
            'Serviço': v.servico,
            'Operadora': v.codigoOperadora,
            'Parcela': v.parcela,
            'Vidas': v.vidas,
            'Nota Fiscal': v.notaFiscal || 'Sem NF',
            'Valor (R$)': v.valor
        }));
        const ws = XLSX.utils.json_to_sheet(dadosTratados);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Relatorio_Vendas");
        XLSX.writeFile(wb, `DonGestao_Vendas_${dataDeHojeInterna()}.xlsx`);
        setShowVendasAcoesMenu(false);
    };

    const getSituacaoColor = (situacao) => {
        if (!situacao) return 'bg-slate-100 text-slate-700';
        if (situacao.includes('FATURADO')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
        if (situacao.includes('PENDENTE')) return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
        if (situacao.includes('CANCELADO')) return 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400';
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    };

    const abrirModalVenda = (venda = null) => {
        if (venda) setVendaForm({ ...venda });
        else setVendaForm({ 
            id: null, numero: getNextSequenceNumber(vendasList, v => v.numero), cliente: '', dataVenda: dataDeHojeInterna(), situacao: 'FATURADO PROTETTA NF', 
            loja: 'PROTETTA SEGUROS', valor: 0, contrato: '', codigoOperadora: '', vidas: '', parcela: '', inicioVigencia: '', notaFiscal: '', 
            corretor: 'Protetta', vitalicio: 'Não', assessoria: 'Protetta', formaPagamento: 'Crédito em conta',
            servico: 'Plano de Saúde', desconto: '', notas: '' 
        });
        setModalVendaOpen(true);
    };

    const duplicarVenda = (venda) => {
        const copia = {
            ...venda,
            id: null,
            numero: getNextSequenceNumber(vendasList, v => v.numero),
            isFromReport: false,
            reportId: null,
            reportRowIndex: null,
        };
        setVendaForm(copia);
        setModalVendaOpen(true);
    };

    const onChangeVendaField = (field, value) => {
        let newForm = { ...vendaForm, [field]: value };
        
        if (['valor', 'comissaoPorcentagem', 'desconto'].includes(field)) {
            const val = parseFloat(newForm.valor) || 0;
            const pct = parseFloat(newForm.comissaoPorcentagem);
            const desc = parseFloat(newForm.desconto) || 0;
            
            if (!isNaN(pct)) {
                newForm.comissao = (val * (pct / 100)) - desc;
            }
        }
        
        setVendaForm(newForm);
    };

    const salvarVenda = async (e) => {
        if (e) e.preventDefault(); 
        
        const executarSalvamento = async () => {
            setLoading(true); setLoadingMsg("Guardando venda...");
            try {
                let dataToSave = { ...vendaForm, valor: parseFloat(vendaForm.valor) || 0 };
                dataToSave.vidas = dataToSave.vidas === '' || dataToSave.vidas === undefined ? null : parseInt(dataToSave.vidas, 10);
                dataToSave.comissao = dataToSave.comissao === '' || dataToSave.comissao === undefined ? null : parseFloat(dataToSave.comissao);
                dataToSave.desconto = dataToSave.desconto === '' || dataToSave.desconto === undefined ? null : parseFloat(dataToSave.desconto);
                
                delete dataToSave.comissaoPorcentagem;
                delete dataToSave.isFromReport;
                delete dataToSave.reportId;
                delete dataToSave.reportRowIndex;
                delete dataToSave.created_at;
                
                if (vendaForm.isFromReport) {
                    const rep = await supabase.from('savedReports').select('*').eq('id', vendaForm.reportId).single();
                    if (rep.data) {
                        let dadosAtualizados = [...rep.data.dados];
                        dadosAtualizados[vendaForm.reportRowIndex] = {
                            ...dadosAtualizados[vendaForm.reportRowIndex],
                            cod: dataToSave.numero, cliente: dataToSave.cliente, situacao: dataToSave.situacao, loja: dataToSave.loja, valorTotal: dataToSave.valor, 
                            vendedor: dataToSave.corretor, parcela: dataToSave.parcela, inicioVigencia: dataToSave.inicioVigencia, notaFiscal: dataToSave.notaFiscal, 
                            contrato: dataToSave.contrato, codigoOperadora: dataToSave.codigoOperadora, vidas: dataToSave.vidas,
                            vitalicio: dataToSave.vitalicio, assessoria: dataToSave.assessoria, formaPagamento: dataToSave.formaPagamento,
                            servico: dataToSave.servico, desconto: dataToSave.desconto, notas: dataToSave.notas 
                        };
                        await supabase.from('savedReports').update({ dados: dadosAtualizados }).eq('id', rep.data.id);
                    }
                } else {
                    if (vendaForm.id) {
                        const { error } = await supabase.from('vendas').update(dataToSave).eq('id', vendaForm.id);
                        if (error) throw error;
                    } else { 
                        delete dataToSave.id; 
                        const { error } = await supabase.from('vendas').insert([dataToSave]); 
                        if (error) throw error;
                    }
                }
                await loadFromDB(); setModalVendaOpen(false); showAlert("Venda guardada com sucesso!");
            } catch (err) { showAlert("Erro ao guardar: " + err.message); } finally { setLoading(false); }
        };

        // Verifica pulo de parcela apenas para novas vendas
        if (!vendaForm.id && !vendaForm.isFromReport && vendaForm.parcela) {
            const matchParcelaAtual = vendaForm.parcela.toString().match(/\d+/);
            if (matchParcelaAtual) {
                const numParcelaAtual = parseInt(matchParcelaAtual[0], 10);
                
                const vendasRelacionadas = vendasList.filter(v => 
                    (vendaForm.contrato && v.contrato === vendaForm.contrato) || 
                    (!vendaForm.contrato && vendaForm.cliente && v.cliente === vendaForm.cliente)
                );
                
                let maxParcela = 0;
                vendasRelacionadas.forEach(v => {
                    if (v.parcela) {
                        const m = v.parcela.toString().match(/\d+/);
                        if (m) {
                            const num = parseInt(m[0], 10);
                            if (num > maxParcela) maxParcela = num;
                        }
                    }
                });
                
                if (maxParcela > 0 && numParcelaAtual > maxParcela + 1) {
                    showConfirm(`Atenção: A parcela inserida (${vendaForm.parcela}) parece pular a sequência. A última parcela registada foi a de número ${maxParcela}. Deseja guardar a venda mesmo assim?`, () => {
                        const alertPrefix = `⚠️ ALERTA DE SISTEMA: Foi detectado um salto no número da parcela ao inserir esta venda (parcela atual é ${vendaForm.parcela}). A anterior registada foi a de número ${maxParcela}.\n\n`;
                        vendaForm.notas = alertPrefix + (vendaForm.notas || '');
                        executarSalvamento();
                    });
                    return;
                }
            }
        }
        
        executarSalvamento();
    };

    const apagarVenda = (venda) => {
        showConfirm(`Tem a certeza absoluta de que deseja apagar esta venda? Esta ação é irreversível e não poderá recuperar os dados.`, async () => {
            setLoading(true); setLoadingMsg("Apagando...");
            if (venda.isFromReport) {
                const rep = await supabase.from('savedReports').select('*').eq('id', venda.reportId).single();
                if (rep.data) {
                    let dados = rep.data.dados.filter((_, idx) => idx !== venda.reportRowIndex);
                    await supabase.from('savedReports').update({ dados: dados }).eq('id', rep.data.id);
                }
            } else { await supabase.from('vendas').delete().eq('id', venda.id); }
            await loadFromDB(); setLoading(false);
        });
    };

    const abrirModalUsuario = (user = null) => {
        if (user) setUserForm({ ...user });
        else setUserForm({ id: null, username: '', password: '', role: 'user', permissions: [] });
        setModalUserOpen(true);
    };

    const salvarUsuario = async (e) => {
        e.preventDefault(); setLoading(true); setLoadingMsg("Guardando usuário...");
        try {
            const { data: existing } = await supabase.from('users').select('*').eq('username', userForm.username);
            if (existing && existing.length > 0 && existing[0].id !== userForm.id) { setLoading(false); return showAlert("Já existe um usuário registado com este nome."); }
            
            const dataToSave = { username: userForm.username, password: userForm.password, role: userForm.role, permissions: userForm.role === 'admin' ? SYSTEM_MODULES.map(m=>m.id) : userForm.permissions };
            if (userForm.id) {
                await supabase.from('users').update(dataToSave).eq('id', userForm.id);
                if (currentUser?.id === userForm.id) { 
                    const updatedSession = { ...currentUser, ...dataToSave }; 
                    setCurrentUser(updatedSession); 
                    if (localStorage.getItem('protetta_auth_user')) {
                        localStorage.setItem('protetta_auth_user', JSON.stringify(updatedSession)); 
                    } else {
                        sessionStorage.setItem('protetta_auth_user', JSON.stringify(updatedSession));
                    }
                }
            } else { await supabase.from('users').insert([dataToSave]); }
            await loadFromDB(); setModalUserOpen(false); showAlert("Usuário guardado com sucesso!");
        } catch (err) { showAlert("Erro ao guardar: " + err.message); } finally { setLoading(false); }
    };

    const apagarUsuario = (u) => {
        if (u.username === 'admin') return showAlert("Não é possível apagar admin.");
        if (currentUser?.id === u.id) return showAlert("Você não pode apagar a sua própria conta.");
        showConfirm(`Tem a certeza que deseja apagar o usuário '${u.username}'?`, async () => { await supabase.from('users').delete().eq('id', u.id); await loadFromDB(); });
    };

    const getFileColorClass = (fileName) => {
        if (!fileName) return "text-slate-400"; const ext = fileName.split('.').pop().toLowerCase();
        if (['csv', 'xlsx', 'xls'].includes(ext)) return "text-emerald-600 dark:text-emerald-400";
        if (['pdf'].includes(ext)) return "text-rose-600 dark:text-rose-400"; return "text-slate-400";
    };

    const getItemsAtCurrentPath = () => {
        if (searchTerm.trim() !== '') { const term = searchTerm.toLowerCase(); return dbReports.filter(r => r.parceiro.toLowerCase().includes(term) || (r.fileName || '').toLowerCase().includes(term) || r.empresa.toLowerCase().includes(term)).map(f => ({ ...f, type: 'file', name: f.fileName || f.parceiro, pathInfo: `${f.ano} / ${f.mes} / ${f.empresa}` })); }
        if (currentPath.length === 0) return [...new Set(dbReports.map(r => r.ano))].sort().map(y => ({ id: y, name: y, type: 'folder' }));
        if (currentPath.length === 1) return [...new Set(dbReports.filter(r => r.ano === currentPath[0]).map(r => r.mes))].sort((a, b) => MESES.indexOf(a) - MESES.indexOf(b)).map(m => ({ id: m, name: m, type: 'folder' }));
        if (currentPath.length === 2) return CATEGORIAS.map(c => ({ id: c, name: c, type: 'folder' }));
        if (currentPath.length === 3) return EMPRESAS_INTERNAS.map(e => ({ id: e, name: e, type: 'folder' }));
        if (currentPath.length === 4) return dbReports.filter(r => r.ano === currentPath[0] && r.mes === currentPath[1] && r.categoria === currentPath[2] && r.empresa === currentPath[3]).map(f => ({ ...f, type: 'file', name: f.parceiro }));
        return [];
    };

    const handleSubmitExtrato = async (e) => {
        e.preventDefault(); if (!formData.parceiro.trim()) return setFormError('ERRO: Parceiro obrigatório.'); if (formData.arquivos.length === 0) return setFormError('ERRO: Anexos obrigatórios.');
        setLoading(true); setLoadingMsg("Fazendo upload para a nuvem...");
        try {
            for (const file of formData.arquivos) {
                const filePath = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                const { error: uploadErr } = await supabase.storage.from('arquivos_extratos').upload(filePath, file);
                if(uploadErr) throw uploadErr;
                await supabase.from('reports').insert([{ ano: formData.ano, mes: formData.mes, categoria: formData.categoria, empresa: formData.empresa, parceiro: formData.parceiro, date: new Date().toISOString(), fileName: file.name, filePath: filePath }]);
            }
            await loadFromDB(); setSuccessMsg(`${formData.arquivos.length} extratos guardados!`); setFormData(prev => ({ ...prev, parceiro: '', arquivos: [] })); setTimeout(() => setSuccessMsg(''), 4000);
        } catch (error) { showAlert("Erro ao enviar ficheiro para a Cloud: " + error.message); } finally { setLoading(false); }
    };

    const handleNavigate = async (item) => {
        if (item.type === 'folder') { setCurrentPath([...currentPath, item.name]); setSearchTerm(''); } 
        else if (item.type === 'file') {
            setLoading(true); setLoadingMsg("Descarregando ficheiro...");
            try { 
                const pathTarget = item.filePath || item.fileName;
                if (!pathTarget) throw new Error("Caminho do ficheiro ausente. O registo pode ser de uma versão mais antiga.");
                const { data, error } = await supabase.storage.from('arquivos_extratos').download(pathTarget);
                if(error) throw error; setSelectedFile({ ...item, fileObj: data }); 
            } catch(e) { showAlert("Erro ao descarregar da Cloud: " + e.message); } finally { setLoading(false); }
        }
    };

    const clientesFiltrados = clientes.filter(cli => {
        const matchNome = cli.nome.toLowerCase().includes(filtroNomeCliente.toLowerCase()) || (cli.documento && cli.documento.includes(filtroNomeCliente));
        const matchTipo = filtrosCli.tipo === 'Todos' || cli.tipo === filtrosCli.tipo;
        const matchSituacao = filtrosCli.situacao === 'Todos' || (filtrosCli.situacao === 'Ativo' ? cli.situacao : !cli.situacao);
        return matchNome && matchTipo && matchSituacao;
    });

    const clientesPerPage = 20;
    const totalPagesClientes = Math.ceil(clientesFiltrados.length / clientesPerPage);
    const indexOfLastCliente = clientesCurrentPage * clientesPerPage;
    const indexOfFirstCliente = indexOfLastCliente - clientesPerPage;
    const currentClientes = clientesFiltrados.slice(indexOfFirstCliente, indexOfLastCliente);

    const apagarCliente = (id) => { 
        const clienteParaApagar = clientes.find(c => c.id === id);
        if(!clienteParaApagar) return;
        
        const vendasAssociadas = vendasList.filter(v => v.cliente.toLowerCase() === clienteParaApagar.nome.toLowerCase());
        let msg = "Tem a certeza absoluta de que deseja apagar este cliente? Esta ação não pode ser desfeita.";
        if (vendasAssociadas.length > 0) {
            msg = `ATENÇÃO: Este cliente possui ${vendasAssociadas.length} venda(s) associada(s). Tem a certeza absoluta que quer apagar este registo?`;
        }

        showConfirm(msg, async () => { 
            setLoading(true); 
            setLoadingMsg("Apagando cliente..."); 
            await supabase.from('clientes').delete().eq('id', id); 
            await loadFromDB(); 
            setLoading(false); 
        }); 
    };
    const abrirModalAddEdit = (cliente = null) => {
        if (cliente) { setClienteForm({...cliente}); setClienteEditIndex(cliente.id); } 
        else { setClienteForm({ id: null, nome: '', tipo: 'Pessoa jurídica', documento: '', telefone: '', celular: '', cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '', email: '', situacao: true }); setClienteEditIndex(-1); }
        setModalClienteOpen(true);
    };

    const salvarCliente = async (e) => {
        e.preventDefault(); 

        const nomeUpper = clienteForm.nome.trim().toUpperCase();
        const clienteExistente = clientes.find(c => c.nome.trim().toUpperCase() === nomeUpper && c.id !== clienteForm.id);
        
        if (clienteExistente) {
            return showAlert(`Já existe um cliente registado com o nome "${clienteForm.nome.trim()}". Não é possível guardar clientes com nomes duplicados.`);
        }

        const doc = clienteForm.documento ? clienteForm.documento.replace(/[^\d]/g, '') : '';
        if (doc) {
            if (clienteForm.tipo === 'Pessoa física' && doc.length !== 11) {
                return showAlert("Atenção: O CPF deve conter 11 dígitos numéricos. (Preencha corretamente ou deixe em branco).");
            } else if (clienteForm.tipo === 'Pessoa jurídica' && doc.length !== 14) {
                return showAlert("Atenção: O CNPJ deve conter 14 dígitos numéricos. (Preencha corretamente ou deixe em branco).");
            }
        }

        setLoading(true); setLoadingMsg("Guardando cliente...");
        try {
            const clienteParaSalvar = { ...clienteForm }; clienteParaSalvar.nome = clienteParaSalvar.nome.trim();
            if (clienteEditIndex >= 0) {
                const duplicado = clientes.find(c => c.id !== clienteEditIndex && c.nome.toLowerCase() === clienteParaSalvar.nome.toLowerCase());
                if (duplicado) { setLoading(false); return showAlert("Já existe outro cliente registado com este nome exato."); }
                await supabase.from('clientes').update(clienteParaSalvar).eq('id', clienteEditIndex);
            } else {
                const duplicado = clientes.find(c => c.nome.toLowerCase() === clienteParaSalvar.nome.toLowerCase());
                if (duplicado) { setLoading(false); return showAlert("Não é possível salvar. Já existe um cliente com este nome na base."); }
                clienteParaSalvar.codigo = getNextSequenceNumber(clientes, c => c.codigo); delete clienteParaSalvar.id;
                await supabase.from('clientes').insert([clienteParaSalvar]);
            }
            await loadFromDB();
            setClientSaveSuccess(true);
            setTimeout(() => {
                setClientSaveSuccess(false);
                setModalClienteOpen(false);
            }, 600);
        } catch (err) { showAlert("Erro ao guardar cliente: " + err.message); } finally { setLoading(false); }
    };

    const importarClientes = async (event) => {
        const file = event.target.files[0]; if (!file) return;
        setLoading(true); setLoadingMsg("Lendo ficheiro e guardando na nuvem..."); const ext = file.name.split('.').pop().toLowerCase();
        try {
            let novosClientesParaInserir = [];
            let currentMaxCodigo = clientes.reduce((max, c) => {
                let v = parseInt(c.codigo, 10);
                return !isNaN(v) && v > max ? v : max;
            }, 0);
            if (ext === 'xlsx' || ext === 'csv') {
                const data = await file.arrayBuffer(); const workbook = XLSX.read(data); const linhasExcel = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                linhasExcel.forEach(linha => {
                    let nome = linha['Nome'] || linha['NOME'] || linha['Cliente'] || "Sem Nome"; nome = nome.trim();
                    if(!clientes.find(c => c.nome.toLowerCase() === nome.toLowerCase()) && !novosClientesParaInserir.find(c => c.nome.toLowerCase() === nome.toLowerCase())) {
                        currentMaxCodigo++;
                        let newCodigo = String(currentMaxCodigo).padStart(5, '0');
                        novosClientesParaInserir.push({ codigo: newCodigo, nome: nome, tipo: linha['Tipo'] || 'Pessoa jurídica', documento: linha['Documento'] || linha['CNPJ'] || linha['NIF'] || '', telefone: linha['Telefone'] || '', celular: linha['Celular'] || '', email: linha['Email'] || linha['E-mail'] || '', situacao: true });
                    }
                });
            }
            if(novosClientesParaInserir.length > 0){ await supabase.from('clientes').insert(novosClientesParaInserir); await loadFromDB(); showAlert(`${novosClientesParaInserir.length} novos clientes importados!`); } else { showAlert("Nenhum cliente novo encontrado no ficheiro."); }
        } catch (err) { showAlert("Erro ao importar: " + err.message); } finally { setLoading(false); event.target.value = ''; }
    };

    const processarArquivoDoBanco = async (report) => {
        setLoading(true); setLoadingMsg("A descarregar PDF da nuvem..."); setModalArquivosOpen(false); 
        try {
            const pathTarget = report.filePath || report.fileName;
            if (!pathTarget) throw new Error("Caminho do ficheiro ausente.");
            const { data: fileBlob, error } = await supabase.storage.from('arquivos_extratos').download(pathTarget);
            if (error || !fileBlob) throw new Error("Ficheiro PDF não encontrado no Storage.");
            setLoadingMsg("A processar dados do PDF..."); const arrayBuffer = await fileBlob.arrayBuffer(); const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
            let textoCompleto = "";
            for (let i = 1; i <= pdf.numPages; i++) { const page = await pdf.getPage(i); const textContent = await page.getTextContent(); textoCompleto += textContent.items.map(item => item.str).join(" ") + " "; }
            await extrairDadosDoTexto(textoCompleto);
        } catch (error) { showAlert("Erro ao ler o PDF: " + error.message); } finally { setLoading(false); }
    };

    const extrairDadosDoTexto = async (texto) => {
        setCurrentReportId(null); 
        setReportName(`Relatório Automático - ${new Date().toLocaleDateString('pt-PT')}`); 
        setReportPeriod('');

        let textoNormalizado = texto.replace(/\s+/g, ' ').trim(); 
        let textoSemFalsoContrato = textoNormalizado.replace(/Total\s+contrato\s*:/gi, 'Total_Apurado:');
        
        const blocosContrato = textoSemFalsoContrato.split(/Contrato\s*:/i); 
        if (blocosContrato.length > 0) blocosContrato.shift();
        
        const novosRegistos = []; 
        const clientesParaInserir = []; 
        const nomesClientesExistem = new Set(clientes.map(c => c.nome.toLowerCase()));
        let alertasSequencia = [];
        
        let currentMaxVendaCodigo = vendasList.reduce((max, v) => {
            let num = parseInt(v.numero, 10);
            return !isNaN(num) && num > max ? num : max;
        }, 0);

        let currentMaxCodigo = clientes.reduce((max, c) => {
            let v = parseInt(c.codigo, 10);
            return !isNaN(v) && v > max ? v : max;
        }, 0);

        for (let bloco of blocosContrato) {
            try {
                bloco = bloco.trim(); 
                if (bloco === "") continue;
                
                let codCliente = "N/D", nomeCliente = "";
                
                const matchNome = bloco.match(/^(\d+)\s*(?:-)?\s*(.+?)(?=\s+Fatura|\s+Proposta|\s+Data|\s+Qtd|\s+Forma|\s+\d{2}\/\d{4})/i);
                if (matchNome) { 
                    codCliente = matchNome[1].trim(); 
                    nomeCliente = matchNome[2].trim(); 
                    nomeCliente = nomeCliente.replace(/(?:\s+[\d\/\.\-,]+)+$/, '').trim(); 
                }
                if(!nomeCliente) continue;

                currentMaxVendaCodigo++;
                let codRegistro = String(currentMaxVendaCodigo).padStart(5, '0');
                let contratoDetectado = codCliente !== "N/D" ? codCliente : "";

                if(!nomesClientesExistem.has(nomeCliente.toLowerCase())) {
                    nomesClientesExistem.add(nomeCliente.toLowerCase());
                    currentMaxCodigo++;
                    let newCodigo = String(currentMaxCodigo).padStart(5, '0');
                    clientesParaInserir.push({ 
                        codigo: contratoDetectado || newCodigo, 
                        nome: nomeCliente, 
                        tipo: 'Pessoa jurídica', 
                        documento: '', 
                        telefone: '', 
                        celular: '', 
                        email: '', 
                        situacao: true
                    });
                }

                let valorTotal = 0, comissao = 0; 
                let vidasDetectadas = "1";
                
                const regexValores = /Sem Repique\s+(\d{1,2},\d{2})\s+([\d\.]+,\d{2})\s+([\d\.]+,\d{2})/i; 
                let matchValores = regexValores.exec(bloco);
                if (matchValores) { 
                    valorTotal = parseFloat(matchValores[2].replace(/\./g, '').replace(',', '.')); 
                    comissao = parseFloat(matchValores[3].replace(/\./g, '').replace(',', '.')); 
                } else {
                    const regexFallback = /(\d{1,2},\d{2})\s+([\d\.]+,\d{2})\s+([\d\.]+,\d{2})\s+Médico/i; 
                    let matchFallback = regexFallback.exec(bloco);
                    if(matchFallback){ 
                        valorTotal = parseFloat(matchFallback[2].replace(/\./g, '').replace(',', '.')); 
                        comissao = parseFloat(matchFallback[3].replace(/\./g, '').replace(',', '.')); 
                    }
                }

                const regexVidas = /(?:\s+)(\d+)\s+(?:\d{1,2},\d{2}\s+)?(?:[\d\.]+,\d{2})\s+(?:[\d\.]+,\d{2})/i; 
                let matchVidas = regexVidas.exec(bloco);
                if (matchVidas) { 
                    vidasDetectadas = matchVidas[1]; 
                }

                if (valorTotal > 0) {
                    let inicioVigenciaDetectada = ""; 
                    const regexDataVigencia = /\b(\d{2}\/\d{2}\/\d{4})\b/; 
                    let matchVigencia = regexDataVigencia.exec(bloco);
                    if (matchVigencia) { 
                        const partes = matchVigencia[1].split('/'); 
                        inicioVigenciaDetectada = `${partes[2]}-${partes[1]}-${partes[0]}`; 
                    }

                    let vendedorDetectado = "Protetta"; 
                    let parcelaDetectada = "1";
                    let numeroEsperado = null;
                    const historicoVendasCliente = vendasList.filter(v => 
                        (v.cliente && v.cliente.toLowerCase() === nomeCliente.toLowerCase()) || 
                        (codCliente !== "N/D" && v.numero === codCliente)
                    );

                    if (historicoVendasCliente.length > 0) {
                        const ultimaVenda = historicoVendasCliente.sort((a,b) => new Date(b.dataVenda) - new Date(a.dataVenda))[0];
                        if (ultimaVenda.corretor && ultimaVenda.corretor !== "Todos") vendedorDetectado = ultimaVenda.corretor;
                        if (!inicioVigenciaDetectada && ultimaVenda.inicioVigencia) inicioVigenciaDetectada = ultimaVenda.inicioVigencia;
                        
                        if (ultimaVenda.parcela) { 
                            let numeroAtual = parseInt(ultimaVenda.parcela.toString().replace(/\D/g, '')); 
                            if (!isNaN(numeroAtual)) {
                                numeroEsperado = numeroAtual + 1;
                                parcelaDetectada = numeroEsperado.toString();
                            }
                        }
                    }

                    let dataRelatorioLocal = "01/2026"; // TODO: Should really parse from PDF report period
                    let calcParcela = calcularParcelaDaVigencia(inicioVigenciaDetectada, dataDeHojeInterna());
                    if (calcParcela) {
                        parcelaDetectada = calcParcela;
                        let numCalculado = parseInt(calcParcela);
                        if (numeroEsperado !== null && !isNaN(numCalculado) && numCalculado > numeroEsperado) {
                            alertasSequencia.push(`Cliente ${nomeCliente}: Pulo detectado! Esperava parcela ${numeroEsperado}, calculada ${calcParcela}.`);
                        }
                    }

                    novosRegistos.push({ 
                        cod: codRegistro, 
                        contrato: contratoDetectado, 
                        codigoOperadora: 'AMIL', 
                        vidas: vidasDetectadas,
                        cliente: nomeCliente, 
                        data: dataDeHojeInterna(), 
                        situacao: "FATURADO PROTETTA NF", 
                        loja: "PROTETTA", 
                        valorTotal, 
                        comissao, 
                        vendedor: vendedorDetectado, 
                        parcela: parcelaDetectada,
                        inicioVigencia: inicioVigenciaDetectada, 
                        notaFiscal: '', 
                        vitalicio: 'Não', 
                        assessoria: 'Protetta', 
                        formaPagamento: 'Crédito em conta',
                        servico: 'Plano de Saúde', 
                        desconto: '', 
                        selected: true
                    });
                }
            } catch (e) { 
                console.warn("Erro bloco:", e); 
            }
        }
        
        if(clientesParaInserir.length > 0) { 
            await supabase.from('clientes').insert(clientesParaInserir); 
            await loadFromDB(); 
        }
        setPdfData(novosRegistos); 
        if (alertasSequencia.length > 0) {
            showAlert(`Extrato processado!\n\nAVISO: Ocorreram os seguintes pulos de sequência:\n\n${alertasSequencia.join('\n')}`);
        } else {
            showAlert("Extrato processado com sucesso! Nomes limpos e parcelas calculadas.");
        }
    };

    const toggleSelectAll = (e) => {
        const isChecked = e.target.checked;
        setPdfData(pdfData.map(r => ({ ...r, selected: isChecked })));
    };

    const toggleSelectRow = (idx) => {
        setPdfData(pdfData.map((r, i) => i === idx ? { ...r, selected: !r.selected } : r));
    };

    const deleteSelectedRows = () => {
        const count = pdfData.filter(r => r.selected).length;
        if(count === 0) return showAlert("Nenhuma linha selecionada para apagar.");
        showConfirm(`Deseja apagar permanentemente as ${count} linhas selecionadas?`, () => {
            setPdfData(prev => prev.filter(r => !r.selected));
            setEditRowIndex(-1);
        });
    };

    const prepararEmissaoNfLote = () => {
        const selecionados = pdfData.filter(r => r.selected);
        if (selecionados.length === 0) return showAlert("Selecione pelo menos uma linha para gerar a Nota Fiscal.");
        
        const valorTotalComissao = selecionados.reduce((acc, l) => acc + (Number(l.comissao) || Number(l.valorTotal) || 0), 0);
        
        let descLote = "Referente a comissão / serviços prestados para: ";
        if (selecionados.length <= 5) {
            descLote += selecionados.map(l => l.cliente).join(", ") + ".";
        } else {
            descLote += selecionados.map(l => l.cliente).slice(0, 5).join(", ") + ` e mais ${selecionados.length - 5} contratos.`;
        }

        setNfeForm(prev => ({ 
            ...prev, 
            nome: selecionados.length === 1 ? selecionados[0].cliente : (selecionados[0].codigoOperadora || 'AMIL'), 
            valor: valorTotalComissao.toFixed(2), 
            desc: descLote 
        }));
        setCurrentView('nfe'); setNfeTab('emitir');
    };

    const prepararEmissaoNF = (linha) => {
        setNfeForm(prev => ({ 
            ...prev, 
            nome: linha.cliente, 
            valor: linha.valorTotal || linha.comissao, 
            desc: `Referente a comissão / serviços prestados para ${linha.cliente}.` 
        }));
        setCurrentView('nfe'); 
        setNfeTab('emitir'); 
    };

    const startEditingRow = (idx, linha) => { setEditRowIndex(idx); setEditRowData({...linha}); };
    const saveRowEdit = () => {
        const newData = [...pdfData];
        newData[editRowIndex] = { ...editRowData, valorTotal: parseFloat(editRowData.valorTotal) || 0, comissao: parseFloat(editRowData.comissao) || 0 };
        setPdfData(newData); setEditRowIndex(-1);
    };
    const cancelRowEdit = () => setEditRowIndex(-1);
    const deleteRowFromReport = (idx) => {
        showConfirm("Deseja apagar esta linha do relatório?", () => { setPdfData(prev => prev.filter((_, i) => i !== idx)); if (editRowIndex === idx) setEditRowIndex(-1); else if (editRowIndex > idx) setEditRowIndex(editRowIndex - 1); });
    };
    const addManualRow = () => {
        let currentMaxVendaCodigo = vendasList.reduce((max, v) => {
            let num = parseInt(v.numero, 10);
            return !isNaN(num) && num > max ? num : max;
        }, 0);
        let currentPdfMax = pdfData.reduce((max, v) => {
            let num = parseInt(v.cod, 10);
            return !isNaN(num) && num > max ? num : max;
        }, 0);
        let maxCod = Math.max(currentMaxVendaCodigo, currentPdfMax) + 1;

        const novaLinha = { 
            cod: String(maxCod).padStart(5, '0'), contrato: '', codigoOperadora: 'AMIL', vidas: '1',
            cliente: 'Novo Cliente', data: '', situacao: 'FATURADO PROTETTA NF', loja: 'PROTETTA', 
            valorTotal: 0, comissao: 0, vendedor: 'Protetta', parcela: '1', inicioVigencia: '', notaFiscal: '',
            vitalicio: 'Não', assessoria: 'Protetta', formaPagamento: 'Crédito em conta',
            servico: 'Plano de Saúde', desconto: '', selected: true 
        };
        const newData = [...pdfData, novaLinha]; setPdfData(newData); setEditRowIndex(newData.length - 1); setEditRowData(novaLinha);
    };

    const salvarRelatorioComissao = async () => {
        if(!reportName) return showAlert('Digite um nome para o relatório antes de salvar.');
        if(pdfData.length === 0) return showAlert('Não há dados para salvar.');
        
        const dadosParaSalvar = pdfData.filter(r => r.selected);
        if(dadosParaSalvar.length === 0) return showAlert('Não há linhas selecionadas para salvar.');

        const dataToSave = { 
            nome: reportName, periodo: reportPeriod, dataCriacao: new Date().toISOString(), 
            criadoPor: currentUser?.username || 'Sistema', 
            dados: dadosParaSalvar 
        };
        
        setLoading(true); setLoadingMsg("Guardando relatório na cloud...");
        try {
            if (currentReportId) await supabase.from('savedReports').update(dataToSave).eq('id', currentReportId);
            else { const { data } = await supabase.from('savedReports').insert([dataToSave]).select(); if(data) setCurrentReportId(data[0].id); }
            await loadFromDB(); setSuccessMsg("Relatório salvo com sucesso!"); setTimeout(() => setSuccessMsg(''), 3000);
        } catch(e) { showAlert('Erro ao salvar relatório: ' + e.message); } finally { setLoading(false); }
    };

    const carregarRelatorioSalvo = (report) => { setPdfData((report.dados || []).map(r => ({...r, selected: true}))); setReportName(report.nome); setReportPeriod(report.periodo || ''); setCurrentReportId(report.id); setCurrentView('processar'); };
    const apagarRelatorioSalvo = (id) => { showConfirm("ATENÇÃO: Tem certeza absoluta que deseja apagar permanentemente este relatório da nuvem e do cache local? Esta ação é totalmente irreversível e os dados serão perdidos.", async () => { setLoading(true); setLoadingMsg("A apagar..."); await supabase.from('savedReports').delete().eq('id', id); if(currentReportId === id) { setPdfData([]); setCurrentReportId(null); } await loadFromDB(); setLoading(false); }); };

    const buscarCep = async (cep) => {
        const cepLimpo = cep.replace(/\D/g, '');
        if (cepLimpo.length === 8) {
            try { const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`); const data = await response.json(); if (!data.erro) { setNfeForm(prev => ({ ...prev, logradouro: data.logradouro, bairro: data.bairro, cidade: data.localidade, uf: data.uf })); } } catch (e) {}
        }
    };

    const buscarCepCliente = async (cep) => {
        const cepLimpo = cep.replace(/\D/g, '');
        if (cepLimpo.length === 8) {
            try { const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`); const data = await response.json(); if (!data.erro) { setClienteForm(prev => ({ ...prev, logradouro: data.logradouro, bairro: data.bairro, cidade: data.localidade, uf: data.uf })); } } catch (e) {}
        }
    };

    const enviarNota = async () => {
        const { dataEmissao, cep, logradouro, numero, bairro, cidade, uf } = nfeForm;
        
        if (dataEmissao) {
            const dateObj = new Date(dataEmissao + "T12:00:00");
            const today = new Date();
            const currentYear = today.getFullYear();
            
            if (dateObj > today) {
                return showAlert("A Data de Competência não pode ser uma data futura.");
            }
            if (dateObj.getFullYear() < currentYear) {
                return showAlert(`A Data de Competência não pode ser anterior ao ano atual (${currentYear}).`);
            }
        }

        if (!cep?.trim() || !logradouro?.trim() || !numero?.trim() || !bairro?.trim() || !cidade?.trim() || !uf?.trim()) {
            return showAlert("Por favor, preencha todos os campos do endereço do tomador (CEP, Logradouro, Número, Bairro, Cidade, UF).");
        }
        
        const cepNumeros = cep.replace(/[^\d]/g, '');
        if (cepNumeros.length !== 8) {
            return showAlert("CEP inválido. O CEP deve conter 8 dígitos.");
        }

        if (!nfeForm.cnpj || !nfeForm.valor) {
            return showAlert("Por favor, preencha pelo menos o CNPJ e o Valor para emitir a NF.");
        }
        
        const docNumeros = nfeForm.cnpj.replace(/[^\d]/g, '');
        if (docNumeros.length !== 11 && docNumeros.length !== 14) {
             return showAlert("CPF / CNPJ com tamanho inválido. Preencha corretamente (11 dígitos para CPF ou 14 para CNPJ).");
        }
        
        if (!validarCpfCnpj(docNumeros)) {
            return showAlert("CPF / CNPJ inválido. Por favor verifique os dígitos digitados.");
        }
        
        setIsEmitting(true);
        try {
            const resposta = await fetch('http://127.0.0.1:5000/emitir', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nfeForm) })
                .catch(() => new Promise(resolve => setTimeout(() => resolve({ ok: true, json: () => ({ protocolo: 'RIO-' + Math.floor(Math.random()*100000) }) }), 2000)));
            if (!resposta.ok) throw new Error("Erro no servidor da prefeitura."); 
            const resultado = await resposta.json();
            
            const novaNF = { id: Date.now(), cliente: nfeForm.nome, valor: nfeForm.valor, data: new Date().toISOString(), protocolo: resultado.protocolo, status: 'Emitida' };
            setNfeHistorico(prev => [novaNF, ...prev]);

            showAlert(`Nota transmitida com Sucesso!\nProtocolo da Prefeitura: ${resultado.protocolo}`);
        } catch (erro) { showAlert(`> ERRO CRÍTICO: ${erro.message}`); } finally { setIsEmitting(false); }
    };

    const exportarNotasHistory = () => {
        if(nfeHistorico.length === 0) return showAlert("Não há notas para exportar.");
        const ws = XLSX.utils.json_to_sheet(nfeHistorico.map(nf => ({
            "ID": nf.id,
            "Cliente": nf.cliente,
            "Valor (R$)": nf.valor,
            "Data Emissão": formatarDataVisivel(nf.data),
            "Protocolo": nf.protocolo,
            "Chave ADN": nf.chaveNacional || '',
            "Status": nf.status,
            "Código NBS": nf.codigoNbs || '',
            "Trib.": nf.codTributNacional || ''
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Notas Fiscais");
        XLSX.writeFile(wb, `NotasFiscais_Exportadas_${dataDeHojeInterna()}.xlsx`);
    };

    const importarNotasHistory = async (event) => {
        const file = event.target.files[0]; if (!file) return;
        setLoading(true); setLoadingMsg("Lendo ficheiro de notas...");
        try {
            const data = await file.arrayBuffer(); 
            const workbook = XLSX.read(data); 
            const linhasExcel = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            
            let importadas = [];
            linhasExcel.forEach(linha => {
                if(linha['Cliente'] && linha['Valor (R$)']) {
                    importadas.push({
                        id: linha['ID'] || Date.now() + Math.random(),
                        cliente: linha['Cliente'],
                        valor: linha['Valor (R$)'],
                        data: new Date().toISOString(), // Fallback
                        protocolo: linha['Protocolo'] || '',
                        chaveNacional: linha['Chave ADN'] || '',
                        status: linha['Status'] || 'Importada',
                        codigoNbs: linha['Código NBS'] || '',
                        codTributNacional: linha['Trib.'] || ''
                    });
                }
            });
            
            if(importadas.length > 0) {
                setNfeHistorico(prev => [...importadas, ...prev]);
                showAlert(`${importadas.length} notas importadas com sucesso!`);
                setNfeTab('historico');
            } else {
                showAlert("Nenhuma nota válida encontrada no ficheiro.");
            }
        } catch (err) { showAlert("Erro ao importar notas: " + err.message); } finally { setLoading(false); event.target.value = ''; }
    };

    const savePrintPreset = async () => {
        if (!newPresetName.trim()) return showAlert("Digite um nome para a seleção.");
        setLoading(true); setLoadingMsg("Guardando seleção na Cloud...");
        try {
            const newPreset = { name: newPresetName, cols: printCols };
            const { data, error } = await supabase.from('print_presets').insert([newPreset]).select();
            if (error) throw error;
            if (data && data.length > 0) {
                setPrintPresets(prev => [...prev.filter(p => p.name !== newPresetName), data[0]]);
                setSelectedPreset(data[0].id || data[0].name);
                showAlert("Seleção guardada com sucesso no Banco de Dados!");
            }
        } catch (err) {
            console.warn("Tabela print_presets ausente, usando cache local:", err);
            const newLocalPreset = { id: Date.now().toString(), name: newPresetName, cols: printCols };
            const updated = [...printPresets.filter(p => p.name !== newPresetName), newLocalPreset];
            setPrintPresets(updated);
            localStorage.setItem('protetta_print_presets', JSON.stringify(updated));
            setSelectedPreset(newLocalPreset.id);
            showAlert("Seleção guardada no seu computador.");
        } finally {
            setLoading(false); setNewPresetName('');
        }
    };

    const applyPrintPreset = (idOrName) => {
        setSelectedPreset(idOrName);
        if (!idOrName) { setPrintCols(defaultPrintCols); return; }
        const preset = printPresets.find(p => String(p.id) === String(idOrName) || p.name === idOrName);
        if (preset) setPrintCols(preset.cols);
    };

    const deletePrintPreset = async (idOrName) => {
        setLoading(true); setLoadingMsg("Apagando...");
        try {
            const isLocal = printPresets.find(p => String(p.id) === String(idOrName) || p.name === idOrName)?.id?.toString().length > 10;
            if (!isLocal && supabase) await supabase.from('print_presets').delete().eq('id', idOrName);
            
            const updated = printPresets.filter(p => String(p.id) !== String(idOrName) && p.name !== idOrName);
            setPrintPresets(updated); localStorage.setItem('protetta_print_presets', JSON.stringify(updated));
            
            if (selectedPreset === idOrName) { setSelectedPreset(''); setPrintCols(defaultPrintCols); }
        } catch(e) { showAlert("Erro ao apagar: " + e.message); } finally { setLoading(false); }
    };

    const handlePrintConfirm = () => {
        const selectedRows = pdfData.filter(r => r.selected);
        const dataToPrint = selectedRows.length > 0 ? selectedRows : pdfData;

        let tableHeader = '<table>';
        Object.keys(printColLabels).forEach(key => {
            if (printCols[key]) tableHeader += `<th>${printColLabels[key]}</th>`;
        });
        tableHeader += '</tr>';

        let tableRows = '';
        dataToPrint.forEach(linha => {
            tableRows += '<tr>';
            if (printCols.cod) tableRows += `<td>${linha.cod || '-'}</td>`;
            if (printCols.contrato) tableRows += `<td>${linha.contrato || '-'}</td>`;
            if (printCols.op) tableRows += `<td>${linha.codigoOperadora || 'AMIL'}</td>`;
            if (printCols.vidas) tableRows += `<td>${linha.vidas || '-'}</td>`;
            if (printCols.cliente) tableRows += `<td>${linha.cliente || '-'}</td>`;
            if (printCols.data) tableRows += `<td>${linha.data || '-'}</td>`;
            if (printCols.loja) tableRows += `<td>${linha.loja || '-'}</td>`;
            if (printCols.servico) tableRows += `<td>${linha.servico || '-'}</td>`;
            if (printCols.desconto) tableRows += `<td>${linha.desconto || '-'}</td>`;
            if (printCols.corretor) tableRows += `<td>${linha.vendedor || '-'}</td>`;
            if (printCols.parc) tableRows += `<td>${linha.parcela || '-'}</td>`;
            if (printCols.inicioVig) tableRows += `<td>${linha.inicioVigencia ? formatarDataVisivel(linha.inicioVigencia) : '--/--/----'}</td>`;
            if (printCols.nfe) tableRows += `<td>${linha.notaFiscal || '-'}</td>`;
            if (printCols.vitalicio) tableRows += `<td>${linha.vitalicio || '-'}</td>`;
            if (printCols.pagamento) tableRows += `<td>${linha.formaPagamento || '-'}</td>`;
            if (printCols.valorTotal) tableRows += `<td style="text-align: right;">${formatarMoeda(linha.valorTotal)}</td>`;
            if (printCols.comissao) tableRows += `<td style="text-align: right;">${formatarMoeda(linha.comissao)}</td>`;
            tableRows += '</tr>';
        });

        const visibleColCount = Object.values(printCols).filter(Boolean).length;
        let valTotVisible = printCols.valorTotal;
        let comVisible = printCols.comissao;
        
        let spanCount = visibleColCount;
        if (valTotVisible) spanCount--;
        if (comVisible) spanCount--;

        let footerCells = `<td colspan="${Math.max(1, spanCount)}" style="text-align: right; font-weight: bold;">TOTAIS APURADOS</td>`;
        if (valTotVisible) footerCells += `<td style="font-weight: bold; text-align: right; color: #059669;">${formatarMoeda(dataToPrint.reduce((acc, l)=>acc+(Number(l.valorTotal)||0), 0))}</td>`;
        if (comVisible) footerCells += `<td style="font-weight: bold; text-align: right; color: #0284c7; font-size: 12px;">${formatarMoeda(dataToPrint.reduce((acc, l)=>acc+(Number(l.comissao)||0), 0))}</td>`;

        let tableFooter = `<tr>${footerCells}</tr>`;

        const htmlContent = `
            <div id="print-header">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <div style="width: 32px; height: 32px; background: #d1fae5; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #059669; border: 1px solid #10b981;">D</div>
                    <h2 style="margin: 0; font-size: 20px;">Relatório de comissão de vendedores</h2>
                </div>
                <p style="margin: 4px 0; color: #475569;">Período: ${reportPeriod || 'Não especificado'}</p>
                <p style="margin: 4px 0; color: #475569;">Gerado em ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT')} por ${currentUser?.username || 'Sistema'}</p>
            </div>
            <table>
                <thead>${tableHeader}</thead>
                <tbody>${tableRows}</tbody>
                <tfoot>${tableFooter}</tfoot>
            </table>
        `;

        const printIframe = document.createElement('iframe');
        printIframe.name = "print_iframe";
        printIframe.style.position = 'absolute';
        printIframe.style.top = '-10000px';
        document.body.appendChild(printIframe);
        
        const printDoc = printIframe.contentWindow.document;
        printDoc.open();
        printDoc.write(`
            <!DOCTYPE html><html lang="pt-PT"><head><title>Relatório de Comissão</title>
                <style>
                    @page { size: ${printConfig.orientation}; margin: 10mm; }
                    body { background-color: white !important; color: black !important; font-family: ui-sans-serif, system-ui, sans-serif; padding: 20px; }
                    #print-header { margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; }
                    .print-wrapper { transform: scale(${printConfig.scale / 100}); transform-origin: top left; width: ${100 / (printConfig.scale / 100)}%; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
                    th, td { border: 1px solid #94a3b8 !important; color: black !important; padding: 6px 8px; text-align: center; }
                    th { background-color: #f1f5f9 !important; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                </style>
            </head><body><div class="print-wrapper">${htmlContent}</div></body></html>
        `);
        printDoc.close();

        setTimeout(() => {
            printIframe.contentWindow.focus();
            printIframe.contentWindow.print();
            setModalPrintOpen(false);
            setTimeout(() => document.body.removeChild(printIframe), 1000);
        }, 500);
    };

    return (
        <div className="flex h-[100dvh] w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-200">
            
            {/* ALERTS E LOADING */}
            {alertDialog.isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4 border-l-4 border-rose-500 shadow-rose-500/20">
                        <h3 className="text-xl font-black mb-3 text-rose-600 dark:text-rose-500 flex items-center"><AlertCircle className="mr-2 text-rose-600"/> ATENÇÃO</h3>
                        <p className="text-sm text-slate-700 dark:text-slate-300 mb-6 whitespace-pre-wrap">{alertDialog.message}</p>
                        <div className="flex justify-end"><button onClick={() => setAlertDialog({ isOpen: false, message: '' })} className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-2 rounded-lg font-bold transition-colors">OK</button></div>
                    </div>
                </div>
            )}

            {confirmDialog.isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4 border-l-4 border-rose-500 shadow-rose-500/20">
                        <h3 className="text-xl font-black mb-3 text-rose-600 dark:text-rose-500 flex items-center"><AlertCircle className="mr-2 text-rose-600"/> ATENÇÃO</h3>
                        <p className="text-sm text-slate-700 dark:text-slate-300 mb-6 whitespace-pre-wrap">{confirmDialog.message}</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setConfirmDialog({ isOpen: false, message: '', onConfirm: null })} className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Cancelar</button>
                            <button onClick={() => { if(confirmDialog.onConfirm) confirmDialog.onConfirm(); setConfirmDialog({ isOpen: false, message: '', onConfirm: null }); }} className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-2 rounded-lg font-bold transition-colors shadow-lg">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}

            {loading && (
                <div className="fixed inset-0 z-[60] bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-800 dark:text-white font-medium animate-pulse">{loadingMsg}</p>
                </div>
            )}

            <Sidebar 
                currentUser={currentUser}
                currentView={currentView}
                setCurrentView={setCurrentView}
                hasAccess={hasAccess}
                isDarkMode={isDarkMode}
                setIsDarkMode={setIsDarkMode}
                handleLogout={handleLogout}
            />

            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 p-4 md:p-8 relative transition-colors duration-200">
                
                {/* ECRÃ 11: INCONSISTÊNCIAS DE PARCELAS */}
                {currentView === 'inconsistencias' && hasAccess('vendas') && (
                    <div className="max-w-5xl mx-auto animate-in slide-in-from-right-4 duration-500 pb-20">
                        <header className="mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center"><AlertTriangle className="mr-3 text-amber-500"/> Painel de Inconsistências</h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">Registo de quebras na sequência de parcelas confirmadas durante a inserção de vendas.</p>
                        </header>
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden transition-colors duration-200">
                            {(() => {
                                const groups = {};
                                vendasList.filter(v => {
                                    const dv = v.dataVenda || v.dataCadastro || '';
                                    return dv >= '2026-01-01' && dv <= dataDeHojeInterna();
                                }).forEach(v => {
                                    const key = v.contrato || v.cliente;
                                    if (!key || !v.parcela) return;
                                    const match = v.parcela.toString().match(/\d+/);
                                    if (match) {
                                        const num = parseInt(match[0], 10);
                                        if (!groups[key]) groups[key] = { cliente: v.cliente, contrato: v.contrato, parcelas: [] };
                                        groups[key].parcelas.push(num);
                                    }
                                });
                                const inconsistencias = [];
                                Object.keys(groups).forEach(key => {
                                    const { cliente, contrato, parcelas } = groups[key];
                                    const uniqueParcelas = [...new Set(parcelas)].sort((a,b) => a-b);
                                    if (uniqueParcelas.length === 0) return;
                                    const max = uniqueParcelas[uniqueParcelas.length - 1];
                                    const missing = [];
                                    for (let i = 1; i < max; i++) {
                                        if (!uniqueParcelas.includes(i)) missing.push(i);
                                    }
                                    if (missing.length > 0) {
                                        inconsistencias.push({ cliente, contrato, faltantes: missing });
                                    }
                                });

                                if (inconsistencias.length === 0) {
                                    return <div className="p-12 text-center text-slate-500 italic"><CheckCircle size={48} className="mx-auto text-emerald-500 mb-4 opacity-50"/>Tudo certo! Nenhuma inconsistência ou salto de parcela detectado.</div>;
                                }

                                return (
                                    <table className="w-full text-left border-collapse text-sm">
                                        <thead>
                                            <tr className="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750/50">
                                                <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Cliente</th>
                                                <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-center">Contrato</th>
                                                <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-center text-rose-600 dark:text-rose-400">Parcelas Faltantes</th>
                                                <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-center w-24">Ação</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {inconsistencias.map((inc, i) => (
                                                <tr key={i} className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-750/50 transition-colors">
                                                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{inc.cliente}</td>
                                                    <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400 font-mono">{inc.contrato || '-'}</td>
                                                    <td className="py-3 px-4 text-center font-bold text-rose-500 dark:text-rose-400">
                                                        <div className="flex flex-wrap gap-1 justify-center">
                                                            {inc.faltantes.map(f => <span key={f} className="bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded text-xs">P: {f}</span>)}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        <button 
                                                            onClick={async () => {
                                                                const vFiltersToUse = { ...defaultVendasFilters, cliente: inc.contrato ? '' : inc.cliente, contrato: inc.contrato || '' };
                                                                setVendasFilterForm(vFiltersToUse);
                                                                setShowVendasFilter(true);
                                                                setAppliedVendasFilters(vFiltersToUse);
                                                                setCurrentView('vendas');
                                                            }} 
                                                            className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded transition-colors"
                                                        >Ver Vendas</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                );
                            })()}
                        </div>
                    </div>
                )}
                
                {/* NOVO DASHBOARD */}
                {currentView === 'dashboard' && hasAccess('dashboard') && (
                    <DashboardControle vendasList={vendasList} />
                )}

                {/* ECRÃ 12: PAINEL DE CONTROLE (ANTIGO DASHBOARD) */}
                {currentView === 'painel' && hasAccess('dashboard') && (
                    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
                        <header><h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Visão Geral</h2></header>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg flex flex-col justify-between transition-colors duration-200">
                                <div className="flex justify-between items-start mb-4">
                                    <div><h3 className="text-slate-500 dark:text-slate-400 font-medium">Clientes na Base</h3><p className="text-4xl font-bold text-slate-900 dark:text-white mt-1">{clientes.length}</p></div>
                                    <div className="bg-emerald-100 dark:bg-emerald-500/20 p-3 rounded-lg"><Users size={24} className="text-emerald-600 dark:text-emerald-400"/></div>
                                </div>
                                {hasAccess('clientes') && <button onClick={()=>setCurrentView('clientes')} className="text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 flex items-center">Gerir Clientes <ChevronRight size={16}/></button>}
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg flex flex-col justify-between transition-colors duration-200">
                                <div className="flex justify-between items-start mb-4">
                                    <div><h3 className="text-slate-500 dark:text-slate-400 font-medium">Extratos Arquivados</h3><p className="text-4xl font-bold text-slate-900 dark:text-white mt-1">{dbReports.length}</p></div>
                                    <div className="bg-blue-100 dark:bg-blue-500/20 p-3 rounded-lg"><FileText size={24} className="text-blue-600 dark:text-blue-400"/></div>
                                </div>
                                {hasAccess('gestor') && <button onClick={()=>setCurrentView('gestor-browse')} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-500 flex items-center">Explorar Gestor <ChevronRight size={16}/></button>}
                            </div>
                            <div className="bg-gradient-to-br from-indigo-600 to-blue-800 p-6 rounded-xl shadow-lg text-white flex flex-col justify-center">
                                <h3 className="font-bold mb-3 text-lg">Acesso Rápido</h3>
                                <div className="space-y-2">
                                    {hasAccess('vendas') && <button onClick={() => setCurrentView('vendas')} className="w-full bg-white/20 hover:bg-white/30 text-white py-2 rounded-lg font-bold transition-colors text-sm flex items-center justify-center"><ShoppingCart size={16} className="mr-2"/> Painel de Vendas</button>}
                                    {hasAccess('processar') && <button onClick={() => setCurrentView('processar')} className="w-full bg-black/20 hover:bg-black/30 text-white py-2 rounded-lg font-bold transition-colors text-sm flex items-center justify-center"><Upload size={16} className="mr-2"/> Relatórios de Comissão</button>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ECRÃ 2: VENDAS */}
                {currentView === 'vendas' && hasAccess('vendas') && (
                    <div className="w-full mx-auto animate-in fade-in duration-500 pb-20">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center"><ShoppingCart size={28} className="mr-3 text-emerald-500"/> Vendas de serviços</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1"><span className="font-bold text-slate-700 dark:text-slate-300"><Home size={14} className="inline mr-1 mb-0.5"/>Início</span> &gt; Vendas de serviços &gt; Listar</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 mb-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm transition-colors duration-200">
                            <div className="flex gap-2 w-full md:w-auto relative">
                                <button onClick={() => abrirModalVenda()} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-sm font-bold flex items-center shadow-md transition-colors"><Plus size={16} className="mr-2"/> Adicionar</button>
                                <div className="relative vendas-acoes-menu">
                                    <button onClick={() => setShowVendasAcoesMenu(!showVendasAcoesMenu)} className="bg-slate-900 dark:bg-black hover:bg-slate-800 text-white px-4 py-2 rounded text-sm font-bold flex items-center transition-colors border border-slate-700 shadow-md">
                                        <Settings size={16} className="mr-2"/> Mais ações <ChevronDown size={16} className="ml-2"/>
                                    </button>
                                    {showVendasAcoesMenu && (
                                        <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg overflow-hidden text-sm z-50 animate-in fade-in slide-in-from-top-2">
                                            <button onClick={exportarVendasParaExcel} className="w-full text-left px-4 py-3 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-700 dark:text-slate-300 font-medium flex items-center transition-colors">
                                                <FileOutput size={16} className="mr-2"/> Exportar para Excel
                                            </button>
                                            <button onClick={() => { setCurrentView('inconsistencias'); setShowVendasAcoesMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-600 dark:hover:text-amber-400 text-slate-700 dark:text-slate-300 font-medium flex items-center transition-colors border-t border-slate-100 dark:border-slate-700">
                                                <AlertTriangle size={16} className="mr-2"/> Painel de Inconsistências
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="relative">
                                    <button onClick={() => setShowVendasColsMenu(!showVendasColsMenu)} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 px-3 py-2 rounded text-slate-600 dark:text-slate-200 transition-colors" title="Colunas">
                                        <Layers size={18} />
                                    </button>
                                    {showVendasColsMenu && (
                                        <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg overflow-hidden text-sm z-50 animate-in fade-in slide-in-from-top-2 p-3">
                                            <div className="flex justify-between items-center mb-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                                                <span className="font-bold text-slate-700 dark:text-slate-200">Visibilidade das Colunas</span>
                                            </div>
                                            <div className="flex gap-2 mb-3">
                                                <button onClick={() => setAllVendasCols(true)} className="flex-1 text-xs py-1 px-2 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Marcar Todas</button>
                                                <button onClick={() => setAllVendasCols(false)} className="flex-1 text-xs py-1 px-2 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Desmarcar Todas</button>
                                            </div>
                                            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                                                {Object.keys(vendasColLabels).map(key => (
                                                    <label key={key} className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={vendasTableCols[key]} 
                                                            onChange={() => toggleVendasCol(key)}
                                                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                                                        />
                                                        <span className="text-slate-700 dark:text-slate-300">{vendasColLabels[key]}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex w-full md:w-auto gap-2">
                                <div className="relative z-30 vendas-period-menu">
                                    <button onClick={() => setShowVendasPeriodMenu(!showVendasPeriodMenu)} className="bg-slate-900 dark:bg-black text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center transition-colors shadow-md border border-slate-700 h-full">
                                        {displayPeriodLabel} <ChevronDown size={14} className="ml-2"/>
                                    </button>
                                    {showVendasPeriodMenu && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg overflow-hidden text-sm z-50 animate-in fade-in slide-in-from-top-2">
                                            <ul className="flex flex-col py-1">
                                                {['Hoje', 'Esta semana', 'Mês passado', 'Este mês', 'Próximo mês', 'Todo o período', 'Escolha o período'].map(preset => (
                                                    <li key={preset}><button onClick={() => applyDatePreset(preset)} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors font-medium">{preset}</button></li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => setShowVendasFilter(!showVendasFilter)} className={`px-4 py-2 border rounded-lg text-sm font-bold flex items-center transition-colors ${showVendasFilter ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white border-slate-300 dark:border-slate-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
                                    <Search size={16} className="mr-2"/> Busca avançada
                                </button>
                            </div>
                        </div>
                        {showVendasFilter && (
                            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => { if(e.target === e.currentTarget) setShowVendasFilter(false); }}>
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl relative w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
                                    <button onClick={() => setShowVendasFilter(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"><X size={20}/></button>
                                    <h3 className="text-xl font-bold mb-6 text-slate-800 dark:text-white flex items-center"><Search className="mr-2"/> Busca Avançada de Vendas</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                                    {/* Loja */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Loja</label>
                                        <select 
                                            value={vendasFilterForm.loja} 
                                            onChange={e => setVendasFilterForm({...vendasFilterForm, loja: e.target.value})} 
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                                        >
                                            <option value="Todos">Todos</option>
                                            <option value="PROTETTA SEGUROS">PROTETTA SEGUROS</option>
                                            <option value="PROTETTA">PROTETTA</option>
                                        </select>
                                    </div>

                                    {/* Código (Registo) */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Código (Registo)</label>
                                        <input 
                                            type="text" 
                                            value={vendasFilterForm.codigo} 
                                            onChange={e => setVendasFilterForm({...vendasFilterForm, codigo: e.target.value})} 
                                            placeholder="Código do registo"
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500" 
                                        />
                                    </div>

                                    {/* Data de venda */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Data de venda</label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="date" 
                                                value={vendasFilterForm.dataInicio} 
                                                onChange={e => setVendasFilterForm({...vendasFilterForm, dataInicio: e.target.value})} 
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500" 
                                                placeholder="dd/mm/aaaa"
                                            />
                                            <span className="text-slate-400 font-medium">até</span>
                                            <input 
                                                type="date" 
                                                value={vendasFilterForm.dataFim} 
                                                onChange={e => setVendasFilterForm({...vendasFilterForm, dataFim: e.target.value})} 
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500" 
                                                placeholder="dd/mm/aaaa"
                                            />
                                        </div>
                                    </div>

                                    {/* Situação */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Situação</label>
                                        <select 
                                            value={vendasFilterForm.situacao} 
                                            onChange={e => setVendasFilterForm({...vendasFilterForm, situacao: e.target.value})} 
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                                        >
                                            <option value="Todos">Todos</option>
                                            <option value="FATURADO PROTETTA NF">FATURADO PROTETTA NF</option>
                                            <option value="PENDENTE">PENDENTE</option>
                                            <option value="CANCELADO">CANCELADO</option>
                                        </select>
                                    </div>

                                    {/* Cliente */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Cliente</label>
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    placeholder="Nome do cliente..." 
                                                    value={vendasFilterForm.cliente} 
                                                    onChange={e => { setVendasFilterForm({...vendasFilterForm, cliente: e.target.value}); setShowFilterClienteSuggestions(true); }} 
                                                    onFocus={() => setShowFilterClienteSuggestions(true)}
                                                    onBlur={(e) => { if (!e.relatedTarget) setTimeout(() => setShowFilterClienteSuggestions(false), 200); }}
                                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 pr-8" 
                                                />
                                                {showFilterClienteSuggestions && vendasFilterForm.cliente && (
                                                    <ul className="absolute z-10 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg max-h-48 overflow-y-auto shadow-lg mt-1">
                                                        {clientes.filter(c => c.nome.toLowerCase().includes(vendasFilterForm.cliente.toLowerCase())).map(c => (
                                                            <li key={c.id} className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 last:border-0" onMouseDown={() => {
                                                                setVendasFilterForm({...vendasFilterForm, cliente: c.nome});
                                                                setShowFilterClienteSuggestions(false);
                                                            }}>
                                                                <div className="font-bold">{c.nome}</div>
                                                                {c.documento && <div className="text-xs text-slate-500 dark:text-slate-400">{c.documento}</div>}
                                                            </li>
                                                        ))}
                                                        {clientes.filter(c => c.nome.toLowerCase().includes(vendasFilterForm.cliente.toLowerCase())).length === 0 && (
                                                            <li className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm italic text-center">Nenhum cliente encontrado</li>
                                                        )}
                                                    </ul>
                                                )}
                                                {vendasFilterForm.cliente && (
                                                    <Trash2 
                                                        size={16} 
                                                        onClick={() => setVendasFilterForm({...vendasFilterForm, cliente: ''})} 
                                                        className="absolute right-3 top-2.5 text-slate-400 cursor-pointer hover:text-rose-500 transition-colors" 
                                                    />
                                                )}
                                            </div>
                                    </div>

                                    {/* Contrato */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Contrato</label>
                                        <input 
                                            type="text" 
                                            value={vendasFilterForm.contrato} 
                                            onChange={e => setVendasFilterForm({...vendasFilterForm, contrato: e.target.value})} 
                                            placeholder="Número do contrato"
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500" 
                                        />
                                    </div>

                                    {/* Código Operadora */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Código Operadora</label>
                                        <input 
                                            type="text" 
                                            value={vendasFilterForm.codigoOperadora} 
                                            onChange={e => setVendasFilterForm({...vendasFilterForm, codigoOperadora: e.target.value})} 
                                            placeholder="Ex: AMIL, Bradesco..."
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500" 
                                        />
                                    </div>

                                    {/* Nº Vidas */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">N. vidas</label>
                                        <input 
                                            type="number" 
                                            value={vendasFilterForm.vidas} 
                                            onChange={e => setVendasFilterForm({...vendasFilterForm, vidas: e.target.value})} 
                                            placeholder="Quantidade de vidas"
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500" 
                                        />
                                    </div>

                                    {/* Vitalício */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Vitalício</label>
                                        <select 
                                            value={vendasFilterForm.vitalicio} 
                                            onChange={e => setVendasFilterForm({...vendasFilterForm, vitalicio: e.target.value})} 
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                                        >
                                            <option value="Selecione">Selecione</option>
                                            <option value="Sim">Sim</option>
                                            <option value="Não">Não</option>
                                        </select>
                                    </div>

                                    {/* Corretor */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Corretor</label>
                                        <select 
                                            value={vendasFilterForm.corretor} 
                                            onChange={e => setVendasFilterForm({...vendasFilterForm, corretor: e.target.value})} 
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                                        >
                                            <option value="Todos">Todos</option>
                                            <option value="Protetta">Protetta</option>
                                            <option value="Proper">Proper</option>
                                            <option value="Assessoria">Assessoria</option>
                                            <option value="Corretor Interno">Corretor Interno</option>
                                        </select>
                                    </div>

                                    {/* Parcela */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Parcela</label>
                                        <input 
                                            type="text" 
                                            value={vendasFilterForm.parcela} 
                                            onChange={e => setVendasFilterForm({...vendasFilterForm, parcela: e.target.value})} 
                                            placeholder="Número da parcela"
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500" 
                                        />
                                    </div>

                                    {/* Início Vigência */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Início Vigência</label>
                                        <input 
                                            type="date" 
                                            value={vendasFilterForm.inicioVigencia} 
                                            onChange={e => setVendasFilterForm({...vendasFilterForm, inicioVigencia: e.target.value})} 
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500" 
                                        />
                                    </div>

                                    {/* Nota Fiscal */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Nota Fiscal</label>
                                        <input 
                                            type="text" 
                                            value={vendasFilterForm.notaFiscal} 
                                            onChange={e => setVendasFilterForm({...vendasFilterForm, notaFiscal: e.target.value})} 
                                            placeholder="Número da NF"
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500" 
                                        />
                                    </div>
                                </div>

                                {/* Botões */}
                                <div className="flex gap-3 mt-6 border-t border-slate-200 dark:border-slate-700 pt-4">
                                    <button 
                                        onClick={() => { handleBuscarVendas(); setShowVendasFilter(false); }} 
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center shadow transition-colors"
                                    >
                                        <CheckCircle size={16} className="mr-2"/> Aplicar Filtros
                                    </button>
                                    <button 
                                        onClick={() => { handleLimparVendas(); setShowVendasFilter(false); }} 
                                        className="bg-rose-500 hover:bg-rose-400 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center shadow transition-colors"
                                    >
                                        <X size={16} className="mr-2"/> Limpar
                                    </button>
                                </div>
                                </div>
                            </div>
                        )}
                        <div className="-mx-4 md:mx-0 bg-white dark:bg-slate-800 border-y md:border border-slate-200 dark:border-slate-700 md:rounded-lg shadow-sm overflow-x-auto transition-colors duration-200">
                            <table className="w-full text-left border-collapse text-sm whitespace-nowrap min-w-max">
                                <thead>
                                    <tr className="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750/50 transition-colors duration-200">
                                        {vendasTableCols.numero && (
                                            <th onClick={() => handleSortVendas('numero')} className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 w-24">
                                                Registo {getSortIcon('numero')}
                                            </th>
                                        )}
                                        {vendasTableCols.contrato && (
                                            <th onClick={() => handleSortVendas('contrato')} className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                                                Contrato {getSortIcon('contrato')}
                                            </th>
                                        )}
                                        {vendasTableCols.codigoOperadora && (
                                            <th onClick={() => handleSortVendas('codigoOperadora')} className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                                                Operadora {getSortIcon('codigoOperadora')}
                                            </th>
                                        )}
                                        {vendasTableCols.vidas && (
                                            <th onClick={() => handleSortVendas('vidas')} className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                                                Vidas {getSortIcon('vidas')}
                                            </th>
                                        )}
                                        {vendasTableCols.cliente && (
                                            <th onClick={() => handleSortVendas('cliente')} className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                                                Cliente {getSortIcon('cliente')}
                                            </th>
                                        )}
                                        {vendasTableCols.dataVenda && (
                                            <th onClick={() => handleSortVendas('dataVenda')} className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 w-32">
                                                Data {getSortIcon('dataVenda')}
                                            </th>
                                        )}
                                        {vendasTableCols.loja && (
                                            <th onClick={() => handleSortVendas('loja')} className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                                                Loja {getSortIcon('loja')}
                                            </th>
                                        )}
                                        {vendasTableCols.servico && (
                                            <th onClick={() => handleSortVendas('servico')} className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                                                Serviço {getSortIcon('servico')}
                                            </th>
                                        )}
                                        {vendasTableCols.corretor && (
                                            <th onClick={() => handleSortVendas('corretor')} className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                                                Corretor {getSortIcon('corretor')}
                                            </th>
                                        )}
                                        {vendasTableCols.situacao && (
                                            <th onClick={() => handleSortVendas('situacao')} className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 text-center w-48">
                                                Situação {getSortIcon('situacao')}
                                            </th>
                                        )}
                                        {vendasTableCols.valor && (
                                            <th onClick={() => handleSortVendas('valor')} className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 w-32 text-right">
                                                Valor {getSortIcon('valor')}
                                            </th>
                                        )}
                                        {vendasTableCols.parcela && (
                                            <th onClick={() => handleSortVendas('parcela')} className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                                                Parcela {getSortIcon('parcela')}
                                            </th>
                                        )}
                                        {vendasTableCols.inicioVigencia && (
                                            <th onClick={() => handleSortVendas('inicioVigencia')} className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                                                Início Vigência {getSortIcon('inicioVigencia')}
                                            </th>
                                        )}
                                        {vendasTableCols.notaFiscal && (
                                            <th onClick={() => handleSortVendas('notaFiscal')} className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                                                NF {getSortIcon('notaFiscal')}
                                            </th>
                                        )}
                                        {vendasTableCols.vitalicio && (
                                            <th onClick={() => handleSortVendas('vitalicio')} className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                                                Vitalício {getSortIcon('vitalicio')}
                                            </th>
                                        )}
                                        {vendasTableCols.assessoria && (
                                            <th onClick={() => handleSortVendas('assessoria')} className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                                                Assessoria {getSortIcon('assessoria')}
                                            </th>
                                        )}
                                        {vendasTableCols.formaPagamento && (
                                            <th onClick={() => handleSortVendas('formaPagamento')} className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                                                Pagamento {getSortIcon('formaPagamento')}
                                            </th>
                                        )}
                                        {vendasTableCols.desconto && (
                                            <th onClick={() => handleSortVendas('desconto')} className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                                                Desconto {getSortIcon('desconto')}
                                            </th>
                                        )}
                                        {vendasTableCols.notas && (
                                            <th onClick={() => handleSortVendas('notas')} className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                                                Notas {getSortIcon('notas')}
                                            </th>
                                        )}
                                        <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-center w-40">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayedVendas.length === 0 ? (
                                        <tr><td colSpan={Object.values(vendasTableCols).filter(Boolean).length + 1} className="py-8 text-center text-slate-500 italic">Nenhum registo de venda encontrado.</td></tr>
                                    ) : (
                                        displayedVendas.map((venda) => (
                                            <tr key={venda.id} onClick={() => abrirModalVenda(venda)} className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors cursor-pointer">
                                                {vendasTableCols.numero && <td className="py-4 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">{venda.numero || '-'}</td>}
                                                {vendasTableCols.contrato && <td className="py-4 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">{venda.contrato || '-'}</td>}
                                                {vendasTableCols.codigoOperadora && <td className="py-4 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">{venda.codigoOperadora || 'AMIL'}</td>}
                                                {vendasTableCols.vidas && <td className="py-4 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">{venda.vidas || '-'}</td>}
                                                {vendasTableCols.cliente && <td className="py-4 px-4 border-r border-slate-200 dark:border-slate-700"><div className="font-bold text-slate-900 dark:text-slate-100">{venda.cliente}</div></td>}
                                                {vendasTableCols.dataVenda && <td className="py-4 px-4 text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">{formatarDataVisivel(venda.dataVenda)}</td>}
                                                {vendasTableCols.loja && <td className="py-4 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">{venda.loja || '-'}</td>}
                                                {vendasTableCols.servico && <td className="py-4 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">{venda.servico || '-'}</td>}
                                                {vendasTableCols.corretor && <td className="py-4 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">{venda.corretor || '-'}</td>}
                                                {vendasTableCols.situacao && <td className="py-4 px-4 text-center border-r border-slate-200 dark:border-slate-700"><span className={`${getSituacaoColor(venda.situacao)} px-3 py-1 rounded text-xs font-bold uppercase`}>{venda.situacao}</span></td>}
                                                {vendasTableCols.valor && <td className="py-4 px-4 text-slate-800 dark:text-slate-200 font-medium text-right border-r border-slate-200 dark:border-slate-700">{formatarMoeda(venda.valor)}</td>}
                                                {vendasTableCols.parcela && <td className="py-4 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">{venda.parcela || '-'}</td>}
                                                {vendasTableCols.inicioVigencia && <td className="py-4 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">{formatarDataVisivel(venda.inicioVigencia)}</td>}
                                                {vendasTableCols.notaFiscal && <td className="py-4 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">{venda.notaFiscal || '-'}</td>}
                                                {vendasTableCols.vitalicio && <td className="py-4 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">{venda.vitalicio || '-'}</td>}
                                                {vendasTableCols.assessoria && <td className="py-4 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">{venda.assessoria || '-'}</td>}
                                                {vendasTableCols.formaPagamento && <td className="py-4 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">{venda.formaPagamento || '-'}</td>}
                                                {vendasTableCols.desconto && <td className="py-4 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">{venda.desconto || '-'}</td>}
                                                {vendasTableCols.notas && <td className="py-4 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">{venda.notas || '-'}</td>}
                                                <td className="py-4 px-4 text-center">
                                                    <div className="flex gap-1.5 justify-center">
                                                        <button onClick={(e) => { e.stopPropagation(); abrirModalVenda(venda); }} className="bg-sky-500 hover:bg-sky-400 text-white p-1.5 rounded transition-colors shadow-sm" title="Visualizar / Editar Detalhes"><Search size={14}/></button>
                                                        <button onClick={(e) => { e.stopPropagation(); duplicarVenda(venda); }} className="bg-amber-500 hover:bg-amber-400 text-white p-1.5 rounded transition-colors shadow-sm" title="Duplicar Venda"><Copy size={14}/></button>
                                                        <button onClick={(e) => { e.stopPropagation(); setNfeForm(prev => ({ ...prev, nome: venda.cliente, valor: venda.valor, desc: `Referente a comissão / serviços prestados para ${venda.cliente}.` })); setCurrentView('nfe'); setNfeTab('emitir'); }} className="bg-indigo-500 hover:bg-indigo-400 text-white p-1.5 rounded transition-colors shadow-sm" title="Emitir NF-e"><Receipt size={14}/></button>
                                                        <button onClick={(e) => { e.stopPropagation(); apagarVenda(venda); }} className="bg-rose-500 hover:bg-rose-400 text-white p-1.5 rounded transition-colors shadow-sm" title="Apagar Venda"><Trash2 size={14}/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ECRÃ 3: CLIENTES */}
                {currentView === 'clientes' && hasAccess('clientes') && (
                    <div className="w-full mx-auto animate-in fade-in duration-500 pb-20">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                            <div><h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center"><Users size={28} className="mr-3 text-emerald-500"/> Gestão de Clientes</h2></div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 mb-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm transition-colors duration-200">
                            <div className="flex gap-2 w-full md:w-auto">
                                <button onClick={() => abrirModalAddEdit()} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-sm font-bold flex items-center shadow-md transition-colors"><Plus size={16} className="mr-2"/> Adicionar</button>
                                <div className="relative group">
                                    <label className="cursor-pointer bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-white px-4 py-2 rounded text-sm font-bold flex items-center transition-colors border border-slate-300 dark:border-slate-600">
                                        <Download size={16} className="mr-2"/> Importar
                                        <input type="file" accept=".xlsx, .csv" className="hidden" onChange={importarClientes} />
                                    </label>
                                </div>
                            </div>
                            <div className="flex w-full md:w-auto">
                                <div className="relative w-full md:w-64">
                                    <Search size={16} className="absolute left-3 top-2.5 text-slate-400"/>
                                    <input type="text" value={filtroNomeCliente} onChange={(e) => setFiltroNomeCliente(e.target.value)} placeholder="Buscar por Nome ou NIF..." className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded-l-lg pl-9 pr-4 py-2 text-sm focus:border-emerald-500 outline-none transition-colors duration-200" />
                                </div>
                                <button className="bg-slate-100 dark:bg-slate-700 px-4 py-2 border-y border-r border-slate-300 dark:border-slate-600 rounded-r-lg text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors" onClick={()=>setModalBuscaOpen(true)}>Avançada</button>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-x-auto transition-colors duration-200">
                            <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750/50 transition-colors duration-200">
                                        {cols.codigo && <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Código</th>}
                                        {cols.nome && <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Nome</th>}
                                        {cols.tipo && <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Tipo</th>}
                                        {cols.documento && <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Documento</th>}
                                        {cols.telefone && <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Telefone</th>}
                                        {cols.email && <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">E-mail</th>}
                                        {cols.situacao && <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-center">Situação</th>}
                                        {cols.acoes && <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-center">Ações</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentClientes.length === 0 ? (
                                        <tr><td colSpan="10" className="py-8 text-center text-slate-500 italic">Nenhum cliente encontrado com os filtros atuais.</td></tr>
                                    ) : (
                                        currentClientes.map((cli) => (
                                            <tr key={cli.id} className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-750/50 transition-colors">
                                                {cols.codigo && <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{cli.codigo || '-'}</td>}
                                                {cols.nome && <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">{cli.nome}</td>}
                                                {cols.tipo && <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{cli.tipo}</td>}
                                                {cols.documento && <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{cli.documento || '-'}</td>}
                                                {cols.telefone && <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{cli.telefone || '-'}</td>}
                                                {cols.email && <td className="py-3 px-4 text-sky-600 dark:text-sky-400">{cli.email || '-'}</td>}
                                                {cols.situacao && <td className="py-3 px-4 text-center">{cli.situacao ? <CheckCircle size={18} className="text-emerald-500 mx-auto"/> : <XCircle size={18} className="text-rose-500 mx-auto"/>}</td>}
                                                {cols.acoes && <td className="py-3 px-4">
                                                    <div className="flex gap-2 justify-center">
                                                        <button onClick={()=>abrirModalAddEdit(cli)} className="text-amber-500 dark:text-amber-400 hover:text-amber-600 bg-amber-100 dark:bg-amber-400/10 p-1.5 rounded transition-colors"><Edit size={16}/></button>
                                                        <button onClick={()=>apagarCliente(cli.id)} className="text-rose-500 dark:text-rose-400 hover:text-rose-600 bg-rose-100 dark:bg-rose-400/10 p-1.5 rounded transition-colors"><Trash2 size={16}/></button>
                                                    </div>
                                                </td>}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        {totalPagesClientes > 1 && (
                            <div className="mt-4 flex flex-col md:flex-row items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <span className="text-sm text-slate-500 dark:text-slate-400 mb-4 md:mb-0">
                                    A mostrar {indexOfFirstCliente + 1} a {Math.min(indexOfLastCliente, clientesFiltrados.length)} de {clientesFiltrados.length} clientes
                                </span>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setClientesCurrentPage(p => Math.max(1, p - 1))} 
                                        disabled={clientesCurrentPage === 1}
                                        className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium text-sm"
                                    >
                                        Anterior
                                    </button>
                                    <span className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg font-bold text-sm border border-blue-200 dark:border-blue-800/50">
                                        {clientesCurrentPage} / {totalPagesClientes}
                                    </span>
                                    <button 
                                        onClick={() => setClientesCurrentPage(p => Math.min(totalPagesClientes, p + 1))} 
                                        disabled={clientesCurrentPage === totalPagesClientes}
                                        className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium text-sm"
                                    >
                                        Próxima
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {/* ECRÃ 4: PROCESSAR RELATÓRIOS */}
                {currentView === 'processar' && hasAccess('processar') && (
                    <div className="max-w-full mx-auto animate-in fade-in duration-500 pb-20">
                        <header className="mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center"><FileCheck size={28} className="mr-3 text-sky-500"/> Relatórios de Comissão</h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">Geração e edição de relatórios.</p>
                        </header>
                        {successMsg && <div className="mb-4 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 p-3 rounded-lg text-center font-bold">{successMsg}</div>}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md mb-6 flex flex-col md:flex-row justify-between items-center gap-4 transition-colors duration-200">
                            <div><h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">1. Selecionar Extrato</h3><p className="text-sm text-slate-500 dark:text-slate-400">O sistema extrairá automaticamente.</p></div>
                            <div className="flex flex-wrap gap-3 justify-end">
                                <button onClick={() => setModalArquivosOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 px-6 rounded-lg font-bold flex items-center shadow-lg transition-colors"> <Database size={18} className="mr-2"/> Buscar no Sistema</button>
                                {pdfData.length > 0 && (
                                    <React.Fragment>
                                        <button onClick={addManualRow} className="bg-amber-500 hover:bg-amber-400 text-white py-2.5 px-4 rounded-lg font-bold flex items-center shadow-lg transition-colors"><Plus size={18} className="mr-2"/> Adicionar Linha</button>
                                        {pdfData.some(r => r.selected) && (
                                            <React.Fragment>
                                                <button onClick={prepararEmissaoNfLote} className="bg-blue-600 hover:bg-blue-500 text-white py-2.5 px-4 rounded-lg font-bold flex items-center shadow-lg transition-colors"><Receipt size={18} className="mr-2"/> Gerar NF</button>
                                                <button onClick={deleteSelectedRows} className="bg-rose-500 hover:bg-rose-400 text-white py-2.5 px-4 rounded-lg font-bold flex items-center shadow-lg transition-colors"><Trash2 size={18} className="mr-2"/> Apagar Seleção</button>
                                            </React.Fragment>
                                        )}
                                        <div className="relative report-cols-menu">
                                            <button onClick={() => setShowReportColsMenu(!showReportColsMenu)} className="bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 py-2.5 px-4 rounded-lg font-bold flex items-center transition-colors" title="Colunas">
                                                <Layers size={18} />
                                            </button>
                                            {showReportColsMenu && (
                                                <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg overflow-hidden text-sm z-50 animate-in fade-in slide-in-from-top-2 p-3">
                                                    <div className="flex justify-between items-center mb-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                                                        <span className="font-bold text-slate-700 dark:text-slate-200">Visibilidade das Colunas</span>
                                                    </div>
                                                    <div className="flex gap-2 mb-3">
                                                        <button onClick={() => setAllReportCols(true)} className="flex-1 text-xs py-1 px-2 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Marcar Todas</button>
                                                        <button onClick={() => setAllReportCols(false)} className="flex-1 text-xs py-1 px-2 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Desmarcar</button>
                                                    </div>
                                                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1 text-left">
                                                        {Object.keys(printColLabels).map(key => (
                                                            <label key={key} className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={reportTableCols[key]} 
                                                                    onChange={() => toggleReportCol(key)}
                                                                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                                                                />
                                                                <span className="text-slate-700 dark:text-slate-300">{printColLabels[key]}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={() => setModalPrintOpen(true)} className="bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/50 py-2.5 px-6 rounded-lg font-bold flex items-center transition-colors"><Printer size={18} className="mr-2"/> Imprimir Relatório</button>
                                    </React.Fragment>
                                )}
                            </div>
                        </div>
                        {pdfData.length > 0 && (
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md mb-6 flex flex-col md:flex-row gap-4 items-end transition-colors duration-200 no-print">
                                <div className="flex-1 w-full"><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Nome do Relatório</label><input type="text" value={reportName} onChange={e=>setReportName(e.target.value)} placeholder="Ex: Comissões - Fev/2026" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none text-slate-900 dark:text-white transition-colors" /></div>
                                <div className="flex-1 w-full"><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Período de Referência</label><input type="text" value={reportPeriod} onChange={e=>setReportPeriod(e.target.value)} placeholder="Ex: 01/02/2026 à 28/02/2026" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none text-slate-900 dark:text-white transition-colors" /></div>
                                <button onClick={salvarRelatorioComissao} className="bg-blue-600 hover:bg-blue-500 text-white py-2 px-6 rounded font-bold flex items-center transition-colors h-[38px] shadow"><Save size={16} className="mr-2"/> {currentReportId ? 'Atualizar Salvo' : 'Salvar Registo'}</button>
                            </div>
                        )}
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-x-auto transition-colors duration-200 w-full">
                            <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-slate-600 dark:text-slate-300 transition-colors duration-200">
                                        <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700 text-center w-10">
                                            <input type="checkbox" checked={pdfData.length > 0 && pdfData.every(r => r.selected)} onChange={toggleSelectAll} className="w-4 h-4 accent-blue-500 rounded cursor-pointer" title="Marcar/Desmarcar Todos" />
                                        </th>
                                        {reportTableCols.cod && <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700 text-xs text-center">Cód.</th>}
                                        {reportTableCols.contrato && <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400">Contrato</th>}
                                        {reportTableCols.op && <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400">Op.</th>}
                                        {reportTableCols.vidas && <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700 text-center text-indigo-600 dark:text-indigo-400">Vidas</th>}
                                        {reportTableCols.cliente && <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700">Cliente</th>}
                                        {reportTableCols.data && <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700 text-center">Data</th>}
                                        {reportTableCols.loja && <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700 text-center">Loja</th>}
                                        {reportTableCols.servico && <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700 text-center text-amber-600 dark:text-amber-400">Serviço</th>}
                                        {reportTableCols.desconto && <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700 text-center text-amber-600 dark:text-amber-400">Desc.</th>}
                                        {reportTableCols.corretor && <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700 text-center text-indigo-600 dark:text-indigo-400">Corretor</th>}
                                        {reportTableCols.parc && <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700 text-center text-indigo-600 dark:text-indigo-400">Parc.</th>}
                                        {reportTableCols.inicioVig && <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700 text-center text-indigo-600 dark:text-indigo-400">Início Vig.</th>}
                                        {reportTableCols.nfe && <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700 text-center text-rose-600 dark:text-rose-400">NF-e</th>}
                                        {reportTableCols.vitalicio && <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700 text-center text-indigo-600 dark:text-indigo-400">Vitalício</th>}
                                        {reportTableCols.pagamento && <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700 text-center text-indigo-600 dark:text-indigo-400">Pagamento</th>}
                                        {reportTableCols.valorTotal && <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700 text-right text-emerald-600 dark:text-emerald-400">Valor total</th>}
                                        {reportTableCols.comissao && <th className="py-2 px-2 font-bold text-right text-sky-600 dark:text-sky-400">Comissão</th>}
                                        <th className="py-2 px-2 font-bold text-center w-28">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pdfData.length === 0 ? (
                                        <tr><td colSpan={Object.values(reportTableCols).filter(Boolean).length + 2} className="py-8 text-center text-slate-500 italic">Nenhum dado extraído ainda. Importe o PDF.</td></tr>
                                    ) : (
                                        pdfData.map((linha, idx) => (
                                            editRowIndex === idx ? (
                                                <tr key={idx} className="border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 transition-colors">
                                                    <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700 text-center">
                                                        <input type="checkbox" checked={linha.selected} onChange={() => toggleSelectRow(idx)} className="w-4 h-4 accent-blue-500 rounded cursor-pointer" />
                                                    </td>
                                                    {reportTableCols.cod && <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700"><input type="text" value={editRowData.cod} onChange={e=>setEditRowData({...editRowData, cod: e.target.value})} className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-[10px] text-slate-500 dark:text-slate-400 outline-none cursor-not-allowed w-12 text-center" disabled title="Gerado automaticamente" /></td>}
                                                    {reportTableCols.contrato && <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700"><input type="text" value={editRowData.contrato} onChange={e=>setEditRowData({...editRowData, contrato: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 w-16" placeholder="Contrato" /></td>}
                                                    {reportTableCols.op && <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700"><input type="text" value={editRowData.codigoOperadora} onChange={e=>setEditRowData({...editRowData, codigoOperadora: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 w-12 text-center" placeholder="AMIL" /></td>}
                                                    {reportTableCols.vidas && <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700"><input type="number" value={editRowData.vidas} onChange={e=>setEditRowData({...editRowData, vidas: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-center w-8" placeholder="1" /></td>}
                                                    {reportTableCols.cliente && <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700"><input type="text" value={editRowData.cliente} onChange={e=>setEditRowData({...editRowData, cliente: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 min-w-[120px]" /></td>}
                                                    {reportTableCols.data && <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700"><input type="text" value={editRowData.data} onChange={e=>{
                                                        const novaData = e.target.value;
                                                        const calcParcela = calcularParcelaDaVigencia(editRowData.inicioVigencia, novaData);
                                                        setEditRowData({...editRowData, data: novaData, parcela: calcParcela || editRowData.parcela});
                                                    }} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 text-center w-14" /></td>}
                                                    {reportTableCols.loja && <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700"><input type="text" value={editRowData.loja} onChange={e=>setEditRowData({...editRowData, loja: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 text-center w-16" /></td>}
                                                    {reportTableCols.servico && <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700">
                                                        <select value={editRowData.servico || 'Plano de Saúde'} onChange={e=>setEditRowData({...editRowData, servico: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-[11px] text-slate-900 dark:text-white outline-none focus:border-amber-500 min-w-[100px]">
                                                            <option>Plano de Saúde</option><option>Plano Dental</option><option>Seguro</option><option>Bonificação</option>
                                                        </select>
                                                    </td>}
                                                    {reportTableCols.desconto && <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700"><input type="text" value={editRowData.desconto || ''} onChange={e=>setEditRowData({...editRowData, desconto: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-[11px] text-slate-900 dark:text-white outline-none focus:border-amber-500 w-12 text-center" placeholder="R$ ou %" /></td>}
                                                    {reportTableCols.corretor && <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700">
                                                        <select value={editRowData.vendedor || 'Protetta'} onChange={e=>setEditRowData({...editRowData, vendedor: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-[11px] text-slate-900 dark:text-white outline-none focus:border-indigo-500 min-w-[80px]">
                                                            <option>Protetta</option><option>Proper</option><option>Assessoria</option><option>Corretor Interno</option>
                                                        </select>
                                                    </td>}
                                                    {reportTableCols.parc && <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700"><input type="text" value={editRowData.parcela} onChange={e=>setEditRowData({...editRowData, parcela: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-center w-8" placeholder="1"/></td>}
                                                    {reportTableCols.inicioVig && <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700"><input type="date" value={editRowData.inicioVigencia || ''} onChange={e=>{
                                                        const novaVig = e.target.value;
                                                        const calcParcela = calcularParcelaDaVigencia(novaVig, editRowData.data);
                                                        setEditRowData({...editRowData, inicioVigencia: novaVig, parcela: calcParcela || editRowData.parcela});
                                                    }} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-[10px] text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-center w-24" /></td>}
                                                    {reportTableCols.nfe && <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700"><input type="text" value={editRowData.notaFiscal || ''} onChange={e=>setEditRowData({...editRowData, notaFiscal: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-xs text-slate-900 dark:text-white outline-none focus:border-rose-500 text-center font-bold text-rose-600 dark:text-rose-400 w-16" placeholder="Nº NF"/></td>}
                                                    {reportTableCols.vitalicio && <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700">
                                                        <select value={editRowData.vitalicio || 'Não'} onChange={e=>setEditRowData({...editRowData, vitalicio: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-[11px] text-slate-900 dark:text-white outline-none focus:border-indigo-500">
                                                            <option>Sim</option><option>Não</option>
                                                        </select>
                                                    </td>}
                                                    {reportTableCols.pagamento && <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700">
                                                        <select value={editRowData.formaPagamento || 'Crédito em conta'} onChange={e=>setEditRowData({...editRowData, formaPagamento: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-[11px] text-slate-900 dark:text-white outline-none focus:border-indigo-500 min-w-[90px]">
                                                            <option>Crédito em conta</option><option>Dinheiro à vista</option>
                                                        </select>
                                                    </td>}
                                                    {reportTableCols.valorTotal && <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700"><input type="number" step="0.01" value={editRowData.valorTotal} onChange={e=>setEditRowData({...editRowData, valorTotal: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500 text-right w-16" /></td>}
                                                    {reportTableCols.comissao && <td className="py-1 px-1"><input type="number" step="0.01" value={editRowData.comissao} onChange={e=>setEditRowData({...editRowData, comissao: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-xs text-slate-900 dark:text-white outline-none focus:border-sky-500 text-right w-16" /></td>}
                                                    <td className="py-1 px-1 text-center no-print">
                                                        <div className="flex gap-1 justify-center">
                                                            <button onClick={saveRowEdit} className="text-emerald-500 hover:text-emerald-400 p-1" title="Guardar Edição"><CheckCircle size={16}/></button>
                                                            <button onClick={cancelRowEdit} className="text-rose-500 hover:text-rose-400 p-1" title="Cancelar Edição"><XCircle size={16}/></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                <tr key={idx} className={linha.selected ? "border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-750/30" : "border-b border-slate-100 dark:border-slate-700/50 bg-slate-200/50 dark:bg-slate-800/50 opacity-50 grayscale transition-all"}>
                                                    <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700 text-center">
                                                        <input type="checkbox" checked={linha.selected} onChange={() => toggleSelectRow(idx)} className="w-4 h-4 accent-blue-500 rounded cursor-pointer" />
                                                    </td>
                                                    {reportTableCols.cod && <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-[10px] text-center">{linha.cod}</td>}
                                                    {reportTableCols.contrato && <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 font-bold text-indigo-600 dark:text-indigo-400 text-xs">{linha.contrato || '-'}</td>}
                                                    {reportTableCols.op && <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 font-medium text-slate-600 dark:text-slate-300 text-center text-xs">{linha.codigoOperadora || 'AMIL'}</td>}
                                                    {reportTableCols.vidas && <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 text-center font-bold text-slate-700 dark:text-slate-300 text-xs">{linha.vidas || '-'}</td>}
                                                    {reportTableCols.cliente && <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs truncate max-w-[150px]" title={linha.cliente}>{linha.cliente}</td>}
                                                    {reportTableCols.data && <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 text-center text-slate-500 dark:text-slate-400 text-[11px]">{linha.data}</td>}
                                                    {reportTableCols.loja && <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 text-center text-slate-500 dark:text-slate-400 text-xs">{linha.loja}</td>}
                                                    {reportTableCols.servico && <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 text-center font-medium text-slate-700 dark:text-slate-300 text-[11px]">{linha.servico || 'Plano de Saúde'}</td>}
                                                    {reportTableCols.desconto && <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 text-center font-bold text-rose-500 dark:text-rose-400 text-[11px]">{linha.desconto || '-'}</td>}
                                                    {reportTableCols.corretor && <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 text-center font-bold text-indigo-600 dark:text-indigo-400 text-xs">{linha.vendedor || 'Protetta'}</td>}
                                                    {reportTableCols.parc && <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 text-center font-bold text-slate-700 dark:text-slate-300 text-xs">{linha.parcela || '-'}</td>}
                                                    {reportTableCols.inicioVig && <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 text-center font-medium text-slate-700 dark:text-slate-300 text-[10px]">{linha.inicioVigencia ? formatarDataVisivel(linha.inicioVigencia) : '--/--/----'}</td>}
                                                    {reportTableCols.nfe && <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 text-center font-bold text-rose-600 dark:text-rose-400 text-[11px]">{linha.notaFiscal || '-'}</td>}
                                                    {reportTableCols.vitalicio && <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 text-center font-medium text-slate-700 dark:text-slate-300 text-[11px]">{linha.vitalicio || 'Não'}</td>}
                                                    {reportTableCols.pagamento && <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 text-center font-medium text-slate-700 dark:text-slate-300 text-[11px]">{linha.formaPagamento || 'Crédito em conta'}</td>}
                                                    {reportTableCols.valorTotal && <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 text-right font-medium text-slate-700 dark:text-slate-300 text-xs">{formatarMoeda(linha.valorTotal)}</td>}
                                                    {reportTableCols.comissao && <td className="py-1 px-2 text-right font-bold text-sky-600 dark:text-sky-400 text-xs">{formatarMoeda(linha.comissao)}</td>}
                                                    <td className="py-1 px-1 text-center no-print">
                                                        <div className="flex gap-1 justify-center">
                                                            <button onClick={() => prepararEmissaoNF(linha)} className="text-blue-500 hover:text-blue-400 p-1 transition-colors" title="Emitir NF-e Deste Serviço"><Receipt size={14}/></button>
                                                            <button onClick={() => startEditingRow(idx, linha)} className="text-amber-500 hover:text-amber-400 p-1 transition-colors" title="Editar Linha"><Edit size={14}/></button>
                                                            <button onClick={() => deleteRowFromReport(idx)} className="text-rose-500 hover:text-rose-400 p-1 transition-colors" title="Apagar Linha"><Trash2 size={14}/></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        ))
                                    )}
                                </tbody>
                                {pdfData.length > 0 && (
                                    <tfoot>
                                        <tr className="bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-600 transition-colors duration-200">
                                            <td colSpan={['cod', 'contrato', 'op', 'vidas', 'cliente', 'data', 'loja', 'servico', 'desconto', 'corretor', 'parc', 'inicioVig', 'nfe', 'vitalicio', 'assessoria', 'pagamento'].filter(k => reportTableCols[k]).length + 1} className="py-3 px-4 font-bold text-right">TOTAIS APURADOS (Selecionados)</td>
                                            {reportTableCols.valorTotal && <td className="py-3 px-2 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatarMoeda(pdfData.filter(r => r.selected).reduce((acc, l)=>acc+(Number(l.valorTotal)||0), 0))}</td>}
                                            {reportTableCols.comissao && <td className="py-3 px-2 text-right font-bold text-sky-600 dark:text-sky-400 text-lg">{formatarMoeda(pdfData.filter(r => r.selected).reduce((acc, l)=>acc+(Number(l.comissao)||0), 0))}</td>}
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                )}

                {/* Modal de Buscar Arquivos no Sistema */}
{modalArquivosOpen && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-2xl relative mx-4 transition-colors max-h-[80vh] flex flex-col">
            <button onClick={() => setModalArquivosOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <X size={20} />
            </button>
            <div className="mb-4 border-b border-slate-200 dark:border-slate-700 pb-4 flex justify-between items-end pr-8">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                        <Database className="mr-2 text-indigo-500" /> Buscar Extratos no Sistema
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Selecione um extrato para processar</p>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                    <button 
                        onClick={() => setExtratosModalViewMode('cards')} 
                        className={`p-1.5 rounded-md transition-colors ${extratosModalViewMode === 'cards' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        title="Visualização em Cards"
                    >
                        <LayoutGrid size={16} />
                    </button>
                    <button 
                        onClick={() => setExtratosModalViewMode('lines')} 
                        className={`p-1.5 rounded-md transition-colors ${extratosModalViewMode === 'lines' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        title="Visualização em Linhas"
                    >
                        <List size={16} />
                    </button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                {dbReports.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        Nenhum extrato encontrado. <br />
                        Vá em "Gestor de Extratos" &gt; "Incluir Extrato" para adicionar.
                    </div>
                ) : (
                    <div className={extratosModalViewMode === 'cards' ? "grid grid-cols-1 md:grid-cols-2 gap-3" : "space-y-2"}>
                        {dbReports.map((report, idx) => (
                            <div 
                                key={idx}
                                onClick={() => processarArquivoDoBanco(report)}
                                className={`group border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors ${extratosModalViewMode === 'cards' ? 'p-4' : 'flex items-center justify-between p-3'}`}
                            >
                                <div className={`flex items-center gap-3 ${extratosModalViewMode === 'cards' ? '' : 'flex-1 overflow-hidden'}`}>
                                    <FileText size={extratosModalViewMode === 'cards' ? 24 : 18} className="text-blue-500 shrink-0" />
                                    <div className={`flex-1 ${extratosModalViewMode === 'lines' ? 'flex items-center gap-4 min-w-0' : ''}`}>
                                        <p className="font-medium text-slate-900 dark:text-white truncate min-w-[120px]">{report.parceiro}</p>
                                        <p className={`text-slate-500 ${extratosModalViewMode === 'cards' ? 'text-xs' : 'text-sm whitespace-nowrap'}`}>{report.ano} / {report.mes} / {report.empresa}</p>
                                        {extratosModalViewMode === 'lines' && <p className="text-sm text-slate-400 truncate flex-1 md:block hidden">{report.fileName}</p>}
                                    </div>
                                </div>
                                {extratosModalViewMode === 'cards' && <p className="text-xs text-slate-400 mt-2 truncate max-w-full block">{report.fileName}</p>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                <button onClick={() => setModalArquivosOpen(false)} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg text-sm font-bold">
                    Fechar
                </button>
            </div>
        </div>
    </div>
)}

                {/* ECRÃ 5: HISTÓRICO DE RELATÓRIOS SALVOS */}
                {currentView === 'historico' && hasAccess('historico') && (
                    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">
                        <header className="mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center"><Archive className="mr-3 text-indigo-500"/> Relatórios Salvos</h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">Consulte e audite os relatórios gerados (Com rastreio de usuário).</p>
                        </header>
                        
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-x-auto transition-colors duration-200">
                            <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750/50 transition-colors duration-200">
                                        <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Data de Emissão</th>
                                        <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Nome do Relatório</th>
                                        <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Período Referência</th>
                                        <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-indigo-600 dark:text-indigo-400">Responsável (Emissão)</th>
                                        <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-center">Registros</th>
                                        <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {savedReportsList.length === 0 ? (
                                        <tr><td colSpan="6" className="py-8 text-center text-slate-500 italic">Nenhum relatório foi salvo ainda.</td></tr>
                                    ) : (
                                        savedReportsList.slice().reverse().map((rep) => (
                                            <tr key={rep.id} className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-750/50 transition-colors">
                                                <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{new Date(rep.dataCriacao).toLocaleDateString('pt-PT')} às {new Date(rep.dataCriacao).toLocaleTimeString('pt-PT').slice(0,5)}</td>
                                                <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">{rep.nome}</td>
                                                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{rep.periodo || '-'}</td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center text-slate-700 dark:text-slate-300 font-medium">
                                                        <User size={14} className="mr-1.5 text-indigo-500"/>
                                                        {rep.criadoPor ? `${rep.criadoPor}` : 'Sistema Automático'}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-center">{(rep.dados || []).length}</td>
                                                <td className="py-3 px-4 text-center">
                                                    <div className="flex gap-2 justify-center">
                                                        <button onClick={() => carregarRelatorioSalvo(rep)} className="text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded transition-colors text-xs font-bold">Abrir</button>
                                                        <button onClick={() => apagarRelatorioSalvo(rep.id)} className="text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-rose-50 dark:bg-rose-900/30 p-1.5 rounded transition-colors" title="Apagar Relatório"><Trash2 size={16}/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

               {/* ECRÃ 6: EMISSOR NFS-E — PADRÃO NACIONAL 2026 */}
{currentView === 'nfe' && (hasAccess('nfe') || currentUser?.role === 'admin') && (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500 pb-20">
        <header className="mb-6 border-b border-slate-200 dark:border-slate-700 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
                    <Receipt className="mr-3 text-blue-500"/> Emissor NFS-e (RJ)
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Padrão Nacional · ADN via API REST · Res. SMF nº 3.419/2026
                </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium border border-emerald-200 dark:border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Conectado e Pronto
            </div>
        </header>

        {/* Banner informativo sobre o novo padrão */}
        <div className="mb-4 flex items-start gap-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300">
            <Info size={18} className="mt-0.5 shrink-0 text-blue-500"/>
            <div>
                <span className="font-bold">Padrão Nacional obrigatório desde 01/01/2026.</span>
                {' '}O modelo ABRASF foi encerrado. A nota é transmitida como DPS ao Ambiente de Dados Nacional (ADN), conforme LC nº 214/2025 e Res. SMF nº 3.419/2026. Campos IBS/CBS são exigidos, mas validações de rejeição estão temporariamente suspensas em 2026.
            </div>
        </div>

        <div className="bg-slate-200 dark:bg-slate-800/50 border-b border-slate-300 dark:border-slate-700 rounded-t-xl flex overflow-hidden">
            <button onClick={() => setNfeTab('emitir')} className={`flex-1 p-3 text-sm font-bold border-b-2 transition-colors ${nfeTab === 'emitir' ? 'text-blue-600 dark:text-blue-400 border-blue-500 bg-white dark:bg-slate-800' : 'text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                Formulário de Emissão (DPS)
            </button>
            <button onClick={() => setNfeTab('historico')} className={`flex-1 p-3 text-sm font-bold border-b-2 transition-colors ${nfeTab === 'historico' ? 'text-blue-600 dark:text-blue-400 border-blue-500 bg-white dark:bg-slate-800' : 'text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                Histórico de Notas ({nfeHistorico.length})
            </button>
            <button onClick={() => setNfeTab('import_export')} className={`flex-1 p-3 text-sm font-bold border-b-2 transition-colors ${nfeTab === 'import_export' ? 'text-blue-600 dark:text-blue-400 border-blue-500 bg-white dark:bg-slate-800' : 'text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                Importar / Exportar
            </button>
        </div>

        {nfeTab === 'emitir' && (
            <form onSubmit={enviarNota} onInvalid={(e) => e.currentTarget.classList.add('show-errors')} className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-b-xl shadow-lg border border-slate-200 dark:border-slate-700 space-y-6">

                {/* BLOCO 1 — DADOS DA DPS */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <FileText size={18}/> Dados da DPS
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Data de Competência</label>
                            <input required type="date" value={nfeForm.dataEmissao} 
                                onChange={e => setNfeForm({...nfeForm, dataEmissao: e.target.value})}
                                max={new Date().toISOString().split('T')[0]}
                                min={`${new Date().getFullYear()}-01-01`}
                                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"/>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Regime Tributário</label>
                            <select value={nfeForm.regime} onChange={e => setNfeForm({...nfeForm, regime: e.target.value})}
                                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500">
                                <option value="">Selecione...</option>
                                <option value="1">MEI</option>
                                <option value="2">Simples Nacional</option>
                                <option value="3">Lucro Presumido</option>
                                <option value="4">Lucro Real</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Município de Incidência (ISS)</label>
                            <input type="text" value={nfeForm.munIncidencia} onChange={e => setNfeForm({...nfeForm, munIncidencia: e.target.value})}
                                placeholder="Ex.: Rio de Janeiro – RJ"
                                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"/>
                        </div>
                    </div>
                </div>

                {/* BLOCO 2 — TOMADOR */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <User size={18}/> Tomador (Cliente)
                    </h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">CPF / CNPJ</label>
                                <input required type="text" value={nfeForm.cnpj} onChange={e => {
                                        let val = e.target.value.replace(/\D/g, '');
                                        if (val.length > 14) val = val.slice(0, 14);
                                        if (val.length > 11) {
                                            val = val.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
                                        } else if (val.length > 9) {
                                            val = val.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
                                        }
                                        setNfeForm({...nfeForm, cnpj: val});
                                    }}
                                    placeholder="CPF ou CNPJ"
                                    maxLength="18"
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"/>
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Razão Social / Nome</label>
                                <input required type="text" value={nfeForm.nome} onChange={e => setNfeForm({...nfeForm, nome: e.target.value})}
                                    placeholder="Nome Completo"
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"/>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">E-mail do Tomador</label>
                            <input required type="email" value={nfeForm.emailTomador} onChange={e => setNfeForm({...nfeForm, emailTomador: e.target.value})}
                                placeholder="email@exemplo.com"
                                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"/>
                        </div>
                        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3">ENDEREÇO DO TOMADOR</p>
                            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                                <div className="md:col-span-1">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">CEP</label>
                                    <input required type="text" value={nfeForm.cep}
                                        onBlur={e => buscarCep(e.target.value)}
                                        onChange={e => { 
                                            let val = e.target.value.replace(/\D/g, ''); 
                                            if (val.length > 8) val = val.slice(0, 8);
                                            if (val.length > 5) val = val.replace(/^(\d{5})(\d)/, "$1-$2");
                                            setNfeForm({...nfeForm, cep: val}); 
                                            if(val.replace(/\D/g, '').length === 8) buscarCep(val); 
                                        }}
                                        placeholder="00000-000"
                                        maxLength="9"
                                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"/>
                                </div>
                                <div className="md:col-span-3">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Logradouro</label>
                                    <input required type="text" value={nfeForm.logradouro} onChange={e => setNfeForm({...nfeForm, logradouro: e.target.value})}
                                        placeholder="Rua, Av..."
                                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"/>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Número / Comp.</label>
                                    <input required type="text" value={nfeForm.numero} onChange={e => setNfeForm({...nfeForm, numero: e.target.value})}
                                        placeholder="Nº, Apto..."
                                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"/>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Bairro</label>
                                    <input required type="text" value={nfeForm.bairro} onChange={e => setNfeForm({...nfeForm, bairro: e.target.value})}
                                        placeholder="Bairro"
                                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"/>
                                </div>
                                <div className="md:col-span-3">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Cidade</label>
                                    <input required type="text" value={nfeForm.cidade} onChange={e => setNfeForm({...nfeForm, cidade: e.target.value})}
                                        placeholder="Cidade"
                                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"/>
                                </div>
                                <div className="md:col-span-1">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">UF</label>
                                    <input required type="text" value={nfeForm.uf} onChange={e => setNfeForm({...nfeForm, uf: e.target.value})}
                                        placeholder="UF"
                                        maxLength="2"
                                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 uppercase"/>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BLOCO 3 — CLASSIFICAÇÃO DO SERVIÇO (NOVO) */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Tag size={18}/> Classificação do Serviço
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                                Código Tributação Nacional <span className="text-blue-500">(LC 116/2003)</span>
                            </label>
                            <input type="text" value={nfeForm.codTributNacional} onChange={e => setNfeForm({...nfeForm, codTributNacional: e.target.value})}
                                placeholder="Ex.: 01.01.00"
                                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"/>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                                Código NBS <span className="text-blue-500">(obrig. desde 13/01/2026)</span>
                            </label>
                            <input type="text" value={nfeForm.codigoNbs} onChange={e => setNfeForm({...nfeForm, codigoNbs: e.target.value})}
                                placeholder="Ex.: 1.0101.00.00"
                                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"/>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">CNAE</label>
                            <input type="text" value={nfeForm.cnae} onChange={e => setNfeForm({...nfeForm, cnae: e.target.value})}
                                placeholder="Ex.: 6201-5/00"
                                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"/>
                        </div>
                    </div>
                </div>

                {/* BLOCO 4 — VALORES E ISS */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <DollarSign size={18}/> Valores e ISS
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Discriminação do Serviço</label>
                            <textarea required value={nfeForm.desc} onChange={e => setNfeForm({...nfeForm, desc: e.target.value})}
                                rows="3" placeholder="Descreva o serviço prestado..."
                                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 resize-none"/>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Valor Bruto do Serviço (R$)</label>
                                <input required type="number" step="0.01" value={nfeForm.valor} onChange={e => setNfeForm({...nfeForm, valor: e.target.value})}
                                    placeholder="0.00"
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none focus:border-emerald-500 font-bold text-lg"/>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Deduções / Descontos (R$)</label>
                                <input type="number" step="0.01" value={nfeForm.deducoes} onChange={e => setNfeForm({...nfeForm, deducoes: e.target.value})}
                                    placeholder="0.00"
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"/>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Alíquota ISS (%)</label>
                                <input type="number" step="0.01" min="2" max="5" value={nfeForm.aliquotaIss} onChange={e => setNfeForm({...nfeForm, aliquotaIss: e.target.value})}
                                    placeholder="Ex.: 3.00"
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"/>
                            </div>
                            <div className="flex items-end gap-2">
                                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer pb-2.5">
                                    <input type="checkbox" checked={nfeForm.issRetido} onChange={e => setNfeForm({...nfeForm, issRetido: e.target.checked})}
                                        className="w-4 h-4 rounded accent-blue-500"/>
                                    ISS Retido pelo Tomador
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BLOCO 5 — IBS / CBS (Reforma Tributária – transitório 2026) */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-amber-200 dark:border-amber-500/30">
                    <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                        <AlertTriangle size={18}/> IBS / CBS — Reforma Tributária
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                        Campos obrigatórios por lei desde 01/01/2026 (LC 214/2025). Validações de rejeição temporariamente suspensas em 2026 — preencha para garantir conformidade.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">cIndOp — Indicador da Operação</label>
                            <select value={nfeForm.cIndOp} onChange={e => setNfeForm({...nfeForm, cIndOp: e.target.value})}
                                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500">
                                <option value="">Selecione...</option>
                                <option value="1">1 – Operação com IBS/CBS</option>
                                <option value="2">2 – Operação isenta de IBS/CBS</option>
                                <option value="3">3 – Operação imune de IBS/CBS</option>
                                <option value="4">4 – Operação não sujeita a IBS/CBS</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">cClassTrib — Classificação Tributária</label>
                            <input type="text" value={nfeForm.cClassTrib} onChange={e => setNfeForm({...nfeForm, cClassTrib: e.target.value})}
                                placeholder="Ex.: 00 (conforme tabela CGNFS-e)"
                                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500"/>
                        </div>
                    </div>
                </div>

                {/* BLOCO 6 — RETENÇÕES FEDERAIS */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Percent size={18}/> Retenções Federais (se aplicável)
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'IR (%)', key: 'retIr' },
                            { label: 'PIS (%)', key: 'retPis' },
                            { label: 'COFINS (%)', key: 'retCofins' },
                            { label: 'CSLL (%)', key: 'retCsll' },
                        ].map(({ label, key }) => (
                            <div key={key}>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">{label}</label>
                                <input type="number" step="0.01" value={nfeForm[key]} onChange={e => setNfeForm({...nfeForm, [key]: e.target.value})}
                                    placeholder="0.00"
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"/>
                            </div>
                        ))}
                    </div>
                </div>

                <button type="submit" disabled={isEmitting}
                    className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 mt-4 transition-all ${isEmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 active:scale-95'}`}>
                    {isEmitting
                        ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        : <Send size={20}/>}
                    {isEmitting ? 'Transmitindo DPS ao ADN...' : 'Transmitir DPS — Padrão Nacional 2026'}
                </button>
            </form>
        )}

        {nfeTab === 'historico' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-b-xl shadow-lg border border-slate-200 dark:border-slate-700">
                {nfeHistorico.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                        <p className="mb-4">Nenhuma nota foi emitida nesta sessão.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {nfeHistorico.map((nota) => (
                            <div key={nota.id} className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Chave ADN: {nota.chaveNacional ?? nota.protocolo}</span>
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 font-bold uppercase">{nota.status}</span>
                                        {nota.issRetido && (
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 font-bold uppercase">ISS Retido</span>
                                        )}
                                    </div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{nota.cliente}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">NBS: {nota.codigoNbs ?? '—'} · Trib.: {nota.codTributNacional ?? '—'}</p>
                                </div>
                                <div className="text-left md:text-right">
                                    <p className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                                        R$ {parseFloat(nota.valor).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                    </p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">ISS {nota.aliquotaIss ?? '—'}% · {formatarDataVisivel(nota.data)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {nfeTab === 'import_export' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-b-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Importar e Exportar Notas Fiscais</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Exportar Notas</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Baixe o histórico de notas fiscais geradas nesta sessão em formato planilha.</p>
                        <button onClick={exportarNotasHistory} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors">
                            <Download size={18} className="mr-2"/> Exportar Excel (.xlsx)
                        </button>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Importar Notas</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Adicione notas fiscais geradas anteriormente subindo uma planilha Excel.</p>
                        <label className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors cursor-pointer w-fit">
                            <Upload size={18} className="mr-2"/> Selecionar Ficheiro (.xlsx)
                            <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={importarNotasHistory} />
                        </label>
                    </div>
                </div>
            </div>
        )}
    </div>
)}

                {/* ECRÃ 7: GESTOR DE EXTRATOS (INCLUIR) */}
                {currentView === 'gestor-add' && hasAccess('gestor') && (
                    <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-4 duration-500 pb-20">
                        <header className="mb-8 border-b border-slate-200 dark:border-slate-700 pb-4">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 flex items-center"><FolderTree className="mr-3 text-amber-500"/>Arquivar Novo Extrato</h2>
                            <p className="text-slate-500 dark:text-slate-400">Guarde ficheiros no Gestor organizados por data e parceiro.</p>
                        </header>
                        <form onSubmit={handleSubmitExtrato} onInvalid={(e) => e.currentTarget.classList.add('show-errors')} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-xl space-y-6 transition-colors duration-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2"><label className="text-sm font-medium text-slate-600 dark:text-slate-300">Ano</label><input type="number" value={formData.ano} onChange={(e) => setFormData({...formData, ano: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white outline-none focus:border-blue-500" /></div>
                                <div className="space-y-2"><label className="text-sm font-medium text-slate-600 dark:text-slate-300">Mês</label><select value={formData.mes} onChange={(e) => setFormData({...formData, mes: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white outline-none focus:border-blue-500">{MESES.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                                <div className="space-y-2"><label className="text-sm font-medium text-slate-600 dark:text-slate-300">Categoria</label><select value={formData.categoria} onChange={(e) => setFormData({...formData, categoria: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white outline-none focus:border-blue-500">{CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                                <div className="space-y-2"><label className="text-sm font-medium text-slate-600 dark:text-slate-300">Empresa (Pasta)</label><select disabled value={formData.empresa} onChange={(e) => setFormData({...formData, empresa: e.target.value})} className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-500 dark:text-slate-400 outline-none cursor-not-allowed">{EMPRESAS_INTERNAS.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
                            </div>
                            <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <label className="text-sm font-bold text-blue-600 dark:text-blue-400">NOME DO PARCEIRO / ARQUIVO</label>
                                <input type="text" value={formData.parceiro} onChange={(e) => setFormData({...formData, parceiro: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 text-slate-900 dark:text-white outline-none focus:border-blue-500" placeholder="Ex: Extrato Amil Mensal..." />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Ficheiros Anexos</label>
                                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750 hover:border-blue-500 transition-colors">
                                    <Layers size={24} className="text-slate-400 mb-2" /><p className="text-sm text-slate-500 dark:text-slate-300">Clique para anexar os extratos (PDF, Excel)</p>
                                </div>
                                <input type="file" ref={fileInputRef} onChange={(e)=>{ const newFiles = Array.from(e.target.files); if(newFiles.length>0){setFormData(prev=>({...prev, arquivos: [...prev.arquivos, ...newFiles]})); setFormError('');} if(fileInputRef.current) fileInputRef.current.value=""; }} className="hidden" multiple accept=".pdf,.csv,.xlsx,.xls" />
                                {formData.arquivos.length > 0 && <div className="mt-2 space-y-2">{formData.arquivos.map((f, i) => <div key={i} className="bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700 flex justify-between items-center"><span className="text-xs text-slate-700 dark:text-slate-300 truncate">{f.name}</span><button type="button" onClick={() => setFormData(prev => ({...prev, arquivos: prev.arquivos.filter((_, idx) => idx !== i)}))} className="text-rose-500 dark:text-rose-400"><X size={14} /></button></div>)}</div>}
                            </div>
                            {formError && <p className="text-rose-500 dark:text-rose-400 text-sm font-medium">{formError}</p>}
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"><Save size={20} /><span>Guardar Extrato no Banco</span></button>
                            {successMsg && <div className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 p-3 rounded-lg text-center font-bold">{successMsg}</div>}
                        </form>
                    </div>
                )}

                {/* ECRÃ 8: GESTOR DE EXTRATOS (EXPLORAR) */}
                {currentView === 'gestor-browse' && hasAccess('gestor') && (
                    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">
                        <header className="mb-6 flex flex-col gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
                            <div><h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center"><Database className="mr-3 text-indigo-500 dark:text-indigo-400"/>Gestor de Extratos</h2><p className="text-slate-500 dark:text-slate-400 mt-1">Navegação segura pelos arquivos salvos internamente.</p></div>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Search size={18} /></div>
                                    <input type="text" placeholder="Pesquisar extrato por nome ou parceiro..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-lg pl-10 pr-4 py-2 outline-none focus:border-blue-500 transition-colors" />
                                    {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white"><X size={16} /></button>}
                                </div>
                                {currentPath.length > 0 && !searchTerm && <button onClick={() => setCurrentPath(currentPath.slice(0, -1))} className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-white px-4 rounded-lg transition-colors"><ArrowLeft size={18} /></button>}
                            </div>
                        </header>
                        {!searchTerm && (
                            <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 p-3 rounded-lg mb-6 border border-slate-200 dark:border-slate-700 overflow-x-auto whitespace-nowrap transition-colors">
                                <button onClick={() => setCurrentPath([])} className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center"><Home size={14} className="mr-1"/> Raiz</button>
                                {currentPath.map((folder, index) => <React.Fragment key={index}><ChevronRight size={14} /><button onClick={() => { setCurrentPath(currentPath.slice(0, index + 1)); setSearchTerm(''); }} className="hover:text-blue-600 dark:hover:text-blue-400 font-medium">{folder}</button></React.Fragment>)}
                            </div>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {getItemsAtCurrentPath().map((item, idx) => (
                                <div key={idx} onClick={() => handleNavigate(item)} className={`p-4 rounded-xl border cursor-pointer flex flex-col items-center text-center space-y-3 transition-colors ${item.type === 'folder' ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 hover:bg-white dark:hover:bg-slate-800'}`}>
                                    <div className={`p-3 rounded-full ${item.type === 'folder' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-700 ' + getFileColorClass(item.fileName)}`}>
                                        {item.type === 'folder' ? <Folder size={32} /> : ((item.fileName || '').toLowerCase().endsWith('pdf') ? <FileText size={32} /> : <FileSpreadsheet size={32} />)}
                                    </div>
                                    <div className="w-full">
                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{item.name}</p>
                                        {item.pathInfo && <p className="text-[10px] text-slate-400 truncate mt-1">{item.pathInfo}</p>}
                                    </div>
                                </div>
                            ))}
                            {getItemsAtCurrentPath().length === 0 && <div className="col-span-full py-12 text-center text-slate-500 font-medium">Pasta Vazia ou Sem Resultados.</div>}
                        </div>
                    </div>
                )}

                {/* ECRÃ 9: CONTROLE DE ACESSOS */}
                {currentView === 'usuarios' && hasAccess('usuarios') && (
                    <div className="max-w-5xl mx-auto animate-in fade-in duration-500 pb-20">
                        <header className="mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center"><Shield className="mr-3 text-indigo-500"/> Controle de Acessos e Usuários</h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie quem pode acessar o sistema e quais abas podem ver.</p>
                        </header>
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md mb-6 flex justify-between items-center transition-colors">
                            <div className="text-sm text-slate-600 dark:text-slate-400">Total de usuários: <strong className="text-slate-900 dark:text-white">{usersList.length}</strong></div>
                            <button onClick={() => abrirModalUsuario()} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded font-bold flex items-center shadow transition-colors text-sm"><Plus size={16} className="mr-2"/> Novo Usuário</button>
                        </div>
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-x-auto transition-colors duration-200">
                            <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750/50 transition-colors duration-200">
                                        <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Usuário (Login)</th>
                                        <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Perfil de Acesso</th>
                                        <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Acessos Permitidos</th>
                                        <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usersList.map((user) => (
                                        <tr key={user.id} className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-750/50 transition-colors">
                                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center"><User size={16} className="mr-2 text-slate-400" />{user.username}</td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                                                    {user.role === 'admin' ? 'Administrador' : 'Usuário Padrão'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">{user.role === 'admin' ? 'Acesso Total' : `${(user.permissions || []).length} Módulos`}</td>
                                            <td className="py-3 px-4 text-center">
                                                <div className="flex gap-2 justify-center">
                                                    <button onClick={() => abrirModalUsuario(user)} className="text-amber-500 hover:text-amber-400 bg-amber-100 dark:bg-amber-400/10 p-1.5 rounded transition-colors" title="Editar Usuário"><Edit size={16}/></button>
                                                    <button onClick={() => apagarUsuario(user)} className="text-rose-500 hover:text-rose-400 bg-rose-100 dark:bg-rose-400/10 p-1.5 rounded transition-colors" title="Apagar Usuário"><Trash2 size={16}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ECRÃ 10: SETTINGS */}
                {currentView === 'settings' && hasAccess('settings') && (
                    <div className="max-w-3xl mx-auto animate-in slide-in-from-right-4 duration-500 pb-20">
                        <header className="mb-8 border-b border-slate-200 dark:border-slate-700 pb-4"><h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center"><Settings className="mr-3 text-slate-500 dark:text-slate-400"/>Configurações & Backup</h2></header>
                        <div className="grid gap-6">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors">
                                <div className="flex items-center space-x-3 mb-4"><div className="bg-emerald-100 dark:bg-emerald-500/20 p-2 rounded-lg"><Save className="text-emerald-600 dark:text-emerald-400" /></div><div><h3 className="font-bold text-slate-900 dark:text-white text-lg">Criar Backup de Segurança (Cloud)</h3><p className="text-xs text-slate-500 dark:text-slate-400">Exporta os dados armazenados no Supabase para o seu PC.</p></div></div>
                                <div className="grid grid-cols-1 gap-4">
                                    <button onClick={async () => {
                                        if (clientes.length === 0 && savedReportsList.length === 0 && vendasList.length === 0) return showAlert("Não existem dados suficientes para backup.");
                                        setLoading(true); setLoadingMsg("A gerar Backup Geral Supabase...");
                                        try {
                                            const zip = new JSZip();
                                            zip.file("clientes.json", JSON.stringify(clientes, null, 2));
                                            zip.file("historico_relatorios.json", JSON.stringify(savedReportsList, null, 2));
                                            zip.file("vendas_servicos.json", JSON.stringify(vendasList, null, 2));
                                            zip.file("utilizadores.json", JSON.stringify(usersList.map(u => ({ username: u.username, role: u.role })), null, 2));
                                            zip.file("arquivos_extratos.json", JSON.stringify(dbReports, null, 2));
                                            
                                            const content = await zip.generateAsync({type: "blob"});
                                            const url = URL.createObjectURL(content);
                                            const a = document.createElement('a'); a.href = url; a.download = `DonGestao_BackupGeral_${dataDeHojeInterna()}.zip`;
                                            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                                            showAlert("Backup transferido com sucesso!");
                                        } catch (err) { showAlert("Erro ao gerar ZIP: " + err.message); } finally { setLoading(false); }
                                    }} className="p-4 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg flex items-center justify-center border border-slate-300 dark:border-slate-600 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors text-slate-800 dark:text-white"><Download size={20} className="mr-2"/><span className="font-bold">Baixar Arquivo .ZIP Completo</span></button>
                                </div>
                            </div>
                            <div className="bg-rose-50 dark:bg-red-900/10 p-6 rounded-xl border border-rose-200 dark:border-red-900/30 mt-4 transition-colors">
                                <h3 className="font-bold text-rose-600 dark:text-rose-400 mb-2 flex items-center"><Trash2 size={18} className="mr-2"/> Limpeza Total</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Isto irá apagar da nuvem todo o Histórico de Relatórios e as Vendas associadas.</p>
                                <button onClick={() => {
                                    showConfirm("PERIGO CLOUD: Tem a certeza absoluta que deseja apagar TODOS os relatórios e vendas da Cloud? Esta ação não tem volta.", async () => {
                                        setLoading(true); setLoadingMsg("Apagando base...");
                                        try {
                                            await supabase.from('vendas').delete().neq('id', 0);
                                            await supabase.from('savedReports').delete().neq('id', 0);
                                            await loadFromDB();
                                            showAlert("Banco de vendas limpo com sucesso na nuvem.");
                                        } catch(err) { showAlert("Erro ao apagar: " + err.message); }
                                        setLoading(false);
                                    });
                                }} className="w-full border border-rose-400 dark:border-rose-500/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 font-bold py-2 rounded-lg transition-colors text-sm">Apagar Histórico e Vendas</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal Impressão (Avançado) */}
                {modalPrintOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-2xl relative mx-4 transition-colors max-h-[90vh] flex flex-col">
                            <button onClick={() => setModalPrintOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"><X size={20} /></button>
                            <div className="mb-4 border-b border-slate-200 dark:border-slate-700 pb-4">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center"><Printer className="mr-2 text-emerald-500" /> Configurar Impressão de Relatório</h3>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto pr-2 space-y-5">
                                <div className="flex gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Formato da Folha</label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300"><input type="radio" value="portrait" checked={printConfig.orientation === 'portrait'} onChange={(e) => setPrintConfig({...printConfig, orientation: e.target.value})} className="accent-emerald-500 w-4 h-4" /> Retrato</label>
                                            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300"><input type="radio" value="landscape" checked={printConfig.orientation === 'landscape'} onChange={(e) => setPrintConfig({...printConfig, orientation: e.target.value})} className="accent-emerald-500 w-4 h-4" /> Paisagem</label>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Escala de Redução (%)</label>
                                        <div className="flex items-center gap-2"><input type="number" min="30" max="200" value={printConfig.scale} onChange={(e) => setPrintConfig({...printConfig, scale: Number(e.target.value)})} className="w-20 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-sm focus:border-emerald-500 outline-none text-slate-900 dark:text-white text-center font-bold" /><span className="text-slate-500 dark:text-slate-400 font-bold">%</span></div>
                                    </div>
                                </div>

                                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Colunas a Imprimir</h4>
                                        <div className="flex gap-2">
                                            <select value={selectedPreset} onChange={(e) => applyPrintPreset(e.target.value)} className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs outline-none text-slate-900 dark:text-white font-medium">
                                                <option value="">-- Personalizado / Padrão --</option>
                                                {printPresets.map(p => <option key={p.id || p.name} value={p.id || p.name}>{p.name}</option>)}
                                            </select>
                                            {selectedPreset && (
                                                <button onClick={() => deletePrintPreset(selectedPreset)} className="text-rose-500 hover:text-rose-600 bg-rose-50 dark:bg-rose-900/30 px-2 rounded" title="Apagar Seleção Guardada da Cloud"><Trash2 size={14}/></button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700/50">
                                        {Object.entries(printColLabels).map(([key, label]) => (
                                            <label key={key} className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400">
                                                <input type="checkbox" checked={printCols[key]} onChange={(e) => {
                                                    setPrintCols({...printCols, [key]: e.target.checked});
                                                    setSelectedPreset('');
                                                }} className="accent-blue-500 w-3.5 h-3.5 rounded" />
                                                {label}
                                            </label>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">
                                        <input type="text" value={newPresetName} onChange={(e)=>setNewPresetName(e.target.value)} placeholder="Nomeie esta seleção para gravar na nuvem..." className="flex-1 bg-transparent text-sm outline-none text-slate-900 dark:text-white pl-2" />
                                        <button onClick={savePrintPreset} className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/80 px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-sm">Gravar na Cloud</button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <button onClick={() => setModalPrintOpen(false)} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded text-sm font-bold">Cancelar</button>
                                <button onClick={handlePrintConfirm} className="px-4 py-2 bg-emerald-600 text-white rounded text-sm font-bold flex items-center shadow hover:bg-emerald-500 transition-colors"><Printer size={16} className="mr-2" /> Gerar Impressão</button>
                            </div>
                        </div>
                    </div>
                )}

                {modalClienteOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-2xl relative mx-4">
                            <button type="button" onClick={() => setModalClienteOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                            <div className="mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                                    <Users className="mr-3 text-emerald-500" />
                                    {clienteEditIndex >= 0 ? "Editar Cliente" : "Novo Cliente"}
                                </h3>
                            </div>
                            <form onSubmit={salvarCliente} onInvalid={(e) => e.currentTarget.classList.add('show-errors')} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nome / Designação</label>
                                        <input required type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" value={clienteForm.nome} onChange={e => setClienteForm({...clienteForm, nome: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
                                        <select className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" value={clienteForm.tipo} onChange={e => setClienteForm({...clienteForm, tipo: e.target.value})}>
                                            <option value="Pessoa jurídica">Pessoa jurídica</option>
                                            <option value="Pessoa física">Pessoa física</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{clienteForm.tipo === 'Pessoa jurídica' ? 'CNPJ' : 'CPF'}</label>
                                        <input type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" value={clienteForm.documento} onChange={e => setClienteForm({...clienteForm, documento: e.target.value})} placeholder={clienteForm.tipo === 'Pessoa jurídica' ? '00.000.000/0000-00' : '000.000.000-00'} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Telefone</label>
                                        <input type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                                            value={clienteForm.telefone || ''} 
                                            maxLength="14"
                                            onChange={e => {
                                                let val = e.target.value.replace(/\D/g, '');
                                                if (val.length > 10) val = val.slice(0, 10);
                                                if (val.length > 6) val = val.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
                                                else if (val.length > 2) val = val.replace(/^(\d{2})(\d{0,4})/, "($1) $2");
                                                setClienteForm({...clienteForm, telefone: val})
                                            }} 
                                            placeholder="(00) 0000-0000"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Celular</label>
                                        <input type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                                            value={clienteForm.celular || ''} 
                                            maxLength="15"
                                            onChange={e => {
                                                let val = e.target.value.replace(/\D/g, '');
                                                if (val.length > 11) val = val.slice(0, 11);
                                                if (val.length > 7) val = val.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
                                                else if (val.length > 2) val = val.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
                                                setClienteForm({...clienteForm, celular: val})
                                            }} 
                                            placeholder="(00) 00000-0000"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">CEP</label>
                                        <input type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                                            value={clienteForm.cep || ''} 
                                            maxLength="9"
                                            onBlur={e => { if (e.target.value.replace(/\D/g, '').length === 8) buscarCepCliente(e.target.value); }}
                                            onChange={e => {
                                                let val = e.target.value.replace(/\D/g, '');
                                                if (val.length > 8) val = val.slice(0, 8);
                                                if (val.length > 5) val = val.replace(/^(\d{5})(\d)/, "$1-$2");
                                                setClienteForm({...clienteForm, cep: val});
                                                if(val.replace(/\D/g, '').length === 8) buscarCepCliente(val);
                                            }} 
                                            placeholder="00000-000"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Logradouro</label>
                                        <input type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" value={clienteForm.logradouro || ''} onChange={e => setClienteForm({...clienteForm, logradouro: e.target.value})} placeholder="Rua, Av..." />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Número</label>
                                        <input type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" value={clienteForm.numero || ''} onChange={e => setClienteForm({...clienteForm, numero: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Bairro</label>
                                        <input type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" value={clienteForm.bairro || ''} onChange={e => setClienteForm({...clienteForm, bairro: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Cidade</label>
                                        <input type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" value={clienteForm.cidade || ''} onChange={e => setClienteForm({...clienteForm, cidade: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">UF</label>
                                        <input type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" value={clienteForm.uf || ''} onChange={e => setClienteForm({...clienteForm, uf: e.target.value})} maxLength="2" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">E-mail</label>
                                        <input type="email" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" value={clienteForm.email || ''} onChange={e => setClienteForm({...clienteForm, email: e.target.value})} />
                                    </div>
                                </div>
                                <div className="flex justify-end pt-4 mt-6 border-t border-slate-200 dark:border-slate-700 gap-3">
                                    <button type="button" onClick={() => setModalClienteOpen(false)} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg font-bold">Cancelar</button>
                                    <button type="submit" className={`px-5 py-2 text-white rounded-lg font-bold flex items-center shadow-lg transition-all duration-300 ${clientSaveSuccess ? 'bg-emerald-500 animate-bounce' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
                                        {clientSaveSuccess ? <CheckCircle size={18} className="mr-2"/> : <Save size={18} className="mr-2"/>} {clientSaveSuccess ? 'Guardado!' : 'Guardar Cliente'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {modalVendaOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-2xl relative mx-4 max-h-[90vh] flex flex-col">
                            <button type="button" onClick={() => setModalVendaOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors z-10">
                                <X size={20} />
                            </button>
                            <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                                    <ShoppingCart className="mr-3 text-sky-500" />
                                    {vendaForm.id || vendaForm.isFromReport ? "Detalhes da Venda" : "Nova Venda / Extrato"}
                                </h3>
                            </div>
                            <form onSubmit={salvarVenda} onInvalid={(e) => e.currentTarget.classList.add('show-errors')} className="flex flex-col h-full overflow-hidden">
                                <div className="overflow-y-auto pr-2 -mr-2 flex-1 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Data</label>
                                        <DatePicker
                                            selected={vendaForm.dataVenda ? new Date(vendaForm.dataVenda + "T12:00:00") : null}
                                            onChange={date => {
                                                const novaData = date ? date.toISOString().split('T')[0] : '';
                                                const calcParcela = calcularParcelaDaVigencia(vendaForm.inicioVigencia, novaData);
                                                setVendaForm({...vendaForm, dataVenda: novaData, parcela: calcParcela || vendaForm.parcela});
                                            }}
                                            dateFormat="dd/MM/yyyy"
                                            locale="pt-BR"
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            placeholderText="Selecione uma data"
                                            isClearable
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nº Venda</label>
                                        <input required type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" value={vendaForm.numero} onChange={e => setVendaForm({...vendaForm, numero: e.target.value})} />
                                    </div>
                                    <div className="md:col-span-2 relative">
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Cliente / Parceiro</label>
                                        <input required type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                                            value={vendaForm.cliente} 
                                            onChange={e => { setVendaForm({...vendaForm, cliente: e.target.value}); setShowClienteSuggestions(true); }}
                                            onFocus={() => setShowClienteSuggestions(true)}
                                            onBlur={(e) => { if (!e.relatedTarget) setTimeout(() => setShowClienteSuggestions(false), 200); }}
                                        />
                                        {showClienteSuggestions && vendaForm.cliente && (
                                            <ul className="absolute z-10 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg max-h-48 overflow-y-auto shadow-lg mt-1">
                                                {clientes.filter(c => c.nome.toLowerCase().includes(vendaForm.cliente.toLowerCase())).map(c => (
                                                    <li key={c.id} className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 last:border-0" onMouseDown={() => {
                                                        setVendaForm({...vendaForm, cliente: c.nome});
                                                        setShowClienteSuggestions(false);
                                                    }}>
                                                        <div className="font-bold">{c.nome}</div>
                                                        {c.documento && <div className="text-xs text-slate-500 dark:text-slate-400">{c.documento}</div>}
                                                    </li>
                                                ))}
                                                {clientes.filter(c => c.nome.toLowerCase().includes(vendaForm.cliente.toLowerCase())).length === 0 && (
                                                    <li className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm italic text-center">Nenhum cliente encontrado</li>
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Valor Total</label>
                                        <input required type="number" step="0.01" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" value={vendaForm.valor} onChange={e => onChangeVendaField('valor', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">% (Comissão)</label>
                                        <input type="number" step="0.01" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" value={vendaForm.comissaoPorcentagem} onChange={e => onChangeVendaField('comissaoPorcentagem', e.target.value)} placeholder="Ex: 10" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Desconto</label>
                                        <input type="number" step="0.01" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" value={vendaForm.desconto} onChange={e => onChangeVendaField('desconto', e.target.value)} placeholder="0.00" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Comissão (R$)</label>
                                        <input type="number" step="0.01" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" value={vendaForm.comissao} onChange={e => setVendaForm({...vendaForm, comissao: parseFloat(e.target.value) || 0})} placeholder="0.00" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Tipo de Pagamento</label>
                                        <select className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" value={vendaForm.formaPagamento} onChange={e => setVendaForm({...vendaForm, formaPagamento: e.target.value})}>
                                            <option value="Crédito em conta">Crédito em conta</option>
                                            <option value="Dinheiro à vista">Dinheiro à vista</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Situação / Status</label>
                                        <input type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" value={vendaForm.situacao} onChange={e => setVendaForm({...vendaForm, situacao: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Empresa / Loja</label>
                                        <input type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" value={vendaForm.loja} onChange={e => setVendaForm({...vendaForm, loja: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Início da Vigência</label>
                                        <DatePicker
                                            selected={vendaForm.inicioVigencia ? new Date(vendaForm.inicioVigencia + "T12:00:00") : null}
                                            onChange={date => {
                                                const novaVig = date ? date.toISOString().split('T')[0] : '';
                                                const calcParcela = calcularParcelaDaVigencia(novaVig, vendaForm.dataVenda);
                                                setVendaForm({...vendaForm, inicioVigencia: novaVig, parcela: calcParcela || vendaForm.parcela});
                                            }}
                                            dateFormat="dd/MM/yyyy"
                                            locale="pt-BR"
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            placeholderText="Selecione uma data"
                                            isClearable
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nota Fiscal (NF)</label>
                                        <input type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" value={vendaForm.notaFiscal} onChange={e => setVendaForm({...vendaForm, notaFiscal: e.target.value})} placeholder="Número da NF" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Vidas</label>
                                        <input type="number" min="0" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" value={vendaForm.vidas} onChange={e => setVendaForm({...vendaForm, vidas: e.target.value})} placeholder="Ex: 2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Parcela</label>
                                        <input type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" value={vendaForm.parcela} onChange={e => setVendaForm({...vendaForm, parcela: e.target.value})} placeholder="Ex: 1/12" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Notas / Observações</label>
                                        <textarea className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y" rows="3" value={vendaForm.notas} onChange={e => setVendaForm({...vendaForm, notas: e.target.value})} placeholder="Insira observações complementares aqui..."></textarea>
                                    </div>
                                </div>
                                </div>
                                <div className="flex justify-between pt-4 mt-4 border-t border-slate-200 dark:border-slate-700 shrink-0">
                                    {(vendaForm.id || vendaForm.isFromReport) ? (
                                        <button type="button" onClick={() => apagarVenda(vendaForm)} className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 rounded-lg font-bold transition-colors">Apagar Registo</button>
                                    ) : <div></div>}
                                    <div className="flex gap-3">
                                        <button type="button" onClick={() => setModalVendaOpen(false)} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg font-bold">Cancelar</button>
                                        <button type="submit" className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold flex items-center shadow-lg"><Save size={18} className="mr-2"/> Guardar Venda</button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {modalUserOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-sm relative mx-4">
                            <button type="button" onClick={() => setModalUserOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                            <div className="mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                                    <User className="mr-3 text-indigo-500" />
                                    {userForm.id ? "Editar Usuário" : "Novo Usuário"}
                                </h3>
                            </div>
                            <form onSubmit={salvarUsuario} onInvalid={(e) => e.currentTarget.classList.add('show-errors')} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Usuário</label>
                                    <input required type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Senha</label>
                                    <input required type="password" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Função</label>
                                    <select className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})}>
                                        <option value="admin">Administrador</option>
                                        <option value="operador">Colaborador</option>
                                    </select>
                                </div>
                                {userForm.role !== 'admin' && (
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Permissões de Acesso</label>
                                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                            {SYSTEM_MODULES.map(mod => (
                                                <label key={mod.id} className="flex items-center space-x-2">
                                                    <input type="checkbox" checked={userForm.permissions.includes(mod.id)} onChange={(e) => {
                                                        const p = e.target.checked ? [...userForm.permissions, mod.id] : userForm.permissions.filter(x => x !== mod.id);
                                                        setUserForm({...userForm, permissions: p});
                                                    }} className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600" />
                                                    <span className="text-sm text-slate-700 dark:text-slate-300">{mod.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="flex justify-end pt-4 mt-6 border-t border-slate-200 dark:border-slate-700 gap-3">
                                    <button type="button" onClick={() => setModalUserOpen(false)} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg font-bold">Cancelar</button>
                                    <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center shadow-lg"><Save size={18} className="mr-2"/> Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modais Globais Simplificados (Exemplo) */}
                {selectedFile && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-sm relative mx-4 transition-colors">
                            <button onClick={() => setSelectedFile(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"><X size={20} /></button>
                            <div className="text-center mb-6">
                                <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4 text-blue-500 dark:text-blue-400"><FileText size={32} /></div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 truncate px-2">{selectedFile.fileName}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Extrato Associado</p>
                            </div>
                            <div className="space-y-3">
                                <button onClick={() => { const url = URL.createObjectURL(selectedFile.fileObj); window.open(url, '_blank'); setTimeout(()=>URL.revokeObjectURL(url), 1000); setSelectedFile(null); }} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center justify-center space-x-2"><Eye size={20} /><span>Visualizar PDF/Excel</span></button>
                                <button onClick={() => { const url = URL.createObjectURL(selectedFile.fileObj); const a = document.createElement('a'); a.href = url; a.download = selectedFile.fileName; document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(()=>URL.revokeObjectURL(url), 1000); setSelectedFile(null); }} className="w-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white py-3 rounded-lg font-bold flex items-center justify-center space-x-2 transition-colors"><Download size={20} /><span>Baixar para o PC</span></button>
                            </div>
                        </div>
                    </div>
                )}

                </main>

                {/* Footer fixo */}
                <footer className="shrink-0 z-10 py-3 px-4 md:px-8 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors duration-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.2)]">
                    <p className="font-medium">Desenvolvido por <a href="https://donfim.com.br" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 font-bold hover:underline transition-colors">Donfim Tech</a> copyright © 2026</p>
                    <div className="flex items-center gap-6">
                        <a href="tel:#" className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Suporte por Telefone">
                            <Phone size={16} className="text-blue-500" />
                            <span className="hidden sm:inline">Suporte</span>
                        </a>
                        <a href="mailto:suporte@donfim.tech" className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Suporte por Email">
                            <Mail size={16} className="text-blue-500" />
                            <span className="hidden sm:inline">Email</span>
                        </a>
                    </div>
                </footer>
            </div>
        </div>
    );
}
