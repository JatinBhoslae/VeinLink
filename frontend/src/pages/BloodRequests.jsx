import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useSearch } from '../context/SearchContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Plus, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export const BloodRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const { searchQuery } = useSearch();

  const [formData, setFormData] = useState({
    patientName: '',
    bloodGroup: '',
    quantity: 1,
    urgency: 'medium',
    reason: '',
    requiredBy: '',
  });

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const response = await api.get('/blood-requests', { params });
      setRequests(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch blood requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/blood-requests', formData);
      toast.success('Blood request created successfully');
      setShowModal(false);
      setFormData({
        patientName: '',
        bloodGroup: '',
        quantity: 1,
        urgency: 'medium',
        reason: '',
        requiredBy: '',
      });
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.put(`/blood-requests/${id}/approve`);
      toast.success('Request approved successfully');
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      await api.put(`/blood-requests/${id}/reject`, { reason });
      toast.success('Request rejected');
      fetchRequests();
    } catch (error) {
      toast.error('Failed to reject request');
    }
  };

  const handleFulfill = async (id) => {
    try {
      await api.put(`/blood-requests/${id}/fulfill`);
      toast.success('Request fulfilled successfully');
      fetchRequests();
    } catch (error) {
      toast.error('Failed to fulfill request');
    }
  };

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const urgencies = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
  ];

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Blood Requests</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-300">Manage blood requests and approvals</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={20} />
          New Request
        </Button>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="p-4">
          <Select
            label="Filter by Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'fulfilled', label: 'Fulfilled' },
            ]}
          />
        </CardContent>
      </Card>

      {/* Requests List */}
      <div className="space-y-4">
        {requests.filter(req => {
            const term = searchQuery.toLowerCase();
            return (
                req.patientName?.toLowerCase().includes(term) ||
                req.bloodGroup?.toLowerCase().includes(term) ||
                req.status?.toLowerCase().includes(term)
            );
        }).map((request) => (
          <Card key={request._id}>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {request.patientName}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        request.urgency === 'critical'
                          ? 'bg-danger-100 text-danger-800'
                          : request.urgency === 'high'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {request.urgency}
                    </span>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-primary-100 text-primary-800">
                      {request.bloodGroup}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{request.reason}</p>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-gray-500">
                    <span>Quantity: {request.quantity} units</span>
                    <span>•</span>
                    <span>
                      Requested by: {request.requestedBy?.firstName}{' '}
                      {request.requestedBy?.lastName}
                    </span>
                    <span>•</span>
                    <span>{format(new Date(request.createdAt), 'MMM dd, yyyy')}</span>
                  </div>
                  {request.rejectedReason && (
                    <p className="mt-2 text-sm text-danger-600">
                      Rejection reason: {request.rejectedReason}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      request.status === 'approved'
                        ? 'bg-secondary-100 text-secondary-700'
                        : request.status === 'pending'
                        ? 'bg-orange-100 text-orange-700'
                        : request.status === 'rejected'
                        ? 'bg-danger-100 text-danger-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {request.status}
                  </span>
                </div>
              </div>

              {request.status === 'pending' && (
                <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleApprove(request._id)}
                    className="w-full sm:w-auto"
                  >
                    <CheckCircle size={16} />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleReject(request._id)}
                    className="w-full sm:w-auto"
                  >
                    <XCircle size={16} />
                    Reject
                  </Button>
                </div>
              )}

              {request.status === 'approved' && (
                <div className="mt-4 pt-4 border-t">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleFulfill(request._id)}
                    className="w-full sm:w-auto"
                  >
                    Fulfill Request
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {requests.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">No blood requests found</p>
          </CardContent>
        </Card>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create Blood Request</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Patient Name"
                  value={formData.patientName}
                  onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Blood Group"
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    options={[
                      { value: '', label: 'Select Blood Group' },
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
                  label="Reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  required
                />
                <Input
                  label="Required By (Optional)"
                  type="date"
                  value={formData.requiredBy}
                  onChange={(e) => setFormData({ ...formData, requiredBy: e.target.value })}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
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

