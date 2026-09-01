"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { careRecipientProfileSchema, careRecipientSchema, householdSchema } from "@/lib/validation";
import { remainingRecipientSlots } from "@/lib/billing";

export interface ActionResult {
  ok: boolean;
  error?: string;
  householdId?: string;
  careRecipientId?: string;
}

export async function createHouseholdAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be logged in." };

  const parsed = householdSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Enter a household name." };
  }

  // Writes go through the admin client rather than the user's session-scoped
  // client. Authorization is enforced manually here instead of via RLS.
  const admin = createAdminClient();

  const { data: household, error: householdError } = await admin
    .from("households")
    .insert({ name: parsed.data.name, created_by: user.id })
    .select()
    .single();

  if (householdError || !household) {
    return { ok: false, error: "Couldn't create the household. Please try again." };
  }

  const { error: memberError } = await admin
    .from("household_members")
    .insert({ household_id: household.id, profile_id: user.id, role: "admin" });

  if (memberError) {
    return { ok: false, error: "Couldn't finish setting up your household." };
  }

  await admin.from("audit_events").insert({
    household_id: household.id,
    actor_id: user.id,
    event_type: "household_created",
    target_table: "households",
    target_id: household.id,
  });

  return { ok: true, householdId: household.id };
}

export async function createCareRecipientAction(
  householdId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be logged in." };

  const parsed = careRecipientSchema.safeParse({
    fullName: formData.get("fullName"),
    dateOfBirth: formData.get("dateOfBirth") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const admin = createAdminClient();

  // Manual authorization check, since the admin client bypasses RLS:
  // the caller must be an admin member of this household.
  const { data: membership } = await admin
    .from("household_members")
    .select("role")
    .eq("household_id", householdId)
    .eq("profile_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!membership) {
    return { ok: false, error: "You don't have permission to add a profile to this household." };
  }

  const remaining = await remainingRecipientSlots(householdId);
  if (remaining !== null && remaining <= 0) {
    return {
      ok: false,
      error:
        "You've reached the limit of 1 loved one on the free plan. Upgrade in Settings to add more.",
    };
  }

  const { data: recipient, error } = await admin
    .from("care_recipients")
    .insert({
      household_id: householdId,
      full_name: parsed.data.fullName,
      date_of_birth: parsed.data.dateOfBirth || null,
      notes: parsed.data.notes || null,
    })
    .select()
    .single();

  if (error || !recipient) {
    return { ok: false, error: "Couldn't create the profile. Please try again." };
  }

  await admin.from("audit_events").insert({
    household_id: householdId,
    actor_id: user.id,
    event_type: "care_recipient_created",
    target_table: "care_recipients",
    target_id: recipient.id,
  });

  return { ok: true, careRecipientId: recipient.id };
}

export async function updateCareRecipientProfileAction(
  careRecipientId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be logged in." };

  const parsed = careRecipientProfileSchema.safeParse({
    preferredName: formData.get("preferredName") ?? "",
    emergencyContactName: formData.get("emergencyContactName") ?? "",
    emergencyContactPhone: formData.get("emergencyContactPhone") ?? "",
    allergies: formData.get("allergies") ?? "",
    mobilityNeeds: formData.get("mobilityNeeds") ?? "",
    communicationPreferences: formData.get("communicationPreferences") ?? "",
    foodPreferences: formData.get("foodPreferences") ?? "",
    dailyRoutine: formData.get("dailyRoutine") ?? "",
    caregiverInstructions: formData.get("caregiverInstructions") ?? "",
    medicationInfo: formData.get("medicationInfo") ?? "",
    likesAndInterests: formData.get("likesAndInterests") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const admin = createAdminClient();

  const { data: recipient } = await admin
    .from("care_recipients")
    .select("household_id")
    .eq("id", careRecipientId)
    .maybeSingle();

  if (!recipient) {
    return { ok: false, error: "Not found." };
  }

  const { data: membership } = await admin
    .from("household_members")
    .select("role")
    .eq("household_id", recipient.household_id)
    .eq("profile_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!membership) {
    return { ok: false, error: "You don't have permission to edit this profile." };
  }

  const { error } = await admin
    .from("care_recipients")
    .update({
      preferred_name: parsed.data.preferredName || null,
      emergency_contact_name: parsed.data.emergencyContactName || null,
      emergency_contact_phone: parsed.data.emergencyContactPhone || null,
      allergies: parsed.data.allergies || null,
      mobility_needs: parsed.data.mobilityNeeds || null,
      communication_preferences: parsed.data.communicationPreferences || null,
      food_preferences: parsed.data.foodPreferences || null,
      daily_routine: parsed.data.dailyRoutine || null,
      caregiver_instructions: parsed.data.caregiverInstructions || null,
      medication_info: parsed.data.medicationInfo || null,
      likes_and_interests: parsed.data.likesAndInterests || null,
    })
    .eq("id", careRecipientId);

  if (error) {
    return { ok: false, error: "Couldn't save the profile. Please try again." };
  }

  return { ok: true, careRecipientId };
}
