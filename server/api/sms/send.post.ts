export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)

  const { phone, message } = body

  if (!phone || !message) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Phone and message are required',
    })
  }

  // Format phone number (ensure it starts with 966)
  let formattedPhone = phone.trim()
  if (formattedPhone.startsWith('05')) {
    formattedPhone = '966' + formattedPhone.substring(1)
  } else if (formattedPhone.startsWith('5')) {
    formattedPhone = '966' + formattedPhone
  }

  const username = process.env.SMS_USERNAME || config.smsUsername
  const password = process.env.SMS_PASSWORD || config.smsPassword
  const sender = process.env.SMS_SENDER || config.smsSender

  // Using URLSearchParams to handle encoding automatically and safely
  const query = new URLSearchParams({
    username: username as string,
    password: password as string,
    src: sender as string,
    dests: formattedPhone,
    body: message,
    priority: '0',
    delay: '0',
    validity: '0',
    maxParts: '0',
    dlr: '0',
    prevDups: '0',
    msgClass: 'promotional'
  })

  const apiUrl = `https://api.oursms.com/api-a/msgs?${query.toString()}`

  try {
    const response: any = await $fetch(apiUrl, {
      method: 'GET'
    })

    console.log('--- SMS Service Report (GET) ---')
    console.log('To:', formattedPhone)
    console.log('Status:', response)
    console.log('--------------------------')

    return { success: true, response }
  } catch (error: any) {
    console.error('--- SMS Service Error (GET) ---')
    console.error('To:', phone)
    console.error('Error Status:', error.statusCode)
    console.error('Error Message:', error.message)
    console.log('--------------------------')
    return { success: false, error: error.message }
  }
})
