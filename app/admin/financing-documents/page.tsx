"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FINANCING_DOC_LABELS } from "@/lib/constants/financing-docs";
import type { TenantFinancingDocType } from "@prisma/client";
import { SecureFileLink } from "@/components/shared/secure-file-link";

type FinancingDocRow = {
  id: string;
  documentType: TenantFinancingDocType;
  fileName: string;
  fileUrl: string;
  status: string;
  tenant: { user: { email: string; fullName?: string | null } };
};

export default function AdminFinancingDocumentsPage() {
  const queryClient = useQueryClient();

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["admin-financing-docs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/financing-documents?status=PENDING");
      const json = await res.json();
      return (json.data ?? []) as FinancingDocRow[];
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({
      documentId,
      status,
    }: {
      documentId: string;
      status: "APPROVED" | "REJECTED";
    }) => {
      const res = await fetch("/api/admin/financing-documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, status }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Review failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-financing-docs"] });
      toast.success("Document review saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tenant financing documents</h1>
        <p className="text-muted-foreground">
          Review payslips, employment letters, ID photos, and bank statements submitted for
          financing eligibility.
        </p>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : docs.length === 0 ? (
        <p className="text-muted-foreground">No pending documents.</p>
      ) : (
        <div className="grid gap-4">
          {docs.map((doc) => (
            <Card key={doc.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">
                    {FINANCING_DOC_LABELS[doc.documentType]}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {doc.tenant.user.fullName ?? doc.tenant.user.email}
                  </p>
                </div>
                <Badge variant="secondary">{doc.status}</Badge>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                <p className="text-sm">{doc.fileName}</p>
                <Button variant="outline" size="sm" asChild>
                  <SecureFileLink request={{ scope: "financing", documentId: doc.id }}>
                    View file
                  </SecureFileLink>
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={reviewMutation.isPending}
                  onClick={() =>
                    reviewMutation.mutate({ documentId: doc.id, status: "APPROVED" })
                  }
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={reviewMutation.isPending}
                  onClick={() =>
                    reviewMutation.mutate({ documentId: doc.id, status: "REJECTED" })
                  }
                >
                  Reject
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
