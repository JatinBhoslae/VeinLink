import { useState, useEffect } from 'react';
import { useSearch } from '../context/SearchContext';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { CheckCircle, XCircle, Building2, AlertCircle, Filter, Heart, Search, MapPin, Mail, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export const Hospitals = () => {
  const { user } = useAuth();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [likingId, setLikingId] = useState(null); // track which hospital is being liked
  const { searchQuery, setSearchQuery } = useSearch();

  useEffect(() => {
    fetchHospitals();
  }, [filter]);

  const fetchHospitals = async () => {
    try {
      const params = {};
      if (filter === 'pending') {
        params.status = 'pending';
      } else if (filter === 'approved') {
        params.status = 'approved';
      } else if (filter === 'rejected') {
        params.status = 'rejected';
      }
      const response = await api.get('/hospitals', { params });
      setHospitals(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch hospitals');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to reject this hospital?')) return;

    try {
      await api.put(`/hospitals/${id}/reject`);
      toast.success('Hospital rejected successfully');
      fetchHospitals();
    } catch (error) {
      toast.error('Failed to reject hospital');
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.put(`/hospitals/${id}/approve`);
      toast.success('Hospital approved successfully');
      fetchHospitals();
    } catch (error) {
      toast.error('Failed to approve hospital');
    }
  };

  const handleLike = async (hospitalId) => {
    setLikingId(hospitalId);
    try {
      const res = await api.put(`/hospitals/${hospitalId}/like`);
      setHospitals((prev) =>
        prev.map((h) => {
          if (h._id === hospitalId) {
            const liked = res.data.data.liked;
            return {
              ...h,
              likesCount: res.data.data.likesCount,
              likes: liked
                ? [...(h.likes || []), user?.id]
                : (h.likes || []).filter((id) => id !== user?.id),
            };
          }
          return h;
        })
      );
      toast.success(res.data.message, { duration: 1500, icon: res.data.data.liked ? '❤️' : '💔' });
    } catch (error) {
      toast.error('Failed to like hospital');
    } finally {
      setTimeout(() => setLikingId(null), 300);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const pendingCount = hospitals.filter((h) => h.status === 'pending').length;
  const approvedCount = hospitals.filter((h) => h.status === 'approved').length;
  const rejectedCount = hospitals.filter((h) => h.status === 'rejected').length;

  const filteredHospitals = hospitals.filter((hospital) => {
    if (filter === 'pending') return hospital.status === 'pending';
    if (filter === 'approved') return hospital.status === 'approved';
    if (filter === 'rejected') return hospital.status === 'rejected';
    return true;
  }).filter(h => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      h.name?.toLowerCase().includes(term) ||
      h.email?.toLowerCase().includes(term) ||
      h.address?.city?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Hospitals</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Manage and approve hospital accounts</p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertCircle className="text-orange-600" size={20} />
            <span className="text-orange-800 font-medium">
              {pendingCount} {pendingCount === 1 ? 'hospital' : 'hospitals'} pending approval
            </span>
          </div>
        )}
      </div>

      {/* Filter and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Total Hospitals</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{hospitals.length}</p>
              </div>
              <Building2 className="text-primary-600" size={24} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Pending</p>
                <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
              </div>
              <AlertCircle className="text-orange-600" size={24} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Approved</p>
                <p className="text-2xl font-bold text-secondary-600">{approvedCount}</p>
              </div>
              <CheckCircle className="text-secondary-600" size={24} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
              </div>
              <XCircle className="text-red-600" size={24} />
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-1 md:col-span-2 border-none shadow-sm bg-white dark:bg-gray-800 rounded-2xl">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search hospitals by name, email, or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg leading-5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                />
              </div>
              <div className="w-full sm:w-48">
                <Select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Hospitals' },
                    { value: 'pending', label: 'Pending Only' },
                    { value: 'approved', label: 'Approved Only' },
                    { value: 'rejected', label: 'Rejected Only' },
                  ]}
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Hospitals Alert */}
      {pendingCount > 0 && filter !== 'approved' && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-orange-600 flex-shrink-0" size={24} />
              <div className="flex-1">
                <p className="font-semibold text-orange-900">
                  {pendingCount} {pendingCount === 1 ? 'hospital is' : 'hospitals are'} waiting for approval
                </p>
                <p className="text-sm text-orange-700 mt-1">
                  Review and approve hospitals below to grant them access to the system.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredHospitals.map((hospital) => (
          <Card key={hospital._id} className="group hover:shadow-xl transition-all duration-300 border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
            <div className="h-2 bg-gradient-to-r from-primary-500 to-secondary-500" />
            <CardContent className="p-6 flex-1 flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex gap-4">
                  <div className="p-3 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/40 dark:to-primary-800/40 rounded-xl shadow-inner border border-primary-100 dark:border-primary-800 h-fit">
                    <Building2 className="text-primary-600 dark:text-primary-400" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{hospital.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500 dark:text-gray-400">
                      <Mail size={14} />
                      <span className="truncate max-w-[180px]" title={hospital.email}>{hospital.email}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-between mb-5 border-b border-gray-100 dark:border-gray-800 pb-4">
                <span
                  className={`px-3 py-1 text-xs font-bold rounded-full border shadow-sm ${hospital.status === 'approved'
                      ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                      : hospital.status === 'rejected'
                        ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                        : 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800'
                    }`}
                >
                  {hospital.status === 'approved' ? '✓ Approved' : hospital.status === 'rejected' ? '✕ Rejected' : '⏳ Pending'}
                </span>

                {/* Like Button */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleLike(hospital._id)}
                    disabled={likingId === hospital._id}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title={hospital.likes?.includes(user?.id) ? 'Unlike this hospital' : 'Like this hospital'}
                  >
                    <Heart
                      size={18}
                      className={`transition-all duration-300 ${hospital.likes?.includes(user?.id)
                        ? 'text-red-500 fill-red-500 scale-110 drop-shadow-sm'
                        : 'text-gray-400 dark:text-gray-500'
                        } ${likingId === hospital._id ? 'animate-ping' : ''}`}
                    />
                    <span className={`text-sm font-semibold ${hospital.likes?.includes(user?.id) ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                      {hospital.likesCount || 0}
                    </span>
                  </button>
                </div>
              </div>

              <div className="space-y-3 mb-6 flex-1">
                <div className="flex items-start gap-3">
                  <Phone className="text-gray-400 mt-0.5" size={16} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{hospital.phone}</span>
                </div>
                {hospital.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="text-gray-400 mt-0.5 flex-shrink-0" size={16} />
                    <span className="text-sm text-gray-600 dark:text-gray-300 leading-tight">
                      {hospital.address.street},<br />
                      <span className="font-semibold">{hospital.address.city}</span>, {hospital.address.state}
                    </span>
                  </div>
                )}
                {hospital.licenseNumber && (
                  <div className="mt-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 text-xs border border-gray-100 dark:border-gray-700">
                    <span className="text-gray-500 font-medium">License No: </span>
                    <span className="font-mono text-gray-800 dark:text-gray-200">{hospital.licenseNumber}</span>
                  </div>
                )}
                {hospital.certificate && (
                  <div className="mt-2">
                    <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Certificate:</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {hospital.certificate.originalName}
                      </span>
                      <a
                        href={hospital.certificate.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 text-xs font-medium underline"
                      >
                        View Document
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {hospital.status === 'pending' && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => handleApprove(hospital._id)}
                    >
                      <CheckCircle size={16} />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      className="flex-1"
                      onClick={() => handleReject(hospital._id)}
                    >
                      <XCircle size={16} />
                      Reject
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    Registered: {format(new Date(hospital.createdAt), 'MMM dd, yyyy')}
                  </p>
                </div>
              )}
              {hospital.status === 'approved' && (
                <div className="pt-2 border-t space-y-2">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Approved:{' '}
                      {hospital.approvedAt
                        ? format(new Date(hospital.approvedAt), 'MMM dd, yyyy')
                        : 'N/A'}
                    </p>
                    {hospital.approvedBy && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        By: {hospital.approvedBy.firstName} {hospital.approvedBy.lastName}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="danger"
                    className="w-full"
                    onClick={() => handleReject(hospital._id)}
                  >
                    <XCircle size={16} />
                    Reject Hospital
                  </Button>
                </div>
              )}
              {hospital.status === 'rejected' && (
                <div className="pt-2 border-t space-y-2">
                  <div>
                    <p className="text-xs text-red-500 dark:text-red-400 font-medium">
                      Rejected:{' '}
                      {hospital.rejectedAt
                        ? format(new Date(hospital.rejectedAt), 'MMM dd, yyyy')
                        : 'N/A'}
                    </p>
                    {hospital.rejectedBy && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        By: {hospital.rejectedBy.firstName} {hospital.rejectedBy.lastName}
                      </p>
                    )}
                    {hospital.rejectionReason && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                        Reason: {hospital.rejectionReason}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full"
                    onClick={() => handleApprove(hospital._id)}
                  >
                    <CheckCircle size={16} />
                    Approve Hospital
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredHospitals.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500 text-lg font-medium">
              {filter === 'pending'
                ? 'No pending hospitals'
                : filter === 'approved'
                  ? 'No approved hospitals'
                  : filter === 'rejected'
                    ? 'No rejected hospitals'
                    : 'No hospitals found'}
            </p>
            {filter !== 'all' && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setFilter('all')}
              >
                View All Hospitals
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

