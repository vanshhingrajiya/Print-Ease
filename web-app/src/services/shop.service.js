import api from '../api/axiosInstance';

export const createShop = (payload) => {
  return api.post('/shops', payload);
};

export const updateShop = (shopId, payload) => {
  return api.put(`/shops/${shopId}`, payload);
};

export const getMyShops = () => {
  return api.get('/shops/owner/my-shops');
};