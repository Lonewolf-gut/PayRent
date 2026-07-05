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
import { StatusBadge } from "@/components/dashboard/status-badge";

export default function AdminTransactionsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-transactions", page],
    queryFn: async () => {
      const res = await fetch(`/api/admin/transactions?page=${page}`);
      const json = await res.json();
      return json.data;
    },
  });

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.limit ?? 30)));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Transaction monitoring</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="rounded-none">
          <CardHeader><CardTitle className="text-base">Total transactions</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{data?.total ?? "—"}</p></CardContent>
        </Card>
        <Card className="rounded-none">
          <CardHeader><CardTitle className="text-base">Platform commission</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">GHS {Number(data?.totalCommission ?? 0).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>
      <Card className="rounded-none">
        <CardHeader><CardTitle>Recent transactions</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.transactions?.map((tx: any) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-mono text-xs">{tx.reference}</TableCell>
                    <TableCell>{tx.type}</TableCell>
                    <TableCell>{tx.wallet?.user?.email ?? "Platform"}</TableCell>
                    <TableCell>GHS {Number(tx.amount).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="secondary" className="rounded-none">{tx.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="mt-4 flex gap-2">
            <Button size="sm" variant="outline" className="rounded-none" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="self-center text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <Button size="sm" variant="outline" className="rounded-none" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-none">
        <CardHeader><CardTitle>Audit log</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {data?.auditLogs?.map((log: any) => (
              <li key={log.id} className="flex justify-between border-b border-slate-100 py-2">
                <span>{log.action} {log.entity && `· ${log.entity}`}{log.user?.email && ` · ${log.user.email}`}</span>
                <span className="text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
