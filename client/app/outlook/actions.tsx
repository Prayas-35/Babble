'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export async function login() {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
            scopes: 'email openid profile User.Read offline_access Mail.Read Mail.Send',
        },
    })

    if (error) {
        redirect('/error')
    }

    revalidatePath('/', 'layout')
    console.log("Login data:", data)
    redirect('/')

}
