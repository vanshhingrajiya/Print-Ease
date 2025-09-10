import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Package } from 'lucide-react';

const Services = () => {
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm();

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      const response = await axios.get('/api/shops/owner/my-shops');
      setShops(response.data);
      if (response.data.length > 0) {
        setSelectedShop(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('description', data.description);
      formData.append('price', data.price);
      formData.append('unit', data.unit);
      if (data.image && data.image[0]) {
        formData.append('image', data.image[0]);
      }

      if (editingService) {
        await axios.put(`/api/shops/${selectedShop._id}/services/${editingService._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Service updated successfully!');
      } else {
        await axios.post(`/api/shops/${selectedShop._id}/services`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Service added successfully!');
      }
      
      fetchShops();
      reset();
      setShowAddForm(false);
      setEditingService(null);
    } catch (error) {
      toast.error('Failed to save service');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setValue('name', service.name);
    setValue('description', service.description);
    setValue('price', service.price);
    setValue('unit', service.unit);
    setShowAddForm(true);
  };

  const handleDelete = async (serviceId) => {
    if (!window.confirm('Are you sure you want to delete this service?')) {
      return;
    }

    try {
      await axios.delete(`/api/shops/${selectedShop._id}/services/${serviceId}`);
      toast.success('Service deleted successfully!');
      fetchShops();
    } catch (error) {
      toast.error('Failed to delete service');
    }
  };

  const cancelEdit = () => {
    setShowAddForm(false);
    setEditingService(null);
    reset();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your shop's services and pricing.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </button>
      </div>

      {/* Shop Selection */}
      {shops.length > 1 && (
        <div className="bg-white shadow rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Shop
          </label>
          <select
            value={selectedShop?._id || ''}
            onChange={(e) => {
              const shop = shops.find(s => s._id === e.target.value);
              setSelectedShop(shop);
            }}
            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          >
            {shops.map((shop) => (
              <option key={shop._id} value={shop._id}>
                {shop.shopName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Add/Edit Service Form */}
      {showAddForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {editingService ? 'Edit Service' : 'Add New Service'}
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Service Name
                </label>
                <input
                  {...register('name', { required: 'Service name is required' })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="e.g., B&W Print, Color Print, Binding"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Price (₹)
                </label>
                <input
                  {...register('price', { 
                    required: 'Price is required',
                    min: { value: 0, message: 'Price must be positive' }
                  })}
                  type="number"
                  step="0.01"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="0.00"
                />
                {errors.price && (
                  <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Describe the service"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Unit
                </label>
                <select
                  {...register('unit', { required: 'Unit is required' })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value="per_page">Per Page</option>
                  <option value="per_copy">Per Copy</option>
                  <option value="per_document">Per Document</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Service Image
                </label>
                <input
                  {...register('image')}
                  type="file"
                  accept="image/*"
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={cancelEdit}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : (editingService ? 'Update Service' : 'Add Service')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Services List */}
      {selectedShop && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Services for {selectedShop.shopName}
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {selectedShop.services?.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No services</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by adding your first service.
                </p>
              </div>
            ) : (
              selectedShop.services?.map((service) => (
                <div key={service._id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h4 className="text-sm font-medium text-gray-900">{service.name}</h4>
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ₹{service.price} / {service.unit.replace('_', ' ')}
                        </span>
                      </div>
                      {service.description && (
                        <p className="mt-1 text-sm text-gray-500">{service.description}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(service)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(service._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;

