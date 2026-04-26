import React from 'react';
// Importação direta e nativa dos ícones (muito mais rápida que a versão em HTML)
import { 
    Home, ShoppingCart, Users, FileCheck, History, Receipt, 
    Plus, FolderTree, Shield, Settings, User, Moon, Sun, LogOut 
} from 'lucide-react';

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
    <button onClick={onClick} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${active ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
        <Icon size={20} /><span className="font-medium text-sm">{label}</span>
    </button>
);

export default function Sidebar({ currentUser, currentView, setCurrentView, hasAccess, isDarkMode, setIsDarkMode, handleLogout }) {
    return (
        <aside className="w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col p-4 hidden md:flex shrink-0 transition-colors duration-200 z-10 relative">
            <div className="flex items-center space-x-2 px-2 mb-8 mt-2">
                <div className="bg-emerald-600 p-2 rounded-lg font-bold text-white leading-none border border-emerald-400/50">D</div>
                <div>
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Don Gestão</h1>
                    <p className="text-xs text-slate-500 flex items-center mt-0.5">
                        <User size={12} className="mr-1"/> {currentUser?.username}
                    </p>
                </div>
            </div>
            
            <nav className="flex-1 space-y-1 overflow-y-auto pr-2">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase px-4 pt-2 mb-2">Principal</p>
                {hasAccess('dashboard') && <SidebarItem icon={Home} label="Dashboard" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />}
                {hasAccess('vendas') && <SidebarItem icon={ShoppingCart} label="Vendas de Serviços" active={currentView === 'vendas'} onClick={() => setCurrentView('vendas')} />}
                {hasAccess('clientes') && <SidebarItem icon={Users} label="Clientes" active={currentView === 'clientes'} onClick={() => setCurrentView('clientes')} />}
                {hasAccess('processar') && <SidebarItem icon={FileCheck} label="Relatórios de Comissão" active={currentView === 'processar'} onClick={() => setCurrentView('processar')} />}
                {hasAccess('historico') && <SidebarItem icon={History} label="Relatórios Salvos" active={currentView === 'historico'} onClick={() => setCurrentView('historico')} />}
                
                {(hasAccess('nfe') || currentUser?.role === 'admin') && <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase px-4 pt-6 mb-2">Faturamento</p>}
                {(hasAccess('nfe') || currentUser?.role === 'admin') && <SidebarItem icon={Receipt} label="Emissor NFS-e" active={currentView === 'nfe'} onClick={() => setCurrentView('nfe')} />}

                {hasAccess('gestor') && <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase px-4 pt-6 mb-2">Gestor de Extratos</p>}
                {hasAccess('gestor') && <SidebarItem icon={Plus} label="Incluir Extrato" active={currentView === 'gestor-add'} onClick={() => setCurrentView('gestor-add')} />}
                {hasAccess('gestor') && <SidebarItem icon={FolderTree} label="Consultar Extratos" active={currentView === 'gestor-browse'} onClick={() => setCurrentView('gestor-browse')} />}
                
                {(hasAccess('settings') || hasAccess('usuarios')) && <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase px-4 pt-6 mb-2">Sistema</p>}
                {hasAccess('usuarios') && <SidebarItem icon={Shield} label="Controle de Acessos" active={currentView === 'usuarios'} onClick={() => setCurrentView('usuarios')} />}
                {hasAccess('settings') && <SidebarItem icon={Settings} label="Configurações (Backup)" active={currentView === 'settings'} onClick={() => setCurrentView('settings')} />}
            </nav>

            <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white">
                    <div className="flex items-center space-x-3">
                        {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
                        <span className="font-medium text-sm">{isDarkMode ? 'Tema Clássico' : 'Tema Claro'}</span>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${isDarkMode ? 'translate-x-5' : ''}`}></div>
                    </div>
                </button>
                
                <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30">
                    <LogOut size={20} />
                    <span className="font-medium text-sm">Terminar Sessão</span>
                </button>
            </div>
        </aside>
    );
}