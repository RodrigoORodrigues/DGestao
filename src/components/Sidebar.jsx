import React, { useState, useRef, useEffect, useCallback } from 'react';
// Importação direta e nativa dos ícones (muito mais rápida que a versão em HTML)
import { 
    Home, ShoppingCart, Users, FileCheck, History, Receipt, 
    Plus, FolderTree, Shield, Settings, User, Moon, Sun, LogOut, Layers,
    ChevronLeft, ChevronRight, GripVertical, Building
} from 'lucide-react';

const SidebarItem = ({ icon: Icon, label, active, onClick, collapsed }) => (
    <button onClick={onClick} title={collapsed ? label : undefined} className={`w-full flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 rounded-lg transition-colors overflow-hidden ${active ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
        <Icon size={20} className="shrink-0" />
        {!collapsed && <span className="font-medium text-sm truncate">{label}</span>}
    </button>
);

export default function Sidebar({ currentUser, currentView, setCurrentView, hasAccess, isDarkMode, setIsDarkMode, handleLogout, defaultEmpresa }) {
    const [width, setWidth] = useState(() => {
        const saved = localStorage.getItem('protetta_sidebar_width');
        return saved ? parseInt(saved, 10) : 256;
    });
    const [collapsed, setCollapsed] = useState(() => {
        const saved = localStorage.getItem('protetta_sidebar_collapsed');
        return saved === 'true';
    });
    
    const isResizing = useRef(false);

    useEffect(() => {
        localStorage.setItem('protetta_sidebar_width', width.toString());
    }, [width]);

    useEffect(() => {
        localStorage.setItem('protetta_sidebar_collapsed', collapsed.toString());
    }, [collapsed]);

    const resize = useCallback((e) => {
        if (isResizing.current) {
            let newWidth = e.clientX;
            if (newWidth < 120) {
                if (!collapsed) setCollapsed(true);
            } else {
                if (collapsed) setCollapsed(false);
                if (newWidth > 600) newWidth = 600;
                setWidth(newWidth);
            }
        }
    }, [collapsed]);

    const stopResizing = useCallback(() => {
        isResizing.current = false;
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResizing);
        document.body.style.cursor = 'auto';
        document.body.style.userSelect = 'auto';
    }, [resize]);

    const startResizing = useCallback((e) => {
        e.preventDefault();
        isResizing.current = true;
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResizing);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, [resize, stopResizing]);

    const toggleCollapse = () => {
        if (collapsed) {
            setCollapsed(false);
            if (width < 200) setWidth(256);
        } else {
            setCollapsed(true);
        }
    };

    return (
        <aside 
            className="bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col hidden md:flex shrink-0 transition-colors duration-200 z-20 relative"
            style={{ width: collapsed ? '80px' : `${width}px`, transition: isResizing.current ? 'none' : 'width 0.2s ease-in-out' }}
        >
            <div className={`flex flex-col ${collapsed ? 'px-2 py-4 items-center' : 'px-4 py-4'} mb-2 mt-2 relative`}>
                <div className={`flex items-center w-full ${collapsed ? 'justify-center' : ''}`}>
                    {collapsed ? (
                         <div className="h-10 w-10 flex items-center justify-center overflow-hidden shrink-0">
                             <img src="/Logo_DonGestao.png" alt="Don" className="h-8 w-auto object-contain object-left" />
                         </div>
                    ) : (
                         <div className="flex flex-col min-w-0 pl-1">
                             <img src="/Logo_DonGestao.png" alt="Don Gestão" className="h-12 w-auto object-contain mb-2 origin-left" />
                             <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center truncate">
                                 <User size={12} className="mr-1 shrink-0"/> <span className="truncate font-medium">{currentUser?.username}</span>
                             </p>
                         </div>
                    )}
                </div>

                {/* Empresa Logada */}
                <div className={`mt-5 ${collapsed ? 'w-full flex justify-center' : 'w-full'}`}>
                    {!collapsed ? (
                        <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-900 rounded-lg p-2 border border-slate-200 dark:border-slate-800">
                            {defaultEmpresa?.logo ? (
                                <div className="h-8 w-8 shrink-0 flex items-center justify-center p-0.5 bg-white rounded shadow-sm border border-slate-200">
                                    <img src={defaultEmpresa.logo} alt={defaultEmpresa.nome} className="h-full w-full object-contain" />
                                </div>
                            ) : (
                                <div className="h-8 w-8 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded flex items-center justify-center text-sm font-bold shrink-0 border border-indigo-200 dark:border-indigo-800 border-opacity-50">
                                    {defaultEmpresa?.nome?.charAt(0) || 'E'}
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-0.5">Empresa Ativa</p>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate leading-tight mt-0.5">
                                    {defaultEmpresa?.nome || 'Empresa Padrão'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="relative group cursor-pointer" title={defaultEmpresa?.nome || 'Empresa Padrão'}>
                            {defaultEmpresa?.logo ? (
                                <div className="h-10 w-10 shrink-0 flex items-center justify-center p-1 bg-white rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
                                    <img src={defaultEmpresa.logo} alt={defaultEmpresa.nome} className="h-full w-full object-contain" />
                                </div>
                            ) : (
                                <div className="h-10 w-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center text-lg font-bold shrink-0 border border-indigo-200 dark:border-indigo-800 border-opacity-50">
                                    {defaultEmpresa?.nome?.charAt(0) || 'E'}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            <nav className={`flex-1 space-y-1 overflow-y-auto overflow-x-hidden ${collapsed ? 'px-2' : 'px-4'} scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700`}>
                <p className={`text-xs font-bold text-slate-400 dark:text-slate-500 uppercase pt-2 mb-2 truncate ${collapsed ? 'text-center' : ''}`}>
                    {collapsed ? '...' : 'Principal'}
                </p>
                {hasAccess('dashboard') && <SidebarItem collapsed={collapsed} icon={Layers} label="Painel" active={currentView === 'painel'} onClick={() => setCurrentView('painel')} />}
                {hasAccess('dashboard') && <SidebarItem collapsed={collapsed} icon={Home} label="Dashboard" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />}
                {hasAccess('vendas') && <SidebarItem collapsed={collapsed} icon={ShoppingCart} label="Vendas de Serviços" active={currentView === 'vendas'} onClick={() => setCurrentView('vendas')} />}
                {hasAccess('clientes') && <SidebarItem collapsed={collapsed} icon={Users} label="Clientes" active={currentView === 'clientes'} onClick={() => setCurrentView('clientes')} />}
                {hasAccess('processar') && <SidebarItem collapsed={collapsed} icon={FileCheck} label="Relatório Comissão" active={currentView === 'processar'} onClick={() => setCurrentView('processar')} />}
                {hasAccess('historico') && <SidebarItem collapsed={collapsed} icon={History} label="Relatórios Salvos" active={currentView === 'historico'} onClick={() => setCurrentView('historico')} />}
                
                {(hasAccess('nfe') || currentUser?.role === 'admin') && <p className={`text-xs font-bold text-slate-400 dark:text-slate-500 uppercase pt-6 mb-2 truncate ${collapsed ? 'text-center' : ''}`}>
                    {collapsed ? '...' : 'Faturamento'}
                </p>}
                {(hasAccess('nfe') || currentUser?.role === 'admin') && <SidebarItem collapsed={collapsed} icon={Receipt} label="Emissor NFS-e" active={currentView === 'nfe'} onClick={() => setCurrentView('nfe')} />}

                {hasAccess('gestor') && <p className={`text-xs font-bold text-slate-400 dark:text-slate-500 uppercase pt-6 mb-2 truncate ${collapsed ? 'text-center' : ''}`}>
                    {collapsed ? '...' : 'Gestor de Extratos'}
                </p>}
                {hasAccess('gestor') && <SidebarItem collapsed={collapsed} icon={Plus} label="Incluir Extrato" active={currentView === 'gestor-add'} onClick={() => setCurrentView('gestor-add')} />}
                {hasAccess('gestor') && <SidebarItem collapsed={collapsed} icon={FolderTree} label="Consultar Extratos" active={currentView === 'gestor-browse'} onClick={() => setCurrentView('gestor-browse')} />}
                
                {(hasAccess('settings') || hasAccess('usuarios') || hasAccess('empresas')) && <p className={`text-xs font-bold text-slate-400 dark:text-slate-500 uppercase pt-6 mb-2 truncate ${collapsed ? 'text-center' : ''}`}>
                    {collapsed ? '...' : 'Sistema'}
                </p>}
                {hasAccess('empresas') && <SidebarItem collapsed={collapsed} icon={Building} label="Gestão de Empresas" active={currentView === 'empresas'} onClick={() => setCurrentView('empresas')} />}
                {hasAccess('usuarios') && <SidebarItem collapsed={collapsed} icon={Shield} label="Controle de Acessos" active={currentView === 'usuarios'} onClick={() => setCurrentView('usuarios')} />}
                {hasAccess('settings') && <SidebarItem collapsed={collapsed} icon={Settings} label="Configurações" active={currentView === 'settings'} onClick={() => setCurrentView('settings')} />}
            </nav>

            <div className={`mt-auto pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2 pb-4 ${collapsed ? 'px-2' : 'px-4'}`}>
                <button onClick={() => setIsDarkMode(!isDarkMode)} title={collapsed ? (isDarkMode ? 'Tema Clássico' : 'Tema Claro') : undefined} className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between space-x-3'} px-4 py-3 rounded-lg transition-colors text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white`}>
                    <div className="flex items-center space-x-3 shrink-0">
                        {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
                        {!collapsed && <span className="font-medium text-sm truncate">{isDarkMode ? 'Tema Clássico' : 'Tema Claro'}</span>}
                    </div>
                    {!collapsed && (
                        <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 shrink-0 ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${isDarkMode ? 'translate-x-5' : ''}`}></div>
                        </div>
                    )}
                </button>
                
                <button onClick={handleLogout} title={collapsed ? 'Terminar Sessão' : undefined} className={`w-full flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 rounded-lg transition-colors text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30`}>
                    <LogOut size={20} className="shrink-0" />
                    {!collapsed && <span className="font-medium text-sm truncate">Terminar Sessão</span>}
                </button>
            </div>

            {/* Collapse/Expand button */}
            <button 
                onClick={toggleCollapse}
                className="absolute -right-3 top-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full p-1 shadow-md z-30 flex items-center justify-center transition-transform hover:scale-110 focus:outline-none"
                title={collapsed ? "Expandir Menu" : "Recolher Menu"}
            >
                {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {/* Drag Handle */}
            {!collapsed && (
                <div 
                    className="absolute top-0 right-0 w-2 h-full cursor-col-resize group flex items-center justify-center transition-colors duration-200 z-20"
                    onMouseDown={startResizing}
                >
                    <div className="opacity-0 group-hover:opacity-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-sm -ml-4 p-0.5 transition-opacity duration-200">
                        <GripVertical size={14} className="text-slate-400" />
                    </div>
                </div>
            )}
        </aside>
    );
}