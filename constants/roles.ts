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
      "Browse up to 10 homes and 5 cars or appliances with a free account",
      "Request financing for your chosen listings through PayForme lenders",
      "See listings advocated by agents and verified for safety",
      "Upgrade to unlock the full marketplace and unlimited inventory",
    ],
    buttonText: "Learn more",
  },
  {
    slug: "landlord",
    title: "For Landlords",
    tagline: "List properties, cars, and appliances with confidence",
    image: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200&q=80",
    benefits: [
      "Publish up to 5 homes, cars and home appliances on PayForme",
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
      "Review up to 10 property financing requests with a standard account",
      "See up to 5 car and 5 appliance financing opportunities",
      "Support tenant-approved deals and monitor repayment performance",
      "Upgrade to gain access to the full PayForme marketplace",
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
      "Help finance your client’s purchases through PayForme partners",
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
      "See up to 10 homes, 5 cars, and 5 appliances before upgrading",
      "Request financing from trusted lenders directly in the marketplace",
      "Work with agents who advocate for the best listings",
      "Keep your rent and purchases secure through PayForme workflows",
    ],
    howItWorks: [
      "Search and filter homes, cars, and appliances from verified landlords.",
      "Submit a request to finance the listing you want.",
      "A lender reviews your request and approves the best fit.",
      "Agents can support and advocate for your application.",
    ],
    subscription: {
      headline: "Tenant Subscription",
      description:
        "Free accounts are limited in visibility and listing access. A subscription unlocks the full PayForme marketplace so you can browse unlimited homes, cars, and appliances.",
      features: [
        "Unlimited property search",
        "Access to all cars and appliances",
        "Priority financing review",
        "Exclusive agent matches",
      ],
      limitedAccess:
        "Without a subscription, tenants can only view a curated sample of listings and must upgrade to see the full inventory.",
    },
  },
  landlord: {
    title: "Landlord",
    subtitle: "List properties, cars, and appliances with financing and agent support.",
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80",
    overview:
      "PayForme helps landlords market homes, cars, and appliances while giving tenants lender-backed financing options and agent advocacy.",
    whyChoose: [
      "List up to 5 assets in the free tier, including homes, cars, and appliances.",
      "Connect each listing to tenant financing backed by lenders.",
      "Let agents promote and advocate your listings to qualified buyers.",
      "Receive tracked interest, applications, and settlement updates.",
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
        "Free landlords can list a limited number of assets. Subscription unlocks unlimited listings and premium placement across homes, cars, and appliances.",
      features: [
        "Unlimited listing uploads",
        "Featured placement in search results",
        "Priority agent promotion",
        "Advanced performance analytics",
      ],
      limitedAccess:
        "Without subscription, landlords are limited to a small number of active listings and reduced marketplace visibility.",
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
      headline: "Lender Subscription",
      description:
        "Standard lenders can review a sample of requests. Subscription unlocks the full PayForme pipeline and deeper portfolio tools.",
      features: [
        "Access to all financing requests",
        "Advanced borrower analytics",
        "Priority deal notifications",
        "Full portfolio reporting",
      ],
      limitedAccess:
        "Without subscription, lenders can only view a limited number of deals and miss the broader marketplace opportunities.",
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
        "Free agents can support a limited number of listings. Subscription unlocks more inventory, higher visibility, and premium client tools.",
      features: [
        "Support unlimited listings",
        "Access premium lead workflows",
        "Earn higher agent placement",
        "Get collaboration tools with lenders and landlords",
      ],
      limitedAccess:
        "Without subscription, agents have limited support capacity and lower exposure for their clients.",
    },
  },
};
