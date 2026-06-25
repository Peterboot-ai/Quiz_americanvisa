import { z } from 'zod';

export const ThemeSchema = z.object({
  navy:     z.string().default('#1B2541'),
  navyAlt:  z.string().default('#1a2847'),
  gold:     z.string().default('#B8860B'),
  goldAlt:  z.string().default('#D4A847'),
  cream:    z.string().default('#F0EDE8'),
  creamAlt: z.string().default('#FAFAF8'),
  flagBlue: z.string().default('#1B3A6B'),
  flagRed:  z.string().default('#C41E3A'),
}).default({});

export const AssetsSchema = z.object({
  logoUrl:     z.string().default(''),
  logoLight:   z.string().default(''),
  ogImageUrl:  z.string().default(''),
  proofImages: z.array(z.string()).default([]),
  ebookUrl:    z.string().default(''),
}).default({});

export const ContactSchema = z.object({
  whatsapp:  z.string().default(''),
  phone:     z.string().default(''),
  email:     z.string().default(''),
  instagram: z.string().default(''),
  website:   z.string().default(''),
  address: z.object({
    country: z.string().default('BR'),
    city:    z.string().default(''),
    state:   z.string().default(''),
  }).default({}),
}).default({});

const ClientProofSchema = z.object({
  name:  z.string(),
  label: z.string(),
});

export const CopySchema = z.object({
  approvalRateEbNiwEb1a: z.string().default('82%'),
  approvalRateL1aO1a:    z.string().default('96%'),
  clientProofs:   z.array(ClientProofSchema).default([]),
  footerTagline:  z.string().default(''),
  footerCopyright: z.string().default(''),
  footerAddress:  z.string().default(''),
  footerServices: z.array(z.string()).default([]),
  footerDark: z.boolean().default(true),
}).default({});

export const TrackingSchema = z.object({
  gtmId: z.string().default(''),
}).default({});

export const TeamSchema = z.object({
  assignees: z.array(z.string()).default([]),
}).default({});

export const TenantPublicConfigSchema = z.object({
  id:       z.number(),
  slug:     z.string(),
  name:     z.string(),
  theme:    ThemeSchema,
  assets:   AssetsSchema,
  contact:  ContactSchema,
  copy:     CopySchema,
  tracking: TrackingSchema,
  team:     TeamSchema,
});

export type TenantPublicConfig = z.infer<typeof TenantPublicConfigSchema>;
export type Theme    = z.infer<typeof ThemeSchema>;
export type Assets   = z.infer<typeof AssetsSchema>;
export type Contact  = z.infer<typeof ContactSchema>;
export type Copy     = z.infer<typeof CopySchema>;
export type Tracking = z.infer<typeof TrackingSchema>;
export type Team     = z.infer<typeof TeamSchema>;
