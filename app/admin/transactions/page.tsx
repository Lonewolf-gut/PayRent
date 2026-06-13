"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

export default function AdminTransactionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/transactions");
      const json = await res.json();
      return json.data;
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Transaction Monitoring</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.total ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Platform commission</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">
              GHS {Number(data?.totalCommission ?? 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
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
                {data?.transactions?.map((tx: {
                  id: string;
                  reference: string;
                  type: string;
                  amount: number;
                  status: string;
                  wallet?: { user?: { email: string } };
                }) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-mono text-xs">{tx.reference}</TableCell>
                    <TableCell>{tx.type}</TableCell>
                    <TableCell>{tx.wallet?.user?.email ?? "Platform"}</TableCell>
                    <TableCell>GHS {Number(tx.amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{tx.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        className="px-2 py-1 rounded bg-emerald-600 text-white text-sm"
                        onClick={async () => {
                          const bankAccountId = prompt("Enter bank account id to withdraw to (cuid):");
                          if (!bankAccountId) return;
                          if (!confirm(`Create withdrawal for GHS ${tx.amount.toLocaleString()}?`)) return;
                          try {
                            const res = await fetch("/api/withdrawals", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ bankAccountId, amount: tx.amount }),
                            });
                            const json = await res.json();
                            if (!res.ok) throw new Error(json?.message ?? "Request failed");
                            alert("Withdrawal requested");
                          } catch (err: any) {
                            alert(err.message ?? String(err));
                          }
                        }}
                      >
                        Withdraw
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Audit log</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {data?.auditLogs?.map((log: {
              id: string;
              action: string;
              entity?: string;
              user?: { email: string };
              createdAt: string;
            }) => (
              <li key={log.id} className="flex justify-between border-b py-2">
                <span>
                  {log.action} {log.entity && `· ${log.entity}`}
                  {log.user?.email && ` · ${log.user.email}`}
                </span>
                <span className="text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
