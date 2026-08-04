/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Car, Fuel, Tag, Settings2, Users2, AlertCircle, Sparkles, CheckCircle2, Trash2 } from 'lucide-react';
import { Vehicle, VehicleType, UserProfile, VehicleChecklist } from '../types.js';
import { getOilMaintenanceStatus } from '../utils/oilChange.js';
import ConfirmDialog from './ConfirmDialog.js';

interface VehiclesSectionProps {
  currentUserId: string;
  userProfile: UserProfile;
}

export default function VehiclesSection({ currentUserId, userProfile }: VehiclesSectionProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [checklists, setChecklists] = useState<VehicleChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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

  // Form State
  const [type, setType] = useState<VehicleType>('Carro de pequeno porte');
  const [plate, setPlate] = useState('');
  const [model, setModel] = useState('');
  const [brand, setBrand] = useState('');
  const [maxPassengers, setMaxPassengers] = useState(4);
  const [vagasAcamados, setVagasAcamados] = useState(1);
  const [limiteKmTrocaOleo, setLimiteKmTrocaOleo] = useState(1000);
  const [ultimoKmTrocaOleo, setUltimoKmTrocaOleo] = useState(0);

  const isAuthorized = userProfile === 'Administrador' || userProfile === 'Coordenador';

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError(null);
      const [vRes, cRes] = await Promise.all([
        fetch('/api/vehicles', { headers: { 'x-user-id': currentUserId } }),
        fetch('/api/checklists', { headers: { 'x-user-id': currentUserId } })
      ]);
      if (!vRes.ok) {
        throw new Error('Falha ao obter lista de veículos');
      }
      const data = await vRes.json();
      setVehicles(data);

      if (cRes.ok) {
        const cData = await cRes.json();
        setChecklists(cData);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [currentUserId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      setError('Apenas Coordenadores ou Administradores cadastram veículos.');
      return;
    }

    setError(null);
    setSuccess(null);

    if (!plate || !model || !brand || maxPassengers <= 0 || (type === 'Ambulância' && vagasAcamados <= 0)) {
      setError('Favor preencher todos os campos do veículo com valores válidos.');
      return;
    }

    try {
      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId
        },
        body: JSON.stringify({
          type,
          plate: plate.toUpperCase().trim(),
          model: model.trim(),
          brand: brand.trim(),
          maxPassengers,
          vagasAcamados: type === 'Ambulância' ? vagasAcamados : undefined,
          limiteKmTrocaOleo: Number(limiteKmTrocaOleo) || 1000,
          ultimoKmTrocaOleo: Number(ultimoKmTrocaOleo) || 0
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao cadastrar veículo');
      }

      setSuccess('Veículo cadastrado com sucesso!');
      
      // Reset form fields
      setPlate('');
      setModel('');
      setBrand('');
      setMaxPassengers(type === 'Carro de pequeno porte' ? 4 : type === 'Carro de grande porte' ? 15 : 2);
      setVagasAcamados(1);
      setLimiteKmTrocaOleo(1000);
      setUltimoKmTrocaOleo(0);

      fetchVehicles();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleTypeChange = (newType: VehicleType) => {
    setType(newType);
    if (newType === 'Carro de pequeno porte') setMaxPassengers(4);
    else if (newType === 'Carro de grande porte') setMaxPassengers(15);
    else if (newType === 'Ambulância') {
      setMaxPassengers(2);
      setVagasAcamados(1);
    }
  };

  const handleRecordOilChange = (vehicleId: string, modelPlate: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Registrar Troca de Óleo e Filtro',
      message: `Deseja registrar que a troca de óleo e filtro do veículo ${modelPlate} foi realizada? Isso atualizará o KM de referência e reiniciará a contagem do alerta de manutenção.`,
      type: 'info',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        setError(null);
        setSuccess(null);
        try {
          const response = await fetch(`/api/vehicles/${vehicleId}/oil-change`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': currentUserId
            },
            body: JSON.stringify({})
          });
          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Falha ao registrar troca de óleo');
          }
          setSuccess(`Troca de óleo e filtro registrada com sucesso para ${modelPlate}!`);
          fetchVehicles();
        } catch (e: any) {
          setError(e.message);
        }
      }
    });
  };

  const handleDelete = async (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Excluir Veículo',
      message: 'Tem certeza absoluta que deseja EXCLUIR permanentemente este veículo da frota?',
      type: 'danger',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        setError(null);
        setSuccess(null);
        try {
          const response = await fetch(`/api/vehicles/${id}`, {
            method: 'DELETE',
            headers: { 'x-user-id': currentUserId }
          });
          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Falha ao excluir veículo');
          }
          setSuccess('Veículo excluído com sucesso!');
          fetchVehicles();
        } catch (e: any) {
          setError(e.message);
        }
      }
    });
  };

  return (
    <div className="space-y-8" id="vehicles-dashboard">
      <div className="border-b border-slate-200 pb-4">
        <h2 id="section-title-vehicles" className="text-xl font-bold text-slate-900 tracking-tight flex items-center">
          <Car className="h-5 w-5 mr-2 text-blue-600" />
          Gestão de Frota e Veículos
        </h2>
        <p className="text-sm text-slate-500">
          Cadastre e monitore os veículos disponíveis para o transporte intermunicipal de pacientes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Registration Form (Only for Coordinators/Admins) */}
        <div className="lg:col-span-1">
          {isAuthorized ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-lg">Novo Veículo</h3>
              <p className="text-xs text-slate-500">Cadastre um novo carro ou ambulância na frota municipal.</p>

              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />
                  <span>{success}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Vehicle Type selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Tipo de Veículo
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {(['Carro de pequeno porte', 'Carro de grande porte', 'Ambulância'] as VehicleType[]).map((vType) => (
                      <button
                        key={vType}
                        type="button"
                        onClick={() => handleTypeChange(vType)}
                        className={`px-3 py-2.5 text-left text-xs font-medium rounded-xl border transition-all flex items-center justify-between ${
                          type === vType 
                            ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-bold shadow-sm'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{vType}</span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {vType === 'Carro de pequeno porte' ? 'Até 4 pass.' : vType === 'Carro de grande porte' ? 'Até 15 pass.' : 'Ambulatório'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Model */}
                <div>
                  <label htmlFor="veh-model" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Modelo
                  </label>
                  <input
                    id="veh-model"
                    type="text"
                    required
                    placeholder="Ex: Spin, Ducato, Hilux"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                {/* Brand */}
                <div>
                  <label htmlFor="veh-brand" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Marca
                  </label>
                  <input
                    id="veh-brand"
                    type="text"
                    required
                    placeholder="Ex: Chevrolet, Fiat, Toyota"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                {/* Plate */}
                <div>
                  <label htmlFor="veh-plate" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Placa do Veículo
                  </label>
                  <input
                    id="veh-plate"
                    type="text"
                    required
                    placeholder="ABC1D23"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value)}
                    className="block w-full px-3.5 py-2.5 font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                {/* Max Passengers */}
                <div>
                  <label htmlFor="veh-capacity" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Quantidade Máxima de Passageiros (Vagas Gerais)
                  </label>
                  <input
                    id="veh-capacity"
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={maxPassengers}
                    onChange={(e) => setMaxPassengers(Number(e.target.value))}
                    className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                {/* Vagas para Acamados (Ambulâncias) */}
                {type === 'Ambulância' && (
                  <div className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-200 space-y-1.5 animate-fadeIn">
                    <label htmlFor="veh-bedridden-capacity" className="block text-xs font-extrabold text-rose-900 uppercase tracking-wider">
                      Vagas na Ambulância para Pacientes Acamados (Macas/Leitos)
                    </label>
                    <p className="text-[10px] text-rose-700 font-medium">Informe quantas macas/leitos de acamados esta ambulância suporta simultaneamente.</p>
                    <input
                      id="veh-bedridden-capacity"
                      type="number"
                      required
                      min={1}
                      max={10}
                      value={vagasAcamados}
                      onChange={(e) => setVagasAcamados(Number(e.target.value))}
                      className="block w-full px-3.5 py-2.5 bg-white border border-rose-300 rounded-xl text-slate-950 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm"
                    />
                  </div>
                )}

                {/* Limite de Quilometragem para Troca de Óleo e Filtro */}
                <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200 space-y-1.5">
                  <label htmlFor="veh-oil-limit" className="block text-xs font-extrabold text-amber-900 uppercase tracking-wider">
                    🛢️ Limite de KM para Troca de Óleo e Filtro
                  </label>
                  <p className="text-[10px] text-amber-800 font-medium">
                    Exemplo: 1000 KM. A cada 1000 km rodados, o sistema acenderá o alerta de manutenção no checklist do motorista e nos relatórios da coordenação.
                  </p>
                  <input
                    id="veh-oil-limit"
                    type="number"
                    required
                    min={100}
                    step={100}
                    value={limiteKmTrocaOleo}
                    onChange={(e) => setLimiteKmTrocaOleo(Number(e.target.value))}
                    className="block w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-slate-950 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  />
                </div>

                {/* KM da Última Troca de Óleo */}
                <div>
                  <label htmlFor="veh-last-oil" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    KM da Última Troca de Óleo (Ponto Inicial)
                  </label>
                  <input
                    id="veh-last-oil"
                    type="number"
                    min={0}
                    value={ultimoKmTrocaOleo}
                    onChange={(e) => setUltimoKmTrocaOleo(Number(e.target.value))}
                    className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="0"
                  />
                </div>

                <button
                  id="veh-submit"
                  type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md shadow-blue-105 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors pointer-elements-auto cursor-pointer"
                >
                  Cadastrar Veículo
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200 text-center text-slate-500 space-y-2">
              <Settings2 className="h-8 w-8 mx-auto text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">Edição Restrita</p>
              <p className="text-xs">Surgiram novas necessidades? Apenas Administradores e Coordenadores podem adicionar veículos.</p>
            </div>
          )}
        </div>

        {/* Vehicles list (Visible to everyone) */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-sm border border-slate-150">
              Nenhum veículo cadastrado na frota.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vehicles.map((v) => (
                <div key={v.id} className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between hover:border-blue-200 hover:shadow-md transition-all duration-200">
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          v.type === 'Ambulância' ? 'bg-rose-100 text-rose-800' :
                          v.type === 'Carro de grande porte' ? 'bg-indigo-100 text-indigo-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {v.type}
                        </span>
                        <h4 className="font-bold text-slate-950 text-base mt-1.5">{v.brand} {v.model}</h4>
                      </div>
                      
                      {/* Stylized license plate */}
                      <div className="flex flex-col items-end space-y-2">
                        <span className="font-mono text-xs font-extrabold tracking-widest bg-slate-100 px-2.5 py-1 rounded border border-slate-300 text-slate-800 shadow-sm select-all">
                          {v.plate}
                        </span>
                        {userProfile === 'Administrador' && (
                          <button
                            onClick={() => handleDelete(v.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center"
                            title="Excluir Veículo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="flex items-center text-slate-600 text-xs gap-2 font-medium">
                        <Users2 className="h-4 w-4 text-blue-500 shrink-0" />
                        <span>Capacidade Geral: <strong>{v.maxPassengers} passageiro(s)</strong></span>
                      </div>
                      {v.type === 'Ambulância' && (
                        <div className="flex items-center text-rose-800 text-xs gap-2 font-bold bg-rose-50 p-2 rounded-lg border border-rose-200">
                          <span className="text-base">🛏️</span>
                          <span>Vagas para Acamados: <strong>{v.vagasAcamados ?? 1} maca(s)/leito(s)</strong></span>
                        </div>
                      )}
                      {(() => {
                        const oilStatus = getOilMaintenanceStatus(v, checklists);
                        return (
                          <div className={`p-3 rounded-xl border space-y-2 text-xs transition-all ${
                            oilStatus.isOverdue
                              ? 'bg-amber-100/90 border-amber-300 ring-2 ring-amber-400'
                              : 'bg-amber-50/80 border-amber-200'
                          }`}>
                            <div className="flex items-center justify-between text-amber-950 font-extrabold">
                              <span className="flex items-center space-x-1">
                                <span>🛢️ Troca de Óleo e Filtro</span>
                              </span>
                              <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                                Limite: {oilStatus.limitKm} KM
                              </span>
                            </div>

                            <div>
                              <div className="flex justify-between items-center text-[11px] text-slate-700 font-semibold mb-1">
                                <span>Acumulado desde a última troca:</span>
                                <span className={`font-mono font-bold ${oilStatus.isOverdue ? 'text-amber-950 font-black' : 'text-slate-900'}`}>
                                  {oilStatus.kmDriven} / {oilStatus.limitKm} KM
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 ${
                                    oilStatus.isOverdue
                                      ? 'bg-amber-600'
                                      : oilStatus.percentage >= 80
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${oilStatus.percentage}%` }}
                                />
                              </div>
                            </div>

                            {oilStatus.lastChangeDate && (
                              <p className="text-[10px] text-slate-600 font-medium">
                                📅 Última troca realizada em: <strong>{oilStatus.lastChangeDate}</strong>
                              </p>
                            )}

                            {oilStatus.isOverdue && (
                              <div className="p-2 bg-amber-500 text-white font-black text-[10px] uppercase rounded-lg shadow-xs flex items-center space-x-1">
                                <span>⚠️ ALERTA: MANUTENÇÃO VENCIDA ({oilStatus.kmDriven} / {oilStatus.limitKm} KM)</span>
                              </div>
                            )}

                            {isAuthorized && (
                              <button
                                type="button"
                                onClick={() => handleRecordOilChange(v.id, `${v.model} (${v.plate})`)}
                                className="mt-1 w-full py-2 px-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center justify-center space-x-1 cursor-pointer shadow-xs"
                              >
                                <span>🔄 Registrar Troca de Óleo Realizada Hoje</span>
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
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
