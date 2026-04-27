// Constantes do sistema
export const SYSTEM_MODULES = [
    { id: 'dashboard', label: 'Visão Geral (Dashboard)' },
    { id: 'vendas', label: 'Vendas de Serviços' },
    { id: 'clientes', label: 'Gestão de Clientes' },
    { id: 'processar', label: 'Relatórios de Comissão (Processamento)' },
    { id: 'nfe', label: 'Emissor NFS-e (Prefeitura)' },
    { id: 'historico', label: 'Histórico de Relatórios Salvos' },
    { id: 'gestor', label: 'Gestor de Extratos (Arquivos Internos)' },
    { id: 'usuarios', label: 'Controle de Acessos e Permissões' },
    { id: 'settings', label: 'Configurações do Sistema e Backups' }
];

export const EMPRESAS_INTERNAS = ["Protetta"];
export const CATEGORIAS = ["Operadoras", "Seguradoras"];
export const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export const dataDeHojeInterna = () => new Date().toISOString().split('T')[0];

export const formatarMoeda = (valor) => {
    if (valor == null) return '0,00';
    const num = Number(valor);
    return isNaN(num) ? '0,00' : num.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatarDataVisivel = (dataString) => {
    if(!dataString) return '--/--/----';
    const partes = dataString.split('-');
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : dataString;
};

export const printColLabels = {
    cod: 'Cód.', contrato: 'Contrato', op: 'Op.', vidas: 'Vidas', 
    cliente: 'Cliente', data: 'Data', loja: 'Loja', servico: 'Serviço', 
    desconto: 'Desc.', corretor: 'Corretor', parc: 'Parc.', 
    inicioVig: 'Início Vig.', nfe: 'NF-e', vitalicio: 'Vitalício', 
    assessoria: 'Assessoria', pagamento: 'Pagamento', valorTotal: 'Valor Total', comissao: 'Comissão'
};

export const defaultPrintCols = Object.keys(printColLabels).reduce((acc, key) => ({ ...acc, [key]: true }), {});

export const calcularParcelaDaVigencia = (inicioVigencia, dataRecibo) => {
    try {
        if(!inicioVigencia || !dataRecibo) return '';
        let parseDate = (d) => {
            if(d.includes('/')) {
                const parts = d.split('/');
                if (parts.length === 2) {
                    return new Date(parts[1], parts[0] - 1, 1);
                }
                return new Date(parts[2], parts[1] - 1, parts[0]);
            }
            if(d.includes('-')) {
                const parts = d.split('-');
                if(parts.length === 2) {
                     return new Date(parts[0], parts[1] - 1, 1);
                }
                return new Date(parts[0], parts[1] - 1, parts[2]);
            }
            return new Date(d);
        };
        
        let dA = parseDate(inicioVigencia);
        let dB = parseDate(dataRecibo);
        
        if(isNaN(dA.getTime()) || isNaN(dB.getTime())) return '';
        
        const anosDiff = dB.getFullYear() - dA.getFullYear();
        const mesesDiff = dB.getMonth() - dA.getMonth();
        
        const totalMeses = anosDiff * 12 + mesesDiff;
        if(totalMeses < 0) return '1';
        return (totalMeses + 1).toString();
    } catch(e) {
        return '';
    }
};

export const validarCPF = (cpf) => {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf === '' || cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let add = 0;
    for (let i = 0; i < 9; i++) add += parseInt(cpf.charAt(i)) * (10 - i);
    let rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(9))) return false;
    add = 0;
    for (let i = 0; i < 10; i++) add += parseInt(cpf.charAt(i)) * (11 - i);
    rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(10))) return false;
    return true;
};

export const validarCNPJ = (cnpj) => {
    cnpj = cnpj.replace(/[^\d]+/g, '');
    if (cnpj === '' || cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    let digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }
    let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado !== parseInt(digitos.charAt(0))) return false;
    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }
    resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado !== parseInt(digitos.charAt(1))) return false;
    return true;
};

export const validarCpfCnpj = (val) => {
    if (!val) return false;
    const nums = val.replace(/\D/g, '');
    if (nums.length === 11) return validarCPF(nums);
    if (nums.length === 14) return validarCNPJ(nums);
    return false;
};