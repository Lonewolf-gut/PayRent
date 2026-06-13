"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { propertySchema, type PropertyInput } from "@/lib/validations/property";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type LandlordPropertyInput = PropertyInput & {
  googleMapUrl?: string;
};

export default function LandlordPropertiesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [editImages, setEditImages] = useState<File[]>([]);
  const [editVideo, setEditVideo] = useState<File | null>(null);
  const [mapUrl, setMapUrl] = useState("");
  const [editMapUrl, setEditMapUrl] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [editLocationQuery, setEditLocationQuery] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [editFileError, setEditFileError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: landlordProperties, isLoading: isPropertiesLoading } = useQuery({
    queryKey: ["landlord-properties"],
    queryFn: async () => {
      const res = await fetch("/api/properties/landlord");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Unable to load properties");
      return json.data ?? [];
    },
  });

  const editForm = useForm<LandlordPropertyInput>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      propertyType: "APARTMENT",
      amenities: [],
    },
  });

  const { register: editRegister, handleSubmit: handleEditSubmit, setValue: setEditValue, formState: { errors: editErrors } } = editForm;
  const { register: addRegister, handleSubmit: handleAddSubmit, setValue: setAddValue, formState: { errors: addErrors } } = useForm<LandlordPropertyInput>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      propertyType: "APARTMENT",
      amenities: [],
    },
  });

  const locationField = addRegister("location");
  const editLocationField = editRegister("location");
  const googleMapQuery = mapUrl || locationQuery;
  const editGoogleMapQuery = editMapUrl || editLocationQuery;

  useEffect(() => {
    if (!mapUrl) {
      return;
    }

    const coords = /@(-?[0-9.]+),(-?[0-9.]+)/.exec(mapUrl);
    if (coords) {
      setAddValue("latitude", Number(coords[1]));
      setAddValue("longitude", Number(coords[2]));
    }
  }, [mapUrl, setAddValue]);

  useEffect(() => {
    if (!editMapUrl) {
      return;
    }

    const coords = /@(-?[0-9.]+),(-?[0-9.]+)/.exec(editMapUrl);
    if (coords) {
      setEditValue("latitude", Number(coords[1]));
      setEditValue("longitude", Number(coords[2]));
    }
  }, [editMapUrl, setEditValue]);

  const addImagePreviews = useMemo(
    () => images.map((file) => URL.createObjectURL(file)),
    [images]
  );

  const editImagePreviews = useMemo(
    () => editImages.map((file) => URL.createObjectURL(file)),
    [editImages]
  );

  useEffect(() => {
    return () => {
      addImagePreviews.forEach(URL.revokeObjectURL);
      editImagePreviews.forEach(URL.revokeObjectURL);
    };
  }, [addImagePreviews, editImagePreviews]);

  const handleImagesChange = (files: FileList | null) => {
    if (!files) {
      setImages([]);
      return;
    }

    const selected = Array.from(files).slice(0, 10);
    if (files.length > 10) {
      setFileError("Maximum 10 images allowed.");
    } else {
      setFileError(null);
    }
    setImages(selected);
  };

  const handleEditImagesChange = (files: FileList | null) => {
    if (!files) {
      setEditImages([]);
      return;
    }

    const selected = Array.from(files).slice(0, 10);
    if (files.length > 10) {
      setEditFileError("Maximum 10 images allowed.");
    } else {
      setEditFileError(null);
    }
    setEditImages(selected);
  };

  const handleVideoChange = (file: File | null) => {
    if (file && !file.type.startsWith("video/")) {
      setFileError("Please select a valid video file.");
      return;
    }
    setFileError(null);
    setVideo(file);
  };

  const handleEditVideoChange = (file: File | null) => {
    if (file && !file.type.startsWith("video/")) {
      setEditFileError("Please select a valid video file.");
      return;
    }
    setEditFileError(null);
    setEditVideo(file);
  };

  const createProperty = useMutation({
    mutationFn: async (data: LandlordPropertyInput) => {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("propertyType", data.propertyType);
      formData.append("monthlyRent", String(data.monthlyRent));
      formData.append("annualRent", String(data.annualRent));
      formData.append("location", data.location);
      if (data.latitude !== undefined) {
        formData.append("latitude", String(data.latitude));
      }
      if (data.longitude !== undefined) {
        formData.append("longitude", String(data.longitude));
      }
      formData.append("description", data.description);
      if (data.availableFrom) {
        formData.append("availableFrom", data.availableFrom);
      }
      if (mapUrl) {
        formData.append("googleMapUrl", mapUrl);
      }
      images.slice(0, 10).forEach((file) => formData.append("images", file));
      if (video) {
        formData.append("video", video);
      }

      const res = await fetch("/api/properties", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Failed to create property");
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landlord-properties"] });
      toast.success("Property submitted for approval with attachments");
      setShowForm(false);
      setImages([]);
      setVideo(null);
      setMapUrl("");
    },
    onError: (error: any) => {
      toast.error(error?.message ?? "Failed to create property");
    },
  });

  const updateProperty = useMutation({
    mutationFn: async (data: LandlordPropertyInput & { id: string }) => {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("propertyType", data.propertyType);
      formData.append("monthlyRent", String(data.monthlyRent));
      formData.append("annualRent", String(data.annualRent));
      formData.append("location", data.location);
      if (data.latitude !== undefined) {
        formData.append("latitude", String(data.latitude));
      }
      if (data.longitude !== undefined) {
        formData.append("longitude", String(data.longitude));
      }
      formData.append("description", data.description);
      if (data.availableFrom) {
        formData.append("availableFrom", data.availableFrom);
      }
      if (editMapUrl) {
        formData.append("googleMapUrl", editMapUrl);
      }
      editImages.slice(0, 10).forEach((file) => formData.append("images", file));
      if (editVideo) {
        formData.append("video", editVideo);
      }

      const res = await fetch(`/api/properties/${data.id}`, {
        method: "PATCH",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Failed to update property");
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landlord-properties"] });
      toast.success("Property listing updated");
      setEditingPropertyId(null);
      setEditImages([]);
      setEditVideo(null);
      setEditMapUrl("");
      setEditLocationQuery("");
    },
    onError: (error: any) => {
      toast.error(error?.message ?? "Failed to update property");
    },
  });

  const deleteProperty = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/properties/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Failed to delete property");
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landlord-properties"] });
      toast.success("Property listing removed");
    },
    onError: (error: any) => {
      toast.error(error?.message ?? "Failed to delete property");
    },
  });

  const onSubmit = async (data: LandlordPropertyInput) => {
    await createProperty.mutateAsync(data);
  };

  const onEditSubmit = async (data: LandlordPropertyInput) => {
    if (!editingPropertyId) return;
    await updateProperty.mutateAsync({ ...data, id: editingPropertyId });
  };

  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" | "ghost" }> = {
    DRAFT: { label: "Draft", variant: "secondary" },
    PENDING_VERIFICATION: { label: "Pending verification", variant: "outline" },
    ACTIVE: { label: "Active", variant: "default" },
    RENTED: { label: "Rented", variant: "destructive" },
    INACTIVE: { label: "Inactive", variant: "ghost" },
  };

  const editingProperty = landlordProperties?.find((property: any) => property.id === editingPropertyId);

  const beginEdit = (property: any) => {
    setEditingPropertyId(property.id);
    setShowForm(false);
    setEditImages([]);
    setEditVideo(null);
    setEditMapUrl("");
    setEditLocationQuery(property.location ?? "");
    editForm.reset({
      name: property.name,
      propertyType: property.propertyType,
      monthlyRent: Number(property.monthlyRent),
      annualRent: Number(property.annualRent),
      location: property.location,
      latitude: property.latitude ?? undefined,
      longitude: property.longitude ?? undefined,
      description: property.description,
      availableFrom: property.availableFrom ? new Date(property.availableFrom).toISOString().slice(0, 16) : undefined,
      amenities: property.amenities ?? [],
    });
  };

  const cancelEdit = () => {
    setEditingPropertyId(null);
    setEditImages([]);
    setEditVideo(null);
    setEditMapUrl("");
    setEditLocationQuery("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Properties</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your current listings and status are shown here before you add a new property.
          </p>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "Add property"}
        </Button>
      </div>

      {isPropertiesLoading ? (
        <p className="text-muted-foreground">Loading your listings...</p>
      ) : !landlordProperties?.length ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-muted-foreground">
          No listings yet. Add a property to start the onboarding process.
        </div>
      ) : (
        <div className="space-y-3">
          {landlordProperties.map((property: any) => {
            const status = statusMap[property.status] ?? { label: property.status, variant: "default" };
            return (
              <div
                key={property.id}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                  <span className="font-medium text-slate-900">{property.name}</span>
                  <Badge variant="secondary">{property.propertyType}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => beginEdit(property)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteProperty.mutate(property.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingPropertyId && editingProperty && (
        <Card>
          <CardHeader>
            <CardTitle>Edit listing</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEditSubmit(onEditSubmit)} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Property name</Label>
                <Input {...editRegister("name")} />
                {editErrors.name && <p className="text-xs text-destructive">{editErrors.name.message}</p>}
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  defaultValue={editingProperty.propertyType}
                  onValueChange={(v) => setEditValue("propertyType", v as PropertyInput["propertyType"])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APARTMENT">Apartment</SelectItem>
                    <SelectItem value="HOUSE">House</SelectItem>
                    <SelectItem value="CONDO">Condo</SelectItem>
                    <SelectItem value="STUDIO">Studio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Location</Label>
                <Input
                  {...editLocationField}
                  value={editLocationQuery}
                  onChange={(event) => {
                    editLocationField.onChange(event);
                    setEditLocationQuery(event.target.value);
                  }}
                />
                {editErrors.location && <p className="text-xs text-destructive">{editErrors.location.message}</p>}
              </div>
              <div className="sm:col-span-2">
                <Label>Google Maps place or URL</Label>
                <Input
                  value={editMapUrl}
                  onChange={(event) => setEditMapUrl(event.target.value)}
                  placeholder="Paste a Google Maps URL or place name"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Optional: paste a Google Maps URL or description to help the admin verify the address.
                </p>
              </div>
              <div className="sm:col-span-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-700">Map preview</p>
                  <div className="mt-3 h-56 overflow-hidden rounded-xl border border-slate-200">
                    <iframe
                      title="Location preview"
                      src={`https://www.google.com/maps?q=${encodeURIComponent(
                        editGoogleMapQuery || "Accra, Ghana"
                      )}&output=embed`}
                      className="h-full w-full border-0"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label>Monthly rent (GHS)</Label>
                <Input type="number" {...editRegister("monthlyRent", { valueAsNumber: true })} />
              </div>
              <div>
                <Label>Annual rent (GHS)</Label>
                <Input type="number" {...editRegister("annualRent", { valueAsNumber: true })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea rows={4} {...editRegister("description")} />
              </div>
              <div className="sm:col-span-2">
                <Label>Photos</Label>
                {editingProperty.images?.length ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-4">
                    {editingProperty.images.map((image: any) => (
                      <div key={image.id} className="relative h-24 overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <Image
                          src={image.url}
                          alt={image.alt ?? "Property image"}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No existing images uploaded.</p>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => handleEditImagesChange(event.target.files)}
                  className="mt-2"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Upload up to 10 additional photos to the listing.
                </p>
                {editFileError && <p className="text-xs text-destructive">{editFileError}</p>}
                {editImagePreviews.length > 0 && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-4">
                    {editImagePreviews.map((src, index) => (
                      <div key={index} className="relative h-24 overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <Image
                          src={src}
                          alt={`New property preview ${index + 1}`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="sm:col-span-2">
                <Label>Existing video</Label>
                {editingProperty.videos?.length ? (
                  <div className="mt-3 space-y-3">
                    {editingProperty.videos.map((video: any) => (
                      <video
                        key={video.id}
                        controls
                        src={video.url}
                        className="w-full rounded-xl border border-slate-200 bg-black"
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No existing video uploaded.</p>
                )}
                <Label className="mt-4">Replace with new video</Label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(event) => handleEditVideoChange(event.target.files?.[0] ?? null)}
                  className="mt-2"
                />
                {editVideo && (
                  <p className="mt-2 text-sm text-slate-600">Selected video: {editVideo.name}</p>
                )}
              </div>
              <div className="sm:col-span-2 flex items-center gap-3">
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  Update listing
                </Button>
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New listing</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Property name</Label>
                <Input {...addRegister("name")} />
                {addErrors.name && <p className="text-xs text-destructive">{addErrors.name.message}</p>}
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  defaultValue="APARTMENT"
                  onValueChange={(v) => setAddValue("propertyType", v as PropertyInput["propertyType"])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APARTMENT">Apartment</SelectItem>
                    <SelectItem value="HOUSE">House</SelectItem>
                    <SelectItem value="CONDO">Condo</SelectItem>
                    <SelectItem value="STUDIO">Studio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Location</Label>
                <Input
                  {...locationField}
                  onChange={(event) => {
                    locationField.onChange(event);
                    setLocationQuery(event.target.value);
                  }}
                />
                {addErrors.location && <p className="text-xs text-destructive">{addErrors.location.message}</p>}
              </div>
              <div className="sm:col-span-2">
                <Label>Google Maps place or URL</Label>
                <Input
                  value={mapUrl}
                  onChange={(event) => setMapUrl(event.target.value)}
                  placeholder="Paste a Google Maps URL or place name"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Optional: paste a Google Maps URL or description to help the admin verify the address.
                </p>
              </div>
              <div className="sm:col-span-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-700">Map preview</p>
                  <div className="mt-3 h-56 overflow-hidden rounded-xl border border-slate-200">
                    <iframe
                      title="Location preview"
                      src={`https://www.google.com/maps?q=${encodeURIComponent(
                        googleMapQuery || "Accra, Ghana"
                      )}&output=embed`}
                      className="h-full w-full border-0"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label>Monthly rent (GHS)</Label>
                <Input type="number" {...addRegister("monthlyRent", { valueAsNumber: true })} />
              </div>
              <div>
                <Label>Annual rent (GHS)</Label>
                <Input type="number" {...addRegister("annualRent", { valueAsNumber: true })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea rows={4} {...addRegister("description")} />
              </div>
              <div className="sm:col-span-2">
                <Label>Photos</Label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => handleImagesChange(event.target.files)}
                  className="mt-2"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Upload up to 10 photos for admin review.
                </p>
                {fileError && <p className="text-xs text-destructive">{fileError}</p>}
                {addImagePreviews.length > 0 && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-4">
                    {addImagePreviews.map((src: string, index: number) => (
                      <div key={index} className="relative h-24 overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <Image
                          src={src}
                          alt={`Property preview ${index + 1}`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="sm:col-span-2">
                <Label>Optional video</Label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(event) => handleVideoChange(event.target.files?.[0] ?? null)}
                  className="mt-2"
                />
                {video && (
                  <p className="mt-2 text-sm text-slate-600">Selected video: {video.name}</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  Submit listing
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
