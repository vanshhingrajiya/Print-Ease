import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const menuItems = [
    {
      icon: 'person-outline',
      title: 'Edit Profile',
      onPress: () => Alert.alert('Coming Soon', 'Edit profile feature will be available soon'),
    },
    {
      icon: 'notifications-outline',
      title: 'Notifications',
      onPress: () => Alert.alert('Coming Soon', 'Notification settings will be available soon'),
    },
    {
      icon: 'card-outline',
      title: 'Payment Methods',
      onPress: () => Alert.alert('Coming Soon', 'Payment methods will be available soon'),
    },
    {
      icon: 'help-circle-outline',
      title: 'Help & Support',
      onPress: () => Alert.alert('Help & Support', 'Contact us at support@xeroxshop.com'),
    },
    {
      icon: 'information-circle-outline',
      title: 'About',
      onPress: () => Alert.alert('About', 'Xerox Shop App v1.0.0\nBuilt with React Native'),
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color="#6b7280" />
          </View>
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <Text style={styles.userPhone}>{user?.phone}</Text>
      </View>

      <View style={styles.menuSection}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name={item.icon} size={24} color="#6b7280" />
              <Text style={styles.menuItemTitle}>{item.title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.logoutSection}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={loading}
        >
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          <Text style={styles.logoutButtonText}>
            {loading ? 'Logging out...' : 'Logout'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Xerox Shop App</Text>
        <Text style={styles.footerVersion}>Version 1.0.0</Text>
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
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  profileSection: {
    backgroundColor: 'white',
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 16,
    color: '#6b7280',
  },
  menuSection: {
    backgroundColor: 'white',
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemTitle: {
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 16,
  },
  logoutSection: {
    backgroundColor: 'white',
    marginBottom: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  logoutButtonText: {
    fontSize: 16,
    color: '#ef4444',
    marginLeft: 8,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    padding: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  footerVersion: {
    fontSize: 12,
    color: '#9ca3af',
  },
});

export default ProfileScreen;

