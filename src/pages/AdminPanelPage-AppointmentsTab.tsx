// Appointments Tab Component - Separate file for better organization
import { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  Edit2, 
  Trash2, 
  Save, 
  Send,
  Search,
  ChevronDown,
  ChevronUp,
  Check,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  FileText as FileTextIcon
} from 'lucide-react';
import { cn } from '../utils/helpers';
import type { Appointment } from '../types';

interface AppointmentsTabProps {
  appointments: Appointment[];
  onUpdate: (id: string, updates: Partial<Appointment>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  showSuccess: (msg: string) => void;
}

export default function AppointmentsTab({
  appointments,
  onUpdate,
  onDelete,
  showSuccess,
}: AppointmentsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Appointment>>({});

  // Filter appointments
  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = 
      (apt.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (apt.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.phone.includes(searchTerm) ||
      apt.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.reason.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'confirmed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'completed': return <Check className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const startEditing = (apt: Appointment) => {
    setEditingId(apt.id);
    setEditForm({
      status: apt.status,
      adminNotes: apt.adminNotes || '',
      assignedDoctor: apt.assignedDoctor || '',
      doctorPhone: apt.doctorPhone || '',
      appointmentTime: apt.appointmentTime || '',
      feedbackToUser: apt.feedbackToUser || '',
    });
  };

  const handleSave = async (id: string) => {
    await onUpdate(id, {
      ...editForm,
      updatedAt: new Date().toISOString(),
    });
    setEditingId(null);
    showSuccess('Appointment updated successfully');
  };

  const handleSendFeedback = async (apt: Appointment) => {
    if (!editForm.feedbackToUser?.trim()) return;
    
    await onUpdate(apt.id, {
      feedbackToUser: editForm.feedbackToUser,
      feedbackSentAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    showSuccess('Feedback sent to user');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-cool-900">Appointment Management</h2>
          <p className="text-sm text-cool-500 mt-1">
            Manage patient appointments and coordinate with doctors
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-cool-600">Total: <strong>{appointments.length}</strong></span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { status: 'all', label: 'All', count: appointments.length, color: 'bg-cool-100 text-cool-700' },
          { status: 'pending', label: 'Pending', count: appointments.filter(a => a.status === 'pending').length, color: 'bg-yellow-100 text-yellow-700' },
          { status: 'confirmed', label: 'Confirmed', count: appointments.filter(a => a.status === 'confirmed').length, color: 'bg-blue-100 text-blue-700' },
          { status: 'completed', label: 'Completed', count: appointments.filter(a => a.status === 'completed').length, color: 'bg-green-100 text-green-700' },
          { status: 'cancelled', label: 'Cancelled', count: appointments.filter(a => a.status === 'cancelled').length, color: 'bg-red-100 text-red-700' },
        ].map(stat => (
          <button
            key={stat.status}
            onClick={() => setStatusFilter(stat.status as any)}
            className={cn(
              'p-4 rounded-xl border-2 transition-all text-left',
              statusFilter === stat.status ? 'border-srhr shadow-md' : 'border-transparent hover:border-cool-200',
              stat.color
            )}
          >
            <p className="text-2xl font-bold">{stat.count}</p>
            <p className="text-sm font-medium">{stat.label}</p>
          </button>
        ))}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cool-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone, or reference number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-cool-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-srhr"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-4 py-3 bg-white border border-cool-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-srhr"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {filteredAppointments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-cool-200">
            <Calendar className="w-12 h-12 text-cool-300 mx-auto mb-4" />
            <p className="text-cool-500">No appointments found</p>
          </div>
        ) : (
          filteredAppointments.map((apt) => (
            <div 
              key={apt.id} 
              className="bg-white rounded-xl border border-cool-200 overflow-hidden"
            >
              {/* Header Row */}
              <div 
                className="p-4 cursor-pointer hover:bg-cool-50 transition-colors"
                onClick={() => setExpandedId(expandedId === apt.id ? null : apt.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={cn('p-2 rounded-lg border', getStatusColor(apt.status))}>
                      {getStatusIcon(apt.status)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-cool-900">
                          {apt.isAnonymous ? 'Anonymous' : (apt.name || 'No name')}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-cool-100 text-cool-600">
                          {apt.referenceNumber}
                        </span>
                        {apt.feedbackToUser && (
                          <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-600">
                            Feedback Sent
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-cool-600 line-clamp-1">{apt.reason}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-cool-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(apt.preferredDate).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {apt.preferredTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {apt.phone}
                        </span>
                        {apt.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {apt.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(apt);
                        setExpandedId(apt.id);
                      }}
                      className="p-2 text-cool-400 hover:text-srhr hover:bg-srhr/10 rounded-lg transition-colors"
                      title="Edit appointment"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this appointment?')) {
                          onDelete(apt.id);
                          showSuccess('Appointment deleted');
                        }
                      }}
                      className="p-2 text-cool-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete appointment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {expandedId === apt.id ? (
                      <ChevronUp className="w-5 h-5 text-cool-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-cool-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === apt.id && (
                <div className="border-t border-cool-200 p-4 bg-cool-50/50">
                  {editingId === apt.id ? (
                    <div className="space-y-4">
                      {/* Edit Form */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-cool-700 mb-1">
                            Status
                          </label>
                          <select
                            value={editForm.status}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                            className="w-full px-3 py-2 border border-cool-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-srhr"
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-cool-700 mb-1">
                            Assigned Doctor
                          </label>
                          <input
                            type="text"
                            value={editForm.assignedDoctor || ''}
                            onChange={(e) => setEditForm({ ...editForm, assignedDoctor: e.target.value })}
                            placeholder="Dr. Name"
                            className="w-full px-3 py-2 border border-cool-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-srhr"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-cool-700 mb-1">
                            Doctor Phone
                          </label>
                          <input
                            type="tel"
                            value={editForm.doctorPhone || ''}
                            onChange={(e) => setEditForm({ ...editForm, doctorPhone: e.target.value })}
                            placeholder="Doctor contact number"
                            className="w-full px-3 py-2 border border-cool-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-srhr"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-cool-700 mb-1">
                            Appointment Time
                          </label>
                          <input
                            type="time"
                            value={editForm.appointmentTime || ''}
                            onChange={(e) => setEditForm({ ...editForm, appointmentTime: e.target.value })}
                            className="w-full px-3 py-2 border border-cool-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-srhr"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-cool-700 mb-1">
                          Admin Notes (Internal)
                        </label>
                        <textarea
                          value={editForm.adminNotes || ''}
                          onChange={(e) => setEditForm({ ...editForm, adminNotes: e.target.value })}
                          placeholder="Notes for admin use only..."
                          rows={3}
                          className="w-full px-3 py-2 border border-cool-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-srhr"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-cool-700 mb-1">
                          Feedback to User
                        </label>
                        <textarea
                          value={editForm.feedbackToUser || ''}
                          onChange={(e) => setEditForm({ ...editForm, feedbackToUser: e.target.value })}
                          placeholder="This will be sent to the patient..."
                          rows={3}
                          className="w-full px-3 py-2 border border-cool-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-srhr"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSave(apt.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-srhr text-white rounded-lg font-medium hover:bg-srhr-dark transition-colors"
                        >
                          <Save className="w-4 h-4" />
                          Save Changes
                        </button>
                        {editForm.feedbackToUser && editForm.feedbackToUser !== apt.feedbackToUser && (
                          <button
                            onClick={() => handleSendFeedback(apt)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                          >
                            <Send className="w-4 h-4" />
                            Send Feedback
                          </button>
                        )}
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-4 py-2 border border-cool-200 text-cool-600 rounded-lg font-medium hover:bg-cool-100 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* View Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-lg border border-cool-200">
                          <h4 className="font-medium text-cool-900 mb-3 flex items-center gap-2">
                            <User className="w-4 h-4 text-srhr" />
                            Patient Information
                          </h4>
                          <div className="space-y-2 text-sm">
                            <p><span className="text-cool-500">Name:</span> {apt.isAnonymous ? 'Anonymous' : (apt.name || 'Not provided')}</p>
                            <p><span className="text-cool-500">Phone:</span> {apt.phone}</p>
                            <p><span className="text-cool-500">Email:</span> {apt.email || 'Not provided'}</p>
                            <p><span className="text-cool-500">Reference:</span> {apt.referenceNumber}</p>
                            <p><span className="text-cool-500">Submitted:</span> {new Date(apt.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-cool-200">
                          <h4 className="font-medium text-cool-900 mb-3 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-srhr" />
                            Appointment Details
                          </h4>
                          <div className="space-y-2 text-sm">
                            <p><span className="text-cool-500">Preferred Date:</span> {new Date(apt.preferredDate).toLocaleDateString()}</p>
                            <p><span className="text-cool-500">Preferred Time:</span> <span className="capitalize">{apt.preferredTime}</span></p>
                            {apt.appointmentTime && (
                              <p><span className="text-cool-500">Confirmed Time:</span> {apt.appointmentTime}</p>
                            )}
                            {apt.assignedDoctor && (
                              <p><span className="text-cool-500">Assigned Doctor:</span> {apt.assignedDoctor}</p>
                            )}
                            {apt.doctorPhone && (
                              <p><span className="text-cool-500">Doctor Phone:</span> {apt.doctorPhone}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-cool-200">
                        <h4 className="font-medium text-cool-900 mb-2 flex items-center gap-2">
                          <FileTextIcon className="w-4 h-4 text-srhr" />
                          Reason for Visit
                        </h4>
                        <p className="text-sm text-cool-700 whitespace-pre-wrap">{apt.reason}</p>
                      </div>
                      {apt.adminNotes && (
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                          <h4 className="font-medium text-yellow-900 mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Admin Notes
                          </h4>
                          <p className="text-sm text-yellow-800 whitespace-pre-wrap">{apt.adminNotes}</p>
                        </div>
                      )}
                      {apt.feedbackToUser && (
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                            <Send className="w-4 h-4" />
                            Feedback to User
                          </h4>
                          <p className="text-sm text-green-800 whitespace-pre-wrap">{apt.feedbackToUser}</p>
                          {apt.feedbackSentAt && (
                            <p className="text-xs text-green-600 mt-2">
                              Sent on: {new Date(apt.feedbackSentAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditing(apt)}
                          className="flex items-center gap-2 px-4 py-2 bg-srhr text-white rounded-lg font-medium hover:bg-srhr-dark transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                          Manage Appointment
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
