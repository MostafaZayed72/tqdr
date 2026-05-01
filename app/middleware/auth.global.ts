export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser()
  const client = useSupabaseClient()
  
  // 1. Skip redirect on server if it's a client-only route to prevent flash redirects
  if (process.server && (to.path.startsWith('/merchant') || to.path === '/customers' || to.path === '/transactions')) {
    return
  }

  // 2. If no user, redirect to login (unless already there)
  if (!user.value && to.path !== '/login' && to.path !== '/') {
    return navigateTo('/login')
  }

  // 3. If user exists, check their role from profiles table
  if (user.value && user.value.id && String(user.value.id) !== 'undefined') {
    const { data: profile } = await client
      .from('profiles')
      .select('*')
      .eq('id', user.value.id)
      .maybeSingle()

    const role = profile?.role

    // Admin Protection
    if (to.path.startsWith('/admin-dashboard') && role !== 'admin') {
      return navigateTo('/')
    }

    // Merchant Protection
    if ((to.path.startsWith('/merchant') || to.path === '/customers' || to.path === '/transactions') && role !== 'shop_owner') {
      if (role === 'admin') return navigateTo('/admin-dashboard')
      return navigateTo('/')
    }
  }
})
