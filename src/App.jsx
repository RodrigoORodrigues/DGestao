import React, { useState, useEffect, useRef, useMemo } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import ptBR from "date-fns/locale/pt-BR";
registerLocale("pt-BR", ptBR);
import { supabase } from "./config/supabase";
import { findClientMetadata } from "./utils/clientMetadata";

export async function safeSupabaseInsert(table, dataArray) {
  if (!dataArray || (Array.isArray(dataArray) && dataArray.length === 0))
    return { data: null, error: null };

  const sanitize = (obj) => {
    if (obj === null || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(sanitize);
    const newObj = {};
    for (let key in obj) {
      newObj[key] = obj[key] === "" ? null : sanitize(obj[key]);
    }
    return newObj;
  };
  const sanitizedData = sanitize(dataArray);

  const { data, error } = await supabase
    .from(table)
    .insert(sanitizedData)
    .select();
  if (error) {
    error.table = table;
    throw error;
  }
  return { data, error: null };
}

export async function safeSupabaseUpdate(table, updateObj, eqField, eqValue) {
  const sanitize = (obj) => {
    if (obj === null || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(sanitize);
    const newObj = {};
    for (let key in obj) {
      newObj[key] = obj[key] === "" ? null : sanitize(obj[key]);
    }
    return newObj;
  };
  const sanitizedData = sanitize(updateObj);

  const { data, error } = await supabase
    .from(table)
    .update(sanitizedData)
    .eq(eqField, eqValue)
    .select();
  if (error) {
    error.table = table;
    throw error;
  }
  return { data, error: null };
}

export async function syncUserPrefsToDB(userId, prefs) {
  if (!userId) return;
  try {
    const nomePref = `___USER_PREFS_${userId}___`;
    const { data: existing } = await supabase
      .from("savedReports")
      .select("*")
      .eq("nome", nomePref)
      .limit(1);

    let existingDados = {};
    if (existing && existing.length > 0) {
      existingDados = Array.isArray(existing[0].dados)
        ? existing[0].dados[0]
        : existing[0].dados;
      if (!existingDados) existingDados = {};
    }

    const payload = {
      nome: nomePref,
      dados: { ...existingDados, ...prefs },
      empresa: "System_Prefs",
    };

    if (existing && existing.length > 0) {
      await safeSupabaseUpdate("savedReports", payload, "id", existing[0].id);
    } else {
      await safeSupabaseInsert("savedReports", [
        {
          ...payload,
          periodo: "System",
          dataCriacao: new Date().toISOString(),
          criadoPor: `User_${userId}`,
        },
      ]);
    }
  } catch (e) {
    console.error("User Prefs Sync Failed", e);
  }
}

export async function syncGlobalSysConfigToDB(
  empresas,
  printPresets,
  customOpSeg,
) {
  if (!supabase) return;
  try {
    const { data: existing } = await supabase
      .from("savedReports")
      .select("*")
      .eq("nome", "___LOCAL_SYS_CONFIG___")
      .limit(1);

    let existingDados = {};
    if (existing && existing.length > 0) {
      existingDados = Array.isArray(existing[0].dados)
        ? existing[0].dados[0]
        : existing[0].dados;
      if (!existingDados) existingDados = {};
    }

    let savedCustomOpSeg = customOpSeg;
    if (!savedCustomOpSeg) {
      try {
        let parsed = JSON.parse(
          localStorage.getItem("protetta_custom_op_seg") || "null",
        );
        if (parsed) {
          savedCustomOpSeg = Array.isArray(parsed)
            ? { operadoras: parsed, seguradoras: [] }
            : parsed;
        } else {
          savedCustomOpSeg = { operadoras: [], seguradoras: [] };
        }
      } catch {
        savedCustomOpSeg = { operadoras: [], seguradoras: [] };
      }
    }

    const payload = {
      nome: "___LOCAL_SYS_CONFIG___",
      dados: {
        empresas:
          empresas && empresas.length > 0
            ? empresas
            : existingDados.empresas ||
              JSON.parse(localStorage.getItem("protetta_empresas") || "[]"),
        print_presets:
          printPresets && printPresets.length > 0
            ? printPresets
            : existingDados.print_presets ||
              JSON.parse(
                localStorage.getItem("protetta_print_presets") || "[]",
              ),
        custom_op_seg: savedCustomOpSeg ||
          existingDados.custom_op_seg || { operadoras: [], seguradoras: [] },
      },
      empresa: "Todas",
    };

    if (existing && existing.length > 0) {
      await safeSupabaseUpdate("savedReports", payload, "id", existing[0].id);
    } else {
      await safeSupabaseInsert("savedReports", [
        {
          ...payload,
          periodo: "System",
          dataCriacao: new Date().toISOString(),
          criadoPor: "System",
        },
      ]);
    }
  } catch (e) {
    console.error("SysConfig Sync Failed", e);
  }
}

import {
  SYSTEM_MODULES,
  EMPRESAS_INTERNAS,
  CATEGORIAS,
  MESES,
  LISTA_OPERADORAS,
  LISTA_SEGURADORAS,
  dataDeHojeInterna,
  formatarMoeda,
  formatarDataVisivel,
  calcularParcelaDaVigencia,
  validarCpfCnpj,
} from "./utils/helpers";
import { CLIENT_METADATA_BY_CONTRATO } from "./utils/clientMetadata";
import Sidebar from "./components/Sidebar";
import DashboardControle from "./components/DashboardControle";
import EmpresasGestao from "./components/EmpresasGestao";
import AjudaSuporte from "./components/AjudaSuporte";
import AceiteTermosLGPD from "./components/AceiteTermosLGPD";
import TermosLGPDGestao from "./components/TermosLGPDGestao";

// Ícones importados diretamente do pacote npm que instalámos
import {
  Folder,
  FileText,
  Plus,
  Home,
  ChevronRight,
  ChevronDown,
  Save,
  ArrowLeft,
  Building2,
  FolderTree,
  FileSpreadsheet,
  Download,
  X,
  Search,
  Eye,
  EyeOff,
  Layers,
  Settings,
  Database,
  RefreshCw,
  Trash2,
  HardDrive,
  Users,
  FileCheck,
  CheckCircle,
  XCircle,
  Edit,
  Edit2,
  ListFilter,
  Upload,
  Sun,
  Moon,
  Printer,
  Archive,
  History,
  AlertCircle,
  Lock,
  User,
  Key,
  LogOut,
  Shield,
  ShoppingCart,
  Receipt,
  Send,
  Percent,
  DollarSign,
  FileOutput,
  Copy,
  Info,
  Tag,
  AlertTriangle,
  LayoutGrid,
  List,
  Phone,
  Mail,
  Maximize,
  Minimize,
  FilePlus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileEdit,
} from "lucide-react";

import * as XLSX from "xlsx";
import JSZip from "jszip";
import * as pdfjsLib from "pdfjs-dist";

// Configuração do Worker do PDF.js - usa a mesma versão da biblioteca
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
const printColLabels = {
  cod: "Cód.",
  contrato: "Contrato",
  op: "Op. | Seg.",
  vidas: "Vidas",
  cliente: "Cliente",
  data: "Data",
  loja: "Loja",
  servico: "Serviço",
  desconto: "Desc.",
  corretor: "Corretor",
  parc: "Parc.",
  inicioVig: "Início Vig.",
  nfe: "NF-e",
  vitalicio: "Vitalício",
  pagamento: "Pagamento",
  valorTotal: "Valor Total",
  comissaoPorcentagem: "%",
  comissao: "Comissão",
};
const defaultPrintCols = Object.keys(printColLabels).reduce(
  (acc, key) => ({ ...acc, [key]: true }),
  {},
);

const SULAMERICA_PROPER_VIGENCIAS = {"byContrato":{"969601549713":{"cliente":"14.757.342 ANA CRISTINA ARAUJO RAMOS","contrato":"969601549713","vidas":"1","vitalicio":"Sim","parcelaBase":"17","inicioVigencia":"2024-08-02","corretor":"ASSESSORIA","empresa":"PROPER"},"49369321":{"cliente":"15.158.036 CRISTIANE MARTINS ARAUJO LIMA","contrato":"49369321","vidas":"3","vitalicio":"Sim","parcelaBase":"14","inicioVigencia":"2024-12-17","corretor":"PROPER","empresa":"PROPER"},"969601546363":{"cliente":"15.494.104 OTELINA DE SOUZA","contrato":"969601546363","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-07-29","corretor":"ASSESSORIA","empresa":"PROPER"},"518232":{"cliente":"23.395.382 ALECSANDRO DA SILVA DUTRA","contrato":"518232","vidas":"2","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-05-16","corretor":"PROPER","empresa":"PROPER"},"969601541114":{"cliente":"48.253.328 ELIZABETH ROLIM DE MOURA","contrato":"969601541114","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-07-11","corretor":"ASSESSORIA","empresa":"PROPER"},"969601550467":{"cliente":"49.580.576 EVA MARIA FEITOSA MACHADO","contrato":"969601550467","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-07","corretor":"PROPER","empresa":"PROPER"},"969601481767":{"cliente":"51.478.657 MARIA DE ASSUNCAO RIBEIRO DE OLIVEIRA","contrato":"969601481767","vidas":"1","vitalicio":"Sim","parcelaBase":"27","inicioVigencia":"2023-11-06","corretor":"PROPER","empresa":"PROPER"},"969601553993":{"cliente":"53.200.503 ROGERIO DA CRUZ PEREIRA JUNIOR","contrato":"969601553993","vidas":"1","vitalicio":"Sim","parcelaBase":"17","inicioVigencia":"2024-08-23","corretor":"PROPER","empresa":"PROPER"},"45196371":{"cliente":"53.594.103 STEPHANIE GIFFONI GONCALVES BRANDAO PEREIRA","contrato":"45196371","vidas":"5","vitalicio":"Sim","parcelaBase":"17","inicioVigencia":"2024-09-06","corretor":"PROPER","empresa":"PROPER"},"2447561000":{"cliente":"53.977.584 AMANDA DE JESUS FLORENTINO","contrato":"2447561000","vidas":"2","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-05-12","corretor":"PROPER","empresa":"PROPER"},"55402091":{"cliente":"A PRIMORDIAL - LOGISTICA EM TRANSPORTES LTDA","contrato":"55402091","vidas":"8","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-05-27","corretor":"PROPER","empresa":"PROPER"},"969601702551":{"cliente":"ABRAHÃO GANDELMAN","contrato":"969601702551","vidas":"","vitalicio":"Não","parcelaBase":"01","inicioVigencia":"2026-03-10","corretor":"PROPER","empresa":"PROPER"},"35775503":{"cliente":"ACG DIREITOS AUTORAIS LTDA","contrato":"35775503","vidas":"","vitalicio":"Não","parcelaBase":"1","inicioVigencia":"2026-01-03","corretor":"PROPER","empresa":"PROPER"},"969601489863":{"cliente":"ADEILDA ALVES RAMOS","contrato":"969601489863","vidas":"1","vitalicio":"Sim","parcelaBase":"27","inicioVigencia":"2023-12-05","corretor":"PROPER","empresa":"PROPER"},"969601550995":{"cliente":"ADELINA BAPTISTA FLORENTINO","contrato":"969601550995","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-09","corretor":"ASSESSORIA","empresa":"PROPER"},"9696014849198":{"cliente":"ADNA FERREIRA ALVES","contrato":"9696014849198","vidas":"1","vitalicio":"Sim","parcelaBase":"27","inicioVigencia":"2023-11-21","corretor":"PROPER","empresa":"PROPER"},"54434221":{"cliente":"AGUILAR & BARBOSA ADVOGADOS ASSOCIADOS","contrato":"54434221","vidas":"6","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-05-09","corretor":"PROPER","empresa":"PROPER"},"488529":{"cliente":"ALARMEFORTE SISTEMAS ELETRONICOS DE SEGURANCA LTDA","contrato":"488529","vidas":"13","vitalicio":"Sim","parcelaBase":"17","inicioVigencia":"2024-09-28","corretor":"PROPER","empresa":"PROPER"},"14948362":{"cliente":"ALDO DOS SANTOS ADAO","contrato":"14948362","vidas":"","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-05-02","corretor":"PROPER","empresa":"PROPER"},"969601564672":{"cliente":"ALICE MARA MACHADO FERNANDES","contrato":"969601564672","vidas":"1","vitalicio":"Sim","parcelaBase":"16","inicioVigencia":"2025-01-14","corretor":"PROPER","empresa":"PROPER"},"9696901544212":{"cliente":"ANA ANGELICA DO AMARAL FERREIRA ANDRADE","contrato":"9696901544212","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-07-23","corretor":"ASSESSORIA","empresa":"PROPER"},"969601648143":{"cliente":"ANA MARIA ALVES MOREIRA","contrato":"969601648143","vidas":"01","vitalicio":"Sim","parcelaBase":"6","inicioVigencia":"2025-07-30","corretor":"PROPER","empresa":"PROPER"},"96960169":{"cliente":"ANA MARIA VALDETARO MATHIAS","contrato":"96960169","vidas":"1","vitalicio":"Sim","parcelaBase":"6","inicioVigencia":"2025-10-28","corretor":"PROPER","empresa":"PROPER"},"969601547289":{"cliente":"ANA PAULA DE OLIVEIRA","contrato":"969601547289","vidas":"1","vitalicio":"Sim","parcelaBase":"16","inicioVigencia":"2024-07-30","corretor":"ASSESSORIA","empresa":"PROPER"},"14554502":{"cliente":"ANDRE AUGUSTO PENNA FRANCA","contrato":"14554502","vidas":"1","vitalicio":"Sim","parcelaBase":"13","inicioVigencia":"","corretor":"PROPER","empresa":"PROPER"},"73292671":{"cliente":"ANDRE ESCRIBANO GUZMAN","contrato":"73292671","vidas":"","vitalicio":"Sim","parcelaBase":"1","inicioVigencia":"","corretor":"PROPER","empresa":"PROPER"},"14948376":{"cliente":"ANDRE JACOB PAILHOUS","contrato":"14948376","vidas":"1","vitalicio":"Sim","parcelaBase":"10","inicioVigencia":"2025-04-08","corretor":"PROPER","empresa":"PROPER"},"35711791":{"cliente":"ANDRE LUIS GONCALVES DINIZ 07673721740","contrato":"35711791","vidas":"4","vitalicio":"Sim","parcelaBase":"24","inicioVigencia":"2024-01-05","corretor":"PROPER","empresa":"PROPER"},"14948368":{"cliente":"ANDRE LUIZ LAUCAS","contrato":"14948368","vidas":"","vitalicio":"Sim","parcelaBase":"10","inicioVigencia":"2025-04-02","corretor":"PROPER","empresa":"PROPER"},"2391004000":{"cliente":"ANDREA CRISTINA DE SOUZA CARNEIRO 00563585714","contrato":"2391004000","vidas":"4","vitalicio":"Sim","parcelaBase":"10","inicioVigencia":"2025-03-25","corretor":"PROPER","empresa":"PROPER"},"969601651029":{"cliente":"MARIA CHRISTINA ROUX FERREIRA","contrato":"969601651029","vidas":"01","vitalicio":"Sim","parcelaBase":"4","inicioVigencia":"2025-10-14","corretor":"PROPER","empresa":"PROPER"},"969601706074":{"cliente":"ANGELA CURTY CASTELLAN","contrato":"969601706074","vidas":"","vitalicio":"Não","parcelaBase":"01","inicioVigencia":"2026-03-16","corretor":"PROPER","empresa":"PROPER"},"969601575124":{"cliente":"ANGELA MARIA FACEROLE ARARIPE","contrato":"969601575124","vidas":"1","vitalicio":"Sim","parcelaBase":"15","inicioVigencia":"2024-10-28","corretor":"PROPER","empresa":"PROPER"},"969601691658":{"cliente":"ANOILDO MATTOS - MEDSENIOR","contrato":"969601691658","vidas":"1","vitalicio":"Não","parcelaBase":"2","inicioVigencia":"2026-01-20","corretor":"PROPER","empresa":"PROPER"},"515203":{"cliente":"ANOILDO MATTOS JUNIOR 85651729704","contrato":"515203","vidas":"","vitalicio":"","parcelaBase":"2","inicioVigencia":"","corretor":"------","empresa":"PROPER"},"969601538304":{"cliente":"ANTONIO CARLOS ALCOFORADO DA LUZ","contrato":"969601538304","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-06-28","corretor":"ASSESSORIA","empresa":"PROPER"},"969601549492":{"cliente":"ANTONIO LUIZ LONGO","contrato":"969601549492","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-02","corretor":"PROPER","empresa":"PROPER"},"56785911":{"cliente":"ARMANDO GUIMARAES DE ALMEIDA NETO - SULAMERICA","contrato":"56785911","vidas":"3","vitalicio":"Sim","parcelaBase":"8","inicioVigencia":"2025-06-03","corretor":"PROPER","empresa":"PROPER"},"969601537254":{"cliente":"ARMANDO LUIZ MAURO JUNIOR","contrato":"969601537254","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-06-28","corretor":"ASSESSORIA","empresa":"PROPER"},"969601610541":{"cliente":"ARYCLIO VINICIUS CHOUZAL TOSCANO","contrato":"969601610541","vidas":"1","vitalicio":"Sim","parcelaBase":"11","inicioVigencia":"2025-03-19","corretor":"PROPER","empresa":"PROPER"},"969601624448":{"cliente":"BARBARA RACHID","contrato":"969601624448","vidas":"01","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-05-07","corretor":"PROPER","empresa":"PROPER"},"57234581":{"cliente":"BAUTEC SERVICOS LTDA","contrato":"57234581","vidas":"3","vitalicio":"Sim","parcelaBase":"8","inicioVigencia":"2025-06-06","corretor":"PROPER","empresa":"PROPER"},"2487632000":{"cliente":"BCAJB LANCHES - AMIL 1924083000","contrato":"2487632000","vidas":"5","vitalicio":"Sim","parcelaBase":"8","inicioVigencia":"2025-06-17","corretor":"PROPER","empresa":"PROPER"},"2180384000":{"cliente":"BEATPLACE EMPREENDIMENTOS DIGITAIS LTDA","contrato":"2180384000","vidas":"2","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-07-26","corretor":"PROPER","empresa":"PROPER"},"2721483000":{"cliente":"BECKER E GABRIEL ADVOGADOS","contrato":"2721483000","vidas":"4","vitalicio":"","parcelaBase":"2","inicioVigencia":"2026-02-25","corretor":"ASSESSORIA","empresa":"PROPER"},"9696001664794":{"cliente":"BENEDITA CORREIA KILIM","contrato":"9696001664794","vidas":"1","vitalicio":"Sim","parcelaBase":"4","inicioVigencia":"2025-10-13","corretor":"PROPER","empresa":"PROPER"},"42089161":{"cliente":"BICAR CONSULTORES E ADMINISTRADORES LTDA.","contrato":"42089161","vidas":"","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-07-06","corretor":"PROPER","empresa":"PROPER"},"2583888000":{"cliente":"BLACK ROSE FILMES LTDA","contrato":"2583888000","vidas":"2","vitalicio":"Sim","parcelaBase":"4","inicioVigencia":"2025-10-02","corretor":"ASSESSORIA","empresa":"PROPER"},"66195041":{"cliente":"BRAGA E GODINHO COMERCIO VAREJISTA DE GLP LTDA","contrato":"66195041","vidas":"06","vitalicio":"Não","parcelaBase":"03","inicioVigencia":"2025-11-04","corretor":"ASSESSORIA","empresa":"PROPER"},"63653621":{"cliente":"BRITO & LIMA ADVOGADOS ASSOCIADOS","contrato":"63653621","vidas":"04","vitalicio":"Sim","parcelaBase":"4","inicioVigencia":"2025-10-01","corretor":"PROPER","empresa":"PROPER"},"66833391":{"cliente":"BRUNO DE SOUZA VIAL SERVICOS MEDIICOS","contrato":"66833391","vidas":"","vitalicio":"Sim","parcelaBase":"4","inicioVigencia":"2025-11-24","corretor":"PROPER","empresa":"PROPER"},"54321171":{"cliente":"CANTINA E RESTAURANTE TRAPANI LTDA","contrato":"54321171","vidas":"03","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-05-16","corretor":"PROPER","empresa":"PROPER"},"4847662":{"cliente":"CARLA BRAGA URIBBE CASTRO","contrato":"4847662","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"","corretor":"ASSESSORIA","empresa":"PROPER"},"1636902":{"cliente":"CARLOS RAUL GARCIA","contrato":"1636902","vidas":"","vitalicio":"Não","parcelaBase":"01","inicioVigencia":"2026-03-03","corretor":"ASSESSORIA","empresa":"PROPER"},"969601532060":{"cliente":"CELESTE RODRIGUES NOGUEIRA","contrato":"969601532060","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-05-31","corretor":"ASSESSORIA","empresa":"PROPER"},"969601490706":{"cliente":"CELIA MARIA PEREIRA DA SILVA 10601607732","contrato":"969601490706","vidas":"1","vitalicio":"Sim","parcelaBase":"26","inicioVigencia":"2023-12-08","corretor":"PROPER","empresa":"PROPER"},"969601551822":{"cliente":"CELIO DE SOUZA MINHAVA","contrato":"969601551822","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-14","corretor":"ASSESSORIA","empresa":"PROPER"},"544065840":{"cliente":"CELIO RICARDO COUTINHO","contrato":"544065840","vidas":"1","vitalicio":"Viatalicio","parcelaBase":"6","inicioVigencia":"2025-09-10","corretor":"ASSESSORIA","empresa":"PROPER"},"2688820000":{"cliente":"CENTRO DE TREINAMENTO MOVE ON","contrato":"2688820000","vidas":"5","vitalicio":"","parcelaBase":"1","inicioVigencia":"2026-01-26","corretor":"ASSESSORIA","empresa":"PROPER"},"578991":{"cliente":"CIRCULO BRASILEIRO DE PATOLOGIA LTDA","contrato":"578991","vidas":"","vitalicio":"Não","parcelaBase":"1","inicioVigencia":"2026-01-14","corretor":"PROPER","empresa":"PROPER"},"969601542102":{"cliente":"CLAUDIA VERAS DE SOUZA","contrato":"969601542102","vidas":"1","vitalicio":"Sim","parcelaBase":"15","inicioVigencia":"2024-07-16","corretor":"ASSESSORIA","empresa":"PROPER"},"2247309000":{"cliente":"CONDOMINIO ACQUABELLA","contrato":"2247309000","vidas":"134","vitalicio":"Sim","parcelaBase":"14","inicioVigencia":"2024-12-01","corretor":"PROPER","empresa":"PROPER"},"801F4":{"cliente":"CONDOMINIO DO EDIFICIO BARRALIFE MEDICAL CENTER","contrato":"801F4","vidas":"33","vitalicio":"Sim","parcelaBase":"23","inicioVigencia":"2024-03-07","corretor":"PROPER","empresa":"PROPER"},"2483289000":{"cliente":"CONDOMINIO DOS EDIFICIOS A RUA TIMOTEO DA COSTA N 1100","contrato":"2483289000","vidas":"39","vitalicio":"Sim","parcelaBase":"8","inicioVigencia":"2025-06-12","corretor":"PROPER","empresa":"PROPER"},"2678183000":{"cliente":"CONTEUDOS CONECTADOS LTDA","contrato":"2678183000","vidas":"1","vitalicio":"Não","parcelaBase":"01","inicioVigencia":"2026-01-14","corretor":"PROPER","empresa":"PROPER"},"2177156000":{"cliente":"COOKS HOUSE GASTRONOMIA LTDA","contrato":"2177156000","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-07-17","corretor":"PROPER","empresa":"PROPER"},"969601550588":{"cliente":"CRISTINA ELIODORA DE SOUZA RAMOS","contrato":"969601550588","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-08","corretor":"ASSESSORIA","empresa":"PROPER"},"515422":{"cliente":"CRISTINA SARAIVA SANCHES","contrato":"515422","vidas":"1","vitalicio":"Sim","parcelaBase":"10","inicioVigencia":"2025-05-10","corretor":"PROPER","empresa":"PROPER"},"2640918000":{"cliente":"CROSS ALFA LTDA","contrato":"2640918000","vidas":"03","vitalicio":"Não","parcelaBase":"2","inicioVigencia":"2025-12-01","corretor":"ASSESSORIA","empresa":"PROPER"},"969601551896":{"cliente":"DAVI RIBEIRO BALARO","contrato":"969601551896","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-14","corretor":"ASSESSORIA","empresa":"PROPER"},"969601524975":{"cliente":"DAVIDSON DOS SANTOS","contrato":"969601524975","vidas":"1","vitalicio":"Sim","parcelaBase":"21","inicioVigencia":"2024-05-14","corretor":"ASSESSORIA","empresa":"PROPER"},"969601534113":{"cliente":"DENISE SANTOS BARRETTO","contrato":"969601534113","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-06-14","corretor":"ASSESSORIA","empresa":"PROPER"},"2245910000":{"cliente":"DEX INVEST COMERCIO E VAREJO LTDA","contrato":"2245910000","vidas":"5","vitalicio":"Sim","parcelaBase":"15","inicioVigencia":"2024-11-18","corretor":"PROPER","empresa":"PROPER"},"442337":{"cliente":"DEX INVEST COMERCIO E VAREJO LTDA (SULAMERICA)","contrato":"442337","vidas":"17","vitalicio":"Sim","parcelaBase":"21","inicioVigencia":"2024-03-27","corretor":"PROPER","empresa":"PROPER"},"969601651069":{"cliente":"DILSA SOBRAL FARIA","contrato":"969601651069","vidas":"1","vitalicio":"Sim","parcelaBase":"6","inicioVigencia":"2025-08-14","corretor":"PROPER","empresa":"PROPER"},"969601619267":{"cliente":"EBERSON BENTO DA SILVA","contrato":"969601619267","vidas":"1","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-04-17","corretor":"PROPER","empresa":"PROPER"},"969601597374":{"cliente":"EDELZIA DE MATTOS GONÇALVES","contrato":"969601597374","vidas":"1","vitalicio":"Sim","parcelaBase":"12","inicioVigencia":"2025-01-27","corretor":"ASSESSORIA","empresa":"PROPER"},"14948378":{"cliente":"EDIVALDO ALBUQUERQUE","contrato":"14948378","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2025-04-02","corretor":"PROPER","empresa":"PROPER"},"969601549986":{"cliente":"EDNA LUCIA MENDES 02605605612","contrato":"969601549986","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-06","corretor":"ASSESSORIA","empresa":"PROPER"},"62385661":{"cliente":"EDSON SIQUEIRA NUNES CONTABIL","contrato":"62385661","vidas":"1","vitalicio":"Sim","parcelaBase":"5","inicioVigencia":"2025-09-06","corretor":"PROPER","empresa":"PROPER"},"969601669728":{"cliente":"ELAINE DALFORNE DE OLIVEIRA","contrato":"969601669728","vidas":"1","vitalicio":"Sim","parcelaBase":"3","inicioVigencia":"2025-10-28","corretor":"ASSESSORIA","empresa":"PROPER"},"969601513775":{"cliente":"ELAINE MORAES VALENCA","contrato":"969601513775","vidas":"1","vitalicio":"Sim","parcelaBase":"22","inicioVigencia":"2024-05-28","corretor":"PROPER","empresa":"PROPER"},"4872903":{"cliente":"ELIANE CARVALHO DE SOUZA","contrato":"4872903","vidas":"","vitalicio":"Não","parcelaBase":"1","inicioVigencia":"","corretor":"ASSESSORIA","empresa":"PROPER"},"969601660415":{"cliente":"ELIANE PEIXOTO LUBANCO","contrato":"969601660415","vidas":"01","vitalicio":"Sim","parcelaBase":"5","inicioVigencia":"2025-09-24","corretor":"PROPER","empresa":"PROPER"},"969601672486":{"cliente":"ELIETE CAVALCANTI DE SOUZA","contrato":"969601672486","vidas":"1","vitalicio":"Sim","parcelaBase":"3","inicioVigencia":"2025-11-05","corretor":"PROPER","empresa":"PROPER"},"969601549735":{"cliente":"ELISABETE GAIA DAS NEVES","contrato":"969601549735","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-05","corretor":"ASSESSORIA","empresa":"PROPER"},"60864191":{"cliente":"F P VEIGA ENGENHARIA LTDA","contrato":"60864191","vidas":"04","vitalicio":"Sim","parcelaBase":"6","inicioVigencia":"2025-08-08","corretor":"PROPER","empresa":"PROPER"},"969601693219":{"cliente":"FABIANA VERAS ROCHA PRAXEDES","contrato":"969601693219","vidas":"","vitalicio":"Não","parcelaBase":"","inicioVigencia":"2026-01-27","corretor":"ASSESSORIA","empresa":"PROPER"},"969601552407":{"cliente":"FABIO MUNIZ 01938294955","contrato":"969601552407","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-16","corretor":"ASSESSORIA","empresa":"PROPER"},"969601550816":{"cliente":"FELISBELA DE SOUSA MINHAVA","contrato":"969601550816","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-09","corretor":"PROPER","empresa":"PROPER"},"2571289000":{"cliente":"FERNANDA LAMOGLIA","contrato":"2571289000","vidas":"2","vitalicio":"Sim","parcelaBase":"5","inicioVigencia":"2025-09-18","corretor":"PROPER","empresa":"PROPER"},"516073":{"cliente":"FLARILE IMOVEIS E ADMINISTRADORA LTDA","contrato":"516073","vidas":"3","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-05-13","corretor":"PROPER","empresa":"PROPER"},"2393615000":{"cliente":"FLAVIA BRAGA NEIVA 01479110795","contrato":"2393615000","vidas":"06","vitalicio":"Sim","parcelaBase":"10","inicioVigencia":"2025-03-27","corretor":"PROPER","empresa":"PROPER"},"45715131":{"cliente":"FLX PUBLICIDADE LTDA","contrato":"45715131","vidas":"6","vitalicio":"Sim","parcelaBase":"16","inicioVigencia":"2024-10-08","corretor":"PROPER","empresa":"PROPER"},"1146464":{"cliente":"FRANCISCO DE ASSIS VELASQUES RODRIGUES 43040705334","contrato":"1146464","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-09","corretor":"ASSESSORIA","empresa":"PROPER"},"54547151":{"cliente":"FRANCISCO TOMAS PAZ GUISCAFRE 79267769715","contrato":"54547151","vidas":"","vitalicio":"Sim","parcelaBase":"7","inicioVigencia":"","corretor":"PROPER","empresa":"PROPER"},"2348633000":{"cliente":"GARCIA & PEDREIRA LTDA","contrato":"2348633000","vidas":"5","vitalicio":"Sim","parcelaBase":"12","inicioVigencia":"2025-02-03","corretor":"PROPER","empresa":"PROPER"},"969601532773":{"cliente":"GETULIO ANDION MACEDO","contrato":"969601532773","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-06-05","corretor":"ASSESSORIA","empresa":"PROPER"},"2596947000":{"cliente":"GRUPO DE ASSISTENCIA A MULHER","contrato":"2596947000","vidas":"12","vitalicio":"Sim","parcelaBase":"4","inicioVigencia":"2025-10-16","corretor":"PROPER","empresa":"PROPER"},"468093":{"cliente":"GRUPO SOLUCIOMATICA INFORMATICA LTDA","contrato":"468093","vidas":"2","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-07-03","corretor":"PROPER","empresa":"PROPER"},"29810531":{"cliente":"HOTEL REPRESENTATION BRAZIL LTDA","contrato":"29810531","vidas":"","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-04-23","corretor":"PROPER","empresa":"PROPER"},"457436":{"cliente":"IASMIN TEIXEIRA SCALAMBRINI 15104464784","contrato":"457436","vidas":"3","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-06-07","corretor":"PROPER","empresa":"PROPER"},"969601530080":{"cliente":"IATHA SOARES DE ALMEIDA","contrato":"969601530080","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-05-29","corretor":"ASSESSORIA","empresa":"PROPER"},"969601662315":{"cliente":"ILDA VIEIRA MOUTELLA","contrato":"969601662315","vidas":"1","vitalicio":"Sim","parcelaBase":"4","inicioVigencia":"2025-10-02","corretor":"PROPER","empresa":"PROPER"},"54114291":{"cliente":"INOBILE TELECOMUNICACOES LTDA","contrato":"54114291","vidas":"3","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-04-10","corretor":"PROPER","empresa":"PROPER"},"2595820000":{"cliente":"INOBILE TELECOMUNICACOES LTDA (AMIL)","contrato":"2595820000","vidas":"02","vitalicio":"Sim","parcelaBase":"04","inicioVigencia":"2025-10-15","corretor":"PROPER","empresa":"PROPER"},"1132889":{"cliente":"IONE HASSELMANN DAMASCENO VIEIRA 72060697700","contrato":"1132889","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-07-11","corretor":"ASSESSORIA","empresa":"PROPER"},"96960154262":{"cliente":"IRACY FERREIRA DE SOUZA","contrato":"96960154262","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-26","corretor":"PROPER","empresa":"PROPER"},"969601574682":{"cliente":"IVANDA FACIROLLI ARARIPE","contrato":"969601574682","vidas":"1","vitalicio":"Sim","parcelaBase":"15","inicioVigencia":"2024-10-28","corretor":"PROPER","empresa":"PROPER"},"969601529017":{"cliente":"IVANILDO LADISLAU DE ARAUJO","contrato":"969601529017","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-05-28","corretor":"ASSESSORIA","empresa":"PROPER"},"969601539805":{"cliente":"IVANIR MARIA DE SOUZA COSTA","contrato":"969601539805","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-07-05","corretor":"ASSESSORIA","empresa":"PROPER"},"969601538963":{"cliente":"IVETE DA SILVA ROCHA","contrato":"969601538963","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-07-03","corretor":"ASSESSORIA","empresa":"PROPER"},"969601537633":{"cliente":"IVO DE OLIVEIRA ROSA","contrato":"969601537633","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-06-28","corretor":"ASSESSORIA","empresa":"PROPER"},"14984559":{"cliente":"IVONE MATIOLI","contrato":"14984559","vidas":"","vitalicio":"Sim","parcelaBase":"","inicioVigencia":"2025-05-02","corretor":"------","empresa":"PROPER"},"969601489963":{"cliente":"JACILENE ALVES RAMOS","contrato":"969601489963","vidas":"1","vitalicio":"Sim","parcelaBase":"26","inicioVigencia":"2023-12-05","corretor":"PROPER","empresa":"PROPER"},"969601530058":{"cliente":"JANDIRA DOS SANTOS MARTINS 04335193980","contrato":"969601530058","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-05-29","corretor":"ASSESSORIA","empresa":"PROPER"},"969601551441":{"cliente":"JANIE FERREIRA MENEZES","contrato":"969601551441","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-13","corretor":"ASSESSORIA","empresa":"PROPER"},"55275141":{"cliente":"JBBCA LANCHES LTDA","contrato":"55275141","vidas":"05","vitalicio":"Sim","parcelaBase":"8","inicioVigencia":"2025-06-06","corretor":"PROPER","empresa":"PROPER"},"969601697306":{"cliente":"JOAO BOSCO DE AZEVEDO","contrato":"969601697306","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2026-02-10","corretor":"PROPER","empresa":"PROPER"},"61193161":{"cliente":"JOELMA SAROTO BAIRROS 00987718762","contrato":"61193161","vidas":"1","vitalicio":"Sim","parcelaBase":"6","inicioVigencia":"2025-09-02","corretor":"PROPER","empresa":"PROPER"},"4869322":{"cliente":"JONATAS GOMES DO NASCIMENTO","contrato":"4869322","vidas":"","vitalicio":"Não","parcelaBase":"1","inicioVigencia":"","corretor":"ASSESSORIA","empresa":"PROPER"},"969601669882":{"cliente":"JORGE CESAR DE OLIVEIRA","contrato":"969601669882","vidas":"1","vitalicio":"Sim","parcelaBase":"3","inicioVigencia":"2025-10-29","corretor":"ASSESSORIA","empresa":"PROPER"},"969601530117":{"cliente":"JORGE MARTINS","contrato":"969601530117","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-05-29","corretor":"ASSESSORIA","empresa":"PROPER"},"969601542157":{"cliente":"JOSE LUIZ MENEZES SILVA","contrato":"969601542157","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-13","corretor":"ASSESSORIA","empresa":"PROPER"},"969601536782":{"cliente":"JOSE WILLIAN DE OLIVEIRA ABICHACRA","contrato":"969601536782","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-06-27","corretor":"ASSESSORIA","empresa":"PROPER"},"969601595371":{"cliente":"JULIO DE SOUZA GONÇALVES","contrato":"969601595371","vidas":"1","vitalicio":"Sim","parcelaBase":"14","inicioVigencia":"2025-01-15","corretor":"PROPER","empresa":"PROPER"},"2765565000":{"cliente":"L F ESTEVES CONSULTORIA EM GESTAO","contrato":"2765565000","vidas":"2","vitalicio":"Não","parcelaBase":"1","inicioVigencia":"2026-04-10","corretor":"PROPER","empresa":"PROPER"},"969601491795":{"cliente":"LEDA MARIA NOGUEIRA","contrato":"969601491795","vidas":"1","vitalicio":"Sim","parcelaBase":"26","inicioVigencia":"2023-12-14","corretor":"PROPER","empresa":"PROPER"},"71298891":{"cliente":"LEONARDO MENDONCA SOCIEDADE INDIVIDUAL","contrato":"71298891","vidas":"","vitalicio":"Não","parcelaBase":"2","inicioVigencia":"2026-02-26","corretor":"PROPER","empresa":"PROPER"},"969601611227":{"cliente":"LEONARDO PERAZZO BARBOSA","contrato":"969601611227","vidas":"1","vitalicio":"Sim","parcelaBase":"10","inicioVigencia":"2025-03-21","corretor":"PROPER","empresa":"PROPER"},"1574437":{"cliente":"LEONILDE DE ALMEIDA ALVES","contrato":"1574437","vidas":"1","vitalicio":"Sim","parcelaBase":"6","inicioVigencia":"2025-08-21","corretor":"PROPER","empresa":"PROPER"},"235215000":{"cliente":"LGO ATIVIDADES MEDICAS AMBULATORIAIS LTDA","contrato":"235215000","vidas":"1","vitalicio":"Sim","parcelaBase":"12","inicioVigencia":"2025-02-10","corretor":"PROPER","empresa":"PROPER"},"969601544879":{"cliente":"LILIA MARIA GALDO ALBANO DE ARATANHA","contrato":"969601544879","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-07-26","corretor":"PROPER","empresa":"PROPER"},"969601693416":{"cliente":"LINA BIANCO","contrato":"969601693416","vidas":"","vitalicio":"","parcelaBase":"1","inicioVigencia":"2025-01-28","corretor":"PROPER","empresa":"PROPER"},"25093886000":{"cliente":"LINCE + CRIATIVA S/A","contrato":"25093886000","vidas":"2","vitalicio":"Sim","parcelaBase":"8","inicioVigencia":"2025-07-11","corretor":"PROPER","empresa":"PROPER"},"969601700616":{"cliente":"LUCIA MARIA OLIVEIRA NASCIMENTO ARAUJO","contrato":"969601700616","vidas":"1","vitalicio":"Não","parcelaBase":"2","inicioVigencia":"2026-02-24","corretor":"PROPER","empresa":"PROPER"},"969601528443":{"cliente":"LUCIANE CAMPOS MOTTA","contrato":"969601528443","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-05-27","corretor":"ASSESSORIA","empresa":"PROPER"},"45353731":{"cliente":"LUIZ FELLIPPE SERRO DOS SANTOS","contrato":"45353731","vidas":"","vitalicio":"Sim","parcelaBase":"3","inicioVigencia":"2025-11-19","corretor":"PROPER","empresa":"PROPER"},"969601627203":{"cliente":"LUIZ MANGIA JUNIOR","contrato":"969601627203","vidas":"01","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-05-15","corretor":"PROPER","empresa":"PROPER"},"969601659252":{"cliente":"LUIZ ROBERTO BASTOS MOUTELLA","contrato":"969601659252","vidas":"1","vitalicio":"Sim","parcelaBase":"5","inicioVigencia":"2025-09-17","corretor":"PROPER","empresa":"PROPER"},"2446386000":{"cliente":"LUZCA PRODUCOES ARTISTICAS E CINEMATOGRAFICAS LTDA","contrato":"2446386000","vidas":"2","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-05-12","corretor":"PROPER","empresa":"PROPER"},"2543075000":{"cliente":"M A 61 SERVICOS E COMERCIO DE ROUPAS LTDA","contrato":"2543075000","vidas":"02","vitalicio":"Sim","parcelaBase":"5","inicioVigencia":"2025-08-19","corretor":"PROPER","empresa":"PROPER"},"2737448000":{"cliente":"M DE F A DE FIGUEIREDO JUNGER","contrato":"2737448000","vidas":"2","vitalicio":"Não","parcelaBase":"1","inicioVigencia":"2026-03-11","corretor":"ASSESSORIA","empresa":"PROPER"},"969601541720":{"cliente":"MACARIO MENDES DA MATTA","contrato":"969601541720","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-07-12","corretor":"ASSESSORIA","empresa":"PROPER"},"515873":{"cliente":"MARA MAC PROJETOS, PAISAGISMO E URBANIZACAO LTDA","contrato":"515873","vidas":"3","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-05-08","corretor":"PROPER","empresa":"PROPER"},"2562711000":{"cliente":"MARCELO ALMEIDA ALVES","contrato":"2562711000","vidas":"2","vitalicio":"Sim","parcelaBase":"5","inicioVigencia":"2025-09-10","corretor":"PROPER","empresa":"PROPER"},"969601676209":{"cliente":"MARCIA CRISTINA REIS DOS SANTOS","contrato":"969601676209","vidas":"1","vitalicio":"Não","parcelaBase":"2","inicioVigencia":"2025-11-13","corretor":"PROPER","empresa":"PROPER"},"969601664164":{"cliente":"MARCIA DE OLIVEIRA GUTTERRES","contrato":"969601664164","vidas":"1","vitalicio":"Sim","parcelaBase":"4","inicioVigencia":"2025-10-10","corretor":"PROPER","empresa":"PROPER"},"969601556122":{"cliente":"MARCIO FRANCE","contrato":"969601556122","vidas":"1","vitalicio":"Sim","parcelaBase":"17","inicioVigencia":"2024-08-28","corretor":"ASSESSORIA","empresa":"PROPER"},"969601540190":{"cliente":"MARCO ANDRE MILLO DE CASTRO","contrato":"969601540190","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-07-08","corretor":"ASSESSORIA","empresa":"PROPER"},"969601552551":{"cliente":"MARIA APARECIDA DO NASCIMENTO OLIVEIRA","contrato":"969601552551","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-19","corretor":"ASSESSORIA","empresa":"PROPER"},"969601637204":{"cliente":"MARIA CELIA ZURITA CRUZ","contrato":"969601637204","vidas":"01","vitalicio":"Sim","parcelaBase":"8","inicioVigencia":"2025-06-18","corretor":"PROPER","empresa":"PROPER"},"969601532875":{"cliente":"MARIA EUGENIA FERREIRA DE CARVALHO","contrato":"969601532875","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-06-05","corretor":"ASSESSORIA","empresa":"PROPER"},"969601552677":{"cliente":"MARIA HELENA FONSECA MEINICKE","contrato":"969601552677","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-16","corretor":"ASSESSORIA","empresa":"PROPER"},"969601637072":{"cliente":"MARIA IRIS DE MATTOS SERAFIM","contrato":"969601637072","vidas":"01","vitalicio":"Sim","parcelaBase":"8","inicioVigencia":"2025-06-10","corretor":"PROPER","empresa":"PROPER"},"969601578819":{"cliente":"MARIA JOSE DE CAMPOS","contrato":"969601578819","vidas":"1","vitalicio":"Sim","parcelaBase":"15","inicioVigencia":"2024-11-06","corretor":"PROPER","empresa":"PROPER"},"2770073000":{"cliente":"MARIA LAURA CASSABIAN QUEIROZ","contrato":"2770073000","vidas":"","vitalicio":"Não","parcelaBase":"","inicioVigencia":"2026-04-15","corretor":"ASSESSORIA","empresa":"PROPER"},"969601538508":{"cliente":"MARIA REGINA DA FRAGA ROSA","contrato":"969601538508","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-07-01","corretor":"ASSESSORIA","empresa":"PROPER"},"969601642690":{"cliente":"MARILIA FAGUNDES CRUZ","contrato":"969601642690","vidas":"01","vitalicio":"Sim","parcelaBase":"6","inicioVigencia":"2025-07-08","corretor":"PROPER","empresa":"PROPER"},"2231780000":{"cliente":"MARINA BARRA CLUBE AMIL","contrato":"2231780000","vidas":"349","vitalicio":"Sim","parcelaBase":"15","inicioVigencia":"2024-11-01","corretor":"PROPER","empresa":"PROPER"},"39178111":{"cliente":"MARINHO RIO REPRESENTACOES LTDA","contrato":"39178111","vidas":"4","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-06-12","corretor":"PROPER","empresa":"PROPER"},"969601543825":{"cliente":"MARIO GOMES ANDRADE 08779143466","contrato":"969601543825","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-02-23","corretor":"JEFFERSON","empresa":"PROPER"},"47633451":{"cliente":"MARISSOL DOS SANTOS 86786059791","contrato":"47633451","vidas":"3","vitalicio":"Sim","parcelaBase":"16","inicioVigencia":"2024-10-24","corretor":"PROPER","empresa":"PROPER"},"969601536578":{"cliente":"MARLETE MARINHO DE SA","contrato":"969601536578","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-06-26","corretor":"ASSESSORIA","empresa":"PROPER"},"969601538150":{"cliente":"MARTA ENRIQUE DA SILVA","contrato":"969601538150","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-06-29","corretor":"ASSESSORIA","empresa":"PROPER"},"969601547759":{"cliente":"MARYLENA GALHARDO BASSINI","contrato":"969601547759","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-07-30","corretor":"PROPER","empresa":"PROPER"},"9696901587837":{"cliente":"MAURICELIA MARINHO DA SILVA","contrato":"9696901587837","vidas":"1","vitalicio":"Sim","parcelaBase":"14","inicioVigencia":"2024-12-07","corretor":"PROPER","empresa":"PROPER"},"2699365000":{"cliente":"MEDICAL SERVICOS MEDICOS LTDA","contrato":"2699365000","vidas":"2","vitalicio":"Não","parcelaBase":"","inicioVigencia":"2026-02-04","corretor":"ASSESSORIA","empresa":"PROPER"},"969601675508":{"cliente":"MONICA SCAPIN CAMPOS MOREIRA","contrato":"969601675508","vidas":"1","vitalicio":"Não","parcelaBase":"3","inicioVigencia":"2025-11-11","corretor":"ASSESSORIA","empresa":"PROPER"},"55296791":{"cliente":"MONTECH CONSTRUCOES E MONTAGENS LTDA.","contrato":"55296791","vidas":"3","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-05-13","corretor":"PROPER","empresa":"PROPER"},"2773343000":{"cliente":"N T COMERCIO DE ALIMENTOS LTDA","contrato":"2773343000","vidas":"5","vitalicio":"Não","parcelaBase":"1","inicioVigencia":"2026-04-17","corretor":"ASSESSORIA","empresa":"PROPER"},"2508858000":{"cliente":"NADJA LOPES CARDOSO","contrato":"2508858000","vidas":"02","vitalicio":"Sim","parcelaBase":"7","inicioVigencia":"2025-07-10","corretor":"PROPER","empresa":"PROPER"},"518225":{"cliente":"NADJA LOPES CARDOSO 73608190759","contrato":"518225","vidas":"3","vitalicio":"Sim","parcelaBase":"8","inicioVigencia":"","corretor":"PROPER","empresa":"PROPER"},"969601663732":{"cliente":"NAIR ATAIDE DE MOURA AMARAL","contrato":"969601663732","vidas":"1","vitalicio":"Sim","parcelaBase":"4","inicioVigencia":"2025-10-08","corretor":"PROPER","empresa":"PROPER"},"969601616440":{"cliente":"NEIDE MOREIRA DA COSTA ABREU","contrato":"969601616440","vidas":"1","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-04-03","corretor":"PROPER","empresa":"PROPER"},"515306":{"cliente":"NEWTON BARROSO FERNANDES JUNIOR 07302214743","contrato":"515306","vidas":"","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-05-07","corretor":"PROPER","empresa":"PROPER"},"969601656128":{"cliente":"NILTON XAVIER PONTES FILHO","contrato":"969601656128","vidas":"01","vitalicio":"Sim","parcelaBase":"5","inicioVigencia":"2025-09-08","corretor":"PROPER","empresa":"PROPER"},"969601689883":{"cliente":"NILZA MARTINS CIBREIROS","contrato":"969601689883","vidas":"","vitalicio":"Não","parcelaBase":"01","inicioVigencia":"2026-01-13","corretor":"PROPER","empresa":"PROPER"},"61791321":{"cliente":"NOGMIX - SULAMERICA","contrato":"61791321","vidas":"1","vitalicio":"Sim","parcelaBase":"6","inicioVigencia":"2025-08-28","corretor":"PROPER","empresa":"PROPER"},"969601542155":{"cliente":"NORMELIA RIBEIRO","contrato":"969601542155","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-07-16","corretor":"ASSESSORIA","empresa":"PROPER"},"2528752000":{"cliente":"NOSSA EMPREENDIMENTOS E REFORMA","contrato":"2528752000","vidas":"02","vitalicio":"Sim","parcelaBase":"6","inicioVigencia":"2025-08-04","corretor":"PROPER","empresa":"PROPER"},"9696016433717":{"cliente":"ODILON DE OLIVEIRA NUNES","contrato":"9696016433717","vidas":"01","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-07-14","corretor":"PROPER","empresa":"PROPER"},"969601696020":{"cliente":"ONDINA ELAINE DE SOUSA FERRO","contrato":"969601696020","vidas":"01","vitalicio":"Não","parcelaBase":"01","inicioVigencia":"2026-02-05","corretor":"PROPER","empresa":"PROPER"},"58195731":{"cliente":"ONEBOX ESTUDIO CRIATIVO LTDA","contrato":"58195731","vidas":"04","vitalicio":"Sim","parcelaBase":"8","inicioVigencia":"2025-06-17","corretor":"PROPER","empresa":"PROPER"},"2184700000":{"cliente":"OTICA CATETE LTDA","contrato":"2184700000","vidas":"3","vitalicio":"Sim","parcelaBase":"16","inicioVigencia":"2024-08-08","corretor":"PROPER","empresa":"PROPER"},"534844":{"cliente":"PANIFICADORA PECPAO LTDA","contrato":"534844","vidas":"395","vitalicio":"Não","parcelaBase":"6","inicioVigencia":"2025-08-10","corretor":"PROPER","empresa":"PROPER"},"2593282000":{"cliente":"PAULA CARVALHO ROQUIM","contrato":"2593282000","vidas":"3","vitalicio":"Sim","parcelaBase":"4","inicioVigencia":"2025-10-13","corretor":"PROPER","empresa":"PROPER"},"62569551":{"cliente":"PAULA DU BOCAGE BRITO DANTAS 02846009708","contrato":"62569551","vidas":"","vitalicio":"Sim","parcelaBase":"5","inicioVigencia":"2025-09-11","corretor":"PROPER","empresa":"PROPER"},"470091":{"cliente":"PAULA SANTOS PASSOS EIRAS 14960787724","contrato":"470091","vidas":"3","vitalicio":"Sim","parcelaBase":"15","inicioVigencia":"2024-07-09","corretor":"PROPER","empresa":"PROPER"},"69198921":{"cliente":"PAULO ROBERTO FRAGOSO COSTA","contrato":"69198921","vidas":"","vitalicio":"","parcelaBase":"1","inicioVigencia":"2026-03-19","corretor":"PROPER","empresa":"PROPER"},"969602665597":{"cliente":"PAULO ROBERTO ROSSI DE OLIVEIRA","contrato":"969602665597","vidas":"01","vitalicio":"Sim","parcelaBase":"4","inicioVigencia":"2025-10-15","corretor":"PROPER","empresa":"PROPER"},"969601552357":{"cliente":"PEDRO SOARES DA SILVA 05914287766","contrato":"969601552357","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-16","corretor":"ASSESSORIA","empresa":"PROPER"},"2697891000":{"cliente":"PMX IMPORTACOES E COMERCIO LTDA","contrato":"2697891000","vidas":"","vitalicio":"","parcelaBase":"2","inicioVigencia":"2025-02-04","corretor":"ASSESSORIA","empresa":"PROPER"},"72614441":{"cliente":"PRIVATE PROMOTORA LTDA","contrato":"72614441","vidas":"1","vitalicio":"","parcelaBase":"1","inicioVigencia":"2026-03-20","corretor":"PROPER","empresa":"PROPER"},"2238323000":{"cliente":"RAFAEL LIMA DAMASCENO","contrato":"2238323000","vidas":"4","vitalicio":"Sim","parcelaBase":"16","inicioVigencia":"2024-10-31","corretor":"PROPER","empresa":"PROPER"},"2622944000":{"cliente":"REGINA MARCELO DE CASTRO","contrato":"2622944000","vidas":"4","vitalicio":"Não","parcelaBase":"3","inicioVigencia":"2025-11-12","corretor":"ASSESSORIA","empresa":"PROPER"},"63623031":{"cliente":"RICARDO OTRANTO NETO CLINICA DE NEUROCIRUGIA","contrato":"63623031","vidas":"","vitalicio":"Sim","parcelaBase":"3","inicioVigencia":"2025-09-30","corretor":"PROPER","empresa":"PROPER"},"2177077000":{"cliente":"RIOMAYOR ENGENHARIA CONSTRUCOES E SERVICOS ADMINISTRATIVOS LTDA","contrato":"2177077000","vidas":"5","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-07-17","corretor":"PROPER","empresa":"PROPER"},"969601534135":{"cliente":"ROBERTO CESAR DOS SANTOS","contrato":"969601534135","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-06-14","corretor":"ASSESSORIA","empresa":"PROPER"},"71452191":{"cliente":"ROBERTO MARTINS COSTA SOCIEDADE INDIVIDU","contrato":"71452191","vidas":"","vitalicio":"","parcelaBase":"1","inicioVigencia":"","corretor":"PROPER","empresa":"PROPER"},"2161229000":{"cliente":"RONALDO VIEGAS - SOCIEDADE INDIVIDUAL DE ADVOCACIA","contrato":"2161229000","vidas":"5","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-06-03","corretor":"PROPER","empresa":"PROPER"},"2457258000":{"cliente":"ROSA FLORES NATURAIS LTDA","contrato":"2457258000","vidas":"","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-05-20","corretor":"PROPER","empresa":"PROPER"},"969601529795":{"cliente":"ROSA MARIA DE LIMA PEREIRA 93500394191","contrato":"969601529795","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-05-29","corretor":"ASSESSORIA","empresa":"PROPER"},"969601551423":{"cliente":"ROSANA ABREU DA SILVA 10767909763","contrato":"969601551423","vidas":"1","vitalicio":"Sim","parcelaBase":"17","inicioVigencia":"2024-08-13","corretor":"ASSESSORIA","empresa":"PROPER"},"969601525388":{"cliente":"RUBIA DE OLIVEIRA DOS SANTOS 02856460100","contrato":"969601525388","vidas":"1","vitalicio":"Sim","parcelaBase":"21","inicioVigencia":"2024-05-15","corretor":"ASSESSORIA","empresa":"PROPER"},"969601551639":{"cliente":"SANDRA VERA COUTINHO","contrato":"969601551639","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-14","corretor":"ASSESSORIA","empresa":"PROPER"},"63462961":{"cliente":"SCHUABB CONSULTORIA EMPRESARIAL LTDA","contrato":"63462961","vidas":"4","vitalicio":"Não","parcelaBase":"4","inicioVigencia":"2025-10-11","corretor":"PROPER","empresa":"PROPER"},"969601529216":{"cliente":"SELMA RIBEIRO DE FARIAS 95431420410","contrato":"969601529216","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-05-28","corretor":"ASSESSORIA","empresa":"PROPER"},"5924314":{"cliente":"SERAFIM GOMES - ADVOGADOS","contrato":"5924314","vidas":"08","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-06-21","corretor":"PROPER","empresa":"PROPER"},"969601534885":{"cliente":"SERGIO ROGERIO LOPES VICENCIO","contrato":"969601534885","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-06-19","corretor":"ASSESSORIA","empresa":"PROPER"},"2557273000":{"cliente":"SERVICOS POSTAIS RANCHO NOVO LTDA","contrato":"2557273000","vidas":"2","vitalicio":"Sim","parcelaBase":"5","inicioVigencia":"2025-09-04","corretor":"ASSESSORIA","empresa":"PROPER"},"969601539234":{"cliente":"SHEILA CANDIDO DE OLIVEIRA","contrato":"969601539234","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-07-04","corretor":"ASSESSORIA","empresa":"PROPER"},"54919061":{"cliente":"SILVA & LOPES ADVOGADOS","contrato":"54919061","vidas":"3","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-04-23","corretor":"PROPER","empresa":"PROPER"},"969601537226":{"cliente":"SILVANIRA RODRIGUES SIQUEIRA","contrato":"969601537226","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-06-27","corretor":"ASSESSORIA","empresa":"PROPER"},"969601547136":{"cliente":"SILVIA REGINA BAPTISTA CHAVES","contrato":"969601547136","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-07-30","corretor":"ASSESSORIA","empresa":"PROPER"},"13897201":{"cliente":"SMAIS DISTRIBUIDORA E COMERCIO LTDA","contrato":"13897201","vidas":"28","vitalicio":"Sim","parcelaBase":"","inicioVigencia":"2025-11-10","corretor":"PROPER","empresa":"PROPER"},"470673":{"cliente":"SOLUCIOMATICA EXPRESS INFORMATICA LTDA","contrato":"470673","vidas":"08","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-06","corretor":"PROPER","empresa":"PROPER"},"470655":{"cliente":"SOLUCIONATICA INFORMATICA","contrato":"470655","vidas":"","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-07-03","corretor":"PROPER","empresa":"PROPER"},"969601656214":{"cliente":"SONIA MARIA DE BARROS","contrato":"969601656214","vidas":"01","vitalicio":"Sim","parcelaBase":"5","inicioVigencia":"2025-09-08","corretor":"PROPER","empresa":"PROPER"},"969601529650":{"cliente":"SONIA SOARES DE ALMEIDA 76731499668","contrato":"969601529650","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-05-29","corretor":"ASSESSORIA","empresa":"PROPER"},"969601553216":{"cliente":"SORAIA JORGE RODRIGUES FILHA","contrato":"969601553216","vidas":"1","vitalicio":"Sim","parcelaBase":"17","inicioVigencia":"2024-08-21","corretor":"ASSESSORIA","empresa":"PROPER"},"969601529207":{"cliente":"TANIA CHRISTINA PINHO SANCHEZ VICENCIO 85226297734","contrato":"969601529207","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-05-28","corretor":"ASSESSORIA","empresa":"PROPER"},"969601536130":{"cliente":"TANIA TAVARES BARBOSA 31386016772","contrato":"969601536130","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-06-26","corretor":"ASSESSORIA","empresa":"PROPER"},"969601525626":{"cliente":"TATIANE LYRIO PECANHA","contrato":"969601525626","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-05-16","corretor":"ASSESSORIA","empresa":"PROPER"},"67751851":{"cliente":"TECH ENGENHARIA E INSTALACOES LTDA","contrato":"67751851","vidas":"","vitalicio":"","parcelaBase":"2","inicioVigencia":"2025-12-16","corretor":"PROPER","empresa":"PROPER"},"969601695242":{"cliente":"TERESA DE CARVALHO","contrato":"969601695242","vidas":"01","vitalicio":"Não","parcelaBase":"01","inicioVigencia":"2026-02-03","corretor":"PROPER","empresa":"PROPER"},"969601706616":{"cliente":"TEREZA RISTINA BINTTENCOURT LOBO","contrato":"969601706616","vidas":"","vitalicio":"Não","parcelaBase":"01","inicioVigencia":"2026-03-18","corretor":"PROPER","empresa":"PROPER"},"853UY0":{"cliente":"TERRA PROMETIDA SALGADOS LTDA","contrato":"853UY 0","vidas":"03","vitalicio":"Não","parcelaBase":"02","inicioVigencia":"2025-12-20","corretor":"PROPER","empresa":"PROPER"},"55090461":{"cliente":"TRES CUIDADOS ASSESSORIA MATERNO-INFANTIL LTDA","contrato":"55090461","vidas":"4","vitalicio":"Sim","parcelaBase":"8","inicioVigencia":"2025-05-13","corretor":"PROPER","empresa":"PROPER"},"969601496561":{"cliente":"VERA LUCIA SANTOS CARDOSO 16927770500","contrato":"969601496561","vidas":"1","vitalicio":"Sim","parcelaBase":"25","inicioVigencia":"2024-01-11","corretor":"PROPER","empresa":"PROPER"},"56685521":{"cliente":"VERTICAL SERVIÇOS ESPECIALIZADOS","contrato":"56685521","vidas":"11","vitalicio":"Sim","parcelaBase":"8","inicioVigencia":"2025-05-13","corretor":"PROPER","empresa":"PROPER"},"467164":{"cliente":"VIA RADIO TECNOLOGIA EM TELECOMUNICACOES LTDA","contrato":"467164","vidas":"04","vitalicio":"Sim","parcelaBase":"21","inicioVigencia":"2024-06-18","corretor":"PROPER","empresa":"PROPER"},"969601529675":{"cliente":"VILMA SANTANNA DE ARAUJO","contrato":"969601529675","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-05-29","corretor":"ASSESSORIA","empresa":"PROPER"},"54461831":{"cliente":"VITALL CENTRO DE MEDICINA INTEGRATIVA LTDA","contrato":"54461831","vidas":"03","vitalicio":"Sim","parcelaBase":"8","inicioVigencia":"2025-06-26","corretor":"PROPER","empresa":"PROPER"},"51613361":{"cliente":"W F CONSULTORES ASSOCIADOS LTDA","contrato":"51613361","vidas":"","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-05-08","corretor":"PROPER","empresa":"PROPER"},"969601655947":{"cliente":"WANG YEH SAN","contrato":"969601655947","vidas":"01","vitalicio":"Sim","parcelaBase":"5","inicioVigencia":"2025-09-08","corretor":"PROPER","empresa":"PROPER"}},"byCliente":{"14757342ANACRISTINAARAUJORAMOS":{"cliente":"14.757.342 ANA CRISTINA ARAUJO RAMOS","contrato":"969601549713","vidas":"1","vitalicio":"Sim","parcelaBase":"17","inicioVigencia":"2024-08-02","corretor":"ASSESSORIA","empresa":"PROPER"},"15158036CRISTIANEMARTINSARAUJOLIMA":{"cliente":"15.158.036 CRISTIANE MARTINS ARAUJO LIMA","contrato":"49369321","vidas":"3","vitalicio":"Sim","parcelaBase":"14","inicioVigencia":"2024-12-17","corretor":"PROPER","empresa":"PROPER"},"15494104OTELINADESOUZA":{"cliente":"15.494.104 OTELINA DE SOUZA","contrato":"969601546363","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-07-29","corretor":"ASSESSORIA","empresa":"PROPER"},"23395382ALECSANDRODASILVADUTRA":{"cliente":"23.395.382 ALECSANDRO DA SILVA DUTRA","contrato":"518232","vidas":"2","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-05-16","corretor":"PROPER","empresa":"PROPER"},"48253328ELIZABETHROLIMDEMOURA":{"cliente":"48.253.328 ELIZABETH ROLIM DE MOURA","contrato":"969601541114","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-07-11","corretor":"ASSESSORIA","empresa":"PROPER"},"49580576EVAMARIAFEITOSAMACHADO":{"cliente":"49.580.576 EVA MARIA FEITOSA MACHADO","contrato":"969601550467","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-07","corretor":"PROPER","empresa":"PROPER"},"51478657MARIADEASSUNCAORIBEIRODEOLIVEIRA":{"cliente":"51.478.657 MARIA DE ASSUNCAO RIBEIRO DE OLIVEIRA","contrato":"969601481767","vidas":"1","vitalicio":"Sim","parcelaBase":"27","inicioVigencia":"2023-11-06","corretor":"PROPER","empresa":"PROPER"},"53200503ROGERIODACRUZPEREIRAJUNIOR":{"cliente":"53.200.503 ROGERIO DA CRUZ PEREIRA JUNIOR","contrato":"969601553993","vidas":"1","vitalicio":"Sim","parcelaBase":"17","inicioVigencia":"2024-08-23","corretor":"PROPER","empresa":"PROPER"},"53594103STEPHANIEGIFFONIGONCALVESBRANDAOPEREIRA":{"cliente":"53.594.103 STEPHANIE GIFFONI GONCALVES BRANDAO PEREIRA","contrato":"45196371","vidas":"5","vitalicio":"Sim","parcelaBase":"17","inicioVigencia":"2024-09-06","corretor":"PROPER","empresa":"PROPER"},"53977584AMANDADEJESUSFLORENTINO":{"cliente":"53.977.584 AMANDA DE JESUS FLORENTINO","contrato":"2447561000","vidas":"2","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-05-12","corretor":"PROPER","empresa":"PROPER"},"APRIMORDIALLOGISTICAEMTRANSPORTESLTDA":{"cliente":"A PRIMORDIAL - LOGISTICA EM TRANSPORTES LTDA","contrato":"55402091","vidas":"8","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-05-27","corretor":"PROPER","empresa":"PROPER"},"ABRAHAOGANDELMAN":{"cliente":"ABRAHÃO GANDELMAN","contrato":"969601702551","vidas":"","vitalicio":"Não","parcelaBase":"01","inicioVigencia":"2026-03-10","corretor":"PROPER","empresa":"PROPER"},"ACGDIREITOSAUTORAISLTDA":{"cliente":"ACG DIREITOS AUTORAIS LTDA","contrato":"35775503","vidas":"","vitalicio":"Não","parcelaBase":"1","inicioVigencia":"2026-01-03","corretor":"PROPER","empresa":"PROPER"},"ADEILDAALVESRAMOS":{"cliente":"ADEILDA ALVES RAMOS","contrato":"969601489863","vidas":"1","vitalicio":"Sim","parcelaBase":"27","inicioVigencia":"2023-12-05","corretor":"PROPER","empresa":"PROPER"},"ADELINABAPTISTAFLORENTINO":{"cliente":"ADELINA BAPTISTA FLORENTINO","contrato":"969601550995","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-09","corretor":"ASSESSORIA","empresa":"PROPER"},"ADNAFERREIRAALVES":{"cliente":"ADNA FERREIRA ALVES","contrato":"9696014849198","vidas":"1","vitalicio":"Sim","parcelaBase":"27","inicioVigencia":"2023-11-21","corretor":"PROPER","empresa":"PROPER"},"AGUILARBARBOSAADVOGADOSASSOCIADOS":{"cliente":"AGUILAR & BARBOSA ADVOGADOS ASSOCIADOS","contrato":"54434221","vidas":"6","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-05-09","corretor":"PROPER","empresa":"PROPER"},"ALARMEFORTESISTEMASELETRONICOSDESEGURANCALTDA":{"cliente":"ALARMEFORTE SISTEMAS ELETRONICOS DE SEGURANCA LTDA","contrato":"488529","vidas":"13","vitalicio":"Sim","parcelaBase":"17","inicioVigencia":"2024-09-28","corretor":"PROPER","empresa":"PROPER"},"ALDODOSSANTOSADAO":{"cliente":"ALDO DOS SANTOS ADAO","contrato":"14948362","vidas":"","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-05-02","corretor":"PROPER","empresa":"PROPER"},"ALICEMARAMACHADOFERNANDES":{"cliente":"ALICE MARA MACHADO FERNANDES","contrato":"969601564672","vidas":"1","vitalicio":"Sim","parcelaBase":"16","inicioVigencia":"2025-01-14","corretor":"PROPER","empresa":"PROPER"},"ANAANGELICADOAMARALFERREIRAANDRADE":{"cliente":"ANA ANGELICA DO AMARAL FERREIRA ANDRADE","contrato":"9696901544212","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-07-23","corretor":"ASSESSORIA","empresa":"PROPER"},"ANAMARIAALVESMOREIRA":{"cliente":"ANA MARIA ALVES MOREIRA","contrato":"969601648143","vidas":"01","vitalicio":"Sim","parcelaBase":"6","inicioVigencia":"2025-07-30","corretor":"PROPER","empresa":"PROPER"},"ANAMARIAVALDETAROMATHIAS":{"cliente":"ANA MARIA VALDETARO MATHIAS","contrato":"96960169","vidas":"1","vitalicio":"Sim","parcelaBase":"6","inicioVigencia":"2025-10-28","corretor":"PROPER","empresa":"PROPER"},"ANAPAULADEOLIVEIRA":{"cliente":"ANA PAULA DE OLIVEIRA","contrato":"969601547289","vidas":"1","vitalicio":"Sim","parcelaBase":"16","inicioVigencia":"2024-07-30","corretor":"ASSESSORIA","empresa":"PROPER"},"ANDREAUGUSTOPENNAFRANCA":{"cliente":"ANDRE AUGUSTO PENNA FRANCA","contrato":"14554502","vidas":"1","vitalicio":"Sim","parcelaBase":"13","inicioVigencia":"","corretor":"PROPER","empresa":"PROPER"},"ANDREESCRIBANOGUZMAN":{"cliente":"ANDRE ESCRIBANO GUZMAN","contrato":"73292671","vidas":"","vitalicio":"Sim","parcelaBase":"1","inicioVigencia":"","corretor":"PROPER","empresa":"PROPER"},"ANDREJACOBPAILHOUS":{"cliente":"ANDRE JACOB PAILHOUS","contrato":"14948376","vidas":"1","vitalicio":"Sim","parcelaBase":"10","inicioVigencia":"2025-04-08","corretor":"PROPER","empresa":"PROPER"},"ANDRELUISGONCALVESDINIZ07673721740":{"cliente":"ANDRE LUIS GONCALVES DINIZ 07673721740","contrato":"35711791","vidas":"4","vitalicio":"Sim","parcelaBase":"24","inicioVigencia":"2024-01-05","corretor":"PROPER","empresa":"PROPER"},"ANDRELUIZLAUCAS":{"cliente":"ANDRE LUIZ LAUCAS","contrato":"14948368","vidas":"","vitalicio":"Sim","parcelaBase":"10","inicioVigencia":"2025-04-02","corretor":"PROPER","empresa":"PROPER"},"ANDREACRISTINADESOUZACARNEIRO00563585714":{"cliente":"ANDREA CRISTINA DE SOUZA CARNEIRO 00563585714","contrato":"2391004000","vidas":"4","vitalicio":"Sim","parcelaBase":"10","inicioVigencia":"2025-03-25","corretor":"PROPER","empresa":"PROPER"},"ANDREASOBRALFARIA":{"cliente":"ANDREA SOBRAL FARIA","contrato":"969601651029","vidas":"1","vitalicio":"Sim","parcelaBase":"6","inicioVigencia":"2025-08-14","corretor":"PROPER","empresa":"PROPER"},"ANGELACURTYCASTELLAN":{"cliente":"ANGELA CURTY CASTELLAN","contrato":"969601706074","vidas":"","vitalicio":"Não","parcelaBase":"01","inicioVigencia":"2026-03-16","corretor":"PROPER","empresa":"PROPER"},"ANGELAMARIAFACEROLEARARIPE":{"cliente":"ANGELA MARIA FACEROLE ARARIPE","contrato":"969601575124","vidas":"1","vitalicio":"Sim","parcelaBase":"15","inicioVigencia":"2024-10-28","corretor":"PROPER","empresa":"PROPER"},"ANOILDOMATTOSMEDSENIOR":{"cliente":"ANOILDO MATTOS - MEDSENIOR","contrato":"969601691658","vidas":"1","vitalicio":"Não","parcelaBase":"2","inicioVigencia":"2026-01-20","corretor":"PROPER","empresa":"PROPER"},"ANOILDOMATTOSJUNIOR":{"cliente":"ANOILDO MATTOS JUNIOR","contrato":"515203","vidas":"3","vitalicio":"Sim","parcelaBase":"8","inicioVigencia":"","corretor":"PROPER","empresa":"PROPER"},"ANOILDOMATTOSJUNIOR85651729704":{"cliente":"ANOILDO MATTOS JUNIOR 85651729704","contrato":"515203","vidas":"","vitalicio":"","parcelaBase":"2","inicioVigencia":"","corretor":"------","empresa":"PROPER"},"ANTONIOCARLOSALCOFORADODALUZ":{"cliente":"ANTONIO CARLOS ALCOFORADO DA LUZ","contrato":"969601538304","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-06-28","corretor":"ASSESSORIA","empresa":"PROPER"},"ANTONIOLUIZLONGO":{"cliente":"ANTONIO LUIZ LONGO","contrato":"969601549492","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-02","corretor":"PROPER","empresa":"PROPER"},"ARMANDOGUIMARAESDEALMEIDANETOSULAMERICA":{"cliente":"ARMANDO GUIMARAES DE ALMEIDA NETO - SULAMERICA","contrato":"56785911","vidas":"3","vitalicio":"Sim","parcelaBase":"8","inicioVigencia":"2025-06-03","corretor":"PROPER","empresa":"PROPER"},"ARMANDOLUIZMAUROJUNIOR":{"cliente":"ARMANDO LUIZ MAURO JUNIOR","contrato":"969601537254","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-06-28","corretor":"ASSESSORIA","empresa":"PROPER"},"ARYCLIOVINICIUSCHOUZALTOSCANO":{"cliente":"ARYCLIO VINICIUS CHOUZAL TOSCANO","contrato":"969601610541","vidas":"1","vitalicio":"Sim","parcelaBase":"11","inicioVigencia":"2025-03-19","corretor":"PROPER","empresa":"PROPER"},"BARBARARACHID":{"cliente":"BARBARA RACHID","contrato":"969601624448","vidas":"01","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-05-07","corretor":"PROPER","empresa":"PROPER"},"BAUTECSERVICOSLTDA":{"cliente":"BAUTEC SERVICOS LTDA","contrato":"57234581","vidas":"3","vitalicio":"Sim","parcelaBase":"8","inicioVigencia":"2025-06-06","corretor":"PROPER","empresa":"PROPER"},"BCAJBLANCHESAMIL1924083000":{"cliente":"BCAJB LANCHES - AMIL 1924083000","contrato":"2487632000","vidas":"5","vitalicio":"Sim","parcelaBase":"8","inicioVigencia":"2025-06-17","corretor":"PROPER","empresa":"PROPER"},"BEATPLACEEMPREENDIMENTOSDIGITAISLTDA":{"cliente":"BEATPLACE EMPREENDIMENTOS DIGITAIS LTDA","contrato":"2180384000","vidas":"2","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-07-26","corretor":"PROPER","empresa":"PROPER"},"BECKEREGABRIELADVOGADOS":{"cliente":"BECKER E GABRIEL ADVOGADOS","contrato":"2721483000","vidas":"4","vitalicio":"","parcelaBase":"2","inicioVigencia":"2026-02-25","corretor":"ASSESSORIA","empresa":"PROPER"},"BENEDITACORREIAKILIM":{"cliente":"BENEDITA CORREIA KILIM","contrato":"9696001664794","vidas":"1","vitalicio":"Sim","parcelaBase":"4","inicioVigencia":"2025-10-13","corretor":"PROPER","empresa":"PROPER"},"BICARCONSULTORESEADMINISTRADORESLTDA":{"cliente":"BICAR CONSULTORES E ADMINISTRADORES LTDA.","contrato":"42089161","vidas":"","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-07-06","corretor":"PROPER","empresa":"PROPER"},"BLACKROSEFILMESLTDA":{"cliente":"BLACK ROSE FILMES LTDA","contrato":"2583888000","vidas":"2","vitalicio":"Sim","parcelaBase":"4","inicioVigencia":"2025-10-02","corretor":"ASSESSORIA","empresa":"PROPER"},"BRAGAEGODINHOCOMERCIOVAREJISTADEGLPLTDA":{"cliente":"BRAGA E GODINHO COMERCIO VAREJISTA DE GLP LTDA","contrato":"66195041","vidas":"06","vitalicio":"Não","parcelaBase":"03","inicioVigencia":"2025-11-04","corretor":"ASSESSORIA","empresa":"PROPER"},"BRITOLIMAADVOGADOSASSOCIADOS":{"cliente":"BRITO & LIMA ADVOGADOS ASSOCIADOS","contrato":"63653621","vidas":"04","vitalicio":"Sim","parcelaBase":"4","inicioVigencia":"2025-10-01","corretor":"PROPER","empresa":"PROPER"},"BRUNODESOUZAVIALSERVICOSMEDIICOS":{"cliente":"BRUNO DE SOUZA VIAL SERVICOS MEDIICOS","contrato":"66833391","vidas":"","vitalicio":"Sim","parcelaBase":"4","inicioVigencia":"2025-11-24","corretor":"PROPER","empresa":"PROPER"},"CAIXADEASSISTDOMINISTERIOPUBLICO":{"cliente":"CAIXA DE ASSIST DO MINISTERIO PUBLICO","contrato":"------","vidas":"","vitalicio":"Sim","parcelaBase":"1","inicioVigencia":"2025-12-20","corretor":"PROPER","empresa":"PROPER"},"CANTINAERESTAURANTETRAPANILTDA":{"cliente":"CANTINA E RESTAURANTE TRAPANI LTDA","contrato":"54321171","vidas":"03","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-05-16","corretor":"PROPER","empresa":"PROPER"},"CARLABRAGAURIBBECASTRO":{"cliente":"CARLA BRAGA URIBBE CASTRO","contrato":"4847662","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"","corretor":"ASSESSORIA","empresa":"PROPER"},"CARLOSRAULGARCIA":{"cliente":"CARLOS RAUL GARCIA","contrato":"1636902","vidas":"","vitalicio":"Não","parcelaBase":"01","inicioVigencia":"2026-03-03","corretor":"ASSESSORIA","empresa":"PROPER"},"CECILIAZECCHINYOUNG":{"cliente":"CECILIA ZECCHIN YOUNG","contrato":"------","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"","corretor":"------","empresa":"PROPER"},"CELESTERODRIGUESNOGUEIRA":{"cliente":"CELESTE RODRIGUES NOGUEIRA","contrato":"969601532060","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-05-31","corretor":"ASSESSORIA","empresa":"PROPER"},"CELIAMARIAPEREIRADASILVA10601607732":{"cliente":"CELIA MARIA PEREIRA DA SILVA 10601607732","contrato":"969601490706","vidas":"1","vitalicio":"Sim","parcelaBase":"26","inicioVigencia":"2023-12-08","corretor":"PROPER","empresa":"PROPER"},"CELIODESOUZAMINHAVA":{"cliente":"CELIO DE SOUZA MINHAVA","contrato":"969601551822","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-14","corretor":"ASSESSORIA","empresa":"PROPER"},"CELIORICARDOCOUTINHO":{"cliente":"CELIO RICARDO COUTINHO","contrato":"544065840","vidas":"1","vitalicio":"Viatalicio","parcelaBase":"6","inicioVigencia":"2025-09-10","corretor":"ASSESSORIA","empresa":"PROPER"},"CENTRODETREINAMENTOMOVEON":{"cliente":"CENTRO DE TREINAMENTO MOVE ON","contrato":"2688820000","vidas":"5","vitalicio":"","parcelaBase":"1","inicioVigencia":"2026-01-26","corretor":"ASSESSORIA","empresa":"PROPER"},"CIRCULOBRASILEIRODEPATOLOGIALTDA":{"cliente":"CIRCULO BRASILEIRO DE PATOLOGIA LTDA","contrato":"578991","vidas":"","vitalicio":"Não","parcelaBase":"1","inicioVigencia":"2026-01-14","corretor":"PROPER","empresa":"PROPER"},"CLAUDIAVERASDESOUZA":{"cliente":"CLAUDIA VERAS DE SOUZA","contrato":"969601542102","vidas":"1","vitalicio":"Sim","parcelaBase":"15","inicioVigencia":"2024-07-16","corretor":"ASSESSORIA","empresa":"PROPER"},"CONDOMINIOACQUABELLA":{"cliente":"CONDOMINIO ACQUABELLA","contrato":"2247309000","vidas":"134","vitalicio":"Sim","parcelaBase":"14","inicioVigencia":"2024-12-01","corretor":"PROPER","empresa":"PROPER"},"CONDOMINIODOEDIFICIOBARRALIFEMEDICALCENTER":{"cliente":"CONDOMINIO DO EDIFICIO BARRALIFE MEDICAL CENTER","contrato":"801F4","vidas":"33","vitalicio":"Sim","parcelaBase":"23","inicioVigencia":"2024-03-07","corretor":"PROPER","empresa":"PROPER"},"CONDOMINIODOSEDIFICIOSARUATIMOTEODACOSTAN1100":{"cliente":"CONDOMINIO DOS EDIFICIOS A RUA TIMOTEO DA COSTA N 1100","contrato":"2483289000","vidas":"39","vitalicio":"Sim","parcelaBase":"8","inicioVigencia":"2025-06-12","corretor":"PROPER","empresa":"PROPER"},"CONTEUDOSCONECTADOSLTDA":{"cliente":"CONTEUDOS CONECTADOS LTDA","contrato":"2678183000","vidas":"1","vitalicio":"Não","parcelaBase":"01","inicioVigencia":"2026-01-14","corretor":"PROPER","empresa":"PROPER"},"COOKSHOUSEGASTRONOMIALTDA":{"cliente":"COOKS HOUSE GASTRONOMIA LTDA","contrato":"2177156000","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-07-17","corretor":"PROPER","empresa":"PROPER"},"CRISTINAELIODORADESOUZARAMOS":{"cliente":"CRISTINA ELIODORA DE SOUZA RAMOS","contrato":"969601550588","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-08","corretor":"ASSESSORIA","empresa":"PROPER"},"CRISTINASARAIVASANCHES":{"cliente":"CRISTINA SARAIVA SANCHES","contrato":"515422","vidas":"1","vitalicio":"Sim","parcelaBase":"10","inicioVigencia":"2025-05-10","corretor":"PROPER","empresa":"PROPER"},"CROSSALFALTDA":{"cliente":"CROSS ALFA LTDA","contrato":"2640918000","vidas":"03","vitalicio":"Não","parcelaBase":"2","inicioVigencia":"2025-12-01","corretor":"ASSESSORIA","empresa":"PROPER"},"DAVIRIBEIROBALARO":{"cliente":"DAVI RIBEIRO BALARO","contrato":"969601551896","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-14","corretor":"ASSESSORIA","empresa":"PROPER"},"DAVIDSONDOSSANTOS":{"cliente":"DAVIDSON DOS SANTOS","contrato":"969601524975","vidas":"1","vitalicio":"Sim","parcelaBase":"21","inicioVigencia":"2024-05-14","corretor":"ASSESSORIA","empresa":"PROPER"},"DENISESANTOSBARRETTO":{"cliente":"DENISE SANTOS BARRETTO","contrato":"969601534113","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-06-14","corretor":"ASSESSORIA","empresa":"PROPER"},"DEXINVESTCOMERCIOEVAREJOLTDA":{"cliente":"DEX INVEST COMERCIO E VAREJO LTDA (SULAMERICA)","contrato":"442337","vidas":"17","vitalicio":"Sim","parcelaBase":"21","inicioVigencia":"2024-03-27","corretor":"PROPER","empresa":"PROPER"},"DILSASOBRALFARIA":{"cliente":"DILSA SOBRAL FARIA","contrato":"969601651069","vidas":"1","vitalicio":"Sim","parcelaBase":"6","inicioVigencia":"2025-08-14","corretor":"PROPER","empresa":"PROPER"},"EBERSONBENTODASILVA":{"cliente":"EBERSON BENTO DA SILVA","contrato":"969601619267","vidas":"1","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-04-17","corretor":"PROPER","empresa":"PROPER"},"EDELZIADEMATTOSGONCALVES":{"cliente":"EDELZIA DE MATTOS GONÇALVES","contrato":"969601597374","vidas":"1","vitalicio":"Sim","parcelaBase":"12","inicioVigencia":"2025-01-27","corretor":"ASSESSORIA","empresa":"PROPER"},"EDIVALDOALBUQUERQUE":{"cliente":"EDIVALDO ALBUQUERQUE","contrato":"14948378","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2025-04-02","corretor":"PROPER","empresa":"PROPER"},"EDNALUCIAMENDES02605605612":{"cliente":"EDNA LUCIA MENDES 02605605612","contrato":"969601549986","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-06","corretor":"ASSESSORIA","empresa":"PROPER"},"EDSONSIQUEIRANUNESCONTABIL":{"cliente":"EDSON SIQUEIRA NUNES CONTABIL","contrato":"62385661","vidas":"1","vitalicio":"Sim","parcelaBase":"5","inicioVigencia":"2025-09-06","corretor":"PROPER","empresa":"PROPER"},"ELAINEDALFORNEDEOLIVEIRA":{"cliente":"ELAINE DALFORNE DE OLIVEIRA","contrato":"969601669728","vidas":"1","vitalicio":"Sim","parcelaBase":"3","inicioVigencia":"2025-10-28","corretor":"ASSESSORIA","empresa":"PROPER"},"ELAINEMORAESVALENCA":{"cliente":"ELAINE MORAES VALENCA","contrato":"969601513775","vidas":"1","vitalicio":"Sim","parcelaBase":"22","inicioVigencia":"2024-05-28","corretor":"PROPER","empresa":"PROPER"},"ELIANECARVALHODESOUZA":{"cliente":"ELIANE CARVALHO DE SOUZA","contrato":"4872903","vidas":"","vitalicio":"Não","parcelaBase":"1","inicioVigencia":"","corretor":"ASSESSORIA","empresa":"PROPER"},"ELIANEPEIXOTOLUBANCO":{"cliente":"ELIANE PEIXOTO LUBANCO","contrato":"969601660415","vidas":"01","vitalicio":"Sim","parcelaBase":"5","inicioVigencia":"2025-09-24","corretor":"PROPER","empresa":"PROPER"},"ELIETECAVALCANTIDESOUZA":{"cliente":"ELIETE CAVALCANTI DE SOUZA","contrato":"969601672486","vidas":"1","vitalicio":"Sim","parcelaBase":"3","inicioVigencia":"2025-11-05","corretor":"PROPER","empresa":"PROPER"},"ELISABETEGAIADASNEVES":{"cliente":"ELISABETE GAIA DAS NEVES","contrato":"969601549735","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-05","corretor":"ASSESSORIA","empresa":"PROPER"},"FPVEIGAENGENHARIALTDA":{"cliente":"F P VEIGA ENGENHARIA LTDA","contrato":"60864191","vidas":"04","vitalicio":"Sim","parcelaBase":"6","inicioVigencia":"2025-08-08","corretor":"PROPER","empresa":"PROPER"},"FABIANAVERASROCHAPRAXEDES":{"cliente":"FABIANA VERAS ROCHA PRAXEDES","contrato":"969601693219","vidas":"","vitalicio":"Não","parcelaBase":"","inicioVigencia":"2026-01-27","corretor":"ASSESSORIA","empresa":"PROPER"},"FABIOMUNIZ01938294955":{"cliente":"FABIO MUNIZ 01938294955","contrato":"969601552407","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-16","corretor":"ASSESSORIA","empresa":"PROPER"},"FELISBELADESOUSAMINHAVA":{"cliente":"FELISBELA DE SOUSA MINHAVA","contrato":"969601550816","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-09","corretor":"PROPER","empresa":"PROPER"},"FERNANDALAMOGLIA":{"cliente":"FERNANDA LAMOGLIA","contrato":"2571289000","vidas":"2","vitalicio":"Sim","parcelaBase":"5","inicioVigencia":"2025-09-18","corretor":"PROPER","empresa":"PROPER"},"FLARILEIMOVEISEADMINISTRADORALTDA":{"cliente":"FLARILE IMOVEIS E ADMINISTRADORA LTDA","contrato":"516073","vidas":"3","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-05-13","corretor":"PROPER","empresa":"PROPER"},"FLAVIABRAGANEIVA01479110795":{"cliente":"FLAVIA BRAGA NEIVA 01479110795","contrato":"2393615000","vidas":"06","vitalicio":"Sim","parcelaBase":"10","inicioVigencia":"2025-03-27","corretor":"PROPER","empresa":"PROPER"},"FLXPUBLICIDADELTDA":{"cliente":"FLX PUBLICIDADE LTDA","contrato":"45715131","vidas":"6","vitalicio":"Sim","parcelaBase":"16","inicioVigencia":"2024-10-08","corretor":"PROPER","empresa":"PROPER"},"FRANCISCODEASSISVELASQUESRODRIGUES43040705334":{"cliente":"FRANCISCO DE ASSIS VELASQUES RODRIGUES 43040705334","contrato":"1146464","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-09","corretor":"ASSESSORIA","empresa":"PROPER"},"FRANCISCOTOMASPAZGUISCAFRE79267769715":{"cliente":"FRANCISCO TOMAS PAZ GUISCAFRE 79267769715","contrato":"54547151","vidas":"","vitalicio":"Sim","parcelaBase":"7","inicioVigencia":"","corretor":"PROPER","empresa":"PROPER"},"GARCIAPEDREIRALTDA":{"cliente":"GARCIA & PEDREIRA LTDA","contrato":"2348633000","vidas":"5","vitalicio":"Sim","parcelaBase":"12","inicioVigencia":"2025-02-03","corretor":"PROPER","empresa":"PROPER"},"GETULIOANDIONMACEDO":{"cliente":"GETULIO ANDION MACEDO","contrato":"969601532773","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-06-05","corretor":"ASSESSORIA","empresa":"PROPER"},"GRUPODEASSISTENCIAAMULHER":{"cliente":"GRUPO DE ASSISTENCIA A MULHER","contrato":"2596947000","vidas":"12","vitalicio":"Sim","parcelaBase":"4","inicioVigencia":"2025-10-16","corretor":"PROPER","empresa":"PROPER"},"GRUPOSOLUCIOMATICAINFORMATICALTDA":{"cliente":"GRUPO SOLUCIOMATICA INFORMATICA LTDA","contrato":"468093","vidas":"2","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-07-03","corretor":"PROPER","empresa":"PROPER"},"GUSTAVOBRAGATERNI":{"cliente":"GUSTAVO BRAGA TERNI","contrato":"------","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"","corretor":"ASSESSORIA","empresa":"PROPER"},"HENRIQUEYOUNGLOURES":{"cliente":"HENRIQUE YOUNG LOURES","contrato":"------","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"","corretor":"------","empresa":"PROPER"},"HOTELREPRESENTATIONBRAZILLTDA":{"cliente":"HOTEL REPRESENTATION BRAZIL LTDA","contrato":"29810531","vidas":"","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-04-23","corretor":"PROPER","empresa":"PROPER"},"IASMINTEIXEIRASCALAMBRINI15104464784":{"cliente":"IASMIN TEIXEIRA SCALAMBRINI 15104464784","contrato":"457436","vidas":"3","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-06-07","corretor":"PROPER","empresa":"PROPER"},"IATHASOARESDEALMEIDA":{"cliente":"IATHA SOARES DE ALMEIDA","contrato":"969601530080","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-05-29","corretor":"ASSESSORIA","empresa":"PROPER"},"ILDAVIEIRAMOUTELLA":{"cliente":"ILDA VIEIRA MOUTELLA","contrato":"969601662315","vidas":"1","vitalicio":"Sim","parcelaBase":"4","inicioVigencia":"2025-10-02","corretor":"PROPER","empresa":"PROPER"},"INOBILETELECOMUNICACOESLTDA":{"cliente":"INOBILE TELECOMUNICACOES LTDA","contrato":"54114291","vidas":"3","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-04-10","corretor":"PROPER","empresa":"PROPER"},"INOBILETELECOMUNICACOESLTDAAMIL":{"cliente":"INOBILE TELECOMUNICACOES LTDA (AMIL)","contrato":"2595820000","vidas":"02","vitalicio":"Sim","parcelaBase":"04","inicioVigencia":"2025-10-15","corretor":"PROPER","empresa":"PROPER"},"IONEHASSELMANNDAMASCENOVIEIRA72060697700":{"cliente":"IONE HASSELMANN DAMASCENO VIEIRA 72060697700","contrato":"1132889","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-07-11","corretor":"ASSESSORIA","empresa":"PROPER"},"IRACYFERREIRADESOUZA":{"cliente":"IRACY FERREIRA DE SOUZA","contrato":"96960154262","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-26","corretor":"PROPER","empresa":"PROPER"},"IVANDAFACIROLLIARARIPE":{"cliente":"IVANDA FACIROLLI ARARIPE","contrato":"969601574682","vidas":"1","vitalicio":"Sim","parcelaBase":"15","inicioVigencia":"2024-10-28","corretor":"PROPER","empresa":"PROPER"},"IVANILDOLADISLAUDEARAUJO":{"cliente":"IVANILDO LADISLAU DE ARAUJO","contrato":"969601529017","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-05-28","corretor":"ASSESSORIA","empresa":"PROPER"},"IVANIRMARIADESOUZACOSTA":{"cliente":"IVANIR MARIA DE SOUZA COSTA","contrato":"969601539805","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-07-05","corretor":"ASSESSORIA","empresa":"PROPER"},"IVETEDASILVAROCHA":{"cliente":"IVETE DA SILVA ROCHA","contrato":"969601538963","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-07-03","corretor":"ASSESSORIA","empresa":"PROPER"},"IVODEOLIVEIRAROSA":{"cliente":"IVO DE OLIVEIRA ROSA","contrato":"969601537633","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-06-28","corretor":"ASSESSORIA","empresa":"PROPER"},"IVONEMATIOLI":{"cliente":"IVONE MATIOLI","contrato":"14984559","vidas":"","vitalicio":"Sim","parcelaBase":"","inicioVigencia":"2025-05-02","corretor":"------","empresa":"PROPER"},"JACILENEALVESRAMOS":{"cliente":"JACILENE ALVES RAMOS","contrato":"969601489963","vidas":"1","vitalicio":"Sim","parcelaBase":"26","inicioVigencia":"2023-12-05","corretor":"PROPER","empresa":"PROPER"},"JANDIRADOSSANTOSMARTINS04335193980":{"cliente":"JANDIRA DOS SANTOS MARTINS 04335193980","contrato":"969601530058","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-05-29","corretor":"ASSESSORIA","empresa":"PROPER"},"JANIEFERREIRAMENEZES":{"cliente":"JANIE FERREIRA MENEZES","contrato":"969601551441","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-13","corretor":"ASSESSORIA","empresa":"PROPER"},"JBBCALANCHESLTDA":{"cliente":"JBBCA LANCHES LTDA","contrato":"55275141","vidas":"05","vitalicio":"Sim","parcelaBase":"8","inicioVigencia":"2025-06-06","corretor":"PROPER","empresa":"PROPER"},"JOAOBOSCODEAZEVEDO":{"cliente":"JOAO BOSCO DE AZEVEDO","contrato":"969601697306","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2026-02-10","corretor":"PROPER","empresa":"PROPER"},"JOELMASAROTOBAIRROS00987718762":{"cliente":"JOELMA SAROTO BAIRROS 00987718762","contrato":"61193161","vidas":"1","vitalicio":"Sim","parcelaBase":"6","inicioVigencia":"2025-09-02","corretor":"PROPER","empresa":"PROPER"},"JONATASGOMESDONASCIMENTO":{"cliente":"JONATAS GOMES DO NASCIMENTO","contrato":"4869322","vidas":"","vitalicio":"Não","parcelaBase":"1","inicioVigencia":"","corretor":"ASSESSORIA","empresa":"PROPER"},"JORGECESARDEOLIVEIRA":{"cliente":"JORGE CESAR DE OLIVEIRA","contrato":"969601669882","vidas":"1","vitalicio":"Sim","parcelaBase":"3","inicioVigencia":"2025-10-29","corretor":"ASSESSORIA","empresa":"PROPER"},"JORGEMARTINS":{"cliente":"JORGE MARTINS","contrato":"969601530117","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-05-29","corretor":"ASSESSORIA","empresa":"PROPER"},"JOSELUIZMENEZESSILVA":{"cliente":"JOSE LUIZ MENEZES SILVA","contrato":"969601542157","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-13","corretor":"ASSESSORIA","empresa":"PROPER"},"JOSEWILLIANDEOLIVEIRAABICHACRA":{"cliente":"JOSE WILLIAN DE OLIVEIRA ABICHACRA","contrato":"969601536782","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-06-27","corretor":"ASSESSORIA","empresa":"PROPER"},"JULIODESOUZAGONCALVES":{"cliente":"JULIO DE SOUZA GONÇALVES","contrato":"969601595371","vidas":"1","vitalicio":"Sim","parcelaBase":"14","inicioVigencia":"2025-01-15","corretor":"PROPER","empresa":"PROPER"},"JULIOPEREIRADEOLIVEIRANET":{"cliente":"JULIO PEREIRA DE OLIVEIRA NET","contrato":"------","vidas":"","vitalicio":"Não","parcelaBase":"1","inicioVigencia":"2026-04-08","corretor":"PROPER","empresa":"PROPER"},"LFESTEVESCONSULTORIAEMGESTAO":{"cliente":"L F ESTEVES CONSULTORIA EM GESTAO","contrato":"2765565000","vidas":"2","vitalicio":"Não","parcelaBase":"1","inicioVigencia":"2026-04-10","corretor":"PROPER","empresa":"PROPER"},"LEDAMARIANOGUEIRA":{"cliente":"LEDA MARIA NOGUEIRA","contrato":"969601491795","vidas":"1","vitalicio":"Sim","parcelaBase":"26","inicioVigencia":"2023-12-14","corretor":"PROPER","empresa":"PROPER"},"LEONARDOMENDONCASOCIEDADEINDIVIDUAL":{"cliente":"LEONARDO MENDONCA SOCIEDADE INDIVIDUAL","contrato":"71298891","vidas":"","vitalicio":"Não","parcelaBase":"2","inicioVigencia":"2026-02-26","corretor":"PROPER","empresa":"PROPER"},"LEONARDOPERAZZOBARBOSA":{"cliente":"LEONARDO PERAZZO BARBOSA","contrato":"969601611227","vidas":"1","vitalicio":"Sim","parcelaBase":"10","inicioVigencia":"2025-03-21","corretor":"PROPER","empresa":"PROPER"},"LEONILDEDEALMEIDAALVES":{"cliente":"LEONILDE DE ALMEIDA ALVES","contrato":"1574437","vidas":"1","vitalicio":"Sim","parcelaBase":"6","inicioVigencia":"2025-08-21","corretor":"PROPER","empresa":"PROPER"},"LGOATIVIDADESMEDICASAMBULATORIAISLTDA":{"cliente":"LGO ATIVIDADES MEDICAS AMBULATORIAIS LTDA","contrato":"235215000","vidas":"1","vitalicio":"Sim","parcelaBase":"12","inicioVigencia":"2025-02-10","corretor":"PROPER","empresa":"PROPER"},"LILIAMARIAGALDOALBANODEARATANHA":{"cliente":"LILIA MARIA GALDO ALBANO DE ARATANHA","contrato":"969601544879","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-07-26","corretor":"PROPER","empresa":"PROPER"},"LINABIANCO":{"cliente":"LINA BIANCO","contrato":"969601693416","vidas":"","vitalicio":"","parcelaBase":"1","inicioVigencia":"2025-01-28","corretor":"PROPER","empresa":"PROPER"},"LINCECRIATIVASA":{"cliente":"LINCE + CRIATIVA S/A","contrato":"25093886000","vidas":"2","vitalicio":"Sim","parcelaBase":"8","inicioVigencia":"2025-07-11","corretor":"PROPER","empresa":"PROPER"},"LUCIAMARIAOLIVEIRANASCIMENTOARAUJO":{"cliente":"LUCIA MARIA OLIVEIRA NASCIMENTO ARAUJO","contrato":"969601700616","vidas":"1","vitalicio":"Não","parcelaBase":"2","inicioVigencia":"2026-02-24","corretor":"PROPER","empresa":"PROPER"},"LUCIANECAMPOSMOTTA":{"cliente":"LUCIANE CAMPOS MOTTA","contrato":"969601528443","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-05-27","corretor":"ASSESSORIA","empresa":"PROPER"},"LUIZFELLIPPESERRODOSSANTOS":{"cliente":"LUIZ FELLIPPE SERRO DOS SANTOS","contrato":"45353731","vidas":"","vitalicio":"Sim","parcelaBase":"3","inicioVigencia":"2025-11-19","corretor":"PROPER","empresa":"PROPER"},"LUIZMANGIAJUNIOR":{"cliente":"LUIZ MANGIA JUNIOR","contrato":"969601627203","vidas":"01","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-05-15","corretor":"PROPER","empresa":"PROPER"},"LUIZROBERTOBASTOSMOUTELLA":{"cliente":"LUIZ ROBERTO BASTOS MOUTELLA","contrato":"969601659252","vidas":"1","vitalicio":"Sim","parcelaBase":"5","inicioVigencia":"2025-09-17","corretor":"PROPER","empresa":"PROPER"},"LUZCAPRODUCOESARTISTICASECINEMATOGRAFICASLTDA":{"cliente":"LUZCA PRODUCOES ARTISTICAS E CINEMATOGRAFICAS LTDA","contrato":"2446386000","vidas":"2","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-05-12","corretor":"PROPER","empresa":"PROPER"},"MA61SERVICOSECOMERCIODEROUPASLTDA":{"cliente":"M A 61 SERVICOS E COMERCIO DE ROUPAS LTDA","contrato":"2543075000","vidas":"02","vitalicio":"Sim","parcelaBase":"5","inicioVigencia":"2025-08-19","corretor":"PROPER","empresa":"PROPER"},"MDEFADEFIGUEIREDOJUNGER":{"cliente":"M DE F A DE FIGUEIREDO JUNGER","contrato":"2737448000","vidas":"2","vitalicio":"Não","parcelaBase":"1","inicioVigencia":"2026-03-11","corretor":"ASSESSORIA","empresa":"PROPER"},"MACARIOMENDESDAMATTA":{"cliente":"MACARIO MENDES DA MATTA","contrato":"969601541720","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-07-12","corretor":"ASSESSORIA","empresa":"PROPER"},"MARAMACPROJETOSPAISAGISMOEURBANIZACAOLTDA":{"cliente":"MARA MAC PROJETOS, PAISAGISMO E URBANIZACAO LTDA","contrato":"515873","vidas":"3","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-05-08","corretor":"PROPER","empresa":"PROPER"},"MARCELOALMEIDAALVES":{"cliente":"MARCELO ALMEIDA ALVES","contrato":"2562711000","vidas":"2","vitalicio":"Sim","parcelaBase":"5","inicioVigencia":"2025-09-10","corretor":"PROPER","empresa":"PROPER"},"MARCIACRISTINAREISDOSSANTOS":{"cliente":"MARCIA CRISTINA REIS DOS SANTOS","contrato":"969601676209","vidas":"1","vitalicio":"Não","parcelaBase":"2","inicioVigencia":"2025-11-13","corretor":"PROPER","empresa":"PROPER"},"MARCIADEOLIVEIRAGUTTERRES":{"cliente":"MARCIA DE OLIVEIRA GUTTERRES","contrato":"969601664164","vidas":"1","vitalicio":"Sim","parcelaBase":"4","inicioVigencia":"2025-10-10","corretor":"PROPER","empresa":"PROPER"},"MARCIOFRANCE":{"cliente":"MARCIO FRANCE","contrato":"969601556122","vidas":"1","vitalicio":"Sim","parcelaBase":"17","inicioVigencia":"2024-08-28","corretor":"ASSESSORIA","empresa":"PROPER"},"MARCOANDREMILLODECASTRO":{"cliente":"MARCO ANDRE MILLO DE CASTRO","contrato":"969601540190","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-07-08","corretor":"ASSESSORIA","empresa":"PROPER"},"MARIAAPARECIDADONASCIMENTOOLIVEIRA":{"cliente":"MARIA APARECIDA DO NASCIMENTO OLIVEIRA","contrato":"969601552551","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-19","corretor":"ASSESSORIA","empresa":"PROPER"},"MARIACELIAZURITACRUZ":{"cliente":"MARIA CELIA ZURITA CRUZ","contrato":"969601637204","vidas":"01","vitalicio":"Sim","parcelaBase":"8","inicioVigencia":"2025-06-18","corretor":"PROPER","empresa":"PROPER"},"MARIACHRISTINAROUXFERREIRA":{"cliente":"MARIA CHRISTINA ROUX FERREIRA","contrato":"969601651029","vidas":"01","vitalicio":"Sim","parcelaBase":"4","inicioVigencia":"2025-10-14","corretor":"PROPER","empresa":"PROPER"},"MARIAEUGENIAFERREIRADECARVALHO":{"cliente":"MARIA EUGENIA FERREIRA DE CARVALHO","contrato":"969601532875","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-06-05","corretor":"ASSESSORIA","empresa":"PROPER"},"MARIAHELENAFONSECAMEINICKE":{"cliente":"MARIA HELENA FONSECA MEINICKE","contrato":"969601552677","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-16","corretor":"ASSESSORIA","empresa":"PROPER"},"MARIAIRISDEMATTOSSERAFIM":{"cliente":"MARIA IRIS DE MATTOS SERAFIM","contrato":"969601637072","vidas":"01","vitalicio":"Sim","parcelaBase":"8","inicioVigencia":"2025-06-10","corretor":"PROPER","empresa":"PROPER"},"MARIAJOSEDECAMPOS":{"cliente":"MARIA JOSE DE CAMPOS","contrato":"969601578819","vidas":"1","vitalicio":"Sim","parcelaBase":"15","inicioVigencia":"2024-11-06","corretor":"PROPER","empresa":"PROPER"},"MARIALAURACASSABIANQUEIROZ":{"cliente":"MARIA LAURA CASSABIAN QUEIROZ","contrato":"2770073000","vidas":"","vitalicio":"Não","parcelaBase":"","inicioVigencia":"2026-04-15","corretor":"ASSESSORIA","empresa":"PROPER"},"MARIAREGINADAFRAGAROSA":{"cliente":"MARIA REGINA DA FRAGA ROSA","contrato":"969601538508","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-07-01","corretor":"ASSESSORIA","empresa":"PROPER"},"MARILIAFAGUNDESCRUZ":{"cliente":"MARILIA FAGUNDES CRUZ","contrato":"969601642690","vidas":"01","vitalicio":"Sim","parcelaBase":"6","inicioVigencia":"2025-07-08","corretor":"PROPER","empresa":"PROPER"},"MARINABARRACLUBEAMIL":{"cliente":"MARINA BARRA CLUBE AMIL","contrato":"2231780000","vidas":"349","vitalicio":"Sim","parcelaBase":"15","inicioVigencia":"2024-11-01","corretor":"PROPER","empresa":"PROPER"},"MARINHORIOREPRESENTACOESLTDA":{"cliente":"MARINHO RIO REPRESENTACOES LTDA","contrato":"39178111","vidas":"4","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-06-12","corretor":"PROPER","empresa":"PROPER"},"MARIOGOMESANDRADE08779143466":{"cliente":"MARIO GOMES ANDRADE 08779143466","contrato":"969601543825","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-02-23","corretor":"JEFFERSON","empresa":"PROPER"},"MARISSOLDOSSANTOS86786059791":{"cliente":"MARISSOL DOS SANTOS 86786059791","contrato":"47633451","vidas":"3","vitalicio":"Sim","parcelaBase":"16","inicioVigencia":"2024-10-24","corretor":"PROPER","empresa":"PROPER"},"MARLETEMARINHODESA":{"cliente":"MARLETE MARINHO DE SA","contrato":"969601536578","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-06-26","corretor":"ASSESSORIA","empresa":"PROPER"},"MARTAENRIQUEDASILVA":{"cliente":"MARTA ENRIQUE DA SILVA","contrato":"969601538150","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-06-29","corretor":"ASSESSORIA","empresa":"PROPER"},"MARYLENAGALHARDOBASSINI":{"cliente":"MARYLENA GALHARDO BASSINI","contrato":"969601547759","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-07-30","corretor":"PROPER","empresa":"PROPER"},"MAURICELIAMARINHODASILVA":{"cliente":"MAURICELIA MARINHO DA SILVA","contrato":"9696901587837","vidas":"1","vitalicio":"Sim","parcelaBase":"14","inicioVigencia":"2024-12-07","corretor":"PROPER","empresa":"PROPER"},"MEDICALSERVICOSMEDICOSLTDA":{"cliente":"MEDICAL SERVICOS MEDICOS LTDA","contrato":"2699365000","vidas":"2","vitalicio":"Não","parcelaBase":"","inicioVigencia":"2026-02-04","corretor":"ASSESSORIA","empresa":"PROPER"},"MONICASCAPINCAMPOSMOREIRA":{"cliente":"MONICA SCAPIN CAMPOS MOREIRA","contrato":"969601675508","vidas":"1","vitalicio":"Não","parcelaBase":"3","inicioVigencia":"2025-11-11","corretor":"ASSESSORIA","empresa":"PROPER"},"MONTECHCONSTRUCOESEMONTAGENSLTDA":{"cliente":"MONTECH CONSTRUCOES E MONTAGENS LTDA.","contrato":"55296791","vidas":"3","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-05-13","corretor":"PROPER","empresa":"PROPER"},"NTCOMERCIODEALIMENTOSLTDA":{"cliente":"N T COMERCIO DE ALIMENTOS LTDA","contrato":"2773343000","vidas":"5","vitalicio":"Não","parcelaBase":"1","inicioVigencia":"2026-04-17","corretor":"ASSESSORIA","empresa":"PROPER"},"NADJALOPESCARDOSO":{"cliente":"NADJA LOPES CARDOSO","contrato":"2508858000","vidas":"02","vitalicio":"Sim","parcelaBase":"7","inicioVigencia":"2025-07-10","corretor":"PROPER","empresa":"PROPER"},"NADJALOPESCARDOSO73608190759":{"cliente":"NADJA LOPES CARDOSO 73608190759","contrato":"518225","vidas":"3","vitalicio":"Sim","parcelaBase":"8","inicioVigencia":"","corretor":"PROPER","empresa":"PROPER"},"NAIRATAIDEDEMOURAAMARAL":{"cliente":"NAIR ATAIDE DE MOURA AMARAL","contrato":"969601663732","vidas":"1","vitalicio":"Sim","parcelaBase":"4","inicioVigencia":"2025-10-08","corretor":"PROPER","empresa":"PROPER"},"NEIDEMOREIRADACOSTAABREU":{"cliente":"NEIDE MOREIRA DA COSTA ABREU","contrato":"969601616440","vidas":"1","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-04-03","corretor":"PROPER","empresa":"PROPER"},"NEWTONBARROSOFERNANDESJUNIOR07302214743":{"cliente":"NEWTON BARROSO FERNANDES JUNIOR 07302214743","contrato":"515306","vidas":"","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-05-07","corretor":"PROPER","empresa":"PROPER"},"NILTONXAVIERPONTESFILHO":{"cliente":"NILTON XAVIER PONTES FILHO","contrato":"969601656128","vidas":"01","vitalicio":"Sim","parcelaBase":"5","inicioVigencia":"2025-09-08","corretor":"PROPER","empresa":"PROPER"},"NILZAMARTINSCIBREIROS":{"cliente":"NILZA MARTINS CIBREIROS","contrato":"969601689883","vidas":"","vitalicio":"Não","parcelaBase":"01","inicioVigencia":"2026-01-13","corretor":"PROPER","empresa":"PROPER"},"NOGMIXSULAMERICA":{"cliente":"NOGMIX - SULAMERICA","contrato":"61791321","vidas":"1","vitalicio":"Sim","parcelaBase":"6","inicioVigencia":"2025-08-28","corretor":"PROPER","empresa":"PROPER"},"NORMELIARIBEIRO":{"cliente":"NORMELIA RIBEIRO","contrato":"969601542155","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-07-16","corretor":"ASSESSORIA","empresa":"PROPER"},"NOSSAEMPREENDIMENTOSEREFORMA":{"cliente":"NOSSA EMPREENDIMENTOS E REFORMA","contrato":"2528752000","vidas":"02","vitalicio":"Sim","parcelaBase":"6","inicioVigencia":"2025-08-04","corretor":"PROPER","empresa":"PROPER"},"ODILONDEOLIVEIRANUNES":{"cliente":"ODILON DE OLIVEIRA NUNES","contrato":"9696016433717","vidas":"01","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-07-14","corretor":"PROPER","empresa":"PROPER"},"ONDINAELAINEDESOUSAFERRO":{"cliente":"ONDINA ELAINE DE SOUSA FERRO","contrato":"969601696020","vidas":"01","vitalicio":"Não","parcelaBase":"01","inicioVigencia":"2026-02-05","corretor":"PROPER","empresa":"PROPER"},"ONEBOXESTUDIOCRIATIVOLTDA":{"cliente":"ONEBOX ESTUDIO CRIATIVO LTDA","contrato":"58195731","vidas":"04","vitalicio":"Sim","parcelaBase":"8","inicioVigencia":"2025-06-17","corretor":"PROPER","empresa":"PROPER"},"OTICACATETELTDA":{"cliente":"OTICA CATETE LTDA","contrato":"2184700000","vidas":"3","vitalicio":"Sim","parcelaBase":"16","inicioVigencia":"2024-08-08","corretor":"PROPER","empresa":"PROPER"},"PANIFICADORAPECPAOLTDA":{"cliente":"PANIFICADORA PECPAO LTDA","contrato":"534844","vidas":"395","vitalicio":"Não","parcelaBase":"6","inicioVigencia":"2025-08-10","corretor":"PROPER","empresa":"PROPER"},"PAULACARVALHOROQUIM":{"cliente":"PAULA CARVALHO ROQUIM","contrato":"2593282000","vidas":"3","vitalicio":"Sim","parcelaBase":"4","inicioVigencia":"2025-10-13","corretor":"PROPER","empresa":"PROPER"},"PAULADUBOCAGEBRITODANTAS02846009708":{"cliente":"PAULA DU BOCAGE BRITO DANTAS 02846009708","contrato":"62569551","vidas":"","vitalicio":"Sim","parcelaBase":"5","inicioVigencia":"2025-09-11","corretor":"PROPER","empresa":"PROPER"},"PAULASANTOSPASSOSEIRAS14960787724":{"cliente":"PAULA SANTOS PASSOS EIRAS 14960787724","contrato":"470091","vidas":"3","vitalicio":"Sim","parcelaBase":"15","inicioVigencia":"2024-07-09","corretor":"PROPER","empresa":"PROPER"},"PAULOROBERTOFRAGOSOCOSTA":{"cliente":"PAULO ROBERTO FRAGOSO COSTA","contrato":"69198921","vidas":"","vitalicio":"","parcelaBase":"1","inicioVigencia":"2026-03-19","corretor":"PROPER","empresa":"PROPER"},"PAULOROBERTOROSSIDEOLIVEIRA":{"cliente":"PAULO ROBERTO ROSSI DE OLIVEIRA","contrato":"969602665597","vidas":"01","vitalicio":"Sim","parcelaBase":"4","inicioVigencia":"2025-10-15","corretor":"PROPER","empresa":"PROPER"},"PEDROSOARESDASILVA05914287766":{"cliente":"PEDRO SOARES DA SILVA 05914287766","contrato":"969601552357","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-16","corretor":"ASSESSORIA","empresa":"PROPER"},"PMXIMPORTACOESECOMERCIOLTDA":{"cliente":"PMX IMPORTACOES E COMERCIO LTDA","contrato":"2697891000","vidas":"","vitalicio":"","parcelaBase":"2","inicioVigencia":"2025-02-04","corretor":"ASSESSORIA","empresa":"PROPER"},"PRIVATEPROMOTORALTDA":{"cliente":"PRIVATE PROMOTORA LTDA","contrato":"72614441","vidas":"1","vitalicio":"","parcelaBase":"1","inicioVigencia":"2026-03-20","corretor":"PROPER","empresa":"PROPER"},"RAFAELLIMADAMASCENO":{"cliente":"RAFAEL LIMA DAMASCENO","contrato":"2238323000","vidas":"4","vitalicio":"Sim","parcelaBase":"16","inicioVigencia":"2024-10-31","corretor":"PROPER","empresa":"PROPER"},"REGINAMARCELODECASTRO":{"cliente":"REGINA MARCELO DE CASTRO","contrato":"2622944000","vidas":"4","vitalicio":"Não","parcelaBase":"3","inicioVigencia":"2025-11-12","corretor":"ASSESSORIA","empresa":"PROPER"},"RICARDOOTRANTONETOCLINICADENEUROCIRUGIA":{"cliente":"RICARDO OTRANTO NETO CLINICA DE NEUROCIRUGIA","contrato":"63623031","vidas":"","vitalicio":"Sim","parcelaBase":"3","inicioVigencia":"2025-09-30","corretor":"PROPER","empresa":"PROPER"},"RIOMAYORENGENHARIACONSTRUCOESESERVICOSADMINISTRATIVOSLTDA":{"cliente":"RIOMAYOR ENGENHARIA CONSTRUCOES E SERVICOS ADMINISTRATIVOS LTDA","contrato":"2177077000","vidas":"5","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-07-17","corretor":"PROPER","empresa":"PROPER"},"ROBERTOCESARDOSSANTOS":{"cliente":"ROBERTO CESAR DOS SANTOS","contrato":"969601534135","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-06-14","corretor":"ASSESSORIA","empresa":"PROPER"},"ROBERTOMARTINSCOSTASOCIEDADEINDIVIDU":{"cliente":"ROBERTO MARTINS COSTA SOCIEDADE INDIVIDU","contrato":"71452191","vidas":"","vitalicio":"","parcelaBase":"1","inicioVigencia":"","corretor":"PROPER","empresa":"PROPER"},"ROMEUHONORIOLOURES":{"cliente":"ROMEU HONORIO LOURES","contrato":"------","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"","corretor":"PROPER","empresa":"PROPER"},"RONALDOVIEGASSOCIEDADEINDIVIDUALDEADVOCACIA":{"cliente":"RONALDO VIEGAS - SOCIEDADE INDIVIDUAL DE ADVOCACIA","contrato":"2161229000","vidas":"5","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-06-03","corretor":"PROPER","empresa":"PROPER"},"ROSAFLORESNATURAISLTDA":{"cliente":"ROSA FLORES NATURAIS LTDA","contrato":"2457258000","vidas":"","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-05-20","corretor":"PROPER","empresa":"PROPER"},"ROSAMARIADELIMAPEREIRA93500394191":{"cliente":"ROSA MARIA DE LIMA PEREIRA 93500394191","contrato":"969601529795","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-05-29","corretor":"ASSESSORIA","empresa":"PROPER"},"ROSANAABREUDASILVA10767909763":{"cliente":"ROSANA ABREU DA SILVA 10767909763","contrato":"969601551423","vidas":"1","vitalicio":"Sim","parcelaBase":"17","inicioVigencia":"2024-08-13","corretor":"ASSESSORIA","empresa":"PROPER"},"RUBIADEOLIVEIRADOSSANTOS02856460100":{"cliente":"RUBIA DE OLIVEIRA DOS SANTOS 02856460100","contrato":"969601525388","vidas":"1","vitalicio":"Sim","parcelaBase":"21","inicioVigencia":"2024-05-15","corretor":"ASSESSORIA","empresa":"PROPER"},"SANDRAVERACOUTINHO":{"cliente":"SANDRA VERA COUTINHO","contrato":"969601551639","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-14","corretor":"ASSESSORIA","empresa":"PROPER"},"SCHUABBCONSULTORIAEMPRESARIALLTDA":{"cliente":"SCHUABB CONSULTORIA EMPRESARIAL LTDA","contrato":"63462961","vidas":"4","vitalicio":"Não","parcelaBase":"4","inicioVigencia":"2025-10-11","corretor":"PROPER","empresa":"PROPER"},"SELMARIBEIRODEFARIAS95431420410":{"cliente":"SELMA RIBEIRO DE FARIAS 95431420410","contrato":"969601529216","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-05-28","corretor":"ASSESSORIA","empresa":"PROPER"},"SERAFIMGOMESADVOGADOS":{"cliente":"SERAFIM GOMES - ADVOGADOS","contrato":"5924314","vidas":"08","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-06-21","corretor":"PROPER","empresa":"PROPER"},"SERGIOROGERIOLOPESVICENCIO":{"cliente":"SERGIO ROGERIO LOPES VICENCIO","contrato":"969601534885","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-06-19","corretor":"ASSESSORIA","empresa":"PROPER"},"SERVICOSPOSTAISRANCHONOVOLTDA":{"cliente":"SERVICOS POSTAIS RANCHO NOVO LTDA","contrato":"2557273000","vidas":"2","vitalicio":"Sim","parcelaBase":"5","inicioVigencia":"2025-09-04","corretor":"ASSESSORIA","empresa":"PROPER"},"SHEILACANDIDODEOLIVEIRA":{"cliente":"SHEILA CANDIDO DE OLIVEIRA","contrato":"969601539234","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-07-04","corretor":"ASSESSORIA","empresa":"PROPER"},"SILVALOPESADVOGADOS":{"cliente":"SILVA & LOPES ADVOGADOS","contrato":"54919061","vidas":"3","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-04-23","corretor":"PROPER","empresa":"PROPER"},"SILVANIRARODRIGUESSIQUEIRA":{"cliente":"SILVANIRA RODRIGUES SIQUEIRA","contrato":"969601537226","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-06-27","corretor":"ASSESSORIA","empresa":"PROPER"},"SILVIAREGINABAPTISTACHAVES":{"cliente":"SILVIA REGINA BAPTISTA CHAVES","contrato":"969601547136","vidas":"1","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-07-30","corretor":"ASSESSORIA","empresa":"PROPER"},"SMAISDISTRIBUIDORAECOMERCIOLTDA":{"cliente":"SMAIS DISTRIBUIDORA E COMERCIO LTDA","contrato":"13897201","vidas":"28","vitalicio":"Sim","parcelaBase":"","inicioVigencia":"2025-11-10","corretor":"PROPER","empresa":"PROPER"},"SOLUCIOMATICAEXPRESSINFORMATICALTDA":{"cliente":"SOLUCIOMATICA EXPRESS INFORMATICA LTDA","contrato":"470673","vidas":"08","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-08-06","corretor":"PROPER","empresa":"PROPER"},"SOLUCIONATICAINFORMATICA":{"cliente":"SOLUCIONATICA INFORMATICA","contrato":"470655","vidas":"","vitalicio":"Sim","parcelaBase":"18","inicioVigencia":"2024-07-03","corretor":"PROPER","empresa":"PROPER"},"SONIAMARIADEBARROS":{"cliente":"SONIA MARIA DE BARROS","contrato":"969601656214","vidas":"01","vitalicio":"Sim","parcelaBase":"5","inicioVigencia":"2025-09-08","corretor":"PROPER","empresa":"PROPER"},"SONIASOARESDEALMEIDA76731499668":{"cliente":"SONIA SOARES DE ALMEIDA 76731499668","contrato":"969601529650","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-05-29","corretor":"ASSESSORIA","empresa":"PROPER"},"SORAIAJORGERODRIGUESFILHA":{"cliente":"SORAIA JORGE RODRIGUES FILHA","contrato":"969601553216","vidas":"1","vitalicio":"Sim","parcelaBase":"17","inicioVigencia":"2024-08-21","corretor":"ASSESSORIA","empresa":"PROPER"},"SULAMERICACOMPANHIADESEGUROSAUDE":{"cliente":"SUL AMERICA COMPANHIA DE SEGURO SAUDE","contrato":"------","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"","corretor":"------","empresa":"PROPER"},"TANIACHRISTINAPINHOSANCHEZVICENCIO85226297734":{"cliente":"TANIA CHRISTINA PINHO SANCHEZ VICENCIO 85226297734","contrato":"969601529207","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-05-28","corretor":"ASSESSORIA","empresa":"PROPER"},"TANIATAVARESBARBOSA31386016772":{"cliente":"TANIA TAVARES BARBOSA 31386016772","contrato":"969601536130","vidas":"1","vitalicio":"Sim","parcelaBase":"19","inicioVigencia":"2024-06-26","corretor":"ASSESSORIA","empresa":"PROPER"},"TATIANELYRIOPECANHA":{"cliente":"TATIANE LYRIO PECANHA","contrato":"969601525626","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-05-16","corretor":"ASSESSORIA","empresa":"PROPER"},"TECHENGENHARIAEINSTALACOESLTDA":{"cliente":"TECH ENGENHARIA E INSTALACOES LTDA","contrato":"67751851","vidas":"","vitalicio":"","parcelaBase":"2","inicioVigencia":"2025-12-16","corretor":"PROPER","empresa":"PROPER"},"TERESADECARVALHO":{"cliente":"TERESA DE CARVALHO","contrato":"969601695242","vidas":"01","vitalicio":"Não","parcelaBase":"01","inicioVigencia":"2026-02-03","corretor":"PROPER","empresa":"PROPER"},"TEREZARISTINABINTTENCOURTLOBO":{"cliente":"TEREZA RISTINA BINTTENCOURT LOBO","contrato":"969601706616","vidas":"","vitalicio":"Não","parcelaBase":"01","inicioVigencia":"2026-03-18","corretor":"PROPER","empresa":"PROPER"},"TERRAPROMETIDASALGADOSLTDA":{"cliente":"TERRA PROMETIDA SALGADOS LTDA","contrato":"853UY 0","vidas":"03","vitalicio":"Não","parcelaBase":"02","inicioVigencia":"2025-12-20","corretor":"PROPER","empresa":"PROPER"},"TRESCUIDADOSASSESSORIAMATERNOINFANTILLTDA":{"cliente":"TRES CUIDADOS ASSESSORIA MATERNO-INFANTIL LTDA","contrato":"55090461","vidas":"4","vitalicio":"Sim","parcelaBase":"8","inicioVigencia":"2025-05-13","corretor":"PROPER","empresa":"PROPER"},"VERALUCIASANTOSCARDOSO16927770500":{"cliente":"VERA LUCIA SANTOS CARDOSO 16927770500","contrato":"969601496561","vidas":"1","vitalicio":"Sim","parcelaBase":"25","inicioVigencia":"2024-01-11","corretor":"PROPER","empresa":"PROPER"},"VERTICALSERVICOSESPECIALIZADOS":{"cliente":"VERTICAL SERVIÇOS ESPECIALIZADOS","contrato":"56685521","vidas":"11","vitalicio":"Sim","parcelaBase":"8","inicioVigencia":"2025-05-13","corretor":"PROPER","empresa":"PROPER"},"VIARADIOTECNOLOGIAEMTELECOMUNICACOESLTDA":{"cliente":"VIA RADIO TECNOLOGIA EM TELECOMUNICACOES LTDA","contrato":"467164","vidas":"04","vitalicio":"Sim","parcelaBase":"21","inicioVigencia":"2024-06-18","corretor":"PROPER","empresa":"PROPER"},"VILMASANTANNADEARAUJO":{"cliente":"VILMA SANTANNA DE ARAUJO","contrato":"969601529675","vidas":"1","vitalicio":"Sim","parcelaBase":"20","inicioVigencia":"2024-05-29","corretor":"ASSESSORIA","empresa":"PROPER"},"VITALLCENTRODEMEDICINAINTEGRATIVALTDA":{"cliente":"VITALL CENTRO DE MEDICINA INTEGRATIVA LTDA","contrato":"54461831","vidas":"03","vitalicio":"Sim","parcelaBase":"8","inicioVigencia":"2025-06-26","corretor":"PROPER","empresa":"PROPER"},"WFCONSULTORESASSOCIADOSLTDA":{"cliente":"W F CONSULTORES ASSOCIADOS LTDA","contrato":"51613361","vidas":"","vitalicio":"Sim","parcelaBase":"9","inicioVigencia":"2025-05-08","corretor":"PROPER","empresa":"PROPER"},"WANGYEHSAN":{"cliente":"WANG YEH SAN","contrato":"969601655947","vidas":"01","vitalicio":"Sim","parcelaBase":"5","inicioVigencia":"2025-09-08","corretor":"PROPER","empresa":"PROPER"}}};

const SULAMERICA_PROTETTA_VIGENCIAS = {"byContrato":{},"byCliente":{"15158036CRISTIANEMARTINSARAUJOLIMA":{"cliente":"15.158.036 CRISTIANE MARTINS ARAUJO LIMA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-12-18","corretor":"PROTETTA","empresa":"PROTETTA"},"23395382ALECSANDRODASILVADUTRA":{"cliente":"23.395.382 ALECSANDRO DA SILVA DUTRA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-05-21","corretor":"PROTETTA","empresa":"PROTETTA"},"2MMEMPREITEIRADEOBRASLTDA":{"cliente":"2MM EMPREITEIRA DE OBRAS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-04-10","corretor":"ASSESSORIA","empresa":"PROTETTA"},"53594103STEPHANIEGIFFONIGONCALVESBRANDAOPEREIRA":{"cliente":"53.594.103 STEPHANIE GIFFONI GONCALVES BRANDAO PEREIRA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-09-06","corretor":"PROTETTA","empresa":"PROTETTA"},"54452369ALESSANDRAALVESDELIMA":{"cliente":"54.452.369 ALESSANDRA ALVES DE LIMA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-04-10","corretor":"ASSESSORIA","empresa":"PROTETTA"},"54496939CARLOSALBERTOSOARESDUARTE":{"cliente":"54.496.939 CARLOS ALBERTO SOARES DUARTE","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-10-21","corretor":"ASSESSORIA","empresa":"PROTETTA"},"54758607PRISCILAMORAESRAMOS":{"cliente":"54.758.607 PRISCILA MORAES RAMOS","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-11-30","corretor":"ASSESSORIA","empresa":"PROTETTA"},"APRIMORDIALLOGISTICAEMTRANSPORTESLTDA":{"cliente":"A PRIMORDIAL - LOGISTICA EM TRANSPORTES LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2023-05-01","corretor":"PROTETTA","empresa":"PROTETTA"},"AFFSERVICOSDEASSESSORIAEREPRESENTACAOEMPRESARIALLTDA":{"cliente":"A.F.F. SERVICOS DE ASSESSORIA E REPRESENTACAO EMPRESARIAL LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-02-20","corretor":"ASSESSORIA","empresa":"PROTETTA"},"ACGDIREITOSAUTORAISLTDA":{"cliente":"ACG DIREITOS AUTORAIS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2026-01-03","corretor":"PROTETTA","empresa":"PROTETTA"},"ADVALOREMCOMERCIALLTDA":{"cliente":"AD VALOREM COMERCIAL LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-10-16","corretor":"ASSESSORIA","empresa":"PROTETTA"},"ADRSOLUCOESEMCONTABIILIDADEINFORMATICAESCAFANDRIAECOMPETICOESESPORTIVASLTDA":{"cliente":"ADR SOLUCOES EM CONTABIILIDADE, INFORMATICA, ESCAFANDRIA E COMPETICOES ESPORTIVAS LTDA.","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-01-17","corretor":"ASSESSORIA","empresa":"PROTETTA"},"AGUILARBARBOSAADVOGADOSASSOCIADOS":{"cliente":"AGUILAR & BARBOSA ADVOGADOS ASSOCIADOS","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-05-09","corretor":"PROTETTA","empresa":"PROTETTA"},"ALARMEFORTESISTEMASELETRONICOSDESEGURANCALTDA":{"cliente":"ALARMEFORTE SISTEMAS ELETRONICOS DE SEGURANCA LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-09-28","corretor":"PROTETTA","empresa":"PROTETTA"},"ALINEQUITERIAGOMESDASILVAMELO":{"cliente":"ALINE QUITERIA GOMES DA SILVA MELO","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2026-01-20","corretor":"PROTETTA","empresa":"PROTETTA"},"ALTOENUNESDESIGNLTDA":{"cliente":"ALTOE & NUNES DESIGN LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-11-22","corretor":"ASSESSORIA","empresa":"PROTETTA"},"ANDRELUISGONCALVESDINIZ07673721740":{"cliente":"ANDRE LUIS GONCALVES DINIZ 07673721740","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-01-05","corretor":"PROTETTA","empresa":"PROTETTA"},"ANOILDOMATTOSJUNIOR":{"cliente":"ANOILDO MATTOS JUNIOR","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-06-07","corretor":"PROTETTA","empresa":"PROTETTA"},"ARMANDOGUIMARAESDEALMEIDANETOSULAMERICA":{"cliente":"ARMANDO GUIMARAES DE ALMEIDA NETO - SULAMERICA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-06-03","corretor":"PROTETTA","empresa":"PROTETTA"},"ARTNICXCORRETORADESEGUROSX1LTDA":{"cliente":"ARTNICX CORRETORA DE SEGUROS X1 LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2022-06-13","corretor":"PROTETTA","empresa":"PROTETTA"},"AUTOTRANILHADOGOVERNADORLTDA":{"cliente":"AUTOTRAN ILHA DO GOVERNADOR LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-04-03","corretor":"ASSESSORIA","empresa":"PROTETTA"},"AXEMENGENHARIAEARQUITETURALTDA":{"cliente":"AXEM ENGENHARIA E ARQUITETURA LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-04-10","corretor":"ASSESSORIA","empresa":"PROTETTA"},"BARBARAHOHLDESOUZALTDA":{"cliente":"BARBARA HOHL DE SOUZA LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-04-10","corretor":"ASSESSORIA","empresa":"PROTETTA"},"BAUTECSERVICOSLTDA":{"cliente":"BAUTEC SERVICOS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-06-06","corretor":"PROTETTA","empresa":"PROTETTA"},"BAZAREPAPELARIAMATTOSLTDA":{"cliente":"BAZAR E PAPELARIA MATTOS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-06-06","corretor":"ASSESSORIA","empresa":"PROTETTA"},"BERTIINTERMEDIACAOCOMERCIALEMARTELTDA":{"cliente":"BERTI INTERMEDIACAO COMERCIAL EM ARTE LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-09-30","corretor":"ASSESSORIA","empresa":"PROTETTA"},"BETALTDA":{"cliente":"BETA LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2026-01-03","corretor":"ASSESSORIA","empresa":"PROTETTA"},"BICARCONSULTORESEADMINISTRADORESLTDA":{"cliente":"BICAR CONSULTORES E ADMINISTRADORES LTDA.","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-07-09","corretor":"PROTETTA","empresa":"PROTETTA"},"BLUELOGISTICAINTEGRADASA":{"cliente":"BLUE LOGISTICA INTEGRADA S.A.","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2021-08-20","corretor":"PROTETTA","empresa":"PROTETTA"},"BRAGAEGODINHOCOMERCIOVAREJISTADEGLPLTDA":{"cliente":"BRAGA E GODINHO COMERCIO VAREJISTA DE GLP LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-11-05","corretor":"PROTETTA","empresa":"PROTETTA"},"BRAZFABRICACAODEESTRUTURASMETALICASLTDA":{"cliente":"BRAZ FABRICACAO DE ESTRUTURAS METALICAS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-09-11","corretor":"ASSESSORIA","empresa":"PROTETTA"},"BRITOLIMAADVOGADOSASSOCIADOS":{"cliente":"BRITO & LIMA ADVOGADOS ASSOCIADOS","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-10-01","corretor":"ASSESSORIA","empresa":"PROTETTA"},"BRUNETTAENTRETENIMENTOSLTDA":{"cliente":"BRUNETTA ENTRETENIMENTOS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2022-05-03","corretor":"PROTETTA","empresa":"PROTETTA"},"BRUNNOGALVAOPARTICIPACOESLTDA":{"cliente":"BRUNNO GALVAO PARTICIPACOES LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-03-06","corretor":"ASSESSORIA","empresa":"PROTETTA"},"BRUNNORANGELDESIQUEIRA":{"cliente":"BRUNNO RANGEL DE SIQUEIRA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-08-24","corretor":"ASSESSORIA","empresa":"PROTETTA"},"BRUNODESOUZAVIALSERVICOSMEDIICOS":{"cliente":"BRUNO DE SOUZA VIAL SERVICOS MEDIICOS","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-11-25","corretor":"PROPER","empresa":"PROTETTA"},"CAFEEBARPINTOLTDA":{"cliente":"CAFE E BAR PINTO LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2021-07-07","corretor":"PROTETTA","empresa":"PROTETTA"},"CAIXADEASSISTDOMINISTERIOPUBLICO":{"cliente":"CAIXA DE ASSIST DO MINISTERIO PUBLICO","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-12-20","corretor":"PROPER","empresa":"PROTETTA"},"CANTINAERESTAURANTETRAPANILTDA":{"cliente":"CANTINA E RESTAURANTE TRAPANI LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-05-16","corretor":"PROTETTA","empresa":"PROTETTA"},"CARLARAINHOBORGESBARBOSA":{"cliente":"CARLA RAINHO BORGES BARBOSA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2026-01-07","corretor":"ASSESSORIA","empresa":"PROTETTA"},"CARVALHOSCORRETORADESEGUROSLTDA":{"cliente":"CARVALHOS CORRETORA DE SEGUROS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-05-03","corretor":"ASSESSORIA","empresa":"PROTETTA"},"CASAATUALMOVEISEDECORACOESLTDA":{"cliente":"CASA ATUAL MOVEIS E DECORACOES LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-05-08","corretor":"ASSESSORIA","empresa":"PROTETTA"},"CESARDOSSANTOSBARROS":{"cliente":"CESAR DOS SANTOS BARROS","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-04-10","corretor":"ASSESSORIA","empresa":"PROTETTA"},"CFFITNESSLTDA":{"cliente":"CF - FITNESS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2021-02-12","corretor":"PROTETTA","empresa":"PROTETTA"},"CINTIAAPARECIDADONASCIMENT":{"cliente":"CINTIA APARECIDA DO NASCIMENT","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2026-03-11","corretor":"ASSESSORIA","empresa":"PROTETTA"},"CIRCULOBRASILEIRODEPATOLOGIALTDA":{"cliente":"CIRCULO BRASILEIRO DE PATOLOGIA LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2026-01-13","corretor":"PROTETTA","empresa":"PROTETTA"},"CLINICADERMATOLOGICAREHFELDTLTDA":{"cliente":"CLINICA DERMATOLOGICA REHFELDT LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-09-25","corretor":"ASSESSORIA","empresa":"PROTETTA"},"CLRZSERVICOSMEDICOSLTDA":{"cliente":"CLRZ SERVICOS MEDICOS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2020-01-17","corretor":"PROTETTA","empresa":"PROTETTA"},"COMEMORARBUFFETLTDA":{"cliente":"COMEMORAR BUFFET LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-07-01","corretor":"ASSESSORIA","empresa":"PROTETTA"},"COMERCIALINVOICERCOMERCIOEIMPORTACAOLTDA":{"cliente":"COMERCIAL INVOICER COMERCIO E IMPORTACAO LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-08-28","corretor":"PROTETTA","empresa":"PROTETTA"},"CONDOMINIODOEDIFICIOBARRALIFEMEDICALCENTER":{"cliente":"CONDOMINIO DO EDIFICIO BARRALIFE MEDICAL CENTER","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-09-01","corretor":"PROTETTA","empresa":"PROTETTA"},"CONDOMINIODOEDIFICIOIPANEMAVILLERESIDENCESERVICE":{"cliente":"CONDOMINIO DO EDIFICIO IPANEMA VILLE RESIDENCE SERVICE","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-02-04","corretor":"ASSESSORIA","empresa":"PROTETTA"},"CONSEVICORRETORADESEGUROSLTDA":{"cliente":"CONSEVI CORRETORA DE SEGUROS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-06-20","corretor":"ASSESSORIA","empresa":"PROTETTA"},"CORVITALELTDA":{"cliente":"COR VITALE LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-12-16","corretor":"ASSESSORIA","empresa":"PROTETTA"},"CRISTINASARAIVASANCHES":{"cliente":"CRISTINA SARAIVA SANCHES","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-05-10","corretor":"PROTETTA","empresa":"PROTETTA"},"DEFREITASCONSULTORIAEMSAUDELTDA":{"cliente":"DE FREITAS CONSULTORIA EM SAUDE LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-12-20","corretor":"PROTETTA","empresa":"PROTETTA"},"DEGENTILCOMERCIODEALIMENTOSLTDA":{"cliente":"DEGENTIL - COMERCIO DE ALIMENTOS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-12-17","corretor":"ASSESSORIA","empresa":"PROTETTA"},"DERRONCONSTRUCOESESERVICOSLTDA":{"cliente":"DERRON CONSTRUCOES E SERVICOS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-12-03","corretor":"ASSESSORIA","empresa":"PROTETTA"},"DEXINVESTCOMERCIOEVAREJOLTDA":{"cliente":"DEX INVEST COMERCIO E VAREJO LTDA (SULAMERICA)","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-03-27","corretor":"PROTETTA","empresa":"PROTETTA"},"DIMAGEMDIAGNOSTICOPORIMAGEMLTDA":{"cliente":"DIMAGEM DIAGNOSTICO POR IMAGEM LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-11-12","corretor":"ASSESSORIA","empresa":"PROTETTA"},"DOISMAISCONSULTORIASERVICOSETREINAMENTOSLTDA":{"cliente":"DOIS MAIS CONSULTORIA, SERVICOS E TREINAMENTOS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-03-28","corretor":"ASSESSORIA","empresa":"PROTETTA"},"DRACARLANASSERPATROCINIORAMOSLTDA":{"cliente":"DRA CARLA NASSER PATROCINIO RAMOS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-03-18","corretor":"ASSESSORIA","empresa":"PROTETTA"},"DURIOBRASILCONFECCAOECOMERCIODEROUPASEACESSORIOSDOVESTUARIOLTDA":{"cliente":"DU RIO BRASIL CONFECCAO E COMERCIO DE ROUPAS E ACESSORIOS DO VESTUARIO LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2022-09-15","corretor":"PROTETTA","empresa":"PROTETTA"},"DUARTELOUREIROSOCIEDADEDEADVOGADOS":{"cliente":"DUARTE LOUREIRO SOCIEDADE DE ADVOGADOS","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-05-08","corretor":"ASSESSORIA","empresa":"PROTETTA"},"DUOVACENGENHARIA":{"cliente":"DUOVAC ENGENHARIA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2026-01-07","corretor":"ASSESSORIA","empresa":"PROTETTA"},"E2T2EQUIPAMENTOSINDUSTRIAISLTDA":{"cliente":"E2T2 EQUIPAMENTOS INDUSTRIAIS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-04-02","corretor":"ASSESSORIA","empresa":"PROTETTA"},"EDIMARFAUSTINODEMEDEIROS":{"cliente":"EDIMAR FAUSTINO DE MEDEIROS","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-04-10","corretor":"ASSESSORIA","empresa":"PROTETTA"},"EDSONDEFRANCASANTOS10143248740":{"cliente":"EDSON DE FRANCA SANTOS 10143248740","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-01-09","corretor":"ASSESSORIA","empresa":"PROTETTA"},"EDSONSIQUEIRANUNESCONTABIL":{"cliente":"EDSON SIQUEIRA NUNES CONTABIL","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-09-06","corretor":"PROTETTA","empresa":"PROTETTA"},"ELAINEDOSNASCIMENTO":{"cliente":"ELAINE DOS NASCIMENTO","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2026-02-25","corretor":"ASSESSORIA","empresa":"PROTETTA"},"ELEVARECAPITALHUMANOLTDA":{"cliente":"ELEVARE CAPITAL HUMANO LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-04-23","corretor":"ASSESSORIA","empresa":"PROTETTA"},"EPICENTRORIODEJANEIROLTDA":{"cliente":"EPICENTRO - RIO DE JANEIRO LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-04-05","corretor":"ASSESSORIA","empresa":"PROTETTA"},"ERICKMENDESRAMOS05934049712":{"cliente":"ERICK MENDES RAMOS 05934049712","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-10-10","corretor":"ASSESSORIA","empresa":"PROTETTA"},"ESBASTOSSERVICOSDEENGENHARIA":{"cliente":"ES BASTOS SERVICOS DE ENGENHARIA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-04-10","corretor":"ASSESSORIA","empresa":"PROTETTA"},"FMMERCADINHODODOURADOLTDA":{"cliente":"F M MERCADINHO DO DOURADO LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-11-17","corretor":"ASSESSORIA","empresa":"PROTETTA"},"FPVEIGAENGENHARIALTDA":{"cliente":"F P VEIGA ENGENHARIA LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-08-09","corretor":"PROTETTA","empresa":"PROTETTA"},"FCSERVMEDICOS":{"cliente":"F&C SERV MEDICOS","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-12-20","corretor":"PROTETTA","empresa":"PROTETTA"},"FAAINSTITUTODEIDIOMASLTDA":{"cliente":"FAA INSTITUTO DE IDIOMAS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-03-28","corretor":"ASSESSORIA","empresa":"PROTETTA"},"FARRULLASOLUCOESEMARQUITETURAELOGISTICALTDA":{"cliente":"FARRULLA SOLUCOES EM ARQUITETURA E LOGISTICA LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2026-05-09","corretor":"ASSESSORIA","empresa":"PROTETTA"},"FJLCONSULTORIALTDA":{"cliente":"FJL CONSULTORIA LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-03-28","corretor":"ASSESSORIA","empresa":"PROTETTA"},"FLARILEIMOVEISEADMINISTRADORALTDA":{"cliente":"FLARILE IMOVEIS E ADMINISTRADORA LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-05-13","corretor":"PROTETTA","empresa":"PROTETTA"},"FLXPUBLICIDADELTDA":{"cliente":"FLX PUBLICIDADE LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-10-08","corretor":"PROTETTA","empresa":"PROTETTA"},"FONSECAEBRAIDAORTOPEDIALTDA":{"cliente":"FONSECA E BRAIDA ORTOPEDIA LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-05-13","corretor":"ASSESSORIA","empresa":"PROTETTA"},"FONSECAENGENHARIALTDA":{"cliente":"FONSECA ENGENHARIA LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-09-10","corretor":"ASSESSORIA","empresa":"PROTETTA"},"FRANCISCOTOMASPAZGUISCAFRE79267769715":{"cliente":"FRANCISCO TOMAS PAZ GUISCAFRE 79267769715","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-07-05","corretor":"PROTETTA","empresa":"PROTETTA"},"FRUTICULAARIBEIROLTDA":{"cliente":"FRUTICULA A.RIBEIRO LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-10-02","corretor":"ASSESSORIA","empresa":"PROTETTA"},"FTFCLEANCOMERCIODEPRODUTOSDELIMPEZALTDA":{"cliente":"FTF CLEAN COMERCIO DE PRODUTOS DE LIMPEZA LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-10-22","corretor":"ASSESSORIA","empresa":"PROTETTA"},"GAIAHOSTELALOJAMENTOSTURISTICOSLTDA":{"cliente":"GAIA HOSTEL ALOJAMENTOS TURISTICOS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2021-12-31","corretor":"PROTETTA","empresa":"PROTETTA"},"GAMANEMPREENDIMENTOSLTDA":{"cliente":"GAMAN EMPREENDIMENTOS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-04-02","corretor":"ASSESSORIA","empresa":"PROTETTA"},"GBWRIOCOMERCIODEARTIGOSDOVESTUARIOLTDA":{"cliente":"GBW RIO COMERCIO DE ARTIGOS DO VESTUARIO LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-07-10","corretor":"ASSESSORIA","empresa":"PROTETTA"},"GLOBALCARDIOSERVICOSMEDICOS":{"cliente":"GLOBAL CARDIO SERVICOS MEDICOS","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2018-11-10","corretor":"ASSESSORIA","empresa":"PROTETTA"},"GRUPOSOLUCIOMATICAINFORMATICALTDA":{"cliente":"GRUPO SOLUCIOMATICA INFORMATICA LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-07-03","corretor":"ASSESSORIA","empresa":"PROTETTA"},"GSGESTAOESERVICOSEMSAUDELTDA":{"cliente":"GS GESTAO E SERVICOS EM SAUDE LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2026-01-12","corretor":"PROTETTA","empresa":"PROTETTA"},"GUSTAVOALMEIDASOCIEDADEDEADVOGADOS":{"cliente":"GUSTAVO ALMEIDA SOCIEDADE DE ADVOGADOS","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2020-01-15","corretor":"PROTETTA","empresa":"PROTETTA"},"GVASCONCELOSASSESSORIALTDA":{"cliente":"GVASCONCELOS ASSESSORIA LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-05-13","corretor":"ASSESSORIA","empresa":"PROTETTA"},"HIATOCOMUNICACAOEPARTICIPACOESLTDA":{"cliente":"HIATO COMUNICACAO E PARTICIPACOES LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-11-27","corretor":"ASSESSORIA","empresa":"PROTETTA"},"HOTELREPRESENTATIONBRAZILLTDA":{"cliente":"HOTEL REPRESENTATION BRAZIL LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-04-18","corretor":"PROTETTA","empresa":"PROTETTA"},"IASMINTEIXEIRASCALAMBRINI15104464784":{"cliente":"IASMIN TEIXEIRA SCALAMBRINI 15104464784","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-09-07","corretor":"PROTETTA","empresa":"PROTETTA"},"INDUSTRIADEBEBIDASREFLEXALTDA":{"cliente":"INDUSTRIA DE BEBIDAS REFLEXA LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-11-10","corretor":"ASSESSORIA","empresa":"PROTETTA"},"INOBILETELECOMUNICACOESLTDA":{"cliente":"INOBILE TELECOMUNICACOES LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-04-10","corretor":"PROTETTA","empresa":"PROTETTA"},"INSTITUTOINLAZOATENDIMENTOEMSAUDEMENTALEEDUCACAOLTDA":{"cliente":"INSTITUTO INLAZO - ATENDIMENTO EM SAUDE MENTAL E EDUCACAO LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-04-11","corretor":"ASSESSORIA","empresa":"PROTETTA"},"INSTITUTOVIGNELTDA":{"cliente":"INSTITUTO VIGNE LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-11-06","corretor":"ASSESSORIA","empresa":"PROTETTA"},"INTERAGENTEINFORMATICALTDA":{"cliente":"INTERAGENTE INFORMATICA LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-07-03","corretor":"ASSESSORIA","empresa":"PROTETTA"},"IZABELMARIABARBOSAMELLOTRIGUEIRODASILVA01477193723":{"cliente":"IZABEL MARIA BARBOSA MELLO TRIGUEIRO DA SILVA 01477193723","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2021-12-24","corretor":"PROTETTA","empresa":"PROTETTA"},"JHINSTITUTODEDEPILACAOLTDA":{"cliente":"J H INSTITUTO DE DEPILACAO LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-02-05","corretor":"ASSESSORIA","empresa":"PROTETTA"},"JBBCALANCHESLTDA":{"cliente":"JBBCA LANCHES LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-06-06","corretor":"PROTETTA","empresa":"PROTETTA"},"JCFPROPAGANDACONSULTORIAEMARKETINGLTDA":{"cliente":"JCF PROPAGANDA CONSULTORIA E MARKETING LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-10-19","corretor":"ASSESSORIA","empresa":"PROTETTA"},"JESSICADEABREUMENDESDEDEUS15893061713":{"cliente":"JESSICA DE ABREU MENDES DE DEUS 15893061713","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2021-01-20","corretor":"PROTETTA","empresa":"PROTETTA"},"JOELMASAROTOBAIRROS00987718762":{"cliente":"JOELMA SAROTO BAIRROS 00987718762","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-09-02","corretor":"PROTETTA","empresa":"PROTETTA"},"JORGEACLOMBARDINETOSERVICOSODONTOLOGICOSLTDA":{"cliente":"JORGE A C LOMBARDI NETO SERVICOS ODONTOLOGICOS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-08-15","corretor":"ASSESSORIA","empresa":"PROTETTA"},"JOSEAUGUSTOHOHENFELDDEOLIVEIRA00498090752":{"cliente":"JOSE AUGUSTO HOHENFELD DE OLIVEIRA 00498090752","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2022-12-14","corretor":"PROTETTA","empresa":"PROTETTA"},"JPMEDICAOPROJETOSGRAFICOSEFOTOGRAFIALTDA":{"cliente":"JPM EDICAO, PROJETOS GRAFICOS E FOTOGRAFIA LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-01-31","corretor":"ASSESSORIA","empresa":"PROTETTA"},"LEAMENDONCAPRODUCOESARTISTICASLTDA":{"cliente":"LEA MENDONCA - PRODUCOES ARTISTICAS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-11-06","corretor":"ASSESSORIA","empresa":"PROTETTA"},"LEONARDOMENDONCASOCIEDADEINDIVIDUAL":{"cliente":"LEONARDO MENDONCA SOCIEDADE INDIVIDUAL","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2026-02-26","corretor":"PROTETTA","empresa":"PROTETTA"},"LICKSCONTADORESASSOCIADOSSIMPLESLTDA":{"cliente":"LICKS CONTADORES ASSOCIADOS SIMPLES LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-11-10","corretor":"ASSESSORIA","empresa":"PROTETTA"},"LICKSSOCIEDADEDEADVOGADOS":{"cliente":"LICKS SOCIEDADE DE ADVOGADOS","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-11-10","corretor":"ASSESSORIA","empresa":"PROTETTA"},"LOJADECONVENIENCIAPENEIRASLTDA":{"cliente":"LOJA DE CONVENIENCIA PENEIRAS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-07-11","corretor":"ASSESSORIA","empresa":"PROTETTA"},"LONGEVIDADESERVICOSMEDICOSLTDA":{"cliente":"LONGEVIDADE SERVICOS MEDICOS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2022-01-19","corretor":"PROTETTA","empresa":"PROTETTA"},"LOPESEFIUZACOMERCIOESERVICOSLTDA":{"cliente":"LOPES E FIUZA COMERCIO E SERVICOS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-09-17","corretor":"ASSESSORIA","empresa":"PROTETTA"},"LR2ENGENHARIAESERVICOSLTDA":{"cliente":"LR2 ENGENHARIA E SERVICOS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-11-11","corretor":"ASSESSORIA","empresa":"PROTETTA"},"LUANASILVAASSIS11523884797":{"cliente":"LUANA SILVA ASSIS 11523884797","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-12-10","corretor":"ASSESSORIA","empresa":"PROTETTA"},"LUIZFELLIPPESERRODOSSANTOS":{"cliente":"LUIZ FELLIPPE SERRO DOS SANTOS","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-11-19","corretor":"PROTETTA","empresa":"PROTETTA"},"MACHADOBARLTDA":{"cliente":"MACHADO BAR LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-12-18","corretor":"ASSESSORIA","empresa":"PROTETTA"},"MARAMACPROJETOSPAISAGISMOEURBANIZACAOLTDA":{"cliente":"MARA MAC PROJETOS, PAISAGISMO E URBANIZACAO LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-11-08","corretor":"ASSESSORIA","empresa":"PROTETTA"},"MARCOVINICIOGOESBARRETO":{"cliente":"MARCO VINICIO GOES BARRETO","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2026-02-26","corretor":"ASSESSORIA","empresa":"PROTETTA"},"MARINHORIOREPRESENTACOESLTDA":{"cliente":"MARINHO RIO REPRESENTACOES LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-11-10","corretor":"PROTETTA","empresa":"PROTETTA"},"MARISSOLDOSSANTOS86786059791":{"cliente":"MARISSOL DOS SANTOS 86786059791","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-10-24","corretor":"PROTETTA","empresa":"PROTETTA"},"MATTOSEHERNANDEZCONSULTORIAIMOBILIARIALTDA":{"cliente":"MATTOS E HERNANDEZ CONSULTORIA IMOBILIARIA LTDA.","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-09-06","corretor":"ASSESSORIA","empresa":"PROTETTA"},"MBEDICAOEREVISAODETEXTOSLTDA":{"cliente":"MB EDICAO E REVISAO DE TEXTOS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-07-12","corretor":"ASSESSORIA","empresa":"PROTETTA"},"MGCSERVICOSLTDA":{"cliente":"MGC SERVICOS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-04-10","corretor":"ASSESSORIA","empresa":"PROTETTA"},"MISTERPASTELLTDA":{"cliente":"MISTER PASTEL LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-01-07","corretor":"ASSESSORIA","empresa":"PROTETTA"},"MLA88COMERCIODEPECASEACESSORIOSLTDA":{"cliente":"MLA 88 COMERCIO DE PECAS E ACESSORIOS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-12-28","corretor":"ASSESSORIA","empresa":"PROTETTA"},"MMWORLDCORRETORADESEGUROSLTDA":{"cliente":"MMWORLD CORRETORA DE SEGUROS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-12-19","corretor":"ASSESSORIA","empresa":"PROTETTA"},"MONTECHCONSTRUCOESEMONTAGENSLTDA":{"cliente":"MONTECH CONSTRUCOES E MONTAGENS LTDA.","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-02-11","corretor":"PROTETTA","empresa":"PROTETTA"},"NDACOSTASERVICOSECOMERCIODEEQUIPAMENTOSEACESSORIOS":{"cliente":"N. DA COSTA SERVICOS E COMERCIO DE EQUIPAMENTOS E ACESSORIOS","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-05-21","corretor":"ASSESSORIA","empresa":"PROTETTA"},"NADJALOPESCARDOSO73608190759":{"cliente":"NADJA LOPES CARDOSO 73608190759","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-06-11","corretor":"PROTETTA","empresa":"PROTETTA"},"NATHALIACRISTINANAZARETTODESOUZA14815934711":{"cliente":"NATHALIA CRISTINA NAZARETTO DE SOUZA 14815934711","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-04-10","corretor":"ASSESSORIA","empresa":"PROTETTA"},"NATHALIAMENDESRAMALHO":{"cliente":"NATHALIA MENDES RAMALHO","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-12-17","corretor":"ASSESSORIA","empresa":"PROTETTA"},"NEWLOOKBSSLTDA":{"cliente":"NEW LOOK BSS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-11-07","corretor":"ASSESSORIA","empresa":"PROTETTA"},"NEWTONBARROSOFERNANDESJUNIOR07302214743":{"cliente":"NEWTON BARROSO FERNANDES JUNIOR 07302214743","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-05-07","corretor":"PROTETTA","empresa":"PROTETTA"},"NITENCONSULTORIALTDA":{"cliente":"NITEN CONSULTORIA LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-06-18","corretor":"ASSESSORIA","empresa":"PROTETTA"},"NOTAPUMECONSTRUCOESEREFORMASLTDA":{"cliente":"NO TAPUME CONSTRUCOES E REFORMAS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-11-27","corretor":"ASSESSORIA","empresa":"PROTETTA"},"NOGMIXSULAMERICA":{"cliente":"NOGMIX - SULAMERICA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-08-28","corretor":"PROTETTA","empresa":"PROTETTA"},"ONEBOXESTUDIOCRIATIVOLTDA":{"cliente":"ONEBOX ESTUDIO CRIATIVO LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-06-17","corretor":"PROTETTA","empresa":"PROTETTA"},"ONIXCOMERCIOATACADISTALTDA":{"cliente":"ONIX COMERCIO ATACADISTA LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-07-12","corretor":"ASSESSORIA","empresa":"PROTETTA"},"OPENMIXCRIACAOPROMOCAOEEVENTOSLIMITADA":{"cliente":"OPEN MIX CRIACAO PROMOCAO E EVENTOS LIMITADA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2026-01-15","corretor":"ASSESSORIA","empresa":"PROTETTA"},"ORBITALDISTRIBUICAOEIMPORTACAODEMED":{"cliente":"ORBITAL DISTRIBUICAO E IMPORTACAO DE MED","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2026-01-03","corretor":"ASSESSORIA","empresa":"PROTETTA"},"OXBEXASERVICOSTECNICOSDESEGUROSLTDA":{"cliente":"OXBEXA SERVICOS TECNICOS DE SEGUROS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-02-27","corretor":"ASSESSORIA","empresa":"PROTETTA"},"PALOMASPATAPEREZMANEIRO":{"cliente":"PALOMA SPATA PEREZ MANEIRO","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-11-10","corretor":"ASSESSORIA","empresa":"PROTETTA"},"PANIFICACAOOCEANOLTDA":{"cliente":"PANIFICACAO OCEANO LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2026-03-17","corretor":"ASSESSORIA","empresa":"PROTETTA"},"PANIFICADORAPECPAOLTDA":{"cliente":"PANIFICADORA PECPAO LTDA (SULAMÉRICA)","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-08-10","corretor":"PROTETTA","empresa":"PROTETTA"},"PAULADUBOCAGEBRITODANTAS02846009708":{"cliente":"PAULA DU BOCAGE BRITO DANTAS 02846009708","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-09-11","corretor":"ASSESSORIA","empresa":"PROTETTA"},"PAULASANTOSPASSOSEIRAS14960787724":{"cliente":"PAULA SANTOS PASSOS EIRAS 14960787724","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-09-09","corretor":"PROTETTA","empresa":"PROTETTA"},"PAULOROBERTOFRAGOSOCOSTA":{"cliente":"PAULO ROBERTO FRAGOSO COSTA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2026-03-19","corretor":"PROPER","empresa":"PROTETTA"},"PLANINTIMELTDA":{"cliente":"PLAN IN TIME LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-10-10","corretor":"ASSESSORIA","empresa":"PROTETTA"},"PONTENOVAENERGIAPROJETOSLTDA":{"cliente":"PONTE NOVA ENERGIA PROJETOS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-11-13","corretor":"ASSESSORIA","empresa":"PROTETTA"},"PPSSERVICOSPARACONSTRUCAOLTDA":{"cliente":"PPS SERVICOS PARA CONSTRUCAO LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-10-10","corretor":"ASSESSORIA","empresa":"PROTETTA"},"PRIVATEPROMOTORALTDA":{"cliente":"PRIVATE PROMOTORA LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2026-03-20","corretor":"PROPER","empresa":"PROTETTA"},"PROJETOALEGRIAPRODUCOESEEVENTOSLTDA":{"cliente":"PROJETO ALEGRIA PRODUCOES E EVENTOS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-12-05","corretor":"ASSESSORIA","empresa":"PROTETTA"},"PROTETTACORRETORA":{"cliente":"PROTETTA CORRETORA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2022-09-30","corretor":"PROTETTA","empresa":"PROTETTA"},"QPARKESTACIONAMENTOSLTDA":{"cliente":"Q PARK ESTACIONAMENTOS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-04-25","corretor":"ASSESSORIA","empresa":"PROTETTA"},"QUISSAKRSERVICOSTECNICOSLTDA":{"cliente":"QUISSAKR SERVICOS TECNICOS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-11-04","corretor":"ASSESSORIA","empresa":"PROTETTA"},"RGSERVICOSDEINFORMATICAESOFTWARELTDA":{"cliente":"R G SERVICOS DE INFORMATICA E SOFTWARE LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-11-18","corretor":"ASSESSORIA","empresa":"PROTETTA"},"RSNIEDZEILSKICONSULTORIAESERVICOSIMOBILIARIOS":{"cliente":"R S NIEDZEILSKI CONSULTORIA E SERVICOS IMOBILIARIOS","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-11-13","corretor":"ASSESSORIA","empresa":"PROTETTA"},"RPPINTOCONSULTORIAINVESTIGACAOEPRODUCOESARTISTICAS":{"cliente":"R.P PINTO CONSULTORIA INVESTIGACAO E PRODUCOES ARTISTICAS","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-05-03","corretor":"ASSESSORIA","empresa":"PROTETTA"},"RAMAZAENGENHARIALTDA":{"cliente":"RAMAZA ENGENHARIA LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-04-10","corretor":"ASSESSORIA","empresa":"PROTETTA"},"RENATOPLACIDODELIMA":{"cliente":"RENATO PLACIDO DE LIMA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-03-11","corretor":"ASSESSORIA","empresa":"PROTETTA"},"RETROFITENGENHARIADESERVICOSLTDA":{"cliente":"RETROFIT ENGENHARIA DE SERVICOS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-04-10","corretor":"ASSESSORIA","empresa":"PROTETTA"},"RICARDOOTRANTONETOCLINICADENEUROCIRUGIA":{"cliente":"RICARDO OTRANTO NETO CLINICA DE NEUROCIRUGIA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-09-30","corretor":"ASSESSORIA","empresa":"PROTETTA"},"RIOSEGCORRETORADESEGUROSSIMPLES":{"cliente":"RIOSEG CORRETORA DE SEGUROS SIMPLES","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2022-08-19","corretor":"PROTETTA","empresa":"PROTETTA"},"ROBERTOHACKNICARETTAARQUITETURALTDA":{"cliente":"ROBERTO HACK NICARETTA ARQUITETURA LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-04-10","corretor":"ASSESSORIA","empresa":"PROTETTA"},"ROBERTOMARTINSCOSTASOCIEDADEINDIVIDU":{"cliente":"ROBERTO MARTINS COSTA SOCIEDADE INDIVIDU","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2026-03-13","corretor":"PROTETTA","empresa":"PROTETTA"},"RVMULATINHOSPORTS":{"cliente":"RV MULATINHO SPORTS","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-06-08","corretor":"PROTETTA","empresa":"PROTETTA"},"SANTAMARIASERVICOSMEDICOS":{"cliente":"SANTA MARIA SERVICOS MEDICOS","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-04-26","corretor":"ASSESSORIA","empresa":"PROTETTA"},"SCHUABBCONSULTORIAEMPRESARIALLTDA":{"cliente":"SCHUABB CONSULTORIA EMPRESARIAL LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-10-11","corretor":"ASSESSORIA","empresa":"PROTETTA"},"SELMALOUZAOSOCIEDADEINDIVIDUALDEADVOCACIA":{"cliente":"SELMA LOUZAO - SOCIEDADE INDIVIDUAL DE ADVOCACIA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-04-17","corretor":"ASSESSORIA","empresa":"PROTETTA"},"SERAFIMGOMESADVOGADOS":{"cliente":"SERAFIM GOMES - ADVOGADOS","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-06-26","corretor":"PROTETTA","empresa":"PROTETTA"},"SERFERCOMERCIOEINDUSTRIADEFERROEACOLTDA":{"cliente":"SERFER COMERCIO E INDUSTRIA DE FERRO E ACO LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2020-02-11","corretor":"ASSESSORIA","empresa":"PROTETTA"},"SHALIMARAMBROSIOOTRANTODEALMEIDA08377210754":{"cliente":"SHALIMAR AMBROSIO OTRANTO DE ALMEIDA 08377210754","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-06-25","corretor":"PROTETTA","empresa":"PROTETTA"},"SILBRASEGTECNOLOGIAAMBIENTALEOCUPACIONALLTDA":{"cliente":"SILBRA SEG TECNOLOGIA AMBIENTAL E OCUPACIONAL LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-04-10","corretor":"ASSESSORIA","empresa":"PROTETTA"},"SILVALOPESADVOGADOS":{"cliente":"SILVA & LOPES ADVOGADOS","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-04-23","corretor":"PROTETTA","empresa":"PROTETTA"},"SIMAOEXPRESSTRANSPORTENAUTICOLTDA":{"cliente":"SIMAO EXPRESS TRANSPORTE NAUTICO LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-05-14","corretor":"ASSESSORIA","empresa":"PROTETTA"},"SMAISDISTRIBUIDORAECOMERCIOLTDA":{"cliente":"SMAIS DISTRIBUIDORA E COMERCIO LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2022-08-10","corretor":"PROTETTA","empresa":"PROTETTA"},"SOLUCIOMATICAEXPRESSINFORMATICALTDA":{"cliente":"SOLUCIOMATICA EXPRESS INFORMATICA LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-08-06","corretor":"PROTETTA","empresa":"PROTETTA"},"SOLUCIONATICAINFORMATICA":{"cliente":"SOLUCIONATICA INFORMATICA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-09-03","corretor":"PROTETTA","empresa":"PROTETTA"},"SPHERAARQUITETURAECONSTRUCOESLTDA":{"cliente":"SPHERA ARQUITETURA E CONSTRUCOES LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2022-06-17","corretor":"PROTETTA","empresa":"PROTETTA"},"SRJMARTINSSERVICOSEREPRESENTACOESLTDA":{"cliente":"SRJ MARTINS SERVICOS E REPRESENTACOES LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-05-03","corretor":"ASSESSORIA","empresa":"PROTETTA"},"TECHENGENHARIAEINSTALACOESLTDA":{"cliente":"TECH ENGENHARIA E INSTALACOES LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-12-16","corretor":"PROTETTA","empresa":"PROTETTA"},"TERRAPROMETIDASALGADOSLTDA":{"cliente":"TERRA PROMETIDA SALGADOS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2026-01-07","corretor":"PROTETTA","empresa":"PROTETTA"},"TRESCUIDADOSASSESSORIAMATERNOINFANTILLTDA":{"cliente":"TRES CUIDADOS ASSESSORIA MATERNO-INFANTIL LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-05-13","corretor":"PROTETTA","empresa":"PROTETTA"},"TSCONSTRUCOESEINCORPORACOESLTDA":{"cliente":"TS CONSTRUCOES E INCORPORACOES LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2026-01-13","corretor":"ASSESSORIA","empresa":"PROTETTA"},"ULYSSEASOCIEDADEINDIVIDUALDEADVOCACIA":{"cliente":"ULYSSEA SOCIEDADE INDIVIDUAL DE ADVOCACIA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-03-12","corretor":"ASSESSORIA","empresa":"PROTETTA"},"VANESSABRAGAGOUVEIAGEMENTI05543115776":{"cliente":"VANESSA BRAGA GOUVEIA GEMENTI 05543115776","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2022-02-18","corretor":"PROTETTA","empresa":"PROTETTA"},"VANGUARDACONSULTORIAESISTEMASLTDA":{"cliente":"VANGUARDA CONSULTORIA E SISTEMAS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-11-05","corretor":"ASSESSORIA","empresa":"PROTETTA"},"VERTICALSERVICOSESPECIALIZADOS":{"cliente":"VERTICAL SERVIÇOS ESPECIALIZADOS","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-05-13","corretor":"PROTETTA","empresa":"PROTETTA"},"VIARADIOTECNOLOGIAEMTELECOMUNICACOESLTDA":{"cliente":"VIA RADIO TECNOLOGIA EM TELECOMUNICACOES LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-06-18","corretor":"PROTETTA","empresa":"PROTETTA"},"VINICIUSALVESRIBEIRO":{"cliente":"VINICIUS ALVES RIBEIRO","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-10-10","corretor":"ASSESSORIA","empresa":"PROTETTA"},"VITALLCENTRODEMEDICINAINTEGRATIVALTDA":{"cliente":"VITALL CENTRO DE MEDICINA INTEGRATIVA LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-06-26","corretor":"PROTETTA","empresa":"PROTETTA"},"WFCONSULTORESASSOCIADOSLTDA":{"cliente":"W F CONSULTORES ASSOCIADOS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-04-08","corretor":"PROTETTA","empresa":"PROTETTA"},"WILLIANFERRARI":{"cliente":"WILLIAN FERRARI","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2026-02-24","corretor":"ASSESSORIA","empresa":"PROTETTA"},"WLWCOMERCIOEDISTRIBUIDORADEPRESENTESLTDA":{"cliente":"WLW COMERCIO E DISTRIBUIDORA DE PRESENTES LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-10-11","corretor":"ASSESSORIA","empresa":"PROTETTA"},"YASMINEBARBOSAALVESSOCIEDADEINDIVIDUALDEADVOCACIA":{"cliente":"YASMINE BARBOSA ALVES SOCIEDADE INDIVIDUAL DE ADVOCACIA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-12-10","corretor":"ASSESSORIA","empresa":"PROTETTA"},"ZEUSREPRESENTACAOCOMERCIALLTDA":{"cliente":"ZEUS REPRESENTACAO COMERCIAL LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2024-12-18","corretor":"ASSESSORIA","empresa":"PROTETTA"},"ZUCAALIMENTOSARTESANAISLTDA":{"cliente":"ZUCA ALIMENTOS ARTESANAIS LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2021-09-16","corretor":"PROTETTA","empresa":"PROTETTA"},"ZZRESTAURANTELTDA":{"cliente":"ZZ RESTAURANTE LTDA","contrato":"","vidas":"","vitalicio":"","parcelaBase":"","inicioVigencia":"2025-04-16","corretor":"ASSESSORIA","empresa":"PROTETTA"}}};

export const getNextSequenceNumber = (list, fieldSelector) => {
  if (!list || list.length === 0) return "00001";
  let maxNum = 0;
  list.forEach((item) => {
    const val = parseInt(fieldSelector(item), 10);
    if (!isNaN(val) && val > maxNum) {
      maxNum = val;
    }
  });
  return String(maxNum + 1).padStart(5, "0");
};

const matchesCommaSeparated = (rowValue, filterValue, exact = false) => {
  if (filterValue === undefined || filterValue === null || filterValue === "") return true;
  const parts = String(filterValue).split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return true;
  
  const cleanRow = String(rowValue === undefined || rowValue === null ? "" : rowValue).toLowerCase();
  return parts.some(part => {
    const cleanPart = part.toLowerCase();
    if (exact) {
      return cleanRow === cleanPart;
    }
    return cleanRow.includes(cleanPart);
  });
};

export default function App() {
  useEffect(() => {
    const handleCorrigirSulamAmerica = async () => {
      if (window.__MIGRATED_SULAMERICA__) return;
      window.__MIGRATED_SULAMERICA__ = true;
      console.log("Running one-time Sulamérica migration...");

      let atualizacoesRealizadas = 0;

      try {
        const { data: allV, error: fetchErr } = await supabase.from('vendas').select('*');
        if (fetchErr || !allV) throw fetchErr;

        const formatDateForInputLocal = (value) => {
          if (!value && value !== 0) return "";
          if (value instanceof Date && !isNaN(value)) {
            return value.toISOString().slice(0, 10);
          }
          if (typeof value === "number" && !isNaN(value)) {
            if (value > 25569) {
              return new Date(Math.round((value - 25569) * 86400 * 1000))
                .toISOString()
                .slice(0, 10);
            }
          }
          const str = String(value).trim();
          if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
          if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
            const [d, m, y] = str.split("/");
            return `${y}-${m}-${d}`;
          }
          const dt = new Date(value);
          if (!isNaN(dt)) return dt.toISOString().slice(0, 10);
          return "";
        };

        const diffMesesSulAmericaLocal = (dataAnterior, dataAtual) => {
          const ini = formatDateForInputLocal(dataAnterior);
          const fim = formatDateForInputLocal(dataAtual);
          if (!ini || !fim) return 0;
          const a = new Date(`${ini}T00:00:00`);
          const b = new Date(`${fim}T00:00:00`);
          if (a >= b) return 0;
          return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
        };

        const sulamericaVendas = allV
          .filter(
            (v) =>
              (v.operadora && v.operadora.includes("SULAMERICA")) ||
              (v.codigoOperadora && v.codigoOperadora.includes("SULAMERICA")),
          )
          .sort(
            (a, b) =>
              new Date(a.dataVenda || a.data || 0) -
              new Date(b.dataVenda || b.data || 0),
          );

        const mapped = sulamericaVendas.map((v, i) => ({ ...v, _index: i }));
        const vendasParaSalvar = [];

        for (const vendaAtual of mapped) {
          let calcParcela = null;
          const inicioVig = vendaAtual.inicioVigencia;
          const dataVenda = vendaAtual.dataVenda || vendaAtual.data;

          const historicalSales = mapped.filter(
            (v) =>
              v.id !== vendaAtual.id &&
              new Date(v.dataVenda || v.data || 0).getTime() <=
                new Date(dataVenda).getTime() && v._index < vendaAtual._index &&
              ((v.contrato && v.contrato === vendaAtual.contrato) ||
                (!v.contrato &&
                  v.cliente &&
                  vendaAtual.cliente &&
                  v.cliente.toLowerCase() === vendaAtual.cliente.toLowerCase())),
          );

          if (historicalSales.length === 0 && inicioVig) {
            const meses = diffMesesSulAmericaLocal(inicioVig, dataVenda);
            calcParcela = String(Math.max(1, meses || 1));
          } else if (historicalSales.length > 0) {
            const ultimaVenda = historicalSales.sort(
              (a, b) =>
                new Date(b.dataVenda || b.data || 0) -
                new Date(a.dataVenda || a.data || 0),
            )[0];
            const ultimaParcela = parseInt(
              String(ultimaVenda?.parcela || "").replace(/\D/g, ""),
              10,
            );
            const meses = diffMesesSulAmericaLocal(
              ultimaVenda?.dataVenda || ultimaVenda?.data,
              dataVenda,
            );
            if (!isNaN(ultimaParcela) && ultimaParcela > 0) {
              calcParcela = String(
                Math.max(1, ultimaParcela + Math.max(1, meses || 1)),
              );
            }
          }

          if (!calcParcela) continue;

          if (
            calcParcela !== String(vendaAtual.parcela).replace(/\D/g, "")
          ) {
            vendaAtual.parcela = calcParcela;
            vendasParaSalvar.push({ ...vendaAtual, parcela: calcParcela });
          }
        }

        if (vendasParaSalvar.length === 0) {
          console.log("Nenhuma correção de parcela necessária para a Sulamerica.");
          return;
        }

        const total = vendasParaSalvar.length;
        console.log(`Corrigindo ${total} parcelas da Sulamerica...`);
        let madeChanges = false;
        
        for (let i = 0; i < total; i++) {
          const v = vendasParaSalvar[i];
          const sanitized = { parcela: v.parcela };
          try {
            await supabase.from('vendas').update(sanitized).eq('id', v.id);
            madeChanges = true;
          } catch(err) {
            console.error("Failed to update " + v.id, err);
          }
        }

        console.log("Correção concluída.");
        if (madeChanges) {
           window.location.reload();
        }
      } catch (e) {
        console.error("Erro na migração sulamerica", e);
      }
    };

    handleCorrigirSulamAmerica();
  }, []);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("protetta_theme");
    return saved ? saved === "dark" : true;
  });
  const [currentUser, setCurrentUser] = useState(() => {
    const savedLocal = localStorage.getItem("protetta_auth_user");
    const savedSession = sessionStorage.getItem("protetta_auth_user");
    return savedLocal
      ? JSON.parse(savedLocal)
      : savedSession
        ? JSON.parse(savedSession)
        : null;
  });
  const [loginData, setLoginData] = useState({
    user: "",
    password: "",
    rememberMe: false,
  });
  const [loginError, setLoginError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [pendingTermsUser, setPendingTermsUser] = useState(null);
  const [isSessionVerified, setIsSessionVerified] = useState(false);

  useEffect(() => {
    const verifySessionTerms = async () => {
      if (!currentUser) {
        setIsSessionVerified(true);
        return;
      }
      if (currentUser.username === "Donfim") {
        setIsSessionVerified(true);
        return;
      }
      try {
        const { data: actTerms } = await supabase
          .from("lgpd_terms_versions")
          .select("id, version")
          .eq("status", "active")
          .limit(1);

        if (!actTerms || actTerms.length === 0) {
          setPendingTermsUser(currentUser);
          setCurrentUser(null);
          setIsSessionVerified(true);
          return;
        }

        if (actTerms && actTerms.length > 0) {
          const termId = actTerms[0].id;

          const { data: dbUser } = await supabase
            .from("users")
            .select("must_accept_terms, id")
            .eq("username", currentUser.username)
            .limit(1);
          if (
            dbUser &&
            dbUser.length > 0 &&
            dbUser[0].must_accept_terms === true
          ) {
            setPendingTermsUser(currentUser);
            setCurrentUser(null);
            setIsSessionVerified(true);
            return;
          }

          const { data: accs } = await supabase
            .from("lgpd_acceptances")
            .select("id")
            .eq("term_version_id", termId)
            .eq("username", currentUser.username)
            .limit(1);
          if (!accs || accs.length === 0) {
            setPendingTermsUser(currentUser);
            setCurrentUser(null);
            setIsSessionVerified(true);
            return;
          }
        }
      } catch (e) {
        console.error("Erro verificando termos na sessao:", e);
      }
      setIsSessionVerified(true);
    };
    verifySessionTerms();
  }, []);

  const [alertDialog, setAlertDialog] = useState({
    isOpen: false,
    message: "",
  });
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    message: "",
    onConfirm: null,
  });
  const [currentView, setCurrentView] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");

  const [dbReports, setDbReports] = useState([]);
  const [selectedExtratos, setSelectedExtratos] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [fileViewMode, setFileViewMode] = useState("grid");
  const [selectedFile, setSelectedFile] = useState(null);

  const [customOpSeg, setCustomOpSeg] = useState(() => {
    try {
      const saved = localStorage.getItem("protetta_custom_op_seg");
      let parsed = saved
        ? JSON.parse(saved)
        : { operadoras: [], seguradoras: [] };
      if (Array.isArray(parsed)) {
        parsed = { operadoras: parsed, seguradoras: [] };
      }
      return parsed;
    } catch {
      return { operadoras: [], seguradoras: [] };
    }
  });

  const setCustomOpSegAction = (newList) => {
    setCustomOpSeg(newList);
    localStorage.setItem("protetta_custom_op_seg", JSON.stringify(newList));
    syncGlobalSysConfigToDB(rawEmpresasList, printPresets, newList);
  };

  const combinedOperadoras = Array.from(
    new Set([
      ...LISTA_OPERADORAS,
      "METLIFE",
      "PET LOVE",
      ...(customOpSeg?.operadoras || []).filter(
        (op) =>
          !LISTA_OPERADORAS.includes(op) && !LISTA_SEGURADORAS.includes(op),
      ),
    ]),
  ).sort();

  const combinedSeguradoras = Array.from(
    new Set([
      ...LISTA_SEGURADORAS,
      "ALLIANZ",
      "SUHAI",
      "MONGERAL",
      "MAPFRE",
      "CASSI PASI",
      "HDI",
      ...(customOpSeg?.seguradoras || []).filter(
        (seg) =>
          !LISTA_OPERADORAS.includes(seg) && !LISTA_SEGURADORAS.includes(seg),
      ),
    ]),
  ).sort();

  const [clientes, setClientes] = useState([]);
  const [selectedClientes, setSelectedClientes] = useState([]);
  const [selectedVendas, setSelectedVendas] = useState([]);
  const [filtroNomeCliente, setFiltroNomeCliente] = useState("");
  const [showMainClienteSuggestions, setShowMainClienteSuggestions] =
    useState(false);
  const [filtrosCli, setFiltrosCli] = useState({
    tipo: "Todos",
    situacao: "Todos",
  });

  // Empresas Gestão
  const [rawEmpresasList, setRawEmpresasList] = useState(() => {
    try {
      const saved = localStorage.getItem("protetta_empresas");
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && parsed.length > 0) {
        // Remove a empresa "Operadora" que possa estar no cache local e garante PROTETTA
        let filtered = parsed.filter((e) => e.nome !== "Operadora");
        filtered = filtered.map((e) =>
          e.id === 1 && e.nome === "PROTETTA" && !e.cnpj
            ? { ...e, cnpj: "28.291.926/0001-00" }
            : e,
        );
        if (filtered.length === 0) {
          filtered = [
            {
              id: 1,
              nome: "PROTETTA",
              cnpj: "28.291.926/0001-00",
              isDefault: true,
            },
          ];
        }
        setTimeout(
          () =>
            localStorage.setItem("protetta_empresas", JSON.stringify(filtered)),
          100,
        );
        return filtered;
      }
      return [
        {
          id: 1,
          nome: "PROTETTA",
          cnpj: "28.291.926/0001-00",
          isDefault: true,
        },
      ];
    } catch {
      return [
        {
          id: 1,
          nome: "PROTETTA",
          cnpj: "28.291.926/0001-00",
          isDefault: true,
        },
      ];
    }
  });

  const empresasList = useMemo(() => {
    if (!currentUser?.empresa || currentUser.empresa === "Todas")
      return rawEmpresasList;
    return rawEmpresasList.filter(
      (e) => e.nome.toUpperCase() === currentUser.empresa.toUpperCase(),
    );
  }, [rawEmpresasList, currentUser]);

  const setEmpresasList = async (newListOrFunc) => {
    let newList;
    if (typeof newListOrFunc === "function") {
      newList = newListOrFunc(rawEmpresasList);
    } else {
      newList = newListOrFunc;
    }

    // Save to global DB fallback BEFORE changing local state
    await syncGlobalSysConfigToDB(newList, null);

    if (supabase) {
      try {
        const { error } = await supabase
          .from("empresas")
          .upsert(newList, { onConflict: "id" });
        if (
          error &&
          (error.message?.includes("does not exist") || error.code === "42P01")
        ) {
          // Handled gracefully with syncGlobalSysConfigToDB
        } else if (error) {
          console.error("Erro ao salvar empresas na nuvem:", error);
        }
      } catch (e) {}
    }

    // NOW change local state (this will trigger loadFromDB via useEffect)
    setRawEmpresasList(newList);
    localStorage.setItem("protetta_empresas", JSON.stringify(newList));
  };

  const [selectedEmpresaOverride, setSelectedEmpresaOverride] = useState(() => {
    return localStorage.getItem("protetta_selected_empresa") || "";
  });

  const activeEmpresa = useMemo(() => {
    if (selectedEmpresaOverride) {
      const allowed = empresasList.find(
        (e) => e.nome.toUpperCase() === selectedEmpresaOverride.toUpperCase()
      );
      if (allowed) return allowed;
    }
    return currentUser?.empresa && currentUser?.empresa !== "Todas"
      ? rawEmpresasList.find(
          (e) => e.nome.toUpperCase() === currentUser.empresa.toUpperCase(),
        ) || { nome: currentUser.empresa }
      : rawEmpresasList.find((e) => e.isDefault) ||
        rawEmpresasList[0] || { nome: "PROTETTA" };
  }, [selectedEmpresaOverride, empresasList, currentUser, rawEmpresasList]);

  const handleSelectEmpresa = (empName) => {
    setSelectedEmpresaOverride(empName);
    if (empName) {
      localStorage.setItem("protetta_selected_empresa", empName);
    } else {
      localStorage.removeItem("protetta_selected_empresa");
    }
  };

  const defaultEmpresa = activeEmpresa;
  const nomeEmpresa = defaultEmpresa.nome;
  const nomeEmpresaUpper = nomeEmpresa.toUpperCase();

  const [cols, setCols] = useState({
    codigo: false,
    nome: true,
    tipo: true,
    documento: true,
    operadora: true,
    servico: true,
    telefone: true,
    celular: true,
    email: true,
    situacao: true,
    cadastrado_em: true,
    acoes: true,
  });
  const [modalClienteOpen, setModalClienteOpen] = useState(false);
  const [modalViewClienteOpen, setModalViewClienteOpen] = useState(false);
  const [clienteToView, setClienteToView] = useState(null);
  const [modalBuscaOpen, setModalBuscaOpen] = useState(false);
  const [clienteEditIndex, setClienteEditIndex] = useState(-1);
  const [clienteForm, setClienteForm] = useState({
    id: null,
    nome: "",
    tipo: "Pessoa jurídica",
    documento: "",
    telefone: "",
    celular: "",
    cep: "",
    logradouro: "",
    numero: "",
    bairro: "",
    cidade: "",
    uf: "",
    email: "",
    situacao: true,
    operadora: "",
    servico: "Plano de Saúde",
  });
  const [clientSaveSuccess, setClientSaveSuccess] = useState(false);
  const [clientesCurrentPage, setClientesCurrentPage] = useState(1);
  const [clientesPerPage, setClientesPerPage] = useState(20);

  const [vendasCurrentPage, setVendasCurrentPage] = useState(1);
  const [vendasPerPage, setVendasPerPage] = useState(20);

  const [savedReportsCurrentPage, setSavedReportsCurrentPage] = useState(1);
  const [savedReportsPerPage, setSavedReportsPerPage] = useState(20);

  const [modalArquivosOpen, setModalArquivosOpen] = useState(false);
  const [isModalArquivosFullscreen, setIsModalArquivosFullscreen] =
    useState(false);
  const [modalArquivosSearch, setModalArquivosSearch] = useState("");
  const [extratosModalViewMode, setExtratosModalViewMode] = useState("grid");
  const [modalArquivosDateStart, setModalArquivosDateStart] = useState("");
  const [modalArquivosDateEnd, setModalArquivosDateEnd] = useState("");
  const [showModalArquivosPeriodMenu, setShowModalArquivosPeriodMenu] =
    useState(false);
  const [modalArquivosPeriodLabel, setModalArquivosPeriodLabel] =
    useState("Todo o período");
  const [modalArquivosPath, setModalArquivosPath] = useState([]);

  const [modalMoverExtratosOpen, setModalMoverExtratosOpen] = useState(false);
  const [moverExtratosForm, setMoverExtratosForm] = useState({
    ano: new Date().getFullYear().toString(),
    mes: MESES[0],
    categoria: CATEGORIAS[0],
    empresa: "PROTETTA",
    codigoOperadora: "",
    codOperadora: "",
    codigoOperadoraOutra: "",
  });
  const [modalEditarExtratoOpen, setModalEditarExtratoOpen] = useState(false);
  const [editarExtratoForm, setEditarExtratoForm] = useState({
    id: null,
    parceiro: "",
    notaFiscal: "",
    codigoOperadora: "",
    codOperadora: "",
    codigoOperadoraOutra: "",
  });

  const [modalPrintOpen, setModalPrintOpen] = useState(false);
  const [includeChartsInReport, setIncludeChartsInReport] = useState(true);
  const [printConfig, setPrintConfig] = useState({
    orientation: "landscape",
    scale: 100,
  });
  const [printCols, setPrintCols] = useState(defaultPrintCols);
  const [printPresets, setPrintPresets] = useState([]);
  const [reportTitleSuffix, setReportTitleSuffix] = useState("");
  const [newPresetName, setNewPresetName] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("");

  const [pdfData, setPdfData] = useState([]);
  const [showModalInconsistencias, setShowModalInconsistencias] = useState(false);
  const [inconsistenciasReduzido, setInconsistenciasReduzido] = useState(true);
  const [inconsistenciasFiltroOperadora, setInconsistenciasFiltroOperadora] = useState("Todas");
  const [inconsistenciasTab, setInconsistenciasTab] = useState("negativos");
  const [inconsistenciasStatusFiltragem, setInconsistenciasStatusFiltragem] = useState("pendentes");
  const [inconsistenciasEditingId, setInconsistenciasEditingId] = useState(null);
  const [inconsistenciasEditingText, setInconsistenciasEditingText] = useState("");
  const [showModalVendasRelatorio, setShowModalVendasRelatorio] =
    useState(false);
  const [relatorioVendasSearch, setRelatorioVendasSearch] = useState("");
  const [relatorioVendasSelected, setRelatorioVendasSelected] = useState(
    new Set(),
  );
  const [backupList, setBackupList] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const tabelaPdfRef = useRef(null);
  const [editRowIndex, setEditRowIndex] = useState(-1);
  const [editRowData, setEditRowData] = useState({});

  const [savedReportsList, setSavedReportsList] = useState([]);
  const [selectedSavedReports, setSelectedSavedReports] = useState([]);
  const [savedReportsSearchTerm, setSavedReportsSearchTerm] = useState("");
  const [filterSavedReportsData, setFilterSavedReportsData] = useState("");
  const [filterSavedReportsNome, setFilterSavedReportsNome] = useState("");
  const [filterSavedReportsPeriodo, setFilterSavedReportsPeriodo] = useState("");
  const [filterSavedReportsNf, setFilterSavedReportsNf] = useState("");
  const [filterSavedReportsOperadora, setFilterSavedReportsOperadora] = useState("");
  const [savedReportsDateStart, setSavedReportsDateStart] = useState("");
  const [savedReportsDateEnd, setSavedReportsDateEnd] = useState("");
  const [showSavedReportsPeriodMenu, setShowSavedReportsPeriodMenu] =
    useState(false);
  const [savedReportsPeriodLabel, setSavedReportsPeriodLabel] =
    useState("Todo o período");
  const [savedReportsSortField, setSavedReportsSortField] = useState("nome");
  const [savedReportsSortDirection, setSavedReportsSortDirection] = useState("desc");
  const [gestorReportsDateStart, setGestorReportsDateStart] = useState("");
  const [gestorReportsDateEnd, setGestorReportsDateEnd] = useState("");
  const [gestorFilterEtapa, setGestorFilterEtapa] = useState("");
  const [gestorFilterNf, setGestorFilterNf] = useState("");
  const [gestorFilterOpSeg, setGestorFilterOpSeg] = useState("");
  const [gestorFilterAno, setGestorFilterAno] = useState("");
  const [gestorFilterMes, setGestorFilterMes] = useState("");
  const [gestorFilterDataExtrato, setGestorFilterDataExtrato] = useState("");
  const [showGestorPeriodMenu, setShowGestorPeriodMenu] = useState(false);
  const [gestorPeriodLabel, setGestorPeriodLabel] = useState("Todo o período");
  const [currentReportId, setCurrentReportId] = useState(null);
  const [currentReportEmpresa, setCurrentReportEmpresa] = useState("");
  const [currentReportOperadora, setCurrentReportOperadora] = useState("");
  const [reportName, setReportName] = useState("");
  const [reportPeriod, setReportPeriod] = useState("");
  const [globalDateInput, setGlobalDateInput] = useState("");

  const [usersList, setUsersList] = useState([]);
  const [modalUserOpen, setModalUserOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    id: null,
    username: "",
    password: "",
    role: "user",
    permissions: [],
    empresa: "Todas",
  });

  const [modalImportNfPdfOpen, setModalImportNfPdfOpen] = useState(false);
  const [importNfPdfForm, setImportNfPdfForm] = useState({
    nf: "",
    operadora: "",
    cliente: "",
    valor: 0,
    dataHora: "",
    chave: "",
  });

  const [modalEditNfOpen, setModalEditNfOpen] = useState(false);
  const [editNfForm, setEditNfForm] = useState(null);

  const [modalViewNfOpen, setModalViewNfOpen] = useState(false);
  const [viewNfData, setViewNfData] = useState(null);

  const [vendasList, setVendasList] = useState([]);
  const [showVendasFilter, setShowVendasFilter] = useState(false);
  const [showVendasPeriodMenu, setShowVendasPeriodMenu] = useState(false);
  const [vendasPeriodLabel, setVendasPeriodLabel] = useState("Todo o período");
  const [showVendasAcoesMenu, setShowVendasAcoesMenu] = useState(false);

  const [showClienteSuggestions, setShowClienteSuggestions] = useState(false);
  const [showFilterClienteSuggestions, setShowFilterClienteSuggestions] =
    useState(false);
  const [modalVendaOpen, setModalVendaOpen] = useState(false);
  const [vendaForm, setVendaForm] = useState({
    id: null,
    numero: "",
    cliente: "",
    dataVenda: dataDeHojeInterna(),
    situacao: `FATURADO ${nomeEmpresaUpper} NF`,
    loja: `${nomeEmpresaUpper} ASSESSORIA`,
    valor: 0,
    contrato: "",
    codOperadora: "",
    codigoOperadora: "",
    vidas: "",
    parcela: "",
    inicioVigencia: "",
    notaFiscal: "",
    corretor: nomeEmpresa,
    vitalicio: "Sim",
    assessoria: nomeEmpresa,
    formaPagamento:
      nomeEmpresaUpper === "PROPER" ? "Dinheiro à vista" : "Crédito em conta",
    servico: "",
    desconto: "",
    notas: "",
    comissao: 0,
    comissaoPorcentagem: "",
  });

  const defaultVendasFilters = {
    loja: "Todos",
    codigo: "",
    dataInicio: "",
    dataFim: "",
    situacao: "Todos",
    cliente: "",
    contrato: "",
    codigoOperadora: "",
    vidas: "",
    vitalicio: "Selecione",
    parcela: "",
    inicioVigenciaInicio: "",
    inicioVigenciaFim: "",
    notaFiscal: "",
    corretor: "Todos",
  };
  const [vendasFilterForm, setVendasFilterForm] =
    useState(defaultVendasFilters);
  const [appliedVendasFilters, setAppliedVendasFilters] = useState(null);
  const [vendasSortConfig, setVendasSortConfig] = useState({
    key: "dataVenda",
    direction: "desc",
  });

  const vendasColLabels = {
    numero: "Registo",
    cliente: "Cliente",
    dataVenda: "Data",
    situacao: "Situação",
    valor: "Valor",
    comissaoPorcentagem: "%",
    comissao: "Comissão",
    contrato: "Contrato",
    codOperadora: "Cód. Op.",
    codigoOperadora: "Operadora",
    vidas: "Vidas",
    loja: "Loja",
    servico: "Serviço",
    corretor: "Corretor",
    parcela: "Parcela",
    inicioVigencia: "Início Vigência",
    notaFiscal: "NF",
    vitalicio: "Vitalício",
    assessoria: "Assessoria",
    formaPagamento: "Pagamento",
    desconto: "Desconto",
  };

  // As colunas originais padrão para Vendas
  const defaultVendasCols = {
    numero: false,
    cliente: true,
    dataVenda: true,
    situacao: false,
    valor: true,
    comissaoPorcentagem: false,
    comissao: true,
    contrato: false,
    codOperadora: false,
    codigoOperadora: true,
    vidas: false,
    loja: false,
    servico: false,
    corretor: false,
    parcela: true,
    inicioVigencia: false,
    notaFiscal: true,
    vitalicio: false,
    assessoria: false,
    formaPagamento: false,
    desconto: false,
    notas: false,
  };

  const [vendasTableCols, setVendasTableCols] = useState(defaultVendasCols);
  const [showVendasColsMenu, setShowVendasColsMenu] = useState(false);

  const toggleVendasCol = (colKey) => {
    setVendasTableCols((prev) => ({ ...prev, [colKey]: !prev[colKey] }));
  };

  const setAllVendasCols = (value) => {
    const newCols = {};
    Object.keys(vendasColLabels).forEach((key) => {
      newCols[key] = value;
    });
    setVendasTableCols(newCols);
  };

  const [reportTableCols, setReportTableCols] = useState(defaultPrintCols);
  const [showReportColsMenu, setShowReportColsMenu] = useState(false);

  const toggleReportCol = (colKey) => {
    setReportTableCols((prev) => ({ ...prev, [colKey]: !prev[colKey] }));
  };

  const setAllReportCols = (value) => {
    const newCols = {};
    Object.keys(printColLabels).forEach((key) => {
      newCols[key] = value;
    });
    setReportTableCols(newCols);
  };

  const [nfeTab, setNfeTab] = useState("emitir");
  const [showImpostos, setShowImpostos] = useState(false);
  const [isEmitting, setIsEmitting] = useState(false);
  const [nfeHistorico, setNfeHistorico] = useState([]);

  const [nfeForm, setNfeForm] = useState({
    dataEmissao: dataDeHojeInterna(),
    serie: "1",
    tributacao: "1",
    cnpj: "",
    nome: "",
    email: "",
    cep: "",
    logradouro: "",
    numero: "",
    bairro: "",
    cidade: "",
    uf: "",
    codigo: "01.01",
    desc: "",
    valor: "",
    aliquota: "5.0",
    issRetido: false,
    pis: "",
    cofins: "",
    inss: "",
    ir: "",
    csll: "",
  });

  const [formData, setFormData] = useState({
    ano: new Date().getFullYear().toString(),
    mes: MESES[0],
    categoria: CATEGORIAS[0],
    empresa: nomeEmpresa,
    parceiro: "",
    codOperadora: "",
    codigoOperadora: "",
    codigoOperadoraOutra: "",
    notaFiscal: "",
    arquivos: [],
  });

  // Sincronizar Inclusão de Extrato com o Gestor de Extratos
  useEffect(() => {
    if (currentView === "gestor-add") {
      const opPath =
        formData.codigoOperadora === "OUTRA"
          ? formData.codigoOperadoraOutra
          : formData.codigoOperadora;
      if (opPath) {
        if (formData.codOperadora) {
          setCurrentPath([
            formData.ano.toString(),
            formData.mes,
            formData.categoria,
            formData.empresa,
            opPath,
            formData.codOperadora,
          ]);
        } else {
          setCurrentPath([
            formData.ano.toString(),
            formData.mes,
            formData.categoria,
            formData.empresa,
            opPath,
          ]);
        }
      } else {
        setCurrentPath([
          formData.ano.toString(),
          formData.mes,
          formData.categoria,
          formData.empresa,
        ]);
      }
    }
  }, [
    formData.ano,
    formData.mes,
    formData.categoria,
    formData.empresa,
    formData.codigoOperadora,
    formData.codigoOperadoraOutra,
    formData.codOperadora,
    currentView,
  ]);

  useEffect(() => {
    if (currentView === "gestor-browse" && currentPath.length > 0) {
      setFormData((prev) => ({
        ...prev,
        ano: currentPath[0] || prev.ano,
        mes: currentPath[1] || prev.mes,
        categoria: currentPath[2] || prev.categoria,
        empresa: currentPath[3] || prev.empresa,
        codigoOperadora: currentPath[4] || prev.codigoOperadora,
        codOperadora: currentPath[5] || prev.codOperadora,
      }));
    }
  }, [currentPath, currentView]);

  useEffect(() => {
    setSelectedExtratos([]);
  }, [currentPath, currentView, searchTerm]);

  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const fileInputRef = useRef(null);

  const showAlert = (msg, type) => {
    let finalType = type;
    if (!finalType) {
      if (/pulos de seq/i.test(msg)) {
        finalType = "warning_pulse";
      } else if (/sucesso|importados!|processado!|guardado|salvo/i.test(msg)) {
        finalType = "success";
      } else {
        finalType = "error";
      }
    }
    setAlertDialog({ isOpen: true, message: msg, type: finalType });
  };
  const showConfirm = (msg, callback) =>
    setConfirmDialog({ isOpen: true, message: msg, onConfirm: callback });

  const hasAccess = (module) => {
    if (!currentUser) return false;
    if (module === "lgpd")
      return currentUser.username === "Donfim" || currentUser.role === "master";
    if (currentUser.role === "master") return true;
    if (
      module === "empresas" &&
      currentUser.empresa &&
      currentUser.empresa !== "Todas"
    )
      return false;
    if (currentUser.role === "admin") return true;
    return (currentUser.permissions || []).includes(module);
  };

  const fetchBackups = async () => {
    if (!supabase) return;
    setLoadingBackups(true);
    try {
      const { data, error } = await supabase.storage
        .from("arquivos_extratos")
        .list("backups", {
          sortBy: { column: "created_at", order: "desc" },
        });
      if (error) throw error;
      const empStr = nomeEmpresaUpper.replace(/[^A-Z0-9]/gi, "_");
      const filtered = (data || [])
        .filter(
          (f) => f.name && f.name.includes(empStr) && f.name.endsWith(".zip"),
        )
        .slice(0, 10);
      setBackupList(filtered);
    } catch (err) {
      let msg = err.message || String(err);
      if (msg.includes("Failed to fetch") || msg.includes("Bucket not found")) {
        setBackupList([
          {
            id: "error",
            name: "ERRO: O Bucket 'arquivos_extratos' não existe ou está bloqueado no Supabase.",
            created_at: new Date(),
          },
        ]);
      } else {
        setBackupList([]);
      }
      console.warn("Aviso ao carregar backups:", msg);
    } finally {
      setLoadingBackups(false);
    }
  };

  const loadFromDB = async () => {
    if (!supabase) return;
    try {
      const [resUsers, resCli, resVendas, resSaved, resRep, resEmpresas] =
        await Promise.all([
          supabase.from("users").select("*"),
          supabase.from("clientes").select("*"),
          supabase.from("vendas").select("*"),
          supabase.from("savedReports").select("*"),
          supabase.from("reports").select("*"),
          supabase
            .from("empresas")
            .select("*")
            .then(
              (res) => res,
              () => ({ data: null, error: true }),
            ),
        ]);

      // Sys config injected in savedReports
      let sysConfigRow = resSaved?.data?.find(
        (r) => r.nome === "___LOCAL_SYS_CONFIG___",
      );
      let sysConfig = sysConfigRow
        ? Array.isArray(sysConfigRow.dados)
          ? sysConfigRow.dados[0]
          : sysConfigRow.dados
        : {};
      if (!sysConfig) sysConfig = {};

      if (sysConfig.custom_op_seg) {
        let parsed = sysConfig.custom_op_seg;
        if (Array.isArray(parsed))
          parsed = { operadoras: parsed, seguradoras: [] };
        setCustomOpSeg(parsed);
        localStorage.setItem("protetta_custom_op_seg", JSON.stringify(parsed));
      }

      // Reconstruct and update companies list based on data
      setRawEmpresasList((prev) => {
        let map = new Map(prev.map((e) => [e.nome.toUpperCase(), e]));
        let changed = false;

        // Add from db if table exists
        if (resEmpresas && resEmpresas.data && resEmpresas.data.length > 0) {
          resEmpresas.data.forEach((dbEmp) => {
            if (!map.has(dbEmp.nome.toUpperCase())) {
              map.set(dbEmp.nome.toUpperCase(), dbEmp);
              changed = true;
            } else {
              let existing = map.get(dbEmp.nome.toUpperCase());
              let dbIsDefault =
                dbEmp.isDefault !== undefined
                  ? dbEmp.isDefault
                  : existing.isDefault;
              // Sync changes from DB back to local state (DB wins)
              if (
                existing.cnpj !== dbEmp.cnpj ||
                existing.logo !== dbEmp.logo ||
                existing.isDefault !== dbIsDefault ||
                existing.nome !== dbEmp.nome
              ) {
                map.set(dbEmp.nome.toUpperCase(), {
                  ...existing,
                  ...dbEmp,
                  isDefault: dbIsDefault,
                });
                changed = true;
              }
            }
          });
        }

        // Add from SysConfig
        if (sysConfig.empresas && Array.isArray(sysConfig.empresas)) {
          sysConfig.empresas.forEach((dbEmp) => {
            if (!map.has(dbEmp.nome.toUpperCase())) {
              map.set(dbEmp.nome.toUpperCase(), dbEmp);
              changed = true;
            } else {
              let existing = map.get(dbEmp.nome.toUpperCase());
              let dbIsDefault =
                dbEmp.isDefault !== undefined
                  ? dbEmp.isDefault
                  : existing.isDefault;
              // Always sync from SysConfig (DB) to local state to guarantee DB is the source of truth
              if (
                existing.cnpj !== dbEmp.cnpj ||
                existing.logo !== dbEmp.logo ||
                existing.isDefault !== dbIsDefault ||
                existing.nome !== dbEmp.nome
              ) {
                map.set(dbEmp.nome.toUpperCase(), {
                  ...existing,
                  ...dbEmp,
                  isDefault: dbIsDefault,
                });
                changed = true;
              }
            }
          });
        }

        // Extract from related data
        let extractedEmpresas = new Map();
        resUsers?.data?.forEach((u) => {
          if (u.empresa && u.empresa !== "Todas")
            extractedEmpresas.set(u.empresa.toUpperCase(), u.empresa);
        });
        resCli?.data?.forEach((c) => {
          if (c.empresa)
            extractedEmpresas.set(c.empresa.toUpperCase(), c.empresa);
        });
        resVendas?.data?.forEach((v) => {
          if (v.loja) {
            const origNome = v.loja.replace(/ (SEGUROS|ASSESSORIA)$/i, "").trim();
            extractedEmpresas.set(origNome.toUpperCase(), origNome);
          }
          if (v.empresa)
            extractedEmpresas.set(v.empresa.toUpperCase(), v.empresa);
        });

        extractedEmpresas.forEach((originalName, empUpper) => {
          if (originalName && !map.has(empUpper)) {
            let newId =
              map.size > 0
                ? Math.max(...Array.from(map.values()).map((e) => e.id || 0)) +
                  1
                : 1;
            map.set(empUpper, {
              id: newId,
              nome: originalName,
              cnpj: "",
              logo: "",
              isDefault: map.size === 0,
            });
            changed = true;
          }
        });

        let newList = Array.from(map.values());
        let defaultsCount = newList.filter((e) => e.isDefault).length;

        if (defaultsCount !== 1 && newList.length > 0) {
          let foundFirstDefault = false;
          newList = newList.map((e, idx) => {
            if (defaultsCount === 0 && idx === 0)
              return { ...e, isDefault: true };
            if (e.isDefault) {
              if (!foundFirstDefault) {
                foundFirstDefault = true;
                return e;
              }
              return { ...e, isDefault: false };
            }
            return e;
          });
          changed = true;
        }

        if (changed) {
          localStorage.setItem("protetta_empresas", JSON.stringify(newList));
          // Try to save to Supabase
          supabase
            .from("empresas")
            .upsert(newList, { onConflict: "id" })
            .then(
              () => {},
              () => {},
            );
          syncGlobalSysConfigToDB(newList, null);
          return newList;
        }
        return prev;
      });

      const userFilters = (data) => {
        if (!data) return [];
        const targetEmp = (nomeEmpresaUpper || "").trim();
        return data.filter((item) => {
          let emp = (item?.empresa || item?.loja || "").toUpperCase().trim();
          if (!emp || emp === "TODAS") return true; // Show 'Todas' items to everyone, or items with no company
          if (
            emp === targetEmp ||
            emp.includes(targetEmp) ||
            targetEmp.includes(emp)
          )
            return true;
          return false;
        });
      };

      if (resUsers.data) {
        // Users list in configuration should probably still show all users for Admin?
        // Let's keep users strictly isolated or maybe Admin needs to see all to manage?
        // Actually the user said "não acessar nada de outra loja". We will isolate users too, except admins.
        let filteredSubs = resUsers.data.filter((u) => {
          if (currentUser?.role === "admin" || currentUser?.role === "master")
            return true; // admin/master sees all users
          if (!u.empresa || u.empresa === "Todas") return true;
          return (
            u.empresa.toUpperCase() === nomeEmpresaUpper ||
            u.empresa.toUpperCase().includes(nomeEmpresaUpper)
          );
        });
        setUsersList(filteredSubs);
      }
      if (resCli.data) setClientes(userFilters(resCli.data));
      if (resVendas.data) {
        let allVendas = resVendas.data;
        const toUpdate = [];
        allVendas = allVendas.map((v) => {
          const c = parseFloat(v.comissao) || 0;
          const t = parseFloat(v.valor) || 0;
          if (
            t > 0 &&
            c > 0 &&
            (v.comissaoPorcentagem === null ||
              v.comissaoPorcentagem === undefined ||
              v.comissaoPorcentagem === "")
          ) {
            const pct = String(Math.round((c / t) * 100));
            v.comissaoPorcentagem = pct;
            toUpdate.push({ id: v.id, comissaoPorcentagem: pct });
          }
          return v;
        });

        if (toUpdate.length > 0) {
          console.log(
            `Migrating ${toUpdate.length} vendas to set comissaoPorcentagem...`,
          );
          Promise.all(
            toUpdate.map((upd) =>
              safeSupabaseUpdate(
                "vendas",
                { comissaoPorcentagem: upd.comissaoPorcentagem },
                "id",
                upd.id,
              ),
            ),
          ).catch((e) => console.error("Erro migrando % comissao:", e));
        }

        setVendasList(userFilters(allVendas));
      }
      if (resSaved.data) {
        const validReports = resSaved.data.filter(
          (r) => r.nome !== "___LOCAL_SYS_CONFIG___",
        );

        const reportsToUpdate = [];
        validReports.forEach((r) => {
          let changed = false;
          if (Array.isArray(r.dados)) {
            r.dados = r.dados.map((dado) => {
              const c = parseFloat(dado.comissao) || 0;
              const t = parseFloat(dado.valorTotal) || 0;
              if (
                t > 0 &&
                c > 0 &&
                (dado.comissaoPorcentagem === null ||
                  dado.comissaoPorcentagem === undefined ||
                  dado.comissaoPorcentagem === "")
              ) {
                dado.comissaoPorcentagem = String(Math.round((c / t) * 100));
                changed = true;
              }
              return dado;
            });
          }
          if (changed) {
            reportsToUpdate.push({ id: r.id, dados: r.dados });
          }
        });

        if (reportsToUpdate.length > 0) {
          Promise.all(
            reportsToUpdate.map((upd) =>
              safeSupabaseUpdate(
                "savedReports",
                { dados: upd.dados },
                "id",
                upd.id,
              ),
            ),
          ).catch((e) =>
            console.error("Erro migrando % comissao (reports):", e),
          );
        }

        const filtered = userFilters(validReports);
        console.log(
          "Loaded Saved Reports from Supabase:",
          validReports.length,
          "Filtered:",
          filtered.length,
          filtered,
        );
        setSavedReportsList(filtered);
      }
      if (resRep.data) {
        let parsedReports = resRep.data.map((r) => {
          let parceiro = r.parceiro || "";
          let codigoOperadora = r.codigoOperadora || "";
          let codOperadora = r.codOperadora || "";
          const match = parceiro.match(/^\[(.*?)\|(.*?)\] (.*)$/);
          if (match) {
            codigoOperadora = match[1];
            codOperadora = match[2];
            parceiro = match[3];
          }
          let notaFiscal = "";
          const nfMatch = parceiro.match(/ \(NF: (.*?)\)$/);
          if (nfMatch) {
            notaFiscal = nfMatch[1];
            parceiro = parceiro.replace(nfMatch[0], "");
          }
          if (codigoOperadora === "Geral") {
            codigoOperadora = "AMIL";
          }
          return {
            ...r,
            parceiro,
            codigoOperadora,
            codOperadora,
            id: r.id,
            ano: r.ano,
            mes: r.mes,
            categoria: r.categoria,
            empresa: r.empresa,
            date: r.date,
            fileName: r.fileName,
            filePath: r.filePath,
            notaFiscal,
          };
        });
        parsedReports = parsedReports.filter((r) => {
          let emp = (r.empresa || "").toUpperCase();
          if (!emp) emp = "PROTETTA";
          return emp === nomeEmpresaUpper || emp.includes(nomeEmpresaUpper);
        });
        setDbReports(parsedReports);
      }

      try {
        const { data: pData, error: pErr } = await supabase
          .from("print_presets")
          .select("*");
        let mergedPresets = new Map();

        // Add local presets to map
        const savedLocalStr = localStorage.getItem("protetta_print_presets");
        if (savedLocalStr) {
          try {
            const savedLocal = JSON.parse(savedLocalStr);
            if (Array.isArray(savedLocal)) {
              savedLocal.forEach((p) => mergedPresets.set(p.name, p));
            }
          } catch (e) {}
        }

        // Add sysConfig presets
        if (sysConfig.print_presets && Array.isArray(sysConfig.print_presets)) {
          sysConfig.print_presets.forEach((p) => mergedPresets.set(p.name, p));
        }

        // Add DB presets to map (override local if conflict)
        if (!pErr && pData && pData.length > 0) {
          pData.forEach((p) => mergedPresets.set(p.name, p));
        }

        const finalPresets = Array.from(mergedPresets.values());
        setPrintPresets(finalPresets);

        // Push local-only to DB
        if (finalPresets.length > 0) {
          supabase
            .from("print_presets")
            .upsert(finalPresets, { onConflict: "id" })
            .then(
              () => {},
              () => {},
            );
          syncGlobalSysConfigToDB(null, finalPresets);
        }
      } catch (e) {
        const saved = localStorage.getItem("protetta_print_presets");
        if (saved) setPrintPresets(JSON.parse(saved));
      }

      // Sync whatever was loaded/is local back to DB as fallback
      syncGlobalSysConfigToDB(null, null);

      if (currentUser) {
        let userPrefsRow = resSaved?.data?.find(
          (r) => r.nome === `___USER_PREFS_${currentUser.id}___`,
        );
        if (userPrefsRow) {
          let prefs = Array.isArray(userPrefsRow.dados)
            ? userPrefsRow.dados[0]
            : userPrefsRow.dados;
          if (prefs) {
            if (prefs.theme !== undefined)
              setIsDarkMode(prefs.theme === "dark" || prefs.theme === true);
            if (prefs.printCols) setPrintCols(prefs.printCols);
            if (prefs.vendasTableCols)
              setVendasTableCols(prefs.vendasTableCols);
            if (prefs.reportTableCols)
              setReportTableCols(prefs.reportTableCols);
            if (prefs.cols) setCols(prefs.cols);
            if (prefs.sidebar_width !== undefined) {
              localStorage.setItem(
                "protetta_sidebar_width",
                prefs.sidebar_width.toString(),
              );
              window.dispatchEvent(new Event("protetta_sidebar_sync")); // Custom event for Sidebar
            }
            if (prefs.sidebar_collapsed !== undefined) {
              localStorage.setItem(
                "protetta_sidebar_collapsed",
                prefs.sidebar_collapsed.toString(),
              );
              window.dispatchEvent(new Event("protetta_sidebar_sync"));
            }
          }
        }
      }
    } catch (err) {
      console.error("Erro ao carregar Supabase:", err);
    }
  };

  useEffect(() => {
    const initAdminSupabase = async () => {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .limit(1);
        if (error) {
          console.error("Supabase Error during init:", error);
        }
        if (data && data.length === 0) {
          const insertResponse = await supabase.from("users").insert([
            {
              username: "admin",
              password: "admin",
              role: "admin",
              permissions: SYSTEM_MODULES.map((m) => m.id),
            },
          ]);
          if (insertResponse.error) {
            console.error(
              "Supabase Error during admin insert:",
              insertResponse.error,
            );
          }
        }
      } catch (e) {
        console.error("Try-catch error during initAdminSupabase:", e);
      }
    };
    initAdminSupabase();
  }, []);

  const runMetadataMigration = async (force = false) => {
    if (!force && localStorage.getItem("don_gestao_metadata_migration_v6") === "completed") {
      return;
    }

    console.log("Iniciando migração de metadados dos clientes (Vidas, Vitalício, Corretor)...");
    if (force) {
      setLoading(true);
      setLoadingMsg("Sincronizando colunas Vitalício e Corretor no banco de dados...");
    }

    try {
      // 1. Fetch ALL vendas from Supabase
      const { data: vendas, error: errVendas } = await supabase.from("vendas").select("*");
      if (errVendas) throw errVendas;

      let vendasUpdated = 0;
      if (vendas && vendas.length > 0) {
        const vendasToUpdate = [];
        for (const venda of vendas) {
          const meta = findClientMetadata(venda.cliente, venda.contrato);
          if (meta) {
            let updated = false;
            const updateObj = {};

            // Update vidas
            if (meta.vidas && String(venda.vidas) !== String(meta.vidas) && meta.vidas !== "------") {
              updateObj.vidas = meta.vidas;
              updated = true;
            }

            // Update vitalicio
            if (meta.vitalicio && venda.vitalicio !== meta.vitalicio) {
              updateObj.vitalicio = meta.vitalicio;
              updated = true;
            }

            // Update corretor
            if (meta.corretor) {
              let mappedCorretor = meta.corretor;
              if (mappedCorretor.toUpperCase() === "ASSESSORIA") mappedCorretor = "Assessoria";
              else if (mappedCorretor.toUpperCase() === "PROTETTA") mappedCorretor = "Protetta";
              else if (mappedCorretor.toUpperCase() === "CORRETOR INTERNO") mappedCorretor = "Corretor Interno";

              if (venda.corretor !== mappedCorretor) {
                updateObj.corretor = mappedCorretor;
                updated = true;
              }
            }

            if (updated) {
              vendasToUpdate.push({ id: venda.id, ...updateObj });
            }
          }
        }

        if (vendasToUpdate.length > 0) {
          console.log(`Atualizando ${vendasToUpdate.length} vendas com novos metadados...`);
          for (const item of vendasToUpdate) {
            const { id, ...fields } = item;
            await safeSupabaseUpdate("vendas", fields, "id", id);
            vendasUpdated++;
          }
        }
      }

      // 2. Fetch ALL savedReports from Supabase
      const { data: savedReports, error: errReports } = await supabase.from("savedReports").select("*");
      if (errReports) throw errReports;

      let reportsUpdated = 0;
      if (savedReports && savedReports.length > 0) {
        for (const report of savedReports) {
          if (Array.isArray(report.dados)) {
            let reportChanged = false;
            const newDados = report.dados.map((dado) => {
              const meta = findClientMetadata(dado.cliente, dado.contrato);
              if (meta) {
                let rowChanged = false;
                const newRow = { ...dado };

                if (meta.vidas && String(newRow.vidas) !== String(meta.vidas) && meta.vidas !== "------") {
                  newRow.vidas = meta.vidas;
                  rowChanged = true;
                }
                if (meta.vitalicio && newRow.vitalicio !== meta.vitalicio) {
                  newRow.vitalicio = meta.vitalicio;
                  rowChanged = true;
                }
                if (meta.corretor) {
                  let mappedCorretor = meta.corretor;
                  if (mappedCorretor.toUpperCase() === "ASSESSORIA") mappedCorretor = "Assessoria";
                  else if (mappedCorretor.toUpperCase() === "PROTETTA") mappedCorretor = "Protetta";
                  else if (mappedCorretor.toUpperCase() === "CORRETOR INTERNO") mappedCorretor = "Corretor Interno";

                  if (newRow.vendedor !== mappedCorretor) {
                    newRow.vendedor = mappedCorretor;
                    rowChanged = true;
                  }
                  if (newRow.corretor !== mappedCorretor) {
                    newRow.corretor = mappedCorretor;
                    rowChanged = true;
                  }
                }

                if (rowChanged) {
                  reportChanged = true;
                  return newRow;
                }
              }
              return dado;
            });

            if (reportChanged) {
              await safeSupabaseUpdate("savedReports", { dados: newDados }, "id", report.id);
              reportsUpdated++;
            }
          }
        }
      }

      localStorage.setItem("don_gestao_metadata_migration_v6", "completed");
      console.log("Migração de metadados concluída com sucesso!");
      await loadFromDB();

      if (force) {
        showAlert(
          `Sincronização concluída com sucesso!\nForam atualizados: ${vendasUpdated} vendas e ${reportsUpdated} relatórios com os metadados corretos.`
        );
      }
    } catch (error) {
      console.error("Erro durante a migração de metadados:", error);
      if (force) {
        showAlert("Erro durante a sincronização: " + error.message);
      }
    } finally {
      if (force) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    runMetadataMigration(false);
  }, [vendasList.length]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showVendasAcoesMenu && !event.target.closest(".vendas-acoes-menu")) {
        setShowVendasAcoesMenu(false);
      }
      if (
        showVendasPeriodMenu &&
        !event.target.closest(".vendas-period-menu")
      ) {
        setShowVendasPeriodMenu(false);
      }
      if (showReportColsMenu && !event.target.closest(".report-cols-menu")) {
        setShowReportColsMenu(false);
      }
      if (showVendasColsMenu && !event.target.closest(".vendas-cols-menu")) {
        setShowVendasColsMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [
    showVendasAcoesMenu,
    showVendasPeriodMenu,
    showReportColsMenu,
    showVendasColsMenu,
  ]);

  useEffect(() => {
    if (!currentUser) return;
    const handleSidebarChanged = (e) => {
      const { width, collapsed } = e.detail;
      const prefs = {
        theme: isDarkMode ? "dark" : "light",
        printCols,
        vendasTableCols,
        reportTableCols,
        cols,
        sidebar_width: width,
        sidebar_collapsed: collapsed,
      };
      syncUserPrefsToDB(currentUser.id, prefs);
    };
    window.addEventListener("protetta_sidebar_changed", handleSidebarChanged);
    return () =>
      window.removeEventListener(
        "protetta_sidebar_changed",
        handleSidebarChanged,
      );
  }, [
    currentUser,
    isDarkMode,
    printCols,
    vendasTableCols,
    reportTableCols,
    cols,
  ]);

  useEffect(() => {
    if (!currentUser) return;
    const prefs = {
      theme: isDarkMode ? "dark" : "light",
      printCols,
      vendasTableCols,
      reportTableCols,
      cols,
    };
    const timeoutId = setTimeout(() => {
      const sidebarWidth = localStorage.getItem("protetta_sidebar_width");
      const sidebarCollapsed = localStorage.getItem(
        "protetta_sidebar_collapsed",
      );
      const finalPrefs = { ...prefs };
      if (sidebarWidth) finalPrefs.sidebar_width = parseInt(sidebarWidth, 10);
      if (sidebarCollapsed)
        finalPrefs.sidebar_collapsed = sidebarCollapsed === "true";

      syncUserPrefsToDB(currentUser.id, finalPrefs);
    }, 3000);
    return () => clearTimeout(timeoutId);
  }, [
    currentUser,
    isDarkMode,
    printCols,
    vendasTableCols,
    reportTableCols,
    cols,
  ]);

  useEffect(() => {
    async function migrateOperadorasVitalicio() {
      if (!supabase) return;
      const key = "operadoras_vitalicio_migrated_v2";
      if (localStorage.getItem(key)) return;

      try {
        const { data: savedReports, error } = await supabase.from('savedReports').select('*');
        if (error) throw error;
        
        let anyModified = false;
        
        for (const report of savedReports) {
          if (!report.dados || !Array.isArray(report.dados)) continue;
          
          let modified = false;
          const novosDados = report.dados.map(record => {
            const op = String(record.codigoOperadora || record.codOperadora || "").toUpperCase();
            if ((op === "HAPVIDA" || op === "MONGERAL") && record.vitalicio !== "Sim") {
              modified = true;
              return { ...record, vitalicio: "Sim" };
            }
            return record;
          });
          
          if (modified) {
            await supabase.from('savedReports').update({ dados: novosDados }).eq('id', report.id);
            anyModified = true;
          }
        }
        
        localStorage.setItem(key, "true");
        if (anyModified) {
          console.log("Records migrated to vitalicio='Sim'.");
          loadFromDB(); // Trigger a reload since data changed
        }
      } catch (err) {
        console.error("Migration error:", err);
      }
    }

    if (currentUser) {
      loadFromDB();
      migrateOperadorasVitalicio();
    }
  }, [currentUser, nomeEmpresaUpper]);

  // BACKUP AUTOMÁTICO
  const backupDataRef = useRef({
    clientes,
    savedReportsList,
    vendasList,
    usersList,
    dbReports,
  });
  useEffect(() => {
    backupDataRef.current = {
      clientes,
      savedReportsList,
      vendasList,
      usersList,
      dbReports,
    };
  }, [clientes, savedReportsList, vendasList, usersList, dbReports]);

  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(
      async () => {
        const data = backupDataRef.current;
        if (
          data.clientes.length === 0 &&
          data.savedReportsList.length === 0 &&
          data.vendasList.length === 0
        )
          return;
        try {
          const zip = new JSZip();
          zip.file("clientes.json", JSON.stringify(data.clientes, null, 2));
          zip.file(
            "historico_relatorios.json",
            JSON.stringify(data.savedReportsList, null, 2),
          );
          zip.file(
            "vendas_servicos.json",
            JSON.stringify(data.vendasList, null, 2),
          );
          zip.file(
            "utilizadores.json",
            JSON.stringify(
              data.usersList.map((u) => ({
                username: u.username,
                role: u.role,
              })),
              null,
              2,
            ),
          );
          zip.file(
            "arquivos_extratos.json",
            JSON.stringify(data.dbReports, null, 2),
          );

          const content = await zip.generateAsync({ type: "blob" });

          const now = new Date();
          const timeStr = `${String(now.getHours()).padStart(2, "0")}h${String(now.getMinutes()).padStart(2, "0")}m`;
          const empStr = nomeEmpresaUpper.replace(/[^A-Z0-9]/gi, "_");
          const filename = `backups/${empStr}_AutoBackup_${dataDeHojeInterna()}_${timeStr}.zip`;

          if (supabase) {
            const { error: uploadErr } = await supabase.storage
              .from("arquivos_extratos")
              .upload(filename, content, {
                contentType: "application/zip",
                upsert: true,
              });
            if (uploadErr) {
              console.error("Auto backup upload falhou", uploadErr);
            } else {
              console.log("Backup automático guardado na nuvem:", filename);
            }
          }
        } catch (err) {
          console.error("Auto backup falhou", err);
        }
      },
      15 * 60 * 1000,
    ); // 15 minutos

    return () => clearInterval(interval);
  }, [currentUser, nomeEmpresaUpper, supabase]);

  useEffect(() => {
    if (currentView === "settings") {
      fetchBackups();
    }
  }, [currentView, nomeEmpresaUpper, supabase]);

  const handleRestoreBackup = (filename) => {
    showConfirm(
      `Tem a certeza que deseja restaurar o backup ${filename}? ISTO SUBSTITUIRÁ TODOS OS DADOS ATUAIS DA LOJA.`,
      async () => {
        setLoading(true);
        setLoadingMsg("A descarregar backup...");
        try {
          const { data: fileBlob, error } = await supabase.storage
            .from("arquivos_extratos")
            .download(`backups/${filename}`);
          if (error) throw error;

          setLoadingMsg("A restaurar banco de dados...");
          const zip = new JSZip();
          const unzipped = await zip.loadAsync(fileBlob);

          const clientesFile = unzipped.file("clientes.json");
          const historicoFile = unzipped.file("historico_relatorios.json");
          const vendasFile = unzipped.file("vendas_servicos.json");
          const extratosFile = unzipped.file("arquivos_extratos.json");

          // Clear existing first
          await supabase
            .from("vendas")
            .delete()
            .ilike("loja", `%${nomeEmpresaUpper}%`);
          await supabase.from("savedReports").delete().neq("id", 0);
          await supabase.from("clientes").delete().neq("id", 0);
          await supabase.from("reports").delete().neq("id", 0);

          if (clientesFile) {
            const parsedData = JSON.parse(await clientesFile.async("text"));
            const data = parsedData.map((c) => {
              return c;
            });
            if (data.length > 0) await supabase.from("clientes").upsert(data);
          }
          if (historicoFile) {
            const parsedData = JSON.parse(await historicoFile.async("text"));
            const data = parsedData.map((r) => {
              return r;
            });
            if (data.length > 0)
              await supabase.from("savedReports").upsert(data);
          }
          if (vendasFile) {
            const data = JSON.parse(await vendasFile.async("text"));
            if (data.length > 0) await supabase.from("vendas").upsert(data);
          }
          if (extratosFile) {
            const parsedData = JSON.parse(await extratosFile.async("text"));
            // Be careful not to overwrite global reports, so only restore current empresa
            const myReports = parsedData
              .filter(
                (r) =>
                  (r.empresa || "").toUpperCase() === nomeEmpresaUpper ||
                  (r.empresa || "").toUpperCase().includes(nomeEmpresaUpper),
              )
              .map((r) => {
                return r;
              });
            if (myReports.length > 0)
              await supabase.from("reports").upsert(myReports);
          }

          await loadFromDB();
          showAlert("Backup restaurado com sucesso!");
        } catch (err) {
          console.error(err);
          showAlert("Erro ao restaurar backup: " + err.message);
        } finally {
          setLoading(false);
        }
      },
    );
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("protetta_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("protetta_theme", "light");
    }
  }, [isDarkMode]);

  useEffect(() => {
    setClientesCurrentPage(1);
  }, [filtroNomeCliente, filtrosCli]);

  const applyLoginSession = (sessionUser) => {
    setCurrentUser(sessionUser);
    if (loginData.rememberMe) {
      localStorage.setItem("protetta_auth_user", JSON.stringify(sessionUser));
    } else {
      sessionStorage.setItem("protetta_auth_user", JSON.stringify(sessionUser));
    }
    setLoginError("");
    setLoginData({ user: "", password: "", rememberMe: false });
    setShowPassword(false);

    if (
      sessionUser.role !== "admin" &&
      sessionUser.role !== "master" &&
      !sessionUser.permissions.includes("dashboard")
    ) {
      if (sessionUser.permissions.length > 0)
        setCurrentView(sessionUser.permissions[0]);
    } else {
      setCurrentView("dashboard");
    }
  };

  const performTermsCheckAndLogin = async (sessionUser, dbUser = null) => {
    if (sessionUser.username === "Donfim") {
      applyLoginSession(sessionUser);
      setLoading(false);
      return;
    }
    try {
      const { data: actTerms } = await supabase
        .from("lgpd_terms_versions")
        .select("id, version")
        .eq("status", "active")
        .limit(1);
      if (!actTerms || actTerms.length === 0) {
        setPendingTermsUser(sessionUser);
        setLoading(false);
        return;
      }

      if (actTerms && actTerms.length > 0) {
        const termId = actTerms[0].id;

        // For regular users, check dbUser.must_accept_terms if available
        if (dbUser && dbUser.must_accept_terms === true) {
          setPendingTermsUser(sessionUser);
          setLoading(false);
          return;
        }

        // Verify explicitly if they accepted this active term in DB
        const { data: accs } = await supabase
          .from("lgpd_acceptances")
          .select("id")
          .eq("term_version_id", termId)
          .eq("username", sessionUser.username)
          .limit(1);
        if (!accs || accs.length === 0) {
          setPendingTermsUser(sessionUser);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.error("Erro validando termos. Ignorando para fallback...", e);
    }
    applyLoginSession(sessionUser);
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoadingMsg("Autenticando...");
    try {
      const { data: users, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", loginData.user);

      // Master login fallback
      if (loginData.user === "Donfim" && loginData.password === "121418") {
        const sessionUser = {
          id: 99999,
          username: "Donfim",
          role: "master",
          permissions: SYSTEM_MODULES ? SYSTEM_MODULES.map((m) => m.id) : [],
          empresa: "Todas",
        };
        await performTermsCheckAndLogin(sessionUser);
        return;
      }

      // Default hardcoded admin fallback if DB fails or is unconfigured
      if (loginData.user === "admin" && loginData.password === "admin") {
        if (error)
          console.error("Supabase Error (falling back to local admin):", error);
        const sessionUser = {
          id: 1,
          username: "admin",
          role: "admin",
          permissions: SYSTEM_MODULES ? SYSTEM_MODULES.map((m) => m.id) : [],
        };
        await performTermsCheckAndLogin(sessionUser);
        return;
      }

      if (error) {
        console.error("Supabase Error:", error);
        setLoginError("Erro DB: " + error.message);
        setLoading(false);
      } else if (
        users &&
        users.length > 0 &&
        users[0].password === loginData.password
      ) {
        const user = users[0];
        const sessionUser = {
          id: user.id,
          username: user.username,
          role: user.role,
          permissions: user.permissions || [],
          empresa: user.empresa,
        };
        await performTermsCheckAndLogin(sessionUser, user);
      } else {
        setLoginError("Credenciais inválidas.");
        setLoading(false);
      }
    } catch (err) {
      setLoginError("Erro de conexão: " + err.message);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    showConfirm("Tem a certeza que deseja terminar a sessão?", () => {
      setCurrentUser(null);
      setSelectedEmpresaOverride("");
      localStorage.removeItem("protetta_auth_user");
      localStorage.removeItem("protetta_selected_empresa");
      sessionStorage.removeItem("protetta_auth_user");
      setCurrentView("dashboard");
    });
  };

  // --- FUNÇÕES DE LÓGICA ---
  const applyDatePreset = (preset) => {
    let start = "";
    let end = "";
    const today = new Date();
    const formatDate = (date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    switch (preset) {
      case "Hoje":
        start = formatDate(today);
        end = formatDate(today);
        break;
      case "Esta semana":
        const first = today.getDate() - today.getDay();
        start = formatDate(
          new Date(today.getFullYear(), today.getMonth(), first),
        );
        end = formatDate(
          new Date(today.getFullYear(), today.getMonth(), first + 6),
        );
        break;
      case "Mês passado":
        start = formatDate(
          new Date(today.getFullYear(), today.getMonth() - 1, 1),
        );
        end = formatDate(new Date(today.getFullYear(), today.getMonth(), 0));
        break;
      case "Este mês":
        start = formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
        end = formatDate(
          new Date(today.getFullYear(), today.getMonth() + 1, 0),
        );
        break;
      case "Próximo mês":
        start = formatDate(
          new Date(today.getFullYear(), today.getMonth() + 1, 1),
        );
        end = formatDate(
          new Date(today.getFullYear(), today.getMonth() + 2, 0),
        );
        break;
      case "Todo o período":
      default:
        start = "";
        end = "";
        break;
    }
    setVendasPeriodLabel(preset);
    setShowVendasPeriodMenu(false);
    if (preset === "Escolha o período") {
      setShowVendasFilter(true);
    } else {
      const updatedFilters = {
        ...vendasFilterForm,
        dataInicio: start,
        dataFim: end,
      };
      setVendasFilterForm(updatedFilters);
      setAppliedVendasFilters(updatedFilters);
    }
  };

  const applyGestorDatePreset = (preset) => {
    let start = "";
    let end = "";
    const today = new Date();
    const formatDate = (date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    switch (preset) {
      case "Hoje":
        start = formatDate(today);
        end = formatDate(today);
        break;
      case "Esta semana":
        const first = today.getDate() - today.getDay();
        start = formatDate(
          new Date(today.getFullYear(), today.getMonth(), first),
        );
        end = formatDate(
          new Date(today.getFullYear(), today.getMonth(), first + 6),
        );
        break;
      case "Mês passado":
        start = formatDate(
          new Date(today.getFullYear(), today.getMonth() - 1, 1),
        );
        end = formatDate(new Date(today.getFullYear(), today.getMonth(), 0));
        break;
      case "Este mês":
        start = formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
        end = formatDate(
          new Date(today.getFullYear(), today.getMonth() + 1, 0),
        );
        break;
      case "Próximo mês":
        start = formatDate(
          new Date(today.getFullYear(), today.getMonth() + 1, 1),
        );
        end = formatDate(
          new Date(today.getFullYear(), today.getMonth() + 2, 0),
        );
        break;
      case "Todo o período":
      default:
        start = "";
        end = "";
        break;
    }
    setGestorPeriodLabel(preset);
    setShowGestorPeriodMenu(false);
    if (preset !== "Escolha o período") {
      setGestorReportsDateStart(start);
      setGestorReportsDateEnd(end);
    }
  };

  const applySavedReportsDatePreset = (preset) => {
    let start = "";
    let end = "";
    const today = new Date();
    const formatDate = (date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    switch (preset) {
      case "Hoje":
        start = formatDate(today);
        end = formatDate(today);
        break;
      case "Esta semana":
        const first = today.getDate() - today.getDay();
        start = formatDate(
          new Date(today.getFullYear(), today.getMonth(), first),
        );
        end = formatDate(
          new Date(today.getFullYear(), today.getMonth(), first + 6),
        );
        break;
      case "Mês passado":
        start = formatDate(
          new Date(today.getFullYear(), today.getMonth() - 1, 1),
        );
        end = formatDate(new Date(today.getFullYear(), today.getMonth(), 0));
        break;
      case "Este mês":
        start = formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
        end = formatDate(
          new Date(today.getFullYear(), today.getMonth() + 1, 0),
        );
        break;
      case "Próximo mês":
        start = formatDate(
          new Date(today.getFullYear(), today.getMonth() + 1, 1),
        );
        end = formatDate(
          new Date(today.getFullYear(), today.getMonth() + 2, 0),
        );
        break;
      case "Todo o período":
      default:
        start = "";
        end = "";
        break;
    }
    setSavedReportsPeriodLabel(preset);
    setShowSavedReportsPeriodMenu(false);
    if (preset !== "Escolha o período") {
      setSavedReportsDateStart(start);
      setSavedReportsDateEnd(end);
    }
  };

  const handleSavedReportsSort = (field) => {
    if (savedReportsSortField === field) {
      setSavedReportsSortDirection(savedReportsSortDirection === "asc" ? "desc" : "asc");
    } else {
      setSavedReportsSortField(field);
      setSavedReportsSortDirection("asc");
    }
  };

  const getSavedReportsSortIcon = (field) => {
    if (savedReportsSortField !== field) {
      return <ArrowUpDown size={12} className="inline opacity-30 ml-1" />;
    }
    return savedReportsSortDirection === "asc" ? (
      <ArrowUp size={12} className="inline ml-1 text-indigo-500" />
    ) : (
      <ArrowDown size={12} className="inline ml-1 text-indigo-500" />
    );
  };

  const applyModalArquivosDatePreset = (preset) => {
    let start = "";
    let end = "";
    const today = new Date();
    const formatDate = (date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    switch (preset) {
      case "Hoje":
        start = formatDate(today);
        end = formatDate(today);
        break;
      case "Esta semana":
        const first = today.getDate() - today.getDay();
        start = formatDate(
          new Date(today.getFullYear(), today.getMonth(), first),
        );
        end = formatDate(
          new Date(today.getFullYear(), today.getMonth(), first + 6),
        );
        break;
      case "Mês passado":
        start = formatDate(
          new Date(today.getFullYear(), today.getMonth() - 1, 1),
        );
        end = formatDate(new Date(today.getFullYear(), today.getMonth(), 0));
        break;
      case "Este mês":
        start = formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
        end = formatDate(
          new Date(today.getFullYear(), today.getMonth() + 1, 0),
        );
        break;
      case "Próximo mês":
        start = formatDate(
          new Date(today.getFullYear(), today.getMonth() + 1, 1),
        );
        end = formatDate(
          new Date(today.getFullYear(), today.getMonth() + 2, 0),
        );
        break;
      case "Todo o período":
      default:
        start = "";
        end = "";
        break;
    }
    setModalArquivosPeriodLabel(preset);
    setShowModalArquivosPeriodMenu(false);
    if (preset !== "Escolha o período") {
      setModalArquivosDateStart(start);
      setModalArquivosDateEnd(end);
      setModalArquivosPath([]);
    }
  };

  const handleBuscarVendas = () => {
    setAppliedVendasFilters({ ...vendasFilterForm });
  };
  const handleLimparVendas = () => {
    setVendasFilterForm(defaultVendasFilters);
    setAppliedVendasFilters(null);
    setVendasPeriodLabel("Todo o período");
  };

  const getAllVendas = (
    vendasBase = vendasList,
    reportsBase = savedReportsList,
  ) => {
    let todasAsVendas = (vendasBase || []).map((v) => {
      let incNotas = "";
      let incFaltNotas = "";
      let incResolvida = false;
      let incFaltResolvida = false;
      let cleanNotas = v.notas || "";

      if (v.notas && v.notas.includes("[INCONSISTENCIA:")) {
        const match = v.notas.match(/\[INCONSISTENCIA:({.*?})\]/);
        if (match) {
          try {
            const parsed = JSON.parse(match[1]);
            incNotas = parsed.notas || "";
            incFaltNotas = parsed.falt_notes || parsed.falt_notas || "";
            incResolvida = !!parsed.resolvida;
            incFaltResolvida = !!parsed.falt_resolvida;
            cleanNotas = v.notas.replace(/\[INCONSISTENCIA:({.*?})\]/, "").trim();
          } catch(e) {}
        }
      }

      return {
        ...v,
        notas: cleanNotas,
        inconsistenciaNotas: incNotas,
        inconsistenciaFaltFaltaNotas: incFaltNotas,
        inconsistenciaResolvida: incResolvida,
        inconsistenciaFaltFaltaResolvida: incFaltResolvida,
      };
    });

    (reportsBase || []).forEach((report) => {
      if (report.dados && Array.isArray(report.dados)) {
        report.dados.forEach((dado, idx) => {
          todasAsVendas.push({
            id: `rep_${report.id}_${idx}`,
            isFromReport: true,
            reportId: report.id,
            reportRowIndex: idx,
            reportNome: report.nome || "",
            reportPeriodo: report.periodo || "",
            reportDataCriacao: report.dataCriacao || "",
            numero: dado.cod,
            cliente: dado.cliente,
            dataVenda:
              dado.data &&
              dado.data.includes("-") &&
              dado.data.split("-")[0].length === 4
                ? dado.data
                : dado.data && dado.data.includes("/")
                  ? dado.data.split("/").reverse().join("-")
                  : report.dataCriacao
                    ? report.dataCriacao.split("T")[0]
                    : dataDeHojeInterna(),
            situacao: dado.situacao,
            loja: dado.loja,
            valor: dado.valorTotal,
            parcela: dado.parcela || "",
            corretor: dado.vendedor || "",
            inicioVigencia: dado.inicioVigencia || "",
            notaFiscal: dado.notaFiscal || "",
            contrato: dado.contrato || "",
            codigoOperadora: dado.codigoOperadora || "AMIL",
            vidas: dado.vidas || "",
            vitalicio: dado.vitalicio || "",
            assessoria: dado.assessoria || nomeEmpresa,
            formaPagamento:
              dado.formaPagamento ||
              (nomeEmpresaUpper === "PROPER"
                ? "Dinheiro à vista"
                : "Crédito em conta"),
            servico: dado.servico || "",
            desconto: dado.desconto || "",
            notas: dado.notas || "",
            comissao: dado.comissao || 0,
            comissaoPorcentagem: dado.comissaoPorcentagem || "",
            inconsistenciaNotas: dado.inconsistenciaNotas || "",
            inconsistenciaFaltFaltaNotas: dado.inconsistenciaFaltFaltaNotas || "",
            inconsistenciaResolvida: dado.inconsistenciaResolvida || false,
            inconsistenciaFaltFaltaResolvida: dado.inconsistenciaFaltFaltaResolvida || false,
          });
        });
      }
    });
    return todasAsVendas;
  };

  const getFilteredVendas = () => {
    let todasAsVendas = getAllVendas();

    if (appliedVendasFilters) {
      const f = appliedVendasFilters;
      if (f.loja && f.loja !== "Todos")
        todasAsVendas = todasAsVendas.filter((v) => matchesCommaSeparated(v.loja, f.loja, true));
      if (f.situacao && f.situacao !== "Todos")
        todasAsVendas = todasAsVendas.filter((v) => matchesCommaSeparated(v.situacao, f.situacao, true));
      if (f.codigo)
        todasAsVendas = todasAsVendas.filter((v) => matchesCommaSeparated(v.numero, f.codigo));
      if (f.cliente)
        todasAsVendas = todasAsVendas.filter((v) => matchesCommaSeparated(v.cliente, f.cliente));
      if (f.contrato)
        todasAsVendas = todasAsVendas.filter((v) => matchesCommaSeparated(v.contrato, f.contrato));
      if (f.codigoOperadora)
        todasAsVendas = todasAsVendas.filter((v) => matchesCommaSeparated(v.codigoOperadora, f.codigoOperadora));
      if (f.notaFiscal)
        todasAsVendas = todasAsVendas.filter((v) => matchesCommaSeparated(v.notaFiscal, f.notaFiscal));
      if (f.parcela)
        todasAsVendas = todasAsVendas.filter((v) => matchesCommaSeparated(v.parcela, f.parcela));
      if (f.inicioVigenciaInicio)
        todasAsVendas = todasAsVendas.filter(
          (v) => v.inicioVigencia >= f.inicioVigenciaInicio,
        );
      if (f.inicioVigenciaFim)
        todasAsVendas = todasAsVendas.filter(
          (v) => v.inicioVigencia <= f.inicioVigenciaFim,
        );
      if (f.vidas)
        todasAsVendas = todasAsVendas.filter((v) => matchesCommaSeparated(v.vidas, f.vidas, true));
      if (f.vitalicio && f.vitalicio !== "Selecione")
        todasAsVendas = todasAsVendas.filter((v) => matchesCommaSeparated(v.vitalicio, f.vitalicio, true));
      if (f.corretor && f.corretor !== "Todos")
        todasAsVendas = todasAsVendas.filter((v) => matchesCommaSeparated(v.corretor, f.corretor, true));
      if (f.dataInicio)
        todasAsVendas = todasAsVendas.filter(
          (v) => v.dataVenda >= f.dataInicio,
        );
      if (f.dataFim)
        todasAsVendas = todasAsVendas.filter((v) => v.dataVenda <= f.dataFim);
    }

    todasAsVendas.sort((a, b) => {
      let valA = a[vendasSortConfig.key];
      let valB = b[vendasSortConfig.key];

      if (valA === null || valA === undefined) valA = "";
      if (valB === null || valB === undefined) valB = "";

      if (
        vendasSortConfig.key === "dataVenda" ||
        vendasSortConfig.key === "inicioVigencia"
      ) {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      } else if (
        vendasSortConfig.key === "valor" ||
        vendasSortConfig.key === "vidas"
      ) {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      } else {
        valA = valA.toString().toLowerCase();
        valB = valB.toString().toLowerCase();
      }

      if (valA < valB) return vendasSortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return vendasSortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return todasAsVendas;
  };

  const handleSortVendas = (key) => {
    let direction = "asc";
    if (vendasSortConfig.key === key && vendasSortConfig.direction === "asc") {
      direction = "desc";
    }
    setVendasSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (vendasSortConfig.key !== key) return null;
    return (
      <ChevronDown
        size={14}
        className={`inline ml-1 transition-transform ${vendasSortConfig.direction === "asc" ? "rotate-180" : ""}`}
      />
    );
  };

  const displayedVendas = getFilteredVendas();
  
  const isShowAllVendas = vendasPerPage === "Todos";
  const totalPagesVendas = isShowAllVendas
    ? 1
    : Math.ceil(displayedVendas.length / vendasPerPage);
  const indexOfLastVenda = isShowAllVendas
    ? displayedVendas.length
    : vendasCurrentPage * vendasPerPage;
  const indexOfFirstVenda = isShowAllVendas
    ? 0
    : indexOfLastVenda - vendasPerPage;
  const currentVendas = displayedVendas.slice(
    indexOfFirstVenda,
    indexOfLastVenda,
  );
  
  let displayPeriodLabel = vendasPeriodLabel;
  if (
    vendasPeriodLabel === "Escolha o período" &&
    appliedVendasFilters?.dataInicio &&
    appliedVendasFilters?.dataFim
  ) {
    displayPeriodLabel = `${formatarDataVisivel(appliedVendasFilters.dataInicio)} - ${formatarDataVisivel(appliedVendasFilters.dataFim)}`;
  } else if (vendasPeriodLabel === "Escolha o período") {
    displayPeriodLabel = "Período Customizado";
  }

  const exportarVendasParaExcel = () => {
    const dadosTratados = displayedVendas.map((v) => ({
      "Nº Registo": v.numero || "-",
      Contrato: v.contrato || "-",
      Cliente: v.cliente,
      Data: formatarDataVisivel(v.dataVenda),
      Situação: v.situacao,
      "Loja/Assessoria": `${v.loja} - ${v.assessoria || ""}`,
      Corretor: v.corretor,
      Serviço: v.servico,
      Operadora: v.codigoOperadora,
      Parcela: v.parcela,
      Vidas: v.vidas,
      "Nota Fiscal": v.notaFiscal || "Sem NF",
      "Valor (R$)": v.valor,
      "Comissão (R$)": v.comissao,
      Notas: v.notas || "-",
    }));
    const ws = XLSX.utils.json_to_sheet(dadosTratados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatorio_Vendas");
    XLSX.writeFile(wb, `DonGestao_Vendas_${dataDeHojeInterna()}.xlsx`);
    setShowVendasAcoesMenu(false);
  };

  const displayedReports = savedReportsList.filter((rep) => {
    let textMatch = true;
    if (savedReportsSearchTerm) {
      const parts = String(savedReportsSearchTerm).split(',').map(p => p.trim()).filter(Boolean);
      if (parts.length > 0) {
        textMatch = parts.some(part => {
          const term = part.toLowerCase();
          const nfs = Array.from(
            new Set(
              (rep.dados || [])
                .map((d) => d.notaFiscal)
                .filter(Boolean),
            ),
          ).join(" ").toLowerCase();
          const ops = Array.from(
            new Set(
              (rep.dados || [])
                .map((d) => d.codigoOperadora)
                .filter(Boolean),
            ),
          ).join(" ").toLowerCase();
          return (rep.nome || "").toLowerCase().includes(term) ||
            (rep.periodo || "").toLowerCase().includes(term) ||
            (rep.criadoPor || "").toLowerCase().includes(term) ||
            nfs.includes(term) ||
            ops.includes(term);
        });
      }
    }
    let startMatch = true;
    let endMatch = true;
    if (savedReportsDateStart)
      startMatch =
        new Date(rep.dataCriacao) >=
        new Date(savedReportsDateStart + "T00:00:00");
    if (savedReportsDateEnd)
      endMatch =
        new Date(rep.dataCriacao) <=
        new Date(savedReportsDateEnd + "T23:59:59");
        
    let colMatch = true;
    if (filterSavedReportsData) {
      const dateStr = (new Date(rep.dataCriacao).toLocaleDateString("pt-PT") + " às " + new Date(rep.dataCriacao).toLocaleTimeString("pt-PT").slice(0, 5)).toLowerCase();
      if (!matchesCommaSeparated(dateStr, filterSavedReportsData)) colMatch = false;
    }
    if (filterSavedReportsNome) {
      if (!matchesCommaSeparated(rep.nome || "", filterSavedReportsNome)) colMatch = false;
    }
    if (filterSavedReportsPeriodo) {
      if (!matchesCommaSeparated(rep.periodo || "", filterSavedReportsPeriodo)) colMatch = false;
    }
    if (filterSavedReportsNf) {
      const nfs = Array.from(new Set((rep.dados || []).map(d => d.notaFiscal).filter(Boolean))).join(", ").toLowerCase();
      if (!matchesCommaSeparated(nfs, filterSavedReportsNf)) colMatch = false;
    }
    if (filterSavedReportsOperadora) {
      const ops = Array.from(new Set((rep.dados || []).map(d => d.codigoOperadora).filter(Boolean))).join(", ").toLowerCase();
      if (!matchesCommaSeparated(ops, filterSavedReportsOperadora)) colMatch = false;
    }

    return textMatch && startMatch && endMatch && colMatch;
  });

  const parsePeriodoDate = (periodoStr, fallbackDate) => {
    if (!periodoStr) return fallbackDate ? new Date(fallbackDate) : new Date(0);
    const normalized = String(periodoStr).toLowerCase().trim();

    // Try parsing standard DD/MM/YYYY
    const dmyMatch = normalized.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (dmyMatch) {
      return new Date(parseInt(dmyMatch[3], 10), parseInt(dmyMatch[2], 10) - 1, parseInt(dmyMatch[1], 10));
    }

    // Try parsing MM/YYYY
    const myMatch = normalized.match(/(\d{2})\/(\d{4})/);
    if (myMatch) {
      return new Date(parseInt(myMatch[2], 10), parseInt(myMatch[1], 10) - 1, 1);
    }

    // Month text parsing
    const monthsPt = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const monthsShortPt = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

    const yearMatch = normalized.match(/\b(20\d{2})\b/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : (fallbackDate ? new Date(fallbackDate).getFullYear() : new Date().getFullYear());

    for (let i = 0; i < 12; i++) {
      if (normalized.includes(monthsPt[i]) || normalized.includes(monthsShortPt[i])) {
        return new Date(year, i, 1);
      }
    }

    return fallbackDate ? new Date(fallbackDate) : new Date(0);
  };

  const parseDateFromName = (nameStr, fallbackDate) => {
    if (!nameStr) return fallbackDate ? new Date(fallbackDate) : new Date(0);
    const normalized = String(nameStr).toLowerCase().trim();

    // Try parsing standard DD/MM/YYYY (e.g., 01/01/2026)
    const dmyMatch = normalized.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dmyMatch) {
      return new Date(parseInt(dmyMatch[3], 10), parseInt(dmyMatch[2], 10) - 1, parseInt(dmyMatch[1], 10));
    }

    // Try parsing DD/MM/YY (e.g., 01/01/26)
    const dmyShortMatch = normalized.match(/(\d{1,2})\/(\d{1,2})\/(\d{2})\b/);
    if (dmyShortMatch) {
      let year = parseInt(dmyShortMatch[3], 10);
      year = year < 50 ? 2000 + year : 1900 + year; // handle standard 2-digit years
      return new Date(year, parseInt(dmyShortMatch[2], 10) - 1, parseInt(dmyShortMatch[1], 10));
    }

    // Try parsing MM/YYYY
    const myMatch = normalized.match(/(\d{1,2})\/(\d{4})/);
    if (myMatch) {
      return new Date(parseInt(myMatch[2], 10), parseInt(myMatch[1], 10) - 1, 1);
    }

    // Try parsing MM/YY
    const myShortMatch = normalized.match(/\b(\d{1,2})\/(\d{2})\b/);
    if (myShortMatch) {
      let year = parseInt(myShortMatch[2], 10);
      year = year < 50 ? 2000 + year : 1900 + year;
      return new Date(year, parseInt(myShortMatch[1], 10) - 1, 1);
    }

    // Try portuguese months
    const monthsPt = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const monthsShortPt = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

    const yearMatch = normalized.match(/\b(20\d{2})\b/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : (fallbackDate ? new Date(fallbackDate).getFullYear() : new Date().getFullYear());

    for (let i = 0; i < 12; i++) {
      if (normalized.includes(monthsPt[i]) || normalized.includes(monthsShortPt[i])) {
        return new Date(year, i, 1);
      }
    }

    return fallbackDate ? new Date(fallbackDate) : new Date(0);
  };

  displayedReports.sort((a, b) => {
    let valA;
    let valB;

    if (savedReportsSortField === "notaFiscal") {
      valA = Array.from(new Set((a.dados || []).map(d => d.notaFiscal).filter(Boolean))).join(", ");
      valB = Array.from(new Set((b.dados || []).map(d => d.notaFiscal).filter(Boolean))).join(", ");
    } else if (savedReportsSortField === "operadora") {
      valA = Array.from(new Set((a.dados || []).map(d => d.codigoOperadora).filter(Boolean))).join(", ");
      valB = Array.from(new Set((b.dados || []).map(d => d.codigoOperadora).filter(Boolean))).join(", ");
    } else if (savedReportsSortField === "registos") {
      valA = (a.dados || []).length;
      valB = (b.dados || []).length;
    } else {
      valA = a[savedReportsSortField];
      valB = b[savedReportsSortField];
    }

    valA = valA || "";
    valB = valB || "";

    let comparison = 0;
    if (savedReportsSortField === "dataCriacao") {
      comparison = new Date(valA).getTime() - new Date(valB).getTime();
    } else if (savedReportsSortField === "registos") {
       comparison = Number(valA) - Number(valB);
    } else if (savedReportsSortField === "periodo") {
       comparison = parsePeriodoDate(valA, a.dataCriacao).getTime() - parsePeriodoDate(valB, b.dataCriacao).getTime();
    } else if (savedReportsSortField === "nome") {
       const dateA = parseDateFromName(valA, a.dataCriacao);
       const dateB = parseDateFromName(valB, b.dataCriacao);
       comparison = dateA.getTime() - dateB.getTime();
       if (comparison === 0) {
         comparison = String(valA).localeCompare(String(valB));
       }
    } else {
      comparison = String(valA).localeCompare(String(valB));
    }

    return savedReportsSortDirection === "asc" ? comparison : -comparison;
  });

  const isShowAllSavedReports = savedReportsPerPage === "Todos";
  const totalPagesSavedReports = isShowAllSavedReports
    ? 1
    : Math.ceil(displayedReports.length / savedReportsPerPage);
  const indexOfLastSavedReport = isShowAllSavedReports
    ? displayedReports.length
    : savedReportsCurrentPage * savedReportsPerPage;
  const indexOfFirstSavedReport = isShowAllSavedReports
    ? 0
    : indexOfLastSavedReport - savedReportsPerPage;
  const currentSavedReports = displayedReports.slice(
    indexOfFirstSavedReport,
    indexOfLastSavedReport,
  );

  const toggleAllSavedReports = () => {
    const idsPagina = currentSavedReports.map((r) => r.id);
    const allSelected = idsPagina.every((id) =>
      selectedSavedReports.includes(id),
    );
    if (allSelected) {
      setSelectedSavedReports(
        selectedSavedReports.filter(
          (id) => !idsPagina.includes(id),
        ),
      );
    } else {
      const onlyNewIds = idsPagina.filter(
        (id) => !selectedSavedReports.includes(id),
      );
      setSelectedSavedReports([
        ...selectedSavedReports,
        ...onlyNewIds,
      ]);
    }
  };

  const isAllSavedReportsSelected =
    currentSavedReports.length > 0 &&
    currentSavedReports.every((r) =>
      selectedSavedReports.includes(r.id),
    );

  const reorganizarRegistosVendas = async () => {
    showConfirm(
      "ATENÇÃO: Deseja reorganizar todos os números de registo de vendas por ordem de data, começando do 00001? Isso atualizará o número de todas as vendas e relatórios salvos. Recomenda-se realizar o backup antes desta operação.",
      async () => {
        setLoading(true);
        setLoadingMsg("Reorganizando registos...");
        try {
          let combined = [];
          vendasList.forEach((v) => {
            combined.push({
              type: "venda",
              id: v.id,
              dataVenda: v.dataVenda || "1970-01-01",
              item: v,
            });
          });
          savedReportsList.forEach((rep) => {
            if (rep.dados && Array.isArray(rep.dados)) {
              rep.dados.forEach((dado, idx) => {
                combined.push({
                  type: "report",
                  reportId: rep.id,
                  reportIndex: idx,
                  dataVenda: dado.dataVenda || dado.data || "1970-01-01",
                  item: dado,
                });
              });
            }
          });

          // Sort by dataVenda ASC
          combined.sort(
            (a, b) => new Date(a.dataVenda) - new Date(b.dataVenda),
          );

          let counter = 1;
          const vendasUpdates = [];
          const reportsUpdatesMap = new Map();

          const updatedReportsDados = {};
          savedReportsList.forEach((rep) => {
            if (rep.dados && Array.isArray(rep.dados)) {
              updatedReportsDados[rep.id] = [...rep.dados];
            }
          });

          combined.forEach((obj) => {
            const newCode = String(counter++).padStart(5, "0");
            if (obj.type === "venda") {
              if (obj.item.numero !== newCode) {
                vendasUpdates.push({ id: obj.id, numero: newCode });
              }
            } else if (obj.type === "report") {
              const currentCode =
                updatedReportsDados[obj.reportId][obj.reportIndex].numero ||
                updatedReportsDados[obj.reportId][obj.reportIndex].cod;
              if (currentCode !== newCode) {
                updatedReportsDados[obj.reportId][obj.reportIndex].numero =
                  newCode;
                updatedReportsDados[obj.reportId][obj.reportIndex].cod =
                  newCode;
                reportsUpdatesMap.set(
                  obj.reportId,
                  updatedReportsDados[obj.reportId],
                );
              }
            }
          });

          for (let v of vendasUpdates) {
            await safeSupabaseUpdate(
              "vendas",
              { numero: v.numero },
              "id",
              v.id,
            );
          }
          for (let [rId, newDados] of reportsUpdatesMap.entries()) {
            await safeSupabaseUpdate(
              "savedReports",
              { dados: newDados },
              "id",
              rId,
            );
          }

          await loadFromDB();
          showAlert("Registos reorganizados com sucesso!");
          setShowVendasAcoesMenu(false);
        } catch (e) {
          showAlert("Erro ao reorganizar: " + e.message);
        } finally {
          setLoading(false);
        }
      },
    );
  };

  const getSituacaoColor = (situacao) => {
    if (!situacao) return "bg-slate-100 text-slate-700";
    if (situacao.includes("FATURADO"))
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400";
    if (situacao.includes("PENDENTE"))
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400";
    if (situacao.includes("CANCELADO"))
      return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400";
    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  };

  const abrirModalVenda = (venda = null) => {
    if (venda) {
      const safeVenda = { ...venda };
      Object.keys(safeVenda).forEach((k) => {
        if (safeVenda[k] === null) safeVenda[k] = "";
      });
      setVendaForm(safeVenda);
    } else
      setVendaForm({
        id: null,
        numero: getNextSequenceNumber(getAllVendas(), (v) => v.numero),
        cliente: "",
        dataVenda: dataDeHojeInterna(),
        situacao: `FATURADO ${nomeEmpresaUpper} NF`,
        loja: `${nomeEmpresaUpper} ASSESSORIA`,
        valor: 0,
        contrato: "",
        codOperadora: "",
        codigoOperadora: "",
        vidas: "",
        parcela: "",
        inicioVigencia: "",
        notaFiscal: "",
        corretor: nomeEmpresa,
        vitalicio: "Sim",
        assessoria: nomeEmpresa,
        formaPagamento:
          nomeEmpresaUpper === "PROPER"
            ? "Dinheiro à vista"
            : "Crédito em conta",
        servico: "",
        desconto: "",
        notas: "",
      });
    setModalVendaOpen(true);
  };

  const duplicarVenda = (venda) => {
    const copia = {
      ...venda,
      id: null,
      numero: getNextSequenceNumber(getAllVendas(), (v) => v.numero),
      isFromReport: false,
      reportId: null,
      reportRowIndex: null,
    };
    setVendaForm(copia);
    setModalVendaOpen(true);
  };

  const abrirRelatorioDaVenda = (venda) => {
    if (!venda) return;
    
    // 1. Try finding by direct reportId
    let report = null;
    if (venda.isFromReport && venda.reportId) {
      report = savedReportsList.find((r) => r.id === venda.reportId);
    }
    
    // 2. Fallback: search by contract number inside all reports
    if (!report && venda.contrato) {
      report = savedReportsList.find((r) => 
        r.dados && Array.isArray(r.dados) && r.dados.some((d) => String(d.contrato) === String(venda.contrato))
      );
    }

    // 3. Optional third fallback: search by client name
    if (!report && venda.cliente) {
      report = savedReportsList.find((r) => 
        r.dados && Array.isArray(r.dados) && r.dados.some((d) => d.cliente && String(d.cliente).trim().toLowerCase() === String(venda.cliente).trim().toLowerCase())
      );
    }

    if (report) {
      setModalVendaOpen(false);
      if (typeof setShowModalInconsistencias === 'function') setShowModalInconsistencias(false);
      carregarRelatorioSalvo(report);
      showAlert(`Relatório "${report.nome}" carregado com sucesso no painel de processamento.`);
    } else {
      showAlert("Não foi encontrado nenhum relatório importado correspondente a esta venda.");
    }
  };

  const onChangeVendaField = (field, value) => {
    let newForm = { ...vendaForm, [field]: value };

    if (field === "comissao") {
      const val = parseFloat(newForm.valor) || 0;
      const com = parseFloat(value) || 0;
      if (val > 0 && com > 0) {
        newForm.comissaoPorcentagem = Math.round((com / val) * 100);
      } else {
        newForm.comissaoPorcentagem = "";
      }
    } else if (["valor", "comissaoPorcentagem", "desconto"].includes(field)) {
      const val = parseFloat(newForm.valor) || 0;
      const pct = parseFloat(newForm.comissaoPorcentagem);
      const desc = parseFloat(newForm.desconto) || 0;

      if (!isNaN(pct)) {
        newForm.comissao = val * (pct / 100) - desc;
      }
    }

    setVendaForm(newForm);
  };

  const salvarVenda = async (e) => {
    if (e) e.preventDefault();
    if (!vendaForm.codigoOperadora) {
      return showAlert("Atenção: Selecione a Op. | Seg.", "error");
    }

    const executarSalvamento = async () => {
      setLoading(true);
      setLoadingMsg("Guardando venda...");
      try {
        let dataToSave = {
          ...vendaForm,
          valor: parseFloat(vendaForm.valor) || 0,
        };
        let vendasAposSalvarLocal = vendasList;
        let savedReportsAposSalvarLocal = savedReportsList;
        dataToSave.cliente = (dataToSave.cliente || "").trim().toUpperCase();
        dataToSave.vidas =
          dataToSave.vidas === "" || dataToSave.vidas === undefined
            ? null
            : parseInt(dataToSave.vidas, 10);
        dataToSave.comissao =
          dataToSave.comissao === "" || dataToSave.comissao === undefined
            ? null
            : parseFloat(dataToSave.comissao);
        dataToSave.desconto =
          dataToSave.desconto === "" || dataToSave.desconto === undefined
            ? null
            : parseFloat(dataToSave.desconto);

        const empUpper = nomeEmpresaUpper;
        dataToSave.empresa = nomeEmpresa;
        if (
          !dataToSave.loja ||
          !dataToSave.loja.toUpperCase().includes(empUpper)
        ) {
          dataToSave.loja = `${empUpper} ASSESSORIA`;
        }
        if (
          !dataToSave.assessoria ||
          !dataToSave.assessoria.toUpperCase().includes(empUpper)
        ) {
          dataToSave.assessoria = empUpper;
        }
        if (!dataToSave.situacao.toUpperCase().includes(empUpper)) {
          dataToSave.situacao = `FATURADO ${empUpper} NF`;
        }

        delete dataToSave.comissaoPorcentagem;
        delete dataToSave.isFromReport;
        delete dataToSave.reportId;
        delete dataToSave.reportRowIndex;
        delete dataToSave.reportNome;
        delete dataToSave.reportPeriodo;
        delete dataToSave.reportDataCriacao;
        delete dataToSave.created_at;

        Object.keys(dataToSave).forEach((k) => {
          if (dataToSave[k] === "") dataToSave[k] = null;
        });

        if (vendaForm.isFromReport) {
          const rep = await supabase
            .from("savedReports")
            .select("*")
            .eq("id", vendaForm.reportId)
            .single();
          if (rep.data) {
            let dadosAtualizados = [...rep.data.dados];
            dadosAtualizados[vendaForm.reportRowIndex] = {
              ...dadosAtualizados[vendaForm.reportRowIndex],
              cod: dataToSave.numero,
              cliente: dataToSave.cliente,
              data: dataToSave.dataVenda,
              empresa: dataToSave.empresa,
              situacao: dataToSave.situacao,
              loja: dataToSave.loja,
              valorTotal: dataToSave.valor,
              valor: dataToSave.valor,
              vendedor: dataToSave.corretor,
              parcela: dataToSave.parcela,
              inicioVigencia: dataToSave.inicioVigencia,
              notaFiscal: dataToSave.notaFiscal,
              contrato: dataToSave.contrato,
              codOperadora: dataToSave.codOperadora,
              codigoOperadora: dataToSave.codigoOperadora,
              vidas: dataToSave.vidas,
              vitalicio: dataToSave.vitalicio,
              assessoria: dataToSave.assessoria,
              formaPagamento: dataToSave.formaPagamento,
              servico: dataToSave.servico,
              desconto: dataToSave.desconto,
              notas: dataToSave.notas,
              comissao: dataToSave.comissao,
            };
            await safeSupabaseUpdate(
              "savedReports",
              { dados: dadosAtualizados },
              "id",
              rep.data.id,
            );
            savedReportsAposSalvarLocal = savedReportsList.map((report) =>
              report.id === rep.data.id
                ? { ...report, dados: dadosAtualizados }
                : report,
            );
          }
        } else {
          if (vendaForm.id) {
            const { error } = await safeSupabaseUpdate(
              "vendas",
              dataToSave,
              "id",
              vendaForm.id,
            );
            if (error) throw error;
            vendasAposSalvarLocal = vendasList.map((v) =>
              v.id === vendaForm.id
                ? { ...v, ...dataToSave, id: vendaForm.id }
                : v,
            );
          } else {
            delete dataToSave.id;
            const { data, error } = await safeSupabaseInsert("vendas", [
              dataToSave,
            ]);
            if (error) throw error;
            const vendaInserida =
              data && data.length > 0
                ? data[0]
                : { ...dataToSave, id: `temp_${Date.now()}` };
            vendasAposSalvarLocal = [...vendasList, vendaInserida];
          }
        }

        await loadFromDB();
        setModalVendaOpen(false);
        showAlert("Venda guardada com sucesso!");
      } catch (err) {
        showAlert("Erro ao guardar: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    // A validação de inconsistências foi movida para depois do salvamento,
    // para varrer a base já atualizada e evitar bloqueios antes de guardar.
    executarSalvamento();
  };

  const handleApagarVendasSelecionadas = () => {
    if (selectedVendas.length === 0)
      return showAlert("Selecione pelo menos uma venda para apagar.");
    showConfirm(
      `Tem a certeza que deseja apagar os ${selectedVendas.length} registos selecionados?`,
      async () => {
        setLoading(true);
        setLoadingMsg("Apagando...");
        const selectedSet = new Set(selectedVendas);
        const vendasToDelete = displayedVendas.filter((v) =>
          selectedSet.has(v.id),
        );

        const vendasDiretas = vendasToDelete.filter((v) => !v.isFromReport);
        const vendasReports = vendasToDelete.filter((v) => v.isFromReport);

        if (vendasDiretas.length > 0) {
          const chunks = [];
          for (let i = 0; i < vendasDiretas.length; i += 50)
            chunks.push(vendasDiretas.slice(i, i + 50));
          for (const chunk of chunks) {
            await supabase
              .from("vendas")
              .delete()
              .in(
                "id",
                chunk.map((v) => v.id),
              );
          }
        }
        if (vendasReports.length > 0) {
          const reportsGrouped = vendasReports.reduce((acc, v) => {
            if (!acc[v.reportId]) acc[v.reportId] = [];
            acc[v.reportId].push(v.reportRowIndex);
            return acc;
          }, {});
          for (const reportId of Object.keys(reportsGrouped)) {
            const rep = await supabase
              .from("savedReports")
              .select("*")
              .eq("id", reportId)
              .single();
            if (rep.data && rep.data.dados) {
              const indicesToRemove = new Set(reportsGrouped[reportId]);
              const novosDados = rep.data.dados.filter(
                (_, idx) => !indicesToRemove.has(idx),
              );
              await safeSupabaseUpdate(
                "savedReports",
                { dados: novosDados },
                "id",
                reportId,
              );
            }
          }
        }

        setSelectedVendas([]);
        await loadFromDB();
        setLoading(false);
      },
    );
  };

  const toggleVendaSelection = (id) => {
    if (selectedVendas.includes(id)) {
      setSelectedVendas(selectedVendas.filter((vId) => vId !== id));
    } else {
      setSelectedVendas([...selectedVendas, id]);
    }
  };

  const toggleAllVendas = () => {
    const idsPagina = currentVendas.map((v) => v.id);
    const allSelected = idsPagina.every((id) => selectedVendas.includes(id));
    if (allSelected) {
      setSelectedVendas(selectedVendas.filter((id) => !idsPagina.includes(id)));
    } else {
      const onlyNewIds = idsPagina.filter((id) => !selectedVendas.includes(id));
      setSelectedVendas([...selectedVendas, ...onlyNewIds]);
    }
  };

  const isAllVendasSelected = currentVendas.length > 0 && currentVendas.every((v) => selectedVendas.includes(v.id));

  const apagarVenda = (venda) => {
    showConfirm(
      `Tem a certeza absoluta de que deseja apagar esta venda? Esta ação é irreversível e não poderá recuperar os dados.`,
      async () => {
        setLoading(true);
        setLoadingMsg("Apagando...");
        if (venda.isFromReport) {
          const rep = await supabase
            .from("savedReports")
            .select("*")
            .eq("id", venda.reportId)
            .single();
          if (rep.data) {
            let dados = rep.data.dados.filter(
              (_, idx) => idx !== venda.reportRowIndex,
            );
            await safeSupabaseUpdate(
              "savedReports",
              { dados: dados },
              "id",
              rep.data.id,
            );
          }
        } else {
          await supabase.from("vendas").delete().eq("id", venda.id);
        }
        await loadFromDB();
        setLoading(false);
      },
    );
  };

  const atualizarInconsistenciaVenda = async (venda, updates) => {
    setLoading(true);
    setLoadingMsg("Guardando alterações...");
    try {
      if (venda.isFromReport) {
        const rep = savedReportsList.find((r) => r.id === venda.reportId);
        if (rep) {
          let dados = [...rep.dados];
          dados[venda.reportRowIndex] = { ...dados[venda.reportRowIndex], ...updates };
          await safeSupabaseUpdate("savedReports", { dados: dados }, "id", rep.id);
        }
      } else {
        let currentObj = {
          notas: venda.inconsistenciaNotas || "",
          falt_notas: venda.inconsistenciaFaltFaltaNotas || "",
          resolvida: !!venda.inconsistenciaResolvida,
          falt_resolvida: !!venda.inconsistenciaFaltFaltaResolvida
        };

        if ("inconsistenciaNotas" in updates) currentObj.notas = updates.inconsistenciaNotas;
        if ("inconsistenciaFaltFaltaNotas" in updates) currentObj.falt_notas = updates.inconsistenciaFaltFaltaNotas;
        if ("inconsistenciaResolvida" in updates) currentObj.resolvida = updates.inconsistenciaResolvida;
        if ("inconsistenciaFaltFaltaResolvida" in updates) currentObj.falt_resolvida = updates.inconsistenciaFaltFaltaResolvida;

        const originalVenda = vendasList.find(v => v.id === venda.id) || venda;
        let originalRawNotas = originalVenda.notas || "";
        originalRawNotas = originalRawNotas.replace(/\[INCONSISTENCIA:({.*?})\]/, "").trim();

        const tag = `[INCONSISTENCIA:${JSON.stringify(currentObj)}]`;
        const finalNotas = originalRawNotas ? `${originalRawNotas}\n${tag}` : tag;

        await safeSupabaseUpdate("vendas", { notas: finalNotas }, "id", venda.id);
      }
      await loadFromDB();
    } catch (e) {
      console.error(e);
      showAlert("Erro ao atualizar venda.");
    } finally {
      setLoading(false);
    }
  };

  const abrirModalUsuario = (user = null) => {
    if (user) {
      setUserForm({
        ...user,
        permissions:
          user.role === "admin"
            ? SYSTEM_MODULES.map((m) => m.id)
            : user.permissions || [],
      });
    } else
      setUserForm({
        id: null,
        username: "",
        password: "",
        role: "operador",
        permissions: [],
        empresa: nomeEmpresa,
      });
    setModalUserOpen(true);
  };

  const salvarUsuario = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoadingMsg("Guardando usuário...");
    try {
      if (userForm.username.trim().toLowerCase() === "donfim") {
        setLoading(false);
        return showAlert("Este nome de usuário é reservado pelo sistema.");
      }
      const { data: existing } = await supabase
        .from("users")
        .select("*")
        .eq("username", userForm.username);
      if (existing && existing.length > 0 && existing[0].id !== userForm.id) {
        setLoading(false);
        return showAlert("Já existe um usuário registado com este nome.");
      }

      let finalEmpresa = userForm.empresa || "Todas";
      if (
        currentUser?.empresa &&
        currentUser.empresa !== "Todas" &&
        finalEmpresa === "Todas"
      ) {
        finalEmpresa = currentUser.empresa; // Prevents privilege escalation
      }

      let dataToSave = {
        username: userForm.username,
        password: userForm.password,
        role: userForm.role,
        permissions:
          userForm.role === "admin"
            ? SYSTEM_MODULES.map((m) => m.id)
            : userForm.permissions,
        empresa: finalEmpresa,
      };
      let retryWithoutEmpresa = false;

      if (userForm.id) {
        let { error: updateErr } = await supabase
          .from("users")
          .update(dataToSave)
          .eq("id", userForm.id);
        if (
          updateErr &&
          (updateErr.message?.includes("empresa") ||
            updateErr.details?.includes("empresa"))
        ) {
          throw new Error(
            "A coluna 'empresa' está faltando na tabela 'users'. Crie a coluna 'empresa' (tipo text) no Supabase para garantir o isolamento.",
          );
        } else if (updateErr) {
          throw updateErr;
        }
        if (currentUser?.id === userForm.id) {
          const updatedSession = { ...currentUser, ...dataToSave };
          setCurrentUser(updatedSession);
          if (localStorage.getItem("protetta_auth_user")) {
            localStorage.setItem(
              "protetta_auth_user",
              JSON.stringify(updatedSession),
            );
          } else {
            sessionStorage.setItem(
              "protetta_auth_user",
              JSON.stringify(updatedSession),
            );
          }
        }
      } else {
        let { error: insertErr } = await supabase
          .from("users")
          .insert([dataToSave]);
        if (
          insertErr &&
          (insertErr.message?.includes("empresa") ||
            insertErr.details?.includes("empresa"))
        ) {
          throw new Error(
            "A coluna 'empresa' está faltando na tabela 'users'. Crie a coluna 'empresa' (tipo text) no Supabase para garantir o isolamento.",
          );
        } else if (insertErr) {
          throw insertErr;
        }
      }
      await loadFromDB();
      setModalUserOpen(false);
      showAlert("Usuário guardado com sucesso!");
    } catch (err) {
      let msg = err.message || String(err);
      if (msg.includes("row-level security") || msg.includes("RLS")) {
        msg =
          "O Supabase bloqueou a operação (RLS). Por favor certifique-se que tem as Políticas (Policies) corretas na tabela 'users' para permitir INSERT e UPDATE.";
      }
      showAlert("Erro ao guardar: " + msg);
    } finally {
      setLoading(false);
    }
  };

  const apagarUsuario = (u) => {
    if (u.username === "admin")
      return showAlert("Não é possível apagar admin.");
    if (currentUser?.id === u.id)
      return showAlert("Você não pode apagar a sua própria conta.");
    showConfirm(
      `Tem a certeza que deseja apagar o usuário '${u.username}'?`,
      async () => {
        const { error: deleteErr } = await supabase
          .from("users")
          .delete()
          .eq("id", u.id);
        if (deleteErr) {
          let msg = deleteErr.message || String(deleteErr);
          if (msg.includes("row-level security") || msg.includes("RLS"))
            msg =
              "Bloqueado pelo Supabase (RLS). Adicione política de DELETE na tabela 'users'.";
          return showAlert("Erro ao apagar: " + msg);
        }
        await loadFromDB();
      },
    );
  };

  const getFileColorClass = (fileName) => {
    if (!fileName) return "text-slate-400";
    const ext = fileName.split(".").pop().toLowerCase();
    if (["csv", "xlsx", "xls"].includes(ext))
      return "text-emerald-600 dark:text-emerald-400";
    if (["pdf"].includes(ext)) return "text-rose-600 dark:text-rose-400";
    return "text-slate-400";
  };

  const getDisplayFileName = (f) => {
    let name = (f.parceiro && f.parceiro.replace(/^\[.*?\]\s*/, "")) || f.fileName || "";
    if (f.notaFiscal && !name.includes(`(NF: ${f.notaFiscal})`)) {
      name += ` (NF: ${f.notaFiscal})`;
    }
    return name;
  };

  const getModalItemsAtCurrentPath = () => {
    const hasSearch = modalArquivosSearch.trim() !== "";
    const hasDateFilter = modalArquivosDateStart || modalArquivosDateEnd;

    if (hasSearch || hasDateFilter) {
      return dbReports
        .filter((r) => {
          let textMatch = true;
          if (hasSearch) {
            const term = modalArquivosSearch.toLowerCase();
            textMatch =
              (r.parceiro && r.parceiro.toLowerCase().includes(term)) ||
              (r.fileName || "").toLowerCase().includes(term) ||
              (r.empresa && r.empresa.toLowerCase().includes(term));
          }
          let startMatch = true;
          let endMatch = true;
          const rDate = r.date || r.created_at || r.dataCriacao;
          if (modalArquivosDateStart && rDate)
            startMatch =
              new Date(rDate) >= new Date(modalArquivosDateStart + "T00:00:00");
          if (modalArquivosDateEnd && rDate)
            endMatch =
              new Date(rDate) <= new Date(modalArquivosDateEnd + "T23:59:59");
          return textMatch && startMatch && endMatch;
        })
        .map((f) => {
          const fDate = f.date || f.created_at || f.dataCriacao;
          const dateStr = fDate
            ? ` - ${new Date(fDate).toLocaleDateString("pt-BR")}`
            : "";
          return {
            ...f,
            type: "file",
            name: getDisplayFileName(f),
            pathInfo: `${f.ano} / ${f.mes} / ${f.empresa}${dateStr}`,
          };
        });
    }

    if (modalArquivosPath.length === 0)
      return [
        ...new Set([
          String(new Date().getFullYear()),
          ...dbReports.map((r) => String(r.ano)),
        ]),
      ]
        .sort()
        .map((y) => ({ id: y, name: y, type: "folder" }));
    if (modalArquivosPath.length === 1)
      return MESES.map((m) => ({ id: m, name: m, type: "folder" }));
    if (modalArquivosPath.length === 2)
      return CATEGORIAS.map((c) => ({ id: c, name: c, type: "folder" }));
    if (modalArquivosPath.length === 3)
      return empresasList.map((e) => ({
        id: e.nome,
        name: e.nome,
        type: "folder",
      }));
    if (modalArquivosPath.length === 4) {
      const existingOps = dbReports
        .filter(
          (r) =>
            String(r.ano) === String(modalArquivosPath[0]) &&
            String(r.mes) === String(modalArquivosPath[1]) &&
            String(r.categoria) === String(modalArquivosPath[2]) &&
            String(r.empresa) === String(modalArquivosPath[3]),
        )
        .map((r) => (r.codigoOperadora || "").trim());
      let allOps = [...new Set(existingOps)].filter(Boolean).sort();
      return allOps.map((op) => ({ id: op, name: op, type: "folder" }));
    }
    if (modalArquivosPath.length === 5) {
      const list = [];
      const reports = dbReports.filter(
        (r) =>
          String(r.ano) === String(modalArquivosPath[0]) &&
          String(r.mes) === String(modalArquivosPath[1]) &&
          String(r.categoria) === String(modalArquivosPath[2]) &&
          String(r.empresa) === String(modalArquivosPath[3]) &&
          (r.codigoOperadora || "").trim().toLowerCase() ===
            String(modalArquivosPath[4]).toLowerCase(),
      );

      const codOps = [
        ...new Set(
          reports
            .map((r) => r.codOperadora)
            .filter((c) => c && c.trim() !== ""),
        ),
      ].sort();

      codOps.forEach((c) => list.push({ id: c, name: c, type: "folder" }));

      const filesNoCod = reports.filter(
        (r) => !r.codOperadora || r.codOperadora.trim() === "",
      );
      filesNoCod.forEach((f) =>
        list.push({
          ...f,
          type: "file",
          name: getDisplayFileName(f),
        }),
      );

      return list;
    }
    if (modalArquivosPath.length === 6) {
      return dbReports
        .filter(
          (r) =>
            String(r.ano) === String(modalArquivosPath[0]) &&
            String(r.mes) === String(modalArquivosPath[1]) &&
            String(r.categoria) === String(modalArquivosPath[2]) &&
            String(r.empresa) === String(modalArquivosPath[3]) &&
            (r.codigoOperadora || "").trim().toLowerCase() ===
              String(modalArquivosPath[4]).toLowerCase() &&
            String(r.codOperadora || "").trim() ===
              String(modalArquivosPath[5]),
        )
        .map((f) => ({
          ...f,
          type: "file",
          name: getDisplayFileName(f),
        }));
    }

    return [];
  };

  const handleModalArquivosNavigate = (item) => {
    if (item.type === "folder") {
      setModalArquivosPath([...modalArquivosPath, item.name]);
    } else {
      processarArquivoDoBanco(item);
    }
  };

  const getItemsAtCurrentPath = () => {
    const hasSearch = searchTerm.trim() !== "";
    const hasDateFilter = gestorReportsDateStart || gestorReportsDateEnd;
    const hasEtapaFilter = gestorFilterEtapa && gestorFilterEtapa.trim() !== "";
    const hasNfFilter = gestorFilterNf && gestorFilterNf.trim() !== "";
    const hasOpSegFilter = gestorFilterOpSeg && gestorFilterOpSeg.trim() !== "";
    const hasAnoFilter = gestorFilterAno && gestorFilterAno.trim() !== "";
    const hasMesFilter = gestorFilterMes && gestorFilterMes.trim() !== "";
    const hasDataExtratoFilter = gestorFilterDataExtrato && gestorFilterDataExtrato.trim() !== "";

    if (
      hasSearch ||
      hasDateFilter ||
      hasEtapaFilter ||
      hasNfFilter ||
      hasOpSegFilter ||
      hasAnoFilter ||
      hasMesFilter ||
      hasDataExtratoFilter
    ) {
      return dbReports
        .filter((r) => {
          let textMatch = true;
          if (hasSearch) {
            textMatch =
              matchesCommaSeparated(r.parceiro, searchTerm) ||
              matchesCommaSeparated(r.fileName, searchTerm) ||
              matchesCommaSeparated(r.empresa, searchTerm);
          }
          let startMatch = true;
          let endMatch = true;
          const rDate = r.date || r.created_at || r.dataCriacao;
          if (gestorReportsDateStart && rDate)
            startMatch =
              new Date(rDate) >= new Date(gestorReportsDateStart + "T00:00:00");
          if (gestorReportsDateEnd && rDate)
            endMatch =
              new Date(rDate) <= new Date(gestorReportsDateEnd + "T23:59:59");

          let etapaMatch = true;
          if (hasEtapaFilter) {
            etapaMatch = matchesCommaSeparated(r.categoria, gestorFilterEtapa, true);
          }

          let nfMatch = true;
          if (hasNfFilter) {
            nfMatch = matchesCommaSeparated(r.notaFiscal, gestorFilterNf);
          }

          let opSegMatch = true;
          if (hasOpSegFilter) {
            opSegMatch = matchesCommaSeparated(r.codigoOperadora, gestorFilterOpSeg, true);
          }

          let anoMatch = true;
          if (hasAnoFilter) {
            anoMatch = matchesCommaSeparated(r.ano, gestorFilterAno, true);
          }

          let mesMatch = true;
          if (hasMesFilter) {
            mesMatch = matchesCommaSeparated(r.mes, gestorFilterMes, true);
          }

          let dataExtratoMatch = true;
          if (hasDataExtratoFilter && rDate) {
            const reportDay = new Date(rDate).toISOString().split('T')[0];
            dataExtratoMatch = matchesCommaSeparated(reportDay, gestorFilterDataExtrato, true);
          }

          return textMatch && startMatch && endMatch && etapaMatch && nfMatch && opSegMatch && anoMatch && mesMatch && dataExtratoMatch;
        })
        .map((f) => {
          const fDate = f.date || f.created_at || f.dataCriacao;
          const dateStr = fDate
            ? ` - ${new Date(fDate).toLocaleDateString("pt-BR")}`
            : "";
          return {
            ...f,
            type: "file",
            name: getDisplayFileName(f),
            pathInfo: `${f.ano} / ${f.mes} / ${f.empresa}${dateStr}`,
          };
        });
    }

    if (currentPath.length === 0)
      return [
        ...new Set([
          String(new Date().getFullYear()),
          ...dbReports.map((r) => String(r.ano)),
        ]),
      ]
        .sort()
        .map((y) => ({ id: y, name: y, type: "folder" }));
    if (currentPath.length === 1)
      return MESES.map((m) => ({ id: m, name: m, type: "folder" }));
    if (currentPath.length === 2)
      return CATEGORIAS.map((c) => ({ id: c, name: c, type: "folder" }));
    if (currentPath.length === 3)
      return empresasList
        .filter((e) => e.nome.toUpperCase() === nomeEmpresaUpper)
        .map((e) => ({ id: e.nome, name: e.nome, type: "folder" }));
    if (currentPath.length === 4) {
      const existingOps = dbReports
        .filter(
          (r) =>
            String(r.ano) === String(currentPath[0]) &&
            String(r.mes) === String(currentPath[1]) &&
            String(r.categoria) === String(currentPath[2]) &&
            String(r.empresa) === String(currentPath[3]),
        )
        .map((r) => (r.codigoOperadora || "").trim());
      let allOps = [...new Set(existingOps)].filter(Boolean).sort();
      return allOps.map((op) => ({ id: op, name: op, type: "folder" }));
    }
    if (currentPath.length === 5) {
      const list = [];
      const reports = dbReports.filter(
        (r) =>
          String(r.ano) === String(currentPath[0]) &&
          String(r.mes) === String(currentPath[1]) &&
          String(r.categoria) === String(currentPath[2]) &&
          String(r.empresa) === String(currentPath[3]) &&
          (r.codigoOperadora || "").trim().toLowerCase() ===
            String(currentPath[4]).toLowerCase(),
      );

      const codOps = [
        ...new Set(
          reports
            .map((r) => r.codOperadora)
            .filter((c) => c && c.trim() !== ""),
        ),
      ].sort();

      codOps.forEach((c) => list.push({ id: c, name: c, type: "folder" }));

      const filesNoCod = reports.filter(
        (r) => !r.codOperadora || r.codOperadora.trim() === "",
      );
      filesNoCod.forEach((f) =>
        list.push({
          ...f,
          type: "file",
          name: getDisplayFileName(f),
        }),
      );

      return list;
    }
    if (currentPath.length === 6) {
      return dbReports
        .filter(
          (r) =>
            String(r.ano) === String(currentPath[0]) &&
            String(r.mes) === String(currentPath[1]) &&
            String(r.categoria) === String(currentPath[2]) &&
            String(r.empresa) === String(currentPath[3]) &&
            (r.codigoOperadora || "").trim().toLowerCase() ===
              String(currentPath[4]).toLowerCase() &&
            String(r.codOperadora || "").trim() === String(currentPath[5]),
        )
        .map((f) => ({
          ...f,
          type: "file",
          name: getDisplayFileName(f),
        }));
    }
    return [];
  };

  const handleSubmitExtrato = async (e) => {
    e.preventDefault();
    if (!formData.codigoOperadora) {
      setFormError("ERRO: Selecione a Op. | Seg.");
      return showAlert("Atenção: Selecione a Op. | Seg.", "error");
    }
    if (formData.arquivos.length === 0)
      return setFormError("ERRO: Anexos obrigatórios.");
    
    for (let i = 0; i < formData.arquivos.length; i++) {
        if (!formData.arquivos[i].notaFiscal || !formData.arquivos[i].notaFiscal.trim()) {
            return setFormError(`ERRO: Nota Fiscal obrigatória para o anexo ${i + 1}.`);
        }
        if (!formData.arquivos[i].parceiro || !formData.arquivos[i].parceiro.trim()) {
            return setFormError(`ERRO: Nome do Arquivo obrigatório para o anexo ${i + 1}.`);
        }
    }

    setLoading(true);
    setLoadingMsg("Fazendo upload para a nuvem...");
    try {
      let finalOperadora = formData.codigoOperadora;
      if (formData.codigoOperadora === "OUTRA") {
        finalOperadora = (formData.codigoOperadoraOutra || "")
          .trim()
          .toUpperCase();
        if (
          finalOperadora &&
          !combinedOperadoras.includes(finalOperadora) &&
          !combinedSeguradoras.includes(finalOperadora)
        ) {
          let newCustom = {
            operadoras: [...(customOpSeg?.operadoras || [])],
            seguradoras: [...(customOpSeg?.seguradoras || [])],
          };
          if (formData.categoria === "Seguradoras") {
            newCustom.seguradoras.push(finalOperadora);
          } else {
            newCustom.operadoras.push(finalOperadora);
          }
          setCustomOpSegAction(newCustom);
        }
      }

      for (const arq of formData.arquivos) {
        const file = arq.file;
        const saveOperadora = (finalOperadora || "").trim();
        const saveCodOperadora = (formData.codOperadora || "").trim();
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const filePath = `${Date.now()}_${safeFileName}`;
        const { error: uploadErr } = await supabase.storage
          .from("arquivos_extratos")
          .upload(filePath, file);
        if (uploadErr) throw uploadErr;

        const saveParceiro = `[${saveOperadora}|${saveCodOperadora}] ${arq.parceiro}${arq.notaFiscal ? ` (NF: ${arq.notaFiscal})` : ""}`;
        let reportDataToSave = {
          ano: formData.ano,
          mes: formData.mes,
          categoria: formData.categoria,
          empresa: formData.empresa,
          parceiro: saveParceiro,
          codigoOperadora: saveOperadora || null,
          codOperadora: saveCodOperadora || null,
          notaFiscal: arq.notaFiscal || null,
          date: new Date().toISOString(),
          fileName: file.name,
          filePath: filePath,
        };
        const { error: insertErr } = await safeSupabaseInsert("reports", [
          reportDataToSave,
        ]);
        if (
          insertErr &&
          (insertErr.message?.includes("empresa") ||
            insertErr.details?.includes("empresa"))
        ) {
          throw new Error(
            "A coluna 'empresa' está faltando na tabela 'reports'. Crie a coluna 'empresa' (tipo text) no Supabase para garantir o isolamento.",
          );
        } else if (insertErr) {
          throw insertErr;
        }
      }
      await loadFromDB();
      setSuccessMsg(`${formData.arquivos.length} extratos guardados!`);
      setFormData((prev) => ({
        ...prev,
        parceiro: "",
        codOperadora: "",
        codigoOperadora: "",
        codigoOperadoraOutra: "",
        notaFiscal: "",
        arquivos: [],
      }));
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (error) {
      let msg = error.message || String(error);
      if (
        msg.includes("Failed to fetch") ||
        msg.includes("Bucket not found") ||
        msg.includes("row-level security")
      ) {
        showAlert(
          "ATENÇÃO: O Supabase está a bloquear o envio. Para corrigir:\n1. Vá ao Supabase > Storage\n2. Crie um novo bucket chamado 'arquivos_extratos'\n3. Torne-o Público\n4. Em 'Policies', clique em 'New Policy' > 'For full customization' e permita TODAS as operações (SELECT, INSERT, UPDATE, DELETE) para 'public'.",
        );
      } else {
        showAlert("Erro ao enviar ficheiro para a Cloud: " + msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelectExtrato = (e, fileId) => {
    e.stopPropagation();
    setSelectedExtratos((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId],
    );
  };

  const isAllExtratosSelected = () => {
    const filesOnly = getItemsAtCurrentPath().filter(
      (item) => item.type === "file",
    );
    if (filesOnly.length === 0) return false;
    return filesOnly.every((item) => selectedExtratos.includes(item.id));
  };

  const handleSelectAllExtratos = () => {
    const filesOnly = getItemsAtCurrentPath().filter(
      (item) => item.type === "file",
    );
    if (isAllExtratosSelected()) {
      setSelectedExtratos((prev) =>
        prev.filter((id) => !filesOnly.find((f) => f.id === id)),
      );
    } else {
      const allIds = filesOnly.map((f) => f.id);
      const newSelection = [...new Set([...selectedExtratos, ...allIds])];
      setSelectedExtratos(newSelection);
    }
  };

  const handleExportSelectedExtratos = async () => {
    if (selectedExtratos.length === 0)
      return showAlert("Selecione pelo menos um arquivo.");
    setLoading(true);
    setLoadingMsg("Gerando arquivo zip...");
    try {
      const zip = new JSZip();
      const repToExport = dbReports.filter((r) =>
        selectedExtratos.includes(r.id),
      );
      if (repToExport.length === 0)
        throw new Error("Selecionados não encontrados no banco.");

      for (let rep of repToExport) {
        const pathTarget = rep.filePath || rep.fileName;
        if (pathTarget) {
          const { data: fileBlob, error } = await supabase.storage
            .from("arquivos_extratos")
            .download(pathTarget);
          if (!error && fileBlob) {
            zip.file(rep.fileName || pathTarget, fileBlob);
          }
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ExtratosSelecionados_${dataDeHojeInterna()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSelectedExtratos([]);
    } catch (error) {
      showAlert("Erro ao exportar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveMoverExtratos = async () => {
    if (selectedExtratos.length === 0)
      return showAlert("Selecione pelo menos um arquivo para mover.");
    if (!moverExtratosForm.codigoOperadora) {
      return showAlert("Atenção: Selecione a Op. | Seg.", "error");
    }
    setLoading(true);
    setLoadingMsg("A mover extratos...");
    try {
      let finalOperadora = moverExtratosForm.codigoOperadora;
      if (finalOperadora === "OUTRA") {
        finalOperadora = (moverExtratosForm.codigoOperadoraOutra || "")
          .trim()
          .toUpperCase();
        if (
          finalOperadora &&
          !combinedOperadoras.includes(finalOperadora) &&
          !combinedSeguradoras.includes(finalOperadora)
        ) {
          let newCustom = {
            operadoras: [...(customOpSeg?.operadoras || [])],
            seguradoras: [...(customOpSeg?.seguradoras || [])],
          };
          if (moverExtratosForm.categoria === "Seguradoras") {
            newCustom.seguradoras.push(finalOperadora);
          } else {
            newCustom.operadoras.push(finalOperadora);
          }
          setCustomOpSegAction(newCustom);
        }
      }

      const saveOperadora = (finalOperadora || "").trim();
      const saveCodOperadora = (moverExtratosForm.codOperadora || "").trim();

      for (let id of selectedExtratos) {
        const record = dbReports.find((r) => String(r.id) === String(id));
        if (!record) continue;

        let plainParceiro = record.parceiro || "";
        plainParceiro = plainParceiro.replace(/^\[.*?\]\s*/, ""); // remove existing prefix
        
        let existingNF = "";
        const nfMatch = plainParceiro.match(/\s*\(NF:\s*(.*?)\)$/);
        if (nfMatch) {
            existingNF = nfMatch[1];
            plainParceiro = plainParceiro.replace(/\s*\(NF:\s*(.*?)\)$/, "");
        } else if (record.notaFiscal) {
            existingNF = record.notaFiscal;
            plainParceiro = plainParceiro.replace(new RegExp(`\\s*\\(NF: ${record.notaFiscal}\\)$`), "");
        }
        
        const saveParceiro = `[${saveOperadora}|${saveCodOperadora}] ${plainParceiro}${existingNF ? ` (NF: ${existingNF})` : ""}`;

        await safeSupabaseUpdate(
          "reports",
          {
            ano: moverExtratosForm.ano,
            mes: moverExtratosForm.mes,
            categoria: moverExtratosForm.categoria,
            empresa: moverExtratosForm.empresa,
            codigoOperadora: saveOperadora || null,
            codOperadora: saveCodOperadora || null,
            parceiro: saveParceiro,
          },
          "id",
          id,
        );
      }
      setSelectedExtratos([]);
      setModalMoverExtratosOpen(false);
      await loadFromDB();
      showAlert("Extratos movidos com sucesso!", "success");
    } catch (error) {
      showAlert("Erro ao mover: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSelectedExtrato = () => {
    if (selectedExtratos.length !== 1) return;
    const id = selectedExtratos[0];
    const record = dbReports.find((r) => String(r.id) === String(id));
    if (!record) return;

    let plainParceiro = record.parceiro || "";
    plainParceiro = plainParceiro.replace(/^\[.*?\]\s*/, ""); // remove prefix
    if (record.notaFiscal) {
      plainParceiro = plainParceiro.replace(
        new RegExp(`\\s*\\(NF: ${record.notaFiscal}\\)$`),
        "",
      );
    }

    let isOuter = false;
    let outerValue = "";
    if (
      record.codigoOperadora &&
      ![...combinedOperadoras, ...combinedSeguradoras, "OUTRA"].includes(
        record.codigoOperadora,
      )
    ) {
      isOuter = true;
      outerValue = record.codigoOperadora;
    }

    setEditarExtratoForm({
      id: record.id,
      categoria: record.categoria, // Keep record categoria for reference
      parceiro: plainParceiro,
      notaFiscal: record.notaFiscal || "",
      codigoOperadora: isOuter ? "OUTRA" : record.codigoOperadora || "",
      codOperadora: record.codOperadora || "",
      codigoOperadoraOutra: outerValue,
    });
    setModalEditarExtratoOpen(true);
  };

  const saveEditarExtrato = async (e) => {
    e.preventDefault();
    if (!editarExtratoForm.codigoOperadora) {
      return showAlert("Atenção: Selecione a Op. | Seg.", "error");
    }
    setLoading(true);
    setLoadingMsg("Salvando...");

    try {
      let finalOperadora = editarExtratoForm.codigoOperadora;
      if (editarExtratoForm.codigoOperadora === "OUTRA") {
        finalOperadora = (editarExtratoForm.codigoOperadoraOutra || "")
          .trim()
          .toUpperCase();
        if (
          finalOperadora &&
          !combinedOperadoras.includes(finalOperadora) &&
          !combinedSeguradoras.includes(finalOperadora)
        ) {
          let newCustom = {
            operadoras: [...(customOpSeg?.operadoras || [])],
            seguradoras: [...(customOpSeg?.seguradoras || [])],
          };
          if (editarExtratoForm.categoria === "Seguradoras") {
            newCustom.seguradoras.push(finalOperadora);
          } else {
            newCustom.operadoras.push(finalOperadora);
          }
          setCustomOpSegAction(newCustom);
        }
      }

      const saveOperadora = (finalOperadora || "").trim();
      const saveCodOperadora = (editarExtratoForm.codOperadora || "").trim();
      const saveParceiro = `[${saveOperadora}|${saveCodOperadora}] ${editarExtratoForm.parceiro}${editarExtratoForm.notaFiscal ? ` (NF: ${editarExtratoForm.notaFiscal})` : ""}`;

      const updateData = {
        codigoOperadora: saveOperadora || null,
        codOperadora: saveCodOperadora || null,
        parceiro: saveParceiro,
        notaFiscal: editarExtratoForm.notaFiscal || null,
      };

      await safeSupabaseUpdate(
        "reports",
        updateData,
        "id",
        editarExtratoForm.id,
      );

      setSelectedExtratos([]);
      setModalEditarExtratoOpen(false);
      await loadFromDB();
      showAlert("Extrato editado com sucesso!", "success");
    } catch (error) {
      showAlert("Erro ao editar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelectedExtratos = () => {
    if (selectedExtratos.length === 0)
      return showAlert("Selecione pelo menos um arquivo.");
    showConfirm(
      `Tem a certeza que deseja excluir ${selectedExtratos.length} arquivo(s)?`,
      async () => {
        setLoading(true);
        setLoadingMsg("A excluir...");
        try {
          const repToDelete = dbReports.filter((r) =>
            selectedExtratos.includes(r.id),
          );
          for (let rep of repToDelete) {
            const pathTarget = rep.filePath || rep.fileName;
            if (pathTarget) {
              await supabase.storage
                .from("arquivos_extratos")
                .remove([pathTarget]);
            }
            await supabase.from("reports").delete().eq("id", rep.id);
          }
          setSelectedExtratos([]);
          await loadFromDB();
          showAlert("Arquivos excluídos com sucesso!", "success");
        } catch (error) {
          showAlert("Erro ao excluir: " + error.message);
        } finally {
          setLoading(false);
        }
      },
    );
  };

  const handleNavigate = async (item) => {
    if (item.type === "folder") {
      setCurrentPath([...currentPath, item.name]);
      setSearchTerm("");
    } else if (item.type === "file") {
      setLoading(true);
      setLoadingMsg("Descarregando ficheiro...");
      try {
        const pathTarget = item.filePath || item.fileName;
        if (!pathTarget)
          throw new Error(
            "Caminho do ficheiro ausente. O registo pode ser de uma versão mais antiga.",
          );
        const { data, error } = await supabase.storage
          .from("arquivos_extratos")
          .download(pathTarget);
        if (error) throw error;
        setSelectedFile({ ...item, fileObj: data });
      } catch (e) {
        showAlert("Erro ao descarregar da Cloud: " + e.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteExtrato = async (item) => {
    if (!item) return;
    showConfirm(
      `Tem certeza que deseja apagar o extrato "${item.fileName}"? Esta ação removerá o arquivo da nuvem irreversivelmente.`,
      async () => {
        setLoading(true);
        setLoadingMsg("A apagar extrato...");
        try {
          const pathTarget = item.filePath || item.fileName;
          if (pathTarget) {
            await supabase.storage
              .from("arquivos_extratos")
              .remove([pathTarget]);
          }
          if (item.id) {
            await supabase.from("reports").delete().eq("id", item.id);
          }
          setSelectedFile(null);
          await loadFromDB();
          showAlert("Extrato apagado com sucesso.");
        } catch (err) {
          showAlert("Erro ao apagar extrato: " + err.message);
        } finally {
          setLoading(false);
        }
      },
    );
  };

  const clientesFiltrados = clientes.filter((cli) => {
    const matchNome =
      matchesCommaSeparated(cli.nome, filtroNomeCliente) ||
      (cli.documento && matchesCommaSeparated(cli.documento, filtroNomeCliente));
    const matchTipo =
      filtrosCli.tipo === "Todos" || matchesCommaSeparated(cli.tipo, filtrosCli.tipo, true);
    const matchSituacao =
      filtrosCli.situacao === "Todos" ||
      (filtrosCli.situacao === "Ativo" ? cli.situacao : !cli.situacao);
    return matchNome && matchTipo && matchSituacao;
  });

  const isShowAll = clientesPerPage === "Todos";
  const totalPagesClientes = isShowAll
    ? 1
    : Math.ceil(clientesFiltrados.length / clientesPerPage);
  const indexOfLastCliente = isShowAll
    ? clientesFiltrados.length
    : clientesCurrentPage * clientesPerPage;
  const indexOfFirstCliente = isShowAll
    ? 0
    : indexOfLastCliente - clientesPerPage;
  const currentClientes = clientesFiltrados.slice(
    indexOfFirstCliente,
    indexOfLastCliente,
  );

  const apagarCliente = (id) => {
    const clienteParaApagar = clientes.find((c) => c.id === id);
    if (!clienteParaApagar) return;

    const vendasAssociadas = vendasList.filter(
      (v) => v.cliente.toLowerCase() === clienteParaApagar.nome.toLowerCase(),
    );
    let msg =
      "Tem a certeza absoluta de que deseja apagar este cliente? Esta ação não pode ser desfeita.";
    if (vendasAssociadas.length > 0) {
      msg = `ATENÇÃO: Este cliente possui ${vendasAssociadas.length} venda(s) associada(s). Tem a certeza absoluta que quer apagar este registo?`;
    }

    showConfirm(msg, async () => {
      setLoading(true);
      setLoadingMsg("Apagando cliente...");
      await supabase.from("clientes").delete().eq("id", id);
      setSelectedClientes((prev) => prev.filter((cId) => cId !== id));
      await loadFromDB();
      setLoading(false);
    });
  };

  const apagarClientesSelecionados = () => {
    if (selectedClientes.length === 0)
      return showAlert("Selecione pelo menos um cliente para apagar.");
    showConfirm(
      `Tem a certeza que deseja apagar os ${selectedClientes.length} clientes selecionados?`,
      async () => {
        setLoading(true);
        setLoadingMsg("Apagando clientes...");
        try {
          for (const id of selectedClientes) {
            await supabase.from("clientes").delete().eq("id", id);
          }
          setSelectedClientes([]);
          await loadFromDB();
        } catch (e) {
          showAlert("Erro ao apagar clientes: " + e.message);
        } finally {
          setLoading(false);
        }
      },
    );
  };

  const toggleClienteSelection = (id) => {
    if (selectedClientes.includes(id)) {
      setSelectedClientes(selectedClientes.filter((cId) => cId !== id));
    } else {
      setSelectedClientes([...selectedClientes, id]);
    }
  };

  const toggleAllClientes = () => {
    const idsPagina = currentClientes.map((c) => c.id);
    const allSelected = idsPagina.every((id) => selectedClientes.includes(id));
    if (allSelected) {
      setSelectedClientes(
        selectedClientes.filter((id) => !idsPagina.includes(id)),
      );
    } else {
      const onlyNewIds = idsPagina.filter(
        (id) => !selectedClientes.includes(id),
      );
      setSelectedClientes([...selectedClientes, ...onlyNewIds]);
    }
  };

  const isAllClientesSelected =
    currentClientes.length > 0 &&
    currentClientes.every((c) => selectedClientes.includes(c.id));
  const abrirModalAddEdit = (cliente = null) => {
    if (cliente) {
      const safeCliente = { ...cliente };
      Object.keys(safeCliente).forEach((k) => {
        if (safeCliente[k] === null) safeCliente[k] = "";
      });
      setClienteForm(safeCliente);
      setClienteEditIndex(cliente.id);
    } else {
      setClienteForm({
        id: null,
        nome: "",
        tipo: "Pessoa jurídica",
        documento: "",
        telefone: "",
        celular: "",
        cep: "",
        logradouro: "",
        numero: "",
        bairro: "",
        cidade: "",
        uf: "",
        email: "",
        situacao: true,
        operadora: "",
        servico: "Plano de Saúde",
      });
      setClienteEditIndex(-1);
    }
    setModalClienteOpen(true);
  };

  const abrirModalViewCliente = (cliente) => {
    setClienteToView(cliente);
    setModalViewClienteOpen(true);
  };

  const salvarCliente = async (e) => {
    e.preventDefault();
    if (!clienteForm.operadora) {
      return showAlert("Atenção: Selecione a Op. | Seg.", "error");
    }

    const nomeUpper = clienteForm.nome.trim().toUpperCase();
    const clienteExistente = clientes.find(
      (c) =>
        c.nome.trim().toUpperCase() === nomeUpper &&
        c.id !== clienteForm.id &&
        (c.operadora || "") === (clienteForm.operadora || "") &&
        (c.servico || "") === (clienteForm.servico || ""),
    );

    if (clienteExistente) {
      return showAlert(
        `Já existe um cliente registado com o nome "${clienteForm.nome.trim()}", operadora "${clienteForm.operadora}" e serviço "${clienteForm.servico}". Não é possível guardar clientes duplicados.`,
      );
    }

    const doc = clienteForm.documento
      ? clienteForm.documento.replace(/[^\d]/g, "")
      : "";
    if (doc) {
      if (clienteForm.tipo === "Pessoa física" && doc.length !== 11) {
        return showAlert(
          "Atenção: O CPF deve conter 11 dígitos numéricos. (Preencha corretamente ou deixe em branco).",
        );
      } else if (clienteForm.tipo === "Pessoa jurídica" && doc.length !== 14) {
        return showAlert(
          "Atenção: O CNPJ deve conter 14 dígitos numéricos. (Preencha corretamente ou deixe em branco).",
        );
      }
    }

    setLoading(true);
    setLoadingMsg("Guardando cliente...");
    try {
      const finalEmpresa =
        !currentUser?.empresa || currentUser.empresa === "Todas"
          ? clienteForm.empresa || nomeEmpresa
          : nomeEmpresa;
      const clienteParaSalvar = { ...clienteForm };
      clienteParaSalvar.nome = clienteParaSalvar.nome.trim().toUpperCase();
      Object.keys(clienteParaSalvar).forEach((k) => {
        if (clienteParaSalvar[k] === "") clienteParaSalvar[k] = null;
      });
      clienteParaSalvar.empresa = finalEmpresa;
      if (clienteEditIndex >= 0) {
        const duplicado = clientes.find(
          (c) =>
            c.id !== clienteEditIndex &&
            c.nome.toLowerCase() === clienteParaSalvar.nome.toLowerCase() &&
            (c.operadora || "") === (clienteParaSalvar.operadora || "") &&
            (c.servico || "") === (clienteParaSalvar.servico || ""),
        );
        if (duplicado) {
          setLoading(false);
          return showAlert(
            "Já existe outro cliente registado com este nome, operadora e serviço exatos.",
          );
        }
        await safeSupabaseUpdate(
          "clientes",
          clienteParaSalvar,
          "id",
          clienteEditIndex,
        );
      } else {
        const duplicado = clientes.find(
          (c) =>
            c.nome.toLowerCase() === clienteParaSalvar.nome.toLowerCase() &&
            (c.operadora || "") === (clienteParaSalvar.operadora || "") &&
            (c.servico || "") === (clienteParaSalvar.servico || ""),
        );
        if (duplicado) {
          setLoading(false);
          return showAlert(
            "Não é possível salvar. Já existe um cliente com este nome, operadora e serviço na base.",
          );
        }
        clienteParaSalvar.codigo = getNextSequenceNumber(
          clientes,
          (c) => c.codigo,
        );
        delete clienteParaSalvar.id;
        await safeSupabaseInsert("clientes", [clienteParaSalvar]);
      }
      await loadFromDB();
      setClientSaveSuccess(true);
      setTimeout(() => {
        setClientSaveSuccess(false);
        setModalClienteOpen(false);
      }, 600);
    } catch (err) {
      showAlert("Erro ao guardar cliente: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const importarClientes = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setLoading(true);
    setLoadingMsg("Lendo ficheiro e guardando na nuvem...");
    const ext = file.name.split(".").pop().toLowerCase();
    try {
      let novosClientesParaInserir = [];
      let currentMaxCodigo = clientes.reduce((max, c) => {
        let v = parseInt(c.codigo, 10);
        return !isNaN(v) && v > max ? v : max;
      }, 0);
      if (ext === "xlsx" || ext === "csv") {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const linhasExcel = XLSX.utils.sheet_to_json(
          workbook.Sheets[workbook.SheetNames[0]],
        );
        const impEmpresa =
          !currentUser?.empresa || currentUser.empresa === "Todas"
            ? nomeEmpresa
            : currentUser.empresa || nomeEmpresa;
        linhasExcel.forEach((linha) => {
          let nome =
            linha["Nome"] || linha["NOME"] || linha["Cliente"] || "Sem Nome";
          nome = nome.trim();
          if (
            !clientes.find(
              (c) => c.nome.toLowerCase() === nome.toLowerCase(),
            ) &&
            !novosClientesParaInserir.find(
              (c) => c.nome.toLowerCase() === nome.toLowerCase(),
            )
          ) {
            currentMaxCodigo++;
            let newCodigo = String(currentMaxCodigo).padStart(5, "0");
            novosClientesParaInserir.push({
              codigo: newCodigo,
              nome: nome,
              tipo: linha["Tipo"] || "Pessoa jurídica",
              documento:
                linha["Documento"] || linha["CNPJ"] || linha["NIF"] || null,
              telefone: linha["Telefone"] || null,
              celular: linha["Celular"] || null,
              email: linha["Email"] || linha["E-mail"] || null,
              situacao: true,
              empresa: impEmpresa,
            });
          }
        });
      }
      if (novosClientesParaInserir.length > 0) {
        await safeSupabaseInsert("clientes", novosClientesParaInserir);
        await loadFromDB();
        showAlert(
          `${novosClientesParaInserir.length} novos clientes importados!`,
        );
      } else {
        showAlert("Nenhum cliente novo encontrado no ficheiro.");
      }
    } catch (err) {
      showAlert("Erro ao importar: " + err.message);
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const parseCurrencyValue = (value) => {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return value;
    let str = String(value)
      .replace(/R\$/gi, "")
      .replace(/\s+/g, "")
      .replace(/[^\d,.-]/g, "");
    if (!str) return 0;
    const negative = str.includes("-");
    str = str.replace(/-/g, "");
    if (str.includes(",")) {
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      const partes = str.split(".");
      if (partes.length > 2) str = partes.join("");
    }
    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : negative ? -parsed : parsed;
  };

  const formatDateForInput = (value) => {
    if (!value && value !== 0) return "";
    if (value instanceof Date && !isNaN(value)) {
      return value.toISOString().slice(0, 10);
    }
    if (typeof value === "number" && !isNaN(value)) {
      const date = new Date(Math.round((value - 25569) * 86400 * 1000));
      return date.toISOString().slice(0, 10);
    }
    const str = String(value).trim();
    if (!str) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const match = str.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
    if (match) {
      let ano = match[3].length === 2 ? `20${match[3]}` : match[3];
      return `${ano}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
    }
    return "";
  };

  const formatDateBR = (value) => {
    if (!value && value !== 0) return "";
    const pad = (n) => String(n).padStart(2, "0");
    if (value instanceof Date && !isNaN(value)) {
      return `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear()}`;
    }
    if (typeof value === "number" && !isNaN(value)) {
      const date = new Date(Math.round((value - 25569) * 86400 * 1000));
      return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
    }
    const str = String(value).trim();
    if (!str) return "";
    const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch)
      return `${isoMatch[3].padStart(2, "0")}/${isoMatch[2].padStart(2, "0")}/${isoMatch[1]}`;
    const brMatch = str.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
    if (brMatch) {
      const ano = brMatch[3].length === 2 ? `20${brMatch[3]}` : brMatch[3];
      return `${brMatch[1].padStart(2, "0")}/${brMatch[2].padStart(2, "0")}/${ano}`;
    }
    const anyDate = str.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
    if (anyDate) {
      const ano = anyDate[3].length === 2 ? `20${anyDate[3]}` : anyDate[3];
      return `${anyDate[1].padStart(2, "0")}/${anyDate[2].padStart(2, "0")}/${ano}`;
    }
    return "";
  };

  const processarArquivoDoBanco = async (report) => {
    setLoading(true);
    setLoadingMsg("A descarregar ficheiro da nuvem...");
    setModalArquivosOpen(false);
    try {
      const pathTarget = report.filePath || report.fileName;
      if (!pathTarget) throw new Error("Caminho do ficheiro ausente.");
      const { data: fileBlob, error } = await supabase.storage
        .from("arquivos_extratos")
        .download(pathTarget);
      if (error || !fileBlob)
        throw new Error("Ficheiro não encontrado no Storage.");

      const fileNameLower = String(
        report.fileName || pathTarget || "",
      ).toLowerCase();
      const isExcel = /\.(xlsx|xls)$/i.test(fileNameLower);
      const isCsv = /\.csv$/i.test(fileNameLower);
      const isText = /\.(txt|ret|dat)$/i.test(fileNameLower);

      if (isExcel) {
        setLoadingMsg("A processar dados da planilha...");
        const arrayBuffer = await fileBlob.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, {
          type: "array",
          cellDates: true,
        });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const linhasExcel = XLSX.utils.sheet_to_json(firstSheet, {
          defval: "",
        });
        const textoPlanilha = XLSX.utils.sheet_to_csv(firstSheet, {
          FS: "\t",
          RS: "\n",
          blankrows: false,
        });
        await extrairDadosDoTexto(textoPlanilha, report, linhasExcel);
      } else if (isCsv) {
        setLoadingMsg("A processar dados do CSV...");
        const arrayBuffer = await fileBlob.arrayBuffer();
        let textoCompleto = new TextDecoder("utf-8").decode(arrayBuffer);
        if (textoCompleto.includes("�")) {
          textoCompleto = new TextDecoder("windows-1252").decode(arrayBuffer);
        }
        const workbook = XLSX.read(textoCompleto, { type: "string" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const linhasExcel = XLSX.utils.sheet_to_json(firstSheet, {
          defval: "",
        });
        await extrairDadosDoTexto(textoCompleto, report, linhasExcel);
      } else if (isText) {
        setLoadingMsg("A processar dados do texto...");
        const textoCompleto = await fileBlob.text();
        await extrairDadosDoTexto(textoCompleto, report);
      } else {
        setLoadingMsg("A processar dados do PDF...");
        const arrayBuffer = await fileBlob.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let textoCompleto = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          textoCompleto +=
            textContent.items.map((item) => item.str).join(" ") + " ";
        }
        await extrairDadosDoTexto(textoCompleto, report);
      }
    } catch (error) {
      showAlert("Erro ao ler o ficheiro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const extrairDadosDoTexto = async (
    texto,
    reportDoc = null,
    linhasPlanilha = null,
  ) => {
    const empresaContexto = reportDoc?.empresa || nomeEmpresa;
    const empresaContextoUpper = empresaContexto.toUpperCase();

    let extratoOperadora = reportDoc?.codigoOperadora || "AMIL";
    let extratoCodOperadora = reportDoc?.codOperadora || "";

    if (reportDoc?.parceiro) {
      const matchOp = reportDoc.parceiro.match(/^\[([^|]+)\|([^\]]*)\]/);
      if (matchOp) {
        if (!reportDoc?.codigoOperadora) extratoOperadora = matchOp[1].trim();
        if (!reportDoc?.codOperadora) extratoCodOperadora = matchOp[2].trim();
      }
    }

    setCurrentReportId(null);
    setCurrentReportEmpresa(empresaContexto);
    setCurrentReportOperadora(extratoOperadora);
    setReportName("Relatório ");
    setReportPeriod("");

    let textoNormalizado = texto.replace(/\s+/g, " ").trim();
    const textoUpper = textoNormalizado.toUpperCase();

    if (!reportDoc?.codigoOperadora) {
      if (
        textoUpper.includes("ODONTOPREV") ||
        ((textoUpper.includes("BENEFICIÁRIO") || textoUpper.includes("BENEFICIARIO")) &&
          (textoUpper.includes("OSCILAÇÃO") || textoUpper.includes("OSCILACAO")) &&
          textoUpper.includes("CUSTO") &&
          (textoUpper.includes("COMISSÃO") || textoUpper.includes("COMISSAO")))
      )
        extratoOperadora = "ODONTOPREV";
      else if (textoUpper.includes("BRADESCO")) extratoOperadora = "BRADESCO";
      else if (
        textoUpper.includes("ALLIANZ") ||
        textoUpper.includes("EXTRATO DE COMISSÕES PAGAS POR SUSEP") ||
        textoUpper.includes("EXTRATO DE COMISSOES PAGAS POR SUSEP")
      )
        extratoOperadora = "ALLIANZ";
      else if (
        textoUpper.includes("SUHAI") ||
        (textoUpper.includes("DEMONSTRATIVO DE COMISSÃO") &&
          textoUpper.includes("APÓLICE-ENDOSSO") &&
          textoUpper.includes("TIPO DE PAGAMENTO"))
      )
        extratoOperadora = "SUHAI";
      else if (textoUpper.includes("KLINI")) extratoOperadora = "KLINI";
      else if (textoUpper.includes("OMINT")) extratoOperadora = "OMINT";
      else if (textoUpper.includes("SUPERMED")) extratoOperadora = "SUPERMED";
      else if (
        textoUpper.includes("TOKIO MARINE") ||
        (textoUpper.includes("EXTRATO DO CORRETOR") &&
          (textoUpper.includes("SEGURADO NEGÓCIO RAMO") ||
            textoUpper.includes("SEGURADO NEGOCIO RAMO")) &&
          (textoUpper.includes("APOLICE") || textoUpper.includes("APÓLICE")) &&
          (textoUpper.includes("COMISSÃO (R$)") ||
            textoUpper.includes("COMISSAO (R$)")))
      )
        extratoOperadora = "TOKIO";
      else if (
        textoUpper.includes("SUL AMERICA") ||
        textoUpper.includes("SULAMERICA")
      ) {
        if (
          textoUpper.includes("PROPER BRASIL CORRETORA") ||
          textoUpper.includes("NOME PRODUTOR: PROPER") ||
          empresaContextoUpper.includes("PROPER")
        )
          extratoOperadora = "SULAMERICA PROPER";
        else if (
          textoUpper.includes("PROTETTA CORRETORA") ||
          textoUpper.includes("NOME PRODUTOR: PROTETTA") ||
          empresaContextoUpper.includes("PROTETTA")
        )
          extratoOperadora = "SULAMERICA PROTETTA";
        else extratoOperadora = "SULAMERICA";
      }
      else if (
        textoUpper.includes("EXTRATO ANALÍTICO INDIVIDUAL") ||
        textoUpper.includes("ESSENCIAL-CANAL CORRETOR")
      )
        extratoOperadora = "ICATU";
      else if (
        textoUpper.includes("NOVO COMISSIONAMENTO PLANO EMPRESA") ||
        textoUpper.includes("PAGAMENTOS REFERENTES")
      )
        extratoOperadora = "ASSIM";
      else if (
        textoUpper.includes("PREVENT") ||
        (Array.isArray(linhasPlanilha) &&
          linhasPlanilha.some((l) =>
            Object.keys(l || {}).some((k) =>
              String(k).toLowerCase().includes("beneficiario"),
            ),
          ))
      )
        extratoOperadora = "PREVENT";
      else if (
        textoUpper.includes("MAPFRE") ||
        textoUpper.includes("EXTRATO COMISSÃO - MSG")
      )
        extratoOperadora = "MAPFRE";
      else if (
        textoUpper.includes("METLIFE") ||
        (textoUpper.includes("DEMONSTRATIVO DE COMISSÕES") &&
          textoUpper.includes("PRODUTO ODONTOLÓGICO") &&
          textoUpper.includes("VALOR BRUTO"))
      )
        extratoOperadora = "METLIFE";
      else if (
        textoUpper.includes("CASSI") ||
        textoUpper.includes("PASI") ||
        (textoUpper.includes("EXTRATO ANALÍTICO EMPRESARIAL") &&
          textoUpper.includes("ESTIPULANTE") &&
          textoUpper.includes("SUBESTIPULANTE"))
      )
        extratoOperadora = "CASSI PASI";
      else if (
        textoUpper.includes("TIPO CMS") &&
        textoUpper.includes("PRÊMIO") &&
        textoUpper.includes("MAIS NEGÓCIOS")
      )
        extratoOperadora = "HDI";
      else if (
        textoUpper.includes("PET LOVE") ||
        textoUpper.includes("PETLOVE") ||
        (textoUpper.includes("NOME DO TUTOR") &&
          (textoUpper.includes("COMISSÃO PAGA") ||
            textoUpper.includes("COMISSAO PAGA")))
      )
        extratoOperadora = "PET LOVE";
      else if (
        textoUpper.includes("MONGERAL") ||
        ((textoUpper.includes("CPF/CNPJ") || textoUpper.includes("CPF/CNPJ DO CL")) &&
          (textoUpper.includes("NOME/RAZÃO SOCIAL") || textoUpper.includes("NOME/RAZAO SOCIAL")) &&
          textoUpper.includes("VALOR BASE") &&
          (textoUpper.includes("VALOR COMISSÃO") ||
            textoUpper.includes("VALOR COMISSAO") ||
            textoUpper.includes("VALOR COMI") ||
            textoUpper.includes("VALOR ANGARIAÇÃO")))
      )
        extratoOperadora = "MONGERAL";
      else if (textoUpper.includes("QUALICORP"))
        extratoOperadora = "QUALICORP";
      setCurrentReportOperadora(extratoOperadora);
    }

    // Padrão SulAmérica: extrai o mesmo layout para PROPER e PROTETTA.
    // O nome do produtor/corretora que aparece no PDF não define a loja do relatório.
    // A loja, assessoria, vendedor padrão e situação seguem sempre a empresa logada.
    const operadoraNormalizada = (extratoOperadora || "")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "");
    const isSulAmericaExtrato = operadoraNormalizada.includes("SULAMERICA");
    const isAmilExtrato = operadoraNormalizada.includes("AMIL");
    const isMongeralExtrato =
      operadoraNormalizada.includes("MONGERAL") ||
      ((textoUpper.includes("CPF/CNPJ") || textoUpper.includes("CPF/CNPJ DO CL") || textoUpper.includes("CPF/CNPJ DO PRODUTOR")) &&
        (textoUpper.includes("NOME/RAZÃO SOCIAL") || textoUpper.includes("NOME/RAZAO SOCIAL")) &&
        textoUpper.includes("VALOR BASE"));
    const isPortoExtrato =
      operadoraNormalizada.includes("PORTO") ||
      (textoUpper.includes("HISTÓRICO") &&
        textoUpper.includes("MARCA") &&
        textoUpper.includes("SUC.") &&
        textoUpper.includes("RAMO"));
    const isMapfreExtrato =
      operadoraNormalizada.includes("MAPFRE") ||
      textoUpper.includes("EXTRATO COMISSÃO - MSG") ||
      (textoUpper.includes("RAMO PRODUTO APÓLICE") &&
        textoUpper.includes("PRÊMIO LÍQUIDO") &&
        textoUpper.includes("VALOR COMISSÃO"));
    const isAllianzExtrato =
      operadoraNormalizada.includes("ALLIANZ") ||
      textoUpper.includes("ALLIANZ SEGUROS") ||
      textoUpper.includes("EXTRATO DE COMISSÕES PAGAS POR SUSEP") ||
      textoUpper.includes("EXTRATO DE COMISSOES PAGAS POR SUSEP");
    const isSuhaiExtrato =
      operadoraNormalizada.includes("SUHAI") ||
      (textoUpper.includes("DEMONSTRATIVO DE COMISSÃO") &&
        textoUpper.includes("APÓLICE-ENDOSSO") &&
        textoUpper.includes("TIPO DE PAGAMENTO"));
    const isOdontoprevExtrato =
      operadoraNormalizada.includes("ODONTOPREV") ||
      textoUpper.includes("ODONTOPREV") ||
      /(?:^|\s)\d+(?:\s+\d+)?\s+[a-zA-ZÀ-ÿ0-9 .&'\(\)\/,-]+?\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+-?[\d.,]+%?\s+-?[\d.,]+\s+-?[\d.,]+\b/i.test(textoNormalizado) ||
      ((textoUpper.includes("BENEFICIÁRIO") || textoUpper.includes("BENEFICIARIO")) &&
        (textoUpper.includes("OSCILAÇÃO") || textoUpper.includes("OSCILACAO")) &&
        textoUpper.includes("CUSTO") &&
        (textoUpper.includes("COMISSÃO") || textoUpper.includes("COMISSAO")));
    const isMetlifeExtrato =
      operadoraNormalizada.includes("METLIFE") ||
      textoUpper.includes("METLIFE") ||
      (textoUpper.includes("DEMONSTRATIVO DE COMISSÕES") &&
        (textoUpper.includes("PRODUTO ODONTOLÓGICO") ||
          textoUpper.includes("PRODUTO ODONTOLOGICO")) &&
        textoUpper.includes("VALOR BRUTO"));
    const isCassiPasiExtrato =
      operadoraNormalizada.includes("CASSIPASI") ||
      textoUpper.includes("CASSI") ||
      textoUpper.includes("PASI") ||
      (textoUpper.includes("EXTRATO ANALÍTICO EMPRESARIAL") &&
        textoUpper.includes("ESTIPULANTE") &&
        textoUpper.includes("SUBESTIPULANTE"));
    const isHdiExtrato =
      operadoraNormalizada.includes("HDI") ||
      (textoUpper.includes("TIPO CMS") &&
        (textoUpper.includes("PRÊMIO") || textoUpper.includes("PREMIO")) &&
        textoUpper.includes("VALOR (R$)"));
    const isPetLoveExtrato =
      operadoraNormalizada.includes("PETLOVE") ||
      textoUpper.includes("PET LOVE") ||
      textoUpper.includes("PETLOVE") ||
      (textoUpper.includes("NOME DO TUTOR") &&
        (textoUpper.includes("COMISSÃO PAGA") ||
          textoUpper.includes("COMISSAO PAGA")));
    const isTokioExtrato =
      operadoraNormalizada.includes("TOKIO") ||
      textoUpper.includes("TOKIO MARINE") ||
      (textoUpper.includes("EXTRATO DO CORRETOR") &&
        (textoUpper.includes("SEGURADO NEGÓCIO RAMO") ||
          textoUpper.includes("SEGURADO NEGOCIO RAMO")) &&
        (textoUpper.includes("APOLICE") || textoUpper.includes("APÓLICE")) &&
        (textoUpper.includes("COMISSÃO (R$)") ||
          textoUpper.includes("COMISSAO (R$)")));
    const isIcatuExtrato =
      operadoraNormalizada.includes("ICATU") ||
      textoUpper.includes("EXTRATO ANALÍTICO INDIVIDUAL") ||
      textoUpper.includes("EXTRATO ANALITICO INDIVIDUAL") ||
      textoUpper.includes("ESSENCIAL-CANAL CORRETOR") ||
      textoUpper.includes("PAGAMENTO DE COMISSÃO DE CORRETAGEM") ||
      textoUpper.includes("PAGAMENTO DE COMISSAO DE CORRETAGEM");
    const empresaSulAmerica = nomeEmpresa;
    const empresaSulAmericaUpper = nomeEmpresaUpper;
    const empresaAmil = nomeEmpresa;
    const empresaAmilUpper = nomeEmpresaUpper;
    if (isSulAmericaExtrato || isAmilExtrato) {
      setCurrentReportEmpresa(nomeEmpresa);
    }

    const novosRegistos = [];
    const clientesParaInserir = [];
    const clientesParaAtualizar = new Map();
    const nomesClientesExistem = new Set(
      clientes.map((c) => c.nome.toLowerCase()),
    );

    let currentMaxVendaCodigo = getAllVendas().reduce((max, v) => {
      let num = parseInt(v.numero, 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);

    let currentMaxCodigo = clientes.reduce((max, c) => {
      let v = parseInt(c.codigo, 10);
      return !isNaN(v) && v > max ? v : max;
    }, 0);

    const extractDataDoExtrato = (origem) => {
      const raw = String(origem || "")
        .replace(/\s+/g, " ")
        .trim();
      if (!raw) return "";
      const padraoData = "(\\d{1,2}[\\/.-]\\d{1,2}[\\/.-]\\d{2,4})";
      const patterns = [
        new RegExp("Extrato\\s+de\\s+Pagamento\\s+de\\s*" + padraoData, "i"),
        new RegExp("Pagamento\\s+em\\s*:?\\s*" + padraoData, "i"),
        new RegExp(
          "Data\\s+(?:de|do)?\\s*(?:Pagamento|Cr[eé]dito|Processamento|Recibo|Emiss[aã]o|Fatura|Lan[cç]amento)\\s*:?\\s*" +
            padraoData,
          "i",
        ),
        new RegExp("Data\\s+Pag\\.?\\s*:?\\s*" + padraoData, "i"),
        new RegExp(
          "Dt\\.?\\s*(?:Pagamento|Cr[eé]dito|Pag\\.)\\s*:?\\s*" + padraoData,
          "i",
        ),
        new RegExp(
          "(?:Pago|Paga|Creditado|Cr[eé]dito)\\s+(?:em|no\\s+dia)?\\s*:?\\s*" +
            padraoData,
          "i",
        ),
      ];
      for (const rx of patterns) {
        const match = raw.match(rx);
        if (match) return formatDateForInput(match[1]);
      }
      return "";
    };

    const dataGlobalExtratoDetectada = extractDataDoExtrato(textoNormalizado);

    const cleanExtractedName = (value) =>
      String(value || "")
        .replace(/\s+/g, " ")
        .replace(
          /^(?:CLIENTE|NOME|SEGURADO|BENEFICIARIO|BENEFICIÁRIO)\s*[:\-]?\s*/i,
          "",
        )
        .replace(/\s+(?:CPF|CNPJ|PARCELA|VALOR|COMISS[AÃ]O|PR[ÊE]MIO).*$/i, "")
        .trim();

    const extractInstallment = (value) => {
      const str = String(value || "").trim();
      if (!str) return "";
      let match =
        str.match(/Parcela\s+(\d+)/i) ||
        str.match(/(\d+)\s*(?:º|ª|o|a)?\s*Parcela/i) ||
        str.match(/^(\d+)\b/);
      return match ? match[1] : "";
    };

    const normalizeHeaderKey = (key) =>
      String(key || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

    const getRowValue = (row, possibleKeys) => {
      if (!row) return "";
      const normalMap = Object.keys(row).reduce((acc, key) => {
        acc[normalizeHeaderKey(key)] = row[key];
        return acc;
      }, {});
      for (const key of possibleKeys) {
        const normalKey = normalizeHeaderKey(key);
        if (Object.prototype.hasOwnProperty.call(normalMap, normalKey))
          return normalMap[normalKey];
      }
      return "";
    };

    const getRowValueFuzzy = (row, possibleKeys) => {
      if (!row) return "";
      const normalizeLoose = (value) =>
        normalizeHeaderKey(value).replace(/[^a-z0-9]+/g, "");
      const keys = Object.keys(row);
      for (const key of possibleKeys) {
        const exact = getRowValue(row, [key]);
        if (exact !== "" && exact !== undefined && exact !== null) return exact;
      }
      const normalizedTargets = possibleKeys
        .map((k) => normalizeLoose(k))
        .filter(Boolean);
      for (const rowKey of keys) {
        const looseRowKey = normalizeLoose(rowKey);
        if (!looseRowKey) continue;
        if (
          normalizedTargets.some(
            (target) =>
              looseRowKey.includes(target) || target.includes(looseRowKey),
          )
        )
          return row[rowKey];
      }
      return "";
    };

    const formatCompetenciaToDate = (value) => {
      const str = String(value || "").trim();
      if (!str) return "";
      const compact = str.replace(/\D/g, "");
      if (/^\d{6}$/.test(compact)) {
        const firstFour = Number(compact.slice(0, 4));
        if (firstFour >= 1900) {
          const ano = compact.slice(0, 4);
          const mes = compact.slice(4, 6);
          return `${ano}-${mes}-01`;
        }
        const mes = compact.slice(0, 2);
        const ano = compact.slice(2, 6);
        return `${ano}-${mes}-01`;
      }
      const mesAno = str.match(/(\d{1,2})\s*[\/.-]\s*(\d{4})/);
      if (mesAno) return `${mesAno[2]}-${mesAno[1].padStart(2, "0")}-01`;
      return formatDateForInput(str);
    };

    const onlyDigitsAndSeparators = (value) =>
      String(value || "")
        .replace(/\s+/g, "")
        .replace(/[^0-9,./-]/g, "");

    const parseCsvLikeRows = (rawText, delimiter = ";") => {
      const raw = String(rawText || "").replace(/^\uFEFF/, "");
      if (!raw.trim()) return [];
      const rows = [];
      let current = "";
      let row = [];
      let inQuotes = false;
      for (let i = 0; i < raw.length; i++) {
        const char = raw[i];
        const next = raw[i + 1];
        if (char === '"') {
          if (inQuotes && next === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          row.push(current);
          current = "";
        } else if ((char === "\n" || char === "\r") && !inQuotes) {
          if (char === "\r" && next === "\n") i++;
          row.push(current);
          if (row.some((cell) => String(cell || "").trim() !== ""))
            rows.push(row);
          row = [];
          current = "";
        } else {
          current += char;
        }
      }
      row.push(current);
      if (row.some((cell) => String(cell || "").trim() !== "")) rows.push(row);
      if (rows.length < 2) return [];
      const headers = rows[0].map((h) =>
        String(h || "")
          .replace(/^\uFEFF/, "")
          .trim(),
      );
      return rows.slice(1).map((cols) =>
        headers.reduce((acc, header, idx) => {
          acc[header || `COL_${idx + 1}`] = String(cols[idx] || "")
            .replace(/^\t+/, "")
            .trim();
          return acc;
        }, {}),
      );
    };

    const pushRegistroExtraido = (data) => {
      if (!data) return false;
      let nomeCliente = cleanExtractedName(data.cliente).toUpperCase();
      if (
        !nomeCliente ||
        nomeCliente.length < 3 ||
        /^(TOTAL|SUBTOTAL|CLIENTE|NOME\/RAZ[ÃA]O SOCIAL)$/i.test(nomeCliente)
      )
        return false;

      const valorTotal = parseCurrencyValue(data.valorTotal);
      const comissao = parseCurrencyValue(data.comissao);
      if (valorTotal === 0 && comissao === 0) return false;

      currentMaxVendaCodigo++;
      let codRegistro = String(currentMaxVendaCodigo).padStart(5, "0");
      const contratoDetectado = String(data.contrato || "").trim();
      const empresaRegistro =
        data.empresaRegistro || (isAmilExtrato ? empresaAmil : empresaContexto);
      const empresaRegistroUpper =
        data.empresaRegistroUpper ||
        (isAmilExtrato ? empresaAmilUpper : empresaContextoUpper);
      let amilDataIso = "";
      if (isAmilExtrato && typeof data.data === "string") {
        const mapRef = data.data.match(/(?<!\d\/)\b(\d{2})\/(\d{4})\b/);
        if (mapRef) {
          const lastDay = mapRef[1] === "02" ? "28" : "30";
          amilDataIso = `${mapRef[2]}-${mapRef[1]}-${lastDay}`;
        }
      }
      const dataMovimentoIso =
        amilDataIso ||
        formatDateForInput(data.data) ||
        (isAmilExtrato
          ? dataGlobalExtratoDetectada || formatDateForInput(reportDoc?.date)
          : dataDeHojeInterna());
      const dataMovimentoDetectada = data.formatoDataBR
        ? formatDateBR(data.data) || dataMovimentoIso
        : dataMovimentoIso;

      if (!nomesClientesExistem.has(nomeCliente.toLowerCase())) {
        nomesClientesExistem.add(nomeCliente.toLowerCase());
        currentMaxCodigo++;
        let newCodigo = String(currentMaxCodigo).padStart(5, "0");
        clientesParaInserir.push({
          codigo: contratoDetectado || newCodigo,
          nome: nomeCliente,
          tipo: data.tipoCliente || "Pessoa jurídica",
          documento: data.documento || "",
          telefone: "",
          celular: "",
          email: "",
          situacao: true,
          operadora: extratoOperadora,
          empresa: empresaRegistro,
        });
      } else {
        let existingCli = clientes.find(
          (c) => c.nome.toLowerCase() === nomeCliente.toLowerCase(),
        );
        if (
          existingCli &&
          (!existingCli.operadora ||
            existingCli.operadora.trim() === "" ||
            existingCli.operadora === "-")
        ) {
          if (!clientesParaAtualizar.has(existingCli.id)) {
            clientesParaAtualizar.set(existingCli.id, {
              operadora: extratoOperadora,
            });
          }
        }
      }

      let vendedorDetectado = nomeEmpresa;
      let inicioVigenciaDetectada = formatDateForInput(data.inicioVigencia);
      const historicoVendasCliente = vendasList.filter(
        (v) =>
          (v.cliente &&
            v.cliente.toLowerCase() === nomeCliente.toLowerCase()) ||
          (contratoDetectado && v.contrato === contratoDetectado),
      );

      if (historicoVendasCliente.length > 0) {
        const ultimaVenda = historicoVendasCliente.sort(
          (a, b) => new Date(b.dataVenda) - new Date(a.dataVenda),
        )[0];
        if (ultimaVenda.corretor && ultimaVenda.corretor !== "Todos")
          vendedorDetectado = ultimaVenda.corretor;
        if (!inicioVigenciaDetectada && ultimaVenda.inicioVigencia)
          inicioVigenciaDetectada = ultimaVenda.inicioVigencia;
      }

      let calcParcela = calcularParcelaDaVigencia(
        inicioVigenciaDetectada,
        dataMovimentoIso || dataMovimentoDetectada,
      );
      if (
        !calcParcela &&
        !inicioVigenciaDetectada &&
        historicoVendasCliente &&
        historicoVendasCliente.length > 0
      ) {
        const primeiraVenda = historicoVendasCliente.sort(
          (a, b) => new Date(a.dataVenda) - new Date(b.dataVenda),
        )[0];
        if (primeiraVenda && primeiraVenda.dataVenda) {
          let diff = calcularParcelaDaVigencia(
            primeiraVenda.dataVenda,
            dataMovimentoIso || dataMovimentoDetectada,
          );
          let diffNum = parseInt(diff, 10);
          let baseParcela = parseInt(primeiraVenda.parcela || "1", 10);
          if (!isNaN(diffNum) && !isNaN(baseParcela)) {
            calcParcela = String(Math.max(1, baseParcela + (diffNum - 1)));
          }
        }
      }
      let parcelaDetectada = data.parcela || calcParcela || "1";

      novosRegistos.push({
        cod: extratoCodOperadora || codRegistro,
        contrato: contratoDetectado,
        codOperadora: extratoCodOperadora || null,
        codigoOperadora: data.codigoOperadora || extratoOperadora,
        vidas: data.vidas || "1",
        cliente: nomeCliente,
        data: dataMovimentoDetectada,
        situacao: `FATURADO ${empresaRegistroUpper} NF`,
        loja: data.loja || empresaRegistroUpper,
        valorTotal,
        comissao,
        vendedor: data.vendedor || vendedorDetectado,
        parcela: String(parcelaDetectada),
        inicioVigencia: inicioVigenciaDetectada,
        notaFiscal:
          reportDoc?.notaFiscal ||
          reportDoc?.parceiro?.match(/\(NF:\s*([^)]+)\)/)?.[1] ||
          "",
        vitalicio: data.vitalicio !== undefined ? data.vitalicio : "Sim",
        assessoria: data.assessoria || empresaRegistro,
        formaPagamento:
          data.formaPagamento ||
          (empresaRegistroUpper === "PROPER"
            ? "Dinheiro à vista"
            : "Crédito em conta"),
        servico: data.servico || "Saúde",
        desconto: data.desconto || "",
        comissaoPorcentagem: data.comissaoPorcentagem || "",
        selected: true,
      });
      return true;
    };

    const processPortoRows = (rows) => {
      let sourceRows = Array.isArray(rows) ? rows : [];
      const hasExpectedHeaders = sourceRows.some((row) => {
        const keys = Object.keys(row || {}).map(normalizeHeaderKey);
        return (
          keys.includes("historico") &&
          (keys.includes("apl/prop.") ||
            keys.includes("apl/prop") ||
            keys.includes("contrato"))
        );
      });
      if (texto.includes(";")) {
        sourceRows = parseCsvLikeRows(texto, ";");
      } else if (!hasExpectedHeaders && texto.includes("\t")) {
        sourceRows = parseCsvLikeRows(texto, "\t");
      }
      if (!Array.isArray(sourceRows) || sourceRows.length === 0) return false;

      let count = 0;
      sourceRows.forEach((row) => {
        const cliente = getRowValue(row, ["Histórico", "Historico", "Cliente"]);
        const proposta = getRowValue(row, [
          "Apl/Prop.",
          "Apl/Prop",
          "Apólice",
          "Apolice",
          "Contrato",
        ]);
        const parcela = getRowValue(row, ["Parc.", "Parc", "Parcela"]);
        const dataEfetivacao = getRowValue(row, ["Data", "Data de efetivação"]);
        const premio = parseCurrencyValue(
          getRowValue(row, ["Prêmio", "Premio", "Valor bruto"]),
        );
        let comissao = parseCurrencyValue(
          getRowValue(row, ["Comissão", "Comissao", "Valor comissão"]),
        );
        const tipo = String(getRowValue(row, ["Tipo"]) || "").toUpperCase();

        if (
          tipo.includes("ESTORNO") ||
          tipo.includes("CANCELAMENTO") ||
          tipo.includes("RESTITUICAO")
        ) {
          if (comissao > 0) comissao = -comissao;
        }

        if (!cliente || !proposta || (premio === 0 && comissao === 0)) return;
        const inserted = pushRegistroExtraido({
          contrato: proposta,
          cliente,
          parcela: parcela || "1",
          data: dataEfetivacao,
          valorTotal: premio || comissao,
          comissao,
          tipoCliente: "Pessoa física",
          documento: "",
          codigoOperadora: "PORTO SEGURO",
          vitalicio: "Não",
          servico: "Seguro",
          desconto: "",
        });
        if (inserted) count++;
      });
      return count > 0;
    };

    const processPreventRows = (rows) => {
      if (!Array.isArray(rows) || rows.length === 0) return false;
      let count = 0;
      rows.forEach((row) => {
        const lowerKeys = Object.keys(row || {}).reduce((acc, key) => {
          acc[String(key).trim().toLowerCase()] = row[key];
          return acc;
        }, {});
        const beneficiario =
          lowerKeys["beneficiario"] ||
          lowerKeys["beneficiário"] ||
          lowerKeys["cliente"] ||
          lowerKeys["nome"];
        const matricula =
          lowerKeys["matricula"] ||
          lowerKeys["matrícula"] ||
          lowerKeys["contrato"];
        const produto = lowerKeys["produto"] || "";
        const tipoComissao =
          lowerKeys["tipo comissão"] || lowerKeys["tipo comissao"] || "";
        const provento = parseCurrencyValue(lowerKeys["valor provento"]);
        const estorno = parseCurrencyValue(lowerKeys["valor estorno"]);
        const valorComissao =
          provento !== 0 ? provento : estorno !== 0 ? -Math.abs(estorno) : 0;
        if (!beneficiario || !matricula || valorComissao === 0) return;
        const inserted = pushRegistroExtraido({
          contrato: matricula,
          cliente: beneficiario,
          parcela: extractInstallment(tipoComissao) || "1",
          inicioVigencia: lowerKeys["data assinatura"],
          data: lowerKeys["data envio"],
          formatoDataBR: true,
          valorTotal: Math.abs(valorComissao),
          comissao: valorComissao,
          vitalicio: /vital/i.test(String(tipoComissao)) ? "Sim" : "Não",
          servico: /odonto|dental/i.test(String(produto))
            ? "Plano Dental"
            : "Plano de Saúde",
        });
        if (inserted) count++;
      });
      return count > 0;
    };

    const processMongeralRows = (rows) => {
      let sourceRows = Array.isArray(rows) ? rows : [];
      const hasExpectedHeaders = sourceRows.some((row) => {
        const keys = Object.keys(row || {}).map(normalizeHeaderKey);
        return (
          keys.includes("nome/razao social") &&
          keys.includes("proposta") &&
          keys.includes("valor base")
        );
      });
      if (texto.includes(";")) {
        sourceRows = parseCsvLikeRows(texto, ";");
      } else if (!hasExpectedHeaders && texto.includes("\t")) {
        sourceRows = parseCsvLikeRows(texto, "\t");
      }
      if (!Array.isArray(sourceRows) || sourceRows.length === 0) return false;

      let count = 0;
      sourceRows.forEach((row) => {
        const cliente = getRowValue(row, [
          "Nome/Razão social",
          "Nome/Razao social",
          "Cliente",
          "Segurado",
        ]);
        const proposta = getRowValue(row, ["Proposta", "Contrato"]);
        const parcela = getRowValue(row, [
          "Parcela comissionada",
          "Parcela faturada",
          "Parcela",
        ]);
        const dataEfetivacao = getRowValue(row, [
          "Data de efetivação do crédito/débito",
          "Data de efetivacao do credito/debito",
          "Data prevista",
        ]);
        const tipoCliente = getRowValue(row, ["Tipo de cliente"]);
        const documento = getRowValue(row, [
          "CPF/CNPJ do cliente",
          "Documento",
        ]);
        const produto = getRowValue(row, [
          "Descrição Produto",
          "Descricao Produto",
          "Produto",
        ]);
        const tipoLancamento = getRowValue(row, [
          "Tipo de lançamento",
          "Tipo de lancamento",
        ]);
        const tipoPagamento = String(
          getRowValue(row, ["Tipo de pagamento"]) || "",
        ).toUpperCase();

        const valorBase = parseCurrencyValue(
          getRowValue(row, ["Valor base", "Valor Base"]),
        );
        const valorComissao = parseCurrencyValue(
          getRowValue(row, ["Valor Comissão", "Valor Comissao"]),
        );
        const valorAngariacao = parseCurrencyValue(
          getRowValue(row, ["Valor Angariação", "Valor Angariacao"]),
        );
        const valorIncentivo = parseCurrencyValue(
          getRowValue(row, ["Valor incentivo", "Valor Incentivo"]),
        );
        const valorBonificacao = parseCurrencyValue(
          getRowValue(row, ["Valor bonificação", "Valor bonificacao"]),
        );
        const valorEstorno = parseCurrencyValue(
          getRowValue(row, ["Valor estorno", "Valor Estorno"]),
        );

        let comissao =
          valorComissao ||
          valorAngariacao ||
          valorIncentivo ||
          valorBonificacao;
        if (valorEstorno) comissao = -Math.abs(valorEstorno);
        if (
          tipoPagamento.includes("DEBITO") ||
          tipoPagamento.includes("DÉBITO")
        )
          comissao = -Math.abs(comissao);

        if (!cliente || !proposta || (valorBase === 0 && comissao === 0))
          return;
        const inserted = pushRegistroExtraido({
          contrato: proposta,
          cliente,
          parcela: parcela || "1",
          data: dataEfetivacao,
          valorTotal: valorBase,
          comissao,
          tipoCliente: String(tipoCliente || "")
            .toUpperCase()
            .includes("INDIVIDUAL")
            ? "Pessoa física"
            : "Pessoa jurídica",
          documento: String(documento || "").replace(/[^0-9]/g, ""),
          codigoOperadora: "MONGERAL",
          vitalicio: "Sim",
          servico: /vida|life|sucess[aã]o|morte|acidental|term/i.test(
            String(produto),
          )
            ? "Seguro de Vida"
            : "Seguro",
          desconto: "",
        });
        if (inserted) count++;
      });
      return count > 0;
    };

    const processHdiRows = (rows) => {
      let sourceRows = Array.isArray(rows) ? rows : [];
      const hasExpectedHeaders = sourceRows.some((row) => {
        const keys = Object.keys(row || {})
          .map(normalizeHeaderKey)
          .join(" ");
        return (
          keys.includes("tipo cms") &&
          keys.includes("cliente") &&
          (keys.includes("premio") || keys.includes("prêmio")) &&
          keys.includes("valor")
        );
      });
      if (!hasExpectedHeaders && textoNormalizado.includes(";")) {
        sourceRows = parseCsvLikeRows(texto, ";");
      }
      if (!Array.isArray(sourceRows) || sourceRows.length === 0) return false;

      let count = 0;
      sourceRows.forEach((row) => {
        const tipoCms = getRowValueFuzzy(row, [
          "Tipo Cms.",
          "Tipo Cms",
          "Tipo Comissão",
          "Tipo Comissao",
        ]);
        const data = getRowValueFuzzy(row, ["Data", "Data Pagamento"]);
        const documento = getRowValueFuzzy(row, [
          "Documento",
          "Apólice",
          "Apolice",
          "Contrato",
        ]);
        const cliente = getRowValueFuzzy(row, ["Cliente", "Segurado", "Nome"]);
        const premio = parseCurrencyValue(
          getRowValueFuzzy(row, [
            "Prêmio (R$)",
            "Premio (R$)",
            "Prêmio",
            "Premio",
          ]),
        );
        const percentual = getRowValueFuzzy(row, [
          "%",
          "Percentual",
          "Comissão %",
          "Comissao %",
        ]);
        const comissao = parseCurrencyValue(
          getRowValueFuzzy(row, [
            "Valor (R$)",
            "Valor",
            "Comissão",
            "Comissao",
          ]),
        );
        if (!cliente || (premio === 0 && comissao === 0)) return;

        const docStr = String(documento || "")
          .replace(/\s+/g, " ")
          .trim();
        const contrato = (docStr.split("-")[0] || docStr).trim();
        const parcelaMatch =
          docStr.match(/-\s*(\d+)\s*\/\s*(\d+)\s*-/) ||
          docStr.match(/\b(\d+)\s*\/\s*(\d+)\b/);
        const parcela = parcelaMatch ? parcelaMatch[1] : "1";

        const inserted = pushRegistroExtraido({
          contrato,
          cliente,
          parcela,
          data,
          valorTotal: premio,
          comissao,
          codigoOperadora: "HDI",
          vitalicio: "Não",
          servico: "Seguro",
          desconto:
            `${String(tipoCms || "").trim()} ${percentual ? `/ Comissão ${percentual}%` : ""}`.trim(),
        });
        if (inserted) count++;
      });
      return count > 0;
    };

    const processPetLoveRows = (rows) => {
      if (!Array.isArray(rows) || rows.length === 0) return false;
      let count = 0;
      rows.forEach((row) => {
        const cliente = getRowValueFuzzy(row, [
          "Nome do Tutor",
          "Tutor",
          "Cliente",
          "Nome",
        ]);
        const proposta = getRowValueFuzzy(row, [
          "Proposta",
          "Contrato",
          "Número da Carteirinha (MV)",
          "Numero da Carteirinha (MV)",
          "Id do Pet",
        ]);
        const parcela = getRowValueFuzzy(row, [
          "Número da Parcela",
          "Numero da Parcela",
          "Parcela",
        ]);
        const dataPagamento = getRowValueFuzzy(row, [
          "Data de Pagamento",
          "Data Pagamento",
          "Data",
        ]);
        const plano = getRowValueFuzzy(row, ["Nome do Plano", "Plano"]);
        const pet = getRowValueFuzzy(row, ["Nome do Pet", "Pet"]);
        const status = getRowValueFuzzy(row, ["Status"]);
        const documento = String(
          getRowValueFuzzy(row, ["CPF do Tutor", "CPF", "Documento"]) || "",
        ).replace(/[^0-9]/g, "");
        const valor = parseCurrencyValue(
          getRowValueFuzzy(row, [
            "Valor da Parcela",
            "Valor",
            "Prêmio",
            "Premio",
          ]),
        );
        const aliquotaRaw = getRowValueFuzzy(row, [
          "Alíquota",
          "Aliquota",
          "%",
        ]);
        const aliquota = parseCurrencyValue(aliquotaRaw);
        let comissao = parseCurrencyValue(
          getRowValueFuzzy(row, [
            "Comissão Paga",
            "Comissao Paga",
            "Comissão",
            "Comissao",
          ]),
        );
        if (!comissao && valor && aliquota) comissao = valor * (aliquota / 100);
        if (!cliente || (valor === 0 && comissao === 0)) return;

        const inserted = pushRegistroExtraido({
          contrato: proposta,
          cliente,
          parcela: parcela || "1",
          data: dataPagamento,
          valorTotal: valor,
          comissao,
          codigoOperadora: "PET LOVE",
          tipoCliente: "Pessoa física",
          documento,
          vitalicio: "Não",
          servico: "Seguro Pet",
          desconto:
            `${plano || ""}${pet ? ` / Pet: ${pet}` : ""}${status ? ` / Status: ${status}` : ""}`.trim(),
        });
        if (inserted) count++;
      });
      return count > 0;
    };

    const extractMetlifeDataPagamento = (origem) => {
      const raw = String(origem || "")
        .replace(/\s+/g, " ")
        .trim();
      const match = raw.match(
        /Data\s+Pagamento\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      );
      return match ? formatDateForInput(match[1]) : "";
    };

    const processMetlifeExtrato = () => {
      const dataPagamentoMetlife =
        extractMetlifeDataPagamento(textoNormalizado) ||
        dataGlobalExtratoDetectada ||
        formatDateForInput(reportDoc?.date);
      const metlifeText = String(textoNormalizado || "").replace(/\s+/g, " ");
      const metlifeRegex =
        /(?:^|\s)(\d{4,})\s+([A-ZÀ-ÿ][A-ZÀ-ÿ0-9 .&'\/-]+?)\s+(\d{5,})\s+(\d+)\s+\(?[A-Z0-9]+\)?\s+(.+?)\s+(\d{1,2}\s*\/\s*\d{4})\s+([\d.,\s]+?)\s+([\d.,\s]+?)\s+([\d.,\s]+?)\s+([\d.,\s]+?)(?=\s+\d{4,}\s+[A-ZÀ-ÿ]|\s+Sub-?Tot|\s+IRRF|\s+TOTAL|\s*$)/gi;
      let match;
      let count = 0;
      while ((match = metlifeRegex.exec(metlifeText)) !== null) {
        const apolice = match[1].replace(/\s+/g, "");
        const cliente = cleanExtractedName(match[2]);
        const endosso = match[3].replace(/\s+/g, "");
        const parcela = match[4];
        const tipoComissao = String(match[5] || "")
          .replace(/\s+/g, " ")
          .trim();
        const vigencia = onlyDigitsAndSeparators(match[6]);
        const baseCalculo = parseCurrencyValue(
          onlyDigitsAndSeparators(match[8]),
        );
        const premioLiquido = parseCurrencyValue(
          onlyDigitsAndSeparators(match[9]),
        );
        const valorComissao = parseCurrencyValue(
          onlyDigitsAndSeparators(match[10]),
        );
        const valorTotal = premioLiquido || baseCalculo;
        if (
          !cliente ||
          /PRODUTO|RAMO|SUBTOTAL|TOTAL/i.test(cliente) ||
          (valorTotal === 0 && valorComissao === 0)
        )
          continue;
        const inserted = pushRegistroExtraido({
          contrato: apolice,
          cliente,
          parcela,
          inicioVigencia: formatCompetenciaToDate(vigencia),
          data: dataPagamentoMetlife,
          valorTotal,
          comissao: valorComissao,
          codigoOperadora: "METLIFE",
          vitalicio: "Não",
          servico: "Plano Dental",
          desconto: `${tipoComissao} / Endosso ${endosso}`,
        });
        if (inserted) count++;
      }

      // Fallback para o PDF da MetLife quando o texto vem quebrado em muitas colunas pelo PDF.js.
      if (count === 0) {
        const metlifeAgdRegex =
          /(?:^|\s)(\d{4,})\s+([A-ZÀ-ÿ][A-ZÀ-ÿ .&'\/-]+?)\s+(\d{5,})\s+(\d+)\s+\(?[A-Z0-9]+\)?\s+Agenciamento\s+por\s+(\d\s*\d\s*\/\s*\d\s*\d\s*\d\s*\d|\d{1,2}\s*\/\s*\d{4})\s+([\d\s]+,\s*\d\s*\d?)\s+([\d\s]+,\s*\d\s*\d?)\s+([\d\s]+,\s*\d\s*\d?)\s+([\d\s]+,\s*\d\s*\d?)(?=\s+\d{4,}\s+\d{11}|\s+\d{4,}\s+[A-ZÀ-ÿ]|\s+Sub|\s+IRRF|\s+TOTAL|$)/gi;
        let agdMatch;
        while ((agdMatch = metlifeAgdRegex.exec(metlifeText)) !== null) {
          const valorPremio =
            parseCurrencyValue(onlyDigitsAndSeparators(agdMatch[8])) ||
            parseCurrencyValue(onlyDigitsAndSeparators(agdMatch[9]));
          const valorComissao = parseCurrencyValue(
            onlyDigitsAndSeparators(agdMatch[9]),
          );
          const inserted = pushRegistroExtraido({
            contrato: agdMatch[1].replace(/\s+/g, ""),
            cliente: agdMatch[2],
            parcela: agdMatch[4],
            inicioVigencia: formatCompetenciaToDate(
              onlyDigitsAndSeparators(agdMatch[5]),
            ),
            data: dataPagamentoMetlife,
            valorTotal: valorPremio,
            comissao: valorComissao,
            codigoOperadora: "METLIFE",
            vitalicio: "Não",
            servico: "Plano Dental",
            desconto: `Agenciamento por Adesão / Endosso ${agdMatch[3].replace(/\s+/g, "")}`,
          });
          if (inserted) count++;
        }
      }
      return count > 0;
    };

    const processCassiPasiExtrato = () => {
      const cassiRegex =
        /CLUBE\s+PASI\s+DE\s+SEGUROS\s+([A-ZÀ-ÿ0-9 .&'\/-]+?)\s+Pagamento\s+de\s+Comiss[aã]o\s+de\s+Corretagem\s+(\d+)\s+(\d+)\s+(\d{6})\s+R\$?\s*([\d.]+,\d{2})\s+R\$?\s*([\d.]+,\d{2})/gi;
      let match;
      let count = 0;
      while ((match = cassiRegex.exec(textoNormalizado)) !== null) {
        const estipulante = "CLUBE PASI DE SEGUROS";
        const subestipulante = cleanExtractedName(match[1]);
        const apolice = match[2];
        const fatura = match[3];
        const competencia = match[4];
        const premio = parseCurrencyValue(match[5]);
        const comissao = parseCurrencyValue(match[6]);
        const cliente = subestipulante || estipulante;
        if (!cliente || (premio === 0 && comissao === 0)) continue;
        const inserted = pushRegistroExtraido({
          contrato: apolice,
          cliente,
          parcela: competencia.slice(4, 6),
          data: formatCompetenciaToDate(competencia),
          valorTotal: premio,
          comissao,
          codigoOperadora: "CASSI PASI",
          vitalicio: "Não",
          servico: "Seguro de Vida",
          desconto: `Estipulante ${estipulante} / Fatura ${fatura} / Competência ${competencia}`,
        });
        if (inserted) count++;
      }
      return count > 0;
    };

    const ODONTOPREV_CONTRACT_MAPPING = {};
    const BRADESCO_CONTRACT_MAPPING = {
      244740: "FLORIANO PEREIRA ABINADER",
      288392: "BPF ENGENHARIA E INSTALACOES LTDA",
      654616: "ALEXANDRE MIRANDA SERVICOS MEDICOS LTDA",
      658402: "ETICA - SERVICOS MEDICOS LTDA",
      672143: "DAZIL RIO DISTRIBUIDORA DE COSMETICOS LTDA",
      859277: "EMANUEL PEDRO GEFE DA ROSA MESQUITA 09055814741",
      859278: "EMANUEL PEDRO GEFE (ODONTO- BRADESCO)",
      892870: "HDE INSTALACOES E MONTAGENS LTDA",
      892871: "HDE INSTALACOES E MONTAGENS LTDA",
      915444: "A PRIMORDIAL - BRADESCO",
      975126: "M.D. SERVICOS MEDICOS LTDA (bradesco)",
      975127: "M.D. SERVICOS MEDICOS LTDA S/C",
      979157: "META DE RESENDE IMOBILIARIA LTDA",
      996020: "VIRTUALL VA LTDA-EPP",
      996021: "VIRTUALL (ODONTO - BRADESCO)",
      1010073: "DROGARIA E PERFUMARIA EMANUEL LTDA",
      1016539: "JB CONSULTING LTDA",
      1016540: "JB CONSULTING LTDA",
      1036920: "GERMAX ENGENHARIA LTDA",
      1037087: "MMV ESTATE EMPREENDIMENTOS IMOBILIARIOS LTDA",
      1044318: "36.338.710 PABLO MENDES BARROSO",
      1045378: "PARTEC LOCACAO DE BENS IMOVEIS LTDA",
      1047450: "VARGAS PEREIRA SERVICOS MEDICOS (BRADESCO)",
      1051750: "GUSTAVO ALMEIDA SOCIEDADE DE ADVOGADOS",
      1059635: "MEDFISIO MPPHC CLINICA MEDICA LTDA",
      1059636: "MEDFISIO MPPHC CLINICA MEDICA LTDA (ODONTO BRADESCO)",
      1061978: "PATAMAR LOCADORA DE EQUIPAMENTOS LTDA",
      1082355: "ENDOPED RIO SERVICOS MEDICOS LTDA",
      1082459: "ENDOPED RIO SERVICOS MEDICOS LTDA",
      1089680: "FC CONSULTORIA, TREINAMENTOS E COMERCIO LTDA",
      1099282: "SETEMBRINO E DOURADO DE GUSMAO ADVOGADOS ASSOCIADOS",
      1102918: "GMA IMOBILIARIA LTDA",
      1122567: "FLIU COMERCIO DE ALIMENTOS LTDA",
      1131767:
        "CAIXA DE ASSISTENCIA AOS MEMBROS DA DEFENSORIA PUBLICA DO ESTADO DO RIO DE JANEIRO -CAMARJ",
      1135119: "FERREIRA MACHADO GESTAO EMPRESARIAL LTDA",
      1137060: "PROTETTA CORRETORA DE SEGUROS LTDA",
      1137061: "PROTETTA CORRETORA DE SEGUROS LTDA - DENTAL",
      1163760: "FNS COMERCIO E IMPORTACAO LTDA",
      1163761: "FNS COMERCIO E IMPORTACAO LTDA - DENTAL",
      6424981: "MONTEIRO MENDONCA SOCIEDADE INDIVIDUAL DE ADVOCACIA",
      10896791: "FC CONSULTORIA, TREINAMENTOS E COMERCIO LTDA",
      11737481: "JC TEIXEIRA JARDINS",
      "000244740": "FLORIANO PEREIRA ABINADER",
      "010896791": "FC CONSULTORIA, TREINAMENTOS E COMERCIO LTDA",
      "001137060": "PROTETTA CORRETORA DE SEGUROS LTDA",
      "001047450": "VARGAS PEREIRA SERVICOS MEDICOS (BRADESCO)",
      "000915444": "A PRIMORDIAL - BRADESCO",
      "000892870": "HDE INSTALACOES E MONTAGENS LTDA",
      "001051750": "GUSTAVO ALMEIDA SOCIEDADE DE ADVOGADOS",
      "000672143": "DAZIL RIO DISTRIBUIDORA DE COSMETICOS LTDA",
      "000975126": "M.D. SERVICOS MEDICOS LTDA (bradesco)",
      "000996020": "VIRTUALL VA LTDA-EPP",
      "001163760": "FNS COMERCIO E IMPORTACAO LTDA",
      "000892871": "HDE INSTALACOES E MONTAGENS LTDA",
      "001089680": "FC CONSULTORIA, TREINAMENTOS E COMERCIO LTDA",
      "001163761": "FNS COMERCIO E IMPORTACAO LTDA - DENTAL",
      "000975127": "M.D. SERVICOS MEDICOS LTDA S/C",
      "000859278": "EMANUEL PEDRO GEFE (ODONTO- BRADESCO)",
      "001061978": "PATAMAR LOCADORA DE EQUIPAMENTOS LTDA",
      "001082355": "ENDOPED RIO SERVICOS MEDICOS LTDA",
      "001102918": "GMA IMOBILIARIA LTDA",
      "001045378": "PARTEC LOCACAO DE BENS IMOVEIS LTDA",
      "000859277": "EMANUEL PEDRO GEFE DA ROSA MESQUITA 09055814741",
      "000654616": "ALEXANDRE MIRANDA SERVICOS MEDICOS LTDA",
      "001122567": "FLIU COMERCIO DE ALIMENTOS LTDA",
      "001059635": "MEDFISIO MPPHC CLINICA MEDICA LTDA",
      "001044318": "36.338.710 PABLO MENDES BARROSO",
      "001131767":
        "CAIXA DE ASSISTENCIA AOS MEMBROS DA DEFENSORIA PUBLICA DO ESTADO DO RIO DE JANEIRO -CAMARJ",
      "001037087": "MMV ESTATE EMPREENDIMENTOS IMOBILIARIOS LTDA",
      "001036920": "GERMAX ENGENHARIA LTDA",
      "000979157": "META DE RESENDE IMOBILIARIA LTDA",
      "000658402": "ETICA - SERVICOS MEDICOS LTDA",
      "001082459": "ENDOPED RIO SERVICOS MEDICOS LTDA",
      "001135119": "FERREIRA MACHADO GESTAO EMPRESARIAL LTDA",
      "006424981": "MONTEIRO MENDONCA SOCIEDADE INDIVIDUAL DE ADVOCACIA",
      "001016540": "JB CONSULTING LTDA",
      "001059636": "MEDFISIO MPPHC CLINICA MEDICA LTDA (ODONTO BRADESCO)",
      "000996021": "VIRTUALL (ODONTO - BRADESCO)",
      "001137061": "PROTETTA CORRETORA DE SEGUROS LTDA - DENTAL",
      "001016539": "JB CONSULTING LTDA",
      "011737481": "JC TEIXEIRA JARDINS",
      "000288392": "BPF ENGENHARIA E INSTALACOES LTDA",
      "001099282": "SETEMBRINO E DOURADO DE GUSMAO ADVOGADOS ASSOCIADOS",
      "001010073": "DROGARIA E PERFUMARIA EMANUEL LTDA",
    };

    const extractOdontoprevDataExtrato = (origem) => {
      const raw = String(origem || "")
        .replace(/\s+/g, " ")
        .trim();
      const patterns = [
        /\bData\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+N[ºo]\s*Fatura/i,
        /N[ºo]\s*Sucursal\s+\d+\s+C[oó]d\.?\s*Corretor\s+\d+\s+Corretor.*?CPF\/CNPJ\s+\d+/i,
        /\bData\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
      ];
      const direct = raw.match(patterns[0]) || raw.match(patterns[2]);
      if (direct) return formatDateForInput(direct[1]);
      const primeiraData = raw.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
      return primeiraData ? formatDateForInput(primeiraData[1]) : "";
    };

    const processOdontoprevExtrato = () => {
      const dataPagamentoOdonto =
        extractOdontoprevDataExtrato(textoNormalizado) ||
        dataGlobalExtratoDetectada ||
        formatDateForInput(reportDoc?.date);
      const odontoRegex =
        /(?:^|\s)(\d+)(?:\s+(\d+))?\s+([a-zA-ZÀ-ÿ0-9 .&'\(\)\/,-]+?)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(-?[\d.,]+%?)\s+(-?[\d.,]+)\s+(-?[\d.,]+)\b/gi;
      let match;
      let count = 0;
      let rawItems = [];

      while ((match = odontoRegex.exec(textoNormalizado)) !== null) {
        const proposta = match[1];
        const cliente = cleanExtractedName(match[3]);
        const ramo = match[4];
        const contratoOdonto = match[5];
        const endosso = match[6];
        const prestacao = match[7];
        const item = match[8];
        const percentualStr = match[9];
        const percentual = parseCurrencyValue(percentualStr);
        const custo = parseCurrencyValue(match[10]);
        const comissao = parseCurrencyValue(match[11]);
        if (
          !cliente ||
          /TOTAL|RAMO|FATURA|SUCURSAL|CORRETOR|BENEFICI[ÁA]RIO/i.test(cliente)
        )
          continue;
        if (comissao === 0 || percentual === 0) continue;

        rawItems.push({
          contratoVal: contratoOdonto,
          nomeReal: cliente,
          parcela: prestacao,
          pctA: percentualStr.trim(),
          comissaoVal: comissao,
          percentualNum: percentual,
          custoVal: custo,
          proposta: proposta,
        });
      }

      let groupedContracts = {};
      for (const item of rawItems) {
        let baseContrato = (item.contratoVal || "").split("/")[0].trim();
        let strippedContrato = baseContrato.replace(/^0+/, "");

        const paddedContrato9 = baseContrato.padStart(9, "0");
        let mappedName =
          ODONTOPREV_CONTRACT_MAPPING[baseContrato] ||
          ODONTOPREV_CONTRACT_MAPPING[strippedContrato] ||
          BRADESCO_CONTRACT_MAPPING[baseContrato] ||
          BRADESCO_CONTRACT_MAPPING[strippedContrato] ||
          CLIENT_METADATA_BY_CONTRATO[baseContrato]?.cliente ||
          CLIENT_METADATA_BY_CONTRATO[strippedContrato]?.cliente ||
          CLIENT_METADATA_BY_CONTRATO[paddedContrato9]?.cliente;
        let finalContrato = baseContrato.padStart(9, "0");
        let finalNome = mappedName || item.nomeReal || "Cliente Desconhecido";

        // Regra: se o número do contrato for o mesmo e a porcentagem (%) também, somar em 1 única venda
        let groupKey = `${finalContrato}_${item.pctA || ""}`;

        if (!groupedContracts[groupKey]) {
          groupedContracts[groupKey] = {
            proposta: item.proposta,
            contrato: finalContrato,
            cliente: finalNome,
            parcela: item.parcela,
            pct: item.pctA,
            valorTotal: 0,
            comissao: 0,
            percentual: item.percentualNum,
            vidas: 0,
            custo: 0,
            vitalicio: "Não",
            servico: "Plano Dental",
          };
        }
        groupedContracts[groupKey].comissao += item.comissaoVal;
        groupedContracts[groupKey].custo += item.custoVal;
        groupedContracts[groupKey].vidas += 1;
      }

      for (const groupKey in groupedContracts) {
        const dataExt = groupedContracts[groupKey];
        if (!dataExt.cliente) continue;

        // OdontoPrev não informa Valor Total/Valor Base no detalhe.
        // Regra: Valor Total = sum(Comissão) ÷ (% Comissão / 100).
        const pctNum = dataExt.percentual;
        const valorTotalCalculado =
          Math.round(
            (Math.abs(dataExt.comissao) / (Math.abs(pctNum) / 100)) * 100,
          ) / 100;

        const inserted = pushRegistroExtraido({
          contrato: dataExt.contrato,
          cliente: dataExt.cliente,
          parcela: dataExt.parcela,
          data: dataPagamentoOdonto,
          valorTotal: valorTotalCalculado || dataExt.custo,
          comissao: dataExt.comissao,
          comissaoPorcentagem: dataExt.pct || "",
          codigoOperadora: extratoOperadora === "BRADESCO" ? "BRADESCO" : "ODONTOPREV",
          vitalicio: "Não",
          servico: "Plano Dental",
          desconto: "",
          vidas: dataExt.vidas,
        });
        if (inserted) count++;
      }
      return count > 0;
    };

    const extractSuhaiDataPagamento = (origem) => {
      const raw = String(origem || "")
        .replace(/\s+/g, " ")
        .trim();
      const match =
        raw.match(/Data\s+Pagto\.?\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i) ||
        raw.match(
          /Data\s+(?:de\s+)?Pagamento\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
        );
      return match ? formatDateForInput(match[1]) : "";
    };

    const processSuhaiExtrato = () => {
      const dataPagamentoSuhai =
        extractSuhaiDataPagamento(textoNormalizado) ||
        dataGlobalExtratoDetectada ||
        formatDateForInput(reportDoc?.date);
      const partesSuhai = textoNormalizado.split(
        /Cliente\s+Ap[oó]lice-Endosso[\\\/]?Proposta\s+Parcela\s+%\s+Comiss[aã]o\s+Tipo\s+de\s+Pagamento\s+Valor\s+Parcela\s+Valor\s+Comiss[aã]o/i,
      );
      const textoSuhaiDetalhes =
        partesSuhai.length > 1
          ? partesSuhai.slice(1).join(" ")
          : textoNormalizado;
      const suhaiRegex =
        /(?:^|\s)([A-ZÀ-ÿ][A-ZÀ-ÿ0-9 .&'\/-]+?)\s+(\d{6,})\s+End\s*:\s*(\d+)\s+(\d{1,4})\s+([\d.,]+)\s+([A-ZÀ-ÿ ]+?)\s+(-?[\d.]+,\d{2})\s+(-?[\d.]+,\d{2})(?=\s+[A-ZÀ-ÿ]|\s+Valor\s+Total|\s+I\.R\.R\.F|\s*$)/gi;
      let match;
      let count = 0;
      while ((match = suhaiRegex.exec(textoSuhaiDetalhes)) !== null) {
        const cliente = cleanExtractedName(match[1]);
        if (!cliente || /TOTAL|TRIBUT[ÁA]RIO|CORRETOR|CLIENTE/i.test(cliente))
          continue;
        const valorParcela = parseCurrencyValue(match[7]);
        const valorComissao = parseCurrencyValue(match[8]);
        if (valorParcela === 0 && valorComissao === 0) continue;

        const inserted = pushRegistroExtraido({
          contrato: match[2], // Apólice/Proposta
          cliente,
          parcela: String(parseInt(match[4], 10) || match[4]),
          data: dataPagamentoSuhai,
          valorTotal: valorParcela, // Valor Parcela vira Valor Total
          comissao: valorComissao,
          codigoOperadora: "SUHAI",
          vitalicio: "Não",
          servico: "Seguro",
          desconto: "",
        });
        if (inserted) count++;
      }
      return count > 0;
    };

    const processAllianzExtrato = () => {
      const corretoraAllianzRegex = String.raw`(?:PROTETTA\s+CORRETORA\s+DE\s+SEGUROS\s+LTDA|PROPER(?:\s+BRASIL)?\s+CORRETORA\s+DE\s+SEGUROS\s+LTDA|[A-ZÀ-ÿ0-9 .&'\/-]+?\s+CORRETORA\s+DE\s+SEGUROS\s+LTDA)`;
      const detalheAllianzRegex = new RegExp(
        String.raw`(\d{2}\/\d{2}\/\d{4})\s+` +
          String.raw`(\d+)\s+` +
          String.raw`([A-Z0-9]+)\s+` +
          String.raw`(\d+)\s+` +
          String.raw`(\d+)\s+` +
          String.raw`(\d+)\s+` +
          corretoraAllianzRegex +
          String.raw`\s+([A-ZÀ-ÿ0-9 .&'\/-]+?)\s+` +
          String.raw`(\d{2,5})\s+` +
          String.raw`([\d.,]+)\s+` +
          String.raw`([\d.,]+)\s+` +
          String.raw`([SN])\b`,
        "gi",
      );

      const blocosPagamento = textoNormalizado.split(
        /Data\s+Pagto\.?\s+CNPJ\s+Filial\s+Bruto\s+IR\s+INSS\s+ISS\s+Desconto\s+Aba\s+Descontos\s+L[ií]quido/i,
      );
      const blocosParaLer =
        blocosPagamento.length > 1
          ? blocosPagamento.slice(1)
          : [textoNormalizado];
      let count = 0;

      blocosParaLer.forEach((bloco) => {
        const dataPagamentoBloco =
          bloco.match(
            /^\s*(\d{2}\/\d{2}\/\d{4})\s+\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\s+[\d.,]+/i,
          )?.[1] || "";
        let match;
        detalheAllianzRegex.lastIndex = 0;
        while ((match = detalheAllianzRegex.exec(bloco)) !== null) {
          const dataLinha = match[1];
          const apoliceSusep = match[3];
          const apolice = match[4];
          const endosso = match[5];
          const parcela = match[6];
          const cliente = match[7];
          const ramo = match[8];
          const premio = parseCurrencyValue(match[9]);
          const comissao = parseCurrencyValue(match[10]);
          const antecipada = match[11];
          if (
            !cliente ||
            /TOTAL|SUBTOTAL/i.test(cliente) ||
            (premio === 0 && comissao === 0)
          )
            continue;

          const inserted = pushRegistroExtraido({
            contrato: apoliceSusep || apolice,
            cliente,
            parcela,
            data: dataPagamentoBloco || dataLinha,
            valorTotal: premio,
            comissao,
            codigoOperadora: "ALLIANZ",
            vitalicio: "Não",
            servico: "Seguro",
            desconto: "",
          });
          if (inserted) count++;
        }
      });

      return count > 0;
    };

    const extractMapfreDataPagamento = (origem) => {
      const raw = String(origem || "")
        .replace(/\s+/g, " ")
        .trim();
      const mapfrePatterns = [
        /DATA\s+DO\s+PAGAMENTO\b.*?(\d{1,2}\/\d{1,2}\/\d{4})/i,
        /Data\s+Cr[eé]dito\b.*?(\d{1,2}\/\d{1,2}\/\d{4})/i,
        /N[ºo]\s*Extrato\s+\d+\s+EXTRATO\s+DE\s+COMISS[ÕO]ES.*?DATA\s+DO\s+PAGAMENTO\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
      ];
      for (const rx of mapfrePatterns) {
        const match = raw.match(rx);
        if (match) return match[1];
      }
      return "";
    };

    const processMapfreExtrato = () => {
      const dataPagamentoMapfre =
        extractMapfreDataPagamento(textoNormalizado) ||
        dataGlobalExtratoDetectada;
      const mapfreRegex =
        /(?:^|\s)(\d{1,3})\s+(\d{1,5})\s+(\d{6,})\s+(\d+)\s+([A-ZÀ-ÿ][A-ZÀ-ÿ0-9 .&'\/-]+?)\s+(\d+)\s+(\d{2}\/\d{2}\/\d{2,4})\s+R\$\s*([\d.]+,\d{2})\s+([\d.,]+)%\s+R\$\s*([\d.]+,\d{2})/gi;
      let match;
      let count = 0;
      while ((match = mapfreRegex.exec(textoNormalizado)) !== null) {
        const cliente = match[5];
        if (/SALDO|DEMONSTRATIVO|ANTERIOR|TOTAL/i.test(cliente)) continue;
        const valorTotal = parseCurrencyValue(match[8]);
        const comissao = parseCurrencyValue(match[10]);
        if (valorTotal === 0 && comissao === 0) continue;
        const inserted = pushRegistroExtraido({
          contrato: match[3], // Apólice
          cliente,
          parcela: match[6],
          data: dataPagamentoMapfre || match[7],
          valorTotal, // Prêmio Líquido vira Valor Total
          comissao,
          codigoOperadora: "MAPFRE",
          vitalicio: "Não",
          servico: "Seguro",
          desconto: "",
        });
        if (inserted) count++;
      }
      return count > 0;
    };

    const extractTokioDataPagamento = (origem) => {
      const raw = String(origem || "")
        .replace(/\s+/g, " ")
        .trim();
      const patterns = [
        /Data\s+de\s+Cr[eé]dito\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
        /FORMA\s+DE\s+CR[ÉE]DITO.*?FORMA\s+DE\s+CR[ÉE]DITO\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+DOC/i,
        /Conta\s+Corrente\s*:? .*?(\d{1,2}\/\d{1,2}\/\d{2,4})\s+DOC/i,
        /Data\s+de\s+Processamento\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      ];
      for (const rx of patterns) {
        const match = raw.match(rx);
        if (match) return formatDateForInput(match[1]);
      }
      return "";
    };

    const processTokioExtrato = () => {
      const dataPagamentoTokio =
        extractTokioDataPagamento(textoNormalizado) ||
        dataGlobalExtratoDetectada ||
        formatDateForInput(reportDoc?.date);
      const tokioRegex =
        /(?:^|\s)([A-ZÀ-ÿ][A-ZÀ-ÿ0-9 .&'\/\-]+?)\s+(\d+)\s+([A-ZÀ-ÿ]+(?:\s+[A-ZÀ-ÿ]+){0,3})\s+(\d+)\s+(\d+)\s+((?:COMISSAO|COMISSÃO)(?:\s+[A-ZÀ-ÿ]+)*|GANHO\s+EXTRA|ESTORNO(?:\s+[A-ZÀ-ÿ]+)*|AJUSTE(?:\s+[A-ZÀ-ÿ]+)*)\s+(\d+)\/(\d+)\s+R\$\s*(-?[\d.]+,\d{2})\s+(-?[\d.,]+)%\s+R\$\s*(-?[\d.]+,\d{2})(?=\s+[A-ZÀ-ÿ]|\s+P[áa]gina|\s*$)/gi;
      let match;
      let count = 0;
      while ((match = tokioRegex.exec(textoNormalizado)) !== null) {
        const cliente = cleanExtractedName(match[1]);
        if (
          !cliente ||
          /SEGURADO|NEG[ÓO]CIO|RAMO|TOTAL|COMISS[ÃA]O/i.test(cliente)
        )
          continue;

        const negocio = match[2];
        const ramo = String(match[3] || "")
          .trim()
          .toUpperCase();
        const apolice = match[4];
        const endosso = match[5];
        const tipo = String(match[6] || "")
          .trim()
          .toUpperCase();
        const parcelaAtual = match[7];
        const totalParcelas = match[8];
        const premio = parseCurrencyValue(match[9]);
        const percentual = String(match[10] || "").trim();
        const comissao = parseCurrencyValue(match[11]);
        if (premio === 0 && comissao === 0) continue;

        const servicoTokio = ramo.includes("AUTO")
          ? "Auto"
          : ramo.includes("EMPRESARIAL")
            ? "Seguro Empresarial"
            : "Seguro";
        const inserted = pushRegistroExtraido({
          contrato: apolice, // Apólice / Bilhete
          cliente,
          parcela: parcelaAtual,
          data: dataPagamentoTokio,
          valorTotal: premio, // Prêmio(R$) vira Valor Total
          comissao,
          codigoOperadora: "TOKIO",
          vitalicio: "Não",
          servico: servicoTokio,
          desconto: "",
        });
        if (inserted) count++;
      }
      return count > 0;
    };

    const parseBlocosExtrato = (blocosContrato) => {
      const empresaBloco = isAmilExtrato ? empresaAmil : empresaContexto;
      const empresaBlocoUpper = isAmilExtrato
        ? empresaAmilUpper
        : empresaContextoUpper;
      for (let bloco of blocosContrato) {
        try {
          bloco = bloco.trim();
          if (bloco === "") continue;

          let codCliente = "N/D",
            nomeCliente = "";

          const matchNome = bloco.match(
            /^(\d+)\s*(?:-)?\s*(.+?)(?=\s+Fatura|\s+Proposta|\s+Data|\s+Qtd|\s+Forma|\s+\d{2}\/\d{4})/i,
          );
          if (matchNome) {
            codCliente = matchNome[1].trim();
            nomeCliente = matchNome[2].trim();
            nomeCliente = nomeCliente
              .replace(/(?:\s+[\d\/\.\-,]+)+$/, "")
              .trim()
              .toUpperCase();
          }
          if (!nomeCliente) continue;

          currentMaxVendaCodigo++;
          let codRegistro = String(currentMaxVendaCodigo).padStart(5, "0");
          let contratoDetectado = codCliente !== "N/D" ? codCliente : "";

          if (!nomesClientesExistem.has(nomeCliente.toLowerCase())) {
            nomesClientesExistem.add(nomeCliente.toLowerCase());
            currentMaxCodigo++;
            let newCodigo = String(currentMaxCodigo).padStart(5, "0");
            clientesParaInserir.push({
              codigo: contratoDetectado || newCodigo,
              nome: nomeCliente,
              tipo: "Pessoa jurídica",
              documento: "",
              telefone: "",
              celular: "",
              email: "",
              situacao: true,
              operadora: extratoOperadora,
              empresa: empresaBloco,
            });
          } else {
            let existingCli = clientes.find(
              (c) => c.nome.toLowerCase() === nomeCliente.toLowerCase(),
            );
            if (
              existingCli &&
              (!existingCli.operadora ||
                existingCli.operadora.trim() === "" ||
                existingCli.operadora === "-")
            ) {
              if (!clientesParaAtualizar.has(existingCli.id)) {
                clientesParaAtualizar.set(existingCli.id, {
                  operadora: extratoOperadora,
                });
              }
            }
          }

          let valorTotal = 0,
            comissao = 0;
          let vidasDetectadas = "1";

          const regexValores =
            /Sem Repique\s+(\d{1,2},\d{2})\s+([\d\.]+,\d{2})\s+([\d\.]+,\d{2})/i;
          let matchValores = regexValores.exec(bloco);

          const regexFallback =
            /(\d{1,2},\d{2})\s+([\d\.]+,\d{2})\s+([\d\.]+,\d{2})\s+(?:Médico|Dental|Odonto)/i;
          let matchFallback = regexFallback.exec(bloco);

          const regexValoresSeq =
            /(?:(?<!\d)(\d{1,4})\s+)?(?:(?:\d{1,2},\d{2}\s+)?([\d\.]+,\d{2})\s+([\d\.]+,\d{2}))(?:\s*(?:(?:Benef|Qtd)[^\d]*|\b\d{4,}\b|$|Médico|Dental|Odonto|D700|205))/i;
          let matchValoresSeq = regexValoresSeq.exec(bloco);

          if (matchValores) {
            valorTotal = parseFloat(
              matchValores[2].replace(/\./g, "").replace(",", "."),
            );
            comissao = parseFloat(
              matchValores[3].replace(/\./g, "").replace(",", "."),
            );
          } else if (matchFallback) {
            valorTotal = parseFloat(
              matchFallback[2].replace(/\./g, "").replace(",", "."),
            );
            comissao = parseFloat(
              matchFallback[3].replace(/\./g, "").replace(",", "."),
            );
          } else if (matchValoresSeq) {
            if (matchValoresSeq[1]) {
              vidasDetectadas = parseInt(matchValoresSeq[1], 10).toString();
            }
            valorTotal = parseFloat(
              matchValoresSeq[2].replace(/\./g, "").replace(",", "."),
            );
            comissao = parseFloat(
              matchValoresSeq[3].replace(/\./g, "").replace(",", "."),
            );
          }

          const fallbackVidas =
            /(?:\s+)(?<!\d)(\d{1,4})(?!\d)\s+(?:\d{1,2},\d{2}\s+)?(?:[\d\.]+,\d{2})\s+(?:[\d\.]+,\d{2})/i;
          let matchFallbackVidas = fallbackVidas.exec(bloco);

          const regex3Num =
            /(?:Qtd[^\d]*?)?(?<!\d)(\d{1,4})\s+(?<!\d)(\d{1,4})\s+(?<!\d)(\d{1,4})(?!\d)\s+(?:[\d.,]+\s+)?[\d.,]+\s+[\d.,]+/i;
          let match3Num = regex3Num.exec(bloco);

          const regexVidas =
            /(?:Qtd[^\d]*?|Vidas?\s*:?\s*|Benef[a-zÀ-ÿ.]*\s*:?\s*)(?<!\d)(\d{1,4})(?!\d)/i;
          let matchVidas = regexVidas.exec(bloco);

          if (matchVidas && parseInt(matchVidas[1], 10) > 0) {
            vidasDetectadas = parseInt(matchVidas[1], 10).toString();
          } else if (vidasDetectadas !== "1") {
            // Already got it from matchValoresSeq!
          } else if (match3Num && parseInt(match3Num[3], 10) > 0) {
            vidasDetectadas = parseInt(match3Num[3], 10).toString();
          } else if (
            matchFallbackVidas &&
            parseInt(matchFallbackVidas[1], 10) > 0
          ) {
            vidasDetectadas = parseInt(matchFallbackVidas[1], 10).toString();
          }

          if (parseInt(vidasDetectadas, 10) > 9999) {
            vidasDetectadas = "1";
          }

          if (extratoOperadora === "MED SENIOR") {
            const regexVidasMedSenior = /Vidas[^\d]*?(?<!\d)(\d{1,4})(?!\d)/i;
            let matchMedSenior = regexVidasMedSenior.exec(bloco);
            if (matchMedSenior && parseInt(matchMedSenior[1], 10) > 0) {
              vidasDetectadas = parseInt(matchMedSenior[1], 10).toString();
            }
          }

          if (valorTotal > 0) {
            let inicioVigenciaDetectada = "";
            const regexDataVigencia = /\b(\d{2}\/\d{2}\/\d{4})\b/;
            let matchVigencia = regexDataVigencia.exec(bloco);
            if (matchVigencia) {
              const partes = matchVigencia[1].split("/");
              inicioVigenciaDetectada = `${partes[2]}-${partes[1]}-${partes[0]}`;
            }

            let matchRefAmil = isAmilExtrato
              ? bloco.match(/(?<!\d\/)\b(\d{2})\/(\d{4})\b/)
              : null;
            let dataMovimentoDetectada = matchRefAmil
              ? `${matchRefAmil[2]}-${matchRefAmil[1]}-${matchRefAmil[1] === "02" ? "28" : "30"}`
              : extractDataDoExtrato(bloco) ||
                dataGlobalExtratoDetectada ||
                formatDateForInput(reportDoc?.date) ||
                (isAmilExtrato ? "" : dataDeHojeInterna());

            if (extratoOperadora === "MED SENIOR") {
              const matchRef = bloco.match(/Refer[eê]ncia\s*(\d{2}\/\d{4})/i);
              const matchVencimento = bloco.match(
                /(?:Vencimento|Venc\.?|Data da Venda|Data Venda)\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
              );
              
              if (matchRef) {
                 const partes = matchRef[1].split("/");
                 dataMovimentoDetectada = `${partes[1]}-${partes[0]}-01`;
              } else if (matchVencimento) {
                const partes = matchVencimento[1].split("/");
                dataMovimentoDetectada = `${partes[2]}-${partes[1]}-${partes[0]}`;
              } else {
                const todasDatas = [
                  ...bloco.matchAll(/\b(\d{2}\/\d{2}\/\d{4})\b/g),
                ];
                if (todasDatas.length >= 2) {
                  // Se houver múltiplas datas e sem rótulo, a Vigência pegou a primeira.
                  // Vamos pegar a última como Data/Vencimento.
                  const partes =
                    todasDatas[todasDatas.length - 1][1].split("/");
                  dataMovimentoDetectada = `${partes[2]}-${partes[1]}-${partes[0]}`;
                } else if (
                  todasDatas.length === 1 &&
                  inicioVigenciaDetectada === ""
                ) {
                  const partes = todasDatas[0][1].split("/");
                  dataMovimentoDetectada = `${partes[2]}-${partes[1]}-${partes[0]}`;
                }
              }
            }
            let vendedorDetectado = empresaBloco;
            let parcelaDetectada = "1";
            let numeroEsperado = null;
            const historicoVendasCliente = vendasList.filter(
              (v) =>
                (v.cliente &&
                  v.cliente.toLowerCase() === nomeCliente.toLowerCase()) ||
                (codCliente !== "N/D" && v.numero === codCliente),
            );

            if (historicoVendasCliente.length > 0) {
              const ultimaVenda = historicoVendasCliente.sort(
                (a, b) => new Date(b.dataVenda) - new Date(a.dataVenda),
              )[0];
              if (ultimaVenda.corretor && ultimaVenda.corretor !== "Todos")
                vendedorDetectado = ultimaVenda.corretor;
              if (!inicioVigenciaDetectada && ultimaVenda.inicioVigencia)
                inicioVigenciaDetectada = ultimaVenda.inicioVigencia;

              if (ultimaVenda.parcela) {
                let numeroAtual = parseInt(
                  ultimaVenda.parcela.toString().replace(/\D/g, ""),
                );
                if (!isNaN(numeroAtual)) {
                  numeroEsperado = numeroAtual + 1;
                  parcelaDetectada = numeroEsperado.toString();
                }
              }
            }

            let calcParcela = calcularParcelaDaVigencia(
              inicioVigenciaDetectada,
              dataMovimentoDetectada,
            );
            
            if (extratoOperadora === "MED SENIOR") {
              parcelaDetectada = calcParcela || "1";
            } else {
              if (
                !calcParcela &&
                !inicioVigenciaDetectada &&
                historicoVendasCliente &&
                historicoVendasCliente.length > 0
              ) {
                const primeiraVenda = historicoVendasCliente.sort(
                  (a, b) => new Date(a.dataVenda) - new Date(b.dataVenda),
                )[0];
                if (primeiraVenda && primeiraVenda.dataVenda) {
                  let diff = calcularParcelaDaVigencia(
                    primeiraVenda.dataVenda,
                    dataMovimentoDetectada,
                  );
                  let diffNum = parseInt(diff, 10);
                  let baseParcela = parseInt(primeiraVenda.parcela || "1", 10);
                  if (!isNaN(diffNum) && !isNaN(baseParcela)) {
                    calcParcela = String(
                      Math.max(1, baseParcela + (diffNum - 1)),
                    );
                  }
                }
              }
              if (calcParcela) {
                parcelaDetectada = calcParcela;
              }
            }

            novosRegistos.push({
              cod: extratoCodOperadora || codRegistro,
              contrato: contratoDetectado,
              codOperadora: extratoCodOperadora || null,
              codigoOperadora: extratoOperadora,
              vidas: vidasDetectadas,
              cliente: nomeCliente,
              data: dataMovimentoDetectada,
              situacao: `FATURADO ${empresaBlocoUpper} NF`,
              loja: empresaBlocoUpper,
              valorTotal,
              comissao,
              vendedor: vendedorDetectado,
              parcela: parcelaDetectada,
              inicioVigencia: inicioVigenciaDetectada,
              notaFiscal:
                reportDoc?.notaFiscal ||
                reportDoc?.parceiro?.match(/\(NF:\s*([^)]+)\)/)?.[1] ||
                "",
              vitalicio: "Sim",
              assessoria: empresaBloco,
              formaPagamento:
                empresaBlocoUpper === "PROPER"
                  ? "Dinheiro à vista"
                  : "Crédito em conta",
              servico: isAmilExtrato
                ? /(dental|odonto|d700|205)/i.test(bloco)
                  ? "Plano Dental"
                  : "Plano de Saúde"
                : "",
              desconto: "",
              selected: true,
            });
          }
        } catch (e) {
          console.warn("Erro bloco:", e);
        }
      }
    };

    const parseMedSeniorExtrato = (blocosContrato) => {
      const empresaBloco = isAmilExtrato ? empresaAmil : empresaContexto;
      const empresaBlocoUpper = isAmilExtrato
        ? empresaAmilUpper
        : empresaContextoUpper;

      for (let bloco of blocosContrato) {
        try {
          bloco = bloco.trim();
          if (bloco === "") continue;

          let codCliente = "N/D",
            nomeCliente = "";
          const matchNome = bloco.match(
            /^(\d+)\s*(?:-)?\s*(.+?)(?=\s+Vendedor:|\s+Fatura|\s+Proposta|\s+Data|\s+Qtd|\s+Forma|\s+\d{2}\/\d{4})/i,
          );
          if (matchNome) {
            codCliente = matchNome[1].trim();
            nomeCliente = matchNome[2].trim();
            nomeCliente = nomeCliente
              .replace(/(?:\s+[\d\/\.\-,]+)+$/, "")
              .trim()
              .toUpperCase();
          }
          if (!nomeCliente) continue;

          let inicioVigenciaDetectada = "";
          const regexDataVigencia = /\b(\d{2}\/\d{2}\/\d{4})\b/;
          let matchVigencia = regexDataVigencia.exec(bloco);
          if (matchVigencia) {
            const partes = matchVigencia[1].split("/");
            inicioVigenciaDetectada = `${partes[2]}-${partes[1]}-${partes[0]}`;
          }

          let referenciaGlobal = "";
          const matchRefGlob = bloco.match(/Refer[eê]ncia\s*:?\s*(\d{2}\/\d{4})/i);
          if (matchRefGlob) {
             const parts = matchRefGlob[1].split("/");
             referenciaGlobal = `${parts[1]}-${parts[0]}-01`;
          }

          const rows = bloco.split(/(?=\b\d{5,12}\s+\S+\s+(?:\d{1,4}\s+)?\d{2}\/\d{2}\/\d{4})/);

          let addedAny = false;
          for (let r of rows) {
            r = r.trim();
            if (!/^\d{5,12}\s+\S+/.test(r)) continue;

            let matchBase = r.match(/^(\d{5,12})\s+(\S+)/);
            let matchRefRow = r.match(/^(\d{5,12})\s+(\S+)\s+(\d{1,4})?\s+(\d{2}\/\d{4})/);
            let mDate = r.match(
              /(\d{1,4})\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{4}|\d{2}\/\d{2}\/\d{4})/,
            );
            
            let mValue = r.match(/([\d.,]+)\s+([\d.,]+)(?:\s+([\d.,]+))?$/);

            if (matchBase && mValue) {
              addedAny = true;
              
              let parcelaSugerida = matchRefRow ? matchRefRow[3] : undefined;
              let referenciaSugerida = matchRefRow ? matchRefRow[4] : undefined;
              
              let vidasDetectadas = mDate ? mDate[1] : "1";
              let dataMovimentoDetectada = referenciaGlobal || dataDeHojeInterna();

              if (referenciaSugerida) {
                const partesReferencia = referenciaSugerida.split("/");
                dataMovimentoDetectada = `${partesReferencia[1]}-${partesReferencia[0]}-01`;
              } else if (mDate) {
                let vigenciaRaw = mDate[2];
                let referenciaRaw = mDate[3];
                // Do not overwrite inicioVigenciaDetectada here!
                // Med Senior's row date is actually Vencimento and Data Op.
                const partesReferencia = referenciaRaw.split("/");
                if (partesReferencia.length === 2) {
                   dataMovimentoDetectada = `${partesReferencia[1]}-${partesReferencia[0]}-01`;
                } else if (partesReferencia.length === 3) {
                   dataMovimentoDetectada = `${partesReferencia[2]}-${partesReferencia[1]}-${partesReferencia[0]}`;
                }
              } else if (!referenciaGlobal && !referenciaSugerida && inicioVigenciaDetectada) {
                dataMovimentoDetectada = inicioVigenciaDetectada;
              }

              let baseRaw = mValue[3] ? mValue[2] : mValue[1];
              let comissaoRaw = mValue[3] ? mValue[3] : mValue[2];

              let valorTotal = parseFloat(
                baseRaw.replace(/\./g, "").replace(",", "."),
              ); // Base cálculo
              let comissao = parseFloat(
                comissaoRaw.replace(/\./g, "").replace(",", "."),
              );

              currentMaxVendaCodigo++;
              let faturaDetectada = matchBase[1];
              let codRegistro =
                faturaDetectada ||
                String(currentMaxVendaCodigo).padStart(5, "0");
              let contratoDetectado = codCliente !== "N/D" ? codCliente : "";

              if (!nomesClientesExistem.has(nomeCliente.toLowerCase())) {
                nomesClientesExistem.add(nomeCliente.toLowerCase());
                currentMaxCodigo++;
                let newCodigo = String(currentMaxCodigo).padStart(5, "0");
                clientesParaInserir.push({
                  codigo: contratoDetectado || newCodigo,
                  nome: nomeCliente,
                  tipo: "Pessoa jurídica",
                  documento: "",
                  telefone: "",
                  celular: "",
                  email: "",
                  situacao: true,
                  operadora: extratoOperadora,
                  empresa: empresaBloco,
                });
              } else {
                let existingCli = clientes.find(
                  (c) => c.nome.toLowerCase() === nomeCliente.toLowerCase(),
                );
                if (
                  existingCli &&
                  (!existingCli.operadora ||
                    existingCli.operadora.trim() === "" ||
                    existingCli.operadora === "-")
                ) {
                  if (!clientesParaAtualizar.has(existingCli.id)) {
                    clientesParaAtualizar.set(existingCli.id, {
                      operadora: extratoOperadora,
                    });
                  }
                }
              }

              let vendedorDetectado = empresaBloco;
              const historicoVendasCliente = vendasList.filter(
                (v) =>
                  (v.cliente &&
                    v.cliente.toLowerCase() === nomeCliente.toLowerCase()) ||
                  (codCliente !== "N/D" && v.numero === codCliente),
              );

              if (historicoVendasCliente.length > 0) {
                const ultimaVenda = historicoVendasCliente.sort(
                  (a, b) => new Date(b.dataVenda) - new Date(a.dataVenda),
                )[0];
                if (ultimaVenda.corretor && ultimaVenda.corretor !== "Todos")
                  vendedorDetectado = ultimaVenda.corretor;
                if (!inicioVigenciaDetectada && ultimaVenda.inicioVigencia)
                  inicioVigenciaDetectada = ultimaVenda.inicioVigencia;
              }

              let calcParcela = calcularParcelaDaVigencia(
                inicioVigenciaDetectada,
                dataMovimentoDetectada,
              );
              
              let parcelaDetectada = calcParcela || parcelaSugerida || "1";

              novosRegistos.push({
                cod: codRegistro,
                contrato: contratoDetectado,
                codOperadora: codRegistro,
                codigoOperadora: "MED SENIOR",
                vidas: vidasDetectadas,
                cliente: nomeCliente,
                data: dataMovimentoDetectada,
                situacao: `FATURADO ${empresaBlocoUpper} NF`,
                loja: empresaBlocoUpper,
                valorTotal,
                comissao,
                vendedor: vendedorDetectado,
                parcela: parcelaDetectada,
                inicioVigencia: inicioVigenciaDetectada,
                notaFiscal:
                  faturaDetectada ||
                  reportDoc?.notaFiscal ||
                  reportDoc?.parceiro?.match(/\(NF:\s*([^)]+)\)/)?.[1] ||
                  "",
                vitalicio: "Sim",
                assessoria: empresaBloco,
                formaPagamento:
                  empresaBlocoUpper === "PROPER"
                    ? "Dinheiro à vista"
                    : "Crédito em conta",
                servico: "",
                desconto: "",
                selected: true,
              });
            }
          }

          if (!addedAny) {
            parseBlocosExtrato([bloco]);
          }
        } catch (e) {
          console.warn("Erro no parseMedSeniorExtrato:", e);
        }
      }
    };

    const normalizeSulAmericaLookupKey = (value) =>
      String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/\s*\(SULAMERICA\)\s*$/i, "")
        .replace(/[^A-Z0-9]+/g, "");

    const getSulAmericaDictionary = (empresa) => {
      const emp = String(empresa || "").toUpperCase();
      if (emp.includes("PROPER")) return SULAMERICA_PROPER_VIGENCIAS;
      if (emp.includes("PROTETTA")) return SULAMERICA_PROTETTA_VIGENCIAS;
      return SULAMERICA_PROPER_VIGENCIAS;
    };

    const findSulAmericaVigencia = (cliente, contrato, empresa) => {
      // Ground Truth master metadata dictionary lookup first
      const masterMeta = findClientMetadata(cliente, contrato);
      if (masterMeta) {
        return {
          cliente: masterMeta.cliente,
          contrato: masterMeta.contrato,
          vidas: masterMeta.vidas,
          vitalicio: masterMeta.vitalicio,
          corretor: masterMeta.corretor,
          parcelaBase: "1",
          inicioVigencia: ""
        };
      }

      const base = getSulAmericaDictionary(empresa);
      if (!base) return null;

      const contratoKey = normalizeSulAmericaLookupKey(contrato);
      if (contratoKey && base.byContrato && base.byContrato[contratoKey]) {
        return base.byContrato[contratoKey];
      }

      const clienteKey = normalizeSulAmericaLookupKey(cliente);
      if (clienteKey && base.byCliente && base.byCliente[clienteKey]) {
        return base.byCliente[clienteKey];
      }

      if (clienteKey && base.byCliente) {
        const foundKey = Object.keys(base.byCliente).find(
          (key) => key.includes(clienteKey) || clienteKey.includes(key),
        );
        if (foundKey) return base.byCliente[foundKey];
      }

      return null;
    };

    const diffMesesSulAmerica = (dataAnterior, dataAtual) => {
      const ini = formatDateForInput(dataAnterior);
      const fim = formatDateForInput(dataAtual);
      if (!ini || !fim) return 0;

      const a = new Date(`${ini}T00:00:00`);
      const b = new Date(`${fim}T00:00:00`);
      if (isNaN(a) || isNaN(b)) return 0;

      return (
        (b.getFullYear() - a.getFullYear()) * 12 +
        (b.getMonth() - a.getMonth())
      );
    };

    const calcularParcelaSulAmerica = ({
      inicioVigencia,
      dataMovimento,
      parcelaBase,
      parcelaExtrato,
      historicoVendasCliente,
    }) => {
      const dataRef =
        formatDateForInput(dataMovimento) ||
        dataGlobalExtratoDetectada ||
        formatDateForInput(reportDoc?.date) ||
        dataDeHojeInterna();

      const inicioIso = formatDateForInput(inicioVigencia);
      if (inicioIso) {
        const calc = calcularParcelaDaVigencia(inicioIso, dataRef);
        if (calc) return String(calc);
      }

      const baseNum = parseInt(
        String(parcelaBase || parcelaExtrato || "").replace(/\D/g, ""),
        10,
      );

      const historico = Array.isArray(historicoVendasCliente)
        ? historicoVendasCliente.map((v, i) => ({ ...v, _index: i }))
        : [];
      if (historico.length > 0) {
        // Sort specifically using `dataVenda` or `data` to handle items from both `vendasList` and `novosRegistos`
        const ultimaVenda = historico.sort((a, b) => {
          const db = new Date(b.dataVenda || b.data || 0);
          const da = new Date(a.dataVenda || a.data || 0);
          if (db.getTime() === da.getTime()) {
             return b._index - a._index;
          }
          return db - da; 
        })[0];
        
        const ultimaParcela = parseInt(
          String(ultimaVenda?.parcela || "").replace(/\D/g, ""),
          10,
        );
        const meses = diffMesesSulAmerica(ultimaVenda?.dataVenda || ultimaVenda?.data, dataRef);

        if (!isNaN(ultimaParcela) && ultimaParcela > 0) {
          // If we are importing the same month/date (meses == 0), it will append Math.max(1, 0) == 1 to the parcel.
          return String(Math.max(1, ultimaParcela + Math.max(1, meses || 1)));
        }
      }

      if (!isNaN(baseNum) && baseNum > 0) return String(baseNum);
      return "1";
    };

    const parseSulAmericaExtrato = (blocosSulAmerica) => {
      const padraoEmpresa = empresaSulAmericaUpper.includes("PROTETTA")
        ? "PROTETTA"
        : empresaSulAmericaUpper.includes("PROPER")
          ? "PROPER"
          : operadoraNormalizada.includes("PROTETTA")
            ? "PROTETTA"
            : operadoraNormalizada.includes("PROPER")
              ? "PROPER"
              : textoUpper.includes("PROTETTA CORRETORA")
                ? "PROTETTA"
                : textoUpper.includes("PROPER BRASIL CORRETORA")
                  ? "PROPER"
                  : empresaSulAmericaUpper;

      for (let bloco of blocosSulAmerica) {
        try {
          bloco = String(bloco || "").trim();
          if (!bloco) continue;

          let nomeCliente = "";
          let inicioVigenciaDetectada = "";
          let valorTotal = 0;
          let comissao = 0;
          let parcelaExtrato = "1";
          let contratoDetectado = "";
          let dataPagamentoDetectada = "";

          const matchNome =
            bloco.match(/^(.*?)\s+Ap[oó]lice\/T[ií]tulo/i) ||
            bloco.match(/^(.*?)\s+Tipo de documento/i) ||
            bloco.match(/^(.*?)\s+Contrato/i);
          if (matchNome) {
            nomeCliente = cleanExtractedName(matchNome[1]).toUpperCase();
          }
          if (!nomeCliente) continue;

          const matchContrato = bloco.match(
            /Contrato\/Empresa\s*:\s*(.*?)\s+(?:Item\/Plano|Valor)/i,
          );
          const matchProposta = bloco.match(/Proposta\s*:\s*([A-Z0-9]+)/i);
          const matchApolice = bloco.match(
            /Ap[oó]lice\/T[ií]tulo\s*:\s*([A-Z0-9]+)/i,
          );

          if (matchProposta && matchProposta[1].trim() !== "") {
            contratoDetectado = matchProposta[1].trim();
          } else if (matchApolice && matchApolice[1].trim() !== "") {
            contratoDetectado = matchApolice[1].trim();
          } else if (
            matchContrato &&
            matchContrato[1].trim() !== "" &&
            matchContrato[1].trim() !== "-"
          ) {
            contratoDetectado = matchContrato[1].trim();
          }

          const matchValor = bloco.match(
            /Valor Pr[eê]mio Total\s*:\s*R\$\s*([\d.,]+)/i,
          );
          if (matchValor) valorTotal = parseCurrencyValue(matchValor[1]);

          const matchComissao = bloco.match(
            /Valor Remunera[cç][aã]o\s*:\s*R\$\s*([\d.,]+)/i,
          );
          if (matchComissao) comissao = parseCurrencyValue(matchComissao[1]);

          const matchParcela =
            bloco.match(/Parcela atual\s*:\s*(\d+)/i) ||
            bloco.match(/Parcela remunera[cç][aã]o\s*:\s*(\d+)/i);
          if (matchParcela) parcelaExtrato = matchParcela[1];

          const matchData = bloco.match(
            /In[ií]cio de Vig[eê]ncia\s*:\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
          );
          if (matchData) {
            inicioVigenciaDetectada = formatDateForInput(matchData[1]);
          }

          const matchDataPagamento = bloco.match(
            /Data pagamento\s*:\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
          );
          if (matchDataPagamento) {
            dataPagamentoDetectada = formatDateForInput(matchDataPagamento[1]);
          }

          const dataMovimentoSul =
            dataPagamentoDetectada ||
            dataGlobalExtratoDetectada ||
            formatDateForInput(reportDoc?.date) ||
            dataDeHojeInterna();

          let isAcordoAssessorias = false;
          if (bloco.toUpperCase().includes("ACORDO ASSESSORIAS")) {
            isAcordoAssessorias = true;
            if (comissao !== 0) {
              valorTotal = comissao;
            }
          }

          if (valorTotal === 0 && comissao === 0) continue;

          const metaVigencia = findSulAmericaVigencia(
            nomeCliente,
            contratoDetectado,
            padraoEmpresa,
          );
          if (metaVigencia?.cliente) {
            nomeCliente = cleanExtractedName(metaVigencia.cliente).toUpperCase();
          }
          if (!contratoDetectado && metaVigencia?.contrato) {
            contratoDetectado = String(metaVigencia.contrato || "").trim();
          }
          if (metaVigencia?.inicioVigencia) {
            inicioVigenciaDetectada = formatDateForInput(
              metaVigencia.inicioVigencia,
            );
          }

          const historicoVendasCliente = [...vendasList, ...novosRegistos].filter(
            (v) =>
              (v.cliente &&
                v.cliente.toLowerCase() === nomeCliente.toLowerCase()) ||
              (contratoDetectado && v.contrato === contratoDetectado),
          );

          const isSeguroViagemVida = /Produto\s*:\s*(Viagem|Vida)/i.test(bloco);
          const vendedorDetectado = metaVigencia?.corretor || padraoEmpresa;
          const vidasDetectadas = metaVigencia?.vidas || "1";
          let vitalicioDetectado = isAcordoAssessorias ? "Não" : (metaVigencia?.vitalicio || "Sim");
          const pctComissao = isAcordoAssessorias ? "100" : "";
          let servicoSulAmerica = "Plano de Saúde";
          
          if (isSeguroViagemVida) {
            servicoSulAmerica = "Seguro";
            vitalicioDetectado = "Não";
          }

          const parcelaDetectada = calcularParcelaSulAmerica({
            inicioVigencia: inicioVigenciaDetectada,
            dataMovimento: dataMovimentoSul,
            parcelaBase: metaVigencia?.parcelaBase,
            parcelaExtrato,
            historicoVendasCliente,
          });

          pushRegistroExtraido({
            contrato: contratoDetectado,
            cliente: nomeCliente,
            parcela: parcelaDetectada,
            data: dataMovimentoSul,
            inicioVigencia: inicioVigenciaDetectada,
            valorTotal,
            comissao,
            comissaoPorcentagem: pctComissao,
            codigoOperadora: "SULAMERICA",
            vidas: vidasDetectadas,
            vitalicio: vitalicioDetectado,
            vendedor: vendedorDetectado,
            empresaRegistro: padraoEmpresa,
            empresaRegistroUpper: padraoEmpresa,
            loja: padraoEmpresa,
            assessoria: padraoEmpresa,
            formaPagamento:
              padraoEmpresa === "PROPER"
                ? "Dinheiro à vista"
                : "Crédito em conta",
            servico: servicoSulAmerica,
            desconto: "",
          });
        } catch (e) {
          console.warn("Erro bloco sulamerica:", e);
        }
      }
    };

    const processIcatuExtrato = () => {
      const icatuClienteMatch =
        textoNormalizado.match(
          /Cliente\s+CPF\s+Total\s+de\s+Comiss[aã]o\s+(.+?)\s+(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})\s+R\$\s*[\d.]+,\d{2}/i,
        ) ||
        textoNormalizado.match(
          /Extrato\s+Anal[ií]tico\s+Individual.*?Cliente\s+CPF.*?([A-ZÀ-ÿ][A-ZÀ-ÿa-zà-ÿ ]{5,})\s+(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})/i,
        );
      const clienteIcatu = icatuClienteMatch
        ? cleanExtractedName(icatuClienteMatch[1])
        : "";
      if (!clienteIcatu) return false;

      const pushIcatuMatch = (match, offset = 0) =>
        pushRegistroExtraido({
          contrato: match[5 - offset], // Proposta
          cliente: clienteIcatu,
          parcela: match[6 - offset],
          data: match[2 - offset], // Data de pagamento
          inicioVigencia: match[7 - offset], // Vencimento
          valorTotal: parseCurrencyValue(match[8 - offset]), // Valor Base vira Valor Total
          comissao: parseCurrencyValue(match[10 - offset]),
          codigoOperadora: "ICATU",
          vitalicio: "Não",
          servico: "Seguro de Vida",
          desconto: "",
        });

      let count = 0;
      const icatuRegex =
        /Pagamento\s+de\s+Comiss[aã]o\s+de\s+Corretagem\s+(.+?)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{6,})\s+(\d{3,})\s+(\d{6,})\s+(\d+)\s+(\d{2}\/\d{2}\/\d{4})(?:\s+\d{2}\/\d{2}\/\d{4})?\s+R?\$?\s*([\d.]+,\d{2})\s+(\d+(?:[,.]\d+)?)%?\s+R?\$?\s*([\d.]+,\d{2})/gi;
      let match;
      while ((match = icatuRegex.exec(textoNormalizado)) !== null) {
        if (pushIcatuMatch(match, 0)) count++;
      }

      if (count === 0) {
        const icatuFallbackRegex =
          /(?:ESSENCIAL-CANAL\s+CORRETOR|[A-ZÀ-Ú0-9][A-ZÀ-Ú0-9\s\-/]{3,})\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{6,})\s+(\d{3,})\s+(\d{6,})\s+(\d+)\s+(\d{2}\/\d{2}\/\d{4})(?:\s+\d{2}\/\d{2}\/\d{4})?\s+R?\$?\s*([\d.]+,\d{2})\s+(\d+(?:[,.]\d+)?)%?\s+R?\$?\s*([\d.]+,\d{2})/gi;
        while ((match = icatuFallbackRegex.exec(textoNormalizado)) !== null) {
          const inserted = pushRegistroExtraido({
            contrato: match[4], // Proposta
            cliente: clienteIcatu,
            parcela: match[5],
            data: match[1],
            inicioVigencia: match[6],
            valorTotal: parseCurrencyValue(match[7]),
            comissao: parseCurrencyValue(match[9]),
            codigoOperadora: "ICATU",
            vitalicio: "Não",
            servico: "Seguro de Vida",
            desconto: "",
          });
          if (inserted) count++;
        }
      }
      return count > 0;
    };

    if (isIcatuExtrato && processIcatuExtrato()) {
      // ICATU: Cliente do cabeçalho; Proposta = contrato; Valor Base vira Valor Total; Comissão = Comissão.
    } else if (isMetlifeExtrato && processMetlifeExtrato()) {
      // METLIFE: Cliente, Apólice, Parcela, Prêmio Líquido/Base de Cálculo e Comissão.
    } else if (isCassiPasiExtrato && processCassiPasiExtrato()) {
      // CASSI PASI: Cliente = Subestipulante, contrato = Apólice, valor total = Prêmio e comissão = Comissão.
    } else if (isHdiExtrato && processHdiRows(linhasPlanilha)) {
      // HDI CSV: Cliente, Documento/Apólice, Prêmio, Percentual, Valor de Comissão e Data.
    } else if (isPetLoveExtrato && processPetLoveRows(linhasPlanilha)) {
      // PET LOVE XLS: Tutor, Proposta, Parcela, Valor da Parcela, Comissão Paga e Data de Pagamento.
    } else if (isOdontoprevExtrato && processOdontoprevExtrato()) {
      // ODONTOPREV: Cliente, Nº Proposta, Prestação/Parcela, Comissão e percentual. Valor Total é calculado por comissão ÷ percentual.
    } else if (isSuhaiExtrato && processSuhaiExtrato()) {
      // SUHAI: Cliente, Apólice/Proposta, Parcela, Valor Parcela e Valor Comissão.
    } else if (isAllianzExtrato && processAllianzExtrato()) {
      // ALLIANZ: Cliente = Nome Segurado; Contrato = Apólice Susep; Valor Total = Prêmio; Comissão = Comissão.
    } else if (isMapfreExtrato && processMapfreExtrato()) {
      // MAPFRE: Cliente = Segurado; Contrato = Apólice; Valor Total = Prêmio Líquido; Comissão = Valor Comissão.
    } else if (isTokioExtrato && processTokioExtrato()) {
      // TOKIO: Cliente = Segurado; Contrato = Apólice/Bilhete; Valor Total = Prêmio(R$); Comissão = Comissão(R$).
    } else if (isPortoExtrato && processPortoRows(linhasPlanilha)) {
      // Planilhas de Porto Seguro usando Histórico, Apl/Prop, Prêmio, Comissão, Tipo
    } else if (isMongeralExtrato && processMongeralRows(linhasPlanilha)) {
      // Planilhas/CSV da Mongeral usam Nome/Razão social, Proposta, Parcela comissionada, Valor base e valores de comissão/angariação.
    } else if (
      Array.isArray(linhasPlanilha) &&
      linhasPlanilha.length > 0 &&
      processPreventRows(linhasPlanilha)
    ) {
      // Planilhas da Prevent Senior possuem colunas como beneficiario, matricula, Valor Provento e Tipo Comissão.
    } else if (isSulAmericaExtrato) {
      const blocosSulAmerica = textoNormalizado.split(/Nome\s*:/i);
      if (blocosSulAmerica.length > 0) blocosSulAmerica.shift();
      parseSulAmericaExtrato(blocosSulAmerica);
    } else if (extratoOperadora === "MED SENIOR") {
      let textoSemFalsoContrato = textoNormalizado.replace(
        /Total\s+contrato\s*:/gi,
        "Total_Apurado:",
      );
      const blocosContrato = textoSemFalsoContrato.split(/Contrato\s*:/i);
      if (blocosContrato.length > 0) blocosContrato.shift();

      parseMedSeniorExtrato(blocosContrato);
    } else {
      const processGenericRegex = (regex, texto, mapMatchToData) => {
        let match;
        let foundAny = false;
        while ((match = regex.exec(texto)) !== null) {
          try {
            const data = mapMatchToData(match);
            if (!data || !data.cliente) continue;
            foundAny = true;

            currentMaxVendaCodigo++;
            let codRegistro = String(currentMaxVendaCodigo).padStart(5, "0");
            let nomeCliente = data.cliente.trim().toUpperCase();
            const empresaRegistro = isAmilExtrato
              ? empresaAmil
              : empresaContexto;
            const empresaRegistroUpper = isAmilExtrato
              ? empresaAmilUpper
              : empresaContextoUpper;
            let amilDataIso = "";
            if (isAmilExtrato && typeof data.data === "string") {
              const mapRef = data.data.match(/(?<!\d\/)\b(\d{2})\/(\d{4})\b/);
              if (mapRef) {
                const lastDay = mapRef[1] === "02" ? "28" : "30";
                amilDataIso = `${mapRef[2]}-${mapRef[1]}-${lastDay}`;
              }
            }
            const dataMovimentoDetectada =
              amilDataIso ||
              formatDateForInput(data.data) ||
              (isAmilExtrato
                ? dataGlobalExtratoDetectada ||
                  formatDateForInput(reportDoc?.date)
                : dataDeHojeInterna());

            if (!nomesClientesExistem.has(nomeCliente.toLowerCase())) {
              nomesClientesExistem.add(nomeCliente.toLowerCase());
              currentMaxCodigo++;
              let newCodigo = String(currentMaxCodigo).padStart(5, "0");
              clientesParaInserir.push({
                codigo: data.contrato || newCodigo,
                nome: nomeCliente,
                tipo: "Pessoa jurídica",
                documento: "",
                telefone: "",
                celular: "",
                email: "",
                situacao: true,
                operadora: extratoOperadora,
                empresa: empresaRegistro,
              });
            } else {
              let existingCli = clientes.find(
                (c) => c.nome.toLowerCase() === nomeCliente.toLowerCase(),
              );
              if (
                existingCli &&
                (!existingCli.operadora ||
                  existingCli.operadora.trim() === "" ||
                  existingCli.operadora === "-")
              ) {
                if (!clientesParaAtualizar.has(existingCli.id)) {
                  clientesParaAtualizar.set(existingCli.id, {
                    operadora: extratoOperadora,
                  });
                }
              }
            }

            let vendedorDetectado = nomeEmpresa;
            let inicioVigenciaDetectada =
              formatDateForInput(data.inicioVigencia) ||
              data.inicioVigencia ||
              "";
            const historicoVendasCliente = vendasList.filter(
              (v) =>
                (v.cliente &&
                  v.cliente.toLowerCase() === nomeCliente.toLowerCase()) ||
                (data.contrato && v.contrato === data.contrato),
            );

            if (historicoVendasCliente.length > 0) {
              const ultimaVenda = historicoVendasCliente.sort(
                (a, b) => new Date(b.dataVenda) - new Date(a.dataVenda),
              )[0];
              if (ultimaVenda.corretor && ultimaVenda.corretor !== "Todos")
                vendedorDetectado = ultimaVenda.corretor;
              if (!inicioVigenciaDetectada && ultimaVenda.inicioVigencia)
                inicioVigenciaDetectada = ultimaVenda.inicioVigencia;
            }

            let calcParcela = calcularParcelaDaVigencia(
              inicioVigenciaDetectada,
              dataMovimentoDetectada,
            );
            if (
              !calcParcela &&
              !inicioVigenciaDetectada &&
              historicoVendasCliente &&
              historicoVendasCliente.length > 0
            ) {
              const primeiraVenda = historicoVendasCliente.sort(
                (a, b) => new Date(a.dataVenda) - new Date(b.dataVenda),
              )[0];
              if (primeiraVenda && primeiraVenda.dataVenda) {
                let diff = calcularParcelaDaVigencia(
                  primeiraVenda.dataVenda,
                  dataMovimentoDetectada,
                );
                let diffNum = parseInt(diff, 10);
                let baseParcela = parseInt(primeiraVenda.parcela || "1", 10);
                if (!isNaN(diffNum) && !isNaN(baseParcela)) {
                  calcParcela = String(
                    Math.max(1, baseParcela + (diffNum - 1)),
                  );
                }
              }
            }
            let parcelaDetectada = data.parcela || calcParcela || "1";

            novosRegistos.push({
              cod: extratoCodOperadora || codRegistro,
              contrato: data.contrato || "",
              codOperadora: extratoCodOperadora || null,
              codigoOperadora: extratoOperadora,
              vidas: data.vidas || "1",
              cliente: nomeCliente,
              data: dataMovimentoDetectada,
              situacao: `FATURADO ${empresaRegistroUpper} NF`,
              loja: empresaRegistroUpper,
              valorTotal: data.valorTotal || 0,
              comissao: data.comissao || 0,
              comissaoPorcentagem: data.comissaoPorcentagem || "",
              vendedor: vendedorDetectado,
              parcela: parcelaDetectada,
              inicioVigencia: inicioVigenciaDetectada,
              notaFiscal: reportDoc?.notaFiscal || "",
              vitalicio: data.vitalicio !== undefined ? data.vitalicio : "Sim",
              assessoria: empresaRegistro,
              formaPagamento:
                empresaRegistroUpper === "PROPER"
                  ? "Dinheiro à vista"
                  : "Crédito em conta",
              servico: data.servico || "Saúde",
              desconto: "",
              selected: true,
            });
          } catch (e) {
            console.warn("Erro regex parser:", e);
          }
        }
        return foundAny;
      };

      let isMatched = false;

      // ASSIM - Novo Comissionamento Plano Empresa
      if (
        !isMatched &&
        (textoUpper.includes("NOVO COMISSIONAMENTO PLANO EMPRESA") ||
          textoUpper.includes("PAGAMENTOS REFERENTES"))
      ) {
        const assimRegex =
          /(\d{3,})-([A-ZÀ-ÿ0-9 .&'ºª\/-]+?)\s*(\d{2}\/\d{4})\s+(\d{1,3})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+(\d{2}\/\d{2}\/\d{2,4})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+\d+/gi;
        isMatched = processGenericRegex(
          assimRegex,
          textoNormalizado,
          (match) => ({
            contrato: match[1],
            cliente: match[2],
            parcela: String(parseInt(match[4], 10)),
            data: match[7],
            valorTotal: parseCurrencyValue(match[8]),
            comissao: parseCurrencyValue(match[9]),
            vitalicio: "Sim",
            servico: "Plano de Saúde",
          }),
        );
      }

      // Bradesco Saúde - Detalhes do Pagamento
      if (!isMatched && textoUpper.includes("BRADESCO")) {
        const matchTotal = textoUpper.match(
          /VALOR\s+BRUTO\s*\(D\+E\)\s*-\s*F\s*(?:R\$)?\s*([\d.]+,\d{2})/,
        );
        const grossTarget = matchTotal ? parseCurrencyValue(matchTotal[1]) : 0;

        let somaAtual = 0;
        let addedAny = false;

        const regex1 =
          /(?:^|\s)([\w\/\-.,()& ]+?)\s+(\d{1,3})\s+(?:R\$ ?)?([\d.]+,\d{2})\s+([\d,]+(?:%|))\s+(?:R\$ ?)?([\d.]+,\d{2})(?=\s|$)/g;
        const regex2 =
          /(?:^|\s)([\w\/\-.,()& ]+?)\s+(\d{1,3})\s+(\d{1,3})\s+(?:R\$ ?)?([\d.]+,\d{2})\s+(?:R\$ ?)?([\d.]+,\d{2})(?=\s|$)/g;
        const regex3 =
          /(?:^|\s)([\w\/\-.,()& ]+?)\s+(\d{1,3})\s+(?:R\$ ?)?([\d.]+,\d{2})\s+(?:R\$ ?)?([\d.]+,\d{2})(?=\s|$)/g;
        const regex4 =
          /(?:^|\s)([\w\/\-.,()& ]+?)\s+([\d,]+%?)\s+([A-Za-zÀ-Ÿ ][A-Za-zÀ-Ÿ0-9 ]+?)\s+(?:\d{2,5}\s+)?(\d{1,3})\s+(?:R\$\s*)?([\d.]+,\d{2})\s*(?:R\$\s*)?([\d.]+,\d{2})(?=\s|$)/g;

        let matches = [];
        let m;
        // Add endIndex to better skip overlaps
        while ((m = regex4.exec(textoNormalizado)) !== null)
          matches.push({
            type: 4,
            match: m,
            index: m.index,
            endIndex: m.index + m[0].length,
          });
        while ((m = regex1.exec(textoNormalizado)) !== null)
          matches.push({
            type: 1,
            match: m,
            index: m.index,
            endIndex: m.index + m[0].length,
          });
        while ((m = regex2.exec(textoNormalizado)) !== null)
          matches.push({
            type: 2,
            match: m,
            index: m.index,
            endIndex: m.index + m[0].length,
          });
        while ((m = regex3.exec(textoNormalizado)) !== null)
          matches.push({
            type: 3,
            match: m,
            index: m.index,
            endIndex: m.index + m[0].length,
          });

        matches.sort((a, b) => {
          if (a.index !== b.index) return a.index - b.index;
          return b.type - a.type;
        });

        let lastEndIndex = -1;
        let rawItems = [];

        for (const matchObj of matches) {
          if (grossTarget > 0 && somaAtual >= grossTarget - 0.05) break;

          if (matchObj.index < lastEndIndex) {
            continue; // Skip overlapping match
          }

          let prefix = null,
            parcela = null,
            valA = null,
            valB = null,
            pctA = null,
            extractedNomeReal = null;

          if (matchObj.type === 4) {
            prefix = matchObj.match[1];
            pctA = matchObj.match[2];
            extractedNomeReal = matchObj.match[3].replace(/\s*\d{2}$/, "").replace(/[\s-]+$/, "").trim();
            parcela = matchObj.match[4];
            valA = parseCurrencyValue(matchObj.match[5]);
            valB = parseCurrencyValue(matchObj.match[6]);
          } else if (matchObj.type === 1) {
            prefix = matchObj.match[1];
            parcela = matchObj.match[2];
            pctA = matchObj.match[4];
            valA = parseCurrencyValue(matchObj.match[3]);
            valB = parseCurrencyValue(matchObj.match[5]);
          } else if (matchObj.type === 2) {
            prefix = matchObj.match[1];
            parcela = matchObj.match[2]; // Corrected group index
            pctA = matchObj.match[3]; // Corrected group index
            valA = parseCurrencyValue(matchObj.match[4]);
            valB = parseCurrencyValue(matchObj.match[5]);
          } else if (matchObj.type === 3) {
            prefix = matchObj.match[1];
            parcela = matchObj.match[2];
            valA = parseCurrencyValue(matchObj.match[3]);
            valB = parseCurrencyValue(matchObj.match[4]);
          }

          if (prefix) {
            lastEndIndex = matchObj.endIndex;
            const tokens = prefix.trim().split(/\s+/);
            let codes = [];
            let nameParts = [];
            tokens.forEach((t) => {
              if (
                /^[0-9A-Z/\-.%,]+$/.test(t) &&
                !/^[A-ZÀ-ÿ]+$/.test(t) &&
                /[0-9]/.test(t)
              )
                codes.push(t);
              else nameParts.push(t);
            });

            let nomeReal = extractedNomeReal;
            if (!nomeReal) {
               let firstWordIdx = tokens.findIndex(
                 (t) => /[A-Za-zÀ-ÿ]/.test(t) && !/^\d+[A-Z]?$/.test(t),
               );
               if (firstWordIdx === -1) firstWordIdx = 0;
               nomeReal = tokens
                 .slice(firstWordIdx)
                 .join(" ")
                 .replace(/\s*\d{2}$/, "")
                 .replace(/[\s-]+$/, "")
                 .trim();
            }
            let contratoVal =
              codes.filter((c) => c.length > 5)[0] || codes[0] || "";

            let comissaoVal = Math.min(valA, valB);
            let valorTotalVal = Math.max(valA, valB);

            // Clean pctA (e.g. remove trailing %)
            if (pctA) pctA = pctA.trim().replace(/%$/, "");

            // Coleta os dados em rawItems
            rawItems.push({
              index: matchObj.index,
              parcela,
              pctA,
              nomeReal,
              contratoVal,
              comissaoVal,
              valorTotalVal,
            });
            somaAtual += comissaoVal;
            addedAny = true;
          }
        }

        // Agrupar por Contrato + Parcela (Conforme nova regra Bradesco)
        let groupedContracts = {};

        for (const item of rawItems) {
          let baseContrato = (item.contratoVal || "").split("/")[0].trim();
          let strippedContrato = baseContrato.replace(/^0+/, "");

          let mappedName =
            BRADESCO_CONTRACT_MAPPING[baseContrato] ||
            BRADESCO_CONTRACT_MAPPING[strippedContrato];
          let finalContrato = baseContrato.padStart(9, "0");
          let finalNome = mappedName || item.nomeReal || "Cliente Desconhecido";

          let groupKey = `${finalContrato}_${item.parcela || ""}_${item.pctA || ""}`;

          if (!groupedContracts[groupKey]) {
            let vitalicioVal = "Não";
            const parcNum = parseInt(String(item.parcela).replace(/\D/g, ""), 10);
            const pctValNum = parseFloat(String(item.pctA || "").replace(",", "."));
            const isPct234 = (
              pctValNum === 2 ||
              pctValNum === 3 ||
              pctValNum === 4
            );
            if (isPct234) {
              vitalicioVal = "Sim";
            } else {
              vitalicioVal = "Não";
            }
            groupedContracts[groupKey] = {
              contrato: finalContrato,
              cliente: finalNome,
              parcela: item.parcela, // Usa a primeira parcela encontrada para este grupo
              pct: item.pctA || "",
              valorTotal: 0,
              comissao: 0,
              vidas: 0,
              vitalicio: vitalicioVal,
              servico: "Plano de Saúde",
            };
          }
          groupedContracts[groupKey].valorTotal += item.valorTotalVal;
          groupedContracts[groupKey].comissao += item.comissaoVal;
          groupedContracts[groupKey].vidas += 1;
        }

        for (const groupKey in groupedContracts) {
          const dataExt = groupedContracts[groupKey];
          if (!dataExt.cliente) continue;

          currentMaxVendaCodigo++;
          let codRegistro = String(currentMaxVendaCodigo).padStart(5, "0");
          let nomeCliente = dataExt.cliente.trim().toUpperCase();
          const empresaRegistro = isAmilExtrato ? empresaAmil : empresaContexto;
          const empresaRegistroUpper = isAmilExtrato
            ? empresaAmilUpper
            : empresaContextoUpper;
          const dataMovimentoDetectada =
            formatDateForInput(reportDoc?.date) || dataDeHojeInterna();

          if (!nomesClientesExistem.has(nomeCliente.toLowerCase())) {
            nomesClientesExistem.add(nomeCliente.toLowerCase());
            currentMaxCodigo++;
            let newCodigo = String(currentMaxCodigo).padStart(5, "0");
            clientesParaInserir.push({
              codigo: dataExt.contrato || newCodigo,
              nome: nomeCliente,
              tipo: "Pessoa jurídica",
              documento: "",
              telefone: "",
              celular: "",
              email: "",
              situacao: true,
              operadora: extratoOperadora,
              empresa: empresaRegistro,
            });
          } else {
            let existingCli = clientes.find(
              (c) => c.nome.toLowerCase() === nomeCliente.toLowerCase(),
            );
            if (
              existingCli &&
              (!existingCli.operadora ||
                existingCli.operadora.trim() === "" ||
                existingCli.operadora === "-")
            ) {
              if (!clientesParaAtualizar.has(existingCli.id)) {
                clientesParaAtualizar.set(existingCli.id, {
                  operadora: extratoOperadora,
                });
              }
            }
          }

          let vendedorDetectado = nomeEmpresa;
          let inicioVigenciaDetectada = "";
          const historicoVendasCliente = vendasList.filter(
            (v) =>
              (v.cliente &&
                v.cliente.toLowerCase() === nomeCliente.toLowerCase()) ||
              (dataExt.contrato && v.contrato === dataExt.contrato),
          );

          if (historicoVendasCliente.length > 0) {
            const ultimaVenda = historicoVendasCliente.sort(
              (a, b) => new Date(b.dataVenda) - new Date(a.dataVenda),
            )[0];
            if (ultimaVenda.corretor && ultimaVenda.corretor !== "Todos")
              vendedorDetectado = ultimaVenda.corretor;
            if (ultimaVenda.inicioVigencia)
              inicioVigenciaDetectada = ultimaVenda.inicioVigencia;
          }

          let calcParcela = calcularParcelaDaVigencia(
            inicioVigenciaDetectada,
            dataMovimentoDetectada,
          );
          let parcelaDetectada = dataExt.parcela || calcParcela || "1";

          novosRegistos.push({
            cod: extratoCodOperadora || codRegistro,
            contrato: dataExt.contrato || "",
            codOperadora: extratoCodOperadora || null,
            codigoOperadora: extratoOperadora,
            vidas: String(dataExt.vidas),
            cliente: nomeCliente,
            data: dataMovimentoDetectada,
            situacao: `FATURADO ${empresaRegistroUpper} NF`,
            loja: empresaRegistroUpper,
            valorTotal: dataExt.valorTotal || 0,
            comissao: dataExt.comissao || 0,
            comissaoPorcentagem: dataExt.pct || "",
            vendedor: vendedorDetectado,
            parcela: parcelaDetectada,
            inicioVigencia: inicioVigenciaDetectada,
            notaFiscal: reportDoc?.notaFiscal || "",
            vitalicio: dataExt.vitalicio || "Não",
            assessoria: empresaRegistro,
            formaPagamento:
              empresaRegistroUpper === "PROPER"
                ? "Dinheiro à vista"
                : "Crédito em conta",
            servico: dataExt.servico || "Plano de Saúde",
            desconto: "",
            selected: true,
          });
        }

        if (addedAny) isMatched = true;
      }

      // ICATU - Extrato Analítico Individual
      if (
        !isMatched &&
        (textoUpper.includes("EXTRATO ANALÍTICO INDIVIDUAL") ||
          textoUpper.includes("ESSENCIAL-CANAL CORRETOR") ||
          textoUpper.includes("PAGAMENTO DE COMISSÃO DE CORRETAGEM") ||
          textoUpper.includes("PAGAMENTO DE COMISSAO DE CORRETAGEM"))
      ) {
        let currentIcatuCliente = "CLIENTE DESCONHECIDO";
        const icatuClienteMatch =
          textoNormalizado.match(
            /Cliente\s+CPF\s+Total\s+de\s+Comiss[aã]o\s+(.+?)\s+(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})\s+R\$\s*[\d.]+,\d{2}/i,
          ) ||
          textoNormalizado.match(
            /Extrato\s+Anal[ií]tico\s+Individual.*?Cliente\s+CPF.*?([A-ZÀ-ÿ][A-ZÀ-ÿa-zà-ÿ ]{5,})\s+(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})/i,
          );
        if (icatuClienteMatch)
          currentIcatuCliente = icatuClienteMatch[1].trim();

        // Campos extraídos da linha ICATU:
        // Cliente = cabeçalho do extrato; Proposta = 3º número após Apólice;
        // Parcela = número após Proposta; Valor Base = Valor Total; Comissão = Comissão.
        const icatuRegex =
          /Pagamento\s+de\s+Comiss[aã]o\s+de\s+Corretagem\s+(.+?)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{6,})\s+(\d{3,})\s+(\d{6,})\s+(\d+)\s+(\d{2}\/\d{2}\/\d{4})\s+R\$?\s*([\d.]+,\d{2})\s+(\d+(?:[,.]\d+)?)\s+R\$?\s*([\d.]+,\d{2})/gi;
        isMatched = processGenericRegex(
          icatuRegex,
          textoNormalizado,
          (match) => ({
            contrato: match[5], // Proposta
            cliente: currentIcatuCliente,
            parcela: match[6],
            data: match[2],
            inicioVigencia: match[7],
            valorTotal: parseCurrencyValue(match[8]), // Valor Base vira Valor Total
            comissao: parseCurrencyValue(match[10]),
            vitalicio: "Não",
            servico: "Seguro de Vida",
          }),
        );

        // Fallback para quando o PDF.js remove ou quebra a expressão "Pagamento de Comissão de Corretagem".
        if (!isMatched) {
          const icatuFallbackRegex =
            /(?:ESSENCIAL-CANAL\s+CORRETOR|[A-ZÀ-Ú0-9][A-ZÀ-Ú0-9\s\-/]{3,})\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{6,})\s+(\d{3,})\s+(\d{6,})\s+(\d+)\s+(\d{2}\/\d{2}\/\d{4})\s+R\$?\s*([\d.]+,\d{2})\s+(\d+(?:[,.]\d+)?)\s+R\$?\s*([\d.]+,\d{2})/gi;
          isMatched = processGenericRegex(
            icatuFallbackRegex,
            textoNormalizado,
            (match) => ({
              contrato: match[4], // Proposta
              cliente: currentIcatuCliente,
              parcela: match[5],
              data: match[1],
              inicioVigencia: match[6],
              valorTotal: parseCurrencyValue(match[7]), // Valor Base vira Valor Total
              comissao: parseCurrencyValue(match[9]),
              vitalicio: "Não",
              servico: "Seguro de Vida",
            }),
          );
        }
      }

      // MONGERAL (PDF)
      if (!isMatched && isMongeralExtrato) {
        const mongeralPdfRegex =
          /(?:^|\s|\n)([A-ZÀ-ÿ][A-ZÀ-ÿ0-9\s.\-]+?)\s+([\d\.\-\/]{9,18})\s+(\d+)\s+(.+?)\s+([\d.,]+)\s+(\d+)\s+(\d{6})\s+(\d+)\s+(\d{2}\/\d{2}\/\d{4})\s+([\d.,]+)\s+(\d+)\s*%/g;
        isMatched = processGenericRegex(
          mongeralPdfRegex,
          textoNormalizado,
          (match) => {
            const rawCliente = match[1].trim();
            const comissaoPct = Math.round(parseFloat(match[11].replace(",", ".")));
            return {
              cliente: rawCliente,
              contrato: match[3],
              servico: /vida|life|sucess[aã]o|morte|acidental|term|saf/i.test(match[4]) ? "Seguro de Vida" : "Seguro",
              valorTotal: parseCurrencyValue(match[5]),
              parcela: match[6],
              data: match[9],
              comissao: parseCurrencyValue(match[10]),
              comissaoPorcentagem: comissaoPct,
              vitalicio: "Sim",
            };
          }
        );

        if (!isMatched) {
          const mongeralAltPdfRegex =
            /(?:^|\s)([A-ZÀ-ÿ][A-ZÀ-ÿ0-9 .\-]+?)\s+([\d\.\-\/]{9,18})\s+(\d+)\s+(.+?)\s+([\d.,]+)\s+(\d+)\s+(\d+)\s+([A-ZÀ-ÿ ]+?)\s+([A-Z_]+)\s+(\d{2}\/\d{2}\/\d{4})\s+([\d.,]+%?)\s+(-?[\d.,]+)\s+(\d+)\s*%\s+([\d.,]+)\s+(\d+)\s+(\d+)\s+(.*?(?:DEBITO|CREDITO|BOLETO?|CARTAO))/gi;
          isMatched = processGenericRegex(
            mongeralAltPdfRegex,
            textoNormalizado,
            (match) => {
              const rawCliente = match[1].trim();
              const isEstorno = match[8].toUpperCase().includes('ESTORNO');
              const comissaoPct = isEstorno ? parseInt(match[15]) : Math.round(parseFloat(match[13].replace(",", ".")));
              
              const valTotal = parseCurrencyValue(match[5]);
              const comissaoVal = isEstorno ? -parseCurrencyValue(match[14]) : parseCurrencyValue(match[12]);

              return {
                cliente: rawCliente,
                contrato: match[3],
                servico: /vida|life|sucess[aã]o|morte|acidental|term|saf/i.test(match[4]) ? "Seguro de Vida" : "Seguro",
                valorTotal: valTotal,
                parcela: match[6],
                data: match[10],
                comissao: comissaoVal,
                comissaoPorcentagem: comissaoPct,
                vitalicio: "Sim",
              };
            }
          );
        }
      }

      // OMINT - Comissão corporativa/coletivo
      if (!isMatched && textoUpper.includes("OMINT")) {
        const omintModeloRegex =
          /(?:COLETIVO|INDIVIDUAL|PESSOA FÍSICA|PESSOA FISICA)?\s*(\d{5,})\s+([A-ZÀ-ÿ0-9 .&'\-]+?)\s+([A-Z]\d{1,3})\s+([\d.]+,\d{2})\s+(VITAL[IÍ]CIO|ADES[AÃ]O|COLETIVO|PME|[A-ZÀ-ÿ ]+?)\s+[\d.,]+\s+.*?(\d{1,2}\/\d{4})\s+(\d{1,2}\/\d{4})\s+([\d.]+,\d{2})(?:\s+([\d.]+,\d{2}))?/gi;
        isMatched = processGenericRegex(
          omintModeloRegex,
          textoNormalizado,
          (match) => ({
            contrato: match[1],
            cliente: match[2],
            parcela: "1",
            valorTotal: parseCurrencyValue(match[4]),
            comissao: parseCurrencyValue(match[9] || match[8]),
            vitalicio: /vital/i.test(match[5]) ? "Sim" : "Não",
            servico: "Plano de Saúde",
          }),
        );
      }

      // SUPERMED - Recibo de Comissões em ordem visual alternativa
      if (!isMatched && textoUpper.includes("SUPERMED")) {
        const supermedModeloRegex =
          /COMISS[ÃA]O VALOR PARCELA:\s*R\$\s*([\d.]+,\d{2}).*?(\d{2}\/\d{2}\/\d{4})\s+Comiss[aã]o\s+C\s+([\d.]+,\d{2})\s+(\d+)\s+([A-ZÀ-ÿ ]+?)\s+SUPERMED\s*(?:\([^)]+\))?\s+(\d+)/gi;
        isMatched = processGenericRegex(
          supermedModeloRegex,
          textoNormalizado,
          (match) => ({
            contrato: match[6],
            cliente: match[5],
            parcela: match[4],
            data: match[2],
            valorTotal: parseCurrencyValue(match[1]),
            comissao: parseCurrencyValue(match[3]),
            vitalicio: "Não",
            servico: "Plano de Saúde",
          }),
        );
      }

      // Hapvida
      if (!isMatched && textoNormalizado.includes("HAPVIDA")) {
        const hapvidaRegex =
          /(\d{8,})\s+([A-Z0-9]+)\s+(.+?)\s+(\d+)\s+(\d{2}\/\d{2}\/\d{4})\s+([\d.,]+)\s+([\d.,]+)\s+(\d+)\s+([\d.,]+)\s+([A-Z0-9]+)\s+(.+?)\s+(\d+)\s+[A-Z]/g;
        isMatched = processGenericRegex(
          hapvidaRegex,
          textoNormalizado,
          (match) => ({
            contrato: match[2],
            cliente: match[3],
            empresaObrigacao: match[1],
            inicioVigencia: match[5],
            vidas: "",
            parcela: match[12],
            valorTotal: parseFloat(
              match[7].replace(/\./g, "").replace(",", "."),
            ),
            comissao: parseFloat(match[9].replace(/\./g, "").replace(",", ".")),
            vitalicio: "Sim",
          }),
        );
      }
      // Klini
      if (!isMatched && textoNormalizado.includes("KLINI")) {
        const kliniRegex =
          /((?:PESSOA FÍSICA|PME.*?VIDAS\)?))\s+(.*?)\s+(\d+)\s+(.*?)\s+(\d+)\s+Preço Pré-Estabelecido\s+([\d.,]+)%\s+R\$\s*([\d.,]+)\s+R\$\s*([\d.,]+)/g;
        isMatched = processGenericRegex(
          kliniRegex,
          textoNormalizado,
          (match) => ({
            contrato: match[3],
            cliente: match[2],
            parcela: match[5],
            valorTotal: parseFloat(
              match[7].replace(/\./g, "").replace(",", "."),
            ),
            comissao: parseFloat(match[8].replace(/\./g, "").replace(",", ".")),
          }),
        );
      }
      // Leve Saúde
      if (!isMatched && textoNormalizado.includes("LEVE SAUDE")) {
        const leveRegex =
          /(?:\s|^)([A-Z]*\d{4,20})\s+([^0-9]+?)\s+(\d{10,20})\s+([^0-9]+?)\s+(\d{2}\/\d{2}\/\d{2,4})\s+(\d{2}\/\d{2}\/\d{2,4})\s+([\d.,]+)\s*%\s+(\d+)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+([\d.,]+)\s+([\d.,]+)/g;
        isMatched = processGenericRegex(
          leveRegex,
          textoNormalizado,
          (match) => {
            const vigencia = match[5];
            const dataExtrato = match[6];
            let calcParc = calcularParcelaDaVigencia(vigencia, dataExtrato);
            return {
              contrato: match[1],
              cliente: match[4].trim(),
              parcela: calcParc || "1",
              valorTotal: parseFloat(
                match[12].replace(/\./g, "").replace(",", "."),
              ),
              comissao: parseFloat(
                match[13].replace(/\./g, "").replace(",", "."),
              ),
              inicioVigencia: vigencia,
              vitalicio: "Não",
              servico:
                match[1] && match[1].toUpperCase().startsWith("OD")
                  ? "Plano Dental"
                  : "Plano de Saúde",
            };
          },
        );
      }
      // Omint
      if (!isMatched && textoNormalizado.toUpperCase().includes("OMINT")) {
        const omintRegex =
          /(\d{5,15})\s+(.*?)\s+(\d{1,2}\/\d{2,4})\s+(\d{1,2}\/\d{2,4})\s+([\d.,]+)\s+(\d+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/gi;
        isMatched = processGenericRegex(
          omintRegex,
          textoNormalizado,
          (match) => {
            const rawCliente = match[2];
            const isVitalicio =
              rawCliente.toLowerCase().includes("vitalicio") ||
              rawCliente.toLowerCase().includes("vitalício")
                ? "Sim"
                : "Não";
            let clienteLimpo = rawCliente
              .replace(/\s+(C\d+|P\d+|PLANO).*$/i, "")
              .replace(
                /\s+(VITALICIO|ADESÃO|VITALÍCIO|ADESAO|COLETIVO|PME).*$/i,
                "",
              )
              .trim();

            return {
              contrato: match[1],
              cliente: clienteLimpo,
              parcela: "1",
              valorTotal: parseFloat(
                match[5].replace(/\./g, "").replace(",", "."),
              ),
              comissao: parseFloat(
                match[9].replace(/\./g, "").replace(",", "."),
              ),
              vitalicio: isVitalicio,
            };
          },
        );
      }
      // Porto Seguro
      if (
        !isMatched &&
        textoNormalizado.toUpperCase().includes("PORTO SEGURO")
      ) {
        const portoRegex =
          /(?:^|\s|\n)([a-zA-ZÀ-ÿ0-9 :"'()&.-]+?)\s+(?:Porto\s+)?(\d{2,3})\s+(\d+)\s+([\w/.-]+)(?:\s+(\d+))?\s+(\d+)\s+(?:(\d+)\s+)?(\d{4}-\d{2}-\d{2})\s+(?:\d+\s+)?(-?\s*[\d.,]+)\s+(-?\s*[\d.,]+)\s+(-?\s*[\d.,]+)\s+(\d{1,4})-(AGENCIAMENTO|COMISS[AÃ]O(?:\s+FRACIONADA|\s+TOTAL)?|VENDA(?:\s+AVULSA(?:\s+PORTO\s+VISA)?)?|ESTORNO(?:\s+DE\s+COMISS[AÃ]O)?|LANCAMENTO(?:\s+DE\s+COMISS[AÃ]O)?|RENOVAC[AÃ]O(?:\s+DE\s+SEGURO)?|CANCELAMENTO(?:\s+DA\s+APOLICE)?|ENDOSSO(?:\s+DE\s+COMISS[AÃ]O)?|RESTITUIC[AÃ]O(?:\s+DE\s+COMISS[AÃ]O)?|AJUSTE(?:\s+DE\s+COMISS[AÃ]O)?|LIQUIDAC[AÃ]O(?:\s+DE\s+COMISS[AÃ]O)?)/gi;
        isMatched = processGenericRegex(
          portoRegex,
          textoNormalizado,
          (match) => {
            let rawCliente = match[1].trim();
            rawCliente = rawCliente.replace(/^(?:Porto\s+)+/i, "");
            rawCliente = rawCliente
              .replace(/^Agenciamento Sub:\s*/i, "")
              .replace(/\s*Compet:$/i, "")
              .trim();
            rawCliente = rawCliente
              .replace(
                /^(?:.*?(?:Tipo|Prêmio|Taxa|Comissão|Histórico|Marca|Suc|Ramo|Apl\/Prop|Fat\/Eds|Parc|Carne|Data|Ordem)\s+)+/i,
                "",
              )
              .trim();
            return {
              contrato: match[4],
              cliente: rawCliente,
              parcela: match[6],
              valorTotal: parseCurrencyValue(match[9].replace(/\s+/g, "")),
              comissao: parseCurrencyValue(match[11].replace(/\s+/g, "")),
              vitalicio: "Não",
            };
          },
        );
      }
      // SulAmérica Tabular
      if (
        !isMatched &&
        textoNormalizado.includes("SulAmérica Saúde Seguradora")
      ) {
        const sulameTabsRegex =
          /(\d{2}\/\d{2}\/\d{4})\s+(\d+)\s+.*?SulAmérica Saúde\s+Seguradora\s+([A-ZÀ-ÿ\s]+)\s+(TITULAR|FILHO|CÔNJUGE|DEPENDENTE.*?)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d+)\s+([\d.,]+)\s+([\d.,]+)%\s+([\d.,]+)\s+([\d.,]+)%\s+([\d.,]+)/g;
        isMatched = processGenericRegex(
          sulameTabsRegex,
          textoNormalizado,
          (match) => ({
            contrato: match[2],
            cliente: match[3],
            parcela: match[6],
            valorTotal: parseFloat(
              match[7].replace(/\./g, "").replace(",", "."),
            ),
            comissao: parseFloat(match[9].replace(/\./g, "").replace(",", ".")),
          }),
        );
      }
      // Supermed
      if (!isMatched && textoNormalizado.includes("SUPERMED")) {
        const supermedRegex =
          /SUPERMED\s*(?:\([^)]+\))?\s+(\d+)\s+(.*?)\s+(\d+)\s+(\d{2}\/\d{2}\/\d{4})\s+Comiss.o.*?R\$\s*([\d.,]+)(?:\s*\([^)]+\))?\s+([\d.,]+)\s*C/gi;
        isMatched = processGenericRegex(
          supermedRegex,
          textoNormalizado,
          (match) => ({
            contrato: match[1],
            cliente: match[2].trim(),
            parcela: match[3],
            valorTotal: parseFloat(
              match[5].replace(/\./g, "").replace(",", "."),
            ),
            comissao: parseFloat(match[6].replace(/\./g, "").replace(",", ".")),
            vitalicio: "Não",
          }),
        );
      }
      // Tokio Marine
      if (!isMatched && isTokioExtrato) {
        const tokioRegex =
          /([A-ZÀ-ÿ\s]+?)\s+(\d+)\s+([A-Z]+)\s+(\d+)\s+(\d+)\s+([A-Z ]+)\s+(\d+)\/(\d+)\s+R\$\s*([\d.,]+)\s+([\d.,]+)%\s+R\$\s*([\d.,]+)/g;
        isMatched = processGenericRegex(
          tokioRegex,
          textoNormalizado,
          (match) => ({
            contrato: match[4],
            cliente: match[1],
            parcela: match[7],
            valorTotal: parseFloat(
              match[9].replace(/\./g, "").replace(",", "."),
            ),
            comissao: parseFloat(
              match[11].replace(/\./g, "").replace(",", "."),
            ),
          }),
        );
      }
      // Itaú Lançamento
      if (
        !isMatched &&
        (textoNormalizado.includes("ESSENCIAL-CANAL CORRETOR") ||
          textoNormalizado.includes("Pagamento de Comissão"))
      ) {
        const itauRegex =
          /(Pagamento.*?|ESSENCIAL.*?)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d{2}\/\d{2}\/\d{4})\s*R\$([\d.,]+)\s+(\d+(?:,\d+)?)\s*R\$([\d.,]+)/g;
        let currentItauCliente = "Cliente Desconhecido";
        const clienteMatch = textoNormalizado.match(
          /([A-ZÀ-ÿ][a-zà-ÿ]+(?: [A-ZÀ-ÿ][a-zà-ÿ]+)+)\s+(\d{11})/,
        );
        if (clienteMatch) currentItauCliente = clienteMatch[1];

        isMatched = processGenericRegex(
          itauRegex,
          textoNormalizado,
          (match) => ({
            contrato: match[4],
            cliente: currentItauCliente,
            parcela: match[6],
            valorTotal: parseFloat(
              match[8].replace(/\./g, "").replace(",", "."),
            ),
            comissao: parseFloat(
              match[10].replace(/\./g, "").replace(",", "."),
            ),
          }),
        );
      }

      // Fallback para Lógica Padrão / AMIL
      if (!isMatched) {
        let textoSemFalsoContrato = textoNormalizado.replace(
          /Total\s+contrato\s*:/gi,
          "Total_Apurado:",
        );
        const blocosContrato = textoSemFalsoContrato.split(/Contrato\s*:/i);
        if (blocosContrato.length > 0) blocosContrato.shift();

        parseBlocosExtrato(blocosContrato);
      }
    }

    // Sum Hapvida duplicate records by Empresa/Obrigação and parcela
    let registosParaProcessar = novosRegistos;
    if (extratoOperadora === "HAPVIDA") {
      const grouped = [];
      for (let reg of novosRegistos) {
        const existing = grouped.find(
          (r) =>
            r.empresaObrigacao === reg.empresaObrigacao &&
            r.parcela === reg.parcela &&
            r.codigoOperadora === "HAPVIDA",
        );
        if (existing) {
          existing.valorTotal =
            (parseFloat(existing.valorTotal) || 0) +
            (parseFloat(reg.valorTotal) || 0);
          existing.comissao =
            (parseFloat(existing.comissao) || 0) +
            (parseFloat(reg.comissao) || 0);
        } else {
          grouped.push({ ...reg });
        }
      }
      registosParaProcessar = grouped;
    }

    let comissaoPreenchida = registosParaProcessar.map((r) => {
      let comissaoPorcentagem = "";
      const t = parseFloat(r.valorTotal) || 0;
      const c = parseFloat(r.comissao) || 0;
      if (t > 0 && c > 0 && !r.comissaoPorcentagem) {
        comissaoPorcentagem = Math.round((c / t) * 100);
      } else if (r.comissaoPorcentagem) {
        const parsed = parseFloat(String(r.comissaoPorcentagem).replace(/,/g, "."));
        comissaoPorcentagem = !isNaN(parsed) ? Math.round(parsed) : r.comissaoPorcentagem;
      }
      return { ...r, comissaoPorcentagem };
    });

    if (
      extratoOperadora.includes("PORTO") ||
      extratoOperadora === "PORTO SEGURO"
    ) {
      const fileNameStr = String(
        reportDoc?.fileName ||
          reportDoc?.nome ||
          reportDoc?.name ||
          reportDoc?.pathTarget ||
          "",
      ).toLowerCase();
      // Remove accents for checking
      const normalizedName = fileNameStr.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const hasSeg = normalizedName.includes("seg") || normalizedName.includes("seguro");

      const grouped = [];
      for (let reg of comissaoPreenchida) {
        if (hasSeg) {
          reg.vitalicio = "Não";
          grouped.push({ ...reg });
        } else {
          const existing = grouped.find(
            (r) =>
              r.cliente === reg.cliente &&
              r.parcela === reg.parcela &&
              r.codigoOperadora === reg.codigoOperadora,
          );

          if (existing) {
            existing.valorTotal =
              (parseFloat(existing.valorTotal) || 0) +
              (parseFloat(reg.valorTotal) || 0);
            existing.comissao =
              (parseFloat(existing.comissao) || 0) +
              (parseFloat(reg.comissao) || 0);
            const t = parseFloat(existing.valorTotal) || 0;
            const c = parseFloat(existing.comissao) || 0;
            if (t > 0 && c > 0) {
              existing.comissaoPorcentagem = Math.round((c / t) * 100);
            }
          } else {
            grouped.push({ ...reg });
          }
        }
      }

      for (let reg of grouped) {
        if (!hasSeg) {
          reg.vitalicio = "Sim";
        } else {
          reg.vitalicio = "Não";
        }
      }

      comissaoPreenchida = grouped;
    }

    if (extratoOperadora.toUpperCase().includes("QUALICORP") || extratoOperadora.toUpperCase() === "QUALICORP") {
      const grouped = [];
      for (let reg of comissaoPreenchida) {
        const existing = grouped.find(
          (r) =>
            String(r.contrato || "").trim().toLowerCase() === String(reg.contrato || "").trim().toLowerCase() &&
            String(r.cliente || "").trim().toLowerCase() === String(reg.cliente || "").trim().toLowerCase()
        );

        if (existing) {
          existing.valorTotal =
            (parseFloat(existing.valorTotal) || 0) +
            (parseFloat(reg.valorTotal) || 0);
          existing.comissao =
            (parseFloat(existing.comissao) || 0) +
            (parseFloat(reg.comissao) || 0);
            
          const t = parseFloat(existing.valorTotal) || 0;
          const c = parseFloat(existing.comissao) || 0;
          if (t > 0 && c > 0) {
            existing.comissaoPorcentagem = Math.round((c / t) * 100);
          }
        } else {
          grouped.push({ ...reg });
        }
      }
      comissaoPreenchida = grouped;
    }

    if (extratoOperadora.includes("ICATU") || extratoOperadora === "ICATU") {
      const grouped = [];
      for (let reg of comissaoPreenchida) {
        const existing = grouped.find(
          (r) =>
            r.contrato === reg.contrato &&
            r.parcela === reg.parcela &&
            r.comissaoPorcentagem === reg.comissaoPorcentagem &&
            r.codigoOperadora === reg.codigoOperadora
        );

        if (existing) {
          existing.valorTotal =
            (parseFloat(existing.valorTotal) || 0) +
            (parseFloat(reg.valorTotal) || 0);
          existing.comissao =
            (parseFloat(existing.comissao) || 0) +
            (parseFloat(reg.comissao) || 0);
        } else {
          grouped.push({ ...reg });
        }
      }
      comissaoPreenchida = grouped;
    }

    if (extratoOperadora.toUpperCase().includes("MONGERAL") || extratoOperadora.toUpperCase() === "MONGERAL") {
      const grouped = [];
      for (let reg of comissaoPreenchida) {
        const existing = grouped.find(
          (r) =>
            String(r.contrato || "").trim().toLowerCase() === String(reg.contrato || "").trim().toLowerCase() &&
            String(r.cliente || "").trim().toLowerCase() === String(reg.cliente || "").trim().toLowerCase() &&
            String(r.comissaoPorcentagem || "").trim() === String(reg.comissaoPorcentagem || "").trim()
        );

        if (existing) {
          existing.valorTotal =
            (parseFloat(existing.valorTotal) || 0) +
            (parseFloat(reg.valorTotal) || 0);
          existing.comissao =
            (parseFloat(existing.comissao) || 0) +
            (parseFloat(reg.comissao) || 0);
        } else {
          grouped.push({ ...reg });
        }
      }
      comissaoPreenchida = grouped;
    }

    // Prioritize master metadata dictionary lookups for all parsed records
    comissaoPreenchida = comissaoPreenchida.map((reg) => {
      const meta = findClientMetadata(reg.cliente, reg.contrato);
      if (meta) {
        const updated = { ...reg };
        if (meta.corretor) {
          let mappedCorretor = meta.corretor;
          if (mappedCorretor.toUpperCase() === "ASSESSORIA") mappedCorretor = "Assessoria";
          else if (mappedCorretor.toUpperCase() === "PROTETTA") mappedCorretor = "Protetta";
          else if (mappedCorretor.toUpperCase() === "CORRETOR INTERNO") mappedCorretor = "Corretor Interno";
          updated.vendedor = mappedCorretor;
          updated.corretor = mappedCorretor;
        }
        if (meta.vitalicio) {
          updated.vitalicio = meta.vitalicio;
        }
        if (meta.vidas && meta.vidas !== "------") {
          updated.vidas = meta.vidas;
        }
        return updated;
      }
      return reg;
    });

    setPdfData(comissaoPreenchida);
    showAlert(
      registosParaProcessar.length > 0
        ? `Extrato processado com sucesso! ${registosParaProcessar.length} lançamento(s) extraído(s).`
        : "Nenhum lançamento foi extraído. Verifique se o modelo e os campos do extrato estão corretos.",
    );
  };

  const toggleSelectAll = (e) => {
    const isChecked = e.target.checked;
    setPdfData(pdfData.map((r) => ({ ...r, selected: isChecked })));
  };

  const toggleSelectRow = (idx) => {
    setPdfData(
      pdfData.map((r, i) => (i === idx ? { ...r, selected: !r.selected } : r)),
    );
  };

  const deleteSelectedRows = () => {
    const count = pdfData.filter((r) => r.selected).length;
    if (count === 0) return showAlert("Nenhuma linha selecionada para apagar.");
    showConfirm(
      `Deseja apagar permanentemente as ${count} linhas selecionadas?`,
      () => {
        setPdfData((prev) => prev.filter((r) => !r.selected));
        setEditRowIndex(-1);
      },
    );
  };

  const prepararEmissaoNfLote = () => {
    const selecionados = pdfData.filter((r) => r.selected);
    if (selecionados.length === 0)
      return showAlert(
        "Selecione pelo menos uma linha para gerar a Nota Fiscal.",
      );

    const valorTotalComissao = selecionados.reduce(
      (acc, l) => acc + (Number(l.comissao) || Number(l.valorTotal) || 0),
      0,
    );

    let descLote = "Referente a comissão / serviços prestados para: ";
    if (selecionados.length <= 5) {
      descLote += selecionados.map((l) => l.cliente).join(", ") + ".";
    } else {
      descLote +=
        selecionados
          .map((l) => l.cliente)
          .slice(0, 5)
          .join(", ") + ` e mais ${selecionados.length - 5} contratos.`;
    }

    setNfeForm((prev) => ({
      ...prev,
      nome:
        selecionados.length === 1
          ? selecionados[0].cliente
          : selecionados[0].codigoOperadora || "AMIL",
      valor: valorTotalComissao.toFixed(2),
      desc: descLote,
    }));
    setCurrentView("nfe");
    setNfeTab("emitir");
  };

  const prepararEmissaoNF = (linha) => {
    setNfeForm((prev) => ({
      ...prev,
      nome: linha.cliente,
      valor: linha.valorTotal || linha.comissao,
      desc: `Referente a comissão / serviços prestados para ${linha.cliente}.`,
    }));
    setCurrentView("nfe");
    setNfeTab("emitir");
  };

  const startEditingRow = (idx, linha) => {
    setEditRowIndex(idx);
    setEditRowData({
      ...linha,
      comissaoBase:
        linha.comissaoBase !== undefined ? linha.comissaoBase : linha.comissao,
    });
  };
  const saveRowEdit = () => {
    const newData = [...pdfData];
    newData[editRowIndex] = {
      ...editRowData,
      valorTotal: parseFloat(editRowData.valorTotal) || 0,
      comissao: parseFloat(editRowData.comissao) || 0,
    };
    setPdfData(newData);
    setEditRowIndex(-1);
  };
  const cancelRowEdit = () => setEditRowIndex(-1);
  const deleteRowFromReport = (idx) => {
    showConfirm("Deseja apagar esta linha do relatório?", () => {
      setPdfData((prev) => prev.filter((_, i) => i !== idx));
      if (editRowIndex === idx) setEditRowIndex(-1);
      else if (editRowIndex > idx) setEditRowIndex(editRowIndex - 1);
    });
  };
  const duplicateRowInReport = (idx, linha) => {
    showConfirm("Deseja duplicar esta linha do relatório?", () => {
      const novaLinha = { ...linha };
      setPdfData((prev) => {
        const arr = [...prev];
        arr.splice(idx + 1, 0, novaLinha);
        return arr;
      });
      if (editRowIndex >= 0 && editRowIndex > idx) {
        setEditRowIndex(editRowIndex + 1);
      }
    });
  };
  const iniciarRelatorioManual = () => {
    let currentMaxVendaCodigo = getAllVendas().reduce((max, v) => {
      let num = parseInt(v.numero, 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    let maxCod = currentMaxVendaCodigo + 1;

    const novaLinha = {
      cod: String(maxCod).padStart(5, "0"),
      contrato: "",
      codigoOperadora: currentReportOperadora || "AMIL",
      vidas: "1",
      cliente: "Novo Cliente",
      data: "",
      situacao: `FATURADO ${nomeEmpresaUpper} NF`,
      loja: nomeEmpresaUpper,
      valorTotal: 0,
      comissao: 0,
      vendedor: nomeEmpresa,
      parcela: "1",
      inicioVigencia: "",
      notaFiscal: "",
      vitalicio: "Sim",
      assessoria: nomeEmpresa,
      formaPagamento:
        nomeEmpresaUpper === "PROPER" ? "Dinheiro à vista" : "Crédito em conta",
      servico: "",
      desconto: "",
      selected: true,
    };

    setPdfData([novaLinha]);
    setReportName(
      "Relatório Manual - " + formatDateBR(dataDeHojeInterna(), true),
    );
    const hoje = new Date(dataDeHojeInterna());
    setReportPeriod(
      `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`,
    );
    setCurrentReportId(null);
    setEditRowIndex(0);
    setEditRowData(novaLinha);
  };

  const confirmarVendasRelatorio = () => {
    try {
      const vendasParaAdicionar = getAllVendas().filter((v) =>
        relatorioVendasSelected.has(v.id),
      );
      if (vendasParaAdicionar.length === 0) {
        showAlert("Selecione pelo menos uma venda.");
        return;
      }

      let currentMaxVendaCodigo = getAllVendas().reduce((max, v) => {
        let num = parseInt(v.numero, 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      let currentPdfMax = pdfData.reduce((max, v) => {
        let num = parseInt(v.cod, 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);

      let maxCod = Math.max(currentMaxVendaCodigo, currentPdfMax);

      const newPdfRows = vendasParaAdicionar.map((v) => {
        maxCod++;
        return {
          cod: String(maxCod).padStart(5, "0"),
          contrato: v.contrato || "",
          codigoOperadora: v.codigoOperadora || v.codOperadora || "AMIL",
          vidas: String(v.vidas || "1"),
          cliente: v.cliente || "",
          data: v.dataVenda
            ? formatDateForInput(v.dataVenda)
            : dataDeHojeInterna(),
          situacao: v.situacao || `FATURADO ${nomeEmpresaUpper} NF`,
          loja: v.loja || nomeEmpresaUpper,
          valorTotal: Number(v.valor) || 0,
          comissao: Number(v.comissao) || 0,
          vendedor: v.corretor || nomeEmpresa,
          parcela: String(v.parcela || "1"),
          inicioVigencia: v.inicioVigencia || "",
          notaFiscal:
            v.notaFiscal ||
            (pdfData.length > 0 ? pdfData[0].notaFiscal || "" : ""),
          vitalicio: String(v.vitalicio || "Sim"),
          assessoria: v.assessoria || nomeEmpresa,
          formaPagamento:
            v.formaPagamento ||
            (nomeEmpresaUpper === "PROPER"
              ? "Dinheiro à vista"
              : "Crédito em conta"),
          servico: v.servico || "",
          desconto: v.desconto || "",
          comissaoPorcentagem: v.comissaoPorcentagem || "",
          selected: true,
        };
      });

      if (pdfData.length === 0 && newPdfRows.length > 0) {
        setReportName(
          "Relatório Manual - " + formatDateBR(dataDeHojeInterna(), true),
        );
        const hoje = new Date(dataDeHojeInterna());
        setReportPeriod(
          `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`,
        );
        setCurrentReportId(null);
      }

      setPdfData([...pdfData, ...newPdfRows]);
      setRelatorioVendasSelected(new Set());
      setShowModalVendasRelatorio(false);
    } catch (err) {
      console.error("Erro ao adicionar vendas:", err);
      showAlert("Erro ao adicionar. " + err.message);
      setShowModalVendasRelatorio(false);
    }
  };

  const addManualRow = () => {
    let currentMaxVendaCodigo = getAllVendas().reduce((max, v) => {
      let num = parseInt(v.numero, 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    let currentPdfMax = pdfData.reduce((max, v) => {
      let num = parseInt(v.cod, 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    let maxCod = Math.max(currentMaxVendaCodigo, currentPdfMax) + 1;

    const defaultNotaFiscal =
      pdfData.length > 0 ? pdfData[0].notaFiscal || "" : "";
    const novaLinha = {
      cod: String(maxCod).padStart(5, "0"),
      contrato: "",
      codigoOperadora: currentReportOperadora || "AMIL",
      vidas: "1",
      cliente: "Novo Cliente",
      data: "",
      situacao: `FATURADO ${nomeEmpresaUpper} NF`,
      loja: nomeEmpresaUpper,
      valorTotal: 0,
      comissao: 0,
      vendedor: nomeEmpresa,
      parcela: "1",
      inicioVigencia: "",
      notaFiscal: defaultNotaFiscal,
      vitalicio: "Sim",
      assessoria: nomeEmpresa,
      formaPagamento:
        nomeEmpresaUpper === "PROPER" ? "Dinheiro à vista" : "Crédito em conta",
      servico: "",
      desconto: "",
      selected: true,
    };
    const newData = [...pdfData, novaLinha];
    setPdfData(newData);
    setEditRowIndex(newData.length - 1);
    setEditRowData(novaLinha);
  };

  const salvarRelatorioComissao = async () => {
    if (!reportName)
      return showAlert("Digite um nome para o relatório antes de salvar.");
    if (pdfData.length === 0) return showAlert("Não há dados para salvar.");

    const dadosParaSalvar = pdfData.filter((r) => r.selected);
    if (dadosParaSalvar.length === 0)
      return showAlert("Não há linhas selecionadas para salvar.");

    const targetEmpresa = currentReportEmpresa || nomeEmpresa;
    const dataToSave = {
      nome: reportName || null,
      periodo: reportPeriod || null,
      dataCriacao: new Date().toISOString(),
      criadoPor: currentUser?.username || "Sistema",
      dados: dadosParaSalvar,
      empresa: targetEmpresa,
    };

    setLoading(true);
    setLoadingMsg("Guardando relatório na cloud...");
    try {
      let savedId = currentReportId;
      if (currentReportId) {
        const { error } = await safeSupabaseUpdate(
          "savedReports",
          dataToSave,
          "id",
          currentReportId,
        );
        if (error) throw error;
      } else {
        const { data, error } = await safeSupabaseInsert("savedReports", [
          dataToSave,
        ]);
        if (error) throw error;
        if (data && data.length > 0) {
          savedId = data[0].id;
          setCurrentReportId(savedId);
        }
      }

      const relatorioSalvoLocal = { ...dataToSave, id: savedId };
      const savedReportsAposSalvar = currentReportId
        ? savedReportsList.map((rep) =>
            rep.id === currentReportId ? relatorioSalvoLocal : rep,
          )
        : [...savedReportsList, relatorioSalvoLocal];

      await loadFromDB();

      setLoadingMsg("A atualizar clientes...");
      try {
        const clientesArrayTemp = [...clientes];
        const clientesParaInserir = [];
        const clientesParaAtualizar = new Map();

        let currentMaxCodigo = clientesArrayTemp.reduce((max, c) => {
          let v = parseInt(c.codigo, 10);
          return !isNaN(v) && v > max ? v : max;
        }, 0);

        for (let i = 0; i < dadosParaSalvar.length; i++) {
          const r = dadosParaSalvar[i];

          const existingCli = clientesArrayTemp.find(
            (c) => c.nome.toLowerCase() === r.cliente.toLowerCase(),
          );
          if (
            !existingCli &&
            !clientesParaInserir.some(
              (c) => c.nome.toLowerCase() === r.cliente.toLowerCase(),
            )
          ) {
            currentMaxCodigo++;
            let newCodigo = String(currentMaxCodigo).padStart(5, "0");
            const newClient = {
              codigo: newCodigo,
              nome: r.cliente || null,
              tipo: "Pessoa física",
              documento: null,
              telefone: null,
              celular: null,
              cep: null,
              logradouro: null,
              numero: null,
              bairro: null,
              cidade: null,
              uf: null,
              email: null,
              situacao: true,
              operadora: r.codigoOperadora || currentReportOperadora || null,
              codigoOperadora:
                r.codigoOperadora || currentReportOperadora || null,
              codOperadora: r.codOperadora || null,
              servico: r.servico || "Plano de Saúde",
              empresa: targetEmpresa,
            };
            clientesParaInserir.push(newClient);
            clientesArrayTemp.push(newClient);
          } else if (existingCli) {
            const opToSet = r.codigoOperadora || currentReportOperadora || null;
            const codOpToSet = r.codOperadora || null;
            const changes = {};

            if (
              opToSet &&
              (!existingCli.operadora ||
                existingCli.operadora.trim() === "" ||
                existingCli.operadora === "-")
            ) {
              changes.operadora = opToSet;
            }
            if (
              opToSet &&
              (!existingCli.codigoOperadora ||
                String(existingCli.codigoOperadora).trim() === "" ||
                existingCli.codigoOperadora === "-")
            ) {
              changes.codigoOperadora = opToSet;
            }
            if (
              codOpToSet &&
              (!existingCli.codOperadora ||
                String(existingCli.codOperadora).trim() === "" ||
                existingCli.codOperadora === "-")
            ) {
              changes.codOperadora = codOpToSet;
            }

            if (
              Object.keys(changes).length > 0 &&
              existingCli.id &&
              !clientesParaAtualizar.has(existingCli.id)
            ) {
              clientesParaAtualizar.set(existingCli.id, changes);
            }
          }
        }

        if (clientesParaInserir.length > 0) {
          await safeSupabaseInsert("clientes", clientesParaInserir);
        }
        if (clientesParaAtualizar.size > 0) {
          for (let [id, changes] of clientesParaAtualizar.entries()) {
            await safeSupabaseUpdate("clientes", changes, "id", id);
          }
        }

        await loadFromDB();

        let finalMsg = "Relatório salvo e clientes registrados com sucesso!";
        showAlert(finalMsg, "success");
      } catch (e) {
        console.error("ERRO NO SALVAMENTO DE CLIENTES:", e, "Tabela:", e.table);
        showAlert(
          `Erro ao salvar (Tabela: ${e.table || "?"}) clientes: ` +
            (e.message || JSON.stringify(e)),
        );
      } finally {
        setLoading(false);
      }
    } catch (errorReport) {
      setLoading(false);
      showAlert(
        "Erro ao salvar relatório na nuvem: " +
          (errorReport.message || JSON.stringify(errorReport)),
      );
    }
  };

  const carregarRelatorioSalvo = (report) => {
    setPdfData((report.dados || []).map((r) => ({ ...r, selected: true })));
    setReportName(report.nome);
    setReportPeriod(report.periodo || "");
    setCurrentReportId(report.id);
    setCurrentReportEmpresa(report.empresa || nomeEmpresa);
    setCurrentReportOperadora(
      report.dados && report.dados.length > 0
        ? report.dados[0].codigoOperadora || "AMIL"
        : "AMIL",
    );
    setCurrentView("processar");
  };
  const apagarRelatorioSalvo = (id) => {
    showConfirm(
      "ATENÇÃO: Tem certeza absoluta que deseja apagar permanentemente este relatório da nuvem e do cache local? Esta ação é totalmente irreversível e os dados serão perdidos.",
      async () => {
        setLoading(true);
        setLoadingMsg("A apagar...");
        await supabase.from("savedReports").delete().eq("id", id);
        if (currentReportId === id) {
          setPdfData([]);
          setCurrentReportId(null);
        }
        await loadFromDB();
        setLoading(false);
      },
    );
  };

  const apagarRelatoriosSalvosSelecionados = () => {
    if (selectedSavedReports.length === 0)
      return showAlert("Selecione pelo menos um relatório para apagar.");
    showConfirm(
      `ATENÇÃO: Tem certeza que deseja apagar permanentemente os ${selectedSavedReports.length} relatórios selecionados da nuvem e do cache local? Esta ação é irreversível.`,
      async () => {
        setLoading(true);
        setLoadingMsg("A apagar relatórios...");
        try {
          await supabase.from("savedReports").delete().in("id", selectedSavedReports);
          if (selectedSavedReports.includes(currentReportId)) {
            setPdfData([]);
            setCurrentReportId(null);
          }
          setSelectedSavedReports([]);
          await loadFromDB();
        } catch (e) {
          showAlert("Erro ao apagar relatórios: " + e.message);
        }
        setLoading(false);
      },
    );
  };

  const buscarCep = async (cep) => {
    const cepLimpo = cep.replace(/\D/g, "");
    if (cepLimpo.length === 8) {
      try {
        const response = await fetch(
          `https://viacep.com.br/ws/${cepLimpo}/json/`,
        );
        const data = await response.json();
        if (!data.erro) {
          setNfeForm((prev) => ({
            ...prev,
            logradouro: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade,
            uf: data.uf,
          }));
        }
      } catch (e) {}
    }
  };

  const buscarCepCliente = async (cep) => {
    const cepLimpo = cep.replace(/\D/g, "");
    if (cepLimpo.length === 8) {
      try {
        const response = await fetch(
          `https://viacep.com.br/ws/${cepLimpo}/json/`,
        );
        const data = await response.json();
        if (!data.erro) {
          setClienteForm((prev) => ({
            ...prev,
            logradouro: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade,
            uf: data.uf,
          }));
        }
      } catch (e) {}
    }
  };

  const enviarNota = async () => {
    const { dataEmissao, cep, logradouro, numero, bairro, cidade, uf } =
      nfeForm;

    if (dataEmissao) {
      const dateObj = new Date(dataEmissao + "T12:00:00");
      const today = new Date();
      const currentYear = today.getFullYear();

      if (dateObj > today) {
        return showAlert("A Data de Competência não pode ser uma data futura.");
      }
      if (dateObj.getFullYear() < currentYear) {
        return showAlert(
          `A Data de Competência não pode ser anterior ao ano atual (${currentYear}).`,
        );
      }
    }

    if (
      !cep?.trim() ||
      !logradouro?.trim() ||
      !numero?.trim() ||
      !bairro?.trim() ||
      !cidade?.trim() ||
      !uf?.trim()
    ) {
      return showAlert(
        "Por favor, preencha todos os campos do endereço do tomador (CEP, Logradouro, Número, Bairro, Cidade, UF).",
      );
    }

    const cepNumeros = cep.replace(/[^\d]/g, "");
    if (cepNumeros.length !== 8) {
      return showAlert("CEP inválido. O CEP deve conter 8 dígitos.");
    }

    if (!nfeForm.cnpj || !nfeForm.valor) {
      return showAlert(
        "Por favor, preencha pelo menos o CNPJ e o Valor para emitir a NF.",
      );
    }

    const docNumeros = nfeForm.cnpj.replace(/[^\d]/g, "");
    if (docNumeros.length !== 11 && docNumeros.length !== 14) {
      return showAlert(
        "CPF / CNPJ com tamanho inválido. Preencha corretamente (11 dígitos para CPF ou 14 para CNPJ).",
      );
    }

    if (!validarCpfCnpj(docNumeros)) {
      return showAlert(
        "CPF / CNPJ inválido. Por favor verifique os dígitos digitados.",
      );
    }

    setIsEmitting(true);
    try {
      const resposta = await fetch("http://127.0.0.1:5000/emitir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nfeForm),
      }).catch(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => ({
                    protocolo: "RIO-" + Math.floor(Math.random() * 100000),
                  }),
                }),
              2000,
            ),
          ),
      );
      if (!resposta.ok) throw new Error("Erro no servidor da prefeitura.");
      const resultado = await resposta.json();

      const novaNF = {
        id: Date.now(),
        cliente: nfeForm.nome,
        valor: nfeForm.valor,
        data: new Date().toISOString(),
        protocolo: resultado.protocolo,
        status: "Emitida",
      };
      setNfeHistorico((prev) => [novaNF, ...prev]);

      showAlert(
        `Nota transmitida com Sucesso!\nProtocolo da Prefeitura: ${resultado.protocolo}`,
      );
    } catch (erro) {
      showAlert(`> ERRO CRÍTICO: ${erro.message}`);
    } finally {
      setIsEmitting(false);
    }
  };

  const exportarNotasHistory = () => {
    if (nfeHistorico.length === 0)
      return showAlert("Não há notas para exportar.");
    const ws = XLSX.utils.json_to_sheet(
      nfeHistorico.map((nf) => ({
        ID: nf.id,
        Cliente: nf.cliente,
        "Valor (R$)": nf.valor,
        "Data Emissão": formatarDataVisivel(nf.data),
        Protocolo: nf.protocolo,
        "Chave ADN": nf.chaveNacional || "",
        Status: nf.status,
        "Código NBS": nf.codigoNbs || "",
        "Trib.": nf.codTributNacional || "",
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Notas Fiscais");
    XLSX.writeFile(wb, `NotasFiscais_Exportadas_${dataDeHojeInterna()}.xlsx`);
  };

  const importarNotaPdfHistory = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setLoading(true);
    setLoadingMsg("Extraindo dados do PDF...");
    try {
      const data = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      let textoCompleto = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        textoCompleto +=
          textContent.items.map((item) => item.str).join(" ") + " ";
      }

      let nfExtracted = "";
      const numNfMatch = textoCompleto.match(/Número da NFS-e\s+(\d+)/i);
      if (numNfMatch) nfExtracted = numNfMatch[1];

      let clientExtracted = "";
      const tomadorSection = textoCompleto.split(/TOMADOR DO SERVIÇO/i)[1];
      if (tomadorSection) {
        const match = tomadorSection.match(
          /Nome\s*\/\s*Nome Empresarial\s+(.*?)\s+(?:E-mail|Endereço|Município|CEP)/i,
        );
        if (match && match[1]) {
          clientExtracted = match[1].trim();
        } else {
          const matchFallback = tomadorSection.match(
            /Nome\s*\/\s*Nome Empresarial\s+([A-Z0-9.\-& ]{5,100})/i,
          );
          if (matchFallback && matchFallback[1]) {
            clientExtracted = matchFallback[1].trim();
          }
        }
      }
      if (
        !clientExtracted &&
        textoCompleto.includes("AMIL ASSISTENCIA MEDICA INTERNACIONAL")
      ) {
        clientExtracted = "AMIL ASSISTENCIA MEDICA INTERNACIONAL S.A.";
      }

      let valorExtracted = 0;
      const valMatch =
        textoCompleto.match(/Valor Líquido da NFS-e\s*R\$?\s*([\d,.]+)/i) ||
        textoCompleto.match(/Valor do Serviço\s*R\$?\s*([\d,.]+)/i);
      if (valMatch)
        valorExtracted = parseFloat(
          valMatch[1].replace(/\./g, "").replace(",", "."),
        );

      let dateExtracted = dataDeHojeInterna();
      const dateMatch = textoCompleto.match(
        /Data e Hora da emissão da NFS-e\s*([\d]{2}\/[\d]{2}\/[\d]{4})/i,
      );
      if (dateMatch)
        dateExtracted = dateMatch[1].split("/").reverse().join("-");

      let chaveExtracted = "";
      const chaveMatch = textoCompleto.match(
        /Chave de Acesso da NFS-e\s*(\d+)/i,
      );
      if (chaveMatch) chaveExtracted = chaveMatch[1];

      const pdfUrl = URL.createObjectURL(file);
      setImportNfPdfForm({
        nf: nfExtracted,
        operadora: "",
        cliente: clientExtracted.trim(),
        valor: valorExtracted,
        dataHora: dateExtracted,
        chave: chaveExtracted,
        pdfUrl: pdfUrl,
      });
      setModalImportNfPdfOpen(true);
    } catch (err) {
      showAlert("Erro ao ler o PDF: " + err.message);
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const salvarNotaPdfImportada = (e) => {
    e.preventDefault();
    if (!importNfPdfForm.operadora) {
      return showAlert("Atenção: Selecione a Op. | Seg.", "error");
    }
    const newNota = {
      id: Date.now() + Math.random(),
      cliente:
        importNfPdfForm.operadora ||
        importNfPdfForm.cliente ||
        "Consumidor Final",
      valor: parseFloat(importNfPdfForm.valor) || 0,
      data: importNfPdfForm.dataHora || dataDeHojeInterna(),
      status: "EMITIDA",
      chaveNacional: importNfPdfForm.chave || `IMPORT-PDF-${Date.now()}`,
      numero: importNfPdfForm.nf || "0",
      codigoNbs: "",
      codTributNacional: "",
      aliquotaIss: 0,
      issRetido: false,
      originalPdfUrl: importNfPdfForm.pdfUrl,
    };
    setNfeHistorico((prev) => [newNota, ...prev]);
    setModalImportNfPdfOpen(false);
    showAlert("Nota Fiscal PDF importada com sucesso!");
  };

  const abrirEdicaoNota = (nota) => {
    setEditNfForm({ ...nota });
    setModalEditNfOpen(true);
  };

  const salvarEdicaoNota = (e) => {
    e.preventDefault();
    setNfeHistorico((prev) =>
      prev.map((n) => (n.id === editNfForm.id ? editNfForm : n)),
    );
    setModalEditNfOpen(false);
    showAlert("Nota editada com sucesso!");
  };

  const visualizarNota = (nota) => {
    if (nota.originalPdfUrl) {
      window.open(nota.originalPdfUrl, "_blank");
    } else {
      setViewNfData(nota);
      setModalViewNfOpen(true);
    }
  };

  const baixarNota = (nota) => {
    if (nota.originalPdfUrl) {
      const a = document.createElement("a");
      a.href = nota.originalPdfUrl;
      a.download = `Nota_${nota.numero || nota.chaveNacional || "Fiscal"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      setViewNfData(nota);
      setModalViewNfOpen(true);
      setTimeout(() => {
        window.print();
      }, 500);
    }
  };

  const importarNotasHistory = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setLoading(true);
    setLoadingMsg("Lendo ficheiro de notas...");
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const linhasExcel = XLSX.utils.sheet_to_json(
        workbook.Sheets[workbook.SheetNames[0]],
      );

      let importadas = [];
      linhasExcel.forEach((linha) => {
        if (linha["Cliente"] && linha["Valor (R$)"]) {
          importadas.push({
            id: linha["ID"] || Date.now() + Math.random(),
            cliente: linha["Cliente"],
            valor: linha["Valor (R$)"],
            data: new Date().toISOString(), // Fallback
            protocolo: linha["Protocolo"] || "",
            chaveNacional: linha["Chave ADN"] || "",
            status: linha["Status"] || "Importada",
            codigoNbs: linha["Código NBS"] || "",
            codTributNacional: linha["Trib."] || "",
          });
        }
      });

      if (importadas.length > 0) {
        setNfeHistorico((prev) => [...importadas, ...prev]);
        showAlert(`${importadas.length} notas importadas com sucesso!`);
        setNfeTab("historico");
      } else {
        showAlert("Nenhuma nota válida encontrada no ficheiro.");
      }
    } catch (err) {
      showAlert("Erro ao importar notas: " + err.message);
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const savePrintPreset = async () => {
    if (!newPresetName.trim())
      return showAlert("Digite um nome para a seleção.");
    setLoading(true);
    setLoadingMsg("Guardando seleção na Cloud...");
    try {
      const newPreset = { name: newPresetName, cols: printCols };
      const { data, error } = await supabase
        .from("print_presets")
        .insert([newPreset])
        .select();
      if (error) throw error;
      if (data && data.length > 0) {
        const updated = [
          ...printPresets.filter((p) => p.name !== newPresetName),
          data[0],
        ];
        setPrintPresets(updated);
        syncGlobalSysConfigToDB(null, updated);
        setSelectedPreset(data[0].id || data[0].name);
        showAlert("Seleção guardada com sucesso no Banco de Dados!");
      }
    } catch (err) {
      console.warn("Tabela print_presets ausente, usando global cache:", err);
      const newLocalPreset = {
        id: Date.now().toString(),
        name: newPresetName,
        cols: printCols,
      };
      const updated = [
        ...printPresets.filter((p) => p.name !== newPresetName),
        newLocalPreset,
      ];
      setPrintPresets(updated);
      localStorage.setItem("protetta_print_presets", JSON.stringify(updated));
      syncGlobalSysConfigToDB(null, updated);
      setSelectedPreset(newLocalPreset.id);
      showAlert("Seleção guardada globalmente no BD.");
    } finally {
      setLoading(false);
      setNewPresetName("");
    }
  };

  const applyPrintPreset = (idOrName) => {
    setSelectedPreset(idOrName);
    if (!idOrName) {
      setPrintCols(defaultPrintCols);
      return;
    }
    const preset = printPresets.find(
      (p) => String(p.id) === String(idOrName) || p.name === idOrName,
    );
    if (preset) setPrintCols(preset.cols);
  };

  const deletePrintPreset = async (idOrName) => {
    setLoading(true);
    setLoadingMsg("Apagando...");
    try {
      const isLocal =
        printPresets
          .find((p) => String(p.id) === String(idOrName) || p.name === idOrName)
          ?.id?.toString().length > 10;
      if (!isLocal && supabase) {
        try {
          await supabase.from("print_presets").delete().eq("id", idOrName);
        } catch (e) {}
      }

      const updated = printPresets.filter(
        (p) => String(p.id) !== String(idOrName) && p.name !== idOrName,
      );
      setPrintPresets(updated);
      localStorage.setItem("protetta_print_presets", JSON.stringify(updated));
      syncGlobalSysConfigToDB(null, updated);

      if (selectedPreset === idOrName) {
        setSelectedPreset("");
        setPrintCols(defaultPrintCols);
      }
    } catch (e) {
      showAlert("Erro ao apagar: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintConfirm = () => {
    const isVendasView = currentView === "vendas";
    const baseData = isVendasView ? getFilteredVendas() : pdfData;
    let dataToPrint = [];

    if (isVendasView) {
      dataToPrint = selectedVendas.length > 0
        ? baseData.filter((v) => selectedVendas.includes(v.id))
        : baseData;
    } else {
      const selectedRows = pdfData.filter((r) => r.selected);
      dataToPrint = selectedRows.length > 0 ? selectedRows : pdfData;
    }

    let tableHeader = "<tr>";
    Object.keys(printColLabels).forEach((key) => {
      if (printCols[key]) tableHeader += `<th>${printColLabels[key]}</th>`;
    });
    tableHeader += "</tr>";

    let tableRows = "";
    dataToPrint.forEach((linha) => {
      tableRows += "<tr>";
      const _cod = isVendasView ? linha.numero : linha.cod;
      if (printCols.cod) tableRows += `<td>${_cod || "-"}</td>`;
      if (printCols.contrato) tableRows += `<td>${linha.contrato || "-"}</td>`;
      const _codigoOperadora = isVendasView ? linha.codigoOperadora || linha.codOperadora : linha.codigoOperadora;
      if (printCols.op)
        tableRows += `<td>${_codigoOperadora || (isVendasView ? "-" : "AMIL")}</td>`;
      if (printCols.vidas) tableRows += `<td>${linha.vidas || "-"}</td>`;
      if (printCols.cliente) tableRows += `<td>${linha.cliente || "-"}</td>`;
      const _data = isVendasView ? linha.dataVenda : linha.data;
      if (printCols.data)
        tableRows += `<td>${_data ? formatarDataVisivel(_data) : "-"}</td>`;
      if (printCols.loja) tableRows += `<td>${linha.loja || "-"}</td>`;
      if (printCols.servico) tableRows += `<td>${linha.servico || "-"}</td>`;
      if (printCols.desconto) tableRows += `<td>${linha.desconto || (linha.porcentagemCorretor ? linha.porcentagemCorretor + '%' : "-")}</td>`;
      const _vendedor = isVendasView ? linha.corretor : linha.vendedor;
      if (printCols.corretor) tableRows += `<td>${_vendedor || "-"}</td>`;
      if (printCols.parc) tableRows += `<td>${linha.parcela || "-"}</td>`;
      if (printCols.inicioVig)
        tableRows += `<td>${linha.inicioVigencia ? formatarDataVisivel(linha.inicioVigencia) : "--/--/----"}</td>`;
      if (printCols.nfe) tableRows += `<td>${linha.notaFiscal || "-"}</td>`;
      if (printCols.vitalicio)
        tableRows += `<td>${linha.vitalicio || "-"}</td>`;
      if (printCols.pagamento)
        tableRows += `<td>${linha.formaPagamento || "-"}</td>`;
      const _valorTotal = isVendasView ? linha.valor : linha.valorTotal;
      if (printCols.valorTotal)
        tableRows += `<td style="text-align: right;">${formatarMoeda(_valorTotal)}</td>`;
      if (printCols.comissaoPorcentagem)
        tableRows += `<td style="text-align: right;">${linha.comissaoPorcentagem || "-"}</td>`;
      if (printCols.comissao)
        tableRows += `<td style="text-align: right;">${formatarMoeda(linha.comissao)}</td>`;
      tableRows += "</tr>";
    });

    const visibleColCount = Object.values(printCols).filter(Boolean).length;
    let valTotVisible = printCols.valorTotal;
    let comVisible = printCols.comissao;

    let spanCount = visibleColCount;
    if (valTotVisible) spanCount--;
    if (comVisible) spanCount--;

    let footerCells = `<td colspan="${Math.max(1, spanCount)}" style="text-align: right; font-weight: bold;">TOTAIS APURADOS</td>`;
    if (valTotVisible)
      footerCells += `<td style="font-weight: bold; text-align: right; color: #059669;">${formatarMoeda(dataToPrint.reduce((acc, l) => acc + (Number(isVendasView ? l.valor : l.valorTotal) || 0), 0))}</td>`;
    if (comVisible)
      footerCells += `<td style="font-weight: bold; text-align: right; color: #0284c7; font-size: 12px;">${formatarMoeda(dataToPrint.reduce((acc, l) => acc + (Number(l.comissao) || 0), 0))}</td>`;

    let tableFooter = `<tr>${footerCells}</tr>`;

    const tituloBase = "Relatório";
    const tituloRelatorio = reportTitleSuffix.trim() ? `${tituloBase} - ${reportTitleSuffix}` : tituloBase;

    let chartsHeaderHtml = "";
    if (includeChartsInReport && dataToPrint.length > 0) {
      const totalVendasValor = dataToPrint.reduce((acc, l) => acc + (Number(isVendasView ? l.valor : l.valorTotal) || 0), 0);
      const totalComissao = dataToPrint.reduce((acc, l) => acc + (Number(l.comissao) || 0), 0);
      const totalVidas = dataToPrint.reduce((acc, l) => acc + (Number(l.vidas) || 0), 0);
      const ticketMedio = dataToPrint.length > 0 ? totalVendasValor / dataToPrint.length : 0;

      const operadoraStats = {};
      dataToPrint.forEach((linha) => {
        const op = (isVendasView ? (linha.codigoOperadora || linha.codOperadora) : linha.codigoOperadora) || (isVendasView ? "Não especificado" : "AMIL");
        const valor = Number(isVendasView ? linha.valor : linha.valorTotal) || 0;
        const comissao = Number(linha.comissao) || 0;
        if (!operadoraStats[op]) {
          operadoraStats[op] = { faturamento: 0, comissao: 0 };
        }
        operadoraStats[op].faturamento += valor;
        operadoraStats[op].comissao += comissao;
      });

      const operadoraSorted = Object.entries(operadoraStats)
        .sort((a, b) => b[1].faturamento - a[1].faturamento)
        .slice(0, 5);

      const maxFat = Math.max(...operadoraSorted.map(([_, stats]) => stats.faturamento), 1);
      const maxCom = Math.max(...operadoraSorted.map(([_, stats]) => stats.comissao), 1);

      chartsHeaderHtml = `
        <div style="display: grid; grid-template-columns: 1fr; gap: 12px; margin-bottom: 25px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
            <!-- Faturamento Total desativado
            <div style="background: #f8fafc !important; border: 1px solid #e2e8f0 !important; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; justify-content: center; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                <span style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 4px; display: block; text-align: left;">Faturamento Total</span>
                <span style="font-size: 18px; font-weight: 800; color: #0f172a; display: block; text-align: left;">\${formatarMoeda(totalVendasValor)}</span>
            </div>
            -->
            <div style="background: #f8fafc !important; border: 1px solid #e2e8f0 !important; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; justify-content: center; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                <span style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 4px; display: block; text-align: left;">Total Comissão</span>
                <span style="font-size: 18px; font-weight: 800; color: #0284c7; display: block; text-align: left;">\${formatarMoeda(totalComissao)}</span>
            </div>
            <!-- Ticket Médio desativado
            <div style="background: #f8fafc !important; border: 1px solid #e2e8f0 !important; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; justify-content: center; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                <span style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 4px; display: block; text-align: left;">Ticket Médio</span>
                <span style="font-size: 18px; font-weight: 800; color: #475569; display: block; text-align: left;">\${formatarMoeda(ticketMedio)}</span>
            </div>
            -->
        </div>
      `;
    }

    const htmlContent = `
            <div id="print-header">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <div style="width: 32px; height: 32px; background: #d1fae5; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #059669; border: 1px solid #10b981;">D</div>
                    <h2 style="margin: 0; font-size: 20px;">${tituloRelatorio}</h2>
                </div>
                <p style="margin: 4px 0; color: #475569;">Período: ${reportPeriod || "Não especificado"}</p>
                <p style="margin: 4px 0; color: #475569;">Gerado em ${new Date().toLocaleDateString("pt-PT")} às ${new Date().toLocaleTimeString("pt-PT")} por ${currentUser?.username || "Sistema"}</p>
            </div>
            ${chartsHeaderHtml}
            <table>
                <thead>${tableHeader}</thead>
                <tbody>${tableRows}</tbody>
                <tfoot>${tableFooter}</tfoot>
            </table>
        `;

    try {
      const reportHtml = `
          <!DOCTYPE html>
          <html lang="pt-PT">
          <head>
              <meta charset="UTF-8">
              <title>${tituloRelatorio}</title>
              <style>
                  @page { size: ${printConfig.orientation}; margin: 10mm; }
                  body { background-color: white !important; color: black !important; font-family: ui-sans-serif, system-ui, sans-serif; padding: 20px; }
                  #print-header { margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; }
                  .print-wrapper { transform: scale(${printConfig.scale / 100}); transform-origin: top left; width: ${100 / (printConfig.scale / 100)}%; }
                  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
                  th, td { border: 1px solid #94a3b8 !important; color: black !important; padding: 6px 8px; text-align: center; }
                  th { background-color: #f1f5f9 !important; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              </style>
          </head>
          <body>
              <div class="print-wrapper">${htmlContent}</div>
              <script>
                  window.onload = function() {
                      setTimeout(function() {
                          window.print();
                      }, 500);
                  };
              </script>
          </body>
          </html>
      `;

      const blob = new Blob([reportHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const newWin = window.open(url, "_blank");
      if (!newWin) {
          // Fallback se popup for bloqueado (muito comum em iframes)
          const a = document.createElement("a");
          a.href = url;
          a.target = "_blank";
          a.download = `${tituloRelatorio}.html`;
          
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          alert("O popup de impressão foi bloqueado. O relatório foi baixado como HTML. Abra o arquivo baixado para imprimir.");
      }
      
      setTimeout(() => {
          URL.revokeObjectURL(url);
      }, 5000);
      
      setModalPrintOpen(false);
    } catch (e) {
      console.error("Print failed:", e);
      alert("Houve um problema ao gerar a impressão. Abra o aplicativo em uma nova guia.");
    }
  };

  if (!supabase) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 p-6">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-lg w-full text-center border border-slate-700">
          <Database size={48} className="text-blue-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">
            Conexão Cloud Necessária
          </h1>
          <p className="text-slate-400 mb-6 text-sm">
            O seu sistema Don Gestão precisa da configuração do Supabase para
            funcionar.
          </p>
        </div>
      </div>
    );
  }

  if (pendingTermsUser) {
    return (
      <AceiteTermosLGPD
        user={pendingTermsUser}
        onAccepted={(acceptanceData) => {
          setPendingTermsUser(null);
          applyLoginSession(pendingTermsUser);
        }}
        onDeclined={() => {
          setPendingTermsUser(null);
          setLoginError("");
          setLoginData({ user: "", password: "", rememberMe: false });
        }}
      />
    );
  }

  if (!isSessionVerified && currentUser && !pendingTermsUser) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-100 dark:bg-slate-900 transition-colors duration-200 p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 transition-colors relative">
          <div className="flex flex-col items-center mb-8">
            <img
              src="/Logo_DonGestao.png"
              alt="Don Gestão"
              className="h-16 w-auto object-contain mb-4"
            />
          </div>
          <form
            onSubmit={handleLogin}
            onInvalid={(e) => e.currentTarget.classList.add("show-errors")}
            className="space-y-5"
          >
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                Usuário
              </label>
              <div className="relative">
                <User
                  size={18}
                  className="absolute left-3 top-3 text-slate-400"
                />
                <input
                  type="text"
                  required
                  value={loginData.user}
                  onChange={(e) =>
                    setLoginData({ ...loginData, user: e.target.value })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                Senha
              </label>
              <div className="relative">
                <Key
                  size={18}
                  className="absolute left-3 top-3 text-slate-400"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={loginData.password}
                  onChange={(e) =>
                    setLoginData({ ...loginData, password: e.target.value })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-10 py-2.5 text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  <Eye size={18} />
                </button>
              </div>
            </div>
            <div className="flex items-center -mt-2 mb-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={loginData.rememberMe}
                onChange={(e) =>
                  setLoginData({ ...loginData, rememberMe: e.target.checked })
                }
                className="w-4 h-4 text-emerald-600 bg-slate-50 border-slate-300 rounded focus:ring-emerald-500 dark:focus:ring-emerald-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-900 dark:border-slate-600"
              />
              <label
                htmlFor="rememberMe"
                className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none"
              >
                Manter sessão iniciada
              </label>
            </div>
            {loginError && (
              <p className="text-rose-500 dark:text-rose-400 text-sm font-bold text-center bg-rose-100 dark:bg-rose-500/10 py-2 rounded-lg border border-rose-200 dark:border-rose-500/20">
                {loginError}
              </p>
            )}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-slate-300 via-slate-100 to-slate-300 hover:from-slate-200 hover:via-white hover:to-slate-200 text-slate-800 border border-slate-400 font-bold py-3 rounded-lg flex items-center justify-center space-x-2 transition-all shadow-[0_0_15px_rgba(203,213,225,0.6)] mt-4 relative overflow-hidden group"
              disabled={loading}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent -translate-x-[150%] skew-x-[-30deg] group-hover:animate-[shine_1.5s_ease-out_infinite]"></div>
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-800 border-t-transparent rounded-full animate-spin relative z-10"></div>
              ) : (
                <>
                  <Lock size={18} className="relative z-10" />
                  <span className="relative z-10">Entrar no Sistema</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-200">
      {/* ALERTS E LOADING */}
      {alertDialog.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4 border-l-4 ${alertDialog.type === "success" ? "border-emerald-500 shadow-emerald-500/20" : "border-rose-500 shadow-rose-500/20"} ${alertDialog.type === "warning_pulse" ? "animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.6)]" : ""}`}
          >
            <h3
              className={`text-xl font-black mb-3 flex items-center ${alertDialog.type === "success" ? "text-emerald-600 dark:text-emerald-500" : "text-rose-600 dark:text-rose-500"}`}
            >
              {alertDialog.type === "success" ? (
                <CheckCircle className="mr-2 text-emerald-600 dark:text-emerald-500" />
              ) : (
                <AlertCircle className="mr-2 text-rose-600 dark:text-rose-500" />
              )}
              {alertDialog.type === "success" ? "SUCESSO" : "ATENÇÃO"}
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-6 whitespace-pre-wrap">
              {alertDialog.message}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setAlertDialog({ isOpen: false, message: "" })}
                className={`${alertDialog.type === "success" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"} text-white px-6 py-2 rounded-lg font-bold transition-colors`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4 border-l-4 border-rose-500 shadow-rose-500/20">
            <h3 className="text-xl font-black mb-3 text-rose-600 dark:text-rose-500 flex items-center">
              <AlertCircle className="mr-2 text-rose-600" /> ATENÇÃO
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-6 whitespace-pre-wrap">
              {confirmDialog.message}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() =>
                  setConfirmDialog({
                    isOpen: false,
                    message: "",
                    onConfirm: null,
                  })
                }
                className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                  setConfirmDialog({
                    isOpen: false,
                    message: "",
                    onConfirm: null,
                  });
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-2 rounded-lg font-bold transition-colors shadow-lg"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 z-[60] bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-800 dark:text-white font-medium animate-pulse">
            {loadingMsg}
          </p>
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
        defaultEmpresa={defaultEmpresa}
        empresasList={empresasList}
        onSelectEmpresa={handleSelectEmpresa}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 p-4 md:p-8 relative transition-colors duration-200">
          {/* ECRÃ DE EMPRESAS */}
          {currentView === "empresas" && hasAccess("empresas") && (
            <EmpresasGestao
              empresasList={empresasList}
              setEmpresasList={setEmpresasList}
              showAlert={showAlert}
              showConfirm={showConfirm}
            />
          )}

          {/* NOVO DASHBOARD */}
          {currentView === "dashboard" && hasAccess("dashboard") && (
            <DashboardControle
              vendasList={getAllVendas()}
              defaultEmpresa={defaultEmpresa}
              isDarkMode={isDarkMode}
            />
          )}

          {/* ECRÃ 12: PAINEL DE CONTROLE (ANTIGO DASHBOARD) */}
          {currentView === "painel" && hasAccess("dashboard") && (
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
              <header>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                  Visão Geral
                </h2>
              </header>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg flex flex-col justify-between transition-colors duration-200">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-slate-500 dark:text-slate-400 font-medium">
                        Clientes na Base
                      </h3>
                      <p className="text-4xl font-bold text-slate-900 dark:text-white mt-1">
                        {clientes.length}
                      </p>
                    </div>
                    <div className="bg-emerald-100 dark:bg-emerald-500/20 p-3 rounded-lg">
                      <Users
                        size={24}
                        className="text-emerald-600 dark:text-emerald-400"
                      />
                    </div>
                  </div>
                  {hasAccess("clientes") && (
                    <button
                      onClick={() => setCurrentView("clientes")}
                      className="text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 flex items-center"
                    >
                      Gerir Clientes <ChevronRight size={16} />
                    </button>
                  )}
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg flex flex-col justify-between transition-colors duration-200">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-slate-500 dark:text-slate-400 font-medium">
                        Extratos Arquivados
                      </h3>
                      <p className="text-4xl font-bold text-slate-900 dark:text-white mt-1">
                        {dbReports.length}
                      </p>
                    </div>
                    <div className="bg-blue-100 dark:bg-blue-500/20 p-3 rounded-lg">
                      <FileText
                        size={24}
                        className="text-blue-600 dark:text-blue-400"
                      />
                    </div>
                  </div>
                  {hasAccess("gestor") && (
                    <button
                      onClick={() => setCurrentView("gestor-browse")}
                      className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-500 flex items-center"
                    >
                      Explorar Gestor <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* CONTRATOS ATIVOS */}
              {(() => {
                const todasVendas = getAllVendas();
                const contratosAtivos = todasVendas.filter((venda) => {
                  return venda.situacao && !venda.situacao.toUpperCase().includes("CANCELADO");
                });
                
                return (
                  <>
                    {hasAccess("vendas") && (
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg transition-colors duration-200 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                          <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                              <CheckCircle
                                size={22}
                                className="mr-2 text-emerald-500 dark:text-emerald-400"
                              />
                              Contratos Ativos
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                              Total de contratos com situação ativa no sistema (não cancelados)
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 px-4 py-2 rounded-lg text-center">
                              <span className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Ativos</span>
                              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{contratosAtivos.length}</span>
                            </div>
                            <button
                              onClick={() => {
                                setVendasFilterForm(prev => ({ ...prev, situacao: `FATURADO ${nomeEmpresaUpper} NF, PENDENTE` }));
                                setAppliedVendasFilters({ situacao: `FATURADO ${nomeEmpresaUpper} NF, PENDENTE` });
                                setCurrentView("vendas");
                              }}
                              className="text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg transition-all"
                            >
                              Ver todos no painel
                            </button>
                          </div>
                        </div>
                        {contratosAtivos.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                  <th className="py-3 px-4 rounded-tl-lg">Data</th>
                                  <th className="py-3 px-4">Cliente</th>
                                  <th className="py-3 px-4">Contrato</th>
                                  <th className="py-3 px-4">Operadora</th>
                                  <th className="py-3 px-4 text-center">Parcela</th>
                                  <th className="py-3 px-4 text-emerald-600 dark:text-emerald-400">
                                    Valor Total
                                  </th>
                                  <th className="py-3 px-4 rounded-tr-lg">Situação</th>
                                </tr>
                              </thead>
                              <tbody>
                                {contratosAtivos
                                  .slice()
                                  .reverse()
                                  .slice(0, 5)
                                  .map((venda, idx) => (
                                    <tr
                                      key={idx}
                                      className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
                                    >
                                      <td className="py-3 px-4 group-hover:text-slate-900 dark:group-hover:text-white">
                                        {venda.dataVenda
                                          ? new Date(
                                              venda.dataVenda + "T12:00:00",
                                            ).toLocaleDateString("pt-BR")
                                          : "-"}
                                      </td>
                                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                                        {venda.cliente}
                                      </td>
                                      <td className="py-3 px-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                                        {venda.contrato || "-"}
                                      </td>
                                      <td className="py-3 px-4 group-hover:text-slate-900 dark:group-hover:text-white">
                                        {venda.operadora ||
                                          venda.codigoOperadora ||
                                          venda.codOperadora ||
                                          "-"}
                                      </td>
                                      <td className="py-3 px-4 text-center">
                                        <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded text-xs font-bold border border-emerald-100 dark:border-emerald-500/20 whitespace-nowrap">
                                          Parcela {String(venda.parcela || "").trim().replace(/\D/g, "") || "1"}
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 font-medium group-hover:text-slate-900 dark:group-hover:text-white">
                                        {new Intl.NumberFormat("pt-BR", {
                                          style: "currency",
                                          currency: "BRL",
                                        }).format(venda.valor || 0)}
                                      </td>
                                      <td className="py-3 px-4">
                                        <span className="px-2 py-1 bg-emerald-100/50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded text-xs font-semibold whitespace-nowrap">
                                          {venda.situacao}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700 p-8 rounded-xl text-center text-slate-500 dark:text-slate-400">
                            <CheckCircle
                              size={48}
                              className="mx-auto mb-4 text-slate-400 dark:text-slate-500 opacity-50"
                            />
                            <p className="font-medium text-lg mb-1">
                              Nenhum contrato ativo registrado ainda
                            </p>
                            <p className="text-sm opacity-80">
                              Os contratos ativos aparecerão aqui assim que forem registrados com situação ativa.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}

              {/* ULTIMOS RELATORIOS */}
              {hasAccess("processar") && savedReportsList.length > 0 && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg transition-colors duration-200 animate-in fade-in slide-in-from-bottom-4 mt-8">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                      <FileText
                        size={20}
                        className="mr-2 text-blue-500 dark:text-blue-400"
                      />
                      Últimos Relatórios
                    </h3>
                    <button
                      onClick={() => setCurrentView("processar")}
                      className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline transition-all"
                    >
                      Ver todos
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-3 px-4 rounded-tl-lg">
                            Data de Criação
                          </th>
                          <th className="py-3 px-4">Nome do Relatório</th>
                          <th className="py-3 px-4 rounded-tr-lg">Período</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...savedReportsList]
                          .reverse()
                          .slice(0, 5)
                          .map((rep) => (
                            <tr
                              key={rep.id}
                              className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                            >
                              <td className="py-3 px-4">
                                {new Date(rep.dataCriacao).toLocaleDateString(
                                  "pt-BR",
                                )}{" "}
                                às{" "}
                                {new Date(rep.dataCriacao)
                                  .toLocaleTimeString("pt-BR")
                                  .slice(0, 5)}
                              </td>
                              <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                                {rep.nome}
                              </td>
                              <td className="py-3 px-4">
                                {rep.periodo || "-"}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {hasAccess("processar") && savedReportsList.length === 0 && (
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700 p-8 rounded-xl text-center text-slate-500 dark:text-slate-400 mt-8">
                  <FileText
                    size={48}
                    className="mx-auto mb-4 text-slate-400 dark:text-slate-500 opacity-50"
                  />
                  <p className="font-medium text-lg mb-1">
                    Nenhum relatório salvo
                  </p>
                  <p className="text-sm opacity-80">
                    Gere e salve relatórios na área de relatórios de comissão.
                  </p>
                  <button
                    onClick={() => setCurrentView("processar")}
                    className="mt-4 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded shadow-sm text-sm font-bold transition-colors"
                  >
                    Acessar Relatórios
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ECRÃ 2: VENDAS */}
          {currentView === "vendas" && hasAccess("vendas") && (
            <div className="w-full mx-auto animate-in fade-in duration-500 pb-20">
              <div className="flex justify-between items-center mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
                    <ShoppingCart size={28} className="mr-3 text-emerald-500" />{" "}
                    Vendas de serviços
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      <Home size={14} className="inline mr-1 mb-0.5" />
                      Início
                    </span>{" "}
                    &gt; Vendas de serviços &gt; Listar
                  </p>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 mb-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm transition-colors duration-200">
                <div className="flex gap-2 w-full md:w-auto relative">
                  <button
                    onClick={() => abrirModalVenda()}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-sm font-bold flex items-center shadow-md transition-colors"
                  >
                    <Plus size={16} className="mr-2" /> Adicionar
                  </button>
                  {selectedVendas.length > 0 && (
                    <button
                      onClick={handleApagarVendasSelecionadas}
                      className="bg-rose-500 hover:bg-rose-400 text-white px-4 py-2 rounded text-sm font-bold flex items-center shadow transition-colors ml-2"
                    >
                      <Trash2 size={16} className="mr-2" /> Eliminar (
                      {selectedVendas.length})
                    </button>
                  )}
                  <div className="relative vendas-acoes-menu ml-2">
                    <button
                      onClick={() =>
                        setShowVendasAcoesMenu(!showVendasAcoesMenu)
                      }
                      className="bg-slate-900 dark:bg-black hover:bg-slate-800 text-white px-4 py-2 rounded text-sm font-bold flex items-center transition-colors border border-slate-700 shadow-md"
                    >
                      <Settings size={16} className="mr-2" /> Mais ações{" "}
                      <ChevronDown size={16} className="ml-2" />
                    </button>
                    {showVendasAcoesMenu && (
                      <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg overflow-hidden text-sm z-50 animate-in fade-in slide-in-from-top-2">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowVendasAcoesMenu(false);
                            setModalPrintOpen(true);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-700 dark:text-slate-300 font-medium flex items-center transition-colors"
                        >
                          <Printer size={16} className="mr-2" /> Imprimir Relatório
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowVendasAcoesMenu(false);
                            exportarVendasParaExcel();
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-700 dark:text-slate-300 font-medium flex items-center transition-colors border-t border-slate-100 dark:border-slate-700"
                        >
                          <FileOutput size={16} className="mr-2" /> Exportar
                          para Excel
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowVendasAcoesMenu(false);
                            reorganizarRegistosVendas();
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 text-slate-700 dark:text-slate-300 font-medium flex items-center transition-colors border-t border-slate-100 dark:border-slate-700"
                        >
                          <ListFilter size={16} className="mr-2" /> Reordenar
                          Sequência
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowVendasAcoesMenu(false);
                            setShowModalInconsistencias(true);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-orange-50 dark:hover:bg-orange-900/30 hover:text-orange-600 dark:hover:text-orange-400 text-slate-700 dark:text-slate-300 font-medium flex items-center transition-colors border-t border-slate-100 dark:border-slate-700"
                        >
                          <AlertTriangle size={16} className="mr-2" /> Painel de Inconsistências
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="relative vendas-cols-menu">
                    <button
                      onClick={() => setShowVendasColsMenu(!showVendasColsMenu)}
                      className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 px-3 py-2 rounded text-slate-600 dark:text-slate-200 transition-colors"
                      title="Colunas"
                    >
                      <Layers size={18} />
                    </button>
                    {showVendasColsMenu && (
                      <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg overflow-hidden text-sm z-50 animate-in fade-in slide-in-from-top-2 p-3">
                        <div className="flex justify-between items-center mb-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            Visibilidade das Colunas
                          </span>
                        </div>
                        <div className="flex gap-2 mb-3">
                          <button
                            onClick={() => setAllVendasCols(true)}
                            className="flex-1 text-xs py-1 px-2 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                          >
                            Marcar Todas
                          </button>
                          <button
                            onClick={() => setAllVendasCols(false)}
                            className="flex-1 text-xs py-1 px-2 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                          >
                            Desmarcar Todas
                          </button>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                          {Object.keys(vendasColLabels).map((key) => (
                            <label
                              key={key}
                              className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded"
                            >
                              <input
                                type="checkbox"
                                checked={vendasTableCols[key]}
                                onChange={() => toggleVendasCol(key)}
                                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                              />
                              <span className="text-slate-700 dark:text-slate-300">
                                {vendasColLabels[key]}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex w-full md:w-auto gap-2">
                  <div className="relative z-30 vendas-period-menu">
                    <button
                      onClick={() =>
                        setShowVendasPeriodMenu(!showVendasPeriodMenu)
                      }
                      className="bg-slate-900 dark:bg-black text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center transition-colors shadow-md border border-slate-700 h-full"
                    >
                      {displayPeriodLabel}{" "}
                      <ChevronDown size={14} className="ml-2" />
                    </button>
                    {showVendasPeriodMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg overflow-hidden text-sm z-50 animate-in fade-in slide-in-from-top-2">
                        <ul className="flex flex-col py-1">
                          {[
                            "Hoje",
                            "Esta semana",
                            "Mês passado",
                            "Este mês",
                            "Próximo mês",
                            "Todo o período",
                            "Escolha o período",
                          ].map((preset) => (
                            <li key={preset}>
                              <button
                                onClick={() => applyDatePreset(preset)}
                                className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors font-medium"
                              >
                                {preset}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setShowVendasFilter(!showVendasFilter)}
                    className={`px-4 py-2 border rounded-lg text-sm font-bold flex items-center transition-colors ${showVendasFilter ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white border-slate-300 dark:border-slate-600" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"}`}
                  >
                    <Search size={16} className="mr-2" /> Busca avançada
                  </button>
                </div>
              </div>
              {showVendasFilter && (
                <div
                  className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
                  onClick={(e) => {
                    if (e.target === e.currentTarget)
                      setShowVendasFilter(false);
                  }}
                >
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl relative w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
                    <button
                      onClick={() => setShowVendasFilter(false)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                    >
                      <X size={20} />
                    </button>
                    <h3 className="text-xl font-bold mb-6 text-slate-800 dark:text-white flex items-center">
                      <Search className="mr-2" /> Busca Avançada de Vendas
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                      {/* Loja */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                          Loja
                        </label>
                        <select
                          value={vendasFilterForm.loja}
                          onChange={(e) =>
                            setVendasFilterForm({
                              ...vendasFilterForm,
                              loja: e.target.value,
                            })
                          }
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                        >
                          <option value="Todos">Todos</option>
                          <option
                            value={`${nomeEmpresaUpper} ASSESSORIA`}
                          >{`${nomeEmpresaUpper} ASSESSORIA`}</option>
                          <option value={nomeEmpresaUpper}>
                            {nomeEmpresaUpper}
                          </option>
                          {empresasList
                            .filter(
                              (e) => e.nome.toUpperCase() !== nomeEmpresaUpper,
                            )
                            .map((e) => (
                              <React.Fragment key={e.id}>
                                <option
                                  value={`${e.nome.toUpperCase()} ASSESSORIA`}
                                >{`${e.nome.toUpperCase()} ASSESSORIA`}</option>
                                <option value={e.nome.toUpperCase()}>
                                  {e.nome.toUpperCase()}
                                </option>
                              </React.Fragment>
                            ))}
                        </select>
                      </div>

                      {/* Código (Registo) */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                          Código (Registo)
                        </label>
                        <input
                          type="text"
                          value={vendasFilterForm.codigo}
                          onChange={(e) =>
                            setVendasFilterForm({
                              ...vendasFilterForm,
                              codigo: e.target.value,
                            })
                          }
                          placeholder="Código do registo"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Data de venda */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                          Data de venda
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={vendasFilterForm.dataInicio}
                            onChange={(e) =>
                              setVendasFilterForm({
                                ...vendasFilterForm,
                                dataInicio: e.target.value,
                              })
                            }
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                            placeholder="dd/mm/aaaa"
                          />
                          <span className="text-slate-400 font-medium">
                            até
                          </span>
                          <input
                            type="date"
                            value={vendasFilterForm.dataFim}
                            onChange={(e) =>
                              setVendasFilterForm({
                                ...vendasFilterForm,
                                dataFim: e.target.value,
                              })
                            }
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                            placeholder="dd/mm/aaaa"
                          />
                        </div>
                      </div>

                      {/* Situação */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                          Situação
                        </label>
                        <select
                          value={vendasFilterForm.situacao}
                          onChange={(e) =>
                            setVendasFilterForm({
                              ...vendasFilterForm,
                              situacao: e.target.value,
                            })
                          }
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                        >
                          <option value="Todos">Todos</option>
                          <option value={`FATURADO ${nomeEmpresaUpper} NF`}>
                            FATURADO {nomeEmpresaUpper} NF
                          </option>
                          <option value="PENDENTE">PENDENTE</option>
                          <option value="CANCELADO">CANCELADO</option>
                        </select>
                      </div>

                      {/* Cliente */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                          Cliente
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Nome do cliente..."
                            value={vendasFilterForm.cliente}
                            onChange={(e) => {
                              setVendasFilterForm({
                                ...vendasFilterForm,
                                cliente: e.target.value,
                              });
                              setShowFilterClienteSuggestions(true);
                            }}
                            onFocus={() =>
                              setShowFilterClienteSuggestions(true)
                            }
                            onBlur={() =>
                              setTimeout(
                                () => setShowFilterClienteSuggestions(false),
                                200,
                              )
                            }
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 pr-8"
                          />
                          {showFilterClienteSuggestions &&
                            vendasFilterForm.cliente && (
                              <ul className="absolute z-10 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg max-h-48 overflow-y-auto shadow-lg mt-1">
                                {clientes
                                  .filter((c) =>
                                    c.nome
                                      .toLowerCase()
                                      .includes(
                                        vendasFilterForm.cliente.toLowerCase(),
                                      ),
                                  )
                                  .map((c) => (
                                    <li
                                      key={c.id}
                                      className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 last:border-0"
                                      onMouseDown={() => {
                                        setVendasFilterForm({
                                          ...vendasFilterForm,
                                          cliente: c.nome,
                                        });
                                        setShowFilterClienteSuggestions(false);
                                      }}
                                    >
                                      <div className="font-bold">{c.nome}</div>
                                      {c.documento && (
                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                          {c.documento}
                                        </div>
                                      )}
                                    </li>
                                  ))}
                                {clientes.filter((c) =>
                                  c.nome
                                    .toLowerCase()
                                    .includes(
                                      vendasFilterForm.cliente.toLowerCase(),
                                    ),
                                ).length === 0 && (
                                  <li className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm italic text-center">
                                    Nenhum cliente encontrado
                                  </li>
                                )}
                              </ul>
                            )}
                          {vendasFilterForm.cliente && (
                            <Trash2
                              size={16}
                              onClick={() =>
                                setVendasFilterForm({
                                  ...vendasFilterForm,
                                  cliente: "",
                                })
                              }
                              className="absolute right-3 top-2.5 text-slate-400 cursor-pointer hover:text-rose-500 transition-colors"
                            />
                          )}
                        </div>
                      </div>

                      {/* Contrato */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                          Contrato
                        </label>
                        <input
                          type="text"
                          value={vendasFilterForm.contrato}
                          onChange={(e) =>
                            setVendasFilterForm({
                              ...vendasFilterForm,
                              contrato: e.target.value,
                            })
                          }
                          placeholder="Número do contrato"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Código Operadora */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                          Op. | Seg.
                        </label>
                        <select
                          value={vendasFilterForm.codigoOperadora}
                          onChange={(e) =>
                            setVendasFilterForm({
                              ...vendasFilterForm,
                              codigoOperadora: e.target.value,
                            })
                          }
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                        >
                          <option value="">Todas</option>
                          <optgroup label="Operadoras">
                            {combinedOperadoras.map((op) => (
                              <option key={op} value={op}>
                                {op}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Seguradoras">
                            {combinedSeguradoras.map((seg) => (
                              <option key={seg} value={seg}>
                                {seg}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>

                      {/* Nº Vidas */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                          N. vidas
                        </label>
                        <input
                          type="number"
                          value={vendasFilterForm.vidas}
                          onChange={(e) =>
                            setVendasFilterForm({
                              ...vendasFilterForm,
                              vidas: e.target.value,
                            })
                          }
                          placeholder="Quantidade de vidas"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Vitalício */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                          Vitalício
                        </label>
                        <select
                          value={vendasFilterForm.vitalicio}
                          onChange={(e) =>
                            setVendasFilterForm({
                              ...vendasFilterForm,
                              vitalicio: e.target.value,
                            })
                          }
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                        >
                          <option value="Selecione">Selecione</option>
                          <option value="Sim">Sim</option>
                          <option value="Não">Não</option>
                        </select>
                      </div>

                      {/* Corretor */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                          Corretor
                        </label>
                        <select
                          value={vendasFilterForm.corretor}
                          onChange={(e) =>
                            setVendasFilterForm({
                              ...vendasFilterForm,
                              corretor: e.target.value,
                            })
                          }
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                        >
                          <option value="Todos">Todos</option>
                          {empresasList.map((e) => (
                            <option key={e.nome} value={e.nome}>
                              {e.nome}
                            </option>
                          ))}
                          <option value="Assessoria">Assessoria</option>
                          <option value="Corretor Interno">
                            Corretor Interno
                          </option>
                        </select>
                      </div>

                      {/* Parcela */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                          Parcela
                        </label>
                        <input
                          type="text"
                          value={vendasFilterForm.parcela}
                          onChange={(e) =>
                            setVendasFilterForm({
                              ...vendasFilterForm,
                              parcela: e.target.value,
                            })
                          }
                          placeholder="Número da parcela"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Início Vigência */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                          Início Vigência
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={vendasFilterForm.inicioVigenciaInicio}
                            onChange={(e) =>
                              setVendasFilterForm({
                                ...vendasFilterForm,
                                inicioVigenciaInicio: e.target.value,
                              })
                            }
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                            placeholder="dd/mm/aaaa"
                          />
                          <span className="text-slate-400 font-medium">
                            até
                          </span>
                          <input
                            type="date"
                            value={vendasFilterForm.inicioVigenciaFim}
                            onChange={(e) =>
                              setVendasFilterForm({
                                ...vendasFilterForm,
                                inicioVigenciaFim: e.target.value,
                              })
                            }
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                            placeholder="dd/mm/aaaa"
                          />
                        </div>
                      </div>

                      {/* Nota Fiscal */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                          Nota Fiscal
                        </label>
                        <input
                          type="text"
                          value={vendasFilterForm.notaFiscal}
                          onChange={(e) =>
                            setVendasFilterForm({
                              ...vendasFilterForm,
                              notaFiscal: e.target.value,
                            })
                          }
                          placeholder="Número da NF"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Botões */}
                    <div className="flex gap-3 mt-6 border-t border-slate-200 dark:border-slate-700 pt-4">
                      <button
                        onClick={() => {
                          handleBuscarVendas();
                          setShowVendasFilter(false);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center shadow transition-colors"
                      >
                        <CheckCircle size={16} className="mr-2" /> Aplicar
                        Filtros
                      </button>
                      <button
                        onClick={() => {
                          handleLimparVendas();
                          setShowVendasFilter(false);
                        }}
                        className="bg-rose-500 hover:bg-rose-400 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center shadow transition-colors"
                      >
                        <X size={16} className="mr-2" /> Limpar
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div className="-mx-4 md:mx-0 bg-white dark:bg-slate-800 border-y md:border border-slate-200 dark:border-slate-700 md:rounded-lg shadow-sm overflow-x-auto transition-colors duration-200">
                <table className="w-full text-left border-collapse text-sm whitespace-nowrap min-w-max">
                  <thead>
                    <tr className="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750/50 transition-colors duration-200">
                      <th className="py-3 px-4 w-10 text-center border-r border-slate-200 dark:border-slate-700">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 dark:bg-slate-700 dark:border-slate-600 dark:checked:bg-emerald-600 cursor-pointer"
                          checked={isAllVendasSelected}
                          onChange={toggleAllVendas}
                          disabled={displayedVendas.length === 0}
                          title="Selecionar Todos na Página"
                        />
                      </th>
                      {vendasTableCols.numero && (
                        <th
                          onClick={() => handleSortVendas("numero")}
                          className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 w-24"
                        >
                          Registo {getSortIcon("numero")}
                        </th>
                      )}
                      {vendasTableCols.contrato && (
                        <th
                          onClick={() => handleSortVendas("contrato")}
                          className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700"
                        >
                          Contrato {getSortIcon("contrato")}
                        </th>
                      )}
                      {vendasTableCols.codOperadora && (
                        <th
                          onClick={() => handleSortVendas("codOperadora")}
                          className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700"
                        >
                          Cód. Op. {getSortIcon("codOperadora")}
                        </th>
                      )}
                      {vendasTableCols.codigoOperadora && (
                        <th
                          onClick={() => handleSortVendas("codigoOperadora")}
                          className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700"
                        >
                          Operadora {getSortIcon("codigoOperadora")}
                        </th>
                      )}
                      {vendasTableCols.vidas && (
                        <th
                          onClick={() => handleSortVendas("vidas")}
                          className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700"
                        >
                          Vidas {getSortIcon("vidas")}
                        </th>
                      )}
                      {vendasTableCols.cliente && (
                        <th
                          onClick={() => handleSortVendas("cliente")}
                          className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700"
                        >
                          Cliente {getSortIcon("cliente")}
                        </th>
                      )}
                      {vendasTableCols.dataVenda && (
                        <th
                          onClick={() => handleSortVendas("dataVenda")}
                          className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 w-32"
                        >
                          Data {getSortIcon("dataVenda")}
                        </th>
                      )}
                      {vendasTableCols.loja && (
                        <th
                          onClick={() => handleSortVendas("loja")}
                          className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700"
                        >
                          Loja {getSortIcon("loja")}
                        </th>
                      )}
                      {vendasTableCols.servico && (
                        <th
                          onClick={() => handleSortVendas("servico")}
                          className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-white border-r border-slate-200 dark:border-slate-700 bg-slate-400 dark:bg-slate-600"
                        >
                          Serviço {getSortIcon("servico")}
                        </th>
                      )}
                      {vendasTableCols.corretor && (
                        <th
                          onClick={() => handleSortVendas("corretor")}
                          className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700"
                        >
                          Corretor {getSortIcon("corretor")}
                        </th>
                      )}
                      {vendasTableCols.situacao && (
                        <th
                          onClick={() => handleSortVendas("situacao")}
                          className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 text-center w-48"
                        >
                          Situação {getSortIcon("situacao")}
                        </th>
                      )}
                      {vendasTableCols.valor && (
                        <th
                          onClick={() => handleSortVendas("valor")}
                          className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-700 w-32 text-right"
                        >
                          Valor {getSortIcon("valor")}
                        </th>
                      )}
                      {vendasTableCols.comissaoPorcentagem && (
                        <th
                          onClick={() =>
                            handleSortVendas("comissaoPorcentagem")
                          }
                          className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-sky-600 dark:text-sky-400 border-r border-slate-200 dark:border-slate-700 w-24 text-center !resize-none"
                        >
                          % {getSortIcon("comissaoPorcentagem")}
                        </th>
                      )}
                      {vendasTableCols.comissao && (
                        <th
                          onClick={() => handleSortVendas("comissao")}
                          className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-sky-600 dark:text-sky-400 border-r border-slate-200 dark:border-slate-700 w-32 text-right"
                        >
                          Comissão {getSortIcon("comissao")}
                        </th>
                      )}
                      {vendasTableCols.parcela && (
                        <th
                          onClick={() => handleSortVendas("parcela")}
                          className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700"
                        >
                          Parcela {getSortIcon("parcela")}
                        </th>
                      )}
                      {vendasTableCols.inicioVigencia && (
                        <th
                          onClick={() => handleSortVendas("inicioVigencia")}
                          className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700"
                        >
                          Início Vigência {getSortIcon("inicioVigencia")}
                        </th>
                      )}
                      {vendasTableCols.notaFiscal && (
                        <th
                          onClick={() => handleSortVendas("notaFiscal")}
                          className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-purple-600 dark:text-purple-400 border-r border-slate-200 dark:border-slate-700"
                        >
                          NF {getSortIcon("notaFiscal")}
                        </th>
                      )}
                      {vendasTableCols.vitalicio && (
                        <th
                          onClick={() => handleSortVendas("vitalicio")}
                          className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-purple-600 dark:text-purple-400 border-r border-slate-200 dark:border-slate-700"
                        >
                          Vitalício {getSortIcon("vitalicio")}
                        </th>
                      )}
                      {vendasTableCols.assessoria && (
                        <th
                          onClick={() => handleSortVendas("assessoria")}
                          className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700"
                        >
                          Assessoria {getSortIcon("assessoria")}
                        </th>
                      )}
                      {vendasTableCols.formaPagamento && (
                        <th
                          onClick={() => handleSortVendas("formaPagamento")}
                          className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700"
                        >
                          Pagamento {getSortIcon("formaPagamento")}
                        </th>
                      )}
                      {vendasTableCols.desconto && (
                        <th
                          onClick={() => handleSortVendas("desconto")}
                          className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-rose-600 dark:text-rose-400 border-r border-slate-200 dark:border-slate-700"
                        >
                          Desconto {getSortIcon("desconto")}
                        </th>
                      )}
                      {vendasTableCols.notas && (
                        <th
                          onClick={() => handleSortVendas("notas")}
                          className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700"
                        >
                          Notas {getSortIcon("notas")}
                        </th>
                      )}
                      <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-center w-40">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedVendas.length === 0 ? (
                      <tr>
                        <td
                          colSpan={
                            Object.values(vendasTableCols).filter(Boolean)
                              .length + 2
                          }
                          className="py-8 text-center text-slate-500 italic"
                        >
                          Nenhum registo de venda encontrado.
                        </td>
                      </tr>
                    ) : (
                      currentVendas.map((venda) => (
                        <tr
                          key={venda.id}
                          className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors cursor-default"
                        >
                          <td
                            className="py-3 px-4 text-center border-r border-slate-200 dark:border-slate-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleVendaSelection(venda.id);
                            }}
                          >
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 dark:bg-slate-700 dark:border-slate-600 dark:checked:bg-emerald-600 cursor-pointer"
                              checked={selectedVendas.includes(venda.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleVendaSelection(venda.id);
                              }}
                            />
                          </td>
                          {vendasTableCols.numero && (
                            <td
                              onClick={() => abrirModalVenda(venda)}
                              className="cursor-pointer py-4 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700"
                            >
                              {venda.numero
                                ? String(venda.numero).padStart(5, "0")
                                : "-"}
                            </td>
                          )}
                          {vendasTableCols.contrato && (
                            <td
                              onClick={() => abrirModalVenda(venda)}
                              className="cursor-pointer py-4 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700"
                            >
                              {venda.contrato || "-"}
                            </td>
                          )}
                          {vendasTableCols.codOperadora && (
                            <td
                              onClick={() => abrirModalVenda(venda)}
                              className="cursor-pointer py-4 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700"
                            >
                              {venda.codOperadora || "-"}
                            </td>
                          )}
                          {vendasTableCols.codigoOperadora && (
                            <td
                              onClick={() => abrirModalVenda(venda)}
                              className="cursor-pointer py-4 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700"
                            >
                              {venda.codigoOperadora || "AMIL"}
                            </td>
                          )}
                          {vendasTableCols.vidas && (
                            <td
                              onClick={() => abrirModalVenda(venda)}
                              className="cursor-pointer py-4 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700"
                            >
                              {venda.vidas || "-"}
                            </td>
                          )}
                          {vendasTableCols.cliente && (
                            <td
                              onClick={() => abrirModalVenda(venda)}
                              className="cursor-pointer py-4 px-4 border-r border-slate-200 dark:border-slate-700"
                            >
                              <div className="font-bold text-slate-900 dark:text-slate-100">
                                {venda.cliente}
                              </div>
                            </td>
                          )}
                          {vendasTableCols.dataVenda && (
                            <td
                              onClick={() => abrirModalVenda(venda)}
                              className="cursor-pointer py-4 px-4 text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700"
                            >
                              {formatarDataVisivel(venda.dataVenda)}
                            </td>
                          )}
                          {vendasTableCols.loja && (
                            <td
                              onClick={() => abrirModalVenda(venda)}
                              className="cursor-pointer py-4 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700"
                            >
                              {venda.loja || "-"}
                            </td>
                          )}
                          {vendasTableCols.servico && (
                            <td
                              onClick={() => abrirModalVenda(venda)}
                              className="cursor-pointer py-4 px-4 text-white border-r border-slate-200 dark:border-slate-700"
                            >
                              {venda.servico || "-"}
                            </td>
                          )}
                          {vendasTableCols.corretor && (
                            <td
                              onClick={() => abrirModalVenda(venda)}
                              className="cursor-pointer py-4 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700"
                            >
                              {venda.corretor || "-"}
                            </td>
                          )}
                          {vendasTableCols.situacao && (
                            <td
                              onClick={() => abrirModalVenda(venda)}
                              className="cursor-pointer py-4 px-4 text-center border-r border-slate-200 dark:border-slate-700"
                            >
                              <span
                                className={`${getSituacaoColor(venda.situacao)} px-3 py-1 rounded text-xs font-bold uppercase`}
                              >
                                {venda.situacao}
                              </span>
                            </td>
                          )}
                          {vendasTableCols.valor && (
                            <td
                              onClick={() => abrirModalVenda(venda)}
                              className="cursor-pointer py-4 px-4 text-emerald-800 dark:text-emerald-200 font-medium text-right border-r border-slate-200 dark:border-slate-700"
                            >
                              {formatarMoeda(venda.valor)}
                            </td>
                          )}
                          {vendasTableCols.comissaoPorcentagem && (
                            <td
                              onClick={() => abrirModalVenda(venda)}
                              className="cursor-pointer py-4 px-4 text-sky-800 dark:text-sky-200 font-medium text-center border-r border-slate-200 dark:border-slate-700"
                            >
                              {venda.comissaoPorcentagem
                                ? `${venda.comissaoPorcentagem}%`
                                : "-"}
                            </td>
                          )}
                          {vendasTableCols.comissao && (
                            <td
                              onClick={() => abrirModalVenda(venda)}
                              className="cursor-pointer py-4 px-4 text-sky-800 dark:text-sky-200 font-medium text-right border-r border-slate-200 dark:border-slate-700"
                            >
                              {formatarMoeda(venda.comissao)}
                            </td>
                          )}
                          {vendasTableCols.parcela && (
                            <td
                              onClick={() => abrirModalVenda(venda)}
                              className="cursor-pointer py-4 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700"
                            >
                              {venda.parcela || "-"}
                            </td>
                          )}
                          {vendasTableCols.inicioVigencia && (
                            <td
                              onClick={() => abrirModalVenda(venda)}
                              className="cursor-pointer py-4 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700"
                            >
                              {formatarDataVisivel(venda.inicioVigencia)}
                            </td>
                          )}
                          {vendasTableCols.notaFiscal && (
                            <td
                              onClick={() => abrirModalVenda(venda)}
                              className="cursor-pointer py-4 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700"
                            >
                              {venda.notaFiscal || "-"}
                            </td>
                          )}

                          {vendasTableCols.vitalicio && (
                            <td className="py-4 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                              {venda.vitalicio || "-"}
                            </td>
                          )}
                          {vendasTableCols.assessoria && (
                            <td className="py-4 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                              {venda.assessoria || "-"}
                            </td>
                          )}
                          {vendasTableCols.formaPagamento && (
                            <td className="py-4 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                              {venda.formaPagamento || "-"}
                            </td>
                          )}
                          {vendasTableCols.desconto && (
                            <td className="py-4 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                              {venda.desconto || "-"}
                            </td>
                          )}
                          {vendasTableCols.notas && (
                            <td className="py-4 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                              {venda.notas || "-"}
                            </td>
                          )}
                          <td className="py-4 px-4 text-center">
                            <div className="flex gap-1.5 justify-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  abrirModalVenda(venda);
                                }}
                                className="bg-sky-500 hover:bg-sky-400 text-white p-1.5 rounded transition-colors shadow-sm"
                                title="Visualizar / Editar Detalhes"
                              >
                                <Search size={14} />
                              </button>
                              {(venda.isFromReport || (venda.contrato && savedReportsList.some((r) => r.dados && Array.isArray(r.dados) && r.dados.some((d) => String(d.contrato) === String(venda.contrato))))) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    abrirRelatorioDaVenda(venda);
                                  }}
                                  className="bg-emerald-500 hover:bg-emerald-400 text-white p-1.5 rounded transition-colors shadow-sm"
                                  title="Abrir Relatório da Venda"
                                >
                                  <FileText size={14} />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  duplicarVenda(venda);
                                }}
                                className="bg-blue-500 hover:bg-blue-400 text-white p-1.5 rounded transition-colors shadow-sm"
                                title="Duplicar Venda"
                              >
                                <Copy size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  apagarVenda(venda);
                                }}
                                className="bg-rose-500 hover:bg-rose-400 text-white p-1.5 rounded transition-colors shadow-sm"
                                title="Apagar Venda"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {displayedVendas.length > 0 && (
                <div className="mt-4 flex flex-col md:flex-row items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm gap-4">
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                    A mostrar {indexOfFirstVenda + 1} a{" "}
                    {Math.min(indexOfLastVenda, displayedVendas.length)} de{" "}
                    {displayedVendas.length} vendas
                  </span>
                  <div className="flex flex-wrap flex-col md:flex-row gap-4 items-center justify-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        Mostrar:
                      </span>
                      <select
                        value={vendasPerPage}
                        onChange={(e) => {
                          const val =
                            e.target.value === "Todos"
                              ? "Todos"
                              : Number(e.target.value);
                          setVendasPerPage(val);
                          setVendasCurrentPage(1);
                        }}
                        className="bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white text-sm rounded-lg py-1 px-2 focus:border-emerald-500"
                      >
                        <option value={20}>20</option>
                        <option value={40}>40</option>
                        <option value={60}>60</option>
                        <option value="Todos">Todos</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (isAllVendasSelected) {
                            setSelectedVendas([]);
                          } else {
                            setSelectedVendas(
                              currentVendas.map((v) => v.id),
                            );
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-800/40 transition-colors border border-sky-200 dark:border-sky-800/50"
                      >
                        {isAllVendasSelected
                          ? "Desmarcar Todos"
                          : "Marcar Todos (Visíveis)"}
                      </button>
                    </div>
                    {totalPagesVendas > 1 && (
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setVendasCurrentPage((p) => Math.max(1, p - 1))
                          }
                          disabled={vendasCurrentPage === 1}
                          className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium text-sm"
                        >
                          Anterior
                        </button>
                        <span className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg font-bold text-sm border border-blue-200 dark:border-blue-800/50 flex items-center">
                          {vendasCurrentPage} / {totalPagesVendas}
                        </span>
                        <button
                          onClick={() =>
                            setVendasCurrentPage((p) =>
                              Math.min(totalPagesVendas, p + 1),
                            )
                          }
                          disabled={vendasCurrentPage === totalPagesVendas}
                          className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium text-sm"
                        >
                          Próxima
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ECRÃ 3: CLIENTES */}
          {currentView === "clientes" && hasAccess("clientes") && (
            <div className="w-full mx-auto animate-in fade-in duration-500 pb-20">
              <div className="flex justify-between items-center mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
                    <Users size={28} className="mr-3 text-emerald-500" /> Gestão
                    de Clientes
                  </h2>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 mb-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm transition-colors duration-200">
                <div className="flex gap-2 w-full md:w-auto">
                  <button
                    onClick={() => abrirModalAddEdit()}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-sm font-bold flex items-center shadow-md transition-colors"
                  >
                    <Plus size={16} className="mr-2" /> Adicionar
                  </button>
                  <div className="relative group">
                    <label className="cursor-pointer bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-white px-4 py-2 rounded text-sm font-bold flex items-center transition-colors border border-slate-300 dark:border-slate-600">
                      <Download size={16} className="mr-2" /> Importar
                      <input
                        type="file"
                        accept=".xlsx, .csv"
                        className="hidden"
                        onChange={importarClientes}
                      />
                    </label>
                  </div>
                  {selectedClientes.length > 0 && (
                    <button
                      onClick={apagarClientesSelecionados}
                      className="bg-rose-500 hover:bg-rose-400 text-white px-4 py-2 rounded text-sm font-bold flex items-center shadow-md transition-colors animate-in fade-in zoom-in duration-200"
                    >
                      <Trash2 size={16} className="mr-2" /> Eliminar (
                      {selectedClientes.length})
                    </button>
                  )}
                </div>
                <div className="flex w-full md:w-auto relative">
                  <div className="relative w-full md:w-64">
                    <Search
                      size={16}
                      className="absolute left-3 top-2.5 text-slate-400 z-10"
                    />
                    <input
                      type="text"
                      value={filtroNomeCliente}
                      onChange={(e) => {
                        setFiltroNomeCliente(e.target.value);
                        setShowMainClienteSuggestions(true);
                      }}
                      onFocus={() => setShowMainClienteSuggestions(true)}
                      onBlur={() =>
                        setTimeout(
                          () => setShowMainClienteSuggestions(false),
                          200,
                        )
                      }
                      placeholder="Buscar por Nome ou NIF..."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:border-emerald-500 outline-none transition-colors duration-200"
                    />
                  </div>
                  {showMainClienteSuggestions && filtroNomeCliente && (
                    <ul className="absolute right-0 top-full mt-1 w-full md:w-64 z-50 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg max-h-60 overflow-y-auto shadow-xl">
                      {clientes
                        .filter(
                          (c) =>
                            c.nome
                              .toLowerCase()
                              .includes(filtroNomeCliente.toLowerCase()) ||
                            (c.documento &&
                              c.documento.includes(filtroNomeCliente)),
                        )
                        .map((c) => (
                          <li
                            key={c.id}
                            className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 last:border-0"
                            onMouseDown={() => {
                              setFiltroNomeCliente(c.nome);
                              setShowMainClienteSuggestions(false);
                            }}
                          >
                            <div className="font-bold">{c.nome}</div>
                            {c.documento && (
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {c.documento}
                              </div>
                            )}
                          </li>
                        ))}
                      {clientes.filter(
                        (c) =>
                          c.nome
                            .toLowerCase()
                            .includes(filtroNomeCliente.toLowerCase()) ||
                          (c.documento &&
                            c.documento.includes(filtroNomeCliente)),
                      ).length === 0 && (
                        <li className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm italic text-center">
                          Nenhum cliente encontrado
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-x-auto transition-colors duration-200">
                <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                  <thead>
                    <tr className="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750/50 transition-colors duration-200">
                      <th className="py-3 px-4 w-10">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:checked:bg-blue-600"
                          checked={isAllClientesSelected}
                          onChange={toggleAllClientes}
                          disabled={currentClientes.length === 0}
                        />
                      </th>
                      {cols.codigo && (
                        <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                          Código
                        </th>
                      )}
                      {cols.nome && (
                        <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                          Nome
                        </th>
                      )}
                      {cols.tipo && (
                        <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                          Tipo
                        </th>
                      )}
                      {cols.documento && (
                        <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                          Documento
                        </th>
                      )}
                      {cols.operadora && (
                        <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                          Op. | Seg.
                        </th>
                      )}
                      {cols.servico && (
                        <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                          Serviço
                        </th>
                      )}
                      {cols.telefone && (
                        <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                          Telefone
                        </th>
                      )}
                      {cols.email && (
                        <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                          E-mail
                        </th>
                      )}
                      {cols.situacao && (
                        <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-center">
                          Situação
                        </th>
                      )}
                      {cols.acoes && (
                        <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-center">
                          Ações
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {currentClientes.length === 0 ? (
                      <tr>
                        <td
                          colSpan="11"
                          className="py-8 text-center text-slate-500 italic"
                        >
                          Nenhum cliente encontrado com os filtros atuais.
                        </td>
                      </tr>
                    ) : (
                      currentClientes.map((cli) => (
                        <tr
                          key={cli.id}
                          className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-750/50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:checked:bg-blue-600"
                              checked={selectedClientes.includes(cli.id)}
                              onChange={() => toggleClienteSelection(cli.id)}
                            />
                          </td>
                          {cols.codigo && (
                            <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                              {cli.codigo || "-"}
                            </td>
                          )}
                          {cols.nome && (
                            <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                              {cli.nome}
                            </td>
                          )}
                          {cols.tipo && (
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                              {cli.tipo}
                            </td>
                          )}
                          {cols.documento && (
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                              {cli.documento || "-"}
                            </td>
                          )}
                          {cols.operadora && (
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                              {cli.operadora || "-"}
                            </td>
                          )}
                          {cols.servico && (
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                              {cli.servico || "-"}
                            </td>
                          )}
                          {cols.telefone && (
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                              {cli.telefone || "-"}
                            </td>
                          )}
                          {cols.email && (
                            <td className="py-3 px-4 text-sky-600 dark:text-sky-400">
                              {cli.email || "-"}
                            </td>
                          )}
                          {cols.situacao && (
                            <td className="py-3 px-4 text-center">
                              {cli.situacao ? (
                                <CheckCircle
                                  size={18}
                                  className="text-emerald-500 mx-auto"
                                />
                              ) : (
                                <XCircle
                                  size={18}
                                  className="text-rose-500 mx-auto"
                                />
                              )}
                            </td>
                          )}
                          {cols.acoes && (
                            <td className="py-3 px-4">
                              <div className="flex gap-2 justify-center">
                                <button
                                  onClick={() => abrirModalViewCliente(cli)}
                                  className="text-blue-500 dark:text-blue-400 hover:text-blue-600 bg-blue-100 dark:bg-blue-400/10 p-1.5 rounded transition-colors"
                                  title="Visualizar Cliente"
                                >
                                  <Eye size={16} />
                                </button>
                                <button
                                  onClick={() => abrirModalAddEdit(cli)}
                                  className="text-amber-500 dark:text-amber-400 hover:text-amber-600 bg-amber-100 dark:bg-amber-400/10 p-1.5 rounded transition-colors"
                                  title="Editar Cliente"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => apagarCliente(cli.id)}
                                  className="text-rose-500 dark:text-rose-400 hover:text-rose-600 bg-rose-100 dark:bg-rose-400/10 p-1.5 rounded transition-colors"
                                  title="Apagar Cliente"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {clientesFiltrados.length > 0 && (
                <div className="mt-4 flex flex-col md:flex-row items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm gap-4">
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                    A mostrar {indexOfFirstCliente + 1} a{" "}
                    {Math.min(indexOfLastCliente, clientesFiltrados.length)} de{" "}
                    {clientesFiltrados.length} clientes
                  </span>
                  <div className="flex flex-wrap flex-col md:flex-row gap-4 items-center justify-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        Mostrar:
                      </span>
                      <select
                        value={clientesPerPage}
                        onChange={(e) => {
                          const val =
                            e.target.value === "Todos"
                              ? "Todos"
                              : Number(e.target.value);
                          setClientesPerPage(val);
                          setClientesCurrentPage(1);
                        }}
                        className="bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white text-sm rounded-lg py-1 px-2 focus:border-emerald-500"
                      >
                        <option value={20}>20</option>
                        <option value={40}>40</option>
                        <option value={60}>60</option>
                        <option value="Todos">Todos</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (isAllClientesSelected) {
                            setSelectedClientes([]);
                          } else {
                            setSelectedClientes(
                              currentClientes.map((c) => c.id),
                            );
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-800/40 transition-colors border border-sky-200 dark:border-sky-800/50"
                      >
                        {isAllClientesSelected
                          ? "Desmarcar Todos"
                          : "Marcar Todos (Visíveis)"}
                      </button>
                    </div>
                    {totalPagesClientes > 1 && (
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setClientesCurrentPage((p) => Math.max(1, p - 1))
                          }
                          disabled={clientesCurrentPage === 1}
                          className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium text-sm"
                        >
                          Anterior
                        </button>
                        <span className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg font-bold text-sm border border-blue-200 dark:border-blue-800/50 flex items-center">
                          {clientesCurrentPage} / {totalPagesClientes}
                        </span>
                        <button
                          onClick={() =>
                            setClientesCurrentPage((p) =>
                              Math.min(totalPagesClientes, p + 1),
                            )
                          }
                          disabled={clientesCurrentPage === totalPagesClientes}
                          className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium text-sm"
                        >
                          Próxima
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ECRÃ 4: PROCESSAR RELATÓRIOS */}
          {currentView === "processar" && hasAccess("processar") && (
            <div className="max-w-full mx-auto animate-in fade-in duration-500 pb-20">
              <header className="mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
                  <FileCheck size={28} className="mr-3 text-sky-500" />{" "}
                  Relatórios de Comissão
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  Geração e edição de relatórios.
                </p>
              </header>
              {successMsg && (
                <div className="mb-4 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 p-3 rounded-lg text-center font-bold">
                  {successMsg}
                </div>
              )}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 transition-colors duration-200">
                <div className="shrink-0 w-full xl:w-auto">
                  <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 whitespace-nowrap">
                    Selecionar Extrato
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    O sistema extrairá automaticamente.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 justify-start xl:justify-end w-full">
                  <button
                    onClick={() => setModalArquivosOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-4 rounded font-bold flex items-center shadow transition-colors text-sm h-[38px]"
                  >
                    <Database size={16} className="mr-2" /> Buscar
                  </button>
                  <button
                    onClick={iniciarRelatorioManual}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-4 rounded font-bold flex items-center shadow transition-colors text-sm h-[38px]"
                  >
                    <FilePlus size={16} className="mr-2" /> Novo
                  </button>
                  <button
                    onClick={addManualRow}
                    className="bg-amber-500 hover:bg-amber-400 text-white py-2 px-4 rounded font-bold flex items-center shadow transition-colors text-sm h-[38px]"
                  >
                    <Plus size={16} className="mr-2" /> Linha
                  </button>

                  {pdfData.length > 0 && (
                    <React.Fragment>
                      {pdfData.some((r) => r.selected) && (
                        <React.Fragment>
                          <button
                            onClick={prepararEmissaoNfLote}
                            className="bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded font-bold flex items-center shadow transition-colors text-sm h-[38px]"
                          >
                            <Receipt size={16} className="mr-2" /> Gerar NF
                          </button>
                          <button
                            onClick={deleteSelectedRows}
                            className="bg-rose-500 hover:bg-rose-400 text-white py-2 px-4 rounded font-bold flex items-center shadow transition-colors text-sm h-[38px]"
                          >
                            <Trash2 size={16} className="mr-2" /> Apagar Seleção
                          </button>
                        </React.Fragment>
                      )}
                      <button
                        onClick={() => setModalPrintOpen(true)}
                        className="bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/50 py-2 px-4 rounded font-bold flex items-center transition-colors text-sm h-[38px] shadow-sm tracking-tight"
                      >
                        <Printer size={16} className="mr-2" /> Imprimir
                        Relatório
                      </button>
                    </React.Fragment>
                  )}
                </div>
              </div>
              {pdfData.length > 0 && (
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md mb-6 flex flex-col md:flex-row gap-4 items-end transition-colors duration-200 no-print">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Nome do Relatório
                    </label>
                    <input
                      type="text"
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                      placeholder="Ex: Comissões - Fev/2026"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none text-slate-900 dark:text-white transition-colors"
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Período de Referência
                    </label>
                    <input
                      type="text"
                      value={reportPeriod}
                      onChange={(e) => setReportPeriod(e.target.value)}
                      placeholder="Ex: 01/02/2026 à 28/02/2026"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none text-slate-900 dark:text-white transition-colors"
                    />
                  </div>
                  <div className="relative report-cols-menu">
                    <button
                      onClick={() =>
                        setShowReportColsMenu(!showReportColsMenu)
                      }
                      className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 h-[38px] px-3 py-2 rounded font-bold flex items-center transition-colors shadow-sm"
                      title="Colunas"
                    >
                      <Layers size={18} />
                    </button>
                    {showReportColsMenu && (
                      <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg overflow-hidden text-sm z-50 animate-in fade-in slide-in-from-top-2 p-3">
                        <div className="flex justify-between items-center mb-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            Visibilidade das Colunas
                          </span>
                        </div>
                        <div className="flex gap-2 mb-3">
                          <button
                            onClick={() => setAllReportCols(true)}
                            className="flex-1 text-xs py-1 px-2 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                          >
                            Marcar Todas
                          </button>
                          <button
                            onClick={() => setAllReportCols(false)}
                            className="flex-1 text-xs py-1 px-2 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                          >
                            Desmarcar
                          </button>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1 text-left">
                          {Object.keys(printColLabels).map((key) => (
                            <label
                              key={key}
                              className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded"
                            >
                              <input
                                type="checkbox"
                                checked={reportTableCols[key]}
                                onChange={() => toggleReportCol(key)}
                                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                              />
                              <span className="text-slate-700 dark:text-slate-300">
                                {printColLabels[key]}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {(() => {
                    const nfSet = Array.from(
                      new Set(
                        (pdfData || [])
                          .map((d) => String(d.notaFiscal))
                          .filter(Boolean),
                      ),
                    );
                    const opSet = Array.from(
                      new Set(
                        (pdfData || [])
                          .map(
                            (d) =>
                              String(d.codigoOperadora || d.codOperadora),
                          )
                          .filter(Boolean),
                      ),
                    );
                    let matchingExtrato = null;
                    if (nfSet.length > 0) {
                      matchingExtrato = dbReports.find(
                        (ext) =>
                          ext.notaFiscal &&
                          nfSet.includes(String(ext.notaFiscal)) &&
                          ((ext.codigoOperadora &&
                            opSet.includes(String(ext.codigoOperadora))) ||
                            (ext.codOperadora &&
                              opSet.includes(String(ext.codOperadora)))),
                      );
                    }
                    if (!matchingExtrato && nfSet.length > 0) {
                      matchingExtrato = dbReports.find(
                        (ext) =>
                          ext.notaFiscal &&
                          nfSet.includes(String(ext.notaFiscal)),
                      );
                    }
                    if (!matchingExtrato) {
                      matchingExtrato = dbReports.find(
                        (ext) =>
                          ext.parceiro === reportName ||
                          (reportName &&
                            ext.fileName &&
                            reportName.includes(ext.fileName.split(".")[0])),
                      );
                    }

                    if (matchingExtrato) {
                      return (
                        <button
                          onClick={() => {
                            const pathTarget =
                              matchingExtrato.filePath ||
                              matchingExtrato.fileName;
                            if (!pathTarget) {
                              showAlert(
                                "Caminho do ficheiro original ausente.",
                              );
                              return;
                            }
                            setLoading(true);
                            setLoadingMsg("A descarregar ficheiro...");
                            supabase.storage
                              .from("arquivos_extratos")
                              .download(pathTarget)
                              .then(({ data, error }) => {
                                setLoading(false);
                                if (error || !data) {
                                  showAlert(
                                    "Ficheiro não encontrado na base de dados cloud.",
                                  );
                                } else {
                                  const url = URL.createObjectURL(data);
                                  window.open(url, "_blank");
                                  setTimeout(
                                    () => URL.revokeObjectURL(url),
                                    1000,
                                  );
                                }
                              });
                          }}
                          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 py-2 px-6 rounded font-bold flex items-center transition-colors h-[38px] shadow"
                          title="Abrir Extrato de Referência"
                        >
                          <FileText size={16} className="mr-2" /> Abrir
                          Extrato
                        </button>
                      );
                    }
                    return null;
                  })()}
                  <button
                    onClick={salvarRelatorioComissao}
                    className="bg-blue-600 hover:bg-blue-500 text-white py-2 px-6 rounded font-bold flex items-center transition-colors h-[38px] shadow"
                  >
                    <Save size={16} className="mr-2" />{" "}
                    {currentReportId ? "Atualizar Salvo" : "Salvar Registo"}
                  </button>
                </div>
              )}

              {pdfData.length > 0 && (() => {
                const totalVendasValor = pdfData.reduce((acc, l) => acc + (Number(l.valorTotal || l.valor) || 0), 0);
                const totalComissao = pdfData.reduce((acc, l) => acc + (Number(l.comissao) || 0), 0);
                const totalVidas = pdfData.reduce((acc, l) => acc + (Number(l.vidas) || 0), 0);
                const ticketMedio = pdfData.length > 0 ? totalVendasValor / pdfData.length : 0;

                return (
                  <div className="grid grid-cols-1 gap-4 mb-6 no-print">
                    {/* Faturamento Total desativado
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm flex flex-col justify-center transition-colors duration-200">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Faturamento Total</span>
                      <span className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white">{formatarMoeda(totalVendasValor)}</span>
                    </div>
                    */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm flex flex-col justify-center transition-colors duration-200">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Comissão</span>
                      <span className="text-xl md:text-2xl font-extrabold text-sky-600 dark:text-sky-400">{formatarMoeda(totalComissao)}</span>
                    </div>
                    {/* Ticket Médio desativado
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm flex flex-col justify-center transition-colors duration-200">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Ticket Médio</span>
                      <span className="text-xl md:text-2xl font-extrabold text-slate-600 dark:text-slate-300">{formatarMoeda(ticketMedio)}</span>
                    </div>
                    */}
                  </div>
                );
              })()}

              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-x-auto transition-colors duration-200 w-full">
                <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-slate-600 dark:text-slate-300 transition-colors duration-200 align-middle">
                      <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700 text-center w-10">
                        <input
                          type="checkbox"
                          checked={
                            pdfData.length > 0 &&
                            pdfData.every((r) => r.selected)
                          }
                          onChange={toggleSelectAll}
                          className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                          title="Marcar/Desmarcar Todos"
                        />
                      </th>
                      {reportTableCols.cod && (
                        <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700 text-xs text-center">
                          Cód.
                        </th>
                      )}
                      {reportTableCols.contrato && (
                        <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400">
                          Contrato
                        </th>
                      )}
                      {reportTableCols.op && (
                        <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400">
                          Op. | Seg.
                        </th>
                      )}
                      {reportTableCols.vidas && (
                        <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700 text-center text-indigo-600 dark:text-indigo-400">
                          Vidas
                        </th>
                      )}
                      {reportTableCols.cliente && (
                        <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700">
                          Cliente
                        </th>
                      )}
                      {reportTableCols.data && (
                        <th className="py-2 px-2 border-r border-slate-200 dark:border-slate-700 text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <span className="font-bold">Data</span>
                            <div className="flex items-center gap-1 font-normal">
                              <input
                                type="date"
                                value={globalDateInput}
                                onChange={(e) =>
                                  setGlobalDateInput(e.target.value)
                                }
                                className="text-[10px] text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 outline-none no-print w-[90px]"
                              />
                              <button
                                className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] px-2 py-1 rounded focus:outline-none transition-colors"
                                onClick={() => {
                                  if (!globalDateInput) return;
                                  showConfirm(
                                    `Deseja alterar a data de TODAS as linhas para ${globalDateInput.split("-").reverse().join("/")}?`,
                                    () => {
                                      setPdfData((prev) =>
                                        prev.map((l) => {
                                          const calcParcela =
                                            calcularParcelaDaVigencia(
                                              l.inicioVigencia,
                                              globalDateInput,
                                            );
                                          return {
                                            ...l,
                                            data: globalDateInput,
                                            parcela: calcParcela || l.parcela,
                                          };
                                        }),
                                      );
                                      setReportName(
                                        `Relatório ${globalDateInput.split("-").reverse().join("/")}`,
                                      );
                                    },
                                  );
                                }}
                                title="Preencher data nas linhas selecionadas"
                              >
                                OK
                              </button>
                            </div>
                          </div>
                        </th>
                      )}
                      {reportTableCols.loja && (
                        <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700 text-center">
                          Loja
                        </th>
                      )}
                      {reportTableCols.servico && (
                        <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700 text-center">
                          Serviço
                        </th>
                      )}
                      {reportTableCols.desconto && (
                        <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700 text-center text-rose-600 dark:text-rose-400">
                          Desc.
                        </th>
                      )}
                      {reportTableCols.corretor && (
                        <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700 text-center text-indigo-600 dark:text-indigo-400">
                          Corretor
                        </th>
                      )}
                      {reportTableCols.parc && (
                        <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700 text-center text-indigo-600 dark:text-indigo-400">
                          Parc.
                        </th>
                      )}
                      {reportTableCols.inicioVig && (
                        <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700 text-center text-indigo-600 dark:text-indigo-400">
                          Início Vig.
                        </th>
                      )}
                      {reportTableCols.nfe && (
                        <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700 text-center text-purple-600 dark:text-purple-400">
                          NF-e
                        </th>
                      )}
                      {reportTableCols.vitalicio && (
                        <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700 text-center text-purple-600 dark:text-purple-400">
                          Vitalício
                        </th>
                      )}
                      {reportTableCols.pagamento && (
                        <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700 text-center text-indigo-600 dark:text-indigo-400">
                          Pagamento
                        </th>
                      )}
                      {reportTableCols.valorTotal && (
                        <th className="py-2 px-2 font-bold border-r border-slate-200 dark:border-slate-700 text-right text-emerald-600 dark:text-emerald-400">
                          Valor total
                        </th>
                      )}
                      {reportTableCols.comissaoPorcentagem && (
                        <th className="py-2 px-2 font-bold text-center text-sky-600 dark:text-sky-400 !resize-none">
                          %
                        </th>
                      )}
                      {reportTableCols.comissao && (
                        <th className="py-2 px-2 font-bold text-right text-emerald-600 dark:text-emerald-400">
                          Comissão
                        </th>
                      )}
                      <th className="py-2 px-2 font-bold text-center w-28">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pdfData.length === 0 ? (
                      <tr>
                        <td
                          colSpan={
                            Object.values(reportTableCols).filter(Boolean)
                              .length + 2
                          }
                          className="py-8 text-center text-slate-500 italic"
                        >
                          Nenhum dado extraído ainda. Importe o PDF.
                        </td>
                      </tr>
                    ) : (
                      pdfData.map((linha, idx) =>
                        editRowIndex === idx ? (
                          <tr
                            key={idx}
                            className="border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 transition-colors"
                          >
                            <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700 text-center">
                              <input
                                type="checkbox"
                                checked={linha.selected}
                                onChange={() => toggleSelectRow(idx)}
                                className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                              />
                            </td>
                            {reportTableCols.cod && (
                              <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700">
                                <input
                                  type="text"
                                  value={editRowData.cod || ""}
                                  onChange={(e) =>
                                    setEditRowData({
                                      ...editRowData,
                                      cod: e.target.value,
                                    })
                                  }
                                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-[10px] text-slate-900 dark:text-white outline-none focus:border-indigo-500 w-16 text-center"
                                  placeholder="Cód. Op."
                                />
                              </td>
                            )}
                            {reportTableCols.contrato && (
                              <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700">
                                <input
                                  type="text"
                                  value={editRowData.contrato}
                                  onChange={(e) =>
                                    setEditRowData({
                                      ...editRowData,
                                      contrato: e.target.value,
                                    })
                                  }
                                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 w-16"
                                  placeholder="Contrato"
                                />
                              </td>
                            )}
                            {reportTableCols.op && (
                              <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700">
                                <input
                                  type="text"
                                  value={editRowData.codigoOperadora}
                                  onChange={(e) =>
                                    setEditRowData({
                                      ...editRowData,
                                      codigoOperadora: e.target.value,
                                    })
                                  }
                                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 w-12 text-center"
                                  placeholder={currentReportOperadora || "AMIL"}
                                />
                              </td>
                            )}
                            {reportTableCols.vidas && (
                              <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700">
                                <input
                                  type="number"
                                  value={editRowData.vidas}
                                  onChange={(e) =>
                                    setEditRowData({
                                      ...editRowData,
                                      vidas: e.target.value,
                                    })
                                  }
                                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-center w-8"
                                  placeholder="1"
                                />
                              </td>
                            )}
                            {reportTableCols.cliente && (
                              <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700">
                                <input
                                  type="text"
                                  value={editRowData.cliente}
                                  onChange={(e) =>
                                    setEditRowData({
                                      ...editRowData,
                                      cliente: e.target.value,
                                    })
                                  }
                                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 min-w-[120px]"
                                />
                              </td>
                            )}
                            {reportTableCols.data && (
                              <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700">
                                <input
                                  type="text"
                                  value={editRowData.data}
                                  onChange={(e) => {
                                    const novaData = e.target.value;
                                    const calcParcela =
                                      calcularParcelaDaVigencia(
                                        editRowData.inicioVigencia,
                                        novaData,
                                      );
                                    setEditRowData({
                                      ...editRowData,
                                      data: novaData,
                                      parcela:
                                        calcParcela || editRowData.parcela,
                                    });
                                  }}
                                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 text-center w-14"
                                />
                              </td>
                            )}
                            {reportTableCols.loja && (
                              <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700">
                                <input
                                  type="text"
                                  value={editRowData.loja}
                                  onChange={(e) =>
                                    setEditRowData({
                                      ...editRowData,
                                      loja: e.target.value,
                                    })
                                  }
                                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 text-center w-16"
                                />
                              </td>
                            )}
                            {reportTableCols.servico && (
                              <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700">
                                <select
                                  value={editRowData.servico || ""}
                                  onChange={(e) =>
                                    setEditRowData({
                                      ...editRowData,
                                      servico: e.target.value,
                                    })
                                  }
                                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-[11px] text-slate-900 dark:text-white outline-none focus:border-amber-500 min-w-[100px]"
                                >
                                  <option value=""></option>
                                  <option>Plano de Saúde</option>
                                  <option>Plano Dental</option>
                                  <option>Seguro</option>
                                  <option>Bonificação</option>
                                </select>
                              </td>
                            )}
                            {reportTableCols.desconto && (
                              <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700">
                                <input
                                  type="text"
                                  value={editRowData.desconto || ""}
                                  onChange={(e) => {
                                    let rawDesconto = e.target.value;
                                    let baseVal = editRowData.comissaoBase || 0;
                                    let descValue = 0;
                                    if (rawDesconto.includes("%")) {
                                      let pct = parseFloat(
                                        rawDesconto
                                          .replace("%", "")
                                          .replace(",", "."),
                                      );
                                      if (!isNaN(pct))
                                        descValue = baseVal * (pct / 100);
                                    } else {
                                      descValue =
                                        parseFloat(
                                          rawDesconto.replace(",", "."),
                                        ) || 0;
                                    }
                                    setEditRowData({
                                      ...editRowData,
                                      desconto: rawDesconto,
                                      comissao: Number(
                                        (baseVal - descValue).toFixed(2),
                                      ),
                                    });
                                  }}
                                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-[11px] text-slate-900 dark:text-white outline-none focus:border-amber-500 w-12 text-center"
                                  placeholder="R$ ou %"
                                />
                              </td>
                            )}
                            {reportTableCols.corretor && (
                              <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700">
                                <select
                                  value={editRowData.vendedor || nomeEmpresa}
                                  onChange={(e) =>
                                    setEditRowData({
                                      ...editRowData,
                                      vendedor: e.target.value,
                                    })
                                  }
                                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-[11px] text-slate-900 dark:text-white outline-none focus:border-indigo-500 min-w-[80px]"
                                >
                                  <option>{nomeEmpresa}</option>
                                  <option>Proper</option>
                                  <option>Assessoria</option>
                                  <option>Corretor Interno</option>
                                </select>
                              </td>
                            )}
                            {reportTableCols.parc && (
                              <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700">
                                <input
                                  type="text"
                                  value={editRowData.parcela}
                                  onChange={(e) =>
                                    setEditRowData({
                                      ...editRowData,
                                      parcela: e.target.value,
                                    })
                                  }
                                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-center w-8"
                                  placeholder="1"
                                />
                              </td>
                            )}
                            {reportTableCols.inicioVig && (
                              <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700">
                                <input
                                  type="date"
                                  value={editRowData.inicioVigencia || ""}
                                  onChange={(e) => {
                                    const novaVig = e.target.value;
                                    const calcParcela =
                                      calcularParcelaDaVigencia(
                                        novaVig,
                                        editRowData.data,
                                      );
                                    setEditRowData({
                                      ...editRowData,
                                      inicioVigencia: novaVig,
                                      parcela:
                                        calcParcela || editRowData.parcela,
                                    });
                                  }}
                                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-[10px] text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-center w-24"
                                />
                              </td>
                            )}
                            {reportTableCols.nfe && (
                              <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700">
                                <input
                                  type="text"
                                  value={editRowData.notaFiscal || ""}
                                  onChange={(e) =>
                                    setEditRowData({
                                      ...editRowData,
                                      notaFiscal: e.target.value,
                                    })
                                  }
                                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-xs text-slate-900 dark:text-white outline-none focus:border-rose-500 text-center font-bold text-rose-600 dark:text-rose-400 w-16"
                                  placeholder="Nº NF"
                                />
                              </td>
                            )}
                            {reportTableCols.vitalicio && (
                              <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700">
                                <select
                                  value={editRowData.vitalicio || ""}
                                  onChange={(e) =>
                                    setEditRowData({
                                      ...editRowData,
                                      vitalicio: e.target.value,
                                    })
                                  }
                                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-[11px] text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                                >
                                  <option value=""></option>
                                  <option>Sim</option>
                                  <option>Não</option>
                                </select>
                              </td>
                            )}
                            {reportTableCols.pagamento && (
                              <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700">
                                <select
                                  value={editRowData.formaPagamento || ""}
                                  onChange={(e) =>
                                    setEditRowData({
                                      ...editRowData,
                                      formaPagamento: e.target.value,
                                    })
                                  }
                                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-[11px] text-slate-900 dark:text-white outline-none focus:border-indigo-500 min-w-[90px]"
                                >
                                  <option value=""></option>
                                  <option>Crédito em conta</option>
                                  <option>Dinheiro à vista</option>
                                </select>
                              </td>
                            )}
                            {reportTableCols.valorTotal && (
                              <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editRowData.valorTotal}
                                  onChange={(e) => {
                                    const newVal = e.target.value;
                                    const t = parseFloat(newVal) || 0;
                                    const c =
                                      parseFloat(editRowData.comissao) || 0;
                                    let newPct =
                                      editRowData.comissaoPorcentagem;
                                    if (t > 0 && c > 0) {
                                      newPct = Math.round((c / t) * 100);
                                    } else {
                                      newPct = "";
                                    }
                                    setEditRowData({
                                      ...editRowData,
                                      valorTotal: newVal,
                                      comissaoPorcentagem: newPct,
                                    });
                                  }}
                                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500 text-right w-16"
                                />
                              </td>
                            )}
                            {reportTableCols.comissaoPorcentagem && (
                              <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editRowData.comissaoPorcentagem || ""}
                                  onChange={(e) => {
                                    const rawVal = e.target.value;
                                    const pct = parseFloat(rawVal);
                                    const t =
                                      parseFloat(editRowData.valorTotal) || 0;
                                    let newComissao = editRowData.comissao;
                                    if (!isNaN(pct) && t > 0) {
                                      newComissao = Number(
                                        (t * (pct / 100)).toFixed(2),
                                      );
                                    }
                                    setEditRowData({
                                      ...editRowData,
                                      comissaoPorcentagem: rawVal,
                                      comissao: newComissao,
                                    });
                                  }}
                                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-xs text-slate-900 dark:text-white outline-none focus:border-sky-500 text-center w-12"
                                  placeholder="%"
                                />
                              </td>
                            )}
                            {reportTableCols.comissao && (
                              <td className="py-1 px-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editRowData.comissao}
                                  onChange={(e) => {
                                    const rawVal = e.target.value;
                                    const numVal = parseFloat(rawVal) || 0;
                                    let rawDesconto = String(
                                      editRowData.desconto || "",
                                    );
                                    let descValue = 0;
                                    let newBase = numVal;
                                    if (rawDesconto.includes("%")) {
                                      let pct = parseFloat(
                                        rawDesconto
                                          .replace("%", "")
                                          .replace(",", "."),
                                      );
                                      if (!isNaN(pct) && pct !== 100) {
                                        newBase = numVal / (1 - pct / 100);
                                      }
                                    } else {
                                      descValue =
                                        parseFloat(
                                          rawDesconto.replace(",", "."),
                                        ) || 0;
                                      newBase = numVal + descValue;
                                    }
                                    let newPct =
                                      editRowData.comissaoPorcentagem;
                                    const t =
                                      parseFloat(editRowData.valorTotal) || 0;
                                    if (t > 0 && numVal > 0) {
                                      newPct = Math.round((numVal / t) * 100);
                                    } else {
                                      newPct = "";
                                    }
                                    setEditRowData({
                                      ...editRowData,
                                      comissao: rawVal,
                                      comissaoBase: newBase,
                                      comissaoPorcentagem: newPct,
                                    });
                                  }}
                                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-xs text-slate-900 dark:text-white outline-none focus:border-sky-500 text-right w-16"
                                />
                              </td>
                            )}
                            <td className="py-1 px-1 text-center no-print">
                              <div className="flex gap-1 justify-center">
                                <button
                                  onClick={saveRowEdit}
                                  className="text-emerald-500 hover:text-emerald-400 p-1"
                                  title="Guardar Edição"
                                >
                                  <CheckCircle size={16} />
                                </button>
                                <button
                                  onClick={cancelRowEdit}
                                  className="text-rose-500 hover:text-rose-400 p-1"
                                  title="Cancelar Edição"
                                >
                                  <XCircle size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <tr
                            key={idx}
                            className={
                              linha.selected
                                ? "border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-750/30"
                                : "border-b border-slate-100 dark:border-slate-700/50 bg-slate-200/50 dark:bg-slate-800/50 opacity-50 grayscale transition-all"
                            }
                          >
                            <td className="py-1 px-1 border-r border-slate-200 dark:border-slate-700 text-center">
                              <input
                                type="checkbox"
                                checked={linha.selected}
                                onChange={() => toggleSelectRow(idx)}
                                className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                              />
                            </td>
                            {reportTableCols.cod && (
                              <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[10px] text-center">
                                {linha.cod || "-"}
                              </td>
                            )}
                            {reportTableCols.contrato && (
                              <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                                {linha.contrato || "-"}
                              </td>
                            )}
                            {reportTableCols.op && (
                              <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 font-medium text-slate-600 dark:text-slate-300 text-center text-xs">
                                {linha.codigoOperadora ||
                                  currentReportOperadora ||
                                  "AMIL"}
                              </td>
                            )}
                            {reportTableCols.vidas && (
                              <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 text-center font-bold text-slate-700 dark:text-slate-300 text-xs">
                                {linha.vidas || "-"}
                              </td>
                            )}
                            {reportTableCols.cliente && (
                              <td
                                className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs truncate max-w-[150px]"
                                title={linha.cliente}
                              >
                                {linha.cliente}
                              </td>
                            )}
                            {reportTableCols.data && (
                              <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 text-center text-slate-500 dark:text-slate-400 text-[11px]">
                                {linha.data
                                  ? formatarDataVisivel(linha.data)
                                  : ""}
                              </td>
                            )}
                            {reportTableCols.loja && (
                              <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 text-center text-slate-500 dark:text-slate-400 text-xs">
                                {linha.loja}
                              </td>
                            )}
                            {reportTableCols.servico && (
                              <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 text-center font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                                {linha.servico || "-"}
                              </td>
                            )}
                            {reportTableCols.desconto && (
                              <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 text-center font-bold text-rose-500 dark:text-rose-400 text-[11px]">
                                {linha.desconto || "-"}
                              </td>
                            )}
                            {reportTableCols.corretor && (
                              <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 text-center font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                                {linha.vendedor || "-"}
                              </td>
                            )}
                            {reportTableCols.parc && (
                              <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 text-center font-bold text-slate-700 dark:text-slate-300 text-xs">
                                {linha.parcela || "-"}
                              </td>
                            )}
                            {reportTableCols.inicioVig && (
                              <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 text-center font-medium text-slate-700 dark:text-slate-300 text-[10px]">
                                {linha.inicioVigencia
                                  ? formatarDataVisivel(linha.inicioVigencia)
                                  : "--/--/----"}
                              </td>
                            )}
                            {reportTableCols.nfe && (
                              <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 text-center font-bold text-rose-600 dark:text-rose-400 text-[11px]">
                                {linha.notaFiscal || "-"}
                              </td>
                            )}
                            {reportTableCols.vitalicio && (
                              <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 text-center font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                                {linha.vitalicio || "-"}
                              </td>
                            )}
                            {reportTableCols.pagamento && (
                              <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 text-center font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                                {linha.formaPagamento || "-"}
                              </td>
                            )}
                            {reportTableCols.valorTotal && (
                              <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 text-right font-medium text-slate-700 dark:text-slate-300 text-xs">
                                {formatarMoeda(linha.valorTotal)}
                              </td>
                            )}
                            {reportTableCols.comissaoPorcentagem && (
                              <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-700 text-center font-bold text-sky-600 dark:text-sky-400 text-[11px]">
                                {linha.comissaoPorcentagem
                                  ? `${linha.comissaoPorcentagem}%`
                                  : "-"}
                              </td>
                            )}
                            {reportTableCols.comissao && (
                              <td className="py-1 px-2 text-right font-bold text-sky-600 dark:text-sky-400 text-xs">
                                {formatarMoeda(linha.comissao)}
                              </td>
                            )}
                            <td className="py-1 px-1 text-center no-print">
                              <div className="flex gap-1 justify-center">
                                <button
                                  onClick={() =>
                                    duplicateRowInReport(idx, linha)
                                  }
                                  className="text-blue-500 hover:text-blue-400 p-1 transition-colors"
                                  title="Duplicar Linha"
                                >
                                  <Copy size={14} />
                                </button>
                                <button
                                  onClick={() => startEditingRow(idx, linha)}
                                  className="text-amber-500 hover:text-amber-400 p-1 transition-colors"
                                  title="Editar Linha"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={() => deleteRowFromReport(idx)}
                                  className="text-rose-500 hover:text-rose-400 p-1 transition-colors"
                                  title="Apagar Linha"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ),
                      )
                    )}
                  </tbody>
                  {pdfData.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-600 transition-colors duration-200">
                        <td
                          colSpan={
                            [
                              "cod",
                              "contrato",
                              "op",
                              "vidas",
                              "cliente",
                              "data",
                              "loja",
                              "servico",
                              "desconto",
                              "corretor",
                              "parc",
                              "inicioVig",
                              "nfe",
                              "vitalicio",
                              "assessoria",
                              "pagamento",
                            ].filter((k) => reportTableCols[k]).length + 1
                          }
                          className="py-3 px-4 font-bold text-right"
                        >
                          TOTAIS APURADOS (Selecionados)
                        </td>
                        {reportTableCols.valorTotal && (
                          <td className="py-3 px-2 text-right font-bold text-emerald-600 dark:text-emerald-400 text-lg">
                            {formatarMoeda(
                              pdfData
                                .filter((r) => r.selected)
                                .reduce(
                                  (acc, l) => acc + (Number(l.valorTotal) || 0),
                                  0,
                                ),
                            )}
                          </td>
                        )}
                        {reportTableCols.comissaoPorcentagem && <td></td>}
                        {reportTableCols.comissao && (
                          <td className="py-3 px-2 text-right font-bold text-sky-600 dark:text-sky-400 text-lg">
                            {formatarMoeda(
                              pdfData
                                .filter((r) => r.selected)
                                .reduce(
                                  (acc, l) => acc + (Number(l.comissao) || 0),
                                  0,
                                ),
                            )}
                          </td>
                        )}
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* Painel de Inconsistências */}
          {showModalInconsistencias && (
            <div className={inconsistenciasReduzido 
              ? "fixed bottom-4 right-4 z-[100] flex items-end justify-end pointer-events-none animate-in slide-in-from-bottom-4 duration-300"
              : "fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            }>
              <div className={inconsistenciasReduzido
                ? "bg-white dark:bg-slate-800 border-2 border-emerald-500 rounded-xl shadow-2xl p-4 w-[540px] max-w-[calc(100vw-2rem)] h-[580px] max-h-[85vh] relative flex flex-col pointer-events-auto"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-6xl relative mx-4 max-h-[90vh] flex flex-col"
              }>
                <button
                  type="button"
                  onClick={() => setShowModalInconsistencias(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors z-10"
                >
                  <X size={24} />
                </button>
                <div className={`${inconsistenciasReduzido ? "mb-2" : "mb-4"} pr-8`}>
                  <div className={`flex flex-col md:flex-row md:items-center justify-between gap-2 ${inconsistenciasReduzido ? "mb-2" : "mb-4"}`}>
                    <h2 className={`${inconsistenciasReduzido ? "text-lg" : "text-2xl"} font-bold font-sans tracking-tight text-slate-800 dark:text-white flex items-center`}>
                      <AlertTriangle className="mr-2 text-orange-500" size={inconsistenciasReduzido ? 20 : 28} /> Painel de Inconsistências
                    </h2>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setInconsistenciasReduzido(!inconsistenciasReduzido)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-bold transition-colors flex items-center shrink-0 text-xs shadow-sm border border-slate-250 dark:border-slate-600"
                        title={inconsistenciasReduzido ? "Maximizar Painel (Tela Cheia)" : "Minimizar Painel (Compacto)"}
                      >
                        {inconsistenciasReduzido ? <Maximize size={14} className="mr-1" /> : <Minimize size={14} className="mr-1" />}
                        {inconsistenciasReduzido ? "Maximizar" : "Minimizar"}
                      </button>
                      <button
                        onClick={async () => {
                          setLoading(true);
                          setLoadingMsg("Atualizando painel...");
                          try {
                            await loadFromDB();
                          } catch (err) {
                            console.error(err);
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={loading}
                        className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg font-bold transition-colors flex items-center disabled:opacity-50 text-xs shadow-sm"
                        title="Atualizar Dados"
                      >
                        <RefreshCw size={14} className={`mr-1 ${loading ? "animate-spin" : ""}`} />
                        Atualizar
                      </button>
                      <button
                        onClick={() => setShowModalInconsistencias(false)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-bold transition-colors text-xs shadow-sm border border-slate-250 dark:border-slate-600"
                      >
                        Voltar
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden shrink-0">
                      <button
                        onClick={() => setInconsistenciasTab("negativos")}
                        className={`px-3 py-1.5 text-xs font-bold transition-colors ${inconsistenciasTab === "negativos" ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}
                      >
                        Valores Negativos
                      </button>
                      <button
                        onClick={() => setInconsistenciasTab("faltantes")}
                        className={`px-3 py-1.5 text-xs font-bold transition-colors ${inconsistenciasTab === "faltantes" ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}
                      >
                        Parcelas Faltantes
                      </button>
                    </div>

                    <div className="flex items-center shrink-0">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mr-1.5 font-sans">Op:</label>
                      <select
                        value={inconsistenciasFiltroOperadora}
                        onChange={(e) => setInconsistenciasFiltroOperadora(e.target.value)}
                        className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-xs focus:outline-none"
                      >
                        <option value="Todas">Todas</option>
                        {Array.from(new Set((getAllVendas() || []).map(v => v.codigoOperadora || "AMIL").filter(Boolean))).sort().map(op => (
                          <option key={op} value={op}>{op}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 ml-auto shrink-0">
                      <button
                        onClick={() => setInconsistenciasStatusFiltragem("pendentes")}
                        className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${inconsistenciasStatusFiltragem === "pendentes" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}
                      >
                        Pendentes
                      </button>
                      <button
                        onClick={() => setInconsistenciasStatusFiltragem("resolvidos")}
                        className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${inconsistenciasStatusFiltragem === "resolvidos" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}
                      >
                        Resolvidas
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead className="bg-slate-100 dark:bg-slate-800/80 sticky top-0 z-10 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 shadow-sm">
                      <tr>
                        <th className="p-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cliente</th>
                        <th className="p-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Operadora</th>
                        <th className="p-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {inconsistenciasTab === "negativos" ? "Valor Inconsistente" : "Faltantes"}
                        </th>
                        <th className="p-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Notas / Detalhes</th>
                        <th className="p-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Status</th>
                        <th className="p-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(() => {
                         const rawVendas = getAllVendas() || [];
                         let rows = [];

                         if (inconsistenciasTab === "negativos") {
                           let inconsistentes = rawVendas.filter(v => {
                             if (!v.valor && v.valor !== 0) return false;
                             const valStr = String(v.valor);
                             if (typeof v.valor === 'number') return v.valor < 0;
                             if (valStr.includes('-') || valStr.includes('(')) {
                               const numVal = parseFloat(valStr.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.'));
                               if (!isNaN(numVal) && numVal > 0) return true;
                             }
                             const simpleVal = parseFloat(valStr.replace(/[^\d.,-]/g, '').replace(',', '.'));
                             return !isNaN(simpleVal) && simpleVal < 0;
                           });
                           
                           if (inconsistenciasFiltroOperadora !== "Todas") {
                             inconsistentes = inconsistentes.filter(v => (v.codigoOperadora || "AMIL") === inconsistenciasFiltroOperadora);
                           }

                           if (inconsistenciasStatusFiltragem === "pendentes") {
                             inconsistentes = inconsistentes.filter(v => !v.inconsistenciaResolvida);
                           } else {
                             inconsistentes = inconsistentes.filter(v => v.inconsistenciaResolvida);
                           }

                           rows = inconsistentes.map(v => ({ type: 'negativo', data: v, refVenda: v }));
                         } else {
                           const parseRobustDate = (d) => {
                             if (!d) return new Date(0);
                             const dStr = String(d).trim();
                             if (dStr.includes('T')) {
                               const parsed = new Date(dStr);
                               if (!isNaN(parsed.getTime())) return parsed;
                             }
                             if (dStr.includes('-')) {
                               const parts = dStr.split('-');
                               if (parts.length === 3) {
                                 if (parts[0].length === 4) {
                                   return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                                 } else if (parts[2].length === 4) {
                                   return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                                 }
                               }
                             }
                             if (dStr.includes('/')) {
                               const parts = dStr.split('/');
                               if (parts.length === 3) {
                                 let year = parts[2];
                                 if (year.length === 2) year = "20" + year;
                                 return new Date(parseInt(year, 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                               }
                             }
                             const fallback = new Date(dStr);
                             return isNaN(fallback.getTime()) ? new Date(0) : fallback;
                           };

                           const byContrato = {};
                           rawVendas.forEach(v => {
                             if (!v.contrato) return;
                             // Filtra vendas / relatórios a partir de 01/01/2026
                             const dtVenda = parseRobustDate(v.dataVenda);
                             if (dtVenda < parseRobustDate("2026-01-01")) return;

                             if (!byContrato[v.contrato]) byContrato[v.contrato] = [];
                             byContrato[v.contrato].push(v);
                           });

                           let faltantes = [];
                           Object.keys(byContrato).forEach(contrato => {
                             const vendasContrato = byContrato[contrato];

                             const sortedByDateAsc = [...vendasContrato].sort((a,b) => parseRobustDate(a.dataVenda) - parseRobustDate(b.dataVenda));
                             const primeiroRegistro = sortedByDateAsc[0];
                             if (!primeiroRegistro) return;
                             
                             const operadora = vendasContrato[0].codigoOperadora || "AMIL";
                             
                             if (inconsistenciasFiltroOperadora !== "Todas" && operadora !== inconsistenciasFiltroOperadora) return;
                             
                             const parcelasNumeros = vendasContrato.map(v => parseInt(String(v.parcela || "").replace(/\D/g, ""), 10)).filter(n => !isNaN(n) && n > 0);
                             if (parcelasNumeros.length === 0) return;

                             const maxParcela = Math.max(...parcelasNumeros);
                             const presentes = new Set(parcelasNumeros);
                             let missing = [];
                             for (let i = (vendasContrato[0]?.inicioVigencia && parseRobustDate(vendasContrato[0].inicioVigencia) >= parseRobustDate("2026-01-01") ? 1 : Math.min(...parcelasNumeros)); i <= maxParcela; i++) {
                               if (!presentes.has(i)) missing.push(i);
                             }

                             if (missing.length > 0) {
                               const refVenda = [...vendasContrato].sort((a,b) => parseRobustDate(b.dataVenda) - parseRobustDate(a.dataVenda))[0] || vendasContrato[0];

                               if (inconsistenciasStatusFiltragem === "pendentes") {
                                 if (refVenda.inconsistenciaFaltFaltaResolvida) return;
                               } else {
                                 if (!refVenda.inconsistenciaFaltFaltaResolvida) return;
                               }

                               faltantes.push({
                                 type: 'faltante',
                                 contrato: contrato,
                                 operadora: operadora,
                                 totalVendas: vendasContrato.length,
                                 missing: missing.join(", "),
                                 refVenda: refVenda,
                               });
                             }
                           });
                           rows = faltantes;
                         }

                         if (rows.length === 0) {
                           return (
                             <tr>
                               <td colSpan="6" className="p-8 text-center text-slate-500 dark:text-slate-400">
                                 <CheckCircle className="mx-auto mb-2 text-emerald-500" size={32} />
                                 Nenhuma inconsistência encontrada para os filtros atuais.
                               </td>
                             </tr>
                           );
                         }

                         const toggleResolvido = (v, isFaltante) => {
                             const fieldName = isFaltante ? "inconsistenciaFaltFaltaResolvida" : "inconsistenciaResolvida";
                             atualizarInconsistenciaVenda(v, { [fieldName]: !v[fieldName] });
                         };

                         const abrirContrato = (contrato, cliente) => {
                             setShowModalInconsistencias(false);
                             const filter = { ...defaultVendasFilters };
                              if (contrato) {
                                  filter.contrato = contrato;
                              } else if (cliente) {
                                  filter.cliente = cliente;
                              }
                              setVendasFilterForm(filter);
                             setAppliedVendasFilters(filter);
                             
                             // Small navigation fix if we are not on the Vendas tab
                             const vendasBtn = document.querySelector('button[title="Vendas de serviços"]');
                             if(vendasBtn && window.location.hash !== "#vendas") {
                                 vendasBtn.click();
                             }
                         };

                         return rows.map((r, i) => {
                           const isFaltante = r.type === 'faltante';
                           const refVenda = r.refVenda;
                           const notesField = isFaltante ? "inconsistenciaFaltFaltaNotas" : "inconsistenciaNotas";
                           const resolvesField = isFaltante ? "inconsistenciaFaltFaltaResolvida" : "inconsistenciaResolvida";
                           
                           const editKey = isFaltante ? `faltante_${r.contrato}` : `negativo_${refVenda.id}`;
                            const isEditing = inconsistenciasEditingId === editKey;

                           const startEditing = () => {
                               setInconsistenciasEditingId(editKey);
                               setInconsistenciasEditingText(refVenda[notesField] || "");
                           };

                           const saveEditing = () => {
                               if (refVenda[notesField] !== inconsistenciasEditingText) {
                                   atualizarInconsistenciaVenda(refVenda, { [notesField]: inconsistenciasEditingText });
                               }
                               setInconsistenciasEditingId(null);
                           };

                           const cancelEditing = () => {
                               setInconsistenciasEditingId(null);
                           };
                           
                           return (
                             <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                               <td className="p-3 text-sm text-slate-800 dark:text-slate-200 font-medium">
                                  {isFaltante ? (
                                    <div>
                                      <div className="font-semibold text-slate-800 dark:text-slate-100">
                                        {refVenda.cliente || "-"}
                                      </div>
                                      {r.contrato && (
                                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                                          Contrato: {r.contrato}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    refVenda.cliente || "-"
                                  )}
                               </td>
                               <td className="p-3 text-sm text-slate-600 dark:text-slate-400 font-mono">
                                  {isFaltante ? r.operadora : (refVenda.codigoOperadora || "AMIL")}
                               </td>
                               <td className="p-3 text-sm text-rose-600 dark:text-rose-400 font-bold font-mono">
                                 {isFaltante ? `Faltam: ${r.missing}` : (typeof formatarMoeda === 'function' ? formatarMoeda(refVenda.valor) : String(refVenda.valor))}
                               </td>
                               <td className="p-3 text-sm text-slate-600 dark:text-slate-400">
                                  {isEditing ? (
                                      <div className="flex flex-col gap-1 w-full max-w-[200px]">
                                          <textarea 
                                              value={inconsistenciasEditingText} 
                                              onChange={(e) => setInconsistenciasEditingText(e.target.value)}
                                              className="w-full text-sm p-1.5 border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                              rows="2"
                                              autoFocus
                                              onBlur={saveEditing}
                                              onKeyDown={(e) => {
                                                  if (e.key === 'Enter' && !e.shiftKey) {
                                                      e.preventDefault();
                                                      saveEditing();
                                                  }
                                                  if (e.key === 'Escape') cancelEditing();
                                              }}
                                          />
                                      </div>
                                  ) : (
                                      <div className="flex items-center gap-2 group w-full max-w-[200px]">
                                         <button onClick={startEditing} className="text-slate-400 hover:text-blue-500 p-1 rounded shrink-0" title="Editar nota">
                                            <FileEdit size={16} />
                                         </button>
                                         <span onClick={startEditing} className="truncate cursor-pointer hover:text-blue-500 transition-colors" title={refVenda[notesField] || "Sem detalhes"}>
                                             {refVenda[notesField] || <span className="text-slate-400 italic">Sem detalhes</span>}
                                         </span>
                                      </div>
                                  )}
                               </td>
                               <td className="p-3 text-center">
                                  <button onClick={() => toggleResolvido(refVenda, isFaltante)} className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${refVenda[resolvesField] ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-orange-100 text-orange-700 hover:bg-orange-200"}`}>
                                      {refVenda[resolvesField] ? 'Resolvido (Voltar)' : 'Marcar Resolvido'}
                                  </button>
                               </td>
                               <td className="p-3 text-right">
                                   {(r.contrato || refVenda.contrato || refVenda.cliente) && (
                                     <button 
                                       onClick={() => abrirContrato(r.contrato || refVenda.contrato, refVenda.cliente)} 
                                       className="text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-bold rounded transition-colors whitespace-nowrap"
                                     >
                                       Abrir Vendas
                                     </button>
                                   )}
                               </td>
                             </tr>
                           )
                         });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Modal Edição de Notas das Inconsistências */}
          {/* Desativado em favor da edição inline */}

          {/* Modal Selecionar Vendas para o Relatório */}
          {showModalVendasRelatorio && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-4xl relative mx-4 max-h-[90vh] flex flex-col">
                <button
                  type="button"
                  onClick={() => setShowModalVendasRelatorio(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors z-10"
                >
                  <X size={20} />
                </button>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center mb-6">
                  <ShoppingCart size={24} className="mr-3 text-emerald-500" />
                  Selecionar Vendas para Inclusão
                </h3>
                <div className="flex gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Buscar por cliente, operadora ou número..."
                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white"
                    value={relatorioVendasSearch}
                    onChange={(e) => setRelatorioVendasSearch(e.target.value)}
                  />
                </div>
                <div className="flex-1 overflow-auto border border-slate-200 dark:border-slate-700 rounded-lg relative">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 z-10 shadow-sm shadow-slate-200/50 dark:shadow-black/50">
                      <tr>
                        <th className="p-3 text-center w-10">
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              const visibleVendas = getAllVendas().filter(
                                (v) => {
                                  const matches = [
                                    v.numero,
                                    v.cliente,
                                    v.codigoOperadora,
                                    v.corretor,
                                  ]
                                    .join(" ")
                                    .toLowerCase()
                                    .includes(
                                      relatorioVendasSearch.toLowerCase(),
                                    );
                                  const isFaturado =
                                    v.situacao &&
                                    v.situacao
                                      .toLowerCase()
                                      .includes("faturado");
                                  return matches && isFaturado;
                                },
                              );
                              if (isChecked) {
                                const newSet = new Set(relatorioVendasSelected);
                                visibleVendas.forEach((v) => newSet.add(v.id));
                                setRelatorioVendasSelected(newSet);
                              } else {
                                const newSet = new Set(relatorioVendasSelected);
                                visibleVendas.forEach((v) =>
                                  newSet.delete(v.id),
                                );
                                setRelatorioVendasSelected(newSet);
                              }
                            }}
                          />
                        </th>
                        <th className="p-3 font-bold">Data</th>
                        <th className="p-3 font-bold">Cliente</th>
                        <th className="p-3 font-bold">Op|Seg</th>
                        <th className="p-3 font-bold text-center">Valor</th>
                        <th className="p-3 font-bold text-center">Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getAllVendas().filter((v) => {
                        const matches = [
                          v.numero,
                          v.cliente,
                          v.codigoOperadora,
                          v.corretor,
                        ]
                          .join(" ")
                          .toLowerCase()
                          .includes(relatorioVendasSearch.toLowerCase());
                        return matches;
                      }).length === 0 ? (
                        <tr>
                          <td
                            colSpan="6"
                            className="py-6 text-center text-slate-500"
                          >
                            Nenhuma venda faturada encontrada.
                          </td>
                        </tr>
                      ) : (
                        getAllVendas()
                          .filter((v) => {
                            const matches = [
                              v.numero,
                              v.cliente,
                              v.codigoOperadora,
                              v.corretor,
                            ]
                              .join(" ")
                              .toLowerCase()
                              .includes(relatorioVendasSearch.toLowerCase());
                            return matches;
                          })
                          .map((v) => (
                            <tr
                              key={v.id}
                              className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                              onClick={() => {
                                const newSet = new Set(relatorioVendasSelected);
                                if (newSet.has(v.id)) newSet.delete(v.id);
                                else newSet.add(v.id);
                                setRelatorioVendasSelected(newSet);
                              }}
                            >
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 accent-blue-500 rounded cursor-pointer pointer-events-none"
                                  checked={relatorioVendasSelected.has(v.id)}
                                  readOnly
                                />
                              </td>
                              <td className="p-3">
                                {formatarDataVisivel(v.dataVenda)}
                              </td>
                              <td className="p-3 font-medium text-slate-900 dark:text-white">
                                {v.cliente}
                              </td>
                              <td className="p-3">
                                {v.codigoOperadora || "AMIL"}
                              </td>
                              <td className="p-3 text-center text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap">
                                R$ {(Number(v.valor) || 0).toFixed(2)}
                              </td>
                              <td className="p-3 text-center text-xs">
                                <span className="px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 whitespace-nowrap inline-block truncate max-w-[150px]">
                                  {v.situacao}
                                </span>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                    {relatorioVendasSelected.size} selecionadas
                  </span>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowModalVendasRelatorio(false)}
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirmarVendasRelatorio}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Importar NF de PDF */}
          {modalImportNfPdfOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-lg relative mx-4 transition-colors">
                <button
                  onClick={() => setModalImportNfPdfOpen(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center mb-6">
                  <CheckCircle className="mr-3 text-emerald-500" />
                  NF {importNfPdfForm.nf || "Não identificada"} pré-carregada!
                </h3>

                <form onSubmit={salvarNotaPdfImportada} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Nº da Nota
                      </label>
                      <input
                        type="text"
                        required
                        value={importNfPdfForm.nf}
                        onChange={(e) =>
                          setImportNfPdfForm({
                            ...importNfPdfForm,
                            nf: e.target.value,
                          })
                        }
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Valor do Serviço (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={importNfPdfForm.valor}
                        onChange={(e) =>
                          setImportNfPdfForm({
                            ...importNfPdfForm,
                            valor: e.target.value,
                          })
                        }
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Op. | Seg. (Tomador)
                    </label>
                    <p className="text-xs text-slate-500 mb-2">
                      Tomador Identificado: {importNfPdfForm.cliente}
                    </p>
                    <select
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={importNfPdfForm.operadora}
                      onChange={(e) =>
                        setImportNfPdfForm({
                          ...importNfPdfForm,
                          operadora: e.target.value,
                        })
                      }
                    >
                      <option value="">Selecione uma Op. | Seg.</option>
                      <optgroup label="Operadoras">
                        <option value="AMIL">AMIL</option>
                        <option value="ASSIM">ASSIM</option>
                        <option value="HAPVIDA">HAPVIDA</option>
                        <option value="KLINI">KLINI</option>
                        <option value="LEVE SAUDE">LEVE SAUDE</option>
                        <option value="NOTRE DAME">NOTRE DAME</option>
                        <option value="PREVENT">PREVENT</option>
                        <option value="METLIFE">METLIFE</option>
                        <option value="PET LOVE">PET LOVE</option>
                        <option value="QUALICORP">QUALICORP</option>
                        <option value="SUPERMED">SUPERMED</option>
                        <option value="MED SENIOR">MED SENIOR</option>
                        <option value="ODONTOPREV">ODONTOPREV</option>
                      </optgroup>
                      <optgroup label="Seguradoras">
                        <option value="ALLIANZ">ALLIANZ</option>
                        <option value="ASSIST CARD">ASSIST CARD</option>
                        <option value="AZUL">AZUL</option>
                        <option value="BRADESCO">BRADESCO</option>
                        <option value="HDI">HDI</option>
                        <option value="CASSI PASI">CASSI PASI</option>
                        <option value="ICATU">ICATU</option>
                        <option value="MONGERAL">MONGERAL</option>
                        <option value="MAPFRE">MAPFRE</option>
                        <option value="SULAMERICA">SULAMERICA</option>
                        <option value="TOKIO MARINE">TOKIO MARINE</option>
                      </optgroup>
                      <option value={importNfPdfForm.cliente}>
                        Manter: {importNfPdfForm.cliente}
                      </option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Emissão
                      </label>
                      <input
                        type="date"
                        value={importNfPdfForm.dataHora}
                        onChange={(e) =>
                          setImportNfPdfForm({
                            ...importNfPdfForm,
                            dataHora: e.target.value,
                          })
                        }
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Chave
                      </label>
                      <input
                        type="text"
                        value={importNfPdfForm.chave}
                        onChange={(e) =>
                          setImportNfPdfForm({
                            ...importNfPdfForm,
                            chave: e.target.value,
                          })
                        }
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 mt-6 border-t border-slate-200 dark:border-slate-700 gap-3">
                    <button
                      type="button"
                      onClick={() => setModalImportNfPdfOpen(false)}
                      className="px-6 py-2 rounded-lg font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-8 rounded-lg shadow-lg flex items-center transition-colors"
                    >
                      <CheckCircle size={18} className="mr-2" /> Salvar Nota
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Editar NF */}
          {modalEditNfOpen && editNfForm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-lg relative mx-4 transition-colors">
                <button
                  onClick={() => setModalEditNfOpen(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center mb-6">
                  <Edit className="mr-3 text-amber-500" />
                  Editar Nota Fiscal
                </h3>

                <form onSubmit={salvarEdicaoNota} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Nº da Nota
                      </label>
                      <input
                        type="text"
                        required
                        value={editNfForm.numero || ""}
                        onChange={(e) =>
                          setEditNfForm({
                            ...editNfForm,
                            numero: e.target.value,
                          })
                        }
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Valor Total (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={editNfForm.valor}
                        onChange={(e) =>
                          setEditNfForm({
                            ...editNfForm,
                            valor: e.target.value,
                          })
                        }
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Cliente / Tomador
                    </label>
                    <input
                      type="text"
                      required
                      value={editNfForm.cliente || ""}
                      onChange={(e) =>
                        setEditNfForm({
                          ...editNfForm,
                          cliente: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Data Emissão
                      </label>
                      <input
                        type="date"
                        value={
                          editNfForm.data ? editNfForm.data.split("T")[0] : ""
                        }
                        onChange={(e) =>
                          setEditNfForm({ ...editNfForm, data: e.target.value })
                        }
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Chave / Protocolo
                      </label>
                      <input
                        type="text"
                        value={
                          editNfForm.chaveNacional || editNfForm.protocolo || ""
                        }
                        onChange={(e) =>
                          setEditNfForm({
                            ...editNfForm,
                            chaveNacional: e.target.value,
                          })
                        }
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 mt-6 border-t border-slate-200 dark:border-slate-700 gap-3">
                    <button
                      type="button"
                      onClick={() => setModalEditNfOpen(false)}
                      className="px-6 py-2 rounded-lg font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-8 rounded-lg shadow-lg flex items-center transition-colors"
                    >
                      <CheckCircle size={18} className="mr-2" /> Atualizar Nota
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Visualizar DANFSe */}
          {modalViewNfOpen && viewNfData && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-2 sm:p-4">
              <div className="bg-white dark:bg-slate-800 border items-center flex flex-col border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-4xl relative overflow-y-auto max-h-screen">
                <button
                  onClick={() => setModalViewNfOpen(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors no-print z-10"
                >
                  <X size={24} />
                </button>

                <div className="w-full p-4 sm:p-8 bg-white text-black border border-slate-300 print:border-none print:shadow-none shadow-sm rounded">
                  <div className="flex justify-between items-center border-b-2 border-slate-800 pb-4 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 border-2 border-slate-800 flex items-center justify-center font-bold text-xl text-slate-800 tracking-tighter">
                        NFS-e
                      </div>
                      <div>
                        <h1 className="text-xl font-bold uppercase">
                          DANFSe v1.0
                        </h1>
                        <p className="text-sm font-semibold uppercase">
                          Documento Auxiliar da NFS-e
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <h2 className="text-sm font-bold uppercase">
                        Prefeitura da Cidade do Rio de Janeiro
                      </h2>
                      <p className="text-xs uppercase">SMF / Receita Rio</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="bg-slate-100 p-2 font-bold text-sm uppercase mb-1 border-t border-b border-slate-300">
                      Chave de Acesso da NFS-e
                    </div>
                    <div className="text-sm font-mono tracking-widest px-2">
                      {viewNfData.chaveNacional ?? viewNfData.protocolo}
                    </div>
                  </div>

                  <div className="flex justify-between border-b border-slate-300 pb-4 mb-4 gap-4">
                    <div>
                      <div className="text-xs font-bold uppercase text-slate-600">
                        Número da NFS-e
                      </div>
                      <div className="font-bold text-lg">
                        {viewNfData.numero || "DPS"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase text-slate-600">
                        Data e Hora da Emissão
                      </div>
                      <div className="font-bold">
                        {formatarDataVisivel(viewNfData.data)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold uppercase text-slate-600">
                        Autenticidade
                      </div>
                      <div className="text-xs max-w-[150px] leading-tight text-slate-500">
                        A autenticidade desta NFS-e pode ser verificada no
                        portal nacional da NFS-e.
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-800 mb-4 rounded-sm overflow-hidden">
                    <div className="bg-slate-100 font-bold uppercase text-xs p-1 px-2 border-b border-slate-800">
                      Prestador do Serviço
                    </div>
                    <div className="p-3 text-sm">
                      <p>
                        <strong>Nome / Nome Empresarial:</strong>{" "}
                        {nomeEmpresaUpper}
                      </p>
                      <p>
                        <strong>Endereço:</strong> NILO PECANHA, 00050, CENTRO -
                        Rio de Janeiro - RJ (CEP: 20020-906)
                      </p>
                      <p>
                        <strong>Simples Nacional:</strong> Optante -
                        Microempresa ou Empresa de Pequeno Porte (ME/EPP)
                      </p>
                    </div>
                  </div>

                  <div className="border border-slate-800 mb-4 rounded-sm overflow-hidden">
                    <div className="bg-slate-100 font-bold uppercase text-xs p-1 px-2 border-b border-slate-800">
                      Tomador do Serviço
                    </div>
                    <div className="p-3 text-sm">
                      <p>
                        <strong>Nome / Nome Empresarial:</strong>{" "}
                        {viewNfData.cliente}
                      </p>
                    </div>
                  </div>

                  <div className="border border-slate-800 mb-4 rounded-sm overflow-hidden">
                    <div className="bg-slate-100 font-bold uppercase text-xs p-1 px-2 border-b border-slate-800">
                      Serviço Prestado
                    </div>
                    <div className="p-3 text-sm min-h-[100px]">
                      <p className="whitespace-pre-wrap uppercase">
                        Agenciamento, corretagem ou intermediação de planos de
                        saúde.
                      </p>
                    </div>
                  </div>

                  <div className="border-t-2 border-slate-800 pt-4 mt-8">
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-xs font-bold uppercase text-slate-600">
                          ISS Retido
                        </div>
                        <div className="font-bold">
                          {viewNfData.issRetido ? "Sim, pelo Tomador" : "Não"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase text-slate-600">
                          Alíquota Aplicada
                        </div>
                        <div className="font-bold">
                          {viewNfData.aliquotaIss ?? 2}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold uppercase text-slate-600">
                          Valor Total da NFS-e
                        </div>
                        <div className="font-black text-2xl">
                          R${" "}
                          {parseFloat(viewNfData.valor).toLocaleString(
                            "pt-BR",
                            { minimumFractionDigits: 2 },
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end w-full gap-3 no-print">
                  <button
                    onClick={() => setModalViewNfOpen(false)}
                    className="px-6 py-2 rounded-lg font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-8 rounded-lg shadow-lg flex items-center transition-colors"
                  >
                    <Printer size={18} className="mr-2" /> Imprimir DANFSe
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Buscar Arquivos no Sistema */}
          {modalArquivosOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div
                className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl p-6 relative transition-all flex flex-col overflow-hidden min-h-[50vh] ${isModalArquivosFullscreen ? "fixed inset-0 sm:inset-4 rounded-none sm:rounded-xl w-auto max-w-none max-h-none" : "rounded-xl w-full max-w-4xl max-h-[90vh] mx-4 resize"}`}
              >
                <div className="absolute top-4 right-4 flex items-center space-x-2">
                  <button
                    onClick={() =>
                      setIsModalArquivosFullscreen(!isModalArquivosFullscreen)
                    }
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                    title={isModalArquivosFullscreen ? "Restaurar" : "Expandir"}
                  >
                    {isModalArquivosFullscreen ? (
                      <Minimize size={18} />
                    ) : (
                      <Maximize size={18} />
                    )}
                  </button>
                  <button
                    onClick={() => setModalArquivosOpen(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="mb-4 border-b border-slate-200 dark:border-slate-700 pb-4 flex flex-col gap-4 pr-16">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                        <Database className="mr-2 text-indigo-500" /> Buscar
                        Extratos no Sistema
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Selecione um extrato para processar
                      </p>
                    </div>
                    <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                      <button
                        onClick={() => setExtratosModalViewMode("cards")}
                        className={`p-1.5 rounded-md transition-colors ${extratosModalViewMode === "cards" ? "bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
                        title="Visualização em Cards"
                      >
                        <LayoutGrid size={16} />
                      </button>
                      <button
                        onClick={() => setExtratosModalViewMode("lines")}
                        className={`p-1.5 rounded-md transition-colors ${extratosModalViewMode === "lines" ? "bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
                        title="Visualização em Linhas"
                      >
                        <List size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="relative">
                      <button
                        onClick={() =>
                          setShowModalArquivosPeriodMenu(
                            !showModalArquivosPeriodMenu,
                          )
                        }
                        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center justify-between w-full sm:w-48 outline-none hover:border-blue-500"
                      >
                        {modalArquivosPeriodLabel}{" "}
                        <ChevronDown size={14} className="ml-2" />
                      </button>
                      {showModalArquivosPeriodMenu && (
                        <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg overflow-hidden text-sm z-50 animate-in fade-in slide-in-from-top-2">
                          <ul className="flex flex-col py-1">
                            {[
                              "Hoje",
                              "Esta semana",
                              "Mês passado",
                              "Este mês",
                              "Próximo mês",
                              "Todo o período",
                              "Escolha o período",
                            ].map((preset) => (
                              <li key={preset}>
                                <button
                                  onClick={() =>
                                    applyModalArquivosDatePreset(preset)
                                  }
                                  className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors font-medium"
                                >
                                  {preset}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Pesquisar extrato por nome ou parceiro..."
                        value={modalArquivosSearch}
                        onChange={(e) => setModalArquivosSearch(e.target.value)}
                        className="pl-10 w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                      />
                      {modalArquivosSearch && (
                        <button
                          onClick={() => setModalArquivosSearch("")}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>

                    {modalArquivosPath.length > 0 &&
                      !(
                        modalArquivosSearch ||
                        modalArquivosDateStart ||
                        modalArquivosDateEnd
                      ) && (
                        <button
                          onClick={() =>
                            setModalArquivosPath(modalArquivosPath.slice(0, -1))
                          }
                          className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-white px-4 rounded-lg transition-colors py-2"
                        >
                          <ArrowLeft size={18} />
                        </button>
                      )}
                  </div>

                  {!(
                    modalArquivosSearch ||
                    modalArquivosDateStart ||
                    modalArquivosDateEnd
                  ) && (
                    <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto whitespace-nowrap transition-colors">
                      <button
                        onClick={() => setModalArquivosPath([])}
                        className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center"
                      >
                        <Home size={14} className="mr-1" /> Raiz
                      </button>
                      {modalArquivosPath.map((folder, index) => (
                        <React.Fragment key={index}>
                          <ChevronRight size={14} />
                          <button
                            onClick={() => {
                              setModalArquivosPath(
                                modalArquivosPath.slice(0, index + 1),
                              );
                              setModalArquivosSearch("");
                            }}
                            className="hover:text-blue-600 dark:hover:text-blue-400 font-medium"
                          >
                            {folder}
                          </button>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto">
                  {dbReports.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      Nenhum extrato encontrado. <br />
                      Vá em "Gestor de Extratos" &gt; "Incluir Extrato" para
                      adicionar.
                    </div>
                  ) : (
                    <div
                      className={
                        extratosModalViewMode === "cards"
                          ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                          : "flex flex-col gap-2"
                      }
                    >
                      {getModalItemsAtCurrentPath().map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleModalArquivosNavigate(item)}
                          className={
                            extratosModalViewMode === "cards"
                              ? `relative p-4 rounded-xl border cursor-pointer flex flex-col items-center text-center space-y-3 transition-colors group ${item.type === "folder" ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-white" : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 hover:bg-white dark:hover:bg-white"}`
                              : `relative p-3 rounded-lg border cursor-pointer flex flex-row items-center space-x-4 transition-colors group ${item.type === "folder" ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-white" : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 hover:bg-white dark:hover:bg-white"}`
                          }
                        >
                          <div
                            className={`${extratosModalViewMode === "cards" ? "p-3 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 group-hover:scale-110" : "p-2 bg-white dark:bg-slate-900 rounded-md shadow-sm border border-slate-100 dark:border-slate-700 group-hover:scale-105"} transition-transform`}
                          >
                            {item.type === "folder" ? (
                              <Folder
                                className="text-blue-500"
                                size={
                                  extratosModalViewMode === "cards" ? 24 : 18
                                }
                              />
                            ) : (
                              <FileText
                                className={getFileColorClass(item.name || "")}
                                size={
                                  extratosModalViewMode === "cards" ? 24 : 18
                                }
                              />
                            )}
                          </div>
                          <div
                            className={
                              extratosModalViewMode === "cards"
                                ? ""
                                : "flex-1 min-w-0"
                            }
                          >
                            <p
                              className={`text-sm font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-slate-900 dark:group-hover:text-slate-900 ${extratosModalViewMode === "cards" ? "w-full" : ""}`}
                            >
                              {item.name}
                            </p>
                            {item.pathInfo && (
                              <p className="text-[10px] text-slate-400 truncate mt-1 group-hover:text-slate-500 dark:group-hover:text-slate-500">
                                {item.pathInfo}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      {getModalItemsAtCurrentPath().length === 0 && (
                        <div
                          className={
                            extratosModalViewMode === "cards"
                              ? "col-span-full py-12 text-center text-slate-500 font-medium"
                              : "py-12 w-full text-center text-slate-500 font-medium"
                          }
                        >
                          Pasta Vazia ou Sem Resultados.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                  <button
                    onClick={() => setModalArquivosOpen(false)}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg text-sm font-bold"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ECRÃ 5: HISTÓRICO DE RELATÓRIOS SALVOS */}
          {currentView === "historico" && hasAccess("historico") && (
            <div className="w-full px-4 xl:px-8 mx-auto animate-in fade-in duration-500 pb-20">
              <header className="mb-6 border-b border-slate-200 dark:border-slate-700 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
                    <Archive className="mr-3 text-indigo-500" /> Relatórios
                    Salvos
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Consulte e audite os relatórios gerados.
                  </p>
                </div>
                <div className="w-full md:w-auto flex flex-col md:flex-row gap-2">
                  <div className="flex items-center gap-2">
                    <div className="relative z-20">
                      <button
                        onClick={() =>
                          setShowSavedReportsPeriodMenu(
                            !showSavedReportsPeriodMenu,
                          )
                        }
                        className="flex items-center justify-between w-[160px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs md:text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors h-[38px]"
                      >
                        {savedReportsPeriodLabel}{" "}
                        <ChevronDown size={14} className="ml-2" />
                      </button>
                      {showSavedReportsPeriodMenu && (
                        <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg overflow-hidden text-sm animate-in fade-in slide-in-from-top-2">
                          <ul className="flex flex-col py-1">
                            {[
                              "Hoje",
                              "Esta semana",
                              "Mês passado",
                              "Este mês",
                              "Próximo mês",
                              "Todo o período",
                              "Escolha o período",
                            ].map((preset) => (
                              <li key={preset}>
                                <button
                                  onClick={() =>
                                    applySavedReportsDatePreset(preset)
                                  }
                                  className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors font-medium"
                                >
                                  {preset}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {savedReportsPeriodLabel === "Escolha o período" && (
                      <>
                        <input
                          type="date"
                          value={savedReportsDateStart}
                          onChange={(e) =>
                            setSavedReportsDateStart(e.target.value)
                          }
                          className="w-full md:w-auto bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs md:text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 h-[38px]"
                        />
                        <span className="text-slate-500 text-xs md:text-sm">
                          até
                        </span>
                        <input
                          type="date"
                          value={savedReportsDateEnd}
                          onChange={(e) =>
                            setSavedReportsDateEnd(e.target.value)
                          }
                          className="w-full md:w-auto bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs md:text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 h-[38px]"
                        />
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                        size={18}
                      />
                      <input
                        type="text"
                        placeholder="Pesquisar relatórios, NF, Op..."
                        value={savedReportsSearchTerm}
                        onChange={(e) =>
                          setSavedReportsSearchTerm(e.target.value)
                        }
                        className="w-full md:w-64 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    {selectedSavedReports.length > 0 && (
                      <button
                        onClick={apagarRelatoriosSalvosSelecionados}
                        className="bg-rose-500 hover:bg-rose-400 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center shadow transition-colors h-[38px] min-w-max"
                      >
                        <Trash2 size={16} className="mr-2" /> Eliminar ({selectedSavedReports.length})
                      </button>
                    )}
                  </div>
                </div>
              </header>

              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-x-auto transition-colors duration-200">
                <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                  <thead>
                    <tr className="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750/50 transition-colors duration-200">
                      <th className="py-3 px-4 w-10 text-center border-r border-slate-200 dark:border-slate-700">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 dark:bg-slate-700 dark:border-slate-600 dark:checked:bg-emerald-600 cursor-pointer"
                          checked={isAllSavedReportsSelected}
                          onChange={toggleAllSavedReports}
                          disabled={displayedReports.length === 0}
                          title="Selecionar Todos na Página"
                        />
                      </th>
                      <th 
                        className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                        onClick={() => handleSavedReportsSort("dataCriacao")}
                      >
                        <div className="flex items-center">
                          Data de Emissão {getSavedReportsSortIcon("dataCriacao")}
                        </div>
                      </th>
                      <th 
                        className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                        onClick={() => handleSavedReportsSort("nome")}
                      >
                        <div className="flex items-center">
                          Nome do Relatório {getSavedReportsSortIcon("nome")}
                        </div>
                      </th>
                      <th 
                        className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                        onClick={() => handleSavedReportsSort("periodo")}
                      >
                        <div className="flex items-center">
                          Período Referência {getSavedReportsSortIcon("periodo")}
                        </div>
                      </th>
                      <th 
                        className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-indigo-600 dark:text-indigo-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                        onClick={() => handleSavedReportsSort("criadoPor")}
                      >
                        <div className="flex items-center">
                          Responsável (Emissão) {getSavedReportsSortIcon("criadoPor")}
                        </div>
                      </th>
                      <th 
                        className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                        onClick={() => handleSavedReportsSort("notaFiscal")}
                      >
                        <div className="flex items-center justify-center">
                          NF {getSavedReportsSortIcon("notaFiscal")}
                        </div>
                      </th>
                      <th 
                        className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                        onClick={() => handleSavedReportsSort("operadora")}
                      >
                        <div className="flex items-center justify-center">
                          Op. | Seg. {getSavedReportsSortIcon("operadora")}
                        </div>
                      </th>
                      <th 
                        className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                        onClick={() => handleSavedReportsSort("registos")}
                      >
                        <div className="flex items-center justify-center">
                          Registros {getSavedReportsSortIcon("registos")}
                        </div>
                      </th>
                      <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-center">
                        Ações
                      </th>
                    </tr>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-700">
                      <td className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-700 bg-slate-100/55 dark:bg-slate-800/40">
                        <span className="text-slate-400 text-xs font-bold" title="Filtros de Coluna">🔍</span>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          placeholder="Filtrar Data..."
                          value={filterSavedReportsData}
                          onChange={(e) => setFilterSavedReportsData(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-2.5 py-1 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-normal shadow-sm"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          placeholder="Filtrar Nome..."
                          value={filterSavedReportsNome}
                          onChange={(e) => setFilterSavedReportsNome(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-2.5 py-1 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-normal shadow-sm"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          placeholder="Filtrar Período..."
                          value={filterSavedReportsPeriodo}
                          onChange={(e) => setFilterSavedReportsPeriodo(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-2.5 py-1 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-normal shadow-sm"
                        />
                      </td>
                      <td className="py-2 px-3 bg-slate-100/20 dark:bg-slate-800/35">
                        <div className="text-center text-[11px] text-slate-400 italic font-normal hover:cursor-default" title="Sem filtro no responsável">-</div>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          placeholder="Filtrar NF..."
                          value={filterSavedReportsNf}
                          onChange={(e) => setFilterSavedReportsNf(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-2.5 py-1 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-normal text-center shadow-sm"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          placeholder="Filtrar Op/Seg..."
                          value={filterSavedReportsOperadora}
                          onChange={(e) => setFilterSavedReportsOperadora(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-2.5 py-1 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-normal text-center shadow-sm"
                        />
                      </td>
                      <td className="py-2 px-3 bg-slate-100/20 dark:bg-slate-800/35">
                        <div className="text-center text-[11px] text-slate-400 italic font-normal hover:cursor-default" title="Sem filtro nos registros">-</div>
                      </td>
                      <td className="py-1.5 px-3 text-center bg-slate-150/10 dark:bg-slate-800/35 flex items-center justify-center min-h-[38px]">
                        {(filterSavedReportsData || filterSavedReportsNome || filterSavedReportsPeriodo || filterSavedReportsNf || filterSavedReportsOperadora) ? (
                          <button
                            type="button"
                            onClick={() => {
                              setFilterSavedReportsData("");
                              setFilterSavedReportsNome("");
                              setFilterSavedReportsPeriodo("");
                              setFilterSavedReportsNf("");
                              setFilterSavedReportsOperadora("");
                            }}
                            className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 border border-rose-200 dark:border-rose-900 rounded px-2 py-0.5 font-bold transition-colors shadow-xs"
                            title="Limpar todos os filtros de coluna"
                          >
                            Limpar
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono italic">Filtros</span>
                        )}
                      </td>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedReports.length === 0 ? (
                      <tr>
                        <td
                          colSpan="9"
                          className="py-8 text-center text-slate-500 italic"
                        >
                          Nenhum relatório encontrado.
                        </td>
                      </tr>
                    ) : (
                      currentSavedReports.map((rep) => {
                        const nfsStr =
                          Array.from(
                            new Set(
                              (rep.dados || [])
                                .map((d) => d.notaFiscal)
                                .filter(Boolean),
                            ),
                          ).join(", ") || "-";
                        const opsStr =
                          Array.from(
                            new Set(
                              (rep.dados || [])
                                .map((d) => d.codigoOperadora)
                                .filter(Boolean),
                            ),
                          ).join(", ") || "-";

                        return (
                          <tr
                            key={rep.id}
                            className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-750/50 transition-colors"
                          >
                            <td
                              className="py-3 px-4 text-center border-r border-slate-200 dark:border-slate-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (selectedSavedReports.includes(rep.id)) {
                                  setSelectedSavedReports(selectedSavedReports.filter((id) => id !== rep.id));
                                } else {
                                  setSelectedSavedReports([...selectedSavedReports, rep.id]);
                                }
                              }}
                            >
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 dark:bg-slate-700 dark:border-slate-600 dark:checked:bg-emerald-600 cursor-pointer"
                                checked={selectedSavedReports.includes(rep.id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  if (selectedSavedReports.includes(rep.id)) {
                                    setSelectedSavedReports(selectedSavedReports.filter((id) => id !== rep.id));
                                  } else {
                                    setSelectedSavedReports([...selectedSavedReports, rep.id]);
                                  }
                                }}
                              />
                            </td>
                            <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                                {new Date(rep.dataCriacao).toLocaleDateString(
                                  "pt-PT",
                                )}{" "}
                                às{" "}
                                {new Date(rep.dataCriacao)
                                  .toLocaleTimeString("pt-PT")
                                  .slice(0, 5)}
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                                {rep.nome}
                              </td>
                              <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                                {rep.periodo || "-"}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center text-slate-700 dark:text-slate-300 font-medium">
                                  <User
                                    size={14}
                                    className="mr-1.5 text-indigo-500"
                                  />
                                  {rep.criadoPor
                                    ? `${rep.criadoPor}`
                                    : "Sistema Automático"}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-center font-bold text-rose-600 dark:text-rose-400">
                                {nfsStr}
                              </td>
                              <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-center">
                                {opsStr}
                              </td>
                              <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-center">
                                {(rep.dados || []).length}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex gap-2 justify-center">
                                  <button
                                    onClick={() => carregarRelatorioSalvo(rep)}
                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 flex flex-col justify-center rounded transition-colors text-xs font-bold"
                                  >
                                    Abrir
                                  </button>
                                  {(() => {
                                    const nfSet = Array.from(new Set((rep.dados || []).map(d => String(d.notaFiscal)).filter(Boolean)));
                                    const opSet = Array.from(new Set((rep.dados || []).map(d => String(d.codigoOperadora || d.codOperadora)).filter(Boolean)));
                                    let matchingExtrato = null;
                                    if (nfSet.length > 0) {
                                      matchingExtrato = dbReports.find(ext => ext.notaFiscal && nfSet.includes(String(ext.notaFiscal)) && ((ext.codigoOperadora && opSet.includes(String(ext.codigoOperadora))) || (ext.codOperadora && opSet.includes(String(ext.codOperadora)))));
                                    }
                                    if (!matchingExtrato && nfSet.length > 0) {
                                      matchingExtrato = dbReports.find(ext => ext.notaFiscal && nfSet.includes(String(ext.notaFiscal)));
                                    }
                                    if (!matchingExtrato) {
                                      matchingExtrato = dbReports.find(ext => ext.parceiro === rep.nome || (rep.nome && ext.fileName && rep.nome.includes(ext.fileName.split('.')[0])));
                                    }

                                    if (matchingExtrato) {
                                      return (
                                        <button
                                          onClick={() => {
                                            const pathTarget = matchingExtrato.filePath || matchingExtrato.fileName;
                                            if (!pathTarget) {
                                              showAlert("Caminho do ficheiro original ausente.");
                                              return;
                                            }
                                            setLoading(true);
                                            setLoadingMsg("A descarregar ficheiro...");
                                            supabase.storage.from("arquivos_extratos").download(pathTarget).then(({ data, error }) => {
                                              setLoading(false);
                                              if (error || !data) {
                                                showAlert("Ficheiro não encontrado na base de dados cloud.");
                                              } else {
                                                const url = URL.createObjectURL(data);
                                                window.open(url, "_blank");
                                                setTimeout(() => URL.revokeObjectURL(url), 1000);
                                              }
                                            });
                                          }}
                                          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 flex items-center gap-1.5 rounded transition-colors text-xs font-bold whitespace-nowrap"
                                          title="Abrir Extrato de Referência"
                                        >
                                          <FileText size={14} /> Abrir Extrato
                                        </button>
                                      );
                                    }
                                    return null;
                                  })()}
                                  <button
                                    onClick={() => apagarRelatorioSalvo(rep.id)}
                                    className="text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-rose-50 dark:bg-rose-900/30 p-1.5 flex flex-col justify-center rounded transition-colors"
                                    title="Apagar Relatório"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>

              {displayedReports.length > 0 && (
                <div className="mt-4 flex flex-col md:flex-row items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm gap-4">
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                    A mostrar {indexOfFirstSavedReport + 1} a{" "}
                    {Math.min(
                      indexOfLastSavedReport,
                      displayedReports.length,
                    )}{" "}
                    de {displayedReports.length} relatórios
                  </span>
                  <div className="flex flex-wrap flex-col md:flex-row gap-4 items-center justify-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        Mostrar:
                      </span>
                      <select
                        value={savedReportsPerPage}
                        onChange={(e) => {
                          const val =
                            e.target.value === "Todos"
                              ? "Todos"
                              : Number(e.target.value);
                          setSavedReportsPerPage(val);
                          setSavedReportsCurrentPage(1);
                        }}
                        className="bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white text-sm rounded-lg py-1 px-2 focus:border-emerald-500"
                      >
                        <option value={20}>20</option>
                        <option value={40}>40</option>
                        <option value={60}>60</option>
                        <option value="Todos">Todos</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleAllSavedReports}
                        className="px-3 py-1.5 text-xs font-semibold rounded bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-800/40 transition-colors border border-sky-200 dark:border-sky-800/50"
                      >
                        {isAllSavedReportsSelected
                          ? "Desmarcar Todos"
                          : "Marcar Todos (Visíveis)"}
                      </button>
                    </div>
                    {totalPagesSavedReports > 1 && (
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setSavedReportsCurrentPage((p) => Math.max(1, p - 1))
                          }
                          disabled={savedReportsCurrentPage === 1}
                          className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium text-sm"
                        >
                          Anterior
                        </button>
                        <span className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg font-bold text-sm border border-blue-200 dark:border-blue-800/50 flex items-center">
                          {savedReportsCurrentPage} / {totalPagesSavedReports}
                        </span>
                        <button
                          onClick={() =>
                            setSavedReportsCurrentPage((p) =>
                              Math.min(totalPagesSavedReports, p + 1),
                            )
                          }
                          disabled={
                            savedReportsCurrentPage === totalPagesSavedReports
                          }
                          className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium text-sm"
                        >
                          Próxima
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ECRÃ 6: EMISSOR NFS-E — PADRÃO NACIONAL 2026 */}
          {currentView === "nfe" &&
            (hasAccess("nfe") ||
              currentUser?.role === "admin" ||
              currentUser?.role === "master") && (
              <div className="max-w-4xl mx-auto animate-in fade-in duration-500 pb-20">
                <header className="mb-6 border-b border-slate-200 dark:border-slate-700 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
                      <Receipt className="mr-3 text-blue-500" /> Emissor NFS-e
                      (RJ)
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Padrão Nacional · ADN via API REST · Res. SMF nº
                      3.419/2026
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium border border-emerald-200 dark:border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>{" "}
                    Conectado e Pronto
                  </div>
                </header>

                {/* Banner informativo sobre o novo padrão */}
                <div className="mb-4 flex items-start gap-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300">
                  <Info size={18} className="mt-0.5 shrink-0 text-blue-500" />
                  <div>
                    <span className="font-bold">
                      Padrão Nacional obrigatório desde 01/01/2026.
                    </span>{" "}
                    O modelo ABRASF foi encerrado. A nota é transmitida como DPS
                    ao Ambiente de Dados Nacional (ADN), conforme LC nº 214/2025
                    e Res. SMF nº 3.419/2026. Campos IBS/CBS são exigidos, mas
                    validações de rejeição estão temporariamente suspensas em
                    2026.
                  </div>
                </div>

                <div className="bg-slate-200 dark:bg-slate-800/50 border-b border-slate-300 dark:border-slate-700 rounded-t-xl flex overflow-hidden">
                  <button
                    onClick={() => setNfeTab("emitir")}
                    className={`flex-1 p-3 text-sm font-bold border-b-2 transition-colors ${nfeTab === "emitir" ? "text-blue-600 dark:text-blue-400 border-blue-500 bg-white dark:bg-slate-800" : "text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700"}`}
                  >
                    Formulário de Emissão (DPS)
                  </button>
                  <button
                    onClick={() => setNfeTab("historico")}
                    className={`flex-1 p-3 text-sm font-bold border-b-2 transition-colors ${nfeTab === "historico" ? "text-blue-600 dark:text-blue-400 border-blue-500 bg-white dark:bg-slate-800" : "text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700"}`}
                  >
                    Histórico de Notas ({nfeHistorico.length})
                  </button>
                  <button
                    onClick={() => setNfeTab("import_export")}
                    className={`flex-1 p-3 text-sm font-bold border-b-2 transition-colors ${nfeTab === "import_export" ? "text-blue-600 dark:text-blue-400 border-blue-500 bg-white dark:bg-slate-800" : "text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700"}`}
                  >
                    Importar / Exportar
                  </button>
                </div>

                {nfeTab === "emitir" && (
                  <form
                    onSubmit={enviarNota}
                    onInvalid={(e) =>
                      e.currentTarget.classList.add("show-errors")
                    }
                    className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-b-xl shadow-lg border border-slate-200 dark:border-slate-700 space-y-6"
                  >
                    {/* BLOCO 1 — DADOS DA DPS */}
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                      <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <FileText size={18} /> Dados da DPS
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                            Data de Competência
                          </label>
                          <input
                            required
                            type="date"
                            value={nfeForm.dataEmissao}
                            onChange={(e) =>
                              setNfeForm({
                                ...nfeForm,
                                dataEmissao: e.target.value,
                              })
                            }
                            max={new Date().toISOString().split("T")[0]}
                            min={`${new Date().getFullYear()}-01-01`}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                            Regime Tributário
                          </label>
                          <select
                            value={nfeForm.regime}
                            onChange={(e) =>
                              setNfeForm({ ...nfeForm, regime: e.target.value })
                            }
                            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                          >
                            <option value="">Selecione...</option>
                            <option value="1">MEI</option>
                            <option value="2">Simples Nacional</option>
                            <option value="3">Lucro Presumido</option>
                            <option value="4">Lucro Real</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                            Município de Incidência (ISS)
                          </label>
                          <input
                            type="text"
                            value={nfeForm.munIncidencia}
                            onChange={(e) =>
                              setNfeForm({
                                ...nfeForm,
                                munIncidencia: e.target.value,
                              })
                            }
                            placeholder="Ex.: Rio de Janeiro – RJ"
                            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* BLOCO 2 — TOMADOR */}
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                      <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <User size={18} /> Tomador (Cliente)
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                              CPF / CNPJ
                            </label>
                            <input
                              required
                              type="text"
                              value={nfeForm.cnpj}
                              onChange={(e) => {
                                let val = e.target.value.replace(/\D/g, "");
                                if (val.length > 14) val = val.slice(0, 14);
                                if (val.length > 11) {
                                  val = val.replace(
                                    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
                                    "$1.$2.$3/$4-$5",
                                  );
                                } else if (val.length > 9) {
                                  val = val.replace(
                                    /^(\d{3})(\d{3})(\d{3})(\d{2})/,
                                    "$1.$2.$3-$4",
                                  );
                                }
                                setNfeForm({ ...nfeForm, cnpj: val });
                              }}
                              placeholder="CPF ou CNPJ"
                              maxLength="18"
                              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                              Razão Social / Nome
                            </label>
                            <input
                              required
                              type="text"
                              value={nfeForm.nome}
                              onChange={(e) =>
                                setNfeForm({ ...nfeForm, nome: e.target.value })
                              }
                              placeholder="Nome Completo"
                              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                            E-mail do Tomador
                          </label>
                          <input
                            required
                            type="email"
                            value={nfeForm.emailTomador}
                            onChange={(e) =>
                              setNfeForm({
                                ...nfeForm,
                                emailTomador: e.target.value,
                              })
                            }
                            placeholder="email@exemplo.com"
                            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3">
                            ENDEREÇO DO TOMADOR
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                            <div className="md:col-span-1">
                              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                                CEP
                              </label>
                              <input
                                required
                                type="text"
                                value={nfeForm.cep}
                                onBlur={(e) => buscarCep(e.target.value)}
                                onChange={(e) => {
                                  let val = e.target.value.replace(/\D/g, "");
                                  if (val.length > 8) val = val.slice(0, 8);
                                  if (val.length > 5)
                                    val = val.replace(/^(\d{5})(\d)/, "$1-$2");
                                  setNfeForm({ ...nfeForm, cep: val });
                                  if (val.replace(/\D/g, "").length === 8)
                                    buscarCep(val);
                                }}
                                placeholder="00000-000"
                                maxLength="9"
                                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                                Logradouro
                              </label>
                              <input
                                required
                                type="text"
                                value={nfeForm.logradouro}
                                onChange={(e) =>
                                  setNfeForm({
                                    ...nfeForm,
                                    logradouro: e.target.value,
                                  })
                                }
                                placeholder="Rua, Av..."
                                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                                Número / Comp.
                              </label>
                              <input
                                required
                                type="text"
                                value={nfeForm.numero}
                                onChange={(e) =>
                                  setNfeForm({
                                    ...nfeForm,
                                    numero: e.target.value,
                                  })
                                }
                                placeholder="Nº, Apto..."
                                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                                Bairro
                              </label>
                              <input
                                required
                                type="text"
                                value={nfeForm.bairro}
                                onChange={(e) =>
                                  setNfeForm({
                                    ...nfeForm,
                                    bairro: e.target.value,
                                  })
                                }
                                placeholder="Bairro"
                                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                                Cidade
                              </label>
                              <input
                                required
                                type="text"
                                value={nfeForm.cidade}
                                onChange={(e) =>
                                  setNfeForm({
                                    ...nfeForm,
                                    cidade: e.target.value,
                                  })
                                }
                                placeholder="Cidade"
                                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                              />
                            </div>
                            <div className="md:col-span-1">
                              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                                UF
                              </label>
                              <input
                                required
                                type="text"
                                value={nfeForm.uf}
                                onChange={(e) =>
                                  setNfeForm({ ...nfeForm, uf: e.target.value })
                                }
                                placeholder="UF"
                                maxLength="2"
                                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 uppercase"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* BLOCO 3 — CLASSIFICAÇÃO DO SERVIÇO (NOVO) */}
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                      <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Tag size={18} /> Classificação do Serviço
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                            Código Tributação Nacional{" "}
                            <span className="text-blue-500">(LC 116/2003)</span>
                          </label>
                          <input
                            type="text"
                            value={nfeForm.codTributNacional}
                            onChange={(e) =>
                              setNfeForm({
                                ...nfeForm,
                                codTributNacional: e.target.value,
                              })
                            }
                            placeholder="Ex.: 01.01.00"
                            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                            Código NBS{" "}
                            <span className="text-blue-500">
                              (obrig. desde 13/01/2026)
                            </span>
                          </label>
                          <input
                            type="text"
                            value={nfeForm.codigoNbs}
                            onChange={(e) =>
                              setNfeForm({
                                ...nfeForm,
                                codigoNbs: e.target.value,
                              })
                            }
                            placeholder="Ex.: 1.0101.00.00"
                            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                            CNAE
                          </label>
                          <input
                            type="text"
                            value={nfeForm.cnae}
                            onChange={(e) =>
                              setNfeForm({ ...nfeForm, cnae: e.target.value })
                            }
                            placeholder="Ex.: 6201-5/00"
                            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* BLOCO 4 — VALORES E ISS */}
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                      <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <DollarSign size={18} /> Valores e ISS
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                            Discriminação do Serviço
                          </label>
                          <textarea
                            required
                            value={nfeForm.desc}
                            onChange={(e) =>
                              setNfeForm({ ...nfeForm, desc: e.target.value })
                            }
                            rows="3"
                            placeholder="Descreva o serviço prestado..."
                            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 resize-none"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                              Valor Bruto do Serviço (R$)
                            </label>
                            <input
                              required
                              type="number"
                              step="0.01"
                              value={nfeForm.valor}
                              onChange={(e) =>
                                setNfeForm({
                                  ...nfeForm,
                                  valor: e.target.value,
                                })
                              }
                              placeholder="0.00"
                              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                              Deduções / Descontos (R$)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={nfeForm.deducoes}
                              onChange={(e) =>
                                setNfeForm({
                                  ...nfeForm,
                                  deducoes: e.target.value,
                                })
                              }
                              placeholder="0.00"
                              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                              Alíquota ISS (%)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="2"
                              max="5"
                              value={nfeForm.aliquotaIss}
                              onChange={(e) =>
                                setNfeForm({
                                  ...nfeForm,
                                  aliquotaIss: e.target.value,
                                })
                              }
                              placeholder="Ex.: 3.00"
                              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer pb-2.5">
                              <input
                                type="checkbox"
                                checked={nfeForm.issRetido}
                                onChange={(e) =>
                                  setNfeForm({
                                    ...nfeForm,
                                    issRetido: e.target.checked,
                                  })
                                }
                                className="w-4 h-4 rounded accent-blue-500"
                              />
                              ISS Retido pelo Tomador
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* BLOCO 5 — IBS / CBS (Reforma Tributária – transitório 2026) */}
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-amber-200 dark:border-amber-500/30">
                      <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                        <AlertTriangle size={18} /> IBS / CBS — Reforma
                        Tributária
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                        Campos obrigatórios por lei desde 01/01/2026 (LC
                        214/2025). Validações de rejeição temporariamente
                        suspensas em 2026 — preencha para garantir conformidade.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                            cIndOp — Indicador da Operação
                          </label>
                          <select
                            value={nfeForm.cIndOp}
                            onChange={(e) =>
                              setNfeForm({ ...nfeForm, cIndOp: e.target.value })
                            }
                            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500"
                          >
                            <option value="">Selecione...</option>
                            <option value="1">1 – Operação com IBS/CBS</option>
                            <option value="2">
                              2 – Operação isenta de IBS/CBS
                            </option>
                            <option value="3">
                              3 – Operação imune de IBS/CBS
                            </option>
                            <option value="4">
                              4 – Operação não sujeita a IBS/CBS
                            </option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                            cClassTrib — Classificação Tributária
                          </label>
                          <input
                            type="text"
                            value={nfeForm.cClassTrib}
                            onChange={(e) =>
                              setNfeForm({
                                ...nfeForm,
                                cClassTrib: e.target.value,
                              })
                            }
                            placeholder="Ex.: 00 (conforme tabela CGNFS-e)"
                            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* BLOCO 6 — RETENÇÕES FEDERAIS */}
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                      <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Percent size={18} /> Retenções Federais (se aplicável)
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: "IR (%)", key: "retIr" },
                          { label: "PIS (%)", key: "retPis" },
                          { label: "COFINS (%)", key: "retCofins" },
                          { label: "CSLL (%)", key: "retCsll" },
                        ].map(({ label, key }) => (
                          <div key={key}>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                              {label}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={nfeForm[key]}
                              onChange={(e) =>
                                setNfeForm({
                                  ...nfeForm,
                                  [key]: e.target.value,
                                })
                              }
                              placeholder="0.00"
                              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isEmitting}
                      className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 mt-4 transition-all ${isEmitting ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 active:scale-95"}`}
                    >
                      {isEmitting ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Send size={20} />
                      )}
                      {isEmitting
                        ? "Transmitindo DPS ao ADN..."
                        : "Transmitir DPS — Padrão Nacional 2026"}
                    </button>
                  </form>
                )}

                {nfeTab === "historico" && (
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-b-xl shadow-lg border border-slate-200 dark:border-slate-700">
                    {nfeHistorico.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                        <p className="mb-4">
                          Nenhuma nota foi emitida nesta sessão.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {nfeHistorico.map((nota) => (
                          <div
                            key={nota.id}
                            className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-start md:items-center gap-4 group"
                          >
                            <div className="flex-1 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                    Chave:{" "}
                                    {nota.chaveNacional ?? nota.protocolo}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 font-bold uppercase">
                                    {nota.status}
                                  </span>
                                  {nota.issRetido && (
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 font-bold uppercase">
                                      ISS Retido
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                  {nota.cliente}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  Nota Nº {nota.numero || "—"}
                                </p>
                              </div>
                              <div className="text-left md:text-right">
                                <p className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                                  R${" "}
                                  {parseFloat(nota.valor).toLocaleString(
                                    "pt-BR",
                                    { minimumFractionDigits: 2 },
                                  )}
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                  {formatarDataVisivel(nota.data)}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 items-center justify-end w-full md:w-auto pt-3 md:pt-0 mt-3 md:mt-0 border-t md:border-t-0 border-slate-200 dark:border-slate-700 shrink-0 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => visualizarNota(nota)}
                                className="p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                                title="Visualizar Nota"
                              >
                                <Eye size={18} />
                              </button>
                              <button
                                onClick={() => baixarNota(nota)}
                                className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                title="Baixar PDF"
                              >
                                <Download size={18} />
                              </button>
                              <button
                                onClick={() => abrirEdicaoNota(nota)}
                                className="p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/50 rounded-lg transition-colors"
                                title="Editar Informações"
                              >
                                <Edit size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {nfeTab === "import_export" && (
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-b-xl shadow-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                      Importar e Exportar Notas Fiscais
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">
                          Exportar Notas
                        </h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                          Baixe o histórico de notas fiscais geradas nesta
                          sessão em formato planilha.
                        </p>
                        <button
                          onClick={exportarNotasHistory}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors"
                        >
                          <Download size={18} className="mr-2" /> Exportar Excel
                          (.xlsx)
                        </button>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">
                          Importar Notas
                        </h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                          Adicione notas fiscais geradas anteriormente subindo
                          um arquivo PDF (DANFSe).
                        </p>
                        <div className="flex flex-wrap gap-3">
                          <label className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors cursor-pointer w-fit">
                            <Upload size={18} className="mr-2" /> PDF DANFSe
                            (.pdf)
                            <input
                              type="file"
                              accept=".pdf"
                              className="hidden"
                              onChange={importarNotaPdfHistory}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          {/* ECRÃ 7: GESTOR DE EXTRATOS (INCLUIR) */}
          {currentView === "gestor-add" && hasAccess("gestor") && (
            <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-4 duration-500 pb-20">
              <header className="mb-8 border-b border-slate-200 dark:border-slate-700 pb-4">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 flex items-center">
                  <FolderTree className="mr-3 text-amber-500" />
                  Arquivar Novo Extrato
                </h2>
                <p className="text-slate-500 dark:text-slate-400">
                  Guarde ficheiros no Gestor organizados por data e parceiro.
                </p>
              </header>
              <form
                onSubmit={handleSubmitExtrato}
                onInvalid={(e) => e.currentTarget.classList.add("show-errors")}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-xl space-y-6 transition-colors duration-200"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      Ano
                    </label>
                    <input
                      type="number"
                      value={formData.ano}
                      onChange={(e) => {
                        setFormData({ ...formData, ano: e.target.value });
                        setFormError("");
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      Mês
                    </label>
                    <select
                      value={formData.mes}
                      onChange={(e) => {
                        setFormData({ ...formData, mes: e.target.value });
                        setFormError("");
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    >
                      {MESES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      Categoria
                    </label>
                    <select
                      value={formData.categoria}
                      onChange={(e) => {
                        setFormData({ ...formData, categoria: e.target.value });
                        setFormError("");
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    >
                      {CATEGORIAS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      Empresa (Pasta)
                    </label>
                    <select
                      disabled
                      value={formData.empresa || nomeEmpresa}
                      onChange={(e) =>
                        setFormData({ ...formData, empresa: e.target.value })
                      }
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-500 dark:text-slate-400 focus:outline-none cursor-not-allowed"
                    >
                      <option value={nomeEmpresa}>{nomeEmpresa}</option>
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-1">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      Cód. Operadora
                    </label>
                    {formData.codigoOperadora === "AMIL" ? (
                      <select
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={formData.codOperadora || ""}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            codOperadora: e.target.value,
                          });
                          setFormError("");
                        }}
                      >
                        <option value="">Selecione a Pasta</option>
                        <option value="139491">139491</option>
                        <option value="162191">162191</option>
                        <option value="224138">224138</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="Módulo opcional"
                        value={formData.codOperadora || ""}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            codOperadora: e.target.value,
                          });
                          setFormError("");
                        }}
                      />
                    )}
                  </div>
                  <div className="space-y-2 md:col-span-1">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      Op. | Seg.
                    </label>
                    <select
                      required
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={formData.codigoOperadora || ""}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          codigoOperadora: e.target.value,
                        });
                        setFormError("");
                      }}
                    >
                      <option value="">Selecione uma Op. | Seg.</option>
                      {(!formData.categoria || formData.categoria === "Operadoras") && (
                        <optgroup label="Operadoras">
                          {combinedOperadoras.map((op) => (
                            <option key={op} value={op}>
                              {op}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {(!formData.categoria || formData.categoria === "Seguradoras") && (
                        <optgroup label="Seguradoras">
                          {combinedSeguradoras.map((seg) => (
                            <option key={seg} value={seg}>
                              {seg}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <option value="OUTRA" className="font-bold text-blue-600">
                        Outra Op. | Seg.
                      </option>
                    </select>
                    {formData.codigoOperadora === "OUTRA" && (
                      <div className="mt-2 text-sm text-slate-500">
                        Aviso: Será salva automaticamente na lista para uso
                        futuro.
                        <input
                          required
                          type="text"
                          placeholder="Digite o nome da Op. | Seg."
                          className="uppercase w-full mt-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={formData.codigoOperadoraOutra || ""}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              codigoOperadoraOutra:
                                e.target.value.toUpperCase(),
                            });
                            setFormError("");
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    Ficheiros Anexos
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750 hover:border-blue-500 transition-colors mb-4"
                  >
                    <Layers size={24} className="text-slate-400 mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-300">
                      Clique para anexar os extratos (PDF, Excel, TXT)
                    </p>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const newFiles = Array.from(e.target.files).map((file, idx) => {
                        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                        let parceiroStr = nameWithoutExt;
                        let notaFiscalStr = "";
                        if (nameWithoutExt.includes(",")) {
                          const parts = nameWithoutExt.split(",");
                          parceiroStr = parts[0].trim();
                          notaFiscalStr = parts.slice(1).join(",").replace(/\D/g, "");
                        }
                        return {
                          file,
                          notaFiscal: notaFiscalStr,
                          parceiro: parceiroStr
                        };
                      });
                      if (newFiles.length > 0) {
                        setFormData((prev) => ({
                          ...prev,
                          arquivos: [...prev.arquivos, ...newFiles],
                        }));
                        setFormError("");
                      }
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="hidden"
                    multiple
                    accept=".pdf,.txt,.csv,.xlsx,.xls"
                  />
                  {formData.arquivos.length > 0 && (
                    <div className="mt-4 space-y-4">
                      {formData.arquivos.map((arq, i) => (
                        <div
                          key={i}
                          className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold block text-slate-700 dark:text-slate-300 truncate">
                              <span className="text-emerald-500 font-extrabold">Anexo {i + 1}:</span> {arq.file.name}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  arquivos: prev.arquivos.filter((_, idx) => idx !== i),
                                }))
                              }
                              className="text-rose-500 dark:text-rose-400 hover:text-rose-700 p-1"
                            >
                              <X size={18} />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                Nota Fiscal Vinculada
                              </label>
                              <input
                                type="text"
                                list="historico-notas-list"
                                value={arq.notaFiscal}
                                onChange={(e) => {
                                  let newArqs = [...formData.arquivos];
                                  newArqs[i] = { ...newArqs[i], notaFiscal: e.target.value.replace(/\D/g, "") };
                                  setFormData({ ...formData, arquivos: newArqs });
                                  setFormError("");
                                }}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                                placeholder="Selecione ou digite a NF..."
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                Nome do Arquivo
                              </label>
                              <input
                                type="text"
                                value={arq.parceiro}
                                onChange={(e) => {
                                  let newArqs = [...formData.arquivos];
                                  newArqs[i] = { ...newArqs[i], parceiro: e.target.value };
                                  setFormData({ ...formData, arquivos: newArqs });
                                  setFormError("");
                                }}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                                placeholder="Ex: Extrato Amil Mensal..."
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <datalist id="historico-notas-list">
                    {nfeHistorico.map((nf) => {
                      const displayVal = nf.numero || nf.chaveNacional || nf.protocolo;
                      const displayStr = nf.numero
                        ? `NF Nº ${nf.numero}`
                        : `Chave: ${nf.chaveNacional || nf.protocolo}`;
                      return (
                        <option key={nf.id} value={displayVal}>
                          {displayStr} - {nf.cliente}
                        </option>
                      );
                    })}
                  </datalist>

                </div>
                {formError && (
                  <p className="text-rose-500 dark:text-rose-400 text-sm font-medium">
                    {formError}
                  </p>
                )}
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <Save size={20} />
                  <span>Guardar Extrato no Banco</span>
                </button>
                {successMsg && (
                  <div className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 p-3 rounded-lg text-center font-bold">
                    {successMsg}
                  </div>
                )}
              </form>
            </div>
          )}

          {/* ECRÃ 8: GESTOR DE EXTRATOS (EXPLORAR) */}
          {currentView === "gestor-browse" && hasAccess("gestor") && (
            <div className="w-full px-4 xl:px-8 mx-auto animate-in fade-in duration-500 pb-20">
              <header className="mb-6 flex flex-col gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
                      <Database className="mr-3 text-indigo-500 dark:text-indigo-400" />
                      Gestor de Extratos
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                      Navegação segura pelos arquivos salvos internamente.
                    </p>
                  </div>
                  <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => setFileViewMode("grid")}
                      className={`p-2 rounded-md transition-colors ${fileViewMode === "grid" ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                    >
                      <LayoutGrid size={18} />
                    </button>
                    <button
                      onClick={() => setFileViewMode("list")}
                      className={`p-2 rounded-md transition-colors ${fileViewMode === "list" ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                    >
                      <List size={18} />
                    </button>
                  </div>
                </div>


                {/* Filtros para cada etapa e NF do extratos */}
                <div className="bg-slate-50 dark:bg-slate-800/20 p-4 rounded-xl border border-slate-200 dark:border-slate-700 w-full mt-1.5 shadow-sm space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="gestor-filter-etapa" className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <span>🏷️</span> Etapa (Categoria)
                      </label>
                      <div className="relative">
                        <select
                          id="gestor-filter-etapa"
                          value={gestorFilterEtapa}
                          onChange={(e) => {
                            setGestorFilterEtapa(e.target.value);
                            setGestorFilterOpSeg("");
                          }}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-850 dark:text-slate-100 text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500 transition-colors appearance-none pr-8 cursor-pointer h-[38px] font-medium shadow-xs"
                        >
                          <option value="">Todas as Etapas (Categorias)</option>
                          {CATEGORIAS.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="gestor-filter-opseg" className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <span>🏢</span> Op. | Seg. (Parceiro)
                      </label>
                      <div className="relative">
                        <select
                          id="gestor-filter-opseg"
                          value={gestorFilterOpSeg}
                          onChange={(e) => setGestorFilterOpSeg(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-850 dark:text-slate-100 text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500 transition-colors appearance-none pr-8 cursor-pointer h-[38px] font-medium shadow-xs"
                        >
                          <option value="">Todas as Op. / Seg.</option>
                          {(!gestorFilterEtapa || gestorFilterEtapa === "Operadoras") && (
                            <optgroup label="Operadoras">
                              {combinedOperadoras.map((op) => (
                                <option key={op} value={op}>
                                  {op}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {(!gestorFilterEtapa || gestorFilterEtapa === "Seguradoras") && (
                            <optgroup label="Seguradoras">
                              {combinedSeguradoras.map((seg) => (
                                <option key={seg} value={seg}>
                                  {seg}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="gestor-filter-nf" className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <span>📄</span> Nota Fiscal (NF)
                      </label>
                      <div className="relative">
                        <input
                          id="gestor-filter-nf"
                          type="text"
                          placeholder="Filtrar por NF..."
                          value={gestorFilterNf}
                          onChange={(e) => setGestorFilterNf(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500 transition-colors h-[38px] shadow-xs"
                        />
                        {gestorFilterNf && (
                          <button
                            type="button"
                            onClick={() => setGestorFilterNf("")}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="gestor-filter-ano" className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <span>📅</span> Ano
                      </label>
                      <div className="relative">
                        <select
                          id="gestor-filter-ano"
                          value={gestorFilterAno}
                          onChange={(e) => setGestorFilterAno(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-850 dark:text-slate-100 text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500 transition-colors appearance-none pr-8 cursor-pointer h-[38px] font-medium shadow-xs"
                        >
                          <option value="">Todos os Anos</option>
                          {[...new Set([String(new Date().getFullYear()), ...dbReports.map((r) => String(r.ano)).filter(Boolean)])].sort().map((yr) => (
                            <option key={yr} value={yr}>
                              {yr}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="gestor-filter-mes" className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <span>🗓️</span> Mês
                      </label>
                      <div className="relative">
                        <select
                          id="gestor-filter-mes"
                          value={gestorFilterMes}
                          onChange={(e) => setGestorFilterMes(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-850 dark:text-slate-100 text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500 transition-colors appearance-none pr-8 cursor-pointer h-[38px] font-medium shadow-xs"
                        >
                          <option value="">Todos os Meses</option>
                          {MESES.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="gestor-filter-data-extrato" className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <span>📅</span> Data (Extrato)
                      </label>
                      <div className="relative">
                        <input
                          id="gestor-filter-data-extrato"
                          type="date"
                          value={gestorFilterDataExtrato}
                          onChange={(e) => setGestorFilterDataExtrato(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500 transition-colors h-[38px] shadow-xs cursor-pointer"
                        />
                        {gestorFilterDataExtrato && (
                          <button
                            type="button"
                            onClick={() => setGestorFilterDataExtrato("")}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                      {(searchTerm || gestorReportsDateStart || gestorReportsDateEnd || gestorFilterEtapa || gestorFilterNf || gestorFilterOpSeg || gestorFilterAno || gestorFilterMes || gestorFilterDataExtrato) 
                        ? "Resultados filtrados ativamente" 
                        : "Navegue pelas pastas ou use os filtros acima para listar"}
                    </span>
                    {(searchTerm || gestorReportsDateStart || gestorReportsDateEnd || gestorFilterEtapa || gestorFilterNf || gestorFilterOpSeg || gestorFilterAno || gestorFilterMes || gestorFilterDataExtrato) ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm("");
                          setGestorReportsDateStart("");
                          setGestorReportsDateEnd("");
                          setGestorFilterEtapa("");
                          setGestorFilterNf("");
                          setGestorFilterOpSeg("");
                          setGestorFilterAno("");
                          setGestorFilterMes("");
                          setGestorFilterDataExtrato("");
                          setGestorPeriodLabel("Todo o período");
                        }}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 h-[38px] shadow-sm cursor-pointer"
                      >
                        <XCircle size={14} />
                        Limpar Todos os Filtros
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 italic pb-2 block text-left"></span>
                    )}
                  </div>
                </div>
                {getItemsAtCurrentPath().some(
                  (item) => item.type === "file",
                ) && (
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 items-center justify-between gap-2 flex-wrap mt-4">
                    <div className="flex gap-2">
                      <button
                        onClick={handleSelectAllExtratos}
                        className="text-xs bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-3 py-1.5 rounded flex items-center hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm"
                      >
                        <CheckCircle size={14} className="mr-1" />
                        {isAllExtratosSelected()
                          ? "Desmarcar Tudo"
                          : "Marcar Tudo"}
                      </button>
                      <button
                        onClick={handleExportSelectedExtratos}
                        disabled={selectedExtratos.length === 0}
                        className={`text-xs px-3 py-1.5 rounded flex items-center transition-colors shadow-sm ${selectedExtratos.length === 0 ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-transparent" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
                      >
                        <Download size={14} className="mr-1" />
                        Exportar selecionados ({selectedExtratos.length})
                      </button>
                      {selectedExtratos.length === 1 && (
                        <button
                          onClick={handleEditSelectedExtrato}
                          className="text-xs px-3 py-1.5 rounded flex items-center transition-colors shadow-sm bg-indigo-500 hover:bg-indigo-600 text-white"
                        >
                          <Edit2 size={14} className="mr-1" />
                          Editar selecionado (1)
                        </button>
                      )}
                      <button
                        onClick={() => setModalMoverExtratosOpen(true)}
                        disabled={selectedExtratos.length === 0}
                        className={`text-xs px-3 py-1.5 rounded flex items-center transition-colors shadow-sm ${selectedExtratos.length === 0 ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-transparent" : "bg-amber-500 hover:bg-amber-600 text-white"}`}
                      >
                        <FolderTree size={14} className="mr-1" />
                        Mover selecionados ({selectedExtratos.length})
                      </button>
                      <button
                        onClick={handleDeleteSelectedExtratos}
                        disabled={selectedExtratos.length === 0}
                        className={`text-xs px-3 py-1.5 rounded flex items-center transition-colors shadow-sm ${selectedExtratos.length === 0 ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-transparent" : "bg-rose-500 hover:bg-rose-600 text-white"}`}
                      >
                        <Trash2 size={14} className="mr-1" />
                        Excluir selecionados ({selectedExtratos.length})
                      </button>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      {selectedExtratos.length} extrato(s) selecionado(s) de{" "}
                      {
                        getItemsAtCurrentPath().filter(
                          (item) => item.type === "file",
                        ).length
                      }
                    </span>
                  </div>
                )}
              </header>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 p-3 rounded-lg mb-6 border border-slate-200 dark:border-slate-700 overflow-visible transition-colors">
                {/* Lado esquerdo: Breadcrumbs ou indicação de filtros ativos */}
                <div className="flex items-center space-x-2 overflow-x-auto whitespace-nowrap min-w-0 pr-2">
                  {!(
                    searchTerm ||
                    gestorReportsDateStart ||
                    gestorReportsDateEnd ||
                    gestorFilterEtapa ||
                    gestorFilterNf ||
                    gestorFilterOpSeg ||
                    gestorFilterAno ||
                    gestorFilterMes ||
                    gestorFilterDataExtrato
                  ) ? (
                    <>
                      {currentPath.length > 0 && (
                        <button
                          onClick={() => {
                            setCurrentPath(currentPath.slice(0, -1));
                            setSearchTerm("");
                          }}
                          className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white p-1 rounded transition-colors mr-1 shrink-0"
                          title="Voltar um nível"
                        >
                          <ArrowLeft size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setCurrentPath([]);
                          setSearchTerm("");
                        }}
                        className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center shrink-0 font-medium"
                      >
                        <Home size={14} className="mr-1" /> Raiz
                      </button>
                      {currentPath.map((folder, index) => (
                        <React.Fragment key={index}>
                          <ChevronRight size={14} className="shrink-0 text-slate-400" />
                          <button
                            onClick={() => {
                              setCurrentPath(currentPath.slice(0, index + 1));
                              setSearchTerm("");
                            }}
                            className="hover:text-blue-600 dark:hover:text-blue-400 font-medium shrink-0"
                          >
                            {folder}
                          </button>
                        </React.Fragment>
                      ))}
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2.5 py-1 rounded-md font-semibold border border-blue-100 dark:border-blue-900/50">
                      <span>⚡</span> Filtros Ativos
                    </div>
                  )}
                </div>

                {/* Lado direito: Filtro dos períodos */}
                <div className="flex flex-wrap items-center gap-2 relative">
                  <div className="relative z-30">
                    <button
                      onClick={() =>
                        setShowGestorPeriodMenu(!showGestorPeriodMenu)
                      }
                      className="flex items-center justify-between w-[160px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 transition-colors h-[32px] font-semibold"
                    >
                      <span className="truncate">📅 {gestorPeriodLabel}</span>
                      <ChevronDown size={12} className="ml-1 text-slate-400 shrink-0" />
                    </button>
                    {showGestorPeriodMenu && (
                      <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg overflow-hidden text-sm animate-in fade-in slide-in-from-top-1 z-50">
                        <ul className="flex flex-col py-1">
                          {[
                            "Hoje",
                            "Esta semana",
                            "Mês passado",
                            "Este mês",
                            "Próximo mês",
                            "Todo o período",
                            "Escolha o período",
                          ].map((preset) => (
                            <li key={preset}>
                              <button
                                onClick={() => {
                                  applyGestorDatePreset(preset);
                                  setShowGestorPeriodMenu(false);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors font-medium"
                              >
                                {preset}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {gestorPeriodLabel === "Escolha o período" && (
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/50 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                      <input
                        type="date"
                        value={gestorReportsDateStart}
                        onChange={(e) =>
                          setGestorReportsDateStart(e.target.value)
                        }
                        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-slate-900 dark:text-slate-200 outline-none focus:border-blue-500 h-[24px]"
                      />
                      <span className="text-slate-400 text-[10px]">a</span>
                      <input
                        type="date"
                        value={gestorReportsDateEnd}
                        onChange={(e) =>
                          setGestorReportsDateEnd(e.target.value)
                        }
                        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-slate-900 dark:text-slate-200 outline-none focus:border-blue-500 h-[24px]"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div
                className={
                  fileViewMode === "grid"
                    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                    : "flex flex-col gap-2"
                }
              >
                {getItemsAtCurrentPath().map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleNavigate(item)}
                    className={
                      fileViewMode === "grid"
                        ? `relative p-4 rounded-xl border cursor-pointer flex flex-col items-center text-center space-y-3 transition-colors group ${item.type === "folder" ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-white" : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 hover:bg-white dark:hover:bg-white"}`
                        : `relative p-3 rounded-lg border cursor-pointer flex flex-row items-center space-x-4 transition-colors group ${item.type === "folder" ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-white" : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 hover:bg-white dark:hover:bg-white"}`
                    }
                  >
                    {item.type === "file" && (
                      <div
                        className={`absolute z-10 ${fileViewMode === "grid" ? "top-3 left-3" : "top-1/2 -translate-y-1/2 left-3"}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedExtratos.includes(item.id)}
                          onChange={(e) =>
                            handleToggleSelectExtrato(e, item.id)
                          }
                          className="w-4 h-4 cursor-pointer text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
                        />
                      </div>
                    )}
                    <div
                      className={`p-2 rounded-full ${fileViewMode !== "grid" && item.type === "file" ? "ml-6" : ""} ${item.type === "folder" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-100 group-hover:text-blue-600 dark:group-hover:bg-blue-100 dark:group-hover:text-blue-600" : "bg-slate-100 dark:bg-slate-700 " + getFileColorClass(item.fileName) + " group-hover:bg-slate-100 dark:group-hover:bg-slate-100"}`}
                    >
                      {item.type === "folder" ? (
                        <Folder size={24} />
                      ) : (item.fileName || "")
                          .toLowerCase()
                          .endsWith("pdf") ? (
                        <FileText
                          size={24}
                          className="group-hover:text-slate-600 dark:group-hover:text-slate-600"
                        />
                      ) : (
                        <FileSpreadsheet
                          size={24}
                          className="group-hover:text-slate-600 dark:group-hover:text-slate-600"
                        />
                      )}
                    </div>
                    <div
                      className={
                        fileViewMode === "grid" ? "w-full text-center" : "flex-1 min-w-0 text-left"
                      }
                    >
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-slate-900 dark:group-hover:text-slate-900">
                        {item.name}
                      </p>
                      {item.pathInfo && (
                        <p className="text-[10px] text-slate-400 truncate mt-1 group-hover:text-slate-500 dark:group-hover:text-slate-500">
                          {item.pathInfo}
                        </p>
                      )}
                      {item.type === "file" && (
                        <div className={`flex flex-wrap gap-1 mt-1.5 ${fileViewMode === "grid" ? "justify-center" : "justify-start"}`}>
                          {item.categoria && (
                            <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              🏷️ {item.categoria}
                            </span>
                          )}
                          {item.codigoOperadora && (
                            <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              🏢 {item.codigoOperadora}
                            </span>
                          )}
                          {item.notaFiscal && (
                            <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              📄 NF: {item.notaFiscal}
                            </span>
                          )}
                          {item.ano && (
                            <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              📅 {item.ano}
                            </span>
                          )}
                          {item.mes && (
                            <span className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              🗓️ {item.mes}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {getItemsAtCurrentPath().length === 0 && (
                  <div
                    className={
                      fileViewMode === "grid"
                        ? "col-span-full py-12 text-center text-slate-500 font-medium"
                        : "py-12 w-full text-center text-slate-500 font-medium"
                    }
                  >
                    Pasta Vazia ou Sem Resultados.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ECRÃ 9: CONTROLE DE ACESSOS */}
          {currentView === "usuarios" && hasAccess("usuarios") && (
            <div className="max-w-5xl mx-auto animate-in fade-in duration-500 pb-20">
              <header className="mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
                  <Shield className="mr-3 text-indigo-500" /> Controle de
                  Acessos e Usuários
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  Gerencie quem pode acessar o sistema e quais abas podem ver.
                </p>
              </header>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md mb-6 flex justify-between items-center transition-colors">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Total de usuários:{" "}
                  <strong className="text-slate-900 dark:text-white">
                    {usersList.length}
                  </strong>
                </div>
                <button
                  onClick={() => abrirModalUsuario()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded font-bold flex items-center shadow transition-colors text-sm"
                >
                  <Plus size={16} className="mr-2" /> Novo Usuário
                </button>
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-x-auto transition-colors duration-200">
                <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                  <thead>
                    <tr className="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750/50 transition-colors duration-200">
                      <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                        Usuário (Login)
                      </th>
                      <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                        Perfil de Acesso
                      </th>
                      <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                        Acessos Permitidos
                      </th>
                      <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-center">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-750/50 transition-colors"
                      >
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center">
                          <User size={16} className="mr-2 text-slate-400" />
                          {user.username}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-md text-xs font-bold ${user.role === "admin" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300" : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"}`}
                          >
                            {user.role === "admin"
                              ? "Administrador"
                              : "Usuário Padrão"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                          {user.role === "admin"
                            ? "Acesso Total"
                            : `${(user.permissions || []).length} Módulos`}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => abrirModalUsuario(user)}
                              className="text-amber-500 hover:text-amber-400 bg-amber-100 dark:bg-amber-400/10 p-1.5 rounded transition-colors"
                              title="Editar Usuário"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => apagarUsuario(user)}
                              className="text-rose-500 hover:text-rose-400 bg-rose-100 dark:bg-rose-400/10 p-1.5 rounded transition-colors"
                              title="Apagar Usuário"
                            >
                              <Trash2 size={16} />
                            </button>
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
          {currentView === "settings" && hasAccess("settings") && (
            <div className="max-w-3xl mx-auto animate-in slide-in-from-right-4 duration-500 pb-20">
              <header className="mb-8 border-b border-slate-200 dark:border-slate-700 pb-4">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
                  <Settings className="mr-3 text-slate-500 dark:text-slate-400" />
                  Configurações & Backup
                </h2>
              </header>
              <div className="grid gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-emerald-100 dark:bg-emerald-500/20 p-2 rounded-lg">
                      <Save className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                        Criar Backup de Segurança (Cloud)
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Exporta os dados armazenados no Supabase para o seu PC.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <button
                      onClick={async () => {
                        if (
                          clientes.length === 0 &&
                          savedReportsList.length === 0 &&
                          vendasList.length === 0
                        )
                          return showAlert(
                            "Não existem dados suficientes para backup.",
                          );
                        setLoading(true);
                        setLoadingMsg("A gerar Backup Geral Supabase...");
                        try {
                          const zip = new JSZip();
                          zip.file(
                            "clientes.json",
                            JSON.stringify(clientes, null, 2),
                          );
                          zip.file(
                            "historico_relatorios.json",
                            JSON.stringify(savedReportsList, null, 2),
                          );
                          zip.file(
                            "vendas_servicos.json",
                            JSON.stringify(vendasList, null, 2),
                          );
                          zip.file(
                            "utilizadores.json",
                            JSON.stringify(
                              usersList.map((u) => ({
                                username: u.username,
                                role: u.role,
                              })),
                              null,
                              2,
                            ),
                          );
                          zip.file(
                            "arquivos_extratos.json",
                            JSON.stringify(dbReports, null, 2),
                          );

                          const content = await zip.generateAsync({
                            type: "blob",
                          });
                          const url = URL.createObjectURL(content);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `DonGestao_BackupGeral_${dataDeHojeInterna()}.zip`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                          showAlert("Backup transferido com sucesso!");
                        } catch (err) {
                          showAlert("Erro ao gerar ZIP: " + err.message);
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="p-4 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg flex items-center justify-center border border-slate-300 dark:border-slate-600 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors text-slate-800 dark:text-white"
                    >
                      <Download size={20} className="mr-2" />
                      <span className="font-bold">
                        Baixar Arquivo .ZIP Completo
                      </span>
                    </button>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-blue-100 dark:bg-blue-500/20 p-2 rounded-lg">
                      <History className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                        Restaurar Backup (Cloud)
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Restaure os dados de um dos 10 últimos backups
                        automáticos.
                      </p>
                    </div>
                    <button
                      onClick={fetchBackups}
                      className="ml-auto p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <RefreshCw
                        size={18}
                        className={loadingBackups ? "animate-spin" : ""}
                      />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {loadingBackups ? (
                      <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center p-4">
                        Carregando lista de backups...
                      </div>
                    ) : backupList.length === 0 ? (
                      <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                        Nenhum backup encontrado na nuvem para esta loja.
                      </div>
                    ) : (
                      backupList.map((backup) => (
                        <div
                          key={backup.id}
                          className={`flex items-center justify-between p-3 bg-white border border-slate-200 dark:border-slate-300 rounded-lg ${backup.id === "error" ? "border-red-400" : "hover:border-blue-400"} transition-colors`}
                        >
                          <div>
                            <p
                              className={`text-sm font-bold ${backup.id === "error" ? "text-red-600" : "text-black"}`}
                            >
                              {backup.name.replace("backups/", "")}
                            </p>
                            <p className="text-xs text-slate-600">
                              Criado em:{" "}
                              {new Date(backup.created_at).toLocaleString()}
                            </p>
                          </div>
                          {backup.id !== "error" && (
                            <button
                              onClick={() =>
                                handleRestoreBackup(
                                  backup.name.replace("backups/", ""),
                                )
                              }
                              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center transition-colors shadow-sm"
                            >
                              <RefreshCw size={14} className="mr-1.5" />
                              Restaurar
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors animate-in fade-in duration-300">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-indigo-100 dark:bg-indigo-500/20 p-2 rounded-lg">
                      <RefreshCw className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                        Sincronização de Metadados Amil
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Força a atualização de todas as colunas de "Vendedor/Corretor" e "Vitalício" no banco de dados baseado na planilha mestre (PDF).
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <button
                      onClick={() => runMetadataMigration(true)}
                      className="p-4 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg flex items-center justify-center border border-slate-300 dark:border-slate-600 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors text-slate-800 dark:text-white"
                    >
                      <RefreshCw size={20} className="mr-2 text-indigo-500 animate-spin" style={{ animationDuration: '3s' }} />
                      <span className="font-bold">
                        Sincronizar Banco de Dados Agora
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {modalMoverExtratosOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-md relative mx-4 transition-colors">
                <button
                  onClick={() => setModalMoverExtratosOpen(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="mb-4 border-b border-slate-200 dark:border-slate-700 pb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                    <FolderTree className="mr-2 text-amber-500" /> Mover
                    Extratos
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Selecione o diretório de destino para{" "}
                    {selectedExtratos.length} extrato(s).
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Empresa
                    </label>
                    <select
                      value={moverExtratosForm.empresa}
                      onChange={(e) =>
                        setMoverExtratosForm({
                          ...moverExtratosForm,
                          empresa: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    >
                      {empresasList.map((e) => (
                        <option key={e.nome} value={e.nome}>
                          {e.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Ano
                    </label>
                    <input
                      type="number"
                      min="2000"
                      max="2100"
                      value={moverExtratosForm.ano}
                      onChange={(e) =>
                        setMoverExtratosForm({
                          ...moverExtratosForm,
                          ano: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Mês
                    </label>
                    <select
                      value={moverExtratosForm.mes}
                      onChange={(e) =>
                        setMoverExtratosForm({
                          ...moverExtratosForm,
                          mes: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    >
                      {MESES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Categoria
                    </label>
                    <select
                      value={moverExtratosForm.categoria}
                      onChange={(e) =>
                        setMoverExtratosForm({
                          ...moverExtratosForm,
                          categoria: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    >
                      {CATEGORIAS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      Op. | Seg.
                    </label>
                    <select
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={moverExtratosForm.codigoOperadora || ""}
                      onChange={(e) => {
                        setMoverExtratosForm({
                          ...moverExtratosForm,
                          codigoOperadora: e.target.value,
                        });
                      }}
                    >
                      <option value="">Selecione uma Op. | Seg.</option>
                      {(!moverExtratosForm.categoria || moverExtratosForm.categoria === "Operadoras") && (
                        <optgroup label="Operadoras">
                          {combinedOperadoras.map((op) => (
                            <option key={op} value={op}>
                              {op}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {(!moverExtratosForm.categoria || moverExtratosForm.categoria === "Seguradoras") && (
                        <optgroup label="Seguradoras">
                          {combinedSeguradoras.map((seg) => (
                            <option key={seg} value={seg}>
                              {seg}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <option value="OUTRA" className="font-bold text-blue-600">
                        Outra Op. | Seg.
                      </option>
                    </select>

                    {moverExtratosForm.codigoOperadora === "OUTRA" && (
                      <div className="mt-2 text-sm text-slate-500">
                        Aviso: Será salva automaticamente na lista para uso
                        futuro.
                        <input
                          type="text"
                          placeholder="Digite o nome da Op. | Seg."
                          className="uppercase w-full mt-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={moverExtratosForm.codigoOperadoraOutra || ""}
                          onChange={(e) => {
                            setMoverExtratosForm({
                              ...moverExtratosForm,
                              codigoOperadoraOutra:
                                e.target.value.toUpperCase(),
                            });
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      Cód. Operadora
                    </label>
                    {moverExtratosForm.codigoOperadora === "AMIL" ? (
                      <select
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={moverExtratosForm.codOperadora || ""}
                        onChange={(e) => {
                          setMoverExtratosForm({
                            ...moverExtratosForm,
                            codOperadora: e.target.value,
                          });
                        }}
                      >
                        <option value="">Selecione código AMS</option>
                        <option value="139491">139491</option>
                        <option value="162191">162191</option>
                        <option value="224138">224138</option>
                        {customOpSeg?.codigosAmil?.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="Módulo opcional"
                        value={moverExtratosForm.codOperadora || ""}
                        onChange={(e) => {
                          setMoverExtratosForm({
                            ...moverExtratosForm,
                            codOperadora: e.target.value,
                          });
                        }}
                      />
                    )}
                  </div>
                </div>
                <div className="flex justify-end mt-6 gap-3">
                  <button
                    onClick={() => setModalMoverExtratosOpen(false)}
                    className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded font-bold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveMoverExtratos}
                    disabled={loading}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded font-bold transition-colors disabled:opacity-50"
                  >
                    Confirmar Movimentação
                  </button>
                </div>
              </div>
            </div>
          )}

          {modalEditarExtratoOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-md relative mx-4 transition-colors">
                <button
                  onClick={() => setModalEditarExtratoOpen(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="mb-4 border-b border-slate-200 dark:border-slate-700 pb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                    <Edit2 className="mr-2 text-indigo-500" /> Editar Extrato
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Altere as informações salvas do extrato selecionado.
                  </p>
                </div>
                <form
                  onSubmit={saveEditarExtrato}
                  onInvalid={(e) =>
                    e.currentTarget.classList.add("show-errors")
                  }
                  className="space-y-4"
                >
                  <div className="space-y-2 md:col-span-1">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      Op. | Seg.
                    </label>
                    <select
                      required
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={editarExtratoForm.codigoOperadora || ""}
                      onChange={(e) => {
                        setEditarExtratoForm({
                          ...editarExtratoForm,
                          codigoOperadora: e.target.value,
                        });
                        setFormError("");
                      }}
                    >
                      <option value="">Selecione uma Op. | Seg.</option>
                      {(!editarExtratoForm.categoria || editarExtratoForm.categoria === "Operadoras") && (
                        <optgroup label="Operadoras">
                          {combinedOperadoras.map((op) => (
                            <option key={op} value={op}>
                              {op}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {(!editarExtratoForm.categoria || editarExtratoForm.categoria === "Seguradoras") && (
                        <optgroup label="Seguradoras">
                          {combinedSeguradoras.map((seg) => (
                            <option key={seg} value={seg}>
                              {seg}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <option value="OUTRA" className="font-bold text-blue-600">
                        Outra Op. | Seg.
                      </option>
                    </select>

                    {editarExtratoForm.codigoOperadora === "OUTRA" && (
                      <div className="mt-2 text-sm text-slate-500">
                        Aviso: Será salva automaticamente na lista para uso
                        futuro.
                        <input
                          required
                          type="text"
                          placeholder="Digite o nome da Op. | Seg."
                          className="uppercase w-full mt-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={editarExtratoForm.codigoOperadoraOutra || ""}
                          onChange={(e) => {
                            setEditarExtratoForm({
                              ...editarExtratoForm,
                              codigoOperadoraOutra:
                                e.target.value.toUpperCase(),
                            });
                            setFormError("");
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 md:col-span-1">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      Cód. Operadora
                    </label>
                    {editarExtratoForm.codigoOperadora === "AMIL" ? (
                      <select
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={editarExtratoForm.codOperadora || ""}
                        onChange={(e) => {
                          setEditarExtratoForm({
                            ...editarExtratoForm,
                            codOperadora: e.target.value,
                          });
                          setFormError("");
                        }}
                      >
                        <option value="">Selecione a Pasta</option>
                        <option value="139491">139491</option>
                        <option value="162191">162191</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="Módulo opcional"
                        value={editarExtratoForm.codOperadora || ""}
                        onChange={(e) => {
                          setEditarExtratoForm({
                            ...editarExtratoForm,
                            codOperadora: e.target.value,
                          });
                          setFormError("");
                        }}
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nota Fiscal
                    </label>
                    <input
                      type="text"
                      list="historico-notas-list"
                      value={editarExtratoForm.notaFiscal || ""}
                      onChange={(e) => {
                        setEditarExtratoForm({
                          ...editarExtratoForm,
                          notaFiscal: e.target.value,
                        });
                        setFormError("");
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                      placeholder="Selecione ou digite a NF..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-blue-600 dark:text-blue-400 mb-1">
                      Nome do Arquivo
                    </label>
                    <input
                      required
                      type="text"
                      value={editarExtratoForm.parceiro}
                      onChange={(e) => {
                        setEditarExtratoForm({
                          ...editarExtratoForm,
                          parceiro: e.target.value,
                        });
                        setFormError("");
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                      placeholder="Ex: Extrato Amil Mensal..."
                    />
                  </div>
                  <div className="flex justify-end mt-6 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setModalEditarExtratoOpen(false)}
                      className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded font-bold transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded font-bold transition-colors disabled:opacity-50"
                    >
                      Guardar Alterações
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Impressão (Avançado) */}
          {modalPrintOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-2xl relative mx-4 transition-colors max-h-[90vh] flex flex-col">
                <button
                  onClick={() => setModalPrintOpen(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="mb-4 border-b border-slate-200 dark:border-slate-700 pb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                    <Printer className="mr-2 text-emerald-500" /> Configurar
                    Impressão de Relatório
                  </h3>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                        Título do Relatório
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-500 whitespace-nowrap bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600">
                          Relatório -
                        </span>
                        <input
                          type="text"
                          value={reportTitleSuffix}
                          onChange={(e) => setReportTitleSuffix(e.target.value)}
                          placeholder="Adicionar complemento..."
                          className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                        Período de Referência
                      </label>
                      <input
                        type="text"
                        value={reportPeriod}
                        onChange={(e) => setReportPeriod(e.target.value)}
                        placeholder="Ex: 01/02/2026 à 28/02/2026"
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 text-slate-900 dark:text-white w-full"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                        Formato da Folha
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                          <input
                            type="radio"
                            value="portrait"
                            checked={printConfig.orientation === "portrait"}
                            onChange={(e) =>
                              setPrintConfig({
                                ...printConfig,
                                orientation: e.target.value,
                              })
                            }
                            className="accent-emerald-500 w-4 h-4"
                          />{" "}
                          Retrato
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                          <input
                            type="radio"
                            value="landscape"
                            checked={printConfig.orientation === "landscape"}
                            onChange={(e) =>
                              setPrintConfig({
                                ...printConfig,
                                orientation: e.target.value,
                              })
                            }
                            className="accent-emerald-500 w-4 h-4"
                          />{" "}
                          Paisagem
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                        Escala de Redução (%)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="30"
                          max="200"
                          value={printConfig.scale}
                          onChange={(e) =>
                            setPrintConfig({
                              ...printConfig,
                              scale: Number(e.target.value),
                            })
                          }
                          className="w-20 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-sm focus:border-emerald-500 outline-none text-slate-900 dark:text-white text-center font-bold"
                        />
                        <span className="text-slate-500 dark:text-slate-400 font-bold">
                          %
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                        Resumo & Gráficos
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1 text-xs font-bold shadow-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
                        <input
                          type="checkbox"
                          checked={includeChartsInReport}
                          onChange={(e) => setIncludeChartsInReport(e.target.checked)}
                          className="accent-emerald-500 w-4 h-4 rounded cursor-pointer"
                        />
                        Incluir no Topo
                      </label>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Colunas a Imprimir
                      </h4>
                      <div className="flex gap-2">
                        <select
                          value={selectedPreset}
                          onChange={(e) => applyPrintPreset(e.target.value)}
                          className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs outline-none text-slate-900 dark:text-white font-medium"
                        >
                          <option value="">-- Personalizado / Padrão --</option>
                          {printPresets.map((p) => (
                            <option key={p.id || p.name} value={p.id || p.name}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        {selectedPreset && (
                          <button
                            onClick={() => deletePrintPreset(selectedPreset)}
                            className="text-rose-500 hover:text-rose-600 bg-rose-50 dark:bg-rose-900/30 px-2 rounded"
                            title="Apagar Seleção Guardada da Cloud"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700/50">
                      {Object.entries(printColLabels).map(([key, label]) => (
                        <label
                          key={key}
                          className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          <input
                            type="checkbox"
                            checked={printCols[key]}
                            onChange={(e) => {
                              setPrintCols({
                                ...printCols,
                                [key]: e.target.checked,
                              });
                              setSelectedPreset("");
                            }}
                            className="accent-blue-500 w-3.5 h-3.5 rounded"
                          />
                          {label}
                        </label>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">
                      <input
                        type="text"
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        placeholder="Nomeie esta seleção para gravar na nuvem..."
                        className="flex-1 bg-transparent text-sm outline-none text-slate-900 dark:text-white pl-2"
                      />
                      <button
                        onClick={savePrintPreset}
                        className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/80 px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-sm"
                      >
                        Gravar na Cloud
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setModalPrintOpen(false)}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded text-sm font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handlePrintConfirm}
                    className="px-4 py-2 bg-emerald-600 text-white rounded text-sm font-bold flex items-center shadow hover:bg-emerald-500 transition-colors"
                  >
                    <Printer size={16} className="mr-2" /> Gerar Impressão
                  </button>
                </div>
              </div>
            </div>
          )}

          {modalViewClienteOpen && clienteToView && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto relative mx-4">
                <button
                  type="button"
                  onClick={() => {
                    setModalViewClienteOpen(false);
                    setClienteToView(null);
                  }}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                      <User size={24} className="text-blue-500" />
                      Cliente #{clienteToView.codigo || clienteToView.id}
                      {clienteToView.situacao ? (
                        <span className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded ml-2">
                          Ativo
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded ml-2">
                          Inativo
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Criado em {formatarDataVisivel(clienteToView.dataCriacao)}
                    </p>
                  </div>
                  <div className="mt-4 md:mt-0">
                    <button
                      onClick={() => {
                        setModalViewClienteOpen(false);
                        abrirModalAddEdit(clienteToView);
                      }}
                      className="bg-amber-500 hover:bg-amber-400 text-white px-4 py-2 rounded-lg font-bold flex items-center shadow-md transition-colors text-sm"
                    >
                      <Edit size={16} className="mr-2" /> Editar Cadastro
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left Column: General Data */}
                  <div className="md:col-span-1 space-y-6 flex flex-col">
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-5 border border-slate-200 dark:border-slate-700 h-full">
                      <h4 className="font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2 mb-4 flex items-center">
                        <Edit size={16} className="mr-2" /> Dados gerais
                      </h4>
                      <div className="flex flex-col items-center mb-6">
                        <div className="w-24 h-24 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-400 mb-3 shadow-inner">
                          <User size={48} />
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-slate-900 dark:text-white text-lg">
                            {clienteToView.nome}
                          </p>
                          <p className="text-sm text-slate-500">
                            {clienteToView.tipo}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div className="flex flex-col">
                          <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase">
                            Nome/Razão Social:
                          </span>{" "}
                          <span className="font-medium text-slate-900 dark:text-white">
                            {clienteToView.nome || "-"}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase">
                            Documento:
                          </span>{" "}
                          <span className="font-medium text-slate-900 dark:text-white">
                            {clienteToView.documento || "-"}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase">
                            Operadora/Seguradora:
                          </span>{" "}
                          <span className="font-medium text-slate-900 dark:text-white">
                            {clienteToView.operadora || "-"}
                          </span>
                        </div>
                        {clienteToView.codOperadora && (
                          <div className="flex flex-col">
                            <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase">
                              Cód. Operadora:
                            </span>{" "}
                            <span className="font-medium text-slate-900 dark:text-white">
                              {clienteToView.codOperadora || "-"}
                            </span>
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase">
                            Serviço:
                          </span>{" "}
                          <span className="font-medium text-slate-900 dark:text-white">
                            {clienteToView.servico || "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Contacts, Address, Sales */}
                  <div className="md:col-span-2 space-y-6">
                    {/* Contacts */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 flex items-center">
                          <Phone size={16} className="mr-2 text-slate-500" />{" "}
                          Contatos
                        </h4>
                      </div>
                      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                            <Phone size={18} />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-0.5">
                              Telefone
                            </p>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              {clienteToView.telefone || "-"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                            <Phone size={18} />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-0.5">
                              Celular
                            </p>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              {clienteToView.celular || "-"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 sm:col-span-2">
                          <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg">
                            <Mail size={18} />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-0.5">
                              E-mail
                            </p>
                            <p className="text-sm font-medium break-all text-slate-900 dark:text-white">
                              {clienteToView.email || "-"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 flex items-center">
                          <Folder size={16} className="mr-2 text-slate-500" />{" "}
                          Endereço
                        </h4>
                      </div>
                      <div className="p-4">
                        {clienteToView.logradouro ||
                        clienteToView.cidade ||
                        clienteToView.uf ||
                        clienteToView.cep ? (
                          <div className="flex items-start gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded border border-slate-100 dark:border-slate-750">
                            <div className="mt-0.5 text-emerald-500">
                              <CheckCircle size={16} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center">
                                Endereço{" "}
                                <span className="ml-2 text-[9px] uppercase bg-emerald-500 text-white px-1.5 py-0.5 rounded">
                                  Principal
                                </span>
                              </p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {clienteToView.logradouro &&
                                  `${clienteToView.logradouro}`}
                                {clienteToView.numero &&
                                  `, ${clienteToView.numero}`}
                                {clienteToView.bairro &&
                                  ` - ${clienteToView.bairro}`}
                                {clienteToView.cidade &&
                                  `, ${clienteToView.cidade}`}
                                {clienteToView.uf && ` - ${clienteToView.uf}`}
                                {clienteToView.cep &&
                                  ` | CEP: ${clienteToView.cep}`}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-2">
                            Nenhum endereço cadastrado.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Sales */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 flex items-center">
                          <ShoppingCart
                            size={16}
                            className="mr-2 text-slate-500"
                          />{" "}
                          Vendas
                        </h4>
                      </div>
                      <div className="p-0">
                        {(() => {
                          const vendasDoCliente = getAllVendas()
                            .filter(
                              (v) =>
                                v.cliente &&
                                v.cliente.toLowerCase() ===
                                  clienteToView.nome.toLowerCase()
                            )
                            .sort((a, b) => {
                              const dateA = a.dataVenda || "";
                              const dateB = b.dataVenda || "";
                              // Sort reverse chronologically (newest first)
                              return dateB.localeCompare(dateA);
                            });
                          if (vendasDoCliente.length === 0) {
                            return (
                              <p className="text-center py-6 text-slate-500 dark:text-slate-400">
                                Nenhuma venda foi encontrada!
                              </p>
                            );
                          }
                          return (
                            <div className="max-h-64 overflow-y-auto">
                              <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0">
                                  <tr>
                                    <th className="py-2 px-4 text-xs font-bold text-slate-600 dark:text-slate-400">
                                      Data
                                    </th>
                                    <th className="py-2 px-4 text-xs font-bold text-slate-600 dark:text-slate-400">
                                      Contrato
                                    </th>
                                    <th className="py-2 px-4 text-xs font-bold text-slate-600 dark:text-slate-400">
                                      Op.|Seg.
                                    </th>
                                    <th className="py-2 px-4 text-xs font-bold text-emerald-600 dark:text-emerald-400 text-right">
                                      Comissão
                                    </th>
                                    <th className="py-2 px-4 text-xs font-bold text-slate-600 dark:text-slate-400 text-right">
                                      Valor
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {vendasDoCliente.map((v, i) => (
                                    <tr
                                      key={i}
                                      className="border-b border-slate-100 dark:border-slate-750 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                    >
                                      <td className="py-2 px-4 text-sm text-slate-700 dark:text-slate-300">
                                        {formatarDataVisivel(v.dataVenda)}
                                      </td>
                                      <td className="py-2 px-4 text-sm font-medium text-slate-800 dark:text-slate-200">
                                        {v.contrato || "-"}
                                      </td>
                                      <td className="py-2 px-4 text-sm text-slate-700 dark:text-slate-300">
                                        {v.codigoOperadora || "AMIL"}
                                      </td>
                                      <td className="py-2 px-4 text-sm font-bold text-emerald-600 dark:text-emerald-400 text-right">
                                        R${" "}
                                        {(Number(v.comissao) || 0).toFixed(2)}
                                      </td>
                                      <td className="py-2 px-4 text-sm font-bold text-slate-700 dark:text-slate-300 text-right">
                                        R$ {(Number(v.valor) || 0).toFixed(2)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {modalClienteOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-2xl relative mx-4">
                <button
                  type="button"
                  onClick={() => setModalClienteOpen(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                    <Users className="mr-3 text-emerald-500" />
                    {clienteEditIndex >= 0 ? "Editar Cliente" : "Novo Cliente"}
                  </h3>
                </div>
                <form
                  onSubmit={salvarCliente}
                  onInvalid={(e) =>
                    e.currentTarget.classList.add("show-errors")
                  }
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Nome / Designação
                      </label>
                      <input
                        required
                        type="text"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={clienteForm.nome}
                        onChange={(e) =>
                          setClienteForm({
                            ...clienteForm,
                            nome: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Tipo
                      </label>
                      <select
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={clienteForm.tipo}
                        onChange={(e) =>
                          setClienteForm({
                            ...clienteForm,
                            tipo: e.target.value,
                          })
                        }
                      >
                        <option value="Pessoa jurídica">Pessoa jurídica</option>
                        <option value="Pessoa física">Pessoa física</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {clienteForm.tipo === "Pessoa jurídica"
                          ? "CNPJ"
                          : "CPF"}
                      </label>
                      <input
                        type="text"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={clienteForm.documento}
                        onChange={(e) =>
                          setClienteForm({
                            ...clienteForm,
                            documento: e.target.value,
                          })
                        }
                        placeholder={
                          clienteForm.tipo === "Pessoa jurídica"
                            ? "00.000.000/0000-00"
                            : "000.000.000-00"
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Empresa
                      </label>
                      <select
                        disabled
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-500 dark:text-slate-400 focus:outline-none cursor-not-allowed"
                        value={clienteForm.empresa || nomeEmpresa}
                        onChange={(e) =>
                          setClienteForm({
                            ...clienteForm,
                            empresa: e.target.value,
                          })
                        }
                      >
                        <option value={nomeEmpresa}>{nomeEmpresa}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Op. | Seg.
                      </label>
                      <select
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={clienteForm.operadora || ""}
                        onChange={(e) =>
                          setClienteForm({
                            ...clienteForm,
                            operadora: e.target.value,
                          })
                        }
                      >
                        <option value="">Selecione uma Op. | Seg.</option>
                        <optgroup label="Operadoras">
                          <option value="AMIL">AMIL</option>
                          <option value="ASSIM">ASSIM</option>
                          <option value="HAPVIDA">HAPVIDA</option>
                          <option value="KLINI">KLINI</option>
                          <option value="LEVE SAUDE">LEVE SAUDE</option>
                          <option value="NOTRE DAME">NOTRE DAME</option>
                          <option value="PREVENT">PREVENT</option>
                          <option value="METLIFE">METLIFE</option>
                          <option value="PET LOVE">PET LOVE</option>
                          <option value="QUALICORP">QUALICORP</option>
                          <option value="SUPERMED">SUPERMED</option>
                          <option value="MED SENIOR">MED SENIOR</option>
                          <option value="ODONTOPREV">ODONTOPREV</option>
                        </optgroup>
                        <optgroup label="Seguradoras">
                          <option value="ALLIANZ">ALLIANZ</option>
                          <option value="ASSIST CARD">ASSIST CARD</option>
                          <option value="AZUL">AZUL</option>
                          <option value="BRADESCO">BRADESCO</option>
                          <option value="HDI">HDI</option>
                          <option value="CASSI PASI">CASSI PASI</option>
                          <option value="ICATU">ICATU</option>
                          <option value="MONGERAL">MONGERAL</option>
                          <option value="MAPFRE">MAPFRE</option>
                          <option value="TOKIO MARINE">TOKIO MARINE</option>
                        </optgroup>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Serviço
                      </label>
                      <select
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={clienteForm.servico || "Plano de Saúde"}
                        onChange={(e) =>
                          setClienteForm({
                            ...clienteForm,
                            servico: e.target.value,
                          })
                        }
                      >
                        <option value="Plano de Saúde">Plano de Saúde</option>
                        <option value="Plano Dental">Plano Dental</option>
                        <option value="Seguro Vida">Seguro Vida</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Telefone
                      </label>
                      <input
                        type="text"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={clienteForm.telefone || ""}
                        maxLength="14"
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, "");
                          if (val.length > 10) val = val.slice(0, 10);
                          if (val.length > 6)
                            val = val.replace(
                              /^(\d{2})(\d{4})(\d{0,4})/,
                              "($1) $2-$3",
                            );
                          else if (val.length > 2)
                            val = val.replace(/^(\d{2})(\d{0,4})/, "($1) $2");
                          setClienteForm({ ...clienteForm, telefone: val });
                        }}
                        placeholder="(00) 0000-0000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Celular
                      </label>
                      <input
                        type="text"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={clienteForm.celular || ""}
                        maxLength="15"
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, "");
                          if (val.length > 11) val = val.slice(0, 11);
                          if (val.length > 7)
                            val = val.replace(
                              /^(\d{2})(\d{5})(\d{0,4})/,
                              "($1) $2-$3",
                            );
                          else if (val.length > 2)
                            val = val.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
                          setClienteForm({ ...clienteForm, celular: val });
                        }}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                        CEP
                      </label>
                      <input
                        type="text"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={clienteForm.cep || ""}
                        maxLength="9"
                        onBlur={(e) => {
                          if (e.target.value.replace(/\D/g, "").length === 8)
                            buscarCepCliente(e.target.value);
                        }}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, "");
                          if (val.length > 8) val = val.slice(0, 8);
                          if (val.length > 5)
                            val = val.replace(/^(\d{5})(\d)/, "$1-$2");
                          setClienteForm({ ...clienteForm, cep: val });
                          if (val.replace(/\D/g, "").length === 8)
                            buscarCepCliente(val);
                        }}
                        placeholder="00000-000"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Logradouro
                      </label>
                      <input
                        type="text"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={clienteForm.logradouro || ""}
                        onChange={(e) =>
                          setClienteForm({
                            ...clienteForm,
                            logradouro: e.target.value,
                          })
                        }
                        placeholder="Rua, Av..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Número
                      </label>
                      <input
                        type="text"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={clienteForm.numero || ""}
                        onChange={(e) =>
                          setClienteForm({
                            ...clienteForm,
                            numero: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Bairro
                      </label>
                      <input
                        type="text"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={clienteForm.bairro || ""}
                        onChange={(e) =>
                          setClienteForm({
                            ...clienteForm,
                            bairro: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Cidade
                      </label>
                      <input
                        type="text"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={clienteForm.cidade || ""}
                        onChange={(e) =>
                          setClienteForm({
                            ...clienteForm,
                            cidade: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                        UF
                      </label>
                      <input
                        type="text"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={clienteForm.uf || ""}
                        onChange={(e) =>
                          setClienteForm({ ...clienteForm, uf: e.target.value })
                        }
                        maxLength="2"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                        E-mail
                      </label>
                      <input
                        type="email"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={clienteForm.email || ""}
                        onChange={(e) =>
                          setClienteForm({
                            ...clienteForm,
                            email: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4 mt-6 border-t border-slate-200 dark:border-slate-700 gap-3">
                    <button
                      type="button"
                      onClick={() => setModalClienteOpen(false)}
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className={`px-5 py-2 text-white rounded-lg font-bold flex items-center shadow-lg transition-all duration-300 ${clientSaveSuccess ? "bg-emerald-500 animate-bounce" : "bg-emerald-600 hover:bg-emerald-500"}`}
                    >
                      {clientSaveSuccess ? (
                        <CheckCircle size={18} className="mr-2" />
                      ) : (
                        <Save size={18} className="mr-2" />
                      )}{" "}
                      {clientSaveSuccess ? "Guardado!" : "Guardar Cliente"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {modalVendaOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-2xl relative mx-4 max-h-[90vh] flex flex-col">
                <button
                  type="button"
                  onClick={() => setModalVendaOpen(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors z-10"
                >
                  <X size={20} />
                </button>
                <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                    <ShoppingCart className="mr-3 text-sky-500" />
                    {vendaForm.id || vendaForm.isFromReport
                      ? "Detalhes da Venda"
                      : "Nova Venda"}
                  </h3>
                </div>
                <form
                  onSubmit={salvarVenda}
                  onInvalid={(e) =>
                    e.currentTarget.classList.add("show-errors")
                  }
                  className="flex flex-col h-full overflow-hidden"
                >
                  <div className="overflow-y-auto pr-2 -mr-2 flex-1 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Data
                        </label>
                        <DatePicker
                          selected={
                            vendaForm.dataVenda
                              ? new Date(vendaForm.dataVenda + "T12:00:00")
                              : null
                          }
                          onChange={(date) => {
                            const novaData = date
                              ? date.toISOString().split("T")[0]
                              : "";
                            const calcParcela = calcularParcelaDaVigencia(
                              vendaForm.inicioVigencia,
                              novaData,
                            );
                            setVendaForm({
                              ...vendaForm,
                              dataVenda: novaData,
                              parcela: calcParcela || vendaForm.parcela,
                            });
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
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Nº Venda
                        </label>
                        <input
                          required
                          type="text"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={vendaForm.numero}
                          onChange={(e) =>
                            setVendaForm({
                              ...vendaForm,
                              numero: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Contrato
                        </label>
                        <input
                          type="text"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          placeholder="Opcional. Ex: 123456"
                          value={vendaForm.contrato}
                          onChange={(e) =>
                            setVendaForm({
                              ...vendaForm,
                              contrato: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Cód. Operadora
                        </label>
                        {vendaForm.codigoOperadora === "AMIL" ? (
                          <select
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={vendaForm.codOperadora || ""}
                            onChange={(e) =>
                              setVendaForm({
                                ...vendaForm,
                                codOperadora: e.target.value,
                              })
                            }
                          >
                            <option value="">Módulo opcional</option>
                            <option value="139491">139491</option>
                            <option value="162191">162191</option>
                            <option value="224138">224138</option>
                          </select>
                        ) : (
                          <input
                            type="text"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="Módulo opcional"
                            value={vendaForm.codOperadora || ""}
                            onChange={(e) =>
                              setVendaForm({
                                ...vendaForm,
                                codOperadora: e.target.value,
                              })
                            }
                          />
                        )}
                      </div>
                      <div className="md:col-span-2 relative">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Cliente / Parceiro
                        </label>
                        <input
                          required
                          type="text"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={vendaForm.cliente}
                          onChange={(e) => {
                            setVendaForm({
                              ...vendaForm,
                              cliente: e.target.value,
                            });
                            setShowClienteSuggestions(true);
                          }}
                          onFocus={() => setShowClienteSuggestions(true)}
                          onBlur={() =>
                            setTimeout(
                              () => setShowClienteSuggestions(false),
                              200,
                            )
                          }
                        />
                        {showClienteSuggestions && vendaForm.cliente && (
                          <ul className="absolute z-10 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg max-h-48 overflow-y-auto shadow-lg mt-1">
                            {clientes
                              .filter((c) =>
                                c.nome
                                  .toLowerCase()
                                  .includes(vendaForm.cliente.toLowerCase()),
                              )
                              .map((c) => (
                                <li
                                  key={c.id}
                                  className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 last:border-0"
                                  onMouseDown={() => {
                                    setVendaForm({
                                      ...vendaForm,
                                      cliente: c.nome,
                                      servico: c.servico || "",
                                    });
                                    setShowClienteSuggestions(false);
                                  }}
                                >
                                  <div className="font-bold">{c.nome}</div>
                                  <div className="text-xs text-slate-500 flex gap-2">
                                    {c.documento && <span>{c.documento}</span>}
                                    {c.operadora && (
                                      <span>• {c.operadora}</span>
                                    )}
                                    {c.servico && <span>• {c.servico}</span>}
                                  </div>
                                </li>
                              ))}
                            {clientes.filter((c) =>
                              c.nome
                                .toLowerCase()
                                .includes(vendaForm.cliente.toLowerCase()),
                            ).length === 0 && (
                              <li className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm italic text-center">
                                Nenhum cliente encontrado
                              </li>
                            )}
                          </ul>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Serviços
                        </label>
                        <select
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={vendaForm.servico || ""}
                          onChange={(e) =>
                            setVendaForm({
                              ...vendaForm,
                              servico: e.target.value,
                            })
                          }
                        >
                          <option value=""></option>
                          <option value="Plano de Saúde">Plano de Saúde</option>
                          <option value="Plano Dental">Plano Dental</option>
                          <option value="Seguro Vida">Seguro Vida</option>
                          <option value="Outros">Outros</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Valor Total
                        </label>
                        <input
                          required
                          type="number"
                          step="0.01"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={vendaForm.valor}
                          onChange={(e) =>
                            onChangeVendaField("valor", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                          % (Comissão)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={vendaForm.comissaoPorcentagem}
                          onChange={(e) =>
                            onChangeVendaField(
                              "comissaoPorcentagem",
                              e.target.value,
                            )
                          }
                          placeholder="Ex: 10"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Desconto
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={vendaForm.desconto}
                          onChange={(e) =>
                            onChangeVendaField("desconto", e.target.value)
                          }
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Comissão (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={vendaForm.comissao}
                          onChange={(e) =>
                            onChangeVendaField("comissao", e.target.value)
                          }
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Tipo de Pagamento
                        </label>
                        <select
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={vendaForm.formaPagamento || ""}
                          onChange={(e) =>
                            setVendaForm({
                              ...vendaForm,
                              formaPagamento: e.target.value,
                            })
                          }
                        >
                          <option value=""></option>
                          <option value="Crédito em conta">
                            Crédito em conta
                          </option>
                          <option value="Dinheiro à vista">
                            Dinheiro à vista
                          </option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Situação / Status
                        </label>
                        <input
                          type="text"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={vendaForm.situacao}
                          onChange={(e) =>
                            setVendaForm({
                              ...vendaForm,
                              situacao: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Empresa / Loja
                        </label>
                        <input
                          list="lojas-list"
                          type="text"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={vendaForm.loja}
                          onChange={(e) =>
                            setVendaForm({ ...vendaForm, loja: e.target.value })
                          }
                        />
                        <datalist id="lojas-list">
                          {empresasList.map((e) => (
                            <option
                              key={`${e.id}_1`}
                              value={`${e.nome.toUpperCase()} ASSESSORIA`}
                            />
                          ))}
                          {empresasList.map((e) => (
                            <option
                              key={`${e.id}_2`}
                              value={e.nome.toUpperCase()}
                            />
                          ))}
                        </datalist>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Op. | Seg.
                        </label>
                        <select
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={vendaForm.codigoOperadora || ""}
                          onChange={(e) =>
                            setVendaForm({
                              ...vendaForm,
                              codigoOperadora: e.target.value,
                            })
                          }
                        >
                          <option value="">Selecione uma Op. | Seg.</option>
                          <optgroup label="Operadoras">
                            {combinedOperadoras.map((op) => (
                              <option key={op} value={op}>
                                {op}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Seguradoras">
                            {combinedSeguradoras.map((seg) => (
                              <option key={seg} value={seg}>
                                {seg}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Início da Vigência
                        </label>
                        <DatePicker
                          selected={
                            vendaForm.inicioVigencia
                              ? new Date(vendaForm.inicioVigencia + "T12:00:00")
                              : null
                          }
                          onChange={(date) => {
                            const novaVig = date
                              ? date.toISOString().split("T")[0]
                              : "";
                            const calcParcela = calcularParcelaDaVigencia(
                              novaVig,
                              vendaForm.dataVenda,
                            );
                            setVendaForm({
                              ...vendaForm,
                              inicioVigencia: novaVig,
                              parcela: calcParcela || vendaForm.parcela,
                            });
                          }}
                          dateFormat="dd/MM/yyyy"
                          locale="pt-BR"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          placeholderText="Selecione uma data"
                          isClearable
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Nota Fiscal (NF)
                        </label>
                        <input
                          type="text"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={vendaForm.notaFiscal}
                          onChange={(e) =>
                            setVendaForm({
                              ...vendaForm,
                              notaFiscal: e.target.value,
                            })
                          }
                          placeholder="Número da NF"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Vidas
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={vendaForm.vidas}
                          onChange={(e) =>
                            setVendaForm({
                              ...vendaForm,
                              vidas: e.target.value,
                            })
                          }
                          placeholder="Ex: 2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Parcela
                        </label>
                        <input
                          type="text"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={vendaForm.parcela}
                          onChange={(e) =>
                            setVendaForm({
                              ...vendaForm,
                              parcela: e.target.value,
                            })
                          }
                          placeholder="Ex: 1/12"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Notas / Observações
                        </label>
                        <textarea
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y"
                          rows="3"
                          value={vendaForm.notas}
                          onChange={(e) =>
                            setVendaForm({
                              ...vendaForm,
                              notas: e.target.value,
                            })
                          }
                          placeholder="Insira observações complementares aqui..."
                        ></textarea>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between pt-4 mt-4 border-t border-slate-200 dark:border-slate-700 shrink-0">
                    <div className="flex gap-2">
                      {(vendaForm.id || vendaForm.isFromReport) && (
                        <button
                          type="button"
                          onClick={() => apagarVenda(vendaForm)}
                          className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 rounded-lg font-bold transition-colors"
                        >
                          Apagar Registo
                        </button>
                      )}
                      {(vendaForm.isFromReport || (vendaForm.contrato && savedReportsList.some((r) => r.dados && Array.isArray(r.dados) && r.dados.some((d) => String(d.contrato) === String(vendaForm.contrato))))) && (
                        <button
                          type="button"
                          onClick={() => abrirRelatorioDaVenda(vendaForm)}
                          className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-lg font-bold flex items-center transition-colors"
                          title="Abrir Relatório de Origem"
                        >
                          <FileText size={18} className="mr-2" /> Abrir Relatório
                        </button>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setModalVendaOpen(false)}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg font-bold"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold flex items-center shadow-lg"
                      >
                        <Save size={18} className="mr-2" /> Guardar Venda
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {modalUserOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-sm relative mx-4">
                <button
                  type="button"
                  onClick={() => setModalUserOpen(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                    <User className="mr-3 text-indigo-500" />
                    {userForm.id ? "Editar Usuário" : "Novo Usuário"}
                  </h3>
                </div>
                <form
                  onSubmit={salvarUsuario}
                  onInvalid={(e) =>
                    e.currentTarget.classList.add("show-errors")
                  }
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nome do Usuário
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={userForm.username}
                      onChange={(e) =>
                        setUserForm({ ...userForm, username: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Senha
                    </label>
                    <div className="relative">
                      <input
                        required
                        type={showUserPassword ? "text" : "password"}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 pr-10 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={userForm.password}
                        onChange={(e) =>
                          setUserForm({ ...userForm, password: e.target.value })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowUserPassword(!showUserPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      >
                        {showUserPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Função
                    </label>
                    <select
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={userForm.role}
                      onChange={(e) => {
                        const newRole = e.target.value;
                        setUserForm({
                          ...userForm,
                          role: newRole,
                          permissions:
                            newRole === "admin"
                              ? SYSTEM_MODULES.map((m) => m.id)
                              : userForm.permissions,
                        });
                      }}
                    >
                      <option value="admin">Administrador</option>
                      <option value="operador">Colaborador</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Empresa
                    </label>
                    <select
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={userForm.empresa || "Todas"}
                      onChange={(e) =>
                        setUserForm({ ...userForm, empresa: e.target.value })
                      }
                    >
                      {(!currentUser?.empresa ||
                        currentUser.empresa === "Todas") && (
                        <option value="Todas">
                          Todas as Empresas (Acesso Global)
                        </option>
                      )}
                      {empresasList.map((emp) => (
                        <option key={emp.nome} value={emp.nome}>
                          {emp.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Permissões de Acesso
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                      {SYSTEM_MODULES.map((mod) => (
                        <label
                          key={mod.id}
                          className="flex items-center space-x-2"
                        >
                          <input
                            type="checkbox"
                            checked={userForm.permissions.includes(mod.id)}
                            onChange={(e) => {
                              const p = e.target.checked
                                ? [...userForm.permissions, mod.id]
                                : userForm.permissions.filter(
                                    (x) => x !== mod.id,
                                  );
                              setUserForm({ ...userForm, permissions: p });
                            }}
                            disabled={userForm.role === "admin"}
                            className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {mod.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end pt-4 mt-6 border-t border-slate-200 dark:border-slate-700 gap-3">
                    <button
                      type="button"
                      onClick={() => setModalUserOpen(false)}
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center shadow-lg"
                    >
                      <Save size={18} className="mr-2" /> Guardar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modais Globais Simplificados (Exemplo) */}
          {selectedFile && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-sm relative mx-4 transition-colors">
                <button
                  onClick={() => setSelectedFile(null)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X size={20} />
                </button>
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4 text-blue-500 dark:text-blue-400">
                    <FileText size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 truncate px-2">
                    {selectedFile.fileName}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Extrato Associado
                  </p>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      const url = URL.createObjectURL(selectedFile.fileObj);
                      window.open(url, "_blank");
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                      setSelectedFile(null);
                    }}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center justify-center space-x-2"
                  >
                    <Eye size={20} />
                    <span>Visualizar PDF/Excel</span>
                  </button>
                  <button
                    onClick={() => {
                      const url = URL.createObjectURL(selectedFile.fileObj);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = selectedFile.fileName;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                      setSelectedFile(null);
                    }}
                    className="w-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white py-3 rounded-lg font-bold flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Download size={20} />
                    <span>Baixar para o PC</span>
                  </button>
                  <button
                    onClick={() => handleDeleteExtrato(selectedFile)}
                    className="w-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-800/30 text-rose-600 dark:text-rose-400 py-3 rounded-lg font-bold flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Trash2 size={20} />
                    <span>Apagar Extrato</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentView === "ajuda" && <AjudaSuporte />}

          {currentView === "lgpd" && hasAccess("lgpd") && (
            <TermosLGPDGestao currentUser={currentUser} />
          )}
        </main>

        {/* Footer fixo */}
        <footer className="shrink-0 z-10 py-3 px-4 md:px-8 bg-slate-700 dark:bg-slate-900 border-t border-slate-600 dark:border-slate-800 text-slate-200 dark:text-slate-400 text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors duration-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.2)]">
          <p className="font-medium flex items-center gap-2">
            <span>Desenvolvido por</span>
            <a
              href="https://donfim.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
            >
              <img
                src="/Logo_DonGestao.png"
                alt="Donfim Tech"
                className="h-6 w-auto object-contain"
              />
            </a>
            <span>copyright © 2026</span>
          </p>
          <div className="flex items-center gap-6">
            <a
              href="https://wa.me/5521973987378"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Suporte por WhatsApp"
            >
              <Phone size={16} className="text-blue-500" />
              <span className="hidden sm:inline">Suporte</span>
            </a>
            <a
              href="mailto:donfim@gmail.com"
              className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Suporte por Email"
            >
              <Mail size={16} className="text-blue-500" />
              <span className="hidden sm:inline">Email</span>
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
