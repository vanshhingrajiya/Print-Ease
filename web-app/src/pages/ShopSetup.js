import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import toast from 'react-hot-toast';
import { MapPin, Clock, Phone, Mail } from 'lucide-react';
import { MapContainer, TileLayer, Marker as LeafletMarker, useMap, useMapEvents } from 'react-leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet/dist/leaflet.css';
import 'leaflet-geosearch/dist/geosearch.css';

// Leaflet search control wrapper
const SearchControl = ({ onSelect }) => {
  const map = useMap();
  useEffect(() => {
    const provider = new OpenStreetMapProvider();
    const searchControl = new GeoSearchControl({
      provider,
      style: 'bar',
      autoComplete: true,
      autoCompleteDelay: 250,
      showMarker: false,
      showPopup: false
    });
    map.addControl(searchControl);
    const handler = (e) => {
      const { y: lat, x: lng, label, bounds } = e.location;
      // Only allow if address contains Gujarat
      if (label && label.toLowerCase().includes('gujarat')) {
        onSelect?.({ lat, lng, address: label });
      } else {
        alert('Please select a location within Gujarat');
      }
    };
    map.on('geosearch/showlocation', handler);
    return () => {
      map.removeControl(searchControl);
      map.off('geosearch/showlocation', handler);
    };
  }, [map, onSelect]);
  return null;
};

// Click handler component for Leaflet
const ClickSetter = ({ onClick }) => {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onClick?.(lat, lng);
    }
  });
  return null;
};

