export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser()
  const client = useSupabaseClient()
  
  // 1. If no user, redirect to login (unless already there)
  if (!user.value && to.path !== '/login') {
    return navigateTo('/login')
  }

  // 2. If user exists, check their role from profiles table
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
    if (to.path.startsWith('/merchant') && role !== 'shop_owner') {
      if (role === 'admin') return navigateTo('/admin-dashboard')
      return navigateTo('/')
    }
  }
})
