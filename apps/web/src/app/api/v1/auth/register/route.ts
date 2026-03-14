import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@stealth/db';
import { createWalletForUser } from '@/lib/wallets-mpc';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      return NextResponse.json(
        { error: { code: 'INVALID_CREDENTIALS', message: error.message } },
        { status: 400 }
      );
    }

    let wallet: Awaited<ReturnType<typeof createWalletForUser>> | null = null;
    let walletProvisioningWarning: string | null = null;

    if (data.user?.id) {
      try {
        wallet = await createWalletForUser({
          userId: data.user.id,
          label: `TBTC MPC Wallet (${email.split('@')[0] || 'user'})`,
          passphrase: password,
        });
      } catch (walletError) {
        console.error('[POST /api/v1/auth/register] wallet provisioning failed', walletError);
        walletProvisioningWarning =
          'Account created, but wallet provisioning is pending. You can create or link your MPC wallet from the dashboard.';
      }
    }

    return NextResponse.json(
      {
        data: {
          user: { id: data.user?.id, email: data.user?.email },
          session: data.session,
          message: 'Account created. You can now log in.',
          wallet: wallet?.summary ?? null,
          walletMetadata: wallet?.metadata ?? null,
          walletProvisioningWarning,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[POST /api/v1/auth/register]', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Registration failed.' } },
      { status: 500 }
    );
  }
}
