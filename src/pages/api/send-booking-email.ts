import type { APIRoute } from 'astro';
import { sendBookingEmails } from '../../lib/email';

export const POST: APIRoute = async ({ request }) => {
  try {
    const bookingData = await request.json();
    const result = await sendBookingEmails(bookingData);

    if (!result.success) {
      return new Response(JSON.stringify({
        error: 'Failed to send client email',
        details: result.error,
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Emails sent successfully',
      clientEmailId: result.clientEmailId,
      adminEmailId: result.adminEmailId,
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
