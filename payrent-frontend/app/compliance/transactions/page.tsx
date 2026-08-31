"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils/format-datetime";
import { ScrollableTable } from "@/components/ui/scrollable-table";

export default function ComplianceTransactionsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["compliance-transactions", page],
    queryFn: async () => {
      const res = await fetch(`/api/compliance/transactions?page=${page}`);
      const json = await res.json();
      return json.data as {
        transactions: Array<{
          id: string;
          reference: string;
          type: string;
          amount: number;
          status: string;
          createdAt: string;
          wallet?: { type: string; user?: { email?: string; role?: string } };
        }>;
        total: number;
        limit: number;
      };
    },
    refetchInterval: 30_000,
  });

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.limit ?? 30)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transactions</h1>
        <p className="text-sm text-muted-foreground">
          Wallet transactions across all roles with recorded timestamps.
        </p>
      </div>

      <Card className="rounded-none">
        <CardHeader>
          <CardTitle>Recent transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {isLoading ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground sm:px-0">Loading transactions…</p>
          ) : !data?.transactions?.length ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground sm:px-0">No transactions found.</p>
          ) : (
            <ScrollableTable>
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Wallet</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-mono text-xs">{tx.reference}</TableCell>
                    <TableCell>{tx.type}</TableCell>
                    <TableCell>{tx.wallet?.user?.email ?? "Platform"}</TableCell>
                    <TableCell>{tx.wallet?.type ?? "—"}</TableCell>
                    <TableCell>GHS {Number(tx.amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="rounded-none">
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateTime(tx.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </ScrollableTable>
          )}
          <div className="mt-4 flex gap-2 px-6 pb-6 sm:px-0">
            <Button
              size="sm"
              variant="outline"
              className="rounded-none"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="self-center text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="rounded-none"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
