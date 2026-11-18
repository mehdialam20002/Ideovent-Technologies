import { useState, type FormEvent } from "react";
import {
  Briefcase, Mail, Phone, MessageCircle, ExternalLink, Trash2,
  Search, Filter, Eye, ChevronDown, TrendingUp, Globe, FileText,
  Plus, Pencil, PauseCircle, PlayCircle, X, Save, CheckCircle2
} from "lucide-react";
import { useCollection, useCms } from "@/lib/cms/context";
import type { Application, JobOpeningDoc } from "@/lib/cms/types";
import { nextId } from "@/lib/cms/store";
import { normalisePhone } from "@/lib/leads";
import { cn } from "@/lib/utils";
import { DEFAULT_JOB_OPENINGS } from "@/lib/careers/jobs";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: "New", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30" },
  reviewing: { label: "Reviewing", color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/30" },
  shortlisted: { label: "Shortlisted", color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/30" },
  interview: { label: "Interview", color: "text-indigo-500", bg: "bg-indigo-500/10 border-indigo-500/30" },
  hired: { label: "Hired", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30" },
  rejected: { label: "Rejected", color: "text-rose-500", bg: "bg-rose-500/10 border-rose-500/30" },
};

const EMPTY_JOB_FORM = {
  id: "",
  title: "",
  department: "marketing" as JobOpeningDoc["department"],
  location: "Saket, New Delhi (Work From Home / Hybrid)",
  workMode: "Remote" as JobOpeningDoc["workMode"],
  engagement: "Flexible / Remote",
  compensation: "",
  featured: false,
  active: true,
  summary: "",
  aboutCompany:
    "Ideovent Technologies is a fast-growing web and software studio based in Saket, New Delhi. We build high-converting websites, custom web applications, and digital growth solutions for businesses across India and abroad.",
  responsibilitiesText: "",
  qualificationsText: "",
  perksText: "",
  applyInstructions: "Submit your profile, portfolio/LinkedIn, and past results below.",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "opening";
}

function linesToArray(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim().replace(/^[-*•\d.)\s]+/, "").trim())
    .filter(Boolean);
}

