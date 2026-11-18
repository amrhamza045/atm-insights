import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Star, Flag, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ReviewModeration() {
  const [selectedReview, setSelectedReview] = useState(null);
  const [flagReason, setFlagReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const queryClient = useQueryClient();

  const { data: allReviews = [] } = useQuery({
    queryKey: ["allReviews"],
    queryFn: () => base44.entities.Review.list("-created_date")
  });

  const approvedReviews = allReviews.filter(r => r.status === "approved");
  const pendingReviews = allReviews.filter(r => r.status === "pending");
  const flaggedReviews = allReviews.filter(r => r.status === "flagged");
  const rejectedReviews = allReviews.filter(r => r.status === "rejected");

  const updateReviewMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Review.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allReviews"] });
      toast.success("Review updated successfully");
      setSelectedReview(null);
      setFlagReason("");
      setAdminNotes("");
    }
  });

  const handleApprove = (review) => {
    updateReviewMutation.mutate({
      id: review.id,
      data: { status: "approved", admin_notes: adminNotes }
    });
  };

  const handleFlag = (review) => {
    if (!flagReason.trim()) {
      toast.error("Please provide a reason for flagging");
      return;
    }
    updateReviewMutation.mutate({
      id: review.id,
      data: { status: "flagged", flagged_reason: flagReason, admin_notes: adminNotes }
    });
  };

  const handleReject = (review) => {
    updateReviewMutation.mutate({
      id: review.id,
      data: { status: "rejected", admin_notes: adminNotes }
    });
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
      />
    ));
  };

  const ReviewCard = ({ review, showActions = true }) => (
    <Card key={review.id} className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-semibold text-slate-900">{review.client_name}</p>
            <p className="text-sm text-slate-600">{review.menu_item_name}</p>
            <div className="flex gap-1 mt-1">
              {renderStars(review.rating)}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">
              {format(new Date(review.created_date), "MMM d, yyyy")}
            </p>
            <Badge
              className={
                review.status === "approved"
                  ? "bg-green-100 text-green-800"
                  : review.status === "flagged"
                  ? "bg-red-100 text-red-800"
                  : review.status === "rejected"
                  ? "bg-slate-100 text-slate-800"
                  : "bg-yellow-100 text-yellow-800"
              }
            >
              {review.status}
            </Badge>
          </div>
        </div>

        {review.review_text && (
          <p className="text-sm text-slate-700 mb-3 p-3 bg-slate-50 rounded">
            {review.review_text}
          </p>
        )}

        {review.flagged_reason && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded">
            <p className="text-xs font-medium text-red-900">Flagged Reason:</p>
            <p className="text-sm text-red-800">{review.flagged_reason}</p>
          </div>
        )}

        {review.admin_notes && (
          <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded">
            <p className="text-xs font-medium text-blue-900">Admin Notes:</p>
            <p className="text-sm text-blue-800">{review.admin_notes}</p>
          </div>
        )}

        {showActions && (
          <div className="space-y-3">
            {selectedReview?.id === review.id ? (
              <>
                <Textarea
                  placeholder="Admin notes (optional)"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="mb-2"
                  rows={2}
                />
                {review.status !== "flagged" && (
                  <Textarea
                    placeholder="Reason for flagging (required if flagging)"
                    value={flagReason}
                    onChange={(e) => setFlagReason(e.target.value)}
                    className="mb-2"
                    rows={2}
                  />
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedReview(null);
                      setFlagReason("");
                      setAdminNotes("");
                    }}
                  >
                    Cancel
                  </Button>
                  {review.status !== "approved" && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprove(review)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                  )}
                  {review.status !== "flagged" && (
                    <Button
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700"
                      onClick={() => handleFlag(review)}
                    >
                      <Flag className="w-4 h-4 mr-1" />
                      Flag
                    </Button>
                  )}
                  {review.status !== "rejected" && (
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => handleReject(review)}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedReview(review)}
              >
                Moderate
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Review Moderation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="approved">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="approved">
              Approved ({approvedReviews.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({pendingReviews.length})
            </TabsTrigger>
            <TabsTrigger value="flagged">
              Flagged ({flaggedReviews.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({rejectedReviews.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="approved" className="mt-4">
            {approvedReviews.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No approved reviews</p>
            ) : (
              approvedReviews.map(review => <ReviewCard key={review.id} review={review} />)
            )}
          </TabsContent>

          <TabsContent value="pending" className="mt-4">
            {pendingReviews.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No pending reviews</p>
            ) : (
              pendingReviews.map(review => <ReviewCard key={review.id} review={review} />)
            )}
          </TabsContent>

          <TabsContent value="flagged" className="mt-4">
            {flaggedReviews.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No flagged reviews</p>
            ) : (
              flaggedReviews.map(review => <ReviewCard key={review.id} review={review} />)
            )}
          </TabsContent>

          <TabsContent value="rejected" className="mt-4">
            {rejectedReviews.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No rejected reviews</p>
            ) : (
              rejectedReviews.map(review => <ReviewCard key={review.id} review={review} showActions={false} />)
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}