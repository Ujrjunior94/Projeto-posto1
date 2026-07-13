/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = "Master" | "Gerente" | "Supervisor" | "Frentista";

export interface User {
  id: string;
  nomeCompleto: string;
  email: string;
  senhaCriptografada: string; // Stored as plain string for demo simulation
  cpf: string;
  cargo: UserRole;
  cnpjPosto: string;
  telefone: string;
}

export type FuelType = "Gasolina Comum" | "Gasolina Aditivada" | "Etanol" | "Diesel S10" | "Diesel S500";

export interface FuelTank {
  id: string;
  identificador: string; // e.g., "Tanque 01"
  combustivel: FuelType;
  capacidadeMaxima: number; // in liters
  volumeAtual: number; // in liters
  pontoCriticoAlerta: number; // min safe level in liters
}

export interface Nozzle {
  id: string;
  numeroBico: string; // e.g., "Bico 01"
  bombaAssociada: string; // e.g., "Bomba A"
  tanqueId: string; // ID of the feeder fuel tank
  encerranteInicial: number; // in liters (hodômetro mecânico inicial)
  precoPorLitro: number; // e.g., 5.89
}

export type ShiftName = "Turno A (Manhã)" | "Turno B (Tarde)" | "Turno C (Noite)" | string;

export interface ShiftChecklist {
  limpezaPistas: boolean;
  usoEPIs: boolean;
  afericaoEquipamentosSeguranca: boolean;
  testeGerador: boolean;
}

export interface ShiftOccurrence {
  id: string;
  tipo: "Atraso" | "Falta" | "Atestado" | "Dobra" | "Problema na Pista" | "Outro";
  descricao: string;
  dataHora: string; // YYYY-MM-DD HH:MM
}

export interface ShiftEvent {
  id: string;
  titulo: string;
  tipo: "Treinamento" | "Reunião" | "Manutenção" | "Auditoria" | "Outro";
  descricao: string;
  horario: string; // HH:MM
}

export interface ShiftSchedule {
  id: string;
  data: string; // YYYY-MM-DD
  turno: ShiftName;
  frentistaResponsavel: string; // Nome do frentista
  checklist: ShiftChecklist;
  status: "Planejado" | "Em Andamento" | "Fechado";
  stationCnpj?: string;
  dayOfWeek?: string;
  occurrences?: ShiftOccurrence[];
  events?: ShiftEvent[];
}

export type TransactionType = "Receita" | "Despesa";
export type TransactionCategory = "Combustíveis" | "Conveniência" | "Serviços (Troca de Óleo / Ducha)" | "Despesas Operacionais";
export type PaymentMethod = "Dinheiro" | "Cartão de Crédito" | "Cartão de Débito" | "PIX" | "Prazo";

export interface CashTransaction {
  id: string;
  shiftId?: string; // Associated shift if any
  tipo: TransactionType;
  categoria: TransactionCategory;
  descricao: string;
  valor: number;
  formaPagamento?: PaymentMethod;
  data: string; // YYYY-MM-DD THH:mm
}

// Records closing readings for nozzles at the end of a shift
export interface NozzleClosing {
  id: string;
  shiftId: string;
  nozzleId: string;
  encerranteFinal: number; // in liters
  litrosVendidos: number; // calculated: encerranteFinal - encerranteInicial
  valorVendidoCalculado: number; // calculated: litrosVendidos * precoPorLitro
}

// Turn audit (fechamento de caixa/turno)
export interface ShiftReconciliation {
  id: string;
  shiftId: string;
  frentistaId: string;
  frentistaNome: string;
  valorDeclaradoFisico: number; // Declared cash collected by frentista
  valorCalculadoTeorico: number; // Theoretical total calculated from NozzleClosings + any additional receipts
  diferenca: number; // Declared - Theoretical (negative indicates cashier shortage / quebra de caixa)
  observacoes?: string;
  dataFechamento: string;
}

// Aferição de bicos (testes físicos de vazão de 20 litros)
export interface NozzleCalibration {
  id: string;
  data: string; // YYYY-MM-DD
  nozzleId: string;
  volumeMedido: number; // should be close to 20L
  desvioMl: number; // allowed deviation is +-60ml (records from -100 to +100ml)
  conforme: boolean; // desvioMl between -60 and +60
  operadorResponsavel: string;
}

// Controle de qualidade ANP diário
export interface ANPQualityAudit {
  id: string;
  data: string; // YYYY-MM-DD
  combustivel: FuelType;
  densidade: number; // g/cm³ (e.g., 0.720 to 0.775)
  temperatura: number; // °C (e.g., 20 to 35)
  teorEtanol: number; // % (ANP limit of 27% for Gasoline, ignore or N/A for diesel/pure ethanol)
  aspectoVisual: "Límpido e Isento" | "Turvo" | "Com Impurezas";
  presencaImpurezas: boolean;
  conforme: boolean; // calculations/checks based on fuel specifications
  responsavelTecnico: string;
}

export interface SyncConfig {
  apiUrl: string;
  token: string;
  autoSync: boolean;
}

// Entire app database state that gets synchronized
export interface LmcRecord {
  id: string;
  date: string; // YYYY-MM-DD
  fuelType: string;
  openingStock: number;
  deliveryVolume: number;
  litersSold: number;
  physicalStock: number;
  stationCnpj: string;
}

export interface Appointment {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  description?: string;
  stationCnpj: string;
}

export interface SystemCredential {
  id: string;
  systemName: string;
  category: string;
  login: string;
  password: string; // Password stored as string
  description?: string;
  stationCnpj: string;
}

export interface FuelDelivery {
  id: string;
  date?: string;
  invoiceNumber?: string;
  fuelType?: string;
  volume?: number;
  driverName?: string;
  driverCnh?: string;
  truckPlate?: string;
  conformityId?: string | null;
  stationCnpj: string;
  data?: string;
  nfe?: string;
  combustivel?: string;
  volumeRecebido?: number;
  placaCaminhao?: string;
  motorista?: string;
}

export interface ActivityLog {
  id: string;
  date: string;
  time: string;
  actionType: string;
  target: string;
  details: string;
  operator: string;
  complianceStatus: string;
  stationCnpj: string;
}

export interface AppState {
  users: User[];
  tanks: FuelTank[];
  nozzles: Nozzle[];
  shifts: ShiftSchedule[];
  transactions: CashTransaction[];
  nozzleClosings: NozzleClosing[];
  reconciliations: ShiftReconciliation[];
  calibrations: NozzleCalibration[];
  qualityAudits: ANPQualityAudit[];
  lmc: LmcRecord[];
  appointments: Appointment[];
  systemCredentials: SystemCredential[];
  deliveries: FuelDelivery[];
  audits: ActivityLog[];
}

