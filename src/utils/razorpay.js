/**
 * Is online card/UPI checkout currently backed by trusted server-side
 * verification? F-28: the browser callback alone must never flip the fee
 * ledger. Until a server verification path exists (Edge Function + webhook
 * with the secret held server-side), this stays false and the UI must not
 * offer "Pay Now" as a ledger-changing action.
 */
export const ONLINE_PAYMENT_VERIFIED = false;

export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
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

export async function openRazorpayPayment({ amount, studentName, feeId, onSuccess, onFailure }) {
  // F-28 hard gate: refuse to open an unverifiable checkout. Even if a caller
  // bypasses the disabled UI button, no Razorpay callback can reach onSuccess
  // and therefore no callback can flip the fee ledger.
  if (!ONLINE_PAYMENT_VERIFIED) {
    const err = new Error('Online payment is temporarily disabled until server-side verification is enabled. Please pay at the institute office or ask the administrator to record a manual payment.');
    err.code = 'ONLINE_PAYMENT_DISABLED';
    if (onFailure) onFailure(err);
    throw err;
  }
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded) {
    alert('Razorpay SDK failed to load. Please check your internet connection.');
    return;
  }

  const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholderKey';

  const options = {
    key: razorpayKey,
    amount: Math.round(Number(amount) * 100), // Amount in paise
    currency: 'INR',
    name: 'EduPilot AI Institute',
    description: `Fee Payment for ${studentName}`,
    handler: function (response) {
      if (response.razorpay_payment_id) {
        onSuccess(response.razorpay_payment_id);
      }
    },
    prefill: {
      name: studentName,
    },
    theme: {
      color: '#2563eb',
    },
  };

  const paymentObject = new window.Razorpay(options);
  paymentObject.on('payment.failed', function (response) {
    if (onFailure) onFailure(response.error);
  });
  paymentObject.open();
}
