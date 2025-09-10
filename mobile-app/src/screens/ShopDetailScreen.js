import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const ShopDetailScreen = ({ navigation, route }) => {
  const { shop } = route.params;
  const [shopDetails, setShopDetails] = useState(shop);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchShopDetails();
  }, []);

  const fetchShopDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/shops/${shop._id}`);
      setShopDetails(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch shop details');
    } finally {
      setLoading(false);
    }
  };

  const renderPrintingService = (type, singlePrice, doublePrice) => {
    if (!singlePrice && !doublePrice) return null;
    
    return (
      <View style={styles.serviceCard}>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{type} Printing</Text>
          <View style={styles.priceContainer}>
            {singlePrice > 0 && (
              <Text style={styles.servicePrice}>
                Single-sided: ₹{singlePrice}
              </Text>
            )}
            {doublePrice > 0 && (
              <Text style={styles.servicePrice}>
                Double-sided: ₹{doublePrice}
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => handleServiceSelect(type, singlePrice, doublePrice)}
        >
          <Text style={styles.selectButtonText}>Select</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderServiceItem = (title, price, unit = 'per piece') => {
    if (!price || price <= 0) return null;
    
    return (
      <View style={styles.serviceCard}>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{title}</Text>
          <Text style={styles.servicePrice}>₹{price} {unit}</Text>
        </View>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => handleServiceSelect(title, price, 0)}
        >
          <Text style={styles.selectButtonText}>Select</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const handleServiceSelect = (serviceType, singlePrice, doublePrice) => {
    navigation.navigate('Order', { 
      shop: shopDetails, 
      selectedService: {
        type: serviceType,
        singlePrice,
        doublePrice
      }
    });
  };

  const handleOrderNow = () => {
    const hasAnyServices = shopDetails.printingServices?.blackWhite || 
                          shopDetails.printingServices?.color ||
                          shopDetails.printingServices?.a4Size ||
                          shopDetails.printingServices?.a3Size ||
                          shopDetails.printingServices?.photoPaper ||
                          shopDetails.printingServices?.lamination ||
                          shopDetails.printingServices?.binding ||
                          shopDetails.printingServices?.scanning ||
                          shopDetails.printingServices?.pen ||
                          shopDetails.printingServices?.notebook ||
                          shopDetails.printingServices?.file ||
                          shopDetails.printingServices?.stapler;
    
    if (!hasAnyServices) {
      Alert.alert('No Services', 'This shop has no services available.');
      return;
    }
    
    navigation.navigate('Order', { 
      shop: shopDetails 
    });
  };

  const hasAnyServices = () => {
    return shopDetails.printingServices?.blackWhite || 
           shopDetails.printingServices?.color ||
           shopDetails.printingServices?.a4Size ||
           shopDetails.printingServices?.a3Size ||
           shopDetails.printingServices?.photoPaper ||
           shopDetails.printingServices?.lamination ||
           shopDetails.printingServices?.binding ||
           shopDetails.printingServices?.scanning ||
           shopDetails.printingServices?.pen ||
           shopDetails.printingServices?.notebook ||
           shopDetails.printingServices?.file ||
           shopDetails.printingServices?.stapler;
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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {shopDetails.shopName}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.shopInfo}>
        <Text style={styles.shopName}>{shopDetails.shopName}</Text>
        {shopDetails.ownerName && (
          <Text style={styles.ownerName}>Owner: {shopDetails.ownerName}</Text>
        )}
        {shopDetails.description && (
          <Text style={styles.shopDescription}>{shopDetails.description}</Text>
        )}
        {shopDetails.businessHours && (
          <Text style={styles.businessHours}>🕒 {shopDetails.businessHours}</Text>
        )}
        
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={20} color="#fbbf24" />
          <Text style={styles.rating}>
            {shopDetails.rating?.average?.toFixed(1) || '0.0'}
          </Text>
          <Text style={styles.ratingCount}>
            ({shopDetails.rating?.count || 0} reviews)
          </Text>
        </View>

        <View style={styles.addressContainer}>
          <Ionicons name="location-outline" size={20} color="#6b7280" />
          <Text style={styles.address}>
            {shopDetails.address?.street}, {shopDetails.address?.city}, {shopDetails.address?.state} - {shopDetails.address?.pincode}
          </Text>
        </View>

        {shopDetails.contactInfo?.phone && (
          <View style={styles.contactContainer}>
            <Ionicons name="call-outline" size={20} color="#6b7280" />
            <Text style={styles.contact}>{shopDetails.contactInfo.phone}</Text>
          </View>
        )}

        {shopDetails.contactInfo?.email && (
          <View style={styles.contactContainer}>
            <Ionicons name="mail-outline" size={20} color="#6b7280" />
            <Text style={styles.contact}>{shopDetails.contactInfo.email}</Text>
          </View>
        )}
      </View>

      {/* Basic Printing Services */}
      <View style={styles.servicesSection}>
        <Text style={styles.sectionTitle}>Basic Printing Services (INR)</Text>
        
        {!hasAnyServices() ? (
          <View style={styles.emptyServices}>
            <Ionicons name="document-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyServicesText}>No printing services available</Text>
          </View>
        ) : (
          <View style={styles.servicesList}>
            {/* Black & White Printing */}
            {renderPrintingService(
              'Black & White',
              shopDetails.printingServices?.blackWhite?.singleSidedPrice,
              shopDetails.printingServices?.blackWhite?.doubleSidedPrice
            )}
            
            {/* Color Printing */}
            {renderPrintingService(
              'Color',
              shopDetails.printingServices?.color?.singleSidedPrice,
              shopDetails.printingServices?.color?.doubleSidedPrice
            )}
          </View>
        )}
      </View>

      {/* Paper Sizes */}
      {(shopDetails.printingServices?.a4Size || shopDetails.printingServices?.a3Size || shopDetails.printingServices?.photoPaper) && (
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Paper Sizes & Types (INR)</Text>
          <View style={styles.servicesList}>
            {renderServiceItem('A4 Size', shopDetails.printingServices?.a4Size, 'per page')}
            {renderServiceItem('A3 Size', shopDetails.printingServices?.a3Size, 'per page')}
            {renderServiceItem('Photo Paper', shopDetails.printingServices?.photoPaper, 'per page')}
          </View>
        </View>
      )}

      {/* Additional Services */}
      {(shopDetails.printingServices?.lamination || shopDetails.printingServices?.binding || shopDetails.printingServices?.scanning) && (
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Additional Services (INR)</Text>
          <View style={styles.servicesList}>
            {renderServiceItem('Lamination', shopDetails.printingServices?.lamination, 'per page')}
            {renderServiceItem('Binding', shopDetails.printingServices?.binding, 'per document')}
            {renderServiceItem('Scanning', shopDetails.printingServices?.scanning, 'per page')}
          </View>
        </View>
      )}

      {/* Stationery Items */}
      {(shopDetails.printingServices?.pen || shopDetails.printingServices?.notebook || shopDetails.printingServices?.file || shopDetails.printingServices?.stapler) && (
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Stationery Items (INR)</Text>
          <View style={styles.servicesList}>
            {renderServiceItem('Pen', shopDetails.printingServices?.pen)}
            {renderServiceItem('Notebook', shopDetails.printingServices?.notebook)}
            {renderServiceItem('File', shopDetails.printingServices?.file)}
            {renderServiceItem('Stapler', shopDetails.printingServices?.stapler)}
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.orderButton}
          onPress={handleOrderNow}
          disabled={!hasAnyServices()}
        >
          <Text style={styles.orderButtonText}>
            {!hasAnyServices() ? 'No Services Available' : 'Order Now'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
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
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  placeholder: {
    width: 32,
  },
  shopInfo: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 12,
  },
  shopName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  ownerName: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  shopDescription: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 22,
  },
  businessHours: {
    fontSize: 14,
    color: '#059669',
    marginBottom: 12,
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rating: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 4,
  },
  ratingCount: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  address: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  contactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contact: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  servicesSection: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  servicesList: {
    gap: 12,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  priceContainer: {
    gap: 4,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  selectButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyServices: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyServicesText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  footer: {
    padding: 20,
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
  orderButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ShopDetailScreen;
