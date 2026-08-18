import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ""
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ""
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ""

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Config Error', message: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in Edge Function secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Get the requester's JWT Auth Token from the Request Authorization Header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Authorization token is missing.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.substring(7)

    // Initialize Supabase client with the user's JWT to verify their identity securely
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })

    // Get active user data from the verified token
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Sesi tidak valid atau telah kedaluwarsa.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase Service Role Client for database and admin auth operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // 2. Query the user's profile to verify they have the 'admin' role
    const { data: profile, error: profileErr } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileErr || !profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden', message: 'Hanya administrator yang diperbolehkan menghapus akun.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse the request body to get the target userId to delete
    const { userId } = await req.json()
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Bad Request', message: 'User ID target wajib diisi.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Avoid accidental self-deletion
    if (userId === user.id) {
      return new Response(
        JSON.stringify({ error: 'Bad Request', message: 'Anda tidak dapat menghapus akun administrator Anda sendiri.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch details of target user to be deleted to log the request safely
    const { data: targetUser, error: targetUserErr } = await adminClient.auth.admin.getUserById(userId)
    if (targetUserErr || !targetUser?.user) {
      return new Response(
        JSON.stringify({ error: 'Not Found', message: 'Akun guru target tidak ditemukan.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Avoid deleting the primary admin account
    if (targetUser.user.email?.toLowerCase() === 'admin@gmail.com') {
      return new Response(
        JSON.stringify({ error: 'Bad Request', message: 'Akun administrator utama dilindungi.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[DELETE USER EDGE FUNCTION] Admin ${user.email} is deleting target user ${targetUser.user.email} (${userId})`)

    // 3. Delete the Auth User from auth.users using Admin Auth API.
    // If your Supabase database has foreign keys configured with "ON DELETE CASCADE" pointing from tables
    // (profiles, posts, comments, likes, messages) to auth.users, this single operation
    // will automatically cascade and delete all profile rows and content cleanly!
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId)
    if (deleteAuthError) {
      console.error('[DELETE USER EDGE FUNCTION] Error:', deleteAuthError.message)
      return new Response(
        JSON.stringify({ error: 'Internal Error', message: `Gagal menghapus user: ${deleteAuthError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Akun guru dan seluruh data terkait telah berhasil dihapus secara permanen via ON DELETE CASCADE.',
        deletedUserId: userId,
        deletedEmail: targetUser.user.email
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', message: err.message || 'Terjadi kesalahan sistem.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
