/**
 * plans.js — EduPilot SaaS subscription plans (single source of truth).
 *
 * UI/product-architecture only: no payment integration. Prices are
 * configurable (final pricing TBD) — plans differentiate on USER LIMIT +
 * FEATURES. The `key` values are the canonical plan identifiers sent to the
 * backend during institute registration (see RegisterAdmin + /auth/register).
 */

export const TRIAL_DAYS = 7;
export const TRIAL_LABEL = '7-day free trial';

export const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    tagline: 'Small / early-stage coaching institutes',
    userLimit: 'Up to 100 users',
    price: 'Configurable',
    priceNote: 'Pricing TBD — contact sales',
    trial: TRIAL_LABEL,
    cta: 'Start 7-Day Free Trial',
    featured: false,
    features: [
      'Core student management',
      'Teacher management',
      'Attendance tracking',
      'Basic batches / courses',
      'Basic fee management',
      'Basic dashboard',
    ],
  },
  {
    key: 'growth',
    name: 'Growth',
    tagline: 'Growing coaching institutes',
    userLimit: 'Up to 500 users',
    price: 'Configurable',
    priceNote: 'Pricing TBD — contact sales',
    trial: TRIAL_LABEL,
    cta: 'Start 7-Day Free Trial',
    featured: true,
    features: [
      'Everything in Starter',
      'Advanced attendance',
      'Tests & results',
      'Homework & study material',
      'Timetable',
      'Communication (announcements)',
      'Reports',
    ],
  },
  {
    key: 'professional',
    name: 'Professional',
    tagline: 'Medium / large institutes',
    userLimit: 'Up to 2,000 users',
    price: 'Configurable',
    priceNote: 'Pricing TBD — contact sales',
    trial: TRIAL_LABEL,
    cta: 'Start 7-Day Free Trial',
    featured: false,
    features: [
      'Everything in Growth',
      'Advanced analytics',
      'Finance & payroll',
      'Advanced reports',
      'AI Copilot',
      'Automation',
      'Multi-branch capabilities',
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    tagline: 'Large coaching organisations / multiple branches',
    userLimit: 'Custom / high user limits',
    price: 'Custom',
    priceNote: 'Contact sales',
    trial: '7-day free trial / contact sales',
    cta: 'Contact Sales',
    featured: false,
    features: [
      'Everything in Professional',
      'Multi-branch / multi-institute management',
      'Advanced RBAC',
      'Advanced analytics',
      'AI / automation features',
      'Priority support',
      'Custom requirements',
    ],
  },
];

export function getPlanByKey(key) {
  if (!key) return null;
  const normalized = String(key).toLowerCase();
  return PLANS.find((p) => p.key === normalized) || null;
}

export function isValidPlanKey(key) {
  return getPlanByKey(key) !== null;
}
