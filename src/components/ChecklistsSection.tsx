/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { ClipboardList, Search, Trash2, Calendar, FileText, CheckCircle2, AlertCircle, Printer, X, Eye, ChevronDown, ChevronUp, Camera, Maximize2, Users, Filter, RotateCcw, Truck, CheckSquare, Fuel, AlertTriangle, DollarSign } from 'lucide-react';
import { VehicleChecklist, UserProfile, Vehicle } from '../types.js';
import { getOilMaintenanceStatus } from '../utils/oilChange.js';
import ConfirmDialog from './ConfirmDialog.js';

interface ChecklistsSectionProps {
  currentUserId: string;
  userProfile: UserProfile;
}

export default function ChecklistsSection({ currentUserId, userProfile }: ChecklistsSectionProps) {
  const [checklists, setChecklists] = useState<VehicleChecklist[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [printingChecklist, setPrintingChecklist] = useState<VehicleChecklist | null>(null);
  const [selectedPhotoZoom, setSelectedPhotoZoom] = useState<{ title: string; url: string } | null>(null);

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const fetchChecklists = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/checklists', {
        headers: {
          'x-user-id': currentUserId
        }
      });
      if (!response.ok) {
        throw new Error('Falha ao buscar checklists');
      }
      const data: VehicleChecklist[] = await response.json();
      
      // Organizar e ordenar os checklists estritamente por DATA (mais recente primeiro)
      const sorted = data.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA); // Ordem decrescente de data
        }
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });

      setChecklists(sorted);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/vehicles', {
        headers: { 'x-user-id': currentUserId }
      });
      if (response.ok) {
        const vData = await response.json();
        setVehicles(vData);
      }
    } catch (e) {
      console.error('Erro ao buscar veículos:', e);
    }
  };

  useEffect(() => {
    fetchChecklists();
    fetchVehicles();
  }, [currentUserId]);

  const handleRecordOilChange = (vehicleId: string, modelPlate: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Registrar Troca de Óleo e Filtro',
      message: `Confirma que a troca de óleo e filtro do veículo ${modelPlate} foi realizada? Isso redefinirá os alertas de manutenção.`,
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/vehicles/${vehicleId}/oil-change`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': currentUserId
            },
            body: JSON.stringify({})
          });
          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Falha ao registrar troca de óleo');
          }
          await fetchVehicles();
          await fetchChecklists();
        } catch (err: any) {
          alert(err.message);
        }
      }
    });
  };

  const handleDelete = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Excluir Checklist',
      message: 'Tem certeza que deseja excluir permanentemente este checklist de veículo?',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        try {
          const response = await fetch(`/api/checklists/${id}`, {
            method: 'DELETE',
            headers: {
              'x-user-id': currentUserId
            }
          });
          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Falha ao excluir checklist');
          }
          await fetchChecklists();
        } catch (err: any) {
          alert(err.message);
        }
      }
    });
  };

  const handlePrint = (chk: VehicleChecklist) => {
    setPrintingChecklist(chk);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedVehicle('');
    setSelectedDriver('');
    setSelectedDate('');
  };

  const getFuelLabel = (fuel?: string) => {
    switch (fuel) {
      case 'reserva': return '⛽ Reserva';
      case '1/4': return '1/4 (Um Quarto)';
      case '1/2': return '1/2 (Meio Tanque)';
      case '3/4': return '3/4 (Três Quartos)';
      case 'cheio': return '🟢 Tanque Cheio';
      default: return fuel || 'Não informado';
    }
  };

  const uniqueVehicles = Array.from(new Set(checklists.map(c => c.vehicleModelPlate))).filter(Boolean);
  const uniqueDrivers = Array.from(new Set(checklists.map(c => c.driverUserName))).filter(Boolean);

  const filteredChecklists = checklists.filter(chk => {
    const matchesSearch = 
      chk.vehicleModelPlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chk.driverUserName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chk.saidaDestino.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chk.saidaCidade.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesVehicle = selectedVehicle ? chk.vehicleModelPlate === selectedVehicle : true;
    const matchesDriver = selectedDriver ? chk.driverUserName === selectedDriver : true;
    const matchesDate = selectedDate ? chk.date === selectedDate : true;

    return matchesSearch && matchesVehicle && matchesDriver && matchesDate;
  });

  const isAnyFilterActive = Boolean(searchTerm || selectedVehicle || selectedDriver || selectedDate);

  const overdueVehicles = vehicles.filter(v => {
    const status = getOilMaintenanceStatus(v, checklists);
    return status.isOverdue;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-slate-600">Carregando checklists...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="checklists-section-dashboard">
      
      {/* Header com destaque de Área Compartilhada */}
      <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1.5">
            <span className="text-xxs font-extrabold uppercase px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg tracking-wider border border-blue-200 flex items-center space-x-1.5 shadow-xs">
              <Users className="h-3.5 w-3.5 text-blue-700" />
              <span>Área Compartilhada • Administração e Coordenação</span>
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center">
            <ClipboardList className="h-5 w-5 mr-2 text-blue-600" />
            Checklists de Veículos em 2 Etapas (Saída & Devolução)
          </h2>
          <p className="text-sm text-slate-500">
            Acompanhamento em tempo real das saídas dos motoristas e devoluções com controle de combustível, odômetro, fotos obrigatórias, abastecimento e incidentes.
          </p>
        </div>

        <div className="bg-slate-100/80 px-3.5 py-2 rounded-xl border border-slate-200/80 text-xs text-slate-600 font-semibold flex items-center space-x-2 shrink-0">
          <Calendar className="h-4 w-4 text-blue-600" />
          <span>{filteredChecklists.length} checklist(s) exibido(s)</span>
        </div>
      </div>

      {/* Fleet Oil Maintenance Alert Banner */}
      {overdueVehicles.length > 0 && (
        <div className="bg-amber-500 text-white p-4 rounded-2xl shadow-lg border-2 border-amber-600 space-y-3 animate-fadeIn">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-6 w-6 text-yellow-100 shrink-0" />
            <h3 className="text-sm font-black uppercase tracking-wider text-yellow-100">
              🚨 PAINEL DE ALERTA: {overdueVehicles.length} VEÍCULO(S) REQUEREM TROCA DE ÓLEO E FILTRO!
            </h3>
          </div>
          <p className="text-xs text-yellow-100 font-medium">
            Abaixo estão os veículos que ultrapassaram a limite de quilometragem estabelecido desde a última troca de óleo:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {overdueVehicles.map(v => {
              const status = getOilMaintenanceStatus(v, checklists);
              const canManageOil = userProfile === 'Administrador' || userProfile === 'Coordenador';

              return (
                <div key={v.id} className="bg-amber-600/90 border border-amber-400 p-3 rounded-xl flex flex-col justify-between space-y-2 shadow-sm">
                  <div>
                    <p className="text-xs font-black text-white">{v.brand} {v.model} ({v.plate})</p>
                    <p className="text-[11px] text-yellow-100 mt-1">
                      Rodou <strong>{status.kmDriven} KM</strong> desde a última troca (Limite: <strong>{status.limitKm} KM</strong>)
                      {status.initialOilKm > 0 && <span> • Ponto Inicial: <strong>{status.initialOilKm} KM</strong></span>}
                    </p>
                  </div>
                  {canManageOil ? (
                    <button
                      type="button"
                      onClick={() => handleRecordOilChange(v.id, `${v.model} (${v.plate})`)}
                      className="w-full py-1.5 bg-yellow-400 hover:bg-yellow-300 text-amber-950 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-1 cursor-pointer shadow-xs"
                    >
                      <span>🔄 Registrar Troca Realizada Hoje</span>
                    </button>
                  ) : (
                    <div className="text-[10px] bg-amber-700 text-yellow-100 px-2 py-1 rounded-lg font-bold text-center">
                      ⚠️ Notificar Administração para realizar troca
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Filters Row */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-1 border-b border-slate-100">
          <div className="flex items-center space-x-1.5">
            <Filter className="h-3.5 w-3.5 text-blue-600" />
            <span>Filtros de Pesquisa e Período</span>
          </div>
          {isAnyFilterActive && (
            <button
              onClick={clearFilters}
              className="text-xxs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1 hover:underline cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Filtro por Data */}
          <div className="relative">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Filtro de Data
            </label>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Filtro por Motorista */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Filtro de Motorista
            </label>
            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              <option value="">Todos os Motoristas</option>
              {uniqueDrivers.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Veículo */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Filtro de Veículo
            </label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              <option value="">Todos os Veículos</option>
              {uniqueVehicles.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Busca Geral */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Busca por Texto
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Destino, cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Checklists List */}
      {filteredChecklists.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-slate-500 text-sm shadow-sm">
          Nenhum checklist de veículo encontrado com os filtros selecionados.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredChecklists.map((chk) => {
            const isExpanded = expandedId === chk.id;
            const formattedDate = chk.date.split('-').reverse().join('/');
            const isCompleted = chk.status === 'concluido' || (chk.finalKm !== undefined && chk.finalKm !== null && Number(chk.finalKm) > 0);
            const kmRodada = isCompleted && chk.finalKm ? Number(chk.finalKm) - Number(chk.initialKm) : 0;
            
            // Count OK vs Pendente
            const items = [
              chk.oleo, chk.agua, chk.oxigenio, chk.parabrisa, chk.luzRe, chk.arCondicionado,
              chk.documento, chk.piscas, chk.retrovisores, chk.sirene, chk.marcadorCombustivel,
              chk.chaveRodas, chk.macaco, chk.buzina, chk.farois
            ];
            const okCount = items.filter(Boolean).length;
            const pendenteCount = items.length - okCount;

            const matchedVeh = vehicles.find(v => v.id === chk.vehicleId || chk.vehicleModelPlate.includes(v.plate));
            const oilStatus = matchedVeh ? getOilMaintenanceStatus(matchedVeh, checklists) : null;
            const isOilOverdue = Boolean(oilStatus?.isOverdue || chk.oleo === false);
            const kmSinceLastOil = oilStatus?.kmDriven || 0;
            const limitKm = oilStatus?.limitKm || 1000;

            return (
              <div key={chk.id} className={`bg-white border rounded-2xl shadow-sm transition-all overflow-hidden ${
                !isCompleted 
                  ? 'border-amber-300 ring-1 ring-amber-400' 
                  : isOilOverdue 
                    ? 'border-rose-300 ring-1 ring-rose-400' 
                    : 'border-slate-150 hover:border-blue-200'
              }`}>
                {/* Header Summary */}
                <div 
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50"
                  onClick={() => setExpandedId(isExpanded ? null : chk.id)}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2.5 rounded-xl shrink-0 ${
                      !isCompleted 
                        ? 'bg-amber-100 text-amber-800' 
                        : isOilOverdue 
                          ? 'bg-rose-100 text-rose-800' 
                          : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="text-xs bg-blue-50 text-blue-800 font-bold px-2.5 py-0.5 rounded-full">
                          {formattedDate}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          {new Date(chk.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          isCompleted ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}>
                          {isCompleted ? '✓ Concluído (Saída + Devolução)' : '⏳ Em Trânsito (Aguardando Devolução)'}
                        </span>
                        {isOilOverdue && (
                          <span className="text-[10px] bg-rose-600 text-white font-extrabold px-2 py-0.5 rounded-full flex items-center space-x-1 shadow-xs">
                            <span>🚨 ALERTA ÓLEO ({kmSinceLastOil}/{limitKm} KM)</span>
                          </span>
                        )}
                        {chk.houveIncidente && (
                          <span className="text-[10px] bg-rose-100 text-rose-800 font-extrabold px-2 py-0.5 rounded-full border border-rose-300">
                            ⚠️ Incidente Registrado
                          </span>
                        )}
                        {chk.houveAbastecimento && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full border border-emerald-300">
                            ⛽ Abastecido
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{chk.vehicleModelPlate}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Motorista: <span className="font-semibold text-slate-700">{chk.driverUserName}</span> • Destino: <span className="font-medium text-slate-600">{chk.saidaDestino} ({chk.saidaCidade})</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 md:text-right">
                    <div className="text-xs">
                      <p className="text-slate-500">Quilometragem</p>
                      <p className="font-semibold text-slate-800 font-mono mt-0.5">
                        {chk.initialKm} KM {isCompleted ? `→ ${chk.finalKm} KM (${kmRodada} km)` : '(Inicial)'}
                      </p>
                    </div>

                    <div className="text-xs">
                      <p className="text-slate-500">Combustível</p>
                      <p className="font-semibold text-slate-800 mt-0.5">
                        {getFuelLabel(chk.combustivelInicial)} {isCompleted && `→ ${getFuelLabel(chk.combustivelFinal)}`}
                      </p>
                    </div>

                    <div className="flex items-center space-x-1.5 pl-2 border-t md:border-t-0 md:border-l border-slate-100 pt-2 md:pt-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrint(chk);
                        }}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                        title="Imprimir Checklist"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(chk.id);
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      <div className="text-slate-400 hover:text-slate-600 p-1">
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded content details */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-6 space-y-6 animate-fadeIn">
                    
                    {/* PARTE 1: SAÍDA (PEGOU O CARRO) */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex justify-between items-center border-b pb-2">
                        <h5 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider flex items-center space-x-2">
                          <Truck className="h-4 w-4 text-emerald-600" />
                          <span>Parte 1: Checklist de Saída (Pegou o Veículo)</span>
                        </h5>
                        <span className="text-xs font-bold text-slate-500">
                          Saída às {chk.saidaHorario} em {formattedDate}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600">
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Quilometragem Inicial</span>
                          <strong className="text-sm text-slate-900 font-mono">{chk.initialKm} KM</strong>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Nível de Combustível</span>
                          <strong className="text-xs text-slate-900">{getFuelLabel(chk.combustivelInicial)}</strong>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Destino e Cidade</span>
                          <strong className="text-xs text-slate-900">{chk.saidaDestino} ({chk.saidaCidade})</strong>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Condutor Responsável</span>
                          <strong className="text-xs text-slate-900">{chk.driverUserName}</strong>
                        </div>
                      </div>

                      {/* Foto Painel Combustível Inicial */}
                      {chk.fotoPainelCombustivelInicial && (
                        <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Fuel className="h-4 w-4 text-amber-600" />
                            <span className="text-xs font-bold text-amber-950">Foto do Painel de Combustível na Saída (Obrigatória):</span>
                          </div>
                          <button
                            onClick={() => setSelectedPhotoZoom({ title: `${chk.vehicleModelPlate} - Painel Combustível Saída`, url: chk.fotoPainelCombustivelInicial! })}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1"
                          >
                            <Maximize2 className="h-3 w-3" />
                            <span>Visualizar Foto</span>
                          </button>
                        </div>
                      )}

                      {/* Verification checklist items */}
                      <div>
                        <h6 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                          Itens de Vistoria de Segurança
                        </h6>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                          {[
                            { label: 'Óleo', val: chk.oleo },
                            { label: 'Água', val: chk.agua },
                            { label: 'Oxigênio', val: chk.oxigenio },
                            { label: 'Para-brisa', val: chk.parabrisa },
                            { label: 'Luz de ré', val: chk.luzRe },
                            { label: 'Ar-condicionado', val: chk.arCondicionado },
                            { label: 'Documento', val: chk.documento },
                            { label: 'Piscas', val: chk.piscas },
                            { label: 'Retrovisores', val: chk.retrovisores },
                            { label: 'Sirene', val: chk.sirene },
                            { label: 'Marcador Comb.', val: chk.marcadorCombustivel },
                            { label: 'Chave de rodas', val: chk.chaveRodas },
                            { label: 'Macaco', val: chk.macaco },
                            { label: 'Buzina', val: chk.buzina },
                            { label: 'Faróis', val: chk.farois },
                          ].map((item, idx) => (
                            <div 
                              key={idx} 
                              className={`p-2 border rounded-xl flex items-center justify-between text-xs ${
                                item.val 
                                  ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950 font-semibold' 
                                  : 'bg-rose-50 border-rose-200 text-rose-950 font-semibold'
                              }`}
                            >
                              <span className="text-[10px] text-slate-600 font-bold uppercase truncate">{item.label}</span>
                              <span className="text-[10px] font-black">
                                {item.val ? 'OK' : '❌ PEND'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 4 Photos of vehicle at departure */}
                      {(chk.fotoFrente || chk.fotoFundo || chk.fotoLateralEsquerda || chk.fotoLateralDireita) && (
                        <div>
                          <h6 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                            <Camera className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Fotos do Veículo na Saída (4 Ângulos Obrigatórios)</span>
                          </h6>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                              { title: 'Frente', url: chk.fotoFrente },
                              { title: 'Fundo / Traseira', url: chk.fotoFundo },
                              { title: 'Lateral Esquerda', url: chk.fotoLateralEsquerda },
                              { title: 'Lateral Direita', url: chk.fotoLateralDireita },
                            ].map((photo, idx) => photo.url ? (
                              <div 
                                key={idx}
                                onClick={() => setSelectedPhotoZoom({ title: `${chk.vehicleModelPlate} - ${photo.title}`, url: photo.url! })}
                                className="group relative rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-900 cursor-pointer hover:border-emerald-500 shadow-sm transition-all"
                              >
                                <img src={photo.url} alt={photo.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="bg-white text-slate-900 text-xxs font-bold px-2 py-1 rounded shadow">
                                    Ampliar
                                  </span>
                                </div>
                                <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[10px] font-bold text-center py-0.5 truncate">
                                  {photo.title}
                                </span>
                              </div>
                            ) : null)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* PARTE 2: DEVOLUÇÃO (FIM DO EXPEDIENTE) */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex justify-between items-center border-b pb-2">
                        <h5 className="text-xs font-extrabold text-blue-800 uppercase tracking-wider flex items-center space-x-2">
                          <CheckSquare className="h-4 w-4 text-blue-600" />
                          <span>Parte 2: Checklist de Devolução (Fim de Expediente / Viagem)</span>
                        </h5>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isCompleted ? `Concluído em ${chk.retornoData?.split('-').reverse().join('/') || formattedDate} às ${chk.retornoHorario || ''}` : 'Pendente de Devolução'}
                        </span>
                      </div>

                      {isCompleted ? (
                        <>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600">
                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150">
                              <span className="text-[10px] text-slate-400 uppercase font-bold block">Quilometragem Final</span>
                              <strong className="text-sm text-slate-900 font-mono">{chk.finalKm} KM</strong>
                            </div>
                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150">
                              <span className="text-[10px] text-slate-400 uppercase font-bold block">Distância Percorrida</span>
                              <strong className="text-sm text-emerald-700 font-mono">{kmRodada} KM</strong>
                            </div>
                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150">
                              <span className="text-[10px] text-slate-400 uppercase font-bold block">Nível de Combustível Final</span>
                              <strong className="text-xs text-slate-900">{getFuelLabel(chk.combustivelFinal)}</strong>
                            </div>
                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150">
                              <span className="text-[10px] text-slate-400 uppercase font-bold block">Horário Devolução</span>
                              <strong className="text-xs text-slate-900">{chk.retornoHorario || 'Concluído'}</strong>
                            </div>
                          </div>

                          {/* Fotos Obrigatórias de Odômetro e Painel de Combustível Final */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {chk.fotoKmFinal && (
                              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Camera className="h-4 w-4 text-blue-600" />
                                  <span className="text-xs font-bold text-slate-900">Foto do Odômetro / KM Final:</span>
                                </div>
                                <button
                                  onClick={() => setSelectedPhotoZoom({ title: `${chk.vehicleModelPlate} - Odômetro Final`, url: chk.fotoKmFinal! })}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1"
                                >
                                  <Maximize2 className="h-3 w-3" />
                                  <span>Ver Foto</span>
                                </button>
                              </div>
                            )}

                            {chk.fotoPainelCombustivelFinal && (
                              <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Fuel className="h-4 w-4 text-amber-600" />
                                  <span className="text-xs font-bold text-amber-950">Foto Painel Combustível Final:</span>
                                </div>
                                <button
                                  onClick={() => setSelectedPhotoZoom({ title: `${chk.vehicleModelPlate} - Painel Combustível Devolução`, url: chk.fotoPainelCombustivelFinal! })}
                                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1"
                                >
                                  <Maximize2 className="h-3 w-3" />
                                  <span>Ver Foto</span>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Abastecimento info */}
                          {chk.houveAbastecimento && (
                            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
                              <div className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                                <Fuel className="h-4 w-4 text-emerald-700" />
                                <span>Abastecimento Registrado durante a Viagem:</span>
                              </div>
                              <p className="text-emerald-900 font-medium">
                                Foram abastecidos <strong>{chk.abastecimentoLitros} Litros (L)</strong>
                                {chk.abastecimentoValor ? ` no valor de R$ ${chk.abastecimentoValor}` : ''}
                                {chk.abastecimentoPosto ? ` no posto ${chk.abastecimentoPosto}` : ''}.
                              </p>
                              {chk.abastecimentoComprovanteFoto && (
                                <button
                                  onClick={() => setSelectedPhotoZoom({ title: 'Comprovante de Abastecimento', url: chk.abastecimentoComprovanteFoto! })}
                                  className="text-emerald-800 font-extrabold underline mt-1 inline-block"
                                >
                                  Ver Comprovante / Cupom Fiscal
                                </button>
                              )}
                            </div>
                          )}

                          {/* Incidente info */}
                          {chk.houveIncidente && (
                            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1.5">
                              <div className="font-extrabold text-rose-950 flex items-center gap-1.5">
                                <AlertTriangle className="h-4 w-4 text-rose-600" />
                                <span>Relato de Incidente / Avaria no Veículo:</span>
                              </div>
                              <p className="text-slate-800 bg-white p-2.5 rounded-lg border border-rose-200 font-medium leading-relaxed">
                                {chk.descricaoIncidente}
                              </p>
                              {chk.fotoIncidente && (
                                <button
                                  onClick={() => setSelectedPhotoZoom({ title: 'Registro do Incidente / Avaria', url: chk.fotoIncidente! })}
                                  className="text-rose-800 font-extrabold underline inline-block"
                                >
                                  Ver Foto do Incidente
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between">
                          <span>O condutor ainda não finalizou a devolução deste veículo na base.</span>
                          <span className="font-mono font-bold bg-amber-200 text-amber-950 px-2 py-0.5 rounded">STATUS: EM TRÂNSITO</span>
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden printing layout */}
      {printingChecklist && (
        <div className="hidden print:block print:p-8 bg-white text-black font-mono text-sm leading-6 space-y-4">
          <div className="text-center border-b-2 border-black pb-4">
            <h2 className="text-xl font-bold">RELATÓRIO DE CHECKLIST DE VEÍCULO EM 2 ETAPAS</h2>
            <p className="text-xs uppercase tracking-wide">Secretaria Municipal de Saúde - TFD</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-base font-bold uppercase">CHECKLIST DE SAÍDA E DEVOLUÇÃO</p>
            <p><strong>VEÍCULO / AMBULÂNCIA:</strong> {printingChecklist.vehicleModelPlate}</p>
            <p><strong>DATA DE SAÍDA:</strong> {printingChecklist.date.split('-').reverse().join('/')} às {printingChecklist.saidaHorario}</p>
            <p><strong>DESTINO:</strong> {printingChecklist.saidaDestino} ({printingChecklist.saidaCidade})</p>
            <p><strong>KM INICIAL:</strong> {printingChecklist.initialKm} KM | <strong>COMBUSTÍVEL INICIAL:</strong> {getFuelLabel(printingChecklist.combustivelInicial)}</p>
            {printingChecklist.finalKm && (
              <p><strong>KM FINAL:</strong> {printingChecklist.finalKm} KM | <strong>COMBUSTÍVEL FINAL:</strong> {getFuelLabel(printingChecklist.combustivelFinal)} | <strong>TOTAL:</strong> {printingChecklist.finalKm - printingChecklist.initialKm} KM</p>
            )}
          </div>

          <div className="border-t border-b border-black py-2 my-2 grid grid-cols-2 gap-x-8 gap-y-1">
            <div><strong>ÓLEO-</strong> {printingChecklist.oleo ? '🆗' : '❌'}</div>
            <div><strong>ÁGUA-</strong> {printingChecklist.agua ? '🆗' : '❌'}</div>
            <div><strong>OXIGÊNIO-</strong> {printingChecklist.oxigenio ? '🆗' : '❌'}</div>
            <div><strong>PARA-BRISA-</strong> {printingChecklist.parabrisa ? '🆗' : '❌'}</div>
            <div><strong>LUZ DE RE-</strong> {printingChecklist.luzRe ? '🆗' : '❌'}</div>
            <div><strong>AR-CONDICIONADO-</strong> {printingChecklist.arCondicionado ? '🆗' : '❌'}</div>
            <div><strong>DOCUMENTO-</strong> {printingChecklist.documento ? '🆗' : '❌'}</div>
            <div><strong>PISCAS-</strong> {printingChecklist.piscas ? '🆗' : '❌'}</div>
            <div><strong>RETROVISORES-</strong> {printingChecklist.retrovisores ? '🆗' : '❌'}</div>
            <div><strong>SIRENE-</strong> {printingChecklist.sirene ? '🆗' : '❌'}</div>
            <div><strong>MARCADOR COMBUSTÍVEL-</strong> {printingChecklist.marcadorCombustivel ? '🆗' : '❌'}</div>
            <div><strong>CHAVE DE RODAS-</strong> {printingChecklist.chaveRodas ? '🆗' : '❌'}</div>
            <div><strong>MACACO-</strong> {printingChecklist.macaco ? '🆗' : '❌'}</div>
            <div><strong>BUZINA-</strong> {printingChecklist.buzina ? '🆗' : '❌'}</div>
            <div><strong>FAROIS-</strong> {printingChecklist.farois ? '🆗' : '❌'}</div>
          </div>

          {printingChecklist.houveAbastecimento && (
            <div className="border-b border-black pb-2">
              <p>
                <strong>ABASTECIMENTO:</strong> {printingChecklist.abastecimentoLitros} L
                {printingChecklist.abastecimentoValor ? ` - R$ ${printingChecklist.abastecimentoValor}` : ''}
                {printingChecklist.abastecimentoPosto ? ` (${printingChecklist.abastecimentoPosto})` : ''}
              </p>
            </div>
          )}

          {printingChecklist.houveIncidente && (
            <div className="border-b border-black pb-2 text-red-700">
              <p><strong>INCIDENTE RELATADO:</strong> {printingChecklist.descricaoIncidente}</p>
            </div>
          )}

          {(printingChecklist.fotoFrente || printingChecklist.fotoFundo || printingChecklist.fotoPainelCombustivelInicial || printingChecklist.fotoKmFinal) && (
            <div className="pt-4 border-t border-black space-y-2">
              <p className="font-bold uppercase">REGISTROS FOTOGRÁFICOS</p>
              <div className="grid grid-cols-2 gap-4 pt-1">
                {[
                  { title: 'Painel Combustível Saída', url: printingChecklist.fotoPainelCombustivelInicial },
                  { title: 'Frente do Veículo', url: printingChecklist.fotoFrente },
                  { title: 'Odômetro Final', url: printingChecklist.fotoKmFinal },
                  { title: 'Painel Combustível Final', url: printingChecklist.fotoPainelCombustivelFinal },
                ].map((p, idx) => p.url ? (
                  <div key={idx} className="border border-black p-1 text-center">
                    <img src={p.url} alt={p.title} className="max-h-36 mx-auto object-contain" />
                    <span className="text-[10px] font-bold uppercase mt-1 block">{p.title}</span>
                  </div>
                ) : null)}
              </div>
            </div>
          )}

          <div className="pt-8 border-t border-black text-center">
            <p className="border-b border-black w-72 mx-auto mb-1"></p>
            <p className="font-bold">Nome do condutor: {printingChecklist.driverUserName}</p>
            <p className="text-xs">Assinatura do Motorista Credenciado</p>
          </div>
        </div>
      )}

      {/* Zoom Photo Modal */}
      {selectedPhotoZoom && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={() => setSelectedPhotoZoom(null)}>
          <div className="relative max-w-3xl w-full bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800 text-white">
              <h4 className="text-sm font-bold flex items-center space-x-2">
                <Camera className="h-4 w-4 text-emerald-400" />
                <span>{selectedPhotoZoom.title}</span>
              </h4>
              <button
                type="button"
                onClick={() => setSelectedPhotoZoom(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[70vh] flex items-center justify-center overflow-hidden rounded-xl bg-black">
              <img src={selectedPhotoZoom.url} alt={selectedPhotoZoom.title} className="max-h-[70vh] w-auto object-contain" />
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
