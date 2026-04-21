import { useState, useEffect } from 'react';
import { useSearch } from '../context/SearchContext';
import api from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Plus, Calendar, MapPin, Users, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';

export const BloodCamps = () => {
  const { searchQuery } = useSearch();
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedCamp, setSelectedCamp] = useState(null);
  const [filter, setFilter] = useState('upcoming');
  const [isEdit, setIsEdit] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    assignedVolunteer: '',
    startDate: '',
    endDate: '',
    location: {
      address: '',
      city: '',
      state: '',
      zipCode: '',
      coordinates: {
        latitude: 0,
        longitude: 0,
      }
    },
    timeSlots: [{ startTime: '09:00', endTime: '10:00', maxDonors: 10 }],
  });

  const [collectionData, setCollectionData] = useState({
    'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0
  });

  useEffect(() => {
    fetchCamps();
  }, []);

  const fetchCamps = async () => {
    try {
      const response = await api.get('/v-stats/dashboard');
      // The dashboard stats contains upcomingCamps. But we want all camps for this view.
      // Let's use the dedicated endpoint instead.
      const campsRes = await api.get('/blood-camps');
      setCamps(campsRes.data.data);
    } catch (error) {
      toast.error('Failed to fetch blood camps');
    } finally {
      setLoading(false);
    }
  };

  const isLive = (camp) => {
    const now = new Date();
    return now >= new Date(camp.startDate) && now <= new Date(camp.endDate);
  };

  const isPast = (camp) => {
    const now = new Date();
    return now > new Date(camp.endDate);
  };

  const filteredCamps = camps.filter(camp => {
    const matchesSearch = camp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         camp.location?.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         camp.location?.address?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filter === 'upcoming') {
      return !isPast(camp);
    } else {
      return isPast(camp);
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const zip = formData.location.zipCode?.trim();
    if (zip && !/^\d{6}$/.test(zip)) {
      toast.error('ZIP Code must be a 6-digit number');
      return;
    }
    try {
      if (isEdit && selectedCamp) {
        await api.put(`/blood-camps/${selectedCamp._id}`, formData);
        toast.success('Blood camp updated successfully');
      } else {
        await api.post('/blood-camps', formData);
        toast.success('Blood camp created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchCamps();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (camp) => {
    setSelectedCamp(camp);
    setIsEdit(true);
    setFormData({
      name: camp.name,
      description: camp.description || '',
      assignedVolunteer: camp.assignedVolunteer || '',
      startDate: format(new Date(camp.startDate), "yyyy-MM-dd'T'HH:mm"),
      endDate: format(new Date(camp.endDate), "yyyy-MM-dd'T'HH:mm"),
      location: {
        address: camp.location?.address || '',
        city: camp.location?.city || '',
        state: camp.location?.state || '',
        zipCode: camp.location?.zipCode || '',
        coordinates: {
          latitude: camp.location?.coordinates?.latitude || 0,
          longitude: camp.location?.coordinates?.longitude || 0,
        }
      },
      timeSlots: camp.timeSlots.map(slot => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        maxDonors: slot.maxDonors
      }))
    });
    setShowModal(true);
  };

  const handleCompleteCamp = async () => {
    try {
      if (!selectedCamp) return;

      const collections = Object.entries(collectionData)
        .map(([bloodGroup, units]) => ({
          bloodGroup,
          units: parseInt(units) || 0
        }))
        .filter(c => c.units > 0);

      if (collections.length === 0) {
        toast.error('Please enter at least one collection amount');
        return;
      }

      await api.post(`/blood-camps/${selectedCamp._id}/complete`, { collections });
      toast.success('Camp completed and inventory updated');
      setShowCompleteModal(false);
      fetchCamps();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to complete camp');
    }
  };

  const generateReport = (camp) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(220, 38, 38); // Red
    doc.text('VEIN LINK BLOOD DONATION CAMP REPORT', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), 'PPpp')}`, 105, 28, { align: 'center' });
    
    // Camp Info
    doc.setDrawColor(200);
    doc.line(20, 35, 190, 35);
    
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('CAMP DETAILS', 20, 45);
    
    doc.setFontSize(12);
    doc.text(`Name: ${camp.name}`, 20, 55);
    doc.text(`Location: ${camp.location?.address}, ${camp.location?.city}`, 20, 62);
    doc.text(`Date: ${format(new Date(camp.startDate), 'PPP')} - ${format(new Date(camp.endDate), 'PPP')}`, 20, 69);
    doc.text(`Status: ${camp.status.toUpperCase()}`, 20, 76);
    
    // Statistics
    doc.setFontSize(14);
    doc.text('COLLECTION STATISTICS', 20, 90);
    
    let y = 100;
    doc.setFontSize(12);
    doc.text('Blood Group', 30, y);
    doc.text('Units Collected', 120, y);
    doc.line(20, y + 2, 190, y + 2);
    
    y += 10;
    const collections = camp.bloodGroupCollections || [];
    if (collections.length > 0) {
      collections.forEach(col => {
        doc.text(col.bloodGroup, 30, y);
        doc.text(col.units.toString(), 120, y);
        y += 8;
      });
    } else {
      doc.setFontSize(10);
      doc.text('No collection data available', 30, y);
      y += 8;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Units Collected: ${camp.totalCollections || 0}`, 30, y + 5);
    doc.setFont('helvetica', 'normal');
    
    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('Authorized by Vein Link Hospital Management System', 105, 285, { align: 'center' });
    
    doc.save(`${camp.name}_Report.pdf`);
  };

  const addTimeSlot = () => {
    setFormData({
      ...formData,
      timeSlots: [
        ...formData.timeSlots,
        { startTime: '09:00', endTime: '10:00', maxDonors: 10 },
      ],
    });
  };

  const removeTimeSlot = (index) => {
    setFormData({
      ...formData,
      timeSlots: formData.timeSlots.filter((_, i) => i !== index),
    });
  };

  const updateTimeSlot = (index, field, value) => {
    const updated = [...formData.timeSlots];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, timeSlots: updated });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      assignedVolunteer: '',
      startDate: '',
      endDate: '',
      location: { address: '', city: '', state: '', zipCode: '', coordinates: { latitude: 0, longitude: 0 } },
      timeSlots: [{ startTime: '09:00', endTime: '10:00', maxDonors: 10 }],
    });
    setIsEdit(false);
    setSelectedCamp(null);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Blood Camps</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Organize and manage blood donation camps</p>
        </div>
        <div className="flex gap-2">
          <Button variant={filter === 'upcoming' ? 'primary' : 'outline'} onClick={() => setFilter('upcoming')}>
            Upcoming Camps
          </Button>
          <Button variant={filter === 'past' ? 'primary' : 'outline'} onClick={() => setFilter('past')}>
            Past Camps
          </Button>
          <Button onClick={() => { setIsEdit(false); resetForm(); setShowModal(true); }}>
            <Plus size={20} />
            Create Camp
          </Button>
        </div>
      </div>

      {/* Camps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCamps.map((camp) => (
          <Card key={camp._id} className={isLive(camp) ? 'ring-2 ring-secondary-500' : ''}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{camp.name}</h3>
                    {!isPast(camp) && (
                      <button 
                        onClick={() => handleEdit(camp)}
                        className="text-gray-400 hover:text-primary-600 transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                    )}
                  </div>
                  {isLive(camp) && (
                    <span className="flex items-center gap-1 text-xs font-bold text-secondary-600 animate-pulse">
                      <span className="w-2 h-2 bg-secondary-600 rounded-full"></span>
                      LIVE NOW
                    </span>
                  )}
                </div>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    camp.status === 'ongoing' || isLive(camp)
                      ? 'bg-secondary-100 text-secondary-800'
                      : camp.status === 'upcoming'
                      ? 'bg-blue-100 text-blue-800'
                      : camp.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {isLive(camp) ? 'ongoing' : camp.status}
                </span>
              </div>

              {camp.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">{camp.description}</p>
              )}

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <Calendar size={16} />
                  <span>
                    {format(new Date(camp.startDate), 'MMM dd, yyyy')} -{' '}
                    {format(new Date(camp.endDate), 'MMM dd, yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <MapPin size={16} />
                  <span className="truncate">{camp.location?.address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users size={16} />
                  <span>{camp.totalRegistrations} registrations</span>
                </div>
              </div>

              <div className="pt-4 border-t flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setSelectedCamp(camp);
                    setShowDetailsModal(true);
                  }}
                >
                  View Details
                </Button>
                
                {isPast(camp) && camp.status !== 'completed' && (
                  <Button
                    size="sm"
                    className="w-full bg-secondary-600 hover:bg-secondary-700"
                    onClick={() => {
                      setSelectedCamp(camp);
                      setShowCompleteModal(true);
                    }}
                  >
                    Complete & Enter Data
                  </Button>
                )}

                {camp.status === 'completed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-green-600 text-green-600 hover:bg-green-50"
                    onClick={() => generateReport(camp)}
                  >
                    Download Report
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCamps.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">No blood camps found</p>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl my-8">
            <CardHeader>
              <CardTitle>{isEdit ? 'Edit Blood Camp' : 'Create Blood Camp'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Camp Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <Input
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Start Date"
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                  <Input
                    label="End Date"
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>

                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Location</h3>
                  <div className="space-y-3">
                    <Input
                      label="Address"
                      value={formData.location.address}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          location: { ...formData.location, address: e.target.value },
                        })
                      }
                      required
                    />
                    <div className="grid grid-cols-3 gap-4">
                      <Input
                        label="City"
                        value={formData.location.city}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            location: { ...formData.location, city: e.target.value },
                          })
                        }
                      />
                      <Input
                        label="State"
                        value={formData.location.state}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            location: { ...formData.location, state: e.target.value },
                          })
                        }
                      />
                      <Input
                        label="ZIP Code"
                        value={formData.location.zipCode}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            location: { ...formData.location, zipCode: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <Input
                        label="Latitude (Optional)"
                        type="number"
                        step="any"
                        value={formData.location.coordinates?.latitude || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            location: { 
                              ...formData.location, 
                              coordinates: { 
                                ...formData.location.coordinates, 
                                latitude: parseFloat(e.target.value) || 0 
                              } 
                            },
                          })
                        }
                        placeholder="e.g. 18.5204"
                      />
                      <Input
                        label="Longitude (Optional)"
                        type="number"
                        step="any"
                        value={formData.location.coordinates?.longitude || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            location: { 
                              ...formData.location, 
                              coordinates: { 
                                ...formData.location.coordinates, 
                                longitude: parseFloat(e.target.value) || 0 
                              } 
                            },
                          })
                        }
                        placeholder="e.g. 73.8567"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-3">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">Assigned Volunteer</h3>
                  <Input
                    label="Volunteer Name (Optional)"
                    value={formData.assignedVolunteer}
                    onChange={(e) => setFormData({ ...formData, assignedVolunteer: e.target.value })}
                    placeholder="e.g., Kumar Sharma"
                  />
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Time Slots</h3>
                    <Button type="button" size="sm" variant="outline" onClick={addTimeSlot}>
                      Add Slot
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {formData.timeSlots.map((slot, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <Input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => updateTimeSlot(index, 'startTime', e.target.value)}
                          className="flex-1"
                        />
                        <span className="text-gray-500 dark:text-gray-400">to</span>
                        <Input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => updateTimeSlot(index, 'endTime', e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          min={1}
                          value={slot.maxDonors}
                          onChange={(e) =>
                            updateTimeSlot(index, 'maxDonors', parseInt(e.target.value))
                          }
                          className="w-20"
                        />
                        {formData.timeSlots.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={() => removeTimeSlot(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">{isEdit ? 'Update Camp' : 'Create Camp'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedCamp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <Card className="w-full max-w-xl my-8">
            <CardHeader>
              <CardTitle>{selectedCamp.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                  <Calendar size={16} />
                  <span>
                    {format(new Date(selectedCamp.startDate), 'MMM dd, yyyy p')} -{' '}
                    {format(new Date(selectedCamp.endDate), 'MMM dd, yyyy p')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                  <MapPin size={16} />
                  <span>
                    {selectedCamp.location?.address}, {selectedCamp.location?.city}{' '}
                    {selectedCamp.location?.state} {selectedCamp.location?.zipCode}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                  <Users size={16} />
                  <span>{selectedCamp.totalRegistrations} registrations</span>
                </div>
                {selectedCamp.assignedVolunteer && (
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                    <span className="font-medium">Assigned Volunteer:</span>
                    <span>{selectedCamp.assignedVolunteer}</span>
                  </div>
                )}
                {selectedCamp.description && (
                  <p className="text-gray-700 dark:text-gray-200 pt-2 border-t">
                    {selectedCamp.description}
                  </p>
                )}
                {selectedCamp.timeSlots && selectedCamp.timeSlots.length > 0 && (
                  <div className="pt-3 border-t space-y-2">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Time Slots</h3>
                    <div className="space-y-1">
                      {selectedCamp.timeSlots.map((slot, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-200"
                        >
                          <span>
                            {slot.startTime} - {slot.endTime}
                          </span>
                          <span>Max donors: {slot.maxDonors}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedCamp(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Complete & Enter Data Modal */}
      {showCompleteModal && selectedCamp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Complete Camp: {selectedCamp.name}</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Enter the amount of blood collected for each group</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {Object.keys(collectionData).map(bg => (
                  <div key={bg} className="flex flex-col gap-1">
                    <label className="text-sm font-medium">{bg} Unit(s)</label>
                    <Input
                      type="number"
                      min="0"
                      value={collectionData[bg]}
                      onChange={(e) => setCollectionData({ ...collectionData, [bg]: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowCompleteModal(false)}>
                  Cancel
                </Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={handleCompleteCamp}>
                  Complete & Update Inventory
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
