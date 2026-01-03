import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, Linking } from 'react-native';
import axios from 'axios';

const PaymentScreen = ({ route, navigation }) => {
  const { order } = route.params || {};
  const [paying, setPaying] = useState(false);
  const [upiQr, setUpiQr] = useState(null);
  const [upiIntent, setUpiIntent] = useState(null);

  useEffect(() => {
    const loadUpi = async () => {
      try {
        if (!order?.shop?._id && !order?.shop) return;
        const shopId = order.shop?._id || order.shop;
        const resp = await axios.get(`/api/shops/${shopId}/upi-qr`, {
          params: { am: Number(order.totalAmount || 0).toFixed(2), tn: `Order ${order.orderNumber}` }
        });
        setUpiQr(resp.data?.qrDataUrl || null);
        setUpiIntent(resp.data?.intent || null);
      } catch {}
    };
    loadUpi();
  }, [order]);

  const handleOpenUpi = async () => {
    try {
      if (!upiIntent) return;
      const supported = await Linking.canOpenURL(upiIntent);
      if (supported) {
        await Linking.openURL(upiIntent);
      } else {
        Alert.alert('UPI', 'No UPI app found to handle payment.');
      }
    } catch (e) {
      Alert.alert('UPI', 'Failed to open UPI app');
    }
  };

  const handlePay = async () => {
    try {
      setPaying(true);

      // 1. Create payment intent (match backend route name)
      const resp = await axios.post('/api/payments/create-payment-intent', { orderId: order._id });
      const clientSecret = resp.data?.clientSecret;

      if (!clientSecret) {
        Alert.alert('Payment', 'Unable to initialize payment');
        return;
      }

      // 2. Simulate payment success (in test mode)
      await axios.post('/api/payments/confirm-payment', {
        paymentIntentId: 'test_simulated',
        orderId: order._id,
      });

      Alert.alert('Payment', 'Payment simulated as successful (test mode)');

      // 3. Navigate to Orders tab inside MainTabs
      navigation.navigate('MainTabs', { screen: 'Orders' });

    } catch (e) {
      Alert.alert('Payment', e?.response?.data?.message || e.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payment</Text>
      {order ? (
        <>
          <Text style={styles.text}>Order Number: {order.orderNumber}</Text>
          <Text style={styles.text}>Total: ₹{Number(order.totalAmount || 0).toFixed(2)}</Text>
          {upiQr && (
            <View style={styles.qrBox}>
              <Text style={styles.subTitle}>Pay Directly to Shop via UPI</Text>
              <Image source={{ uri: upiQr }} style={styles.qr} />
              <TouchableOpacity style={styles.linkBtn} onPress={handleOpenUpi}>
                <Text style={styles.linkBtnText}>Open in UPI App</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.box}>
            <Text style={styles.small}>Or use test mode (Stripe simulation):</Text>
          </View>
          <TouchableOpacity style={styles.button} onPress={handlePay} disabled={paying}>
            <Text style={styles.buttonText}>
              {paying ? 'Processing...' : 'Pay (Test Mode)'}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text style={styles.text}>No order data.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: 'white', marginTop: 40 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12, color: '#1f2937' },
  subTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 8 },
  text: { fontSize: 16, color: '#374151', marginBottom: 6 },
  small: { fontSize: 12, color: '#6b7280' },
  box: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginVertical: 12,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  qrBox: { alignItems: 'center', marginVertical: 12 },
  qr: { width: 180, height: 180, marginVertical: 8 },
  linkBtn: { marginTop: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#10b981', borderRadius: 8 },
  linkBtnText: { color: 'white', fontWeight: '600' },
});

export default PaymentScreen;



