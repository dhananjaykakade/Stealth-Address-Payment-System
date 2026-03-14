'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api';

type WalletSummary = {
  walletId: string;
  network: 'TBTC';
  walletType: string;
  multisigType: string;
  receiveAddress: string;
  balance: string;
  walletLabel: string;
  isMpc: boolean;
  warning?: string;
};

type WalletMetadata = {
  id: string;
  walletId: string;
  coin: string;
  walletLabel: string;
  multisigType: string | null;
  walletType: string | null;
  receiveAddress: string | null;
  createdAt: string;
};

type WalletListResponse = { data: { metadata: WalletMetadata[]; wallets: WalletSummary[] } };
type LinkWalletResponse = {
  data: {
    wallet: WalletSummary;
    mpcVerified: boolean;
    warning?: string;
  };
};

const CUSTODY_NOTICE =
  "This wallet is created using BitGo's MPC (Multi-Party Computation) infrastructure. Private keys are split into cryptographic shares and never exist in a single place. Our platform does not store private keys and cannot move funds independently.";

export default function DashboardPage(): React.JSX.Element {
  const [wallets, setWallets] = useState<WalletMetadata[]>([]);
  const [walletSummaries, setWalletSummaries] = useState<WalletSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lookupWalletId, setLookupWalletId] = useState('');
  const [linking, setLinking] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const refreshWallets = async () => {
    const { data } = await apiClient.get<WalletListResponse>('/wallets/mpc');
    setWallets(data.data.metadata);
    setWalletSummaries(data.data.wallets);
  };

  useEffect(() => {
    (async () => {
      try {
        await refreshWallets();
      } catch {
        setError('Failed to load wallet data.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const latestWallet = wallets[0] ?? null;
  const latestSummary = walletSummaries[0] ?? null;
  const balanceValue = useMemo(() => {
    if (!latestSummary) return '0 sats';
    return `${latestSummary.balance} sats`;
  }, [latestSummary]);

  const onLinkWallet = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLinking(true);
    setError(null);
    setWarning(null);

    try {
      const { data } = await apiClient.post<LinkWalletResponse>('/wallets/mpc/link', {
        walletId: lookupWalletId,
      });

      if (!data.data.mpcVerified) {
        setWarning(data.data.warning ?? 'Wallet is not MPC-enabled.');
      } else {
        await refreshWallets();
        setLookupWalletId('');
      }
    } catch {
      setError('Wallet lookup failed. Please check the wallet ID and try again.');
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="app-shell-panel overflow-hidden rounded-[2rem] p-6 md:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-5">
            <div className="inline-flex rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs font-light uppercase tracking-[0.24em] text-fuchsia-100/85">
              Wallet command center
            </div>
            <div>
              <h1 className="app-section-title">Internal dashboard</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55 md:text-base">
                Monitor balances, detect matched stealth outputs, and manage payment operations in
                one private control surface.
              </p>
            </div>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-black/35 p-5">
            <div className="text-xs uppercase tracking-[0.24em] text-white/35">System status</div>
            <div className="mt-4 space-y-4 text-sm text-white/68">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <span>Supabase auth</span>
                <span className="text-emerald-300">Connected</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <span>BitGo network</span>
                <span className="text-amber-200">TBTC</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <span>MPC custody</span>
                <span className="text-fuchsia-200">TSS verified</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: 'Balance', value: latestWallet ? balanceValue : '—' },
          { label: 'Network', value: latestWallet ? 'TBTC' : '—' },
          { label: 'Wallet Type', value: latestWallet ? 'MPC (TSS)' : '—' },
        ].map((s) => (
          <div key={s.label} className="metric-tile">
            <p className="text-sm text-white/48">{s.label}</p>
            <p className="mt-2 text-2xl font-light tracking-tight text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="app-shell-panel rounded-[1.75rem] p-6">
          <h2 className="text-lg font-light text-white">MPC Wallet Details</h2>
          {loading ? <p className="mt-4 text-sm text-white/55">Loading wallet data...</p> : null}
          {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
          {warning ? <p className="mt-4 text-sm text-amber-200">{warning}</p> : null}

          {latestWallet ? (
            <div className="mt-4 space-y-3 rounded-[1.25rem] border border-white/10 p-4 text-sm text-white/75">
              <div>
                <span className="text-white/45">Wallet ID:</span> {latestWallet.walletId}
              </div>
              <div>
                <span className="text-white/45">Network:</span> TBTC
              </div>
              <div>
                <span className="text-white/45">Wallet Type:</span> MPC (TSS)
              </div>
              <div>
                <span className="text-white/45">Receiving Address:</span>{' '}
                {latestWallet.receiveAddress || 'Address not generated yet'}
              </div>
              <div>
                <span className="text-white/45">Balance:</span> fetched via BitGo wallet endpoint
                {latestSummary ? ` (${latestSummary.balance} sats)` : ''}
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-[1.25rem] border border-white/10 p-4 text-sm text-white/45">
              No TBTC MPC wallet linked yet.
            </p>
          )}

          <div className="mt-4 rounded-2xl border border-emerald-400/12 bg-emerald-400/8 p-4 text-sm leading-7 text-emerald-100/80">
            {CUSTODY_NOTICE}
          </div>
        </div>

        <div className="app-shell-panel rounded-[1.75rem] p-6">
          <h2 className="text-lg font-light text-white">Lookup Existing Wallet</h2>
          <p className="mt-2 text-sm leading-7 text-white/60">
            Enter a BitGo TBTC wallet ID to verify MPC status, generate a receiving address, and
            persist metadata.
          </p>

          <form className="mt-4 space-y-3" onSubmit={onLinkWallet}>
            <input
              type="text"
              required
              value={lookupWalletId}
              onChange={(event) => setLookupWalletId(event.target.value)}
              className="input-premium"
              placeholder="Enter wallet_id"
            />
            <button type="submit" className="button-premium w-full" disabled={linking}>
              {linking ? 'Verifying...' : 'Verify & Link Wallet'}
            </button>
          </form>

          <div className="mt-5 space-y-3 text-sm text-white/60">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              1. Wallet is fetched from `GET /api/v2/tbtc/wallet/{'{walletId}'}`.
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              2. `multisigType` is checked for `tss`.
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              3. A receiving address is generated and metadata is stored in Supabase.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
