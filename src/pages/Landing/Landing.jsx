import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, BookOpen, Users, Trophy, CheckCircle2, Phone, Mail, MapPin, Send, Sparkles, ArrowRight, ShieldCheck, Clock, Award } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { useToast } from '../../components/common/Toast';
import { supabase } from '../../lib/supabase';

export default function Landing() {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', phone: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitInquiry = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      toast('Please enter your name and phone number.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (!supabase) throw new Error('Inquiry service is unavailable.');
      const { data: institutes, error: instituteError } = await supabase.from('institutes').select('id').limit(2);
      if (instituteError) throw instituteError;
      if (!institutes || institutes.length !== 1) throw new Error('A public institute destination is not configured.');

      const { error } = await supabase.from('enquiries').insert({
        institute_id: institutes[0].id,
        student_name: form.name.trim(),
        phone: form.phone.trim(),
        counselling_notes: form.message.trim() || null,
        source: 'Website',
        status: 'new',
      });
      if (error) throw error;
      toast('Thank you! Your inquiry has been submitted successfully.');
      setForm({ name: '', phone: '', message: '' });
    } catch (err) {
      toast(err.message || 'Unable to submit your inquiry.', 'error');
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
              <span className="text-xl font-bold tracking-tight text-white">EduPilot AI</span>
              <span className="ml-2 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400 border border-blue-500/20">
                Academy
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a href="#courses" className="hidden text-sm font-medium text-slate-300 hover:text-white md:block">
              Courses
            </a>
            <a href="#features" className="hidden text-sm font-medium text-slate-300 hover:text-white md:block">
              Facilities
            </a>
            <a href="#inquiry" className="hidden text-sm font-medium text-slate-300 hover:text-white md:block">
              Admissions
            </a>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-500 active:scale-95"
            >
              <span>Login</span>
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
            Next-Generation Coaching & <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">Interactive Learning</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-400 leading-relaxed">
            Welcome to EduPilot AI Institute. Providing top-tier coaching, personalized AI academic doubt solving, automated parent updates, and comprehensive test analytics.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <a
              href="#inquiry"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-base font-semibold text-white shadow-xl shadow-blue-500/25 transition hover:bg-blue-500 hover:scale-105 active:scale-95"
            >
              Enquire for Admission
            </a>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-7 py-3.5 text-base font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-white"
            >
              Student / Admin Portal
            </Link>
          </div>
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

      {/* Facilities & Features */}
      <section id="features" className="bg-slate-900/30 px-6 py-20 border-t border-slate-800">
        <div className="mx-auto max-w-6xl space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold text-white">Why Choose Our Institute?</h2>
            <p className="text-slate-400">Combining experienced teaching staff with modern digital tools.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ShieldCheck, title: 'Expert Faculty', desc: 'Highly experienced educators dedicated to student growth.' },
              { icon: Sparkles, title: 'AI Doubt Assistant', desc: 'Instant step-by-step doubt resolution anytime.' },
              { icon: Clock, title: 'Regular Testing', desc: 'Weekly tests with analytics and progress performance reports.' },
              { icon: CheckCircle2, title: 'Parent WhatsApp Alerts', desc: 'Direct updates for attendance, fee receipts, and test marks.' },
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

      {/* Inquiry Form */}
      <section id="inquiry" className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <Card className="p-8 border-slate-800">
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-2xl font-bold text-white">Admission & Inquiry Form</h2>
              <p className="text-sm text-slate-400">Leave your details below and our team will get in touch with you shortly.</p>
            </div>
            <form onSubmit={handleSubmitInquiry} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Student / Parent Name *</label>
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
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Message / Course Inquiry</label>
                <textarea
                  rows={3}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Specify class standard or course details you are looking for..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full py-3">
                {submitting ? 'Submitting...' : 'Submit Inquiry'}
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
              <span className="text-lg font-bold text-white">EduPilot AI Academy</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">
              Leading coaching institute providing high quality education, digital learning resources, and complete student performance tracking.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3">Contact Information</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-blue-400" /> +91 98765 43210</li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-blue-400" /> contact@edupilot.ai</li>
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-blue-400" /> Main Education Hub, City Center</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3">Quick Links</h4>
            <div className="flex flex-col gap-2 text-xs">
              <Link to="/login" className="hover:text-blue-400">Student Login</Link>
              <Link to="/login" className="hover:text-blue-400">Admin Dashboard</Link>
              <a href="#inquiry" className="hover:text-blue-400">Admissions Inquiry</a>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-6xl mt-8 pt-8 border-t border-slate-900 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} EduPilot AI Institute. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
