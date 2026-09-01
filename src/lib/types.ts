export type HouseholdRole = "admin" | "family_member";
export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";
export type InvitationRole = "caregiver" | "family_member";
export type CheckinStatus = "normal" | "attention" | "urgent";
export type AlertStatus = "open" | "acknowledged" | "resolved";
export type QuestionType = "scale" | "boolean" | "text" | "select";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Household {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  profile_id: string;
  role: HouseholdRole;
  created_at: string;
}

export interface CareRecipient {
  id: string;
  household_id: string;
  full_name: string;
  preferred_name: string | null;
  date_of_birth: string | null;
  photo_url: string | null;
  notes: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  allergies: string | null;
  mobility_needs: string | null;
  communication_preferences: string | null;
  food_preferences: string | null;
  daily_routine: string | null;
  caregiver_instructions: string | null;
  medication_info: string | null;
  likes_and_interests: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppNotification {
  id: string;
  profile_id: string;
  household_id: string | null;
  type: string;
  title: string;
  body: string | null;
  related_table: string | null;
  related_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface CaregiverInvitation {
  id: string;
  household_id: string;
  care_recipient_id: string | null;
  invited_by: string;
  invited_role: InvitationRole;
  email: string;
  full_name: string | null;
  status: InvitationStatus;
  expires_at: string;
  accepted_by: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface CheckinTemplate {
  id: string;
  household_id: string;
  care_recipient_id: string;
  name: string;
  is_active: boolean;
}

export interface CheckinQuestion {
  id: string;
  template_id: string;
  category: string;
  prompt: string;
  question_type: QuestionType;
  options: { value: string; label: string }[] | null;
  is_required: boolean;
  sort_order: number;
}

export interface Checkin {
  id: string;
  household_id: string;
  care_recipient_id: string;
  template_id: string | null;
  caregiver_id: string;
  status: CheckinStatus;
  notes: string | null;
  submitted_at: string;
}

export interface CheckinResponse {
  id: string;
  checkin_id: string;
  question_id: string;
  category: string;
  value_text: string | null;
  value_number: number | null;
  value_boolean: boolean | null;
}

export interface CareNote {
  id: string;
  household_id: string;
  care_recipient_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface Alert {
  id: string;
  household_id: string;
  care_recipient_id: string;
  checkin_id: string | null;
  severity: CheckinStatus;
  status: AlertStatus;
  summary: string;
  created_by: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  profile_id: string;
  email_on_checkin: boolean;
  email_on_concern: boolean;
  email_on_missed_checkin: boolean;
}
