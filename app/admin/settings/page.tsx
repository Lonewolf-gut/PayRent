import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLATFORM_NAME, PLATFORM_TAGLINE } from "@/constants/platform";
import AdminSettingsForm from "@/components/admin/AdminSettingsForm";

export default function AdminSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform settings</h1>
        <p className="text-muted-foreground">Operational configuration and compliance controls.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Platform</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Name:</span> {PLATFORM_NAME}</p>
          <p><span className="text-muted-foreground">Description:</span> {PLATFORM_TAGLINE}</p>
          <p><span className="text-muted-foreground">Default currency:</span> GHS</p>
          <p><span className="text-muted-foreground">Environment:</span> {process.env.NODE_ENV ?? "development"}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Your account</CardTitle></CardHeader>
        <CardContent>
          <AdminSettingsForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Review queues</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          KYC exceptions, listing moderation, mandate approval, failed deductions, and reconciliation
          exceptions are managed from their dedicated admin screens.
        </CardContent>
      </Card>
    </div>
  );
}