const ShopSetup = () => {
  const [loading, setLoading] = useState(false);
  const [shops, setShops] = useState([]);
  const [activePrinting, setActivePrinting] = useState({}); // { [shopId]: { ...prices } }
  const [activeLocation, setActiveLocation] = useState({}); // { [shopId]: { lat, lng, address } }
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm();

  // NEW: local UPI edit state per shop
  const [activeUpi, setActiveUpi] = useState({}); // { [shopId]: { id, displayName, qrPreview } }

  const newMapRef = useRef(null);

  // Reverse geocode via Nominatim
  const geocodeLatLng = async (lat, lng, setKey = 'new') => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      const address = data?.display_name || '';
      setActiveLocation(prev => ({ ...prev, [setKey]: { ...prev[setKey], address } }));
    } catch (_) {}
  };

  const useCurrentLocation = (setKey = 'new') => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setActiveLocation(prev => ({ ...prev, [setKey]: { ...prev[setKey], lat, lng } }));
        if (setKey === 'new' && newMapRef.current) {
          newMapRef.current.setView([lat, lng], 16);
        }
        geocodeLatLng(lat, lng, setKey);
      },
      () => toast.error('Unable to fetch current location'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Function to handle search suggestions
  const handleSearchInput = (value, shopId = 'new') => {
    if (value.length > 2) {
      // Show suggestions based on input
      const suggestions = [
        `${value} - Shop`,
        `${value} - Market`,
        `${value} - Plaza`,
        `${value} - Center`,
        `${value} - Complex`
      ];
      setSearchSuggestions(suggestions);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
    
    // Update address in location state
    setActiveLocation(prev => ({
      ...prev,
      [shopId]: { ...prev[shopId], address: value }
    }));
  };

  // Function to select a suggestion
  const selectSuggestion = (suggestion, shopId = 'new') => {
    setActiveLocation(prev => ({
      ...prev,
      [shopId]: { ...prev[shopId], address: suggestion }
    }));
    setShowSuggestions(false);
    
    // Update the address input field
    const addressInput = document.querySelector(`input[name="address.street"]`);
    if (addressInput) {
      addressInput.value = suggestion;
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.relative')) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchShops = async () => {
    try {
      const response = await axios.get('/api/shops/owner/my-shops');
      const list = response.data || [];
      setShops(list);
      // seed local state for printing, location, upi editors
      const printingSeed = {};
      const locationSeed = {};
      const upiSeed = {};
      list.forEach(s => {
        printingSeed[s._id] = {
          bwSingle: s.printingServices?.blackWhite?.singleSidedPrice || 0,
          bwDouble: s.printingServices?.blackWhite?.doubleSidedPrice || 0,
          colorSingle: s.printingServices?.color?.singleSidedPrice || 0,
          colorDouble: s.printingServices?.color?.doubleSidedPrice || 0,
        };
        locationSeed[s._id] = {
          lat: s.location?.coordinates?.[1] || null,
          lng: s.location?.coordinates?.[0] || null,
          address: s.address?.street || ''
        };
        upiSeed[s._id] = {
          id: s.upi?.id || '',
          displayName: s.upi?.displayName || s.shopName || '',
          qrPreview: ''
        };
      });
      setActivePrinting(printingSeed);
      setActiveLocation(locationSeed);
      setActiveUpi(upiSeed);
    } catch (error) {
      console.error('Error fetching shops:', error);
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Get the selected location from the map
      const selectedLocation = activeLocation['new'] || {};
      if (!selectedLocation.lat || !selectedLocation.lng) {
        toast.error('Please select your shop location on the map');
        setLoading(false);
        return;
      }

      const shopData = {
        ...data,
        location: {
          type: 'Point',
          coordinates: [selectedLocation.lng, selectedLocation.lat]
        },
        address: {
          ...data.address,
          street: selectedLocation.address || data.address.street
        }
      };

      await axios.post('/api/shops', shopData);
      toast.success('Shop created successfully!');
      fetchShops();
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message || 'Failed to create shop';
      if (status === 401) {
        toast.error('Please login again to create shop');
        setTimeout(() => (window.location.href = '/login'), 800);
      } else if (status === 403) {
        toast.error('Access denied. Please login as shop owner');
      } else {
        toast.error(`Create shop failed: ${message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateShop = async (shopId, data) => {
    setLoading(true);
    try {
      await axios.put(`/api/shops/${shopId}`, data);
      toast.success('Shop updated successfully!');
      fetchShops();
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to update shop';
      toast.error(`Update failed: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const savePrintingPrices = async (shopId) => {
    try {
      const p = activePrinting[shopId] || {};
      await axios.put(`/api/shops/${shopId}/printing-services`, {
        printingServices: {
          blackWhite: {
            singleSidedPrice: Number(p.bwSingle || 0),
            doubleSidedPrice: Number(p.bwDouble || 0),
          },
          color: {
            singleSidedPrice: Number(p.colorSingle || 0),
            doubleSidedPrice: Number(p.colorDouble || 0),
          }
        }
      });
      toast.success('Printing prices saved');
      fetchShops();
    } catch (e) {
      toast.error('Failed to save printing prices');
    }
  };

  const saveLocation = async (shopId) => {
    try {
      const l = activeLocation[shopId] || {};
      if (!l.lat || !l.lng) {
        toast.error('Please select a location on map');
        return;
      }
      await axios.put(`/api/shops/${shopId}/location`, {
        lat: Number(l.lat),
        lng: Number(l.lng),
        address: l.address || ''
      });
      toast.success('Location updated');
      fetchShops();
    } catch (e) {
      toast.error('Failed to update location');
    }
  };

  const saveUpi = async (shopId) => {
    try {
      const u = activeUpi[shopId] || {};
      await updateShop(shopId, { upi: { id: u.id || '', displayName: u.displayName || '' } });
    } catch (_) {}
  };

  const previewUpiQr = async (shopId) => {
    try {
      const u = activeUpi[shopId] || {};
      if (!u.id) {
        toast.error('Enter UPI ID first');
        return;
      }
      const resp = await axios.get(`/api/shops/${shopId}/upi-qr`, { params: { pn: u.displayName || '', am: 1, tn: 'Test' } });
      setActiveUpi(prev => ({ ...prev, [shopId]: { ...prev[shopId], qrPreview: resp.data?.qrDataUrl || '' } }));
    } catch (e) {
      toast.error('Failed to load QR');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shop Setup</h1>
        <p className="mt-1 text-sm text-gray-500">
          Set up your Xerox shop details, location, and printing prices.
        </p>
      </div>

      {shops.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Create Your Shop</h2>
          
          {/* Shop Details Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Shop Name *
                </label>
                <input
                  {...register('shopName', { required: 'Shop name is required' })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Enter shop name"
                />
                {errors.shopName && (
                  <p className="mt-1 text-sm text-red-600">{errors.shopName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Owner Name *
                </label>
                <input
                  {...register('ownerName', { required: 'Owner name is required' })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Enter owner name"
                />
                {errors.ownerName && (
                  <p className="mt-1 text-sm text-red-600">{errors.ownerName.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Shop Type
                </label>
                <select
                  {...register('shopType')}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value="">Select shop type</option>
                  <option value="xerox">Xerox Shop</option>
                  <option value="print">Print Shop</option>
                  <option value="stationery">Stationery + Xerox</option>
                  <option value="general">General Store + Xerox</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Business Hours
                </label>
                <input
                  {...register('businessHours')}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="e.g., 9:00 AM - 8:00 PM"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Shop Description
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Describe your shop, services, specialties..."
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Street Address
                </label>
                <div className="relative">
                  <input
                    {...register('address.street', { required: 'Street address is required' })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="Enter street address"
                    onChange={(e) => handleSearchInput(e.target.value, 'new')}
                  />
                  
                  {/* Search Suggestions */}
                  {showSuggestions && searchSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                      {searchSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                          onClick={() => selectSuggestion(suggestion, 'new')}
                        >
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                            <span className="text-sm text-gray-700">{suggestion}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  {...register('address.city', { required: 'City is required' })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Enter city"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  State
                </label>
                <input
                  {...register('address.state', { required: 'State is required' })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Enter state"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Pincode
                </label>
                <input
                  {...register('address.pincode', { required: 'Pincode is required' })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Enter pincode"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  {...register('contactInfo.phone', { required: 'Phone is required' })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                {...register('contactInfo.email')}
                type="email"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Enter email address"
              />
            </div>

            {/* Printing Prices Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Printing Services & Prices (INR)</h3>
              
              {/* Basic Printing */}
              <div className="mb-6">
                <h4 className="text-md font-semibold mb-3 text-gray-800">Basic Printing</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700">B/W Single-Sided</label>
                    <input
                      type="number"
                      step="0.01"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      placeholder="e.g. 1.00"
                      onChange={(e) => {
                        setActivePrinting(prev => ({
                          ...prev,
                          'new': { ...prev['new'], bwSingle: e.target.value }
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">B/W Double-Sided</label>
                    <input
                      type="number"
                      step="0.01"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      placeholder="e.g. 1.50"
                      onChange={(e) => {
                        setActivePrinting(prev => ({
                          ...prev,
                          'new': { ...prev['new'], bwDouble: e.target.value }
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Color Single-Sided</label>
                    <input
                      type="number"
                      step="0.01"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      placeholder="e.g. 8.00"
                      onChange={(e) => {
                        setActivePrinting(prev => ({
                          ...prev,
                          'new': { ...prev['new'], colorSingle: e.target.value }
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Color Double-Sided</label>
                    <input
                      type="number"
                      step="0.01"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      placeholder="e.g. 12.00"
                      onChange={(e) => {
                        setActivePrinting(prev => ({
                          ...prev,
                          'new': { ...prev['new'], colorDouble: e.target.value }
                        }));
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Paper Sizes */}
              <div className="mb-6">
                <h4 className="text-md font-semibold mb-3 text-gray-800">Paper Sizes</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700">A4 Size (per page)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      placeholder="e.g. 2.00"
                      onChange={(e) => {
                        setActivePrinting(prev => ({
                          ...prev,
                          'new': { ...prev['new'], a4Size: e.target.value }
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">A3 Size (per page)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      placeholder="e.g. 4.00"
                      onChange={(e) => {
                        setActivePrinting(prev => ({
                          ...prev,
                          'new': { ...prev['new'], a3Size: e.target.value }
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Photo Paper (per page)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      placeholder="e.g. 15.00"
                      onChange={(e) => {
                        setActivePrinting(prev => ({
                          ...prev,
                          'new': { ...prev['new'], photoPaper: e.target.value }
                        }));
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Additional Services */}
              <div className="mb-6">
                <h4 className="text-md font-semibold mb-3 text-gray-800">Additional Services</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700">Lamination (per page)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      placeholder="e.g. 5.00"
                      onChange={(e) => {
                        setActivePrinting(prev => ({
                          ...prev,
                          'new': { ...prev['new'], lamination: e.target.value }
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Binding (per document)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      placeholder="e.g. 20.00"
                      onChange={(e) => {
                        setActivePrinting(prev => ({
                          ...prev,
                          'new': { ...prev['new'], binding: e.target.value }
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Scanning (per page)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      placeholder="e.g. 3.00"
                      onChange={(e) => {
                        setActivePrinting(prev => ({
                          ...prev,
                          'new': { ...prev['new'], scanning: e.target.value }
                        }));
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Stationery Items */}
              <div className="mb-6">
                <h4 className="text-md font-semibold mb-3 text-gray-800">Stationery Items</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700">Pen (per piece)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      placeholder="e.g. 10.00"
                      onChange={(e) => {
                        setActivePrinting(prev => ({
                          ...prev,
                          'new': { ...prev['new'], pen: e.target.value }
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Notebook (per piece)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      placeholder="e.g. 25.00"
                      onChange={(e) => {
                        setActivePrinting(prev => ({
                          ...prev,
                          'new': { ...prev['new'], notebook: e.target.value }
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">File (per piece)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      placeholder="e.g. 15.00"
                      onChange={(e) => {
                        setActivePrinting(prev => ({
                          ...prev,
                          'new': { ...prev['new'], file: e.target.value }
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Stapler (per piece)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      placeholder="e.g. 50.00"
                      onChange={(e) => {
                        setActivePrinting(prev => ({
                          ...prev,
                          'new': { ...prev['new'], stapler: e.target.value }
                        }));
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Location Picker Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Shop Location</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-1">
                  <label className="block text-sm font-medium text-gray-700">Location Setup</label>
                  
                  {/* Leaflet search appears on the map */}
                  
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => useCurrentLocation('new')}
                      className="px-3 py-2 bg-gray-100 rounded-md text-sm"
                    >
                      Use my current location
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-sm text-gray-700">Latitude</label>
                      <input
                        type="number"
                        step="0.000001"
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                        value={activeLocation['new']?.lat || ''}
                        onChange={(e) => {
                          setActiveLocation(prev => ({
                            ...prev,
                            'new': { ...prev['new'], lat: e.target.value }
                          }));
                        }}
                        placeholder="Click on map"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700">Longitude</label>
                      <input
                        type="number"
                        step="0.000001"
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                        value={activeLocation['new']?.lng || ''}
                        onChange={(e) => {
                          setActiveLocation(prev => ({
                            ...prev,
                            'new': { ...prev['new'], lng: e.target.value }
                          }));
                        }}
                        placeholder="Click on map"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-3 p-3 bg-blue-50 rounded-md">
                    <p className="text-xs text-blue-700 mb-2">
                      <strong>💡 Search Tips:</strong>
                    </p>
                    <ul className="text-xs text-blue-600 space-y-1">
                      <li>• Type your area name (e.g., "Andheri West")</li>
                      <li>• Search for landmarks (e.g., "Andheri Station")</li>
                      <li>• Use street names (e.g., "Linking Road")</li>
                      <li>• Click on map to set exact location</li>
                    </ul>
                  </div>
                </div>
                
                <div className="lg:col-span-2 h-80">
                  <MapContainer
                    center={[activeLocation['new']?.lat || 22.3039, activeLocation['new']?.lng || 70.8022]}
                    zoom={14}
                    style={{ width: '100%', height: '100%' }}
                    whenCreated={(map) => { newMapRef.current = map; }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />
                    <SearchControl onSelect={({ lat, lng, address }) => {
                      setActiveLocation(prev => ({ ...prev, 'new': { ...prev['new'], lat, lng, address } }));
                    }} />
                    {activeLocation['new']?.lat && activeLocation['new']?.lng && (
                      <LeafletMarker
                        position={[Number(activeLocation['new'].lat), Number(activeLocation['new'].lng)]}
                        draggable
                        interactive={false}
                        eventHandlers={{
                          dragend: (e) => {
                            const { lat, lng } = e.target.getLatLng();
                            setActiveLocation(prev => ({ ...prev, 'new': { ...prev['new'], lat, lng } }));
                            geocodeLatLng(lat, lng, 'new');
                          }
                        }}
                      />
                    )}
                    {/* Click to set location */}
                    <ClickSetter onClick={(lat, lng) => {
                      setActiveLocation(prev => ({ ...prev, 'new': { ...prev['new'], lat, lng } }));
                      geocodeLatLng(lat, lng, 'new');
                    }} />
                  </MapContainer>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Shop'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          {shops.map((shop) => (
            <div key={shop._id} className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">{shop.shopName}</h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>
              
              {/* UPI section */}
              <div className="border-t pt-4">
                <h4 className="text-md font-semibold mb-3">Direct UPI (QR)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <div>
                    <label className="block text-sm text-gray-700">UPI ID</label>
                    <input
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      value={activeUpi[shop._id]?.id || ''}
                      onChange={e => setActiveUpi(u => ({ ...u, [shop._id]: { ...u[shop._id], id: e.target.value } }))}
                      placeholder="e.g. name@bank"
                    />
                    <label className="block text-sm text-gray-700 mt-3">Display Name</label>
                    <input
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      value={activeUpi[shop._id]?.displayName || ''}
                      onChange={e => setActiveUpi(u => ({ ...u, [shop._id]: { ...u[shop._id], displayName: e.target.value } }))}
                      placeholder="Shown in UPI app"
                    />
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => saveUpi(shop._id)} className="px-3 py-2 bg-primary-600 text-white rounded-md">Save UPI</button>
                      <button onClick={() => previewUpiQr(shop._id)} className="px-3 py-2 bg-gray-200 rounded-md">Preview QR</button>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    {activeUpi[shop._id]?.qrPreview ? (
                      <img src={activeUpi[shop._id]?.qrPreview} alt="UPI QR" className="w-40 h-40 border rounded" />
                    ) : (
                      <div className="w-40 h-40 border rounded flex items-center justify-center text-sm text-gray-500">QR preview</div>
                    )}
                    <p className="text-xs text-gray-500 mt-2">Scan to pay. Amount/notes will be set by the customer app.</p>
                  </div>
                </div>
              </div>

              {/* Printing prices (INR) */}
              <div className="mt-6 border-t pt-4">
                <h4 className="text-md font-semibold mb-3">Printing Prices (INR)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700">B/W Single-Sided</label>
                    <input
                      type="number"
                      step="0.01"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      value={activePrinting[shop._id]?.bwSingle ?? ''}
                      onChange={e => setActivePrinting(p => ({...p, [shop._id]: {...p[shop._id], bwSingle: e.target.value}}))}
                      placeholder="e.g. 1.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">B/W Double-Sided</label>
                    <input
                      type="number"
                      step="0.01"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      value={activePrinting[shop._id]?.bwDouble ?? ''}
                      onChange={e => setActivePrinting(p => ({...p, [shop._id]: {...p[shop._id], bwDouble: e.target.value}}))}
                      placeholder="e.g. 1.50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Color Single-Sided</label>
                    <input
                      type="number"
                      step="0.01"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      value={activePrinting[shop._id]?.colorSingle ?? ''}
                      onChange={e => setActivePrinting(p => ({...p, [shop._id]: {...p[shop._id], colorSingle: e.target.value}}))}
                      placeholder="e.g. 8.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Color Double-Sided</label>
                    <input
                      type="number"
                      step="0.01"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      value={activePrinting[shop._id]?.colorDouble ?? ''}
                      onChange={e => setActivePrinting(p => ({...p, [shop._id]: {...p[shop._id], colorDouble: e.target.value}}))}
                      placeholder="e.g. 12.00"
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-3">
                  <button onClick={() => savePrintingPrices(shop._id)} className="px-4 py-2 bg-primary-600 text-white rounded-md">Save Prices</button>
                </div>
              </div>

              {/* Location picker */}
              <div className="mt-6 border-t pt-4">
                <h4 className="text-md font-semibold mb-3">Shop Location</h4>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-1">
                    <label className="block text-sm text-gray-700">Search Place</label>
                    <input
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      placeholder="Type address or landmark"
                      value={activeLocation[shop._id]?.address || ''}
                      onChange={e => setActiveLocation(l => ({...l, [shop._id]: {...l[shop._id], address: e.target.value}}))}
                    />
                    <label className="block text-sm text-gray-700 mt-3">Address</label>
                    <input
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      value={activeLocation[shop._id]?.address || ''}
                      onChange={e => setActiveLocation(l => ({...l, [shop._id]: {...l[shop._id], address: e.target.value}}))}
                      placeholder="Address line"
                    />
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="block text-sm text-gray-700">Lat</label>
                        <input
                          type="number"
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                          value={activeLocation[shop._id]?.lat ?? ''}
                          onChange={e => setActiveLocation(l => ({...l, [shop._id]: {...l[shop._id], lat: e.target.value}}))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700">Lng</label>
                        <input
                          type="number"
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                          value={activeLocation[shop._id]?.lng ?? ''}
                          onChange={e => setActiveLocation(l => ({...l, [shop._id]: {...l[shop._id], lng: e.target.value}}))}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end mt-3">
                      <button onClick={() => saveLocation(shop._id)} className="px-4 py-2 bg-primary-600 text-white rounded-md">Save Location</button>
                    </div>
                  </div>
                  <div className="lg:col-span-2 h-64">
                    <MapContainer
                      center={[activeLocation[shop._id]?.lat || 22.3039, activeLocation[shop._id]?.lng || 70.8022]}
                      zoom={14}
                      style={{ width: '100%', height: '100%' }}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />
                      {activeLocation[shop._id]?.lat && activeLocation[shop._id]?.lng && (
                        <LeafletMarker
                          position={[Number(activeLocation[shop._id].lat), Number(activeLocation[shop._id].lng)]}
                          interactive={false}
                        />
                      )}
                    </MapContainer>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ShopSetup;
