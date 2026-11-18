export type JobDepartment = "marketing" | "engineering" | "design" | "sales" | "all";

export interface JobOpening {
  id: string;
  title: string;
  slug: string;
  department: "marketing" | "engineering" | "design" | "sales";
  location: string;
  workMode: "Remote" | "Hybrid" | "On-site";
  engagement: string;
  compensation: string;
  featured?: boolean;
  active: boolean;
  postedDate: string;
  summary: string;
  aboutCompany: string;
  responsibilities: string[];
  qualifications: string[];
  earningsAndPerks: string[];
  applyInstructions?: string;
}

export type ApplicationStatus = "new" | "reviewing" | "shortlisted" | "interview" | "hired" | "rejected";

export interface CareerApplicationData {
  id?: string;
  fullName: string;
  email: string;
  phone: string;
  city?: string;
  jobId: string;
  jobTitle: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  resumeUrl?: string;
  campaignResults?: string;
  experienceYears?: string;
  coverNote?: string;
  status?: ApplicationStatus;
  adminNotes?: string;
  submittedAt?: string;
}
