import { FinancingDocumentsForm } from "@/components/properties/financing-documents-form";

export default function TenantFinancingDocumentsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financing documents</h1>
        <p className="text-muted-foreground">
          Upload your payslip and bank statements here after your account is verified. These
          documents are reviewed by admin before you can apply for Pay for Rent financing on a
          property.
        </p>
      </div>
      <FinancingDocumentsForm />
    </div>
  );
}
