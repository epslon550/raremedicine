import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, ShieldCheck, Mail, Lock, Phone, MapPin, FileText, AlertTriangle, Loader2, Compass } from 'lucide-react';

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

  // Fallback: Generate deterministic offset from default Hyderabad coords based on pincode digits
  const pinNum = parseInt(pincode) || 500001;
  const seed = pinNum % 100;
  const latOffset = (seed - 50) * 0.0015;
  const lngOffset = ((pinNum % 7) - 3) * 0.0015;

  return {
    latitude: (17.3850 + latOffset).toFixed(6),
    longitude: (78.4867 + lngOffset).toFixed(6)
  };
};

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  // Role selection: 'patient' or 'pharmacy'
  const [role, setRole] = useState('patient');

  // Common Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [pincode, setPincode] = useState('500001'); // Default Abids
  const [latitude, setLatitude] = useState('17.3850'); // Default Hyderabad
  const [longitude, setLongitude] = useState('78.4867');

  // Pharmacy Specific Fields
  const [pharmacyName, setPharmacyName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [licenseFile, setLicenseFile] = useState(null);

  // States
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  const handlePincodeChange = (value) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setPincode(cleaned);

    if (cleaned.length === 6) {
      const coords = lookupPincode(cleaned);
      setLatitude(coords.latitude.toString());
      setLongitude(coords.longitude.toString());
    }
  };

  // Use browser geolocation to capture lat/lng
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLocating(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setPincode(''); // Clear pincode since GPS is used
        setLocating(false);
      },
      (err) => {
        console.error(err);
        setError('Failed to fetch location. Please enter a 6-digit PIN code.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setLicenseFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !phone) {
      setError('Please fill in all basic fields');
      return;
    }

    if (role === 'pharmacy') {
      if (!pharmacyName || !licenseNumber || !address || !licenseFile) {
        setError('Please fill in all pharmacy details and upload your medical license document');
        return;
      }
    }

    setLoading(true);

    // Prepare Multipart FormData
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('password', password);
    formData.append('phone', phone);
    formData.append('role', role);
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    formData.append('pincode', pincode);

    if (role === 'pharmacy') {
      formData.append('pharmacyName', pharmacyName);
      formData.append('licenseNumber', licenseNumber);
      formData.append('address', address);
      formData.append('contactNumber', contactNumber || phone);
      formData.append('licenseFile', licenseFile);
    }

    const result = await register(formData);

    if (result.success) {
      if (role === 'pharmacy') {
        navigate('/pharmacy-dashboard');
      } else {
        navigate('/patient-dashboard');
      }
    } else {
      setError(result.message || 'Registration failed. Check details.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 flex items-center justify-center px-4 relative z-10 bg-slate-50">
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-red-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-red-600/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-2xl p-8 rounded-2xl light-card shadow-lg relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Create Account</h2>
          <p className="text-slate-500 text-sm mt-2">Join as a patient to find medicines, or register your pharmacy store.</p>
        </div>

        {/* Role Switcher tabs */}
        <div className="flex p-1 rounded-xl bg-slate-100 border border-slate-200 mb-8 max-w-xs mx-auto">
          <button
            type="button"
            onClick={() => { setRole('patient'); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              role === 'patient' ? 'bg-red-600 text-white shadow' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="h-3.5 w-3.5" /> Patient
          </button>
          <button
            type="button"
            onClick={() => { setRole('pharmacy'); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              role === 'pharmacy' ? 'bg-red-600 text-white shadow' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Pharmacy
          </button>
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-3 mb-6 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Owner Name / Name */}
            <div>
              <label className="block text-slate-600 text-xs font-semibold uppercase tracking-wider mb-2">
                {role === 'pharmacy' ? 'Owner Full Name' : 'Full Name'}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={role === 'pharmacy' ? 'e.g. Dr. John Doe' : 'e.g. John Doe'}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-sm"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-slate-600 text-xs font-semibold uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-sm"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-slate-600 text-xs font-semibold uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-sm"
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-slate-600 text-xs font-semibold uppercase tracking-wider mb-2">
                Mobile Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-sm"
                  required
                />
              </div>
            </div>

            {/* PIN Code / Location */}
            <div className="md:col-span-2">
              <label className="block text-slate-600 text-xs font-semibold uppercase tracking-wider mb-2">
                PIN Code
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    placeholder="Enter 6-digit PIN code (e.g. 500081)"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-sm"
                    required={!latitude || !longitude}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={locating}
                  className="px-4 bg-slate-100 hover:bg-slate-200 text-red-600 border border-slate-200 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs font-semibold"
                  title="Detect Location"
                >
                  {locating ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" /> Detecting...
                    </>
                  ) : (
                    <>
                      <Compass className="h-4.5 w-4.5" /> Auto-Detect GPS
                    </>
                  )}
                </button>
              </div>
              {pincode ? (
                <span className="text-[11px] text-slate-400 block mt-1.5">
                  📍 Mapped to Coordinates: <strong>{latitude}</strong>, <strong>{longitude}</strong>
                </span>
              ) : latitude && longitude ? (
                <span className="text-[11px] text-green-600 block mt-1.5 font-medium">
                  ✔️ GPS Location Detected: <strong>{latitude}</strong>, <strong>{longitude}</strong>
                </span>
              ) : null}
            </div>
          </div>

          {/* Pharmacy Profile Fields (Only displayed for pharmacy registrations) */}
          {role === 'pharmacy' && (
            <div className="border-t border-slate-200 pt-6 space-y-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ShieldCheck className="text-red-650 h-5 w-5" /> Pharmacy Store Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Pharmacy Name */}
                <div>
                  <label className="block text-slate-600 text-xs font-semibold uppercase tracking-wider mb-2">
                    Pharmacy Store Name
                  </label>
                  <input
                    type="text"
                    value={pharmacyName}
                    onChange={(e) => setPharmacyName(e.target.value)}
                    placeholder="e.g. Apollo Pharmacy Secunderabad"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-sm"
                    required
                  />
                </div>

                {/* License Number */}
                <div>
                  <label className="block text-slate-600 text-xs font-semibold uppercase tracking-wider mb-2">
                    Drug License Number
                  </label>
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="e.g. DL-12345/2026"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-sm"
                    required
                  />
                </div>

                {/* Pharmacy Address */}
                <div className="md:col-span-2">
                  <label className="block text-slate-600 text-xs font-semibold uppercase tracking-wider mb-2">
                    Physical Address
                  </label>
                  <textarea
                    rows="2"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Provide the exact store address for map location verification"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-sm"
                    required
                  ></textarea>
                </div>

                {/* Contact Number */}
                <div>
                  <label className="block text-slate-600 text-xs font-semibold uppercase tracking-wider mb-2">
                    Pharmacy Contact Number
                  </label>
                  <input
                    type="text"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="Landline / Mobile"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-450 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-sm"
                  />
                </div>

                {/* License File Upload */}
                <div>
                  <label className="block text-slate-600 text-xs font-semibold uppercase tracking-wider mb-2">
                    Upload License File (PDF / JPG / PNG)
                  </label>
                  <div className="relative border border-dashed border-slate-300 rounded-xl p-2.5 bg-slate-50 text-center hover:bg-slate-100 transition-all">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      required
                    />
                    <div className="flex items-center justify-center gap-2 text-slate-500 text-xs py-1">
                      <FileText className="h-4.5 w-4.5 text-red-600" />
                      <span>{licenseFile ? licenseFile.name : 'Select or drop license file...'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-md shadow-red-500/10 flex items-center justify-center gap-2 hover:scale-[1.01] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-8"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Registering...
              </>
            ) : (
              <>
                Complete Registration
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-500 border-t border-slate-200 pt-6">
          <span>Already have an account? </span>
          <Link to="/login" className="text-red-650 font-semibold hover:underline">
            Log in here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
