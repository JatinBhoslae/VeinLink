import { useState, useEffect } from 'react';
import { useSearch } from '../context/SearchContext';
import api from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { DatePicker } from '../components/ui/DatePicker';
import { Select } from '../components/ui/Select';
import { ChevronDown, Check } from 'lucide-react';
import { Plus, Search, Edit, Trash2, MapPin, Eye, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export const Donors = () => {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDonor, setEditingDonor] = useState(null);
  const [bloodGroupFilter, setBloodGroupFilter] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewDonor, setViewDonor] = useState(null);
  const { searchQuery, setSearchQuery } = useSearch();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    weight: '',
    address: {
      street: '',
      zipCode: '',
    },
    underlyingDisease: '',
    ongoingMedicine: '',
  });
  
  const [errors, setErrors] = useState({});
  
  const validateForm = () => {
    const newErrors = {};
    
    // Weight validation
    if (formData.weight) {
      const weight = parseFloat(formData.weight);
      if (isNaN(weight) || weight < 40 || weight > 200) {
        newErrors.weight = 'Weight must be between 40-200 kg';
      }
    } else if (formData.weight === '') {
      newErrors.weight = 'Weight is required';
    }
    
    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Phone validation
    if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = 'Phone number must be 10 digits';
    }
    
    // Postal code validation
    if (formData.address.zipCode && !/^\d{6}$/.test(formData.address.zipCode)) {
      newErrors.zipCode = 'Postal code must be 6 digits';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateAge = (dateString) => {
    if (!dateString) return 0;
    const dob = new Date(dateString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const maxDob = (() => {
    const today = new Date();
    const eighteen = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    const iso = eighteen.toISOString();
    return iso.split('T')[0];
  })();

  const isUnderage = formData.dateOfBirth && calculateAge(formData.dateOfBirth) < 18;

  useEffect(() => {
    fetchDonors();
  }, [bloodGroupFilter]);

  const fetchDonors = async () => {
    try {
      const params = {};
      if (bloodGroupFilter) params.bloodGroup = bloodGroupFilter;
      const response = await api.get('/donors', { params });
      setDonors(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch donors');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      return;
    }
    
    if (isUnderage) {
      toast.error('Not eligible: Donor must be at least 18 years old');
      return;
    }
    
    try {
      // Prepare the data to send, ensuring weight is a number
      const dataToSend = {
        ...formData,
        weight: formData.weight ? parseFloat(formData.weight) : null
      };
      
      if (editingDonor) {
        await api.put(`/donors/${editingDonor._id}`, dataToSend);
        toast.success('Donor updated successfully');
      } else {
        await api.post('/donors', dataToSend);
        toast.success('Donor created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchDonors();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this donor?')) return;

    try {
      await api.delete(`/donors/${id}`);
      toast.success('Donor deleted successfully');
      fetchDonors();
    } catch (error) {
      toast.error('Failed to delete donor');
    }
  };

  const handleView = (donor) => {
    // Ensure weight is properly set when viewing
    setViewDonor({
      ...donor,
      weight: donor.weight ? parseFloat(donor.weight) : null
    });
    setShowViewModal(true);
  };

  const handleEdit = (donor) => {
    setEditingDonor(donor);
    setFormData({
      firstName: donor.firstName,
      lastName: donor.lastName,
      email: donor.email || '',
      phone: donor.phone,
      dateOfBirth: donor.dateOfBirth ? format(new Date(donor.dateOfBirth), 'yyyy-MM-dd') : '',
      gender: donor.gender,
      bloodGroup: donor.bloodGroup,
      weight: donor.weight !== undefined && donor.weight !== null ? donor.weight.toString() : '',
      address: donor.address ? { street: donor.address.street || '', zipCode: donor.address.zipCode || '' } : { street: '', zipCode: '' },
      underlyingDisease: donor.underlyingDisease || '',
      ongoingMedicine: donor.ongoingMedicine || '',
    });
    setErrors({});
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      gender: '',
      bloodGroup: '',
      weight: '',
      address: { street: '', zipCode: '' },
      underlyingDisease: '',
      ongoingMedicine: '',
    });
    setErrors({});
    setEditingDonor(null);
  };

  const filteredDonors = donors.filter((donor) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      donor.firstName.toLowerCase().includes(searchLower) ||
      donor.lastName.toLowerCase().includes(searchLower) ||
      donor.phone.includes(searchQuery) ||
      donor.email?.toLowerCase().includes(searchLower) ||
      donor.bloodGroup.toLowerCase().includes(searchLower)
    );
  });

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Donors</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage blood donors</p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={20} />
          Add Donor
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <Input
              placeholder="Search donors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-5 h-5 text-gray-400 dark:text-gray-500" size={20} />}
            />
            <Select
              value={bloodGroupFilter}
              onChange={(e) => setBloodGroupFilter(e.target.value)}
              options={[
                { value: '__placeholder__', label: 'Filter by Blood Group', disabled: true, hidden: true },
                { value: '', label: 'All Blood Groups' },
                ...bloodGroups.map((bg) => ({ value: bg, label: bg })),
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Donors Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Blood Group
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Donation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredDonors.map((donor) => (
                  <tr key={donor._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {donor.firstName} {donor.lastName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{donor.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400">
                        {donor.bloodGroup}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {donor.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {donor.lastDonationDate
                        ? format(new Date(donor.lastDonationDate), 'MMM dd, yyyy')
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          donor.isEligible
                            ? 'bg-secondary-100 text-secondary-800 dark:bg-secondary-900/30 dark:text-secondary-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {donor.isEligible ? 'Eligible' : 'Not Eligible'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(donor)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleView(donor)}
                        className="text-gray-600 hover:text-gray-900"
                        title="View Donor"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(donor._id)}
                        className="text-danger-600 hover:text-danger-900"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="relative">
              <CardTitle>{editingDonor ? 'Edit Donor' : 'Add New Donor'}</CardTitle>
              <button
                type="button"
                className="absolute right-6 top-6 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => { setShowModal(false); resetForm(); }}
                aria-label="Close"
              >
                <X size={20} className="text-gray-700 dark:text-gray-200" />
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                  <Input
                    label="Last Name"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      // Clear error when user types
                      if (errors.email) {
                        setErrors({ ...errors, email: null });
                      }
                    }}
                    onBlur={() => validateForm()}
                    error={errors.email}
                  />
                  <Input
                    label="Phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      // Only allow numbers and limit to 10 digits
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, phone: value });
                      // Clear error when user types
                      if (errors.phone) {
                        setErrors({ ...errors, phone: null });
                      }
                    }}
                    onBlur={() => validateForm()}
                    error={errors.phone}
                    placeholder="1234567890"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <DatePicker
                    label="Date of Birth"
                    value={formData.dateOfBirth}
                    onChange={(val) => setFormData({ ...formData, dateOfBirth: val })}
                    max={maxDob}
                  />
                  <div className="relative">
                    <Input
                      label="Weight (kg)"
                      type="number"
                      min="40"
                      max="200"
                      step="0.1"
                      value={formData.weight}
                      onChange={(e) => {
                        setFormData({ ...formData, weight: e.target.value });
                        // Clear error when user types
                        if (errors.weight) {
                          setErrors({ ...errors, weight: null });
                        }
                      }}
                      onBlur={() => validateForm()}
                      error={errors.weight}
                      required
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <style jsx global>{`
                      /* Hide number input arrows for all browsers */
                      input[type='number']::-webkit-inner-spin-button,
                      input[type='number']::-webkit-outer-spin-button {
                        -webkit-appearance: none;
                        margin: 0;
                      }
                      input[type='number'] {
                        -moz-appearance: textfield;
                      }
                    `}</style>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Gender <span className="text-danger-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none pr-10"
                        required
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      </div>
                    </div>
                    <style jsx global>{`
                      select {
                        -webkit-appearance: none;
                        -moz-appearance: none;
                        text-indent: 1px;
                        text-overflow: '';
                      }
                    `}</style>
                    {isUnderage && (
                      <div className="mt-2 p-3 rounded-lg bg-danger-50 dark:bg-danger-900/30 border border-danger-200 dark:border-danger-800 text-danger-700 dark:text-danger-300">
                        Not eligible: Donor must be at least 18 years old.
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Blood Group <span className="text-danger-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={formData.bloodGroup}
                        onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none pr-10"
                        required
                      >
                        <option value="">Select Blood Group</option>
                        {bloodGroups.map((bg) => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Address</h3>
                  <div className="space-y-3">
                    <Input
                      label="Street"
                      value={formData.address.street}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, street: e.target.value },
                        })
                      }
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Postal Code"
                        type="text"
                        value={formData.address.zipCode}
                        onChange={(e) => {
                          // Only allow numbers and limit to 6 digits
                          const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setFormData({
                            ...formData,
                            address: { ...formData.address, zipCode: value },
                          });
                          // Clear error when user types
                          if (errors.zipCode) {
                            setErrors({ ...errors, zipCode: null });
                          }
                        }}
                        onBlur={() => validateForm()}
                        error={errors.zipCode}
                        placeholder="123456"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Health Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Underlying Disease"
                      value={formData.underlyingDisease}
                      onChange={(e) => setFormData({ ...formData, underlyingDisease: e.target.value })}
                    />
                    <Input
                      label="Ongoing Medicine"
                      value={formData.ongoingMedicine}
                      onChange={(e) => setFormData({ ...formData, ongoingMedicine: e.target.value })}
                    />
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
                  <Button type="submit" disabled={isUnderage}>
                    {editingDonor ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {showViewModal && viewDonor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-xl max-h-[85vh] overflow-y-auto">
            <CardHeader className="relative">
              <CardTitle>Donor Details</CardTitle>
              <button
                type="button"
                className="absolute right-6 top-6 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => { setShowViewModal(false); setViewDonor(null); }}
                aria-label="Close"
              >
                <X size={20} className="text-gray-700 dark:text-gray-200" />
              </button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Name</p>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">{viewDonor.firstName} {viewDonor.lastName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Blood Group</p>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">{viewDonor.bloodGroup}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Email</p>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">{viewDonor.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Phone</p>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">{viewDonor.phone}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Date of Birth</p>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">{viewDonor.dateOfBirth ? format(new Date(viewDonor.dateOfBirth), 'MMM dd, yyyy') : '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Gender</p>
                    <p className="text-gray-900 dark:text-gray-100 font-medium capitalize">{viewDonor.gender}</p>
                  </div>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Address</p>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">{viewDonor.address?.street || '-'} {viewDonor.address?.zipCode ? `, ${viewDonor.address.zipCode}` : ''}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Weight</p>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">
                      {viewDonor.weight ? `${viewDonor.weight} kg` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Underlying Disease</p>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">{viewDonor.underlyingDisease || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Ongoing Medicine</p>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">{viewDonor.ongoingMedicine || '-'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
