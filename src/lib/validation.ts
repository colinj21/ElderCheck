import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email().max(254);

export const signupSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name").max(120),
  email: emailSchema,
  password: z.string().min(8, "Use at least 8 characters").max(128),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(128),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "Use at least 8 characters").max(128),
});

export const householdSchema = z.object({
  name: z.string().trim().min(1, "Enter a household name").max(120),
});

export const careRecipientSchema = z.object({
  fullName: z.string().trim().min(1, "Enter their name").max(120),
  dateOfBirth: z.string().trim().max(10).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const careRecipientProfileSchema = z.object({
  preferredName: z.string().trim().max(120).optional().or(z.literal("")),
  emergencyContactName: z.string().trim().max(160).optional().or(z.literal("")),
  emergencyContactPhone: z.string().trim().max(40).optional().or(z.literal("")),
  allergies: z.string().trim().max(1000).optional().or(z.literal("")),
  mobilityNeeds: z.string().trim().max(1000).optional().or(z.literal("")),
  communicationPreferences: z.string().trim().max(1000).optional().or(z.literal("")),
  foodPreferences: z.string().trim().max(1000).optional().or(z.literal("")),
  dailyRoutine: z.string().trim().max(2000).optional().or(z.literal("")),
  caregiverInstructions: z.string().trim().max(2000).optional().or(z.literal("")),
  medicationInfo: z.string().trim().max(2000).optional().or(z.literal("")),
  likesAndInterests: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const inviteSchema = z.object({
  householdId: z.string().uuid(),
  careRecipientId: z.string().uuid().optional(),
  email: emailSchema,
  fullName: z.string().trim().max(120).optional().or(z.literal("")),
  role: z.enum(["caregiver", "family_member"]),
});

export const acceptInvitationSchema = z.object({
  token: z.string().trim().min(20).max(200),
  fullName: z.string().trim().min(1).max(120).optional(),
  password: z.string().min(8).max(128).optional(),
});

export const checkinSubmitSchema = z.object({
  careRecipientId: z.string().uuid(),
  templateId: z.string().uuid(),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
  status: z.enum(["normal", "attention", "urgent"]),
  responses: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        category: z.string().min(1).max(60),
        valueText: z.string().max(4000).optional(),
        valueNumber: z.number().min(1).max(5).optional(),
        valueBoolean: z.boolean().optional(),
      })
    )
    .min(1, "Answer at least one question")
    .max(50),
});

export const careNoteSchema = z.object({
  careRecipientId: z.string().uuid(),
  body: z.string().trim().min(1, "Write a note").max(4000),
});

export const notificationPreferencesSchema = z.object({
  emailOnCheckin: z.boolean(),
  emailOnConcern: z.boolean(),
  emailOnMissedCheckin: z.boolean(),
});

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export const medicationSchema = z.object({
  careRecipientId: z.string().uuid(),
  name: z.string().trim().min(1, "Enter the medication name").max(160),
  dosage: z.string().trim().max(80).optional().or(z.literal("")),
  frequency: z.string().trim().max(120).optional().or(z.literal("")),
  instructions: z.string().trim().max(500).optional().or(z.literal("")),
  prescribingDoctor: z.string().trim().max(160).optional().or(z.literal("")),
});

export const medicationLogSchema = z.object({
  medicationId: z.string().uuid(),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

export const appointmentSchema = z.object({
  careRecipientId: z.string().uuid(),
  title: z.string().trim().min(1, "Enter what this appointment is for").max(160),
  doctorName: z.string().trim().max(160).optional().or(z.literal("")),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  appointmentAt: z.string().trim().min(1, "Choose a date and time"),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
}); // 5MB
