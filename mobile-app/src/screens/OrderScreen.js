import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';

const OrderScreen = ({ navigation, route }) => {
  const { shop, selectedService } = route.params;

  // Build available services from printingServices schema
  const availableServices = useMemo(() => {
    const services = [];
    const ps = shop?.printingServices || {};

    // Helper to push if price > 0
    const pushIfValid = (code, name, price, unit) => {
      const numericPrice = Number(price);
      if (!Number.isFinite(numericPrice) || numericPrice <= 0) return;
      services.push({
        id: code, // synthetic id for client-side selection
        code,
        name,
        unit, // e.g., 'per page', 'per document', 'per piece'
        price: numericPrice,
      });
    };

    // Basic printing
    pushIfValid('bw_single', 'B/W Single-Sided', ps?.blackWhite?.singleSidedPrice, 'per page');
    pushIfValid('bw_double', 'B/W Double-Sided', ps?.blackWhite?.doubleSidedPrice, 'per page');
    pushIfValid('color_single', 'Color Single-Sided', ps?.color?.singleSidedPrice, 'per page');
    pushIfValid('color_double', 'Color Double-Sided', ps?.color?.doubleSidedPrice, 'per page');

    // Paper sizes
    pushIfValid('a4', 'A4 Size', ps?.a4Size, 'per page');
    pushIfValid('a3', 'A3 Size', ps?.a3Size, 'per page');
    pushIfValid('photo', 'Photo Paper', ps?.photoPaper, 'per page');

    // Additional services
    pushIfValid('lamination', 'Lamination', ps?.lamination, 'per page');
    pushIfValid('binding', 'Binding', ps?.binding, 'per document');
    pushIfValid('scanning', 'Scanning', ps?.scanning, 'per page');

    // Stationery (per piece)
    pushIfValid('pen', 'Pen', ps?.pen, 'per piece');
    pushIfValid('notebook', 'Notebook', ps?.notebook, 'per piece');
    pushIfValid('file', 'File', ps?.file, 'per piece');
    pushIfValid('stapler', 'Stapler', ps?.stapler, 'per piece');

    return services;
  }, [shop]);

  // Normalize initially selected service (if coming from ShopDetailScreen)
  const initialSelected = useMemo(() => {
    if (!selectedService) return [];
    // Map incoming structure to one of available services by name and price match
    const match = availableServices.find(s => {
      // Try to match by name fragment (e.g., 'Black & White' -> 'B/W') and price
      if (selectedService?.type === 'Black & White') {
        // prefer single if matching price else double
        if (Number(selectedService?.singlePrice) === s.price && s.id.includes('bw_single')) return true;
        if (Number(selectedService?.doublePrice) === s.price && s.id.includes('bw_double')) return true;
      }
      if (selectedService?.type === 'Color') {
        if (Number(selectedService?.singlePrice) === s.price && s.id.includes('color_single')) return true;
        if (Number(selectedService?.doublePrice) === s.price && s.id.includes('color_double')) return true;
      }
      return false;
    });
    return match ? [match] : [];
  }, [selectedService, availableServices]);

  const [selectedServices, setSelectedServices] = useState(initialSelected);
  const [quantities, setQuantities] = useState({});
  const [files, setFiles] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [detectedPages, setDetectedPages] = useState(0);

  const handleServiceToggle = (service) => {
    const isSelected = selectedServices.find(s => s.id === service.id);
    if (isSelected) {
      setSelectedServices(selectedServices.filter(s => s.id !== service.id));
      const newQuantities = { ...quantities };
      delete newQuantities[service.id];
      setQuantities(newQuantities);
    } else {
      setSelectedServices([...selectedServices, service]);
      setQuantities({ ...quantities, [service.id]: 1 });
    }
  };

  const updateQuantity = (serviceId, quantity) => {
    const numericQty = Number(quantity);
    if (!Number.isFinite(numericQty) || numericQty < 1) return;
    setQuantities({ ...quantities, [serviceId]: numericQty });
  };

  const refreshDetectedPages = async (nextFiles) => {
    try {
      const form = new FormData();
      (nextFiles || []).forEach((file, idx) => {
        form.append('files', {
          uri: file.uri,
          type: file.mimeType || 'application/pdf',
          name: file.name || `document_${idx + 1}.pdf`,
        });
      });
      const resp = await axios.post('/api/orders/inspect', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const pages = Number(resp?.data?.totalPdfPages) || 0;
      setDetectedPages(pages);
    } catch (_) {
      setDetectedPages(0);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const next = [...files, result.assets[0]];
        setFiles(next);
        refreshDetectedPages(next);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    refreshDetectedPages(newFiles);
  };

  const calculateTotal = () => {
    const pages = detectedPages > 0 ? detectedPages : 1;
    return selectedServices.reduce((total, service) => {
      const qty = Number(quantities[service.id] || 1);
      const price = Number(service.price || 0);
      if (!Number.isFinite(qty) || !Number.isFinite(price)) return total;
      const multiplier = service.unit === 'per page' ? pages : 1;
      return total + (price * qty * multiplier);
    }, 0);
  };

  const handlePlaceOrder = async () => {
    if (selectedServices.length === 0) {
      Alert.alert('Error', 'Please select at least one service');
      return;
    }

    if (files.length === 0) {
      Alert.alert('Error', 'Please upload at least one document');
      return;
    }

    const totalAmount = calculateTotal();
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      Alert.alert('Error', 'Invalid total amount');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('shopId', shop._id);

      // Build items with client-side codes; backend should map/validate accordingly
      const items = selectedServices.map(service => ({
        code: service.code,
        name: service.name,
        unit: service.unit,
        price: Number(service.price),
        quantity: Number(quantities[service.id] || 1),
      }));
      formData.append('items', JSON.stringify(items));

      formData.append('deliveryAddress', JSON.stringify({
        street: 'Customer Address',
        city: 'Customer City',
        state: 'Customer State',
        pincode: '123456',
        phone: 'Customer Phone'
      }));
      formData.append('notes', notes);

      files.forEach((file, idx) => {
        formData.append('files', {
          uri: file.uri,
          type: file.mimeType || 'application/pdf',
          name: file.name || `document_${idx + 1}.pdf`,
        });
      });

      console.log('PlaceOrder Authorization header:', axios?.defaults?.headers?.common?.Authorization);
      const response = await axios.post('/api/orders', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert(
        'Order Placed Successfully!',
        `Your order #${response.data.order.orderNumber} has been placed. You will be redirected to payment.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Payment', { order: response.data.order })
          }
        ]
      );
    } catch (error) {
      console.log('PlaceOrder error:', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
      });
      const serverMsg = typeof error?.response?.data === 'string' ? error.response.data : (error?.response?.data?.message);
      Alert.alert('Error', serverMsg || error?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Place Order</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.shopInfo}>
        <Text style={styles.shopName}>{shop.shopName}</Text>
        <Text style={styles.shopAddress}>
          {shop.address?.street}, {shop.address?.city}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Services</Text>
        {availableServices.length === 0 ? (
          <Text style={{ color: '#6b7280' }}>No services available.</Text>
        ) : (
          availableServices.map((service) => {
            const isSelected = selectedServices.find(s => s.id === service.id);
            const quantity = quantities[service.id] || 1;

            return (
              <View key={service.id} style={styles.serviceCard}>
                <TouchableOpacity
                  style={styles.serviceHeader}
                  onPress={() => handleServiceToggle(service)}
                >
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    <Text style={styles.servicePrice}>₹{service.price} / {service.unit}</Text>
                  </View>
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                  </View>
                </TouchableOpacity>

                {isSelected && (
                  <View style={styles.quantityContainer}>
                    <Text style={styles.quantityLabel}>Quantity:</Text>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateQuantity(service.id, (quantity || 1) - 1)}
                      >
                        <Ionicons name="remove" size={16} color="#3b82f6" />
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{quantity}</Text>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateQuantity(service.id, (quantity || 1) + 1)}
                      >
                        <Ionicons name="add" size={16} color="#3b82f6" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.serviceTotal}>
                      Total: ₹{(Number(service.price) * Number(quantity || 1) * (service.unit === 'per page' ? (detectedPages > 0 ? detectedPages : 1) : 1)).toFixed(2)}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upload Documents</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={pickDocument}>
          <Ionicons name="cloud-upload-outline" size={24} color="#3b82f6" />
          <Text style={styles.uploadButtonText}>Upload PDF Files</Text>
        </TouchableOpacity>
        {detectedPages > 0 && (
          <Text style={{ marginTop: 8, color: '#374151' }}>Detected pages: {detectedPages}</Text>
        )}
        
        {files.length > 0 && (
          <View style={styles.filesList}>
            {files.map((file, index) => (
              <View key={index} style={styles.fileItem}>
                <Ionicons name="document-text" size={20} color="#6b7280" />
                <Text style={styles.fileName} numberOfLines={1}>
                  {file.name}
                </Text>
                <TouchableOpacity onPress={() => removeFile(index)}>
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional Notes</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Any special instructions or notes..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.totalSection}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount:</Text>
          <Text style={styles.totalAmount}>₹{calculateTotal().toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.orderButton, loading && styles.orderButtonDisabled]}
          onPress={handlePlaceOrder}
          disabled={loading}
        >
          <Text style={styles.orderButtonText}>
            {loading ? 'Placing Order...' : 'Place Order'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  placeholder: {
    width: 32,
  },
  shopInfo: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  shopAddress: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  serviceCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  servicePrice: {
    fontSize: 14,
    color: '#3b82f6',
    marginTop: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  quantityLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginHorizontal: 16,
  },
  serviceTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  uploadButtonText: {
    fontSize: 16,
    color: '#3b82f6',
    marginLeft: 8,
    fontWeight: '600',
  },
  filesList: {
    marginTop: 16,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
    marginLeft: 12,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  totalSection: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  orderButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  orderButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  orderButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default OrderScreen;
