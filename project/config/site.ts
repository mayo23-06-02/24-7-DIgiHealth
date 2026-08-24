/**
 * Everything the public marketing chrome renders — nav, contact details,
 * social links, and the footer's link columns.
 *
 * This is the single place to edit them. The header and footer both read from
 * here, so adding a page to the nav or changing the toll-free number is a
 * one-line change rather than a hunt through components. Nothing in the
 * signed-in dashboard reads this file.
 */

export type NavLink = { name: string; href: string };

/** Primary nav, shown in the header and repeated in the footer. */
export const NAV_LINKS: NavLink[] = [
  { name: "About", href: "/about" },
  { name: "For Patients", href: "/patients" },
  { name: "For Doctors", href: "/doctors" },
  { name: "Pricing", href: "/pricing" },
  { name: "Contact", href: "/contact" },
];

export const SITE_CONTACT = {
  tollFree: "0800 123 4567",
  /** Digits only — used for the tel: href. */
  tollFreeHref: "tel:08001234567",
  email: "hello@247digihealth.com",
  /**
   * South African emergency numbers. Shown wherever we tell someone we can't
   * help them online, so they are never left without a next step.
   */
  emergency: "10177",
  mentalHealthLine: "SADAG 0800 567 567",
};

export const SOCIAL_LINKS = [
  { name: "Facebook", href: "#" },
  { name: "Twitter", href: "#" },
  { name: "Instagram", href: "#" },
] as const;

/** Footer link columns. Add a column or a link here and the footer follows. */
export const FOOTER_COLUMNS: { heading: string; links: NavLink[] }[] = [
  {
    heading: "Platform",
    links: [
      { name: "For Patients", href: "/patients" },
      { name: "For Doctors", href: "/doctors" },
      { name: "Pricing", href: "/pricing" },
    ],
  },
  {
    heading: "Company",
    links: [
      { name: "About Us", href: "/about" },
      { name: "Contact", href: "/contact" },
    ],
  },
  {
    heading: "Get Started",
    links: [
      { name: "Create an Account", href: "/register" },
      { name: "Login", href: "/login" },
    ],
  },
];
