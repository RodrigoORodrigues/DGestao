// Initial realistic mock data for Financeiro module matching screenshots

export const INITIAL_CONTAS_PAGAR = [
  {
    id: "cp-1",
    descricao: "COMP. 04/26 VIVO CELULAR (21) 99507-5507",
    entidade: "TELEFONICA BRASIL S.A. (VIVO)",
    pagamento: "Boleto Bancário",
    data: "2026-07-01",
    situacao: "Confirmado",
    valor: 64.00,
    planoContas: "Telefonia e internet",
    centroCusto: "ESCRITÓRIO",
    loja: "PROTETTA SEGUROS"
  },
  {
    id: "cp-2",
    descricao: "COMP. 04/26 VIVO CELULAR (21) 96785-1919",
    entidade: "TELEFONICA BRASIL S.A. (VIVO)",
    pagamento: "Boleto Bancário",
    data: "2026-07-01",
    situacao: "Confirmado",
    valor: 49.00,
    planoContas: "Telefonia e internet",
    centroCusto: "ESCRITÓRIO",
    loja: "PROTETTA SEGUROS"
  },
  {
    id: "cp-3",
    descricao: "COMP. 04/26 VIVO CELULAR (21) 97160-6868",
    entidade: "TELEFONICA BRASIL S.A. (VIVO)",
    pagamento: "Boleto Bancário",
    data: "2026-07-01",
    situacao: "Confirmado",
    valor: 64.00,
    planoContas: "Telefonia e internet",
    centroCusto: "ESCRITÓRIO",
    loja: "PROTETTA SEGUROS"
  },
  {
    id: "cp-4",
    descricao: "COMP. 04/26 VIVO CELULAR (21) 96760-5412",
    entidade: "TELEFONICA BRASIL S.A. (VIVO)",
    pagamento: "Boleto Bancário",
    data: "2026-07-01",
    situacao: "Confirmado",
    valor: 64.00,
    planoContas: "Telefonia e internet",
    centroCusto: "ESCRITÓRIO",
    loja: "PROTETTA SEGUROS"
  },
  {
    id: "cp-5",
    descricao: "VALERIA - COMISSÃO",
    entidade: "VALERIA MARIA DA SILVA MOSQUEIRA",
    pagamento: "PIX",
    data: "2026-07-02",
    situacao: "Confirmado",
    valor: 929.19,
    planoContas: "Comissão de vendedores, cash back, bonificacao",
    centroCusto: "VENDAS",
    loja: "PROTETTA SEGUROS"
  },
  {
    id: "cp-6",
    descricao: "RIO DESCARTAVEIS",
    entidade: "RIODESCARTAVEIS EMBALAGENS PLASTICAS LTDA (RIO DESCARTAVEIS)",
    pagamento: "Boleto Bancário",
    data: "2026-07-02",
    situacao: "Confirmado",
    valor: 214.67,
    planoContas: "Compras",
    centroCusto: "ESCRITÓRIO",
    loja: "PROTETTA SEGUROS"
  },
  {
    id: "cp-7",
    descricao: "COMP. ALUGUEL DE PAOLI BERENICE L.S. PALHARES",
    entidade: "BERENICE (Aluguel Depooli PC aluguel)",
    pagamento: "Boleto Bancário",
    data: "2026-07-02",
    situacao: "Confirmado",
    valor: 1150.00,
    planoContas: "Aluguel",
    centroCusto: "ESCRITÓRIO",
    loja: "PROTETTA SEGUROS"
  },
  {
    id: "cp-8",
    descricao: "REEMBOLSO - JONATAS",
    entidade: "JONATAS GOMES DO NASCIMENTO",
    pagamento: "PIX",
    data: "2026-07-02",
    situacao: "Confirmado",
    valor: 274.94,
    planoContas: "Taxi, Uber, despesas de escritório",
    centroCusto: "ESCRITÓRIO",
    loja: "PROTETTA SEGUROS"
  },
  {
    id: "cp-9",
    descricao: "COMISSÃO - ANDREA (PRIMORDIAL)",
    entidade: "RENATO DORNELAS - ANDREIA (PRIMORDIAL)",
    pagamento: "PIX",
    data: "2026-07-02",
    situacao: "Confirmado",
    valor: 369.96,
    planoContas: "Comissão de vendedores, cash back, bonificacao",
    centroCusto: "VENDAS",
    loja: "PROTETTA SEGUROS"
  },
  {
    id: "cp-10",
    descricao: "COMISSÃO - PAULO VICENTE",
    entidade: "M & V CONSULTORIA E CORRETORA DE SEGUROS LTDA (M & V CONSULTORIA E CORRETORA)",
    pagamento: "PIX",
    data: "2026-07-02",
    situacao: "Confirmado",
    valor: 1361.48,
    planoContas: "Comissão de vendedores, cash back, bonificacao",
    centroCusto: "VENDAS",
    loja: "PROTETTA SEGUROS"
  },
  {
    id: "cp-11",
    descricao: "COND. JULHO/26",
    entidade: "CONDOMINIO DO EDIFICIO RODOLPHO DE PAOLI (COND. DE PAOLI)",
    pagamento: "Boleto Bancário",
    data: "2026-07-02",
    situacao: "Confirmado",
    valor: 2982.93,
    planoContas: "Aluguel",
    centroCusto: "ESCRITÓRIO",
    loja: "PROTETTA SEGUROS"
  },
  {
    id: "cp-12",
    descricao: "HOSPEDAGEM SITE",
    entidade: "WA MARKETING, DESENVOLVIMENTO & WEBHOST LTDA (AGENCIA WA)",
    pagamento: "Boleto Bancário",
    data: "2026-07-02",
    situacao: "Confirmado",
    valor: 96.15,
    planoContas: "Licença ou aluguel de softwares",
    centroCusto: "ESCRITÓRIO",
    loja: "PROTETTA SEGUROS"
  },
  {
    id: "cp-13",
    descricao: "DARM COD 510-7 BERENICE L.S. PALHARES 06/10",
    entidade: "BERENICE IPTU",
    pagamento: "Boleto Bancário",
    data: "2026-07-07",
    situacao: "Confirmado",
    valor: 503.20,
    planoContas: "Impostos - IPTU",
    centroCusto: "ESCRITÓRIO",
    loja: "PROTETTA SEGUROS"
  }
];

