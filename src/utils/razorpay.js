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
