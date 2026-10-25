export default function FAQs() {
  const faqItems = [
    {
      id: "item-1",
      question: "How does the AI customer support agent work?",
      answer:
        "The agent is trained on your knowledge base (files, websites, Notion, and Google Drive content) and support documentation, allowing it to instantly answer customer questions with context 24/7 across all supported channels.",
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
          <div className="mx-auto flex w-full max-w-2xl flex-col items-start gap-4 px-4 py-10 text-left sm:items-center sm:gap-2 sm:text-center">
            <p className="text-primary font-mono text-sm font-medium tracking-[0.56px] uppercase sm:text-xs">
              FREQUENTLY ASKED QUESTIONS
            </p>
            <h2 className="max-w-100.5 text-[24px] leading-[1.2] font-medium tracking-tight text-stone-900 sm:max-w-none sm:text-4xl sm:leading-tight">
              Everything you need to know
            </h2>
            <p className="max-w-lg text-base leading-5.5 font-normal text-stone-500 sm:text-sm sm:leading-normal sm:text-stone-600">
              Discover quick and comprehensive answers to common questions about
              our platform, services, and features.
            </p>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-xl px-4">
          <div className="bg-card ring-muted w-full rounded-2xl border px-8 py-3 shadow-sm ring-8 dark:ring-0">
            {faqItems.map((item) => (
              <details
                key={item.id}
                className="group border-b border-dashed last:border-b-0"
              >
                <summary className="focus-visible:outline-primary flex cursor-pointer list-none items-center justify-between gap-4 rounded-md py-4 font-sans text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-4 [&::-webkit-details-marker]:hidden">
                  <span>{item.question}</span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="size-4 shrink-0 text-stone-500 group-open:rotate-180"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </summary>
                <p className="pb-4 text-base">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
