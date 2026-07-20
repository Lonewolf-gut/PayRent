"use client";

import { useQuery } from "@tanstack/react-query";
import AdminSettingsForm from "@/components/admin/AdminSettingsForm";
import { BusinessRulesPanel } from "@/components/admin/business-rules-panel";
import { PayoutBanksPanel } from "@/components/admin/payout-banks-panel";
import { PlatformConfigPanel } from "@/components/admin/platform-config-panel";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminSettingsPage() {
  const { data: platform } = useQuery({
    queryKey: ["admin-platform"],
    queryFn: async () => {
      const res = await fetch("/api/admin/platform");
      const json = await res.json();
      return json.data;
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin settings</h1>
        <p className="text-muted-foreground">Your account and platform configuration overview.</p>
      </div>

      <PlatformConfigPanel platform={platform} />

      <Accordion type="single" collapsible className="rounded-none border border-border">
        <AccordionItem value="payout-banks" className="border-0">
          <AccordionTrigger className="rounded-none px-4 py-3 hover:no-underline">
            <div className="text-left">
              <p className="font-medium">Payout banks</p>
              <p className="text-sm font-normal text-muted-foreground">
                Manage which banks users can add for withdrawals and settlements
              </p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="border-t border-border px-4 pb-4 pt-3">
            <PayoutBanksPanel />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Accordion type="single" collapsible className="rounded-none border border-border">
        <AccordionItem value="business-rules" className="border-0">
          <AccordionTrigger className="rounded-none px-4 py-3 hover:no-underline">
            <div className="text-left">
              <p className="font-medium">Business rules</p>
              <p className="text-sm font-normal text-muted-foreground">
                Commission rates, repayment periods, fees, and approval thresholds
              </p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="border-t border-border px-4 pb-4 pt-3">
            <BusinessRulesPanel />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Card className="rounded-none">
        <CardHeader>
          <CardTitle>Your account</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <AdminSettingsForm />
        </CardContent>
      </Card>
    </div>
  );
}
