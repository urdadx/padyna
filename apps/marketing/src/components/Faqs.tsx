import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQs() {
  const faqItems = [
    {
      id: "item-1",
      question: "How does the AI customer support agent work?",
      answer:
        "The agent is trained on your knowledge base (files, website, notion, google drive contents, youtube videos) and support documentation, allowing it to instantly answer customer questions with context 24/7 across all supported channels.",
    },
    {
      id: "item-2",
      question: "What integrations does the platform support?",
      answer:
        "We integrate with major communication channels and tools including WhatsApp, Slack, Telegram, Discord, Calendly, Jira, ClickUp, Notion and Google Drive. More integrations coming soon.",
    },
    {
      id: "item-3",
      question: "Can I customize the responses of the AI agent?",
      answer:
        "Yes. You can customize your agent's personality, language and tone in the dashboard's playground.",
    },
    {
      id: "item-4",
      question: "Do I need any technical experience to set up the agent?",
      answer:
        "No. You can easily set up and deploy the agent in just a few minutes",
    },
    {
      id: "item-5",
      question: "Is there a free trial or demo available?",
      answer:
        "We offer a 7-day free trial with full access to all features. You can also request a live demo with our team (support@padyna.com) if you’d like to see it in action first.",
    },
  ];

  return (
    <section id="faqs" className="w-full border-y pb-10">
      <div className="w-full">
        <div className="border-b px-4 md:px-6">
          <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-2 px-4 py-10 text-center">
            <p className="text-primary font-mono text-xs font-medium tracking-[0.56px] uppercase">
              FREQUENTLY ASKED QUESTIONS
            </p>
            <h2 className="text-2xl font-medium tracking-tight text-stone-900 sm:text-4xl">
              Everything you need to know
            </h2>
            <p className="max-w-lg text-sm font-normal text-stone-600">
              Discover quick and comprehensive answers to common questions about
              our platform, services, and features.
            </p>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-xl px-4">
          <Accordion className="bg-card ring-muted w-full rounded-2xl border px-8 py-3 shadow-sm ring-8 dark:ring-0">
            {faqItems.map((item) => (
              <AccordionItem
                key={item.id}
                value={item.id}
                className="border-dashed"
              >
                <AccordionTrigger className="cursor-pointer font-sans text-base hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-base">{item.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
