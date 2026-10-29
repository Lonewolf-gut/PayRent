"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminCommissionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-commissions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/commissions");
      const json = await res.json();
      return json.data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Commissions & fees</h1>
        <p className="text-muted-foreground">
          Platform fee breakdown from wallet transactions.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total fees</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">
              GHS {Number(data?.totals?.totalFee ?? 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Service fees</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              GHS {Number(data?.totals?.serviceFee ?? 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Commission</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              GHS {Number(data?.totals?.commissionFee ?? 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              GHS {Number(data?.totals?.processingFee ?? 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent commission records</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Total fee</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.records?.map((row: {
                  id: string;
                  totalFee: number;
                  createdAt: string;
                  transaction?: {
                    reference: string;
                    wallet?: { user?: { email: string } };
                  };
                }) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">
                      {row.transaction?.reference ?? "—"}
                    </TableCell>
                    <TableCell>{row.transaction?.wallet?.user?.email ?? "—"}</TableCell>
                    <TableCell>GHS {Number(row.totalFee).toLocaleString()}</TableCell>
                    <TableCell>{new Date(row.createdAt).toLocaleDateString()}</TableCell>
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
