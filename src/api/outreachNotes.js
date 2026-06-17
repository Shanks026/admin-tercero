import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const KEY = ['admin', 'outreach-notes']

async function fetchNotes() {
  const { data, error } = await supabase
    .from('admin_outreach_notes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

async function createNote({ title, body }) {
  const { data, error } = await supabase
    .from('admin_outreach_notes')
    .insert({ title, body })
    .select()
    .single()
  if (error) throw error
  return data
}

async function updateNote({ id, title, body }) {
  const { data, error } = await supabase
    .from('admin_outreach_notes')
    .update({ title, body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

async function deleteNote(id) {
  const { error } = await supabase
    .from('admin_outreach_notes')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export function useOutreachNotes() {
  return useQuery({ queryKey: KEY, queryFn: fetchNotes })
}

export function useCreateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createNote,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Note saved')
    },
    onError: (e) => toast.error(e.message || 'Failed to save note'),
  })
}

export function useUpdateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateNote,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Note updated')
    },
    onError: (e) => toast.error(e.message || 'Failed to update note'),
  })
}

export function useDeleteNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteNote,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Note deleted')
    },
    onError: (e) => toast.error(e.message || 'Failed to delete note'),
  })
}
