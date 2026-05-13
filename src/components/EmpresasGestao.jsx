import React, { useState } from 'react';
import { Building, Plus, Trash2, Edit2, CheckCircle, Circle, Save, X } from 'lucide-react';

export default function EmpresasGestao({ empresasList, setEmpresasList, showAlert, showConfirm }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ id: null, nome: '', cnpj: '', logo: '', isDefault: false });

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 300;
                    const MAX_HEIGHT = 150;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const dataUrl = canvas.toDataURL(file.type || 'image/png', 0.8);
                    setEditForm({ ...editForm, logo: dataUrl });
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        }
    };

    const setAsDefault = (id) => {
        setEmpresasList((prevRaw) => {
            const novaLista = prevRaw.map(e => ({
                ...e,
                isDefault: e.id === id
            }));
            localStorage.setItem('protetta_empresas', JSON.stringify(novaLista));
            return novaLista;
        });
        showAlert('Empresa padrão alterada com sucesso!');
    };

    const handleEdit = (emp) => {
        setEditForm({ ...emp });
        setIsEditing(true);
    };

    const handleDelete = (id) => {
        if (empresasList.length === 1) {
            showAlert('Deve existir pelo menos uma empresa cadastrada no sistema.');
            return;
        }
        showConfirm('Deseja realmente remover esta empresa?', () => {
            setEmpresasList((prevRaw) => {
                let novaLista = prevRaw.filter(e => e.id !== id);
                if (prevRaw.find(e => e.id === id)?.isDefault) {
                    novaLista = novaLista.map((e, index) => index === 0 ? { ...e, isDefault: true } : e);
                }
                localStorage.setItem('protetta_empresas', JSON.stringify(novaLista));
                return novaLista;
            });
            showAlert('Empresa removida com sucesso!');
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!editForm.nome.trim()) {
            showAlert('O nome da empresa é obrigatório.');
            return;
        }

        setEmpresasList((prevRaw) => {
            let novaLista = [...prevRaw];

            if (editForm.isDefault) {
                novaLista = novaLista.map(emp => ({ ...emp, isDefault: false }));
            }

            if (editForm.id) {
                const index = novaLista.findIndex(emp => emp.id === editForm.id);
                if (index !== -1) novaLista[index] = { ...editForm, nome: editForm.nome.trim(), cnpj: editForm.cnpj.trim(), logo: editForm.logo };
            } else {
                const newId = novaLista.length > 0 ? Math.max(...novaLista.map(emp => emp.id)) + 1 : 1;
                const isFirst = novaLista.length === 0;
                novaLista.push({ 
                    id: newId, 
                    nome: editForm.nome.trim(), 
                    cnpj: editForm.cnpj.trim(),
                    logo: editForm.logo,
                    isDefault: isFirst ? true : editForm.isDefault
                });
            }

            if (!novaLista.find(emp => emp.isDefault) && novaLista.length > 0) {
                novaLista[0].isDefault = true;
            }

            localStorage.setItem('protetta_empresas', JSON.stringify(novaLista));
            return novaLista;
        });

        setIsEditing(false);
        setEditForm({ id: null, nome: '', cnpj: '', logo: '', isDefault: false });
        showAlert('Informações da empresa salvas com sucesso!');
    };


    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
            <header className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-indigo-50/50 dark:from-indigo-900/10 to-transparent pointer-events-none"></div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center">
                        <Building className="mr-3 text-indigo-500 dark:text-indigo-400" size={28} />
                        Gestão de Empresas
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                        Cadastre e gerencie as empresas do sistema.
                    </p>
                </div>
                {!isEditing && (
                    <button onClick={() => { setEditForm({ id: null, nome: '', cnpj: '', isDefault: false }); setIsEditing(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold shadow-md shadow-indigo-200 dark:shadow-none flex items-center transition-colors">
                        <Plus size={20} className="mr-2" />
                        Nova Empresa
                    </button>
                )}
            </header>

            {isEditing && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-indigo-200 dark:border-indigo-800/50 shadow-lg relative animate-in slide-in-from-top-4 fade-in">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                        {editForm.id ? 'Editar Empresa' : 'Cadastrar Nova Empresa'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-bold text-slate-600 dark:text-slate-300 block mb-1">Nome da Empresa</label>
                                <input 
                                    type="text" 
                                    value={editForm.nome} 
                                    onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                                    placeholder="Digite o nome da empresa"
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    autoFocus
                                />
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Este nome será utilizado nos relatórios, extratos e demais áreas da interface na empresa padrão.</p>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-600 dark:text-slate-300 block mb-1">CNPJ</label>
                                <input 
                                    type="text" 
                                    value={editForm.cnpj} 
                                    onChange={(e) => setEditForm({ ...editForm, cnpj: e.target.value })}
                                    placeholder="Ex: 00.000.000/0000-00"
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-600 dark:text-slate-300 block mb-1">Logo da Empresa</label>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                />
                                {editForm.logo && (
                                    <div className="mt-2 flex items-center space-x-4">
                                        <div className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900">
                                            <img src={editForm.logo} alt="Preview" className="h-12 object-contain max-w-[200px]" />
                                        </div>
                                        <button type="button" onClick={() => setEditForm(prev => ({ ...prev, logo: '' }))} className="text-xs text-rose-500 hover:text-rose-600 font-bold">
                                            Remover Imagem
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-3 mt-4 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                            <input 
                                type="checkbox" 
                                id="isDefault" 
                                checked={editForm.isDefault} 
                                onChange={(e) => setEditForm(prev => ({ ...prev, isDefault: e.target.checked }))}
                                className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                            />
                            <label htmlFor="isDefault" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                                Definir como Empresa Principal (Padrão) do Sistema
                            </label>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button type="button" onClick={() => setIsEditing(false)} className="flex items-center px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition-colors">
                                <X size={18} className="mr-2" /> Cancelar
                            </button>
                            <button type="submit" className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition-colors">
                                <Save size={18} className="mr-2" /> Salvar Empresa
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            <th className="py-4 px-6 w-16 text-center">ID</th>
                            <th className="py-4 px-6">Nome da Empresa</th>
                            <th className="py-4 px-6">CNPJ</th>
                            <th className="py-4 px-6 text-center">Status</th>
                            <th className="py-4 px-6 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {empresasList.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="py-8 text-center text-slate-500 dark:text-slate-400">
                                    Nenhuma empresa cadastrada.
                                </td>
                            </tr>
                        ) : (
                            empresasList.map((emp) => (
                                <tr key={emp.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors group">
                                    <td className="py-4 px-6 text-center font-mono text-slate-400">{emp.id}</td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center space-x-3">
                                            {emp.logo ? (
                                                <div className="h-10 w-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-1 flex items-center justify-center shrink-0">
                                                    <img src={emp.logo} alt={emp.nome} className="h-full w-full object-contain" />
                                                </div>
                                            ) : (
                                                <div className="h-10 w-10 rounded bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg font-bold shrink-0">
                                                    {emp.nome.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="font-bold text-slate-800 dark:text-white text-base">{emp.nome}</div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-slate-700 dark:text-slate-300 font-mono text-sm">
                                        {emp.cnpj || '-'}
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        {emp.isDefault ? (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                                <CheckCircle size={14} className="mr-1" /> Principal
                                            </span>
                                        ) : (
                                            <button onClick={() => setAsDefault(emp.id)} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 transition-colors" title="Definir como Principal">
                                                <Circle size={14} className="mr-1" /> Tornar Principal
                                            </button>
                                        )}
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEdit(emp)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded" title="Editar">
                                                <Edit2 size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(emp.id)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded" title="Excluir">
                                                <Trash2 size={18} />
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
    );
}