export const INITIAL_CONTAS_RECEBER = [
  {
    id: "cr-1",
    descricao: "Nota fiscal de serviço nº 2505",
    entidade: "AMIL ASSISTENCIA MEDICA INTERNACIONAL S.A. (AMIL (s CODIGOS e ISS a%))",
    pagamento: "Crédito em conta",
    data: "2026-01-02",
    nfse: "2505",
    nfe: "",
    situacao: "Confirmado",
    valor: 1402.55,
    planoContas: "Receitas de Vendas",
    centroCusto: "VENDAS",
    loja: "PROTETTA SEGUROS"
  },
  {
    id: "cr-2",
    descricao: "Nota fiscal de serviço nº 12",
    entidade: "GRUPO HOSPITALAR DO RIO DE JANEIRO LTDA (ASSIM SAUDE s% ISS (GRUPO HOSPITALAR))",
    pagamento: "Crédito em conta",
    data: "2026-01-15",
    nfse: "12",
    nfe: "",
    situacao: "Confirmado",
    valor: 2182.70,
    planoContas: "Receitas de Vendas",
    centroCusto: "VENDAS",
    loja: "PROTETTA SEGUROS"
  },
  {
    id: "cr-3",
    descricao: "Nota fiscal de serviço nº 52",
    entidade: "GRUPO HOSPITALAR DO RIO DE JANEIRO LTDA (ASSIM SAUDE s% ISS (GRUPO HOSPITALAR))",
    pagamento: "Crédito em conta",
    data: "2026-01-30",
    nfse: "52",
    nfe: "",
    situacao: "Confirmado",
    valor: 678.66,
    planoContas: "Receitas de Vendas",
    centroCusto: "VENDAS",
    loja: "PROTETTA SEGUROS"
  }
];

export const INITIAL_BOLETOS = [
  {
    id: "bol-1",
    numBoleto: "000129384",
    cliente: "AMIL ASSISTENCIA MEDICA INTERNACIONAL S.A.",
    loja: "PROTETTA SEGUROS",
    dataEmissao: "2026-01-02",
    dataVencimento: "2026-01-15",
    valor: 1402.55,
    situacao: "Confirmado",
    planoContas: "Receitas de Vendas",
    centroCusto: "VENDAS",
    contaBancaria: "Itaú - Ag. 0123 C/C 45678-9",
    formaRecebimento: "Boleto Bancário"
  },
  {
    id: "bol-2",
    numBoleto: "000129385",
    cliente: "GRUPO HOSPITALAR DO RIO DE JANEIRO LTDA",
    loja: "PROTETTA SEGUROS",
    dataEmissao: "2026-01-15",
    dataVencimento: "2026-01-30",
    valor: 2182.70,
    situacao: "Confirmado",
    planoContas: "Receitas de Vendas",
    centroCusto: "VENDAS",
    contaBancaria: "Itaú - Ag. 0123 C/C 45678-9",
    formaRecebimento: "Boleto Bancário"
  }
];

