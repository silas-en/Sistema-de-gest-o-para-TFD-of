import React, { useState, useEffect } from 'react';
import { ClipboardList, LogOut, Truck, Clock, MapPin, Compass, CheckSquare, PlusCircle, AlertCircle, Trash2, ChevronDown, ChevronUp, CheckCircle, Calendar, User as UserIcon, Landmark, Camera, Maximize2, X, Image as ImageIcon } from 'lucide-react';
import { User, Vehicle, VehicleChecklist, Schedule, Hospital, Driver } from '../types.js';
import { getOilMaintenanceStatus } from '../utils/oilChange.js';

interface DriverChecklistSectionProps {
  currentUser: User;
  onLogout: () => void;
}

export default function DriverChecklistSection({ currentUser, onLogout }: DriverChecklistSectionProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [checklists, setChecklists] = useState<VehicleChecklist[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSubmittedInfo, setLastSubmittedInfo] = useState<{ vehicle: string; date: string; km: string; destination: string } | null>(null);
  const [expandedChecklistId, setExpandedChecklistId] = useState<string | null>(null);
  const [driverFilterDate, setDriverFilterDate] = useState('');

  // Form states
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [initialKm, setInitialKm] = useState('');
  const [finalKm, setFinalKm] = useState('');

  // Required photos
  const [fotoFrente, setFotoFrente] = useState<string>('');
  const [fotoFundo, setFotoFundo] = useState<string>('');
  const [fotoLateralEsquerda, setFotoLateralEsquerda] = useState<string>('');
  const [fotoLateralDireita, setFotoLateralDireita] = useState<string>('');
  const [selectedPhotoZoom, setSelectedPhotoZoom] = useState<{ title: string; url: string } | null>(null);

  // Checklist items (true = OK, false = NOT OK)
  const [oleo, setOleo] = useState(true);
  const [agua, setAgua] = useState(true);
  const [oxigenio, setOxigenio] = useState(true);
  const [parabrisa, setParabrisa] = useState(true);
  const [luzRe, setLuzRe] = useState(true);
  const [arCondicionado, setArCondicionado] = useState(true);
  const [documento, setDocumento] = useState(true);
  const [piscas, setPiscas] = useState(true);
  const [retrovisores, setRetrovisores] = useState(true);
  const [sirene, setSirene] = useState(true);
  const [marcadorCombustivel, setMarcadorCombustivel] = useState(true);
  const [chaveRodas, setChaveRodas] = useState(true);
  const [macaco, setMacaco] = useState(true);
  const [buzina, setBuzina] = useState(true);
  const [farois, setFarois] = useState(true);

  // Saída da base
  const [saidaHorario, setSaidaHorario] = useState('');
  const [saidaDestino, setSaidaDestino] = useState('');
  const [saidaCidade, setSaidaCidade] = useState('');

  const currentUserId = currentUser.token || currentUser.id;

  const getVehicleName = (vId: string) => {
    const v = vehicles.find(item => item.id === vId);
    return v ? `${v.brand} ${v.model} (${v.plate})` : 'Veículo Desconhecido';
  };

  const getHospitalName = (hId: string) => {
    const h = hospitals.find(item => item.id === hId);
    return h ? h.name : 'Hospital Desconhecido';
  };

  const getDriverName = (dId: string) => {
    const d = drivers.find(item => item.id === dId);
    return d ? d.fullName : 'Não designado';
  };

  const myDriverObj = drivers.find(d => d.fullName.trim().toLowerCase() === currentUser.name.trim().toLowerCase());
  const myDriverId = myDriverObj ? myDriverObj.id : null;

  const mySchedules = schedules.filter(s => {
    const matchesDriverId = myDriverId && (s.driverId === myDriverId || s.returnDriverId === myDriverId);
    const matchesDriverName = 
      (s.driverId && getDriverName(s.driverId).trim().toLowerCase() === currentUser.name.trim().toLowerCase()) ||
      (s.returnDriverId && getDriverName(s.returnDriverId).trim().toLowerCase() === currentUser.name.trim().toLowerCase());
    return matchesDriverId || matchesDriverName;
  });

  // Calculate local today string (YYYY-MM-DD)
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const todaySchedules = mySchedules.filter(s => s.startDate <= todayStr && s.endDate >= todayStr);
  const upcomingSchedules = mySchedules.filter(s => s.startDate > todayStr);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = { 'x-user-id': currentUserId };

      // Load vehicles, schedules, hospitals, drivers, checklists in parallel
      const [vRes, cRes, sRes, hRes, dRes] = await Promise.all([
        fetch('/api/vehicles', { headers }),
        fetch('/api/checklists', { headers }),
        fetch('/api/schedules', { headers }),
        fetch('/api/hospitals', { headers }),
        fetch('/api/drivers', { headers }),
      ]);

      if (vRes.ok) {
        const vData = await vRes.json();
        setVehicles(vData);
        if (vData.length > 0) {
          setSelectedVehicleId(vData[0].id);
        }
      }

      if (cRes.ok) {
        const cData = await cRes.json();
        const filtered = cData.filter((chk: VehicleChecklist) => chk.driverUserId === currentUser.id);
        setChecklists(filtered.sort((a: VehicleChecklist, b: VehicleChecklist) => b.createdAt.localeCompare(a.createdAt)));
      }

      if (sRes.ok) {
        setSchedules(await sRes.json());
      }

      if (hRes.ok) {
        setHospitals(await hRes.ok ? await hRes.json() : []);
      }

      if (dRes.ok) {
        setDrivers(await dRes.ok ? await dRes.json() : []);
      }

    } catch (e: any) {
      setError('Erro ao carregar dados. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handlePhotoUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setter(dataUrl);
        } else {
          setter(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedVehicleId) {
      setError('Por favor, selecione um veículo.');
      return;
    }
    if (!initialKm || !finalKm) {
      setError('Por favor, informe obrigatoriamente a quilometragem do veículo (KM inicial e KM final).');
      return;
    }
    if (Number(finalKm) < Number(initialKm)) {
      setError('A quilometragem final não pode ser menor que a quilometragem inicial.');
      return;
    }

    // MANDATORY PHOTO VALIDATIONS
    if (!fotoFrente) {
      setError('É OBRIGATÓRIO enviar a foto da FRENTE do veículo para concluir o checklist.');
      return;
    }
    if (!fotoFundo) {
      setError('É OBRIGATÓRIO enviar a foto do FUNDO (Traseira) do veículo para concluir o checklist.');
      return;
    }
    if (!fotoLateralEsquerda) {
      setError('É OBRIGATÓRIO enviar a foto da LATERAL ESQUERDA do veículo para concluir o checklist.');
      return;
    }
    if (!fotoLateralDireita) {
      setError('É OBRIGATÓRIO enviar a foto da LATERAL DIREITA do veículo para concluir o checklist.');
      return;
    }

    if (!saidaHorario || !saidaDestino || !saidaCidade) {
      setError('Por favor, preencha todos os dados de saída da base.');
      return;
    }

    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
    const vehicleLabel = selectedVehicle ? `${selectedVehicle.model} (${selectedVehicle.plate})` : 'Ambulância';

    const checklistData = {
      vehicleId: selectedVehicleId,
      vehicleModelPlate: vehicleLabel,
      date,
      initialKm: Number(initialKm),
      finalKm: Number(finalKm),
      oleo,
      agua,
      oxigenio,
      parabrisa,
      luzRe,
      arCondicionado,
      documento,
      piscas,
      retrovisores,
      sirene,
      marcadorCombustivel,
      chaveRodas,
      macaco,
      buzina,
      farois,
      saidaHorario,
      saidaDestino,
      saidaCidade,
      fotoFrente,
      fotoFundo,
      fotoLateralEsquerda,
      fotoLateralDireita,
    };

    try {
      const response = await fetch('/api/checklists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId
        },
        body: JSON.stringify(checklistData)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Erro ao salvar o checklist');
      }

      setSuccess('Checklist de veículo enviado com sucesso!');
      setLastSubmittedInfo({
        vehicle: vehicleLabel,
        date: date.split('-').reverse().join('/'),
        km: `${finalKm} KM`,
        destination: `${saidaDestino} (${saidaCidade})`
      });
      setShowSuccessModal(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Reset checklist non-static fields and photos
      setInitialKm('');
      setFinalKm('');
      setSaidaHorario('');
      setSaidaDestino('');
      setSaidaCidade('');
      setFotoFrente('');
      setFotoFundo('');
      setFotoLateralEsquerda('');
      setFotoLateralDireita('');

      // Reload lists
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const renderPhotoInput = (
    id: string,
    label: string,
    value: string,
    setter: (val: string) => void
  ) => {
    const isFilled = !!value;
    return (
      <div className={`p-4 border rounded-2xl transition-all ${
        isFilled ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex justify-between items-center mb-2.5">
          <label htmlFor={id} className="text-xs font-bold text-slate-800 flex items-center space-x-1.5 cursor-pointer">
            <Camera className="h-4 w-4 text-emerald-600" />
            <span>{label}</span>
          </label>
          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
            isFilled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}>
            {isFilled ? '✅ Anexada' : '⚠️ Obrigatório'}
          </span>
        </div>

        {value ? (
          <div className="relative group rounded-xl overflow-hidden border border-emerald-300 aspect-video bg-slate-900 flex items-center justify-center shadow-inner">
            <img src={value} alt={label} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 p-2">
              <button
                type="button"
                onClick={() => setSelectedPhotoZoom({ title: label, url: value })}
                className="px-2.5 py-1.5 bg-white text-slate-800 text-xxs font-bold rounded-lg shadow flex items-center space-x-1 cursor-pointer hover:bg-slate-100"
              >
                <Maximize2 className="h-3 w-3" />
                <span>Ampliar</span>
              </button>
              <label htmlFor={id} className="px-2.5 py-1.5 bg-emerald-600 text-white text-xxs font-bold rounded-lg shadow flex items-center space-x-1 cursor-pointer hover:bg-emerald-700">
                <span>Trocar</span>
              </label>
              <button
                type="button"
                onClick={() => setter('')}
                className="px-2.5 py-1.5 bg-red-600 text-white text-xxs font-bold rounded-lg shadow flex items-center space-x-1 cursor-pointer hover:bg-red-700"
              >
                <span>Remover</span>
              </button>
            </div>
          </div>
        ) : (
          <label
            htmlFor={id}
            className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl bg-white text-center cursor-pointer transition-colors group"
          >
            <Camera className="h-6 w-6 text-slate-400 group-hover:text-emerald-600 mb-1" />
            <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-700">Tirar / Anexar Foto</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Clique para abrir câmera ou galeria</span>
          </label>
        )}

        <input
          id={id}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handlePhotoUpload(e, setter)}
          className="hidden"
        />
      </div>
    );
  };

  const currentVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const currentTripKm = (finalKm && initialKm && Number(finalKm) >= Number(initialKm)) ? (Number(finalKm) - Number(initialKm)) : 0;
  const oilStatus = currentVehicle ? getOilMaintenanceStatus(currentVehicle, checklists, currentTripKm) : null;
  const isOilAlertTriggered = Boolean(oilStatus?.isOverdue);
  const selectedLimitKm = oilStatus?.limitKm || 1000;
  const kmDrivenSinceLastOil = oilStatus?.totalKmWithTrip || 0;

  useEffect(() => {
    if (isOilAlertTriggered && oleo) {
      setOleo(false);
    }
  }, [isOilAlertTriggered, oleo]);

  const handleToggle = (item: string, value: boolean, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    if (item === 'Óleo' && isOilAlertTriggered && !value) {
      alert('⚠️ A troca de óleo deste veículo está VENCIDA! O parâmetro de óleo não pode ser marcado como OK pelo motorista até que a administração/coordenação registre a manutenção de troca.');
      return;
    }
    setter(!value);
  };

  const renderToggleItem = (label: string, value: boolean, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    const isOilField = label === 'Óleo';
    const isOilWarning = isOilField && isOilAlertTriggered;

    return (
      <button
        type="button"
        disabled={isOilWarning && !value}
        onClick={() => handleToggle(label, value, setter)}
        className={`flex items-center justify-between p-3.5 border rounded-2xl transition-all font-semibold text-xs ${
          isOilWarning
            ? 'bg-amber-100 border-amber-300 text-amber-950 ring-2 ring-amber-500 cursor-not-allowed opacity-90'
            : value 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950 shadow-sm shadow-emerald-50' 
              : 'bg-rose-50 border-rose-200 text-rose-950'
        }`}
      >
        <div className="flex flex-col text-left">
          <span className="uppercase tracking-wide">{label}</span>
          {isOilWarning && (
            <span className="text-[10px] font-extrabold text-amber-800">
              🚫 BLOQUEADO - TROCA VENCIDA ({kmDrivenSinceLastOil}/{selectedLimitKm} KM)
            </span>
          )}
        </div>
        <span className="text-base select-none font-bold">
          {isOilWarning ? '❌ PENDENTE (VENCIDO)' : (value ? 'OK' : '❌ PENDENTE')}
        </span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      
      {/* Top Banner specific for Drivers */}
      <header className="bg-white border-b border-slate-150 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="bg-emerald-600 p-2 rounded-xl text-white">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">Painel do Motorista</h1>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Secretaria de Saúde</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-800">{currentUser.name}</p>
              <p className="text-[10px] text-slate-400 font-medium">Motorista Credenciado</p>
            </div>
            <button
              id="driver-logout-btn"
              onClick={onLogout}
              className="flex items-center space-x-1 px-3 py-1.5 border border-slate-250 hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-xl text-xs font-semibold transition-all focus:outline-none"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        
        {/* Welcome and Information Card */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-5 rounded-3xl shadow-xl shadow-emerald-900/10 mb-6">
          <h2 className="text-lg font-extrabold tracking-tight">Olá, {currentUser.name}!</h2>
          <p className="text-emerald-100 text-xs mt-1 leading-relaxed">
            Antes de iniciar qualquer viagem, você deve realizar o checklist de segurança do seu veículo. 
            Preencha todos os parâmetros atentamente e certifique-se da integridade das informações abaixo.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl flex items-start space-x-2 text-xs font-semibold">
            <AlertCircle className="h-4.5 w-4.5 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-start space-x-2 text-xs font-semibold shadow-sm">
            <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Driver's Trip Schedule Section (Read-Only) */}
        <div className="mb-8 bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-6" id="driver-schedule-section">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Calendar className="h-4.5 w-4.5 text-emerald-600" />
              <span>Sua Escala de Viagens</span>
            </h3>
            
            <div className="flex items-center space-x-2">
              <span className="text-xxs font-mono text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 font-bold">
                HOJE: {todayStr.split('-').reverse().join('/')}
              </span>
            </div>
          </div>

          {/* Driver Date Filter */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <label htmlFor="driver-date-filter" className="text-xs font-bold text-slate-700 whitespace-nowrap flex items-center space-x-1">
                <Clock className="h-3.5 w-3.5 text-emerald-600" />
                <span>Filtrar Demandas por Data:</span>
              </label>
              <input
                id="driver-date-filter"
                type="date"
                value={driverFilterDate}
                onChange={(e) => setDriverFilterDate(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
              {driverFilterDate && (
                <button
                  type="button"
                  onClick={() => setDriverFilterDate('')}
                  className="px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Limpar Filtro
                </button>
              )}
            </div>
            {driverFilterDate && (
              <span className="text-xs font-semibold text-emerald-700">
                Filtro ativo para {driverFilterDate.split('-').reverse().join('/')}
              </span>
            )}
          </div>

          {driverFilterDate ? (
            /* Filtered Demands View */
            <div className="space-y-3">
              <h4 className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider flex items-center space-x-1.5 bg-emerald-50/50 px-3 py-1.5 rounded-lg w-fit">
                <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                <span>Demandas para {driverFilterDate.split('-').reverse().join('/')} ({mySchedules.filter(s => s.startDate <= driverFilterDate && s.endDate >= driverFilterDate).length})</span>
              </h4>

              {mySchedules.filter(s => s.startDate <= driverFilterDate && s.endDate >= driverFilterDate).length === 0 ? (
                <div className="p-5 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400 font-semibold bg-slate-50/50">
                  Nenhuma demanda de viagem agendada para você na data {driverFilterDate.split('-').reverse().join('/')}.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                  {mySchedules
                    .filter(s => s.startDate <= driverFilterDate && s.endDate >= driverFilterDate)
                    .map((s) => (
                      <div key={s.id} className="p-4 border border-slate-150 rounded-2xl bg-white shadow-xs hover:border-emerald-200 transition-all space-y-2.5">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-widest">
                              {s.requestType} {s.recurrentTypeDetails ? `(${s.recurrentTypeDetails})` : ''}
                            </p>
                            <h5 className="text-xs font-bold text-slate-900 mt-0.5">{s.patientName}</h5>
                          </div>
                          <span className="shrink-0 text-[9px] font-extrabold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-100 uppercase tracking-wide">
                            {driverFilterDate === todayStr ? 'Hoje' : driverFilterDate.split('-').reverse().join('/')}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
                          <div className="flex items-center space-x-1.5">
                            <Landmark className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate"><strong>Destino:</strong> {getHospitalName(s.hospitalId)}</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <Truck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate"><strong>Veículo:</strong> {getVehicleName(s.vehicleId)}</span>
                          </div>
                          <div className="flex items-center space-x-1.5 col-span-1 sm:col-span-2">
                            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span><strong>Período:</strong> {s.startDate.split('-').reverse().join('/')} até {s.endDate.split('-').reverse().join('/')}</span>
                          </div>
                        </div>

                        {(s.companionName || s.companionPhone1 || s.companionPhone2) && (
                          <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1 text-[10px] text-slate-500">
                            <p className="font-bold text-slate-600 uppercase tracking-wide">Acompanhante & Contatos:</p>
                            {s.companionName && <p><strong>Nome:</strong> {s.companionName}</p>}
                            {(s.companionPhone1 || s.companionPhone2) && (
                              <p><strong>Contatos:</strong> {[s.companionPhone1, s.companionPhone2].filter(Boolean).join(' | ')}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : (
            /* Default Today / Upcoming View */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Today's Trips */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider flex items-center space-x-1.5 bg-emerald-50/50 px-3 py-1.5 rounded-lg w-fit">
                  <Clock className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Viagem(ns) de Hoje</span>
                </h4>

                {todaySchedules.length === 0 ? (
                  <div className="p-5 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400 font-semibold bg-slate-50/50">
                    Nenhuma viagem agendada para você hoje.
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {todaySchedules.map((s) => (
                      <div key={s.id} className="p-4 border border-slate-150 rounded-2xl bg-white shadow-xs hover:border-emerald-200 transition-all space-y-2.5">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-widest">
                              {s.requestType} {s.recurrentTypeDetails ? `(${s.recurrentTypeDetails})` : ''}
                            </p>
                            <h5 className="text-xs font-bold text-slate-900 mt-0.5">{s.patientName}</h5>
                          </div>
                          <span className="shrink-0 text-[9px] font-extrabold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-100 uppercase tracking-wide">
                            Hoje
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
                          <div className="flex items-center space-x-1.5">
                            <Landmark className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate"><strong>Destino:</strong> {getHospitalName(s.hospitalId)}</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <Truck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate"><strong>Veículo:</strong> {getVehicleName(s.vehicleId)}</span>
                          </div>
                          <div className="flex items-center space-x-1.5 col-span-1 sm:col-span-2">
                            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span><strong>Período:</strong> {s.startDate.split('-').reverse().join('/')} até {s.endDate.split('-').reverse().join('/')}</span>
                          </div>
                        </div>

                        {(s.companionName || s.companionPhone1 || s.companionPhone2) && (
                          <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1 text-[10px] text-slate-500">
                            <p className="font-bold text-slate-600 uppercase tracking-wide">Acompanhante & Contatos:</p>
                            {s.companionName && <p><strong>Nome:</strong> {s.companionName}</p>}
                            {(s.companionPhone1 || s.companionPhone2) && (
                              <p><strong>Contatos:</strong> {[s.companionPhone1, s.companionPhone2].filter(Boolean).join(' | ')}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upcoming Trips */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider flex items-center space-x-1.5 bg-blue-50/50 px-3 py-1.5 rounded-lg w-fit">
                  <Calendar className="h-3.5 w-3.5 text-blue-600" />
                  <span>Próximas Viagens</span>
                </h4>

                {upcomingSchedules.length === 0 ? (
                  <div className="p-5 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400 font-semibold bg-slate-50/50">
                    Nenhuma viagem futura agendada para você.
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                    {upcomingSchedules.map((s) => (
                      <div key={s.id} className="p-4 border border-slate-150 rounded-2xl bg-white shadow-xs hover:border-blue-200 transition-all space-y-2.5">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="text-[9px] font-extrabold text-blue-600 uppercase tracking-widest">
                              {s.requestType} {s.recurrentTypeDetails ? `(${s.recurrentTypeDetails})` : ''}
                            </p>
                            <h5 className="text-xs font-bold text-slate-900 mt-0.5">{s.patientName}</h5>
                          </div>
                          <span className="shrink-0 text-[9px] font-extrabold px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-100 uppercase tracking-wide">
                            {s.startDate.split('-').reverse().join('/')}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
                          <div className="flex items-center space-x-1.5">
                            <Landmark className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate"><strong>Destino:</strong> {getHospitalName(s.hospitalId)}</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <Truck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate"><strong>Veículo:</strong> {getVehicleName(s.vehicleId)}</span>
                          </div>
                          <div className="flex items-center space-x-1.5 col-span-1 sm:col-span-2">
                            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span><strong>Período:</strong> {s.startDate.split('-').reverse().join('/')} até {s.endDate.split('-').reverse().join('/')}</span>
                          </div>
                        </div>

                        {(s.companionName || s.companionPhone1 || s.companionPhone2) && (
                          <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1 text-[10px] text-slate-500">
                            <p className="font-bold text-slate-600 uppercase tracking-wide">Acompanhante & Contatos:</p>
                            {s.companionName && <p><strong>Nome:</strong> {s.companionName}</p>}
                            {(s.companionPhone1 || s.companionPhone2) && (
                              <p><strong>Contatos:</strong> {[s.companionPhone1, s.companionPhone2].filter(Boolean).join(' | ')}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Main Checklist Entry Form */}
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm space-y-6">
              
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1 mb-4 pb-2 border-b border-slate-100">
                  <Truck className="h-4.5 w-4.5 text-emerald-600" />
                  <span>Informações Gerais do Veículo</span>
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* PAINEL INFORMATIVO E ALERTA DE TROCA DE ÓLEO E FILTRO */}
                  {currentVehicle && oilStatus && (
                    <div className={`p-4 rounded-2xl border transition-all space-y-2 sm:col-span-2 ${
                      oilStatus.isOverdue 
                        ? 'bg-amber-500 text-white border-2 border-amber-600 shadow-lg animate-pulse'
                        : 'bg-amber-50 border-amber-200 text-amber-950'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-base">🛢️</span>
                          <h4 className={`text-xs font-black uppercase tracking-wider ${oilStatus.isOverdue ? 'text-yellow-100' : 'text-amber-900'}`}>
                            Controle de Troca de Óleo e Filtro
                          </h4>
                        </div>
                        <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                          oilStatus.isOverdue ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-900'
                        }`}>
                          Limite: {oilStatus.limitKm} KM
                        </span>
                      </div>

                      <div className="text-xs space-y-1.5">
                        <p className={oilStatus.isOverdue ? 'text-yellow-100 font-semibold' : 'text-slate-700 font-semibold'}>
                          Acumulado desde a última troca: <strong>{oilStatus.kmDriven} KM</strong>
                          {currentTripKm > 0 && (
                            <span> + Viagem atual (<strong>{currentTripKm} KM</strong>) = Total: <strong className="underline">{oilStatus.totalKmWithTrip} KM</strong></span>
                          )}
                        </p>

                        <div className="w-full bg-black/10 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              oilStatus.isOverdue ? 'bg-yellow-300' : oilStatus.percentage >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${oilStatus.percentage}%` }}
                          />
                        </div>

                        {oilStatus.lastChangeDate && (
                          <p className={`text-[10px] ${oilStatus.isOverdue ? 'text-yellow-100' : 'text-slate-500'}`}>
                            📅 Última troca registrada em: {oilStatus.lastChangeDate}
                          </p>
                        )}

                        {oilStatus.isOverdue && (
                          <p className="text-xs font-black text-yellow-100 pt-1 leading-relaxed">
                            🚨 ALERTA: Ao finalizar este checklist, o veículo acumulará {oilStatus.totalKmWithTrip} KM rodados, ultrapassando o limite de {oilStatus.limitKm} KM para troca de óleo e filtro! Favor notificar a coordenação.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label htmlFor="chk-vehicle" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                      Selecione o Veículo / Ambulância
                    </label>
                    <select
                      id="chk-vehicle"
                      value={selectedVehicleId}
                      onChange={(e) => setSelectedVehicleId(e.target.value)}
                      className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs font-semibold"
                    >
                      <option value="">-- Selecione o veículo --</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.model} ({v.plate})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="chk-date" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                      Data do Agendamento / Viagem
                    </label>
                    <input
                      id="chk-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label htmlFor="chk-initial-km" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                      KM Inicial
                    </label>
                    <input
                      id="chk-initial-km"
                      type="number"
                      placeholder="Ex: 63136"
                      value={initialKm}
                      onChange={(e) => setInitialKm(e.target.value)}
                      className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label htmlFor="chk-final-km" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                      KM Final <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="chk-final-km"
                      type="number"
                      placeholder="Ex: 63565"
                      value={finalKm}
                      onChange={(e) => setFinalKm(e.target.value)}
                      className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Fotos Obrigatorias do Veículo */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between mb-1 pb-2 border-b border-slate-100">
                  <span className="flex items-center space-x-1.5">
                    <Camera className="h-4.5 w-4.5 text-emerald-600" />
                    <span>Fotos Obrigatórias do Veículo</span>
                  </span>
                  <span className="text-[10px] bg-red-50 text-red-700 font-extrabold px-2.5 py-0.5 rounded-full border border-red-200 uppercase">
                    4 Fotos Exigidas
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Tire ou anexe obrigatoriamente as fotos dos 4 ângulos do veículo para validar a vistoria antes de enviar.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {renderPhotoInput('chk-photo-frente', 'Foto da Frente', fotoFrente, setFotoFrente)}
                  {renderPhotoInput('chk-photo-fundo', 'Foto do Fundo / Traseira', fotoFundo, setFotoFundo)}
                  {renderPhotoInput('chk-photo-lat-esq', 'Foto Lateral Esquerda', fotoLateralEsquerda, setFotoLateralEsquerda)}
                  {renderPhotoInput('chk-photo-lat-dir', 'Foto Lateral Direita', fotoLateralDireita, setFotoLateralDireita)}
                </div>
              </div>

              {/* Parametros do checklist */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1 mb-4 pb-2 border-b border-slate-100">
                  <CheckSquare className="h-4.5 w-4.5 text-emerald-600" />
                  <span>Parâmetros de Verificação (Toque para alternar)</span>
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {renderToggleItem('Óleo', oleo, setOleo)}
                  {renderToggleItem('Água', agua, setAgua)}
                  {renderToggleItem('Oxigênio', oxigenio, setOxigenio)}
                  {renderToggleItem('Para-brisa', parabrisa, setParabrisa)}
                  {renderToggleItem('Luz de ré', luzRe, setLuzRe)}
                  {renderToggleItem('Ar-condicionado', arCondicionado, setArCondicionado)}
                  {renderToggleItem('Documento', documento, setDocumento)}
                  {renderToggleItem('Piscas', piscas, setPiscas)}
                  {renderToggleItem('Retrovisores', retrovisores, setRetrovisores)}
                  {renderToggleItem('Sirene', sirene, setSirene)}
                  {renderToggleItem('Marcador Combustível', marcadorCombustivel, setMarcadorCombustivel)}
                  {renderToggleItem('Chave de rodas', chaveRodas, setChaveRodas)}
                  {renderToggleItem('Macaco', macaco, setMacaco)}
                  {renderToggleItem('Buzina', buzina, setBuzina)}
                  {renderToggleItem('Faróis', farois, setFarois)}
                </div>
              </div>

              {/* Saída da base */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1 mb-4 pb-2 border-b border-slate-100">
                  <Compass className="h-4.5 w-4.5 text-emerald-600" />
                  <span>Saída da Base</span>
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="chk-horario" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                      Horário de Saída
                    </label>
                    <input
                      id="chk-horario"
                      type="text"
                      placeholder="Ex: 04:00"
                      value={saidaHorario}
                      onChange={(e) => setSaidaHorario(e.target.value)}
                      className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label htmlFor="chk-destino" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                      Destino / Hospital
                    </label>
                    <input
                      id="chk-destino"
                      type="text"
                      placeholder="Ex: H.A.M"
                      value={saidaDestino}
                      onChange={(e) => setSaidaDestino(e.target.value)}
                      className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label htmlFor="chk-cidade" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                      Cidade de Destino
                    </label>
                    <input
                      id="chk-cidade"
                      type="text"
                      placeholder="Ex: SALVADOR"
                      value={saidaCidade}
                      onChange={(e) => setSaidaCidade(e.target.value)}
                      className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Conductor Signature block */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Nome do condutor logado</p>
                <p className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>* {currentUser.name} *</span>
                </p>
              </div>

              <div>
                <button
                  id="submit-checklist-btn"
                  type="submit"
                  className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-2xl shadow-lg shadow-emerald-100 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors cursor-pointer pointer-events-auto"
                >
                  Salvar e Enviar Checklist
                </button>
              </div>

            </form>
          </div>

          {/* Side Panel: Driver's Checklist Log History */}
          <div className="md:col-span-1 space-y-4">
            <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-4 flex items-center space-x-1">
                <ClipboardList className="h-4.5 w-4.5 text-emerald-600" />
                <span>Seus Envios</span>
              </h3>

              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400">Carregando histórico...</div>
              ) : checklists.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-semibold">
                  Nenhum checklist enviado por você até o momento.
                </div>
              ) : (
                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                  {checklists.map(chk => {
                    const isExpanded = expandedChecklistId === chk.id;
                    const formattedDate = chk.date.split('-').reverse().join('/');
                    return (
                      <div key={chk.id} className="border border-slate-100 rounded-2xl p-3 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                        <div className="flex justify-between items-start cursor-pointer" onClick={() => setExpandedChecklistId(isExpanded ? null : chk.id)}>
                          <div>
                            <p className="text-xxs font-extrabold text-emerald-700 tracking-wider uppercase mb-0.5">{formattedDate}</p>
                            <p className="text-xs font-bold text-slate-800 line-clamp-1">{chk.vehicleModelPlate}</p>
                            <p className="text-[10px] text-slate-400 font-semibold">{chk.saidaHorario} | {chk.saidaDestino} ({chk.saidaCidade})</p>
                          </div>
                          <button className="text-slate-400 hover:text-slate-600 p-0.5" type="button">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] space-y-2 text-slate-600 animate-fadeIn">
                            <div className="grid grid-cols-2 gap-y-1">
                              <div><strong className="text-slate-700">KM Inicial:</strong> {chk.initialKm}</div>
                              <div><strong className="text-slate-700">KM Final:</strong> {chk.finalKm}</div>
                              <div><strong className="text-slate-700">Horário:</strong> {chk.saidaHorario}</div>
                              <div><strong className="text-slate-700">Destino:</strong> {chk.saidaDestino}</div>
                              <div><strong className="text-slate-700">Cidade:</strong> {chk.saidaCidade}</div>
                            </div>
                            
                            <div className="pt-2">
                              <strong className="text-slate-700 block mb-1">Itens Verificados:</strong>
                              <div className="grid grid-cols-2 gap-1 text-[10px] font-semibold text-slate-500">
                                <div>Óleo: {chk.oleo ? '🆗' : '❌'}</div>
                                <div>Água: {chk.agua ? '🆗' : '❌'}</div>
                                <div>Oxigênio: {chk.oxigenio ? '🆗' : '❌'}</div>
                                <div>Para-brisa: {chk.parabrisa ? '🆗' : '❌'}</div>
                                <div>Luz de Ré: {chk.luzRe ? '🆗' : '❌'}</div>
                                <div>Ar Condic.: {chk.arCondicionado ? '🆗' : '❌'}</div>
                                <div>Documento: {chk.documento ? '🆗' : '❌'}</div>
                                <div>Piscas: {chk.piscas ? '🆗' : '❌'}</div>
                                <div>Retrovisores: {chk.retrovisores ? '🆗' : '❌'}</div>
                                <div>Sirene: {chk.sirene ? '🆗' : '❌'}</div>
                                <div>Combustível: {chk.marcadorCombustivel ? '🆗' : '❌'}</div>
                                <div>Chave Rodas: {chk.chaveRodas ? '🆗' : '❌'}</div>
                                <div>Macaco: {chk.macaco ? '🆗' : '❌'}</div>
                                <div>Buzina: {chk.buzina ? '🆗' : '❌'}</div>
                                <div>Faróis: {chk.farois ? '🆗' : '❌'}</div>
                              </div>
                            </div>

                            {(chk.fotoFrente || chk.fotoFundo || chk.fotoLateralEsquerda || chk.fotoLateralDireita) && (
                              <div className="pt-2 border-t border-slate-100">
                                <strong className="text-slate-700 block mb-1">Fotos do Veículo:</strong>
                                <div className="grid grid-cols-2 gap-1.5">
                                  {[
                                    { name: 'Frente', url: chk.fotoFrente },
                                    { name: 'Fundo', url: chk.fotoFundo },
                                    { name: 'Lat. Esquerda', url: chk.fotoLateralEsquerda },
                                    { name: 'Lat. Direita', url: chk.fotoLateralDireita },
                                  ].map((p, idx) => p.url ? (
                                    <div 
                                      key={idx}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPhotoZoom({ title: `${chk.vehicleModelPlate} - ${p.name}`, url: p.url! });
                                      }}
                                      className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-video bg-black/5 cursor-pointer hover:border-emerald-500 transition-colors"
                                    >
                                      <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                                      <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] font-bold text-center py-0.5 truncate">
                                        {p.name}
                                      </span>
                                    </div>
                                  ) : null)}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>

      </main>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={() => setShowSuccessModal(false)}>
          <div className="relative max-w-md w-full bg-white border border-emerald-100 rounded-3xl overflow-hidden shadow-2xl p-6 text-center space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle className="h-10 w-10 text-emerald-600" />
            </div>
            
            <div>
              <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 mb-2">
                Envio Confirmado
              </span>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Checklist Registrado com Sucesso!</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                O checklist do seu veículo foi gravado no sistema com sucesso e já está visível para a gestão, coordenação e administração.
              </p>
            </div>

            {lastSubmittedInfo && (
              <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-2xl text-left space-y-1.5 text-xs text-slate-700">
                <p className="flex justify-between border-b border-slate-200/60 pb-1">
                  <span className="text-slate-400 font-semibold">Veículo:</span>
                  <strong className="text-slate-800">{lastSubmittedInfo.vehicle}</strong>
                </p>
                <p className="flex justify-between border-b border-slate-200/60 pb-1">
                  <span className="text-slate-400 font-semibold">Data do Envio:</span>
                  <strong className="text-slate-800">{lastSubmittedInfo.date}</strong>
                </p>
                <p className="flex justify-between border-b border-slate-200/60 pb-1">
                  <span className="text-slate-400 font-semibold">KM Registrado:</span>
                  <strong className="text-slate-800">{lastSubmittedInfo.km}</strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Destino:</span>
                  <strong className="text-slate-800">{lastSubmittedInfo.destination}</strong>
                </p>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
              >
                Entendido / Fechar
              </button>
            </div>
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

      <footer className="bg-white border-t border-slate-150 py-6 text-center text-xs text-slate-400 font-medium mt-12">
        <p>© 2026 Secretaria Municipal de Saúde. Todos os direitos reservados.</p>
        <p className="mt-1 text-[10px] text-slate-300 font-mono">TFD-v1.0.0-PROD</p>
      </footer>

    </div>
  );
}
