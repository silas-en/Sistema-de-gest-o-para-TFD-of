import React, { useState, useEffect } from 'react';
import { ClipboardList, LogOut, Truck, Clock, MapPin, Compass, CheckSquare, PlusCircle, AlertCircle, Trash2, ChevronDown, ChevronUp, CheckCircle, Calendar, User as UserIcon, Landmark, Camera, Maximize2, X, Image as ImageIcon, Fuel, AlertTriangle, ArrowRight, CheckCircle2, ShieldCheck, DollarSign, Wrench } from 'lucide-react';
import { User, Vehicle, VehicleChecklist, Schedule, Hospital, Driver, FuelLevel } from '../types.js';
import { getOilMaintenanceStatus } from '../utils/oilChange.js';

interface DriverChecklistSectionProps {
  currentUser: User;
  onLogout: () => void;
}

export default function DriverChecklistSection({ currentUser, onLogout }: DriverChecklistSectionProps) {
  const [activeTab, setActiveTab] = useState<'saida' | 'devolucao' | 'historico'>('saida');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [checklists, setChecklists] = useState<VehicleChecklist[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: ''
  });
  const [success, setSuccess] = useState<string | null>(null);

  const triggerError = (msg: string, title: string = 'Atenção: Checklist Incompleto') => {
    setError(msg);
    setErrorModal({
      isOpen: true,
      title,
      message: msg
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSubmittedInfo, setLastSubmittedInfo] = useState<{
    type: 'saida' | 'devolucao';
    vehicle: string;
    date: string;
    km: string;
    fuel: string;
    destination?: string;
  } | null>(null);

  const [expandedChecklistId, setExpandedChecklistId] = useState<string | null>(null);
  const [driverFilterDate, setDriverFilterDate] = useState('');
  const [selectedPhotoZoom, setSelectedPhotoZoom] = useState<{ title: string; url: string } | null>(null);

  // ==========================================
  // PARTE 1: FORMULÁRIO DE SAÍDA (PEGOU O CARRO)
  // ==========================================
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [saidaHorario, setSaidaHorario] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  });
  const [saidaDestino, setSaidaDestino] = useState('');
  const [saidaCidade, setSaidaCidade] = useState('');
  const [initialKm, setInitialKm] = useState('');
  const [combustivelInicial, setCombustivelInicial] = useState<FuelLevel>('cheio');
  const [fotoPainelCombustivelInicial, setFotoPainelCombustivelInicial] = useState<string>('');

  // Required 4 vehicle photos on departure
  const [fotoFrente, setFotoFrente] = useState<string>('');
  const [fotoFundo, setFotoFundo] = useState<string>('');
  const [fotoLateralEsquerda, setFotoLateralEsquerda] = useState<string>('');
  const [fotoLateralDireita, setFotoLateralDireita] = useState<string>('');

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

  // ==========================================
  // PARTE 2: FORMULÁRIO DE DEVOLUÇÃO (FIM DO EXPEDIENTE)
  // ==========================================
  const [selectedPendingChecklistId, setSelectedPendingChecklistId] = useState<string>('');
  const [retornoData, setRetornoData] = useState(() => new Date().toISOString().split('T')[0]);
  const [retornoHorario, setRetornoHorario] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  });
  const [finalKm, setFinalKm] = useState('');
  const [fotoKmFinal, setFotoKmFinal] = useState<string>('');
  const [combustivelFinal, setCombustivelFinal] = useState<FuelLevel>('1/2');
  const [fotoPainelCombustivelFinal, setFotoPainelCombustivelFinal] = useState<string>('');

  // Abastecimento
  const [houveAbastecimento, setHouveAbastecimento] = useState(false);
  const [abastecimentoLitros, setAbastecimentoLitros] = useState('');
  const [abastecimentoValor, setAbastecimentoValor] = useState('');
  const [abastecimentoPosto, setAbastecimentoPosto] = useState('');
  const [abastecimentoComprovanteFoto, setAbastecimentoComprovanteFoto] = useState<string>('');

  // Incidentes / Danos
  const [houveIncidente, setHouveIncidente] = useState(false);
  const [descricaoIncidente, setDescricaoIncidente] = useState('');
  const [fotoIncidente, setFotoIncidente] = useState<string>('');

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

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = { 'x-user-id': currentUserId };

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
        if (vData.length > 0 && !selectedVehicleId) {
          setSelectedVehicleId(vData[0].id);
        }
      }

      if (cRes.ok) {
        const cData = await cRes.json();
        const myChecklists = cData.filter((chk: VehicleChecklist) => chk.driverUserId === currentUser.id);
        const sorted = myChecklists.sort((a: VehicleChecklist, b: VehicleChecklist) => b.createdAt.localeCompare(a.createdAt));
        setChecklists(sorted);

        // Auto select active pending checklist if not selected
        const pending = sorted.find((chk: VehicleChecklist) => chk.status === 'em_andamento');
        if (pending && !selectedPendingChecklistId) {
          setSelectedPendingChecklistId(pending.id);
        }
      }

      if (sRes.ok) {
        setSchedules(await sRes.json());
      }

      if (hRes.ok) {
        setHospitals(await hRes.json());
      }

      if (dRes.ok) {
        setDrivers(await dRes.json());
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

  // Find checklists in progress (waiting return)
  const pendingChecklists = checklists.filter(c => c.status === 'em_andamento');
  const activePendingChecklist = pendingChecklists.find(c => c.id === selectedPendingChecklistId) || pendingChecklists[0];

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
        const MAX_DIM = 800;
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

        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
          setter(dataUrl);
        } else {
          setter(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // ==========================================
  // SUBMIT PARTE 1: SAÍDA (PEGOU O CARRO)
  // ==========================================
  const handleSubmitSaida = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedVehicleId) {
      triggerError('Por favor, selecione o veículo que você está pegando.');
      return;
    }
    if (!initialKm || isNaN(Number(initialKm)) || Number(initialKm) < 0) {
      triggerError('Por favor, informe a quilometragem inicial (KM) do veículo.');
      return;
    }

    if (!combustivelInicial) {
      triggerError('É OBRIGATÓRIO informar o nível de combustível no momento em que pegou o veículo.');
      return;
    }

    if (!fotoPainelCombustivelInicial) {
      triggerError('É OBRIGATÓRIO enviar a foto do painel de combustível no momento em que pegou o veículo.');
      return;
    }

    // MANDATORY 4 VEHICLE PHOTOS
    if (!fotoFrente) {
      triggerError('É OBRIGATÓRIO enviar a foto da FRENTE do veículo para registrar a saída.');
      return;
    }
    if (!fotoFundo) {
      triggerError('É OBRIGATÓRIO enviar a foto do FUNDO (Traseira) do veículo para registrar a saída.');
      return;
    }
    if (!fotoLateralEsquerda) {
      triggerError('É OBRIGATÓRIO enviar a foto da LATERAL ESQUERDA do veículo para registrar a saída.');
      return;
    }
    if (!fotoLateralDireita) {
      triggerError('É OBRIGATÓRIO enviar a foto da LATERAL DIREITA do veículo para registrar a saída.');
      return;
    }

    if (!saidaHorario || !saidaDestino || !saidaCidade) {
      triggerError('Por favor, preencha todos os dados de saída da base (Horário, Destino e Cidade).');
      return;
    }

    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
    const vehicleLabel = selectedVehicle ? `${selectedVehicle.model} (${selectedVehicle.plate})` : 'Ambulância';

    const checklistData = {
      vehicleId: selectedVehicleId,
      vehicleModelPlate: vehicleLabel,
      date,
      initialKm: Number(initialKm),
      combustivelInicial,
      fotoPainelCombustivelInicial,
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
        throw new Error(errData.error || 'Erro ao registrar a saída do veículo');
      }

      const created = await response.json();

      setSuccess('Checklist de Saída registrado com sucesso! O veículo agora está marcado como em uso.');
      setLastSubmittedInfo({
        type: 'saida',
        vehicle: vehicleLabel,
        date: date.split('-').reverse().join('/'),
        km: `${initialKm} KM (Inicial)`,
        fuel: getFuelLabel(combustivelInicial),
        destination: `${saidaDestino} (${saidaCidade})`
      });
      setShowSuccessModal(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Reset departure form
      setInitialKm('');
      setFotoPainelCombustivelInicial('');
      setFotoFrente('');
      setFotoFundo('');
      setFotoLateralEsquerda('');
      setFotoLateralDireita('');
      setSaidaDestino('');
      setSaidaCidade('');

      // Reload data and switch pending checklist
      await loadData();
      if (created.id) {
        setSelectedPendingChecklistId(created.id);
      }
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // ==========================================
  // SUBMIT PARTE 2: DEVOLUÇÃO (FIM DO EXPEDIENTE)
  // ==========================================
  const handleSubmitDevolucao = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!activePendingChecklist) {
      triggerError('Nenhum checklist de saída em andamento foi selecionado para devolução.');
      return;
    }

    if (!finalKm || isNaN(Number(finalKm))) {
      triggerError('Por favor, informe a quilometragem final (KM) no momento da devolução.');
      return;
    }

    if (Number(finalKm) < Number(activePendingChecklist.initialKm)) {
      triggerError(`A quilometragem final (${finalKm} KM) não pode ser menor que a quilometragem inicial da saída (${activePendingChecklist.initialKm} KM).`);
      return;
    }

    if (!fotoKmFinal) {
      triggerError('É OBRIGATÓRIO enviar a foto do painel/odômetro com a quilometragem final.');
      return;
    }

    if (!combustivelFinal) {
      triggerError('É OBRIGATÓRIO informar o nível de combustível na devolução do veículo.');
      return;
    }

    if (!fotoPainelCombustivelFinal) {
      triggerError('É OBRIGATÓRIO enviar a foto do painel de combustível no momento da devolução.');
      return;
    }

    if (houveAbastecimento) {
      if (!abastecimentoLitros || isNaN(Number(abastecimentoLitros)) || Number(abastecimentoLitros) <= 0) {
        triggerError('Como houve abastecimento, por favor informe a quantidade de litros (L) abastecida.');
        return;
      }
    }

    if (houveIncidente && !descricaoIncidente.trim()) {
      triggerError('Como houve incidente ou dano, por favor descreva detalhadamente o ocorrido.');
      return;
    }

    const payload = {
      finalKm: Number(finalKm),
      fotoKmFinal,
      combustivelFinal,
      fotoPainelCombustivelFinal,
      houveAbastecimento,
      abastecimentoLitros: houveAbastecimento ? Number(abastecimentoLitros) : undefined,
      abastecimentoValor: houveAbastecimento ? Number(abastecimentoValor) : undefined,
      abastecimentoPosto: houveAbastecimento ? abastecimentoPosto : undefined,
      abastecimentoComprovanteFoto: houveAbastecimento ? abastecimentoComprovanteFoto : undefined,
      houveIncidente,
      descricaoIncidente: houveIncidente ? descricaoIncidente.trim() : undefined,
      fotoIncidente: houveIncidente ? fotoIncidente : undefined,
      retornoHorario,
      retornoData
    };

    try {
      const response = await fetch(`/api/checklists/${activePendingChecklist.id}/complete`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Erro ao finalizar devolução do veículo');
      }

      const updated = await response.json();
      const kmRodada = Number(finalKm) - Number(activePendingChecklist.initialKm);

      setSuccess('Checklist de Devolução finalizado com sucesso! Expediente e viagem concluídos.');
      setLastSubmittedInfo({
        type: 'devolucao',
        vehicle: updated.vehicleModelPlate,
        date: retornoData.split('-').reverse().join('/'),
        km: `${finalKm} KM Final (${kmRodada} KM rodados)`,
        fuel: getFuelLabel(combustivelFinal),
      });
      setShowSuccessModal(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Reset return form fields
      setFinalKm('');
      setFotoKmFinal('');
      setFotoPainelCombustivelFinal('');
      setHouveAbastecimento(false);
      setAbastecimentoLitros('');
      setAbastecimentoValor('');
      setAbastecimentoPosto('');
      setAbastecimentoComprovanteFoto('');
      setHouveIncidente(false);
      setDescricaoIncidente('');
      setFotoIncidente('');

      // Reload
      await loadData();
      setActiveTab('historico');
    } catch (err: any) {
      triggerError(err.message);
    }
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

  const renderFuelSelector = (
    value: FuelLevel | string,
    setter: (f: FuelLevel) => void,
    label: string
  ) => {
    const levels: { id: FuelLevel; name: string; icon: string; color: string }[] = [
      { id: 'reserva', name: 'Reserva', icon: '⛽', color: 'border-rose-300 bg-rose-50 text-rose-800' },
      { id: '1/4', name: '1/4', icon: '¼', color: 'border-amber-300 bg-amber-50 text-amber-800' },
      { id: '1/2', name: '1/2 (Meio)', icon: '½', color: 'border-blue-300 bg-blue-50 text-blue-800' },
      { id: '3/4', name: '3/4', icon: '¾', color: 'border-indigo-300 bg-indigo-50 text-indigo-800' },
      { id: 'cheio', name: 'Cheio', icon: '🌕', color: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
    ];

    return (
      <div>
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Fuel className="h-4 w-4 text-amber-600" />
            {label} (Obrigatório)
          </span>
          <span className="text-[11px] font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            {getFuelLabel(value)}
          </span>
        </label>
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {levels.map(lvl => {
            const isSelected = value === lvl.id;
            return (
              <button
                key={lvl.id}
                type="button"
                onClick={() => setter(lvl.id)}
                className={`py-2.5 px-1 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                  isSelected
                    ? `${lvl.color} ring-2 ring-blue-600 font-extrabold shadow-sm scale-[1.02]`
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="text-base leading-none mb-1">{lvl.icon}</span>
                <span className="text-[11px] font-bold truncate max-w-full">{lvl.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPhotoInput = (
    id: string,
    label: string,
    value: string,
    setter: (val: string) => void,
    required: boolean = true,
    hint: string = 'Clique para abrir câmera ou galeria'
  ) => {
    const isFilled = !!value;
    return (
      <div className={`p-3.5 border rounded-2xl transition-all ${
        isFilled ? 'bg-emerald-50/50 border-emerald-300' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex justify-between items-center mb-2">
          <label htmlFor={id} className="text-xs font-bold text-slate-800 flex items-center space-x-1.5 cursor-pointer">
            <Camera className="h-4 w-4 text-emerald-600" />
            <span>{label}</span>
          </label>
          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
            isFilled ? 'bg-emerald-100 text-emerald-800' : (required ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600')
          }`}>
            {isFilled ? '✅ Foto Anexada' : (required ? '⚠️ Foto Obrigatória' : 'Opcional')}
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
                className="px-2.5 py-1.5 bg-rose-600 text-white text-xxs font-bold rounded-lg shadow flex items-center space-x-1 cursor-pointer hover:bg-rose-700"
              >
                <span>Remover</span>
              </button>
            </div>
          </div>
        ) : (
          <label
            htmlFor={id}
            className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl bg-white text-center cursor-pointer transition-colors group"
          >
            <Camera className="h-5 w-5 text-slate-400 group-hover:text-emerald-600 mb-1" />
            <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-700">Tirar / Anexar Foto</span>
            <span className="text-[10px] text-slate-400 mt-0.5">{hint}</span>
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
  const oilStatus = currentVehicle ? getOilMaintenanceStatus(currentVehicle, checklists, 0) : null;
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
        className={`flex items-center justify-between p-3 border rounded-xl transition-all font-semibold text-xs ${
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
              🚫 TROCA VENCIDA ({kmDrivenSinceLastOil}/{selectedLimitKm} KM)
            </span>
          )}
        </div>
        <span className="text-sm select-none font-bold">
          {isOilWarning ? '❌ VENCIDO' : (value ? 'OK' : '❌ PENDENTE')}
        </span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      
      {/* Top Banner */}
      <header className="bg-white border-b border-slate-200 py-3.5 sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center space-x-2.5">
            <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-sm">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 leading-tight">Painel do Motorista</h1>
              <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Secretaria de Saúde - TFD</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-900">{currentUser.name}</span>
              <span className="text-[10px] text-emerald-600 font-bold uppercase">{currentUser.profile}</span>
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition flex items-center space-x-1 border border-slate-200"
              title="Sair do sistema"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-xs font-bold sm:inline hidden">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 pt-4 space-y-4">

        {/* PROMINENT BANNER FOR VEHICLES IN USE (WAITING DEVOLUTION) */}
        {pendingChecklists.length > 0 && activeTab !== 'devolucao' && (
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-4 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-start space-x-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <Truck className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/30 px-2 py-0.5 rounded-full">
                  🚗 Veículo em Trânsito / Uso Ativo
                </span>
                <h3 className="font-extrabold text-base mt-0.5">
                  {pendingChecklists[0].vehicleModelPlate}
                </h3>
                <p className="text-xs text-amber-100">
                  Saída em {pendingChecklists[0].date.split('-').reverse().join('/')} às {pendingChecklists[0].saidaHorario} (KM Inicial: {pendingChecklists[0].initialKm})
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedPendingChecklistId(pendingChecklists[0].id);
                setActiveTab('devolucao');
              }}
              className="px-4 py-2.5 bg-white text-amber-900 hover:bg-amber-50 font-extrabold text-xs rounded-xl shadow transition flex items-center justify-center space-x-1.5 whitespace-nowrap self-start sm:self-center"
            >
              <span>Realizar Devolução (Fim de Viagem)</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Global Notifications */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-start space-x-2 text-xs font-semibold shadow-sm">
            <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-start space-x-2 text-xs font-semibold shadow-sm">
            <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* NAVIGATION TABS FOR DUAL-STEP CHECKLIST */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('saida')}
            className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'saida'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Truck className="h-4 w-4" />
            <span className="truncate">1. Saída (Pegar Carro)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('devolucao')}
            className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 relative ${
              activeTab === 'devolucao'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CheckSquare className="h-4 w-4" />
            <span className="truncate">2. Devolução (Fim de Viagem)</span>
            {pendingChecklists.length > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-amber-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                {pendingChecklists.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('historico')}
            className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'historico'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            <span className="truncate">Meus Checklists</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: FORMULÁRIO DE SAÍDA (MOMENTO EM QUE PEGOU O CARRO) */}
        {/* ======================================================== */}
        {activeTab === 'saida' && (
          <div className="space-y-4">
            
            {/* Quick Trip Reference if available */}
            {todaySchedules.length > 0 && (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5">
                <div className="flex items-center space-x-2 text-emerald-900 mb-2">
                  <Calendar className="h-4 w-4 text-emerald-700" />
                  <span className="text-xs font-bold uppercase tracking-wider">Suas Viagens Agendadas para Hoje</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {todaySchedules.map(s => (
                    <div key={s.id} className="bg-white p-2.5 rounded-xl border border-emerald-100 text-xs shadow-2xs">
                      <div className="font-extrabold text-slate-900">{s.patientName}</div>
                      <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                        <Landmark className="h-3 w-3 text-slate-400" />
                        <span>{getHospitalName(s.hospitalId)}</span>
                      </div>
                      <div className="text-[11px] font-semibold text-emerald-700 mt-1">
                        Veículo: {getVehicleName(s.vehicleId)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
              <div className="flex items-center space-x-3 mb-4 pb-3 border-b border-slate-100">
                <div className="bg-emerald-100 text-emerald-700 p-2.5 rounded-xl">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Checklist Inicial (Saída do Veículo)</h2>
                  <p className="text-xs text-slate-500 font-medium">Preencha no momento em que você pegar o carro para iniciar a jornada/viagem</p>
                </div>
              </div>

              <form onSubmit={handleSubmitSaida} className="space-y-5">
                
                {/* 1. Seleção do Veículo */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Veículo Utilizado (Obrigatório)
                  </label>
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  >
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.brand} {v.model} - Placa: {v.plate} ({v.type || 'Veículo'})
                      </option>
                    ))}
                  </select>

                  {/* Oil maintenance status badge */}
                  {oilStatus && (
                    <div className={`mt-2 p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                      isOilAlertTriggered ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}>
                      <span className="flex items-center gap-1.5">
                        <Wrench className="h-3.5 w-3.5 text-slate-500" />
                        Status da Troca de Óleo: {kmDrivenSinceLastOil} / {selectedLimitKm} KM
                        {oilStatus.initialOilKm > 0 && (
                          <span className="text-[10px] text-slate-500 font-medium">
                            (Ponto Inicial: {oilStatus.initialOilKm} KM)
                          </span>
                        )}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        isOilAlertTriggered ? 'bg-rose-600 text-white' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isOilAlertTriggered ? 'VENCIDA' : 'EM DIA'}
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Dados de Saída & KM Inicial */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Data da Saída
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Horário de Saída
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 06:30"
                      value={saidaHorario}
                      onChange={(e) => setSaidaHorario(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      KM Inicial (Odômetro)
                    </label>
                    <input
                      type="number"
                      placeholder="Ex: 142500"
                      value={initialKm}
                      onChange={(e) => setInitialKm(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                      required
                    />
                  </div>
                </div>

                {/* 3. Destino & Cidade */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Destino da Viagem
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Hospital Regional do Agreste"
                      value={saidaDestino}
                      onChange={(e) => setSaidaDestino(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Cidade de Destino
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Caruaru - PE"
                      value={saidaCidade}
                      onChange={(e) => setSaidaCidade(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                      required
                    />
                  </div>
                </div>

                {/* 4. COMBUSTÍVEL INICIAL + FOTO OBRIGATÓRIA DO PAINEL */}
                <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-4">
                  {renderFuelSelector(combustivelInicial, setCombustivelInicial, 'Nível de Combustível Inicial')}
                  
                  {renderPhotoInput(
                    'foto-painel-combustivel-inicial',
                    'Foto do Painel de Combustível Inicial',
                    fotoPainelCombustivelInicial,
                    setFotoPainelCombustivelInicial,
                    true,
                    'Foto nítida mostrando o marcador de combustível no momento da saída'
                  )}
                </div>

                {/* 5. Vistoria e Itens de Segurança */}
                <div>
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Itens de Vistoria do Veículo</span>
                    <span className="text-[10px] text-slate-500 font-medium">Clique para alternar OK / Pendente</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {renderToggleItem('Óleo', oleo, setOleo)}
                    {renderToggleItem('Água / Radiador', agua, setAgua)}
                    {renderToggleItem('Oxigênio', oxigenio, setOxigenio)}
                    {renderToggleItem('Para-brisa / Palhetas', parabrisa, setParabrisa)}
                    {renderToggleItem('Luz de Ré', luzRe, setLuzRe)}
                    {renderToggleItem('Ar Condicionado', arCondicionado, setArCondicionado)}
                    {renderToggleItem('Documento do Veículo', documento, setDocumento)}
                    {renderToggleItem('Piscas / Setas', piscas, setPiscas)}
                    {renderToggleItem('Retrovisores', retrovisores, setRetrovisores)}
                    {renderToggleItem('Sirene / Giroflex', sirene, setSirene)}
                    {renderToggleItem('Marcador Combustível', marcadorCombustivel, setMarcadorCombustivel)}
                    {renderToggleItem('Chave de Rodas', chaveRodas, setChaveRodas)}
                    {renderToggleItem('Macaco', macaco, setMacaco)}
                    {renderToggleItem('Buzina', buzina, setBuzina)}
                    {renderToggleItem('Faróis Altos/Baixos', farois, setFarois)}
                  </div>
                </div>

                {/* 6. 4 Fotos Obrigatórias do Veículo */}
                <div>
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2">
                    Fotos do Veículo na Saída (4 Ângulos Obrigatórios)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {renderPhotoInput('foto-frente', 'Foto da Frente', fotoFrente, setFotoFrente, true)}
                    {renderPhotoInput('foto-fundo', 'Foto do Fundo (Traseira)', fotoFundo, setFotoFundo, true)}
                    {renderPhotoInput('foto-lateral-esq', 'Foto Lateral Esquerda', fotoLateralEsquerda, setFotoLateralEsquerda, true)}
                    {renderPhotoInput('foto-lateral-dir', 'Foto Lateral Direita', fotoLateralDireita, setFotoLateralDireita, true)}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-md transition flex items-center justify-center space-x-2"
                >
                  <CheckCircle className="h-5 w-5" />
                  <span>Salvar e Registrar Saída do Veículo</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: FORMULÁRIO DE DEVOLUÇÃO (FIM DO EXPEDIENTE / VIAGEM) */}
        {/* ======================================================== */}
        {activeTab === 'devolucao' && (
          <div className="space-y-4">
            
            {pendingChecklists.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
                <div className="bg-slate-100 text-slate-500 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Truck className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">Nenhum Veículo em Trânsito Aberto</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                  Você não possui nenhuma saída de veículo pendente de devolução no momento. Para iniciar uma nova viagem, faça o checklist de saída primeiro.
                </p>
                <button
                  onClick={() => setActiveTab('saida')}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition"
                >
                  Preencher Checklist de Saída
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
                <div className="flex items-center space-x-3 mb-4 pb-3 border-b border-slate-100">
                  <div className="bg-blue-100 text-blue-700 p-2.5 rounded-xl">
                    <CheckSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">Checklist Final (Devolução do Veículo)</h2>
                    <p className="text-xs text-slate-500 font-medium">Preencha no momento em que você devolver o carro ao final da viagem/expediente</p>
                  </div>
                </div>

                {/* Checklist Selection if multiple */}
                {pendingChecklists.length > 1 && (
                  <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Selecione o Veículo a ser Devolvido:
                    </label>
                    <select
                      value={selectedPendingChecklistId}
                      onChange={(e) => setSelectedPendingChecklistId(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                    >
                      {pendingChecklists.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.vehicleModelPlate} - Saída em {c.date.split('-').reverse().join('/')} às {c.saidaHorario} (KM Inicial: {c.initialKm})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Reference Card of Departure Info */}
                {activePendingChecklist && (
                  <div className="mb-5 p-3.5 bg-blue-50/60 border border-blue-200 rounded-2xl text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider">Dados Registrados na Saída</span>
                      <span className="text-[10px] font-bold bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full">
                        Em Trânsito
                      </span>
                    </div>
                    <div className="font-extrabold text-slate-900 text-sm">{activePendingChecklist.vehicleModelPlate}</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-slate-600 font-medium">
                      <div>Saída: <strong>{activePendingChecklist.date.split('-').reverse().join('/')} às {activePendingChecklist.saidaHorario}</strong></div>
                      <div>KM Inicial: <strong className="text-blue-800">{activePendingChecklist.initialKm} KM</strong></div>
                      <div>Combustível Inicial: <strong>{getFuelLabel(activePendingChecklist.combustivelInicial)}</strong></div>
                      <div>Destino: <strong>{activePendingChecklist.saidaDestino} ({activePendingChecklist.saidaCidade})</strong></div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmitDevolucao} className="space-y-5">
                  
                  {/* 1. Dados de Devolução & KM Final com Foto Obrigatória */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Data da Devolução
                      </label>
                      <input
                        type="date"
                        value={retornoData}
                        onChange={(e) => setRetornoData(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Horário da Devolução
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 18:45"
                        value={retornoHorario}
                        onChange={(e) => setRetornoHorario(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                        required
                      />
                    </div>
                  </div>

                  {/* KM Final Section */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Quilometragem Final (Odômetro)
                      </label>
                      {finalKm && activePendingChecklist && Number(finalKm) >= Number(activePendingChecklist.initialKm) && (
                        <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                          🚗 Distância Percorrida: {Number(finalKm) - Number(activePendingChecklist.initialKm)} KM
                        </span>
                      )}
                    </div>

                    <input
                      type="number"
                      placeholder={`Ex: ${activePendingChecklist ? Number(activePendingChecklist.initialKm) + 150 : '142650'}`}
                      value={finalKm}
                      onChange={(e) => setFinalKm(e.target.value)}
                      className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-extrabold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      required
                    />

                    {/* FOTO OBRIGATÓRIA DO ODÔMETRO FINAL */}
                    {renderPhotoInput(
                      'foto-km-final',
                      'Foto do Odômetro / KM Final (Obrigatório)',
                      fotoKmFinal,
                      setFotoKmFinal,
                      true,
                      'Foto nítida do painel mostrando a quilometragem final exata'
                    )}
                  </div>

                  {/* 2. COMBUSTÍVEL FINAL + FOTO OBRIGATÓRIA DO PAINEL */}
                  <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-4">
                    {renderFuelSelector(combustivelFinal, setCombustivelFinal, 'Nível de Combustível Final')}
                    
                    {renderPhotoInput(
                      'foto-painel-combustivel-final',
                      'Foto do Painel de Combustível Final (Obrigatório)',
                      fotoPainelCombustivelFinal,
                      setFotoPainelCombustivelFinal,
                      true,
                      'Foto nítida mostrando o marcador de combustível no momento da devolução'
                    )}
                  </div>

                  {/* 3. ABASTECIMENTO (SIM / NÃO) */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                          Houve Abastecimento durante a viagem?
                        </span>
                        <span className="text-[11px] text-slate-500">Informe se você abasteceu o veículo durante o expediente</span>
                      </div>

                      <div className="flex items-center space-x-1.5 bg-white p-1 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => {
                            setHouveAbastecimento(false);
                            setAbastecimentoLitros('');
                            setAbastecimentoValor('');
                            setAbastecimentoPosto('');
                            setAbastecimentoComprovanteFoto('');
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                            !houveAbastecimento ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Não
                        </button>
                        <button
                          type="button"
                          onClick={() => setHouveAbastecimento(true)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                            houveAbastecimento ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Sim
                        </button>
                      </div>
                    </div>

                    {houveAbastecimento && (
                      <div className="pt-3 border-t border-slate-200 space-y-3 animate-fade-in">
                        <div className="max-w-xs">
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                            Quantidade Abastecida em Litros (L) *
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              min="0.1"
                              placeholder="Ex: 45.5"
                              value={abastecimentoLitros}
                              onChange={(e) => setAbastecimentoLitros(e.target.value)}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                              required={houveAbastecimento}
                            />
                            <span className="absolute right-3 top-2.5 text-xs font-black text-slate-400">
                              LITROS
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 mt-1 block">
                            Informe somente a quantidade total em litros adicionada ao tanque.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 4. INCIDENTES OU DANOS NO VEÍCULO (SIM / NÃO) */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                          Houve algum Incidente ou Dano com o veículo?
                        </span>
                        <span className="text-[11px] text-slate-500">Ex: pneu furado, avaria, colisão, pane mecânica ou elétrica</span>
                      </div>

                      <div className="flex items-center space-x-1.5 bg-white p-1 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => {
                            setHouveIncidente(false);
                            setDescricaoIncidente('');
                            setFotoIncidente('');
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                            !houveIncidente ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Não
                        </button>
                        <button
                          type="button"
                          onClick={() => setHouveIncidente(true)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                            houveIncidente ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Sim
                        </button>
                      </div>
                    </div>

                    {houveIncidente && (
                      <div className="pt-3 border-t border-rose-200 space-y-3 animate-fade-in bg-rose-50/50 p-3 rounded-xl border">
                        <div>
                          <label className="block text-[11px] font-bold text-rose-900 uppercase mb-1">
                            Descrição Detalhada do Incidente / Avaria (Obrigatório)
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Descreva detalhadamente o ocorrido (ex: pneu dianteiro furou na rodovia BR-232 e foi substituído pelo estepe; veículo precisou de reboque; pequena avaria no para-choque traseiro, etc.)"
                            value={descricaoIncidente}
                            onChange={(e) => setDescricaoIncidente(e.target.value)}
                            className="w-full p-2.5 bg-white border border-rose-300 rounded-xl text-xs text-slate-900 font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                            required={houveIncidente}
                          />
                        </div>

                        {renderPhotoInput(
                          'foto-incidente',
                          'Foto do Dano / Incidente',
                          fotoIncidente,
                          setFotoIncidente,
                          false,
                          'Anexe a foto da avaria, pneu ou local do incidente (opcional)'
                        )}
                      </div>
                    )}
                  </div>

                  {/* Submit Return Button */}
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-md transition flex items-center justify-center space-x-2"
                  >
                    <CheckSquare className="h-5 w-5" />
                    <span>Confirmar Devolução e Concluir Checklist</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: HISTÓRICO DE CHECKLISTS DO MOTORISTA */}
        {/* ======================================================== */}
        {activeTab === 'historico' && (
          <div className="space-y-4">
            
            {/* Filter by Date */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Meus Registros ({checklists.length})
              </span>
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <input
                  type="date"
                  value={driverFilterDate}
                  onChange={(e) => setDriverFilterDate(e.target.value)}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 flex-1"
                />
                {driverFilterDate && (
                  <button
                    onClick={() => setDriverFilterDate('')}
                    className="px-2.5 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {/* Checklist List */}
            {checklists.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-xs font-medium">
                Nenhum checklist registrado por você até o momento.
              </div>
            ) : (
              <div className="space-y-3">
                {checklists
                  .filter(c => !driverFilterDate || c.date === driverFilterDate)
                  .map(chk => {
                    const isExpanded = expandedChecklistId === chk.id;
                    const isCompleted = chk.status === 'concluido' || (chk.finalKm && Number(chk.finalKm) > 0);
                    const kmRodada = isCompleted && chk.finalKm ? Number(chk.finalKm) - Number(chk.initialKm) : 0;

                    return (
                      <div
                        key={chk.id}
                        className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                          !isCompleted ? 'border-amber-300 ring-1 ring-amber-400' : 'border-slate-200 shadow-sm'
                        }`}
                      >
                        <div
                          onClick={() => setExpandedChecklistId(isExpanded ? null : chk.id)}
                          className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition"
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`p-2.5 rounded-xl ${
                              isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              <Truck className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-extrabold text-slate-900 text-sm">{chk.vehicleModelPlate}</h4>
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                  isCompleted ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-900 border border-amber-300'
                                }`}>
                                  {isCompleted ? '✓ Concluído (Saída + Devolução)' : '⏳ Em Trânsito (Aguardando Devolução)'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Saída: {chk.date.split('-').reverse().join('/')} às {chk.saidaHorario} | Destino: {chk.saidaDestino} ({chk.saidaCidade})
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {!isCompleted && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPendingChecklistId(chk.id);
                                  setActiveTab('devolucao');
                                }}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm"
                              >
                                Devolver Veículo
                              </button>
                            )}
                            <button className="p-1 text-slate-400">
                              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                            </button>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-4 text-xs animate-fade-in">
                            
                            {/* PARTE 1: RESUMO DA SAÍDA */}
                            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                              <h5 className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-emerald-800 flex items-center gap-1.5">
                                <Truck className="h-3.5 w-3.5" />
                                Parte 1: Vistoria e Dados da Saída (Pegou o Carro)
                              </h5>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600">
                                <div>KM Inicial: <strong className="text-slate-900">{chk.initialKm} KM</strong></div>
                                <div>Nível Combustível: <strong className="text-slate-900">{getFuelLabel(chk.combustivelInicial)}</strong></div>
                                <div>Horário Saída: <strong className="text-slate-900">{chk.saidaHorario}</strong></div>
                                <div>Destino: <strong className="text-slate-900">{chk.saidaDestino} ({chk.saidaCidade})</strong></div>
                              </div>

                              {/* Foto Painel Combustível Inicial */}
                              {chk.fotoPainelCombustivelInicial && (
                                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center space-x-3">
                                  <span className="text-[11px] font-bold text-slate-700">Foto Painel Combustível Inicial:</span>
                                  <button
                                    onClick={() => setSelectedPhotoZoom({ title: 'Painel Combustível Inicial', url: chk.fotoPainelCombustivelInicial! })}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold rounded-lg flex items-center space-x-1"
                                  >
                                    <Maximize2 className="h-3 w-3" />
                                    <span>Ver Foto</span>
                                  </button>
                                </div>
                              )}

                              {/* Fotos 4 Lados da Saída */}
                              <div className="mt-2 pt-2 border-t border-slate-100">
                                <span className="text-[11px] font-bold text-slate-700 block mb-1.5">Fotos da Saída (4 lados):</span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  {chk.fotoFrente && (
                                    <button
                                      onClick={() => setSelectedPhotoZoom({ title: 'Frente do Veículo', url: chk.fotoFrente! })}
                                      className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:border-emerald-500 text-center"
                                    >
                                      <span className="text-[10px] font-bold block mb-1">Frente</span>
                                      <img src={chk.fotoFrente} alt="Frente" className="h-14 w-full object-cover rounded" />
                                    </button>
                                  )}
                                  {chk.fotoFundo && (
                                    <button
                                      onClick={() => setSelectedPhotoZoom({ title: 'Traseira / Fundo', url: chk.fotoFundo! })}
                                      className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:border-emerald-500 text-center"
                                    >
                                      <span className="text-[10px] font-bold block mb-1">Traseira</span>
                                      <img src={chk.fotoFundo} alt="Traseira" className="h-14 w-full object-cover rounded" />
                                    </button>
                                  )}
                                  {chk.fotoLateralEsquerda && (
                                    <button
                                      onClick={() => setSelectedPhotoZoom({ title: 'Lateral Esquerda', url: chk.fotoLateralEsquerda! })}
                                      className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:border-emerald-500 text-center"
                                    >
                                      <span className="text-[10px] font-bold block mb-1">Lat. Esquerda</span>
                                      <img src={chk.fotoLateralEsquerda} alt="Lateral Esquerda" className="h-14 w-full object-cover rounded" />
                                    </button>
                                  )}
                                  {chk.fotoLateralDireita && (
                                    <button
                                      onClick={() => setSelectedPhotoZoom({ title: 'Lateral Direita', url: chk.fotoLateralDireita! })}
                                      className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:border-emerald-500 text-center"
                                    >
                                      <span className="text-[10px] font-bold block mb-1">Lat. Direita</span>
                                      <img src={chk.fotoLateralDireita} alt="Lateral Direita" className="h-14 w-full object-cover rounded" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* PARTE 2: RESUMO DA DEVOLUÇÃO (SE CONCLUÍDO) */}
                            {isCompleted ? (
                              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                                <h5 className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] text-blue-800 flex items-center gap-1.5">
                                  <CheckSquare className="h-3.5 w-3.5" />
                                  Parte 2: Vistoria e Dados da Devolução (Fim de Viagem)
                                </h5>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600">
                                  <div>KM Final: <strong className="text-slate-900">{chk.finalKm} KM</strong></div>
                                  <div>Distância Rodada: <strong className="text-emerald-700">{kmRodada} KM</strong></div>
                                  <div>Combustível Final: <strong className="text-slate-900">{getFuelLabel(chk.combustivelFinal)}</strong></div>
                                  <div>Horário Devolução: <strong className="text-slate-900">{chk.retornoHorario || 'Concluído'}</strong></div>
                                </div>

                                {/* Fotos Odômetro e Painel Final */}
                                <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                                  {chk.fotoKmFinal && (
                                    <button
                                      onClick={() => setSelectedPhotoZoom({ title: 'Odômetro Final (KM)', url: chk.fotoKmFinal! })}
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold rounded-lg flex items-center space-x-1"
                                    >
                                      <Maximize2 className="h-3 w-3" />
                                      <span>Foto Odômetro Final</span>
                                    </button>
                                  )}
                                  {chk.fotoPainelCombustivelFinal && (
                                    <button
                                      onClick={() => setSelectedPhotoZoom({ title: 'Painel Combustível Final', url: chk.fotoPainelCombustivelFinal! })}
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold rounded-lg flex items-center space-x-1"
                                    >
                                      <Maximize2 className="h-3 w-3" />
                                      <span>Foto Painel Combustível Final</span>
                                    </button>
                                  )}
                                </div>

                                {/* Detalhes de Abastecimento */}
                                {chk.houveAbastecimento && (
                                  <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 flex items-center justify-between gap-1 text-xs">
                                    <span>⛽ Abastecimento: <strong>{chk.abastecimentoLitros} Litros (L)</strong></span>
                                  </div>
                                )}

                                {/* Detalhes de Incidente */}
                                {chk.houveIncidente && (
                                  <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 space-y-1">
                                    <div className="font-extrabold flex items-center gap-1 text-rose-900">
                                      <AlertTriangle className="h-3.5 w-3.5" />
                                      Registro de Incidente / Avaria:
                                    </div>
                                    <p className="text-slate-700">{chk.descricaoIncidente}</p>
                                    {chk.fotoIncidente && (
                                      <button
                                        onClick={() => setSelectedPhotoZoom({ title: 'Foto do Incidente', url: chk.fotoIncidente! })}
                                        className="text-rose-800 font-bold underline mt-1 inline-block"
                                      >
                                        Ver Foto do Incidente
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-amber-900 flex justify-between items-center">
                                <div>
                                  <div className="font-extrabold">Devolução Pendente</div>
                                  <div className="text-[11px] text-amber-800">Finalize o checklist quando devolver o veículo à base.</div>
                                </div>
                                <button
                                  onClick={() => {
                                    setSelectedPendingChecklistId(chk.id);
                                    setActiveTab('devolucao');
                                  }}
                                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-sm"
                                >
                                  Preencher Devolução
                                </button>
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
        )}

      </main>

      {/* SUCCESS MODAL POPUP */}
      {showSuccessModal && lastSubmittedInfo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-150 space-y-4 text-center">
            <div className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto ${
              lastSubmittedInfo.type === 'saida' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
            }`}>
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">
                {lastSubmittedInfo.type === 'saida' ? 'Saída Registrada com Sucesso!' : 'Devolução Concluída com Sucesso!'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {lastSubmittedInfo.type === 'saida'
                  ? 'O checklist inicial foi salvo e o veículo está em trânsito.'
                  : 'O checklist final foi concluído com sucesso e a viagem foi finalizada.'}
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Veículo:</span>
                <span className="font-extrabold text-slate-900">{lastSubmittedInfo.vehicle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Data:</span>
                <span className="font-bold text-slate-800">{lastSubmittedInfo.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Quilometragem:</span>
                <span className="font-bold text-slate-800">{lastSubmittedInfo.km}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nível de Combustível:</span>
                <span className="font-bold text-slate-800">{lastSubmittedInfo.fuel}</span>
              </div>
              {lastSubmittedInfo.destination && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Destino:</span>
                  <span className="font-bold text-slate-800">{lastSubmittedInfo.destination}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow transition"
            >
              OK, Entendido
            </button>
          </div>
        </div>
      )}

      {/* ERROR ALERT / DIALOG MODAL */}
      {errorModal.isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 flex flex-col space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl">
                  <AlertTriangle className="h-6 w-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base leading-tight">{errorModal.title}</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Preenchimento obrigatório pendente</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-950 text-xs font-semibold leading-relaxed">
              {errorModal.message}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
                className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-extrabold text-xs rounded-xl shadow-md shadow-rose-200 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Entendido, vou preencher agora</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHOTO ZOOM MODAL */}
      {selectedPhotoZoom && (
        <div className="fixed inset-0 bg-slate-950/90 z-50 flex flex-col items-center justify-center p-4">
          <div className="max-w-3xl w-full flex justify-between items-center text-white mb-2">
            <span className="font-bold text-sm">{selectedPhotoZoom.title}</span>
            <button
              onClick={() => setSelectedPhotoZoom(null)}
              className="p-2 hover:bg-white/10 rounded-full text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl border border-white/20">
            <img src={selectedPhotoZoom.url} alt={selectedPhotoZoom.title} className="max-h-[80vh] w-auto object-contain mx-auto" />
          </div>
        </div>
      )}

    </div>
  );
}
