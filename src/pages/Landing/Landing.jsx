import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, GraduationCap, BookOpen, Users, Trophy, CheckCircle2, Send, Sparkles, ArrowRight, Clock, CalendarDays, Wallet, BarChart3, Bot, Zap, MonitorSmartphone, Smartphone, Tablet, Monitor, UserPlus, Settings2, LineChart } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { useToast } from '../../components/common/Toast';
import { submitSaaSContact } from '../../services/publicEnquiryService';
import { PLANS } from '../../data/plans';

export default function Landing() {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', phone: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  // NOTE: the public SaaS page intentionally loads NO tenant institute.
  // Branding is always EduPilot AI, and the contact form below posts to the
  // neutral /institutes/contact endpoint (no tenant association). Tenant
  // admission enquiries live inside each institute's authenticated portal.

  const handleSubmitInquiry = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      toast('Please enter your name and phone number.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitSaaSContact({
        name: form.name.trim(),
        phone: form.phone.trim(),
        message: form.message,
      });
      toast(res?.message || 'Thank you! The EduPilot team will contact you shortly.');
      setForm({ name: '', phone: '', message: '' });
    } catch (err) {
      toast(err.message || 'Unable to submit your request.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/25">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              {/* SaaS brand — never replaced by a tenant institute name. */}
              <span className="text-xl font-bold tracking-tight text-white">EduPilot AI</span>
              <span className="ml-2 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400 border border-blue-500/20">
                SaaS Platform
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a href="#features" className="hidden text-sm font-medium text-slate-300 hover:text-white md:block">
              Features
            </a>
            <a href="#pricing" className="hidden text-sm font-medium text-slate-300 hover:text-white md:block">
              Pricing
            </a>
            <a href="#mobile" className="hidden text-sm font-medium text-slate-300 hover:text-white md:block">
              Mobile
            </a>
            <Link
              to="/login"
              className="hidden text-sm font-medium text-slate-300 hover:text-white md:block"
            >
              Login
            </Link>
            <Link
              to="/register-admin"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-500 active:scale-95"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-20 lg:py-32">
        <div className="absolute top-1/4 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-600/15 blur-3xl" />
        <div className="mx-auto max-w-5xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-400">
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span>Empowering Academic Excellence with Smart AI Tools</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl leading-tight">
            EduPilot AI — <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">Next-Generation Coaching Management</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-400 leading-relaxed">
            Empowering Coaching Institutes with Intelligent Management. Student and teacher management, attendance, fees, tests, timetable, study material, analytics, AI Copilot and automation — one SaaS platform for your entire institute.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link
              to="/register-admin"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-base font-semibold text-white shadow-xl shadow-blue-500/25 transition hover:bg-blue-500 hover:scale-105 active:scale-95"
            >
              Start 7-Day Free Trial
            </Link>
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-7 py-3.5 text-base font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-white"
            >
              View Plans
            </a>
          </div>
          <p className="text-xs text-slate-500">No payment required · 7-day free trial on every plan · Pricing configurable</p>
        </div>
      </section>

      {/* Key Stats Bar */}
      <section className="border-y border-slate-800 bg-slate-900/50 px-6 py-10">
        <div className="mx-auto max-w-6xl grid grid-cols-2 gap-6 md:grid-cols-4 text-center">
          <div>
            <p className="text-3xl font-extrabold text-white">500+</p>
            <p className="mt-1 text-sm text-slate-400">Students Enrolled</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-blue-400">98%</p>
            <p className="mt-1 text-sm text-slate-400">Success Rate</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-emerald-400">24/7</p>
            <p className="mt-1 text-sm text-slate-400">AI Doubts Support</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-amber-400">100%</p>
            <p className="mt-1 text-sm text-slate-400">Parent Transparency</p>
          </div>
        </div>
      </section>

      {/* Courses Offered */}
      <section id="courses" className="px-6 py-20">
        <div className="mx-auto max-w-6xl space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold text-white">Courses & Batches Offered</h2>
            <p className="text-slate-400">Tailored programs designed for competitive foundation & board examinations.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { title: 'Class 8th - 10th Foundation', desc: 'Comprehensive Science, Math & English preparation building strong core concepts.', icon: BookOpen, tag: 'Secondary' },
              { title: 'Class 11th - 12th Science', desc: 'In-depth Physics, Chemistry, Mathematics & Biology coaching for Board & JEE/NEET exams.', icon: Trophy, tag: 'Higher Secondary' },
              { title: 'Competitive Crash Courses', desc: 'Intensive problem-solving, mock tests, and rank booster series.', icon: Award, tag: 'Specialized' },
            ].map((course, idx) => (
              <Card key={idx} className="group transition hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 mb-4 group-hover:bg-blue-600 group-hover:text-white transition">
                  <course.icon className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">{course.tag}</span>
                <h3 className="mt-3 text-xl font-semibold text-white">{course.title}</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">{course.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Core SaaS Features */}
      <section id="features" className="bg-slate-900/30 px-6 py-20 border-t border-slate-800">
        <div className="mx-auto max-w-6xl space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold text-white">Everything Your Institute Needs</h2>
            <p className="text-slate-400">One SaaS platform — student success plus complete institute operations.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { icon: Users, title: 'Student Management', desc: 'Admissions, profiles, batches and lifecycle tracking.' },
              { icon: GraduationCap, title: 'Teacher Management', desc: 'Faculty profiles, assignments and payroll.' },
              { icon: CheckCircle2, title: 'Attendance', desc: 'Daily tracking with parent alerts and reports.' },
              { icon: Wallet, title: 'Fees & Finance', desc: 'Fee collection, receipts, expenses and payroll.' },
              { icon: Trophy, title: 'Tests & Results', desc: 'Scheduling, evaluation and performance analytics.' },
              { icon: CalendarDays, title: 'Timetable', desc: 'Conflict-aware scheduling across batches and rooms.' },
              { icon: BookOpen, title: 'Study Material', desc: 'Homework, notes and resources for every batch.' },
              { icon: BarChart3, title: 'Analytics & Reports', desc: 'Institute, batch and student-level insights.' },
              { icon: Bot, title: 'AI Copilot', desc: 'Instant doubt solving and staff productivity assistant.' },
              { icon: Zap, title: 'Automation', desc: 'Parent updates, reminders and workflow automation.' },
            ].map((feat, idx) => (
              <Card key={idx}>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 mb-3">
                  <feat.icon className="h-5 w-5" />
                </div>
                <h4 className="font-semibold text-white">{feat.title}</h4>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">{feat.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-6 py-20 border-t border-slate-800">
        <div className="mx-auto max-w-6xl space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold text-white">From Signup to Smart Institute in 5 Steps</h2>
            <p className="text-slate-400">Start your 7-day free trial and be operational the same day.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { icon: Send, step: '1', title: 'Register', desc: 'Choose a plan and start your 7-day free trial.' },
              { icon: Settings2, step: '2', title: 'Configure Institute', desc: 'Add branches, courses, batches and fee structures.' },
              { icon: UserPlus, step: '3', title: 'Add Users', desc: 'Invite admins, teachers and enrol students.' },
              { icon: Clock, step: '4', title: 'Manage Institute', desc: 'Run attendance, timetable, tests, fees and communication.' },
              { icon: LineChart, step: '5', title: 'Analyze Performance', desc: 'Track outcomes with analytics, reports and AI Copilot.' },
            ].map((s, idx) => (
              <Card key={idx} className="relative">
                <span className="absolute right-4 top-4 text-4xl font-extrabold text-slate-800">{s.step}</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 mb-3">
                  <s.icon className="h-5 w-5" />
                </div>
                <h4 className="font-semibold text-white">{s.title}</h4>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile / Responsive Preview (marketing mockups only — non-interactive) */}
      <section id="mobile" className="bg-slate-900/30 px-6 py-20 border-t border-slate-800">
        <div className="mx-auto max-w-6xl space-y-12">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-400">
              <MonitorSmartphone className="h-4 w-4" />
              <span>Works everywhere</span>
            </div>
            <h2 className="text-3xl font-bold text-white">Desktop, Tablet & Mobile Ready</h2>
            <p className="text-slate-400">EduPilot is fully responsive — the same portals adapt from large admin screens to phones. Preview below (illustrative mockups).</p>
          </div>
          <div className="grid items-end gap-8 md:grid-cols-3">
            {/* Desktop mockup: admin dashboard */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-2xl">
              <div className="mb-3 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
                <span className="ml-2 flex items-center gap-1 text-[10px] text-slate-500"><Monitor className="h-3 w-3" /> Admin dashboard · Desktop</span>
              </div>
              <div className="space-y-2" aria-hidden="true">
                <div className="h-6 w-2/3 rounded bg-slate-800" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-14 rounded-lg bg-blue-600/20 border border-blue-500/20" />
                  <div className="h-14 rounded-lg bg-emerald-500/10 border border-emerald-500/20" />
                  <div className="h-14 rounded-lg bg-amber-500/10 border border-amber-500/20" />
                </div>
                <div className="h-20 rounded-lg bg-slate-900 border border-slate-800" />
                <div className="h-8 rounded-lg bg-slate-900 border border-slate-800" />
              </div>
            </div>
            {/* Tablet mockup: timetable */}
            <div className="mx-auto w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-2xl">
              <div className="mb-3 flex items-center gap-1 text-[10px] text-slate-500"><Tablet className="h-3 w-3" /> Timetable · Tablet</div>
              <div className="space-y-2" aria-hidden="true">
                <div className="h-6 w-1/2 rounded bg-slate-800" />
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-slate-900 border border-slate-800 p-2">
                    <div className="h-3 w-1/3 rounded bg-slate-700" />
                    <div className="h-3 w-1/4 rounded bg-indigo-500/30" />
                  </div>
                ))}
              </div>
            </div>
            {/* Mobile mockup: login + student card */}
            <div className="mx-auto w-52 rounded-[2rem] border border-slate-700 bg-slate-950 p-3 shadow-2xl">
              <div className="mb-2 flex items-center justify-center gap-1 text-[10px] text-slate-500"><Smartphone className="h-3 w-3" /> Login · Mobile</div>
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3 space-y-2" aria-hidden="true">
                <div className="mx-auto h-8 w-8 rounded-xl bg-blue-600" />
                <div className="h-3 w-3/4 mx-auto rounded bg-slate-700" />
                <div className="h-7 rounded-lg bg-slate-800" />
                <div className="h-7 rounded-lg bg-slate-800" />
                <div className="h-7 rounded-lg bg-blue-600/70" />
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2">
                  <div className="h-2.5 w-2/3 rounded bg-emerald-500/30" />
                </div>
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-slate-500">Verified responsive breakpoints: 375px · 390px · 768px · desktop. The live app adapts at each size.</p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-20 border-t border-slate-800">
        <div className="mx-auto max-w-6xl space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold text-white">Simple Plans That Scale With You</h2>
            <p className="text-slate-400">Differentiated by user limits + features. Every plan starts with a 7-day free trial. Pricing configurable.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {PLANS.map((plan) => (
              <Card key={plan.key} className={plan.featured ? 'border-blue-500/60 shadow-xl shadow-blue-500/10' : ''}>
                {plan.featured && (
                  <span className="mb-3 inline-block rounded-full bg-blue-600 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">Most popular</span>
                )}
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <p className="mt-1 text-xs text-slate-400">{plan.tagline}</p>
                <p className="mt-3 text-sm font-semibold text-blue-400">{plan.userLimit}</p>
                <p className="mt-1 text-2xl font-extrabold text-white">{plan.price}</p>
                <p className="text-[11px] text-slate-500">{plan.priceNote}</p>
                <p className="mt-2 inline-block rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">{plan.trial}</p>
                <ul className="mt-4 space-y-2 text-xs text-slate-300">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to={plan.key === 'enterprise' ? '#inquiry' : `/register-admin?plan=${plan.key}`}
                  className={`mt-6 block rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition active:scale-95 ${plan.featured ? 'bg-blue-600 text-white hover:bg-blue-500' : 'border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'}`}
                >
                  {plan.cta}
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Demo */}
      <section id="demo" className="bg-slate-900/30 px-6 py-20 border-t border-slate-800">
        <div className="mx-auto max-w-3xl text-center space-y-6">
          <h2 className="text-3xl font-bold text-white">Explore the Live Demo</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            A fully provisioned demo institute with sample students, teachers, courses, batches, attendance, tests, fees, timetable and study material — created securely from the backend. No signup needed to look around.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-base font-semibold text-white shadow-xl shadow-blue-500/25 transition hover:bg-blue-500 hover:scale-105 active:scale-95"
            >
              Explore Demo <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="text-[11px] text-slate-600">Demo credentials are provisioned by the backend administrator and never published in source code.</p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-20 border-t border-slate-800">
        <div className="mx-auto max-w-3xl text-center space-y-6">
          <h2 className="text-3xl font-bold text-white">Start Your 7-Day Free Trial</h2>
          <p className="text-slate-400 text-sm">Create your institute and its first admin account in one step. No payment required.</p>
          <Link
            to="/register-admin"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-blue-500/25 transition hover:bg-blue-500 hover:scale-105 active:scale-95"
          >
            Create My Institute <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Inquiry Form */}
      <section id="inquiry" className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <Card className="p-8 border-slate-800">
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-2xl font-bold text-white">Contact EduPilot — Demo & Sales Enquiry</h2>
              <p className="text-sm text-slate-400">Talk to the EduPilot SaaS team about plans, pricing, migration or a guided demo. Institute admission enquiries are handled inside each institute&apos;s own portal, never from this page.</p>
            </div>
            <form onSubmit={handleSubmitInquiry} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Your Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Enter full name"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Enter 10-digit mobile number"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Message — plan, pricing or demo request</label>
                <textarea
                  rows={3}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="e.g. We run a 300-student institute across 2 branches. Need Growth vs Professional guidance + a demo…"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full py-3">
                {submitting ? 'Submitting...' : 'Request Demo / Contact Sales'}
              </Button>
            </form>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 px-6 py-12 text-slate-400 text-sm">
        <div className="mx-auto max-w-6xl grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="h-6 w-6 text-blue-400" />
              <span className="text-lg font-bold text-white">EduPilot AI</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">
              The SaaS platform for coaching institutes — student management, operations, analytics, AI Copilot and automation in one place.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3">Product</h4>
            <div className="flex flex-col gap-2 text-xs">
              <a href="#how-it-works" className="hover:text-blue-400">How It Works</a>
              <a href="#mobile" className="hover:text-blue-400">Mobile & Responsive</a>
              <a href="#inquiry" className="hover:text-blue-400">Contact Sales</a>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3">Quick Links</h4>
            <div className="flex flex-col gap-2 text-xs">
              <a href="#features" className="hover:text-blue-400">Features</a>
              <a href="#pricing" className="hover:text-blue-400">Pricing</a>
              <a href="#demo" className="hover:text-blue-400">Explore Demo</a>
              <Link to="/register-admin" className="hover:text-blue-400">Start Free Trial</Link>
              <Link to="/login" className="hover:text-blue-400">Login</Link>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-6xl mt-8 pt-8 border-t border-slate-900 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} EduPilot AI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
