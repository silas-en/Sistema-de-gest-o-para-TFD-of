/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { ClipboardList, Search, Trash2, Calendar, FileText, CheckCircle2, AlertCircle, Printer, X, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { VehicleChecklist, UserProfile } from '../types.js';
import ConfirmDialog from './ConfirmDialog.js';

interface ChecklistsSectionProps {
  currentUserId: string;
  userProfile: UserProfile;
}

export default function ChecklistsSection({ currentUserId, userProfile }: ChecklistsSectionProps) {
  const [checklists, setChecklists] = useState<VehicleChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [printingChecklist, setPrintingChecklist] = useState<VehicleChecklist | null>(null);

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
      const data = await response.json();
      setChecklists(data.sort((a: VehicleChecklist, b: VehicleChecklist) => b.createdAt.localeCompare(a.createdAt)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklists();
  }, [currentUserId]);

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

  const uniqueVehicles = Array.from(new Set(checklists.map(c => c.vehicleModelPlate)));
  const uniqueDrivers = Array.from(new Set(checklists.map(c => c.driverUserName)));

  const filteredChecklists = checklists.filter(chk => {
    const matchesSearch = 
      chk.vehicleModelPlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chk.driverUserName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chk.saidaDestino.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chk.saidaCidade.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesVehicle = selectedVehicle ? chk.vehicleModelPlate === selectedVehicle : true;
    const matchesDriver = selectedDriver ? chk.driverUserName === selectedDriver : true;

    return matchesSearch && matchesVehicle && matchesDriver;
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
      
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center">
            <ClipboardList className="h-5 w-5 mr-2 text-blue-600" />
            Checklists de Veículos Enviados
          </h2>
          <p className="text-sm text-slate-500">
            Acompanhe o estado de conservação, quilometragem e segurança das ambulâncias e carros relatados pelos motoristas.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Filters Row */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por motorista, veículo, destino..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="w-full md:w-56">
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

        <div className="w-full md:w-56">
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
            
            // Count OK vs Pendente
            const items = [
              chk.oleo, chk.agua, chk.oxigenio, chk.parabrisa, chk.luzRe, chk.arCondicionado,
              chk.documento, chk.piscas, chk.retrovisores, chk.sirene, chk.marcadorCombustivel,
              chk.chaveRodas, chk.macaco, chk.buzina, chk.farois
            ];
            const okCount = items.filter(Boolean).length;
            const pendenteCount = items.length - okCount;

            return (
              <div key={chk.id} className="bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-blue-150 transition-all overflow-hidden">
                {/* Header Summary */}
                <div 
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50"
                  onClick={() => setExpandedId(isExpanded ? null : chk.id)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="bg-slate-100 p-2.5 rounded-xl text-slate-600 shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs bg-blue-50 text-blue-800 font-bold px-2.5 py-0.5 rounded-full">
                          {formattedDate}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          {new Date(chk.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{chk.vehicleModelPlate}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Motorista: <span className="font-semibold text-slate-700">{chk.driverUserName}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 md:text-right">
                    <div className="text-xs">
                      <p className="text-slate-500">KM Inicial/Final</p>
                      <p className="font-semibold text-slate-800 font-mono mt-0.5">
                        {chk.initialKm} → {chk.finalKm} ({chk.finalKm - chk.initialKm} km rodados)
                      </p>
                    </div>

                    <div className="text-xs">
                      <p className="text-slate-500">Estado geral</p>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded text-xxs">
                          {okCount} OK
                        </span>
                        {pendenteCount > 0 && (
                          <span className="bg-rose-50 text-rose-800 font-bold px-2 py-0.5 rounded text-xxs">
                            {pendenteCount} PENDENTES
                          </span>
                        )}
                      </div>
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Left: General info */}
                      <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm space-y-3">
                        <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b pb-1.5">
                          Informações do Veículo e Viagem
                        </h5>
                        <ul className="text-xs space-y-2 text-slate-600">
                          <li><strong>Veículo:</strong> {chk.vehicleModelPlate}</li>
                          <li><strong>Data do Checklist:</strong> {formattedDate}</li>
                          <li><strong>Quilometragem Inicial:</strong> {chk.initialKm} KM</li>
                          <li><strong>Quilometragem Final:</strong> {chk.finalKm} KM</li>
                          <li><strong>Total Percorrido:</strong> {chk.finalKm - chk.initialKm} KM</li>
                        </ul>
                      </div>

                      {/* Center: Base Exit Info */}
                      <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm space-y-3">
                        <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b pb-1.5">
                          Dados de Saída da Base
                        </h5>
                        <ul className="text-xs space-y-2 text-slate-600">
                          <li><strong>Horário de Saída:</strong> {chk.saidaHorario}</li>
                          <li><strong>Destino / Hospital:</strong> {chk.saidaDestino}</li>
                          <li><strong>Cidade:</strong> {chk.saidaCidade}</li>
                          <li><strong>Motorista (Condutor):</strong> {chk.driverUserName}</li>
                        </ul>
                      </div>

                      {/* Right: Quick Report summary */}
                      <div className="bg-gradient-to-br from-slate-800 to-slate-950 text-white p-5 rounded-xl shadow-md space-y-2.5">
                        <h5 className="text-[10px] font-extrabold text-slate-300 uppercase tracking-widest">
                          RESUMO DO DIAGNÓSTICO
                        </h5>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Checklist submetido eletronicamente pelo condutor <span className="text-white font-bold">{chk.driverUserName}</span> em conformidade com as exigências da Secretaria Municipal de Saúde.
                        </p>
                        <div className="pt-2 flex justify-between items-center text-xs font-semibold">
                          <span>Itens aprovados:</span>
                          <span className="text-emerald-400 font-mono text-base">{okCount} / 15</span>
                        </div>
                      </div>

                    </div>

                    {/* Verification checklist items */}
                    <div className="bg-white p-5 rounded-xl border border-slate-150 shadow-sm">
                      <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-3 pb-1 border-b">
                        Estado dos Parâmetros Verificados
                      </h5>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
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
                          { label: 'Marcador Combustível', val: chk.marcadorCombustivel },
                          { label: 'Chave de rodas', val: chk.chaveRodas },
                          { label: 'Macaco', val: chk.macaco },
                          { label: 'Buzina', val: chk.buzina },
                          { label: 'Faróis', val: chk.farois },
                        ].map((item, idx) => (
                          <div 
                            key={idx} 
                            className={`p-2.5 border rounded-xl flex flex-col justify-between h-16 text-center transition-all ${
                              item.val 
                                ? 'bg-emerald-50/50 border-emerald-100 text-emerald-950 font-semibold' 
                                : 'bg-rose-50 border-rose-100 text-rose-950 font-semibold'
                            }`}
                          >
                            <span className="text-[10px] text-slate-500 font-bold uppercase truncate tracking-wide">{item.label}</span>
                            <span className="text-xs font-bold mt-1">
                              {item.val ? '🆗 OK' : '❌ PENDENTE'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden printing layout that matches user's request exactly */}
      {printingChecklist && (
        <div className="hidden print:block print:p-8 bg-white text-black font-mono text-sm leading-6 space-y-4">
          <div className="text-center border-b-2 border-black pb-4">
            <h2 className="text-xl font-bold">RELATÓRIO DE CHECKLIST DE VEÍCULO</h2>
            <p className="text-xs uppercase tracking-wide">Secretaria Municipal de Saúde - TFD</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-base font-bold uppercase">CHECK LIST</p>
            <p><strong>VEÍCULO / AMBULÂNCIA:</strong> {printingChecklist.vehicleModelPlate}</p>
            <p><strong>DATA:</strong> {printingChecklist.date.split('-').reverse().join('/')}</p>
            <p><strong>KM INICIAL:</strong> {printingChecklist.initialKm}</p>
            <p><strong>KM FINAL:</strong> {printingChecklist.finalKm}</p>
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

          <div className="space-y-1">
            <p className="font-bold uppercase">SAÍDA DA BASE</p>
            <p><strong>HORÁRIO:</strong> {printingChecklist.saidaHorario}</p>
            <p><strong>DESTINO:</strong> {printingChecklist.saidaDestino}</p>
            <p><strong>CIDADE:</strong> {printingChecklist.saidaCidade}</p>
          </div>

          <div className="pt-8 border-t border-black text-center">
            <p className="border-b border-black w-72 mx-auto mb-1"></p>
            <p className="font-bold">Nome do condutor: {printingChecklist.driverUserName}</p>
            <p className="text-xs">Assinatura do Motorista Credenciado</p>
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