export const INITIAL_OPCOES_AUXILIARES = {
  caixas: [
    { id: "cx-1", nome: "Caixa Geral / Principal", saldo: 1500.00, responsavel: "Financeiro" },
    { id: "cx-2", nome: "Caixa Pequenas Despesas (Fundo Fixo)", saldo: 350.00, responsavel: "Recepção" }
  ],
  contasBancarias: [
    { id: "cb-1", banco: "Banco Itaú (341)", agencia: "0123", conta: "45678-9", nome: "Itaú - Conta Corrente Principal", saldo: 42500.00 },
    { id: "cb-2", banco: "Banco Bradesco (237)", agencia: "0456", conta: "12345-6", nome: "Bradesco - Operacional", saldo: 18200.00 },
    { id: "cb-3", banco: "Banco do Brasil (001)", agencia: "1289", conta: "98765-4", nome: "BB - Arrecadação", saldo: 29760.98 }
  ],
  formasPagamento: [
    {
      id: "fp-1",
      nome: "PIX QrCode / Chave CNPJ",
      categoria: "PIX",
      finalidade: "Ambos",
      taxaPercentual: 0.00,
      taxaFixa: 0.00,
      prazoDias: 0,
      contaDestino: "Itaú - Conta Corrente Principal",
      ativo: true,
      instrucoes: "Chave CNPJ: 12.345.678/0001-90. Recebimento e pagamento instantâneo D+0."
    },
    {
      id: "fp-2",
      nome: "Boleto Bancário Itaú",
      categoria: "Boleto",
      finalidade: "Ambos",
      taxaPercentual: 0.00,
      taxaFixa: 2.50,
      prazoDias: 2,
      contaDestino: "Itaú - Conta Corrente Principal",
      ativo: true,
      instrucoes: "Taxa de liquidação R$ 2,50 por boleto pago. Compensação em D+2 dias úteis."
    },
    {
      id: "fp-3",
      nome: "Cartão de Crédito (Visa / Mastercard)",
      categoria: "Cartão de Crédito",
      finalidade: "Recebimento",
      taxaPercentual: 2.99,
      taxaFixa: 0.39,
      prazoDias: 30,
      contaDestino: "Itaú - Conta Corrente Principal",
      ativo: true,
      instrucoes: "Taxa MDR de 2,99% + R$ 0,39 por transação. Repasse antecipável."
    },
    {
      id: "fp-4",
      nome: "Cartão de Débito (Visa / Elo / Master)",
      categoria: "Cartão de Débito",
      finalidade: "Recebimento",
      taxaPercentual: 1.19,
      taxaFixa: 0.00,
      prazoDias: 1,
      contaDestino: "Itaú - Conta Corrente Principal",
      ativo: true,
      instrucoes: "Taxa de 1,19%. Repasse em D+1 dia útil."
    },
    {
      id: "fp-5",
      nome: "Crédito em Conta Corrente",
      categoria: "Crédito em Conta",
      finalidade: "Ambos",
      taxaPercentual: 0.00,
      taxaFixa: 0.00,
      prazoDias: 0,
      contaDestino: "Itaú - Conta Corrente Principal",
      ativo: true,
      instrucoes: "Depósito ou transferência direta entre contas bancárias."
    },
    {
      id: "fp-6",
      nome: "Transferência TED / DOC / DAE",
      categoria: "Transferência",
      finalidade: "Pagamento",
      taxaPercentual: 0.00,
      taxaFixa: 0.00,
      prazoDias: 0,
      contaDestino: "Bradesco - Operacional",
      ativo: true,
      instrucoes: "Transferência bancária tradicional operada pelo IB do banco."
    },
    {
      id: "fp-7",
      nome: "Dinheiro / Espécie (Caixa Físico)",
      categoria: "Dinheiro",
      finalidade: "Ambos",
      taxaPercentual: 0.00,
      taxaFixa: 0.00,
      prazoDias: 0,
      contaDestino: "Caixa Geral / Principal",
      ativo: true,
      instrucoes: "Pagamento diretamente na recepção em cédulas físicas."
    }
  ],
  planoContas: [
    { id: "pc-1", codigo: "1.0", nome: "Receita bruta", tipo: "Receita" },
    { id: "pc-2", codigo: "1.1", nome: "Receitas de vendas", tipo: "Receita" },
    { id: "pc-3", codigo: "2.0", nome: "Deduções", tipo: "Despesa" },
    { id: "pc-4", codigo: "2.1", nome: "Impostos sobre vendas", tipo: "Despesa" },
    { id: "pc-5", codigo: "2.2", nome: "Comissões sobre vendas", tipo: "Despesa" },
    { id: "pc-6", codigo: "3.0", nome: "Despesas operacionais", tipo: "Despesa" },
    { id: "pc-7", codigo: "3.1", nome: "Telefonia e internet", tipo: "Despesa" },
    { id: "pc-8", codigo: "3.2", nome: "Aluguel e Condomínio", tipo: "Despesa" },
    { id: "pc-9", codigo: "3.3", nome: "Licença de softwares", tipo: "Despesa" }
  ],
  centrosCustos: [
    { id: "cc-1", codigo: "001", nome: "ESCRITÓRIO", departamento: "Administrativo" },
    { id: "cc-2", codigo: "002", nome: "VENDAS", departamento: "Comercial" },
    { id: "cc-3", codigo: "003", nome: "OPERACIONAL", departamento: "Operações" }
  ],
  transferencias: [
    { id: "tr-1", data: "2026-07-01", origem: "Itaú - CC Principal", destino: "Bradesco - Operacional", valor: 5000.00, observacao: "Reforço de caixa operacional" }
  ]
};

