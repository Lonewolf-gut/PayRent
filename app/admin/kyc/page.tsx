"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { toast } from "sonner";

export default function AdminKycPage() {
  const queryClient = useQueryClient();

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin-kyc"],
    queryFn: async () => {
      const res = await fetch("/api/admin/reviews?type=kyc");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const validateMutation = useMutation({
    mutationFn: async (bankAccountId: string) => {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankAccountId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: () => {
      toast.success("Bank account validated");
      queryClient.invalidateQueries({ queryKey: ["admin-kyc"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approveIdentityMutation = useMutation({
    mutationFn: async (verificationId: string) => {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: () => {
      toast.success("Identity verification approved");
      queryClient.invalidateQueries({ queryKey: ["admin-kyc"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">KYC review queue</h1>
        <p className="text-muted-foreground">
          Review identity and bank account validation requests from all roles.
        </p>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !reviews?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No pending KYC reviews.
          </CardContent>
        </Card>
      ) : (
        reviews.map(
          (review: {
            id: string;
            type: string;
            status: string;
            user?: { email: string; role: string };
            data?: {
              bankAccountId?: string;
              ghanaCardNumber?: string;
              fullName?: string;
            };
          }) => (
            <Card key={review.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">{review.type} verification</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {review.user?.email} · {review.user?.role}
                  </p>
                  {review.type === "IDENTITY" && review.data?.fullName ? (
                    <p className="mt-1 text-sm">
                      {review.data.fullName}
                      {review.data.ghanaCardNumber
                        ? ` · ${review.data.ghanaCardNumber}`
                        : ""}
                    </p>
                  ) : null}
                </div>
                <StatusBadge status={review.status} />
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {review.type === "BANK" &&
                  review.data?.bankAccountId &&
                  review.status === "PENDING" && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => validateMutation.mutate(review.data!.bankAccountId!)}
                    >
                      Validate bank account
                    </Button>
                  )}
                {review.type === "IDENTITY" && review.status === "PENDING" && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => approveIdentityMutation.mutate(review.id)}
                  >
                    Approve identity
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        )
      )}
    </div>
  );
}
