import { useState } from 'react';
import { Platform, Modal, View, StyleSheet, ActivityIndicator, Pressable, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { useCreateRazorpayOrder, useVerifyRazorpayPayment, useGetMe } from '@workspace/api-client-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface SlotInfo {
  turfId: number;
  turfName: string;
  date: string;
  startTime: string;
  endTime: string;
  pricePerHour: number;
}

export interface PaymentResult {
  booking: any;
}

// ─── Web-only: inject Razorpay checkout.js script ──────────────────────────
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ─── Native: build an HTML page that opens Razorpay inside WebView ──────────
function buildRazorpayHtml(opts: {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefillName: string;
  prefillContact: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Payment</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0F172A; display: flex; align-items: center; justify-content: center;
           height: 100vh; font-family: -apple-system, sans-serif; }
    .loader { color: #F97316; font-size: 16px; text-align: center; }
    .dot { animation: blink 1.2s infinite; }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
  </style>
</head>
<body>
  <div class="loader">
    <div style="font-size:40px;margin-bottom:16px">💳</div>
    <div>Opening payment<span class="dot">...</span></div>
  </div>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    function postMsg(data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    }

    window.onload = function() {
      var options = {
        key: ${JSON.stringify(opts.keyId)},
        amount: ${opts.amount},
        currency: ${JSON.stringify(opts.currency)},
        name: ${JSON.stringify(opts.name)},
        description: ${JSON.stringify(opts.description)},
        order_id: ${JSON.stringify(opts.orderId)},
        prefill: {
          name: ${JSON.stringify(opts.prefillName)},
          contact: ${JSON.stringify(opts.prefillContact)}
        },
        theme: { color: '#F97316' },
        modal: {
          ondismiss: function() { postMsg({ type: 'cancel' }); }
        },
        handler: function(response) {
          postMsg({
            type: 'success',
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature
          });
        }
      };

      try {
        var rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function(r) {
          postMsg({ type: 'error', message: r.error.description || 'Payment failed' });
        });
        rzp.open();
      } catch(e) {
        postMsg({ type: 'error', message: e.message || 'Failed to load payment gateway' });
      }
    };
  </script>
</body>
</html>`;
}

// ─── Hook ──────────────────────────────────────────────────────────────────
export function useRazorpayCheckout() {
  const createOrder = useCreateRazorpayOrder();
  const verifyPayment = useVerifyRazorpayPayment();
  const { data: me } = useGetMe();

  const [webViewState, setWebViewState] = useState<{
    html: string;
    slot: SlotInfo;
    orderId: string;
    onSuccess: (r: PaymentResult) => void;
    onError: (msg: string) => void;
  } | null>(null);
  const [webViewLoading, setWebViewLoading] = useState(false);

  const isPending = createOrder.isPending || verifyPayment.isPending;

  // ── Called by both web and native paths after payment succeeds ──────────
  const handleVerify = async (
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
    slot: SlotInfo,
    onSuccess: (r: PaymentResult) => void,
    onError: (msg: string) => void,
  ) => {
    try {
      const booking = await verifyPayment.mutateAsync({
        data: {
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
          turfId: slot.turfId,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
        },
      });
      setWebViewState(null);
      onSuccess({ booking });
    } catch (e: any) {
      setWebViewState(null);
      onError(e?.data?.error ?? e?.message ?? 'Payment succeeded but booking failed. Contact support.');
    }
  };

  // ── Main entry point ────────────────────────────────────────────────────
  const openCheckout = async (
    slot: SlotInfo,
    onSuccess: (result: PaymentResult) => void,
    onError: (message: string) => void,
  ) => {
    // Step 1: Create order on backend (same for all platforms)
    let orderData: any;
    try {
      orderData = await createOrder.mutateAsync({
        data: {
          turfId: slot.turfId,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
        },
      });
    } catch (e: any) {
      onError(e?.data?.error ?? e?.message ?? 'Failed to create payment order. Please try again.');
      return;
    }

    const user = me as any;

    // ── WEB path ──────────────────────────────────────────────────────────
    if (Platform.OS === 'web') {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        onError('Failed to load payment gateway. Check your internet connection.');
        return;
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency ?? 'INR',
        name: 'Glory Sports',
        description: orderData.description ?? `${slot.turfName} · ${slot.date}`,
        order_id: orderData.orderId,
        prefill: { name: user?.name ?? '', contact: user?.phone ?? '' },
        theme: { color: '#F97316' },
        modal: { ondismiss: () => onError('Payment cancelled') },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          await handleVerify(
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature,
            slot,
            onSuccess,
            onError,
          );
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (r: any) => {
        onError(r?.error?.description ?? 'Payment failed. Please try again.');
      });
      rzp.open();
      return;
    }

    // ── NATIVE (iOS / Android) path — show WebView modal ─────────────────
    const html = buildRazorpayHtml({
      keyId: orderData.keyId,
      orderId: orderData.orderId,
      amount: orderData.amount,
      currency: orderData.currency ?? 'INR',
      name: 'Glory Sports',
      description: orderData.description ?? `${slot.turfName} · ${slot.date}`,
      prefillName: user?.name ?? '',
      prefillContact: user?.phone ?? '',
    });

    setWebViewState({ html, slot, orderId: orderData.orderId, onSuccess, onError });
  };

  // ── WebView message handler (native only) ─────────────────────────────
  const handleWebViewMessage = async (event: any) => {
    if (!webViewState) return;
    let msg: any;
    try { msg = JSON.parse(event.nativeEvent.data); } catch { return; }

    const { slot, onSuccess, onError } = webViewState;

    if (msg.type === 'success') {
      setWebViewLoading(true);
      await handleVerify(
        msg.razorpay_order_id,
        msg.razorpay_payment_id,
        msg.razorpay_signature,
        slot,
        onSuccess,
        onError,
      );
      setWebViewLoading(false);
    } else if (msg.type === 'cancel') {
      setWebViewState(null);
    } else if (msg.type === 'error') {
      setWebViewState(null);
      onError(msg.message ?? 'Payment failed');
    }
  };

  // ── WebView modal JSX (rendered by the component that uses this hook) ──
  const RazorpayWebViewModal = () => {
    if (!webViewState || Platform.OS === 'web') return null;
    return (
      <Modal visible animationType="slide" onRequestClose={() => {
        webViewState.onError('Payment cancelled');
        setWebViewState(null);
      }}>
        <View style={styles.webViewContainer}>
          <View style={styles.webViewHeader}>
            <Text style={styles.webViewTitle}>Secure Payment</Text>
            <Pressable
              onPress={() => { webViewState.onError('Payment cancelled'); setWebViewState(null); }}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕ Cancel</Text>
            </Pressable>
          </View>
          <WebView
            source={{ html: webViewState.html }}
            onMessage={handleWebViewMessage}
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={['*']}
            mixedContentMode="always"
            style={{ flex: 1, backgroundColor: '#0F172A' }}
          />
          {webViewLoading && (
            <View style={styles.verifyingOverlay}>
              <ActivityIndicator size="large" color="#F97316" />
              <Text style={styles.verifyingText}>Verifying payment…</Text>
            </View>
          )}
        </View>
      </Modal>
    );
  };

  return { openCheckout, isPending, RazorpayWebViewModal };
}

const styles = StyleSheet.create({
  webViewContainer: { flex: 1, backgroundColor: '#0F172A' },
  webViewHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, paddingTop: 54,
    backgroundColor: '#1E293B',
  },
  webViewTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  closeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: '#334155' },
  closeBtnText: { color: '#F97316', fontSize: 13, fontWeight: '700' },
  verifyingOverlay: {
    position: 'absolute', inset: 0, backgroundColor: 'rgba(15,23,42,0.85)',
    alignItems: 'center', justifyContent: 'center', gap: 14,
  },
  verifyingText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
