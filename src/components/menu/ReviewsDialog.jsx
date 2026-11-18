import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Flag, User } from "lucide-react";
import { format } from "date-fns";

export default function ReviewsDialog({ menuItem, isOpen, onClose, currentUser, client }) {
  const [showAddReview, setShowAddReview] = useState(false);

  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", menuItem?.id],
    queryFn: async () => {
      if (!menuItem?.id) return [];
      const allReviews = await base44.entities.Review.filter({ menu_item_id: menuItem.id }, "-created_date");
      return allReviews.filter(r => r.status === "approved");
    },
    enabled: !!menuItem?.id && isOpen
  });

  const { data: userOrders = [] } = useQuery({
    queryKey: ["userOrders", client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      return await base44.entities.Order.filter({ customer_id: client.id, status: "completed" });
    },
    enabled: !!client?.id && isOpen
  });

  const hasOrderedItem = userOrders.some(order => 
    order.items?.some(item => item.menu_item_id === menuItem?.id)
  );

  const userHasReviewed = reviews.some(r => r.client_id === client?.id);

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
      />
    ));
  };

  if (!menuItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reviews for {menuItem.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-amber-600">{averageRating}</div>
                  <div className="flex gap-1 mt-1">
                    {renderStars(Math.round(parseFloat(averageRating)))}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{reviews.length} reviews</p>
                </div>
                {currentUser && client && hasOrderedItem && !userHasReviewed && (
                  <div className="flex-1 text-center">
                    <Button
                      onClick={() => setShowAddReview(true)}
                      className="bg-amber-500 hover:bg-amber-600"
                    >
                      Write a Review
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Add Review Section */}
          {showAddReview && (
            <AddReviewForm
              menuItem={menuItem}
              client={client}
              userOrders={userOrders}
              onSuccess={() => {
                setShowAddReview(false);
                onClose();
              }}
              onCancel={() => setShowAddReview(false)}
            />
          )}

          {/* Reviews List */}
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No reviews yet. Be the first to review!</p>
              </div>
            ) : (
              reviews.map((review) => (
                <Card key={review.id} className="border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-slate-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <p className="font-semibold text-slate-900">{review.client_name || "Anonymous"}</p>
                            <div className="flex gap-1 mt-1">
                              {renderStars(review.rating)}
                            </div>
                          </div>
                          <p className="text-xs text-slate-500">
                            {format(new Date(review.created_date), "MMM d, yyyy")}
                          </p>
                        </div>
                        {review.review_text && (
                          <p className="text-sm text-slate-700 mt-2">{review.review_text}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddReviewForm({ menuItem, client, userOrders, onSuccess, onCancel }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      return;
    }

    setSubmitting(true);
    try {
      const relevantOrder = userOrders.find(order =>
        order.items?.some(item => item.menu_item_id === menuItem.id)
      );

      await base44.entities.Review.create({
        menu_item_id: menuItem.id,
        menu_item_name: menuItem.name,
        client_id: client.id,
        client_name: client.name,
        order_id: relevantOrder?.id || "",
        rating,
        review_text: reviewText,
        status: "approved"
      });

      onSuccess();
    } catch (error) {
      console.error("Failed to submit review:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-2 border-amber-300 bg-amber-50/50">
      <CardContent className="p-4">
        <h3 className="font-semibold mb-3">Write Your Review</h3>
        
        <div className="mb-4">
          <p className="text-sm text-slate-600 mb-2">Your Rating*</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={`w-8 h-8 cursor-pointer transition-colors ${
                    star <= (hoverRating || rating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-300"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-slate-600 mb-2">Your Review (Optional)</p>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share your experience with this dish..."
            className="w-full p-3 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
            rows={4}
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="bg-amber-500 hover:bg-amber-600"
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}