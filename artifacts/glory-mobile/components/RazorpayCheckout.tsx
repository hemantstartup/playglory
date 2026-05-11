import { Platform } from 'react-native';
import { useCreateRazorpayOrder, useVerifyRazorpayPayment } from '@workspace/api-client-react';
import { useGetMe } from '@workspace/api-client-react';

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

export function useRazorpayCheckout() {
  const createOrder = useCreateRazorpayOrder();
  const verifyPayment = useVerifyRazorpayPayment();
  const { data: me } = useGetMe();

  const isPending = createOrder.isPending || verifyPayment.isPending;

  const openCheckout = async (
    slot: SlotInfo,
    onSuccess: (result: PaymentResult) => void,
    onError: (message: string) => void,
  ) => {
    if (Platform.OS !== 'web') {
      onError('Razorpay payments are available in the web version of the app. Native payment support coming soon.');
      return;
    }

    // Step 1: Create Razorpay order on backend
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

    // Step 2: Load Razorpay checkout script
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      onError('Failed to load payment gateway. Check your internet connection.');
      return;
    }

    const user = me as any;

    // Step 3: Open Razorpay checkout modal
    const options = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency ?? 'INR',
      name: 'Glory Sports',
      description: orderData.description ?? `${slot.turfName} · ${slot.date} · ${slot.startTime}–${slot.endTime}`,
      order_id: orderData.orderId,
      prefill: {
        name: user?.name ?? '',
        contact: user?.phone ?? '',
      },
      theme: {
        color: '#F97316',
      },
      modal: {
        ondismiss: () => {
          onError('Payment cancelled');
        },
      },
      handler: async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        // Step 4: Verify payment + create booking on backend
        try {
          const booking = await verifyPayment.mutateAsync({
            data: {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              turfId: slot.turfId,
              date: slot.date,
              startTime: slot.startTime,
              endTime: slot.endTime,
            },
          });
          onSuccess({ booking });
        } catch (e: any) {
          onError(e?.data?.error ?? e?.message ?? 'Payment succeeded but booking failed. Contact support.');
        }
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', (response: any) => {
      onError(response?.error?.description ?? 'Payment failed. Please try again.');
    });
    rzp.open();
  };

  return { openCheckout, isPending };
}
