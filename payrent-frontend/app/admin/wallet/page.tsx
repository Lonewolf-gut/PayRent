import { WalletPanel } from "@/components/dashboard/wallet-panel";

export default function AdminWalletPage() {
  return (
    <WalletPanel
      title="Platform Wallet"
      showDeposit={false}
      showWithdraw
      walletApiPath="/api/admin/wallet"
      settingsApiPath="/api/admin/settings"
    />
  );
}
