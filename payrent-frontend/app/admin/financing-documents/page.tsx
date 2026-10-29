"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FINANCING_DOC_LABELS, KYC_DOCUMENT_LABELS } from "@/lib/constants/financing-docs";
import type { TenantFinancingDocType } from "@prisma/client";
import { SecureFileLink } from "@/components/shared/secure-file-link";
import { toast } from "sonner";

type FinancingDocRow = {
  id: string;
  documentType: TenantFinancingDocType;
  fileName: string;
  fileUrl: string;
  status: string;
  tenantId: string;
  kycSummary: {
    fullName: string;
    email: string;
    phone?: string | null;
    kycVerified: boolean;
    employmentVerified: boolean;
    addressVerified: boolean;
    entityType: string;
    kycDocuments: Array<{ id: string; documentType: string; fileName: string; fileUrl: string }>;
    verifications: Array<{ id: string; type: string; status: string }>;
  };
};

type TenantDocGroup = {
  tenantId: string;
  summary: FinancingDocRow["kycSummary"];
  documents: FinancingDocRow[];
  pendingCount: number;
};

function groupDocsByTenant(docs: FinancingDocRow[]): TenantDocGroup[] {
  const groups = new Map<string, TenantDocGroup>();

  for (const doc of docs) {
    const existing = groups.get(doc.tenantId);
    if (existing) {
      existing.documents.push(doc);
      if (doc.status === "PENDING") existing.pendingCount += 1;
      continue;
    }

    groups.set(doc.tenantId, {
      tenantId: doc.tenantId,
      summary: doc.kycSummary,
      documents: [doc],
      pendingCount: doc.status === "PENDING" ? 1 : 0,
    });
  }

  return Array.from(groups.values()).sort((a, b) =>
    a.summary.fullName.localeCompare(b.summary.fullName)
  );
}

export default function AdminFinancingDocumentsPage() {
  const queryClient = useQueryClient();
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["admin-financing-docs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/financing-documents?status=PENDING");
      const json = await res.json();
      return (json.data ?? []) as FinancingDocRow[];
    },
  });

  const grouped = useMemo(() => groupDocsByTenant(docs), [docs]);
  const selectedGroup = grouped.find((group) => group.tenantId === selectedTenantId) ?? null;

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
        <h1 className="text-2xl font-bold">Customer financing documents</h1>
        <p className="text-muted-foreground">
          Review payslips and bank statements grouped by Customer. Each profile shows linked KYC
          verification status and previously approved identity documents.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !grouped.length ? (
        <p className="text-muted-foreground">No pending documents.</p>
      ) : (
        <Card className="rounded-none">
          <CardContent className="divide-y p-0">
            {grouped.map((group) => (
              <button
                key={group.tenantId}
                type="button"
                onClick={() => setSelectedTenantId(group.tenantId)}
                className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-medium">{group.summary.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    {group.summary.email}
                    {group.summary.phone ? ` · ${group.summary.phone}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {group.documents
                      .map((doc) => FINANCING_DOC_LABELS[doc.documentType])
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge variant={group.summary.kycVerified ? "default" : "secondary"}>
                    {group.summary.kycVerified ? "KYC verified" : "KYC pending"}
                  </Badge>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                    {group.pendingCount} pending
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <Sheet
        open={Boolean(selectedGroup)}
        onOpenChange={(open) => {
          if (!open) setSelectedTenantId(null);
        }}
      >
        <SheetContent side="right" variant="wide" className="gap-0 p-0">
          {selectedGroup ? (
            <>
              <SheetHeader className="border-b border-border px-6 py-5 pr-14">
                <SheetTitle>{selectedGroup.summary.fullName}</SheetTitle>
                <SheetDescription>
                  {selectedGroup.summary.email}
                  {selectedGroup.summary.phone ? ` · ${selectedGroup.summary.phone}` : ""}
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-none border border-border bg-card p-3 text-sm">
                    <p className="font-medium">Identity</p>
                    <p className="text-muted-foreground">
                      {selectedGroup.summary.kycVerified ? "Verified" : "Not verified"}
                    </p>
                  </div>
                  <div className="rounded-none border border-border bg-card p-3 text-sm">
                    <p className="font-medium">Employment</p>
                    <p className="text-muted-foreground">
                      {selectedGroup.summary.employmentVerified ? "Verified" : "Pending"}
                    </p>
                  </div>
                  <div className="rounded-none border border-border bg-card p-3 text-sm">
                    <p className="font-medium">Address</p>
                    <p className="text-muted-foreground">
                      {selectedGroup.summary.addressVerified ? "Verified" : "Pending"}
                    </p>
                  </div>
                </div>

                {selectedGroup.summary.verifications.length ? (
                  <div className="space-y-2">
                    <p className="font-medium">Verification history</p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {selectedGroup.summary.verifications.map((item) => (
                        <li key={item.id}>
                          {item.type} · {item.status}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {selectedGroup.summary.kycDocuments.length ? (
                  <div className="space-y-2">
                    <p className="font-medium">Previous KYC documents</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {selectedGroup.summary.kycDocuments.map((doc) => (
                        <SecureFileLink
                          key={doc.id}
                          request={{ scope: "kyc", documentId: doc.id }}
                          className="rounded-none border border-border bg-card p-3 text-sm text-emerald-600 hover:underline dark:text-emerald-400"
                        >
                          {KYC_DOCUMENT_LABELS[doc.documentType] ?? doc.documentType} ·{" "}
                          {doc.fileName}
                        </SecureFileLink>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-4">
                  <p className="font-medium">Financing submissions</p>
                  {selectedGroup.documents.map((doc) => (
                    <div key={doc.id} className="space-y-3 rounded-none border border-border bg-muted/20 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{FINANCING_DOC_LABELS[doc.documentType]}</p>
                          <p className="text-sm text-muted-foreground">{doc.fileName}</p>
                        </div>
                        <Badge variant="secondary">{doc.status}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" className="rounded-none" asChild>
                          <SecureFileLink request={{ scope: "financing", documentId: doc.id }}>
                            View file
                          </SecureFileLink>
                        </Button>
                        {doc.status === "PENDING" ? (
                          <>
                            <Button
                              size="sm"
                              className="rounded-none bg-emerald-600 hover:bg-emerald-700"
                              disabled={reviewMutation.isPending}
                              onClick={() =>
                                reviewMutation.mutate({
                                  documentId: doc.id,
                                  status: "APPROVED",
                                })
                              }
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="rounded-none"
                              disabled={reviewMutation.isPending}
                              onClick={() =>
                                reviewMutation.mutate({
                                  documentId: doc.id,
                                  status: "REJECTED",
                                })
                              }
                            >
                              Reject
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
