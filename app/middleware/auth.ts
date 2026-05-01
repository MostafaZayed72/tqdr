export default defineNuxtRouteMiddleware(async (to, from) => {
  const user = useSupabaseUser()
  const client = useSupabaseClient()

  // Guest access is allowed on '/' and '/login'
  if (!user.value) {
    if (to.path.startsWith('/admin') || to.path.startsWith('/customer') || to.path === '/customers' || to.path === '/transactions') {
      return navigateTo('/login')
    }
    return
  }

  // If user is logged in, check role
  if (user.value && user.value.id && String(user.value.id) !== 'undefined') {
    const { data: profile } = await client
      .from('profiles')
      .select('role')
      .eq('id', user.value.id)
      .single()

    const role = profile?.role

    // Redirect logged in users away from login page to their respective dashboards
    if (to.path === '/login') {
      if (role === 'admin') return navigateTo('/admin')
      if (role === 'customer') return navigateTo('/customer')
      return navigateTo('/')
    }

    if (to.path.startsWith('/admin-dashboard') && role !== 'admin') {
      return navigateTo('/')
    }

    if (to.path.startsWith('/merchant') && role !== 'shop_owner') {
      return navigateTo('/')
    }

    if (to.path.startsWith('/customers') && role !== 'shop_owner' && role !== 'admin') {
      return navigateTo('/')
    }

    // Protection for admin routes
    if (to.path.startsWith('/admin') && role !== 'admin') {
      return navigateTo('/')
    }

    // Protection for customer routes
    if (to.path.startsWith('/customer') && role !== 'customer') {
      return navigateTo('/')
    }

    // Shop owners only for these routes
    const shopOwnerRoutes = ['/customers', '/transactions']
    if (shopOwnerRoutes.includes(to.path) && role !== 'shop_owner') {
      return navigateTo('/')
    }
  }
})