export default function AdminCareers() {
  const allApps = useCollection("applications") || [];
  const cmsJobs = useCollection("jobOpenings");
  const jobs: JobOpeningDoc[] = cmsJobs && cmsJobs.length > 0 ? cmsJobs : DEFAULT_JOB_OPENINGS;

  const careerApps = allApps
    .filter((a) => a.type === "career" || a.jobId || a.jobTitle)
    .sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));

  const { actions } = useCms();

  const [activeTab, setActiveTab] = useState<"applications" | "jobs">("applications");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<string>("");

  // Job Listing Modal State
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [savingJob, setSavingJob] = useState(false);
  const [jobForm, setJobForm] = useState({ ...EMPTY_JOB_FORM });

  // Statistics
  const totalCount = careerApps.length;
  const newCount = careerApps.filter((a) => (a.status || "new") === "new").length;
  const shortlistedCount = careerApps.filter((a) => a.status === "shortlisted" || a.status === "interview").length;
  const activeJobsCount = jobs.filter((j) => j.active).length;

  // Filtered applications
  const filteredApps = careerApps.filter((app) => {
    const currentStatus = app.status || "new";
    if (statusFilter !== "all" && currentStatus !== statusFilter) return false;
    if (roleFilter !== "all" && app.jobId !== roleFilter && app.jobTitle !== roleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = app.fullName?.toLowerCase().includes(q);
      const matchEmail = app.email?.toLowerCase().includes(q);
      const matchPhone = app.phone?.toLowerCase().includes(q);
      const matchCity = app.city?.toLowerCase().includes(q);
      const matchResults = app.campaignResults?.toLowerCase().includes(q);
      const matchNotes = app.notes?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchPhone && !matchCity && !matchResults && !matchNotes) return false;
    }
    return true;
  });

  // Open modal for New Job
  const openNewJobModal = () => {
    setJobForm({ ...EMPTY_JOB_FORM });
    setJobModalOpen(true);
  };

  // Open modal to Edit Existing Job
  const openEditJobModal = (job: JobOpeningDoc) => {
    setJobForm({
      id: job.id,
      title: job.title,
      department: job.department || "marketing",
      location: job.location || "",
      workMode: job.workMode || "Remote",
      engagement: job.engagement || "",
      compensation: job.compensation || "",
      featured: Boolean(job.featured),
      active: job.active !== false,
      summary: job.summary || "",
      aboutCompany: job.aboutCompany || EMPTY_JOB_FORM.aboutCompany,
      responsibilitiesText: (job.responsibilities || []).join("\n"),
      qualificationsText: (job.qualifications || []).join("\n"),
      perksText: (job.earningsAndPerks || []).join("\n"),
      applyInstructions: job.applyInstructions || EMPTY_JOB_FORM.applyInstructions,
    });
    setJobModalOpen(true);
  };

  const handleSaveJob = async (e: FormEvent) => {
    e.preventDefault();
    if (!jobForm.title.trim()) return;
    setSavingJob(true);
    try {
      const isEdit = Boolean(jobForm.id);
      const nowMonth = new Date().toLocaleString("en-IN", { month: "long", year: "numeric" });
      const existing = isEdit ? jobs.find((j) => j.id === jobForm.id) : null;

      const doc: JobOpeningDoc = {
        id: isEdit ? jobForm.id : nextId("job"),
        order: existing?.order ?? jobs.length,
        title: jobForm.title.trim(),
        slug: slugify(jobForm.title),
        department: jobForm.department,
        location: jobForm.location.trim() || "Remote",
        workMode: jobForm.workMode,
        engagement: jobForm.engagement.trim() || "Flexible / Remote",
        compensation: jobForm.compensation.trim() || "Performance-Based",
        featured: jobForm.featured,
        active: jobForm.active,
        postedDate: existing?.postedDate || nowMonth,
        summary: jobForm.summary.trim(),
        aboutCompany: jobForm.aboutCompany.trim(),
        responsibilities: linesToArray(jobForm.responsibilitiesText),
        qualifications: linesToArray(jobForm.qualificationsText),
        earningsAndPerks: linesToArray(jobForm.perksText),
        applyInstructions: jobForm.applyInstructions.trim(),
      };

      await actions.saveDoc("jobOpenings", doc);
      setJobModalOpen(false);
      setActiveTab("jobs");
    } finally {
      setSavingJob(false);
    }
  };

  const handleToggleJobActive = async (job: JobOpeningDoc) => {
    await actions.saveDoc("jobOpenings", { ...job, active: !job.active });
  };

  const handleDeleteJob = async (job: JobOpeningDoc) => {
    if (!confirm(`Delete the job listing "${job.title}"? Existing applications will not be deleted.`)) return;
    await actions.removeDoc("jobOpenings", job.id);
  };

  const handleStatusChange = async (app: Application, nextStatus: string) => {
    await actions.saveDoc("applications", {
      ...app,
      status: nextStatus as any,
    });
  };

  const handleSaveNotes = async (app: Application) => {
    await actions.saveDoc("applications", {
      ...app,
      adminNotes: notesDraft,
    });
    setEditingNotesId(null);
  };

  const handleDelete = async (app: Application) => {
    if (!confirm(`Are you sure you want to delete the application from ${app.fullName}?`)) return;
    await actions.removeDoc("applications", app.id);
  };

  const getWhatsAppLink = (app: Application) => {
    const phone = normalisePhone(app.phone || "");
    const digits = phone.ok ? phone.whatsapp : (app.phone || "").replace(/[^\d]/g, "");
    if (!digits) return "";
    const first = (app.fullName || "").split(" ")[0] || "there";
    const role = app.jobTitle || "the position";
    const text = `Hello ${first}, this is Mehdi from Ideovent Technologies regarding your application for ${role}. We reviewed your profile and would like to discuss the next steps. Are you available for a brief chat?`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Briefcase className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Career &amp; Partner Applications</h1>
            <p className="text-sm text-muted-foreground">
              Manage job listings, review marketing campaign proof, and coordinate hiring.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openNewJobModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Job Listing
          </button>
          <a
            href="/careers"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            View Public Careers Page
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Applicants</p>
          <p className="mt-1 font-display text-2xl font-bold">{totalCount}</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-500">New / Unreviewed</p>
          <p className="mt-1 font-display text-2xl font-bold text-amber-500">{newCount}</p>
        </div>
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-purple-500">Shortlisted / Interview</p>
          <p className="mt-1 font-display text-2xl font-bold text-purple-500">{shortlistedCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active Openings</p>
          <p className="mt-1 font-display text-2xl font-bold">{activeJobsCount} <span className="text-xs font-normal text-muted-foreground">/ {jobs.length}</span></p>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("applications")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
            activeTab === "applications"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <FileText className="h-4 w-4" />
          Applications ({careerApps.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("jobs")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
            activeTab === "jobs"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Briefcase className="h-4 w-4" />
          Job Postings ({jobs.length})
        </button>
      </div>

      {/* TAB 1: APPLICATIONS */}
      {activeTab === "applications" && (
        <div className="space-y-4">
          {/* Filters & Search Toolbar */}
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/40 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search applicant name, phone, email, results..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-background py-1.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                <select
                  aria-label="Filter by role"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none"
                >
                  <option value="all">All Roles ({careerApps.length})</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>{job.title}</option>
                  ))}
                </select>
              </div>

              <select
                aria-label="Filter by application status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="reviewing">Reviewing</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="interview">Interview</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Applications List */}
          {filteredApps.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <Briefcase className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <p className="mt-3 text-base font-medium text-foreground">No applications match your filter.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Candidates applying from <a href="/careers" className="text-primary underline">ideovent.in/careers</a> will appear here instantly.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredApps.map((app) => {
                const currentStatus = app.status || "new";
                const statusInfo = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.new;
                const isExpanded = expandedId === app.id;
                const waLink = getWhatsAppLink(app);

                return (
                  <div
                    key={app.id}
                    className="overflow-hidden rounded-2xl border border-border bg-card/60 transition-all hover:border-border/80"
                  >
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-display text-base font-semibold text-foreground">
                              {app.fullName}
                            </h3>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
                                statusInfo.bg,
                                statusInfo.color
                              )}
                            >
                              {statusInfo.label}
                            </span>
                            {app.city && (
                              <span className="text-xs text-muted-foreground">
                                &bull; {app.city}
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-sm font-medium text-primary">
                            Role: {app.jobTitle || "Performance Digital Marketing Partner"}
                          </p>

                          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {app.email && (
                              <a
                                href={`mailto:${app.email}`}
                                className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                              >
                                <Mail className="h-3.5 w-3.5" />
                                {app.email}
                              </a>
                            )}
                            {app.phone && (
                              <a
                                href={`tel:${app.phone}`}
                                className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                              >
                                <Phone className="h-3.5 w-3.5" />
                                {app.phone}
                              </a>
                            )}
                            {waLink && (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-medium text-emerald-600 hover:text-emerald-500 transition-colors"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                WhatsApp Chat
                              </a>
                            )}
                            {app.linkedinUrl && (
                              <a
                                href={app.linkedinUrl.startsWith("http") ? app.linkedinUrl : `https://${app.linkedinUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                LinkedIn Profile
                              </a>
                            )}
                            {app.portfolioUrl && (
                              <a
                                href={app.portfolioUrl.startsWith("http") ? app.portfolioUrl : `https://${app.portfolioUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Portfolio / Work
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">Status:</span>
                            <select
                              aria-label={`Change status for ${app.fullName}`}
                              value={currentStatus}
                              onChange={(e) => handleStatusChange(app, e.target.value)}
                              className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold focus:border-primary focus:outline-none"
                            >
                              <option value="new">New</option>
                              <option value="reviewing">Reviewing</option>
                              <option value="shortlisted">Shortlisted</option>
                              <option value="interview">Interview</option>
                              <option value="hired">Hired</option>
                              <option value="rejected">Rejected</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : app.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              {isExpanded ? "Collapse" : "Full Details"}
                              <ChevronDown className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-180")} />
                            </button>

                            <button
                              type="button"
                              aria-label={`Delete application from ${app.fullName}`}
                              onClick={() => handleDelete(app)}
                              className="rounded-lg border border-border p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {app.campaignResults && (
                        <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                            <TrendingUp className="h-3.5 w-3.5" />
                            Past Campaign Results &amp; Proof:
                          </div>
                          <p className="mt-1 text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                            {app.campaignResults}
                          </p>
                        </div>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="border-t border-border bg-muted/20 p-4 sm:p-5 space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Experience &amp; Background</p>
                            <p className="mt-1 text-xs text-foreground">
                              {app.experienceYears ? `${app.experienceYears} of experience` : "Not specified"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Application Received</p>
                            <p className="mt-1 text-xs text-foreground">
                              {app.submittedAt ? new Date(app.submittedAt).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" }) : "Recent"}
                            </p>
                          </div>
                        </div>

                        {app.notes && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cover Note / Strategy</p>
                            <div className="mt-1 rounded-xl border border-border bg-card p-3 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                              {app.notes}
                            </div>
                          </div>
                        )}

                        <div className="rounded-xl border border-border bg-card p-3.5">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Private Admin Interviewer Notes
                            </span>
                            {editingNotesId !== app.id && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingNotesId(app.id);
                                  setNotesDraft(app.adminNotes || "");
                                }}
                                className="text-xs font-medium text-primary hover:underline"
                              >
                                {app.adminNotes ? "Edit Notes" : "+ Add Note"}
                              </button>
                            )}
                          </div>

                          {editingNotesId === app.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={notesDraft}
                                onChange={(e) => setNotesDraft(e.target.value)}
                                placeholder="Add internal feedback, interview remarks, or commission status..."
                                rows={3}
                                className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                              />
                              <div className="flex items-center gap-2 justify-end">
                                <button
                                  type="button"
                                  onClick={() => setEditingNotesId(null)}
                                  className="rounded-lg border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveNotes(app)}
                                  className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                                >
                                  Save Note
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs italic text-muted-foreground">
                              {app.adminNotes || "No internal notes added yet. Click 'Add Note' to record screening impressions."}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MANAGE JOB POSTINGS */}
      {activeTab === "jobs" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-card/40 p-4">
            <div>
              <h2 className="font-display text-base font-semibold">Manage Job Listings</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add new roles, edit existing descriptions, or pause listings. Active listings appear live on{" "}
                <a href="/careers" target="_blank" rel="noopener noreferrer" className="text-primary underline">ideovent.in/careers</a>.
              </p>
            </div>
            <button
              type="button"
              onClick={openNewJobModal}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add New Listing
            </button>
          </div>

          {jobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <Briefcase className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <p className="mt-3 text-base font-medium text-foreground">No job listings yet.</p>
              <button
                type="button"
                onClick={openNewJobModal}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
                Create your first listing
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {jobs.map((job) => {
                const applicantCount = careerApps.filter((a) => a.jobId === job.id || a.jobTitle === job.title).length;

                return (
                  <div
                    key={job.id}
                    className={cn(
                      "rounded-2xl border bg-card/60 p-5 transition-all",
                      job.active ? "border-border" : "border-border/50 opacity-75"
                    )}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="max-w-3xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-lg font-bold text-foreground">{job.title}</h3>
                          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                            {job.department}
                          </span>
                          {job.featured && (
                            <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-500">
                              Featured
                            </span>
                          )}
                          <span
                            className={cn(
                              "rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                              job.active
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                                : "bg-muted border-border text-muted-foreground"
                            )}
                          >
                            {job.active ? "Active (Live)" : "Paused (Hidden)"}
                          </span>
                        </div>

                        <p className="mt-1.5 text-xs font-medium text-primary">
                          {job.compensation} &bull; {job.location} &bull; {job.engagement}
                        </p>

                        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                          {job.summary}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                        <div className="text-right mb-1">
                          <span className="text-[11px] text-muted-foreground mr-1.5">Applicants:</span>
                          <span className="font-display text-lg font-bold text-foreground">{applicantCount}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditJobModal(job)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleJobActive(job)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                          >
                            {job.active ? (
                              <>
                                <PauseCircle className="h-3.5 w-3.5 text-amber-500" />
                                Pause
                              </>
                            ) : (
                              <>
                                <PlayCircle className="h-3.5 w-3.5 text-emerald-600" />
                                Activate
                              </>
                            )}
                          </button>

                          <a
                            href={`/careers#${job.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                          >
                            Preview
                            <ExternalLink className="h-3 w-3" />
                          </a>

                          <button
                            type="button"
                            aria-label={`Delete ${job.title}`}
                            onClick={() => handleDeleteJob(job)}
                            className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ADD / EDIT JOB LISTING MODAL */}
      {jobModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">
                  {jobForm.id ? "Edit Job Listing" : "Add New Job Listing"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Published active listings appear immediately on ideovent.in/careers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setJobModalOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJob} className="space-y-4 p-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Job / Partner Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Performance Digital Marketing Partner (Commission-Based)"
                  value={jobForm.title}
                  onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Department
                  </label>
                  <select
                    value={jobForm.department}
                    onChange={(e) => setJobForm({ ...jobForm, department: e.target.value as JobOpeningDoc["department"] })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="marketing">Marketing</option>
                    <option value="engineering">Engineering</option>
                    <option value="design">Design</option>
                    <option value="sales">Sales</option>
                    <option value="operations">Operations</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Work Mode
                  </label>
                  <select
                    value={jobForm.workMode}
                    onChange={(e) => setJobForm({ ...jobForm, workMode: e.target.value as JobOpeningDoc["workMode"] })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="On-site">On-site</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Engagement
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Flexible / Remote"
                    value={jobForm.engagement}
                    onChange={(e) => setJobForm({ ...jobForm, engagement: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Location *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Saket, New Delhi (WFH / Hybrid)"
                    value={jobForm.location}
                    onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Compensation / Commission *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ₹1,500 – ₹2,000 per closed deal"
                    value={jobForm.compensation}
                    onChange={(e) => setJobForm({ ...jobForm, compensation: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Short Summary (1–2 lines) *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Brief overview shown at the top of the job listing..."
                  value={jobForm.summary}
                  onChange={(e) => setJobForm({ ...jobForm, summary: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Key Responsibilities (one per line)
                </label>
                <textarea
                  rows={4}
                  placeholder={"Paid Lead Generation (Meta & Google Ads): Set up and optimize campaigns...\nSearch Engine Optimization (SEO): Execute On-Page & GMB optimization..."}
                  value={jobForm.responsibilitiesText}
                  onChange={(e) => setJobForm({ ...jobForm, responsibilitiesText: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Required Skills &amp; Qualifications (one per line)
                </label>
                <textarea
                  rows={3}
                  placeholder={"Hands-on experience running Meta & Google Lead Ads...\nStrong analytical and ROI-focused mindset..."}
                  value={jobForm.qualificationsText}
                  onChange={(e) => setJobForm({ ...jobForm, qualificationsText: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Earnings &amp; Perks (one per line)
                </label>
                <textarea
                  rows={3}
                  placeholder={"High Per-Deal Commission: Earn ₹1,500 – ₹2,000 per closed deal...\n100% Remote & Flexible..."}
                  value={jobForm.perksText}
                  onChange={(e) => setJobForm({ ...jobForm, perksText: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-6 rounded-xl border border-border bg-muted/30 p-3.5">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={jobForm.active}
                    onChange={(e) => setJobForm({ ...jobForm, active: e.target.checked })}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  Active (Visible on /careers)
                </label>

                <label className="inline-flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={jobForm.featured}
                    onChange={(e) => setJobForm({ ...jobForm, featured: e.target.checked })}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  Mark as Featured Opening
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setJobModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingJob}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {savingJob ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                  {jobForm.id ? "Save Changes" : "Publish Listing"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
