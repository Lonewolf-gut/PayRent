"use client";

import { useEffect, useState, FormEvent } from "react";

type BankAccount = {
  id: string;
  accountType: string;
  bankCode?: string | null;
  bankName: string;
  accountNumber: string;
  accountNumberMasked?: string | null;
  accountName: string;
  isVerified: boolean;
  isDefault: boolean;
};

export default function AdminSettingsForm() {
  const [email, setEmail] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [accountType, setAccountType] = useState("BANK");
  const [bankName, setBankName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankStatus, setBankStatus] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/admin/settings");
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message ?? "Unable to load settings");
        setEmail(json.data.user?.email ?? "");
        setImageUrl(json.data.user?.image ?? "");
        setPreviewUrl(json.data.user?.image ?? "");
        setBankAccounts(json.data.bankAccounts ?? []);
      } catch (error: any) {
        setErrorMessage(error.message ?? String(error));
      }
    }
    loadSettings();
  }, []);

  useEffect(() => {
    if (!selectedFile) return;
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  async function handleProfileSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatusMessage("");
    setErrorMessage("");

    if (newPassword && newPassword !== confirmPassword) {
      setErrorMessage("New password and confirmation do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          imageUrl,
          currentPassword,
          newPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "Request failed");
      setStatusMessage("Profile updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      setErrorMessage(error.message ?? String(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleUploadImage() {
    if (!selectedFile) {
      setErrorMessage("Select an image file first.");
      return;
    }

    setUploadLoading(true);
    setStatusMessage("");
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const res = await fetch("/api/admin/settings/image", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "Image upload failed");
      setImageUrl(json.data.imageUrl);
      setPreviewUrl(json.data.imageUrl);
      setSelectedFile(null);
      setStatusMessage("Profile image uploaded successfully.");
    } catch (error: any) {
      setErrorMessage(error.message ?? String(error));
    } finally {
      setUploadLoading(false);
    }
  }

  async function handleAddBankAccount(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBankStatus("");
    setErrorMessage("");
    setBankLoading(true);

    try {
      const res = await fetch("/api/admin/settings/bank-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountType,
          bankCode: bankCode || undefined,
          bankName,
          accountNumber,
          accountName,
          isDefault,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "Request failed");

      setBankAccounts((current) => [json.data, ...current]);
      setBankStatus("Bank/MoMo details saved successfully.");
      setBankName("");
      setBankCode("");
      setAccountNumber("");
      setAccountName("");
      setIsDefault(false);
    } catch (error: any) {
      setErrorMessage(error.message ?? String(error));
    } finally {
      setBankLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
        <section className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Profile</h2>
          <p className="text-sm text-muted-foreground">Update your admin email and profile picture.</p>

          <form onSubmit={handleProfileSubmit} className="mt-6 space-y-4">
            {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
            {statusMessage ? <p className="text-sm text-emerald-600">{statusMessage}</p> : null}

            <div className="grid gap-2">
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Profile image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {previewUrl ? (
              <div className="flex items-center gap-4 rounded-lg border border-muted p-3">
                <img src={previewUrl} alt="Profile preview" className="h-16 w-16 rounded-full object-cover" />
                <span className="text-sm text-muted-foreground">Preview of your profile image.</span>
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleUploadImage}
              disabled={uploadLoading || !selectedFile}
              className="inline-flex items-center justify-center rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploadLoading ? "Uploading…" : "Upload profile image"}
            </button>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Current password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving…" : "Save profile settings"}
            </button>
          </form>
        </section>

        <section className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Bank & MoMo details</h2>
          <p className="text-sm text-muted-foreground">Add a bank account or MoMo destination that you can use for payouts.</p>

          <form onSubmit={handleAddBankAccount} className="mt-6 space-y-4">
            {bankStatus ? <p className="text-sm text-emerald-600">{bankStatus}</p> : null}
            <div className="grid gap-2">
              <label className="text-sm font-medium">Account type</label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="BANK">Bank</option>
                <option value="MOMO">MoMo</option>
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Bank / MoMo provider</label>
              <input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                placeholder="MTN MoMo or Bank name"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Bank code (optional)</label>
              <input
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                placeholder="e.g. 123"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Account number / mobile number</label>
              <input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                placeholder="Account or phone number"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Account holder name</label>
              <input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                placeholder="Name on account"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="isDefault"
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4 w-4 rounded border-input text-emerald-600"
              />
              <label htmlFor="isDefault" className="text-sm">
                Mark as default account
              </label>
            </div>

            <button
              type="submit"
              disabled={bankLoading}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {bankLoading ? "Saving…" : "Add Bank/MoMo details"}
            </button>
          </form>
        </section>
      </div>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Saved accounts</h2>
        <p className="text-sm text-muted-foreground">Your active bank and MoMo destinations.</p>

        <div className="mt-4 space-y-3">
          {bankAccounts.length ? (
            bankAccounts.map((account) => (
              <div key={account.id} className="rounded-2xl border border-muted bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{account.accountType}</p>
                    <p className="text-sm text-muted-foreground">{account.bankName}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                    {account.isVerified ? "Verified" : "Pending"}
                  </span>
                </div>
                <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                  <p>{account.accountName}</p>
                  <p>{account.accountNumberMasked ?? account.accountNumber}</p>
                  {account.isDefault ? <p className="text-xs text-emerald-600">Default payout account</p> : null}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No bank or MoMo details added yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
