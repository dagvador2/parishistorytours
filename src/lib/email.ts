import { Resend } from 'resend';
import { en } from '../i18n/translations/en';
import { fr } from '../i18n/translations/fr';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

const translations: Record<string, typeof en> = { en, fr };

export interface BookingEmailPayload {
  email: string;
  name: string;
  bookingId?: string;
  tour: string;
  tourType: 'regular' | 'private' | string;
  participants: number;
  date: string;
  time: string;
  price?: number | null;
  phone?: string | null;
  message?: string | null;
  sessionId?: string;
  paymentMethod?: 'on_site' | 'stripe' | null;
  locale?: 'en' | 'fr' | string;
}

export interface BookingEmailResult {
  success: boolean;
  clientEmailId?: string;
  adminEmailId?: string;
  error?: string;
}

export async function sendBookingEmails(bookingData: BookingEmailPayload): Promise<BookingEmailResult> {
  const locale = bookingData.locale === 'fr' ? 'fr' : 'en';
  const t = translations[locale].email.client;
  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-GB';
  const paymentMethod = bookingData.paymentMethod || null;

  const tourName = bookingData.tour === 'left-bank' ? t.leftBankTour : t.rightBankTour;
  const typeName = bookingData.tourType === 'regular' ? t.regularTour : t.privateTour;

  let subject: string;
  let thankYou: string;
  let statusMessage: string;

  if (paymentMethod === 'on_site') {
    subject = t.subjectConfirmation;
    thankYou = t.thankYouRequest;
    statusMessage = t.onSiteMessage;
  } else if (bookingData.tourType === 'regular') {
    subject = t.subjectConfirmation;
    thankYou = t.thankYouPaid;
    statusMessage = t.confirmedMessage;
  } else {
    subject = t.subjectRequest;
    thankYou = t.thankYouRequest;
    statusMessage = t.requestMessage;
  }

  const clientEmailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">${subject}</h2>
      <p>${t.greeting} ${bookingData.name},</p>
      <p>${thankYou}</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>${t.tour}</strong> ${tourName}</p>
        <p><strong>${t.participants}</strong> ${bookingData.participants} ${bookingData.participants === 1 ? t.person : t.people}</p>
        <p><strong>${t.type}</strong> ${typeName}</p>
        <p><strong>${t.date}</strong> ${new Date(bookingData.date + "T00:00:00").toLocaleDateString(dateLocale)}</p>
        <p><strong>${t.time}</strong> ${bookingData.time}</p>
        ${bookingData.price ? `<p><strong>${t.total}</strong> €${bookingData.price}</p>` : ''}
        ${paymentMethod === 'on_site' ? `<p style="color: #d97706; font-weight: bold;">${t.onSitePaymentNote}</p>` : ''}
      </div>
      <p>${statusMessage}</p>
      <p>${t.regards}<br><strong>Clément - Paris History Tours</strong></p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 12px; color: #6b7280;">
        Paris History Tours | Email: clemdaguetschott@gmail.com | WhatsApp: +33620622480
      </p>
    </div>
  `;

  const clientEmailResult = await resend.emails.send({
    from: 'Paris History Tours <bookings@parishistorytours.com>',
    to: bookingData.email,
    subject,
    html: clientEmailHtml,
  });

  if (clientEmailResult.error) {
    console.error('Resend client email error:', JSON.stringify(clientEmailResult.error));
    return {
      success: false,
      error: `Client email failed: ${clientEmailResult.error.message}`,
    };
  }

  let adminBanner: string;
  let adminBannerColor: string;
  let adminBannerBorder: string;

  if (paymentMethod === 'on_site') {
    adminBanner = '⚠️ PAY ON SITE';
    adminBannerColor = '#d97706';
    adminBannerBorder = '#f59e0b';
  } else if (bookingData.tourType === 'regular') {
    adminBanner = 'PAID';
    adminBannerColor = '#059669';
    adminBannerBorder = '#10b981';
  } else {
    adminBanner = 'Action required';
    adminBannerColor = '#d97706';
    adminBannerBorder = '#f59e0b';
  }

  const adminEmailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: ${adminBannerColor};">New Booking ${adminBanner}</h2>
      <div style="background: ${paymentMethod === 'on_site' ? '#fffbeb' : bookingData.tourType === 'regular' ? '#f0fdf4' : '#fef2f2'}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${adminBannerBorder};">
        <p><strong>Customer:</strong> ${bookingData.name}</p>
        <p><strong>Email:</strong> ${bookingData.email}</p>
        <p><strong>Phone:</strong> ${bookingData.phone || 'Not provided'}</p>
        <p><strong>Tour:</strong> ${bookingData.tour === 'left-bank' ? 'Left Bank Tour' : 'Right Bank Tour'}</p>
        <p><strong>Participants:</strong> ${bookingData.participants}</p>
        <p><strong>Type:</strong> ${bookingData.tourType}</p>
        <p><strong>Date:</strong> ${new Date(bookingData.date + "T00:00:00").toLocaleDateString('en-GB')}</p>
        <p><strong>Time:</strong> ${bookingData.time}</p>
        ${bookingData.price ? `<p><strong>Amount:</strong> €${bookingData.price}</p>` : ''}
        ${paymentMethod === 'on_site' ? '<p style="color: #d97706; font-weight: bold; font-size: 16px;">⚠️ PAYMENT ON SITE - Client will pay on the day of the tour</p>' : ''}
        ${bookingData.message ? `<p><strong>Message:</strong> ${bookingData.message}</p>` : ''}
      </div>
      <p style="color: ${adminBannerColor};">
        ${paymentMethod === 'on_site'
          ? '⚠️ PAY ON SITE - Confirm with client and collect payment on tour day'
          : bookingData.tourType === 'regular'
          ? 'PAYMENT CONFIRMED - Tour booked!'
          : 'Action required: Contact client within 24h'}
      </p>
    </div>
  `;

  const adminSubjectPrefix = paymentMethod === 'on_site'
    ? '⚠️ PAY ON SITE'
    : bookingData.tourType === 'regular'
    ? '💰 PAID'
    : '📋 Private';

  const adminEmailResult = await resend.emails.send({
    from: 'Paris History Tours <bookings@parishistorytours.com>',
    to: 'clemdaguetschott@gmail.com',
    subject: `${adminSubjectPrefix} Booking - ${bookingData.name}`,
    html: adminEmailHtml,
  });

  if (adminEmailResult.error) {
    console.error('Resend admin email error:', JSON.stringify(adminEmailResult.error));
  }

  return {
    success: true,
    clientEmailId: clientEmailResult.data?.id,
    adminEmailId: adminEmailResult.data?.id,
  };
}
