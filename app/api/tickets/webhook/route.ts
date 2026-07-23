import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendTicketConfirmation, sendTicketSaleNotification } from '@/lib/email'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature invalid: ${(err as Error).message}` },
      { status: 400 }
    )
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const orderId = session.metadata?.order_id

    if (orderId) {
      const { data: order } = await supabaseAdmin
        .from('ticket_orders')
        .select('id, status, event_id, ticket_type_id, buyer_name, buyer_email, quantity, total_amount_cents')
        .eq('id', orderId)
        .single()

      if (order && order.status !== 'paid') {
        const { data: ticketType } = await supabaseAdmin
          .from('ticket_types')
          .select('name, capacity_per_ticket, max_tickets')
          .eq('id', order.ticket_type_id)
          .single()

        const { data: eventRow } = await supabaseAdmin
          .from('events')
          .select('title, starts_at')
          .eq('id', order.event_id)
          .single()

        let overbooked = false
        if (ticketType?.max_tickets != null) {
          const { data: paidOrders } = await supabaseAdmin
            .from('ticket_orders')
            .select('quantity')
            .eq('ticket_type_id', order.ticket_type_id)
            .eq('status', 'paid')

          const soldSpots = (paidOrders ?? []).reduce(
            (sum, o) => sum + o.quantity * ticketType.capacity_per_ticket,
            0
          )
          overbooked = soldSpots + order.quantity * ticketType.capacity_per_ticket > ticketType.max_tickets
        }

        const paymentIntentId =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : (session.payment_intent?.id ?? null)

        await supabaseAdmin
          .from('ticket_orders')
          .update({ status: 'paid', stripe_payment_intent_id: paymentIntentId })
          .eq('id', order.id)

        sendTicketConfirmation({
          buyerName: order.buyer_name,
          buyerEmail: order.buyer_email,
          eventTitle: eventRow?.title ?? '',
          startsAt: eventRow?.starts_at ?? new Date().toISOString(),
          ticketTypeName: ticketType?.name ?? '',
          quantity: order.quantity,
          totalAmountCents: order.total_amount_cents,
        }).catch(() => {})

        sendTicketSaleNotification({
          buyerName: order.buyer_name,
          buyerEmail: order.buyer_email,
          eventTitle: eventRow?.title ?? '',
          ticketTypeName: ticketType?.name ?? '',
          quantity: order.quantity,
          totalAmountCents: order.total_amount_cents,
          overbooked,
        }).catch(() => {})
      }
    }
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge
    const paymentIntentId =
      typeof charge.payment_intent === 'string' ? charge.payment_intent : (charge.payment_intent?.id ?? null)

    if (paymentIntentId) {
      await supabaseAdmin
        .from('ticket_orders')
        .update({ status: 'refunded' })
        .eq('stripe_payment_intent_id', paymentIntentId)
    }
  }

  return NextResponse.json({ ok: true })
}
