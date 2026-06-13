"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  Building2,
  Car,
  Check,
  FileText,
  Quote,
  Shield,
  Star,
  Wallet,
} from "lucide-react";
import { PLATFORM_NAME, PLATFORM_TAGLINE } from "@/constants/platform";
import { ROLE_HOW_IT_WORKS } from "@/constants/roles";

const whoItsFor = [
  {
    number: "01",
    title: "Tenants",
    description:
      "Browse homes, cars, and appliances. Apply for listings and request rent financing from verified lenders.",
    href: "/roles/tenant",
  },
  {
    number: "02",
    title: "Landlords",
    description:
      "List properties, cars, and appliances. Review applications and track settlements from one dashboard.",
    href: "/roles/landlord",
  },
  {
    number: "03",
    title: "Agents",
    description:
      "Advocate listings, support tenants and landlords, and close deals with transparent workflows.",
    href: "/roles/agent",
  },
  {
    number: "04",
    title: "Lenders",
    description:
      "Review financing requests, fund deals, and monitor repayment performance across the marketplace.",
    href: "/roles/lender",
  },
];

const heroImages = [
  { url: "/images/property-1.jpg" },
  { url: "/images/property-2.jpg" },
  { url: "/images/property-3.jpg" },
  { url: "/images/property-5.jpg" },
];

const heroColumns = [heroImages.slice(0, 2), heroImages.slice(2)];

const testimonials = [
  {
    quote:
      "PayForme made finding and financing my apartment smooth. I felt supported at every step.",
    name: "Ama Boateng",
    role: "Tenant",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80",
  },
  {
    quote:
      "Our listings now reach more verified tenants, and the admin tools keep everything under control.",
    name: "Kwame Mensah",
    role: "Landlord",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&q=80",
  },
  {
    quote:
      "As a lender, I love how clear the repayment tracking is — it saves so much time.",
    name: "Nana Yaa Asantewaa",
    role: "Lender",
    image: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=300&q=80",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    subtitle: "Free plan for small landlords",
    price: "Free",
    highlight: false,
    features: [
      "Up to 10 houses/apartments",
      "Up to 5 cars & appliances",
      "Basic marketplace access",
      "Email support",
    ],
    cta: "Get Started",
    href: "/register",
  },
  {
    name: "Premium",
    subtitle: "For growing property management companies",
    price: "GHS 79.99",
    period: "per month",
    highlight: true,
    features: [
      "Unlimited listings and browsing",
      "Priority financing review",
      "Premium placement in search",
      "Advanced support",
      "Tenant & resident portal",
    ],
    cta: "Get Started",
    href: "/register",
  },
];

