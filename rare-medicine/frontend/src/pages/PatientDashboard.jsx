import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import MapView from '../components/MapView';
import { Search, MapPin, Phone, MessageSquare, Plus, AlertCircle, FileText, CheckCircle2, RefreshCw, X, ShoppingBag, Heart } from 'lucide-react';

const lookupPincode = (pincode) => {
  const mapping = {
    '500001': { latitude: 17.3850, longitude: 78.4867 }, // Abids / Default Hyderabad
    '500002': { latitude: 17.3616, longitude: 78.4747 }, // Charminar
    '500003': { latitude: 17.4399, longitude: 78.4983 }, // Secunderabad
    '500004': { latitude: 17.4124, longitude: 78.4616 }, // Khairatabad
    '500008': { latitude: 17.3833, longitude: 78.4011 }, // Golconda
    '500016': { latitude: 17.4448, longitude: 78.4735 }, // Begumpet
    '500018': { latitude: 17.4560, longitude: 78.4430 }, // Sanathnagar
    '500019': { latitude: 17.4933, longitude: 78.3989 }, // Kukatpally
    '500028': { latitude: 17.3917, longitude: 78.4439 }, // Mehdipatnam
    '500030': { latitude: 17.3191, longitude: 78.4024 }, // Rajendranagar
    '500032': { latitude: 17.4401, longitude: 78.3489 }, // Gachibowli
    '500034': { latitude: 17.4165, longitude: 78.4436 }, // Banjara Hills
    '500072': { latitude: 17.4833, longitude: 78.3867 }, // KPHB Colony
    '500081': { latitude: 17.4483, longitude: 78.3741 }, // Madhapur
    '500082': { latitude: 17.4300, longitude: 78.4100 }, // Jubilee Hills
    '500090': { latitude: 17.5186, longitude: 78.3845 }, // Nizampet
  };

  if (mapping[pincode]) {
    return mapping[pincode];
  }

  const pinNum = parseInt(pincode) || 500001;
  const seed = pinNum % 100;
  const latOffset = (seed - 50) * 0.0015;
  const lngOffset = ((pinNum % 7) - 3) * 0.0015;

  return {
    latitude: (17.3850 + latOffset).toFixed(6),
    longitude: (78.4867 + lngOffset).toFixed(6)
  };
};

