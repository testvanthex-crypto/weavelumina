import { useState } from "react";
import { Star, MessageSquare, Send, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId?: number;
  planName?: string;
  onSuccess?: () => void;
}

export default function FeedbackDialog({
  open,
  onOpenChange,
  orderId,
  planName,
  onSuccess,
}: FeedbackDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitFeedback = trpc.feedback.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setTimeout(() => {
        onOpenChange(false);
        setSubmitted(false);
        setRating(0);
        setComment("");
        onSuccess?.();
      }, 2200);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to submit feedback. Please try again.");
    },
  });

  const handleSubmit = () => {
    if (rating === 0) {
      toast.error("Please select a rating before submitting.");
      return;
    }
    submitFeedback.mutate({
      orderId,
      rating,
      comment: comment.trim() || undefined,
    });
  };

  const ratingLabels: Record<number, string> = {
    1: "Poor",
    2: "Fair",
    3: "Good",
    4: "Great",
    5: "Exceptional",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md border border-[#2a2410] shadow-2xl"
        style={{
          background: "linear-gradient(145deg, #0a0a0a 0%, #0f0d05 100%)",
          boxShadow: "0 0 60px rgba(201,168,76,0.08), 0 25px 50px rgba(0,0,0,0.8)",
        }}
      >
        {!submitted ? (
          <>
            <DialogHeader className="space-y-2 pb-2">
              <div className="flex items-center gap-2">
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)" }}
                >
                  <MessageSquare className="h-4 w-4 text-[#C9A84C]" />
                </div>
                <DialogTitle className="text-white text-lg font-semibold">
                  Share Your Experience
                </DialogTitle>
              </div>
              <DialogDescription className="text-gray-400 text-sm">
                {planName
                  ? `How was your experience with the ${planName} plan?`
                  : "How was your overall experience with LuminaWeave?"}
              </DialogDescription>
            </DialogHeader>

            {/* Star Rating */}
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isActive = star <= (hoveredRating || rating);
                  return (
                    <button
                      key={star}
                      className="transition-all duration-150 focus:outline-none"
                      style={{
                        transform: isActive ? "scale(1.15)" : "scale(1)",
                        filter: isActive
                          ? "drop-shadow(0 0 8px rgba(201,168,76,0.6))"
                          : "none",
                      }}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      onClick={() => setRating(star)}
                    >
                      <Star
                        className="h-9 w-9 transition-colors duration-150"
                        style={{
                          fill: isActive ? "#C9A84C" : "transparent",
                          stroke: isActive ? "#C9A84C" : "#3a3a3a",
                        }}
                      />
                    </button>
                  );
                })}
              </div>
              <div
                className="text-sm font-medium transition-all duration-200"
                style={{
                  color: (hoveredRating || rating) > 0 ? "#C9A84C" : "transparent",
                  minHeight: "1.25rem",
                }}
              >
                {ratingLabels[hoveredRating || rating] || ""}
              </div>
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">
                Comments{" "}
                <span className="text-gray-600 text-xs">(optional)</span>
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us what you loved or what we can improve..."
                maxLength={1000}
                rows={3}
                className="resize-none text-sm text-white placeholder:text-gray-600 focus:border-[#C9A84C]/50 transition-colors"
                style={{
                  background: "#0f0f0f",
                  border: "1px solid #1f1f1f",
                  borderRadius: "0.5rem",
                }}
              />
              <div className="text-right text-xs text-gray-600">
                {comment.length}/1000
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="flex-1 border border-[#1f1f1f] text-gray-400 hover:text-white hover:border-[#2f2f2f]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitFeedback.isPending || rating === 0}
                className="flex-1 font-semibold gap-2 transition-all"
                style={{
                  background: rating > 0
                    ? "linear-gradient(90deg, #8B7A2E, #C9A84C)"
                    : "#1a1a1a",
                  color: rating > 0 ? "#050505" : "#555",
                  border: "none",
                }}
              >
                {submitFeedback.isPending ? (
                  <span className="flex items-center gap-2">
                    <span
                      className="h-4 w-4 border-2 border-[#050505]/30 border-t-[#050505] rounded-full"
                      style={{ animation: "spin 0.8s linear infinite" }}
                    />
                    Submitting...
                  </span>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          /* Success State */
          <div
            className="flex flex-col items-center justify-center gap-4 py-8"
            style={{ animation: "fadeInUp 0.5s ease-out forwards" }}
          >
            <div
              className="h-16 w-16 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(201,168,76,0.15)",
                border: "2px solid rgba(201,168,76,0.4)",
                boxShadow: "0 0 30px rgba(201,168,76,0.2)",
              }}
            >
              <CheckCircle className="h-8 w-8 text-[#C9A84C]" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-white font-semibold text-lg">Thank You!</p>
              <p className="text-gray-400 text-sm">
                Your feedback helps us craft better experiences.
              </p>
            </div>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className="h-5 w-5"
                  style={{
                    fill: star <= rating ? "#C9A84C" : "transparent",
                    stroke: star <= rating ? "#C9A84C" : "#3a3a3a",
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
