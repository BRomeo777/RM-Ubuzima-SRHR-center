// =============================================================================
// RM UBUZIMA - ADMIN FACILITIES MANAGEMENT PAGE
// Admin can add, edit, delete facilities - integrates with Find Facility
// =============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { facilityService } from '../services/facilityService';
import type { Facility, FacilityContact } from '../types';
import {
  Plus, Search, Edit2, Trash2, MapPin, Building2, Store,
  Stethoscope, Upload, Download, Filter, X, ChevronLeft,
  AlertCircle, CheckCircle2, Phone, Clock, Globe, Loader2,
  FileSpreadsheet, MapPinned, Cross, HeartPulse, ShieldPlus,
  MoreVertical, RefreshCw, Save, Info, ExternalLink
} from 'lucide-react';
import { cn } from '../utils/helpers';

// Facility type options
const facilityTypeOptions = [
  { value: 'hospital', label: 'Hospital', icon: Building2, color: '#EF4444' },
  { value: 'health_center', label: 'Health Center', icon: Stethoscope, color: '#8B5CF6' },
  { value: 'health_post', label: 'Health Post', icon: MapPin, color: '#F59E0B' },
  { value: 'pharmacy', label: 'Pharmacy', icon: Store, color: '#10B981' },
  { value: 'private_clinic', label: 'Private Clinic', icon: HeartPulse, color: '#EC4899' },
  { value: 'laboratory', label: 'Laboratory', icon: Cross, color: '#06B6D4' },
  { value: 'maternity', label: 'Maternity Center', icon: HeartPulse, color: '#F97316' },
];

// Common services
const commonServices = [
  'Emergency', 'Maternity', 'Family Planning', 'HIV Care', 'Surgery',
  'Pediatrics', 'Laboratory', 'Vaccination', 'Dental', 'Mental Health',
  'ANC', 'Delivery', 'Nutrition', 'Rehabilitation', 'Cancer Care',
  'TB Treatment', 'General Medicine', 'Cardiology', 'Orthopedics', 'Radiology'
];

interface FacilityFormData {
  name: string;
  type: Facility['type'];
  latitude: string;
  longitude: string;
  address: string;
  phone: string;
  hours: string;
  services: string[];
  googleMapsLink: string;
  contacts: FacilityContact[];
}

