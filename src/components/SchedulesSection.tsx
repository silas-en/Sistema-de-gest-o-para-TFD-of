/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Calendar, User, Truck, Landmark, ClipboardList, ShieldAlert, BadgeInfo, CheckCircle, FileText, AlertTriangle, Plus, Edit, CornerDownLeft, Eye, ShieldCheck, Clock, AlertCircle, Printer, X, ExternalLink, Trash2 } from 'lucide-react';
import { Schedule, Vehicle, Hospital, RequestMedicalType, User as UserType, HistoryLog, Driver } from '../types.js';
import { normalizeText } from '../lib/normalize.js';
import { formatCPF, validateCPF } from '../utils/cpf.js';
import ConfirmDialog from './ConfirmDialog.js';

interface SchedulesSectionProps {
  currentUser: UserType;
  onOpenHospitals: () => void; // call callback to redirect to hopitals tab if user clicks "adicionar hospital"
}

export default function SchedulesSection({ currentUser, onOpenHospitals }: SchedulesSectionProps) {
  // Global States
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [history, setHistory] = useState<HistoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [patientName, setPatientName] = useState('');
  const [patientCpf, setPatientCpf] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tripType, setTripType] = useState<'ida_e_volta' | 'apenas_ida' | 'apenas_retorno'>('ida_e_volta');
  const [vehicleId, setVehicleId] = useState('');
  const [returnVehicleId, setReturnVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [returnDriverId, setReturnDriverId] = useState('');
  const [useDifferentReturnVehicle, setUseDifferentReturnVehicle] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [requestType, setRequestType] = useState<RequestMedicalType>('Consulta/Exame');
  const [recurrentTypeDetails, setRecurrentTypeDetails] = useState('Quimioterapia');
  const [companionName, setCompanionName] = useState('');
  const [companionPhone1, setCompanionPhone1] = useState('');
  const [companionPhone2, setCompanionPhone2] = useState('');
  const [isBedridden, setIsBedridden] = useState(false);

  // Edit State
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  // Conclude State
  const [concludingScheduleId, setConcludingScheduleId] = useState<string | null>(null);

  // Global occupancy status for a selected single date (to trigger the fully booked vehicles notice banner)
  const [busyDatesWarning, setBusyDatesWarning] = useState<string | null>(null);

  // Filter & Search states for the travels table
  const [activeTab, setActiveTab] = useState<'ativos' | 'historico'>('ativos');
  const [filterDate, setFilterDate] = useState('');
  const [filterVehicleId, setFilterVehicleId] = useState('');
  const [filterSearchTerm, setFilterSearchTerm] = useState('');
  const [showPrintWarning, setShowPrintWarning] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const isUserOnly = currentUser.profile === 'Motorista';

  const handlePrint = () => {
    // Check if running inside an iframe (like AI Studio preview sandboxed frame)
    if (window.self !== window.top) {
      setShowPrintWarning(true);
    } else {
      window.print();
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch vehicles, hospitals, active schedules, and history in parallel
      const headers = { 'x-user-id': currentUser.token || currentUser.id };
      const [resVeh, resDrivers, resHosp, resSched, resHist] = await Promise.all([
        fetch('/api/vehicles', { headers }),
        fetch('/api/drivers', { headers }),
        fetch('/api/hospitals', { headers }),
        fetch('/api/schedules', { headers }),
        fetch('/api/schedules/history', { headers })
      ]);

      if (!resVeh.ok || !resDrivers.ok || !resHosp.ok || !resSched.ok || !resHist.ok) {
        throw new Error('Falha ao obter dados operacionais do servidor.');
      }

      setVehicles(await resVeh.json());
      setDrivers(await resDrivers.json());
      setHospitals(await resHosp.json());
      setSchedules(await resSched.json());
      setHistory(await resHist.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser.id]);

  // Real-time occupant statistics to notify user if ALL vehicles are booked for a certain date range
  useEffect(() => {
    if (!startDate) {
      setBusyDatesWarning(null);
      return;
    }

    const checkGlobalOccupancy = async () => {
      try {
        const response = await fetch(`/api/occupancy-check?date=${startDate}`, {
          headers: { 'x-user-id': currentUser.token || currentUser.id }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.allVehiclesFull) {
            setBusyDatesWarning(`Atenção: Não há nenhuma vaga de veículo disponível para o dia ${startDate.split('-').reverse().join('/')}! Todos os veículos cadastrados encontram-se lotados nesta data.`);
          } else {
            setBusyDatesWarning(null);
          }
        }
      } catch {
        setBusyDatesWarning(null);
      }
    };

    checkGlobalOccupancy();
  }, [startDate, currentUser.id]);

  // Hospital query normalization search
  const filteredHospitals = hospitals.filter((h) => {
    if (!hospitalSearch.trim()) return false;
    const normalizedQuery = normalizeText(hospitalSearch);
    const normalizedName = normalizeText(h.name);
    return normalizedName.includes(normalizedQuery);
  });

  const handleSelectHospital = (h: Hospital) => {
    setSelectedHospitalId(h.id);
    setHospitalSearch(h.name);
  };

  const handleFormReset = () => {
    setPatientName('');
    setPatientCpf('');
    setStartDate('');
    setEndDate('');
    setTripType('ida_e_volta');
    setVehicleId('');
    setReturnVehicleId('');
    setDriverId('');
    setReturnDriverId('');
    setUseDifferentReturnVehicle(false);
    setHospitalSearch('');
    setSelectedHospitalId('');
    setRequestType('Consulta/Exame');
    setRecurrentTypeDetails('Quimioterapia');
    setCompanionName('');
    setCompanionPhone1('');
    setCompanionPhone2('');
    setIsBedridden(false);
    setEditingScheduleId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUserOnly && !editingScheduleId) return;

    setError(null);
    setSuccess(null);

    if (!patientName.trim() || !patientCpf.trim() || !startDate || !vehicleId || !selectedHospitalId || !requestType) {
      setError('Por favor, preencha todos os campos obrigatórios do agendamento (incluindo o CPF do paciente).');
      return;
    }

    const cleanCpf = patientCpf.replace(/\D/g, '');
    if (!validateCPF(cleanCpf)) {
      setError('O CPF informado para o paciente é inválido. Por favor, digite um CPF válido com 11 dígitos.');
      return;
    }

    try {
      const payload = {
        patientName: patientName.trim(),
        patientCpf: formatCPF(cleanCpf),
        startDate,
        endDate: startDate,
        tripType,
        vehicleId,
        returnVehicleId: useDifferentReturnVehicle && returnVehicleId ? returnVehicleId : undefined,
        driverId: driverId || undefined,
        returnDriverId: driverId || undefined,
        hospitalId: selectedHospitalId,
        requestType,
        recurrentTypeDetails: requestType === 'Procedimento especializado recorrente' ? recurrentTypeDetails : undefined,
        companionName: companionName.trim() || undefined,
        companionPhone1: companionPhone1.trim() || undefined,
        companionPhone2: companionPhone2.trim() || undefined,
        isBedridden
      };

      const url = editingScheduleId ? `/api/schedules/${editingScheduleId}` : '/api/schedules';
      const method = editingScheduleId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.token || currentUser.id
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar agendamento');
      }

      setSuccess(editingScheduleId ? 'Agendamento atualizado com sucesso!' : 'Agendamento cadastrado com sucesso!');
      handleFormReset();
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const startEdit = (s: Schedule) => {
    const hosp = hospitals.find(h => h.id === s.hospitalId);
    setEditingScheduleId(s.id);
    setPatientName(s.patientName);
    setPatientCpf(s.patientCpf || '');
    setStartDate(s.startDate);
    setEndDate(s.endDate);
    setTripType(s.tripType || (s.startDate === s.endDate ? 'ida_e_volta' : 'ida_e_volta'));
    setVehicleId(s.vehicleId);
    setDriverId(s.driverId || s.returnDriverId || '');
    setReturnDriverId(s.driverId || s.returnDriverId || '');
    if (s.returnVehicleId && s.returnVehicleId !== s.vehicleId) {
      setReturnVehicleId(s.returnVehicleId);
      setUseDifferentReturnVehicle(true);
    } else {
      setReturnVehicleId('');
      setUseDifferentReturnVehicle(false);
    }
    setSelectedHospitalId(s.hospitalId);
    setHospitalSearch(hosp ? hosp.name : '');
    setRequestType(s.requestType);
    if (s.recurrentTypeDetails) {
      setRecurrentTypeDetails(s.recurrentTypeDetails);
    }
    setCompanionName(s.companionName || '');
    setCompanionPhone1(s.companionPhone1 || '');
    setCompanionPhone2(s.companionPhone2 || '');
    setIsBedridden(Boolean(s.isBedridden));
    setCompanionName(s.companionName || '');
    setCompanionPhone1(s.companionPhone1 || '');
    setCompanionPhone2(s.companionPhone2 || '');

    // Smooth scroll to the form container
    setTimeout(() => {
      const formContainer = document.getElementById('scheduling-form-container');
      if (formContainer) {
        formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 100);
  };

  // Excluir Registro do Histórico (Apenas administradores)
  const handleDeleteHistory = async (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Excluir Registro do Histórico',
      message: 'Tem certeza de que deseja EXCLUIR permanentemente este registro de viagem do histórico? Esta ação é irreversível.',
      type: 'danger',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        setError(null);
        setSuccess(null);
        try {
          const response = await fetch(`/api/schedules/history/${id}`, {
            method: 'DELETE',
            headers: {
              'x-user-id': currentUser.token || currentUser.id
            }
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'Erro ao excluir registro do histórico');
          }
          setSuccess('Registro excluído do histórico com sucesso!');
          fetchData();
        } catch (err: any) {
          setError(err.message);
        }
      }
    });
  };

  const handleDeleteSchedule = async (id: string) => {
    const s = schedules.find(item => item.id === id);
    if (!s) return;

    let confirmMsg = 'Tem certeza de que deseja EXCLUIR este agendamento de viagem?';
    if (s.createdByUserId !== currentUser.id) {
      confirmMsg = `Atenção: Você NÃO é o responsável original por este agendamento.\n\nPor você ser Administrador, o agendamento entrará em uma fila de exclusão pendente por 24 horas. Durante este tempo, você ou o responsável original poderão reverter a exclusão.\n\nDeseja prosseguir e agendar a exclusão?`;
    }

    setConfirmConfig({
      isOpen: true,
      title: 'Excluir Agendamento',
      message: confirmMsg,
      type: s.createdByUserId !== currentUser.id ? 'warning' : 'danger',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        setError(null);
        setSuccess(null);
        try {
          const response = await fetch(`/api/schedules/${id}`, {
            method: 'DELETE',
            headers: {
              'x-user-id': currentUser.token || currentUser.id
            }
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'Erro ao excluir agendamento');
          }
          setSuccess(data.message || 'Exclusão processada com sucesso!');
          fetchData();
        } catch (err: any) {
          setError(err.message);
        }
      }
    });
  };

  const handleCancelDeletion = async (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Cancelar Exclusão',
      message: 'Deseja realmente cancelar a exclusão deste agendamento de viagem e mantê-lo ativo?',
      type: 'info',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        setError(null);
        setSuccess(null);
        try {
          const response = await fetch(`/api/schedules/${id}/cancel-deletion`, {
            method: 'POST',
            headers: {
              'x-user-id': currentUser.token || currentUser.id
            }
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'Erro ao cancelar exclusão');
          }
          setSuccess(data.message || 'Exclusão cancelada com sucesso!');
          fetchData();
        } catch (err: any) {
          setError(err.message);
        }
      }
    });
  };

  const handleUpdateConfirmation = async (id: string, status: string) => {
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/schedules/${id}/confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.token || currentUser.id
        },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao registrar confirmação');
      }
      setSuccess(data.message || 'Confirmação registrada com sucesso!');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getVehicleName = (vId: string) => {
    const v = vehicles.find(item => item.id === vId);
    return v ? `${v.brand} ${v.model} (${v.plate})` : 'Desconhecido';
  };

  const getDriverName = (dId: string) => {
    const d = drivers.find(item => item.id === dId);
    return d ? d.fullName : 'Não designado';
  };

  const getVehicleOccupancyOnDate = (vId: string, dateStr: string, excludeScheduleId?: string) => {
    let count = 0;
    const dObj = new Date(dateStr);
    
    for (const s of schedules) {
      if (excludeScheduleId && s.id === excludeScheduleId) continue;
      
      const sStart = new Date(s.startDate);
      const sEnd = new Date(s.endDate);
      
      if (dObj >= sStart && dObj <= sEnd) {
        const isReturnDate = dateStr === s.endDate;
        const assignedVehicleId = isReturnDate ? (s.returnVehicleId || s.vehicleId) : s.vehicleId;
        
        if (assignedVehicleId === vId) {
          const seats = (s.companionName && s.companionName.trim().length > 0) ? 2 : 1;
          count += seats;
        }
      }
    }
    return count;
  };

  const getBedriddenOccupancyOnDate = (vId: string, dateStr: string, excludeScheduleId?: string) => {
    let count = 0;
    const dObj = new Date(dateStr);
    
    for (const s of schedules) {
      if (excludeScheduleId && s.id === excludeScheduleId) continue;
      if (!s.isBedridden) continue;
      
      const sStart = new Date(s.startDate);
      const sEnd = new Date(s.endDate);
      
      if (dObj >= sStart && dObj <= sEnd) {
        const isReturnDate = dateStr === s.endDate;
        const assignedVehicleId = isReturnDate ? (s.returnVehicleId || s.vehicleId) : s.vehicleId;
        
        if (assignedVehicleId === vId) {
          count++;
        }
      }
    }
    return count;
  };

  const getHospitalName = (hId: string) => {
    const h = hospitals.find(item => item.id === hId);
    return h ? h.name : 'Desconhecido';
  };

  const filteredSchedules = schedules.filter((s) => {
    if (filterDate) {
      const matchesDate = s.startDate <= filterDate && s.endDate >= filterDate;
      if (!matchesDate) return false;
    }
    if (filterVehicleId) {
      const matchesVehicle = s.vehicleId === filterVehicleId || s.returnVehicleId === filterVehicleId;
      if (!matchesVehicle) return false;
    }
    if (filterSearchTerm.trim()) {
      const q = normalizeText(filterSearchTerm);
      const qDigits = filterSearchTerm.replace(/\D/g, '');
      const patient = normalizeText(s.patientName || '');
      const patientCpfNorm = normalizeText(s.patientCpf || '');
      const patientCpfDigits = (s.patientCpf || '').replace(/\D/g, '');
      const hosp = normalizeText(getHospitalName(s.hospitalId));
      const veh = normalizeText(getVehicleName(s.vehicleId));
      const retVeh = normalizeText(getVehicleName(s.returnVehicleId || ''));
      const driver = normalizeText(getDriverName(s.driverId || ''));
      const retDriver = normalizeText(getDriverName(s.returnDriverId || ''));
      const matchesText = patient.includes(q) || patientCpfNorm.includes(q) || (qDigits && patientCpfDigits.includes(qDigits)) || hosp.includes(q) || veh.includes(q) || retVeh.includes(q) || driver.includes(q) || retDriver.includes(q);
      if (!matchesText) return false;
    }
    return true;
  });

  const filteredHistory = history.filter((h) => {
    if (filterDate) {
      const matchesDate = h.startDate <= filterDate && h.endDate >= filterDate;
      if (!matchesDate) return false;
    }
    if (filterVehicleId) {
      const vehObj = vehicles.find(v => v.id === filterVehicleId);
      if (vehObj) {
        const qPlate = normalizeText(vehObj.plate);
        const qModel = normalizeText(vehObj.model);
        const hVeh = normalizeText(h.vehicleDetails || '');
        const matchesVehicle = hVeh.includes(qPlate) || hVeh.includes(qModel);
        if (!matchesVehicle) return false;
      }
    }
    if (filterSearchTerm.trim()) {
      const q = normalizeText(filterSearchTerm);
      const qDigits = filterSearchTerm.replace(/\D/g, '');
      const patient = normalizeText(h.patientName || '');
      const patientCpfNorm = normalizeText(h.patientCpf || '');
      const patientCpfDigits = (h.patientCpf || '').replace(/\D/g, '');
      const hosp = normalizeText(h.hospitalName || '');
      const veh = normalizeText(h.vehicleDetails || '');
      const matchesText = patient.includes(q) || patientCpfNorm.includes(q) || (qDigits && patientCpfDigits.includes(qDigits)) || hosp.includes(q) || veh.includes(q);
      if (!matchesText) return false;
    }
    return true;
  });

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-8" id="schedules-dashboard">
      
      {/* Printable-only elegant header */}
      <div className="hidden print:block border-b-2 border-slate-950 pb-5 mb-8 text-black">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-950">Portal TFD — Relatório de Viagens</h1>
            <p className="text-sm text-slate-600 mt-1">Secretaria Municipal de Saúde — Setor de Transportes e Tratamento Fora do Domicílio</p>
          </div>
          <div className="text-right text-xs font-mono text-slate-600">
            <div>Data: {new Date().toLocaleDateString('pt-BR')}</div>
            <div>Hora: {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-slate-500 block uppercase font-bold text-[10px] tracking-wider mb-1">Tipo de Relatório:</span>
            <span className="font-extrabold text-base text-slate-900">{activeTab === 'ativos' ? 'Agendamentos Ativos' : 'Histórico de Viagens Concluídas'}</span>
          </div>
          <div>
            <span className="text-slate-500 block uppercase font-bold text-[10px] tracking-wider mb-1">Emitido por:</span>
            <span className="font-extrabold text-base text-slate-900">@{currentUser.name} ({currentUser.profile})</span>
          </div>
        </div>
      </div>

      {/* 1. Occupancy & Fully Booked Vehicle Alert (Notice Banner) */}
      {busyDatesWarning && (
        <div id="full-occupancy-alert" className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start space-x-3 text-amber-900 animate-fadeIn no-print">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs font-semibold leading-relaxed">
            <span className="block font-bold text-sm text-amber-800 mb-0.5">ALERTA DE LOTAÇÃO MÁXIMA</span>
            {busyDatesWarning}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-slate-200 pb-4 no-print">
        <h2 id="section-title-schedules" className="text-xl font-bold text-slate-900 tracking-tight flex items-center">
          <ClipboardList className="h-5 w-5 mr-2 text-blue-600" />
          Central de Agendamento de Viagens (TFD)
        </h2>
        <p className="text-sm text-slate-500">
          Pesquise hospitais de destino, controle e programe viagens de pacientes respeitando a capacidade máxima de assentos de cada transporte.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Scheduling form or edit form (for Admin / Coordinator / Active Edit) */}
        {(!isUserOnly || editingScheduleId) && (
          <div id="scheduling-form-container" className="lg:col-span-1 no-print">
            <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-lg">
                {editingScheduleId ? 'Editar Agendamento' : 'Novo Agendamento'}
              </h3>
              <p className="text-xs text-slate-500 pb-1">
                {editingScheduleId ? 'Edite os dados básicos e reagende a viagem.' : 'Agende uma nova viagem e paciente.'}
              </p>

              {error && (
                <div id="schedule-form-error" className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div id="schedule-form-success" className="p-3.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
                  <span>{success}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Patient name & CPF */}
                <div className="space-y-3">
                  <div>
                    <label htmlFor="sched-patient" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Nome Completo do Paciente (Obrigatório)
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        id="sched-patient"
                        type="text"
                        required
                        placeholder="Ex: Maria das Neves Pinheiro"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="sched-patient-cpf" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>CPF do Paciente (Obrigatório)</span>
                      {patientCpf.replace(/\D/g, '').length === 11 && (
                        <span className={`text-[10px] font-bold ${validateCPF(patientCpf) ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {validateCPF(patientCpf) ? '✓ CPF Válido' : '✗ CPF Inválido'}
                        </span>
                      )}
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FileText className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        id="sched-patient-cpf"
                        type="text"
                        required
                        maxLength={14}
                        placeholder="000.000.000-00"
                        value={patientCpf}
                        onChange={(e) => setPatientCpf(formatCPF(e.target.value))}
                        className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Condição do Paciente: Acamado ou Não Acamado */}
                <div className={`p-4 rounded-2xl border transition-all ${isBedridden ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-500/20' : 'bg-slate-50 border-slate-150'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="text-base">🛏️</span> Condição do Paciente
                    </span>
                    {isBedridden && (
                      <span className="text-[10px] font-black bg-rose-600 text-white px-2.5 py-0.5 rounded-full uppercase tracking-widest shadow-sm">
                        Paciente Acamado
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className={`flex items-center space-x-2.5 p-3 rounded-xl border cursor-pointer transition-all ${!isBedridden ? 'bg-white border-blue-500 text-blue-900 font-bold shadow-sm' : 'bg-white/80 border-slate-200 text-slate-700'}`}>
                      <input
                        type="radio"
                        name="patient-condition"
                        checked={!isBedridden}
                        onChange={() => setIsBedridden(false)}
                        className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <div className="text-xs">
                        <span className="font-bold block">Não Acamado</span>
                        <span className="text-[10px] text-slate-500">Senta em poltrona/assento padrão</span>
                      </div>
                    </label>

                    <label className={`flex items-center space-x-2.5 p-3 rounded-xl border cursor-pointer transition-all ${isBedridden ? 'bg-rose-100 border-rose-500 text-rose-950 font-black shadow-sm' : 'bg-white/80 border-slate-200 text-slate-700'}`}>
                      <input
                        type="radio"
                        name="patient-condition"
                        checked={isBedridden}
                        onChange={() => setIsBedridden(true)}
                        className="text-rose-600 focus:ring-rose-500 h-4 w-4"
                      />
                      <div className="text-xs">
                        <span className="font-bold block flex items-center gap-1 text-rose-950">
                          <span>Acamado (Maca/Leito)</span>
                        </span>
                        <span className="text-[10px] text-rose-700">Necessita de vaga/maca na ambulância</span>
                      </div>
                    </label>
                  </div>

                  {isBedridden && (() => {
                    const selVeh = vehicles.find(v => v.id === vehicleId);
                    if (selVeh && selVeh.type !== 'Ambulância') {
                      return (
                        <div className="mt-2.5 p-2.5 bg-rose-100 border border-rose-300 rounded-xl text-xs text-rose-900 flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                          <span>Atenção: Apenas <strong>Ambulâncias</strong> possuem leitos/macas para pacientes acamados. Selecione uma ambulância como veículo.</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Companion details (Optional) */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Acompanhante & Contatos
                    </span>
                    <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-150">
                      ℹ️ O acompanhante ocupa +1 vaga no veículo
                    </span>
                  </div>
                  
                  <div>
                    <label htmlFor="sched-companion-name" className="block text-xs font-semibold text-slate-700 mb-1">
                      Nome do Acompanhante
                    </label>
                    <input
                      id="sched-companion-name"
                      type="text"
                      placeholder="Nome do acompanhante (se houver)"
                      value={companionName}
                      onChange={(e) => setCompanionName(e.target.value)}
                      className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="sched-companion-phone-1" className="block text-xs font-semibold text-slate-700 mb-1">
                        Telefone Contato 1
                      </label>
                      <input
                        id="sched-companion-phone-1"
                        type="text"
                        placeholder="Ex: (00) 00000-0000"
                        value={companionPhone1}
                        onChange={(e) => setCompanionPhone1(e.target.value)}
                        className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                      />
                    </div>
                    <div>
                      <label htmlFor="sched-companion-phone-2" className="block text-xs font-semibold text-slate-700 mb-1">
                        Telefone Contato 2
                      </label>
                      <input
                        id="sched-companion-phone-2"
                        type="text"
                        placeholder="Ex: (00) 00000-0000"
                        value={companionPhone2}
                        onChange={(e) => setCompanionPhone2(e.target.value)}
                        className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* 1. Vehicle and Driver Selection FIRST */}
                <div className="space-y-4 border-l-2 border-blue-500 pl-4 py-1">

                  {/* Tipo de Viagem & Data da Viagem */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-4">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                        Tipo de Viagem
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <label className={`flex flex-col p-3 border rounded-xl cursor-pointer transition-all ${tripType === 'ida_e_volta' ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="trip-type"
                              value="ida_e_volta"
                              checked={tripType === 'ida_e_volta'}
                              onChange={() => {
                                setTripType('ida_e_volta');
                                setReturnVehicleId('');
                                setUseDifferentReturnVehicle(false);
                              }}
                              className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                            />
                            <span className="text-xs font-bold text-slate-900">Ida e Volta</span>
                          </div>
                          <span className="text-[10px] text-slate-500 mt-1">Ida e volta no mesmo dia</span>
                        </label>

                        <label className={`flex flex-col p-3 border rounded-xl cursor-pointer transition-all ${tripType === 'apenas_ida' ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="trip-type"
                              value="apenas_ida"
                              checked={tripType === 'apenas_ida'}
                              onChange={() => {
                                setTripType('apenas_ida');
                                setReturnVehicleId('');
                                setUseDifferentReturnVehicle(false);
                              }}
                              className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                            />
                            <span className="text-xs font-bold text-slate-900">Apenas Ida</span>
                          </div>
                          <span className="text-[10px] text-slate-500 mt-1">Viagem só de ida</span>
                        </label>

                        <label className={`flex flex-col p-3 border rounded-xl cursor-pointer transition-all ${tripType === 'apenas_retorno' ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="trip-type"
                              value="apenas_retorno"
                              checked={tripType === 'apenas_retorno'}
                              onChange={() => {
                                setTripType('apenas_retorno');
                                setReturnVehicleId('');
                                setUseDifferentReturnVehicle(false);
                              }}
                              className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                            />
                            <span className="text-xs font-bold text-slate-900">Apenas Retorno</span>
                          </div>
                          <span className="text-[10px] text-slate-500 mt-1">Buscar no hospital (alta)</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="sched-travel-date" className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Data da Viagem
                      </label>
                      <input
                        id="sched-travel-date"
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          setEndDate(e.target.value);
                        }}
                        className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold"
                      />
                      {startDate && (
                        <p className="text-[10px] font-bold text-blue-600 mt-1.5 flex items-center space-x-1">
                          <span>Data selecionada:</span>
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            {startDate.split('-').reverse().join('/')}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Ida Section */}
                  <div className="space-y-3 bg-slate-50/60 p-4 rounded-2xl border border-slate-150">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                      {tripType === 'apenas_retorno' ? 'Retorno (Buscar no Hospital/Alta)' : tripType === 'apenas_ida' ? 'Viagem de Ida' : 'Ida (Partida)'}
                    </span>
                    
                    {/* Veículo */}
                    <div>
                      <label htmlFor="sched-vehicle" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between flex-wrap gap-1">
                        <span>{tripType === 'apenas_retorno' ? 'Veículo de Retorno' : 'Veículo'}</span>
                        {vehicleId && startDate && (() => {
                          const v = vehicles.find(x => x.id === vehicleId);
                          if (!v) return null;
                          const count = getVehicleOccupancyOnDate(v.id, startDate, editingScheduleId);
                          const isFull = count >= v.maxPassengers;
                          const bedriddenCount = getBedriddenOccupancyOnDate(v.id, startDate, editingScheduleId);
                          const bedriddenCap = v.vagasAcamados ?? 1;
                          const isBedriddenFull = bedriddenCount >= bedriddenCap;

                          return (
                            <div className="flex flex-wrap items-center gap-1">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isFull ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                Geral: {count}/{v.maxPassengers} {isFull ? '(LOTADO)' : ''}
                              </span>
                              {v.type === 'Ambulância' && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isBedriddenFull ? 'bg-rose-200 text-rose-900 border border-rose-300' : 'bg-rose-100 text-rose-800 border border-rose-200'}`}>
                                  🛏️ Acamados: {bedriddenCount}/{bedriddenCap} {isBedriddenFull ? '(SEM VAGAS)' : ''}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </label>
                      <select
                        id="sched-vehicle"
                        required
                        value={vehicleId}
                        onChange={(e) => {
                          setVehicleId(e.target.value);
                        }}
                        className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold"
                      >
                        <option value="">
                          {tripType === 'apenas_retorno' ? 'Selecione o veículo para o retorno...' : 'Selecione o veículo...'}
                        </option>
                        {vehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.type === 'Ambulância' ? '🚑 ' : ''}{v.brand} {v.model} ({v.plate}) — Cap: {v.maxPassengers} pass.{v.type === 'Ambulância' ? ` | 🛏️ ${v.vagasAcamados ?? 1} vaga(s) acamados` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Motorista */}
                    <div>
                      <label htmlFor="sched-driver" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        {tripType === 'apenas_retorno' ? 'Motorista de Retorno' : 'Motorista'}
                      </label>
                      <select
                        id="sched-driver"
                        value={driverId}
                        onChange={(e) => setDriverId(e.target.value)}
                        className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold"
                      >
                        <option value="">
                          {tripType === 'apenas_retorno' ? 'Selecione o motorista para o retorno...' : 'Selecione o motorista...'}
                        </option>
                        {drivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.fullName} (CNH: {d.cnhType})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Volta options & Customizers */}
                  {tripType === 'ida_e_volta' && (
                    <div className="space-y-3 bg-slate-50/60 p-4 rounded-2xl border border-slate-150">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Volta (Retorno)</span>
                      
                      {/* Use Different Return Vehicle Toggle */}
                      <div className="flex items-center space-x-2 py-1">
                        <input
                          type="checkbox"
                          id="use-different-return-vehicle"
                          checked={useDifferentReturnVehicle}
                          onChange={(e) => {
                            setUseDifferentReturnVehicle(e.target.checked);
                            if (!e.target.checked) {
                              setReturnVehicleId('');
                            }
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        <label htmlFor="use-different-return-vehicle" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                          Utilizar veículo diferente na Volta
                        </label>
                      </div>

                      {useDifferentReturnVehicle && (
                        <div>
                          <label htmlFor="sched-return-vehicle" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between flex-wrap gap-1">
                            <span>Veículo de Volta</span>
                            {returnVehicleId && endDate && (() => {
                              const v = vehicles.find(x => x.id === returnVehicleId);
                              if (!v) return null;
                              const count = getVehicleOccupancyOnDate(v.id, endDate, editingScheduleId);
                              const isFull = count >= v.maxPassengers;
                              const bedriddenCount = getBedriddenOccupancyOnDate(v.id, endDate, editingScheduleId);
                              const bedriddenCap = v.vagasAcamados ?? 1;
                              const isBedriddenFull = bedriddenCount >= bedriddenCap;

                              return (
                                <div className="flex flex-wrap items-center gap-1">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isFull ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                    Geral Volta: {count}/{v.maxPassengers} {isFull ? '(LOTADO)' : ''}
                                  </span>
                                  {v.type === 'Ambulância' && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isBedriddenFull ? 'bg-rose-200 text-rose-900 border border-rose-300' : 'bg-rose-100 text-rose-800 border border-rose-200'}`}>
                                      🛏️ Acamados Volta: {bedriddenCount}/{bedriddenCap} {isBedriddenFull ? '(SEM VAGAS)' : ''}
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </label>
                          <select
                            id="sched-return-vehicle"
                            required={useDifferentReturnVehicle}
                            value={returnVehicleId}
                            onChange={(e) => setReturnVehicleId(e.target.value)}
                            className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold"
                          >
                            <option value="">Selecione o veículo para volta...</option>
                            {vehicles.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.type === 'Ambulância' ? '🚑 ' : ''}{v.brand} {v.model} ({v.plate}) — Cap: {v.maxPassengers} pass.{v.type === 'Ambulância' ? ` | 🛏️ ${v.vagasAcamados ?? 1} vaga(s) acamados` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Motorista de Volta is removed as it is always the same as the outbound driver */}
                    </div>
                  )}

                  {/* Calendars displaying dynamically below choices */}
                  <div className="space-y-4">
                    {/* Calendar Ida */}
                    {(() => {
                      const v = vehicles.find(x => x.id === vehicleId);
                      if (!v) return (
                        <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                          Selecione um <strong>{tripType === 'apenas_retorno' ? 'veículo de retorno' : 'veículo'}</strong> acima para exibir o calendário de vagas.
                        </div>
                      );
                      return (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                            {tripType === 'apenas_retorno' ? 'Selecione a Data de Retorno no Calendário abaixo:' : 'Selecione a Data de Ida no Calendário abaixo:'}
                          </span>
                          <VehicleCalendar
                            vehicle={v}
                            editingScheduleId={editingScheduleId}
                            getVehicleOccupancyOnDate={getVehicleOccupancyOnDate}
                            startDate={startDate}
                            endDate={endDate}
                            onSelectDate={(date) => {
                              setStartDate(date);
                              setEndDate(date);
                            }}
                          />
                        </div>
                      );
                    })()}

                    {/* Calendar Volta */}
                    {tripType === 'ida_e_volta' && useDifferentReturnVehicle && (() => {
                      const v = vehicles.find(x => x.id === returnVehicleId);
                      if (!v) return (
                        <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                          Selecione um <strong>veículo de volta</strong> acima para exibir o calendário de agendamento de volta.
                        </div>
                      );
                      return (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                            Selecione a Data no Calendário de Volta abaixo:
                          </span>
                          <VehicleCalendar
                            vehicle={v}
                            editingScheduleId={editingScheduleId}
                            getVehicleOccupancyOnDate={getVehicleOccupancyOnDate}
                            startDate={startDate}
                            endDate={endDate}
                            onSelectDate={(date) => {
                              setStartDate(date);
                              setEndDate(date);
                            }}
                          />
                        </div>
                      );
                    })()}
                  </div>

                </div>

                {/* Hospital Selection search box */}
                <div className="relative">
                  <label htmlFor="sched-hospital-search" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-0.5">
                    Hospital de Destino
                  </label>
                  <p className="text-[10px] text-slate-400 mb-1">Filtre digitando o nome do hospital ou clínica abaixo</p>
                  
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Landmark className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      id="sched-hospital-search"
                      type="text"
                      placeholder="Pesquisar hospital..."
                      value={hospitalSearch}
                      onChange={(e) => {
                        setHospitalSearch(e.target.value);
                        if (!e.target.value) {
                          setSelectedHospitalId('');
                        }
                      }}
                      className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {/* Sugestion listing box */}
                  {filteredHospitals.length > 0 && !selectedHospitalId && (
                    <div id="hospital-search-suggestions" className="absolute z-10 w-full bg-white mt-1.5 border border-slate-150 rounded-xl shadow-lg max-h-40 overflow-y-auto divide-y divide-slate-100 text-xs">
                      {filteredHospitals.map((h) => (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => handleSelectHospital(h)}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-900 flex flex-col focus:outline-none focus:bg-slate-50"
                        >
                          <span className="font-semibold">{h.name}</span>
                          <span className="text-[10px] text-slate-500 block truncate">{h.address}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* "Add Hospital to Database" custom callback notice */}
                  {hospitalSearch && filteredHospitals.length === 0 && !selectedHospitalId && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                      <p className="text-xs text-red-700 font-semibold mb-1">Nenhum hospital encontrado com esse nome.</p>
                      <button
                        id="form-add-hospital-db-btn"
                        type="button"
                        onClick={onOpenHospitals}
                        className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center space-x-0.5 focus:outline-none"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Adicionar hospital ao banco de dados</span>
                      </button>
                    </div>
                  )}

                  {selectedHospitalId && (
                    <p className="text-[10px] text-blue-600 font-bold flex items-center mt-1">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Destino Vinculado: {getHospitalName(selectedHospitalId)}
                    </p>
                  )}
                </div>

                {/* Request Medical Type */}
                <div>
                  <label htmlFor="sched-request-type" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Tipo de Requisição Médica
                  </label>
                  <select
                    id="sched-request-type"
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value as RequestMedicalType)}
                    className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  >
                    <option value="Consulta/Exame">Consulta/Exame</option>
                    <option value="Cirurgia">Cirurgia</option>
                    <option value="Procedimento especializado recorrente">Procedimento especializado recorrente</option>
                  </select>
                </div>

                {requestType === 'Procedimento especializado recorrente' && (
                  <div>
                    <label htmlFor="sched-recurrent-type" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Especificar Tratamento Recorrente
                    </label>
                    <select
                      id="sched-recurrent-type"
                      value={recurrentTypeDetails}
                      onChange={(e) => setRecurrentTypeDetails(e.target.value)}
                      className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    >
                      <option value="Quimioterapia">Quimioterapia</option>
                      <option value="Hemodiálise">Hemodiálise</option>
                      <option value="Radioterapia">Radioterapia</option>
                      <option value="Outros">Outras Terapias</option>
                    </select>
                  </div>
                )}

                <div className="flex space-x-2 pt-2">
                  <button
                    id="sched-submit-btn"
                    type="submit"
                    className="flex-1 flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-md shadow-blue-100 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors pointer-elements-auto focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {editingScheduleId ? 'Salvar Edição' : 'Agendar Viagem'}
                  </button>
                  {editingScheduleId && (
                    <button
                      id="sched-cancel-edit-btn"
                      type="button"
                      onClick={handleFormReset}
                      className="px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold bg-white rounded-xl text-sm hover:bg-slate-50 transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                </div>

              </form>
            </div>
          </div>
        )}

        {/* Right side: Interactive Tab lists (Ativos vs Históricos de Auditorias) */}
        <div className={(isUserOnly && !editingScheduleId) ? 'lg:col-span-3' : 'lg:col-span-2'}>
          
          {/* Section tab buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 mb-6 font-sans gap-4 no-print">
            <div className="flex overflow-x-auto scrollbar-none">
              <button
                id="tab-schedules-active"
                onClick={() => setActiveTab('ativos')}
                className={`flex items-center space-x-2 border-b-2 py-3 px-6 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'ativos'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Truck className="h-4 w-4" />
                <span>Agendamentos Ativos ({filteredSchedules.length})</span>
              </button>
              <button
                id="tab-schedules-history"
                onClick={() => setActiveTab('historico')}
                className={`flex items-center space-x-2 border-b-2 py-3 px-6 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'historico'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Histórico de Viagens Concluídas ({filteredHistory.length})</span>
              </button>
            </div>

            {/* Print trigger button */}
            <button
              id="print-schedules-btn"
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl shadow-sm transition-all focus:outline-none shrink-0 cursor-pointer pointer-elements-auto"
              title="Abre as opções de impressão do sistema"
            >
              <Printer className="h-4 w-4 text-slate-500" />
              <span>Imprimir Lista</span>
            </button>
          </div>

          {/* Filter Controls Bar */}
          <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200 no-print">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span>Filtros de Agendamentos e Viagens</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              {/* Filter by Date */}
              <div>
                <label htmlFor="filter-schedule-date" className="block text-[11px] font-bold text-slate-600 mb-1">
                  Filtrar por Data:
                </label>
                <input
                  id="filter-schedule-date"
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              {/* Filter by Vehicle (Model & Plate) */}
              <div>
                <label htmlFor="filter-schedule-vehicle" className="block text-[11px] font-bold text-slate-600 mb-1">
                  Filtrar por Veículo (Modelo e Placa):
                </label>
                <select
                  id="filter-schedule-vehicle"
                  value={filterVehicleId}
                  onChange={(e) => setFilterVehicleId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="">Todos os Veículos</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.brand} {v.model} ({v.plate})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Text Search */}
              <div>
                <label htmlFor="filter-schedule-search" className="block text-[11px] font-bold text-slate-600 mb-1">
                  Buscar por Paciente / Hospital / Motorista:
                </label>
                <input
                  id="filter-schedule-search"
                  type="text"
                  placeholder="Digite para buscar..."
                  value={filterSearchTerm}
                  onChange={(e) => setFilterSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>

            {(filterDate || filterVehicleId || filterSearchTerm) && (
              <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-blue-700 font-semibold">
                  Filtros ativos. Mostrando {activeTab === 'ativos' ? filteredSchedules.length : filteredHistory.length} resultados.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFilterDate('');
                    setFilterVehicleId('');
                    setFilterSearchTerm('');
                  }}
                  className="px-3 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                >
                  Limpar Filtros
                </button>
              </div>
            )}
          </div>

          {/* List specific error and success alert messages */}
          {error && (
            <div id="list-error-alert" className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-start justify-between space-x-2 no-print">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 focus:outline-none cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {success && (
            <div id="list-success-alert" className="mb-6 p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl text-xs flex items-start justify-between space-x-2 no-print">
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
                <span>{success}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccess(null)}
                className="text-blue-400 hover:text-blue-600 focus:outline-none cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : activeTab === 'ativos' ? (
            filteredSchedules.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-150 text-center text-slate-400 text-sm">
                {(filterDate || filterVehicleId || filterSearchTerm)
                  ? 'Nenhum agendamento ativo encontrado para os filtros selecionados.'
                  : 'Nenhum agendamento ativo cadastrado.'}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSchedules.map((s) => {
                  const isCreator = s.createdByUserId === currentUser.id;
                  const isAdmin = currentUser.profile === 'Administrador';
                  const canEdit = (isCreator || isAdmin) && !s.isDeletionPending;
                  const isPastReturn = s.endDate <= todayStr;

                  return (
                    <div 
                      key={s.id} 
                      className={`bg-white p-6 rounded-2xl border transition-all duration-200 ${
                        s.isDeletionPending
                          ? 'border-red-300 border-dashed bg-red-50/5 shadow-sm'
                          : isPastReturn 
                            ? 'border-amber-200 shadow-sm shadow-amber-50 bg-amber-50/10' 
                            : 'border-slate-150 shadow-sm hover:shadow-md'
                      }`}
                    >
                      {/* Deletion Pending Banner */}
                      {s.isDeletionPending && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-red-900 gap-3">
                          <div className="flex items-start space-x-2">
                            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold block">EXCLUSÃO PROGRAMADA (PENDENTE)</span>
                              <span>
                                Solicitada pelo Administrador <strong className="text-red-950">@{s.deletedByAdminName || s.deletionRequestedByUserName}</strong> em {s.deletionRequestedAt ? new Date(s.deletionRequestedAt).toLocaleString('pt-BR') : ''}. O agendamento será excluído permanentemente após 24 horas da solicitação.
                              </span>
                            </div>
                          </div>
                          {(currentUser.profile === 'Administrador' || s.createdByUserId === currentUser.id) && (
                            <button
                              onClick={() => handleCancelDeletion(s.id)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xxs tracking-wider uppercase shadow transition-all duration-205 pointer-elements-auto focus:outline-none shrink-0 self-start sm:self-center"
                            >
                              Cancelar Exclusão
                            </button>
                          )}
                        </div>
                      )}


                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        
                        {/* Summary details */}
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                              <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                s.requestType === 'Cirurgia' ? 'bg-rose-100 text-rose-800 border border-rose-250/30' :
                                s.requestType === 'Consulta/Exame' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              }`}>
                                {s.requestType === 'Procedimento especializado recorrente' ? `${s.requestType} (${s.recurrentTypeDetails})` : s.requestType}
                              </span>
                              {s.isBedridden && (
                                <span className="inline-flex items-center gap-1 bg-rose-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                                  🛏️ Paciente Acamado
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-extrabold text-slate-950 text-base">{s.patientName}</h4>
                              {s.patientCpf && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  CPF: {s.patientCpf}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-6 text-xs text-slate-600">
                            <div className="flex items-center space-x-2 font-medium flex-wrap gap-y-1">
                              <Calendar className="h-4 w-4 text-blue-500 shrink-0" />
                              {s.startDate === s.endDate ? (
                                <span>Data da Viagem: <strong>{s.startDate.split('-').reverse().join('/')}</strong></span>
                              ) : (
                                <span>De: <strong>{s.startDate.split('-').reverse().join('/')}</strong> Até: <strong>{s.endDate.split('-').reverse().join('/')}</strong></span>
                              )}
                              
                              {(() => {
                                const type = s.tripType || (s.startDate === s.endDate ? 'ida_e_volta' : 'legacy');
                                if (type === 'ida_e_volta') return (
                                  <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100">
                                    Ida e Volta
                                  </span>
                                );
                                if (type === 'apenas_ida') return (
                                  <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-100">
                                    Apenas Ida
                                  </span>
                                );
                                if (type === 'apenas_retorno') return (
                                  <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-100">
                                    Apenas Retorno
                                  </span>
                                );
                                return null;
                              })()}
                            </div>
                            <div className="flex items-center space-x-2 font-medium">
                              <Truck className="h-4 w-4 text-blue-500 shrink-0" />
                              {s.returnVehicleId && s.returnVehicleId !== s.vehicleId ? (
                                <span className="truncate">
                                  Transporte — <span className="font-bold text-blue-600">Ida:</span> {getVehicleName(s.vehicleId)} | <span className="font-bold text-indigo-600">Volta:</span> {getVehicleName(s.returnVehicleId)}
                                </span>
                              ) : (
                                <span className="truncate">Transporte: {getVehicleName(s.vehicleId)}</span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 font-medium">
                              <User className="h-4 w-4 text-blue-500 shrink-0" />
                              {s.returnDriverId && s.returnDriverId !== s.driverId ? (
                                <span className="truncate">
                                  Motorista — <span className="font-bold text-blue-600">Ida:</span> {getDriverName(s.driverId || '')} | <span className="font-bold text-indigo-600">Volta:</span> {getDriverName(s.returnDriverId)}
                                </span>
                              ) : (
                                <span className="truncate">Motorista: {getDriverName(s.driverId || '')}</span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 font-medium col-span-1 md:col-span-2">
                              <Landmark className="h-4 w-4 text-blue-500 shrink-0" />
                              <span>Destino: {getHospitalName(s.hospitalId)}</span>
                            </div>
                          </div>

                          {(s.companionName || s.companionPhone1 || s.companionPhone2) && (
                            <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1 text-xs mt-1">
                              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                Acompanhante / Contatos
                              </span>
                              {s.companionName && (
                                <p className="text-slate-800 font-semibold">
                                  Nome: <span className="font-normal text-slate-600">{s.companionName}</span>
                                </p>
                              )}
                              {(s.companionPhone1 || s.companionPhone2) && (
                                <p className="text-slate-800 font-semibold">
                                  Telefones: <span className="font-normal text-slate-600">
                                    {[s.companionPhone1, s.companionPhone2].filter(Boolean).join(' | ')}
                                  </span>
                                </p>
                              )}
                            </div>
                          )}

                          {/* Seção de Confirmação da Viagem (Um dia antes) */}
                          <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-2 mt-1.5 no-print">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                Confirmação da Viagem (Um dia antes)
                              </span>
                              
                              {/* Badge do Status Atual */}
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                s.confirmationStatus === 'confirmado' ? 'bg-emerald-100 text-emerald-800 border border-emerald-250' :
                                s.confirmationStatus === 'sem_contato' ? 'bg-amber-100 text-amber-800 border border-amber-250' :
                                s.confirmationStatus === 'desistencia' ? 'bg-rose-100 text-rose-800 border border-rose-250' :
                                'bg-slate-100 text-slate-800 border border-slate-200'
                              }`}>
                                {s.confirmationStatus === 'confirmado' ? '✓ Confirmado pelo Solicitante' :
                                 s.confirmationStatus === 'sem_contato' ? '⚠ Não Confirmado: Sem Contato' :
                                 s.confirmationStatus === 'desistencia' ? '✗ Não Confirmado: Desistiu' :
                                 '⌛ Confirmação Pendente'}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-1.5 pt-1">
                              <button
                                onClick={() => handleUpdateConfirmation(s.id, 'confirmado')}
                                className={`px-2.5 py-1 text-xxs font-bold rounded-lg border transition-all cursor-pointer focus:outline-none ${
                                  s.confirmationStatus === 'confirmado'
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-black'
                                    : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                                }`}
                              >
                                Confirmado
                              </button>
                              
                              <button
                                onClick={() => handleUpdateConfirmation(s.id, 'sem_contato')}
                                className={`px-2.5 py-1 text-xxs font-bold rounded-lg border transition-all cursor-pointer focus:outline-none ${
                                  s.confirmationStatus === 'sem_contato'
                                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm font-black'
                                    : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
                                }`}
                                title="Sem contato: Coordenador/motorista não conseguiu contato"
                              >
                                Não Confirmou (Sem Contato)
                              </button>
                              
                              <button
                                onClick={() => handleUpdateConfirmation(s.id, 'desistencia')}
                                className={`px-2.5 py-1 text-xxs font-bold rounded-lg border transition-all cursor-pointer focus:outline-none ${
                                  s.confirmationStatus === 'desistencia'
                                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm font-black'
                                    : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                                }`}
                                title="Desistiu: O solicitante desistiu da viagem"
                              >
                                Não Confirmou (Desistiu)
                              </button>

                              {s.confirmationStatus && s.confirmationStatus !== 'pendente' && (
                                <button
                                  onClick={() => handleUpdateConfirmation(s.id, 'pendente')}
                                  className="px-2.5 py-1 text-xxs font-bold rounded-lg border bg-white text-slate-500 border-slate-200 hover:bg-slate-100 cursor-pointer focus:outline-none"
                                  title="Reverter para pendente"
                                >
                                  Reverter
                                </button>
                              )}
                            </div>

                            {s.confirmationUpdatedBy && (
                              <p className="text-[10px] text-slate-500 font-medium pt-0.5">
                                Registrado por: <span className="text-slate-700 font-bold">{s.confirmationUpdatedBy}</span>
                                {s.confirmationUpdatedAt && ` em ${new Date(s.confirmationUpdatedAt).toLocaleString('pt-BR')}`}
                              </p>
                            )}
                          </div>

                          {/* Print-only confirmation indicator */}
                          <div className="hidden print:block mt-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900">
                            <strong>Confirmação da Viagem:</strong> {
                              s.confirmationStatus === 'confirmado' ? 'CONFIRMADA pelo solicitante' :
                              s.confirmationStatus === 'sem_contato' ? 'NÃO CONFIRMADA (Sem contato com o solicitante)' :
                              s.confirmationStatus === 'desistencia' ? 'NÃO CONFIRMADA (O solicitante desistiu da viagem)' :
                              'CONFIRMAÇÃO PENDENTE'
                            } {s.confirmationUpdatedBy ? `(Registrado por: ${s.confirmationUpdatedBy}${s.confirmationUpdatedAt ? ` em ${new Date(s.confirmationUpdatedAt).toLocaleDateString('pt-BR')}` : ''})` : ''}
                          </div>
                        </div>

                        {/* Actions options */}
                        <div className="flex items-center space-x-2 shrink-0 self-end md:self-start no-print">
                          {canEdit ? (
                            <>
                              <button
                                id={`edit-sched-btn-${s.id}`}
                                onClick={() => startEdit(s)}
                                className="p-2 text-slate-500 bg-slate-50 border border-slate-200 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 rounded-xl transition-all duration-205 focus:outline-none"
                                title="Editar agendamento"
                              >
                                <Edit className="h-4 w-4" />
                              </button>

                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteSchedule(s.id)}
                                  className="p-2 text-red-600 bg-red-50 border border-red-100 hover:bg-red-600 hover:text-white rounded-xl transition-all duration-205 focus:outline-none"
                                  title="Excluir Agendamento"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              {!s.isDeletionPending && (
                                <span className="text-xxs font-semibold bg-slate-100 text-slate-500 border border-slate-200 px-2 py-1 rounded-lg flex items-center">
                                  <Eye className="h-3 w-3 mr-1" /> Somente Visualização
                                </span>
                              )}
                              {s.isDeletionPending && isAdmin && (
                                <button
                                  onClick={() => handleCancelDeletion(s.id)}
                                  className="flex items-center px-3 py-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-600 hover:text-white transition-all font-semibold focus:outline-none"
                                  title="Reativar e cancelar exclusão pendente"
                                >
                                  Reativar
                                </button>
                              )}
                            </>
                          )}
                        </div>

                      </div>

                      {/* Footer audit creator detail trail */}
                      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[10px] text-slate-400 font-mono">
                        <p>Responsável pelo Agendamento: <span className="font-semibold text-slate-700">@{s.createdByUserName}</span></p>
                        <p>Registrado em: {new Date(s.createdAt).toLocaleDateString('pt-BR')} às {new Date(s.createdAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>

                    </div>
                  );
                })}
              </div>
            )
          ) : (
            filteredHistory.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-150 text-center text-slate-400 text-sm">
                {(filterDate || filterVehicleId || filterSearchTerm)
                  ? 'Nenhum histórico de viagem encontrado para os filtros selecionados.'
                  : 'Nenhum histórico de viagens concluídas arquivadas.'}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredHistory.map((h) => (
                  <div key={h.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800 border border-slate-300">
                          <ShieldCheck className="h-3 w-3 mr-1 text-blue-600" />
                          Viagem Concluída & Auditada (Baixa Realizada)
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-mono text-slate-400">ID: {h.id}</span>
                          {currentUser.profile === 'Administrador' && (
                            <button
                              onClick={() => handleDeleteHistory(h.id)}
                              className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors focus:outline-none"
                              title="Excluir Registro do Histórico (Discreto)"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-wrap mb-2.5">
                        <h4 className="font-extrabold text-slate-800 text-base">{h.patientName}</h4>
                        {h.patientCpf && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-200 text-slate-700 border border-slate-300">
                            CPF: {h.patientCpf}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
                        <p>Ida/Volta: <strong className="text-slate-800">{h.startDate.split('-').reverse().join('/')} até {h.endDate.split('-').reverse().join('/')}</strong></p>
                        <p>Transporte Utilizado: <strong className="text-slate-800">{h.vehicleDetails}</strong></p>
                        <p className="col-span-1 md:col-span-2">Hospital de Tratamento: <strong className="text-slate-800">{h.hospitalName}</strong></p>
                        <p>Tipo: <span className="font-medium">{h.requestType}</span></p>
                        <p>Criado originalmente por: <span className="font-medium text-slate-755">{h.createdByUserName}</span></p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between text-[10px] text-slate-400 font-mono">
                      <p>Baixa Efetuada por: <strong className="text-slate-600">{h.completedByUserName}</strong></p>
                      <p>Conclusão finalizada em: {new Date(h.completedAt).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

      </div>

      {/* Printable-only footer signature area */}
      <div className="hidden print:block mt-12 pt-8 border-t border-dashed border-slate-350 text-xs text-slate-500">
        <div className="grid grid-cols-2 gap-12 text-center">
          <div className="space-y-12">
            <div className="border-b border-slate-400 mx-auto w-4/5 h-6"></div>
            <p className="font-semibold uppercase text-[10px] tracking-wider text-slate-700">Assinatura do Motorista / Transportador</p>
          </div>
          <div className="space-y-12">
            <div className="border-b border-slate-400 mx-auto w-4/5 h-6"></div>
            <p className="font-semibold uppercase text-[10px] tracking-wider text-slate-700">Visto do Setor de TFD Municipal</p>
          </div>
        </div>
        <p className="text-[10px] text-center mt-12 text-slate-400 font-mono">Documento emitido eletronicamente através do Portal de Gestão TFD.</p>
      </div>

      {/* Smart Print Warning Modal for sandboxed Iframe environments */}
      {showPrintWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Printer className="h-5 w-5 animate-none" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">Opções de Impressão</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintWarning(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs leading-relaxed flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  O navegador bloqueia telas de impressão quando o aplicativo está rodando dentro do painel integrado da plataforma de desenvolvimento.
                </span>
              </div>

              <div className="text-slate-600 text-xs space-y-2.5 leading-relaxed">
                <p className="font-semibold text-slate-800">Para obter uma via impressa perfeitamente formatada em tamanho A4:</p>
                <ol className="list-decimal pl-5 space-y-1.5 font-medium text-slate-755">
                  <li>
                    Clique no botão de compartilhamento ou em <strong className="text-slate-900">"Abrir em nova aba"</strong> no topo superior direito da tela;
                  </li>
                  <li>
                    Na nova aba que se abrirá, clique no botão <strong className="text-blue-600">"Imprimir Lista"</strong> ou use o atalho <kbd className="bg-slate-100 border border-slate-200 px-1 py-0.5 rounded font-mono font-bold text-slate-800 text-[10px]">Ctrl + P</kbd>;
                  </li>
                  <li>
                    A janela oficial de impressão irá se abrir perfeitamente configurada sem elementos de navegação web.
                  </li>
                </ol>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowPrintWarning(false)}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-105 transition-colors cursor-pointer text-center focus:outline-none"
              >
                Entendi, fechar aviso
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPrintWarning(false);
                  try {
                    window.print();
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="py-2.5 px-3 text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer focus:outline-none"
                title="Tentar acionar o comando padrão mesmo assim"
              >
                Tentar imprimir
              </button>
            </div>
          </div>
        </div>
      )}


      <ConfirmDialog
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

interface VehicleCalendarProps {
  vehicle: Vehicle;
  editingScheduleId: string | null;
  getVehicleOccupancyOnDate: (vId: string, dateStr: string, excludeScheduleId?: string) => number;
  startDate: string;
  endDate: string;
  onSelectDate?: (dateStr: string) => void;
}

function VehicleCalendar({ vehicle, editingScheduleId, getVehicleOccupancyOnDate, startDate, endDate, onSelectDate }: VehicleCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 mt-2 shadow-sm">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <div>
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Calendário de Vagas
          </h4>
          <p className="text-[10px] text-slate-500 font-medium">
            {vehicle.brand} {vehicle.model} ({vehicle.plate})
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 hover:bg-slate-100 rounded text-slate-600 focus:outline-none text-xs transition-colors"
          >
            &larr;
          </button>
          <span className="text-xs font-bold text-slate-700 min-w-[100px] text-center">
            {monthNames[month]} {year}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 hover:bg-slate-100 rounded text-slate-600 focus:outline-none text-xs transition-colors"
          >
            &rarr;
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-2">
        {weekdays.map((w, idx) => (
          <div key={idx} className="py-1">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={idx} className="aspect-square"></div>;
          }

          const dayStr = String(day).padStart(2, '0');
          const monthStr = String(month + 1).padStart(2, '0');
          const dateStr = `${year}-${monthStr}-${dayStr}`;

          const booked = getVehicleOccupancyOnDate(vehicle.id, dateStr, editingScheduleId);
          const capacity = vehicle.maxPassengers;
          const isFull = booked >= capacity;

          const isSelectedStart = startDate === dateStr;
          const isSelectedEnd = endDate === dateStr;
          const isSelectedRange = startDate && endDate && dateStr >= startDate && dateStr <= endDate;

          let bgClass = 'bg-slate-50 text-slate-800 hover:bg-slate-100 border-slate-150';
          if (isFull) {
            bgClass = 'bg-red-50 text-red-500 line-through border-red-200 opacity-60 cursor-not-allowed';
          } else if (isSelectedStart || isSelectedEnd) {
            bgClass = 'bg-blue-600 text-white font-bold border-blue-600 hover:bg-blue-700 shadow-sm';
          } else if (isSelectedRange) {
            bgClass = 'bg-blue-50 text-blue-800 border-blue-200';
          }

          const hoverTitle = isFull
            ? `Indisponibilidade: Veículo ${vehicle.model} cheio nesta data (${booked}/${capacity} vagas ocupadas)`
            : `Data: ${dayStr}/${monthStr}/${year}\nOcupação: ${booked}/${capacity} vagas ocupadas`;

          return (
            <button
              key={idx}
              type="button"
              disabled={isFull}
              onClick={() => onSelectDate?.(dateStr)}
              className={`aspect-square flex flex-col items-center justify-center text-xs rounded-lg border transition-all select-none focus:outline-none relative ${bgClass}`}
              title={hoverTitle}
            >
              <span className="font-semibold">{day}</span>
              {!isFull && (
                <span className={`text-[8px] mt-0.5 font-bold ${
                  isSelectedStart || isSelectedEnd 
                    ? 'text-blue-100' 
                    : booked > 0 
                      ? 'text-amber-600' 
                      : 'text-slate-400'
                }`}>
                  {booked}/{capacity}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[9px] text-slate-400 mt-3 pt-2 border-t border-slate-100">
        <span className="flex items-center"><span className="w-2 h-2 rounded bg-blue-600 mr-1"></span>Selecionado</span>
        <span className="flex items-center"><span className="w-2 h-2 rounded bg-red-50 border border-red-200 line-through mr-1"></span>Cheio</span>
        <span className="flex items-center"><span className="w-2 h-2 rounded bg-white border border-slate-200 mr-1 font-bold">X/Y</span>Vagas</span>
      </div>
    </div>
  );
}
