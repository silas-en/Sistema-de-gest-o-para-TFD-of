/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserProfile = 'Administrador' | 'Coordenador' | 'Motorista';
export type UserStatus = 'pendente' | 'aprovado' | 'rejeitado';

export interface User {
  id: string;
  token?: string;
  username: string;
  name: string;
  profile: UserProfile;
  status: UserStatus;
  createdAt: string;
}

export type VehicleType = 'Carro de pequeno porte' | 'Carro de grande porte' | 'Ambulância';

export interface Vehicle {
  id: string;
  type: VehicleType;
  plate: string;
  model: string;
  brand: string;
  maxPassengers: number;
  vagasAcamados?: number;
  limiteKmTrocaOleo?: number;
  ultimoKmTrocaOleo?: number;
  dataUltimaTrocaOleo?: string;
}

export interface Driver {
  id: string;
  fullName: string;
  contact: string;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  googleMapsUrl?: string;
  contacts: string[];
}

export type RequestMedicalType = 'Consulta/Exame' | 'Cirurgia' | 'Procedimento especializado recorrente';

export type ConfirmationStatus = 'pendente' | 'confirmado' | 'sem_contato' | 'desistencia';

export interface Schedule {
  id: string;
  patientName: string;
  patientCpf: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  tripType?: 'ida_e_volta' | 'apenas_ida' | 'apenas_retorno';
  vehicleId: string;
  returnVehicleId?: string;
  driverId?: string;
  returnDriverId?: string;
  hospitalId: string;
  requestType: RequestMedicalType;
  recurrentTypeDetails?: string; // Quimioterapia, Hemodiálise, Radioterapia, Outros
  createdByUserId: string;
  createdByUserName: string;
  createdAt: string;
  companionName?: string;
  companionPhone1?: string;
  companionPhone2?: string;
  isBedridden?: boolean;
  isDeletionPending?: boolean;
  deletionRequestedAt?: string;
  deletionRequestedByUserId?: string;
  deletionRequestedByUserName?: string;
  deletedByAdminName?: string;
  confirmationStatus?: ConfirmationStatus;
  confirmationUpdatedBy?: string;
  confirmationUpdatedAt?: string;
}

export interface HistoryLog {
  id: string;
  patientName: string;
  patientCpf?: string;
  startDate: string;
  endDate: string;
  vehicleDetails: string; // e.g., "Modelo (Placa)"
  hospitalName: string;
  requestType: string;
  createdByUserName: string;
  completedAt: string;
  completedByUserName: string;
}

export interface SystemSettings {
  backupFolder: string;
  lastBackupDate: string; // YYYY-MM-DD of the last performed backup
}

export type FuelLevel = 'reserva' | '1/4' | '1/2' | '3/4' | 'cheio';

export interface VehicleChecklist {
  id: string;
  vehicleId: string;
  vehicleModelPlate: string;
  date: string;
  status?: 'em_andamento' | 'concluido'; // 'em_andamento' = apenas saída, 'concluido' = saída + retorno
  
  // PARTE 1: CHECKLIST INICIAL (SAÍDA / RETIRADA DO VEÍCULO)
  initialKm: number;
  combustivelInicial?: FuelLevel | string; // Nível de combustível inicial
  fotoPainelCombustivelInicial?: string; // FOTO OBRIGATÓRIA do painel de combustível inicial
  oleo: boolean;
  agua: boolean;
  oxigenio: boolean;
  parabrisa: boolean;
  luzRe: boolean;
  arCondicionado: boolean;
  documento: boolean;
  piscas: boolean;
  retrovisores: boolean;
  sirene: boolean;
  marcadorCombustivel: boolean;
  chaveRodas: boolean;
  macaco: boolean;
  buzina: boolean;
  farois: boolean;
  saidaHorario: string;
  saidaDestino: string;
  saidaCidade: string;
  fotoFrente?: string;
  fotoFundo?: string;
  fotoLateralEsquerda?: string;
  fotoLateralDireita?: string;
  
  // PARTE 2: CHECKLIST FINAL (DEVOLUÇÃO / FIM DE EXPEDIENTE)
  finalKm?: number;
  fotoKmFinal?: string; // FOTO OBRIGATÓRIA da kilometragem final (odômetro)
  combustivelFinal?: FuelLevel | string; // Nível de combustível final
  fotoPainelCombustivelFinal?: string; // FOTO OBRIGATÓRIA do painel de combustível final
  houveAbastecimento?: boolean; // Houve abastecimento? (Sim / Não)
  abastecimentoLitros?: number;
  abastecimentoValor?: number;
  abastecimentoPosto?: string;
  abastecimentoComprovanteFoto?: string;
  houveIncidente?: boolean; // Houve algum incidente com o veículo? (Sim / Não)
  descricaoIncidente?: string; // Descrição de dano, colisão, pane, etc.
  fotoIncidente?: string; // Foto do incidente / dano
  retornoHorario?: string; // Horário de devolução
  retornoData?: string; // Data de devolução
  completedAt?: string;

  // Metadados
  driverUserId: string;
  driverUserName: string;
  createdAt: string;
}

export interface DbSchema {
  users: User[];
  vehicles: Vehicle[];
  drivers: Driver[];
  hospitals: Hospital[];
  schedules: Schedule[];
  history: HistoryLog[];
  settings: SystemSettings;
  checklists?: VehicleChecklist[];
}
