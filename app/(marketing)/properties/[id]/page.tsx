"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Phone, Mail, Heart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/dashboard/status-badge";

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const [amount, setAmount] = useState("");
  const [months, setMonths] = useState("12");
  const [moveInDate, setMoveInDate] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const { data: property, isLoading } = useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      const res = await fetch(`/api/properties/${id}`);
      const json = await res.json();
      return json.data;
    },
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

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/properties/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: id }),
      });
      if (!res.ok) throw new Error("Failed to save");
    },
    onSuccess: () => toast.success("Property saved"),
  });

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

  if (isLoading) return <p className="p-12 text-center text-muted-foreground">Loading...</p>;
  if (!property) return <p className="p-12 text-center">Property not found</p>;
  const images = property.images ?? [];
  const primaryImage = selectedImage ?? images[0]?.url ?? null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            {primaryImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={primaryImage}
                alt={property.name}
                className="aspect-video w-full rounded-xl object-cover"
              />
            ) : (
              <div className="aspect-video rounded-xl bg-muted" />
            )}
            {images.length > 1 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {images.map((img: { id: string; url: string }) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setSelectedImage(img.url)}
                    className={`overflow-hidden rounded-lg border-2 ${
                      primaryImage === img.url ? "border-emerald-600" : "border-transparent"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={`${property.name} view`}
                      className="h-24 w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-3xl font-bold">{property.name}</h1>
              {property.isPremium && <Badge className="bg-amber-500">Premium</Badge>}
            </div>
            <p className="mt-2 flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {property.location}
            </p>
            <p className="mt-4 text-3xl font-bold text-emerald-600">
              GHS {Number(property.monthlyRent).toLocaleString()}
              <span className="text-base font-normal text-muted-foreground">/month</span>
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {property.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {property.amenities?.map((a: string) => (
                  <Badge key={a} variant="secondary">{a}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
          {property.agent && (
            <Card>
              <CardHeader>
                <CardTitle>Property Agent</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-4">
                <div>
                  <p className="font-medium">{property.agent.name}</p>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" /> {property.agent.phone}
                  </p>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" /> {property.agent.email}
                  </p>
                </div>
                {session && (
                  <Button variant="outline" asChild className="ml-auto">
                    <Link href={`/dashboard/tenant/messages?agent=${property.agent.email}`}>
                      Contact Agent
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        <div className="space-y-4">
          {session ? (
            <>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => saveMutation.mutate()}
              >
                <Heart className="mr-2 h-4 w-4" /> Save property
              </Button>
              {session.user.role === "TENANT" && (
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
                      <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        disabled={applyMutation.isPending || !!approvedApplication}
                        onClick={() => applyMutation.mutate()}
                      >
                        {approvedApplication ? "Application approved" : "Submit application"}
                      </Button>
                    </CardContent>
                  </Card>
                  {approvedApplication && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Request Pay for Rent financing</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <StatusBadge status="APPROVED" label="Application approved" />
                        <div>
                          <Label>Amount (GHS)</Label>
                          <Input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder={String(property.monthlyRent)}
                          />
                        </div>
                        <div>
                          <Label>Repayment period (months)</Label>
                          <Input
                            type="number"
                            value={months}
                            onChange={(e) => setMonths(e.target.value)}
                          />
                        </div>
                        <Button
                          className="w-full bg-emerald-600 hover:bg-emerald-700"
                          disabled={!amount || financeMutation.isPending}
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
                <p className="text-sm text-muted-foreground mb-4">
                  Sign in to save or request financing
                </p>
                <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <Link href="/login">Sign in</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
