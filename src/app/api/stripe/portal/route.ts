import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { publicAppUrl } from '@/lib/utils'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      return Response.json({ error: 'No billing account found' }, { status: 404 })
    }

    const appUrl = publicAppUrl()
    const stripe = getStripe()

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/settings`,
    })

    return Response.json({ url: session.url })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Failed to create portal session' }, { status: 500 })
  }
}
