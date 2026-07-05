export type RoleSlug = "tenant" | "landlord" | "lender" | "agent";

export type RoleHowItWorks = {
  slug: RoleSlug;
  title: string;
  tagline: string;
  image: string;
  benefits: string[];
  buttonText: string;
};

export const ROLE_HOW_IT_WORKS: RoleHowItWorks[] = [
  {
    slug: "tenant",
    title: "For Tenants",
    tagline: "Find your next home, not a headache",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80",
    benefits: [
      "Browse all verified homes, cars, and appliances for free",
      "Apply for listings and request rent financing at no monthly cost",
      "Work with agents who advocate for your application",
      "Track mandates, repayments, and wallet activity in one dashboard",
    ],
    buttonText: "Learn more",
  },
  {
    slug: "landlord",
    title: "For Landlords",
    tagline: "List properties, cars, and appliances with confidence",
    image: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200&q=80",
    benefits: [
      "Publish up to 5 homes, cars and home appliances on PayForMe",
      "Connect listings to tenant financing requests from lenders",
      "Use agents to advocate and close deals faster",
      "Upgrade to expand your inventory and premium placement",
    ],
    buttonText: "Learn more",
  },
  {
    slug: "lender",
    title: "For Lenders",
    tagline: "Fund deals across homes, vehicles, and appliances",
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80",
    benefits: [
      "Review the full financing queue at no monthly cost",
      "Approve or reject tenant requests across properties, cars, and appliances",
      "Monitor repayment performance and portfolio health",
      "Collaborate with agents and landlords on funded deals",
    ],
    buttonText: "Learn more",
  },
  {
    slug: "agent",
    title: "For Agents",
    tagline: "Advocate listings and support every side of the deal",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80",
    benefits: [
      "Assist tenants, landlords, and lenders in one unified workflow",
      "Advocate houses, cars, and home appliances to the right buyers",
      "Help finance your client’s purchases through PayForMe partners",
      "Upgrade to support more listings and earn higher visibility",
    ],
    buttonText: "Learn more",
  },
];

export type RolePageData = {
  title: string;
  subtitle: string;
  image: string;
  overview: string;
  whyChoose: string[];
  howItWorks: string[];
  subscription: {
    headline: string;
    description: string;
    features: string[];
    limitedAccess: string;
  };
};

export const ROLE_PAGE_DATA: Record<RoleSlug, RolePageData> = {
  tenant: {
    title: "Tenant",
    subtitle: "Browse verified homes, cars, and appliances with smart financing.",
    image: "https://images.unsplash.com/photo-1549187774-b4e9b0445b9b?w=1200&q=80",
    overview:
      "PayForme gives tenants a single place to discover homes, vehicles, and appliances while accessing lender-backed financing and agent support.",
    whyChoose: [
      "Free access to browse the full marketplace",
      "Apply and request financing without a subscription",
      "Work with agents who advocate for the best listings",
      "Keep rent and purchases secure through PayForMe workflows",
    ],
    howItWorks: [
      "Search and filter homes, cars, and appliances from verified landlords.",
      "Submit a request to finance the listing you want.",
      "A lender reviews your request and approves the best fit.",
      "Agents can support and advocate for your application.",
    ],
    subscription: {
      headline: "Free for tenants",
      description:
        "Tenant accounts are always free. Browse the full marketplace, submit applications, and request rent financing without a monthly subscription.",
      features: [
        "Unlimited property search",
        "Free applications and financing requests",
        "Wallet, mandates, and repayment tracking",
        "Email and in-app support",
      ],
      limitedAccess:
        "Tenants never need a subscription. Platform fees may apply to specific transactions such as financing or payments.",
    },
  },
  landlord: {
    title: "Landlord",
    subtitle: "List properties, cars, and appliances with financing and agent support.",
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80",
    overview:
      "PayForme helps landlords market homes, cars, and appliances while giving tenants lender-backed financing options and agent advocacy.",
    whyChoose: [
      "Start with a 7-day trial, then list on the Free plan (1 home, 1 car, 1 appliance)",
      "Connect each listing to tenant financing backed by lenders",
      "Assign agents to promote and advocate your listings",
      "Receive tracked applications and settlement updates",
    ],
    howItWorks: [
      "Create a listing for properties, cars, or appliances.",
      "Share the listing with tenants and agents in the marketplace.",
      "Lenders review the tenant financing request for approval.",
      "Complete the deal with transparent payment and settlement tracking.",
    ],
    subscription: {
      headline: "Landlord Subscription",
      description:
        "Landlords get a 7-day trial with full access, then Free plan limits apply. Upgrade to Pro or Max for more listings, agent assignments, and premium placement.",
      features: [
        "Pro: up to 10 homes, 5 cars, 5 appliances",
        "Max: unlimited listings",
        "Featured placement in search results",
        "Assign agents to advertise listings",
      ],
      limitedAccess:
        "After trial, Free landlords are limited to 3 total active listings. Upgrade to restore visibility and add more inventory.",
    },
  },
  lender: {
    title: "Lender",
    subtitle: "Fund real deals across properties, vehicles, and appliances.",
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&q=80",
    overview:
      "PayForme enables lenders to review financing requests for homes, cars, and appliances with clear repayment tracking and borrower context.",
    whyChoose: [
      "Access an evolving pipeline of tenant financing requests.",
      "Review deals for properties, cars, and appliances in one place.",
      "Monitor repayment progress and portfolio health.",
      "Work alongside agents to support borrower success.",
    ],
    howItWorks: [
      "Receive tenant financing requests from verified marketplace listings.",
      "Review the property, car, or appliance details and borrower profile.",
      "Approve financing and set repayment terms in PayForme.",
      "Track repayments and portfolio performance through the dashboard.",
    ],
    subscription: {
      headline: "Free for lenders",
      description:
        "Lender accounts are always free. Access the full financing pipeline, approve deals, and monitor repayments without a monthly subscription.",
      features: [
        "Full financing request queue",
        "Approve and reject requests",
        "Portfolio and repayment reporting",
        "Wallet and settlement tools",
      ],
      limitedAccess:
        "Lenders never need a subscription. Revenue comes from funded deals and agreed platform fees on transactions.",
    },
  },
  agent: {
    title: "Agent",
    subtitle: "Advocate listings and close deals faster.",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1200&q=80",
    overview:
      "PayForme gives agents the tools to advocate for listings, match buyers, and collaborate with lenders and landlords for faster closes.",
    whyChoose: [
      "Support listings for homes, cars, and appliances in one dashboard.",
      "Advocate tenants to lenders and landlords with verified data.",
      "Track your leads, commissions, and deal status.",
      "Expand your portfolio with premium agent visibility.",
    ],
    howItWorks: [
      "Manage client listings and connect them with tenants.",
      "Advocate deals to lenders and landlords within PayForme.",
      "Monitor application progress and financing approvals.",
      "Close deals with transparent communication and settlement tracking.",
    ],
    subscription: {
      headline: "Agent Subscription",
      description:
        "Agents get a 7-day trial with full assignment capacity. After trial, Free plan limits apply to how many listings you can be assigned to. Upgrade for more capacity and visibility.",
      features: [
        "Pro: support up to 20 assigned listings",
        "Max: unlimited assigned listings",
        "Premium agent placement on listings",
        "Application review and client tools",
      ],
      limitedAccess:
        "After trial, Free agents can be assigned to 3 listings total. Landlords cannot assign you to new listings until you upgrade.",
    },
  },
};
