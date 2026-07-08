"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type FeeDisclosureRow = {
  id: string;
  principalAmount: string;
  interestRate: string;
  totalRepayable: string;
  platformFee: string;
  agentCommission: string;
  durationMonths: number;
  monthlyPayment: string;
  acceptedAt: string;
  tenantUser: { email: string };
  lenderUser: { email: string };
  financingRequest: {
    id: string;
    status: string;
    property: { name: string };
  };
};

export default function ComplianceFeeDisclosuresPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["compliance-fee-disclosures"],
    queryFn: async () => {
      const res = await fetch("/api/compliance/fee-disclosures?limit=100");
      const json = await res.json();
      return (json.data?.items ?? []) as FeeDisclosureRow[];
    },
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fee disclosure records</h1>
        <p className="text-sm text-muted-foreground">
          Immutable fee disclosures for each accepted financing agreement.
        </p>
      </div>
      <Card className="rounded-none">
        <CardHeader>
          <CardTitle>Financing fee disclosures</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading fee disclosures…</p>
          ) : !data?.length ? (
            <p className="text-sm text-muted-foreground">No fee disclosure records yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Lender</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead>Total repayable</TableHead>
                  <TableHead>Accepted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.financingRequest.property.name}</TableCell>
                    <TableCell>{row.tenantUser.email}</TableCell>
                    <TableCell>{row.lenderUser.email}</TableCell>
                    <TableCell>GHS {Number(row.principalAmount).toLocaleString()}</TableCell>
                    <TableCell>
                      GHS {Number(row.totalRepayable).toLocaleString()}
                      <div className="text-xs text-muted-foreground">
                        {row.interestRate}% · {row.durationMonths} mo · fee GHS{" "}
                        {Number(row.platformFee).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(row.acceptedAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
