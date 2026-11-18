import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

function CheckoutForm({ amount, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      toast.error(error.message);
      onError?.(error);
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      toast.success("Payment successful!");
      onSuccess?.(paymentIntent);
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          `Pay ${amount.toFixed(2)} EGP`
        )}
      </Button>
    </form>
  );
}

export default function StripeCheckout({ amount, stripePublicKey, onSuccess, onError }) {
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (stripePublicKey) {
      setStripePromise(loadStripe(stripePublicKey));
    }
  }, [stripePublicKey]);

  useEffect(() => {
    // Create payment intent
    const createPaymentIntent = async () => {
      try {
        // This would normally call your backend to create a payment intent
        // For now, we'll show a placeholder
        setLoading(false);
      } catch (error) {
        toast.error("Failed to initialize payment");
        setLoading(false);
      }
    };

    createPaymentIntent();
  }, [amount]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!stripePublicKey) {
    return (
      <div className="text-center py-8 text-slate-600">
        <p>Stripe is not configured. Please contact the administrator.</p>
      </div>
    );
  }

  const options = {
    mode: 'payment',
    amount: Math.round(amount * 100), // Convert to cents
    currency: 'egp',
    appearance: {
      theme: 'stripe',
    },
  };

  return (
    <div>
      {stripePromise && (
        <Elements stripe={stripePromise} options={options}>
          <CheckoutForm 
            amount={amount} 
            onSuccess={onSuccess} 
            onError={onError}
          />
        </Elements>
      )}
    </div>
  );
}