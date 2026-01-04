import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Package } from 'lucide-react';

import { getMyShops } from '../services/shop.service';
import {
  getServicesByShop,
  addService,
  updateService,
  deleteService
} from '../services/service.service';

/* ---------- Shared styles (same as ShopSetup) ---------- */

const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-md bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

/* ---------- Component ---------- */

export default function Services() {
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [services, setServices] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors }
  } = useForm();

  /* ---------- Initial load ---------- */

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      const res = await getMyShops();
      setShops(res.data);

      if (res.data.length > 0) {
        setSelectedShop(res.data[0]);
      }
    } catch {
      toast.error('Failed to load shops');
    }
  };

  /* ---------- Load services when shop changes ---------- */

  useEffect(() => {
    if (selectedShop?._id) {
      fetchServices(selectedShop._id);
    }
  }, [selectedShop]);

  const fetchServices = async (shopId) => {
    try {
      const res = await getServicesByShop(shopId);
      setServices(res.data);
    } catch {
      toast.error('Failed to load services');
    }
  };

  /* ---------- Submit ---------- */

  const onSubmit = async (data) => {
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('description', data.description || '');
      formData.append('price', data.price);
      formData.append('unit', data.unit);
      formData.append('category', data.category);

      if (data.image?.[0]) {
        formData.append('image', data.image[0]);
      }

      if (editingService) {
        await updateService(
          selectedShop._id,
          editingService._id,
          formData
        );
        toast.success('Service updated successfully');
      } else {
        await addService(selectedShop._id, formData);
        toast.success('Service added successfully');
      }

      reset();
      setShowForm(false);
      setEditingService(null);
      fetchServices(selectedShop._id);
    } catch {
      toast.error('Failed to save service');
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Edit ---------- */

  const handleEdit = (service) => {
    setEditingService(service);

    setValue('name', service.name);
    setValue('description', service.description);
    setValue('price', service.price);
    setValue('unit', service.unit);
    setValue('category', service.category || 'other');

    setShowForm(true);
  };

  /* ---------- Delete ---------- */

  const handleDelete = async (serviceId) => {
    if (!window.confirm('Delete this service?')) return;

    try {
      await deleteService(selectedShop._id, serviceId);
      toast.success('Service deleted');
      fetchServices(selectedShop._id);
    } catch {
      toast.error('Failed to delete service');
    }
  };

  const cancelForm = () => {
    reset();
    setEditingService(null);
    setShowForm(false);
  };

  /* ---------- UI ---------- */

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Services Management
          </h1>
          <p className="text-sm text-gray-500">
            Manage additional services offered by your shop.
          </p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2"
        >
          <Plus size={16} />
          Add Service
        </button>
      </div>

      {/* Shop Selector */}
      {shops.length > 1 && (
        <div className="bg-white border rounded p-4">
          <label className={labelClass}>Select Shop</label>
          <select
            value={selectedShop?._id || ''}
            onChange={(e) =>
              setSelectedShop(
                shops.find((s) => s._id === e.target.value)
              )
            }
            className={inputClass}
          >
            {shops.map((shop) => (
              <option key={shop._id} value={shop._id}>
                {shop.shopName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div className="bg-white border rounded p-6 space-y-4">
          <h2 className="text-lg font-semibold">
            {editingService ? 'Edit Service' : 'Add Service'}
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            <div>
              <label className={labelClass}>Service Name *</label>
              <input
                {...register('name', { required: true })}
                className={inputClass}
              />
              {errors.name && (
                <p className="text-sm text-red-600">Required</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Description</label>
              <textarea
                rows={3}
                {...register('description')}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Price (₹) *</label>
                <input
                  type="number"
                  min="0"
                  {...register('price', { required: true })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Unit *</label>
                <select
                  {...register('unit', { required: true })}
                  className={inputClass}
                >
                  <option value="per_page">Per Page</option>
                  <option value="per_copy">Per Copy</option>
                  <option value="per_document">Per Document</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Category *</label>
              <select
                {...register('category', { required: true })}
                className={inputClass}
              >
                <option value="other">Other Service</option>
                <option value="printing">Printing (Non-Xerox)</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Image</label>
              <input
                type="file"
                accept="image/*"
                {...register('image')}
                className="text-sm"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelForm}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Services List */}
      <div className="bg-white border rounded">
        {services.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package className="mx-auto mb-2" />
            No services added yet
          </div>
        ) : (
          services.map((service) => (
            <div
              key={service._id}
              className="p-4 border-b flex justify-between items-start"
            >
              <div>
                <h4 className="font-medium">{service.name}</h4>
                <p className="text-sm text-gray-500">
                  ₹{service.price} / {service.unit.replace('_', ' ')}
                </p>
                <p className="text-xs text-gray-400">
                  {service.category === 'printing'
                    ? 'Printing Service'
                    : 'Other Service'}
                </p>
                {service.description && (
                  <p className="text-sm mt-1 text-gray-600">
                    {service.description}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleEdit(service)}
                  className="text-blue-600"
                >
                  <Edit size={16} />
                </button>

                <button
                  onClick={() => handleDelete(service._id)}
                  className="text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}