"use client";

import React, { useState } from "react";
import toast from "react-hot-toast";
import {
  Stethoscope,
  HeartPulse,
  CalendarCheck,
  Wallet,
  Bell,
  Search,
  Plus,
  Download,
  Trash2,
  Mail,
  Lock,
  ChevronRight,
} from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Checkbox from "@/components/ui/Checkbox";
import { RadioGroup } from "@/components/ui/Radio";
import Switch from "@/components/ui/Switch";
import Card from "@/components/ui/Card";
import Badge, { BadgeStatus } from "@/components/ui/Badge";
import Alert from "@/components/ui/Alert";
import Modal from "@/components/ui/Modal";
import Dialog from "@/components/ui/Dialog";
import Avatar, { AvatarGroup } from "@/components/ui/Avatar";
import KPICard from "@/components/ui/KPICard";
import EmptyState from "@/components/ui/EmptyState";
import ProgressBar from "@/components/ui/ProgressBar";
import PageHeader from "@/components/ui/PageHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import Tabs from "@/components/ui/Tabs";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Divider from "@/components/ui/Divider";
import StatusDot from "@/components/ui/StatusDot";
import DescriptionList from "@/components/ui/DescriptionList";
import Table, { Column } from "@/components/ui/Table";
import Pagination from "@/components/ui/Pagination";
import Tooltip from "@/components/ui/Tooltip";
import Spinner from "@/components/ui/Spinner";

// ---------------------------------------------------------------------------
// Page chrome — sticky TOC sidebar + section shells
// ---------------------------------------------------------------------------

const NAV = [
  { id: "principles", label: "Design Principles" },
  { id: "color", label: "Color Tokens" },
  { id: "typography", label: "Typography" },
  { id: "buttons", label: "Buttons" },
  { id: "forms", label: "Form Controls" },
  { id: "cards", label: "Cards & Stats" },
  { id: "data", label: "Data Display" },
  { id: "overlays", label: "Overlays & Feedback" },
  { id: "navigation", label: "Navigation & Structure" },
];

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 pt-4">
      <h2 className="text-h1 font-bold text-ink-900 font-grotesk tracking-tight">{title}</h2>
      {description && <p className="text-slate-500 mt-2 max-w-2xl">{description}</p>}
      <div className="mt-8 flex flex-col gap-10">{children}</div>
    </section>
  );
}

function Sub({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-label text-slate-400 uppercase tracking-wider mb-4">{label}</p>
      {children}
    </div>
  );
}

