/**
 * WHY IS IT LOST (spec 10.7): the lead page's Lost asks a member for the
 * reason the database needs ("Has a website vendor", "No budget", "Not
 * interested", "Wrong number or closed", "No reply after the last message",
 * or one they type), saved as lostReason. The same dialog the Leads bulk bar
 * and the Pipeline use, so the reasons read alike everywhere.
 */
export { LostReasonPrompt as LostReasonDialog, LOST_REASONS } from "../leads/BulkBar";
