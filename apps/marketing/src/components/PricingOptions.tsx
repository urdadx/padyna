import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { buttonVariants } from "./ui/button";

type Plan = {
  id: number;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  isPopular: boolean;
};

const plans: Plan[] = [
  {
    id: 1,
    name: "Starter",
    tagline: "For solopreneurs and early-stage startups",
    monthlyPrice: 39,
    yearlyPrice: 32,
    features: [
      "2,000 message credits",
      "150 scraping credits",
      "1 chatbot",
      "1 team member",
      "20 MB storage limit",
      "Advanced analytics",
      "Integrations",
      "6 months analytics retention",
    ],
    isPopular: false,
  },
  {
    id: 2,
    name: "Growth",
    tagline: "For growing teams that need scale and collaboration",
    monthlyPrice: 129,
    yearlyPrice: 109,
    features: [
      "10,000 message credits",
      "500 scraping credits",
      "3 chatbots",
      "4 team members",
      "100 MB storage limit",
      "Advanced analytics",
      "Integrations",
      "2 years analytics retention",
    ],
    isPopular: true,
  },
  {
    id: 3,
    name: "Professional",
    tagline: "For scaling businesses and support agencies",
    monthlyPrice: 399,
    yearlyPrice: 329,
    features: [
      "30,000 message credits",
      "2,500 scraping credits",
      "5 chatbots",
      "10 team members",
      "400 MB storage limit",
      "Advanced analytics",
      "Integrations",
      "4 years analytics retention",
    ],
    isPopular: false,
  },
];

function PlanCard({
  plan,
  billingPeriod,
}: {
  plan: Plan;
  billingPeriod: "monthly" | "yearly";
}) {
  const price =
    billingPeriod === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
  const isYearly = billingPeriod === "yearly";

  return (
    <Card className="relative w-full max-w-xl overflow-visible bg-stone-50 p-2 shadow-sm ring-stone-200">
      {plan.isPopular && (
        <span className="bg-primary absolute -top-3 left-1/2 z-20 flex h-6 w-fit -translate-x-1/2 items-center rounded-full px-3 py-1 text-xs font-medium text-white ring-1 ring-white/20 ring-offset-1 ring-offset-stone-950/5 ring-inset">
          Recommended
        </span>
      )}

      <div className="flex h-full flex-col rounded-lg border border-stone-200 bg-white">
        <CardHeader>
          <CardTitle className="pt-4 text-lg font-medium text-stone-900">
            {plan.name}
          </CardTitle>
          <div className="my-2">
            <span className="block font-sans text-2xl font-semibold text-stone-900">
              ${price}
              <span className="text-muted-foreground text-sm font-normal">
                /mo
              </span>
            </span>
            <span className="text-sm text-stone-500">
              {isYearly
                ? `Billed annually ($${price * 12}/year)`
                : "Billed monthly"}
            </span>
          </div>
          <CardDescription className="text-sm text-stone-500">
            {plan.tagline}
          </CardDescription>
        </CardHeader>

        <CardContent className="grow space-y-4 p-4">
          <hr className="border-dashed border-stone-200" />
          <ul className="list-outside space-y-3 text-sm">
            {plan.features.map((item) => (
              <li key={item} className="flex items-start gap-2 text-stone-700">
                <svg
                  aria-hidden="true"
                  className="text-primary mt-0.5 size-3 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>

        <CardFooter className="p-3">
          <a
            href="https://app.padyna.com"
            className={buttonVariants({
              variant: plan.isPopular ? "default" : "outline",
              className: "w-full",
            })}
          >
            Start free trial
          </a>
        </CardFooter>
      </div>
    </Card>
  );
}

export function PricingOptions() {
  return (
    <section id="pricing" className="w-full border-y pb-10 font-sans">
      <div className="w-full border-b">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-2 px-4 py-10 text-center">
          <p className="text-primary font-mono text-xs font-medium tracking-[0.56px] uppercase">
            PRICING
          </p>
          <h2 className="text-2xl font-medium tracking-tight text-stone-900 sm:text-4xl">
            Simple, transparent pricing that scales with your business
          </h2>
          <p className="max-w-lg text-sm font-normal text-stone-600">
            Start with a free trial and choose the plan that fits your needs. No
            hidden fees, no surprises. Upgrade, downgrade, or cancel anytime.
          </p>
        </div>
      </div>
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-0">
        <div className="mt-8">
          <fieldset className="group w-full min-w-0">
            <legend className="sr-only">Billing period</legend>
            <div className="bg-muted mx-auto grid w-75 max-w-full grid-cols-2 rounded-full p-1">
              {(["monthly", "yearly"] as const).map((period) => (
                <label
                  key={period}
                  className="text-muted-foreground has-checked:bg-background has-checked:text-foreground has-focus-visible:outline-primary relative cursor-pointer rounded-full px-3 py-2 text-center text-sm font-medium has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-offset-2"
                >
                  <input
                    type="radio"
                    name="pricing-billing"
                    value={period}
                    defaultChecked={period === "monthly"}
                    className="sr-only"
                    aria-controls={`pricing-${period}`}
                  />
                  {period === "monthly" ? "Monthly" : "Yearly"}
                </label>
              ))}
            </div>

            <div
              id="pricing-monthly"
              className="mt-8 hidden group-has-[[value=monthly]:checked]:block"
            >
              <h3 className="sr-only">Monthly billing plans</h3>
              <div className="grid w-full place-items-center gap-6 lg:grid-cols-3">
                {plans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} billingPeriod="monthly" />
                ))}
              </div>
            </div>

            <div
              id="pricing-yearly"
              className="mt-8 hidden group-has-[[value=yearly]:checked]:block"
            >
              <h3 className="sr-only">Yearly billing plans</h3>
              <div className="grid w-full place-items-center gap-6 lg:grid-cols-3">
                {plans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} billingPeriod="yearly" />
                ))}
              </div>
            </div>
          </fieldset>
        </div>
      </div>
    </section>
  );
}
