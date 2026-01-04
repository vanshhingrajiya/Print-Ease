import api from '../api/axiosInstance';

// Get services for a shop
export const getServicesByShop = (shopId) => {
  return api.get(`/shops/${shopId}/services`);
};

// Add service
export const addService = (shopId, formData) => {
  return api.post(`/shops/${shopId}/services`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

// Update service
export const updateService = (shopId, serviceId, formData) => {
  return api.put(`/shops/${shopId}/services/${serviceId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

// Delete service
export const deleteService = (shopId, serviceId) => {
  return api.delete(`/shops/${shopId}/services/${serviceId}`);
};