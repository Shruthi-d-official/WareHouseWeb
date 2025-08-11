import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const method = req.method

    if (method === 'GET') {
      const pathParts = url.pathname.split('/')
      const today = new Date().toISOString().split('T')[0]

      // Get today's performance for a specific worker
      if (pathParts.includes('today')) {
        const workerId = pathParts[pathParts.length - 1]
        
        // Get user details
        const { data: user } = await supabase
          .from('users')
          .select('user_id')
          .eq('id', workerId)
          .single()

        if (!user) {
          return new Response(JSON.stringify({ error: 'User not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const { data: performance } = await supabase
          .from('worker_performance')
          .select('*')
          .eq('username', user.user_id)
          .eq('date', today)
          .single()

        const stats = {
          todayBins: performance?.no_of_bins_counted || 0,
          todayQuantity: performance?.no_of_qty_counted || 0,
          todayTime: performance?.time_taken_minutes || 0,
          efficiency: performance?.efficiency || 0,
          ranking: performance?.ranking || 0
        }

        return new Response(JSON.stringify(stats), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Get all performance data with filters
      const warehouse = url.searchParams.get('warehouse')
      const date = url.searchParams.get('date') || today
      const limit = parseInt(url.searchParams.get('limit') || '50')

      let query = supabase
        .from('worker_performance')
        .select('*')
        .eq('date', date)

      if (warehouse) {
        query = query.eq('wh_name', warehouse)
      }

      const { data, error } = await query
        .order('efficiency', { ascending: false })
        .limit(limit)

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Update rankings
      const rankedData = data.map((item, index) => ({
        ...item,
        ranking: index + 1
      }))

      // Update rankings in database
      for (const item of rankedData) {
        await supabase
          .from('worker_performance')
          .update({ ranking: item.ranking })
          .eq('id', item.id)
      }

      return new Response(JSON.stringify(rankedData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (method === 'POST') {
      const performanceData = await req.json()

      const { data, error } = await supabase
        .from('worker_performance')
        .insert(performanceData)
        .select()
        .single()

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})