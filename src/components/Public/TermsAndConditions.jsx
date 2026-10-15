import { useEffect } from 'react';
import SiteHeader from '../Layout/SiteHeader';
import SiteFooter from '../Layout/SiteFooter';
import '../Layout/Layout.css';
import './TermsAndConditions.css';

const LAST_UPDATED = 'October 2026';

// edit the wording here: each item is one numbered section on the page
const SECTIONS = [
  {
    title: 'Acceptance of Terms',
    body: [
      'By booking a stay, a grooming appointment, or any other service with My Pet Space, or by using this website, you agree to these Terms and Conditions. If you do not agree, please do not use our services.',
    ],
  },
  {
    title: 'Bookings and Reservations',
    body: [
      'Bookings for rooms and grooming are made through our website or by contacting us directly. A booking is only confirmed once we have acknowledged it.',
      'Please provide accurate details about yourself and your pet, including size, weight, age, temperament, and any special needs. Inaccurate information may lead to changes in rates or refusal of service.',
    ],
  },
  {
    title: 'Rates and Payments',
    body: [
      'Our rates are listed on the Rooms and Services pages. Prices for grooming may vary depending on the pet\u2019s size and weight.',
      'Special rates (such as Five Star and Staycation) do not apply during holidays and peak seasons. A surcharge applies during those periods.',
      'Payment is due as informed at the time of booking or on check-out. Any extra services requested during the stay will be added to the final bill.',
    ],
  },
  {
    title: 'Cancellations and Changes',
    body: [
      'Please contact us as early as possible if you need to cancel or change a booking. Cancellation or rescheduling fees may apply, especially for peak and holiday dates.',
      'Bookings may be cancelled or rescheduled by My Pet Space if there are safety concerns, emergencies, or unforeseen circumstances. We will inform you as soon as possible.',
    ],
  },
  {
    title: 'Check-in, Check-out and Late Pick-up',
    body: [
      'Pets must be checked in and picked up within the hours agreed at booking. Extra hourly charges may apply for late pick-up.',
      'Pets not collected after the agreed date, and where we cannot reach the owner, may be handled according to local laws and our internal procedures.',
    ],
  },
  {
    title: 'Health and Vaccination Requirements',
    body: [
      'Pets must be in good health and up to date on their vaccinations. We may ask for vaccination records at check-in.',
      'Pets showing signs of illness, parasites (such as fleas or ticks), or aggressive behavior may be refused service or separated from other guests for the safety of all pets.',
      'Please tell us about any medical conditions, allergies, medications, or special diets before the stay.',
    ],
  },
  {
    title: 'Behavior and Safety',
    body: [
      'We care for every pet gently, but the safety of our guests and staff comes first. If a pet shows aggression or behavior that puts others at risk, we may separate the pet or end the service. Fees for the service already provided will still apply.',
      'Owners are responsible for any damage or injury caused by their pet to people, other pets, or property of My Pet Space.',
    ],
  },
  {
    title: 'Grooming Services',
    body: [
      'Our groomers will do their best to complete the requested service. For safety and comfort, a groomer may stop or modify a service if the pet is stressed, matted, or unwell.',
      'Heavily matted fur may require shaving or dematting, which is charged separately. Pets with existing skin or health conditions may show irritation after grooming, and we are not responsible for conditions that already existed.',
    ],
  },
  {
    title: 'Emergencies and Veterinary Care',
    body: [
      'If your pet becomes ill or injured during their stay, we will try to contact you right away. If we cannot reach you, you authorize us to bring your pet to a veterinarian for care.',
      'The owner is responsible for all veterinary costs, treatment, and transport.',
    ],
  },
  {
    title: 'Limitation of Liability',
    body: [
      'While we take every reasonable precaution, pets may experience stress, minor injuries, or illness during boarding or grooming. My Pet Space is not liable for illness, injury, or loss that is not caused by our negligence.',
      'We are not responsible for personal belongings left with your pet, such as toys, beds, and accessories, unless they were recorded at check-in.',
    ],
  },
  {
    title: 'CCTV and Photos',
    body: [
      'Our premises are monitored by CCTV for the safety of pets, customers, and staff.',
      'We may take photos or videos of pets during their stay or grooming and may share them with the owner or on our social media pages. Please tell us if you do not want your pet featured.',
    ],
  },
  {
    title: 'Changes to These Terms',
    body: [
      'We may update these Terms and Conditions from time to time. The latest version will always be available on this page, and continued use of our services means you accept the updated terms.',
    ],
  },
  {
    title: 'Contact Us',
    body: [
      'If you have questions about these Terms and Conditions, please contact us at 0945 418 4710 or through our Facebook and Instagram pages.',
    ],
  },
];

function TermsAndConditions() {
  // start at the top of the page when you arrive from the footer link
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="terms-page">
      <SiteHeader />

      <main>
        <div className="terms-wrap">
          <h1>Terms &amp; Conditions</h1>
          <p className="terms-updated">Last updated: {LAST_UPDATED}</p>
          <p className="terms-intro">
            Welcome to My Pet Space. Please read these terms carefully before using our pet hotel,
            grooming salon, and other services.
          </p>

          <div className="terms-card">
            {SECTIONS.map((s, i) => (
              <section key={s.title} className="terms-section">
                <h2>
                  <span className="terms-num">{i + 1}</span>
                  {s.title}
                </h2>
                {s.body.map((text) => (
                  <p key={text}>{text}</p>
                ))}
              </section>
            ))}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

export default TermsAndConditions;