const PatientDashboard = () => {
  const { user } = useAuth();
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // PIN Code search states
  const [searchPincode, setSearchPincode] = useState('500001');
  const [searchLat, setSearchLat] = useState(17.3850);
  const [searchLng, setSearchLng] = useState(78.4867);
  const [focusLocation, setFocusLocation] = useState(null);

  // Sync with user details when loaded
  useEffect(() => {
    if (user) {
      setSearchPincode(user.pincode || '500001');
      setSearchLat(user.latitude || 17.3850);
      setSearchLng(user.longitude || 78.4867);
    }
  }, [user]);
  
  // Stock / Map state
  const [pharmaciesWithStock, setPharmaciesWithStock] = useState([]);
  const [selectedStockItem, setSelectedStockItem] = useState(null); // For detail modal
  const [loadingStock, setLoadingStock] = useState(false);

  // Request state
  const [myRequests, setMyRequests] = useState([]);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [customMedicineRequestName, setCustomMedicineRequestName] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Toast state
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 5000);
  };

  // On mount: fetch patient request history
  useEffect(() => {
    fetchMyRequests();
  }, []);

  const fetchMyRequests = async () => {
    try {
      const response = await api.get('/requests/my-requests');
      setMyRequests(response.data);
    } catch (err) {
      console.error('Error fetching requests:', err);
    }
  };

  // Search logic
  const handleSearchChange = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await api.get(`/medicines/search?q=${query}`);
      setSearchResults(response.data);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const handlePincodeChange = async (e) => {
    const value = e.target.value;
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setSearchPincode(cleaned);

    if (cleaned.length === 6) {
      const coords = lookupPincode(cleaned);
      const newLat = parseFloat(coords.latitude);
      const newLng = parseFloat(coords.longitude);
      setSearchLat(newLat);
      setSearchLng(newLng);

      if (selectedMedicine) {
        setLoadingStock(true);
        try {
          const response = await api.get(
            `/inventory/search?medicineId=${selectedMedicine._id}&userLat=${newLat}&userLng=${newLng}`
          );
          setPharmaciesWithStock(response.data);
        } catch (err) {
          console.error('Stock search error:', err);
        } finally {
          setLoadingStock(false);
        }
      }
    }
  };

  const handleSelectMedicine = async (medicine) => {
    setSelectedMedicine(medicine);
    setSearchQuery(medicine.name);
    setSearchResults([]);
    setHasSearched(true);
    setLoadingStock(true);
    
    // Save to user search history
    try {
      await api.post('/auth/history', { query: medicine.name });
    } catch (err) {
      console.error('History save error:', err);
    }

    // Search inventory holding stock
    try {
      const response = await api.get(
        `/inventory/search?medicineId=${medicine._id}&userLat=${searchLat}&userLng=${searchLng}`
      );
      setPharmaciesWithStock(response.data);
    } catch (err) {
      console.error('Stock search error:', err);
    } finally {
      setLoadingStock(false);
    }
  };

  // Handle request submission for selected medicine (out of stock) or custom name
  const handleCreateRequest = async (e) => {
    if (e) e.preventDefault();
    setSubmittingRequest(true);

    try {
      const payload = {};
      if (selectedMedicine) {
        payload.medicineId = selectedMedicine._id;
      } else {
        payload.customMedicineName = customMedicineRequestName;
      }

      await api.post('/requests', payload);
      showToast('Your medicine request has been logged successfully. Verified pharmacies in your region will be notified!', 'success');
      setCustomMedicineRequestName('');
      setShowRequestModal(false);
      fetchMyRequests();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit request', 'error');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const openStockModal = (stockItem) => {
    setSelectedStockItem(stockItem);
  };

  const closeStockModal = () => {
    setSelectedStockItem(null);
  };

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
      
      {/* Search Header Banner */}
      <div id="search-header" className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-red-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-xl">
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight mb-2">Find Rare Medicines</h2>
          <p className="text-slate-700 text-sm mb-6">Type medicine name, generic salt name, or associated disease target to locate stock nearest to you.</p>
          
          {/* Search & PIN Code Grid */}
          <div className="flex flex-col sm:flex-row gap-4 items-stretch">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search Nusinersen, Spinal Muscular Atrophy..."
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none rounded-2xl text-slate-800 placeholder-slate-400 text-sm shadow-sm transition-all"
              />

              {/* Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 mt-2 rounded-xl bg-white border border-slate-200 shadow-xl max-h-60 overflow-y-auto z-50">
                  {searchResults.map((med) => (
                    <button
                      key={med._id}
                      onClick={() => handleSelectMedicine(med)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 flex flex-col cursor-pointer transition-colors"
                    >
                      <span className="text-sm font-bold text-slate-800">{med.name}</span>
                      <span className="text-xs text-slate-700">
                        {med.genericName} • Target: <span className="text-red-600 font-semibold">{med.disease}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* PIN Code Box */}
            <div className="relative w-full sm:w-48">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={searchPincode}
                onChange={handlePincodeChange}
                placeholder="PIN Code"
                maxLength={6}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none rounded-2xl text-slate-800 placeholder-slate-400 text-sm shadow-sm transition-all font-semibold"
              />
            </div>
          </div>
          
          {/* Fast Request shortcut */}
          <div className="mt-4 flex items-center space-x-2 text-xs">
            <span className="text-slate-700 font-medium">Can't find your medicine?</span>
            <button
              onClick={() => {
                setSelectedMedicine(null);
                setCustomMedicineRequestName('');
                setShowRequestModal(true);
              }}
              className="text-slate-800 hover:text-red-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Create custom request
            </button>
          </div>
        </div>
      </div>

      {/* Main Results View */}
      {hasSearched && selectedMedicine && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-800">
              Available Stock for <span className="text-red-600">{selectedMedicine.name}</span>
            </h3>
            <span className="text-xs text-slate-500">Found {pharmaciesWithStock.length} pharmacies nearby</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Medicine product cards grid */}
            <div className="lg:col-span-2">
              {loadingStock ? (
                <div className="py-20 text-center text-slate-500 text-sm flex flex-col items-center justify-center gap-3 bg-white border border-slate-200 rounded-2xl">
                  <RefreshCw className="h-6 w-6 animate-spin text-red-600" />
                  <span>Locating stock at nearby pharmacies...</span>
                </div>
              ) : pharmaciesWithStock.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {pharmaciesWithStock.map((item) => {
                    const imageUrl = item.medicineImage 
                      ? `http://localhost:5000${item.medicineImage}`
                      : selectedMedicine.image || '/dummy-image.png';

                    return (
                      <div
                        key={item._id}
                        className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between relative group"
                      >
                        {/* Wishlist Heart Icon */}
                        <button className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors z-20 cursor-pointer">
                          <Heart className="h-4.5 w-4.5 hover:fill-red-600" />
                        </button>

                        <div>
                          {/* Medicine Photo Container */}
                          <div className="flex items-center justify-center h-44 bg-slate-50 rounded-xl mb-4 overflow-hidden relative">
                            <img
                              src={imageUrl}
                              alt={selectedMedicine.name}
                              className="object-contain max-h-36 max-w-full p-2 group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/dummy-image.png';
                              }}
                            />
                            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-red-600 text-[10px] font-semibold text-white">
                              Rare
                            </span>
                          </div>

                          {/* Manufacturer Info */}
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-1">
                            {selectedMedicine.manufacturer}
                          </span>

                          {/* Medicine Name */}
                          <h4 className="text-base font-bold text-slate-800 uppercase tracking-tight mb-1 line-clamp-1">
                            {selectedMedicine.name}
                          </h4>

                          {/* Generic Salt Name / disease */}
                          <p className="text-xs text-slate-700 mb-3 line-clamp-1">
                            {selectedMedicine.genericName} • {selectedMedicine.disease}
                          </p>

                          {/* Seller / Pharmacy info */}
                          <div className="text-[11px] text-slate-700 mb-4 border-t border-slate-100 pt-3">
                            <span className="font-semibold text-slate-800 block">Seller: {item.pharmacy.pharmacyName}</span>
                            <span className="text-slate-600 font-medium">{item.distance !== null ? `${item.distance} km away` : item.pharmacy.address}</span>
                          </div>
                        </div>

                        <div>
                          {/* Pricing details */}
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-red-650 font-extrabold text-lg">₹{item.price}</span>
                            <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                              Qty: {item.quantity}
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => openStockModal(item)}
                              className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <FileText className="h-3.5 w-3.5 text-slate-500" /> Details
                            </button>
                            <button
                              onClick={() => {
                                setFocusLocation({
                                  lat: item.pharmacy.latitude,
                                  lng: item.pharmacy.longitude,
                                  id: item.pharmacy._id
                                });
                                const mapEl = document.getElementById('map-view-container');
                                if (mapEl) {
                                  mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                              }}
                              className="py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all hover:shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <MapPin className="h-3.5 w-3.5" /> Locate in Map
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
                  <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                  <h4 className="font-bold text-slate-800 text-base mb-1">Out of Stock</h4>
                  <p className="text-xs text-slate-550 mb-6">This medication is currently unavailable at all registered pharmacies.</p>
                  <button
                    onClick={() => {
                      setCustomMedicineRequestName('');
                      setShowRequestModal(true);
                    }}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
                  >
                    Create Digital Demand Request
                  </button>
                </div>
              )}
            </div>

            {/* Right Column: Map displaying approved pharmacy coordinates */}
            <div id="map-view-container" className="lg:col-span-1 h-[400px] lg:h-auto">
              <MapView
                pharmacies={pharmaciesWithStock}
                userLocation={{ lat: searchLat, lng: searchLng }}
                onSelectPharmacy={openStockModal}
                focusLocation={focusLocation}
              />
            </div>
          </div>
        </div>
      )}

      {/* Requests History List */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Your Medicine Requests</h3>
            <p className="text-xs text-slate-700 mt-1">Track medicine demand logs and pharmacy responses.</p>
          </div>
          <button
            onClick={fetchMyRequests}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Refresh History"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {myRequests.length > 0 ? (
          <div className="space-y-4">
            {myRequests.map((req) => (
              <div key={req._id} className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-250 pb-3">
                  <div>
                    <h4 
                      onClick={() => {
                        if (req.medicine) {
                          handleSelectMedicine(req.medicine);
                          const searchSection = document.getElementById('search-header');
                          if (searchSection) {
                            searchSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        } else {
                          setSearchQuery(req.customMedicineName);
                          showToast(`Searching stock for "${req.customMedicineName}"...`, 'success');
                          api.get(`/medicines/search?q=${req.customMedicineName}`).then(res => {
                            if (res.data.length > 0) {
                              handleSelectMedicine(res.data[0]);
                              const searchSection = document.getElementById('search-header');
                              if (searchSection) {
                                searchSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }
                            } else {
                              showToast(`No pharmacy has registered "${req.customMedicineName}" in their stock catalog yet.`, 'error');
                            }
                          }).catch(err => {
                            console.error(err);
                            showToast('Failed to execute search', 'error');
                          });
                        }
                      }}
                      className="text-sm font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer transition-all inline-block"
                      title="Click to locate this medicine on map & check stock"
                    >
                      {req.medicine ? req.medicine.name : req.customMedicineName}
                    </h4>
                    <span className="text-[10px] text-slate-600 font-medium">
                      Submitted on: {new Date(req.requestDate).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200 capitalize">
                      {req.status}
                    </span>
                  </div>
                </div>

                {/* Responses Panel */}
                <div className="space-y-2">
                  <h5 className="text-xs font-semibold text-slate-800">Pharmacy Feedback ({req.responses.length})</h5>
                  
                  {req.responses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {req.responses.map((res) => (
                        <div key={res._id} className="p-3.5 rounded-lg bg-white border border-slate-200 flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-800 block">
                              {res.pharmacy.pharmacyName}
                            </span>
                            <span className={`inline-flex px-2 py-0.25 rounded-full text-[9px] font-semibold ${
                              res.status === 'In Stock'
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                : res.status === 'Available Soon'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-red-50 text-red-600 border border-red-200'
                            }`}>
                              {res.status}
                            </span>
                            {res.message && (
                              <p className="text-[11px] text-slate-700 italic mt-1">"{res.message}"</p>
                            )}
                            <div className="flex items-center text-[10px] text-slate-700 gap-1.5 mt-2 pt-2 border-t border-slate-100">
                              <Phone className="h-3 w-3 text-slate-500" />
                              <span>{res.pharmacy.contactNumber}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 italic">Waiting for replies from registered pharmacies...</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-700 text-xs italic bg-slate-50 border border-slate-200 rounded-xl">
            No medicine requests filed yet.
          </div>
        )}
      </div>

      {/* DETAIL MODAL: Selected Stock Pharmacy details, medicine image, license verification */}
      {selectedStockItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={closeStockModal}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-800 rounded-full bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <ShoppingBag className="text-red-600 h-5.5 w-5.5" /> Medicine Stock Details
              </h3>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[80vh] overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left Side: Medicine details and uploaded stock photo */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-bold text-slate-800">{selectedStockItem.medicine.name}</h4>
                    <span className="text-xs text-red-600 font-semibold">{selectedStockItem.medicine.genericName}</span>
                  </div>

                  {/* Specific Uploaded Image */}
                  <div className="aspect-video w-full rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center relative">
                    {selectedStockItem.medicineImage ? (
                      <img
                        src={`http://localhost:5000${selectedStockItem.medicineImage}`}
                        alt={selectedStockItem.medicine.name}
                        className="w-full h-full object-contain p-2"
                      />
                    ) : selectedStockItem.medicine.image ? (
                      <img
                        src={selectedStockItem.medicine.image}
                        alt={selectedStockItem.medicine.name}
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <div className="text-center p-4 text-slate-400 flex flex-col items-center">
                        <FileText className="h-10 w-10 text-slate-305 mb-2" />
                        <span className="text-xs font-semibold">No stock photo uploaded</span>
                        <span className="text-[10px] text-slate-400 mt-1">Generic image not available</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 text-[10px] block mb-1">Indications & Diseases</span>
                    <p className="text-xs text-slate-700 leading-relaxed font-semibold">{selectedStockItem.medicine.disease}</p>
                    <span className="text-slate-500 text-[10px] block mt-3 mb-1">Manufacturer</span>
                    <p className="text-xs text-slate-700">{selectedStockItem.medicine.manufacturer}</p>
                    <span className="text-slate-500 text-[10px] block mt-3 mb-1">Product Description</span>
                    <p className="text-xs text-slate-600 leading-relaxed">{selectedStockItem.medicine.description}</p>
                  </div>
                </div>

                {/* Right Side: Pharmacy verification status, Contact details and Drug License details */}
                <div className="space-y-5">
                  <div className="p-5 rounded-2xl bg-red-50 border border-red-100/60 space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Pharmacy Provider</h4>
                    <div className="space-y-2">
                      <span className="text-base font-extrabold text-red-600 block">{selectedStockItem.pharmacy.pharmacyName}</span>
                      <p className="text-xs text-slate-600 leading-relaxed">{selectedStockItem.pharmacy.address}</p>
                      
                      <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-200/60">
                        <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                        <span>Phone: <b>{selectedStockItem.pharmacy.contactNumber}</b></span>
                      </div>
                    </div>
                  </div>

                  {/* Drug License Details Section */}
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-red-600" /> Drug License Verification
                    </h5>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 block">Owner Name</span>
                        <span className="font-semibold text-slate-700">{selectedStockItem.pharmacy.ownerName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">License No</span>
                        <span className="font-semibold text-slate-700">{selectedStockItem.pharmacy.licenseNumber}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 mt-3">
                      <a
                        href={`http://localhost:5000${selectedStockItem.pharmacy.licenseFilePath}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 border border-slate-200 hover:border-slate-300 bg-white text-slate-600 hover:text-red-600 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                      >
                        <FileText className="h-3.5 w-3.5" /> View Uploaded License Copy
                      </a>
                    </div>
                  </div>

                  {/* Specific Stock pricing */}
                  <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Pricing</span>
                      <span className="text-2xl font-extrabold text-red-600">₹{selectedStockItem.price.toFixed(2)}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Stock Level</span>
                      <span className="text-sm font-bold text-slate-700">{selectedStockItem.quantity} units available</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* REQUEST CREATION MODAL */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setShowRequestModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-800 rounded-full bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <form onSubmit={handleCreateRequest}>
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-800">Request Rare Medicine</h3>
                <p className="text-xs text-slate-500 mt-1">Submit demand log so pharmacies can coordinate stock.</p>
              </div>

              <div className="p-6 space-y-4">
                {selectedMedicine ? (
                  <div>
                    <span className="text-slate-500 text-xs block mb-1">Selected Medicine</span>
                    <span className="text-sm font-bold text-red-600">{selectedMedicine.name}</span>
                    <span className="text-xs text-slate-550 block italic">{selectedMedicine.genericName}</span>
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-650 text-xs font-semibold uppercase tracking-wider mb-2">
                      Enter Medicine Name
                    </label>
                    <input
                      type="text"
                      value={customMedicineRequestName}
                      onChange={(e) => setCustomMedicineRequestName(e.target.value)}
                      placeholder="e.g. Nusinersen 12mg Injection"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-sm"
                      required
                    />
                  </div>
                )}

                <div className="p-3.5 rounded-lg bg-red-50 border border-red-100/60 text-[11px] text-slate-600 leading-relaxed flex items-start gap-2">
                  <AlertCircle className="h-4.5 w-4.5 text-red-600 shrink-0 mt-0.5" />
                  <span>By submitting, all verified pharmacies in your distance radius will see this request and can respond with arrival dates, availability, and pricing details.</span>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:border-slate-350 bg-white text-slate-500 hover:text-slate-800 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  {submittingRequest ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PatientDashboard;
