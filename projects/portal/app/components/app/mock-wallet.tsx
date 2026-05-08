import { Wallet, Send, ArrowDownToLine, ArrowRightLeft, Settings } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"

const mockAssets = [
  { name: "ALGO", amount: "142.38", usd: "$28.47", id: 0 },
  { name: "USDC", amount: "500.00", usd: "$500.00", id: 31566704 },
  { name: "goETH", amount: "0.125", usd: "$412.50", id: 386195940 },
]

export function MockWalletDashboard() {
  return (
    <div className="space-y-6">
      {/* Connection status */}
      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Wallet size={20} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">EVM Wallet</p>
              <p className="font-mono text-sm">0x71C7...3a4F</p>
            </div>
          </div>
          <Badge>Connected</Badge>
        </CardContent>
      </Card>

      {/* Algorand address */}
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground mb-1">Algorand Address (derived)</p>
          <p className="font-mono text-sm break-all">ALGO7X...MOCK...EVM4</p>
          <p className="mt-2 text-xs text-muted-foreground">
            This address is deterministically derived from your EVM wallet and secured by an on-chain Smart Account.
          </p>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Button variant="outline" className="h-auto flex-col gap-1 py-4" disabled>
          <Send size={18} />
          <span className="text-xs">Send</span>
        </Button>
        <Button variant="outline" className="h-auto flex-col gap-1 py-4" disabled>
          <ArrowDownToLine size={18} />
          <span className="text-xs">Receive</span>
        </Button>
        <Button variant="outline" className="h-auto flex-col gap-1 py-4" disabled>
          <ArrowRightLeft size={18} />
          <span className="text-xs">Bridge</span>
        </Button>
        <Button variant="outline" className="h-auto flex-col gap-1 py-4" disabled>
          <Settings size={18} />
          <span className="text-xs">Manage</span>
        </Button>
      </div>

      {/* Asset list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Assets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 p-0">
          {mockAssets.map((asset) => (
            <div key={asset.id} className="flex items-center justify-between border-t px-6 py-4 first:border-t-0">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold">
                  {asset.name.slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-medium">{asset.name}</p>
                  {asset.id > 0 && <p className="text-xs text-muted-foreground">ASA #{asset.id}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{asset.amount}</p>
                <p className="text-xs text-muted-foreground">{asset.usd}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
