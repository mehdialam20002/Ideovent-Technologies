// InternshipOnboardPage.tsx
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import React, { useRef, useState } from "react";

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  college: string;
  stream: string;
  message?: string;
};

const RAZORPAY_LINK = "https://pages.razorpay.com/ideovent.com"; // <-- replace with your Razorpay payment link
const WHATSAPP_NUMBER = "919999999999"; // <-- replace with your WhatsApp number (country code + number, no +)

export default function InternshipOnboardPage(): JSX.Element {
  const [form, setForm] = useState<FormState>({
    fullName: "",
    email: "",
    phone: "",
    college: "",
    stream: "",
    message: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showPaymentPrompt, setShowPaymentPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const certificateUrl =
    "https://i.postimg.cc/zvV4KHrL/CERINT2025-A73.png";

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.fullName.trim()) e.fullName = "Full name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Email is invalid";
    if (!form.phone.trim()) e.phone = "Phone is required";
    else if (!/^\d{10,15}$/.test(form.phone.replace(/\D/g, "")))
      e.phone = "Phone should be 10-15 digits";
    if (!form.college.trim()) e.college = "College name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const handleChange =
    (k: keyof FormState) =>
    (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((s) => ({ ...s, [k]: ev.target.value }));
      setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const onSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) {
      formRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    // Mark that form details are collected and show payment step
    setSubmitted(true);
    setShowPaymentPrompt(true);
    // Here you can also call your backend API to store the applicant details before payment (recommended).
  };

  const onPayClick = () => {
    // Open Razorpay link in new tab
    setLoading(true);
    window.open(RAZORPAY_LINK, "_blank", "noopener,noreferrer");
    setLoading(false);
    // After opening payment, show instruction to send screenshot on WhatsApp
    setShowPaymentPrompt(true);
    // Optionally, you may auto-copy WhatsApp link to clipboard
  };

  const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hi Ideovent, I have paid for the Internship. Name: ${form.fullName}, Email: ${form.email}. Here is my payment screenshot:`
  )}`;

  return (
    <>
    <Navbar/>
    <div className="ideovent-internship-root">
      <style>{`
        /* Reset & base */
        :root{
          --primary: #0e6ef3;
          --accent: #0b74d1;
          --muted: #6b7280;
          --card: #ffffff;
          --bg: #f4f7fb;
          --success: #28a745;
        }
        *{box-sizing:border-box}
        body, html, #root {height:100%}
        .ideovent-internship-root{
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
          background: linear-gradient(180deg, #f7fbff 0%, var(--bg) 100%);
          color: #0b2545;
          padding: 24px;
          display:flex;
          justify-content:center;
        }
        .page {
          width:100%;
          max-width:1100px;
          margin: 20px;
          margin-top: 80px;
        }

        header.top {
          background: linear-gradient(90deg,var(--primary),var(--accent));
          color: white;
          padding: 28px;
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(14,110,243,0.12);
          display:flex;
          gap:20px;
          align-items:center;
        }
        header .hero {
          flex:1;
        }
        header h1{
          margin:0;
          font-size: 22px;
          letter-spacing: -0.2px;
        }
        header p{margin:6px 0 0; opacity:0.95}

        .main-grid{
          display:grid;
          grid-template-columns: 1fr 420px;
          gap:20px;
          margin-top:18px;
        }

        /* left column (content + form) */
        .card {
          background: var(--card);
          border-radius: 12px;
          padding: 18px;
          box-shadow: 0 6px 18px rgba(11,37,69,0.06);
        }

        .certificate-preview {
          text-align:center;
        }
        .certificate-preview img{
          max-width: 360px;
          width: 100%;
          height: auto;
          border-radius:8px;
          border: 1px solid rgba(11,37,69,0.06);
        }
        .cert-actions{
          margin-top:10px;
          display:flex;
          gap:10px;
          justify-content:center;
        }
        .btn {
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:10px 14px;
          border-radius:8px;
          border: none;
          cursor:pointer;
          font-weight:600;
        }
        .btn-primary{
          background: var(--primary);
          color: white;
        }
        .btn-outline{
          background: transparent;
          border: 1px solid rgba(11,37,69,0.08);
          color: var(--primary);
        }

        form label{
          display:block;
          font-size:13px;
          margin-top:8px;
          margin-bottom:6px;
          color:#11325a;
          font-weight:600;
        }
        input[type="text"], input[type="email"], input[type="tel"], textarea {
          width:100%;
          padding:10px 12px;
          border-radius:8px;
          border:1px solid #e6eef9;
          background:#fbfdff;
          font-size:14px;
          outline:none;
        }
        input:focus, textarea:focus { box-shadow:0 4px 12px rgba(14,110,243,0.06); border-color:var(--accent) }

        .form-row { display:flex; gap:12px; }
        .form-row .col { flex:1 }
        .muted { color: var(--muted); font-size:13px }
        .error { color:#d14343; font-size:13px; margin-top:6px }

        .benefits-list { display:grid; grid-template-columns:repeat(2, 1fr); gap:10px; margin-top:12px }
        .benefit {
          background: linear-gradient(180deg,#ffffff,#fbfdff);
          border:1px solid rgba(11,37,69,0.04);
          padding:12px;
          border-radius:8px;
        }
        .benefit h4 { margin:0; font-size:14px }
        .benefit p { margin:6px 0 0; font-size:13px; color:var(--muted) }

        .terms { font-size:13px; color:var(--muted); line-height:1.5 }

        /* right column (sidebar) */
        .sidebar {
          display:flex;
          flex-direction:column;
          gap:12px;
        }
        .price-card {
          padding:16px;
          border-radius:10px;
          text-align:center;
          background: linear-gradient(90deg, rgba(14,110,243,0.06), rgba(11,116,209,0.03));
          border: 1px solid rgba(11,37,69,0.04);
        }
        .price-card h3 { margin:6px 0; color:var(--primary) }
        .price-amount { font-size:28px; font-weight:800; margin:6px 0 }
        .small { font-size:13px; color:var(--muted) }

        .contact-card { padding:12px; border-radius:10px; text-align:center }
        .whatsapp {
          background:#25D366;
          color:white;
          padding:8px 12px;
          display:inline-block;
          border-radius:8px;
          text-decoration:none;
          font-weight:700;
        }

        /* payment prompt box */
        .payment-prompt {
          margin-top:12px;
          padding:12px;
          background: linear-gradient(180deg, #fff, #f9fffa);
          border-left: 4px solid var(--success);
          border-radius:8px;
        }

        footer {
          margin-top:18px;
          text-align:center;
          color:var(--muted);
          font-size:13px;
        }

        /* Responsive */
        @media (max-width:1000px) {
          .main-grid { grid-template-columns: 1fr; }
          .benefits-list { grid-template-columns: 1fr }
        }
      `}</style>

      <div className="page" role="main">
        <header className="top" aria-hidden>
          <div className="hero">
            <h1>Ideovent LaunchPad — 3 Month Web Dev Internship</h1>
            <p style={{ marginTop: 6 }}>
              Practical training • Live client projects • Certificate & recommendation
            </p>
          </div>

          <div style={{ minWidth: 170, textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.9)" }}>Starts: Next Batch</div>
            <div style={{ marginTop: 8 }}>
              <button
                className="btn btn-primary"
                onClick={() =>
                  document.querySelector("#register-form")?.scrollIntoView({ behavior: "smooth" })
                }
                aria-label="Scroll to register"
              >
                Apply Now
              </button>
            </div>
          </div>
        </header>

        <div className="main-grid">
          {/* LEFT: content + form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card certificate-preview" aria-label="Certificate preview">
              <h3 style={{ marginTop: 0 }}>Certificate Preview</h3>
              <img src={certificateUrl} alt="Certificate preview" />
              <div className="cert-actions">
               
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    // download image
                    const a = document.createElement("a");
                    a.href = certificateUrl;
                    a.download = "Ideovent_Certificate_preview.png";
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  }}
                >
                  View Sample
                </button>
              </div>

              <p style={{ marginTop: 12 }} className="muted">
                This is a preview of the verified completion certificate you will receive on
                successful completion of the internship.
              </p>
            </div>

            <div className="card" id="register-form" ref={formRef}>
              <h3 style={{ marginTop: 0 }}>Register — Student Details</h3>
              <form onSubmit={onSubmit} aria-label="Internship registration form">
                <label htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  value={form.fullName}
                  onChange={handleChange("fullName")}
                  type="text"
                  placeholder="Your full name"
                  aria-required
                />
                {errors.fullName && <div className="error">{errors.fullName}</div>}

                <div className="form-row" style={{ marginTop: 6 }}>
                  <div className="col">
                    <label htmlFor="email">Email</label>
                    <input
                      id="email"
                      value={form.email}
                      onChange={handleChange("email")}
                      type="email"
                      placeholder="name@email.com"
                    />
                    {errors.email && <div className="error">{errors.email}</div>}
                  </div>

                  <div className="col">
                    <label htmlFor="phone">Phone</label>
                    <input
                      id="phone"
                      value={form.phone}
                      onChange={handleChange("phone")}
                      type="tel"
                      placeholder="10-digit mobile"
                    />
                    {errors.phone && <div className="error">{errors.phone}</div>}
                  </div>
                </div>

                <label htmlFor="college">College / Institute</label>
                <input
                  id="college"
                  value={form.college}
                  onChange={handleChange("college")}
                  type="text"
                  placeholder="College name"
                />
                {errors.college && <div className="error">{errors.college}</div>}

                <label htmlFor="stream">Stream / Branch</label>
                <input
                  id="stream"
                  value={form.stream}
                  onChange={handleChange("stream")}
                  type="text"
                  placeholder="E.g. B.Tech - CSE"
                />

                <label htmlFor="message">Anything to tell us? (optional)</label>
                <textarea
                  id="message"
                  value={form.message}
                  onChange={handleChange("message")}
                  rows={3}
                  placeholder="E.g. available hours, previous projects..."
                />

                <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                  <button type="submit" className="btn btn-primary" aria-label="Submit details">
                    Save Details & Continue
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setForm({ fullName: "", email: "", phone: "", college: "", stream: "", message: "" });
                      setErrors({});
                      setSubmitted(false);
                      setShowPaymentPrompt(false);
                    }}
                  >
                    Reset
                  </button>
                </div>

                {submitted && (
                  <div style={{ marginTop: 12 }} className="payment-prompt" role="status">
                    <strong>Next step — Payment</strong>
                    <p className="muted" style={{ margin: "6px 0 0" }}>
                      We have saved your details. To confirm your seat, complete the payment.
                      Click <strong>"Pay & Register"</strong> below — the payment page will open in a new tab.
                    </p>

                    <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                      <button
                        onClick={onPayClick}
                        className="btn btn-primary"
                        disabled={loading}
                        aria-label="Pay via Razorpay"
                      >
                        {loading ? "Opening..." : "💳 Pay & Register"}
                      </button>

                      <a
                        href="https://rzp.io/rzp/ideovent.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline"
                        aria-label="Open payment link"
                        style={{ alignSelf: "center" }}
                      >
                        Open Payment Link
                      </a>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <p className="muted" style={{ marginBottom: 6 }}>
                        After payment, please send your payment screenshot on WhatsApp to:
                      </p>
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="whatsapp"
                        aria-label="Send payment screenshot on WhatsApp"
                      >
                        Message on WhatsApp
                      </a>
                      <p className="muted" style={{ marginTop: 8 }}>
                        We will verify your payment within 48 hours and confirm your seat with access instructions.
                      </p>
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0 }}>What you will get — Internship Benefits</h3>
              <div className="benefits-list">
                <div className="benefit">
                  <h4>Live Client Projects</h4>
                  <p>Work on real projects and add production code to your portfolio.</p>
                </div>
                <div className="benefit">
                  <h4>Mentorship by Founders</h4>
                  <p>Direct guidance from Ideovent founders & senior devs.</p>
                </div>
                <div className="benefit">
                  <h4>Certificate & Recommendation</h4>
                  <p>Verified certificate & LinkedIn recommendation for top performers.</p>
                </div>
                <div className="benefit">
                  <h4>Job-Ready Skills</h4>
                  <p>Hands-on React, Node, Git, deployment & team workflow.</p>
                </div>
                <div className="benefit">
                  <h4>Portfolio Projects</h4>
                  <p>2–3 portfolio-ready projects to show to recruiters.</p>
                </div>
                <div className="benefit">
                  <h4>Placement Assistance</h4>
                  <p>Interview guidance + top performers may get job offers.</p>
                </div>
              </div>
            </div>

            <div className="card terms">
              <h3 style={{ marginTop: 0 }}>Terms & Conditions (Important)</h3>
              <ul>
                <li><strong>Commitment fee:</strong> Fee confirms your seat. Replace with your chosen amount.</li>
                <li><strong>Refund policy:</strong> You must read our specific refund rule. (We recommend partial refund or conditional refund policy to reduce disputes.)</li>
                <li><strong>Certificate:</strong> Issued only after submission & verification of required tasks.</li>
                <li><strong>Attendance & deadlines:</strong> You must complete tasks on time — company reserves the right to revoke certificate for malpractice.</li>
                <li><strong>Verification:</strong> Payment verification via screenshot on WhatsApp is mandatory to unlock project access.</li>
                <li><strong>Data privacy:</strong> We will store your name, email & phone for program administration only.</li>
              </ul>
            </div>
          </div>

          {/* RIGHT: sidebar */}
          <aside className="sidebar">
            <div className="card price-card">
              <div className="small">Commitment Fee</div>
              <div className="price-amount">₹ 799</div>
              <div className="small">One-time, confirms your seat</div>
              <div style={{ marginTop: 12 }}>
                <button onClick={onPayClick} className="btn btn-primary" aria-label="Pay now">
                  Pay & Register
                </button>
              </div>

              <div style={{ marginTop: 12 }} className="muted">
                Tip: If you have any trouble with payment, message us on WhatsApp after taking screenshot of the failed attempt.
              </div>
            </div>

            <div className="card contact-card">
              <div style={{ fontWeight:800, marginBottom:6 }}>Need help?</div>
              <div className="muted">Contact our support on WhatsApp</div>
              <div style={{ marginTop: 10 }}>
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whatsapp"
                >
                  Chat on WhatsApp
                </a>
              </div>
            </div>

            <div className="card">
              <div style={{ fontWeight:700 }}>Quick checklist</div>
              <ul style={{ marginTop: 8, color: "var(--muted)" }}>
                <li>Fill details & click Save Details</li>
                <li>Click Pay & Register</li>
                <li>Send payment screenshot on WhatsApp</li>
                <li>Wait for verification (≤ 48 hours)</li>
              </ul>
            </div>
          </aside>
        </div>

      
      </div>
     
    </div>
       <Footer/>
       </>
  );
}
