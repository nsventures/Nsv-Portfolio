import { getSupabase, isSupabaseConfigured } from '../lib/supabase'

export interface PortfolioAccessLead {
  name: string
  email: string
  phone: string
  projectName?: string | null
}

export async function submitPortfolioAccessLead(lead: PortfolioAccessLead): Promise<void> {
  if (!isSupabaseConfigured()) return

  const supabase = getSupabase()
  const project = lead.projectName?.trim()

  const { error } = await supabase.from('inquiries').insert({
    name: lead.name.trim(),
    email: lead.email.trim(),
    phone: lead.phone.trim(),
    message: project
      ? `Portfolio access — requested to view: ${project}`
      : 'Portfolio access — site visitor registration',
    project_type: 'Portfolio viewer',
  })

  if (error) {
    throw new Error(error.message)
  }
}
