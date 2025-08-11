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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const url = new URL(req.url)
    const method = req.method

    if (method === 'POST') {
      const { sessionId, binNo, qtyCountedWorker, qtyAsPerBooks } = await req.json()

      // Get session details
      const { data: session, error: sessionError } = await supabase
        .from('counting_sessions')
        .select(`
          *,
          worker:users!counting_sessions_worker_id_fkey(user_id, warehouse_name),
          team_leader:users!counting_sessions_team_leader_id_fkey(user_id)
        `)
        .eq('id', sessionId)
        .single()

      if (sessionError || !session) {
        return new Response(JSON.stringify({ error: 'Session not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Insert counting data
      const { data: countingData, error: insertError } = await supabase
        .from('counting_data')
        .insert({
          session_id: sessionId,
          wh_name: session.warehouse_name,
          tl_name: session.team_leader.user_id,
          username: session.worker.user_id,
          bin_no: binNo,
          qty_counted: qtyCountedWorker,
          qty_as_per_books: qtyAsPerBooks
        })
        .select()
        .single()

      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Update worker performance
      const today = new Date().toISOString().split('T')[0]
      
      // Get current performance data
      const { data: existingPerf } = await supabase
        .from('worker_performance')
        .select('*')
        .eq('username', session.worker.user_id)
        .eq('date', today)
        .single()

      const newBinsCount = (existingPerf?.no_of_bins_counted || 0) + 1
      const newQtyCount = (existingPerf?.no_of_qty_counted || 0) + qtyCountedWorker

      // Calculate time taken (if session is completed)
      let timeTaken = existingPerf?.time_taken_minutes || 0
      if (session.end_time) {
        const startTime = new Date(session.start_time)
        const endTime = new Date(session.end_time)
        timeTaken = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))
      }

      // Calculate efficiency (bins per hour)
      const efficiency = timeTaken > 0 ? Math.round((newBinsCount / (timeTaken / 60)) * 100) / 100 : 0

      if (existingPerf) {
        // Update existing performance record
        await supabase
          .from('worker_performance')
          .update({
            no_of_bins_counted: newBinsCount,
            no_of_qty_counted: newQtyCount,
            time_taken_minutes: timeTaken,
            efficiency: efficiency
          })
          .eq('id', existingPerf.id)
      } else {
        // Create new performance record
        await supabase
          .from('worker_performance')
          .insert({
            wh_name: session.warehouse_name,
            date: today,
            username: session.worker.user_id,
            no_of_bins_counted: newBinsCount,
            no_of_qty_counted: newQtyCount,
            time_taken_minutes: timeTaken,
            efficiency: efficiency
          })
      }

      // Create audit log
      await supabase
        .from('audit_logs')
        .insert({
          user_id: session.worker_id,
          action: 'COUNT_BIN',
          details: `Counted bin ${binNo}: ${qtyCountedWorker} units`
        })

      return new Response(JSON.stringify(countingData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (method === 'GET') {
      const sessionId = url.searchParams.get('sessionId')
      const workerId = url.searchParams.get('workerId')
      const date = url.searchParams.get('date')

      let query = supabase.from('counting_data').select('*')

      if (sessionId) {
        query = query.eq('session_id', sessionId)
      }
      if (workerId) {
        query = query.eq('username', workerId)
      }
      if (date) {
        query = query.eq('date', date)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

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