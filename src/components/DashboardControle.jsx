import React, { useEffect, useState, useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Doughnut, Bar, Pie, Line } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import html2pdf from 'html2pdf.js';
import { CheckCircle, X, TrendingUp, DollarSign, Users, Award, BarChart3, ArrowUpRight } from 'lucide-react';
import { findClientMetadata } from '../utils/clientMetadata';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler, ChartDataLabels);

const DashboardControle = ({ vendasList, defaultEmpresa = {}, isDarkMode }) => {
    // Detect dark mode from prop or document element class or media query as a fallback
    const [darkTheme, setDarkTheme] = useState(() => {
        if (isDarkMode !== undefined) return isDarkMode;
        return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    });

    useEffect(() => {
        if (isDarkMode !== undefined) {
            setDarkTheme(isDarkMode);
        } else {
            const observer = new MutationObserver(() => {
                setDarkTheme(document.documentElement.classList.contains('dark'));
            });
            observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
            return () => observer.disconnect();
        }
    }, [isDarkMode]);

    const chartTextColor = darkTheme ? '#ffffff' : '#0f172a';

    const nomeEmpresa = defaultEmpresa.nome || 'PROTETTA';
    const nomeEmpresaUpper = nomeEmpresa.toUpperCase();
    const displayNomeEmpresa = nomeEmpresa.charAt(0).toUpperCase() + nomeEmpresa.slice(1).toLowerCase();
    const logo = defaultEmpresa.logo;
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedEntity, setSelectedEntity] = useState(`TOTAL ${nomeEmpresaUpper}`);
    const [selectedOperatorMonth, setSelectedOperatorMonth] = useState('Todos');
    const [calculoTipo, setCalculoTipo] = useState('comissao');
    const [vitalicioFiltro, setVitalicioFiltro] = useState('Todos');
    const [popupInfo, setPopupInfo] = useState(null);
    const reportRef = useRef();

    const BASE_COLORS = [
        '#0052cc', '#fbbf24', '#0ea5e9', '#dc2626', '#9333ea', '#16a34a',
        '#64748b', '#ec4899', '#f97316', '#14b8a6', '#f43f5e', '#8b5cf6',
        '#d97706', '#10b981', '#059669', '#3b82f6', '#10b981', '#f59e0b',
        '#ef4444', '#8b5cf6'
    ];

    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    const [selectedTableOperator, setSelectedTableOperator] = useState('Todas');
    const [selectedTableGrouping, setSelectedTableGrouping] = useState('Mensal');

    // Calculando dados reais da vendasList (filtrando por Vitalícios=Sim e pelo Ano)
    const processedData = {
        [nomeEmpresaUpper]: Array(12).fill(0),
        [`${nomeEmpresaUpper} - ASSESSORIA`]: Array(12).fill(0),
        [`TOTAL ${nomeEmpresaUpper}`]: Array(12).fill(0),
    };

    // Calculando dados de corretores da coluna de corretor
    const brokerData = {
        'Assessoria': Array(12).fill(0),
        [displayNomeEmpresa]: Array(12).fill(0),
        'Corretor Interno': Array(12).fill(0),
        'Outros': Array(12).fill(0),
    };

    // Vendas Novas (parcelas 1, 2, 3)
    const processedVendasNovas = {
        [nomeEmpresaUpper]: Array(12).fill(0),
        [`${nomeEmpresaUpper} - ASSESSORIA`]: Array(12).fill(0),
        [`TOTAL ${nomeEmpresaUpper}`]: Array(12).fill(0),
    };
    let totalVendasNovasCount = 0;
    let totalVendasNovasVidas = 0;

    const operatorData = {};
    const recordedOperators = new Set();
    const tableDataMensal = Array(12).fill(0);

    const extractMesAnoFromText = (texto) => {
        if (!texto) return null;
        let t = String(texto).toLowerCase();
        
        // Remove accents
        t = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        const map = {
            "janeiro":0,"jan":0,"fevereiro":1,"fev":1,"marco":2,"mar":2,
            "abril":3,"abr":3,"maio":4,"mai":4,"junho":5,"jun":5,
            "julho":6,"jul":6,"agosto":7,"ago":7,"setembro":8,"set":8,
            "outubro":9,"out":9,"novembro":10,"nov":10,"dezembro":11,"dez":11
        };
        
        let foundMonth = null;
        let foundYear = null;
        
        // Match explicit MM/YYYY or MM-YYYY
        const mmYyyy = t.match(/\b(0?[1-9]|1[0-2])[\/\-_\.](20[2-3][0-9])\b/);
        if (mmYyyy) {
           return { m: parseInt(mmYyyy[1], 10) - 1, y: parseInt(mmYyyy[2], 10) };
        }
        
        // Try to find month names
        for (let key in map) {
            // Match whole word if possible to avoid false positives like "amar" matching "mar"
            let regex = new RegExp(`\\b${key}\\b`);
            if (regex.test(t)) {
                foundMonth = map[key];
                break;
            }
        }
        
        // If not found with boundaries, allow substring matching
        if (foundMonth === null) {
            for (let key in map) {
                if (t.includes(key)) {
                    foundMonth = map[key];
                    break;
                }
            }
        }

        // Match year yyyy
        const yr = t.match(/\b(20[2-3][0-9])\b/);
        if (yr) {
            foundYear = parseInt(yr[1], 10);
        } else {
            // Match yy
            const yr2 = t.match(/[\/\-_\.]([2-3][0-9])\b/);
            if (yr2) {
                 foundYear = 2000 + parseInt(yr2[1], 10);
            }
        }

        if (foundMonth !== null && !foundYear) {
            foundYear = 2026;
        }
        
        if (foundMonth !== null) return { m: foundMonth, y: foundYear };
        if (foundYear) return { m: null, y: foundYear };
        return null;
    };

    if (vendasList && vendasList.length > 0) {
        vendasList.forEach(v => {
            let itemYear = null;
            let itemMonth = null;

            if (v.isFromReport) {
                const mesAnoNome = extractMesAnoFromText(v.reportNome);
                if (mesAnoNome && mesAnoNome.m !== null) {
                    itemYear = mesAnoNome.y || 2026;
                    itemMonth = mesAnoNome.m;
                } else {
                    itemYear = 2026;
                    // Will fallback to dataVenda for month ONLY
                }
            }

            if (itemYear === null || itemMonth === null) {
                const dateStr = v.dataVenda || v.inicioVigencia;
                if (!dateStr) return;
                const dateObj = new Date(dateStr);
                if (isNaN(dateObj)) return;
                
                if (itemYear === null) itemYear = dateObj.getFullYear();
                if (itemMonth === null) itemMonth = dateObj.getMonth();
            }

            if (itemYear !== selectedYear) return;
            const monthObj = itemMonth;
            
            const isV = v.vitalicio === 'Sim' || v.vitalicio === 'S' || (typeof v.vitalicio === 'string' && v.vitalicio.toLowerCase().startsWith('s'));
            if (vitalicioFiltro === 'Sim' && !isV) return;
            if (vitalicioFiltro === 'Não' && isV) return;
            
            let val = calculoTipo === 'comissao' ? v.comissao : v.valor;
            if (typeof val === 'string') {
                val = parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0;
            } else {
                val = parseFloat(val) || 0;
            }

            const isProtettaLoja = v.loja && v.loja.toUpperCase().includes(nomeEmpresaUpper);
            const isProtettaAssessoria = v.assessoria && v.assessoria.toUpperCase().includes(nomeEmpresaUpper);
            
            // Resolve corretor name using master metadata dictionary
            let corretorName = v.corretor || v.vendedor || "";
            if (!corretorName) {
                const meta = findClientMetadata(v.cliente, v.contrato);
                if (meta && meta.corretor) {
                    corretorName = meta.corretor;
                }
            }

            let normalizedCorretor = "Outros";
            if (corretorName) {
                const upperCorr = String(corretorName).toUpperCase().trim();
                if (upperCorr === "ASSESSORIA" || upperCorr.includes("ASSESSORIA")) {
                    normalizedCorretor = "Assessoria";
                } else if (
                    upperCorr === "PROTETTA" || 
                    upperCorr === "PROPER" || 
                    upperCorr === "CORRETORA" || 
                    upperCorr === "PROTETTA SEGUROS" || 
                    upperCorr === "PROPER SEGUROS" || 
                    upperCorr.includes("PROTETTA") || 
                    upperCorr.includes("PROPER") || 
                    upperCorr === nomeEmpresaUpper || 
                    upperCorr.includes(nomeEmpresaUpper)
                ) {
                    normalizedCorretor = displayNomeEmpresa;
                } else if (upperCorr === "CORRETOR INTERNO" || upperCorr.includes("INTERNO")) {
                    normalizedCorretor = "Corretor Interno";
                }
            }

            // Fallback to legacy checks if still Outros
            if (normalizedCorretor === "Outros") {
                if (isProtettaLoja) {
                    normalizedCorretor = displayNomeEmpresa;
                } else if (isProtettaAssessoria) {
                    normalizedCorretor = "Assessoria";
                }
            }

            // Populate brokerData
            if (brokerData[normalizedCorretor]) {
                brokerData[normalizedCorretor][monthObj] += val;
            } else {
                brokerData["Outros"][monthObj] += val;
            }

            // Só conta a empresa
            if (!isProtettaLoja && !isProtettaAssessoria && normalizedCorretor === "Outros") return;

            if (isProtettaLoja || normalizedCorretor === displayNomeEmpresa) processedData[nomeEmpresaUpper][monthObj] += val;
            if ((isProtettaAssessoria && !isProtettaLoja) || normalizedCorretor === "Assessoria") processedData[`${nomeEmpresaUpper} - ASSESSORIA`][monthObj] += val;

            processedData[`TOTAL ${nomeEmpresaUpper}`][monthObj] += val;

            // Acumula dados para Vendas Novas (parcelas 1, 2, 3)
            const pNum = parseInt(String(v.parcela || "").replace(/\D/g, ""), 10);
            const isVendaNova = pNum === 1 || pNum === 2 || pNum === 3;
            if (isVendaNova) {
                if (isProtettaLoja) processedVendasNovas[nomeEmpresaUpper][monthObj] += val;
                if (isProtettaAssessoria && !isProtettaLoja) processedVendasNovas[`${nomeEmpresaUpper} - ASSESSORIA`][monthObj] += val;
                processedVendasNovas[`TOTAL ${nomeEmpresaUpper}`][monthObj] += val;

                let isIncluded = false;
                if (selectedEntity === `${nomeEmpresaUpper} - ASSESSORIA` && isProtettaAssessoria && !isProtettaLoja) isIncluded = true;
                else if (selectedEntity === nomeEmpresaUpper && isProtettaLoja) isIncluded = true;
                else if (selectedEntity === `TOTAL ${nomeEmpresaUpper}`) isIncluded = true;

                if (isIncluded) {
                    totalVendasNovasCount += 1;
                    totalVendasNovasVidas += parseInt(v.vidas) || 0;
                }
            }
            
            let isIncludedInOperator = false;
            if (selectedEntity === `${nomeEmpresaUpper} - ASSESSORIA` && isProtettaAssessoria && !isProtettaLoja) isIncludedInOperator = true;
            else if (selectedEntity === nomeEmpresaUpper && isProtettaLoja) isIncludedInOperator = true;
            else if (selectedEntity === `TOTAL ${nomeEmpresaUpper}`) isIncludedInOperator = true;

            const originalOpName = (v.codigoOperadora || '').toUpperCase().trim();
            let opName = originalOpName;
            
            if (!opName || !isIncludedInOperator) return;

            // Map common aliases to ensure grouping
            if (opName.includes('PORTO')) opName = 'PORTO SEGURO';
            else if (opName.includes('MED SENIOR') || opName === 'MEDSENIOR') opName = 'MED SENIOR';
            else if (opName.includes('NOTRE DAME') || opName === 'NOTREDAME' || opName === 'GNDI') opName = 'NOTRE DAME';
            else if (opName.includes('SULA') || opName === 'SULAMERICA') opName = 'SULAMERICA';
            else if (opName.includes('TOKIO')) opName = 'TOKIO MARINE';

            if (!operatorData[opName]) {
                operatorData[opName] = Array(12).fill(0);
                recordedOperators.add(opName);
            }
            operatorData[opName][monthObj] += val;

            if (selectedTableOperator === 'Todas' || opName === selectedTableOperator) {
                tableDataMensal[monthObj] += val;
            }
        });
    }

    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const formatPercent = (val) => new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1 }).format(val);

    const handleChartHover = (e, el, chart) => {
        let hasActive = el && el.length > 0;
        if (!hasActive && chart && e) {
            const nearEl = chart.getElementsAtEventForMode(e.native || e, 'nearest', { intersect: false }, true);
            hasActive = nearEl && nearEl.length > 0;
        }
        if (e && e.native && e.native.target) {
            e.native.target.style.cursor = hasActive ? 'pointer' : 'default';
        }
    };

    const handleChartClick = (chartName, event, elements, chart) => {
        let activeElements = elements;
        if ((!activeElements || activeElements.length === 0) && chart && event) {
            activeElements = chart.getElementsAtEventForMode(event.native || event, 'nearest', { intersect: false }, true);
        }
        if (!activeElements || activeElements.length === 0) return;
        const element = activeElements[0];
        const index = element.index;
        const datasetIndex = element.datasetIndex;
        
        const label = chart.data.labels[index];
        const dataset = chart.data.datasets[datasetIndex];
        const datasetLabel = dataset.label;
        const rawValue = dataset.data[index];

        let title = chartName;
        let subtitle = '';
        let filteredSales = [];

        if (vendasList && vendasList.length > 0) {
            filteredSales = vendasList.filter(v => {
                let itemYear = null;
                let itemMonth = null;

                if (v.isFromReport) {
                    const mesAnoNome = extractMesAnoFromText(v.reportNome);
                    if (mesAnoNome && mesAnoNome.m !== null) {
                        itemYear = mesAnoNome.y || 2026;
                        itemMonth = mesAnoNome.m;
                    } else {
                        itemYear = 2026;
                    }
                }

                if (itemYear === null || itemMonth === null) {
                    const dateStr = v.dataVenda || v.inicioVigencia;
                    if (!dateStr) return false;
                    const dateObj = new Date(dateStr);
                    if (isNaN(dateObj)) return false;
                    if (itemYear === null) itemYear = dateObj.getFullYear();
                    if (itemMonth === null) itemMonth = dateObj.getMonth();
                }

                if (itemYear !== selectedYear) return false;

                const isV = v.vitalicio === 'Sim' || v.vitalicio === 'S' || (typeof v.vitalicio === 'string' && v.vitalicio.toLowerCase().startsWith('s'));
                if (vitalicioFiltro === 'Sim' && !isV) return false;
                if (vitalicioFiltro === 'Não' && isV) return false;

                const isProtettaLoja = v.loja && v.loja.toUpperCase().includes(nomeEmpresaUpper);
                const isProtettaAssessoria = v.assessoria && v.assessoria.toUpperCase().includes(nomeEmpresaUpper);

                let corretorNameTemp = v.corretor || v.vendedor || "";
                if (!corretorNameTemp) {
                    const meta = findClientMetadata(v.cliente, v.contrato);
                    if (meta && meta.corretor) {
                        corretorNameTemp = meta.corretor;
                    }
                }
                const hasCorretorValue = !!corretorNameTemp;
                if (!isProtettaLoja && !isProtettaAssessoria && !hasCorretorValue) return false;

                // Filter entity (Corretora / Assessoria / Total)
                if (selectedEntity === nomeEmpresaUpper && !isProtettaLoja) return false;
                if (selectedEntity === `${nomeEmpresaUpper} - ASSESSORIA` && (!isProtettaAssessoria || isProtettaLoja)) return false;

                if (chartName === 'Evolução Mensal' || chartName === 'Mensal') {
                    return itemMonth === index;
                } else if (chartName === 'Trimestral') {
                    const startMonth = index * 3;
                    const endMonth = startMonth + 2;
                    return itemMonth >= startMonth && itemMonth <= endMonth;
                } else if (chartName === 'Comparativo') {
                    let corretorName = v.corretor || v.vendedor || "";
                    if (!corretorName) {
                        const meta = findClientMetadata(v.cliente, v.contrato);
                        if (meta && meta.corretor) {
                            corretorName = meta.corretor;
                        }
                    }
                    let norm = "Outros";
                    if (corretorName) {
                        const uc = String(corretorName).toUpperCase().trim();
                        if (uc === "ASSESSORIA" || uc.includes("ASSESSORIA")) {
                            norm = "Assessoria";
                        } else if (
                            uc === "PROTETTA" || 
                            uc === "PROPER" || 
                            uc === "CORRETORA" || 
                            uc === "PROTETTA SEGUROS" || 
                            uc === "PROPER SEGUROS" || 
                            uc.includes("PROTETTA") || 
                            uc.includes("PROPER") || 
                            uc === nomeEmpresaUpper || 
                            uc.includes(nomeEmpresaUpper)
                        ) {
                            norm = displayNomeEmpresa;
                        } else if (uc === "CORRETOR INTERNO" || uc.includes("INTERNO")) {
                            norm = "Corretor Interno";
                        }
                    }
                    if (norm === "Outros") {
                        if (isProtettaLoja) norm = displayNomeEmpresa;
                        else if (isProtettaAssessoria) norm = "Assessoria";
                    }
                    return norm === label;
                } else if (chartName === 'Operadoras') {
                    const originalOpName = (v.codigoOperadora || '').toUpperCase().trim();
                    let opName = originalOpName;
                    if (opName.includes('PORTO')) opName = 'PORTO SEGURO';
                    else if (opName.includes('MED SENIOR') || opName === 'MEDSENIOR') opName = 'MED SENIOR';
                    else if (opName.includes('NOTRE DAME') || opName === 'NOTREDAME' || opName === 'GNDI') opName = 'NOTRE DAME';
                    else if (opName.includes('SULA') || opName === 'SULAMERICA') opName = 'SULAMERICA';
                    else if (opName.includes('TOKIO')) opName = 'TOKIO MARINE';

                    const matchesOp = opName === label;
                    if (!matchesOp) return false;

                    if (selectedOperatorMonth !== 'Todos') {
                        return itemMonth === parseInt(selectedOperatorMonth);
                    }
                    return true;
                } else if (chartName === 'Composição Mensal') {
                    if (itemMonth !== index) return false;
                    let corretorName = v.corretor || v.vendedor || "";
                    if (!corretorName) {
                        const meta = findClientMetadata(v.cliente, v.contrato);
                        if (meta && meta.corretor) {
                            corretorName = meta.corretor;
                        }
                    }
                    let norm = "Outros";
                    if (corretorName) {
                        const uc = String(corretorName).toUpperCase().trim();
                        if (uc === "ASSESSORIA" || uc.includes("ASSESSORIA")) {
                            norm = "Assessoria";
                        } else if (
                            uc === "PROTETTA" || 
                            uc === "PROPER" || 
                            uc === "CORRETORA" || 
                            uc === "PROTETTA SEGUROS" || 
                            uc === "PROPER SEGUROS" || 
                            uc.includes("PROTETTA") || 
                            uc.includes("PROPER") || 
                            uc === nomeEmpresaUpper || 
                            uc.includes(nomeEmpresaUpper)
                        ) {
                            norm = displayNomeEmpresa;
                        } else if (uc === "CORRETOR INTERNO" || uc.includes("INTERNO")) {
                            norm = "Corretor Interno";
                        }
                    }
                    if (norm === "Outros") {
                        if (isProtettaLoja) norm = displayNomeEmpresa;
                        else if (isProtettaAssessoria) norm = "Assessoria";
                    }
                    return norm === datasetLabel;
                } else if (chartName.startsWith('Vendas Novas')) {
                    const pNum = parseInt(String(v.parcela || "").replace(/\D/g, ""), 10);
                    const isVendaNova = pNum === 1 || pNum === 2 || pNum === 3;
                    if (!isVendaNova) return false;

                    if (chartName === 'Vendas Novas - Evolução') {
                        return itemMonth === index;
                    } else if (chartName === 'Vendas Novas - Distribuição') {
                        if (index === 0) return isProtettaLoja;
                        if (index === 1) return isProtettaAssessoria && !isProtettaLoja;
                    }
                }

                return true;
            }).map(v => {
                let valRaw = v.valor;
                if (typeof valRaw === 'string') {
                    valRaw = parseFloat(valRaw.replace(/\./g, '').replace(',', '.')) || 0;
                } else {
                    valRaw = parseFloat(valRaw) || 0;
                }
                let comRaw = v.comissao;
                if (typeof comRaw === 'string') {
                    comRaw = parseFloat(comRaw.replace(/\./g, '').replace(',', '.')) || 0;
                } else {
                    comRaw = parseFloat(comRaw) || 0;
                }
                return {
                    ...v,
                    valorParsed: valRaw,
                    comissaoParsed: comRaw
                };
            });
        }

        if (chartName === 'Evolução Mensal' || chartName === 'Mensal') {
            subtitle = `${months[index]} de ${selectedYear}`;
        } else if (chartName === 'Trimestral') {
            subtitle = `${index + 1}º Trimestre de ${selectedYear}`;
        } else if (chartName === 'Comparativo') {
            subtitle = label;
        } else if (chartName === 'Operadoras') {
            subtitle = `${label} (${selectedOperatorMonth === 'Todos' ? 'Ano Todo' : months[parseInt(selectedOperatorMonth)]})`;
        } else if (chartName === 'Composição Mensal') {
            subtitle = `${datasetLabel} - ${months[index]} de ${selectedYear}`;
        }

        if (vitalicioFiltro === 'Sim') {
            subtitle += ' - Apenas Vitalício';
        } else if (vitalicioFiltro === 'Não') {
            subtitle += ' - Apenas Não-Vitalício';
        }

        setPopupInfo({
            title: chartName,
            subtitle,
            label,
            value: rawValue,
            sales: filteredSales
        });
    };

    const data = processedData[selectedEntity] || Array(12).fill(0);
    const total = data.reduce((a,b)=>a+b,0);
    const lastMonthWithData = data.reduce((lastIdx, val, idx) => val !== 0 ? Math.max(lastIdx, idx) : lastIdx, -1);
    const divisor = lastMonthWithData >= 0 ? lastMonthWithData + 1 : 1;
    const avg = total / divisor;
    const maxVal = Math.max(...data, 0);
    const maxIdx = data.indexOf(maxVal);

    const cCorr = processedData[nomeEmpresaUpper];
    const cAss = processedData[`${nomeEmpresaUpper} - ASSESSORIA`];
    const totCorr = cCorr.reduce((a,b)=>a+b,0);
    const totAss = cAss.reduce((a,b)=>a+b,0);

    const totAssessoria = brokerData['Assessoria'].reduce((a,b)=>a+b,0);
    const totProtetta = brokerData[displayNomeEmpresa].reduce((a,b)=>a+b,0);
    const totCorretorInterno = brokerData['Corretor Interno'].reduce((a,b)=>a+b,0);
    const totOutros = brokerData['Outros'].reduce((a,b)=>a+b,0);

    const brokerColorMap = {
        'Assessoria': '#a855f7',       // Purple/Violet
        [displayNomeEmpresa]: '#2563eb',         // Blue
        'Corretor Interno': '#f59e0b',  // Amber/Orange
        'Outros': '#64748b'            // Slate
    };

    const brokerLabels = [];
    const brokerTotals = [];
    const brokerColors = [];

    if (totAssessoria > 0) {
        brokerLabels.push('Assessoria');
        brokerTotals.push(totAssessoria);
        brokerColors.push(brokerColorMap['Assessoria']);
    }
    if (totProtetta > 0) {
        brokerLabels.push(displayNomeEmpresa);
        brokerTotals.push(totProtetta);
        brokerColors.push(brokerColorMap[displayNomeEmpresa]);
    }
    if (totCorretorInterno > 0) {
        brokerLabels.push('Corretor Interno');
        brokerTotals.push(totCorretorInterno);
        brokerColors.push(brokerColorMap['Corretor Interno']);
    }
    if (totOutros > 0) {
        brokerLabels.push('Outros');
        brokerTotals.push(totOutros);
        brokerColors.push(brokerColorMap['Outros']);
    }

    if (brokerLabels.length === 0) {
        brokerLabels.push('Assessoria', displayNomeEmpresa, 'Corretor Interno');
        brokerTotals.push(0, 0, 0);
        brokerColors.push(brokerColorMap['Assessoria'], brokerColorMap[displayNomeEmpresa], brokerColorMap['Corretor Interno']);
    }

    const totalBrokerSum = brokerTotals.reduce((a,b)=>a+b,0);

    const dataVendasNovas = processedVendasNovas[selectedEntity] || Array(12).fill(0);
    const totalVendasNovas = dataVendasNovas.reduce((a,b)=>a+b,0);
    const cCorrVendasNovas = processedVendasNovas[nomeEmpresaUpper];
    const cAssVendasNovas = processedVendasNovas[`${nomeEmpresaUpper} - ASSESSORIA`];
    const totCorrVendasNovas = cCorrVendasNovas.reduce((a,b)=>a+b,0);
    const totAssVendasNovas = cAssVendasNovas.reduce((a,b)=>a+b,0);

    const quarterData = [
        data.slice(0,3).reduce((a,b)=>a+b,0), data.slice(3,6).reduce((a,b)=>a+b,0),
        data.slice(6,9).reduce((a,b)=>a+b,0), data.slice(9,12).reduce((a,b)=>a+b,0)
    ];

    const semesterData = [data.slice(0,6).reduce((a,b)=>a+b,0), data.slice(6,12).reduce((a,b)=>a+b,0)];

    // Aggregating operator data for the chart
    let opChartLabels = [];
    let opChartDataValues = [];
    let opChartColors = [];
    
    // Sort operators by total value desc
    const sortedOperators = Array.from(recordedOperators).map(op => {
        const totalOpVal = operatorData[op].reduce((a,b)=>a+b,0);
        return { name: op, total: totalOpVal };
    }).sort((a,b) => b.total - a.total);

    sortedOperators.forEach((opObj, index) => {
        opChartLabels.push(opObj.name);
        opChartColors.push(BASE_COLORS[index % BASE_COLORS.length]);
        
        if (selectedOperatorMonth === 'Todos') {
            opChartDataValues.push(opObj.total);
        } else {
            opChartDataValues.push(operatorData[opObj.name][parseInt(selectedOperatorMonth)]);
        }
    });

    // Table Grouping Logic
    const getTableRows = () => {
        const baseData = tableDataMensal;
        const totalBase = baseData.reduce((a, b) => a + b, 0);
        
        if (selectedTableGrouping === 'Mensal') {
            const avgBase = totalBase / (baseData.reduce((lastIdx, val, idx) => val !== 0 ? Math.max(lastIdx, idx) : lastIdx, -1) + 1 || 1);
            return baseData.map((val, idx) => ({
                label: months[idx],
                val,
                avg: avgBase,
                total: totalBase
            }));
        } else if (selectedTableGrouping === 'Trimestral') {
            const qData = [
                baseData.slice(0,3).reduce((a,b)=>a+b,0),
                baseData.slice(3,6).reduce((a,b)=>a+b,0),
                baseData.slice(6,9).reduce((a,b)=>a+b,0),
                baseData.slice(9,12).reduce((a,b)=>a+b,0)
            ];
            const avgBase = totalBase / (qData.filter(v => v !== 0).length || 1);
            return qData.map((val, idx) => ({
                label: `${idx + 1}º Trimestre`,
                val,
                avg: avgBase,
                total: totalBase
            }));
        } else if (selectedTableGrouping === 'Semestral') {
            const sData = [
                baseData.slice(0,6).reduce((a,b)=>a+b,0),
                baseData.slice(6,12).reduce((a,b)=>a+b,0)
            ];
            const avgBase = totalBase / (sData.filter(v => v !== 0).length || 1);
            return sData.map((val, idx) => ({
                label: `${idx + 1}º Semestre`,
                val,
                avg: avgBase,
                total: totalBase
            }));
        } else {
            return [{
                label: `Ano ${selectedYear}`,
                val: totalBase,
                avg: totalBase,
                total: totalBase
            }];
        }
    };

    const tableRows = getTableRows();

    const handleExportPDF = () => {
        const element = reportRef.current;
        const opt = {
            margin: 0.3,
            filename: `Relatorio_${nomeEmpresa}_${selectedYear}.pdf`,
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
                <div className="bg-[#111827] dark:bg-slate-900 rounded-xl p-4 md:px-6 md:py-0 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden h-auto md:h-16">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-16 h-16 bg-blue-500 rounded-full opacity-10 blur-xl"></div>
                    
                    <div className="flex-1 flex items-center h-full z-10 w-full py-2 md:py-0">
                        {logo ? (
                            <div className="bg-white rounded p-1 h-10 w-auto flex items-center justify-center border border-slate-200 shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.3)] ring-1 ring-white/20">
                                <img src={logo} alt={nomeEmpresa} className="h-full object-contain" />
                            </div>
                        ) : (
                            <div className="text-left">
                                <h2 className="text-xl font-bold text-slate-100 drop-shadow-[0_0_12px_rgba(255,255,255,0.5)] tracking-wide">{nomeEmpresaUpper}</h2>
                            </div>
                        )}
                    </div>

                    <div className="text-right z-10 hidden md:block w-full">
                        <h1 className="text-lg font-bold tracking-tight text-white leading-tight">{nomeEmpresa} Analytics</h1>
                        <p className="text-slate-400 text-xs font-light mt-0.5">Gestão Estratégica e Evolução de Vitalícios</p>
                    </div>
                </div>
            </header>

            <div className="mb-8 flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 relative no-print">
                <div className="flex items-center gap-3">
                    <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="bg-blue-50 text-blue-800 border-none font-bold rounded-lg px-4 py-2 outline-none">
                        {[ 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select value={calculoTipo} onChange={(e) => setCalculoTipo(e.target.value)} className="bg-emerald-50 text-emerald-800 border-none font-bold rounded-lg px-4 py-2 outline-none">
                        <option value="valor">Valor Total</option>
                        <option value="comissao">Comissões</option>
                    </select>
                    <select value={vitalicioFiltro} onChange={(e) => setVitalicioFiltro(e.target.value)} className="bg-amber-50 text-amber-800 border-none font-bold rounded-lg px-4 py-2 outline-none">
                        <option value="Todos">Todos os Lançamentos</option>
                        <option value="Sim">Apenas Vitalício</option>
                        <option value="Não">Apenas Não-Vitalício</option>
                    </select>
                </div>
                
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-end md:items-center relative">
                    <button onClick={handleExportPDF} className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
                        Baixar PDF
                    </button>
                    <select value={selectedEntity} onChange={(e) => setSelectedEntity(e.target.value)} className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded-lg block w-full md:w-64 p-2.5">
                        <option value={`${nomeEmpresaUpper} - ASSESSORIA`}>{`${nomeEmpresaUpper} - ASSESSORIA`}</option>
                        <option value={nomeEmpresaUpper}>{nomeEmpresaUpper} (Corretora)</option>
                        <option value={`TOTAL ${nomeEmpresaUpper}`}>TOTAL {nomeEmpresaUpper}</option>
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
                    <div className="mt-2 inline-flex items-center px-2.5 py-1 bg-purple-600 text-white text-sm font-extrabold rounded-lg uppercase tracking-wider shadow-sm shadow-purple-500/20">
                        {months[maxIdx]}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                <div className="lg:col-span-3 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6"><span className="w-2 h-6 bg-blue-600 rounded-full"></span> Evolução Mensal</h3>
                    <div className="aspect-[42/9]">
                        <Line
                            data={{ labels: months.map(m=>m.substring(0,3)), datasets: [{ label: 'Valor (R$)', data, borderColor: '#2563eb', backgroundColor: '#eff6ff', fill: true, tension: 0.3 }] }}
                            options={{ 
                                onClick: (e, el, chart) => handleChartClick('Evolução Mensal', e, el, chart),
                                onHover: (e, el, chart) => handleChartHover(e, el, chart),
                                responsive: true, 
                                maintainAspectRatio: false, 
                                plugins: { 
                                    legend: { display: false }, 
                                    datalabels: { display: true, color: chartTextColor, align: 'top', font: { weight: 'bold' }, formatter: v => new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v) } 
                                }, 
                                scales: { 
                                    y: { title: { display: false, text: 'Valor (R$)' }, beginAtZero: true, grace: '10%', ticks: { color: chartTextColor } }, 
                                    x: { title: { display: false, text: 'Mês' }, ticks: { color: chartTextColor } } 
                                } 
                            }}
                        />
                    </div>
                </div>
                
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4"><span className="w-2 h-6 bg-teal-500 rounded-full"></span> Mensal</h3>
                    <div className="aspect-[21/9]">
                        <Bar 
                            data={{ 
                                labels: months.map(m => m.substring(0, 3)), 
                                datasets: [{ 
                                    label: 'Valor (R$)', 
                                    data: data, 
                                    backgroundColor: '#2dd4bf', 
                                    borderRadius: 4 
                                }] 
                            }} 
                            options={{ 
                                onClick: (e, el, chart) => handleChartClick('Mensal', e, el, chart),
                                onHover: (e, el, chart) => handleChartHover(e, el, chart),
                                layout: { padding: { top: 30 } }, 
                                responsive: true, 
                                maintainAspectRatio: false, 
                                plugins: { 
                                    legend: { display: false }, 
                                    datalabels: { 
                                        display: true, 
                                        color: chartTextColor, 
                                        anchor: 'end', 
                                        align: 'top', 
                                        formatter: v => v > 0 ? new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v) : '', 
                                        font: { size: 9, weight: 'bold' } 
                                    } 
                                }, 
                                scales: { 
                                    y: { display: false }, 
                                    x: { grid: { display: false }, ticks: { color: chartTextColor, font: { size: 8 } } } 
                                } 
                            }} 
                        />
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4"><span className="w-2 h-6 bg-emerald-500 rounded-full"></span> Trimestral</h3>
                    <div className="aspect-[21/9]">
                        <Bar 
                            data={{ labels: ['1º T', '2º T', '3º T', '4º T'], datasets: [{ label: 'Valor (R$)', data: quarterData, backgroundColor: ['#60a5fa', '#34d399', '#facc15', '#f87171'], borderRadius: 6 }] }} 
                            options={{ 
                                onClick: (e, el, chart) => handleChartClick('Trimestral', e, el, chart),
                                onHover: (e, el, chart) => handleChartHover(e, el, chart),
                                layout: { padding: { top: 30 } }, 
                                responsive: true, 
                                maintainAspectRatio: false, 
                                plugins: { 
                                    legend: { display: false }, 
                                    datalabels: { display: true, color: chartTextColor, anchor: 'end', align: 'top', formatter: (v,c) => total>0 ? (v*100/total).toFixed(0)+'%' : '0%', font: {size: 11, weight: 'bold'} } 
                                }, 
                                scales: { 
                                    y: {display:false}, 
                                    x: {grid:{display:false}, ticks: { color: chartTextColor }} 
                                } 
                            }} 
                        />
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4"><span className="w-2 h-6 bg-indigo-500 rounded-full"></span> Comparativo Mensal</h3>
                    <div className="aspect-[21/9] max-w-[65%] mx-auto">
                        <Doughnut 
                            data={{ labels: brokerLabels, datasets: [{ label: 'Valor (R$)', data: brokerTotals, backgroundColor: brokerColors, borderWidth: 0 }] }} 
                            options={{ 
                                onClick: (e, el, chart) => handleChartClick('Comparativo', e, el, chart),
                                onHover: (e, el, chart) => handleChartHover(e, el, chart),
                                responsive: true, 
                                maintainAspectRatio: false, 
                                cutout: '60%', 
                                plugins: { 
                                    legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, color: chartTextColor } }, 
                                    datalabels: { display: true, color: '#ffffff', font: { weight: 'bold' }, formatter: (v,c) => (v / (totalBrokerSum || 1) * 100).toFixed(0)+'%' } 
                                } 
                            }} 
                        />
                    </div>
                </div>
            </div>

            <div className={`grid grid-cols-1 ${nomeEmpresaUpper === 'PROTETTA' || nomeEmpresaUpper === 'PROPER' ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-8 mb-8`}>
                <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="mb-6">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <span className="w-2.5 h-6 bg-emerald-500 rounded-full"></span> Vendas Novas
                        </h2>
                        <p className="text-slate-400 text-xs mt-1">Vendas com parcelas 1, 2 e 3</p>
                    </div>
                    <div className="h-[210px]">
                        <Bar 
                            data={{ 
                                labels: months.map(m=>m.substring(0,3)), 
                                datasets: [{ 
                                    label: 'Valor (R$)', 
                                    data: dataVendasNovas, 
                                    backgroundColor: '#10b981', 
                                    borderRadius: 4, 
                                    maxBarThickness: 41 
                                }] 
                            }}
                            options={{ 
                                onClick: (e, el, chart) => handleChartClick('Vendas Novas - Evolução', e, el, chart),
                                onHover: (e, el, chart) => handleChartHover(e, el, chart),
                                layout: { padding: { top: 30 } }, 
                                responsive: true, 
                                maintainAspectRatio: false, 
                                plugins: { 
                                    legend: { display: false }, 
                                    datalabels: { 
                                        display: true, 
                                        color: chartTextColor, 
                                        anchor: 'end', 
                                        align: 'top', 
                                        formatter: v => v > 0 ? new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v) : '', 
                                        font: { size: 11, weight: 'bold' } 
                                    } 
                                }, 
                                scales: { 
                                    y: { display: false }, 
                                    x: { title: { display: false }, grid: { display: false }, ticks: { color: chartTextColor, font: { size: 9 } } } 
                                } 
                            }}
                        />
                    </div>
                </div>

                <div className={`${nomeEmpresaUpper === 'PROTETTA' || nomeEmpresaUpper === 'PROPER' ? 'lg:col-span-1' : 'lg:col-span-2'} bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700`}>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6"><span className="w-2 h-6 bg-orange-400 rounded-full"></span> Composição Mensal</h3>
                    <div className="h-[210px]">
                        <Bar 
                            data={{ 
                                labels: months.map(m=>m.substring(0,3)), 
                                datasets: [
                                    totAssessoria > 0 && { label: 'Assessoria', data: brokerData['Assessoria'], backgroundColor: brokerColorMap['Assessoria'], borderRadius: 4, maxBarThickness: 41 },
                                    totProtetta > 0 && { label: displayNomeEmpresa, data: brokerData[displayNomeEmpresa], backgroundColor: brokerColorMap[displayNomeEmpresa], borderRadius: 4, maxBarThickness: 41 },
                                    totCorretorInterno > 0 && { label: 'Corretor Interno', data: brokerData['Corretor Interno'], backgroundColor: brokerColorMap['Corretor Interno'], borderRadius: 4, maxBarThickness: 41 },
                                    totOutros > 0 && { label: 'Outros', data: brokerData['Outros'], backgroundColor: brokerColorMap['Outros'], borderRadius: 4, maxBarThickness: 41 }
                                ].filter(Boolean)
                            }}
                            options={{ 
                                onClick: (e, el, chart) => handleChartClick('Composição Mensal', e, el, chart),
                                onHover: (e, el, chart) => handleChartHover(e, el, chart),
                                layout: { padding: { top: 30 } }, 
                                responsive: true, 
                                maintainAspectRatio: false, 
                                plugins: { 
                                    legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, color: chartTextColor } }, 
                                    datalabels: { display: true, color: chartTextColor, anchor: 'end', align: 'top', formatter: v => v > 0 ? new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v) : '', font: {size: 11, weight: 'bold'} } 
                                }, 
                                scales: { 
                                    y: { display: false }, 
                                    x: { title: { display: false, text: 'Mês' }, grid: { display: false }, ticks: { color: chartTextColor, font: {size: 9} } } 
                                } 
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Seção Desempenho por Operadora */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 mb-8">
                <div className="border-b border-slate-100 dark:border-slate-700 pb-4 mb-6 flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <span className="w-2.5 h-6 bg-blue-500 rounded-full"></span> Desempenho por Operadora
                        </h3>
                        <p className="text-slate-400 text-xs mt-1">Valores de comissão consolidados por operadora</p>
                    </div>
                    <select value={selectedOperatorMonth} onChange={e => setSelectedOperatorMonth(e.target.value)} className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm text-slate-700 dark:text-slate-300">
                        <option value="Todos">Todos os Meses</option>
                        {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                </div>

                <div className="w-full">
                    <div className="h-[156px]">
                        <Bar 
                            data={{ labels: opChartLabels, datasets: [{ label: 'Valor (R$)', data: opChartDataValues, backgroundColor: opChartColors, borderRadius: 4, maxBarThickness: 41 }] }}
                            options={{ 
                                onClick: (e, el, chart) => handleChartClick('Operadoras', e, el, chart),
                                onHover: (e, el, chart) => handleChartHover(e, el, chart),
                                layout: { padding: { top: 30 } }, 
                                responsive: true, 
                                maintainAspectRatio: false, 
                                plugins: { 
                                    legend: { display: false }, 
                                    datalabels: { display: true, color: chartTextColor, anchor: 'end', align: 'top', formatter: v => new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v), font: {size: 11, weight: 'bold'} } 
                                }, 
                                scales: { 
                                    y: { display: false }, 
                                    x: { title: { display: false }, grid: { display: false }, ticks: { color: chartTextColor, font: {size: 9} } } 
                                } 
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden mb-8">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Detalhamento Financeiro</h3>
                    <div className="flex flex-col md:flex-row gap-3">
                        <select 
                            value={selectedTableOperator} 
                            onChange={e => setSelectedTableOperator(e.target.value)} 
                            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm text-slate-700 dark:text-slate-300"
                        >
                            <option value="Todas">Todas as Operadoras</option>
                            {Array.from(recordedOperators).sort().map(op => (
                                <option key={op} value={op}>{op}</option>
                            ))}
                        </select>
                        <select 
                            value={selectedTableGrouping} 
                            onChange={e => setSelectedTableGrouping(e.target.value)} 
                            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm text-slate-700 dark:text-slate-300"
                        >
                            <option value="Mensal">Mensal</option>
                            <option value="Trimestral">Trimestral</option>
                            <option value="Semestral">Semestral</option>
                            <option value="Anual">Anual</option>
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 sticky top-0 z-10 shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]">
                            <tr><th className="px-6 py-2 uppercase font-semibold text-xs">Período</th><th className="px-6 py-2 uppercase font-semibold text-xs">Status</th><th className="px-6 py-2 uppercase font-semibold text-xs text-right">Part. Anual</th><th className="px-6 py-2 uppercase font-semibold text-xs text-right text-emerald-600 dark:text-emerald-400">Valor</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 text-slate-700 dark:text-slate-300">
                            {tableRows.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-6 py-2 font-medium text-xs">{row.label}</td>
                                    <td className="px-6 py-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                            row.val === 0 
                                                ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' 
                                                : row.val >= row.avg 
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                                    : 'bg-yellow-100 text-yellow-800 dark:bg-amber-900/30 dark:text-amber-400'
                                        }`}>
                                            {row.val === 0 ? 'Sem Movimento' : row.val >= row.avg ? 'Acima da Média' : 'Abaixo da Média'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-2 text-right text-xs">{row.total > 0 ? formatPercent(row.val/row.total) : '0%'}</td>
                                    <td className="px-6 py-2 text-right font-bold text-xs">{formatCurrency(row.val)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Detalhes dos Gráficos */}
            {popupInfo && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 no-print">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
                        
                        {/* Header do Popout */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
                                    <BarChart3 size={20} />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black tracking-wider text-blue-600 dark:text-blue-400 uppercase">Detalhamento Gráfico</span>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">
                                        {popupInfo.title}
                                    </h3>
                                    <p className="text-xs text-slate-400 font-medium">
                                        {popupInfo.subtitle}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setPopupInfo(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Corpo do Popout */}
                        <div className="p-6 overflow-y-auto space-y-6">
                            
                            {/* KPI Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                        <DollarSign size={12} className="text-blue-500" />
                                        {calculoTipo === 'comissao' ? 'Total Comissão' : 'Volume Negociado'}
                                    </p>
                                    <h4 className="text-xl font-extrabold text-slate-800 dark:text-white">
                                        {formatCurrency(popupInfo.value)}
                                    </h4>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                        <Award size={12} className="text-emerald-500" />
                                        Contratos Ativos
                                    </p>
                                    <h4 className="text-xl font-extrabold text-slate-800 dark:text-white">
                                        {popupInfo.sales.length} {popupInfo.sales.length === 1 ? 'Venda' : 'Vendas'}
                                    </h4>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                        <Users size={12} className="text-purple-500" />
                                        Total de Vidas
                                    </p>
                                    <h4 className="text-xl font-extrabold text-slate-800 dark:text-white">
                                        {popupInfo.sales.reduce((acc, v) => acc + (parseInt(v.vidas) || 0), 0)}
                                    </h4>
                                </div>
                            </div>

                            {/* Tabela de Vendas Correspondentes */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Contratos Relacionados</h4>
                                
                                {popupInfo.sales.length === 0 ? (
                                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-950/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                        <p className="text-xs text-slate-400 font-medium">Dados consolidados no relatório.</p>
                                        <p className="text-[10px] text-slate-500 mt-1">Este gráfico representa o somatório consolidado de extratos importados para a competência indicada ou filtro de busca.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl max-h-[300px] overflow-y-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-400 uppercase font-bold text-[10px] tracking-wider sticky top-0 border-b border-slate-100 dark:border-slate-800 z-10">
                                                <tr>
                                                    <th className="px-4 py-2.5">Cliente</th>
                                                    <th className="px-4 py-2.5">Operadora</th>
                                                    <th className="px-4 py-2.5 text-center">Vigência</th>
                                                    <th className="px-4 py-2.5 text-center">Vidas</th>
                                                    <th className="px-4 py-2.5 text-right">Valor Parcela</th>
                                                    <th className="px-4 py-2.5 text-right text-emerald-600 dark:text-emerald-400">Comissão</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                                                {popupInfo.sales.map((sale, sIdx) => (
                                                    <tr key={sIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                        <td className="px-4 py-2.5">
                                                            <div className="font-semibold text-slate-800 dark:text-slate-200 max-w-[200px] truncate" title={sale.cliente}>
                                                                {sale.cliente || "NÃO INFORMADO"}
                                                            </div>
                                                            <span className="text-[10px] text-slate-400 font-medium block">
                                                                {sale.corretor || "Corretora"}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-bold text-[10px]">
                                                                {sale.codigoOperadora || sale.operadora || "OUTROS"}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-center font-mono">
                                                            {sale.inicioVigencia || sale.dataVenda || "—"}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-center font-bold">
                                                            {sale.vidas || "—"}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right font-mono">
                                                            {formatCurrency(sale.valorParsed)}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                            {formatCurrency(sale.comissaoParsed)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                        </div>

                        {/* Rodapé do Popout */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end">
                            <button 
                                onClick={() => setPopupInfo(null)}
                                className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl transition-all shadow-sm"
                            >
                                Fechar Detalhamento
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardControle;