function Preview({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50/60 p-6 flex flex-wrap items-center gap-4 ${className}`}
    >
      {children}
    </div>
  );
}

function Swatch({ name, hex }: { name: string; hex: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-11 h-11 rounded-lg border border-slate-200 shrink-0"
        style={{ backgroundColor: hex }}
      />
      <div>
        <p className="text-sm font-semibold text-ink-900">{name}</p>
        <p className="text-xs text-slate-400 tabular-nums uppercase">{hex}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface Patient {
  id: string;
  name: string;
  condition: string;
  lastVisit: string;
  status: "Stable" | "Monitor" | "Urgent";
}

const PATIENTS: Patient[] = [
  { id: "1", name: "Thandiwe Mokoena", condition: "Hypertension", lastVisit: "28 Jul 2026", status: "Stable" },
  { id: "2", name: "John Dlamini", condition: "Type 2 Diabetes", lastVisit: "22 Jul 2026", status: "Monitor" },
  { id: "3", name: "Precious Zwane", condition: "Asthma", lastVisit: "14 Jul 2026", status: "Stable" },
  { id: "4", name: "Bheki Simelane", condition: "Post-op review", lastVisit: "9 Jul 2026", status: "Urgent" },
];

const statusForCondition: Record<Patient["status"], BadgeStatus> = {
  Stable: "success",
  Monitor: "warning",
  Urgent: "error",
};

export default function DesignSystemPage() {
  const [tab, setTab] = useState("overview");
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [agree, setAgree] = useState(false);
  const [visitType, setVisitType] = useState("virtual");
  const [modalOpen, setModalOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(1);

  const columns: Column<Patient>[] = [
    { key: "name", header: "Patient", isTitle: true, sortable: true },
    { key: "condition", header: "Condition" },
    { key: "lastVisit", header: "Last visit", sortable: true },
    {
      key: "status",
      header: "Status",
      align: "right",
      render: (row) => (
        <Badge label={row.status} status={statusForCondition[row.status]} />
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
              <HeartPulse size={16} />
            </div>
            <span className="font-grotesk font-bold text-ink-900">24/7 DigiHealth</span>
            <span className="text-slate-300">/</span>
            <span className="text-sm text-slate-500">Component Library</span>
          </div>
          <a
            href="/design.md"
            className="text-sm font-semibold text-primary hover:underline hidden sm:inline"
          >
            View design.md
          </a>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 flex gap-12">
        {/* Sidebar TOC */}
        <aside className="hidden lg:block w-56 shrink-0 py-12">
          <nav className="sticky top-24 flex flex-col gap-1">
            {NAV.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="text-sm text-slate-500 hover:text-primary hover:bg-slate-50 rounded-lg px-3 py-1.5 transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 py-12 flex flex-col gap-24 pb-32">
          {/* Intro */}
          <div>
            <Badge label="v1.0 · grounded in design.md" status="premium" className="mb-4" />
            <h1 className="text-display font-bold text-ink-900 font-grotesk tracking-tight">
              Component Library
            </h1>
            <p className="text-slate-500 mt-3 max-w-2xl text-lg">
              Calm, accessible, one system across all six roles. Every primitive below lives in{" "}
              <code className="text-primary font-mono text-sm bg-primary/5 px-1.5 py-0.5 rounded">
                components/ui
              </code>{" "}
              and is already wired into the live app.
            </p>
          </div>

          <Section
            id="principles"
            title="Design Principles"
            description="Healthcare users are often anxious, in pain, or time-pressured. Design for that."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { title: "Calm over flashy", body: "No landing-page flourishes inside clinical screens. Stillness reads as competence." },
                { title: "Clarity over cleverness", body: "A vitals chart or risk score must be readable in under a second." },
                { title: "One system, six roles", body: "Patient, Practitioner and Admin dashboards share the same shell and components." },
                { title: "Accessible by default", body: "WCAG 2.1 AA is the floor, not a retrofit." },
                { title: "Mobile-first", body: "Patients book and check results from their phones far more than desktop." },
              ].map((p) => (
                <Card key={p.title}>
                  <h4 className="font-bold text-ink-900 font-grotesk mb-1.5">{p.title}</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">{p.body}</p>
                </Card>
              ))}
            </div>
          </Section>

          {/* Color */}
          <Section
            id="color"
            title="Color Tokens"
            description="One family per status meaning — success is always emerald, danger is always red-600, never rose. See design.md §2.1."
          >
            <Sub label="Brand">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Swatch name="primary" hex="#4493b8" />
                <Swatch name="primary-600 (hover)" hex="#326E8A" />
                <Swatch name="secondary" hex="#53CBF3" />
                <Swatch name="accent" hex="#FFDE42" />
              </div>
            </Sub>
            <Sub label="Semantic status">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Swatch name="success-500" hex="#10b981" />
                <Swatch name="warning-500" hex="#f59e0b" />
                <Swatch name="danger-500" hex="#dc2626" />
                <Swatch name="info-500" hex="#2563eb" />
              </div>
            </Sub>
            <Sub label="Neutrals">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Swatch name="ink-900 (text)" hex="#0A0A2E" />
                <Swatch name="ink-600" hex="#475569" />
                <Swatch name="surface-soft" hex="#F1F5F9" />
                <Swatch name="border" hex="#E2E8F0" />
              </div>
            </Sub>
          </Section>

          {/* Typography */}
          <Section
            id="typography"
            title="Typography"
            description="Space Grotesk for headings, Outfit for body — pick from this scale instead of freehanding text-2xl vs text-3xl."
          >
            <div className="flex flex-col gap-5">
              <p className="text-display font-bold font-grotesk text-ink-900">Display 700</p>
              <p className="text-h1 font-bold font-grotesk text-ink-900">Heading 1 — Page title</p>
              <p className="text-h2 font-bold font-grotesk text-ink-900">Heading 2 — Section</p>
              <p className="text-h3 font-semibold font-grotesk text-ink-900">Heading 3 — Card title</p>
              <p className="text-h4 font-semibold font-grotesk text-ink-900">Heading 4 — Sub-panel</p>
              <p className="text-body text-ink-600">Body — default paragraph and UI copy, set in Outfit for comfortable reading.</p>
              <p className="text-small text-slate-500">Small — helper text, timestamps, metadata.</p>
              <p className="text-label text-slate-400 uppercase tracking-wide">Label — form labels, table headers</p>
            </div>
          </Section>

          {/* Buttons */}
          <Section id="buttons" title="Buttons" description="Pill-shaped, the brand's established shape. Danger uses red-600, never a pale red-400.">
            <Sub label="Variants">
              <Preview>
                <Button variant="primary">Book appointment</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="accent">Accent</Button>
                <Button variant="white">White</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="dashed">Dashed</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Cancel visit</Button>
                <Button variant="primary" disabled>Disabled</Button>
              </Preview>
            </Sub>
            <Sub label="Sizes">
              <Preview>
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
                <Button size="xl">Extra large</Button>
              </Preview>
            </Sub>
            <Sub label="With icon & loading">
              <Preview>
                <Button icon={<Plus />}>New consultation</Button>
                <Button variant="white" icon={<Download />} iconPosition="left">
                  Download statement
                </Button>
                <Button variant="danger" icon={<Trash2 />} iconPosition="left">
                  Delete record
                </Button>
                <Button loading>Saving</Button>
              </Preview>
            </Sub>
          </Section>

          {/* Forms */}
          <Section
            id="forms"
            title="Form Controls"
            description="Single contract for every field: rounded-lg, visible label, one error style. Hit targets ≥ 44px."
          >
            <Sub label="Text inputs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl">
                <Input label="Full name" placeholder="Thandiwe Mokoena" />
                <Input label="Email" type="email" icon={<Mail size={16} />} placeholder="you@example.com" />
                <Input label="Password" type="password" icon={<Lock size={16} />} placeholder="••••••••" />
                <Input
                  label="Medical aid number"
                  placeholder="e.g. 8842910"
                  error="Medical aid number is required"
                />
              </div>
              <div className="max-w-3xl mt-6">
                <Textarea label="Notes" placeholder="Visible to the attending practitioner only" helperText="Max 500 characters" rows={3} />
              </div>
            </Sub>

            <Sub label="Select & booking fields">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl">
                <Select
                  label="Practitioner"
                  options={[
                    { value: "mitchell", label: "Dr. Oliver Mitchell — GP" },
                    { value: "vanwyk", label: "Dr. van Wyk — Cardiologist" },
                  ]}
                  value="mitchell"
                />
                <Select
                  label="Consultation type"
                  options={[
                    { value: "virtual", label: "Virtual consultation" },
                    { value: "clinic", label: "In-clinic visit" },
                  ]}
                  value="virtual"
                />
              </div>
            </Sub>

            <Sub label="Checkbox, radio & toggle">
              <Card className="max-w-2xl flex flex-col gap-5">
                <Checkbox
                  label="I confirm my details are accurate"
                  description="Required to proceed with booking"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                />
                <Divider />
                <RadioGroup
                  name="visit-type"
                  value={visitType}
                  onChange={setVisitType}
                  direction="row"
                  options={[
                    { value: "virtual", label: "Virtual visit" },
                    { value: "clinic", label: "In-clinic" },
                  ]}
                />
                <Divider />
                <Switch
                  checked={smsEnabled}
                  onChange={setSmsEnabled}
                  label="Enable SMS reminders"
                  description="Appointment reminders sent 24h in advance"
                />
              </Card>
            </Sub>
          </Section>

          {/* Cards & stats */}
          <Section id="cards" title="Cards & Stats" description="Numbers are the hero: tabular figures, generous size, quiet labels.">
            <Sub label="Card variants">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card variant="solid"><p className="font-semibold text-ink-900 mb-1">Solid</p><p className="text-sm text-slate-500">Default dashboard surface.</p></Card>
                <Card variant="outline"><p className="font-semibold text-ink-900 mb-1">Outline</p><p className="text-sm text-slate-500">Nested content inside another card.</p></Card>
                <Card variant="gradient"><p className="font-semibold text-ink-900 mb-1">Gradient</p><p className="text-sm text-slate-500">Hero / empty-state cards only.</p></Card>
              </div>
            </Sub>
            <Sub label="KPI row">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard label="Upcoming appointments" value={8} icon={<CalendarCheck />} trend={12} />
                <KPICard label="Active patients" value={214} icon={<Stethoscope />} trend={4} />
                <KPICard label="Outstanding balance" value="R 1,240" icon={<Wallet />} trend={-6} trendUp={false} color="red" />
                <KPICard label="Avg. risk score" value="Low" icon={<HeartPulse />} color="emerald" />
              </div>
            </Sub>
            <Sub label="Progress">
              <Card className="max-w-md flex flex-col gap-4">
                <ProgressBar progress={68} showLabel />
                <ProgressBar progress={40} color="warning" />
                <ProgressBar progress={92} color="success" />
              </Card>
            </Sub>
          </Section>

          {/* Data display */}
          <Section id="data" title="Data Display" description="The workhorse Table, plus badges, avatars and status indicators used across detail pages.">
            <Sub label="Badges">
              <Preview>
                <Badge label="Confirmed" status="success" />
                <Badge label="Pending" status="warning" />
                <Badge label="Cancelled" status="error" />
                <Badge label="Rescheduled" status="info" />
                <Badge label="Draft" status="neutral" />
                <Badge label="Premium" status="premium" />
                <Badge label="Synced" status="success" dot />
              </Preview>
            </Sub>
            <Sub label="Avatars & status">
              <Preview>
                <Avatar name="Thandiwe Mokoena" status="online" />
                <Avatar name="John Dlamini" status="busy" />
                <Avatar name="Precious Zwane" status="offline" size="lg" />
                <AvatarGroup
                  avatars={[
                    { name: "Thandiwe Mokoena" },
                    { name: "John Dlamini" },
                    { name: "Precious Zwane" },
                    { name: "Bheki Simelane" },
                    { name: "Nomvula Dlamini" },
                  ]}
                  max={4}
                />
                <StatusDot status="online" label="Synced" />
                <StatusDot status="syncing" label="Syncing" />
                <StatusDot status="offline" label="Offline — 3 pending" />
              </Preview>
            </Sub>
            <Sub label="Description list">
              <Card className="max-w-2xl">
                <DescriptionList
                  columns={2}
                  items={[
                    { label: "Blood type", value: "O+" },
                    { label: "Allergies", value: "Penicillin (severe)" },
                    { label: "Chronic conditions", value: "Hypertension, Mild Asthma" },
                    { label: "Subscription", value: "Premium — R250/mo" },
                  ]}
                />
              </Card>
            </Sub>
            <Sub label="Table — sortable, responsive (resize the window)">
              <Table columns={columns} data={PATIENTS} keyField="id" />
              <div className="flex justify-end mt-4">
                <Pagination page={page} totalPages={6} onChange={setPage} />
              </div>
            </Sub>
            <Sub label="Empty state">
              <Card noPadding>
                <EmptyState
                  title="No appointments yet"
                  description="When you book a consultation, it will appear here."
                  actionLabel="Book an appointment"
                  onAction={() => {}}
                />
              </Card>
            </Sub>
          </Section>

          {/* Overlays */}
          <Section id="overlays" title="Overlays & Feedback" description="Modals trap focus, toasts announce via aria-live, alerts carry context to the top of the page.">
            <Sub label="Modal (full-height sheet) & Dialog (centered)">
              <Preview>
                <Button onClick={() => setModalOpen(true)}>Open modal</Button>
                <Button variant="white" onClick={() => setDialogOpen(true)}>
                  Delete field
                </Button>
              </Preview>
            </Sub>
            <Sub label="Toast">
              <Preview>
                <Button variant="white" size="sm" onClick={() => toast.success("Appointment booked")}>
                  Trigger success toast
                </Button>
                <Button variant="white" size="sm" onClick={() => toast.error("Payment failed")}>
                  Trigger error toast
                </Button>
                <Button variant="white" size="sm" onClick={() => toast("Reminder sent")}>
                  Trigger info toast
                </Button>
              </Preview>
            </Sub>
            <Sub label="Alert / banner">
              <div className="flex flex-col gap-3 max-w-3xl">
                <Alert status="info" title="Working offline">
                  6 records will sync automatically when your connection returns.
                </Alert>
                <Alert status="warning" title="Subscription renews in 5 days" action={<Button size="sm">Manage billing</Button>} />
                <Alert status="error" title="Mill statement import failed" onDismiss={() => {}}>
                  Check the file format and retry.
                </Alert>
                <Alert status="success" title="Vitals synced from wearable" />
              </div>
            </Sub>
            <Sub label="Tooltip">
              <Preview>
                <Tooltip content="Sends a reminder 24h before the visit">
                  <Button variant="white" size="sm">
                    Hover for tooltip
                  </Button>
                </Tooltip>
              </Preview>
            </Sub>
          </Section>

          {/* Navigation */}
          <Section id="navigation" title="Navigation & Structure" description="Underline tabs, breadcrumbs and page headers used across detail pages.">
            <Sub label="Tabs">
              <Tabs
                tabs={[
                  { id: "overview", label: "Overview" },
                  { id: "history", label: "History", badge: 12 },
                  { id: "labs", label: "Labs" },
                  { id: "billing", label: "Billing" },
                ]}
                activeId={tab}
                onChange={setTab}
              />
            </Sub>
            <Sub label="Breadcrumbs">
              <Breadcrumbs
                items={[
                  { label: "Patients", href: "#" },
                  { label: "Thandiwe Mokoena", href: "#" },
                  { label: "Health record" },
                ]}
              />
            </Sub>
            <Sub label="Page header">
              <Card>
                <PageHeader
                  title="Clinical Practitioners"
                  subtitle="Find and book with verified specialists."
                  right={<Button icon={<Search size={16} />}>Search</Button>}
                />
              </Card>
            </Sub>
            <Sub label="Section header">
              <Card>
                <SectionHeader
                  icon={<Bell />}
                  badge="Premium"
                  title="Care Team Alerts"
                  subtitle="Notifications routed to your care team"
                  right={
                    <Button variant="ghost" size="sm" icon={<ChevronRight size={14} />}>
                      View all
                    </Button>
                  }
                />
              </Card>
            </Sub>
            <Sub label="Divider">
              <div className="max-w-md flex flex-col gap-6">
                <Divider />
                <Divider label="or continue with" />
              </div>
            </Sub>
            <Sub label="Spinner">
              <Preview>
                <Spinner size={16} className="text-primary" />
                <Spinner size={24} className="text-primary" />
                <Spinner size={32} className="text-slate-400" />
              </Preview>
            </Sub>
          </Section>
        </main>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Appointment details">
        <p className="text-sm text-slate-600 leading-relaxed">
          This is the full-height sheet pattern (<code className="text-primary">components/ui/Modal.tsx</code>) —
          used for content-heavy flows like booking, chat, and profile detail across 30+ screens.
        </p>
      </Modal>

      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Delete this record?"
        description="This action cannot be undone."
        onConfirm={() => setDialogOpen(false)}
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
