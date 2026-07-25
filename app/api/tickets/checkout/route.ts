import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'

const schema = z.object({
  event_id: z.string().uuid(),
  ticket_type_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
  buyer_name: z.string().min(1).max(200),
  buyer_email: z.string().email().max(200),
})

export async function POST(request: NextRequest) {
  // Events sind öffentlich — Ticketkauf zu offenen Events ist bewusst nicht gated.
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { event_id, ticket_type_id, quantity, buyer_name, buyer_email } = parsed.data

  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id, slug, ticketing_enabled, status')
    .eq('id', event_id)
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Event nicht gefunden.' }, { status: 404 })
  }
  if (!event.ticketing_enabled || event.status !== 'upcoming') {
    return NextResponse.json({ error: 'Ticket-Verkauf nicht möglich.' }, { status: 409 })
  }

  const { data: ticketType } = await supabaseAdmin
    .from('ticket_types')
    .select('id, event_id, name, price_cents, capacity_per_ticket, max_tickets, is_active')
    .eq('id', ticket_type_id)
    .single()

  if (!ticketType || ticketType.event_id !== event_id || !ticketType.is_active) {
    return NextResponse.json({ error: 'Ticket-Typ nicht verfügbar.' }, { status: 404 })
  }

  if (ticketType.max_tickets !== null) {
    const { data: paidOrders } = await supabaseAdmin
      .from('ticket_orders')
      .select('quantity')
      .eq('ticket_type_id', ticket_type_id)
      .eq('status', 'paid')

    const soldSpots = (paidOrders ?? []).reduce(
      (sum, o) => sum + o.quantity * ticketType.capacity_per_ticket,
      0
    )
    const requestedSpots = quantity * ticketType.capacity_per_ticket

    if (soldSpots + requestedSpots > ticketType.max_tickets) {
      return NextResponse.json({ error: 'Nicht genug Plätze mehr verfügbar.' }, { status: 409 })
    }
  }

  const totalAmountCents = ticketType.price_cents * quantity
  const orderId = randomUUID()

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: buyer_email,
    line_items: [
      {
        price_data: {
          currency: 'eur',
          unit_amount: ticketType.price_cents,
          product_data: { name: ticketType.name },
        },
        quantity,
      },
    ],
    metadata: { order_id: orderId },
    success_url: `${request.nextUrl.origin}/event/${event.slug}?ticket=success`,
    cancel_url: `${request.nextUrl.origin}/event/${event.slug}?ticket=cancelled`,
  })

  const { error: insertError } = await supabaseAdmin.from('ticket_orders').insert({
    id: orderId,
    event_id,
    ticket_type_id,
    buyer_name,
    buyer_email,
    quantity,
    total_amount_cents: totalAmountCents,
    stripe_checkout_session_id: session.id,
    status: 'pending',
  })

  if (insertError || !session.url) {
    return NextResponse.json({ error: 'Fehler beim Erstellen der Bestellung.' }, { status: 500 })
  }

  return NextResponse.json({ url: session.url })
}
