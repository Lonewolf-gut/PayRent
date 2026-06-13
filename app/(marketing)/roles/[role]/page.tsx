import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ROLE_PAGE_DATA, RoleSlug } from "@/constants/roles";

export function generateStaticParams() {
  return Object.keys(ROLE_PAGE_DATA).map((slug) => ({ role: slug }));
}

export default async function RolePage({ params }: { params: any }) {
  const { role: roleStr } = await params;
  const roleKey = roleStr as RoleSlug;

  const data = ROLE_PAGE_DATA[roleKey];
  if (!data) {
    return notFound();
  }

  return (
    <div className="bg-white">
      <section className="relative overflow-hidden bg-emerald-50 py-20">
        <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 sm:px-6 lg:flex-row lg:items-center lg:gap-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">
              PayForme Role Experience
            </p>
            <h1 className="mt-4 text-5xl font-bold tracking-tight text-emerald-950">
              {data.title}
            </h1>
            <p className="mt-6 text-xl leading-8 text-emerald-800/90">
              {data.subtitle}
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
                <Link href="/register">Create account</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/properties">Browse listings</Link>
              </Button>
            </div>
          </div>
          <div className="relative h-[420px] w-full overflow-hidden rounded-[2rem] bg-slate-900 shadow-2xl">
            <Image src={data.image} alt={data.title} fill className="object-cover" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid gap-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div>
            <div className="rounded-3xl border border-emerald-100 bg-white p-10 shadow-lg">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">
                Why choose PayForme
              </p>
              <h2 className="mt-4 text-3xl font-bold text-emerald-950">Powerful benefits for {data.title.toLowerCase()}</h2>
              <p className="mt-4 text-emerald-800/90">{data.overview}</p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {data.whyChoose.map((item) => (
                  <div key={item} className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6">
                    <p className="text-sm text-emerald-900">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-12 rounded-3xl border border-slate-200 bg-slate-50 p-10 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-600">
                How PayForme works for {data.title.toLowerCase()}
              </p>
              <div className="mt-8 space-y-4">
                {data.howItWorks.map((step, index) => (
                  <div key={step} className="flex gap-4">
                    <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                      {index + 1}
                    </div>
                    <p className="text-base leading-7 text-slate-700">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-8">
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-8 shadow-lg">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">
                Subscription plan
              </p>
              <h3 className="mt-4 text-2xl font-bold text-emerald-950">{data.subscription.headline}</h3>
              <p className="mt-3 text-emerald-800/90">{data.subscription.description}</p>
              <ul className="mt-6 space-y-3 text-slate-700">
                {data.subscription.features.map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <span className="mt-1 h-4 w-4 rounded-full bg-emerald-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 rounded-2xl bg-white/90 p-4 text-sm text-slate-600 shadow-sm">
                {data.subscription.limitedAccess}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-600">
                Role tree summary
              </p>
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-emerald-50 p-4 text-slate-800">
                  <p className="font-semibold">Listings</p>
                  <p className="text-sm text-slate-600">Homes, cars, and appliances with limits for unsubscribed accounts.</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4 text-slate-800">
                  <p className="font-semibold">Financing</p>
                  <p className="text-sm text-slate-600">Tenant finance flows through lenders and agents can advocate the deal.</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4 text-slate-800">
                  <p className="font-semibold">Subscription</p>
                  <p className="text-sm text-slate-600">Upgrade to unlock expanded access and full marketplace visibility.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
