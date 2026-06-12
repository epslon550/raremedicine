import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Layers, Plus, Trash2, ClipboardList, Clock, CheckCircle, ShieldAlert, Phone, MapPin, Upload, RefreshCw, X, Loader2 } from 'lucide-react';

const PharmacyDashboard = () => {
  const { user, refreshProfile } = useAuth();
  
  // Stock Inventory state
  const [stockList, setStockList] = useState([]);
  const [masterMedicines, setMasterMedicines] = useState([]);
  const [loadingStock, setLoadingStock] = useState(false);
  
  // Form states
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [medicineImage, setMedicineImage] = useState(null);
  const [addingStock, setAddingStock] = useState(false);

  // New Medicine Custom Fields state
  const [customMedicineName, setCustomMedicineName] = useState('');
  const [customGenericName, setCustomGenericName] = useState('');
  const [customManufacturer, setCustomManufacturer] = useState('');
  const [customDisease, setCustomDisease] = useState('');
  const [customDescription, setCustomDescription] = useState('');

  // Incoming Requests state
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null); // For reply modal
  const [replyStatus, setReplyStatus] = useState('Available Soon');
  const [replyMessage, setReplyMessage] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 5000);
  };

  useEffect(() => {
    refreshProfile(); // Check latest verification status
    fetchStock();
    fetchMasterMedicines();
    fetchPendingRequests();
  }, []);

  useEffect(() => {
    if (user?.pharmacy?._id) {
      fetchPendingRequests();
    }
  }, [user]);

  const fetchStock = async () => {
    setLoadingStock(true);
    try {
      const response = await api.get('/inventory/my-stock');
      setStockList(response.data);
    } catch (err) {
      console.error('Error fetching stock:', err);
    } finally {
      setLoadingStock(false);
    }
  };

  const fetchMasterMedicines = async () => {
    try {
      const response = await api.get('/medicines');
      setMasterMedicines(response.data);
    } catch (err) {
      console.error('Error fetching master medicines:', err);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const response = await api.get('/requests/pending');
      const myPharId = user?.pharmacy?._id;
      const filtered = response.data.filter((req) => {
        if (!myPharId) return true;
        const hasResponded = req.responses.some(
          (res) => (res.pharmacy?._id || res.pharmacy)?.toString() === myPharId.toString()
        );
        return !hasResponded;
      });
      setPendingRequests(filtered);
    } catch (err) {
      console.error('Error fetching requests:', err);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setMedicineImage(e.target.files[0]);
    }
  };

  const handleAddStockSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMedicineId || !quantity || !price) {
      showToast('Please fill in all stock details', 'error');
      return;
    }

    if (selectedMedicineId === 'new') {
      if (!customMedicineName || !customGenericName || !customManufacturer || !customDisease || !customDescription) {
        showToast('Please fill in all details for the new medicine', 'error');
        return;
      }
    }

    setAddingStock(true);

    const formData = new FormData();
    formData.append('medicineId', selectedMedicineId);
    formData.append('quantity', quantity);
    formData.append('price', price);
    if (medicineImage) {
      formData.append('medicineImage', medicineImage);
    }

    if (selectedMedicineId === 'new') {
      formData.append('name', customMedicineName);
      formData.append('genericName', customGenericName);
      formData.append('manufacturer', customManufacturer);
      formData.append('disease', customDisease);
      formData.append('description', customDescription);
    }

    try {
      await api.post('/inventory', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      showToast('Inventory stock updated successfully!', 'success');
      setSelectedMedicineId('');
      setQuantity('');
      setPrice('');
      setMedicineImage(null);
      setCustomMedicineName('');
      setCustomGenericName('');
      setCustomManufacturer('');
      setCustomDisease('');
      setCustomDescription('');
      
      // Reset input element manually if needed
      const fileInput = document.getElementById('stock-file-input');
      if (fileInput) fileInput.value = '';

      fetchStock();
      fetchMasterMedicines();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update stock', 'error');
    } finally {
      setAddingStock(false);
    }
  };

  const handleDeleteStock = async (stockId) => {
    try {
      await api.delete(`/inventory/${stockId}`);
      showToast('Inventory stock removed successfully!', 'success');
      fetchStock();
    } catch (err) {
      showToast('Failed to delete inventory item', 'error');
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    setSubmittingReply(true);

    try {
      await api.post(`/requests/${selectedRequest._id}/respond`, {
        status: replyStatus,
        message: replyMessage
      });
      showToast('Response successfully sent to the patient!', 'success');
      setSelectedRequest(null);
      setReplyMessage('');
      fetchPendingRequests();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit response', 'error');
    } finally {
      setSubmittingReply(false);
    }
  };

  const isApproved = user?.pharmacy?.verificationStatus === 'approved';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 relative z-10 bg-slate-50">
      
      {/* Toast Banner */}
      {toast.message && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-lg transition-all max-w-sm animate-in fade-in slide-in-from-top-5 duration-300 ${
          toast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200 shadow-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-emerald-100'
        }`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast({ message: '', type: '' })} className="text-slate-400 hover:text-slate-600 font-bold ml-4 cursor-pointer">✕</button>
        </div>
      )}
      
      {/* Verification Status Banner */}
      {!isApproved && (
        <div className={`p-6 rounded-2xl border flex items-start gap-4 shadow-sm ${
          user?.pharmacy?.verificationStatus === 'rejected'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          {user?.pharmacy?.verificationStatus === 'rejected' ? (
            <ShieldAlert className="h-8 w-8 text-rose-600 shrink-0" />
          ) : (
            <Clock className="h-8 w-8 text-amber-500 shrink-0" />
          )}
          
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-base">
              {user?.pharmacy?.verificationStatus === 'rejected'
                ? 'Onboarding Application Rejected'
                : 'Onboarding Application Pending Verification'}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {user?.pharmacy?.verificationStatus === 'rejected'
                ? 'Your drug license copy was rejected by the administrator. Please contact admin@raremed.com to re-verify details.'
                : `Your drug license number (${user?.pharmacy?.licenseNumber}) is currently being reviewed by the administrator. You will be able to add medicine stock and reply to patient requests once approved.`}
            </p>
          </div>
        </div>
      )}

      {isApproved && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Side: Onboard Stock Form */}
          <div className="lg:col-span-1">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Plus className="text-red-600 h-5 w-5" /> Add Stock to Inventory
                </h3>
                <p className="text-xs text-slate-500 mt-1">Select from the master medicine catalog to list your stock availability.</p>
              </div>

              <form onSubmit={handleAddStockSubmit} className="space-y-4">
                {/* Select Medicine */}
                <div>
                  <label className="block text-slate-500 text-[10px] font-semibold uppercase tracking-wider mb-2">
                    Select Rare Medicine
                  </label>
                  <select
                    value={selectedMedicineId}
                    onChange={(e) => setSelectedMedicineId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    required
                  >
                    <option value="">-- Choose Rare Medicine --</option>
                    {masterMedicines.map((med) => (
                      <option key={med._id} value={med._id}>
                        {med.name} ({med.genericName})
                      </option>
                    ))}
                    <option value="new">+ Add & Register New Medicine</option>
                  </select>
                </div>

                {selectedMedicineId === 'new' && (
                  <div className="space-y-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in slide-in-from-top-1 duration-200">
                    <h4 className="text-xs font-bold text-slate-700">Register New Medicine Details</h4>
                    
                    <div>
                      <label className="block text-slate-500 text-[9px] font-semibold uppercase tracking-wider mb-1">
                        Medicine Name
                      </label>
                      <input
                        type="text"
                        value={customMedicineName}
                        onChange={(e) => setCustomMedicineName(e.target.value)}
                        placeholder="e.g. Nusinersen 12mg Injection"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-red-500"
                        required={selectedMedicineId === 'new'}
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 text-[9px] font-semibold uppercase tracking-wider mb-1">
                        Generic Salt Name
                      </label>
                      <input
                        type="text"
                        value={customGenericName}
                        onChange={(e) => setCustomGenericName(e.target.value)}
                        placeholder="e.g. Nusinersen"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-red-500"
                        required={selectedMedicineId === 'new'}
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 text-[9px] font-semibold uppercase tracking-wider mb-1">
                        Manufacturer
                      </label>
                      <input
                        type="text"
                        value={customManufacturer}
                        onChange={(e) => setCustomManufacturer(e.target.value)}
                        placeholder="e.g. Biogen Inc."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-red-500"
                        required={selectedMedicineId === 'new'}
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 text-[9px] font-semibold uppercase tracking-wider mb-1">
                        Target Disease
                      </label>
                      <input
                        type="text"
                        value={customDisease}
                        onChange={(e) => setCustomDisease(e.target.value)}
                        placeholder="e.g. Spinal Muscular Atrophy (SMA)"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-red-500"
                        required={selectedMedicineId === 'new'}
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 text-[9px] font-semibold uppercase tracking-wider mb-1">
                        Description / Indications
                      </label>
                      <textarea
                        value={customDescription}
                        onChange={(e) => setCustomDescription(e.target.value)}
                        placeholder="Provide details about prescription requirements, temperature storage, dosage form, etc."
                        rows={2}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-red-500 resize-none"
                        required={selectedMedicineId === 'new'}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {/* Quantity */}
                  <div>
                    <label className="block text-slate-500 text-[10px] font-semibold uppercase tracking-wider mb-2">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="e.g. 5"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-xs"
                      required
                    />
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-slate-500 text-[10px] font-semibold uppercase tracking-wider mb-2">
                      Price (INR)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-xs"
                      required
                    />
                  </div>
                </div>

                {/* Medicine Stock Image Upload */}
                <div>
                  <label className="block text-slate-500 text-[10px] font-semibold uppercase tracking-wider mb-2">
                    Upload Stock Image (Optional)
                  </label>
                  <div className="relative border border-dashed border-slate-300 rounded-xl p-3 bg-slate-50 text-center hover:bg-slate-100 transition-all">
                    <input
                      id="stock-file-input"
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex items-center justify-center gap-2 text-slate-500 text-xs py-1">
                      <Upload className="h-4 w-4 text-red-600" />
                      <span>{medicineImage ? medicineImage.name : 'Select medicine photo...'}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={addingStock}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all hover:scale-[1.01] flex items-center justify-center gap-1.5"
                >
                  {addingStock ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving Stock...
                    </>
                  ) : (
                    <>
                      Save Stock Item
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Side: Stock listings table */}
          <div className="lg:col-span-2">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Layers className="text-red-600 h-5 w-5" /> Current Stock Catalog
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Medicines listed in your active inventory catalog.</p>
                </div>
                <button
                  onClick={fetchStock}
                  disabled={loadingStock}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingStock ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loadingStock ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Loading inventory details...
                </div>
              ) : stockList.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <th className="p-4 font-semibold">Medicine</th>
                        <th className="p-4 font-semibold">Disease</th>
                        <th className="p-4 font-semibold">Stock Photo</th>
                        <th className="p-4 font-semibold text-center">Qty</th>
                        <th className="p-4 font-semibold">Price</th>
                        <th className="p-4 font-semibold text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stockList.map((item) => (
                        <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4">
                            <span className="font-bold text-slate-800 block">{item.medicine?.name}</span>
                            <span className="text-[10px] text-slate-400 italic">{item.medicine?.genericName}</span>
                          </td>
                          <td className="p-4 text-slate-600">{item.medicine?.disease}</td>
                          <td className="p-4">
                            <div className="w-12 h-8 rounded border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                              {item.medicineImage ? (
                                <img
                                  src={`http://localhost:5000${item.medicineImage}`}
                                  alt={item.medicine?.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-[9px] text-slate-400 font-semibold uppercase">No photo</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-center font-bold">
                            <span className={`px-2 py-0.5 rounded-full ${item.quantity > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                              {item.quantity}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-slate-800">₹{item.price}</td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleDeleteStock(item._id)}
                              className="p-1.5 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                              title="Delete Stock"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10 text-slate-500 text-xs italic bg-slate-50 border border-slate-200 rounded-xl">
                  Inventory is empty. Use the form on the left to add rare medicine stock.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Patient Requests matching city / global pending */}
      {isApproved && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ClipboardList className="text-red-600 h-5 w-5" /> Incoming Patient Medicine Demands
              </h3>
              <p className="text-xs text-slate-500 mt-1">Locally logged medicine requests that are currently out of stock. Respond to notify patient.</p>
            </div>
            <button
              onClick={fetchPendingRequests}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {pendingRequests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingRequests.map((req) => {
                // Check if this pharmacy has already responded
                const myResponse = req.responses.find(
                  (res) => res.pharmacy && res.pharmacy.toString() === user?.pharmacy?._id
                );

                return (
                  <div key={req._id} className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-4">
                    <div className="space-y-3.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                            Medicine Requested
                          </span>
                          <h4 className="text-base font-extrabold text-slate-800 mt-1">
                            {req.medicine ? req.medicine.name : req.customMedicineName}
                          </h4>
                          {req.medicine && (
                            <span className="text-xs text-slate-500 block italic">{req.medicine.genericName}</span>
                          )}
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {new Date(req.requestDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs bg-white p-3 rounded-lg border border-slate-200">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase">Patient Name</span>
                          <span className="font-semibold text-slate-800">{req.user?.name}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase">Contact Details</span>
                          <span className="font-semibold text-slate-800">{req.user?.phone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                      {myResponse ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 text-xs">
                          <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
                          <span>Responded: <b>{myResponse.status}</b></span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-amber-700 font-semibold italic">Awaiting response</span>
                      )}

                      <button
                        onClick={() => setSelectedRequest(req)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all ${
                          myResponse
                            ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                            : 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/10'
                        }`}
                      >
                        {myResponse ? 'Update Response' : 'Respond'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-xs italic bg-slate-50 border border-slate-200 rounded-xl">
              No pending patient requests in the system.
            </div>
          )}
        </div>
      )}

      {/* REPLY MODAL */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setSelectedRequest(null)}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-800 rounded-full bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <form onSubmit={handleSendReply}>
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-800">Respond to Patient Demand</h3>
                <p className="text-xs text-slate-500 mt-1">Specify medicine arrival status so the patient is notified.</p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Medicine Requested</span>
                  <span className="text-sm font-bold text-slate-800 block mt-1">
                    {selectedRequest.medicine ? selectedRequest.medicine.name : selectedRequest.customMedicineName}
                  </span>
                </div>

                {/* Status Dropdown */}
                <div>
                  <label className="block text-slate-600 text-xs font-semibold uppercase tracking-wider mb-2">
                    Availability Status
                  </label>
                  <select
                    value={replyStatus}
                    onChange={(e) => setReplyStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    required
                  >
                    <option value="Available Soon">Available Soon (Within 2-3 Days)</option>
                    <option value="Currently Unavailable">Currently Unavailable</option>
                    <option value="In Stock">In Stock (Patient can pick up now)</option>
                  </select>
                </div>

                {/* Notes Message */}
                <div>
                  <label className="block text-slate-600 text-xs font-semibold uppercase tracking-wider mb-2">
                    Add Short Note / Custom Message
                  </label>
                  <textarea
                    rows="3"
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="e.g. Stock arriving on Monday. Price will be ₹5200. Please contact store to reserve."
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-xs"
                  ></textarea>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 border border-slate-200 bg-white text-slate-500 hover:text-slate-800 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReply}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  {submittingReply ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Sending...
                    </>
                  ) : (
                    'Send Response'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PharmacyDashboard;
