import React, { useEffect, useState, useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Doughnut, Bar, Pie, Line } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import html2pdf from 'html2pdf.js';
import { CheckCircle } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler, ChartDataLabels);

const DashboardControle = ({ vendasList, currentEmpresa }) => {
    const empUpper = (currentEmpresa || 'PROPER').toUpperCase();
    const EMP = empUpper;
    const EMP_ASSESSORIA = `${EMP} - ASSESSORIA`;
    const TOTAL_EMP = `TOTAL ${EMP}`;

    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedEntity, setSelectedEntity] = useState(TOTAL_EMP);
    const [selectedOperatorMonth, setSelectedOperatorMonth] = useState('Todos');
    const reportRef = useRef();

    useEffect(() => {
        if (selectedEntity !== EMP && selectedEntity !== EMP_ASSESSORIA && selectedEntity !== TOTAL_EMP) {
            setSelectedEntity(TOTAL_EMP);
        }
    }, [EMP, EMP_ASSESSORIA, TOTAL_EMP, selectedEntity]);

    const OPERATORS = [
        { key: 'AMIL', color: '#0052cc' }, { key: 'SULAMERICA', color: '#fbbf24' },
        { key: 'PORTO', color: '#0ea5e9' }, { key: 'BRADESCO', color: '#dc2626' },
        { key: 'MEDSENIOR', color: '#9333ea' }, { key: 'ASSIM', color: '#16a34a' },
        { key: 'QUALICORP', color: '#64748b' }, { key: 'MONGERAL', color: '#ec4899' },
        { key: 'OMINT', color: '#f97316' }, { key: 'TOKIO', color: '#14b8a6' },
        { key: 'SUPERMED', color: '#f43f5e' }, { key: 'KLINI', color: '#8b5cf6' },
        { key: 'NOTREDAME', color: '#d97706' }, { key: 'CASSI', color: '#10b981' },
        { key: 'UNIMED', color: '#059669' }
    ];

    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    // Calculando dados reais da vendasList (filtrando por Vitalícios=Sim e pelo Ano)
    const processedData = {
        [EMP]: Array(12).fill(0),
        [EMP_ASSESSORIA]: Array(12).fill(0),
        [TOTAL_EMP]: Array(12).fill(0),
    };

    const operatorData = {};
    OPERATORS.forEach(op => {
        operatorData[op.key] = Array(12).fill(0);
    });

    if (vendasList && vendasList.length > 0) {
        vendasList.forEach(v => {
            // Conta todas as vendas, ou só vitalício? "QUADRO RESUMO VITALÍCIOS - 2025" 
            // O usuário disse: "que os gráficos sejam alimentados automáticamente com os dados dos relatórios"
            // Vamos filtrar pelo ano
            const dateStr = v.dataVenda || v.inicioVigencia;
            if (!dateStr) return;
            const dateObj = new Date(dateStr);
            if (dateObj.getFullYear() !== selectedYear) return;
            const monthObj = dateObj.getMonth();
            let val = v.valor;
            if (typeof val === 'string') {
                val = parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0;
            } else {
                val = parseFloat(val) || 0;
            }

            const isEmpresaLoja = v.loja && v.loja.toUpperCase().includes(EMP);
            const isEmpresaAssessoria = v.assessoria && v.assessoria.toUpperCase().includes(EMP);
            
            // Só conta empresa
            if (!isEmpresaLoja && !isEmpresaAssessoria) return;

            if (isEmpresaLoja) processedData[EMP][monthObj] += val;
            
            if (isEmpresaAssessoria && !isEmpresaLoja) processedData[EMP_ASSESSORIA][monthObj] += val;

            processedData[TOTAL_EMP][monthObj] += val;

            const opName = (v.codigoOperadora || '').toUpperCase();
            if (operatorData[opName] !== undefined) {
                operatorData[opName][monthObj] += val;
            }
        });
    }

    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const formatPercent = (val) => new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1 }).format(val);

    const data = processedData[selectedEntity] || Array(12).fill(0);
    const total = data.reduce((a,b)=>a+b,0);
    const avg = total/12;
    const maxVal = Math.max(...data, 0);
    const maxIdx = data.indexOf(maxVal);

    const cCorr = processedData[EMP];
    const cAss = processedData[EMP_ASSESSORIA];
    const totCorr = cCorr.reduce((a,b)=>a+b,0);
    const totAss = cAss.reduce((a,b)=>a+b,0);

    const quarterData = [
        data.slice(0,3).reduce((a,b)=>a+b,0), data.slice(3,6).reduce((a,b)=>a+b,0),
        data.slice(6,9).reduce((a,b)=>a+b,0), data.slice(9,12).reduce((a,b)=>a+b,0)
    ];

    const semesterData = [data.slice(0,6).reduce((a,b)=>a+b,0), data.slice(6,12).reduce((a,b)=>a+b,0)];

    let opChartData = [];
    OPERATORS.forEach(op => {
        if (selectedOperatorMonth === 'Todos') {
            opChartData.push(operatorData[op.key].reduce((a,b)=>a+b,0));
        } else {
            opChartData.push(operatorData[op.key][parseInt(selectedOperatorMonth)]);
        }
    });

    const handleExportPDF = () => {
        const element = reportRef.current;
        const opt = {
            margin: 0.3,
            filename: `Relatorio_${empUpper}_${selectedYear}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        const noPrintEls = element.querySelectorAll('.no-print');
        noPrintEls.forEach(el => el.style.display = 'none');
        
        html2pdf().set(opt).from(element).save().then(() => {
            noPrintEls.forEach(el => el.style.display = '');
        });
    };

    return (
        <div ref={reportRef} className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 w-full">
            <header className="mb-8">
                <div className="bg-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-blue-500 rounded-full opacity-10 blur-2xl"></div>
                    <div className="text-center md:text-left z-10">
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{currentEmpresa} Analytics</h1>
                        <p className="text-slate-400 text-sm md:text-base font-light mt-1">Gestão Estratégica e Evolução</p>
                    </div>
                </div>
            </header>

            <div className="mb-8 flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 relative no-print">
                <div className="flex items-center gap-3">
                    <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="bg-blue-50 text-blue-800 border-none font-bold rounded-lg px-4 py-2 outline-none">
                        {[2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-end md:items-center relative">
                    <button onClick={handleExportPDF} className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
                        Baixar PDF
                    </button>
                    <select value={selectedEntity} onChange={(e) => setSelectedEntity(e.target.value)} className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded-lg block w-full md:w-64 p-2.5">
                        <option value={EMP_ASSESSORIA}>{EMP_ASSESSORIA}</option>
                        <option value={EMP}>{EMP} (Corretora)</option>
                        <option value={TOTAL_EMP}>{TOTAL_EMP}</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 h-full w-1 bg-blue-500"></div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Acumulado</p>
                    <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{formatCurrency(total)}</h3>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 h-full w-1 bg-emerald-500"></div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Média Mensal</p>
                    <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{formatCurrency(avg)}</h3>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 h-full w-1 bg-purple-500"></div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Pico de Performance</p>
                    <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{formatCurrency(maxVal)}</h3>
                    <div className="mt-2 text-xs text-purple-600 font-medium">{months[maxIdx]}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                <div className="lg:col-span-3 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6"><span className="w-2 h-6 bg-blue-600 rounded-full"></span> Evolução Mensal</h3>
                    <div className="aspect-[21/9]">
                        <Line
                            data={{ labels: months.map(m=>m.substring(0,3)), datasets: [{ data, borderColor: '#2563eb', backgroundColor: '#eff6ff', fill: true, tension: 0.3 }] }}
                            options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { display: true, align: 'top', formatter: v => new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v) } }, scales: { y: { beginAtZero: true, grace: '10%' } } }}
                        />
                    </div>
                </div>
                
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4"><span className="w-2 h-6 bg-emerald-500 rounded-full"></span> Trimestral</h3>
                    <div className="aspect-square"><Bar data={{ labels: ['1º T', '2º T', '3º T', '4º T'], datasets: [{ data: quarterData, backgroundColor: ['#60a5fa', '#34d399', '#facc15', '#f87171'], borderRadius: 6 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { color: '#fff', font: { weight: 'bold' }, formatter: (v,c) => total>0 ? (v*100/total).toFixed(0)+'%' : '0%' } }, scales: { y: {display:false}, x: {grid:{display:false}} } }} /></div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4"><span className="w-2 h-6 bg-teal-500 rounded-full"></span> Semestral</h3>
                    <div className="aspect-square"><Pie data={{ labels: ['1º Sem', '2º Sem'], datasets: [{ data: semesterData, backgroundColor: ['#2dd4bf', '#0d9488'] }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, datalabels: { color: '#fff', font: { weight: 'bold' }, formatter: (v,c) => total>0 ? (v*100/total).toFixed(0)+'%' : '0%' } } }} /></div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4"><span className="w-2 h-6 bg-indigo-500 rounded-full"></span> Mix</h3>
                    <div className="aspect-square"><Doughnut data={{ labels: ['Corretora', 'Assessoria'], datasets: [{ data: [totCorr, totAss], backgroundColor: ['#2563eb', '#a855f7'], borderWidth: 0 }] }} options={{ responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'bottom' }, datalabels: { color: '#fff', font: { weight: 'bold' }, formatter: (v,c) => (v/(totCorr+totAss)*100 || 0).toFixed(0)+'%' } } }} /></div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 mb-8">
                <div className="mb-6 flex justify-between items-start">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Desempenho por Operadora</h2>
                        <p className="text-sm text-slate-500">Detalhamento Financeiro</p>
                    </div>
                    <select value={selectedOperatorMonth} onChange={e => setSelectedOperatorMonth(e.target.value)} className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm text-slate-700 dark:text-slate-300">
                        <option value="Todos">Todos os Meses</option>
                        {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                </div>
                <div className="aspect-[21/9]">
                    <Bar 
                        data={{ labels: OPERATORS.map(op=>op.key), datasets: [{ data: opChartData, backgroundColor: OPERATORS.map(op=>op.color), borderRadius: 6 }] }}
                        options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', formatter: v => new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v), font: {size: 10} } }, scales: { y: { display: false }, x: { grid: { display: false }, ticks: { font: {size: 9} } } } }}
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 mb-8">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6"><span className="w-2 h-6 bg-orange-400 rounded-full"></span> Composição Mensal</h3>
                <div className="aspect-[21/9]">
                    <Bar 
                        data={{ labels: months.map(m=>m.substring(0,3)), datasets: [{ label: 'Corretora', data: cCorr, backgroundColor: '#2563eb', stack: '0' }, { label: 'Assessoria', data: cAss, backgroundColor: '#a855f7', stack: '0' }] }}
                        options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, datalabels: { display: c => c.dataset.data[c.dataIndex] > 5000, color: '#fff', font: {size:9}, formatter: v => new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v) } }, scales: { x: { stacked: true, grid: {display:false} }, y: { stacked: true, display: false } } }}
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden mb-8">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Detalhamento Financeiro Mensal</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            <tr><th className="px-6 py-4 uppercase font-semibold">Mês</th><th className="px-6 py-4 uppercase font-semibold">Status</th><th className="px-6 py-4 uppercase font-semibold text-right">Part. Anual</th><th className="px-6 py-4 uppercase font-semibold text-right">Valor</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 text-slate-700 dark:text-slate-300">
                            {data.map((val, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-6 py-4 font-medium">{months[idx]}</td>
                                    <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${val >= avg ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-yellow-100 text-yellow-800 dark:bg-amber-900/30 dark:text-amber-400'}`}>{val >= avg ? 'Acima da Média' : 'Abaixo da Média'}</span></td>
                                    <td className="px-6 py-4 text-right">{total > 0 ? formatPercent(val/total) : '0%'}</td>
                                    <td className="px-6 py-4 text-right font-bold">{formatCurrency(val)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DashboardControle;
