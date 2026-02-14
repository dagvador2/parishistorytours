import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { en } from '../../i18n/translations/en';
import { fr } from '../../i18n/translations/fr';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

const translations: Record<string, typeof en> = { en, fr };

export const POST: APIRoute = async ({ request }) => {
  try {
    const bookingData = await request.json();
    const locale = bookingData.locale === 'fr' ? 'fr' : 'en';
    const t = translations[locale].email.client;
    const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-GB';

    // Email au client (translated)
    const tourName = bookingData.tour === 'left-bank' ? t.leftBankTour : t.rightBankTour;
    const typeName = bookingData.tourType === 'regular' ? t.regularTour : t.privateTour;
    const subject = bookingData.tourType === 'regular' ? t.subjectConfirmation : t.subjectRequest;
    const thankYou = bookingData.tourType === 'regular' ? t.thankYouPaid : t.thankYouRequest;
    const statusMessage = bookingData.tourType === 'regular' ? t.confirmedMessage : t.requestMessage;

    const clientEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">${subject}</h2>
        <p>${t.greeting} ${bookingData.name},</p>
        <p>${thankYou}</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>${t.tour}</strong> ${tourName}</p>
          <p><strong>${t.participants}</strong> ${bookingData.participants} ${bookingData.participants === 1 ? t.person : t.people}</p>
          <p><strong>${t.type}</strong> ${typeName}</p>
          <p><strong>${t.date}</strong> ${new Date(bookingData.date).toLocaleDateString(dateLocale)}</p>
          <p><strong>${t.time}</strong> ${bookingData.time}</p>
          ${bookingData.price ? `<p><strong>${t.total}</strong> €${bookingData.price}</p>` : ''}
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

    // Email à vous (admin)
    const adminEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">New Booking ${bookingData.tourType === 'regular' ? '(PAID)' : 'Request'}</h2>
        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <p><strong>Customer:</strong> ${bookingData.name}</p>
          <p><strong>Email:</strong> ${bookingData.email}</p>
          <p><strong>Phone:</strong> ${bookingData.phone || 'Not provided'}</p>
          <p><strong>Tour:</strong> ${bookingData.tour === 'left-bank' ? 'Left Bank Tour' : 'Right Bank Tour'}</p>
          <p><strong>Participants:</strong> ${bookingData.participants}</p>
          <p><strong>Type:</strong> ${bookingData.tourType}</p>
          <p><strong>Date:</strong> ${new Date(bookingData.date).toLocaleDateString('en-GB')}</p>
          <p><strong>Time:</strong> ${bookingData.time}</p>
          ${bookingData.price ? `<p><strong>Amount Paid:</strong> €${bookingData.price}</p>` : ''}
        </div>
        <p style="color: ${bookingData.tourType === 'regular' ? '#059669' : '#d97706'};">
          ${bookingData.tourType === 'regular' ? 'PAYMENT CONFIRMED - Tour booked!' : 'Action required: Contact client within 24h'}
        </p>
      </div>
    `;

    const adminEmailResult = await resend.emails.send({
      from: 'Paris History Tours <bookings@parishistorytours.com>',
      to: 'clemdaguetschott@gmail.com',
      subject: `🔔 New ${bookingData.tourType === 'regular' ? 'PAID' : 'Private'} Booking - ${bookingData.name}`,
      html: adminEmailHtml,
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Emails sent successfully',
      clientEmailId: clientEmailResult.data?.id,
      adminEmailId: adminEmailResult.data?.id
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Email error:', error instanceof Error ? error.message : error);
    return new Response(JSON.stringify({
      error: 'Failed to send emails'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
