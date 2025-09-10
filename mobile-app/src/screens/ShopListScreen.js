import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as Location from 'expo-location';

const ShopListScreen = ({ navigation }) => {
  const [shops, setShops] = useState([]);
  const [filteredShops, setFilteredShops] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNearbyShops();
  }, []);

  useEffect(() => {
    filterShops();
  }, [searchQuery, shops]);

  const fetchNearbyShops = async () => {
    try {
      setLoading(true);
      // Ask for permission and get current position
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Location permission is needed to show nearby shops');
        // Fallback: load all shops
        const all = await axios.get('/api/shops');
        setShops(all.data);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      const response = await axios.get(`/api/shops/nearby`, {
        params: { lat: latitude, lng: longitude, radius: 5000 }
      });
      setShops(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch nearby shops');
    } finally {
      setLoading(false);
    }
  };

  const filterShops = () => {
    if (!searchQuery.trim()) {
      setFilteredShops(shops);
      return;
    }

    const filtered = shops.filter(shop =>
      shop.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.address?.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.address?.street?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredShops(filtered);
  };

  const hasPrintingServices = (shop) => {
    return shop.printingServices?.blackWhite || 
           shop.printingServices?.color ||
           shop.printingServices?.a4Size ||
           shop.printingServices?.a3Size ||
           shop.printingServices?.photoPaper ||
           shop.printingServices?.lamination ||
           shop.printingServices?.binding ||
           shop.printingServices?.scanning ||
           shop.printingServices?.pen ||
           shop.printingServices?.notebook ||
           shop.printingServices?.file ||
           shop.printingServices?.stapler;
  };

  const getServiceText = (shop) => {
    if (hasPrintingServices(shop)) {
      const services = [];
      
      // Basic printing
      if (shop.printingServices?.blackWhite) services.push('B/W');
      if (shop.printingServices?.color) services.push('Color');
      
      // Paper sizes
      if (shop.printingServices?.a4Size) services.push('A4');
      if (shop.printingServices?.a3Size) services.push('A3');
      if (shop.printingServices?.photoPaper) services.push('Photo');
      
      // Additional services
      if (shop.printingServices?.lamination) services.push('Lamination');
      if (shop.printingServices?.binding) services.push('Binding');
      if (shop.printingServices?.scanning) services.push('Scanning');
      
      // Stationery
      if (shop.printingServices?.pen || shop.printingServices?.notebook || 
          shop.printingServices?.file || shop.printingServices?.stapler) {
        services.push('Stationery');
      }
      
      return `${services.slice(0, 4).join(', ')}${services.length > 4 ? '...' : ''}`;
    }
    return 'No services';
  };

  const renderShopItem = ({ item }) => (
    <TouchableOpacity
      style={styles.shopCard}
      onPress={() => navigation.navigate('ShopDetail', { shop: item })}
    >
      <View style={styles.shopInfo}>
        <Text style={styles.shopName}>{item.shopName}</Text>
        <Text style={styles.shopAddress}>
          {item.address?.street}, {item.address?.city}
        </Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={16} color="#fbbf24" />
          <Text style={styles.rating}>
            {item.rating?.average?.toFixed(1) || '0.0'}
          </Text>
          <Text style={styles.ratingCount}>
            ({item.rating?.count || 0} reviews)
          </Text>
        </View>
        <View style={styles.servicesContainer}>
          <Text style={[styles.servicesText, !hasPrintingServices(item) && styles.noServicesText]}>
            {getServiceText(item)}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading shops...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nearby Shops (within 5 km)</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search shops by name or location"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredShops}
        renderItem={renderShopItem}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="storefront-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No shops found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try adjusting your search' : 'No shops available in your area'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  searchContainer: {
    padding: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  shopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  shopAddress: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 4,
  },
  ratingCount: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
  },
  servicesContainer: {
    marginTop: 4,
  },
  servicesText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  noServicesText: {
    color: '#ef4444',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default ShopListScreen;
