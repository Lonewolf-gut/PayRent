import { Navbar } from "@/components/rentvest/navbar";

export default function MarketingLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <footer className="border-t border-emerald-100 bg-white py-12">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 text-sm text-emerald-800/80 sm:px-6 md:grid-cols-3">
          <div>
            <p className="text-base font-semibold text-foreground">RentForMe</p>
            <p className="mt-3">
              Professional rental financing platform connecting tenants, landlords, and lenders.
            </p>
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">Quick links</p>
            <ul className="mt-3 space-y-2">
              <li>
                <a href="/properties" className="hover:text-foreground">Properties</a>
              </li>
              <li>
                <a href="/login" className="hover:text-foreground">Sign in</a>
              </li>
              <li>
                <a href="/register" className="hover:text-foreground">Create account</a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">Contact</p>
            <p className="mt-3">support@rentforme.com</p>
            <p>Accra, Ghana</p>
            <p className="mt-4">&copy; {new Date().getFullYear()} RentForMe. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
