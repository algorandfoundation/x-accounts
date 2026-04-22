import { cn } from "~/lib/utils";
import TypingText from "~/components/ui/typing-text";

type Props = {
  className?: string;
};

export function UseAlgorandWith({ className }: Props) {
  return (
    <h1
      className={cn(
        "mx-auto max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl text-muted-foreground",
        className,
      )}
    >
      Use <span className="text-primary">Algorand</span> with{" "}
      <TypingText
        text={["MetaMask", "Rainbow", "Rabby", "Coinbase Wallet"]}
        as="span"
        typingSpeed={60}
        deletingSpeed={40}
        pauseDuration={2000}
        showCursor={true}
        cursorCharacter="|"
        cursorClassName="!h-[1em] !w-[1.5px]"
        textColors={[
          "#F6851B",
          "linear-gradient(to right, #0E76FD, #5F5AFA, #FF5CA0, #FF801F, #FFD014, #4BD166)",
          "#8697FF",
          "#0052FF",
        ]}
      />{" "}
    </h1>
  );
}