export const INITIAL_EXTRATO_BANCARIO = [
  {
    fitid: "OFX-20260701-001",
    data: "2026-07-01",
    descricaoBanco: "PGTO BOLETO TELEFONICA BRASIL VIVO",
    tipo: "SAIDA", // DEBIT
    valor: -64.00,
    documento: "BOL-99507",
    status: "SUGESTAO", // CONCILIADO, SUGESTAO, PENDENTE, IGNORADO
    correspondenciaId: "cp-1",
    correspondenciaInfo: "COMP. 04/26 VIVO CELULAR (21) 99507-5507 - R$ 64,00 (Exato)"
  },
  {
    fitid: "OFX-20260701-002",
    data: "2026-07-01",
    descricaoBanco: "PGTO ELETRONICO TELEFONICA BRASIL S.A.",
    tipo: "SAIDA",
    valor: -49.00,
    documento: "BOL-96785",
    status: "SUGESTAO",
    correspondenciaId: "cp-2",
    correspondenciaInfo: "COMP. 04/26 VIVO CELULAR (21) 96785-1919 - R$ 49,00 (Exato)"
  },
  {
    fitid: "OFX-20260702-003",
    data: "2026-01-02",
    descricaoBanco: "PIX RECEBIDO AMIL ASSISTENCIA MEDICA",
    tipo: "ENTRADA", // CREDIT
    valor: 1402.55,
    documento: "PIX-2505",
    status: "CONCILIADO",
    correspondenciaId: "cr-1",
    correspondenciaInfo: "Nota fiscal de serviço nº 2505 (AMIL) - R$ 1.402,55"
  },
  {
    fitid: "OFX-20260715-004",
    data: "2026-01-15",
    descricaoBanco: "TED RECEBIDA GRUPO HOSPITALAR RJ",
    tipo: "ENTRADA",
    valor: 2182.70,
    documento: "TED-12",
    status: "SUGESTAO",
    correspondenciaId: "cr-2",
    correspondenciaInfo: "Nota fiscal de serviço nº 12 (GRUPO HOSPITALAR) - R$ 2.182,70"
  },
  {
    fitid: "OFX-20260720-005",
    data: "2026-07-07",
    descricaoBanco: "DEBITO DARM COD 510-7 BERENICE IPTU",
    tipo: "SAIDA",
    valor: -503.20,
    documento: "DARM-0610",
    status: "PENDENTE",
    correspondenciaId: "cp-15",
    correspondenciaInfo: "DARM COD 510-7 BERENICE L.S. PALHARES 06/10 - R$ 503,20"
  },
  {
    fitid: "OFX-20260725-006",
    data: "2026-07-25",
    descricaoBanco: "TAR MANUT CONTA CORRENTE BANCO ITAU",
    tipo: "SAIDA",
    valor: -89.90,
    documento: "TAR-341",
    status: "PENDENTE",
    correspondenciaId: null,
    correspondenciaInfo: null
  },
  {
    fitid: "OFX-20260728-007",
    data: "2026-07-28",
    descricaoBanco: "PIX RECEBIDO CLIENTE AVULSO CONSULTORIA",
    tipo: "ENTRADA",
    valor: 850.00,
    documento: "PIX-850",
    status: "PENDENTE",
    correspondenciaId: null,
    correspondenciaInfo: null
  }
];

