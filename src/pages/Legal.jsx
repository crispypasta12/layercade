import { motion } from 'framer-motion';
import { CONTACT_EMAIL, ADDRESS_LINES, WHATSAPP_NUMBER } from '../lib/contact';

const LAST_UPDATED = 'October 2026';

const CONTACT = `${CONTACT_EMAIL}, WhatsApp +${WHATSAPP_NUMBER}, or ${ADDRESS_LINES.join(', ')}`;

const PAGES = {
  privacy: {
    title: 'PRIVACY POLICY',
    tldr: 'We collect what we need to deliver your order. We do not sell your data. We barely know how to use it.',
    sections: [
      {
        heading: 'What we collect',
        body: [
          'When you place an order: your name, email address, phone number, delivery address, area, district and any order notes you write.',
          'When you leave a review: your name, rating, review text and any photos you upload.',
          'When you browse: anonymous usage and performance data through Vercel Analytics and Speed Insights. This does not identify you personally.',
        ],
      },
      {
        heading: 'How we use it',
        body: [
          'To process, confirm and deliver your order, including calling you to confirm before shipping.',
          'To send you an order confirmation email.',
          'To show your review on the product page.',
          'To understand how the site is used so we can improve it.',
        ],
      },
      {
        heading: 'Who we share it with',
        body: [
          'Delivery partners, only the details needed to get your order to you.',
          'Service providers that run the site: Supabase (database), Vercel (hosting and analytics) and Cloudinary (review photos).',
          'We do not sell or rent your personal information to anyone.',
        ],
      },
      {
        heading: 'Your choices',
        body: [
          `You can ask us to see, correct or delete the personal information we hold about you. Contact us at ${CONTACT}.`,
        ],
      },
    ],
  },
  terms: {
    title: 'TERMS OF SERVICE',
    tldr: 'Order things, pay when they arrive, be nice to the rider. The longer version is below.',
    sections: [
      {
        heading: 'Orders',
        body: [
          'Placing an order is a request to buy. We will call you to confirm before we ship. An order is accepted once we confirm it.',
          'Products are 3D printed. Small variations in colour, texture and visible layer lines are a normal part of the process, not a defect.',
        ],
      },
      {
        heading: 'Prices and payment',
        body: [
          'Prices are shown in Bangladeshi Taka (৳). Payment is cash on delivery, or cash on pickup for orders collected from Mirpur DOHS.',
          'Delivery is 60৳ inside Dhaka (free on orders over 1,000৳) and 120৳ outside Dhaka. Pickup is free.',
        ],
      },
      {
        heading: 'Custom orders',
        body: [
          'For custom prints, you confirm you have the right to use any files or designs you send us.',
          'Quotes and lead times for custom work are confirmed with you directly before printing starts.',
        ],
      },
      {
        heading: 'Problems with an order',
        body: [
          `If something arrives damaged or is not what you ordered, contact us at ${CONTACT} and we will sort it out with you.`,
        ],
      },
      {
        heading: 'Changes',
        body: [
          'We may update these terms from time to time. The date at the top of this page shows when they last changed.',
        ],
      },
    ],
  },
};

export default function Legal({ page }) {
  const { title, tldr, sections } = PAGES[page];

  return (
    <main className="pt-44 pb-20 px-8 min-h-screen">
      <motion.article
        className="w-full max-w-3xl mx-auto space-y-10"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <header className="space-y-4">
          <p className="font-technical text-[10px] text-stone-600 uppercase tracking-[0.3em]">
            Last updated: {LAST_UPDATED}
          </p>
          <h1 className="font-headline text-6xl md:text-8xl text-white">{title}</h1>
          <div className="bg-[#ff5500]/5 border border-[#ff5500]/20 p-5">
            <p className="font-technical text-[10px] text-[#ff5500] uppercase tracking-[0.3em] mb-2">
              TL;DR
            </p>
            <p className="font-body text-stone-300">{tldr}</p>
          </div>
        </header>

        <div className="signature-divider opacity-30" />

        {sections.map(({ heading, body }) => (
          <section key={heading} className="space-y-3">
            <h2 className="font-headline text-3xl text-white">{heading}</h2>
            {body.map((para) => (
              <p key={para} className="font-body text-stone-400 leading-relaxed">{para}</p>
            ))}
          </section>
        ))}
      </motion.article>
    </main>
  );
}
