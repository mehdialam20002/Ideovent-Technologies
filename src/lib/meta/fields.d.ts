/**
 * Types for ./fields.js (plain JavaScript, shared by the server functions and
 * the browser). Keep the two files in step: every export there is declared here.
 */
import type { LeadKind } from "../outreach/types";

/** Meta's platform codes; anything else Meta adds later passes through as text. */
export type MetaPlatformCode = "fb" | "ig" | "msg" | "an" | "wa" | (string & {});

export type MetaSource = "Facebook Lead Ads" | "Instagram Lead Ads" | "Meta Lead Ads" | "Meta Leads Center";

/** Every key a Meta lead may set on a CRM lead, all text; 0012 refuses any other. */
export interface MetaLeadData {
  instituteName: string;
  kind: LeadKind;
  contactName?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  city?: string;
  state?: string;
  website?: string;
  source: MetaSource;
  notes: string;
  metaLeadId?: string;
  metaPlatform?: MetaPlatformCode;
  metaFormId?: string;
  metaFormName?: string;
  metaCampaignId?: string;
  metaCampaignName?: string;
  metaAdsetId?: string;
  metaAdsetName?: string;
  metaAdId?: string;
  metaAdName?: string;
  /** When the person sent the form (ISO, UTC). */
  metaCreatedAt?: string;
  metaOrganic?: "yes" | "no";
  metaConsent?: "yes" | "no" | "none";
}

/** Graph's field_data, or a plain { question: answer } object. */
export type MetaFieldData = Array<{ name: string; values?: unknown }> | Record<string, unknown>;

export interface MetaDisclaimer {
  checkbox_key?: string;
  is_checked?: boolean | number | string;
}

/** A lead as the Graph API, the webhook, the relay or a CSV row gives it. snake_case and camelCase are both read. */
export interface MetaLeadInput {
  leadgenId?: string;
  id?: string;
  pageId?: string;
  platform?: string;
  createdTime?: string | number;
  isOrganic?: boolean | number | string;
  formId?: string;
  formName?: string;
  adId?: string;
  adName?: string;
  adsetId?: string;
  adsetName?: string;
  campaignId?: string;
  campaignName?: string;
  fieldData?: MetaFieldData;
  disclaimers?: MetaDisclaimer[];
  consent?: "yes" | "no" | "none" | "";
  /** One of META_SOURCES (the imports); otherwise it follows the platform. */
  source?: MetaSource;
  /** A Leads Center export (no platform, no form). */
  leadsCenter?: boolean;
  /** One more line for the notes (Leads Center: its stage, source and owner). */
  extra?: string;
  [snakeCase: string]: unknown;
}

export interface MetaAnswer {
  key: string;
  label: string;
  value: string;
}

export interface MetaFields {
  fullName: string;
  phone: string;
  whatsapp: string;
  email: string;
  business: string;
  city: string;
  state: string;
  website: string;
  businessType: string;
}

export declare const META_LEAD_ID_PREFIX: "ol_meta_";
export declare const META_SOURCES: readonly MetaSource[];
export declare const META_MAX: Readonly<Record<keyof MetaLeadData, number>>;
export declare const META_LEAD_KEYS: readonly (keyof MetaLeadData)[];

export declare function platformCode(raw: unknown): MetaPlatformCode | "";
export declare function platformLabel(code: string): string;
export declare function sourceFor(code: string): MetaSource;
export declare function isMetaLead(lead: { metaLeadId?: string; source?: string } | null | undefined): boolean;
export declare function campaignOf(lead: { metaCampaignName?: string; metaCampaignId?: string } | null | undefined): string;
export declare function metaId(raw: unknown): string;
export declare function metaTime(raw: unknown): string;
export declare function istLabel(iso: string | undefined | null): string;
export declare function yesNo(raw: unknown): "yes" | "no" | "";
export declare function normalizePhone(raw: unknown): string;
export declare function normalizeEmail(raw: unknown): string;
export declare function normalizeKey(name: unknown): string;
export declare function readAnswers(fieldData: unknown): { fields: MetaFields; answers: MetaAnswer[] };
export declare function consentFrom(list: unknown): "yes" | "no" | "none";
export declare function kindFromText(businessType: unknown, ...hints: unknown[]): LeadKind;
export declare function leadTitle(fields: Partial<MetaFields> | null | undefined, code: string): string;
export declare function metaNotes(
  m: {
    platform?: string;
    createdAt?: string;
    formName?: string;
    campaignName?: string;
    adsetName?: string;
    adName?: string;
    organic?: string;
    consent?: string;
    leadsCenter?: boolean;
    extra?: string;
  },
  answers: MetaAnswer[],
): string;
export declare function mapMetaLead(input: MetaLeadInput | null | undefined): { leadgenId: string; pageId: string; lead: MetaLeadData };
