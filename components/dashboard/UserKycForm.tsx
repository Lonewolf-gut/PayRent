"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { toast } from "sonner";
import { CheckCircle2, Shield, Building2 } from "lucide-react";

export function UserKycForm({ roleLabel = "User" }: { roleLabel?: string }) {
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState({
    occupation: "",
    employerName: "",
    monthlyIncome: "",
    residentialAddress: "",
    dateOfBirth: "",
  });
  const [ghanaCard, setGhanaCard] = useState({
    ghanaCardNumber: "",
    fullName: "",
    dateOfBirth: "",
  });
  const [bank, setBank] = useState({
    bankName: "",
    accountNumber: "",
    accountName: "",
  });

  const { data: status, isLoading } = useQuery({
    queryKey: ["kyc-status"],
    queryFn: async () => {
      const res = await fetch("/api/kyc");
      const json = await res.json();
      return json.data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (payload: { action: string; data: Record<string, unknown> }) => {
      const res = await fetch("/api/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Request failed");
    },
    onSuccess: () => {
      toast.success("Saved successfully");
      queryClient.invalidateQueries({ queryKey: ["kyc-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const identityPending =
    status?.verifications?.some(
      (v: { type: string; status: string }) =>
        v.type === "IDENTITY" && v.status === "PENDING"
    ) ?? false;

  if (isLoading) {
    return <p className="text-muted-foreground">Loading verification status...</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Profile & KYC</h1>
        <p className="text-muted-foreground">
          Complete your {roleLabel.toLowerCase()} profile, Ghana Card verification, and bank
          account setup.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Shield className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-sm text-muted-foreground">Profile</p>
              <StatusBadge
                status={status?.profileStatus === "PROFILE_COMPLETED" ? "APPROVED" : "PENDING"}
                label={status?.profileStatus ?? "Incomplete"}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-sm text-muted-foreground">Ghana Card</p>
              <StatusBadge
                status={
                  status?.kycVerified
                    ? "APPROVED"
                    : identityPending
                      ? "PENDING"
                      : "PENDING"
                }
                label={
                  status?.kycVerified
                    ? "Verified"
                    : identityPending
                      ? "Pending review"
                      : "Not submitted"
                }
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Building2 className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-sm text-muted-foreground">Bank account</p>
              <StatusBadge
                status={
                  status?.bankAccounts?.[0]?.validationStatus === "VALIDATED"
                    ? "APPROVED"
                    : "PENDING"
                }
                label={status?.bankAccounts?.[0]?.validationStatus ?? "Not added"}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{roleLabel} profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Date of birth</Label>
            <Input
              type="date"
              value={profile.dateOfBirth}
              onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
            />
          </div>
          <div>
            <Label>Occupation</Label>
            <Input
              value={profile.occupation}
              onChange={(e) => setProfile({ ...profile, occupation: e.target.value })}
            />
          </div>
          <div>
            <Label>Employer</Label>
            <Input
              value={profile.employerName}
              onChange={(e) => setProfile({ ...profile, employerName: e.target.value })}
            />
          </div>
          <div>
            <Label>Monthly income (GHS)</Label>
            <Input
              type="number"
              value={profile.monthlyIncome}
              onChange={(e) => setProfile({ ...profile, monthlyIncome: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Residential / office address</Label>
            <Input
              value={profile.residentialAddress}
              onChange={(e) =>
                setProfile({ ...profile, residentialAddress: e.target.value })
              }
            />
          </div>
          <Button
            className="sm:col-span-2 bg-emerald-600 hover:bg-emerald-700"
            onClick={() =>
              mutation.mutate({
                action: "profile",
                data: {
                  ...profile,
                  monthlyIncome: profile.monthlyIncome
                    ? Number(profile.monthlyIncome)
                    : undefined,
                },
              })
            }
          >
            Save profile
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ghana Card verification</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Ghana Card number</Label>
            <Input
              placeholder="GHA-123456789-1"
              value={ghanaCard.ghanaCardNumber}
              onChange={(e) =>
                setGhanaCard({ ...ghanaCard, ghanaCardNumber: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Full name</Label>
            <Input
              value={ghanaCard.fullName}
              onChange={(e) => setGhanaCard({ ...ghanaCard, fullName: e.target.value })}
            />
          </div>
          <Button
            className="sm:col-span-2 bg-emerald-600 hover:bg-emerald-700"
            disabled={status?.kycVerified || identityPending}
            onClick={() => mutation.mutate({ action: "ghana-card", data: ghanaCard })}
          >
            {identityPending
              ? "Pending admin review"
              : status?.kycVerified
                ? "Verified"
                : "Submit for verification"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bank account</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Bank name</Label>
            <Input
              value={bank.bankName}
              onChange={(e) => setBank({ ...bank, bankName: e.target.value })}
            />
          </div>
          <div>
            <Label>Account number</Label>
            <Input
              value={bank.accountNumber}
              onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Account name</Label>
            <Input
              value={bank.accountName}
              onChange={(e) => setBank({ ...bank, accountName: e.target.value })}
            />
          </div>
          <Button
            className="sm:col-span-2 bg-emerald-600 hover:bg-emerald-700"
            onClick={() =>
              mutation.mutate({
                action: "bank-account",
                data: { ...bank, isDefault: true },
              })
            }
          >
            Submit for validation
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
