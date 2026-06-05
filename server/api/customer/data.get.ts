import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // 1. Get customer_id from cookie
  const customerId = getCookie(event, 'customer_id')
  if (!customerId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // 2. Initialize service role client (synchronous in Nuxt Supabase)
  const client = serverSupabaseServiceRole(event)

  try {
    // 3. Fetch Customer Data
    const { data: customer, error: custError } = await client
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single()

    if (custError || !customer) {
      throw createError({ statusCode: 404, message: 'Customer not found' })
    }

    // 4. Fetch Shop Profile
    const { data: shop } = await client
      .from('profiles')
      .select('*')
      .eq('id', customer.shop_owner_id)
      .single()

    // 5. Fetch Transactions
    const { data: transactions } = await client
      .from('transactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(10)

    // 6. Fetch Subscriptions
    const { data: subscriptions } = await client
      .from('customer_subscriptions')
      .select('*, offer:subscription_offers(*)')
      .eq('customer_id', customerId)
      .gte('expires_at', new Date().toISOString())

    return {
      customer,
      shop,
      transactions: transactions || [],
      subscriptions: subscriptions || []
    }
  } catch (e: any) {
    throw createError({ statusCode: e.statusCode || 500, message: e.message })
  }
})
