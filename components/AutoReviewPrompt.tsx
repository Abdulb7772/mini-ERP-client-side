"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import OrderReviewModal from "./OrderReviewModal";
import axiosInstance from "@/services/axios";

interface DeliveredOrder {
  _id: string;
  orderNumber: string;
  items: Array<{
    productId: {
      _id: string;
      name: string;
      imageUrl?: string;
      images?: string[];
    };
    variationId?: string;
    quantity: number;
  }>;
}

export default function AutoReviewPrompt() {
  const { data: session, status } = useSession();
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [deliveredOrder, setDeliveredOrder] = useState<DeliveredOrder | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      checkForDeliveredOrders();
    }
  }, [status]);

  const checkForDeliveredOrders = async () => {
    try {
      // Check if the user has dismissed review prompts recently
      const lastDismissed = localStorage.getItem("lastReviewDismissed");
      if (lastDismissed) {
        const lastTime = new Date(lastDismissed).getTime();
        const now = new Date().getTime();
        const hoursSinceLastDismiss = (now - lastTime) / (1000 * 60 * 60);
        
        // Don't show again if dismissed within last 24 hours
        if (hoursSinceLastDismiss < 24) {
          return;
        }
      }

      const response = await axiosInstance.get("/orders/my-orders", {
        params: {
          status: "delivered",
          limit: 50,
        },
      });

      const deliveredOrders = response.data.data || [];
      
      // Find the first delivered order that may have unreviewed products
      if (deliveredOrders.length > 0) {
        const orderToReview = deliveredOrders[0];
        setDeliveredOrder(orderToReview);
        setShowReviewModal(true);
      }
    } catch (error) {
      console.error("Error checking for delivered orders:", error);
    }
  };

  const handleClose = () => {
    setShowReviewModal(false);
    setDeliveredOrder(null);
    // Store dismissal time
    localStorage.setItem("lastReviewDismissed", new Date().toISOString());
  };

  const handleSuccess = () => {
    setShowReviewModal(false);
    setDeliveredOrder(null);
    // Clear dismissal time since user engaged
    localStorage.removeItem("lastReviewDismissed");
  };

  if (!deliveredOrder || !showReviewModal) return null;

  return (
    <OrderReviewModal
      isOpen={showReviewModal}
      onClose={handleClose}
      orderId={deliveredOrder._id}
      orderNumber={deliveredOrder.orderNumber}
      products={deliveredOrder.items.map((item) => ({
        productId: item.productId._id,
        productName: item.productId.name,
        productImage: item.productId.imageUrl || item.productId.images?.[0],
        variationId: item.variationId,
      }))}
      onSuccess={handleSuccess}
      autoOpened={true}
    />
  );
}
