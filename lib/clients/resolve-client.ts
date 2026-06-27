import type { SupabaseClient } from "@supabase/supabase-js";

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits || phone.trim();
}

interface ResolveClientInput {
  name: string;
  phone: string;
  email?: string | null;
}

export async function resolveClient(
  supabase: SupabaseClient,
  input: ResolveClientInput
): Promise<string> {
  const phone = normalizePhone(input.phone);
  const name = input.name.trim();
  const email = input.email?.trim() || null;

  const { data: existing } = await supabase
    .from("clients")
    .select("id, name, email")
    .eq("phone", phone)
    .maybeSingle();

  if (existing) {
    const updates: Record<string, string | null> = {};
    if (name && existing.name !== name) updates.name = name;
    if (email && existing.email !== email) updates.email = email;

    if (Object.keys(updates).length > 0) {
      await supabase.from("clients").update(updates).eq("id", existing.id);
    }

    return existing.id;
  }

  const { data: created, error } = await supabase
    .from("clients")
    .insert({
      name,
      phone,
      email,
      first_visit_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !created) {
    throw error ?? new Error("Unable to create client record.");
  }

  return created.id;
}
