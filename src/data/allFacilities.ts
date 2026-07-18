import type { Facility } from '../types';
import { rwandaFacilities as baseFacilities } from './rwandaFacilities';

// Export the base facilities (static data)
export const rwandaFacilities = baseFacilities;

// Admin-loaded facilities (populated dynamically from Firebase)
export let adminFacilities: Facility[] = [];

// Setter for admin facilities - called when admin uploads new facilities
export function setAdminFacilities(facilities: Facility[]) {
  adminFacilities = facilities;
}

// Add single admin facility
export function addAdminFacility(facility: Facility) {
  adminFacilities.push(facility);
}

// Remove admin facility
export function removeAdminFacility(facilityId: string) {
  adminFacilities = adminFacilities.filter(f => f.id !== facilityId);
}

// Combined facilities - base + admin uploaded
export function getAllFacilities(): Facility[] {
  return [...baseFacilities, ...adminFacilities];
}

// Legacy export for compatibility
export const allFacilities: Facility[] = baseFacilities;

export default getAllFacilities;
