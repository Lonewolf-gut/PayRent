"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { KYC_DOCUMENT_LABELS, UTILITY_BILL_LABELS } from "@/lib/constants/financing-docs";
import { getEmploymentStatusLabel } from "@/lib/constants/employment-status";
import { SecureDocumentPreview } from "@/components/shared/secure-document-preview";

type KycDocument = {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
};

type ReviewItem = {
  id: string;
  type: string;
  status: string;
  providerName?: string | null;
  providerReference?: string | null;
  failureReason?: string | null;
  user?: {
    email: string;
    role: string;
    tenant?: {
      employmentStatus?: string | null;
      occupation?: string | null;
      employerName?: string | null;
      entityType?: string | null;
    } | null;
    landlord?: {
      employmentStatus?: string | null;
      occupation?: string | null;
      employerName?: string | null;
      entityType?: string | null;
    } | null;
    lender?: {
      employmentStatus?: string | null;
      lenderType?: string | null;
      institutionName?: string | null;
    } | null;
    agentProfile?: {
      employmentStatus?: string | null;
    } | null;
  };
  documents?: KycDocument[];
  data?: {
    bankAccountId?: string;
    ghanaCardNumber?: string;
    idNumber?: string;
    documentType?: string;
    fullName?: string;
    entityType?: string;
    companyName?: string;
    companyRegistrationNumber?: string;
    companyRegisteredAddress?: string;
    companyTin?: string;
    staffId?: string;
    employerName?: string;
    occupation?: string;
    address?: string;
    billType?: string;
    employmentStatus?: string;
  };
};

function getReviewEmploymentContext(review: ReviewItem) {
  const roleProfile =
    review.user?.tenant ??
    review.user?.landlord ??
    review.user?.lender ??
    review.user?.agentProfile;

  return {
    employmentStatus:
      review.data?.employmentStatus ?? roleProfile?.employmentStatus ?? null,
    occupation:
      review.data?.occupation ??
      (roleProfile && "occupation" in roleProfile ? roleProfile.occupation : null) ??
      (roleProfile && "lenderType" in roleProfile ? roleProfile.lenderType : null),
    employerName:
      review.data?.employerName ??
      (roleProfile && "employerName" in roleProfile ? roleProfile.employerName : null) ??
      (roleProfile && "institutionName" in roleProfile
        ? roleProfile.institutionName
        : null),
  };
}

function reviewTypeLabel(type: string) {
  switch (type) {
    case "KYB":
      return "Business verification (KYB)";
    case "EMPLOYMENT":
      return "Employment verification";
    case "ADDRESS":
      return "Address verification";
    case "BANK":
      return "Bank account validation";
    default:
      return "Identity verification (KYC)";
  }
}

function DocumentPreview({ doc }: { doc: KycDocument }) {
  const label = KYC_DOCUMENT_LABELS[doc.documentType] ?? doc.documentType;
  return (
    <SecureDocumentPreview
      documentId={doc.id}
      fileName={doc.fileName}
      label={label}
      scope="kyc"
    />
  );
}

export default function AdminKycPage() {
  const queryClient = useQueryClient();

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin-kyc"],
    queryFn: async () => {
      const res = await fetch("/api/admin/reviews?type=kyc");
      const json = await res.json();
      return (json.data ?? []) as ReviewItem[];
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
      toast.success("Verification approved");
      queryClient.invalidateQueries({ queryKey: ["admin-kyc"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectIdentityMutation = useMutation({
    mutationFn: async (verificationId: string) => {
      const reason =
        window.prompt("Enter a rejection reason for the user:")?.trim() ||
        "Documents could not be verified.";
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationId, rejectReason: reason }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: () => {
      toast.success("Verification rejected");
      queryClient.invalidateQueries({ queryKey: ["admin-kyc"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">KYC / KYB review queue</h1>
        <p className="text-muted-foreground">
          Review identity, employment, address, and business documents submitted by users. Admins are
          notified in-app and by email when new submissions arrive.
        </p>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !reviews?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No pending KYC or KYB submissions.
          </CardContent>
        </Card>
      ) : (
        reviews.map((review) => (
          <Card key={review.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="space-y-2">
                <CardTitle className="text-base">{reviewTypeLabel(review.type)}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {review.user?.email} · {review.user?.role}
                </p>
                {(() => {
                  const employment = getReviewEmploymentContext(review);
                  if (!employment.employmentStatus) return null;
                  return (
                    <p className="text-sm text-muted-foreground">
                      Employment: {getEmploymentStatusLabel(employment.employmentStatus)}
                      {employment.occupation ? ` · ${employment.occupation}` : ""}
                      {employment.employerName ? ` · ${employment.employerName}` : ""}
                    </p>
                  );
                })()}
                {review.type === "EMPLOYMENT" ? (
                  <div className="text-sm">
                    {review.data?.employerName ? (
                      <p className="font-medium">{review.data.employerName}</p>
                    ) : null}
                    {review.data?.occupation ? (
                      <p className="text-muted-foreground">Occupation: {review.data.occupation}</p>
                    ) : null}
                    {review.data?.staffId ? (
                      <p className="text-muted-foreground">Staff ID: {review.data.staffId}</p>
                    ) : null}
                  </div>
                ) : null}
                {review.type === "ADDRESS" ? (
                  <div className="text-sm">
                    <p className="font-medium">{review.data?.address}</p>
                    {review.data?.billType ? (
                      <p className="text-muted-foreground">
                        Bill type:{" "}
                        {UTILITY_BILL_LABELS[review.data.billType] ?? review.data.billType}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {review.data?.entityType === "COMPANY" || review.type === "KYB" ? (
                  <div className="text-sm">
                    <p className="font-medium">{review.data?.companyName}</p>
                    <p className="text-muted-foreground">
                      Reg. {review.data?.companyRegistrationNumber}
                      {review.data?.companyTin ? ` · TIN ${review.data.companyTin}` : ""}
                    </p>
                    <p className="text-muted-foreground">{review.data?.companyRegisteredAddress}</p>
                    <p className="text-muted-foreground">Contact: {review.data?.fullName}</p>
                  </div>
                ) : review.data?.fullName ? (
                  <p className="text-sm">
                    {review.data.fullName}
                    {review.data.documentType ? ` · ${review.data.documentType}` : ""}
                    {review.data.idNumber || review.data.ghanaCardNumber
                      ? ` · ${review.data.idNumber ?? review.data.ghanaCardNumber}`
                      : ""}
                  </p>
                ) : null}
                {review.failureReason ? (
                  <p className="text-sm text-amber-700">{review.failureReason}</p>
                ) : null}
              </div>
              <StatusBadge status={review.status} />
            </CardHeader>
            <CardContent className="space-y-4">
              {review.documents?.length ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {review.documents.map((doc) => (
                    <DocumentPreview key={doc.id} doc={doc} />
                  ))}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
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
                {(review.type === "IDENTITY" ||
                  review.type === "KYB" ||
                  review.type === "EMPLOYMENT" ||
                  review.type === "ADDRESS") &&
                  review.status === "PENDING" && (
                    <>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => approveIdentityMutation.mutate(review.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rejectIdentityMutation.mutate(review.id)}
                      >
                        Reject
                      </Button>
                    </>
                  )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
