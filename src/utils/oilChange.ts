import { Vehicle, VehicleChecklist } from '../types.js';

/**
 * Calculates the total kilometers accumulated by a vehicle since its last recorded oil change.
 * Distance for each trip is calculated as max(0, finalKm - initialKm).
 */
export function getKmDrivenSinceLastOil(vehicle: Vehicle, checklists: VehicleChecklist[]): number {
  if (!vehicle) return 0;

  const vehChecklists = checklists.filter(c => 
    (c.vehicleId && c.vehicleId === vehicle.id) || 
    (!c.vehicleId && c.vehicleModelPlate && vehicle.plate && c.vehicleModelPlate.toUpperCase().includes(vehicle.plate.toUpperCase()))
  );

  if (vehicle.dataUltimaTrocaOleo) {
    const lastChangeTime = new Date(vehicle.dataUltimaTrocaOleo).getTime();
    
    // Filter checklists created on or after the oil change date (with 5s buffer)
    const checklistsAfterOil = vehChecklists.filter(c => {
      const cTime = new Date(c.createdAt || c.date).getTime();
      return !isNaN(cTime) && cTime >= (lastChangeTime - 5000);
    });

    return checklistsAfterOil.reduce((sum, c) => {
      const initKm = Number(c.initialKm) || 0;
      const finKm = Number(c.finalKm) || 0;
      const dist = finKm >= initKm ? finKm - initKm : 0;
      return sum + dist;
    }, 0);
  }

  // Fallback if dataUltimaTrocaOleo is not set but ultimoKmTrocaOleo is set
  const lastOilKm = Number(vehicle.ultimoKmTrocaOleo) || 0;
  if (lastOilKm > 0) {
    return vehChecklists.reduce((sum, c) => {
      const initKm = Number(c.initialKm) || 0;
      const finKm = Number(c.finalKm) || 0;
      if (finKm > lastOilKm) {
        const effectiveInit = Math.max(initKm, lastOilKm);
        const dist = finKm > effectiveInit ? finKm - effectiveInit : 0;
        return sum + dist;
      }
      return sum;
    }, 0);
  }

  // Default: sum distance of all checklists
  return vehChecklists.reduce((sum, c) => {
    const initKm = Number(c.initialKm) || 0;
    const finKm = Number(c.finalKm) || 0;
    const dist = finKm >= initKm ? finKm - initKm : 0;
    return sum + dist;
  }, 0);
}

export function getOilMaintenanceStatus(
  vehicle: Vehicle,
  checklists: VehicleChecklist[],
  currentTripKm: number = 0
) {
  const limitKm = Number(vehicle?.limiteKmTrocaOleo) || 1000;
  const initialOilKm = Number(vehicle?.ultimoKmTrocaOleo) || 0;
  const kmDriven = getKmDrivenSinceLastOil(vehicle, checklists);
  const totalKmWithTrip = kmDriven + Math.max(0, Number(currentTripKm) || 0);
  const isOverdue = limitKm > 0 && totalKmWithTrip >= limitKm;
  const percentage = limitKm > 0 ? Math.min(100, Math.round((totalKmWithTrip / limitKm) * 100)) : 0;
  const nextChangeExpectedKm = initialOilKm + limitKm;

  return {
    initialOilKm,
    nextChangeExpectedKm,
    kmDriven,
    limitKm,
    totalKmWithTrip,
    isOverdue,
    percentage,
    lastChangeDate: vehicle?.dataUltimaTrocaOleo
      ? new Date(vehicle.dataUltimaTrocaOleo).toLocaleDateString('pt-BR')
      : null,
    registeredBy: vehicle?.registradoPorTrocaOleo || null
  };
}