export default function HomePage() {
  const [activeRole, setActiveRole] = useState(0);
  const selectedRole = ROLE_HOW_IT_WORKS[activeRole];

  return (
    <div className="overflow-hidden bg-white">
      <section className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-14">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-emerald-950 sm:text-5xl lg:text-6xl">
              Subscription-first access to homes, cars,
              <span className="text-emerald-600"> and appliances</span>
            </h1>
            <p className="mt-4 text-lg text-emerald-800/80">
              {PLATFORM_NAME} connects tenants, landlords, agents, and lenders in one marketplace,
              enabling listings, financing, and subscription upgrades for expanded access to every
              asset.
            </p>
            <div className="mt-10 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
              <Button size="lg" asChild className="bg-emerald-600 hover:bg-emerald-700">
                <Link href="/register">
                  Get started <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/properties">Browse properties</Link>
              </Button>
            </div>
          </motion.div>
          <div className="relative grid h-[520px] w-full grid-cols-2 gap-4 overflow-hidden">
            {heroColumns.map((column, columnIndex) => (
              <div key={columnIndex} className="overflow-hidden">
                <motion.div
                  animate={
                    columnIndex === 0
                      ? { y: ["0%", "-50%", "0%"] }
                      : { y: ["-50%", "0%", "-50%"] }
                  }
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                  className="space-y-4"
                >
                  {[...column, ...column].map((image, imageIndex) => (
                    <div
                      key={`${image.url}-${imageIndex}`}
                      className="relative h-[250px] w-full bg-transparent shadow-none"
                    >
                      <Image src={image.url} alt="hero image" fill className="object-cover" />
                    </div>
                  ))}
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 py-10">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 text-center sm:grid-cols-4 sm:px-6">
          {[
            { label: "50+ property & other listings", value: "50+" },
            { label: "Roles supported", value: "4" },
            { label: "Reliability", value: "100%" },
            { label: "Subscription access", value: "Available" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-bold text-white sm:text-3xl">{stat.value}</p>
              <p className="text-xs text-emerald-50 sm:text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-emerald-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-emerald-950 sm:text-4xl">
              Who it&apos;s for
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-emerald-800/70">
              One platform for every participant in the rental and asset financing chain.
            </p>
          </div>

          <div className="mt-12 overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-[0_20px_50px_rgba(6,78,59,0.08)]">
            <div className="grid divide-y divide-emerald-100 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
              {whoItsFor.map((role, index) => (
                <div key={role.title} className="relative px-6 py-10 sm:px-8 lg:py-12">
                  <p
                    className="pointer-events-none select-none font-serif text-5xl leading-none text-emerald-600/15 sm:text-6xl"
                    aria-hidden
                  >
                    {role.number}
                  </p>
                  <h3 className="mt-4 text-xl font-bold tracking-tight text-emerald-950">
                    {role.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-emerald-800/70 sm:text-[15px]">
                    {role.description}
                  </p>
                  <Link
                    href={role.href}
                    className="mt-5 inline-flex items-center text-sm font-medium text-emerald-600 transition hover:text-emerald-700"
                  >
                    Learn more
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>

                  {index < whoItsFor.length - 1 ? (
                    <div
                      className="absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 translate-x-1/2 lg:flex"
                      aria-hidden
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50">
                        <ArrowRight className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold">How it works</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
              {PLATFORM_TAGLINE}
            </p>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {ROLE_HOW_IT_WORKS.map((role, index) => (
              <button
                key={role.slug}
                type="button"
                onClick={() => setActiveRole(index)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                  activeRole === index
                    ? "bg-emerald-600 text-white shadow"
                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                }`}
              >
                {role.title.replace("For ", "")}
              </button>
            ))}
          </div>

          <motion.div
            key={selectedRole.slug}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-12 grid items-center gap-10 lg:grid-cols-2"
          >
            <div className="relative h-[420px] overflow-hidden rounded-3xl shadow-lg">
              <Image
                src={selectedRole.image}
                alt={selectedRole.title}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
                Step-by-step
              </p>
              <h3 className="mt-2 text-3xl font-bold text-emerald-950">{selectedRole.title}</h3>
              <p className="mt-2 text-lg text-emerald-700">{selectedRole.tagline}</p>
              <ol className="mt-8 space-y-4">
                {selectedRole.benefits.map((step, stepIndex) => (
                  <li key={step} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                      {stepIndex + 1}
                    </span>
                    <span className="pt-1 text-slate-700">{step}</span>
                  </li>
                ))}
              </ol>
              <Button size="lg" className="mt-8 bg-emerald-600 hover:bg-emerald-700" asChild>
                <Link href={`/roles/${selectedRole.slug}`}>{selectedRole.buttonText}</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="pricing" className="bg-emerald-950 py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-emerald-100/75">
              Start free with limited access, or upgrade to Premium for unlimited marketplace
              visibility.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-xl p-8 ${
                  plan.highlight
                    ? "border border-emerald-400 bg-gradient-to-b from-emerald-600 to-emerald-700 shadow-[0_20px_40px_rgba(16,185,129,0.25)]"
                    : "border border-emerald-800/60 bg-emerald-900/40 backdrop-blur-sm"
                }`}
              >
                {plan.highlight ? (
                  <span className="mb-6 inline-flex w-fit rounded-sm bg-emerald-300 px-2.5 py-1 text-[10px] font-bold tracking-[0.15em] text-emerald-950">
                    MOST POPULAR
                  </span>
                ) : (
                  <span className="mb-6 block h-[26px]" aria-hidden />
                )}

                <div>
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <p className={`mt-1 text-sm ${plan.highlight ? "text-emerald-50/90" : "text-emerald-100/60"}`}>
                    {plan.subtitle}
                  </p>
                  <p className="mt-6 text-4xl font-bold tracking-tight">
                    {plan.price}
                    {plan.period ? (
                      <span
                        className={`text-base font-normal ${plan.highlight ? "text-emerald-50/80" : "text-emerald-100/50"}`}
                      >
                        {" "}
                        / {plan.period}
                      </span>
                    ) : null}
                  </p>
                </div>

                <div
                  className={`my-8 border-t ${plan.highlight ? "border-emerald-400/40" : "border-emerald-800/60"}`}
                />

                <ul className="flex-1 space-y-3.5">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className={`flex items-start gap-3 text-sm ${plan.highlight ? "text-emerald-50" : "text-emerald-100/85"}`}
                    >
                      <Check
                        className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlight ? "text-emerald-100" : "text-emerald-400"}`}
                        strokeWidth={1.5}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`mt-8 inline-flex w-full items-center justify-center rounded-md px-4 py-2.5 text-sm font-semibold transition ${
                    plan.highlight
                      ? "bg-white text-emerald-700 hover:bg-emerald-50"
                      : "border border-emerald-600/50 text-white hover:border-emerald-500 hover:bg-emerald-800/50"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-4xl text-right">
            <Link
              href="/register"
              className="inline-flex items-center text-sm font-medium text-emerald-400 transition hover:text-emerald-300"
            >
              See full pricing details
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <div>
              <FileText className="h-10 w-10 text-emerald-600" />
              <h2 className="mt-4 text-3xl font-bold">Compliance & trust by design</h2>
              <p className="mt-4 text-muted-foreground">
                Ghana Card verification, bank account validation, mandate lifecycle tracking,
                repayment schedules, settlement records, reconciliation exceptions, and audit logs
                are built into every sensitive workflow.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: Shield,
                  title: "KYC & verification",
                  text: "Identity and bank validation with admin exception review.",
                },
                {
                  icon: Wallet,
                  title: "Payments & mandates",
                  text: "Direct debit mandates, deductions, retries, and settlement.",
                },
                {
                  icon: Building2,
                  title: "Listings & applications",
                  text: "Publication workflow with landlord and agent review queues.",
                },
                {
                  icon: Car,
                  title: "Cars & appliances",
                  text: "List and browse vehicles and home appliances alongside properties.",
                },
              ].map((item) => (
                <Card key={item.title}>
                  <CardHeader>
                    <item.icon className="h-6 w-6 text-emerald-600" />
                    <CardTitle className="text-base">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{item.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-emerald-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">
              What our users say
            </p>
            <h2 className="mt-4 text-3xl font-bold text-emerald-950">
              Trusted across Ghana
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((item) => (
              <div
                key={item.name}
                className="rounded-[2rem] bg-slate-950 p-8 shadow-[0_30px_60px_rgba(15,23,42,0.15)]"
              >
                <div className="mb-6 flex items-center justify-between">
                  <Quote className="h-7 w-7 text-emerald-400" />
                  <div className="flex items-center gap-1 text-amber-300">
                    {[...Array(5)].map((_, index) => (
                      <Star key={index} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-lg leading-8 text-slate-100">&ldquo;{item.quote}&rdquo;</p>
                <div className="mt-8 flex items-center gap-4">
                  <div className="relative h-14 w-14 overflow-hidden rounded-full border border-white/10 bg-slate-800">
                    <Image src={item.image} alt={item.name} fill className="object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{item.name}</p>
                    <p className="text-sm text-slate-400">{item.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-emerald-50 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-emerald-950">Ready to get started?</h2>
          <p className="mt-3 text-emerald-800/80">
            Create your account as a tenant, landlord, agent, or lender and access your
            role-specific dashboard.
          </p>
          <Button asChild size="lg" className="mt-6 bg-emerald-600 hover:bg-emerald-700">
            <Link href="/register">Create your account</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
