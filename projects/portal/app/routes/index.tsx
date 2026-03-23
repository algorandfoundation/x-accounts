import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Wallet, Zap, Shield, Split, Link2, MousePointerClick, CheckCircle, ArrowUpRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import TypingText from "~/components/ui/typing-text";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Header } from "~/components/layout/header";
import { Footer } from "~/components/layout/footer";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="mx-auto max-w-6xl px-4 py-24 text-center">
          <div className="flex items-center justify-center gap-8 sm:gap-12 md:gap-16 mb-16">
            <svg className="h-28 sm:h-36 md:h-48 fill-primary" viewBox="0 0 113 113.4" aria-label="Algorand">
              <polygon points="19.6 113.4 36 85 52.4 56.7 68.7 28.3 71.4 23.8 72.6 28.3 77.6 47 72 56.7 55.6 85 39.3 113.4 58.9 113.4 75.3 85 83.8 70.3 87.8 85 95.4 113.4 113 113.4 105.4 85 97.8 56.7 95.8 49.4 108 28.3 90.2 28.3 89.6 26.2 83.4 3 82.6 0 65.5 0 65.1 0.6 49.1 28.3 32.7 56.7 16.4 85 0 113.4 19.6 113.4" />
            </svg>
            <span className="text-[100px] sm:md:text-[122px] md:text-[144px] font-bold bg-clip-text text-[#CCD0D3]">x</span>
            <svg className="h-28 sm:h-36 md:h-48" viewBox="420 80 1080 1760" aria-label="Ethereum">
              <path d="m959.8 80.7-539.7 895.6 539.7-245.3z" fill="#8a92b2" />
              <path d="m959.8 731-539.7 245.3 539.7 319.1z" fill="#62688f" />
              <path d="m1499.6 976.3-539.8-895.6v650.3z" fill="#62688f" />
              <path d="m959.8 1295.4 539.8-319.1-539.8-245.3z" fill="#454a75" />
              <path d="m420.1 1078.7 539.7 760.6v-441.7z" fill="#8a92b2" />
              <path d="m959.8 1397.6v441.7l540.1-760.6z" fill="#62688f" />
            </svg>
          </div>
          <h1 className="mx-auto mt-6 max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl text-muted-foreground">
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
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            No new wallet needed, no setup. Just connect any EVM wallet to send transactions, manage assets, and bridge tokens on Algorand.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild>
              <Link to="/app">
                Launch
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/docs">Read the Docs</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 pt-10 pb-20">
        <h2 className="text-center text-3xl font-bold">Why Algorand x EVM?</h2>
        <p className="mx-auto mt-3 text-center text-muted-foreground">
          Bring the Ethereum wallet you already trust to Algorand&apos;s fast, low-cost network.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-6">
              <Wallet className="h-8 w-8 text-primary shrink-0" />
              <CardTitle>Bring Your Own</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Connect your existing Ethereum wallet. No new seed phrases, no new apps. Your EVM address automatically maps to an Algorand
              account.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-6">
              <Shield className="h-8 w-8 text-primary shrink-0" />
              <CardTitle>Self Custodial</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Only your signature can authorize transactions. Cryptographic ECDSA verification happens entirely on-chain via an Algorand
              Smart Account.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-6">
              <Split className="h-8 w-8 text-primary shrink-0" />
              <CardTitle>Domain Isolation</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              AVM and EVM domains are fully separated. Sign Algorand x EVM transactions with EIP-712 typed data, eliminating the risk of
              cross-network contamination.
            </CardContent>
          </Card>
          {/* <Card>
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-6">
              <Zap className="h-8 w-8 text-primary shrink-0" />
              <CardTitle>Fast &amp; Affordable</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Algorand transactions settle in about 3 seconds with fees measured in fractions of a cent. No gas auctions, no MEV.
            </CardContent>
          </Card> */}
        </div>
      </section>

      {/* How It Works */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-center text-3xl font-bold">How It Works</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
                1
              </div>
              <Link2 className="mt-4 h-8 w-8 text-muted-foreground" />
              <h3 className="mt-3 text-lg font-semibold">Connect</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Connect your MetaMask or any EVM wallet to Algorand x EVM compatible dApps.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
                2
              </div>
              <MousePointerClick className="mt-4 h-8 w-8 text-muted-foreground" />
              <h3 className="mt-3 text-lg font-semibold">Sign</h3>
              <p className="mt-2 text-sm text-muted-foreground">Approve transactions with isolated EIP-712 typed data signing.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
                3
              </div>
              <CheckCircle className="mt-4 h-8 w-8 text-muted-foreground" />
              <h3 className="mt-3 text-lg font-semibold">Transact</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Your transactions execute on Algorand, verified by an on-chain ECDSA Smart Account.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h2 className="text-3xl font-bold">Ready to get started?</h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">Connect your wallet and start using Algorand in seconds.</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" asChild>
            <Link to="/app">
              Launch
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/docs">Read the Docs</Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
