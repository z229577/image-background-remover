import Link from 'next/link';
import AuthButton from '../components/auth-button';

const plans = [
  {
    name: 'Free',
    description: 'For quick tests and occasional edits.',
    price: '$0',
    period: '/mo',
    allowance: '3 successful removals/month',
    cta: 'Start free',
    href: '/',
    features: ['Transparent PNG downloads', 'JPG, PNG, and WebP uploads', '10 MB file size limit', 'No credit card required'],
  },
  {
    name: 'Plus',
    description: 'For creators and small shops that need clean cutouts weekly.',
    price: '$9',
    period: '/mo',
    allowance: '30 successful removals/month',
    cta: 'Choose Plus',
    href: '/api/checkout?plan=plus',
    featured: true,
    features: ['Everything in Free', 'No watermark on exports', 'Transparent PNG downloads', 'Best value for light product photo work'],
  },
  {
    name: 'Pro',
    description: 'For ecommerce teams and frequent image cleanup.',
    price: '$29',
    period: '/mo',
    allowance: '150 successful removals/month',
    cta: 'Choose Pro',
    href: '/api/checkout?plan=pro',
    features: ['Everything in Plus', 'Higher monthly processing allowance', 'Priority support', 'Built for repeated catalog edits'],
  },
];

export const metadata = {
  title: 'Pricing | Image Background Remover',
  description: 'Simple monthly plans for fast, clean image background removal.',
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-xl font-black tracking-tight">cutout<span className="text-indigo-600">.ai</span></Link>
        <div className="flex items-center gap-5">
          <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">Remove background</Link>
          <AuthButton />
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-12">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-5xl font-black tracking-tight sm:text-7xl">Pick the plan that fits your workflow.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">Start free, then upgrade when you need more clean cutouts for product photos, portraits, logos, and social posts.</p>
        </div>

        <div className="mx-auto mt-12 grid max-w-6xl gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.name} className={`relative flex flex-col rounded-3xl border bg-white p-8 shadow-sm ${plan.featured ? 'border-amber-400 shadow-xl shadow-amber-100/60' : 'border-slate-200'}`}>
              {plan.featured && <span className="absolute right-7 top-7 rounded-full bg-amber-400 px-4 py-2 text-sm font-black text-slate-950">Most popular</span>}
              <h2 className="text-4xl font-black">{plan.name}</h2>
              <p className="mt-5 min-h-14 text-lg leading-8 text-slate-600">{plan.description}</p>
              <p className="mt-8 text-lg font-bold text-teal-500">{plan.allowance}</p>
              <div className="mt-3 flex items-baseline gap-2"><span className="text-6xl font-black tracking-tight">{plan.price}</span><span className="text-lg text-slate-500">{plan.period}</span></div>
              <Link href={plan.href} className={`mt-8 rounded-xl px-5 py-4 text-center font-black transition ${plan.featured ? 'bg-teal-500 text-white hover:bg-teal-600' : 'border border-slate-300 text-slate-950 hover:border-indigo-400 hover:text-indigo-700'}`}>{plan.cta} <span aria-hidden="true">→</span></Link>
              <div className="my-8 border-t border-slate-200" />
              <ul className="space-y-5 text-[15px] leading-6 text-slate-700">
                {plan.features.map((feature) => <li key={feature} className="flex gap-3"><span className="font-black text-teal-500">✓</span><span>{feature}</span></li>)}
              </ul>
            </article>
          ))}
        </div>

        <p id="contact" className="mx-auto mt-10 max-w-3xl text-center text-sm leading-6 text-slate-500">Plans are billed monthly. Your allowance counts successful background removals only. Sign in with Google to subscribe securely.</p>
      </section>
    </main>
  );
}
