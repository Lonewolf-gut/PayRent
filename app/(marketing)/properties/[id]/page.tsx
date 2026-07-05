"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, Phone, Mail, Wallet } from "lucide-react";
import { PropertySaveButton } from "@/components/properties/property-save-button";
import { PropertyImageGallery } from "@/components/properties/property-image-gallery";
import { FinancingDocumentsForm } from "@/components/properties/financing-documents-form";
import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { isSaleListing } from "@/lib/subscription-limits";
import type { PropertyType } from "@prisma/client";

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const [amount, setAmount] = useState("");
  const [months, setMonths] = useState("12");
  const [moveInDate, setMoveInDate] = useState("");
  const [notes, setNotes] = useState("");
  const [supportingDocs, setSupportingDocs] = useState<FileList | null>(null);
  const [depositPromptOpen, setDepositPromptOpen] = useState(false);

  const { data: property, isLoading } = useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      const res = await fetch(`/api/properties/${id}`);
      const json = await res.json();
      return json.data;
    },
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const res = await fetch("/api/wallet");
      const json = await res.json();
      return json.data;
    },
    enabled: !!session?.user && session.user.role === "TENANT",
  });

  const { data: financingDocs } = useQuery({
    queryKey: ["tenant-financing-docs"],
    queryFn: async () => {
      const res = await fetch("/api/tenant/financing-documents");
      const json = await res.json();
      return json.data;
    },
    enabled: session?.user?.role === "TENANT",
  });

  const { data: applications } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const res = await fetch("/api/applications");
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: session?.user?.role === "TENANT",
  });

  const approvedApplication = applications?.find(
    (app: { propertyId: string; status: string }) =>
      app.propertyId === id && app.status === "APPROVED"
  );

  const applyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: id,
          requestedMoveInDate: moveInDate ? new Date(moveInDate).toISOString() : undefined,
          notes: notes || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? json.errors?.[0]?.message);

      const applicationId = json.data?.id as string | undefined;
      if (applicationId && supportingDocs?.length) {
        for (const file of Array.from(supportingDocs)) {
          const formData = new FormData();
          formData.append("document", file);
          const docRes = await fetch(`/api/applications/${applicationId}/documents`, {
            method: "POST",
            body: formData,
          });
          const docJson = await docRes.json();
          if (!docJson.success) throw new Error(docJson.message ?? "Failed to upload document");
        }
      }
    },
    onSuccess: () => {
      toast.success("Application submitted");
      router.push("/dashboard/tenant/applications");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const financeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/financing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: id,
          applicationId: approvedApplication?.id,
          requestedAmount: parseFloat(amount),
          durationMonths: parseInt(months, 10),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? json.errors?.[0]?.message);
    },
    onSuccess: () => {
      toast.success("Financing request submitted");
      router.push("/dashboard/tenant/financing");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/properties/${id}/purchase`, { method: "POST" });
      const json = await res.json();
      if (!json.success) {
        if (json.data?.code === "INSUFFICIENT_FUNDS") {
          setDepositPromptOpen(true);
          throw new Error("Insufficient wallet balance");
        }
        throw new Error(json.message ?? json.data?.error ?? "Purchase failed");
      }
      return json.data;
    },
    onSuccess: () => {
      toast.success("Purchase completed successfully");
      router.refresh();
    },
    onError: (e: Error) => {
      if (e.message !== "Insufficient wallet balance") {
        toast.error(e.message);
      }
    },
  });

  if (isLoading) return <p className="p-12 text-center text-muted-foreground">Loading...</p>;
  if (!property) return <p className="p-12 text-center">Property not found</p>;

  const images = property.images ?? [];
  const isSale = isSaleListing(property.propertyType as PropertyType);
  const listPrice = Number(property.monthlyRent);
  const discountedPrice = property.discountedPrice ? Number(property.discountedPrice) : null;
  const purchasePrice = discountedPrice ?? listPrice;
  const walletBalance = Number(wallet?.balance ?? 0);
  const displayAgent =
    property.agent ??
    (property.assignedAgent
      ? {
          name: property.assignedAgent.fullName,
          phone: property.assignedAgent.user?.phone ?? "",
          email: property.assignedAgent.user?.email ?? "",
          image: property.assignedAgent.user?.image,
        }
      : null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <PropertyImageGallery images={images} title={property.name} />
          <div>
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-3xl font-bold">{property.name}</h1>
              {property.isPremium && <Badge className="bg-amber-500">Premium</Badge>}
            </div>
            <p className="mt-2 flex items-center gap-1 text-muted-foreground">
              {!isSale && (
                <>
                  <MapPin className="h-4 w-4" />
                  {property.location}
                </>
              )}
            </p>
            {isSale ? (
              <div className="mt-4 space-y-1">
                {discountedPrice ? (
                  <>
                    <p className="text-lg text-muted-foreground line-through">
                      GHS {listPrice.toLocaleString()}
                    </p>
                    <p className="text-3xl font-bold text-emerald-600">
                      GHS {discountedPrice.toLocaleString()}
                    </p>
                  </>
                ) : (
                  <p className="text-3xl font-bold text-emerald-600">
                    GHS {listPrice.toLocaleString()}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-4 text-3xl font-bold text-emerald-600">
                GHS {listPrice.toLocaleString()}
                <span className="text-base font-normal text-muted-foreground">/month</span>
              </p>
            )}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-muted-foreground">{property.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {property.amenities?.map((a: string) => (
                  <Badge key={a} variant="secondary">
                    {a}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
          {displayAgent && (
            <Card>
              <CardHeader>
                <CardTitle>Property Agent</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-4">
                {displayAgent.image ? (
                  <Image
                    src={displayAgent.image}
                    alt={displayAgent.name}
                    width={48}
                    height={48}
                    className="size-12 rounded-full object-cover"
                  />
                ) : null}
                <div>
                  <p className="font-medium">{displayAgent.name}</p>
                  {displayAgent.phone ? (
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" /> {displayAgent.phone}
                    </p>
                  ) : null}
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" /> {displayAgent.email}
                  </p>
                </div>
                {session && (
                  <Button variant="outline" asChild className="ml-auto">
                    <Link href={`/dashboard/tenant/messages?agent=${displayAgent.email}`}>
                      Contact Agent
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        <div className="space-y-4">
          <PropertySaveButton propertyId={id} variant="button" />
          {session ? (
            <>
              {session.user.role === "TENANT" && isSale && property.status === "ACTIVE" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="size-5" />
                      Buy with wallet
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Pay GHS {purchasePrice.toLocaleString()} directly from your wallet.
                    </p>
                    <p className="text-sm">
                      Balance:{" "}
                      <span className="font-semibold text-emerald-700">
                        GHS {walletBalance.toLocaleString()}
                      </span>
                    </p>
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      disabled={purchaseMutation.isPending}
                      onClick={() => purchaseMutation.mutate()}
                    >
                      {purchaseMutation.isPending ? "Processing..." : "Buy now"}
                    </Button>
                  </CardContent>
                </Card>
              )}
              {session.user.role === "TENANT" && !isSale && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Apply for this property</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Preferred move-in date</Label>
                        <Input type="date" value={moveInDate} onChange={(e) => setMoveInDate(e.target.value)} />
                      </div>
                      <div>
                        <Label>Notes (optional)</Label>
                        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tell the landlord about yourself" />
                      </div>
                      <div>
                        <Label>Supporting documents (optional)</Label>
                        <Input type="file" multiple accept=".pdf,image/*" onChange={(e) => setSupportingDocs(e.target.files)} />
                      </div>
                      <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        disabled={applyMutation.isPending || !!approvedApplication}
                        onClick={() => applyMutation.mutate()}
                      >
                        {approvedApplication ? "Application approved" : "Submit application"}
                      </Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Financing documents</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FinancingDocumentsForm />
                    </CardContent>
                  </Card>
                  {approvedApplication && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Request Pay for Rent financing</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <StatusBadge status="APPROVED" label="Application approved" />
                        {!financingDocs?.allApproved ? (
                          <p className="text-sm text-amber-700">
                            Upload and get admin approval for all financing documents before requesting financing.
                          </p>
                        ) : null}
                        <div>
                          <Label>Amount (GHS)</Label>
                          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(property.monthlyRent)} />
                        </div>
                        <div>
                          <Label>Repayment period (months)</Label>
                          <Input type="number" value={months} onChange={(e) => setMonths(e.target.value)} />
                        </div>
                        <Button
                          className="w-full bg-emerald-600 hover:bg-emerald-700"
                          disabled={!amount || financeMutation.isPending || !financingDocs?.allApproved}
                          onClick={() => financeMutation.mutate()}
                        >
                          Create financing request
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="mb-4 text-sm text-muted-foreground">
                  Sign in to apply, buy, or request financing for this listing.
                </p>
                <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <Link href="/login">Sign in</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={depositPromptOpen} onOpenChange={setDepositPromptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insufficient wallet balance</DialogTitle>
            <DialogDescription>
              You need GHS {purchasePrice.toLocaleString()} but your balance is GHS {walletBalance.toLocaleString()}. Deposit funds to continue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDepositPromptOpen(false)}>Cancel</Button>
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
              <Link href="/dashboard/tenant/wallet">Deposit to wallet</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
