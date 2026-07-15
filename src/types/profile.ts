export interface BusinessHours {
  mondayToFriday: string;
  saturday: string;
  sunday: string;
}

export interface ServiceItem {
  name: string;
  price: string;
  description: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface BookingRules {
  durationMinutes: number;
  rules: string[];
  cancellationPolicy: string;
}

export interface CompanyProfile {
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  hours: BusinessHours;
  services: ServiceItem[];
  faqs: FaqItem[];
  booking: BookingRules;
}
