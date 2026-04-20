import { useState, useEffect } from 'react';
import { useSearch } from '../context/SearchContext';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Plus, Search, QrCode, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import QRCode from 'react-qr-code';

export const BloodUnits = () => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [bloodGroupFilter, setBloodGroupFilter] = useState('');
  const { searchQuery, setSearchQuery } = useSearch();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    donorId: '',
    bloodGroup: '',
    volume: 450,
    rackNumber: '',
  });

  const [donors, setDonors] = useState([]);

  useEffect(() => {
    fetchUnits();
    fetchDonors();
  }, [statusFilter, bloodGroupFilter]);

  const fetchUnits = async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (bloodGroupFilter) params.bloodGroup = bloodGroupFilter;
      const response = await api.get('/blood-units', { params });
      setUnits(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch blood units');
    } finally {
      setLoading(false);
    }
  };

  const fetchDonors = async () => {
    try {
      const response = await api.get('/donors');
      setDonors(response.data.data);
    } catch (error) {
      console.error('Failed to fetch donors');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/blood-units', formData);
      toast.success('Blood unit created successfully');
      setShowModal(false);
      setFormData({ donorId: '', bloodGroup: '', volume: 450, rackNumber: '' });
      fetchUnits();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleStatusUpdate = async (unitId, newStatus) => {
    try {
      await api.put(`/blood-units/${unitId}/status`, { status: newStatus });
      toast.success('Status updated successfully');
      fetchUnits();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const filteredUnits = units.filter((unit) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      unit.bagId.toLowerCase().includes(searchLower) ||
      unit.donorId?.firstName?.toLowerCase().includes(searchLower) ||
      unit.donorId?.lastName?.toLowerCase().includes(searchLower) ||
      unit.bloodGroup.toLowerCase().includes(searchLower)
    );
  });

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const statuses = ['collected', 'tested', 'available', 'reserved', 'issued', 'expired', 'disposed'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Blood Inventory</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Manage and track blood units in your hospital</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowModal(true)}>
            <Plus size={20} />
            Add Blood Unit
          </Button>
          <Button
            onClick={() =>
              navigate('/inter-hospital-requests', {
                state: { preselectedBloodGroup: bloodGroupFilter },
              })
            }
          >
            Request from another hospital
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="flex flex-col space-y-1">
              <label className="text-sm font-medium text-gray-700">Search</label>
              <Input
                placeholder="Search by bag ID or donor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-5 h-5 text-gray-400 dark:text-gray-500" size={20} />}
              />
            </div>
            <Select
              label="Filter by Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All Statuses' },
                ...statuses.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })),
              ]}
            />
            <Select
              label="Filter by Blood Group"
              value={bloodGroupFilter}
              onChange={(e) => setBloodGroupFilter(e.target.value)}
              options={[
                { value: '', label: 'All Blood Groups' },
                ...bloodGroups.map((bg) => ({ value: bg, label: bg })),
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Units Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {filteredUnits.map((unit) => {
          const isExpiringSoon = new Date(unit.expiryDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          const isExpired = new Date(unit.expiryDate) < new Date();

          return (
            <Card key={unit._id}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Bag ID</p>
                    <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">{unit.bagId}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedUnit({
                        ...unit,
                        // Ensure we have all the required fields
                        collectionDate: unit.collectionDate || new Date().toISOString(),
                        expiryDate: unit.expiryDate || new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString() // Default 42 days
                      });
                      setShowQRModal(true);
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group flex-shrink-0"
                    aria-label="View QR code"
                    title="View QR Code"
                  >
                    <QrCode className="text-primary-600 group-hover:text-primary-700 dark:text-primary-400 dark:group-hover:text-primary-300 transition-colors" size={20} />
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Blood Group</span>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-100">
                      {unit.bloodGroup}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Status</span>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        unit.status === 'available'
                          ? 'bg-secondary-100 dark:bg-secondary-900 text-secondary-800 dark:text-secondary-100'
                          : unit.status === 'issued'
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {unit.status}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Donor</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-right">
                      {unit.donorId?.firstName} {unit.donorId?.lastName}
                    </span>
                  </div>
                  {unit.rackNumber && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <span className="text-sm text-gray-600 dark:text-gray-300">Rack / Location</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-right">
                        {unit.rackNumber}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Collection Date</span>
                    <span className="text-sm text-gray-900 dark:text-gray-100 text-right">
                      {format(new Date(unit.collectionDate), 'MMM dd, yyyy')}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Expiry Date</span>
                    <span
                      className={`text-sm font-medium text-right ${
                        isExpired
                          ? 'text-red-600 dark:text-red-400'
                          : isExpiringSoon
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      {format(new Date(unit.expiryDate), 'MMM dd, yyyy')}
                      {isExpiringSoon && !isExpired && (
                        <AlertCircle className="inline ml-1" size={14} />
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  {unit.status === 'collected' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => handleStatusUpdate(unit._id, 'tested')}
                    >
                      Mark Tested
                    </Button>
                  )}
                  {unit.status === 'tested' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => handleStatusUpdate(unit._id, 'available')}
                    >
                      Make Available
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredUnits.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">No blood units found</p>
          </CardContent>
        </Card>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add New Blood Unit</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Select
                  label="Donor"
                  value={formData.donorId}
                  onChange={(e) => setFormData({ ...formData, donorId: e.target.value })}
                  options={[
                    { value: '', label: 'Select Donor' },
                    ...donors.map((donor) => ({
                      value: donor._id,
                      label: `${donor.firstName} ${donor.lastName} (${donor.bloodGroup})`,
                    })),
                  ]}
                  required
                />
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
                  label="Volume (ml)"
                  type="number"
                  value={formData.volume}
                  onChange={(e) => setFormData({ ...formData, volume: parseInt(e.target.value) })}
                  min={200}
                  max={500}
                />
                <Input
                  label="Rack / Location (e.g., FridgeA1)"
                  type="text"
                  value={formData.rackNumber}
                  onChange={(e) => setFormData({ ...formData, rackNumber: e.target.value })}
                  placeholder="FridgeA1"
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Create</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedUnit && (
        <div 
          className="fixed inset-0 bg-black/70 dark:bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowQRModal(false)}
        >
          <Card className="w-full max-w-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Blood Unit QR Code</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">Scan to view blood unit details</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div id="qrcode" className="p-4 bg-white dark:bg-white rounded-lg shadow-sm">
                  <QRCode 
                    value={JSON.stringify({
                      bagId: selectedUnit.bagId,
                      bloodGroup: selectedUnit.bloodGroup,
                      status: selectedUnit.status,
                      collectionDate: selectedUnit.collectionDate,
                      expiryDate: selectedUnit.expiryDate,
                      rackNumber: selectedUnit.rackNumber,
                    })} 
                    size={200}
                    level="H"
                    fgColor="#111827"
                    bgColor="#ffffff"
                    style={{
                      height: 'auto',
                      maxWidth: '100%',
                      width: '100%',
                      filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))',
                    }}
                  />
                </div>
                <div className="mt-6 text-center space-y-2">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Blood Unit ID</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedUnit.bagId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Blood Group</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedUnit.bloodGroup}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{selectedUnit.status}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    // Create a canvas element to download the QR code
                    const canvas = document.createElement('canvas');
                    const qrCode = document.querySelector('#qrcode svg');
                    if (qrCode) {
                      // Convert SVG to data URL
                      const svgData = new XMLSerializer().serializeToString(qrCode);
                      const canvas = document.createElement('canvas');
                      const ctx = canvas.getContext('2d');
                      const img = new Image();
                      
                      // Set canvas size with padding
                      const padding = 20;
                      canvas.width = qrCode.width.baseVal.value + padding * 2;
                      canvas.height = qrCode.height.baseVal.value + padding * 2;
                      
                      // Set background
                      ctx.fillStyle = '#ffffff';
                      ctx.fillRect(0, 0, canvas.width, canvas.height);
                      
                      // Convert SVG to image
                      const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
                      const url = URL.createObjectURL(svgBlob);
                      
                      img.onload = function() {
                        // Draw the QR code with padding
                        ctx.drawImage(img, padding, padding, qrCode.width.baseVal.value, qrCode.height.baseVal.value);
                        
                        // Add border
                        ctx.strokeStyle = '#e5e7eb';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(0, 0, canvas.width, canvas.height);
                        
                        // Create download link
                        const link = document.createElement('a');
                        link.download = `blood-unit-${selectedUnit.bagId}.png`;
                        link.href = canvas.toDataURL('image/png');
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        
                        // Clean up
                        URL.revokeObjectURL(url);
                      };
                      
                      img.src = url;
                    }
                  }}
                >
                  Download QR Code
                </Button>
                <Button 
                  variant="default" 
                  className="flex-1"
                  onClick={() => setShowQRModal(false)}
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

