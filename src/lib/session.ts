import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export interface HouseholdSummary {
  id: string;
  name: string;
  role: "admin" | "family_member";
}

export interface UserContext {
  userId: string;
  profile: Profile;
  households: HouseholdSummary[];
  /** Care recipients this user can see as an assigned caregiver (across any household). */
  caregiverRecipientIds: string[];
}

/**
 * Loads everything the authenticated app shell needs about the
 * current user. Redirects to /login if there's no session -- pages
 * that call this can assume a logged-in user going forward.
 */
export async function requireUserContext(): Promise<UserContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: memberships }, { data: caregiverRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("household_members")
      .select("role, households(id, name)")
      .eq("profile_id", user.id),
    supabase
      .from("care_recipient_caregivers")
      .select("care_recipient_id")
      .eq("profile_id", user.id)
      .eq("active", true),
  ]);

  const households: HouseholdSummary[] = (memberships ?? [])
    .filter((m) => m.households)
    .map((m) => {
      const household = Array.isArray(m.households) ? m.households[0] : m.households;
      return {
        id: household.id as string,
        name: household.name as string,
        role: m.role as "admin" | "family_member",
      };
    });

  return {
    userId: user.id,
    profile: (profile as Profile) ?? {
      id: user.id,
      full_name: "",
      email: user.email ?? "",
      phone: null,
      created_at: "",
      updated_at: "",
    },
    households,
    caregiverRecipientIds: (caregiverRows ?? []).map((r) => r.care_recipient_id as string),
  };
}