export default function AdminFacilitiesPage() {
  const navigate = useNavigate();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState<FacilityFormData>({
    name: '',
    type: 'health_center',
    latitude: '',
    longitude: '',
    address: '',
    phone: '',
    hours: '7AM - 7PM',
    services: [],
    googleMapsLink: '',
    contacts: [],
  });

  // Name autocomplete suggestions
  const [nameSuggestions, setNameSuggestions] = useState<Facility[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load facilities on mount
  useEffect(() => {
    loadFacilities();
    
    // Subscribe to real-time updates
    const unsubscribe = facilityService.onFacilitiesChanged((updatedFacilities) => {
      setFacilities(updatedFacilities);
    });

    return () => unsubscribe();
  }, []);

  const loadFacilities = async () => {
    setLoading(true);
    try {
      const data = await facilityService.getAllFacilities();
      setFacilities(data);
    } catch (error) {
      showNotification('error', 'Failed to load facilities');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Filter facilities
  const filteredFacilities = facilities.filter(f => {
    const matchesSearch = 
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || f.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Open modal for adding new facility
  const openAddModal = () => {
    setEditingFacility(null);
    setFormData({
      name: '',
      type: 'health_center',
      latitude: '',
      longitude: '',
      address: '',
      phone: '',
      hours: '7AM - 7PM',
      services: [],
      googleMapsLink: '',
      contacts: [],
    });
    setShowModal(true);
  };

  // Open modal for editing
  const openEditModal = (facility: Facility) => {
    setEditingFacility(facility);
    setFormData({
      name: facility.name,
      type: facility.type,
      latitude: facility.latitude.toString(),
      longitude: facility.longitude.toString(),
      address: facility.address,
      phone: facility.phone || '',
      hours: facility.hours || '7AM - 7PM',
      services: facility.services || [],
      googleMapsLink: facility.googleMapsLink || '',
      contacts: facility.contacts || [],
    });
    setShowModal(true);
  };

  // Save facility
  const handleSave = async () => {
    try {
      const facilityData = {
        name: formData.name,
        type: formData.type,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        address: formData.address,
        phone: formData.phone,
        hours: formData.hours,
        services: formData.services,
        googleMapsLink: formData.googleMapsLink,
        contacts: formData.contacts,
      };

      if (editingFacility) {
        await facilityService.updateFacility(editingFacility.id, facilityData);
        showNotification('success', 'Facility updated successfully');
      } else {
        await facilityService.addFacility(facilityData, 'admin');
        showNotification('success', 'Facility added successfully');
      }

      setShowModal(false);
      loadFacilities();
    } catch (error) {
      showNotification('error', 'Failed to save facility');
    }
  };

  // Delete facility
  const handleDelete = async (facility: Facility) => {
    if (!confirm(`Are you sure you want to delete "${facility.name}"?`)) return;

    try {
      await facilityService.deleteFacility(facility.id);
      showNotification('success', 'Facility deleted successfully');
      loadFacilities();
    } catch (error) {
      showNotification('error', 'Failed to delete facility');
    }
  };

  // Import from CSV/JSON
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      let importedFacilities: any[] = [];

      if (file.name.endsWith('.json')) {
        importedFacilities = JSON.parse(text);
      } else if (file.name.endsWith('.csv')) {
        // Simple CSV parsing
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const values = lines[i].split(',');
          const facility: any = {};
          headers.forEach((header, index) => {
            facility[header] = values[index]?.trim() || '';
          });
          importedFacilities.push(facility);
        }
      }

      // Transform and validate
      const validFacilities = importedFacilities.map(f => ({
        name: f.name || 'Unnamed Facility',
        type: (f.type || 'health_center') as Facility['type'],
        latitude: parseFloat(f.latitude) || -1.9706,
        longitude: parseFloat(f.longitude) || 30.1044,
        address: f.address || 'Unknown Address',
        phone: f.phone || '',
        hours: f.hours || '7AM - 7PM',
        services: f.services ? f.services.split(';') : [],
        googleMapsLink: f.googleMapsLink || '',
      }));

      await facilityService.batchImport(validFacilities, 'admin');
      showNotification('success', `Imported ${validFacilities.length} facilities`);
      loadFacilities();
    } catch (error) {
      showNotification('error', 'Failed to import facilities');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Export facilities
  const handleExport = async () => {
    try {
      const data = await facilityService.exportFacilities();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facilities-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification('success', 'Facilities exported successfully');
    } catch (error) {
      showNotification('error', 'Failed to export facilities');
    }
  };

  // Toggle service selection
  const toggleService = (service: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service]
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin')}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <MapPinned className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Manage Health Facilities</h1>
              <p className="text-sm text-slate-500">{facilities.length} facilities in database</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImport}
              accept=".json,.csv"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Import</span>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Facility</span>
            </button>
          </div>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div className={cn(
          'fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2',
          notification.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
        )}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {notification.message}
        </div>
      )}

      {/* Filters */}
      <div className="px-4 py-4 bg-white border-b border-slate-200">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search facilities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            {facilityTypeOptions.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <button
            onClick={loadFacilities}
            className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Facilities List */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : filteredFacilities.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No facilities found</p>
            <p className="text-sm text-slate-400 mt-1">Add your first facility to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFacilities.map(facility => {
              const typeInfo = facilityTypeOptions.find(t => t.value === facility.type);
              const Icon = typeInfo?.icon || Building2;
              
              return (
                <div
                  key={facility.id}
                  className="bg-white rounded-xl p-4 border border-slate-200 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: (typeInfo?.color || '#3B82F6') + '15' }}
                    >
                      <Icon className="w-6 h-6" style={{ color: typeInfo?.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 text-sm truncate">{facility.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{typeInfo?.label}</p>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{facility.address}</p>
                      
                      {facility.services && facility.services.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {facility.services.slice(0, 3).map((service, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600">
                              {service}
                            </span>
                          ))}
                          {facility.services.length > 3 && (
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600">
                              +{facility.services.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => openEditModal(facility)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(facility)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {editingFacility ? 'Edit Facility' : 'Add New Facility'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Scroll hint */}
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-3 py-2 rounded-lg">
                <Info className="w-4 h-4" />
                <span>Scroll down to see all fields including Verified Contacts section</span>
              </div>

              {/* Name with Autocomplete */}
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-2">Facility Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({ ...formData, name: value });

                    // Filter suggestions as user types - sensitive to any input
                    if (value.trim().length > 0) {
                      const searchLower = value.toLowerCase();
                      const filtered = facilities.filter(f =>
                        f.name.toLowerCase().includes(searchLower) ||
                        f.address?.toLowerCase().includes(searchLower) ||
                        f.googleMapsLink?.toLowerCase().includes(searchLower)
                      ).slice(0, 10); // Limit to 10 suggestions
                      setNameSuggestions(filtered);
                      setShowSuggestions(filtered.length > 0);
                    } else {
                      setNameSuggestions([]);
                      setShowSuggestions(false);
                    }
                  }}
                  onFocus={() => {
                    if (formData.name.trim().length > 0 && nameSuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding to allow click on suggestion
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  placeholder="Start typing to search existing facilities..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {/* Suggestions Dropdown */}
                {showSuggestions && nameSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <div className="px-3 py-2 text-xs text-slate-500 bg-slate-50 border-b border-slate-100">
                      Click to auto-fill facility details
                    </div>
                    {nameSuggestions.map((facility) => (
                      <button
                        key={facility.id}
                        type="button"
                        onClick={() => {
                          // Auto-fill form with facility data
                          setFormData({
                            name: facility.name,
                            type: facility.type,
                            latitude: facility.latitude?.toString() || '',
                            longitude: facility.longitude?.toString() || '',
                            address: facility.address || '',
                            phone: facility.phone || '',
                            hours: facility.hours || '7AM - 7PM',
                            services: facility.services || [],
                            googleMapsLink: facility.googleMapsLink || '',
                            contacts: facility.contacts || [],
                          });
                          setShowSuggestions(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-b-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{facility.type === 'hospital' ? '🏥' : facility.type === 'pharmacy' ? '💊' : facility.type === 'health_center' ? '🏨' : '🏥'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900">{facility.name}</p>
                            <p className="text-xs text-slate-500 truncate">{facility.address}</p>
                            {facility.googleMapsLink && (
                              <p className="text-xs text-blue-600 truncate">
                                <Globe className="w-3 h-3 inline mr-1" />
                                {facility.googleMapsLink.substring(0, 40)}...
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                              {facility.type.replace('_', ' ')}
                            </span>
                            {facility.contacts && facility.contacts.length > 0 && (
                              <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {facility.contacts.length} contacts
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* No results message */}
                {showSuggestions && formData.name.trim().length > 0 && nameSuggestions.length === 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg">
                    <div className="px-4 py-3 text-sm text-slate-500">
                      No matching facilities found. You can add a new one.
                    </div>
                  </div>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Facility Type *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {facilityTypeOptions.map(type => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        onClick={() => setFormData({ ...formData, type: type.value as Facility['type'] })}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          formData.type === type.value
                            ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                            : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:bg-slate-100'
                        )}
                      >
                        <Icon className="w-4 h-4" style={{ color: formData.type === type.value ? undefined : type.color }} />
                        <span className="hidden sm:inline">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Latitude *</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="-1.9706"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Longitude *</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="30.1044"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Address *</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g., KN 4 Ave, Kigali"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Main Phone (Legacy)
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+250 788 123 456"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Hours
                  </label>
                  <input
                    type="text"
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                    placeholder="7AM - 7PM"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Verified Contacts Management */}
              <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                    <ShieldPlus className="w-5 h-5 text-blue-600" />
                    Verified Contacts ({formData.contacts?.length || 0} added)
                  </label>
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                    Admin Verified
                  </span>
                </div>
                <p className="text-xs text-blue-600 mb-4">
                  Add and verify all contact methods for this facility. These will be displayed to users.
                </p>

                {/* Existing Contacts List */}
                {formData.contacts && formData.contacts.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {formData.contacts.map((contact, index) => (
                      <div key={contact.id} className="flex items-center gap-2 bg-white p-3 rounded-lg border border-blue-100">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-700 min-w-[80px]">{contact.label}</span>
                            <span className={cn(
                              'px-2 py-0.5 rounded text-xs',
                              contact.type === 'phone' && 'bg-emerald-100 text-emerald-700',
                              contact.type === 'whatsapp' && 'bg-green-100 text-green-700',
                              contact.type === 'email' && 'bg-blue-100 text-blue-700'
                            )}>
                              {contact.type}
                            </span>
                            {contact.isVerified && (
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            )}
                          </div>
                          <div className="text-sm text-slate-900 font-medium">{contact.value}</div>
                          {contact.notes && (
                            <div className="text-xs text-slate-500">{contact.notes}</div>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            const newContacts = formData.contacts?.filter((_, i) => i !== index) || [];
                            setFormData({ ...formData, contacts: newContacts });
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Contact Form */}
                <div className="bg-white p-3 rounded-lg border border-blue-200">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <input
                      type="text"
                      id="contactLabel"
                      placeholder="Label (e.g., Emergency, Reception, Doctor)"
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      id="contactType"
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="phone">Phone</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="email">Email</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    id="contactValue"
                    placeholder="Contact number or email"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                  />
                  <input
                    type="text"
                    id="contactNotes"
                    placeholder="Notes (optional - e.g., 'Available 24/7', 'Dr. Jean')"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                  />
                  <button
                    onClick={() => {
                      const labelInput = document.getElementById('contactLabel') as HTMLInputElement;
                      const typeInput = document.getElementById('contactType') as HTMLSelectElement;
                      const valueInput = document.getElementById('contactValue') as HTMLInputElement;
                      const notesInput = document.getElementById('contactNotes') as HTMLInputElement;

                      if (labelInput.value && valueInput.value) {
                        const newContact: FacilityContact = {
                          id: Date.now().toString(),
                          label: labelInput.value,
                          type: typeInput.value as 'phone' | 'whatsapp' | 'email',
                          value: valueInput.value,
                          isVerified: true,
                          verifiedAt: new Date().toISOString(),
                          verifiedBy: 'admin',
                          notes: notesInput.value || undefined,
                        };
                        setFormData({
                          ...formData,
                          contacts: [...(formData.contacts || []), newContact]
                        });
                        labelInput.value = '';
                        valueInput.value = '';
                        notesInput.value = '';
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Verified Contact
                  </button>
                </div>
              </div>

              {/* Services */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Services Offered</label>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-lg">
                  {commonServices.map(service => (
                    <button
                      key={service}
                      onClick={() => toggleService(service)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                        formData.services.includes(service)
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      )}
                    >
                      {formData.services.includes(service) && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                      {service}
                    </button>
                  ))}
                </div>
              </div>

              {/* Google Maps Link - REQUIRED */}
              <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                <label className="block text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Google Maps Link *
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Required</span>
                </label>
                <p className="text-xs text-blue-600 mb-3">
                  This link is used to identify the facility. All contacts are linked to this Google Maps location.
                </p>
                <input
                  type="url"
                  value={formData.googleMapsLink}
                  onChange={(e) => setFormData({ ...formData, googleMapsLink: e.target.value })}
                  placeholder="https://maps.google.com/..."
                  className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {formData.googleMapsLink && (
                  <a
                    href={formData.googleMapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Preview on Google Maps
                  </a>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name || !formData.latitude || !formData.longitude || !formData.address || !formData.googleMapsLink}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {editingFacility ? 'Update Facility' : 'Add Facility'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
