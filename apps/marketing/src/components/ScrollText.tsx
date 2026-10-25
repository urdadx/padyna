export function ScrollText() {
  return (
    <blockquote className="relative flex w-full justify-center px-2 pt-16 sm:pt-24">
      <p className="font-display lg:text-heading-lg max-w-4xl text-center text-[35px] leading-tight tracking-tight text-stone-900 sm:text-[55px]">
        &ldquo;When I first opened Padyna, I instantly felt like this was the{" "}
        <mark className="bg-primary/20 rounded-md px-1 text-inherit">
          next generation
        </mark>{" "}
        of customer support&rdquo;
      </p>
    </blockquote>
  );
}
