import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { ShieldAlert, Plus, CheckCircle, XCircle, FileText, Activity, Users, ClipboardList, Package, RefreshCw, Eye } from 'lucide-react';

const AdminDashboard = () => {
  // Navigation tabs: 'pharmacies', 'medicines', 'requests'
  const [activeTab, setActiveTab] = useState('pharmacies');

  // Backend Lists
  const [pharmacies, setPharmacies] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [requests, setRequests] = useState([]);

  // Loading indicator states
  const [loading, setLoading] = useState(false);

  // Add Medicine Form state
  const [medName, setMedName] = useState('');
  const [medGenericName, setMedGenericName] = useState('');
  const [medManufacturer, setMedManufacturer] = useState('');
  const [medDisease, setMedDisease] = useState('');
  const [medDescription, setMedDescription] = useState('');
  const [medImage, setMedImage] = useState('');
  const [addingMedicine, setAddingMedicine] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 5000);
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'pharmacies') {
        const res = await api.get('/pharmacies');
        setPharmacies(res.data);
      } else if (activeTab === 'medicines') {
        const res = await api.get('/medicines');
        setMedicines(res.data);
      } else if (activeTab === 'requests') {
        const res = await api.get('/requests');
        setRequests(res.data);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Pharmacy Approval handlers
  const handleVerifyPharmacy = async (id, status) => {
    try {
      await api.put(`/pharmacies/${id}/verify`, { verificationStatus: status });
      showToast(`Pharmacy registration successfully ${status}!`, 'success');
      fetchData();
    } catch (err) {
      showToast('Failed to update pharmacy verification status', 'error');
    }
  };

  // Add Medicine handler
  const handleAddMedicineSubmit = async (e) => {
    e.preventDefault();
    if (!medName || !medGenericName || !medManufacturer || !medDisease || !medDescription) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setAddingMedicine(true);
    try {
      await api.post('/medicines', {
        name: medName,
        genericName: medGenericName,
        manufacturer: medManufacturer,
        disease: medDisease,
        description: medDescription,
        image: medImage
      });

      showToast('Rare medicine successfully added to the master catalog!', 'success');
      setMedName('');
      setMedGenericName('');
      setMedManufacturer('');
      setMedDisease('');
      setMedDescription('');
      setMedImage('');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add medicine', 'error');
    } finally {
      setAddingMedicine(false);
    }
  };

  // Analytics Metrics
  const totalPharmacies = pharmacies.length;
  const pendingPharmacies = pharmacies.filter((p) => p.verificationStatus === 'pending').length;
  const approvedPharmacies = pharmacies.filter((p) => p.verificationStatus === 'approved').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 relative z-10 bg-slate-50">
      
      {/* Toast Banner */}
      {toast.message && (
        <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-sm transition-all ${
          toast.type === 'error' ? 'bg-red-50 text-red-750 border-red-200' : 'bg-emerald-50 text-emerald-750 border-emerald-200'
        }`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast({ message: '', type: '' })} className="text-slate-400 hover:text-slate-600 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Top Banner & Analytics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Pending Verification */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-55 text-amber-500 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Pending Stores</span>
            <span className="text-2xl font-extrabold text-slate-800 block mt-0.5">{pendingPharmacies}</span>
          </div>
        </div>

        {/* Card 2: Approved Pharmacies */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Approved Stores</span>
            <span className="text-2xl font-extrabold text-slate-800 block mt-0.5">{approvedPharmacies}</span>
          </div>
        </div>

        {/* Card 3: Rare Medicines Catalog */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-red-50 text-red-650 flex items-center justify-center shrink-0">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Master Medicines</span>
            <span className="text-2xl font-extrabold text-slate-800 block mt-0.5">
              {activeTab === 'medicines' ? medicines.length : 'Catalog'}
            </span>
          </div>
        </div>

        {/* Card 4: Logged Demand Requests */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Patient Demands</span>
            <span className="text-2xl font-extrabold text-slate-800 block mt-0.5">
              {activeTab === 'requests' ? requests.length : 'Global Logs'}
            </span>
          </div>
        </div>

      </div>

      {/* Tab Switcher console */}
      <div className="flex p-1 rounded-xl bg-slate-100 border border-slate-200 max-w-md">
        <button
          onClick={() => setActiveTab('pharmacies')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
            activeTab === 'pharmacies' ? 'bg-red-600 text-white shadow' : 'text-slate-500 hover:text-slate-850'
          }`}
        >
          <Users className="h-4 w-4" /> Pharmacy Registrations
        </button>
        <button
          onClick={() => setActiveTab('medicines')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
            activeTab === 'medicines' ? 'bg-red-600 text-white shadow' : 'text-slate-500 hover:text-slate-850'
          }`}
        >
          <Package className="h-4 w-4" /> Master Medicines
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
            activeTab === 'requests' ? 'bg-red-600 text-white shadow' : 'text-slate-500 hover:text-slate-850'
          }`}
        >
          <ClipboardList className="h-4 w-4" /> Patient Requests
        </button>
      </div>

      {/* Main Tab Panels */}
      <div>
        
        {/* PANEL 1: PHARMACY VERIFICATION LIST */}
        {activeTab === 'pharmacies' && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Registered Pharmacy Stores</h3>
                <p className="text-xs text-slate-500 mt-1">Review onboarding applications and verify medical licenses.</p>
              </div>
              <button
                onClick={fetchData}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-850 rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-500 text-xs">Loading pharmacies...</div>
            ) : pharmacies.length > 0 ? (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <th className="p-4 font-semibold">Store Details</th>
                      <th className="p-4 font-semibold">Owner details</th>
                      <th className="p-4 font-semibold">License details</th>
                      <th className="p-4 font-semibold">Status</th>
                      <th className="p-4 font-semibold text-center">Verification Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pharmacies.map((phar) => (
                      <tr key={phar._id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 space-y-1">
                          <span className="font-bold text-slate-800 block">{phar.pharmacyName}</span>
                          <span className="text-[10px] text-slate-700 block font-medium">{phar.address}</span>
                          <span className="text-[9px] text-slate-500 block">Coords: {phar.latitude}, {phar.longitude}</span>
                        </td>
                        <td className="p-4 space-y-1">
                          <span className="font-semibold text-slate-700 block">{phar.ownerName}</span>
                          <span className="text-[10px] text-slate-500 block">{phar.contactNumber}</span>
                        </td>
                        <td className="p-4 space-y-2">
                          <span className="font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            No: {phar.licenseNumber}
                          </span>
                          <a
                            href={`http://localhost:5000${phar.licenseFilePath}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-800 hover:text-red-600 font-bold block flex items-center gap-1 mt-1 hover:underline cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" /> View Uploaded License Copy
                          </a>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            phar.verificationStatus === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : phar.verificationStatus === 'rejected'
                              ? 'bg-rose-50 text-rose-705 border-rose-200'
                              : 'bg-amber-50 text-amber-850 border-amber-200'
                          }`}>
                            {phar.verificationStatus}
                          </span>
                        </td>
                        <td className="p-4">
                          {phar.verificationStatus === 'pending' ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleVerifyPharmacy(phar._id, 'approved')}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer transition-all hover:scale-[1.02]"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleVerifyPharmacy(phar._id, 'rejected')}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer transition-all hover:scale-[1.02]"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <div className="text-center text-slate-400 italic text-[10px]">
                              Verified
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-500 text-xs italic bg-slate-55 border border-slate-200 rounded-xl">
                No registered pharmacies onboarding requests found.
              </div>
            )}
          </div>
        )}

        {/* PANEL 2: MASTER MEDICINE BUILDER */}
        {activeTab === 'medicines' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Form to add medicine */}
            <div className="lg:col-span-1">
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Plus className="text-red-650 h-5 w-5" /> Master Medicine Builder
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Onboard rare disease medicines into the locator database.</p>
                </div>

                <form onSubmit={handleAddMedicineSubmit} className="space-y-4">
                  {/* Medicine Name */}
                  <div>
                    <label className="block text-slate-650 text-[10px] font-semibold uppercase tracking-wider mb-2">
                      Medicine Name
                    </label>
                    <input
                      type="text"
                      value={medName}
                      onChange={(e) => setMedName(e.target.value)}
                      placeholder="e.g. Nusinersen"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-xs"
                      required
                    />
                  </div>

                  {/* Generic Name */}
                  <div>
                    <label className="block text-slate-655 text-[10px] font-semibold uppercase tracking-wider mb-2">
                      Generic Salt Name
                    </label>
                    <input
                      type="text"
                      value={medGenericName}
                      onChange={(e) => setMedGenericName(e.target.value)}
                      placeholder="e.g. Nusinersen Sodium"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-xs"
                      required
                    />
                  </div>

                  {/* Disease */}
                  <div>
                    <label className="block text-slate-655 text-[10px] font-semibold uppercase tracking-wider mb-2">
                      Disease / Medical Indication
                    </label>
                    <input
                      type="text"
                      value={medDisease}
                      onChange={(e) => setMedDisease(e.target.value)}
                      placeholder="e.g. Spinal Muscular Atrophy"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-xs"
                      required
                    />
                  </div>

                  {/* Manufacturer */}
                  <div>
                    <label className="block text-slate-655 text-[10px] font-semibold uppercase tracking-wider mb-2">
                      Manufacturer
                    </label>
                    <input
                      type="text"
                      value={medManufacturer}
                      onChange={(e) => setMedManufacturer(e.target.value)}
                      placeholder="e.g. Biogen Inc."
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-xs"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-slate-655 text-[10px] font-semibold uppercase tracking-wider mb-2">
                      Medicine Description
                    </label>
                    <textarea
                      rows="3"
                      value={medDescription}
                      onChange={(e) => setMedDescription(e.target.value)}
                      placeholder="Explain indications, dosage formats, safety specifications..."
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-xs"
                      required
                    ></textarea>
                  </div>

                  {/* Image URL */}
                  <div>
                    <label className="block text-slate-655 text-[10px] font-semibold uppercase tracking-wider mb-2">
                      Generic Image URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={medImage}
                      onChange={(e) => setMedImage(e.target.value)}
                      placeholder="e.g. https://example.com/nusinersen.jpg"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={addingMedicine}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md transition-all hover:scale-[1.01] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {addingMedicine ? 'Adding Medicine...' : 'Add Medicine to catalog'}
                  </button>
                </form>
              </div>
            </div>

            {/* List of existing medicines */}
            <div className="lg:col-span-2">
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Activity className="text-red-650 h-5 w-5" /> Master Medicine Database
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Catalog index of all rare disease medicines currently supported.</p>
                  </div>
                  <button
                    onClick={fetchData}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-850 rounded-lg transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-slate-500 text-xs">Loading medicines catalog...</div>
                ) : medicines.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-1">
                    {medicines.map((med) => (
                      <div key={med._id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between">
                            <h4 className="font-bold text-slate-800 text-sm">{med.name}</h4>
                            <span className="text-[9px] bg-red-50 text-red-650 border border-red-150 px-2 py-0.5 rounded-full font-bold">
                              Rare File
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 italic block mt-0.5">{med.genericName}</span>
                          
                          <div className="space-y-2 mt-3.5 text-xs text-slate-600 border-t border-slate-200/60 pt-3">
                            <div>
                              <span className="text-slate-400 text-[9px] uppercase block">Disease Target</span>
                              <span className="font-semibold text-slate-700">{med.disease}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[9px] uppercase block">Manufacturer</span>
                              <span className="font-semibold text-slate-700">{med.manufacturer}</span>
                            </div>
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-505 leading-relaxed border-t border-slate-200/60 pt-3 mt-3">
                          {med.description.length > 100 ? `${med.description.substring(0, 100)}...` : med.description}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-slate-500 text-xs italic bg-slate-50 border border-slate-200 rounded-xl">
                    No medicines currently in catalog database. Use the builder on the left to add items.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* PANEL 3: GLOBAL PATIENT DEMANDS MONITOR */}
        {activeTab === 'requests' && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <ClipboardList className="text-red-650 h-5 w-5" /> Global Patient Demand Logs
                </h3>
                <p className="text-xs text-slate-500 mt-1">Audit log of all medicines requested by patients, including status & pharmacy responses.</p>
              </div>
              <button
                onClick={fetchData}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-850 rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-505 text-xs">Loading demand logs...</div>
            ) : requests.length > 0 ? (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <th className="p-4 font-semibold">Medicine Demanded</th>
                      <th className="p-4 font-semibold">Patient Owner</th>
                      <th className="p-4 font-semibold">Request Date</th>
                      <th className="p-4 font-semibold">Responses</th>
                      <th className="p-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {requests.map((req) => (
                      <tr key={req._id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <span className="font-bold text-red-650 block">
                            {req.medicine ? req.medicine.name : req.customMedicineName}
                          </span>
                          {req.medicine && (
                            <span className="text-[10px] text-slate-400 italic block">{req.medicine.genericName}</span>
                          )}
                        </td>
                        <td className="p-4 space-y-0.5">
                          <span className="font-bold text-slate-800 block">{req.user?.name}</span>
                          <span className="text-[10px] text-slate-500 block">Phone: {req.user?.phone}</span>
                        </td>
                        <td className="p-4 text-slate-605">
                          {new Date(req.requestDate).toLocaleDateString()}
                        </td>
                        <td className="p-4 space-y-1">
                          {req.responses.length > 0 ? (
                            <div className="space-y-1 max-h-20 overflow-y-auto">
                              {req.responses.map((res, index) => (
                                <span key={index} className="block text-[10px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                  {res.pharmacy?.pharmacyName}: <b className="text-red-650">{res.status}</b>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No pharmacy responses</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-650 border border-red-200 capitalize">
                            {req.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-500 text-xs italic bg-slate-50 border border-slate-200 rounded-xl">
                No global patient requests logged.
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
};

export default AdminDashboard;
