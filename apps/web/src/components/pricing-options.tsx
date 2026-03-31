import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import Spinner from "./ui/spinner";
import { PLAN_PRODUCT_IDS } from "@/lib/plan-slugs";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import { env } from "@padyna/env/web";

type Plan = {
  id: number;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyProductId: string;
  yearlyProductId: string;
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
    monthlyProductId: PLAN_PRODUCT_IDS.starter.monthly!,
    yearlyProductId: PLAN_PRODUCT_IDS.starter.yearly!,
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
    monthlyProductId: PLAN_PRODUCT_IDS.growth.monthly!,
    yearlyProductId: PLAN_PRODUCT_IDS.growth.yearly!,
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
    tagline: "For scaling businesses and agencies",
    monthlyPrice: 399,
    yearlyPrice: 329,
    monthlyProductId: PLAN_PRODUCT_IDS.professional.monthly!,
    yearlyProductId: PLAN_PRODUCT_IDS.professional.yearly!,
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
  isLoading,
  onSelect,
}: {
  plan: Plan;
  billingPeriod: "monthly" | "yearly";
  isLoading: boolean;
  onSelect: () => void;
}) {
  const price = billingPeriod === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
  const isYearly = billingPeriod === "yearly";

  return (
    <Card className="relative overflow-visible bg-gray-50 w-full p-2 max-w-xl shadow-sm ring-muted">
      {plan.isPopular && (
        <span className="bg-primary text-white absolute left-1/2 -top-3 z-20 -translate-x-1/2 flex h-6 w-fit items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ring-white/20 ring-offset-1 ring-offset-gray-950/5">
          Recommended
        </span>
      )}

      <div className="flex flex-col h-full bg-white rounded-lg border">
        <CardHeader>
          <CardTitle className="font-medium text-lg pt-4">{plan.name}</CardTitle>
          <div className="my-2">
            <span className="block text-2xl font-sans font-semibold">
              ${price}
              <span className="text-sm font-normal text-muted-foreground ">/mo</span>
            </span>
            {isYearly && (
              <span className="text-sm text-neutral-500">Billed annually (${price * 12}/year)</span>
            )}
          </div>
          <CardDescription className="text-sm">{plan.tagline}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 grow p-4">
          <hr className="border-dashed" />
          <ul className="list-outside space-y-3 text-sm">
            {plan.features.map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <Check className="size-3 mt-0.5 text-primary shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>

        <CardFooter className="p-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full">
            <Button
              variant={plan.isPopular ? "default" : "outline"}
              onClick={onSelect}
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner className="w-4 h-4 text-white mr-2" />
                  Processing...
                </>
              ) : (
                "Start free trial"
              )}
            </Button>
          </motion.div>
        </CardFooter>
      </div>
    </Card>
  );
}

export function PricingOptions() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [loadingPlanId, setLoadingPlanId] = useState<number | null>(null);
  const { data: session } = useSession();
  const navigate = useNavigate();

  const handleSelectPlan = async (plan: Plan) => {
    if (!session || !session.session.activeOrganization) {
      navigate({ to: "/login" });
      return;
    }

    const productId = billingPeriod === "monthly" ? plan.monthlyProductId : plan.yearlyProductId;
    setLoadingPlanId(plan.id);

    try {
      const metadata = JSON.stringify({
        referenceId: session.session.activeOrganization,
        planName: plan.name,
      });

      const params = new URLSearchParams();
      params.append("products", productId);
      params.append("metadata", metadata);
      params.append("customerExternalId", session.user.id);
      params.append("customerEmail", session.user.email);
      params.append("customerName", session.user.name);

      const checkoutUrl = `${env.VITE_SERVER_URL}/api/checkout?${params.toString()}`;
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("An error occurred during checkout. Please try again.");
      setLoadingPlanId(null);
    }
  };

  return (
    <motion.section
      id="pricing"
      className="py-4 font-sans"
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mt-8">
          <Tabs
            value={billingPeriod}
            onValueChange={(value) => setBillingPeriod(value as "monthly" | "yearly")}
            className="w-full"
          >
            <div className="flex flex-col items-center justify-center w-full">
              <div className="flex items-center justify-center gap-2">
                <TabsList className="grid w-75 grid-cols-2 mx-auto rounded-full p-1">
                  <TabsTrigger className="rounded-full" value="monthly">
                    Monthly
                  </TabsTrigger>
                  <TabsTrigger className="relative rounded-full" value="yearly">
                    Yearly <span className="text-xs text-primary font-semibold ml-2">20% off</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            <TabsContent value={billingPeriod} className="mt-8">
              <div className="grid gap-6 lg:grid-cols-3 place-items-center w-full">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    billingPeriod={billingPeriod}
                    isLoading={loadingPlanId === plan.id}
                    onSelect={() => handleSelectPlan(plan)}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </motion.section>
  );
}
