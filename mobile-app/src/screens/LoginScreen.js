import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const LoginScreen = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { requestOtp, verifyOtp } = useAuth();

  const handleRequestOtp = async () => {
    if (!phone) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }
    setLoading(true);
    const result = await requestOtp(phone);
    setLoading(false);
    if (!result.success) {
      Alert.alert('Failed', result.message);
    } else if (result.devOtp) {
      Alert.alert('Dev OTP', `Use this code in development: ${result.devOtp}`);
    }
  };

  const handleVerifyOtp = async () => {
    if (!phone || !code) {
      Alert.alert('Error', 'Enter phone and OTP code');
      return;
    }
    setLoading(true);
    const result = await verifyOtp(phone, code);
    setLoading(false);
    if (!result.success) {
      Alert.alert('Invalid Code', result.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Xerox Shop</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>OTP Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter 6-digit code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled, { flex: 1 }]}
              onPress={handleRequestOtp}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Sending...' : 'Send OTP'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled, { flex: 1, backgroundColor: '#10b981' }]}
              onPress={handleVerifyOtp}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Verifying...' : 'Verify & Login'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.linkText}>New user? OTP will create your account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#3b82f6',
    fontSize: 16,
  },
});

export default LoginScreen;
