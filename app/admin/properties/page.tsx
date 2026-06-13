"use client";

import { useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type AdminPendingProperty = {
  id: string;
  name: string;
  propertyType?: string;
  region?: string | null;
  city?: string | null;
  area?: string | null;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  monthlyRent: string | number;
  annualRent?: string | number;
  description: string;
  amenities: string[];
  availableFrom?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  landlord?: { user?: { email: string } };
  images?: { id: string; url: string; alt?: string | null }[];
  videos?: { id: string; url: string; title?: string | null }[];
};

export default function AdminPropertiesPage() {
  const [selectedProperty, setSelectedProperty] = useState<AdminPendingProperty | null>(null);
  const queryClient = useQueryClient();

  const { data: pending, isLoading } = useQuery<AdminPendingProperty[]>({
    queryKey: ["admin-properties-pending"],
    queryFn: async () => {
      const res = await fetch("/api/admin/properties?status=PENDING_VERIFICATION");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      const res = await fetch("/api/admin/properties", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, status: "ACTIVE" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-properties-pending"] });
      setSelectedProperty(null);
      toast.success("Property approved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleViewProperty = (property: AdminPendingProperty) => {
    setSelectedProperty(property);
  };

  const propertyCount = pending?.length ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Property Management</h1>
      <Card>
        <CardHeader>
          <CardTitle>Pending verification ({propertyCount})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : !pending?.length ? (
            <p className="text-sm text-muted-foreground">No pending listings.</p>
          ) : (
            <ul className="space-y-3">
              {pending.map((property) => (
                <li
                  key={property.id}
                  className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm font-semibold">{property.name}</span>
                      <Badge variant="secondary">{property.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {property.location} · GHS {Number(property.monthlyRent).toLocaleString()}/mo
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Landlord: {property.landlord?.user?.email ?? "Unknown"}
                    </p>
                    <p className="text-xs text-slate-600">
                      {property.images?.length ?? 0} photo(s) submitted · {property.videos?.length ?? 0} video(s)
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleViewProperty(property)}>
                      View details
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => approveMutation.mutate(property.id)}
                      disabled={approveMutation.status === "loading"}
                    >
                      Approve
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selectedProperty)}
        onOpenChange={(open) => {
          if (!open) setSelectedProperty(null);
        }}
      >
        <DialogContent className="max-h-[92vh] w-full max-w-[95vw] lg:max-w-[90vw] overflow-y-auto p-6">
          <DialogHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <DialogTitle>{selectedProperty?.name}</DialogTitle>
                <p className="text-sm text-muted-foreground">Review submitted listing details and media before approving.</p>
              </div>
              {selectedProperty ? (
                <Badge variant="secondary" className="self-start">
                  {selectedProperty.status}
                </Badge>
              ) : null}
            </div>
          </DialogHeader>

          {selectedProperty ? (
            <div className="space-y-6 pt-4">
              <div className="grid gap-6 xl:grid-cols-[1.75fr_1fr]">
                <section className="space-y-6">
                  <div className="grid gap-4 rounded-3xl border border-slate-200 bg-card p-5 shadow-sm">
                    <div className="grid gap-4 sm:grid-cols-[1.3fr_0.9fr]">
                      <div className="space-y-3">
                        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Location</p>
                        <p className="text-lg font-semibold">{selectedProperty.location}</p>
                        <p className="text-sm text-muted-foreground">
                          {[selectedProperty.region, selectedProperty.city, selectedProperty.area]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-slate-200 bg-background p-4">
                        <p className="text-sm text-muted-foreground">Available from</p>
                        <p className="mt-2 text-base font-semibold">
                          {selectedProperty.availableFrom
                            ? new Date(selectedProperty.availableFrom).toLocaleDateString()
                            : "Not set"}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-3xl border border-slate-200 bg-background p-4">
                        <p className="text-sm text-muted-foreground">Rent</p>
                        <p className="mt-2 text-2xl font-semibold">
                          GHS {Number(selectedProperty.monthlyRent).toLocaleString()}/mo
                        </p>
                        {selectedProperty.annualRent ? (
                          <p className="text-sm text-muted-foreground mt-1">
                            GHS {Number(selectedProperty.annualRent).toLocaleString()}/yr
                          </p>
                        ) : null}
                      </div>
                      <div className="rounded-3xl border border-slate-200 bg-background p-4">
                        <p className="text-sm text-muted-foreground">Amenities</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedProperty.amenities?.map((amenity) => (
                            <Badge key={amenity} variant="outline">
                              {amenity}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-3xl border border-slate-200 bg-card p-5 shadow-sm">
                    <h3 className="text-sm font-semibold">Description</h3>
                    <p className="text-sm leading-7 text-muted-foreground">{selectedProperty.description}</p>
                  </div>

                  <div className="space-y-4 rounded-3xl border border-slate-200 bg-card p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold">Media attachments</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedProperty.images?.length ?? 0} photos • {selectedProperty.videos?.length ?? 0} videos
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {selectedProperty.images?.map((image) => (
                        <div key={image.id} className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-950/5">
                          <div className="aspect-[4/3] w-full">
                            <Image
                              src={image.url}
                              alt={image.alt ?? selectedProperty.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {selectedProperty.videos?.length ? (
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold">Video attachments</h4>
                        <div className="grid gap-4">
                          {selectedProperty.videos.map((video) => (
                            <div key={video.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-background">
                              <video controls className="aspect-[16/9] w-full bg-black object-cover">
                                <source src={video.url} />
                              </video>
                              <div className="p-4">
                                <p className="text-sm font-medium">{video.title ?? "Property video"}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>

                <aside className="space-y-4">
                  <div className="rounded-3xl border border-slate-200 bg-card p-5 shadow-sm">
                    <p className="text-sm text-muted-foreground">Submitted by</p>
                    <p className="mt-2 font-semibold">{selectedProperty.landlord?.user?.email ?? "Unknown landlord"}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Submitted {new Date(selectedProperty.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-card p-5 shadow-sm">
                    <p className="text-sm text-muted-foreground">Coordinates</p>
                    <div className="mt-2 text-base font-medium">
                      {selectedProperty.latitude != null && selectedProperty.longitude != null ? (
                        <span>
                          {selectedProperty.latitude.toFixed(4)}, {selectedProperty.longitude.toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Not available</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-card p-5 shadow-sm">
                    <p className="text-sm text-muted-foreground">Review actions</p>
                    <div className="mt-4 flex flex-col gap-3">
                      <Button
                        className="w-full"
                        onClick={() => selectedProperty && approveMutation.mutate(selectedProperty.id)}
                          disabled={approveMutation.status === "loading"}
                      >
                        Approve listing
                      </Button>
                      <Button className="w-full" variant="outline" onClick={() => setSelectedProperty(null)}>
                        Close
                      </Button>
                    </div>
                  </div>
                </aside>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-card p-5 shadow-sm">
                <h3 className="text-sm font-semibold">Map preview</h3>
                {selectedProperty.latitude != null && selectedProperty.longitude != null ? (
                  <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200">
                    <iframe
                      title="Property location"
                      src={`https://www.google.com/maps?q=${selectedProperty.latitude},${selectedProperty.longitude}&z=15&output=embed`}
                      className="h-72 w-full"
                    />
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">No geographic coordinates available for this property.</p>
                )}
              </div>
            </div>
          ) : null}

          <DialogFooter className="mt-4 justify-end">
            <Button variant="outline" onClick={() => setSelectedProperty(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
