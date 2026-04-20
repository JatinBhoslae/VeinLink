import { useEffect, useState } from 'react';
import { useSearch } from '../context/SearchContext';
import api from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Plus, ArrowRightLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export const InterHospitalRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [hospitals, setHospitals] = useState([]);
  const [formData, setFormData] = useState({
    toHospital: '',
    bloodGroup: '',
    quantity: 1,
    urgency: 'medium',
    note: '',
  });
  const { searchQuery } = useSearch();

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const urgencies = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
  ];

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/inter-hospital-requests', { params });
      setRequests(res.data.data);
    } catch (error) {
      toast.error('Failed to fetch inter-hospital requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchHospitals = async () => {
    try {
      const res = await api.get('/hospitals/approved-list');
      setHospitals(res.data.data || []);
    } catch (error) {
      // Silent fail, we will show error when creating
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inter-hospital-requests', formData);
      toast.success('Inter-hospital request created');
      setShowModal(false);
      setFormData({ toHospital: '', bloodGroup: '', quantity: 1, urgency: 'medium', note: '' });
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create request');
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.put(`/inter-hospital-requests/${id}/approve`);
      toast.success('Request approved');
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Reason for rejection (optional):');
    try {
      await api.put(`/inter-hospital-requests/${id}/reject`, { reason });
      toast.success('Request rejected');
      fetchRequests();
    } catch (error) {
      toast.error('Failed to reject request');
    }
  };

  const handleComplete = async (id) => {
    try {
      await api.put(`/inter-hospital-requests/${id}/complete`);
      toast.success('Request marked as completed');
      fetchRequests();
    } catch (error) {
      toast.error('Failed to complete request');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <ArrowRightLeft size={24} /> Inter-Hospital Requests
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-300">
            Manage blood requests between hospitals
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={20} />
          New Request
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 flex gap-4 items-end flex-wrap">
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'completed', label: 'Completed' },
            ]}
          />
        </CardContent>
      </Card>

      <div className="space-y-4">
        {requests.filter(req => {
          const query = searchQuery.toLowerCase();
          const fromName = req.fromHospital?.name?.toLowerCase() || '';
          const toName = req.toHospital?.name?.toLowerCase() || '';
          const note = req.note?.toLowerCase() || '';
          return (
            fromName.includes(query) ||
            toName.includes(query) ||
            note.includes(query) ||
            req.bloodGroup.toLowerCase().includes(query)
          );
        }).map((req) => {
          const isOutgoing = req.fromHospital?._id === req.toHospital?._id ? false : true; // simple direction label
          const directionLabel = req.fromHospital && req.toHospital
            ? req.fromHospital._id === req.toHospital._id
              ? 'Internal'
              : `From ${req.fromHospital.name} → ${req.toHospital.name}`
            : '';

          return (
            <Card key={req._id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{directionLabel}</p>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-800">
                        {req.bloodGroup}
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-200">
                        Quantity: {req.quantity} units
                      </span>
                    </div>
                    {req.note && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">{req.note}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Created: {format(new Date(req.createdAt), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        req.status === 'pending'
                          ? 'bg-orange-100 text-orange-800'
                          : req.status === 'approved'
                          ? 'bg-secondary-100 text-secondary-800'
                          : req.status === 'rejected'
                          ? 'bg-danger-100 text-danger-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {req.status}
                    </span>
                    {req.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => handleApprove(req._id)}>
                          Approve
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleReject(req._id)}>
                          Reject
                        </Button>
                      </div>
                    )}
                    {req.status === 'approved' && (
                      <Button size="sm" onClick={() => handleComplete(req._id)}>
                        Mark Completed
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {requests.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">No inter-hospital requests found</p>
            </CardContent>
          </Card>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create Inter-Hospital Request</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <Select
                  label="Target Hospital"
                  value={formData.toHospital}
                  onChange={(e) => setFormData({ ...formData, toHospital: e.target.value })}
                  options={[
                    { value: '', label: 'Select hospital' },
                    ...hospitals.map((h) => ({ value: h._id, label: h.name })),
                  ]}
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Blood Group"
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    options={[
                      { value: '', label: 'Select group' },
                      ...bloodGroups.map((bg) => ({ value: bg, label: bg })),
                    ]}
                    required
                  />
                  <Input
                    label="Quantity"
                    type="number"
                    min={1}
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <Select
                  label="Urgency"
                  value={formData.urgency}
                  onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                  options={urgencies}
                  required
                />
                <Input
                  label="Note (optional)"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Request</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
