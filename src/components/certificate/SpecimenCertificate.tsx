import CertificateTemplate from "./CertificateTemplate";
import { CANONICAL_ORIGIN } from "@/lib/verify";
import type { CertificateArtData } from "./artwork";

/**
 * The certificate, as an example, watermarked SPECIMEN, with a fictional name.
 *
 * WHY THIS EXISTS AT ALL
 * ----------------------
 * The /internship hero used to show `public/certificates/preview.webp`, which is
 * a crop of Ankit Kumar's ACTUAL certificate: his name, his dates, his internship
 * number, and Abhishek Tiwari's real handwritten signature reproduced at legible
 * resolution on a public marketing page. Three separate problems in one image, 
 * a named private individual's credential used as an advertisement, a signature
 * published at a size that can be traced, and an MSME emblem on a certificate
 * when `_assets/FACTS.md` records the Udyam/MSME registration as unconfirmed.
 *
 * This renders the real template instead, so a prospective applicant sees exactly
 * the document they would receive, and nobody's actual certificate is the poster.
 *
 * THE RULES IT FOLLOWS
 * --------------------
 * Exactly two certificates have ever been issued. Ankit Kumar (INT2025A73) and
 * Shreya (INT2025A74). Nothing anywhere may imply a third, so this sample:
 *   - carries the SPECIMEN overprint, drawn on top of the artwork rather than
 *     behind it, plus a navy tag reading "SPECIMEN: NOT AN ISSUED CERTIFICATE";
 *   - uses "Aarav Example", which nobody will mistake for a person;
 *   - shows the DATE PATTERN rather than dates, so it states no batch;
 *   - carries no certificate ID, and its QR points at the verification search
 *     page rather than at any record. Scanning it demonstrates the system and
 *     resolves to nothing, which is the correct answer for a specimen.
 */

const SPECIMEN: CertificateArtData = {
  certificateId: "SPECIMEN",
  internName: "Aarav Example",
  designation: "Web Developer Intern",
  programme: "Ideovent LaunchPad",
  duration: "Month YYYY. Month YYYY",
  projectWork:
    "One factual sentence naming what this person actually built: the real certificate carries theirs, written by the partner who reviewed the work.",
  issuedAt: "",
  issuedBy: "Ideovent Technologies",
  completion: "completed",
  verifyLabel: `${CANONICAL_ORIGIN.replace(/^https?:\/\//, "")}/verify`,
  specimen: true,
};

export default function SpecimenCertificate({ className }: { className?: string }) {
  return (
    <CertificateTemplate
      data={SPECIMEN}
      // The specimen's QR resolves to the verification SEARCH page. It must not
      // resolve to a record, and it must not be a dead link either.
      verifyUrl={`${CANONICAL_ORIGIN}/verify`}
      // 96 DPI on a marketing page: the page is read on a phone, and a 300 DPI
      // canvas here would be 35 MB of memory for a decorative image. The export
      // path is unaffected. That always draws at 300.
      previewDpi={96}
      className={className}
    />
);
}
