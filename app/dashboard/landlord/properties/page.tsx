"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useForm, type Resolver } from "react-hook-form";
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
import { getApiErrorMessage, readApiJson } from "@/lib/utils/api-message";
import { useSubscriptionUpgradePrompt } from "@/components/dashboard/use-subscription-upgrade-prompt";
import { PropertyCategorySelect } from "@/components/dashboard/PropertyCategorySelect";
import { AgentSearchField } from "@/components/dashboard/AgentSearchField";
import {
  getCategoryForType,
  isSaleListing,
  PROPERTY_TYPE_LABELS,
  type PropertyCategory,
} from "@/lib/subscription-limits";
import type { PropertyType } from "@prisma/client";

type LandlordPropertyInput = PropertyInput & {
  googleMapUrl?: string;
};

export default function LandlordPropertiesPage() {
  const { handleLimitError, upgradeDialog } = useSubscriptionUpgradePrompt();
  const [showForm, setShowForm] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [editImages, setEditImages] = useState<File[]>([]);
  const [mapUrl, setMapUrl] = useState("");
  const [editMapUrl, setEditMapUrl] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [editLocationQuery, setEditLocationQuery] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [editFileError, setEditFileError] = useState<string | null>(null);
  const [addCategory, setAddCategory] = useState<PropertyCategory>("residential");
  const [editCategory, setEditCategory] = useState<PropertyCategory>("residential");
  const [showAddMap, setShowAddMap] = useState(false);
  const [showEditMap, setShowEditMap] = useState(false);
  const [addAgentId, setAddAgentId] = useState<string | null>(null);

  const optionalNumberField = {
    setValueAs: (value: string) => {
      if (value === "" || value == null) return undefined;
      const num = Number(value);
      return Number.isFinite(num) && num > 0 ? num : undefined;
    },
  };

  const requiredNumberField = {
    setValueAs: (value: string) => {
      const num = Number(value);
      return Number.isFinite(num) ? num : undefined;
    },
  };

  const showFormErrors = (errors: typeof addErrors) => {
    const first = Object.values(errors)[0];
    const message =
      (first as { message?: string })?.message ??
      "Please complete all required fields correctly.";
    toast.error(message);
  };

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
    resolver: zodResolver(propertySchema) as Resolver<LandlordPropertyInput>,
    defaultValues: {
      propertyType: "APARTMENT",
      amenities: [],
    },
  });

  const { register: editRegister, handleSubmit: handleEditSubmit, setValue: setEditValue, watch: watchEdit, formState: { errors: editErrors } } = editForm;
  const { register: addRegister, handleSubmit: handleAddSubmit, setValue: setAddValue, watch: watchAdd, formState: { errors: addErrors } } = useForm<LandlordPropertyInput>({
    resolver: zodResolver(propertySchema) as Resolver<LandlordPropertyInput>,
    defaultValues: {
      propertyType: "APARTMENT",
      amenities: [],
    },
  });

  const locationField = addRegister("location");
  const editLocationField = editRegister("location");
  const googleMapQuery = mapUrl || locationQuery;
  const editGoogleMapQuery = editMapUrl || editLocationQuery;
  const addPropertyType = (watchAdd("propertyType") ?? "APARTMENT") as PropertyType;
  const editPropertyType = (watchEdit("propertyType") ?? "APARTMENT") as PropertyType;
  const isAddSale = isSaleListing(addPropertyType);
  const isEditSale = isSaleListing(editPropertyType);

  const appendPropertyFields = (
    formData: FormData,
    data: LandlordPropertyInput,
    isSale: boolean
  ) => {
    formData.append("name", data.name);
    formData.append("propertyType", data.propertyType);
    formData.append("monthlyRent", String(data.monthlyRent));
    if (!isSale) {
      formData.append("annualRent", String(data.annualRent));
      formData.append("location", data.location ?? "");
      if (data.latitude !== undefined) formData.append("latitude", String(data.latitude));
      if (data.longitude !== undefined) formData.append("longitude", String(data.longitude));
    }
    if (isSale && data.discountedPrice != null && !Number.isNaN(data.discountedPrice)) {
      formData.append("discountedPrice", String(data.discountedPrice));
    }
    formData.append("description", data.description);
    if (data.availableFrom) formData.append("availableFrom", data.availableFrom);
  };

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

  const createProperty = useMutation({
    mutationFn: async (data: LandlordPropertyInput) => {
      const formData = new FormData();
      const isSale = isSaleListing(data.propertyType as PropertyType);
      appendPropertyFields(formData, data, isSale);
      if (!isSale && mapUrl) {
        formData.append("googleMapUrl", mapUrl);
      }
      images.slice(0, 10).forEach((file) => formData.append("images", file));
      if (addAgentId) formData.append("agentUserId", addAgentId);

      const res = await fetch("/api/properties", {
        method: "POST",
        body: formData,
      });

      const json = await readApiJson(res);
      if (!res.ok || !json.success) {
        throw new Error(
          getApiErrorMessage(json, "We couldn't submit your listing. Please check the form and try again.")
        );
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landlord-properties"] });
      queryClient.invalidateQueries({ queryKey: ["listing-limits"] });
      toast.success("Property submitted for approval with attachments");
      setShowForm(false);
      setImages([]);
      setMapUrl("");
      setAddAgentId(null);
    },
    onError: (error: Error) => {
      const message = error?.message ?? "Failed to create property";
      if (!handleLimitError(message)) {
        toast.error(message);
      }
    },
  });

  const updateProperty = useMutation({
    mutationFn: async (data: LandlordPropertyInput & { id: string }) => {
      const formData = new FormData();
      const isSale = isSaleListing(data.propertyType as PropertyType);
      appendPropertyFields(formData, data, isSale);
      if (!isSale && editMapUrl) {
        formData.append("googleMapUrl", editMapUrl);
      }
      editImages.slice(0, 10).forEach((file) => formData.append("images", file));

      const res = await fetch(`/api/properties/${data.id}`, {
        method: "PATCH",
        body: formData,
      });
      const json = await readApiJson(res);
      if (!res.ok || !json.success) {
        throw new Error(
          getApiErrorMessage(json, "We couldn't update your listing. Please check the form and try again.")
        );
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landlord-properties"] });
      toast.success("Property listing updated");
      setEditingPropertyId(null);
      setEditImages([]);
      setEditMapUrl("");
      setEditLocationQuery("");
    },
    onError: (error: Error) => {
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
    TRIAL_SUSPENDED: { label: "Hidden (trial ended)", variant: "secondary" },
    INACTIVE: { label: "Inactive", variant: "ghost" },
  };

  const editingProperty = landlordProperties?.find((property: any) => property.id === editingPropertyId);

  const beginEdit = (property: any) => {
    setEditingPropertyId(property.id);
    setShowForm(false);
    setEditImages([]);
    setEditMapUrl("");
    setEditLocationQuery(isSaleListing(property.propertyType as PropertyType) ? "" : property.location ?? "");
    setEditCategory(getCategoryForType(property.propertyType as PropertyType));
    editForm.reset({
      name: property.name,
      propertyType: property.propertyType,
      monthlyRent: Number(property.monthlyRent),
      annualRent: Number(property.annualRent),
      discountedPrice: property.discountedPrice ? Number(property.discountedPrice) : undefined,
      location: isSaleListing(property.propertyType as PropertyType) ? undefined : property.location,
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
    setEditMapUrl("");
    setEditLocationQuery("");
  };

  return (
    <div className="space-y-6">
      {upgradeDialog}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Properties</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            List houses, rooms, cars, and home appliances. Limits depend on your plan.
          </p>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "Add listing"}
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
                  <Badge variant="secondary">
                    {PROPERTY_TYPE_LABELS[property.propertyType as PropertyType] ??
                      property.propertyType}
                  </Badge>
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
            <form onSubmit={handleEditSubmit(onEditSubmit, showFormErrors)} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Listing name</Label>
                <Input {...editRegister("name")} />
                {editErrors.name && <p className="text-xs text-destructive">{editErrors.name.message}</p>}
              </div>
              <PropertyCategorySelect
                category={editCategory}
                propertyType={editForm.watch("propertyType") as PropertyType}
                onCategoryChange={setEditCategory}
                onTypeChange={(type) => setEditValue("propertyType", type)}
              />
              {!isEditSale && (
                <>
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEditMap((current) => !current)}
                    >
                      {showEditMap ? "Hide map preview" : "Show map preview"}
                    </Button>
                    {showEditMap && (
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
                    )}
                  </div>
                  <div>
                    <Label>Monthly rent (GHS)</Label>
                    <Input type="number" {...editRegister("monthlyRent", requiredNumberField)} />
                    {editErrors.monthlyRent && (
                      <p className="text-xs text-destructive">{editErrors.monthlyRent.message}</p>
                    )}
                  </div>
                  <div>
                    <Label>Annual rent (GHS)</Label>
                    <Input type="number" {...editRegister("annualRent", optionalNumberField)} />
                    {editErrors.annualRent && (
                      <p className="text-xs text-destructive">{editErrors.annualRent.message}</p>
                    )}
                  </div>
                </>
              )}
              {isEditSale && (
                <>
                  <div>
                    <Label>Price (GHS)</Label>
                    <Input type="number" {...editRegister("monthlyRent", requiredNumberField)} />
                    {editErrors.monthlyRent && (
                      <p className="text-xs text-destructive">{editErrors.monthlyRent.message}</p>
                    )}
                  </div>
                  <div>
                    <Label>Discounted price (GHS, optional)</Label>
                    <Input type="number" {...editRegister("discountedPrice", optionalNumberField)} />
                    {editErrors.discountedPrice && (
                      <p className="text-xs text-destructive">{editErrors.discountedPrice.message}</p>
                    )}
                  </div>
                </>
              )}
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea rows={4} {...editRegister("description")} />
                {editErrors.description && (
                  <p className="text-xs text-destructive">{editErrors.description.message}</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <Label>Photos</Label>
                {editingProperty.images?.length ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-4">
                    {editingProperty.images.map((image: any) => (
                      <div key={image.id} className="relative h-24 overflow-hidden border border-slate-200 bg-white">
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
                      <div key={index} className="relative h-24 overflow-hidden border border-slate-200 bg-white">
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
              <div className="sm:col-span-2 flex items-center gap-3">
                <Button type="submit" disabled={updateProperty.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                  {updateProperty.isPending ? "Updating listing…" : "Update listing"}
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
            <form onSubmit={handleAddSubmit(onSubmit, showFormErrors)} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Listing name</Label>
                <Input {...addRegister("name")} />
                {addErrors.name && <p className="text-xs text-destructive">{addErrors.name.message}</p>}
              </div>
              <PropertyCategorySelect
                category={addCategory}
                propertyType={(watchAdd("propertyType") ?? "APARTMENT") as PropertyType}
                onCategoryChange={setAddCategory}
                onTypeChange={(type) => setAddValue("propertyType", type)}
              />
              {!isAddSale && (
                <>
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddMap((current) => !current)}
                    >
                      {showAddMap ? "Hide map preview" : "Show map preview"}
                    </Button>
                    {showAddMap && (
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
                    )}
                  </div>
                  <div>
                    <Label>Monthly rent (GHS)</Label>
                    <Input type="number" {...addRegister("monthlyRent", requiredNumberField)} />
                    {addErrors.monthlyRent && (
                      <p className="text-xs text-destructive">{addErrors.monthlyRent.message}</p>
                    )}
                  </div>
                  <div>
                    <Label>Annual rent (GHS)</Label>
                    <Input type="number" {...addRegister("annualRent", optionalNumberField)} />
                    {addErrors.annualRent && (
                      <p className="text-xs text-destructive">{addErrors.annualRent.message}</p>
                    )}
                  </div>
                </>
              )}
              {isAddSale && (
                <>
                  <div>
                    <Label>Price (GHS)</Label>
                    <Input type="number" {...addRegister("monthlyRent", requiredNumberField)} />
                    {addErrors.monthlyRent && (
                      <p className="text-xs text-destructive">{addErrors.monthlyRent.message}</p>
                    )}
                  </div>
                  <div>
                    <Label>Discounted price (GHS, optional)</Label>
                    <Input type="number" {...addRegister("discountedPrice", optionalNumberField)} />
                    {addErrors.discountedPrice && (
                      <p className="text-xs text-destructive">{addErrors.discountedPrice.message}</p>
                    )}
                  </div>
                </>
              )}
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea rows={4} {...addRegister("description")} />
                {addErrors.description && (
                  <p className="text-xs text-destructive">{addErrors.description.message}</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <AgentSearchField value={addAgentId} onChange={(id) => setAddAgentId(id)} />
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
                      <div key={index} className="relative h-24 overflow-hidden border border-slate-200 bg-white">
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
                <Button
                  type="submit"
                  disabled={createProperty.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {createProperty.isPending ? "Submitting listing…" : "Submit listing"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
