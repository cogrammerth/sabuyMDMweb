import { createClient } from "@supabase/supabase-js";

export type OperatorCredentials = {
  email: string;
  password: string;
};

export function operatorTestCredentials(): OperatorCredentials {
  const email =
    process.env.E2E_OPERATOR_EMAIL?.trim() ||
    process.env.OPERATOR_EMAIL?.trim() ||
    "admin@sabuycall.net";
  const password =
    process.env.E2E_OPERATOR_PASSWORD?.trim() ||
    process.env.OPERATOR_PASSWORD?.trim();
  if (!password) {
    throw new Error(
      "Set OPERATOR_PASSWORD (or E2E_OPERATOR_PASSWORD) in .env.local for Playwright."
    );
  }
  return { email, password };
}

export async function ensureOperatorUser(): Promise<void> {
  const { email, password } = operatorTestCredentials();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY so tests can provision the operator user."
    );
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listError) {
    throw new Error(`Failed to list Auth users: ${listError.message}`);
  }

  const existing = listed.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase()
  );
  if (existing) {
    const { error: updateError } = await admin.auth.admin.updateUserById(
      existing.id,
      { password, email_confirm: true }
    );
    if (updateError) {
      throw new Error(`Failed to update operator test user: ${updateError.message}`);
    }
    return;
  }

  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) {
    throw new Error(`Failed to create operator test user: ${createError.message}`);
  }
}
