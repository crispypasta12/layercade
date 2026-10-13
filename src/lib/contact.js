// Single source of truth for public contact details.
// wa.me links need the number without "+" or spaces.
export const WHATSAPP_NUMBER = '8801620869115';
export const CONTACT_EMAIL   = 'hello@layercade.com';
export const ADDRESS_LINES   = ['Mirpur DOHS', 'Dhaka, Bangladesh'];

export const whatsappUrl = (message) =>
  `https://wa.me/${WHATSAPP_NUMBER}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
